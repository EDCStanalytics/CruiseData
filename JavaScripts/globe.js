const pointsOfInterest = [
  { name: "King's Wharf (Bermuda)", coords: [-64.8340, 32.3230] },
  { name: "Nassau, Bahamas", coords: [-77.3554, 25.0582] },
  { name: "Half Moon Cay (Little San Salvador), Bahamas", coords: [-75.1083, 24.5786] },
  { name: "Grand Turk, Turks & Caicos", coords: [-71.1389, 21.4670] },
  { name: "San Juan, Puerto Rico", coords: [-66.1060, 18.4655] },
  { name: "Charlotte Amalie (St. Thomas), USVI", coords: [-64.9330, 18.3410] },
  { name: "Halifax, Nova Scotia", coords: [-63.5752, 44.6488] },
  { name: "Saint John, New Brunswick", coords: [-66.0647, 45.2733] },
  { name: "Boston, Massachusetts", coords: [-71.0589, 42.3601] },
  // European port frequently linked via transatlantic QM2 service from Brooklyn
  { name: "Southampton, United Kingdom", coords: [-1.4043, 50.9097] },
  { name: "Brooklyn Cruise Terminal", coords: [-74.0143, 40.6820] },
  { name: "Portland, Maine", coords:  [-70.2553, 43.6591]}
];

const mustShow = [[-74.006, 40.713],[-66.106, 18.466],[-3.704, 40.417]];

const centroidLonLat = (points) => {
  const toVec = ([lon, lat]) => {
    const λ = lon * Math.PI/180, φ = lat * Math.PI/180;
    return [Math.cos(φ)*Math.cos(λ), Math.cos(φ)*Math.sin(λ), Math.sin(φ)]
  };
  const v = points.map(toVec).reduce((a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],[0,0,0]);
  const r = Math.hypot(v[0], v[1], v[2]);
  const λ = Math.atan2(v[1], v[0]) * 180/Math.PI;
  const φ = Math.asin(v[2]/r) * 180/Math.PI;
  return [λ, φ];
}


const svgEarth = d3.select("#earth").append("svg");

const svgShadow = d3.select("#earth").append("svg")
  .style("position", "absolute")
  .style("top", 0)
  .style("left", 0)
  .style("pointer-events", "none");

const shadowDefs = svgShadow.append("defs");

const shadowGradient = shadowDefs.append("radialGradient")
  .attr("id", "shadowGradient")
  .attr("gradientUnits", "userSpaceOnUse")
;

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


// Soft glow filter
const glow = defs.append("filter").attr("id","poiGlow");
glow.append("feGaussianBlur")
    .attr("stdDeviation", 2.5)
    .attr("result","blur");
const merge = glow.append("feMerge");
merge.append("feMergeNode").attr("in","blur");
merge.append("feMergeNode").attr("in","SourceGraphic");



// Land
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json").then(data => {
  const countries = topojson.feature(data, data.objects.countries);

  svgEarth.selectAll("path.land")
    .data(countries.features)
    .enter().append("path")
    .attr("class", "land")
    .attr("d", path)
    .attr("fill", "#b0b0b0")
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5);

/* my code recommendation: */
// Replace the circle.poInterest block with grouped POIs
const poiG = svgEarth.selectAll("g.poi")
  .data(pointsOfInterest)
  .enter().append("g")
  .attr("class", "poi");

// core dot (slightly larger, with glow)
poiG.append("circle")
  .attr("class", "poiDot")
  .attr("r", 5.5)
  .attr("fill", "#ffcc00")
  .attr("stroke", "#333")
  .attr("stroke-width", 1)
  .style("filter", "url(#poiGlow)");

// pulsing ring (animated)
poiG.append("circle")
  .attr("class", "poiPulse")
  .attr("r", 6)
  .attr("fill", "none")
  .attr("stroke", "#ffcc00")
  .attr("stroke-width", 1.5)
  .style("opacity", 0.75);



poiG.append("circle")
  .attr("class", "poiHit")
  .attr("r", 22)
  .attr("fill", "#000")              // any color
  .attr("fill-opacity", 0.1)       // effectively invisible, but "painted"
  .attr("stroke", "#0080ff")         // keep visible while debugging; remove later
  .attr("stroke-width", 1)



// Append the label (initially hidden)
poiG.append("text")
  .attr("class", "poiLabel")
  .attr("y", -12)
  .attr("text-anchor", "middle")
  .attr("fill", "#6c5211")
  .style("font-size", "12px")
  .style("opacity", 1)
  .style("pointer-events", "none")   // label won't steal hover
  .text(d => d.name);


poiG.selectAll(".poiHit")
  .on("pointerover", (event, d) => {
    //console.log("[POI hover] pointerover:", d?.name, event.target);
    d3.select(event.currentTarget.parentNode).select(".poiLabel").style("opacity", 1);
  })
  .on("pointerout", (event, d) => {
    //console.log("[POI hover] pointerout:", d?.name, event.target);
    d3.select(event.currentTarget.parentNode).select(".poiLabel").style("opacity", 0);
  });


  
poiG.selectAll(".poiLabel")
  .on("end.debug", function() {
    console.log("[label transition end] opacity =", this.style.opacity, "text =", this.textContent);
  });

  
pointsOfInterest.forEach(d => {
  const p = projection(d.coords);
  //console.log("[projection]", d.name, "→", p);
});

svgEarth.on("pointermove.debug", (event) => {
  const t = event.target;
  console.log("[pointermove] target:", t && t.classList ? t.classList.value : t);
});

poiG.raise();

poiG.selectAll(".poiLabel")
  .style("pointer-events", "none");


  renderEarth();

  
function animatePOIs() {
  svgEarth.selectAll("circle.poiPulse")
    .transition().duration(1800).ease(d3.easeCubicOut)
      .attr("r", 20).style("opacity", 0)
    .transition().duration(0) // reset
      .attr("r", 6).style("opacity", 0.75)
    .on("end", animatePOIs);
}
animatePOIs();

});


function updatePing() {
  svgEarth.selectAll("g.poi")
    .attr("transform", d => {
      const p = projection(d.coords);
      return `translate(${p[0]},${p[1]})`;
    });
}




function renderEarth() {
  const width = window.innerWidth;
  const headerObject = document.getElementById("theHeaderBar");
  const height = window.innerHeight - headerObject.offsetHeight;

  svgEarth.attr("width", width).attr("height", height);
  svgShadow.attr("width", width).attr("height", height);

  const [λc, φc] = centroidLonLat(mustShow);

  projection
    .distance(8)                // a bit further back → wider horizon
    .tilt(20)                   // keep your tilt
    .rotate([-λc, -φc, -14])    // rotate to center on the centroid
    .scale(Math.min(width, height) * 1.25)
    .translate([width/2, height * 0.45]);

  // Recompute horizon & clip, update paths and POIs (your existing logic continues)
  const horizon = Math.acos(1 / projection.distance()) * 180 / Math.PI;
  projection.clipAngle(horizon - 1e-6);

  const [tx, ty] = projection.translate();
  const globeRadius = projection.scale(); // satellite uses scale == pixel radius

  shadowGradient
    .attr("cx", tx)
    .attr("cy", ty)
    .attr("r", globeRadius);

    
  const shadow = svgShadow.selectAll("path.shadowSphere").data([{ type: "Sphere" }]);
  shadow.enter().append("path").attr("class", "shadowSphere");
  svgShadow.selectAll("path.shadowSphere").attr("d", path).attr("fill", "url(#shadowGradient)").style("pointer-events", "none");


  svgShadow.selectAll("path.shadowSphere").attr("d", path);

  svgEarth.selectAll("path").attr("d", path);
  updatePing();
}



window.addEventListener("resize", renderEarth);