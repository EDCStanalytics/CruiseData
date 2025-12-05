const covidDataURL = '../Data/covidData.csv'

const collectTheDead = (deadYear) => {
  if (typeof deadYear !== 'number') {
    console.log('A specific year must be called.');
    return Promise.reject('Invalid year');
  }

  return fetch(covidDataURL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      const dataRows = data.split('\r\n');
      const annualDead = dataRows.filter(row => row.split(',')[0] == deadYear);
      const tbDead = annualDead.map((record) => {
        const parts = record.split(',');
        return [+parts[0], +parts[1], +parts[2].trim()]
    })

      return tbDead;
    });
};

//let comboLayout = document.getElementById('rightChartContainer')

let chartMargins = [];
let chartWidth = 0;
let chartHeight = 0;
let chartRefs = [];


//this function defines the bounds of a radial chart wrapped around an element
const radialFrameWork = (container) => {
    chartMargins = {top: 10, right: 10, bottom: 10, left: 10};
    //chartWidth = comboLayout.clientWidth - chartMargins.left - chartMargins.right;
    //chartHeight = comboLayout.clientHeight - chartMargins.top - chartMargins.bottom;
    chartWidth = container.clientWidth - chartMargins.left - chartMargins.right;
    chartHeight = container.clientHeight - chartMargins.top - chartMargins.bottom;
}

//this function takes a container and wraps a dataset around it in a radial chart
function drawRadialChart(containerId, data) {

    const container = document.getElementById(containerId);
    const bounds = container.getBoundingClientRect();
    const diameter = Math.min(bounds.width, bounds.height);     //this is the diameter of the element, which we don't want to draw on
    const radius = diameter / 2;
    const depth = radius / 5;
    const outerDiameter = diameter + depth * 2;                 //this is the amount of extra space outside the element the graph can use

    //console.log(`The bounds for ${data.name} are: D = ${diameter} r = ${radius} d = ${depth} so that the outer D is ${outerDiameter}`)

  const radialSVG = d3.select(`#${containerId}`)
    .append("svg")
    .style("position", "absolute")
    .style("overflow", "visible")
    .style("left", "50%")
    .style("top", "50%")
    .style("transform", "translate(-50%, -50%)")
    .attr("width", outerDiameter)
    .attr("height", outerDiameter)
    .append("g")
    .attr("transform", `translate(${outerDiameter / 2},${outerDiameter / 2})`);

  const angle = d3.scaleBand()
    .range([0, 2 * Math.PI])
    .domain(data.map(d => d[1]))
    .padding(0.1);

  const r = d3.scaleLinear()
    .range([radius, radius + depth]) 
    .domain([0, d3.max(data, d => d[2])]);


    const formatMonth = d3.timeFormat("%b %Y");
    const formatValues = d3.format(",d");
  const arcs = radialSVG.selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("fill", "steelblue")
    .attr("d", d3.arc()
        .innerRadius(radius)
        .outerRadius(d => r(d[2]))
        .startAngle(d => angle(d[1]))
        .endAngle(d => angle(d[1]) + angle.bandwidth())
        )
        .on("mouseover", function (event, d) {
            tooltip.style("opacity", 1)
                //.html(`${d[0]} / ${d[1]}<br>${d[2]}`)
                .html(`${formatMonth(new Date(+d[0], +d[1]-1))}<br>${formatValues(d[2])}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
            })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
            })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
            });
            
    const tooltip = d3.select("#tooltip");

    //after performing all the actions above, there are some variables it would be helpful to access for our future transforms
    return {radialSVG, arcs, innerRadius: radius, rScale: r, angle };
}

async function init() {
    //first we populate our data sets
    const year0Covid = await collectTheDead(2020);
    const year1Covid = await collectTheDead(2021);

    //then we chart them to our kpi buckets
    chartRefs.leftChartContainer = drawRadialChart('leftChartContainer', year0Covid);
    chartRefs.rightChartContainer = drawRadialChart('rightChartContainer', year1Covid);
};
/*
//first we'll dynamically generate a bar chart
//this part adds an svg container
const svg = d3.select("#squareChartContainer")
    .append("svg")
    .attr("width", chartWidth + chartMargins.left + chartMargins.right)
    .attr("height", chartHeight + chartMargins.top + chartMargins.bottom)
    .append("g")
    .attr("transform", `translate(${chartMargins.left},${chartMargins.top})`);
*/



/*
//then we define scales
    const x = d3.scaleBand()
        .range([0, chartWidth])
        .padding(0.1)
        .domain(year0Covid.map(d => d[1]));

    const y = d3.scaleLinear()
        .range([chartHeight, 0])
        .domain([0, globalMax]);
/*
//this is where the data is actually linked to the drawing
    svg.selectAll(".bar")
        .data(year0Covid)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[1]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[2]))
        .attr("height", d => chartHeight - y(d[2]));
*/

//a radial chart is harder. we have to calculate a bunch of stuff manually

/*
const roundLayout = document.getElementById('rightChartContainer')
const roundBounds = roundLayout.getBoundingClientRect();
const roundDiameter = Math.min(roundBounds.width, roundBounds.height);

const polarRadius = roundDiameter/2;
const polarDepth = roundDiameter/10;
const outerSVGDiameter = roundDiameter + polarDepth * 2

/*
//this connects the svg to the pseudo element in the middle of our actual element
const arcSVG = d3.select("#leftChartContainer")
    .append("svg")
    .style("position", "absolute")
    .style("overflow", "visible")
    .style("left", "50%")
    .style("top", "50%")
    .style("transform", "translate(-50%, -50%)")
    .attr("width", outerSVGDiameter)
    .attr("height", outerSVGDiameter)
    .append("g")
    .attr("transform", `translate(${outerSVGDiameter/2},${outerSVGDiameter/2})`);
*/
/*
//these are the scales for the default radial layout
    const angle = d3.scaleBand()
      .range([0, 2 * Math.PI])
      .domain(year0Covid.map(d => d[1]))
      .padding(0.1);   

    const r = d3.scaleLinear()
      .range([polarRadius, polarRadius + polarDepth])
      .domain([0, globalMax]);

//these are the scales for the bar chart
    const combo_x = d3.scaleBand()
        .range([0, chartWidth])
        .padding(0.1)
        .domain(year0Covid.map(d => d[1]));

    const combo_y = d3.scaleLinear()
        .range([0, chartHeight])  // 0 at bottom, chartHeight at top
        .domain([0, d3.max(year0Covid, d => d[2])]);

      /*
//this is where the data is actually linked to the drawing
arcSVG.selectAll("path")
        .data(year0Covid)
        .enter().append("path")
        .attr('fill','steelblue')
        .attr("d", d3.arc()
          .innerRadius(polarRadius)
          .outerRadius(d => r(d[2]))
          .startAngle(d => angle(d[1]))
          .endAngle(d => angle(d[1]) + angle.bandwidth())
        );
*/

/*
//now we're going to make a single svg that morphs from one shape to the other when the user flips the switch
const comboSVG = d3.select("#rightChartContainer")
    .append("svg")
    .style("position", "absolute")
    .style("overflow", "visible")
    .style("left", "50%")
    .style("top", "50%")
    .style("transform", "translate(-50%, -50%)")
    .attr("width", outerSVGDiameter)
    .attr("height", outerSVGDiameter)
    .append("g")
    .attr("transform", `translate(${outerSVGDiameter/2},${outerSVGDiameter/2})`);
 */

  /*
function cartesianPath(d) {
  const w = combo_x.bandwidth();
  const x0 = combo_x(d[1]) - chartWidth/2;  // shift left so chart is centered
  const x1 = x0 + w;
  const y0 = 0 + chartHeight/2;                          // baseline at bottom
  const y1 = -combo_y(d[2]) + chartHeight/2;             // negative because SVG y grows down

  return `
    M ${x0},${y0}
    L ${x0},${y1}
    L ${x1},${y1}
    L ${x1},${y0}
    Z
  `;
}

function cartesianPoints(d) {
  const w = combo_x.bandwidth();
  const x0 = combo_x(d[1]) - chartWidth/2; // - chartWidth/2;
  const x1 = x0 + w;
  const y0 = 0 + chartHeight/2;
  const y1 = -combo_y(d[2]) + chartHeight/2;

  return [
    [x0, y0],
    [x0, y1],
    [x1, y1],
    [x1, y0],
    [x0, y0],
  ];
  
}
*/

/*
function radialPoints(d) {
  const r0 = polarRadius;
  const r1 = combo_r(d[2]);
  const a0 = combo_angle(d[1]);
  const a1 = a0 + combo_angle.bandwidth();

  return [
    toXY(r0, a0), // A inner start
    toXY(r1, a0), // B outer start
    toXY(r1, a1), // C outer end
    toXY(r0, a1), // D inner end
    toXY(r0, a0), // A again
  ];
}

function toXY(r, angle) {
  return [ r * Math.cos(angle - Math.PI/2), 
           r * Math.sin(angle - Math.PI/2) ];
}

function pointsToPath(pts) {
  const p = d3.path();
  p.moveTo(...pts[0]);
  pts.slice(1).forEach(pt => p.lineTo(...pt));
  p.closePath();
  return p.toString();
}

/*
//const comboPaths = cartesianG.selectAll("path")
const bars = comboSVG.selectAll("rect")
  .data(year0Covid)
  .enter()
    .append("rect")
    .attr("x", d => combo_x(d[1]) - chartWidth/2)
    .attr("y", d => -combo_y(d[2]) + chartHeight/2)
    .attr("width", combo_x.bandwidth())
    .attr("height", d => combo_y(d[2]))
    .attr("fill", "steelblue")
    //.attr("d", cartesianPath);
*/

function collapseToArcs(arcs, innerRadius, angle) {
  return new Promise(resolve => {
    arcs.transition().duration(500)
      .attr("d", d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(innerRadius + 5) // fixed thickness
        .startAngle(d => angle(d[1]))
        .endAngle(d => angle(d[1]) + angle.bandwidth())
      )
      .filter((d, i, nodes) => i === nodes.length - 1)
      .on("end", resolve);
  });
}

function collapseArcsToPoints(svg, data) {
  return new Promise(resolve => {
    // Fade arcs out and remove them
    arcs.transition().duration(1000)
      .style("opacity", 0)
      .remove();

    // Append points at the center (or inner radius)
    const points = svg.selectAll(".point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 0)
      .transition().duration(1000)
      .attr("r", 3)
      .on("end", (d, i, nodes) => {
        if (i === nodes.length - 1) resolve(points); // return points selection
      });

  });
}


function movePointsToBaseline(points, combo_x, chartWidth, chartHeight) {
  return new Promise(resolve => {
    points.transition().duration(1500)
      .attr("cx", d => combo_x(d[1]) - chartWidth / 2 + combo_x.bandwidth() / 2)
      .attr("cy", chartHeight / 2)
      .filter((d, i, nodes) => i === nodes.length - 1)
      .on("end", (d, i, nodes) => {
        if (i === nodes.length - 1) resolve();
      });

  });
}

function pointsToBars () {
  return new Promise( resolve => {
    comboSVG.selectAll("rect")
  })
}

function expandBars() {
  return new Promise(resolve => {
    bars.transition().duration(1500)
      .attr("y", d => -combo_y(d[2]) + chartHeight/2)
      .attr("height", d => combo_y(d[2]))
      .filter((d, i, nodes) => i === nodes.length - 1)
      .on("end", resolve)
  
  d3.select(".y-axis").transition().duration(500).style("opacity", 1);
  });
}

function collapseBars() {
  return new Promise(resolve => {
    bars.transition().duration(1500)
      .attr("y", chartHeight/2)
      .attr("height", 4)
      .filter((d, i, nodes) => i === nodes.length - 1)
      .on("end", resolve)
  
  d3.select(".y-axis").transition().duration(500).style("opacity", 0);
  });
}

function collapseBarsToPoints () {
  bars.transition().duration(1500)
    .style("opacity",0)
    .attr("width", 0)
    .attr("x", d => combo_x(d[1]) - chartWidth/2 + combo_x.bandwidth() / 2)
    .remove();

  comboSVG.selectAll(".point")
    .data(year0Covid)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", d => combo_x(d[1]) - chartWidth/2 + combo_x.bandwidth() / 2)
    .attr("cy", chartHeight/2)
    .attr("r",0)
    .transition().duration(1000)
    .attr("r",3);
}

//function translate barpoints to radial points

function expandPointsToArcs(points, arcs, innerRadius, rScale, angle) {
  return new Promise(resolve => {
    // Fade points out
    points.transition().duration(1000)
      .style("opacity", 0)
      .remove();

    // Recreate arcs and animate them back to full size
    arcs.transition().duration(1500)
      .style("opacity", 1)
      .attr("d", d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(d => rScale(d[2]))
        .startAngle(d => angle(d[1]))
        .endAngle(d => angle(d[1]) + angle.bandwidth())
      )
      .filter((d, i, nodes) => i === nodes.length - 1)
      .on("end", resolve);
  });
}

function expandArcs(arcs, innerRadius, rScale, angle) {
  return new Promise(resolve => {
    arcs.transition().duration(1500)
      .attr("d", d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(d => rScale(d[2])) // restore data-driven size
        .startAngle(d => angle(d[1]))
        .endAngle(d => angle(d[1]) + angle.bandwidth())
      )
      .filter((d, i, nodes) => i === nodes.length - 1)
      .on("end", resolve);
  });
}





/*
window.updateComboChart = function () {
  comboPaths.transition().duration(2000)
    .attrTween("d", function(d) {
      const start = test_switch_value ? cartesianPoints(d) : radialPoints(d);
      const end   = test_switch_value ? radialPoints(d) : cartesianPoints(d);

      const interp = d3.interpolateArray(start, end);

      return t => pointsToPath(interp(t));
    });
};
*/

//this transitions the chart from bar to circle layout
window.barsToCircle = async function (containerId) {
    const svg = d3.select(`#${containerId} svg g`);
    const data = chartRefs[containerId].data;
    const chart = chartRefs[containerId]
    const { arcs, innerRadius, rScale, angle} = chart;
  
  //collapse the bars to lines
  //await collapseBars();

  //collapse the lines into points
  //await collapseToPoints();

  //fly the points to the x axis of the radial chart

  //replace the points with arcs
    await expandPointsToArcs(points, arcs, innerRadius, rScale, angle)
  //expand the arcs into pie slices
    await expandArcs(arcs, innerRadius, rScale, angle);
};

//to transition the circle to a bar chart,
window.circleToBars = async function (containerId) {
    //const {svg, arcs, data, radius} = chartRefs[containerId];
    //const {combo_x, combo_y, chartWidth, chartHeight} = chartRefs[containerId].scales;
    
    //collapse the pie slices to arcs
    await collapseToArcs(
        chartRefs.containerId.arcs,
        chartRefs.containerId.innerRadius,
        chartRefs.containerId.angle
    )
  
    //collapse the arcs to points
    //const points = await collapseArcsToPoints(svg, data);

    //fly the points to the bar chart x axis
    //await movePointsToBaseline(points, combo_x, chartWidth, chartHeight);
  //expand the points out to lines

  //grow the lines into bars
  //expandBars();
}



//};

init();