
//this chart draws a bell curve bar graph counting the number of connections by cruise line, splittable to individual vessel
(function () {


function handleElementClick(kind, line, vessel) {
  const name = vessel ? `${line} — ${vessel}` : line;
  // For now, we only log so we can test & verify
  console.log(`${kind}: ${name}`);
}

/* my code recommendation: REPLACEMENT — charts.js */
// INSERT HERE 👉 replace the whole function with the version below
window.drawConnectionsByCruiseChart = async function(hostEl, opts = {}) {
  if (!hostEl) return null;
  hostEl.innerHTML = '';

document.addEventListener('click', (ev) => {
  const el = document.elementFromPoint(ev.clientX, ev.clientY);
  // Build a short ancestry string for context
  const path = [];
  let cur = el, i = 0;
  while (cur && i < 5) {
    const id = cur.id ? `#${cur.id}` : '';
    const cls = cur.className && cur.className.baseVal ? `.${cur.className.baseVal}` :
                (cur.className ? `.${String(cur.className).trim().replace(/\s+/g,'.')}` : '');
    path.push(`${cur.tagName?.toLowerCase?.() || cur.tagName}${id}${cls}`);
    cur = cur.parentNode;
    i++;
  }
  console.log('hit-test topmost:', path.join(' ← '));
}, { capture: true });


  console.log('drawConnectionsByCruiseChart:init', { host: hostEl, w: hostEl?.clientWidth, h: hostEl?.clientHeight });

  // Responsive margins via rem (no px)
  const rem = parseFloat(getComputedStyle(hostEl).fontSize) || 16;
  const margin = { top: 3.5*rem, right: 2*rem, bottom: 1.5*rem, left: 2.0*rem };

  // 1) Data — calls in T12, all lines (even with 0 connections)
  const { t12Calls } = await window.fillBuckets();
  const lineSet = new Set();
  const connectedCount = new Map();          // line -> count
  const byLineVessel = new Map();            // line -> Map(vessel -> count)


for (const c of t12Calls) {
  const info = (window.getVesselInfo ? (window.getVesselInfo(c?.vessel) || {}) : {});
  const line = info.cruiseLine || 'Other';
  const vessel = info.correctedName || c?.vessel || 'Unknown Vessel';
  lineSet.add(line);

  const m = byLineVessel.get(line) || new Map();
  if (!m.has(vessel)) m.set(vessel, 0);            // ensure vessel exists even with 0 connections
  if (c && c.connection) {
    connectedCount.set(line, (connectedCount.get(line) || 0) + 1);
    m.set(vessel, m.get(vessel) + 1);              // increment only when connected
  }
  byLineVessel.set(line, m);
}


  const rows = Array.from(lineSet, line => ({
    cruiseLine: line,
    count: connectedCount.get(line) || 0
  })).sort((a,b) => b.count - a.count);

  if (!rows.length) {
    hostEl.textContent = 'No shore power connections in the T12 window.';
    return null;
  }

  // 2) Bell order (0, +1, -1, +2, -2, …)
  const ordered = [];
  rows.forEach((d, i) => {
    const pos = (i === 0) ? 0 : (i % 2 ? (i + 1) / 2 : -i / 2);
    ordered.push({ ...d, pos });
  });
  ordered.sort((a,b) => a.pos - b.pos);

  // 3) Dimensions from host
  const width  = Math.max(80, hostEl.clientWidth  || 0);
  const height = Math.max(80, hostEl.clientHeight || 0);
  const innerW = Math.max(0, width  - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top  - margin.bottom);

  // 4) Scales
  const x = d3.scaleBand()
    .domain(ordered.map(d => d.pos))
    .range([0, innerW])
    .padding(0.20);

  const y = d3.scaleLinear()
    .domain([0, d3.max(ordered, d => d.count) || 1])
    .nice()
    .range([innerH, 0]);

  // 5) SVG
  const svg = d3.select(hostEl).append('svg')
    .attr('width', width)
    .attr('height', height);


svg
.on('pointerdown', (event) => {
  console.log('svg pointerdown:', event.target?.tagName, event.target?.getAttribute?.('class') || '');
})

  .on('click', (event) => {
    console.log('svg click:', event.target?.tagName, event.target?.getAttribute?.('class') || '');
  })
  .style('background', 'rgba(0,0,0,0.0001)')
  .style('z-index', '9999');



  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);


svg.append('text')
  .attr('class', 'chart-title')
  .attr('x', width / 2)
  .attr('y', margin.top * 0.55)   /* center within top margin */
  .attr('text-anchor', 'middle')
  .style('font-size', '1.25rem')
  .text('Connections by Cruise Line');


  // 6) Y grid (no axis line)
  g.append('g')
    .attr('class', 'y-grid')
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(''))
    .select('.domain').remove();

  // Optional Y tick labels (no ticks/axis line)
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(4).tickSize(0))
    .select('.domain').remove();

  // 7) X axis (build ticks, then overwrite default labels)
  const xAxisG = g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(
      d3.axisBottom(x)
        .tickSize(0)
        .tickFormat(pos => (ordered.find(o => o.pos === pos)?.cruiseLine ?? ''))
    );


  xAxisG.select('.domain').remove();

  
xAxisG
  .selectAll('text')
  .classed('chart-interactive', true)
  .attr('data-line', (pos) => (ordered.find(o => o.pos === pos)?.cruiseLine ?? ''))
  .on('click', (event, pos) => {
    event.preventDefault();
    event.stopPropagation();
    const line = ordered.find(o => o.pos === pos)?.cruiseLine ?? '';
    handleElementClick('axis-label', line);
  });

  // Vertical boundaries between bands
  const boundaries = (() => {
    const starts = ordered.map(d => x(d.pos));
    const bw = x.bandwidth();
    const arr = [0];
    for (let i = 0; i < starts.length; i++) arr.push(starts[i] + bw);
    return arr.map(v => Math.max(0, Math.min(innerW, v)));
  })();



  // 8) Vessel arrays by line (sorted)
  const vesselsByLine = new Map();
  byLineVessel.forEach((m, line) => {
    const arr = Array.from(m, ([vessel, count]) => ({ vessel, count }))
                     .sort((a,b) => b.count - a.count);
    vesselsByLine.set(line, arr);
  });

  // 9) Bars with enter/update/exit; split state
  const barsG = g.append('g').attr('class', 'bars');
  const expanded = new Set(); // which lines are split

  function cssSafe(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-'); }

  function updateTickSplitClasses() {
    xAxisG.selectAll('text.chart-interactive').each(function() {
      const line = this.getAttribute('data-line') || '';
      d3.select(this).classed('is-split', expanded.has(line));
    });
  }

  function render() {
    // One group per cruise line/band slot
    const groups = barsG.selectAll('g.bar-group')
      .data(ordered, d => d.cruiseLine);

    const groupsEnter = groups.enter()
      .append('g')
      .attr('class', d => `bar-group g-${cssSafe(d.cruiseLine)}`)
      .attr('transform', d => `translate(${x(d.pos)},0)`);

    groups.merge(groupsEnter)
      .transition().duration(300)
      .attr('transform', d => `translate(${x(d.pos)},0)`);

    groups.exit().remove();

    groups.merge(groupsEnter).each(function(row) {
      const gLine = d3.select(this);
      const isExpanded = expanded.has(row.cruiseLine);
      const parts = vesselsByLine.get(row.cruiseLine) || [];
      const haveParts = parts.length > 0;

      if (!isExpanded || !haveParts) {
        // Remove split bars + labels
        gLine.selectAll('rect.bar-vessel')
          .transition().duration(500)
          .attr('y', y(0))
          .attr('height', innerH - y(0))
          .remove();

        gLine.selectAll('text.vessel-label')
          .transition().duration(500).style('opacity', 0)
          .remove();

          
gLine.selectAll('text.vessel-value')
  .transition().duration(500).style('opacity', 0)
  .remove();


        // Aggregate bar
        const agg = gLine.selectAll('rect.bar-agg')
          .data([row], d => d.cruiseLine);

        agg.enter()
          .append('rect')
          .attr('class', 'bar bar-agg chart-interactive')
          .attr('x', 0)
          .attr('width', x.bandwidth())
          .attr('y', y(0))
          .attr('height', innerH - y(0))
          

          .append('title')
          .text(`${row.cruiseLine}: ${row.count.toLocaleString('en-US')}`);

        gLine.selectAll('rect.bar-agg')
          .transition().duration(300)
          .attr('x', 0)
          .attr('width', x.bandwidth())
          .attr('y', y(row.count))
          .attr('height', innerH - y(row.count));




// INSERT HERE 👉 numeric value label above bar
let valueLabel = gLine.selectAll('text.value-label')
  .data([row]);

valueLabel.enter()
  .append('text')
  .attr('class', 'value-label')
  .attr('text-anchor', 'middle')
  .attr('x', x.bandwidth() / 2)
  .attr('y', y(row.count) - (0.5 * rem))   /* 0.5rem above bar top */
  .text(d => d.count)
.merge(valueLabel)
  .attr('y', y(row.count) - (0.5 * rem))
  .text(d => d.count);

valueLabel.exit().remove();



      } else {
        // Remove aggregate bar
        gLine.selectAll('rect.bar-agg')
          .transition().duration(500)
          .attr('y', y(0))
          .attr('height', innerH - y(0))
          .remove();

          
gLine.selectAll('text.value-label')
  .transition().duration(500).style('opacity', 0)
  .remove();


        // Inner band scale for vessels
        const xv = d3.scaleBand()
          .domain(parts.map(d => d.vessel))
          .range([0, x.bandwidth()])
          .padding(0.35);

        // Vessel bars
        
const rects = gLine.selectAll('rect.bar-vessel')
    .data(parts, d => d.vessel);

  const rectsEnter = rects.enter()
    .append('rect')
    .attr('class', 'bar bar-vessel split-child chart-interactive')
    .attr('data-line', row.cruiseLine) 
    .attr('x', d => xv(d.vessel))
    .attr('width', xv.bandwidth())
    .attr('y', y(0))
    .attr('height', innerH - y(0));

  // (keep title creation separate so we don't lose the rect selection)
  rectsEnter.append('title')
    .text(d => `${row.cruiseLine} — ${d.vessel}: ${d.count.toLocaleString('en-US')}`);

  // Optional: logging while we test (safe to remove later)
  rectsEnter.on('click', (event, d) => { 
    event.preventDefault(); 
    event.stopPropagation(); 
    handleElementClick('bar', row.cruiseLine, d.vessel); 
  });

  rectsEnter.merge(rects)
    .transition().duration(300)
    .attr('x', d => xv(d.vessel))
    .attr('width', xv.bandwidth())
    .attr('y', d => y(d.count))
    .attr('height', d => innerH - y(d.count));

  rects.exit()
    .transition().duration(500)
    .attr('y', y(0))
    .attr('height', innerH - y(0))
    .remove();

    
const vVals = gLine.selectAll('text.vessel-value')
  .data(parts, d => d.vessel);

const vValsEnter = vVals.enter()
  .append('text')
  .attr('class', 'vessel-value')
  .attr('text-anchor', 'middle')
  .attr('x', d => xv(d.vessel) + xv.bandwidth() / 2)
  .attr('y', y(0) - (0.5 * rem))     // start near baseline, will tween up
  .style('opacity', 0)
  .text(d => d.count);

vValsEnter.merge(vVals)
  .transition().duration(300)
  .attr('x', d => xv(d.vessel) + xv.bandwidth() / 2)
  .attr('y', d => y(d.count) - (0.5 * rem))  // sits ~0.5rem above the bar top
  .style('opacity', 0.9);

vVals.exit()
  .transition().duration(500)
  .style('opacity', 0)
  .remove();



        // Vessel labels (vertical above bars)
        const labels = gLine.selectAll('text.vessel-label')
          .data(parts, d => d.vessel);

        labels.enter()
          .append('text')
          .attr('class', 'vessel-label')
          .attr('text-anchor', 'end')
          .attr('transform', d => `translate(${xv(d.vessel)+xv.bandwidth()/2},${y(d.count)}) rotate(-90)`)
          .attr('dy', '-0.25em')
          .style('opacity', 0)
          .text(d => d.vessel)
          .merge(labels)
          .transition().duration(300)
          .attr('transform', d => `translate(${xv(d.vessel)+xv.bandwidth()/2},${y(d.count)}) rotate(-90)`)
          .style('opacity', 0.9);

        labels.exit().transition().duration(500).style('opacity', 0).remove();
      }
    });

    updateTickSplitClasses();
  }

document.addEventListener('pointerdown', (ev) => {
  // Only react to events inside this chart's host
  if (!hostEl.contains(ev.target)) return;

  // 1) Bars (aggregate or vessel) — rely on D3-bound datum when available


const barEl = ev.target.closest('rect.bar');
  if (barEl) {
    const d = barEl.__data__ || (window.d3 ? d3.select(barEl).datum() : null);
    const line = (d && d.cruiseLine) || barEl.getAttribute('data-line') || '';
    if (line) toggleLineView(line);
    ev.stopPropagation();
    return;
  }



  // 2) X-axis cruise line label
  const labelEl = ev.target.closest('.x-axis text.chart-interactive');
  if (labelEl) {
    const line = labelEl.getAttribute('data-line') || '';
    handleElementClick('axis-label', line);
    ev.stopPropagation();
  }
}, { capture: true });



function expandLine(line) {
  if (!expanded.has(line)) {
    expanded.add(line);
    render();
    updateTickSplitClasses();
  }
}
function regroupLine(line) {
  if (expanded.has(line)) {
    expanded.delete(line);
    render();
    updateTickSplitClasses();
  }
}
function toggleLineView(line) {
  if (expanded.has(line)) regroupLine(line); else expandLine(line);
}


  // Initial draw
  render();

  // Expose tiny API if needed
  
return {
  svg: svg.node(),
  group: g.node(),
  data: ordered,
  expandLine: (line) => expandLine(line),
  regroupLine: (line) => regroupLine(line),
  toggleLineView: (line) => toggleLineView(line)
};

};





})();
