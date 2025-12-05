const pointsOfInterest = [
  { name: "Brooklyn Cruise Terminal", coords: [-74.0143, 40.6820] },
  { name: "Manhattan Cruise Terminal", coords:  [-73.9966, 40.7680] }
];

const svgEarth = d3.select("#earth").append("svg");

const svgShadow = d3.select("#earth").append("svg")
  .style("position", "absolute")
  .style("top", 0)
  .style("left", 0)
  .style("pointer-events", "none");

const shadowDefs = svgShadow.append("defs");
const shadowGradient = shadowDefs.append("radialGradient")
  .attr("id", "shadowGradient")
  .attr("cx", "50%")
  .attr("cy", "50%")
  .attr("r", "50%");

shadowGradient.append("stop")
  .attr("offset", "0%")
  .attr("stop-color", "#f2e6d8")
  .attr("stop-opacity", 0);

shadowGradient.append("stop")
  .attr("offset", "100%")
  .attr("stop-color", "#8b6f47")
  .attr("stop-opacity", 0.8); // very subtle darkness


// Projection
const projection = d3.geoSatellite()
  .distance(3.5)      // closer = more perspective
  .tilt(20)            // pitch toward horizon
  .rotate([45, -42, -14]); // aim near NYC

const path = d3.geoPath(projection);

// Gradient for sphere
const defs = svgEarth.append("defs");

const radialGradient = defs.append("radialGradient")
  .attr("id", "globeGradient")
  .attr("cx", "50%")
  .attr("cy", "50%")
  .attr("r", "50%");

radialGradient.append("stop")
  .attr("offset", "0%").attr("stop-color", "#f5f5f0");

  radialGradient.append("stop")
  .attr("offset", "70%").attr("stop-color", "#e8eef2");

radialGradient.append("stop")
  .attr("offset", "100%").attr("stop-color", "#d0d8e0");
 
// Sphere
svgEarth.append("path")
  .datum({ type: "Sphere" })
  .attr("fill", "url(#globeGradient)");



// Land
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(data => {
  const countries = topojson.feature(data, data.objects.countries);

  svgEarth.selectAll("path.land")
    .data(countries.features)
    .enter().append("path")
    .attr("class", "land")
    .attr("d", path)
    .attr("fill", "#b0b0b0")
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5);

  svgEarth.selectAll("circle.poInterest")
    .data(pointsOfInterest)
    .enter().append("circle")
    .attr("class", "poInterest")
    .attr("r", 4) // small dot
    .attr("fill", "#ffcc00") // subtle highlight color
    .attr("stroke", "#333")
    .attr("stroke-width", 1)

  renderEarth();


});

function updatePing() {
    svgEarth.selectAll("circle.poInterest")
      .attr("cx", d => projection(d.coords)[0])
      .attr("cy", d => projection(d.coords)[1]);
  }

function renderEarth() {
  const width = window.innerWidth;
  const headerObject = document.getElementById("theHeaderBar")
  const height = window.innerHeight - headerObject.offsetHeight;

  svgEarth.attr("width", width).attr("height", height);

  projection
    .scale(width * 0.75)
    .translate([width / 2, height * 0.45])


svgShadow.attr("width", width).attr("height", height);

const globeRadius = projection.scale();

// Remove previous shadow circle before adding a new one
svgShadow.selectAll("circle").remove();

svgShadow.append("circle")
  .attr("cx", width / 2)
  .attr("cy", height * 0.45)
  .attr("r", globeRadius)
  .attr("fill", "url(#shadowGradient)");


  const horizon = Math.acos(1/projection.distance()) * 180 / Math.PI;

  projection.clipAngle(horizon - 1e-6);

  svgEarth.selectAll("path").attr("d",path);
  
  updatePing();

}

window.addEventListener("resize", renderEarth);