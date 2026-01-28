
window.charts = window.charts || {};

/* ============================================================================
   GLOBAL TOOLTIP MODULE  (Shared by all charts)
   Legacy Style A — Warm Brass/Brown Floating Tooltip
   ----------------------------------------------------------------------------
   Usage:
       chartsTooltip.show(htmlString, clientX, clientY)
       chartsTooltip.move(clientX, clientY)
       chartsTooltip.hide()

   This tooltip floats above charts, follows the mouse, and fades in/out.
   Style A is commented so you can easily switch to another theme later.
   ==========================================================================*/

(function () {
  // Create tooltip element once
  let tooltipEl = document.getElementById('charts-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'charts-tooltip';
    document.body.appendChild(tooltipEl);
  }

  // Base attributes (invisible until styled below)
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.opacity = '0';
  tooltipEl.style.transition = 'opacity 160ms ease-out';
  tooltipEl.style.zIndex = '999999';

  /* -------------------------------------------------------------------------
     LEGACY TOOLTIP STYLE (Style A) — Brown/Brass Box
     To switch styles later, comment/uncomment this block or replace values.
     ------------------------------------------------------------------------- */
   tooltipEl.style.background = 'rgba(55, 37, 14, 0.92)';      // warm brown
   tooltipEl.style.border = '1px solid rgba(255, 225, 170, 0.55)';
   tooltipEl.style.borderRadius = '6px';
   tooltipEl.style.color = '#fdf9f2';                          // warm off‑white
   tooltipEl.style.fontFamily = 'system-ui, sans-serif';
   tooltipEl.style.fontSize = '0.85rem';
   tooltipEl.style.padding = '0.35rem 0.55rem';
   tooltipEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
   tooltipEl.style.backdropFilter = 'blur(2px)';

  /* -------------------------------------------------------------------------
     ALTERNATE THEMES CAN BE ADDED HERE (commented out)
     e.g., bronze theme, neutral theme, etc.
     ------------------------------------------------------------------------- */

  // Public API
  window.chartsTooltip = {
    show(html, x, y) {
      tooltipEl.innerHTML = html;
      tooltipEl.style.left = (x + 12) + 'px';
      tooltipEl.style.top = (y + 12) + 'px';
      tooltipEl.style.opacity = '1';
    },

    move(x, y) {
      tooltipEl.style.left = (x + 12) + 'px';
      tooltipEl.style.top = (y + 12) + 'px';
    },

    hide() {
      tooltipEl.style.opacity = '0';
    }
  };
})();


//////////////////////////////////////
//
// COLOR FACTORY
//  this code block allows dynamic setting of colors to use in the site
//
//////////////////////////////////////



(function () {
  // Registry for color configuration (domain + named palettes)
  const _cfg = {
    domain: [0, 0.33, 0.66, 1, 1.25],

    // Named palettes
    palettes: {
      // Bright, high-contrast ramp (current default)
      rg_y_gb_bright: ['#D6181E', '#FF7A00', '#FFD400', '#19C24D', '#1E88FF'],

      // ColorBrewer-inspired RdYlGn-ish
      rdylgn: ['#a50026', '#f46d43', '#fdae61', '#66bd63', '#1a9850'],

      // Viridis-like monotone lightness
      viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151'],

      // Desaturated, dark-friendly
      hc_desat: ['#8e0000', '#b85e00', '#b9a200', '#1b7f3b', '#005a9e'],

      // Grayscale ramp
      gray: ['#222', '#555', '#888', '#bbb', '#eee']
    },

    // Current palette name (swappable at runtime)
    current: 'rg_y_gb_bright'
  };

  // Accessors
  function getDomain() { return _cfg.domain.slice(); }
  function setDomain(domain) {
    if (Array.isArray(domain) && domain.length >= 2) _cfg.domain = domain.slice();
  }

  function getPalettes() { return { ..._cfg.palettes }; }
  function setPalette(name, colors) {
    if (!name || !Array.isArray(colors) || colors.length < 2) return;
    _cfg.palettes[name] = colors.slice();
  }

  function usePalette(name) {
    if (name && _cfg.palettes[name]) _cfg.current = name;
  }

  function getCurrentPaletteName() { return _cfg.current; }
  function getCurrentPalette() { return (_cfg.palettes[_cfg.current] || []).slice(); }

  // Scale factory
  // options: { domain?: number[], palette?: string|array }
  function colorScale(options = {}) {
    const domain = Array.isArray(options.domain) && options.domain.length >= 2
      ? options.domain
      : _cfg.domain;

    let range;
    if (Array.isArray(options.palette)) {
      range = options.palette;
    } else if (typeof options.palette === 'string' && _cfg.palettes[options.palette]) {
      range = _cfg.palettes[options.palette];
    } else {
      range = getCurrentPalette();
    }

    return d3.scaleLinear()
      .domain(domain)
      .range(range)
      .clamp(true);
  }

  // Public API surface
  window.charts.colors = {
    getDomain,
    setDomain,
    getPalettes,
    setPalette,        // add/replace a named palette
    usePalette,        // switch active palette by name
    getCurrentPaletteName,
    getCurrentPalette
  };

  // Back-compat convenience: charts.colorScale()
  // Accepts optional { domain, palette } to override defaults ad hoc
  window.charts.colorScale = function (options) {
    return colorScale(options);
  };
})();


//////////////////////////////////////
//
// END COLOR FACTORY
//
//////////////////////////////////////



//////////////////////////////////////
//
// T12 AND HELPER FUNCTIONS
//
//////////////////////////////////////


(function(){
  let _t12Cache = new Map();

  async function computeT12Trend(vesselKey){
    const { t12Calls } = await window.fillBuckets();
    const buckets = [];
    for (let i = 0; i < 24; i++) buckets.push([]);

    for (const c of t12Calls){
      const idx = Math.floor((Date.now() - c.arrival) / (30*24*3600*1000));
      if (idx >= 0 && idx < 24) buckets[idx].push(c);
    }

    function windowSum(arr){ return arr.reduce((a,v)=>a+1, 0); }

    const windows12 = [];
    for (let i = 0; i < 12; i++){
      const slice = buckets.slice(i, i+12);
      windows12.push(windowSum(slice.flat()));
    }

    const series = {
      calls:        { current: windows12[windows12.length-1] },
      usageRate:    { current: 0 },
      kwh:          { current: 0 },
      connections:  { current: 0 }
    };

    return { windows12, series };
  }

  async function getT12Trend({ vesselName=null }={}){
    const key = vesselName || '__all__';
    if (_t12Cache.has(key)) return _t12Cache.get(key);
    const v = await computeT12Trend(key);
    _t12Cache.set(key, v);
    return v;
  }

  function drawT12Trend(hostEl, {seriesKey, legendLabel, vesselName}){
    if (!hostEl) return;
    hostEl.innerHTML = '';
    const trend = _t12Cache.get(vesselName || '__all__');
    if (!trend) return;

    const data = trend.windows12.map((v,i)=>({i,v}));
    const w = hostEl.clientWidth;
    const h = hostEl.clientHeight;

    const svg = d3.select(hostEl).append('svg')
      .attr('width', w).attr('height', h);

    const x = d3.scaleLinear().domain([0,11]).range([0,w-40]);
    const y = d3.scaleLinear().domain([0,d3.max(data,d=>d.v)]).range([h-20,20]);

    const g = svg.append('g').attr('transform','translate(20,0)');
    const line = d3.line().x(d=>x(d.i)).y(d=>y(d.v));

    g.append('path')
      .datum(data)
      .attr('fill','none')
      .attr('stroke','#7a5c2b')
      .attr('stroke-width',2)
      .attr('d',line);

    svg.append('text')
      .attr('x', w/2)
      .attr('y', 16)
      .attr('text-anchor','middle')
      .text(legendLabel || 'Trend');
  }

  window.charts.getT12Trend = getT12Trend;
  window.charts.drawT12Trend = drawT12Trend;
})();




/* my code recommendation: INSERTION — charts.js colors: token registry (metal themes) */

(function () {
  window.charts = window.charts || {};
  window.charts.colors = window.charts.colors || {};

  // Private token registry (theme → named tokens)
  const _tokenSets = {
    metal_bronze: {
      // Radial scaffold tokens
      'radial.stroke': '#7a5c2b',
      'radial.label':  '#7a5c2b'
    },

    // Optional starter for future swaps (values are placeholders to be refined)
    metal_copper: {
      'radial.stroke': '#8b5a2b',
      'radial.label':  '#8b5a2b'
    }
  };

  let _currentTokens = 'metal_bronze';

  function setTokens(themeName, tokensMap) {
    if (!themeName || !tokensMap) return;
    _tokenSets[themeName] = { ...tokensMap };
  }

  function useTokens(themeName) {
    if (_tokenSets[themeName]) _currentTokens = themeName;
  }

  function getTokens(themeName) {
    const k = themeName || _currentTokens;
    return { ...( _tokenSets[k] || {} ) };
  }

  // Read a single token; fallback if not found
  function token(name, fallback) {
    const t = _tokenSets[_currentTokens] || {};
    return (t[name] != null ? t[name] : fallback);
  }

  // Expose on charts.colors
  window.charts.colors.setTokens   = setTokens;
  window.charts.colors.useTokens   = useTokens;
  window.charts.colors.getTokens   = getTokens;
  window.charts.colors.getCurrentTokensName = function () { return _currentTokens; };
  window.charts.colors.token       = token;
})();



/* my code recommendation: INSERTION — full bronze/brass sheen token set */
// INSERT HERE 👉 add bronze/brass sheen tokens extracted from globe.css
charts.colors.setTokens('metal_bronze_full', {
  'rim.base':      '#b78a3d',
  'rim.shadow':    '#7a5c2b',
  'rim.highlight': '#f8e6b6',
  'rim.ref1':      '#caa35a',
  'rim.ref2':      '#d9b978',

  'brass.base':    '#c4933a',
  'brass.mid':     '#d9b15b',
  'brass.deep':    '#7a5c2b',
  'brass.hi':      '#fff1c2',

  // Scaffold colors
  'radial.stroke': '#7a5c2b',
  'radial.label':  '#7a5c2b'
});

// Make this the active theme
charts.colors.useTokens('metal_bronze_full');





///////////////////////////////
//
// CONNECTIONS CHART DRAWS A BELL CURVE BRA GRAPH COUNTING THE NUMBER OF CONNECTIONS TO OSP PER CRUISE LINE
// IT CAN ALSO SPLIT TO SHOW THE COUNT BY SHIP
//
///////////////////////////////

(function () {


function handleElementClick(kind, line, vessel) {
  const name = vessel ? `${line} — ${vessel}` : line;
  // For now, we only log so we can test & verify
  console.log(`${kind}: ${name}`);
}

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

///////////////////////////////
//
// END OF CONNECTIONS CHART
//
///////////////////////////////


///////////////////////////////
//
//  RADIAL CHART SCAFFOLDING
//
///////////////////////////////

// Builds the radial scaffold (ticks, labels, context) and stores context in window.radialCtx.
window.charts = window.charts || {};
window.radialCtx = window.radialCtx || new Map();

window.charts.initRadial = function (containerID) {
  const container = document.getElementById(containerID);
  if (!container) return;

  // Clear the host
  container.innerHTML = '';

  // Geometry from CSS + host box
  const rimPx   = container ? parseFloat(getComputedStyle(container).getPropertyValue('--instrument-rim')) || 0 : 0;
  const bounds  = container.getBoundingClientRect();
  const diameter= Math.min(bounds.width - rimPx * 2, bounds.height - rimPx * 2);
  const radius  = diameter / 2;
  const depth   = radius / 6;

  const width   = container.clientWidth;
  const height  = container.clientHeight;
  const cx = width  / 2;
  const cy = height / 2;
  const stroke = 2;
  const r0 = radius - depth - stroke;

  // Month labels
  const labels  = window.Helpers.monthLabels();
  const axisPad = Math.max(2, stroke);
  const rimPad  = 1;

  // Angular mapping
  const angle = d3.scaleBand()
    .domain(labels)
    .range([0, 2 * Math.PI])
    .padding(0);

  const A     = d => angle(d);
  const M     = d => angle(d) + angle.bandwidth() / 2;
  const aVis  = d => M(d) - Math.PI / 2;
  const toX   = a => Math.cos(a - Math.PI / 2);
  const toY   = a => Math.sin(a - Math.PI / 2);
  const norm2pi = a => (a % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const pct   = d => (M(d) / (2 * Math.PI)) * 100;
  const isBottom = d => { const n = norm2pi(aVis(d)); return n > 0 && n < Math.PI; };

  // ===== THEME TOKENS (no hard-coded HEX) =====
  // Pull scaffold colors from the token registry so future metal themes (e.g., copper) auto-apply.
  const token        = window.charts.colors.token;
  const radialStroke = token('radial.stroke', '#7a5c2b'); // fallback = current brass.deep
  const radialLabel  = token('radial.label',  '#7a5c2b');

  // ===== SVG scaffold =====
  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%')
    .style('position', 'absolute')
    .style('left', 0)
    .style('top', 0)
    .style('overflow', 'visible');

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  // Outer rim circle (tokenized stroke)
  g.append('circle')
    .attr('r', r0)
    .attr('fill', 'none')
    .attr('stroke', radialStroke)
    .attr('stroke-width', stroke);

  const arcGen = d3.arc();

  // Month ticks (tokenized stroke)
  g.selectAll('line.tick')
    .data(labels)
    .enter()
    .append('line')
    .attr('class', 'tick')
    .attr('x1', d => toX(A(d)) * r0)
    .attr('y1', d => toY(A(d)) * r0)
    .attr('x2', d => toX(A(d)) * (r0 + depth))
    .attr('y2', d => toY(A(d)) * (r0 + depth))
    .attr('stroke', radialStroke);

  // Curved label paths
  const rLabel   = r0 - 12;
  const pathDfwd = [
    `M ${cx} ${cy - rLabel}`,
    `A ${rLabel} ${rLabel} 0 1 1 ${cx} ${cy + rLabel}`,
    `A ${rLabel} ${rLabel} 0 1 1 ${cx} ${cy - rLabel}`
  ].join(' ');

  const pathDrev = [
    `M ${cx} ${cy - rLabel}`,
    `A ${rLabel} ${rLabel} 0 1 0 ${cx} ${cy + rLabel}`,
    `A ${rLabel} ${rLabel} 0 1 0 ${cx} ${cy - rLabel}`
  ].join(' ');

  const defs = svg.append('defs');
  defs.append('path').attr('id', 'label-path-fwd').attr('d', pathDfwd).attr('pathLength', 100);
  defs.append('path').attr('id', 'label-path-rev').attr('d', pathDrev).attr('pathLength', 100);

  // Top-half month labels (tokenized fill)
  svg.append('g')
    .selectAll('text.month-top')
    .data(labels.filter(d => !isBottom(d)))
    .enter()
    .append('text')
    .attr('class', 'month-top')
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', radialLabel)
    .append('textPath')
    .attr('xlink:href', '#label-path-fwd')
    .attr('startOffset', d => pct(d) + '%')
    .text(d => d);

  // Bottom-half month labels (tokenized fill)
  svg.append('g')
    .selectAll('text.month-bottom')
    .data(labels.filter(d => isBottom(d)))
    .enter()
    .append('text')
    .attr('class', 'month-bottom')
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', radialLabel)
    .append('textPath')
    .attr('xlink:href', '#label-path-rev')
    .attr('startOffset', d => (100 - pct(d)) + '%')
    .text(d => d);

  // Expose context for drawers (unchanged)
  window.radialCtx.set(containerID, {
    g,
    arcGen,
    r0, depth, stroke,
    segGap: 2,
    axisPad,
    rimPad: 1
  });
};



// this draws the connection quality gauge
window.charts.drawConnGauge = async function (containerID, avgValue, sampleCount) {
  const ctx = window.radialCtx.get(containerID);
  if (!ctx) return;

  const { g, arcGen, r0, depth } = ctx;

  // ===== Resolve theme tokens (no hard-coded hex) =====
  const t             = window.charts.colors.token;
  const gaugeMinor    = t('gauge.minor', 'rgba(0,0,0,0.25)');             // subtle lines/rail
  const gaugeMajor    = t('gauge.major', t('brass.deep',  '#7a5c2b'));     // major ticks
  const gaugeLabel    = t('gauge.label', t('brass.deep',  '#7a5c2b'));     // tick labels
  const gaugeNeedle   = t('gauge.needle',t('brass.base',  '#c4933a'));     // needle stroke
  const gaugeHubFill  = t('gauge.hub.fill',  t('brass.mid',  '#d9b15b'));  // hub fill
  const gaugeHubStroke= t('gauge.hub.stroke',t('brass.deep', '#7a5c2b'));  // hub ring

  // Expose CSS variables as well (keeps CSS rules effective where used)
  const chartEl = document.getElementById(containerID);
  if (chartEl) {
    chartEl.style.setProperty('--gauge-minor',  gaugeMinor);
    chartEl.style.setProperty('--gauge-major',  gaugeMajor);
    chartEl.style.setProperty('--gauge-label',  gaugeLabel);
    chartEl.style.setProperty('--gauge-needle', gaugeNeedle);
    chartEl.style.setProperty('--gauge-hub-fill',   gaugeHubFill);
    chartEl.style.setProperty('--gauge-hub-stroke', gaugeHubStroke);
  }

  // ===== Build gauge group =====
  const gGauge = g.append('g')
    .attr('class', 'conn-gauge')
    .style('pointer-events', 'none');

  // Geometry / angles
  const deg      = d => d * Math.PI / 180;
  const aStart   = deg(250);
  const aSpan    = deg(220);
  const angleScale = d3.scaleLinear()
    .domain([0, 1.25])
    .range([aStart, aStart + aSpan])
    .clamp(true);

  const toXg = a => Math.cos(a - Math.PI/2);
  const toYg = a => Math.sin(a - Math.PI/2);

  const rDial = Math.max(24, r0 - depth/1.2);

  // Keep existing radial CSS positioning hooks
  if (chartEl) {
    chartEl.style.setProperty('--quality-rotor-y',     `${rDial}px`);
    chartEl.style.setProperty('--quality-rotor-factor', `0.25`);
    chartEl.style.setProperty('--quality-rotor-scale',  `0.80`);
  }

  const tickIn  = rDial - 6;
  const tickOut = rDial + 0;

  // Minor ticks (tokenized stroke)
  const minorAngles = d3.range(26).map(i => aStart + (i * aSpan / 25));
  gGauge.selectAll('line.gauge-tick.minor')
    .data(minorAngles)
    .enter()
    .append('line')
    .attr('class', 'gauge-tick minor')
    .attr('x1', a => toXg(a) * tickIn)
    .attr('y1', a => toYg(a) * tickIn)
    .attr('x2', a => toXg(a) * tickOut)
    .attr('y2', a => toYg(a) * tickOut)
    .attr('stroke', gaugeMinor)
    .attr('stroke-width', 1);

  // Major ticks (tokenized stroke)
  const majorVals = [0, 0.25, 0.50, 0.75, 1.0, 1.25];
  const majors = majorVals.map(v => ({ v, a: angleScale(v) }));
  gGauge.selectAll('line.gauge-tick.major')
    .data(majors)
    .enter()
    .append('line')
    .attr('class', 'gauge-tick major')
    .attr('x1', d => toXg(d.a) * tickIn)
    .attr('y1', d => toYg(d.a) * tickIn)
    .attr('x2', d => toXg(d.a) * tickOut)
    .attr('y2', d => toYg(d.a) * tickOut)
    .attr('stroke', gaugeMajor)
    .attr('stroke-width', 2);

  // Major labels (tokenized fill)
  gGauge.selectAll('text.gauge-label')
    .data(majors)
    .enter()
    .append('text')
    .attr('class', 'gauge-label')
    .attr('x', d => toXg(d.a) * (rDial * 0.9))
    .attr('y', d => toYg(d.a) * (rDial * 0.9))
    .attr('text-anchor', 'middle')
    .style('dominant-baseline', 'middle')
    .style('fill', gaugeLabel)
    .style('font-size', '.75rem')
    .style('font-weight', 600)
    .text(d => `${Math.round(d.v * 100)}%`);

  // Rail arc (tokenized fill)
  gGauge.append('path')
    .attr('class', 'gauge-rail')
    .attr('d', arcGen({
      innerRadius: rDial,
      outerRadius: rDial + 1,
      startAngle: aStart,
      endAngle: aStart + aSpan
    }))
    .attr('fill', gaugeMinor);

  // Needle (tokenized stroke)
  const aNeedle = angleScale(avgValue);
  gGauge.append('line')
    .attr('class', 'gauge-needle')
    .attr('x1', toXg(aNeedle) * (tickIn * -0.1))
    .attr('y1', toYg(aNeedle) * (tickIn * -0.1))
    .attr('x2', toXg(aNeedle) * rDial)
    .attr('y2', toYg(aNeedle) * rDial)
    .attr('stroke', gaugeNeedle)
    .attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round');

  // Hub (tokenized fill + stroke)
  gGauge.append('circle')
    .attr('class', 'gauge-hub')
    .attr('r', 4)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('fill',  gaugeHubFill)
    .attr('stroke', gaugeHubStroke)
    .attr('stroke-width', 1);
};


//////////////////////////////////////
//
// RADIAL CALENDAR
//
///////////////////////////////////////
 

/* === Calendar / Radial Month Chart === */
charts.drawRadialCalendar = async function(targetEl, opts = {}) {
    if (!targetEl) return;

    // Clear
    targetEl.innerHTML = '';

    console.log(`found radial calendar host`, targetEl.id);

    // Rebuild exactly as in focus.js version:
    const rimPx = parseFloat(getComputedStyle(targetEl).getPropertyValue('--instrument-rim')) || 0;
    const bounds = targetEl.getBoundingClientRect();
    const diameter = Math.min(bounds.width - rimPx * 2, bounds.height - rimPx * 2);
    const radius = diameter / 2;
    const depth = radius / 6;
    const width = targetEl.clientWidth;
    const height = targetEl.clientHeight;
    const cx = width / 2;
    const cy = height / 2;
    const stroke = 2;
    const r0 = radius - depth - stroke;

    const labels = window.Helpers.monthLabels();
    const axisPad = Math.max(2, stroke);
    const rimPad = 1;
    const angle = d3.scaleBand()
        .domain(labels)
        .range([0, 2 * Math.PI])
        .padding(0);

    const A = d => angle(d);
    const M = d => angle(d) + angle.bandwidth() / 2;
    const aVis = d => M(d) - Math.PI / 2;
    const norm2pi = a => (a % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pct = d => (M(d) / (2 * Math.PI)) * 100;
    const isBottom = d => {
        const n = norm2pi(aVis(d));
        return n > 0 && n < Math.PI;
    };
    const toX = a => Math.cos(a - Math.PI / 2);
    const toY = a => Math.sin(a - Math.PI / 2);
    const rLabel = r0 - 12;

    const pathDfwd = [
        `M ${cx} ${cy - rLabel}`,
        `A ${rLabel} ${rLabel} 0 1 1 ${cx} ${cy + rLabel}`,
        `A ${rLabel} ${rLabel} 0 1 1 ${cx} ${cy - rLabel}`
    ].join(' ');

    const pathDrev = [
        `M ${cx} ${cy - rLabel}`,
        `A ${rLabel} ${rLabel} 0 1 0 ${cx} ${cy + rLabel}`,
        `A ${rLabel} ${rLabel} 0 1 0 ${cx} ${cy - rLabel}`
    ].join(' ');

    const svg = d3.select(targetEl)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', '100%')
        .style('position', 'absolute')
        .style('left', 0)
        .style('top', 0)
        .style('overflow', 'visible');

    const g = svg.append('g')
        .attr('transform', `translate(${cx},${cy})`);

    g.append('circle')
        .attr('r', r0)
        .attr('fill', 'none')
        .attr('stroke', '#7a5c2b')
        .attr('stroke-width', stroke);

    const arcGen = d3.arc();
    const monthSpans = labels.map((lbl, i) => ({
        i,
        startAngle: angle(lbl),
        endAngle: angle(lbl) + angle.bandwidth()
    }));

    const bgGroup = g.append('g').attr('class', 'month-backgrounds');

    g.selectAll('line.tick')
        .data(labels)
        .enter()
        .append('line')
        .attr('class', 'tick')
        .attr('x1', d => toX(A(d)) * r0)
        .attr('y1', d => toY(A(d)) * r0)
        .attr('x2', d => toX(A(d)) * (r0 + depth))
        .attr('y2', d => toY(A(d)) * (r0 + depth))
        .attr('stroke', '#7a5c2b');

    const defs = svg.append('defs');
    defs.append('path').attr('id', 'label-path-fwd').attr('d', pathDfwd).attr('pathLength', 100);
    defs.append('path').attr('id', 'label-path-rev').attr('d', pathDrev).attr('pathLength', 100);

    svg.append('g')
        .selectAll('text.month-top')
        .data(labels.filter(d => !isBottom(d)))
        .enter()
        .append('text')
        .attr('class', 'month-top')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#7a5c2b')
        .append('textPath')
        .attr('xlink:href', '#label-path-fwd')
        .attr('startOffset', d => pct(d) + '%')
        .text(d => d);

    svg.append('g')
        .selectAll('text.month-bottom')
        .data(labels.filter(d => isBottom(d)))
        .enter()
        .append('text')
        .attr('class', 'month-bottom')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#7a5c2b')
        .append('textPath')
        .attr('xlink:href', '#label-path-rev')
        .attr('startOffset', d => (100 - pct(d)) + '%')
        .text(d => d);

    // Keep radialCtx behavior identical
    window.radialCtx.set(targetEl.id, {
        g, arcGen,
        startAngleVis: (m3, q3) => (m3 * 30 + q3 * 6 + 2.0) * Math.PI / 180,
        endAngleVis:   (m4, q4) => (m4 * 30 + q4 * 6 + 3 + 1.0) * Math.PI / 180,
        r0, depth, stroke,
        segGap: 2,
        axisPad,
        rimPad: 1
    });
};



/* === Call Arc Chart (T12 radial call distribution) === */
charts.drawCallArcs = async function(targetEl, opts = {}) {
    if (!targetEl) return;

    const containerID = targetEl.id;

    const ctx = window.radialCtx.get(containerID);
    if (!ctx) return;

    const { byMonth } = await fillBuckets();
    const { g, arcGen, startAngleVis, endAngleVis, r0, depth, segGap, axisPad, rimPad } = ctx;

    const { columns60Calls, maxStack } = window.build60Columns(byMonth);

    const rUnit = maxStack > 0
        ? (depth - axisPad - rimPad - ((maxStack - 1) * segGap)) / maxStack
        : depth;

        
const HIT_ANG_PAD = (0.75 * Math.PI) / 180;     // ±0.75° around the arc
const HIT_RAD_PAD_FACTOR = 0.45;                // portion of segGap we can eat
const HIT_RAD_MAX_FRAC = 0.25;                  // cap vs a


const arcFill = window.charts.colors.token('brass.base', '#b78a3d');

    g.selectAll('path.call-seg')
        .data(columns60Calls)
        .enter()
        .append('path')
        .attr('class', 'call-seg')
        .attr('d', d => {
            const inner = r0 + axisPad + d.idx * (rUnit + segGap);
            const outer = Math.min(r0 + depth - rimPad, inner + rUnit);
            return arcGen({
                innerRadius: inner,
                outerRadius: outer,
                startAngle: startAngleVis(d.m1, d.q1),
                endAngle: endAngleVis(d.m1, d.q1)
            });
        })
        .attr('fill', arcFill)
        .attr('fill-opacity', 0.90)
        .attr('stroke', 'none')
        .append('title')
        .text(d =>
            `${d.call.vessel ?? 'Unknown'} — ${fmtShortMD(d.call.arrival)}`
        );

  // 1) Add invisible hit areas for easier hover
    g.selectAll('path.call-hit')
      .data(columns60Calls)
      .enter()
      .append('path')
      .attr('class', 'call-hit')



  .attr('d', d => {
    // Base row geometry (same row as the arc)
    const baseInner = r0 + axisPad + d.idx * (rUnit + segGap);
    const baseOuter = Math.min(r0 + depth - rimPad, baseInner + rUnit);

    // Radial padding (limited by segGap and a fraction of rUnit)
    const radPad = Math.min(segGap * HIT_RAD_PAD_FACTOR, rUnit * HIT_RAD_MAX_FRAC);

    const inner = Math.max(r0 + axisPad, baseInner - radPad);
    const outer = Math.min(r0 + depth - rimPad, baseOuter + radPad);

    // Angular padding (a tiny bit wider than the visible arc)
    const a0 = startAngleVis(d.m1, d.q1) - HIT_ANG_PAD;
    const a1 = endAngleVis(d.m1, d.q1) + HIT_ANG_PAD;

    return arcGen({
      innerRadius: inner,
      outerRadius: outer,
      startAngle: a0,
      endAngle: a1
    });
  })


      .style('fill', 'transparent')
      .style('pointer-events', 'all');

  // 2) Hover, tooltip, and highlight behavior
    g.selectAll('path.call-hit')
      .on('pointerenter', (event, d) => {
      // Highlight the arc (not the hit area)
        d3.select(event.target.parentNode)
        .selectAll(`path.call-seg`)
        .filter(seg => seg === d)
        .classed('is-hovered', true);

        const v = d.call;
        const arr = v.arrival;
        const dep = v.departure;
        const fmtMD = dt => dt ? dt.toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
        const fmtTime = dt => dt ? dt.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true }) : '';
        const durMs = dep && arr ? dep - arr : 0;
        const m = Math.round(durMs / 60000), h = Math.floor(m / 60), r = m % 60;
        const visitDur = h ? `${h}h ${r}m` : `${r}m`;

        const html =
          `<div><strong>${v.vessel ?? 'Unknown'}</strong></div>` +
          `<div>Arrival: ${fmtMD(arr)}, ${fmtTime(arr)}</div>` +
          `<div>Departure: ${fmtMD(dep)}, ${fmtTime(dep)}</div>` +
          `<div>Duration: ${visitDur}</div>`;

        chartsTooltip.show(html, event.clientX, event.clientY);
      })

      .on('pointermove', (event) => {
        chartsTooltip.move(event.clientX, event.clientY);
      })

      .on('pointerleave', (event, d) => {
        chartsTooltip.hide();
        // Remove hover class from arc
        d3.select(event.target.parentNode)
          .selectAll(`path.call-seg`)
          .filter(seg => seg === d)
          .classed('is-hovered', false);
      });


};


///////////////////////////////////////
//
// END RADIAL CALENDAR
//
//////////////////////////////////////

///////////////////////////////////////
//
// RADIAL OSP CONNECTION RATING
//
//////////////////////////////////////


/* === Power Arc Chart (T12 radial shore power distribution) === */

charts.drawPowerArcs = async function(targetEl, opts = {}) {
  if (!targetEl) return;
  const containerID = targetEl.id;

  const ctx = window.radialCtx.get(containerID);
  if (!ctx) return;

  const { byMonth } = await window.fillBuckets();
  const { arcs, maxCallsAnyMonth } = window.buildPowerArcs(byMonth);
  const { g, arcGen, r0, depth, segGap, axisPad, rimPad } = ctx;

  const toX = a => Math.cos(a - Math.PI / 2);
  const toY = a => Math.sin(a - Math.PI / 2);

  // Radial Y scale: 6:00 → 18:00 mapped to inner→outer radius
  const yRadial = d3.scaleTime()
    .domain([new Date(0,0,0,6,0), new Date(0,0,0,18,0)])
    .range([r0 + axisPad, r0 + depth - rimPad]);

  const toTOD = d => new Date(0,0,0, d.getHours(), d.getMinutes(), d.getSeconds(), 0);
  const isMultiDay = (start, end) => start.toDateString() !== end.toDateString();
  const clampTOD = (dt) => {
    const [min, max] = yRadial.domain();
    const t = toTOD(dt);
    return (t < min) ? min : (t > max) ? max : t;
  };

  const connColor = window.buildConnColorScale();

  const items = arcs.map(a => {
    const midA = (a.startAngle + a.endAngle) / 2;
    const c = a.call;

    // Visit (arrival → departure), clamped to 6–18
    const arrivedAfterWindow = toTOD(c.arrival) > new Date(0, 0, 0, 18, 0);
    let visitStartR, visitEndR;
    if (isMultiDay(c.arrival, c.departure) && arrivedAfterWindow) {
      // show departure-day portion
      visitStartR = yRadial.range()[0];        // 6 AM
      visitEndR   = yRadial(clampTOD(c.departure));
    } else {
      // default: arrival-day portion
      visitStartR = yRadial(clampTOD(c.arrival));
      visitEndR   = isMultiDay(c.arrival, c.departure)
        ? yRadial.range()[1]                   // 6 PM
        : yRadial(clampTOD(c.departure));
    }

    // Connection (connect → disconnect), if present on the call
    const conn = c.connection ?? null;
    const connStartR = conn ? yRadial(clampTOD(conn.connect)) : null;
    const connEndR   = conn
      ? (isMultiDay(conn.connect, conn.disconnect)
          ? yRadial.range()[1]
          : yRadial(clampTOD(conn.disconnect)))
      : null;

    // Connection quality value 0..1.25 (for color scale)
    const stayMsRaw = c.departure - c.arrival;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));
    let connValue = 0;
    if (conn && stayMsAdj > 0) {
      const connMs = conn.disconnect - conn.connect;
      connValue = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
    }

    return {
      angle: midA,
      slotStart: a.startAngle,
      slotEnd: a.endAngle,
      visitStartR,
      visitEndR,
      connStartR,
      connEndR,
      call: c,
      connValue
    };
  });

  // One <g> per visit
  const itemG = g.selectAll('g.power-item')
    .data(items)
    .enter()
    .append('g')
    .attr('class', 'power-item');

  // 1) Visit stay line (thin)
  itemG.append('line')
    .attr('class', 'power-stay')
    .attr('x1', d => toX(d.angle) * d.visitStartR)
    .attr('y1', d => toY(d.angle) * d.visitStartR)
    .attr('x2', d => toX(d.angle) * d.visitEndR)
    .attr('y2', d => toY(d.angle) * d.visitEndR)
    .append('title')
    .text(d =>
      `${d.call.vessel ?? 'Unknown'} — Visit: ${fmtShortMD(d.call.arrival)} ${fmtTime(d.call.arrival)} → ${fmtShortMD(d.call.departure)} ${fmtTime(d.call.departure)}`
    );

  // 2) Connection line (thicker, colored), if present
  itemG.filter(d => d.connStartR != null)
    .append('line')
    .attr('class', 'power-conn')
    .style('--conn-color', d => connColor(d.connValue))   // CSS var → stroke in CSS
    .attr('x1', d => toX(d.angle) * d.connStartR)
    .attr('y1', d => toY(d.angle) * d.connStartR)
    .attr('x2', d => toX(d.angle) * d.connEndR)
    .attr('y2', d => toY(d.angle) * d.connEndR)
    .append('title')
    .text(d => {
      const conn = d.call.connection;
      return `Shore Power: ${fmtShortMD(conn.connect)} ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)} ${fmtTime(conn.disconnect)}`;
    });

  // 3) Transparent hit path per slot (tooltip; click handling remains in focus.js)
  const hit = itemG.append('path')
    .attr('class', 'power-hit')
    .attr('d', d => arcGen({
      innerRadius: r0 + axisPad,
      outerRadius: r0 + depth - rimPad,
      startAngle: d.slotStart,
      endAngle: d.slotEnd
    }))
    .style('fill', 'transparent')
    .style('pointer-events', 'all');

  hit.append('title').text(d => {
    const v = d.call;
    const arr = (v?.arrival instanceof Date) ? v.arrival : new Date(v?.arrival);
    const dep = (v?.departure instanceof Date) ? v.departure : new Date(v?.departure);
    const durMs = (dep && arr && Number.isFinite(dep - arr)) ? (dep - arr) : 0;
    const min = Math.round(durMs / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const visitDur = h ? `${h}h ${m}m` : `${m}m`;
    const conn = v.connection;
    const connText = conn
      ? `\u000AShore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)}\u000AConnection Duration: ${(() => {
          const ms = (conn.disconnect && conn.connect) ? (conn.disconnect - conn.connect) : 0;
          const cm = Math.round(ms / 60000), ch = Math.floor(cm / 60), cmm = cm % 60;
          return ch ? `${ch}h ${cmm}m` : `${cmm}m`;
        })()}`
      : `\u000AShore Power: Did not connect`;
    const noteText = v.note ? `\u000AConnection Note: ${v.note}` : '';
    return `${v.vessel ?? 'Unknown'}\u000AVisit: ${fmtShortMD(arr)}, ${fmtTime(arr)} → ${fmtShortMD(dep)}, ${fmtTime(dep)}\u000ADuration: ${visitDur}${connText}${noteText}`;
  });
};


//////////////////////////////////////
//
// END RADIAL OSP CONNECTION RATING
//
//////////////////////////////////////

//////////////////////////////////////
//
// CARTESIAN CHARTS FOR CARTESIAN MINDS
//
//////////////////////////////////////


(function(){
  window.charts = window.charts || {};

  window.charts.drawUsageChart = function drawUsageChart(hostEl, { vesselName } = {}){
    // Delegate to existing function until Phase D migration
    if (typeof window.drawPowerCanvasChart === 'function') {
      return window.drawPowerCanvasChart(vesselName || null);
    }
  };
})();


(function(){
  window.charts = window.charts || {};

  window.charts.drawUsageCompare = function drawUsageCompare(hostEl, { alphaName, bravoName } = {}){
    // Delegate to existing function until Phase D migration
    if (typeof window.drawPowerCanvasChartCompare === 'function') {
      return window.drawPowerCanvasChartCompare(alphaName || null, bravoName || null);
    }
  };
})();


//////////////////////////////////////
//
// END CARTESIAN CHARTS
//
//////////////////////////////////////


//////////////////////////////////////
//
// USAGE SMALL MULTIPLES
//
//////////////////////////////////////


// INSERT HERE 👉 Usage Multiples chart (wrapper + factory + private helpers)
// NOTE: Initial version focuses on structure & correctness. Visual tokens/colors are minimal.
// TODO: Make MAX_VISIBLE_PANELS dynamic (screen/height-aware).

(function () {
  window.charts = window.charts || {};

  // ---- Public API -----------------------------------------------------------

  /**
   * charts.drawUsageMultiples(hostEl, selection, opts)
   * Renders a small-multiples usage chart (1..N vessels), with a single fixed X-axis.
   * - hostEl: DOM element (already sized by focus.js)
   * - selection: [{ type: "vessel"|"line", name: String }, ...]
   * - opts: { availableHeight: Number, width?: Number, maxPanelsVisible?: Number }
   */
  charts.drawUsageMultiples = async function drawUsageMultiples(hostEl, selection, opts = {}) {
    if (!hostEl) return;

    // ---- Read sizing from focus.js contract (no UI policy here) -------------
    const W = Math.max(1, Math.floor(Number(opts.width ?? hostEl.clientWidth) || 0));
    const H = Math.max(1, Math.floor(Number(opts.availableHeight ?? hostEl.clientHeight) || 0));
    const MAX_VISIBLE_PANELS = Math.max(1, Number(opts.maxPanelsVisible ?? 3)); // TODO: make dynamic per screen

    // ---- Load data & build scales common to all panels ----------------------
    const { t12Calls, lastStart, lastEnd } = await window.fillBuckets(); // shared dataset & T12 window
    const xStart = new Date(lastStart.getFullYear(), lastStart.getMonth(), 1);
    const xEnd   = new Date(lastEnd.getFullYear(),   lastEnd.getMonth() + 1, 1);

    const xScale = d3.scaleTime()
      .domain([xStart, xEnd])
      .range([0, Math.max(0, W - 1)]);

    // X-axis vertical grid ticks (month steps)
    const xGridTicks = d3.timeMonth.range(xStart, xEnd);

    // ---- Expand selection → vessels, group by line, sort by T12 -------------
    const expanded = _expandSelectionToVessels(selection, t12Calls);
    const ordered  = _computeVesselOrdering(expanded, t12Calls); // [{type:"line"| "vessel", name, t12, line?}, ...]
    if (!ordered.length) {
      hostEl.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'chart-empty';
      msg.textContent = 'No data available for the current selection.';
      hostEl.appendChild(msg);
      return;
    }

    // Brand colors: distinct per line, variant per vessel
    const brand = _assignBrandColors(ordered);

    // ---- Compute layout: panels, spacing, scroll region, x-axis -------------
    const L = _computeLayout({
      totalHeight: H,
      nPanels: ordered.filter(d => d.type === 'vessel').length, // vessels only get panels; line entries are headers if desired
      maxVisible: MAX_VISIBLE_PANELS
    });

    // ---- Build SVG scene (fixed x-axis, scrolling panels region) ------------
    hostEl.innerHTML = '';
    const svg = d3.select(hostEl)
      .append('svg')
      .attr('width', W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Scroll group (panels stack vertically inside this area)
    const scrollG = svg.append('g')
      .attr('class', 'usage-scroll');

    // Clip/mask for scrolling region (panels should not overlap the x-axis)
    const defs = svg.append('defs');
    const clipId = `usageClip-${Math.random().toString(36).slice(2)}`;
    defs.append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', W)
      .attr('height', Math.max(0, H - L.xAxisH));

    const panelsViewport = svg.append('g')
      .attr('class', 'usage-viewport')
      .attr('clip-path', `url(#${clipId})`);

    // Vertical grid lines (faint), extend through entire panels stack height
    const gridG = panelsViewport.append('g').attr('class', 'x-grid');
    gridG.selectAll('line.month-grid')
      .data(xGridTicks)
      .enter()
      .append('line')
      .attr('class', 'month-grid')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', Math.max(0, L.panelsTotalH))
      .attr('stroke', 'rgba(127,127,127,0.25)')
      .attr('stroke-width', 1)
      .attr('shape-rendering', 'crispEdges');

    // Stack vessel panels (ordered) inside panelsViewport
    let vIndex = 0;
    for (const entry of ordered) {
      if (entry.type !== 'vessel') continue;

      const yTop = vIndex * (L.panelH + L.panelGap);
      const gPanel = panelsViewport.append('g')
        .attr('class', 'usage-panel')
        .attr('data-vessel', entry.name)
        .attr('transform', `translate(0, ${yTop})`);

      const vesselBrand = (brand[entry.line]?.vessels?.[entry.name]) || (brand[entry.line]?.base) || '#666';

      await drawUsagePanel(gPanel, {
        width: W,
        height: L.panelH,
        innerH: Math.max(0, L.panelH - L.panelPadTop - L.panelPadBottom),
        x: xScale
      }, {
        vessel: entry.name,
        line: entry.line,
        t12Calls,
        brandColor: vesselBrand,
        // Border spec: thin top/bottom (neutral), thicker left/right (brand)
        border: {
          top:   { stroke: 'rgba(127,127,127,0.30)', width: 1 },
          right: { stroke: vesselBrand, width: 2 },
          bottom:{ stroke: 'rgba(127,127,127,0.30)', width: 1 },
          left:  { stroke: vesselBrand, width: 2 }
        },
        padding: { top: L.panelPadTop, right: 8, bottom: L.panelPadBottom, left: 8 }
      });

      vIndex++;
    }

    // Fixed X-axis (outside scroll region, never moves)
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeMonth.every(1))
      .tickFormat(d3.timeFormat('%b %y'))
      .tickSizeOuter(0);

    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${H - L.xAxisH})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('opacity', 0.8));

    // Enable native scrolling when panels exceed visible height (hostEl scrolls)
    // Delegated to PowerCanvas container; here we simply size the inner content.
    // If desired, you can attach wheel/drag to translate panelsViewport.y.

    // Position the scroll group so panels start at y=0 and x-axis sits at bottom
    scrollG.attr('transform', 'translate(0, 0)');
  };

  // ---- Factory: draw a single vessel panel ----------------------------------

  /**
   * drawUsagePanel(gPanel, layout, ctx)
   * - gPanel: <g> container already positioned vertically
   * - layout: { width, height, innerH, x }
   * - ctx: { vessel, line, t12Calls, brandColor, border, padding }
   */
  async function drawUsagePanel(gPanel, layout, ctx) {
    const { width: W, height: H, innerH: IH, x: xScale } = layout;
    const { vessel, t12Calls, brandColor, border, padding } = ctx;

    // Background frame & borders (thin top/bottom neutral; thicker left/right brand)
    // Keep a small gap between panels (panelGap handled in layout).
    gPanel.append('rect')
      .attr('class', 'panel-bg')
      .attr('x', 0).attr('y', 0)
      .attr('width', W).attr('height', H)
      .attr('fill', 'transparent');

    // Separate edges so we can vary stroke weights per side without artifacts
    gPanel.append('line') // top
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', W).attr('y2', 0)
      .attr('stroke', border.top.stroke)
      .attr('stroke-width', border.top.width);

    gPanel.append('line') // bottom
      .attr('x1', 0).attr('y1', H)
      .attr('x2', W).attr('y2', H)
      .attr('stroke', border.bottom.stroke)
      .attr('stroke-width', border.bottom.width);

    gPanel.append('line') // left
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', H)
      .attr('stroke', border.left.stroke)
      .attr('stroke-width', border.left.width);

    gPanel.append('line') // right
      .attr('x1', W).attr('y1', 0)
      .attr('x2', W).attr('y2', H)
      .attr('stroke', border.right.stroke)
      .attr('stroke-width', border.right.width);

    // Inner plotting group (respects padding)
    const plotW = Math.max(0, W - padding.left - padding.right);
    const plotH = Math.max(0, IH);
    const plotG = gPanel.append('g')
      .attr('class', 'plot')
      .attr('transform', `translate(${padding.left}, ${padding.top})`);

    // Y scale: 6:00 → 18:00 (same as radial/cartesian usage)
    const y = d3.scaleTime()
      .domain([new Date(0,0,0,6,0), new Date(0,0,0,18,0)])
      .range([plotH, 0]);

    // Filter calls to this vessel (T12 only; t12Calls is already window-filtered)
    const norm = s => String(s || '').toLowerCase().replace(/[ \-]+/g, ' ').replace(/[^\w\s]/g, '').trim();
    const vKey = norm(vessel);
    const callsForShip = t12Calls.filter(c => norm(c.vessel) === vKey);

    // Helpers (time clamping)
    const toTOD = d => new Date(0,0,0, d.getHours(), d.getMinutes(), d.getSeconds(), 0);
    const isMulti = (a,b) => a.toDateString() !== b.toDateString();
    const clampTOD = dt => {
      const min = new Date(0,0,0,6,0), max = new Date(0,0,0,18,0);
      const t = toTOD(dt); return (t < min) ? min : (t > max) ? max : t;
    };

    // Build items for drawing (visit span + optional connection)
    const connColor = (typeof window.buildConnColorScale === 'function')
      ? window.buildConnColorScale()
      : d3.scaleLinear().domain([0, 0.33, 0.66, 1, 1.25]).range(['#b71c1c','#f57c00','#fbc02d','#2e7d32','#1565c0']).clamp(true);

    const items = callsForShip.map(c => {
      const xDate = new Date(c.arrival.getFullYear(), c.arrival.getMonth(), c.arrival.getDate());
      const X = xScale(xDate);
      const y1 = y(clampTOD(c.arrival));
      const y2 = y(isMulti(c.arrival, c.departure) ? new Date(0,0,0,18,0) : clampTOD(c.departure));

      const conn = c.connection ?? null;
      let cy1 = null, cy2 = null, connVal = 0;
      if (conn) {
        const stayMsRaw = c.departure - c.arrival;
        const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000)); // stay - 3h
        const connMs = conn.disconnect - conn.connect;
        connVal = stayMsAdj > 0 ? Math.max(0, Math.min(1.25, connMs / stayMsAdj)) : 0;
        cy1 = y(clampTOD(conn.connect));
        cy2 = y(isMulti(conn.connect, conn.disconnect) ? new Date(0,0,0,18,0) : clampTOD(conn.disconnect));
      }

      return { c, X, y1: Math.min(y1, y2), y2: Math.max(y1, y2), cy1, cy2, connVal };
    });

    // Visit stay line (thin)
    plotG.append('g').attr('class', 'calls')
      .selectAll('line.call-stay')
      .data(items)
      .enter()
      .append('line')
      .attr('class', 'call-stay')
      .attr('x1', d => d.X).attr('x2', d => d.X)
      .attr('y1', d => d.y1).attr('y2', d => d.y2)
      .attr('stroke', 'rgba(64,64,64,0.85)')
      .attr('stroke-width', 1)
      .attr('shape-rendering', 'crispEdges');

    // Connection overlay (thicker, color by global quality scale)
    plotG.append('g').attr('class', 'connections')
      .selectAll('line.power-conn')
      .data(items.filter(d => d.cy1 != null))
      .enter()
      .append('line')
      .attr('class', 'power-conn')
      .attr('x1', d => d.X).attr('x2', d => d.X)
      .attr('y1', d => Math.min(d.cy1, d.cy2))
      .attr('y2', d => Math.max(d.cy1, d.cy2))
      .attr('stroke', d => connColor(d.connVal))
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('shape-rendering', 'geometricPrecision');

    // Transparent hit region for tooltips (full column)
    const oneDayPx = xScale(new Date(xScale.domain()[0].getTime() + 24*3600*1000)) - xScale(xScale.domain()[0]);
    const hitW = Math.max(8, oneDayPx * 0.66);
    const fmtShortMD = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const fmtTime = d => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    const fmtDur = ms => { const m=Math.round(ms/60000), h=Math.floor(m/60), r=m%60; return h?`${h}h ${r}m`:`${r}m`; };

    plotG.append('g').attr('class', 'hit')
      .selectAll('rect.power-hit')
      .data(items)
      .enter()
      .append('rect')
      .attr('class', 'power-hit')
      .attr('x', d => d.X - hitW/2)
      .attr('y', 0)
      .attr('width', hitW)
      .attr('height', plotH)
      .attr('fill', 'transparent')
      .style('pointer-events', 'all')
      .append('title')
      .text(d => {
        const v = d.c;
        const conn = v.connection ?? null;
        const arr = v.arrival, dep = v.departure;
        const visitDur = fmtDur(dep - arr);
        const connTxt = conn
          ? `\u000AShore Power: ${fmtShortMD(conn.connect)} ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)} ${fmtTime(conn.disconnect)}\u000AConnection Duration: ${fmtDur(conn.disconnect - conn.connect)}`
          : `\u000AShore Power: Did not connect`;
        return `${v.vessel ?? 'Unknown'}\u000AVisit: ${fmtShortMD(arr)} ${fmtTime(arr)} → ${fmtShortMD(dep)} ${fmtTime(dep)}\u000ADuration: ${visitDur}${connTxt}`;
      });
  }

  // ---- Private helpers ------------------------------------------------------

  /**
   * Expand mixed selection (vessels + lines) → { lines: {line:[vessels...]}, vessels:[...] }
   * Uses t12Calls to limit to vessels present in the current T12 window.
   */
  function _expandSelectionToVessels(selection, t12Calls) {
    const norm = s => String(s || '').toLowerCase().replace(/[ \-]+/g, ' ').replace(/[^\w\s]/g, '').trim();
    const byLine = new Map(); // line -> Set(vessel)
    const vesselsSet = new Set();

    // Build a map from vessel -> line using getVesselInfo (when available)
    const vesselLine = new Map();
    for (const c of t12Calls) {
      const v = c.vessel || '';
      if (!v) continue;
      const info = (window.getVesselInfo ? (window.getVesselInfo(v) || {}) : {});
      const line = info.cruiseLine || 'Other';
      vesselLine.set(v, line);
    }

    // Helper to add a vessel (if present in T12) into structures
    const addVessel = (name) => {
      const has = t12Calls.some(c => (c.vessel || '') === name);
      if (!has) return;
      vesselsSet.add(name);
      const line = vesselLine.get(name) || 'Other';
      if (!byLine.has(line)) byLine.set(line, new Set());
      byLine.get(line).add(name);
    };

    // 1) Add explicit vessels
    selection.filter(s => s?.type === 'vessel' && s?.name).forEach(s => addVessel(s.name));

    // 2) Expand lines -> all vessels from that line (present in T12)
    const requestedLines = selection.filter(s => s?.type === 'line' && s?.name).map(s => s.name);
    if (requestedLines.length) {
      for (const v of vesselLine.keys()) {
        const line = vesselLine.get(v);
        if (requestedLines.includes(line)) addVessel(v);
      }
    }

    const linesObj = {};
    for (const [line, set] of byLine) linesObj[line] = Array.from(set.values());
    return { lines: linesObj, vessels: Array.from(vesselsSet.values()) };
  }

  /**
   * Sort lines by T12 call count desc; then vessels within each line by T12 desc.
   * Returns a flat ordered array containing line headers (optional) and vessels.
   * If both a line and one (or more) of its vessels are selected, they appear together.
   */
  function _computeVesselOrdering(expanded, t12Calls) {
    const t12CountByVessel = new Map();
    for (const v of expanded.vessels) {
      t12CountByVessel.set(v, t12Calls.filter(c => c.vessel === v).length);
    }

    // Sum per line
    const t12CountByLine = Object.fromEntries(
      Object.entries(expanded.lines).map(([line, vessels]) => [
        line, vessels.reduce((s, v) => s + (t12CountByVessel.get(v) || 0), 0)
      ])
    );

    // Order lines by count desc
    const orderedLines = Object.keys(expanded.lines)
      .sort((a, b) => (t12CountByLine[b] - t12CountByLine[a]) || a.localeCompare(b));

    // Flatten to ordered array
    const out = [];
    for (const line of orderedLines) {
      // Insert a line header entry only when a line was explicitly part of the selection
      out.push({ type: 'line', name: line, t12: t12CountByLine[line] });

      // Vessels of this line, sorted desc by T12
      const vs = expanded.lines[line].slice().sort((a, b) => {
        const da = t12CountByVessel.get(a) || 0;
        const db = t12CountByVessel.get(b) || 0;
        return (db - da) || a.localeCompare(b);
      });

      for (const v of vs) {
        out.push({ type: 'vessel', name: v, line, t12: t12CountByVessel.get(v) || 0 });
      }
    }

    // Also include any vessel that didn't get included under a line (edge "Other")
    const included = new Set(out.filter(e => e.type === 'vessel').map(e => e.name));
    for (const v of expanded.vessels) {
      if (!included.has(v)) {
        out.push({ type: 'vessel', name: v, line: 'Other', t12: t12CountByVessel.get(v) || 0 });
      }
    }

    return out;
    }

  /**
   * Assign brand colors per line (base) and vessel variants (derived).
   * Uses a short, distinct base palette; vessel variants lighten progressively.
   */
  function _assignBrandColors(ordered) {
    // Compact distinct set; refine/replace with token-based brand mapping later.
    const basePalette = ['#1F77B4','#FF7F0E','#2CA02C','#D62728','#9467BD','#8C564B','#E377C2','#7F7F7F','#BCBD22','#17BECF'];
    const lines = ordered.filter(e => e.type === 'line').map(e => e.name);
    const uniqLines = Array.from(new Set(lines));
    const colorByLine = {};
    uniqLines.forEach((line, i) => {
      colorByLine[line] = { base: basePalette[i % basePalette.length], vessels: {} };
    });

    // Assign vessel variants (simple lighten ramp)
    const byLineVessels = {};
    for (const e of ordered) {
      if (e.type !== 'vessel') continue;
      const line = e.line || 'Other';
      if (!colorByLine[line]) colorByLine[line] = { base: basePalette[0], vessels: {} };
      if (!byLineVessels[line]) byLineVessels[line] = [];
      byLineVessels[line].push(e.name);
    }
    for (const line of Object.keys(byLineVessels)) {
      const base = d3.color(colorByLine[line].base) || d3.color('#777');
      const vs = byLineVessels[line];
      vs.forEach((v, idx) => {
        const t = Math.min(0.6, (idx+1) / Math.max(1, vs.length+1)); // lightness step
        const c = d3.hsl(base.h, Math.max(0, base.s - t*0.25), Math.min(0.9, base.l + t*0.20));
        colorByLine[line].vessels[v] = c.formatHex();
      });
    }
    return colorByLine;
  }

  /**
   * Compute vertical layout & scroll split: panel sizes, spacing, x-axis height.
   * totalHeight includes the x-axis area; panels occupy (totalHeight - xAxisH).
   */
  function _computeLayout({ totalHeight, nPanels, maxVisible }) {
    const xAxisH = 32;         // fixed x-axis height (outside scroll region)
    const panelGap = 10;       // visual gap between panels
    const panelPadTop = 6;     // inner pad top per panel
    const panelPadBottom = 6;  // inner pad bottom per panel

    const visible = Math.min(maxVisible, Math.max(1, nPanels || 1));
    const panelsAreaH = Math.max(0, totalHeight - xAxisH);
    const panelH = Math.max(40, Math.floor((panelsAreaH - panelGap*(visible-1)) / visible));
    const panelsTotalH = Math.max(0, (panelH + panelGap) * nPanels - panelGap);

    return {
      xAxisH,
      panelGap,
      panelPadTop,
      panelPadBottom,
      panelH,
      panelsTotalH
    };
  }

})();



//////////////////////////////////////
//
// END USAGE SMALL MULTIPLES
//
//////////////////////////////////////