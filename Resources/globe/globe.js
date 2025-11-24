const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#earth").append("svg")
  .attr("width", width)
  .attr("height", height);

// Projection
const projection = d3.geoSatellite()
  .distance(3.5)      // closer = more perspective
  .tilt(20)            // pitch toward horizon
  .scale(width * .75)
  .translate([width / 2, height * 0.45]) // push up for KPIs
  .rotate([45, -40, -25]); // aim near NYC

// Clip angle for horizon
const horizon = Math.acos(1 / projection.distance()) * 180 / Math.PI;
projection.clipAngle(horizon - 1e-6);

const path = d3.geoPath(projection);

// Gradient for sphere
const defs = svg.append("defs");
const radialGradient = defs.append("radialGradient")
  .attr("id", "globeGradient")
  .attr("cx", "50%")
  .attr("cy", "50%")
  .attr("r", "50%");
radialGradient.append("stop").attr("offset", "0%").attr("stop-color", "#f5f5f0");
radialGradient.append("stop").attr("offset", "100%").attr("stop-color", "#d0d0d0");

// Sphere
svg.append("path")
  .datum({ type: "Sphere" })
  .attr("d", path)
  .attr("fill", "url(#globeGradient)");

// Land
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(data => {
  const countries = topojson.feature(data, data.objects.countries);
  svg.selectAll("path.land")
    .data(countries.features)
    .enter().append("path")
    .attr("class", "land")
    .attr("d", path)
    .attr("fill", "#b0b0b0")
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5);
});