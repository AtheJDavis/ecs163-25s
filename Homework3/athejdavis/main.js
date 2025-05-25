d3.csv("data/globalterrorism.csv").then(function(data) {
  const counts = d3.rollup(data, v => v.length, d => d.iyear);
  const yearData = Array.from(counts, ([year, count]) => ({ year: +year, count }))
    .sort((a, b) => a.year - b.year);

  const width1 = 800;
  const height1 = 400;
  const margin1 = { top: 30, right: 30, bottom: 40, left: 60 };

  const svg1 = d3.select("#overview").append("svg")
    .attr("width", width1)
    .attr("height", height1);

  const xScale = d3.scaleLinear()
    .domain(d3.extent(yearData, d => d.year))
    .range([margin1.left, width1 - margin1.right]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(yearData, d => d.count)])
    .nice()
    .range([height1 - margin1.bottom, margin1.top]);

  svg1.append("g")
    .attr("transform", `translate(0,${height1 - margin1.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  svg1.append("g")
    .attr("transform", `translate(${margin1.left},0)`)
    .call(d3.axisLeft(yScale));

  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.count));

  svg1.append("path")
    .datum(yearData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg1.append("text")
    .attr("x", width1 / 2)
    .attr("y", margin1.top - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Number of Terrorist Attacks per Year");

  const brush = d3.brushX()
    .extent([[margin1.left, margin1.top], [width1 - margin1.right, height1 - margin1.bottom]])
    .on("end", brushed);

  svg1.append("g")
    .attr("class", "brush")
    .call(brush);

  function brushed(event) {
    if (!event.selection) return;
    const [x0, x1] = event.selection;
    const year0 = Math.round(xScale.invert(x0));
    const year1 = Math.round(xScale.invert(x1));
    updateStackedBar([year0, year1]);
  }

  setupStackedBar(data);
});

let svg2, x2, y2, color, regions, stack, allStackedData;

function setupStackedBar(data) {
  const nested = d3.rollups(
    data,
    v => v.length,
    d => d.iyear,
    d => d.region_txt
  );

  const regionSet = new Set();
  allStackedData = nested.map(([year, regionCounts]) => {
    const row = { year: +year };
    regionCounts.forEach(([region, count]) => {
      row[region] = count;
      regionSet.add(region);
    });
    return row;
  }).sort((a, b) => a.year - b.year);

  regions = Array.from(regionSet);
  stack = d3.stack().keys(regions);

  const width2 = 900;
  const height2 = 400;
  const margin2 = { top: 40, right: 160, bottom: 40, left: 60 };

  svg2 = d3.select("#focus").append("svg")
    .attr("width", width2)
    .attr("height", height2)
    .call(d3.zoom().scaleExtent([1, 10]).translateExtent([[0, 0], [width2, height2]]).on("zoom", zoomed));

  const plotArea = svg2.append("g").attr("class", "plot");

  x2 = d3.scaleBand()
    .domain(allStackedData.map(d => d.year))
    .range([margin2.left, width2 - margin2.right])
    .padding(0.1);

  y2 = d3.scaleLinear()
    .domain([0, d3.max(allStackedData, d =>
      regions.reduce((sum, r) => sum + (d[r] || 0), 0)
    )]).nice()
    .range([height2 - margin2.bottom, margin2.top]);

  color = d3.scaleOrdinal()
    .domain(regions)
    .range(d3.schemeCategory10);

  plotArea.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height2 - margin2.bottom})`)
    .call(d3.axisBottom(x2).tickValues(x2.domain().filter(d => d % 5 === 0)));

  plotArea.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin2.left},0)`)
    .call(d3.axisLeft(y2));

  plotArea.append("text")
    .attr("x", width2 / 2)
    .attr("y", margin2.top - 15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Terrorist Attacks per Year by Region");

  const legend = plotArea.append("g")
    .attr("transform", `translate(${width2 - margin2.right + 10}, ${margin2.top})`);

  regions.forEach((region, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    g.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(region));

    g.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(region)
      .style("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });

  updateStackedBar([d3.min(allStackedData, d => d.year), d3.max(allStackedData, d => d.year)]);
}

function updateStackedBar([startYear, endYear]) {
  const filtered = allStackedData.filter(d => d.year >= startYear && d.year <= endYear);
  const newSeries = stack(filtered);
  const plotArea = svg2.select(".plot");

  const layers = plotArea.selectAll("g.layer").data(newSeries, d => d.key);

  layers.join(
    enter => {
      const g = enter.append("g").attr("class", "layer").attr("fill", d => color(d.key));
      g.selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => x2(d.data.year))
        .attr("width", x2.bandwidth())
        .attr("y", y2(0))
        .attr("height", 0)
        .style("opacity", 0)
        .transition()
        .duration(700)
        .style("opacity", 1)
        .attr("y", d => y2(d[1]))
        .attr("height", d => y2(d[0]) - y2(d[1]));
    },
    update => {
      update.selectAll("rect")
        .data(d => d)
        .join("rect")
        .transition()
        .duration(700)
        .attr("x", d => x2(d.data.year))
        .attr("width", x2.bandwidth())
        .attr("y", d => y2(d[1]))
        .attr("height", d => y2(d[0]) - y2(d[1]))
        .style("opacity", 1);
    },
    exit => exit
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove()
  );
}

function zoomed(event) {
  const plotArea = svg2.select(".plot");
  plotArea.attr("transform", event.transform);
}

d3.csv("data/globalterrorism.csv").then(function(data) {
  const grouped = d3.rollups(
    data.filter(d => d.attacktype1_txt && d.iyear),
    v => v.length,
    d => d.attacktype1_txt,
    d => +d.iyear
  );

  const attackTypes = Array.from(new Set(data.map(d => d.attacktype1_txt))).filter(d => d);
  const years = Array.from(new Set(data.map(d => +d.iyear))).sort((a, b) => a - b);

  const yearData = years.map(year => {
    const row = { year };
    grouped.forEach(([attackType, yearCounts]) => {
      const match = yearCounts.find(([y]) => y === year);
      row[attackType] = match ? match[1] : 0;
    });
    return row;
  });

  const stack = d3.stack()
    .keys(attackTypes)
    .offset(d3.stackOffsetNone);

  const series = stack(yearData);

  const width = 900;
  const height = 400;
  const margin = { top: 30, right: 100, bottom: 30, left: 60 };

  const svg = d3.select("#advanced").append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear()
    .domain(d3.extent(years))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(series, s => d3.min(s, d => d[0])),
      d3.max(series, s => d3.max(s, d => d[1]))
    ])
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(attackTypes)
    .range(d3.schemeCategory10);

  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  svg.selectAll("path")
    .data(series)
    .join("path")
    .attr("fill", d => color(d.key))
    .attr("d", area);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Streamgraph of Attack Types Over Time");

  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);

  attackTypes.forEach((type, i) => {
    const g = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    g.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(type));

    g.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(type)
      .style("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });
});
