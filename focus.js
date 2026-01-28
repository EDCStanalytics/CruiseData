/* my code recommendation: INSERTION — initialize global callsSelection + renderer */

// --- Global Calls Selection State -------------------------------------------
// Any UI element that changes what the user wants to inspect should update this array
// before calling window.renderUsageMultiples().
// Example shapes:
//   { type: "vessel", name: "MSC Meraviglia" }
//   { type: "line",   name: "Carnival Cruise Line" }
window.callsSelection = [];


// --- Central Render Function -----------------------------------------------
// Re-renders the Usage Multiples chart each time the selection changes.
// focus.js controls PowerCanvas sizing; we simply use the host's current box.
window.renderUsageMultiples = function renderUsageMultiples() {
  const hostEl = document.querySelector('.pc-chart');
  if (!hostEl) return;

  const availableHeight = hostEl.clientHeight;
  const width = hostEl.clientWidth;

  charts.drawUsageMultiples(hostEl, window.callsSelection, {
    availableHeight,
    width
  });
};


window.TickBatch = window.TickBatch || (function () {
  let q = [];
  let scheduled = false;

  function run() {
    scheduled = false;
    const jobs = q;
    q = [];
    // Run jobs; each job should only do DOM writes (no reads causing sync layout)
    for (let i = 0; i < jobs.length; i++) {
      try { jobs[i](); } catch (e) { /* no-throw */ }
    }
  }

  return {
    queue(fn) {
      if (typeof fn !== 'function') return;
      q.push(fn);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(run);
      }
    }
  };
})();


document.addEventListener("DOMContentLoaded", () => {

//with the dom fully loaded, add click listeners to the kpibuckets
document.getElementById('ospChartContainer')
  .addEventListener('click', () => {
    console.log("cue OSP bucket focus");
    CueDirector.emit('CLICK_BUCKET_OSP');
  });

  
document.getElementById('callsChartContainer')
  .addEventListener('click', () => {
    console.log("cue calls bucket focus");
    CueDirector.emit('CLICK_BUCKET_CALLS');
  });




/* my code recommendation: INSERTION — focus.js */
/* Generic deferred reveal utility: schedule, validate, reveal, cancel */
window.scheduleDelayedReveal = function (opts) {
  // opts: { delayMs, isValid: () => boolean, reveal: () => void, cancelRef: { timer } }
  if (!opts || typeof opts.reveal !== 'function') return;
  // Clear any existing timer on the provided cancelRef
  if (opts.cancelRef && opts.cancelRef.timer) {
    clearTimeout(opts.cancelRef.timer);
    opts.cancelRef.timer = null;
  }
  var delay = Math.max(0, Number(opts.delayMs || 0));
  var isValid = typeof opts.isValid === 'function' ? opts.isValid : function () { return true; };
  // Schedule
  var t = setTimeout(function () {
    try {
      if (!isValid()) return;     // bail if context changed
      opts.reveal();              // run caller-provided reveal logic
    } finally {
      if (opts.cancelRef) opts.cancelRef.timer = null;
    }
  }, delay);
  if (opts.cancelRef) opts.cancelRef.timer = t;
};


  
  const buckets = document.querySelectorAll(".kpiBucket");
    
  const resizeObs = new ResizeObserver(entries => {
    entries.forEach(entry => positionProbeDots(entry.target));
    });
  
  buckets.forEach(b => {
    ensureProbeDots(b);
    positionProbeDots(b);
    resizeObs.observe(b);
    });

  
  buckets.forEach(b => {
    const pts = computeProbePositions(b);   // uses the helper you already added
    const center = pts[0];                  // 0: center, 1: before(4), 2: six, 3: after(8), 4: midpoint
    setRotorXY(b, center.x, center.y);      // moves .baseStats via CSS variables
    });
      
  // Build the calls rotor on the next frame (non-blocking; no await)
  requestAnimationFrame(() => { void dR_calls(); });
  requestAnimationFrame(() => { void dR_connections(); });

  const shipCards = document.getElementById("cardSpace");

  //this is a function to load up and bucket the data for purposes of graphing it to the radial charts
  window.fillBuckets = async () => {

  //start by loading/cleaning the call and connection data
  const [calls, connections,NotesMap] = await Promise.all([
        window.callsPromise,
        window.connectionsPromise,
        window.connectionNotesPromise
    ]);

  //now get the filter dates and use them to filter the data sets
  const { lastStart, lastEnd } = window.Helpers.getT24();
  
  const t12Calls = calls.filter(c => 
        window.Helpers.rangeCheck(c.arrival, lastStart, lastEnd));

  const t12Connections = connections.filter(c =>
        window.Helpers.rangeCheck(c.connect, lastStart, lastEnd));

  //console.log(`Filtering for data between ${lastStart} and ${lastEnd}`)
    
  //sort the calls by arrival
  const sortedCalls = t12Calls
        .slice()
        .sort((a, b) => a.arrival - b.arrival)


// Build a lookup map from calls (id -> call)
const callsById = new Map();
t12Calls.forEach(call => {
  if (call.id != null) {
    callsById.set(call.id, call);
  }
});

// Build a lookup map from connections (id -> connection) and preserve note on connection
const connById = new Map();
t12Connections.forEach(conn => {
  if (conn.id != null) {
    // If you still want to keep notes on the connection object for reference:
    const connNote = window.getConnectionNote(conn.id);
    conn.note = connNote ?? null;
    connById.set(conn.id, conn);

    //console.log(`Connection ID: ${conn.id}, Connection Note:`, connNote);
  }
});

// Attach connection + note to each call (note for ALL calls)
sortedCalls.forEach(call => {
  // Attach the matched connection (or null)
  const mappedConnection = connById.get(call.id) ?? null;
  call.connection = mappedConnection;

  const noteFromMap = NotesMap?.get ? NotesMap.get(call.id) : NotesMap?.[call.id];
  const finalNote = noteFromMap ?? window.getConnectionNote(call.id) ?? null;

  call.note = finalNote;

  // Debug log: show both IDs and the note
  //console.log(
  //  `Call ID: ${call.id}, Connection ID: ${mappedConnection ? mappedConnection.id : 'null'}, Note:`,
  //  finalNote
  //);
  
// Count how many calls have a note
const callsWithNotesCount = sortedCalls.filter(call => call.note && call.note.trim() !== '').length;

//console.log(`Total calls: ${sortedCalls.length}`);
//console.log(`Calls with notes: ${callsWithNotesCount}`);
//console.log(`Calls without notes: ${sortedCalls.length - callsWithNotesCount}`);


});



  // Month labels + 12 completed-month buckets (shared by both charts)
  const labels = window.Helpers.monthLabels();

  const firstY = lastStart.getFullYear();
  const firstM = lastStart.getMonth();

  // local helpers for month bounds
  const monthStart = (y, m) => { const d = new Date(y, m, 1); d.setHours(0,0,0,0); return d; };
  const monthEnd   = (y, m) => { const d = new Date(y, m + 1, 1); d.setMilliseconds(-1); return d; };

  // prebuild 12 buckets
  const byMonth = Array.from({ length: 12 }, (_, i) => {
        const y = firstY + Math.floor((firstM + i) / 12);
        const m = (firstM + i) % 12;
        return { i, y, m, start: monthStart(y, m), end: monthEnd(y, m), calls: [] };
    });

  // assign sorted calls to buckets (keeps per-bucket order)
  sortedCalls.forEach(c => {
        const mi = (c.arrival.getFullYear() - firstY) * 12 + (c.arrival.getMonth() - firstM);
        if (mi >= 0 && mi < 12) byMonth[mi].calls.push(c);
    });

  // extend the return to include labels + byMonth
  return { lastStart, lastEnd, labels, connById, t12Calls: sortedCalls, byMonth, t12ConnectionsCount: t12Connections.length };

}









//compute the average connection quality for our t12 period
window.getAvgConnQualityT12 = async function () {
  const { t12Calls } = await window.fillBuckets();
  let sum = 0, n = 0;
  for (const c of t12Calls) {

const conn = c.connection;
const stayMsRaw = c.departure - c.arrival;
const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));

let value = 0;
if (conn && stayMsAdj > 0) {
  const connMs = conn.disconnect - conn.connect;
  value = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
}

    sum += value; n++;
  }
  const avg = n ? (sum / n) : 0;
  return { avg, n };
};






window.radialCtx = new Map();

document.documentElement.style.setProperty('--focus-offset-y', '0px');


/* my code recommendation: 
// — Unified shore-power color configuration —
window.ConnColorConfig = {
  // Breakpoints (domain) — tune as needed
  domain: [0, 0.33, 0.66, 1, 1.25],

  // Default palette (range) — high-contrast, colorblind-friendly-ish
  range: ['#b71c1c', '#f57c00', '#fbc02d', '#2e7d32', '#1565c0'],

  // Some ready-to-use alternatives to try (swap by assigning to `range`)
  palettes: {
    // ColorBrewer-inspired RdYlGn
    rdylgn: ['#a50026', '#f46d43', '#fdae61', '#66bd63', '#1a9850'],
    // Viridis-like (monotone lightness; great for perceptual uniformity)
    viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151'],
    // High-contrast, desaturated (good on dark backgrounds)
    hc_desat: ['#8e0000', '#b85e00', '#b9a200', '#1b7f3b', '#005a9e'],
    // Grayscale ramp (if you want shape > color)
    gray: ['#222', '#555', '#888', '#bbb', '#eee'],
    
rg_y_gb_bright: ['#D6181E', '#FF7A00', '#FFD400', '#19C24D', '#1E88FF'],

  // === Colorblind-aware leaning (still vivid): hues tuned for clarity on dark backgrounds
  rg_y_gb_cb: ['#CB2B2B', '#E68500', '#F2CC00', '#3AAA35', '#1F78B4'],

  // === Neon accent set: maximum saturation; blue endpoint is very bright
  rg_y_gb_neon: ['#FF1744', '#FF9100', '#FFEA00', '#00E676', '#00B0FF'],

  // === Warm-to-cool with slightly softer midtones (avoids glare at yellow/green)
  rg_y_gb_soft: ['#D32F2F', '#FB8C00', '#FDD835', '#43A047', '#2196F3'],

  // === Deep primaries (stays bright but with stronger dark edge for contrast)
  rg_y_gb_deep: ['#B71C1C', '#F57C00', '#FFC107', '#2E7D32', '#1565C0'],

  // === Pastel-friendly (if you need less visual weight but still readable)
  rg_y_gb_pastel: ['#EF5350', '#FFA726', '#FFE082', '#81C784', '#64B5F6']

  }
};

// Helper: build an interpolated, clamped scale from the config
window.buildConnColorScale = function () {
  return d3.scaleLinear()
    .domain(window.ConnColorConfig.domain)
    .range(window.ConnColorConfig.palettes.rg_y_gb_bright)
    .clamp(true);
};
*/

});





const fmtShortMD = d =>
    d ? d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '';

const fmtTime = (d) =>
    d ? d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true}) : '';

window.radialCalendar = async (containerID) => {
    //kill switch to make sure we have a valid element id
    const container = document.getElementById(containerID);
    if (!container) return;
    console.log(`found ${containerID}`)
    container.innerHTML = '';

    //compute dimensions of svg
    
    const rimPx = container ? parseFloat(getComputedStyle(container).getPropertyValue('--instrument-rim')) || 0 : 0;
    const bounds = container.getBoundingClientRect();
    const diameter = Math.min(bounds.width - rimPx * 2, bounds.height - rimPx * 2);     //this is the diameter of the element, which we don't want to draw on
    const radius = diameter / 2;
    const depth = radius / 6;
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    const cx = width/2;
    const cy = height/2;
    const stroke = 2;
    const r0 = radius - depth - stroke;


    const labels = window.Helpers.monthLabels();

    const axisPad = Math.max(2, stroke);
    const rimPad = 1;

     const angle = d3.scaleBand()
        .domain(labels)
        .range([0,2*Math.PI])
        .padding(0);
        ;

    const A = d => angle(d);
    const M = d => angle(d) + angle.bandwidth() / 2;
    const aVis = d => M(d) - Math.PI / 2;
    const norm2pi = a => (a % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pct = d => (M(d) / (2 * Math.PI)) * 100;
    const isBottom = d => {
        const n = norm2pi(aVis(d));
        return n > 0 && n < Math.PI;
    };

    const toX = a => Math.cos(a- Math.PI / 2);
    const toY = a => Math.sin(a- Math.PI / 2);

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

const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', '100%')
        .style('position', 'absolute')
        
        .style('left', 0)
        .style('top', 0)
        .style('overflow','visible')
        ;

    const g = svg.append('g')
        .attr('transform',`translate(${cx},${cy})`);

    g.append('circle')
        .attr('r', r0)
        .attr('fill', 'none')
        .attr('stroke', '#7a5c2b')
        .attr('stroke-width', stroke)

    const arcGen = d3.arc();

    const monthSpans = labels.map((lbl, i) => ({
        i,
        startAngle: angle(lbl),
        endAngle:   angle(lbl) + angle.bandwidth()
        }));
    
    const bgGroup = g.append('g').attr('class', 'month-backgrounds');
/*
bgGroup.selectAll('path.month-bg')
  .data(monthSpans)
  .enter()
  .append('path')
  .attr('class', d => `month-bg ${d.i % 2 === 0 ? 'even' : 'odd'}`)
  .attr('d', d => arcGen({
    innerRadius: r0 + axisPad,
    outerRadius: r0 + depth - rimPad,
    startAngle:  d.startAngle,
    endAngle:    d.endAngle
  }));
*/

    const deg = d => d*Math.PI/180;
    const startAngleVis = (m3, q3) => deg(m3 *30 + q3 * 6 + 2.5);
    const endAngleVis = (m4, q4) => deg(m4 * 30 + q4 * 6 + 3 + .5);


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
    defs.append('path')
        .attr('id', 'label-path-fwd')
        .attr('d', pathDfwd)
        .attr('pathLength', 100);

    defs.append('path')
        .attr('id', 'label-path-rev')
        .attr('d', pathDrev)
        .attr('pathLength', 100);

    svg.append('g')
        .selectAll('text.month-top')
        .data(labels.filter(d => !isBottom(d)))
        .enter()
        .append('text')
        .attr('class','month-top')
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
        .attr('class','month-bottom')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#7a5c2b')
        .append('textPath')
        .attr('xlink:href', '#label-path-rev') 
        .attr('startOffset', d => (100 - pct(d)) + '%')
        .text(d => d);

    window.radialCtx.set(containerID, {
        g,
        arcGen,
        startAngleVis,
        endAngleVis,
        r0, depth, stroke,
        segGap: 2,
        axisPad,
        rimPad: 1
    });

}


window.build60Columns = (byMonth) => {
    //part 1: helper function to split data in five sections per month
    const splitMtoQ = (start, end, calls) => {
        const startMs = start.getTime();
        const endMs = end.getTime();
        const slotMs = (endMs - startMs + 1) / 5;
        const groups = [[],[],[],[],[]];
        
        for (const c of calls) {
            const ms = c.arrival?.getTime?.();
            if (!Number.isFinite(ms) || ms < startMs || ms > endMs) continue;
            let q = Math.floor((ms - startMs) / slotMs);
            if (q < 0) q = 0; if (q > 4) q = 4;
            groups[q].push(c);
        }

        for (const g of groups) g.sort((a, b) => a.arrival - b.arrival);
        return groups;
    };

    //part 2: populate all 60 columns with the corresponding calls
    const columns60Calls = [];
    let maxStack = 1;

    for (let m1 = 0; m1 < 12; m1++) {
        const { start, end, calls } = byMonth[m1];
        const groups = splitMtoQ(start, end, calls);
        for (let q1 = 0; q1 < 5; q1++) {
            const g = groups[q1];
            maxStack = Math.max(maxStack, g.length);
            for (let idx = 0; idx < g.length; idx++) {
                columns60Calls.push({ m1, q1, idx, call: g[idx] });
            }
        }
    }

    return { columns60Calls, maxStack };
}

/* DELETE AFTER MIGRATION TO CHARTS.JS IS COMPLETE
window.drawCallArcs = async function (containerID) {
    const ctx = window.radialCtx.get(containerID);
    if (!ctx) return;

    const {byMonth} = await fillBuckets();
    const {columns60Calls, maxStack} = window.build60Columns(byMonth);
    const {g, arcGen, startAngleVis, endAngleVis, r0, depth, segGap, axisPad, rimPad} = ctx;
    const rUnit = maxStack > 0 ? (depth - axisPad - rimPad - ((maxStack - 1) * segGap)) / maxStack : depth;

    g.selectAll('path.call-seg')
        .data(columns60Calls)
        .enter()
        .append('path')
        .attr('class','call-seg')
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
        .attr('fill', '#b78a3d')
        .attr('fill-opacity', 0.90)
        .attr('stroke', 'none')
        .append('title')
        .text(d => `${d.call.vessel ?? 'Unknown'} — ${fmtShortMD(d.call.arrival)}`);
}
*/

/* my code recommendation: */
// ADD: ring gauge overlay (value in [0..1.25])
window.drawConnQualityGauge = async function (containerID, avgValue, sampleCount) {
  const ctx = window.radialCtx.get(containerID);
  if (!ctx) return;
  const { g, arcGen, r0, depth, axisPad, rimPad } = ctx;

const gGauge = g.append('g')
  .attr('class', 'conn-gauge')
  .style('pointer-events', 'none');

// Map value → angle (semi-circle, centered at -120 deg)

const deg = d => d * Math.PI / 180;
const aStart = deg(250);
const aSpan  = deg(220);
const angleScale = d3.scaleLinear()
  .domain([0, 1.25])
  .range([aStart, aStart + aSpan])
  .clamp(true);

const toXg = a => Math.cos(a - Math.PI/2);
const toYg = a => Math.sin(a - Math.PI/2);


// Place dial inward (well inside labels)
const rDial   = Math.max(24, r0 - depth/1.2);

/* my code recommendation: */
const chartEl = document.getElementById(containerID);
chartEl.style.setProperty('--quality-rotor-y', `${rDial}px`);
chartEl.style.setProperty('--quality-rotor-factor', `0.25`);  // 25% of dial radius → near hub


chartEl.style.setProperty('--quality-rotor-scale', `0.80`); 


window.radialCtx.get(containerID).rDial = rDial;
const tickIn  = rDial - 6;
const tickOut = rDial + 0;

// Major tick values (you can tweak these)
const majorVals = [0, 0.25, 0.50, 0.75, 1.0, 1.25];

// Minor ticks (optional): 10 segments across dial
const minorAngles = d3.range(26).map(i => aStart + (i * aSpan / 25));

// Draw minor ticks
gGauge.selectAll('line.gauge-tick.minor')
  .data(minorAngles)
  .enter()
  .append('line')
  .attr('class', 'gauge-tick minor')

.attr('x1', a => toXg(a) * tickIn)
.attr('y1', a => toYg(a) * tickIn)
.attr('x2', a => toXg(a) * (tickOut))
.attr('y2', a => toYg(a) * (tickOut));


// Draw major ticks + labels
const majors = majorVals.map(v => ({ v, a: angleScale(v) }));
gGauge.selectAll('line.gauge-tick.major')
  .data(majors)
  .enter()
  .append('line')
  .attr('class', 'gauge-tick major')

.attr('x1', d => toXg(d.a) * (tickIn))
.attr('y1', d => toYg(d.a) * (tickIn))
.attr('x2', d => toXg(d.a) * (tickOut))
.attr('y2', d => toYg(d.a) * (tickOut));

gGauge.selectAll('text.gauge-label')
  .data(majors)
  .enter()
  .append('text')
  .attr('class', 'gauge-label')


.attr('x', d => toXg(d.a) * (rDial * 0.9))
.attr('y', d => toYg(d.a) * (rDial * 0.9))
.attr('text-anchor', 'middle')
.style('dominant-baseline', 'middle')

  .text(d => `${Math.round(d.v * 100)}%`);


/* my code recommendation: */
// Thin rail connecting the ticks (using the same sweep as the dial)
gGauge.append('path')
  .attr('class', 'gauge-rail')
  .attr('d', arcGen({
    innerRadius: rDial,           // ~2px band
    outerRadius: rDial + 1,
    startAngle:  aStart,
    endAngle:    aStart + aSpan
  }));


// Needle (points at avgValue)
const aNeedle = angleScale(avgValue);
gGauge.append('line')
  .attr('class', 'gauge-needle')

.attr('x1', toXg(aNeedle) * (tickIn * -0.1))
.attr('y1', toYg(aNeedle) * (tickIn * -0.1))
.attr('x2', toXg(aNeedle) * (rDial))
.attr('y2', toYg(aNeedle) * (rDial))
;



// Hub
gGauge.append('circle')
  .attr('class', 'gauge-hub')
  .attr('r', 4)
  .attr('cx', 0)
  .attr('cy', 0);

  /*
// Small caption (avg • sample count) under the hub
gGauge.append('text')
  .attr('class', 'gauge-readout')
  .attr('x', 0)
  .attr('y', rDial - 30)
  .style('dominant-baseline', 'middle')
  .text(`${avgValue.toFixed(2)} • ${sampleCount}`);

*/

  // Gauge band (thin ring just inside the content band)
  const inner = r0 + axisPad - 10;
  const outer = inner + 8;



  // Color via the same scale you used for connection lines
  const colorScale = window.buildConnColorScale();
  /*
  const colorScale = d3.scaleLinear()
    .domain([0, 0.5, 1.0, 1.25])
    .range(['#cd2435', '#dd9414ff', '#1aaa43ff', '#0e55e3ff'])
    .clamp(true);
*/
  // Map value to arc length (0..1.25 → 0..180°)
  const maxDeg = 180;
  const theta = (Math.max(0, Math.min(1.25, avgValue)) / 1.25) * (maxDeg * Math.PI/180);


/*
  // Tiny label (value + sample count); place at center-top
  g.append('text')
    .attr('class', 'gauge-label')
    .attr('x', 0).attr('y', inner - 16)
    .attr('text-anchor', 'middle')
    .text(`${Math.round(avgValue * 100)}% • ${sampleCount}`)
    .style('font-size', '11px')
    .style('fill', '#2b4d7d');
    */

};



window.buildPowerArcs = (byMonth) => {
    const maxCallsAnyMonth = Math.max(1, ...byMonth.map(b => b.calls.length));
    const deg = d => d * Math.PI / 180;
    const monthDeg = 30;
    const edgeMarginDeg = 1;
    const gapDeg = 1;
    const usableDeg = monthDeg - edgeMarginDeg * 2;
    const callDeg = Math.max(0.1, (usableDeg - gapDeg * (maxCallsAnyMonth - 1)) / maxCallsAnyMonth);

    const arcs = [];
    for (const b of byMonth) {
        const baseDeg = b.i * monthDeg + edgeMarginDeg;
        for (let idx = 0; idx < b.calls.length; idx++) {
            const startDeg = baseDeg + idx * (callDeg + gapDeg);
            const endDeg = startDeg + callDeg;
            arcs.push({
                m1: b.i,
                idx,
                startAngle: deg(startDeg),
                endAngle: deg(endDeg),
                call: b.calls[idx]
            });
        }
    }

    return {arcs, callDeg, gapDeg, maxCallsAnyMonth};
}

window.drawPowerArcs = async (containerID) => {
    const ctx = window.radialCtx.get(containerID);
    if (!ctx) return;

    const {byMonth} = await window.fillBuckets();
    const {arcs, maxCallsAnyMonth} = window.buildPowerArcs(byMonth);
    const {g, arcGen, r0, depth, segGap, axisPad, rimPad} = ctx;
    
    const toX = a => Math.cos(a - Math.PI / 2);
    const toY = a => Math.sin(a - Math.PI / 2);

    
    const yRadial = d3.scaleTime()
        .domain([new Date(0,0,0,6,0), new Date(0,0,0,18,0)])
        .range([r0 + axisPad, r0 + depth - rimPad]);

    //this helper function strips the date off of a datestamp
    const toTOD = (d) => new Date(0,0,0, d.getHours(), d.getMinutes(), d.getSeconds(),0);
    
    //this tests to see if the stay was multiple days
    const isMultiDay = (start, end) => start.toDateString() !== end.toDateString();

    //this tests to see if a time is outside the domain of our y axis and returns a conforming value
    const clampTOD = (dt) => {
        const [min, max] = yRadial.domain();
        const t = toTOD(dt);
        return (t < min) ? min : (t > max) ? max : t;
    }

    const rUnit = maxCallsAnyMonth > 0 ? (depth - axisPad - rimPad - ((maxCallsAnyMonth - 1) * segGap)) / maxCallsAnyMonth : depth;

/////

const items = arcs.map(a => {
    const midA = (a.startAngle + a.endAngle) / 2;
    const c = a.call;

    // Visit (arrival → departure), clamped
    /*
    const visitStartR = yRadial(clampTOD(c.arrival));
    const visitEndR   = isMultiDay(c.arrival, c.departure)
      ? yRadial.range()[1]                 // extend to outer limit if past 18:00 same day / multi-day
      : yRadial(clampTOD(c.departure));
*/

const arrivedAfterWindow = toTOD(c.arrival) > new Date(0, 0, 0, 18, 0); // arrival after 6 PM
let visitStartR, visitEndR;

if (isMultiDay(c.arrival, c.departure) && arrivedAfterWindow) {
  // Show departure-day portion: 6 AM → departure (clamped)
  visitStartR = yRadial.range()[0];                    // 6 AM (inner radius)
  visitEndR   = yRadial(clampTOD(c.departure));        // departure time (clamped)
} else {
  // Default: arrival-day portion; extend to outer edge if multi-day
  visitStartR = yRadial(clampTOD(c.arrival));
  visitEndR   = isMultiDay(c.arrival, c.departure)
    ? yRadial.range()[1]                               // 6 PM (outer radius) for multi-day
    : yRadial(clampTOD(c.departure));
}


    // Connection (connect → disconnect), if present
    const conn = c.connection || null;
    const connStartR = conn ? yRadial(clampTOD(conn.connect)) : null;
    const connEndR   = conn
      ? (isMultiDay(conn.connect, conn.disconnect)
          ? yRadial.range()[1]
          : yRadial(clampTOD(conn.disconnect)))
      : null;

      
/* my code recommendation: */
// compute connection value (0..1.25) for coloring
const stayMsRaw = c.departure - c.arrival;
const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000)); // stay - 3h
let connValue = 0;
if (conn && stayMsAdj > 0) {
  const connMs = conn.disconnect - conn.connect;
  connValue = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
}




    return { 
        idx: a.idx, 
        slotStart: a.startAngle, 
        slotEnd: a.endAngle, 
        angle: midA, 
        visitStartR, 
        visitEndR, 
        connStartR, 
        connEndR, 
        call: c,
        connValue
    };
  });



/////

const itemG = g.selectAll('g.power-item')
  .data(items)
  .enter()
  .append('g')
  .attr('class', 'power-item');


/* my code recommendation: */
// Attach click handler to each power-item group
/*
itemG.on('click', function(event, d) {
  event.stopPropagation(); // prevent bucket click from firing
  // TODO: logic to show/hide powerCanvas goes here
});
*/

/////


  // 1) Visit lines (always)

itemG.append('line')
  .attr('class', 'power-stay')

    .attr('x1', d => toX(d.angle) * d.visitStartR)
    .attr('y1', d => toY(d.angle) * d.visitStartR)
    .attr('x2', d => toX(d.angle) * d.visitEndR)
    .attr('y2', d => toY(d.angle) * d.visitEndR)
    .append('title')
    .text(d => `${d.call.vessel ?? 'Unknown'} — ${fmtShortMD(d.call.arrival)} → ${fmtShortMD(d.call.departure)}`);

  // 2) Connection lines (only if connection exists)
const connColor = window.buildConnColorScale(); 
/*
const connColor = d3.scaleLinear()
    .domain([0, 0.5, 1.0, 1.25])
    .range(['#cd2435', '#dd9414ff', '#1aaa43ff', '#0e55e3ff'])
  .clamp(true);
*/

/*
itemG.filter(d => d.connStartR != null)
  .append('line')

    .attr('class', 'power-conn')
    .style('stroke', d => connColor(d.connValue))
    .attr('x1', d => toX(d.angle) * d.connStartR)
    .attr('y1', d => toY(d.angle) * d.connStartR)
    .attr('x2', d => toX(d.angle) * d.connEndR)
    .attr('y2', d => toY(d.angle) * d.connEndR)
    .append('title')
    .text(d => {
      const conn = d.call.connection;
      return `Shore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)}`;
    });
    */
  
itemG.filter(d => d.connStartR != null)
  .append('line')
  .attr('class', 'power-conn')
  .style('--conn-color', d => connColor(d.connValue)) // JS sets CSS variable for continuous color
  .attr('x1', d => toX(d.angle) * d.connStartR)
  .attr('y1', d => toY(d.angle) * d.connStartR)
  .attr('x2', d => toX(d.angle) * d.connEndR)
  .attr('y2', d => toY(d.angle) * d.connEndR)
  .append('title')
  .text(d => {
    const conn = d.call.connection;
    return `Shore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)}`;
  });
 

/* my code recommendation: */
// Tiny duration formatter (local; you used it in the Cartesian chart)
    const fmtDuration = ms => {
        const min = Math.round(ms / 60000);
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h ? `${h}h ${m}m` : `${m}m`;
    };

// Add the transparent hit area over the full radial band for the slot

/* my code recommendation: */
// Create the hit path and attach click handler to it
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


/* my code recommendation: REPLACEMENT — focus.js */
/* Tooltip tied to power-hit: include visit duration + connection details */
hit.append('title')
  .text(d => {
    const v = d.call;

    // Ensure Date objects
    const arr = (v?.arrival instanceof Date) ? v.arrival : new Date(v?.arrival);
    const dep = (v?.departure instanceof Date) ? v.departure : new Date(v?.departure);

    // Visit duration (HHh MMm)
    const durMs = (dep && arr && Number.isFinite(dep - arr)) ? (dep - arr) : 0;
    const min = Math.round(durMs / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const visitDur = h ? `${h}h ${m}m` : `${m}m`;

    // Connection details (if any)
    const conn = v.connection;
    const connText = conn
      ? `\u000AShore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)}\u000AConnection Duration: ${(() => {
          const ms = (conn.disconnect && conn.connect) ? (conn.disconnect - conn.connect) : 0;
          const cm = Math.round(ms / 60000), ch = Math.floor(cm / 60), cmm = cm % 60;
          return ch ? `${ch}h ${cmm}m` : `${cmm}m`;
        })()}`
      : `\u000AShore Power: Did not connect`;

    const note = window.getConnectionNote(v.CallID ?? v.id);

const noteText = v.note ? `\u000AConnection Note: ${v.note}` : '';

    // Use explicit \u000A for newline inside SVG <title>
    return `${v.vessel ?? 'Unknown'}\u000AVisit: ${fmtShortMD(arr)}, ${fmtTime(arr)} → ${fmtShortMD(dep)}, ${fmtTime(dep)}\u000ADuration: ${visitDur}${connText}${noteText}`;
  });



/* my code recommendation: */
hit.on('click', function (event, d) {
  console.log("you poked my heart 2");
  //3rd insertion
  
window.emitIntent('SELECT_CALL', { vessel: d?.call?.vessel ?? null, callId: d?.call?.id ?? null, shiftKey: !!event.shiftKey });
window.onSelectCall({ vessel: d?.call?.vessel ?? null, callId: d?.call?.id ?? null, shiftKey: !!event.shiftKey });
//end 3rd insertion

  event.stopPropagation();
  event.stopImmediatePropagation();
  return;

requestAnimationFrame(() => {
  canvas.classList.add('is-visible');
  drawPowerCanvasChart(d.call.vessel);
});

// Pass correct info to updateRadialHighlights:
// - If the user clicked the SAME call again → sweep (pass nulls)
// - If the user clicked a DIFFERENT call → highlight selected + related

const clickedIdLocal = d?.call?.id ?? null;
updateRadialHighlights(clickedIdLocal, d?.call?.vessel ?? null);
activeCallId = clickedIdLocal;

/*
updateRadialHighlights(callId, d?.call?.vessel ?? null);
activeCallId = callId;
*/

  event.stopPropagation(); // don't toggle bucket focus

  
/* my code recommendation: REPLACEMENT — focus.js */
/* Host the PowerCanvas off the LEFT bucket to keep it on the left half */
const hostBucket =
  document.getElementById('callsChartContainer') ??
  document.getElementById('ospChartContainer');

  if (!hostBucket) return;

  // 1) Render/ensure canvas; clear previous content
  const { canvas, contentHost } = pcRender({ type: 'chart' }, hostBucket);

  // 2) Set a CSS variable so child elements get exactly 1/3 of focused bucket height

/* my code recommendation: REPLACEMENT — focus.js */
/* Use RIGHT bucket height so child elements are exactly one third of it */
const rightBucket = document.getElementById('ospChartContainer');
const childH = Math.round((rightBucket?.clientHeight ?? hostBucket.clientHeight) * 0.40);
canvas.style.setProperty('--pc-child-h', `${childH}px`);


  const clickedId = d?.call?.id ?? null;
  const chartEl = contentHost.querySelector('.pc-chart');

  // Toggle: same call ⇒ remove chart; different/new ⇒ ensure + update chart
  if (chartEl && activeCallId === clickedId) {
    chartEl.remove();                // remove ONLY the chart
    activeCallId = null;
    window.activeVesselName = null; 
    pcMaybeDestroy(canvas);          // auto-destroy if canvas is now empty
    updateRadialHighlights(null, null);
    return;
  }


  // Update chart for the clicked vessel/call
  const vesselName = d?.call?.vessel ?? null;
  drawPowerCanvasChart(vesselName);  // chart drawer now targets .pc-chart (see patch below)
  updateRadialHighlights(clickedId, vesselName);  // apply highlight first
  activeCallId = clickedId;                       // then update the tracker
  window.activeVesselName = vesselName;




});


        



};

const removeRadial = (containerId) => {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';  // clears any SVG/content
}


const waitForTransitionEndOnce = (el, timeoutMs = 500) => {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; el.removeEventListener('transitionend', onEnd); resolve(); } };
    const onEnd = (e) => { if (e.target === el) finish(); };
    el.addEventListener('transitionend', onEnd, { once: true });
    setTimeout(finish, timeoutMs);          // fallback in case no event fires
    requestAnimationFrame(() => {});        // nudge to next frame; harmless
  });
}

window.drawPerformCentral = async function(containerId) {
    //kill switch to make sure we have a valid place to draw the chart before we get drawing
    const el = document.getElementById(containerId);
    if (!el) return;

    //clear out the inner html content of our container
    el.innerHTML = '';

const fmtDuration = (ms) => {
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

    //next we'll take some measurements to help keep the drawing right where it belongs
    const elWidth = el.clientWidth;
    const elHeight = el.clientHeight;
    
    //here are some constants to make quick adjustments easy
    const ninetyMs = 90 * 60 * 1000;
    const boxWidthK = 0.8;
    const boxHeightK = 0.4;

    const boxW = Math.round(elWidth * boxWidthK);
    const boxH = Math.round(elHeight * boxHeightK);
    const boxMar = { top: 10, right: 10, bottom: 10, left: 10 };

    //here are the x and y edges of the viewbox
    const X0 = Math.round((elWidth - boxW) / 2);
    const Y0 = Math.round((elHeight - boxH) / 2);

    //const axisX_Y = originY + innerH;
    //const axisY_X = originX;


    const svg = d3.select(el)
        .append('svg')
        .attr('viewBox', `0 0 ${elWidth} ${elHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');


    
    //you can create an x domain based on the call ids to space them evenly
    const xDomain = callsSorted.map(c => c.id);
    const xByCalls = d3.scaleBand()
        //first you define the min to max values that can exist
        .domain(xDomain)
        //then you deine the range those values should be spread over
        .range([X0 + boxMar.left, X0 + boxMar.left + boxW])
        .paddingInner(0.14)
        .paddingOuter(0.04);


    //but if you do that, you'll need a way to visually identify where the months change
    const monthChangeIndices = [];
    for (let i = 1; i < callsSorted.length; i++) {
        const prev = callsSorted[i - 1].arrival;
        const curr = callsSorted[i].arrival;
        if (prev.getMonth() !== curr.getMonth()) {
            monthChangeIndices.push(i)
        }
    }

    /////////////////
const labels = window.Helpers.monthLabels();
    /////////////////



    //the y axis is tricky because it has a default range and you need to cut off data that overflows
    const yByTime = d3.scaleTime()
        //let's strart with a 12 hour range. this will accommodate 90% of all calls
        .domain([new Date(0,0,0,6,0), new Date(0,0,0,18,0)])
        .range([Y0 + boxH - boxMar.bottom, Y0 + boxMar.top]);
    
    const [yTop, yBottom] = yByTime.domain();

    
svg.append('g')
  .attr('class', 'y-axis')
  .attr('transform', `translate(${X0 + boxMar.left},0)`)
  .call(
    d3.axisLeft(yByTime)
      .ticks(d3.timeHour.every(2))
      .tickFormat(d3.timeFormat('%-I %p')) // 6 AM, 8 AM, …
  );

    //this helper function strips the date off of a datestamp
    const toTOD = (d) => new Date(0,0,0, d.getHours(), d.getMinutes(), d.getSeconds(),0);
    
    //this tests to see if the stay was multiple days
    const isMultiDay = (start, end) => start.toDateString() !== end.toDateString();

    //this tests to see if a time is outside the domain of our y axis and returns a conforming value
    const clampTOD = (dt) => {
        const [min, max] = yByTime.domain();
        const t = toTOD(dt);
        return (t < min) ? min : (t > max) ? max : t;
    }

    







// Create one <g class="call"> per visit, positioned at the call’s center X
const callGroups = svg.selectAll('g.call')
  .data(callsSorted)
  .enter().append('g')
  .attr('class', 'call')
  .attr('data-id', d => d.id)
  .attr('transform', d => `translate(${xByCalls(d.id) + xByCalls.bandwidth()/2},0)`);

// 1) Visit (stay) line — thin, runs arrival → departure
callGroups.append('line')
  .attr('class', d => `call-span ${isMultiDay(d.arrival, d.departure) ? 'multi-day' : ''}`)
  .attr('x1', 0).attr('x2', 0)
  //the bar should start at the lesser of 6am or the actual arrival time
  //.attr('y1', d => yByTime(clampTOD(d.arrival)))
  
.attr('y1', d => yByTime(clampTOD(d.arrival)))

  //the bar should carry on to the actual departure if it was same day before 8, or 8
  //.attr('y2', d => isMultiDay(d.arrival, d.departure) ? yByTime(yTop) : yByTime(clampTOD(d.departure)));

.attr('y2', d => isMultiDay(d.arrival, d.departure)
  ? yByTime(yBottom)           // full height end (bottom)
  : yByTime(clampTOD(d.departure)))




/*
// 2) Shore-power line — thicker accent, only if connection exists
callGroups.filter(d => connById.has(d.id))
  .append('line')
  .attr('class', 'power-span')
  .attr('x1', 0).attr('x2', 0)
  .attr('y1', d => {
        const c = connById.get(d.id);
        return yByTime(clampTOD(c.connect));
        })
  .attr('y2', d => {
        const c = connById.get(d.id);
        return isMultiDay(c.connect, c.disconnect) ? yByTime(yTop) : yByTime(clampTOD(c.disconnect));
        })
/*
// 3) 90-minute ticks — only for stays longer than 3 hours
callGroups.filter(d => (d.departure - d.arrival) > (3 * 60 * 60 * 1000))
  .append('line')
  .attr('class', 'call-90')
  .attr('x1', -1).attr('x2', 1)
  .attr('y1', d => yByTime(clampTOD(new Date(d.arrival.getTime() + ninetyMs))))
  .attr('y2', d => yByTime(clampTOD(new Date(d.arrival.getTime() + ninetyMs))));

callGroups.filter(d => (d.departure - d.arrival) > (3 * 60 * 60 * 1000))
  .append('line')
  .attr('class', 'call-90')
  .attr('x1', -1).attr('x2', 1)
  .attr('y1', d => isMultiDay(d.arrival, d.departure) ? yByTime(yTop) : yByTime(clampTOD(new Date(d.departure.getTime() - ninetyMs))))
  .attr('y2', d => isMultiDay(d.arrival, d.departure) ? yByTime(yTop) : yByTime(clampTOD(new Date(d.departure.getTime() - ninetyMs))));

  */
// 4) Wide, invisible hit area (for reliable hover) + native SVG tooltip
callGroups.append('line')
  .attr('class', 'hit-span')
  .attr('x1', 0).attr('x2', 0)
  .attr('y1', yByTime(yBottom))
  .attr('y2', yByTime(yTop))
  .append('title')
  .text(d => {
    // fmtTime is already defined near the top of your file
    const visit = `${fmtShortMD(d.arrival)}, ${fmtTime(d.arrival)} → ${fmtShortMD(d.departure)}, ${fmtTime(d.departure)}`;
    const conn = connById.get(d.id);
    const connText = conn
      ? `\nShore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)} \nConnection Duration: ${fmtDuration(conn.disconnect - conn.connect)}`
      : `\nShore Power: Did not connect`;
    return `${d.vessel ?? 'Unknown'}\nVisit: ${visit}${connText}`;
  });

  
 
svg.append('g')
    .selectAll('line.month-sep')
    .data(monthChangeIndices)
    .enter().append('line')
    .attr('class', 'month-sep')
    .attr('x1', i => xByCalls(callsSorted[i].id))
    .attr('x2', i => xByCalls(callsSorted[i].id))
    .attr('y1', yByTime(yBottom))
    .attr('y2', yByTime(yTop))
    .attr('stroke', getComputedStyle(document.documentElement)
    .getPropertyValue('--ink-300').trim())

}









/* my code recommendation: */
// Set rotor to a specific (x,y) within the bucket coordinate space
function setRotorXY(bucket, x, y) {
  const rotor = bucket.querySelector('.baseStats');
  if (!rotor) return;
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;
  rotor.style.setProperty('--rotor-x', `${x - cx}px`);
  rotor.style.setProperty('--rotor-y', `${y - cy}px`);
}

// Snap rotor to one of our 5 probe points (indices: 0..4 per computeProbePositions)
async function setRotorToProbe(bucket, index, timeoutMs = 600) {
  const pts = computeProbePositions(bucket);         // already added earlier
  const p = pts[index];
  setRotorXY(bucket, p.x, p.y);
  const rotor = bucket.querySelector('.baseStats');
  if (rotor) await waitForTransitionEndOnce(rotor, timeoutMs); // you already have this
}


(() => {
  function rf_setXY(bucket, x, y, rotorEl) {
    if (!rotorEl) return;
    const cx = bucket.clientWidth / 2;
    const cy = bucket.clientHeight / 2;
    rotorEl.style.setProperty('--rotor-x', `${x - cx}px`);
    rotorEl.style.setProperty('--rotor-y', `${y - cy}px`);
  }


/* my code recommendation: */
const toIdx = h => Math.max(0, Math.min(4, (h ?? 1) - 1));


  function rf_toProbe(bucket, rotorEl, index = 0) {
    const pts = window.computeProbePositions(bucket);
    const p = pts[index] || pts[0];
    rf_setXY(bucket, p.x, p.y, rotorEl);
  }

  function rf_toCenter(bucket, rotorEl) { rf_toProbe(bucket, rotorEl, 0); }
  function rf_show(el)  { el?.classList.remove('is-hidden'); }
  function rf_hide(el)  { el?.classList.add('is-hidden'); }
  function rf_scale(el, s) { el?.style.setProperty('--rotor-scale', String(s)); }



/* my code recommendation: */
function rf_adopt(bucket, selOrEl, role, startAtHuman = 1) {
  const el = typeof selOrEl === 'string' ? bucket.querySelector(selOrEl) : selOrEl;
  if (!el) return null;
  el.classList.add('baseStats');
  if (role) el.dataset.role = role;

  // PRE-SET POSITION VARS before reveal
  const pts = window.computeProbePositions(bucket);
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;
  const idx = Math.max(0, Math.min(4, (startAtHuman ?? 1) - 1));
  const p   = pts[idx] ?? pts[0];
  el.style.setProperty('--rotor-x', `${p.x - cx}px`);
  el.style.setProperty('--rotor-y', `${p.y - cy}px`);

  return el;
}




/* my code recommendation: */
function rf_create(bucket, { role, id } = {}, startAtHuman = 1) {
  const el = document.createElement('div');
  el.className = 'baseStats';
  if (role) el.dataset.role = role;
  if (id) el.id = id;

  // PRE-SET POSITION VARS *before* appending to the DOM
  const pts = window.computeProbePositions(bucket);
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;
  const idx = Math.max(0, Math.min(4, (startAtHuman ?? 1) - 1));
  const p   = pts[idx] ?? pts[0];
  el.style.setProperty('--rotor-x', `${p.x - cx}px`);
  el.style.setProperty('--rotor-y', `${p.y - cy}px`);

  bucket.appendChild(el);          // append AFTER vars are set
  return el;
}



  window.RotorFactory = {
    adopt:  rf_adopt,
    create: rf_create,
    toProbe: rf_toProbe,
    toCenter: rf_toCenter,
    show: rf_show,
    hide: rf_hide,
    scale: rf_scale,
    setXY: rf_setXY
  };
})();


/* my code recommendation: */
// Build the kWh rotor markup (odometer + label)
function buildKwhRotorContent(rotorEl, kwhValue) {
  // Odometer container
  const speed = document.createElement('div');
  speed.className = 'speedRead';
  speed.id = 'kwhRotorValue';

  // Label under the odometer
  const label = document.createElement('div');
  label.className = 'baseLabel';
  label.textContent = 'kWh Provided';

  rotorEl.appendChild(speed);
  rotorEl.appendChild(label);

  // Initialize & roll odometer to the provided value
  window.Helpers.initOdometer(speed, Math.round(kwhValue));
  window.Helpers.rollOdometer(speed, Math.round(kwhValue));
}



/* my code recommendation: */
// Compute T12 kWh total from connections (independent of the factory)
async function getKwhT12Value() {
  const connections = await window.connectionsPromise;
  const { lastStart, lastEnd } = window.Helpers.getT24();
  const ref = c => c.connect || c.disconnect;   // pick a timestamp to test

  let total = 0;
  for (const c of connections) {
    const r = ref(c);
    if (r && window.Helpers.rangeCheck(r, lastStart, lastEnd)) {
      total += (c.usage || 0);                  // usage must be numeric
    }
  }
  return total;
}





/* my code recommendation: */
// Magnitude-driven compact formatter with exactly 3 displayed digits.
// Returns { digitsOnly, dotIndex, unit, fracDigits }.
// Groups: <1k (''), <1e6 ('k'), <1e9 ('M'), >=1e9 ('B').



/* my code recommendation: */
/**
 * Percent compact formatter: two integer digits + tenths (one fractional).
 * Input: n (e.g., 87 for 87%).
 * Returns: { digitsOnly: "875", dotIndex: 2, unit: "", fracDigits: 1 }
 *          where the third digit ("5") is tenths => tagged .is-frac by builder.
 */





/* my code recommendation: */
function unitFull(u) {
  switch (u) {
    case 'k': return 'Thousand';
    case 'M': return 'Million';
    case 'B': return 'Billion';
    default:  return '';
  }
}


/* my code recommendation: */
// Build rolling odometer markup for compact display (no decimal section)
// Example: "137" + unit "M" → shows 137M

/* my code recommendation: */
// Build rolling odometer markup; mark fractional digits with .is-frac (no wrapper)
/**
 * Expects fmt from formatKwhCompact(...):
 *   { digitsOnly: "137", dotIndex: 1, unit: "M", ... }
 * -> digits at indices >= dotIndex are fractional ("37")
 */



/* my code recommendation: */
/**
 * Build a fixed, 3-digit odometer.
 * - digits3: string with length==3, e.g., "875" or "207" (leading zeros OK)
 * - dotIndex: number in [0..2] for first fractional digit; -1 for none
 *      e.g., 2 => only the 3rd digit (index 2) is fractional
 */






/* my code recommendation: */
/**
 * Ensures non-fractional digits are wrapped in .int, then appends a pill.
 * - speedEl: the .speedRead container inside the rotor
 * - pillText: string to render in the pill ('' or null => no pill)
 */
/*
function attachRotorPill(speedEl, pillText) {
  if (!speedEl || !pillText) return;

  // Collect digit nodes and split into integer vs fractional
  const allDigits = Array.from(speedEl.querySelectorAll('.digit'));
  const intDigits = allDigits.filter(d => !d.classList.contains('is-frac'));

  if (!intDigits.length) return;

  // Create (or reuse) the .int wrapper
  let intWrap = speedEl.querySelector('.int');
  if (!intWrap) {
    intWrap = document.createElement('span');
    intWrap.className = 'int';
    speedEl.insertBefore(intWrap, intDigits[0]); // place wrapper before first int digit
    // Move only the integer digits into the wrapper
    intDigits.forEach(d => intWrap.appendChild(d));
  }

  // If a pill exists, update its text; otherwise create it
  let tag = intWrap.querySelector('.magnitudeTag');
  if (!tag) {
    tag = document.createElement('span');
    tag.className = 'magnitudeTag';
    intWrap.appendChild(tag);
  }
  tag.textContent = String(pillText);
}
*/


/* my code recommendation: REPLACEMENT — focus.js */
/* Center the pill under the full 3-digit block by attaching it to .speedRead */







/* my code recommendation: */
// Track currently selected call
let activeCallId = null;
//removing original powercanvas render  
/*
function createPowerCanvas(bucket) {
  const canvas = document.createElement('div');
  canvas.id = 'powerCanvas';

  // Position & size only — styling lives in CSS
  const left = bucket.offsetLeft;
  
  const w = Math.round(bucket.clientWidth * 1.10);
  const h = Math.round(bucket.clientHeight * 0.75);
  const top = bucket.offsetTop + Math.round((bucket.clientHeight - h) / 2); // vertically center within bucket

  canvas.style.position = 'absolute';
  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  return canvas;
}
  */

// Attach click handler to each call segment in the LEFT radial chart
document.querySelectorAll('#leftRadialChart g.power-item').forEach(item => {
  item.addEventListener('click', () => {
    console.log("you poked my heart 4");
    const callId = item.__data__?.call?.id;
    const bucket = document.getElementById('callsChartContainer');
    if (!bucket || callId == null) return;

    const existing = document.getElementById('powerCanvas');

    
/* my code recommendation: */
if (existing && (activeCallId === callId || !bucket.classList.contains('focused'))) {
  // Trigger fade-out
  existing.classList.remove('is-visible');

  // Remove after transition (match CSS duration: 400ms)
  setTimeout(() => existing.remove(), 400);

  activeCallId = null;
  return;
}

//removing original powercanvas render  
/*
    // Replace any existing canvas
    if (existing) existing.remove();

    // Create new canvas
    const canvas = createPowerCanvas(bucket);
    document.body.appendChild(canvas);
    activeCallId = callId;
    */
  });
});


/* my code recommendation: INSERTION — focus.js (OSP radial hit → callsSelection + render) */
// INSERT HERE 👉 add delegated click handler for OSP radial “power-hit” paths

// We listen on document so the handler works whenever the OSP radial is (re)drawn by charts.js.
document.addEventListener('click', function onOspHitClick(e) {
  console.log("you poked my heart 5");
  const hit = e.target.closest('#ospRadialChart .power-hit');
  if (!hit) {
    console.log("you missed the call hit box");
    return; // not a click on the OSP radial hit area
  } else {
  // Stop scene/bucket toggles and other handlers from firing
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  // Read the bound datum from the D3-generated element
  const datum = hit.__data__ || (window.d3 ? d3.select(hit).datum() : null);
  const vessel = datum?.call?.vessel ?? null;
  if (!vessel) {console.log('no vessel selected!'); return};;

  // Ensure PowerCanvas exists and size the child slot; keep chart anchored to LEFT bucket per your convention
  const leftHost = document.getElementById('callsChartContainer') ?? document.getElementById('ospChartContainer');
  if (typeof window.pcRender === 'function' && leftHost) {
    const { canvas } = pcRender({ type: 'chart' }, leftHost);
    const rightBucket = document.getElementById('ospChartContainer');
    const childH = Math.round((rightBucket?.clientHeight ?? leftHost.clientHeight) * 0.40);
    if (canvas?.style) canvas.style.setProperty('--pc-child-h', `${childH}px`);
  }

  // Toggle the clicked vessel in the global selection (no alpha/bravo; single unified list)
  window.callsSelection = Array.isArray(window.callsSelection) ? window.callsSelection : [];
  const idx = window.callsSelection.findIndex(x => x?.type === 'vessel' && x?.name === vessel);
  if (idx >= 0) {
    window.callsSelection.splice(idx, 1);
  } else {
    window.callsSelection.push({ type: 'vessel', name: vessel });
  }

  // Re-render the unified Usage Multiples chart
  if (typeof window.renderUsageMultiples === 'function') {
    window.renderUsageMultiples();
  }
}
});



/* my code recommendation: REPLACEMENT — focus.js (left bucket observer) */
const leftBucket = document.getElementById('callsChartContainer');
if (leftBucket) {
  const obs = new MutationObserver(() => {
    const rightBucket = document.getElementById('ospChartContainer');
    const leftFocused  = leftBucket.classList.contains('focused');
    const rightFocused = !!rightBucket && rightBucket.classList.contains('focused');

    // Only remove the PowerCanvas when neither bucket is focused (return to base view)
    if (!leftFocused && !rightFocused) {
      const canvas = document.getElementById('powerCanvas');
      if (canvas) {
        canvas.classList.remove('is-visible'); // fade-out
        setTimeout(() => canvas.remove(), 400);
      }
      activeCallId = null;
    }
  });
  obs.observe(leftBucket, { attributes: true, attributeFilter: ['class'] });
}







/* my code recommendation: REPLACEMENT — focus.js */
/* Full function: drawPowerCanvasChart(shipName)
   - X-axis: TRUE TIME across the latest 12 completed months (T12), labeled "Jan 25", "Feb 25", …
   - Each visit renders as a vertical line at its arrival DATE position.
   - Each shore-power usage renders as a thicker vertical line at the same X, spanning connect→disconnect.
   - Y-axis: time-of-day 6:00 → 18:00.
   - Title + legend match usage chart styling.
*/
async function drawPowerCanvasChart(shipName) {
  const canvas = document.getElementById('powerCanvas');
  if (!canvas) return;

  // target the dedicated chart host; create if missing

/* my code recommendation: REPLACEMENT — focus.js */
/* Always insert the usage chart ABOVE the table (between trend and table) */
let chartHost = canvas.querySelector('.pc-chart');
if (!chartHost) {
  chartHost = document.createElement('div');
  chartHost.className = 'pc-chart';
}
chartHost.innerHTML = '';

const tblHost = canvas.querySelector('.pc-table-host');
if (tblHost) {
  // Chart sits immediately before the table
  canvas.insertBefore(chartHost, tblHost);
} else {
  // No table yet — append chart, table will be added later below it
  canvas.appendChild(chartHost);
}


  // === Data (T12 window) ===
  const { t12Calls, connById, lastStart, lastEnd } = await window.fillBuckets(); // lastStart..lastEnd = 12 completed months

  // Optional vessel normalization
  let callsForShip = t12Calls;
  if (shipName) {
    const vesselInfo = window.getVesselInfo
      ? (window.getVesselInfo(shipName) || { correctedName: shipName, cruiseLine: '' })
      : { correctedName: shipName, cruiseLine: '' };
    const norm = s => String(s || '').toLowerCase().replace(/[\s\-]+/g, ' ').replace(/[^\w\s]/g, '').trim();
    const target = norm(vesselInfo.correctedName);
    callsForShip = t12Calls.filter(c => norm(c.vessel) === target);
    if (!callsForShip.length) {
      chartHost.textContent = `No data for ${vesselInfo.correctedName} (${vesselInfo.cruiseLine || ''})`;
      return;
    }
  }

  // === Helpers ===
  const toTOD = d => new Date(0, 0, 0, d.getHours(), d.getMinutes(), d.getSeconds(), 0);
  const isMultiDay = (start, end) => start.toDateString() !== end.toDateString();
  const clampTOD = (dt) => {
    const min = new Date(0, 0, 0, 6, 0);
    const max = new Date(0, 0, 0, 18, 0);
    const t = toTOD(dt);
    return (t < min) ? min : (t > max) ? max : t;
  };
  const fmtShortMD = d => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const fmtTime = d => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
  const fmtDuration = ms => { const m = Math.round(ms / 60000); const h = Math.floor(m / 60); const r = m % 60; return h ? `${h}h ${r}m` : `${r}m`; };

  // === Dimensions ===
  const width  = chartHost.clientWidth;
  const height = chartHost.clientHeight;

const margin = { top: 32, right: 20, bottom: 64, left: 52 };
const innerW = Math.max(0, width - margin.left - margin.right);
const innerH = Math.max(0, height - margin.top - margin.bottom);


  // === Scales ===
  const xStart = new Date(lastStart.getFullYear(), lastStart.getMonth(), 1);
  const xEnd   = new Date(lastEnd.getFullYear(),   lastEnd.getMonth() + 1, 1); // month after lastEnd start
  const x = d3.scaleTime().domain([xStart, xEnd]).range([0, innerW]);

  const y = d3.scaleTime()
    .domain([new Date(0, 0, 0, 6, 0), new Date(0, 0, 0, 18, 0)]) // 6:00 → 18:00
    .range([innerH, 0]);

  // === SVG ===
  const svg = d3.select(chartHost)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // === Axes ===
  const xAxis = d3.axisBottom(x)
    .ticks(d3.timeMonth.every(1))
    .tickFormat(d3.timeFormat('%b %y'))  // "Jan 25"
    .tickSizeOuter(0);

  const yAxis = d3.axisLeft(y)
    .ticks(d3.timeHour.every(2))
    .tickFormat(d3.timeFormat('%-I %p')) // 6 AM, 8 AM, …
    .tickSizeOuter(0);

  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(xAxis);

  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis);

  // Grid lines (horizontal)
  g.append('g')
    .attr('class', 'grid-lines')
    .call(
      d3.axisLeft(y)
        .ticks(d3.timeHour.every(2))
        .tickSize(-innerW)
        .tickFormat('')
    );

  // Month separators (vertical at month starts)
  g.append('g')
    .attr('class', 'month-seps')
    .selectAll('line.month-sep')
    .data(d3.timeMonth.range(xStart, xEnd))
    .enter()
    .append('line')
    .attr('class', 'month-sep')
    .attr('x1', d => x(d))
    .attr('x2', d => x(d))
    .attr('y1', 0)
    .attr('y2', innerH)
    .attr('stroke', getComputedStyle(document.documentElement).getPropertyValue('--ink-300')?.trim?.() || '#999')
    .attr('stroke-width', 1)
    .attr('opacity', 0.85);

  // Title
  svg.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .text('Shore Power Usage');

  // Legend pill (same style)
  const legendText = shipName ? `${shipName}` : 'All Vessels';
  const legendG = svg.append('g')
    .attr('class', 'chart-legend')
    .attr('transform', `translate(${width / 2}, ${height - 20})`);
  const textEl = legendG.append('text')
    .attr('class', 'legend-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(legendText);
  const textNode = textEl.node();
  const textW = (textNode && typeof textNode.getComputedTextLength === 'function') ? textNode.getComputedTextLength() : legendText.length * 7;
  const textH = 14;
  legendG.insert('rect', ':first-child')
    .attr('class', 'legend-pill')
    .attr('x', -(textW / 2) - 12)
    .attr('y', -(textH / 2) - 6)
    .attr('width', textW + 24)
    .attr('height', textH + 12);

  // === Visits & Usage lines ===
  const connColor = window.buildConnColorScale(); // 0..1.0..1.25 → color

  // hit rect width ≈ 2/3 day
  const oneDayPx = x(new Date(x.domain()[0].getTime() + 24 * 3600 * 1000)) - x(x.domain()[0]);
  const hitW = Math.max(8, oneDayPx * 0.66);

  // Build items
  const items = callsForShip.map(c => {
    const arrDateMidnight = new Date(c.arrival.getFullYear(), c.arrival.getMonth(), c.arrival.getDate());
    const X = x(arrDateMidnight);

    // Visit Y extents
    const y1 = y(clampTOD(c.arrival));
    const y2 = y(isMultiDay(c.arrival, c.departure) ? new Date(0, 0, 0, 18, 0) : clampTOD(c.departure));

    // Connection (if any)
    const conn = connById.get(c.id) || null;
    let cy1 = null, cy2 = null, connVal = 0;
    if (conn) {
      const stayMsRaw = c.departure - c.arrival;
      const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000)); // stay - 3h
      const connMs = conn.disconnect - conn.connect;
      connVal = stayMsAdj > 0 ? Math.max(0, Math.min(1.25, connMs / stayMsAdj)) : 0;
      cy1 = y(clampTOD(conn.connect));
      cy2 = y(isMultiDay(conn.connect, conn.disconnect) ? new Date(0, 0, 0, 18, 0) : clampTOD(conn.disconnect));
    }

    return {
      c,
      X,
      y1: Math.min(y1, y2),
      y2: Math.max(y1, y2),
      cy1,
      cy2,
      connVal
    };
  });

  // Group per call
  const gCalls = g.selectAll('g.power-item')
    .data(items)
    .enter()
    .append('g')
    .attr('class', 'power-item');

  // Visit stay (thin line)
  gCalls.append('line')
    .attr('class', 'power-stay')
    .attr('x1', d => d.X).attr('x2', d => d.X)
    .attr('y1', d => d.y1).attr('y2', d => d.y2)
    .append('title')
    .text(d => `${d.c.vessel || 'Unknown'} — Visit: ${fmtShortMD(d.c.arrival)} ${fmtTime(d.c.arrival)} → ${fmtShortMD(d.c.departure)} ${fmtTime(d.c.departure)}`);

  // Connection (thicker, colored)
  gCalls.filter(d => d.cy1 != null)
    .append('line')
    .attr('class', 'power-conn')
    .style('--conn-color', d => connColor(d.connVal))
    .attr('x1', d => d.X).attr('x2', d => d.X)
    .attr('y1', d => Math.min(d.cy1, d.cy2))
    .attr('y2', d => Math.max(d.cy1, d.cy2))
    .append('title')
    .text(d => {
      const conn = connById.get(d.c.id);
      return `Shore Power: ${fmtShortMD(conn.connect)} ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)} ${fmtTime(conn.disconnect)}\nConnection Duration: ${fmtDuration(conn.disconnect - conn.connect)}`;
    });

  // Hit region (small rect centered on X)

/* my code recommendation: REPLACEMENT — focus.js */
/* Tooltip tied to power-hit: include visit duration + connection details */
gCalls.append('rect')
  .attr('class', 'power-hit')
  .attr('x', d => d.X - hitW / 2)
  .attr('y', 0)
  .attr('width', hitW)
  .attr('height', innerH)
  .style('fill', 'transparent')
  .style('pointer-events', 'all')
  .append('title')
  .text(d => {
    const v = d.c;

    // Ensure Date objects
    const arr = (v?.arrival instanceof Date) ? v.arrival : new Date(v?.arrival);
    const dep = (v?.departure instanceof Date) ? v.departure : new Date(v?.departure);

    // Visit duration (HHh MMm)
    const durMs = (dep && arr && Number.isFinite(dep - arr)) ? (dep - arr) : 0;
    const min = Math.round(durMs / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const visitDur = h ? `${h}h ${m}m` : `${m}m`;

    // Connection details (if any)
    const conn = connById.get(v.id);
    const connText = conn
      ? `\u000AShore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)}\u000AConnection Duration: ${(() => {
          const ms = (conn.disconnect && conn.connect) ? (conn.disconnect - conn.connect) : 0;
          const cm = Math.round(ms / 60000), ch = Math.floor(cm / 60), cmm = cm % 60;
          return ch ? `${ch}h ${cmm}m` : `${cmm}m`;
        })()}`
      : `\u000AShore Power: Did not connect`;

    // Explicit \u000A newline for SVG <title>
    return `${v.vessel || 'Unknown'}\u000AVisit: ${fmtShortMD(arr)}, ${fmtTime(arr)} → ${fmtShortMD(dep)}, ${fmtTime(dep)}\u000ADuration: ${visitDur}${connText}`;
  });


  // Plot area outline (CSS styles stroke)
  g.append('rect')
    .attr('class', 'plot-area')
    .attr('x', 0).attr('y', 0)
    .attr('width', innerW).attr('height', innerH);

  // After draw: refresh canvas sizing/placement
  const hostBucket =
    document.getElementById('callsChartContainer') ??
    document.getElementById('ospChartContainer');
  if (hostBucket) {
    pcSizeFor(canvas, { type: 'chart' }, hostBucket);
    pcPlace(canvas, hostBucket);
  }
}



function updateRadialHighlights(selectedCallId = null, selectedVessel = null) {
  // 1) Clear any existing highlight classes on both radial charts
  const items = document.querySelectorAll('#ospRadialChart g.power-item, #leftRadialChart g.power-item');
  items.forEach(el => el.classList.remove('is-selected-call', 'is-related-call'));

  // 2) If no callId provided, or the provided callId matches the current activeCallId,
  //    stop here — this is the "reset" sweep that removes unneeded tags.
  if (!selectedCallId || selectedCallId === activeCallId) return;

  // 3) Otherwise, apply highlights for the selected call and all related calls by the same vessel
  const vesselKey = (selectedVessel ?? '').toLowerCase();
  items.forEach(el => {
    const data   = el.__data__;
    const id     = data?.call?.id ?? data?.id ?? null;
    const vessel = (data?.call?.vessel ?? data?.vessel ?? '').toLowerCase();

    if (id === selectedCallId) {
      el.classList.add('is-selected-call');
    } else if (vesselKey && vessel === vesselKey) {
      el.classList.add('is-related-call');
    }
  });
}

// INSERT HERE 👉 v2 highlights: .is-selected/.is-related × .is-alpha/.is-bravo
window.updateRadialHighlightsForSelections = function ({ alpha, bravo }) {
  // All items on both radials
  const items = document.querySelectorAll('#ospRadialChart g.power-item, #leftRadialChart g.power-item');

  // 1) Clear both the new and legacy highlight classes
  items.forEach(el => {
    el.classList.remove(
      // v2
      'is-selected','is-related','is-alpha','is-bravo',
      // v1 (legacy)
      'is-selected-call','is-related-call'
    );
  });

  // Helper: safely read bound data
  const dataOf = el => el?.__data__ ?? null;
  const vesselOf = el => (dataOf(el)?.call?.vessel ?? dataOf(el)?.vessel ?? '').toLowerCase();
  const idOf     = el => (dataOf(el)?.call?.id     ?? dataOf(el)?.id     ?? null);

  // Nothing selected → all clear
  if (!alpha && !bravo) return;

  // Build simple matchers
  const aV = (alpha?.vessel ?? '').toLowerCase();
  const bV = (bravo?.vessel ?? '').toLowerCase();
  const aId = alpha?.callId ?? null;
  const bId = bravo?.callId ?? null;

  // 2) Apply selection classes
  items.forEach(el => {
    const v = vesselOf(el);
    const id = idOf(el);

    // Alpha selected/related
    if (alpha) {
      if (id != null && aId != null && id === aId) {
        el.classList.add('is-selected', 'is-alpha');
      } else if (aV && v === aV) {
        el.classList.add('is-related', 'is-alpha');
      }
    }

    // Bravo selected/related
    if (bravo) {
      if (id != null && bId != null && id === bId) {
        el.classList.add('is-selected', 'is-bravo');
      } else if (bV && v === bV) {
        el.classList.add('is-related', 'is-bravo');
      }
    }
  });
};



/* my code recommendation: INSERTION — promote DOM helpers to global scope */
// INSERT HERE 👉 make helpers visible to Scene.set and others outside DOMContentLoaded
window.getBucketEl = window.getBucketEl || function (which) {
  if (which === 'calls') return document.getElementById('callsChartContainer') || document.getElementById('callsChartContainer');
  if (which === 'osp')   return document.getElementById('ospChartContainer')   || document.getElementById('ospChartContainer');
  return null;
};
window.getRadialEl = window.getRadialEl || function (which) {
  if (which === 'calls') return document.getElementById('callsRadialChart') || document.getElementById('leftRadialChart');
  if (which === 'osp')   return document.getElementById('ospRadialChart')   || document.getElementById('ospRadialChart');
  return null;
};
window.getCentralEl = window.getCentralEl || function (which) {
  if (which === 'calls') return document.getElementById('callsCentralChart') || document.getElementById('leftCentralChart');
  if (which === 'osp')   return document.getElementById('ospCentralChart')   || document.getElementById('rightCentralChart');
  return null;
};


/* my code recommendation: INSERTION — promote canonical layout reader */

window.readLayoutCanonical = window.readLayoutCanonical || function (bucket) {
  const raw = (bucket?.dataset?.layout || '').trim();
  if (raw === 'left')          return 'calls';
  if (raw === 'right')         return 'osp';
  if (raw === 'right-usage')   return 'osp-usage';
  if (raw === 'right-impact')  return 'osp-impact';
  return raw; // already canonical: '', 'calls', 'osp', 'osp-usage', 'osp-impact'
};




// INSERT HERE 👉 sync Usage gauge on right radial with current descriptor layout
function updateRightUsageGauge() {
  const rightBucket = document.getElementById('ospChartContainer');
  const layout = (rightBucket?.dataset?.layout || '').trim();
  const chartSel = '#ospRadialChart';
  const svg = document.querySelector(chartSel + ' svg') || document.querySelector(chartSel);

  // Always remove existing gauge first
  const oldGauge = document.querySelector('#ospRadialChart .conn-gauge');
  if (oldGauge) oldGauge.remove();

  // Only draw for 'right-usage'
  if (layout === 'right-usage') {
    // defer: ensure radial is present before drawing
    Promise.resolve().then(async () => {
      const { avg, n } = await window.getAvgConnQualityT12();
      await window.drawConnQualityGauge('ospRadialChart', avg, n);
    });
  }
}

/* my code recommendation: INSERTION — focus.js */
/*
 * buildPowerCanvasTable()
 * Creates/updates an interactive table inside #powerCanvas showing,
 * per vessel with at least one visit in T12:
 * 1) Cruise line
 * 2) Vessel name
 * 3) # of visits (T12)
 * 4) # of connections
 * 5) Usage rate score (avg of per-visit connection ratio, 0..1.25)
 * 6) kWh power provided (sum of usage)
 *
 * Keeps everything self-contained: computes data, builds a <table>,
 * attaches minimal sort handlers (click on header to sort), and mounts
 * into #powerCanvas. No CSS inline beyond essentials.
 */
async function buildPowerCanvasTable() {
  const canvas = document.getElementById('powerCanvas');
  if (!canvas) return;

  // Clear canvas area reserved for the table container (or create it)
  let tblHost = canvas.querySelector('.pc-table-host');
  if (!tblHost) {
    tblHost = document.createElement('div');
    tblHost.className = 'pc-table-host';
    // keep table isolated in its own container
    canvas.appendChild(tblHost);
  }
  tblHost.innerHTML = '';

  // ----- Data prep (isolated; uses your existing helpers/promises) -----
  const { t12Calls } = await window.fillBuckets();  // arrival ∈ T12
  // Group by vessel
  const byVessel = new Map();
  for (const c of t12Calls) {
    const key = c.vessel ?? 'Unknown';
    const rec = byVessel.get(key) ?? {
      vessel: key,
      cruiseLine: (window.getVesselInfo ? (window.getVesselInfo(key)?.cruiseLine ?? '') : ''),
      visits: 0,
      connections: 0,
      usageRateNumerator: 0, // sum of connMs / adjusted stay
      usageRateDenominator: 0, // count of visits where denominator > 0
      kwhTotal: 0
    };
    rec.visits += 1;

    const conn = c.connection ?? null;
    const stayMsRaw = (c.departure && c.arrival) ? (c.departure - c.arrival) : 0;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000)); // stay minus 3h

    if (conn) {
      rec.connections += 1;
      // usage rate component
      if (stayMsAdj > 0) {
        const connMs = conn.disconnect - conn.connect;
        const val = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
        rec.usageRateNumerator += val;
        rec.usageRateDenominator += 1;
      }
      // kWh total: your data model uses c.usage as energy (if present)
      rec.kwhTotal += (conn.usage ?? 0);
    }

    byVessel.set(key, rec);
  }

  // Final rows
  const rows = Array.from(byVessel.values()).map(r => ({
    cruiseLine: r.cruiseLine || '',
    vessel: r.vessel,
    visits: r.visits,
    connections: r.connections,
    usageRate: r.usageRateDenominator ? (r.usageRateNumerator / r.usageRateDenominator) : 0, // 0..1.25
    kwh: r.kwhTotal
  }));

  // ----- Table UI (isolated) -----
  // Build table skeleton
  const table = document.createElement('table');
  table.className = 'pc-table';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const cols = [
    { key: 'cruiseLine', label: 'Cruise Line' },
    { key: 'vessel',     label: 'Vessel' },
    { key: 'visits',     label: 'Visits', numeric: true },
    { key: 'connections',label: 'Shore Power Connections',  numeric: true },
    { key: 'kwh',        label: 'Power Provided',   numeric: true },
    { key: 'usageRate',  label: 'Usage Rate',     numeric: true, format: v => `${Math.round(v * 100)}%` }
  ];

  // Build header with simple click-to-sort
  const trH = document.createElement('tr');
  cols.forEach((col, idx) => {
    const th = document.createElement('th');
    th.textContent = col.label;
    th.dataset.key = col.key;
    th.style.cursor = 'pointer';

  // alignment classes for header
  if (col.key === 'cruiseLine' || col.key === 'vessel') {
    th.classList.add('textColumn');   // left align
  } else {
    th.classList.add('numberColumn'); // center align
  }



/* my code recommendation: REPLACEMENT — focus.js */
/* Header click: first click → desc, subsequent clicks toggle asc/desc */
th.addEventListener('click', () => {
  console.log("you poked my heart 6");
  const sameCol = table.dataset.sortKey === col.key;
  const nextDir = sameCol
    ? (table.dataset.sortDir === 'desc' ? 'asc' : 'desc')
    : 'desc'; // first click sorts descending

  table.dataset.sortKey = col.key;
  table.dataset.sortDir = nextDir;

  rows.sort((a, b) => {
    const av = a[col.key];
    const bv = b[col.key];
    if (col.numeric) {
      return nextDir === 'asc' ? (av - bv) : (bv - av);
    } else {
      return nextDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    }
  });

  renderBody();
  highlightSorted(th, nextDir);
});

    trH.appendChild(th);
  });
  thead.appendChild(trH);

function renderBody() {
  tbody.innerHTML = '';

  for (const r of rows) {
    const tr = document.createElement('tr');
    let tdLine = null;

    cols.forEach(col => {
      const td = document.createElement('td');
      const v = r[col.key];

      if (col.key === 'cruiseLine') {
        td.textContent = String(v ?? '');
        tdLine = td; // don’t apply yet
      } else if (col.key === 'usageRate') {
        const pct = Math.round(Math.min(1.25, v) * 100);
        td.textContent = `${pct}%`;
      } else if (col.numeric) {
        td.textContent = Number(v ?? 0).toLocaleString('en-US');
      } else {
        td.textContent = String(v ?? '');
      }

        // alignment classes for header
  if (col.key === 'cruiseLine' || col.key === 'vessel') {
    td.classList.add('textColumn');   // left align
  } else {
    td.classList.add('numberColumn'); // center align
  }

      tr.appendChild(td);
    });

    // Mount the row first
    tbody.appendChild(tr);


  }
}



  // helper to style sorted header
  function highlightSorted(th, dir) {
    // minimal UI cue without adding CSS selectors elsewhere
    Array.from(thead.querySelectorAll('th')).forEach(h => {
      h.dataset.sorted = '';
      h.title = '';
    });
    th.dataset.sorted = dir;
    th.title = dir === 'asc' ? 'Sorted ascending' : 'Sorted descending';
  }

  renderBody();
  table.appendChild(thead);
  table.appendChild(tbody);
  tblHost.appendChild(table);
}


/* === PowerCanvas: modular lifecycle (size → place → content → show → auto-resize → destroy) === */

/* 1) Ensure a single canvas exists */
function pcEnsureCanvas(hostBucket) {
  let pc = document.getElementById('powerCanvas');
  if (!pc) {
    pc = document.createElement('div');
    pc.id = 'powerCanvas';
    document.body.appendChild(pc);
  }
  pc.dataset.host = hostBucket?.id ?? '';
  return pc;
}

/* 2) Size canvas for intended content (table/chart); allows overrides via spec.wK/spec.hK */

/* PowerCanvas: size to fit children (chart/table) — no excess height */


/* PowerCanvas: size to fit children (trend + chart + table) + top/bottom margins */
function pcSizeFor(canvas, spec, hostBucket) {
  // Width anchored to RIGHT bucket so canvas is just a bit wider than the right KPI bucket
  const leftBucket = document.getElementById('callsChartContainer') || hostBucket;
  const rightBucket = document.getElementById('ospChartContainer') || hostBucket;

  // Use right-bucket width as reference; aim ~+5%, but clamp so it never crosses center line
  const refW = rightBucket?.clientWidth || leftBucket?.clientWidth || Math.round(window.innerWidth / 2);
  const desiredW = Math.round(refW * 1.05);
  const maxW = Math.min(
    Math.round(refW * 1.10),            // hard cap ~+10% of right bucket
    Math.max(320, leftBucket?.clientWidth || refW) // never wider than the left half area
  );
  const finalW = Math.min(desiredW, maxW, window.innerWidth - 32); // guard against narrow tabs
  canvas.style.width = `${finalW}px`;

  // Current rendered child heights
  const trendH = (() => {
    const el = canvas.querySelector('.pc-trend');
    return el ? el.clientHeight : 0;
  })();
  const chartH = (() => {
    const el = canvas.querySelector('.pc-chart');
    return el ? el.clientHeight : 0;
  })();
  const tableH = (() => {
    const el = canvas.querySelector('.pc-table-host .pc-table');
    return el ? el.clientHeight : 0;
  })();

  // Strictly sum what exists; no large “1/3 of right bucket” fallback that creates white space
  let contentH = trendH + chartH + tableH;

  // If absolutely nothing is mounted yet AND spec didn’t say “empty”, use a small, neutral stub height
  if (contentH === 0 && spec?.type !== 'empty') {
    const base = Math.round((rightBucket?.clientHeight || leftBucket?.clientHeight || 600) * 0.25);
    contentH = Math.max(180, Math.min(360, base)); // modest placeholder: 180–360px
  }

  const marginTopBottom = spec?.marginY ?? 8; // px per side
  const totalH = contentH + (marginTopBottom * 2);
  canvas.style.height = `${totalH}px`;
  canvas.style.paddingTop = `${marginTopBottom}px`;
  canvas.style.paddingBottom = `${marginTopBottom}px`;
}
// INSERT HERE 👉



/* Place the PowerCanvas relative to the LEFT KPI bucket (never cross center line) */
function pcPlace(canvas, hostBucket) {
  const leftHost = document.getElementById('callsChartContainer') || hostBucket;
  // Align the canvas’ RIGHT edge to the leftHost’s RIGHT edge (i.e., the screen center line)
  // so it won’t overlap the right radial chart.
  const leftEdge = leftHost.offsetLeft + (leftHost.clientWidth - canvas.clientWidth);

  const top = leftHost
    ? leftHost.offsetTop + Math.round((leftHost.clientHeight - canvas.clientHeight) / 2)
    : 0;

  canvas.style.position = 'absolute';
  canvas.style.left = `${Math.max(0, leftEdge)}px`;
  canvas.style.top = `${Math.max(0, top)}px`;
}
// INSERT HERE 👉



/* 4) Apply/prepare content container; returns the host for external drawers */
function pcApplyContent(canvas, spec) {
  let host = canvas.querySelector('.pc-table-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'pc-table-host';
    canvas.appendChild(host);
  }
  if (spec?.replace) host.replaceChildren(); // optional clear before re-render
  return host;
}

/* 5) Show (fade in via CSS class) */
function pcShow(canvas) {
  requestAnimationFrame(() => canvas.classList.add('is-visible'));
}

/* 6) Hide then destroy when empty */
function pcHideAndDestroy(canvas) {
  canvas.classList.remove('is-visible');
  setTimeout(() => canvas.remove(), 400); // match CSS fade duration
}

/* 7) Auto-resize when content changes (add/remove) */


/* 7) Auto-resize when content changes (add/remove) */
/* my code recommendation: REPLACEMENT — focus.js */
/* Auto-resize AND enforce strict child order: Trend (top) → Chart (middle) → Table (bottom), coalesced per frame */
function pcRefreshSizeOnMutations(canvas, hostBucket, spec) {
  if (canvas.__pcObs) canvas.__pcObs.disconnect();

  // INSERT HERE 👉 coalesce mutation work to once per animation frame
  let scheduled = false;
  const runOnce = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;

      // Enforce DOM order only if out of order
      const trendEl = canvas.querySelector('.pc-trend');        // TOP
      const chartEl = canvas.querySelector('.pc-chart');        // MIDDLE
      const tblHost = canvas.querySelector('.pc-table-host');   // BOTTOM

      // 1) Trend should be first
      if (trendEl && canvas.firstChild !== trendEl) {
        canvas.insertBefore(trendEl, canvas.firstChild);
      }
      // 2) Table should be last
      if (tblHost && canvas.lastChild !== tblHost) {
        canvas.appendChild(tblHost);
      }
      // 3) Chart should be immediately before the table (or after trend when no table)
      if (chartEl) {
        if (tblHost) {
          const before = tblHost.previousSibling;
          if (before !== chartEl) canvas.insertBefore(chartEl, tblHost);
        } else {
          // No table yet: keep chart after trend (or at end if no trend)
          const first = canvas.firstChild;
          const targetNext = trendEl ? trendEl.nextSibling : first;
          // If not already placed correctly, move to the end as a safe fallback
          if (chartEl.nextSibling !== targetNext) {
            canvas.appendChild(chartEl);
          }
        }
      }

      // Recompute size and placement once per frame
      pcSizeFor(canvas, spec, hostBucket);
      pcPlace(canvas, hostBucket);

      // Destroy only when empty (no trend, no chart, no table)
      pcMaybeDestroy(canvas);
    });
  };

  const obs = new MutationObserver(() => runOnce());
  obs.observe(canvas, { childList: true, subtree: true });
  canvas.__pcObs = obs;

  // Initial pass so the order & size are correct immediately
  runOnce();
}




/* my code recommendation: REPLACEMENT — focus.js */
/* Destroy only when there is neither a chart nor a table present */

/* my code recommendation: REPLACEMENT — focus.js */
/* Destroy only when there is neither a trend, chart, nor table present */
function pcMaybeDestroy(canvas) {
  const hasTrend = !!canvas.querySelector('.pc-trend');                 // TOP
  const hasChart = !!canvas.querySelector('.pc-chart');                 // MIDDLE
  const hasTable = !!canvas.querySelector('.pc-table-host .pc-table');  // BOTTOM
  if (!hasTrend && !hasChart && !hasTable) {
    pcHideAndDestroy(canvas);
  }
}



/* 9) Orchestrator: run the steps in order; returns the canvas & content host */

/* my code recommendation: REPLACEMENT — focus.js */
/* Orchestrator: run the steps in order; returns the canvas & content host */

function pcRender(spec, hostBucket) {
  const canvas = pcEnsureCanvas(hostBucket);
  const contentHost = pcApplyContent(canvas, spec);

  // INSERT HERE 👉 only (re)build table when explicitly asked or if missing
  const hasTable = !!canvas.querySelector('.pc-table-host .pc-table');
  if (spec?.type === 'table' || !hasTable) {
    void buildPowerCanvasTable();
  }

  // Size/place after content changes so height includes the table
  pcSizeFor(canvas, spec, hostBucket);
  pcPlace(canvas, hostBucket);
  pcShow(canvas);
  pcRefreshSizeOnMutations(canvas, hostBucket, spec);
  return { canvas, contentHost };
}







/* ============================================================================================
   CUE DIRECTOR
   Listens for cues emitted from UI interactions and determines scene transitions.
   Works with the Scene Composer (Scene.register / Scene.set) using declarative Model‑B scenes.
   ============================================================================================
*/

window.CueDirector = (function () {

  // Each scene may extend this map with its own transitions:
  // { cueName : nextSceneName }
  const cueTables = new Map();

  return {

    // ---------------------------------------------------------
    // Scene.registerTransitions(name, { CUE: 'nextScene', ... })
    // Allows each scene to declare how it responds to cues.
    // ---------------------------------------------------------
    registerTransitions(sceneName, transitions) {
      cueTables.clear();
      cueTables.set(sceneName, transitions || {});
    },

    // ---------------------------------------------------------
    // emit(cueName, payload?)
    // Entry point for all click handlers → Director receives cue
    // ---------------------------------------------------------

emit(cueName, payload = {}) {
  const { source } = payload; // e.g. 'header'
  const current = window.Scene.get();

  if (source === 'header') {
    console.log(
      `[CueDirector] GLOBAL cue "${cueName}" → ${payload.targetScene}`
    );
    window.Scene.set(payload.targetScene);
    return;
  }

  const table = cueTables.get(current);

  if (!table || !table[cueName]) {
    console.log(
      `[CueDirector] Ignored cue "${cueName}" in scene "${current}"`
    );
    return;
  }

  const nextScene = table[cueName];
  console.log(`[CueDirector] ${current} --(${cueName})→ ${nextScene}`);
  window.Scene.set(nextScene);
}

  };

})();



/////////////////////////////////////////////////////////////////////////////////////////////////
//
//  THE DIRECTOR
//  THIS FUNCTION RESPONDS TO USER INTERACTIONS BY MOVING TO THE APPROPRIATE SCENE
//
/////////////////////////////////////////////////////////////////////////////////////////////////


window.Scene = (function () {

  const registry = new Map();
  let currentScene = null;

  // ---------------------------------------------------------------
  // API: Scene.register(name, { include, mount, unmount })
  // ---------------------------------------------------------------
  function register(name, def) {
    if (!def || !Array.isArray(def.include)) {
      throw new Error(`Scene "${name}" must define an include:[] array`);
    }
    registry.set(name, {
      include: def.include,
      mount: def.mount || (async () => {}),
      unmount: def.unmount || (() => {}),
      transitions: def.transitions || {} 
    });
  }

  // ---------------------------------------------------------------
  // API: Scene.get()
  // ---------------------------------------------------------------
  function get() {
    return currentScene;
  }

  // ---------------------------------------------------------------
  // API: Scene.set(name)
  //   Drives scene transitions: unmount old, diff DOM, mount new
  // ---------------------------------------------------------------
  async function set(name) {
    if (!registry.has(name)) {
      console.warn(`Scene "${name}" is not registered.`);
      return;
    }
    if (currentScene === name) {
      return; // no-op
    }

    const oldDef = currentScene ? registry.get(currentScene) : null;
    const newDef = registry.get(name);

    // 1. UNMOUNT OLD SCENE
    if (oldDef && typeof oldDef.unmount === 'function') {
      try {
        await oldDef.unmount();
      } catch (err) {
        console.error(`Error during unmount of scene "${currentScene}":`, err);
      }
    }


/* REPLACEMENT — Scene.set() DOM composition using fade‑hide
   ---------------------------------------------------------
   Removes NO DOM. Only toggles .scene-hidden on top‑level
   scene-managed elements under #D3andME. Prevents flash,
   preserves nested rotors, charts, SVG, and avoids layout
   jumps.
*/

const newSet = new Set(newDef.include);

// 2. HIDE elements not in the new guest list (fade‑out only)
for (const el of document.querySelectorAll('#D3andME [id]')) {
  const id = el.id;
  if (!newSet.has(id)) {
    el.classList.add('scene-hidden');
  }
}

// 3. SHOW required elements (fade‑in only)
//    Create missing containers only if truly absent.
for (const id of newDef.include) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.getElementById('D3andME').appendChild(el);
  }
  el.classList.remove('scene-hidden');
}


    // Set the new scene
    currentScene = name;


if (typeof window.CueDirector?.registerTransitions === 'function') {
  window.CueDirector.registerTransitions(
    name,
    newDef.transitions || {}
  );
}


    // 4. MOUNT NEW SCENE
    if (typeof newDef.mount === 'function') {
      try {
        await newDef.mount();
      } catch (err) {
        console.error(`Error during mount of scene "${name}":`, err);
      }
    }
  }

  return { register, set, get };
})();










/////////////////////////////////////////////////////////////////////////////////////////////////
//
//  SCENE REGISTRATIONS
//  ELEMENTS INCLUDED IN A SCENE REGISTRATION ARE ADDED OR MOVED TO THEIR ASSIGNED LOCATION
//  ELEMENTS NOT INCLUDED IN A SCENE REGISTRATION ARE REMOVED
//
//  CURRENT LIST OF SCENES:
//    LOAD:         THIS IS THE SCENE THAT IS SET WHEN THE PAGE LOADS
//    CALLS:        FIRST LEVEL EXPANSION OF CALL METRIC FROM LOAD SCENE
//    CALLS-CAP:    EXPANSION OF PASSENGER VOLUMES RELATED TO CALLS (UNDEVELOPED)
//    OSP:          FIRST LEVEL EXPANSION OF CONNECTION METRIC FROM LOAD SCENE
//    OSP-USAGE:    EXPANSION OF OSP METRICS RELATED TO THE USAGE RATING
//    OSP-IMPACT:   EXPANSION OF OSP METRICS RELATED TO THE KWH CONSUMED
//
/////////////////////////////////////////////////////////////////////////////////////////////////


/* Scene.register('load') — Declarative baseline scene (Model‑B) */

window.Scene.register('overview', {
  include: [
    'callsChartContainer',
    'ospChartContainer'
  ],

  async mount() {
    LayoutDirector.requestLayout('overview', 'scene:load')
    document.getElementById('callsChartContainer').classList.remove('shrunk');
    document.getElementById('ospChartContainer').classList.remove('shrunk');
  },

  transitions: {
    CLICK_BUCKET_CALLS: 'calls',
    CLICK_BUCKET_OSP:   'osp'
  }
});



window.Scene.register('calls', {
  include: [
    'callsChartContainer',
    //'ospChartContainer',
    'rotor-calls',
    'callsRadialChart',
    'callsCentralChart'
  ],

  async mount() {
    LayoutDirector.requestLayout('kpi', 'scene:calls')
    document.getElementById('callsChartContainer').classList.remove('shrunk');
    document.getElementById('ospChartContainer').classList.add('shrunk');

    // Draw CALLS radial (this scene owns it)
    const callsRadial = document.getElementById('callsRadialChart');
    if (callsRadial) {
      await charts.drawRadialCalendar(callsRadial, {});
      await charts.drawCallArcs(callsRadial);
    }
  },

  transitions: {
    CLICK_BUCKET_CALLS: 'overview',
    CLICK_BUCKET_OSP:   'osp'
  }
});



/* Scene.register('osp') — Declarative OSP scene (Model‑B) */

window.Scene.register('osp', {

  include: [
    'callsChartContainer',
    'ospChartContainer',
    'rotor-connections',
    'rotor-usage',
    'rotor-kwh',
    'ospRadialChart',
    'ospCentralChart',
    'powerCanvas'
  ],

  async mount() {
    LayoutDirector.requestLayout('kpi', 'scene:osp')
    document.getElementById('callsChartContainer').classList.add('shrunk');
    document.getElementById('ospChartContainer').classList.remove('shrunk');

    // Draw OSP radial for this scene
    const ospRadial = document.getElementById('ospRadialChart');
    if (ospRadial) {
      await charts.drawRadialCalendar(ospRadial, {});
      await charts.drawPowerArcs(ospRadial);
    }

    // Central chart area (clean slate, owned by scene)
    document.getElementById('ospCentralChart')?.replaceChildren();

    // Prepare PowerCanvas (hidden) — reveal is done in osp‑usage / osp‑impact
    const bucket = document.getElementById('ospChartContainer');
    if (bucket && typeof window.pcRender === 'function') {
      window.pcRender({ type: 'chart' }, bucket);
    }
  },

  transitions: {
    CLICK_BUCKET_OSP:   'overview',
    CLICK_BUCKET_CALLS: 'calls',
    SELECT_CALL:        'osp-usage',
    CLICK_TREND_ARROW:  'osp-impact'
  }
});



///////////////////////////////////////////////////////////////////////////////////
//
//  END SCENE REGISTRY
//
////////////////////////////////////////////////////////////////////////////////////





/*
// INSERTION — Scene participant: Usage gauge (right radial), only in 'right-usage'
window.Scene.register('right-usage-gauge', {
  scenes: {
    'right-usage': {
      mount: () => {
        // remove any old gauge first, then draw for this scene
        const old = document.querySelector('#ospRadialChart .conn-gauge');
        if (old) old.remove();
        Promise.resolve().then(async () => {
          const { avg, n } = await window.getAvgConnQualityT12();
          await window.drawConnQualityGauge('ospRadialChart', avg, n);
        });
      }
    }
  },
  unmount: () => {
    const old = document.querySelector('#ospRadialChart .conn-gauge');
    if (old) old.remove();
  }
});
*/

/* my code recommendation: register a right-scene chart anchored to probe 5 
window.Scene.register('right-cruise-connections-chart', {
  scenes: {
    'right': {
      mount: async () => {
        const bucket = document.getElementById('ospChartContainer');
        if (!bucket) return;

        // Ensure/position host so its *bottom center* sits on probe point 5
        let host = document.getElementById('rightConnectionsByCruiseChart');
        if (!host) {
          host = document.createElement('div');
          host.id = 'rightConnectionsByCruiseChart';
          host.className = 'kpi-inline-chart';
          bucket.appendChild(host);
        }

        // Size: 70% width × 45% height of the bucket
        const w = Math.round(bucket.clientWidth  * 0.65);
        const h = Math.round(bucket.clientHeight * 0.35);

        // Probe 5 (index 4) within bucket coordinates
        const pts = computeProbePositions(bucket);
        const p5  = pts[0]; // {x, y}
        const left = Math.round(p5.x - w / 2);
        const top  = Math.round(p5.y - h);

        Object.assign(host.style, {
          position: 'absolute',
          left: left + 'px',
          top:  top  + 'px',
          width:  w  + 'px',
          height: h  + 'px',
          pointerEvents: 'auto'
        });


/* my code recommendation: REPLACEMENT 
const guard = (e) => {
  // Let interactive chart elements handle their own clicks, but don't let events escape the host
  if (e.target.closest('.chart-interactive')) {
    e.stopPropagation();           // prevent bubbling to KPI bucket
    return;                        // allow target/bubble handlers on the chart elements
  }
  // Non-interactive area ⇒ fully block
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
};
['click','pointerdown','mousedown','touchstart'].forEach(type => {
  host.addEventListener(type, guard, { capture: true, passive: false });
});


        // Draw chart (charts.js must be loaded; guard just in case)
        if (window.drawConnectionsByCruiseChart) {
          host.innerHTML = '';
          await window.drawConnectionsByCruiseChart(host);
        }
      }
    }
  },
  unmount: () => {
    const host = document.getElementById('rightConnectionsByCruiseChart');
    if (host) host.remove();
  }
});

//  - right-usage       → usageRate
//  - right-impact      → kWh
//  - right-connections → connections
window.Scene.register('pc-trend', {
  scenes: {
    'right-usage': {
      mount: async () => {
        const hostBucket = document.getElementById('callsChartContainer') || document.getElementById('ospChartContainer');
        const { canvas, contentHost } = pcRender({ type: 'chart' }, hostBucket);
        const rightBucket = document.getElementById('ospChartContainer');
        const childH = Math.round((rightBucket?.clientHeight ?? hostBucket.clientHeight) * 0.40);
        canvas.style.setProperty('--pc-child-h', `${childH}px`);
        // ensure trend host at TOP
        let trendHost = contentHost.querySelector('.pc-trend');
        if (!trendHost) {
          trendHost = document.createElement('div');
          trendHost.className = 'pc-trend';
          contentHost.insertBefore(trendHost, contentHost.firstChild);
        }
        trendHost.dataset.role = 'usageRate';
        trendHost.dataset.vessel = window.activeVesselName ?? '';
        //await drawT12TrendChart(trendHost, 'usageRate', 'Usage Rate', window.activeVesselName ?? null);
        
await charts.getT12Trend({ vesselName: window.activeVesselName ?? null });
charts.drawT12Trend(trendHost, {
  seriesKey:   'usageRate',
  legendLabel: 'Usage Rate',
  vesselName:  window.activeVesselName ?? null
});

        pcSizeFor(canvas, { type: 'chart' }, hostBucket);
        pcPlace(canvas, hostBucket);
      }
    },
    'right-impact': {
      mount: async () => {
        const hostBucket = document.getElementById('callsChartContainer') || document.getElementById('ospChartContainer');
        const { canvas, contentHost } = pcRender({ type: 'chart' }, hostBucket);
        const rightBucket = document.getElementById('ospChartContainer');
        const childH = Math.round((rightBucket?.clientHeight ?? hostBucket.clientHeight) * 0.40);
        canvas.style.setProperty('--pc-child-h', `${childH}px`);
        let trendHost = contentHost.querySelector('.pc-trend');
        if (!trendHost) {
          trendHost = document.createElement('div');
          trendHost.className = 'pc-trend';
          contentHost.insertBefore(trendHost, contentHost.firstChild);
        }
        trendHost.dataset.role = 'kwh';
        trendHost.dataset.vessel = window.activeVesselName ?? '';
        //await drawT12TrendChart(trendHost, 'kwh', 'kWh Provided', window.activeVesselName ?? null);
        
// Ensure data for this vessel

await charts.getT12Trend({ vesselName: window.activeVesselName ?? null });
charts.drawT12Trend(trendHost, {
  seriesKey:   'kwh',
  legendLabel: 'kWh Provided',
  vesselName:  window.activeVesselName ?? null
});


        pcSizeFor(canvas, { type: 'chart' }, hostBucket);
        pcPlace(canvas, hostBucket);
      }
    },
    'right-connections': {
      mount: async () => {
        const hostBucket = document.getElementById('callsChartContainer') || document.getElementById('ospChartContainer');
        const { canvas, contentHost } = pcRender({ type: 'chart' }, hostBucket);
        const rightBucket = document.getElementById('ospChartContainer');
        const childH = Math.round((rightBucket?.clientHeight ?? hostBucket.clientHeight) * 0.40);
        canvas.style.setProperty('--pc-child-h', `${childH}px`);
        let trendHost = contentHost.querySelector('.pc-trend');
        if (!trendHost) {
          trendHost = document.createElement('div');
          trendHost.className = 'pc-trend';
          contentHost.insertBefore(trendHost, contentHost.firstChild);
        }
        trendHost.dataset.role = 'connections';
        trendHost.dataset.vessel = window.activeVesselName ?? '';
        //await drawT12TrendChart(trendHost, 'connections', 'Connections', window.activeVesselName ?? null);
        
await charts.getT12Trend({ vesselName: window.activeVesselName ?? null });
charts.drawT12Trend(trendHost, {
  seriesKey:   'connections',
  legendLabel: 'Connections',
  vesselName:  window.activeVesselName ?? null
});

        
        pcSizeFor(canvas, { type: 'chart' }, hostBucket);
        pcPlace(canvas, hostBucket);
      }
    }
  },
  unmount: () => {
    const canvas = document.getElementById('powerCanvas');
    const trend = canvas?.querySelector('.pc-trend');
    if (trend) trend.remove();
    if (canvas) pcMaybeDestroy(canvas);
  }
});

*/


/* my code recommendation: REPLACEMENT — focus.js */
/* Cache per vessel ('' = all vessels) */
/* REMOVE THIS BLOCK AFTER TESTING MIGRATION TO CHARTS.JS
window.ensureT12Trend = async function(vesselNameOrNull) {
  const norm = s => String(s || '')
    .toLowerCase()
    .replace(/[\s\-]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  const key = vesselNameOrNull ? norm(vesselNameOrNull) : '';
  if (!window.__T12TrendCache) window.__T12TrendCache = new Map();

  const entry = window.__T12TrendCache.get(key);
  if (entry && (Date.now() - entry.stamp < 60_000)) return entry.data;

  const data = await computeT12Trend(key || null);  // <-- pass normalized key or null
  window.__T12TrendCache.set(key, { data, stamp: Date.now() });
  return data;
};
*/


/* my code recommendation: INSERTION — focus.js */
/* Attach a colored ▲/▼/• arrow above the rotor digits */

/* my code recommendation: REPLACEMENT — focus.js */
/* Draw a concave-sided arrow as SVG, sized to the middle digit width */




/* my code recommendation: REPLACEMENT — focus.js */
/* Full function: computeT12Trend()
   FIXED: 12-month windows now correctly end on the latest completed month.
   - Build 24 completed-month buckets anchored to lastEnd (index 23 = latest).
   - Produce 12 rolling 12‑month readings where:
       windows12[11] = months 12..23  → CURRENT (e.g., Jan–Dec 2025)
       windows12[10] = months 11..22  → PREVIOUS (e.g., Dec 2024–Nov 2025)
   - Arrow color mapping: percent change → [0..1] centered at 0.5 (±50% clamp).

/* my code recommendation: REPLACEMENT — focus.js */
/* Add optional vesselKey filter (normalized, lowercase, punctuation stripped) */
/*
REMOVE THIS BLOCK AFTER TESTING MIGRATION TO CHARTS.JS
async function computeT12Trend(vesselKey = null) {
  const [calls, connections] = await Promise.all([window.callsPromise, window.connectionsPromise]);
  const { lastEnd } = window.Helpers.getT24();

  const monthStart = (y, m) => { const d = new Date(y, m, 1); d.setHours(0,0,0,0); return d; };
  const monthEnd   = (y, m) => { const d = new Date(y, m + 1, 1); d.setMilliseconds(-1); return d; };

  const endY = lastEnd.getFullYear();
  const endM = lastEnd.getMonth();
  const spanStart = monthStart(endY, endM - 23);
  const spanEnd   = monthEnd(endY, endM);

  const byMonth24 = Array.from({ length: 24 }, (_, i) => {
    const anchor = new Date(endY, endM - 23 + i, 1);
    const y = anchor.getFullYear(), m = anchor.getMonth();
    return { i, y, m, start: monthStart(y, m), end: monthEnd(y, m), calls: [] };
  });

  const connById = new Map();
  for (const c of connections) {
    const ts = c.connect ?? c.disconnect;
    if (ts && window.Helpers.rangeCheck(ts, spanStart, spanEnd) && c.id != null) {
      connById.set(c.id, c);
    }
  }

  const callsSorted = calls
    .filter(c => window.Helpers.rangeCheck(c.arrival, spanStart, spanEnd))
    .slice()
    .sort((a, b) => a.arrival - b.arrival);

  const norm = s => String(s || '')
    .toLowerCase()
    .replace(/[\s\-]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  // Filter calls to the selected vessel, if provided
  const callsScoped = vesselKey ? callsSorted.filter(c => norm(c.vessel) === vesselKey) : callsSorted;

  // Assign scoped calls to the 24 buckets
  for (const c of callsScoped) {
    const mi = (c.arrival.getFullYear() - spanStart.getFullYear()) * 12 +
               (c.arrival.getMonth()      - spanStart.getMonth());
    if (mi >= 0 && mi < 24) byMonth24[mi].calls.push(c);
  }

  const rateFor = (c) => {
    const stayMsRaw = c.departure - c.arrival;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));
    const conn = connById.get(c.id) ?? null;
    if (!conn || stayMsAdj <= 0) return 0;
    const connMs = conn.disconnect - conn.connect;
    return Math.max(0, Math.min(1.25, connMs / stayMsAdj));
  };

  const windows12 = Array.from({ length: 12 }, (_, w) => {
    const months = byMonth24.slice(w + 1, w + 13); // ensure last window includes latest month
    const allCalls = months.flatMap(b => b.calls);

    const callsN       = allCalls.length;
    const connectionsN = allCalls.filter(c => !!connById.get(c.id)).length;
    const usageVals    = allCalls.map(rateFor).filter(v => Number.isFinite(v));
    const usageRate    = usageVals.length ? (usageVals.reduce((s, v) => s + v, 0) / usageVals.length) : 0;
    const kwhTotal     = allCalls.reduce((s, c) => s + ((connById.get(c.id)?.usage ?? 0)), 0);

    return { calls: callsN, connections: connectionsN, usageRate, kwh: kwhTotal };
  });

  const current = windows12[11];
  const prev    = windows12[10];

  function pctToColorParam(last, prior) {
    let r;
    if (prior > 0) r = (last - prior) / prior;
    else r = last > 0 ? 1 : 0;
    const rc = Math.max(-0.5, Math.min(0.5, r));
    return 0.5 + rc;
  }

  const colorScale = window.buildConnColorScale();
  const makeSeries = (key) => {
    const last  = current[key] ?? 0;
    const prior = prev[key] ?? 0;
    const delta = last - prior;
    const dir   = (delta > 0) ? 'up' : (delta < 0 ? 'down' : 'flat');
    const color = colorScale(pctToColorParam(last, prior));
    return { values: windows12.map(w => w[key]), current: last, prev: prior, delta, dir, color };
  };

  return {
    windows12,
    series: {
      calls:       makeSeries('calls'),
      connections: makeSeries('connections'),
      usageRate:   makeSeries('usageRate'),
      kwh:         makeSeries('kwh')
    }
  };
}
*/



/* my code recommendation: INSERTION — focus.js */
/* === Trend chart orchestration === */

/* Map rotor role → trend series key + legend label */
const TrendRoleMap = {
  usage:       { key: 'usageRate', label: 'Usage Rate' },
  connections: { key: 'connections', label: 'Connections' },
  kwh:         { key: 'kwh',        label: 'kWh Provided' }
};

// refresh open T12 trend when vessel selection changes
function refreshOpenTrendFor(vesselName) {
  const canvas = document.getElementById('powerCanvas');
  const trendHost = canvas?.querySelector('.pc-trend');
  if (!trendHost) return;

  // role in dataset is one of: 'usageRate' | 'kwh' | 'connections'
  const role = trendHost.dataset.role;
  const cfg = {
    usageRate:   { key: 'usageRate',   label: 'Usage Rate' },
    kwh:         { key: 'kwh',         label: 'kWh Provided' },
    connections: { key: 'connections', label: 'Connections' }
  }[role];
  if (!cfg) return;

  const vessel = vesselName ?? '';
  charts.getT12Trend({ vesselName: vessel }).then(() => {
    charts.drawT12Trend(trendHost, {
      seriesKey:   cfg.key,
      legendLabel: cfg.label,
      vesselName:  vessel
    });
  });
}





/* my code recommendation: REPLACEMENT — focus.js */
/* Full function: handleTrendArrowClick(role)
   Toggle behavior:
   - 1st click on a role's arrow → insert trend chart at TOP of PowerCanvas.
   - 2nd click on the SAME role (and same vessel filter) → remove the trend chart.
   - Clicking a different role replaces the chart with that role.
*/






/* my code recommendation: REPLACEMENT — focus.js */
/* Full function: drawT12TrendChart(hostEl, seriesKey, legendLabel)
   - Renders a clean T12 Trend line chart at the TOP of PowerCanvas.
   - X axis: end-month labels "Apr 24", "May 24", … (12 points).
   - Y axis: starts at 0; auto max per measure; neutral black line; dots with tooltips.
   - Title: "T12 Trend"; Legend: same pill spacing as usage chart, showing legendLabel. */

/* my code recommendation: REPLACEMENT — focus.js */
/* Full signature updated to accept vesselName and filter trend */

/* my code recommendation: REPLACEMENT — focus.js */
/* Full function: drawT12TrendChart(hostEl, seriesKey, legendLabel, vesselName = null)
   - Filters to the selected vessel when provided.
   - X axis: 12 end-month labels "Apr 24", "May 24", …
   - Y axis: starts at 0; local auto-max.
   - Title: "T12 Trend"; Legend: pill (usage-chart spacing) with measure + vessel.
   - Neutral black line; distinct dots with hover tooltips including T12 period window.
*/
/* REMOVE THIS BLOCK AFTER TESTING MIGRATION TO CHARTS.JS
async function drawT12TrendChart(hostEl, seriesKey, legendLabel, vesselName = null) {
  if (!hostEl) return;
  hostEl.innerHTML = '';

  // Get 12 readings for the requested series, filtered to vessel if provided
  const trend = await window.ensureT12Trend(vesselName ?? null);
  const series = trend?.series?.[seriesKey];
  if (!series) return;

  const values = Array.isArray(series.values) ? series.values.slice() : [];
  if (!values.length) return;

  // Build 12 end-month labels from lastEnd (e.g., "Apr 24")
  const { lastEnd } = window.Helpers.getT24();
  const endY = lastEnd.getFullYear();
  const endM = lastEnd.getMonth();

  const monthStart = (y, m) => { const d = new Date(y, m, 1); d.setHours(0,0,0,0); return d; };
  const fmtLabel = (d) => d.toLocaleDateString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(-2);

  // Windows indexed 0..11 end at months (endM - 11 + w)
  const endMonths = Array.from({ length: 12 }, (_, w) => monthStart(endY, endM - 11 + w));
  const xLabels   = endMonths.map(fmtLabel);

  // Tooltip period: each window spans 12 months ending at its end-month
  const periodLabel = (w) => {
    const startMonth = monthStart(endY, endM - 22 + w); // start of window
    const endMonth   = monthStart(endY, endM - 11 + w); // end of window
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(-2);
    return `${fmt(startMonth)} - ${fmt(endMonth)}`;
  };

  // Dimensions
  const width  = hostEl.clientWidth;
  const height = hostEl.clientHeight;
  const margin = { top: 28, right: 16, bottom: 36, left: 44 };
  const innerW = Math.max(0, width  - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top  - margin.bottom);

  // Scales: X evenly spaced, Y starts at 0; usageRate shown as %
  const x = d3.scaleLinear().domain([0, 11]).range([0, innerW]);
  const isPercent = (seriesKey === 'usageRate');
  const yVals = isPercent ? values.map(v => Math.max(0, v) * 100) : values.map(v => Math.max(0, v));
  const yMax = Math.max(1, Math.ceil((Math.max(...yVals) || 1) / 10) * 10); // round up to nearest 10
  const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

  // SVG
  const svg = d3.select(hostEl)
    .append('svg')
    .attr('class', 'trend-chart')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Axes
  const xAxis = d3.axisBottom(d3.scalePoint().domain(xLabels).range([0, innerW])).tickSizeOuter(0);
  const yAxis = d3.axisLeft(y).ticks(5).tickSizeOuter(0);
  g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerH})`).call(xAxis);
  g.append('g').attr('class', 'y-axis').call(yAxis);

  // Title
  svg.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', 18)
    .attr('text-anchor', 'middle')
    .text('T12 Trend');

  // Legend — same spacing as usage chart; include vesselName when filtered
  const legendText = vesselName ? `${legendLabel} — ${vesselName}` : legendLabel;
  const legendG = svg.append('g')
    .attr('class', 'chart-legend')
    .attr('transform', `translate(${width / 2}, ${height - 20})`);
  const textEl = legendG.append('text')
    .attr('class', 'legend-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(legendText);
  const textNode = textEl.node();
  const textWidth = (textNode && typeof textNode.getComputedTextLength === 'function')
    ? textNode.getComputedTextLength()
    : legendText.length * 7;
  const textHeight = 14;
  legendG.insert('rect', ':first-child')
    .attr('class', 'legend-pill')
    .attr('x', -(textWidth / 2) - 12)
    .attr('y', -(textHeight / 2) - 6)
    .attr('width', textWidth + 24)
    .attr('height', textHeight + 12);

  // Line path (neutral black)
  const line = d3.line()
    .x((_, i) => x(i))
    .y((d) => y(isPercent ? d * 100 : d));
  g.append('path')
    .datum(values)
    .attr('class', 'trend-line')
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', '#000')
    .attr('stroke-width', 2);

  // Dots + native tooltips (hover)
  g.selectAll('circle.trend-dot')
    .data(values.map((v, i) => ({ v, i })))
    .enter()
    .append('circle')
    .attr('class', 'trend-dot')
    .attr('r', 3.5)
    .attr('cx', d => x(d.i))
    .attr('cy', d => y(isPercent ? d.v * 100 : d.v))
    .attr('fill', '#000')
    .append('title')
    .text(d => {
      const val = isPercent ? `${Math.round(d.v * 100)}%` : `${Math.round(d.v).toLocaleString('en-US')}`;
      return `${val}\n${periodLabel(d.i)}`;
    });
}
*/

/////////////////////////////////////////////////////////////
//
//  LAYOUT DIRECTOR
//  THE LD ADJUSTS THE AMOUNT OF SCREEN HEIGHT GIVEN TO ANY PARTICULAR SECTION OF THE DATASPACE
//
/////////////////////////////////////////////////////////////

/* my code recommendation: REPLACEMENT — LayoutDirector without IIFE */

const LayoutDirector = {
  VALID_LAYOUTS: new Set(['overview', 'kpi', 'vessel']),
  TRANSITION_MS: 500,

  isTransitioning: false,
  currentLayout: null,

  init() {
    const dataSpace = document.getElementById('dataSpace');
    if (!dataSpace) {
      console.warn('LayoutDirector: #dataSpace not found');
      return;
    }
    this.dataSpace = dataSpace;
    this.currentLayout = dataSpace.dataset.layout || null;
  },

  requestLayout(mode, source = 'unknown') {
    if (!this.VALID_LAYOUTS.has(mode)) return;
    if (!this.dataSpace) return;

    if (this.isTransitioning) return;
    if (this.currentLayout === mode) return;

    this.isTransitioning = true;
    this.currentLayout = mode;
    this.dataSpace.dataset.layout = mode;

    setTimeout(() => {
      this.isTransitioning = false;
    }, this.TRANSITION_MS);
  }
};

window.LayoutDirector = LayoutDirector;

LayoutDirector.init();


window.Scene.set('overview');

////////////////////////////////////////////////////////////////////////////////
//
//  END LAYOUT DIRECTOR
//
////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////
//
//  ELEMENT DEFINITIONS
//  ELEMENTS INCLUDED IN SCENE CHOREOGRAPHY NEED SPECIFIC INFORMATION TO BE DRAWN CORRECTLY
//
////////////////////////////////////////////////////////////////////////////////

/* my code recommendation: REPLACEMENT — focus.js */
/* kWh rotor: use T12 trend + SVG arrow */
async function dR_kWh() {
  const bucketId = 'ospChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="kwh"]');
  if (existing) return existing;

  
// const trend = await window.ensureT12Trend();
const trend = await charts.getT12Trend({});


  const kwhT = trend.series.kwh;

  return setupRotor({
    role: 'kwh',
    bucketId,
    labelText: 'kWh Provided',
    pillText: (val) => {
      const fmt = formatKwhCompact(val ?? 0);
      return fmt?.unit ? (unitFull(fmt.unit) + ' kWh') : '';
    },
    valueGetter: window.cruncher.getT12KwhTotal,

    // build + arrow (SVG concave sides; color via trend mapping)


/* my code recommendation: REPLACEMENT — focus.js */
/* dR_kWh digitsRenderer: render digits, draw arrow, toggle trend on click */
digitsRenderer: (speedEl, val) => {
  // Render compact kWh (three digits; may include tenths depending on magnitude)
  const fmt = formatKwhCompact(val ?? 0);
  buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);

  // Draw the arrow with direction/color from the T12 trend
  attachTrendArrow(speedEl, kwhT.dir, kwhT.color);

  // Precise click handler on the arrow (wrapper & SVG), capture phase
  const arrowWrap = speedEl.querySelector('.trendArrow');
  const arrowSvg  = speedEl.querySelector('.trendArrowSvg');

  const onArrow = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    handleTrendArrowClick('kwh');     // toggles the kWh Provided trend chart
  };

  //arrowWrap?.addEventListener('click', onArrow, { capture: true });
  //arrowSvg ?.addEventListener('click', onArrow, { capture: true });
},



    // roll the three stacks to target digits
    digitsRoller: (speedEl, val) => {
      const fmt = formatKwhCompact(val ?? 0);
      window.setRotorValue(speedEl, fmt.digitsOnly ?? '');
    },

    appearWhen: 'focus',
    hideWhen: 'blur',
    startHidden: true,
    syncReveal: 'transitionEnd',
    positions: { 'osp': 2, 'osp-impact': 5 }
  });
}

/* my code recommendation: REPLACEMENT — focus.js */
/* Usage Rate rotor: use T12 trend + SVG arrow */
async function dR_usage() {
  const bucketId = 'ospChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="usage"]');
  if (existing) return existing;

  
// const trend = await window.ensureT12Trend();
const trend = await charts.getT12Trend({});

  const useT = trend.series.usageRate; // 0..1.25 (rate)

  return setupRotor({
    role: 'usage',
    bucketId,
    labelText: 'Shore Power Usage',
    pillText: 'Usage Rate',
    valueGetter: window.cruncher.getT12UsageRatePercent,


/* my code recommendation: REPLACEMENT — focus.js */
/* dR_usage digitsRenderer: render digits, draw arrow, toggle trend on click */
digitsRenderer: (speedEl, val) => {
  // Render 2 integer digits + tenths
  const fmt = formatPercentCompact(val ?? 0);
  buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);

  // Draw the arrow with direction/color from the T12 trend
  attachTrendArrow(speedEl, useT.dir, useT.color);

  // Precise click handler on the arrow (wrapper & SVG), capture phase
  const arrowWrap = speedEl.querySelector('.trendArrow');
  const arrowSvg  = speedEl.querySelector('.trendArrowSvg');

  const onArrow = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    handleTrendArrowClick('usage');   // toggles the Usage Rate trend chart
  };

  //arrowWrap?.addEventListener('click', onArrow, { capture: true });
  //arrowSvg ?.addEventListener('click', onArrow, { capture: true });
},



    // roll the three stacks to target digits
    digitsRoller: (speedEl, val) => {
      const fmt = formatPercentCompact(val ?? 0);
      window.setRotorValue(speedEl, fmt.digitsOnly ?? '');
    },

    appearWhen: 'focus',
    hideWhen: 'blur',
    startHidden: true,
    syncReveal: 'transitionEnd',
    positions: { 'osp': 4, 'osp-usage': 2 }
  });
}


/* my code recommendation: */
// Connections count rotor (T12), 3-digit, no fractional — RIGHT bucket
async function dR_connections() {
  const bucketId = 'ospChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="connections"]');
  if (existing) return existing;

  /* my code recommendation: */
  const { t12ConnectionsCount } = await window.fillBuckets();
  const connCount = t12ConnectionsCount;


/* my code recommendation: REPLACEMENT — focus.js */
/* Replace ONLY the setupRotor(...) block inside dR_connections(...) */

// const trend = await window.ensureT12Trend();
const trend = await charts.getT12Trend({});

const connT = trend.series.connections;

return setupRotor({
  role: 'connections',
  bucketId,
  labelText: 'Connections',
  pillText: 'Connections',
  valueGetter: window.cruncher.getT12ConnectionCount,



/* my code recommendation: REPLACEMENT — focus.js */
/* dR_connections digitsRenderer: render digits, draw arrow, toggle trend on click */
digitsRenderer: (speedEl, val) => {
  // Render 3 fixed digits (no fractional)
  const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
  buildFixed3Odometer(speedEl, s, -1);

  // Draw the arrow with direction/color from the T12 trend
  attachTrendArrow(speedEl, connT.dir, connT.color);

  // Precise click handler on the arrow (wrapper & SVG), capture phase
  const arrowWrap = speedEl.querySelector('.trendArrow');
  const arrowSvg  = speedEl.querySelector('.trendArrowSvg');



const onArrow = (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();

  const rightBucket = document.getElementById('ospChartContainer');
  const isRightFocused = !!rightBucket && rightBucket.classList.contains('focused');

  if (!isRightFocused) {
    // Ignore until the KPI bucket is focused
    return;
  }

  // Proceed: toggle the Connections trend chart
  handleTrendArrowClick('connections');
};


  //arrowWrap?.addEventListener('click', onArrow, { capture: true });
  //arrowSvg ?.addEventListener('click', onArrow, { capture: true });
},


  digitsRoller: (speedEl, val) => {
    const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
    window.setRotorValue(speedEl, s);
  },
  appearWhen: 'always',
  hideWhen: 'never',
  startHidden: false, syncReveal: 'transitionEnd',
  
positions: {
  "": 1,
  "osp": 5,
  "osp-usage": 5,
  "osp-impact": 5
}

});


}


/* my code recommendation: */
// Ship calls count rotor (T12), 3-digit, no fractional — LEFT bucket
async function dR_calls() {
  const bucketId = 'callsChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="calls"]');
  if (existing) return existing;

  /* my code recommendation: */
  const { t12Calls } = await window.fillBuckets(); // arrival ∈ T12
  const callCount = t12Calls.length;

const trend = await charts.getT12Trend({});

const callsT = trend.series.calls;

return setupRotor({
  role: 'calls',
  bucketId,
  labelText: 'Ship Calls (T12)',
  pillText: 'Ship Calls',
  valueGetter: window.cruncher.getT12CallCount,

  digitsRenderer: (speedEl, val) => {
    const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
    buildFixed3Odometer(speedEl, s, -1);
    attachTrendArrow(speedEl, callsT.dir, callsT.color);
  },
  digitsRoller: (speedEl, val) => {
    const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
    window.setRotorValue(speedEl, s);
  },
  appearWhen: 'always',
  hideWhen: 'never',
  startHidden: false, syncReveal: 'transitionEnd',
  positions: { 0: 1, 1: 1, 2: 1 }
});

}



////////////////////////////////////////////////////////////////////////////////
//
//  END ELEMENT DEFINITIONS
//
////////////////////////////////////////////////////////////////////////////////



function setupRotor({
  // identity / placement
  role,                      // e.g., 'kwh'
  bucketId,                  // e.g., 'ospChartContainer'
  id,                        // optional element id; default: 'rotor-' + role
  adoptSelector,             // optional: adopt an existing element instead of creating a new one

  // content
  labelText,                 // e.g., 'kWh Provided'
  valueGetter,               // async () => number; supplies odometer value

 // STANDARD OPTIONS (no role-specific logic inside setup):
  pillText,                         // string or (value) => string
  digitsRenderer,                   // (speedEl, value) => void
  digitsRoller,                     // (speedEl, value) => void


  appearWhen,
  appearAt,
  moveAfterAppearTo,
  positions = null,
  scales = { 1: 1.8, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.8 },
  hideWhen,
  hideTo,
  startHidden = true,        // start hidden until rule is met

  // timing
  syncReveal = 'instant'     // 'instant' | 'transitionEnd' (wait for bucket focus transition)
}) {

// Wait for bucket's transition and one extra frame so geometry is current
async function afterGeometrySettles() {
  // If caller asked to sync with transitionEnd, await it
  if (syncReveal === 'transitionEnd') {
    await waitForTransitionEndOnce(bucket);
  }
  // Then give the browser one more paint to update clientWidth/clientHeight
  await new Promise(r => requestAnimationFrame(() => r()));
}

  // resolve bucket
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  // create or adopt rotor element
const rotorEl = adoptSelector
  ? RotorFactory.adopt(bucket, adoptSelector, role, appearAt)
  : RotorFactory.create(bucket, { role, id: id ?? `rotor-${role}` }, appearAt);

if (!rotorEl) return null;


/* my code recommendation: REPLACEMENT — focus.js */
/* Harden renderer: if digitsRenderer throws, fall back to odometer */
function buildContent(el, value) {
  el.innerHTML = '';
  const speed = document.createElement('div');
  speed.className = 'speedRead';
  speed.id = `rotor-${role}-value`;

  const label = document.createElement('div');
  label.className = 'baseLabel';
  label.textContent = labelText ?? '';

  el.appendChild(speed);
  el.appendChild(label);

  const v = Number(value ?? 0);

  if (typeof digitsRenderer === 'function') {
    try {
      digitsRenderer(speed, v);
    } catch (err) {
      console.error(`digitsRenderer(${role}) failed:`, err);
      // Safe fallback: plain odometer
      window.Helpers.initOdometer(speed, Math.round(v));
      window.Helpers.rollOdometer(speed, Math.round(v));
    }
  } else {
    window.Helpers.initOdometer(speed, Math.round(v));
    window.Helpers.rollOdometer(speed, Math.round(v));
  }

  // Attach pill using provided pillText (string or function)
  const pill = typeof pillText === 'function' ? pillText(v) : pillText;
  attachRotorPill(speed, pill);
}



/* my code recommendation: */


// INSERT HERE 👉 read canonical (maps left/right* → calls/osp*)
function getFocusLevel(bucket) {
  return readLayoutCanonical(bucket);
}



  /* my code recommendation: */
  function applyScaleForProbe(humanPoint) {
    const scale = (scales && scales[humanPoint]) ?? null;
    if (scale != null) RotorFactory.scale(rotorEl, scale);  // sets --rotor-scale inline
  }



  /* my code recommendation: */
  // REPLACEMENT — resolve probe by *layout name* (no numeric scenes)
  function resolveProbeForLevel(layoutName) {
    // INSERT HERE 👉 positions is now an object keyed by descriptors: { 'right': 4, 'right-usage': 2, ... }
    if (!positions || Array.isArray(positions)) return null; // numeric maps no longer supported
    return positions[layoutName] ?? null;
  }

  /* my code recommendation: */
  // REPLACEMENT — position rotor using descriptor layout, then scale
  async function setToLevelPositionAsync(layoutName) {
    const human = resolveProbeForLevel(layoutName);
    if (human == null) return;
    await afterGeometrySettles();
    RotorFactory.toProbe(bucket, rotorEl, Math.max(0, Math.min(4, (human - 1) || 0)));
    applyScaleForProbe(human);
    rotorEl.dataset.probe = String(human);
    positionProbeDots(bucket);
  }




  // load the value once (initial build only)
  (async () => {
    try {
      const val = await Promise.resolve().then(valueGetter);
      buildContent(rotorEl, val);
    } catch (e) {
      console.error(`setupRotor(${role}) failed to populate:`, e);
      buildContent(rotorEl, 0);
    }
  })();

  // helper: human point → index
  const toIdx = (human) => Math.max(0, Math.min(4, (human ?? 1) - 1));

  // initial placement
  
  if (startHidden) {
    rotorEl.classList.add('is-hidden'); // CSS controls opacity/pointer-events
  }

  // visibility predicate
  const appearPredicate = (b) => {
    if (typeof appearWhen === 'function') return !!appearWhen(b);
    if (appearWhen === 'always') return true;
    if (appearWhen === 'focus') return b.classList.contains('focused');
    return false;
  };

  // hide rule
  const shouldHide = (b) => {
    if (hideWhen === 'never') return false;
    return !b.classList.contains('focused'); // default: blur
  };

  

  // Initial spawn: prefer positions[0] if provided; else appearAt
  const initialLevel = 0;
  const initialHuman = resolveProbeForLevel(initialLevel) ?? appearAt;
  RotorFactory.toProbe(bucket, rotorEl, Math.max(0, Math.min(4, (initialHuman - 1) || 0)));


  /* my code recommendation: */
  applyScaleForProbe(initialHuman);
rotorEl.dataset.probe = String(initialHuman);



/* my code recommendation: REPLACEMENT — focus.js */
/* Harden roller: if digitsRoller throws, fall back to plain roll */
async function revealAndMove() {
  if (syncReveal === 'transitionEnd') {
    await waitForTransitionEndOnce(bucket);
  }
  rotorEl.classList.remove('is-hidden');

  // One frame so the fade/roll overlap cleanly
  await new Promise(r => requestAnimationFrame(() => r()));

  const s = rotorEl.querySelector('.speedRead');
  if (s) {
    try {
      const v = await Promise.resolve().then(valueGetter);
      if (typeof digitsRoller === 'function') {
        digitsRoller(s, Number(v ?? 0));
      } else {
        window.Helpers.rollOdometer(s, Math.round(Number(v ?? 0)));
      }
    } catch (err) {
      console.error(`digitsRoller(${role}) failed:`, err);
      // Minimal fallback if getter/roller fails
      window.Helpers.rollOdometer(s, 0);
    }
  }

  positionProbeDots(bucket);
  // (no movement on reveal; we already spawn at appearAt)
}





// hide & reset
function hideAndReset() {
  rotorEl.classList.add('is-hidden');

  // Reset digit stacks to "000" so next reveal rolls from zero
  const s = rotorEl.querySelector('.speedRead');
  if (s) window.setRotorValue(s, '000');
}


/* my code recommendation: */

  /* my code recommendation: */
  // REPLACEMENT — observe class + data-layout (no data-focus)
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type !== 'attributes') continue;
      if (m.attributeName !== 'class' && m.attributeName !== 'data-layout') continue;
      const layout = getFocusLevel(bucket); // descriptor string
      // INSERT HERE 👉 move rotor for this layout after geometry settles
      void setToLevelPositionAsync(layout);
      if (appearPredicate(bucket)) {
        void revealAndMove();
      } else if (shouldHide(bucket)) {
        hideAndReset();
      }
    }
  });
  obs.observe(bucket, { attributes: true, attributeFilter: ['class','data-layout'] });



/* my code recommendation: */
// In case page loads with focus pre-set
void setToLevelPositionAsync(getFocusLevel(bucket));


  // in case the page loads with bucket already focused
  if (appearPredicate(bucket)) void revealAndMove();

  return rotorEl;
}  // ← CLOSES setupRotor PROPERLY


// INSERT HERE 👉 batch digit transforms to one RAF for smoother updates
window.setRotorValue = function (speedReadEl, value) {
  const s = String(value);
  const stacks = speedReadEl.querySelectorAll('.digit .stack');
  const pad = s.padStart(stacks.length, '0');

  // Queue a single-frame batch of DOM writes
  window.TickBatch.queue(function () {
    for (let i = 0; i < stacks.length; i++) {
      const stack = stacks[i];
      const d = Number(pad[i]);
      // Guard against NaN and missing nodes
      if (!stack || Number.isNaN(d)) continue;
      stack.style.transform = `translateY(-${d}em)`;
    }
  });
};

function formatKwhCompact(n) {
  const abs = Math.max(0, Number(n) || 0);

  // 1) Determine magnitude group and unit
  let base = 1, unit = '';
  if (abs >= 1_000 && abs < 1_000_000) { base = 1_000; unit = 'k'; }
  else if (abs >= 1_000_000 && abs < 1_000_000_000) { base = 1_000_000; unit = 'M'; }
  else if (abs >= 1_000_000_000) { base = 1_000_000_000; unit = 'B'; }

  // 2) Scale to the group and pick exactly three digits
  const scaled = abs / base;                // e.g., 207.89 (k), 1.37 (M), 13.478 (M)
  const i = Math.floor(scaled);
  const frac = scaled - i;

  if (scaled >= 100) {
    // Has hundreds → show hundreds, tens, ones (no fractional)
    const hundreds = Math.floor(i / 100) % 10;
    const tens     = Math.floor(i / 10)  % 10;
    const ones     = i % 10;
    return {
      digitsOnly: '' + hundreds + tens + ones,  // e.g., "207"
      dotIndex: -1,                              // no fractional digit
      unit,
      fracDigits: 0
    };
  } else {
    // No hundreds → show tens, ones, tenths (last digit is fractional)
    const tens   = Math.floor(i / 10) % 10;     // keep leading 0 if needed
    const ones   = i % 10;
    const tenths = Math.floor(frac * 10) % 10;
    return {
      digitsOnly: '' + tens + ones + tenths,    // e.g., "013", "134"
      dotIndex: 2,                               // fractional starts at index 2 (third digit)
      unit,
      fracDigits: 1
    };
  }
}


function formatPercentCompact(n) {
  const v = Math.max(0, Math.min(125, Number(n) || 0)); // clamp 0..125
  const i = Math.floor(v);
  const frac = v - i;
  const tens   = Math.floor(i / 10) % 10;
  const ones   = i % 10;
  const tenths = Math.floor(frac * 10) % 10;            // always present (0..9)
  return { digitsOnly: '' + tens + ones + tenths, dotIndex: 2 };
}

function unitFull(u) {
  switch (u) {
    case 'k': return 'Thousand';
    case 'M': return 'Million';
    case 'B': return 'Billion';
    default:  return '';
  }
}

function buildFixed3Odometer(speedEl, digits3, dotIndex = -1) {
  if (!speedEl) return;

  // Clear and prepare container
  speedEl.innerHTML = '';

  // Helper: one rolling digit with 0..9 stack
  const makeDigit = () => {
    const d = document.createElement('span');
    d.className = 'digit';
    const stack = document.createElement('span');
    stack.className = 'stack';
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.textContent = String(i);
      stack.appendChild(s);
    }
    d.appendChild(stack);
    return d;
  };

  // Ensure exactly 3 characters; pad left with 0 if shorter
  const s = String(digits3 ?? '').padStart(3, '0');
  const chars = s.split('');

  // Create .int wrapper so a pill can be centered on non-fractional digits
  const intWrap = document.createElement('span');
  intWrap.className = 'int';
  speedEl.appendChild(intWrap);


  // Build three digit stacks
  for (let i = 0; i < 3; i++) {
    const d = makeDigit();
    // Tag fractional digits (>= dotIndex) if any
    if (dotIndex >= 0 && i >= dotIndex) d.classList.add('is-frac');
    (dotIndex >= 0 && i >= dotIndex ? speedEl : intWrap).appendChild(d);
  }

  window.setRotorValue(speedEl, '000');
}

function buildCompactOdometer(speedEl, fmt) {
  if (!speedEl || !fmt) return;
  speedEl.innerHTML = '';

  // helper: one rolling digit with 0..9 stack
  const makeDigit = () => {
    const d = document.createElement('span');
    d.className = 'digit';
    const stack = document.createElement('span');
    stack.className = 'stack';
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.textContent = String(i);
      stack.appendChild(s);
    }
    d.appendChild(stack);
    return d;
  };

  const digits = String(fmt.digitsOnly || '').split(''); // e.g., "137"
  const hasFrac = typeof fmt.dotIndex === 'number' && fmt.dotIndex >= 0;
  const intLen = hasFrac ? fmt.dotIndex : digits.length;


// Create a wrapper for the integer digits so we can center the pill on them
const intWrap = document.createElement('span');
intWrap.className = 'int';
speedEl.appendChild(intWrap);

// Build digits: integers go in .int; fractional digits follow in the main container
for (let i = 0; i < digits.length; i++) {
  const d = makeDigit();
  if (hasFrac && i >= intLen) d.classList.add('is-frac'); // mark decimal part
  (i < intLen ? intWrap : speedEl).appendChild(d);
}

/* my code recommendation: */
// Add the spelled-out magnitude pill (hide if < 1,000 => unit '')
if (fmt.unit) {
  const tag = document.createElement('span');
  tag.className = 'magnitudeTag';
  tag.textContent = unitFull(fmt.unit);  // thousand / million / billion
  intWrap.appendChild(tag);              // centered on integer digits
}

  // roll stacks to the target number
  window.setRotorValue(speedEl, '000');
}

function attachRotorPill(speedEl, pillText) {
  if (!speedEl || !pillText) return;

  // Create or reuse the pill directly under .speedRead (full-width anchor)
  let tag = speedEl.querySelector('.magnitudeTag');
  if (!tag) {
    tag = document.createElement('span');
    tag.className = 'magnitudeTag';
    speedEl.appendChild(tag);
  }
  tag.textContent = String(pillText);
}

function attachTrendArrow(speedEl, dir, color) {
  if (!speedEl) return;

  // host element (above digits)
  let wrap = speedEl.querySelector('.trendArrow');
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.className = 'trendArrow'; // positioned by CSS
    speedEl.appendChild(wrap);
  }

  // svg element (reused if present)
  let svg = wrap.querySelector('svg.trendArrowSvg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

svg.setAttribute('class', 'trendArrowSvg');
svg.setAttribute('viewBox', '0 0 100 30');             // ↓ half-height box
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
svg.setAttribute('aria-hidden', 'true');

const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('class', 'arrow-shape');


    /* Concave-sided UP arrow shape:
       - Tip at (50,0)
       - Side curves bow inward using cubic Beziers
       - Base is a gentle arc (quadratic) */


/* my code recommendation: REPLACEMENT — focus.js */
/* Concave-sided UP arrow with a straight horizontal base */


path.setAttribute(
  'd',
  'M50,0 ' +                  // tip
  'A 70 70 0 0 0 88,30 ' +    // right side arc (bows inward toward center)
  'L 12,30 ' +                // base: perfectly horizontal
  'A 70 70 0 0 0 50,0 Z'      // left side arc back to tip
);

    svg.appendChild(path);
    wrap.appendChild(svg);
  }

  // orientation
  svg.classList.toggle('is-down', dir === 'down');
  svg.classList.toggle('is-up',   dir !== 'down'); // 'up' or 'flat' treated as up orientation

  // color via CSS variable (no inline fill)
  speedEl.style.setProperty('--trend-color', String(color ?? '#2b4d7d'));
};

async function handleTrendArrowClick(role) {
//4th insertion

window.emitIntent('TOGGLE_T12_TREND', { role, vessel: window.activeVesselName ?? null });
window.onToggleTrend({ role, vessel: window.activeVesselName ?? null });

//end 4th insertion


  const leftBucket  = document.getElementById('callsChartContainer');
  const rightBucket = document.getElementById('ospChartContainer');
  const hostBucket  = leftBucket ?? rightBucket;
  if (!hostBucket) return;

  
  /* my code recommendation: INSERTION — focus.js */
  /* Instant reveal hook: cancel any pending delayed reveal and show PowerCanvas + Table now */
  if (window.PCReveal && window.PCReveal.timer) { clearTimeout(window.PCReveal.timer); window.PCReveal.timer = null; }
  const leftForAnchor = document.getElementById('callsChartContainer') || hostBucket;
  const resultNow = pcRender({ type: 'table' }, leftForAnchor); // ensures table is present immediately
  const canvasNow = resultNow && resultNow.canvas ? resultNow.canvas : document.getElementById('powerCanvas');
  if (canvasNow) {
    const right = document.getElementById('ospChartContainer');
    const childH = Math.round(((right && right.clientHeight) || leftForAnchor.clientHeight) * 0.4);
    canvasNow.style.setProperty('--pc-child-h', String(childH) + 'px');
  }

  // (continue with existing logic below)


  // Ensure PowerCanvas exists; do NOT clear existing content
  const { canvas, contentHost } = pcRender({ type: 'chart' }, hostBucket);

  // Give children a consistent height (one third of right bucket height)
  const childH = Math.round((rightBucket?.clientHeight ?? hostBucket.clientHeight) *0.4);
  canvas.style.setProperty('--pc-child-h', `${childH}px`);

  // Find existing trend host (top slot) if any
  let trendHost = contentHost.querySelector('.pc-trend');

  // Determine the desired state (role + vessel)
  const vessel = window.activeVesselName ?? null;

// INSERT HERE 👉 set layout by role (no numeric scenes)
const rightBucketEl = document.getElementById('ospChartContainer');



if (rightBucketEl && rightBucketEl.classList.contains('focused')) {
  if (role === 'usage')       window.Scene.set('osp-usage');
  else if (role === 'kwh')    window.Scene.set('osp-impact');
  else if (role === 'connections') window.Scene.set('osp'); // no separate "connections" layout
  else                         window.Scene.set('osp');
}




  const desiredRole   = role;
  const desiredVessel = vessel ?? '';
refreshOpenTrendFor(window.activeVesselName ?? null);
  // If a trend is already showing and matches this role+vessel → TOGGLE OFF

/* my code recommendation: REPLACEMENT — focus.js */
/* Toggle OFF: fade the chart and (if it will be empty) the canvas, then remove both */
if (trendHost && trendHost.dataset.role === role && trendHost.dataset.vessel === (window.activeVesselName ?? '')) {
  const canvas = document.getElementById('powerCanvas');
  const willBeEmpty =
    !contentHost.querySelector('.pc-chart') &&
    !contentHost.querySelector('.pc-table-host .pc-table'); // only trend is present

  // 1) Start chart fade (always)
  trendHost.classList.add('is-fading');

  // 2) If canvas will be empty after this removal, start canvas fade too
  if (canvas && willBeEmpty) {
    canvas.classList.add('is-fading');     // drive opacity → 0
    canvas.classList.remove('is-visible'); // ensure we're not holding it at 1
  }

  // Force a reflow so transitions actually run before we remove anything
  void trendHost.offsetWidth;

  // 3) When the chart fade completes, remove the chart
  const onChartFadeEnd = () => {
    trendHost.remove();

    // 4) If canvas was set to fade (empty after removal), remove it after its fade completes
    if (canvas && willBeEmpty) {
      const onCanvasFadeEnd = () => canvas.remove();
      canvas.addEventListener('transitionend', onCanvasFadeEnd, { once: true });

      // Safety timeout: remove even if transitionend doesn’t fire
      setTimeout(onCanvasFadeEnd, 400);
    }
  };

  trendHost.addEventListener('transitionend', onChartFadeEnd, { once: true });

  // Safety timeout for the chart as well
  setTimeout(onChartFadeEnd, 400);

  return;
}


  // Otherwise ensure there is a trend host and draw/refresh for the new role
  if (!trendHost) {
    trendHost = document.createElement('div');
    trendHost.className = 'pc-trend';
    contentHost.insertBefore(trendHost, contentHost.firstChild); // always top
  }

  // Track what's being displayed for robust toggling next time
  trendHost.dataset.role   = desiredRole;
  trendHost.dataset.vessel = desiredVessel;

  // Map rotor role → series key + legend label
  const cfg = {
    usage:       { key: 'usageRate',   label: 'Usage Rate' },
    connections: { key: 'connections', label: 'Connections' },
    kwh:         { key: 'kwh',         label: 'kWh Provided' }
  }[desiredRole];
  if (!cfg) return;

  // Draw chart for this role (respect vessel filter)

  await charts.getT12Trend({ vesselName: desiredVessel }); // ensure cache is ready
  charts.drawT12Trend(trendHost, {
    seriesKey:   cfg.key,
    legendLabel: cfg.label,
    vesselName:  desiredVessel
  });

  // Refresh canvas sizing/placement after content changes
  pcSizeFor(canvas, { type: 'chart' }, hostBucket);
  pcPlace(canvas, hostBucket);
}

document.addEventListener('click', (e) => {
  console.log("you poked my heart 3");
  const kwhEl = e.target.closest('.baseStats[data-role="kwh"]');
  if (!kwhEl) {console.log('you missed the kwh rotor!'); return};
  const bucket = kwhEl.closest('.kpiBucket');
  if (!bucket) return;
  
  if (bucket.classList.contains('focused')) {
    e.stopPropagation();         // avoid double-handling
    bucket.click();              // triggers the existing "unfocus + reset" behavior
    return;
  }

  // Otherwise, do nothing (no escalation to level 2).
  // Future: re-enable by setting bucket.dataset.focus = '2' when level-2 is supported.
});

////////////////////////////////////////////////////////////////////////////////
//
//  END ROTOR FACTORY
//
////////////////////////////////////////////////////////////////////////////////




////////////////////////////////////////////////////////////////////////////////
//
//  PROBES
//  FOR TESTING PURPOSES ONLY. PROBES INDICATE ANCHOR POINTS ON SCREEN
//
////////////////////////////////////////////////////////////////////////////////

// === CONFIG for KPI probe points ===
window.KPIProbeConfig = {
  innerRatio: 0.60,    // (2) inner circle diameter vs. bucket diameter; tweakable
  deltaDeg: 45,       // (3-4) +/- degrees around 6 o’clock; default 4 & 8 positions
  betweenFraction: 0.50, // (5) fraction from center toward the 6-point; tweakable
  sixDeg: 90          // 6 o’clock angle (0° = 3 o’clock, +CW with screen coords)
};

// Ensure we have exactly 5 dot elements per bucket
function ensureProbeDots(bucket) {
  const N = 5;
  const existing = bucket.querySelectorAll('.probe-dot');
  if (existing.length === N) return Array.from(existing);

  existing.forEach(d => d.remove());
  const dots = [];
  for (let i = 0; i < N; i++) {
    const dot = document.createElement('span');
    dot.className = 'probe-dot';
    bucket.appendChild(dot);
    dots.push(dot);
  }
  return dots;
}

// Compute the five points given the bucket's current size
function computeProbePositions(bucket) {
  const rimPx = parseFloat(getComputedStyle(bucket).getPropertyValue('--instrument-rim')) || 0;
  const bounds = bucket.getBoundingClientRect();
  const diameter = Math.min(bounds.width - rimPx * 2, bounds.height - rimPx * 2);
  const R = diameter / 2;

  // Center of the bucket (in its own coordinate space)
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;

  const cfg = window.KPIProbeConfig;
  const rInner = R * cfg.innerRatio;
  const toRad = d => (d * Math.PI) / 180;

  // (1) center
  const p1 = { x: cx, y: cy };

  // (2–4) three points on inner circle: 6 o’clock centered, +/- delta around it
  const a6 = toRad(cfg.sixDeg);
  const aBefore = toRad(cfg.sixDeg - cfg.deltaDeg);
  const aAfter  = toRad(cfg.sixDeg + cfg.deltaDeg);

  const p2 = { x: cx + rInner * Math.cos(aBefore), y: cy + rInner * Math.sin(aBefore) };
  const p3 = { x: cx + rInner * Math.cos(a6),      y: cy + rInner * Math.sin(a6)      }; // 6 o’clock
  const p4 = { x: cx + rInner * Math.cos(aAfter),  y: cy + rInner * Math.sin(aAfter)  };

  // (5) between center and the 6-point, fractional distance f (default 0.5)
  const f = cfg.betweenFraction;
  const p5 = { x: cx + (p3.x - cx) * f, y: cy + (p3.y - cy) * f };

  return [p1, p2, p3, p4, p5];
}

// Position (or re-position) the dots
function positionProbeDots(bucket) {
  const dots = ensureProbeDots(bucket);
  const pts = computeProbePositions(bucket);
  dots.forEach((dot, i) => {
    const { x, y } = pts[i];
    dot.style.left = `${x}px`;
    dot.style.top  = `${y}px`;
  });
}

////////////////////////////////////////////////////////////////////////////////
//
//  END PROBES
//
////////////////////////////////////////////////////////////////////////////////
