d3.csv("data/globalterrorism.csv").then(function(data) {
  const counts = d3.rollup(data, v => v.length, d => d.iyear);
  const yearData = Array.from(counts, ([year, count]) => ({
    year: +year,
    count
  })).sort((a, b) => a.year - b.year);

  const width1 = 800;
  const height1 = 400;
  const margin1 = { top: 30, right: 30, bottom: 40, left: 60 };

  const svg1 = d3.select("#overview").append("svg")
    .attr("width", width1)
    .attr("height", height1);

  const x1 = d3.scaleLinear()
    .domain(d3.extent(yearData, d => d.year))
    .range([margin1.left, width1 - margin1.right]);

  const y1 = d3.scaleLinear()
    .domain([0, d3.max(yearData, d => d.count)])
    .nice()
    .range([height1 - margin1.bottom, margin1.top]);

  svg1.append("g")
    .attr("transform", `translate(0,${height1 - margin1.bottom})`)
    .call(d3.axisBottom(x1).tickFormat(d3.format("d")));

  svg1.append("g")
    .attr("transform", `translate(${margin1.left},0)`)
    .call(d3.axisLeft(y1));

  const line = d3.line()
    .x(d => x1(d.year))
    .y(d => y1(d.count));

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
});

d3.csv("data/globalterrorism.csv").then(function(data) {
  const nested = d3.rollups(
    data,
    v => v.length,
    d => d.iyear,
    d => d.region_txt
  );

  const regionSet = new Set();
  const stackedData = nested.map(([year, regionCounts]) => {
    const row = { year: +year };
    for (const [region, count] of regionCounts) {
      row[region] = count;
      regionSet.add(region);
    }
    return row;
  }).sort((a, b) => a.year - b.year);

  const regions = Array.from(regionSet);
  const stack = d3.stack().keys(regions);
  const series = stack(stackedData);

  const width2 = 900;
  const height2 = 400;
  const margin2 = { top: 40, right: 160, bottom: 40, left: 60 };

  const svg2 = d3.select("#focus").append("svg")
    .attr("width", width2)
    .attr("height", height2);

  const x2 = d3.scaleBand()
    .domain(stackedData.map(d => d.year))
    .range([margin2.left, width2 - margin2.right])
    .padding(0.1);

  const y2 = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d =>
      regions.reduce((sum, r) => sum + (d[r] || 0), 0)
    )]).nice()
    .range([height2 - margin2.bottom, margin2.top]);

  const color = d3.scaleOrdinal()
    .domain(regions)
    .range(d3.schemeCategory10);

  svg2.append("g")
    .attr("transform", `translate(0,${height2 - margin2.bottom})`)
    .call(d3.axisBottom(x2).tickValues(x2.domain().filter(d => d % 5 === 0)));

  svg2.append("g")
    .attr("transform", `translate(${margin2.left},0)`)
    .call(d3.axisLeft(y2));

  svg2.append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x2(d.data.year))
    .attr("y", d => y2(d[1]))
    .attr("height", d => y2(d[0]) - y2(d[1]))
    .attr("width", x2.bandwidth());

  svg2.append("text")
    .attr("x", width2 / 2)
    .attr("y", margin2.top - 15)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Terrorist Attacks per Year by Region");

  const legend = svg2.append("g")
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
});
d3.csv("data/globalterrorism.csv").then(function(data) {
  const grouped = d3.rollups(
    data.filter(d => d.attacktype1_txt && d.iyear),
    v => v.length,
    d => d.iyear,
    d => d.attacktype1_txt
  );

  const attackTypesSet = new Set();
  const formatted = [];

  grouped.forEach(([year, typeCounts]) => {
    const row = { year: +year };
    typeCounts.forEach(([type, count]) => {
      row[type] = count;
      attackTypesSet.add(type);
    });
    formatted.push(row);
  });

  formatted.sort((a, b) => a.year - b.year);
  const attackTypes = Array.from(attackTypesSet);

  const width = 900;
  const height = 400;
  const margin = { top: 30, right: 30, bottom: 30, left: 60 };

  const svg = d3.select("#advanced").append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear()
    .domain(d3.extent(formatted, d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(attackTypes)
    .range(d3.schemeCategory10);

  const stack = d3.stack()
    .keys(attackTypes)
    .offset(d3.stackOffsetNone);

  const layers = stack(formatted);
  y.domain([
    d3.min(layers, layer => d3.min(layer, d => d[0])),
    d3.max(layers, layer => d3.max(layer, d => d[1]))
  ]);

  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  svg.selectAll("path")
    .data(layers)
    .join("path")
    .attr("fill", d => color(d.key))
    .attr("d", area)
    .append("title")
    .text(d => d.key);

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
    .text("Streamgraph of Terrorist Attack Types Over Time");
    // Add legend
const legend = svg.append("g")
  .attr("transform", `translate(${width - margin.right - 120}, ${margin.top})`);

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
