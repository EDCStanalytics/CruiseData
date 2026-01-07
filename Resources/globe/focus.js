document.addEventListener("DOMContentLoaded", () => {
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
  const [calls, connections] = await Promise.all([
        window.callsPromise,
        window.connectionsPromise
    ]);

  //now get the filter dates and use them to filter the data sets
  const { lastStart, lastEnd } = window.Helpers.getT24();
  
  const t12Calls = calls.filter(c => 
        window.Helpers.rangeCheck(c.arrival, lastStart, lastEnd));

  const t12Connections = connections.filter(c =>
        window.Helpers.rangeCheck(c.connect, lastStart, lastEnd));

  console.log(`Filtering for data between ${lastStart} and ${lastEnd}`)
    
  //sort the calls by arrival
  const sortedCalls = t12Calls
        .slice()
        .sort((a, b) => a.arrival - b.arrival)

  // Build the connection lookup map (id -> connection)
  const connById = new Map();
    t12Connections.forEach(c => { if (c.id != null) connById.set(c.id, c); });

  // Attach the matched connection onto each sorted call (or null)
  sortedCalls.forEach(c => { c.connection = connById.get(c.id) ?? null; });

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


/* my code recommendation: */
function updateFocusOffsetFor(bucket) {
  if (!bucket) return;
  const h = bucket.clientHeight;                     // height *after* focus
  const OFFSET_COEFF = .35;                            // reuse your coefficient
  const offsetY = Math.round(h * OFFSET_COEFF);
  document.documentElement.style.setProperty('--focus-offset-y', `${offsetY}px`);
}



// Minimal digit setter (uses existing .digit .stack markup + CSS transition)
window.setRotorValue = function (speedReadEl, value) {
  const s = String(value);
  const stacks = speedReadEl.querySelectorAll('.digit .stack');
  const pad = s.padStart(stacks.length, '0');
  stacks.forEach((stack, i) => {
    const d = Number(pad[i]);
    stack.style.transform = `translateY(-${d}em)`;
  });
};


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


/* my code recommendation: */
// Returns the number of connections in the T12 window
async function getConnCountT12() {
  const connections = await window.connectionsPromise;
  const { lastStart, lastEnd } = window.Helpers.getT24(); // your existing date window
  // Count any connection whose 'connect' OR 'disconnect' falls inside the window
  let count = 0;
  for (const c of connections) {
    const ts = c.connect ?? c.disconnect;
    if (ts && window.Helpers.rangeCheck(ts, lastStart, lastEnd)) count++;
  }
  return count;
}



window.radialCtx = new Map();

document.documentElement.style.setProperty('--focus-offset-y', '0px');


/* my code recommendation: */
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



//now we add the event listeners to the areas the user can focus on
    buckets.forEach(bucket => {
        bucket.addEventListener("click", async () => {
          
            const isAlreadyFocused = bucket.classList.contains("focused");

            // Reset all buckets and shipCards if clicked again
            if (isAlreadyFocused) {
                bucket.classList.remove('focused');
                const kpi = bucket.querySelector('.baseStats');
                void setRotorToProbe(bucket, 0);               
                await waitForTransitionEndOnce(kpi);
                updateFocusOffsetFor(bucket);
                
                buckets.forEach(b => {
                    b.classList.remove('focused', 'shrunk');
                    b.style.removeProperty('--bucket-h');
                    });
                shipCards.classList.remove("collapsed");
                removeRadial("leftRadialChart");
                removeRadial("rightRadialChart");
                document.getElementById('rightCentralChart')?.replaceChildren();
                document.getElementById('leftCentralChart')?.replaceChildren();

                return;
            }
            
            // Collapse shipCards
            shipCards.classList.add("collapsed");

            // Apply focused/shrunk classes
            buckets.forEach(b => {
                if (b === bucket) {
                    b.classList.add("focused");
                    b.classList.remove("shrunk");
                } else {
                    b.classList.remove("focused");
                    b.classList.add("shrunk");
                    
                }
            });

            if (bucket.id === "rightChartContainer") {
                //this is the RIGHT click branch
                removeRadial("leftRadialChart");
                await waitForTransitionEndOnce(bucket);


                
                updateFocusOffsetFor(bucket);
                positionProbeDots(bucket);
                
  
  

await dR_kWh(); 
await dR_usage();



                //window.drawPerformCentral('rightCentralChart');
                await window.radialCalendar('rightRadialChart');


                const { avg, n } = await window.getAvgConnQualityT12();
                await window.drawConnQualityGauge('rightRadialChart', avg, n);



                await window.drawPowerArcs('rightRadialChart');
                

            } else {
                //this is the LEFT click branch
                removeRadial("rightRadialChart");
                await waitForTransitionEndOnce(bucket);
                updateFocusOffsetFor(bucket);
                positionProbeDots(bucket);
                //drawRadialT12('leftRadialChart');

                
                await window.radialCalendar('leftRadialChart');
                await window.drawCallArcs('leftRadialChart');
            }

        });
    });

    


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

hit.append('title')
  .text(d => {
    const v = d.call;
    const conn = v.connection;
    const visit = `${fmtShortMD(v.arrival)}, ${fmtTime(v.arrival)} → ${fmtShortMD(v.departure)}, ${fmtTime(v.departure)}`;
    const connText = conn
      ? `\nShore Power: ${fmtShortMD(conn.connect)}, ${fmtTime(conn.connect)} → ${fmtShortMD(conn.disconnect)}, ${fmtTime(conn.disconnect)}\nConnection Duration: ${fmtDuration(conn.disconnect - conn.connect)}`
      : `\nShore Power: Did not connect`;
    return `${v.vessel ?? 'Unknown'}\nVisit: ${visit}${connText}`;
  });

/* my code recommendation: */
hit.on('click', function (event, d) {
  event.stopPropagation(); // prevent bucket toggle back to level 0

  // --- toggle powerCanvas (no styling in JS; CSS handles look) ---
  const bucket = document.getElementById('rightChartContainer');
  const existing = document.getElementById('powerCanvas');
  const callId = d?.call?.id ?? null;
  if (!bucket || callId == null) return;

if (existing && activeCallId === callId) {
  existing.classList.remove('is-visible'); // start fade-out
  setTimeout(() => existing.remove(), 400); // match CSS transition
}

  // Create the canvas positioned relative to the LEFT KPI bucket per earlier spec,
  // or change to right bucket if you want it anchored there.

  const leftBucket = document.getElementById('leftChartContainer');
  const hostBucket = leftBucket ?? bucket; // anchor left by default
  const canvas = existing ?? createPowerCanvas(hostBucket); // reuse if present
  if (!existing) document.body.appendChild(canvas);

  
// Trigger fade-in

requestAnimationFrame(() => {
  canvas.classList.add('is-visible');
  drawPowerCanvasChart(d.call.vessel);
});

// Pass correct info to updateRadialHighlights:
// - If the user clicked the SAME call again → sweep (pass nulls)
// - If the user clicked a DIFFERENT call → highlight selected + related
const isSameSelection = (activeCallId === callId);
updateRadialHighlights(
  isSameSelection ? null : callId,
  isSameSelection ? null : (d?.call?.vessel ?? null)
);

// Track selection state (null when sweeping)
activeCallId = isSameSelection ? null : callId;

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

    

const fmtDuration = (ms) => {
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
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



// === CONFIG for KPI probe points ===
window.KPIProbeConfig = {
  innerRatio: 0.6,    // (2) inner circle diameter vs. bucket diameter; tweakable
  deltaDeg: 50,       // (3-4) +/- degrees around 6 o’clock; default 4 & 8 positions
  betweenFraction: 0.25, // (5) fraction from center toward the 6-point; tweakable
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
// === Generic Rotor Setup (create/adopt + populate + show/hide + move) ===
// Human points: 1..5 (center, 4 o'clock, 6 o'clock, 8 o'clock, midpoint to 6)
// Depends on: RotorFactory, computeProbePositions(bucket), waitForTransitionEndOnce(el), window.Helpers.*

/* my code recommendation: */

/* my code recommendation: */
function setupRotor({
  // identity / placement
  role,                      // e.g., 'kwh'
  bucketId,                  // e.g., 'rightChartContainer'
  id,                        // optional element id; default: 'rotor-' + role
  adoptSelector,             // optional: adopt an existing element instead of creating a new one

  // content
  labelText,                 // e.g., 'kWh Provided'
  valueGetter,               // async () => number; supplies odometer value

  
 // STANDARD OPTIONS (no role-specific logic inside setup):
  pillText,                         // string or (value) => string
  digitsRenderer,                   // (speedEl, value) => void
  digitsRoller,                     // (speedEl, value) => void


  // visibility & movement policy (human numbering)
  /*
  appearWhen = 'focus',      // 'focus' | 'always' | ((bucket) => boolean)
  appearAt = 3,              // human point (default: 3 = inner-6)
  moveAfterAppearTo = null,  // optional secondary human point
  hideWhen = 'blur',         // 'blur' | 'never'
  hideTo = 1,                // human point for hiding (default: 1 = center)
  */
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

/* my code recommendation: */
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

  // Render digits using the provided renderer or fall back to generic odometer
  const v = Number(value ?? 0);
  if (typeof digitsRenderer === 'function') {
    digitsRenderer(speed, v);
  } else {
    window.Helpers.initOdometer(speed, Math.round(v));
    window.Helpers.rollOdometer(speed, Math.round(v));
  }

  // Attach pill using provided pillText (string or function)
  const pill =
    typeof pillText === 'function' ? pillText(v)
    : pillText;

  attachRotorPill(speed, pill);
}


/* my code recommendation: */
function getFocusLevel(bucket) {
  // 0 = load (default), 1 = bucket focused, 2 = detail view
  const lvAttr = bucket.dataset.focus;
  if (lvAttr === '2') return 2;
  return bucket.classList.contains('focused') ? 1 : 0;
}

  /* my code recommendation: */
  function applyScaleForProbe(humanPoint) {
    const scale = (scales && scales[humanPoint]) ?? null;
    if (scale != null) RotorFactory.scale(rotorEl, scale);  // sets --rotor-scale inline
  }


  function resolveProbeForLevel(level) {
    if (!positions) return null;
    if (Array.isArray(positions)) return positions[level] ?? null;
    return positions[level] ?? null;
  }


  async function setToLevelPositionAsync(level) {
    const human = resolveProbeForLevel(level);
    if (human == null) return;
    await afterGeometrySettles();                      // wait for final geometry
    RotorFactory.toProbe(bucket, rotorEl, Math.max(0, Math.min(4, (human - 1) || 0)));
    /* my code recommendation: */
    applyScaleForProbe(human);                         // scale by position
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


/* my code recommendation: */
async function revealAndMove() {
  if (syncReveal === 'transitionEnd') {
    await waitForTransitionEndOnce(bucket);
  }
  rotorEl.classList.remove('is-hidden');

  // Optional tiny delay (one frame) to overlap roll into fade cleanly
  await new Promise(r => requestAnimationFrame(() => r()));

  // Roll current value
  const s = rotorEl.querySelector('.speedRead');
  if (s) {
    const v = await Promise.resolve().then(valueGetter);
    if (typeof digitsRoller === 'function') {
      digitsRoller(s, Number(v ?? 0));
    } else {
      window.Helpers.rollOdometer(s, Math.round(Number(v ?? 0)));
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
const obs = new MutationObserver((muts) => {
  for (const m of muts) {
    if (m.type !== 'attributes') continue;
    if (m.attributeName !== 'class' && m.attributeName !== 'data-focus') continue;

    const level = getFocusLevel(bucket);

    // Always reposition to the declared position for this level,
    // but do it after the bucket's transition + one paint so geometry is current.
    void setToLevelPositionAsync(level);

    if (appearPredicate(bucket)) {
      // Reveal and re-roll digits after reposition
      void revealAndMove();
    } else if (shouldHide(bucket)) {
      // Hide and reset to "000" so next reveal rolls again
      hideAndReset();
    }
  }
});


obs.observe(bucket, { attributes: true, attributeFilter: ['class','data-focus'] });


/* my code recommendation: */
// In case page loads with focus pre-set
void setToLevelPositionAsync(getFocusLevel(bucket));


  // in case the page loads with bucket already focused
  if (appearPredicate(bucket)) void revealAndMove();

  return rotorEl;
}  // ← CLOSES setupRotor PROPERLY




/* my code recommendation: */
// Magnitude-driven compact formatter with exactly 3 displayed digits.
// Returns { digitsOnly, dotIndex, unit, fracDigits }.
// Groups: <1k (''), <1e6 ('k'), <1e9 ('M'), >=1e9 ('B').
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


/* my code recommendation: */
/**
 * Percent compact formatter: two integer digits + tenths (one fractional).
 * Input: n (e.g., 87 for 87%).
 * Returns: { digitsOnly: "875", dotIndex: 2, unit: "", fracDigits: 1 }
 *          where the third digit ("5") is tenths => tagged .is-frac by builder.
 */

function formatPercentCompact(n) {
  const v = Math.max(0, Math.min(125, Number(n) || 0)); // clamp 0..125
  const i = Math.floor(v);
  const frac = v - i;
  const tens   = Math.floor(i / 10) % 10;
  const ones   = i % 10;
  const tenths = Math.floor(frac * 10) % 10;            // always present (0..9)
  return { digitsOnly: '' + tens + ones + tenths, dotIndex: 2 };
}



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


  
/* my code recommendation: */
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


/* my code recommendation: */
/**
 * Build a fixed, 3-digit odometer.
 * - digits3: string with length==3, e.g., "875" or "207" (leading zeros OK)
 * - dotIndex: number in [0..2] for first fractional digit; -1 for none
 *      e.g., 2 => only the 3rd digit (index 2) is fractional
 */
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

  




  /* my code recommendation: */
  // Start at "000" so the reveal shows a rolling transition
  window.setRotorValue(speedEl, '000');

}





/* my code recommendation: */
/**
 * Ensures non-fractional digits are wrapped in .int, then appends a pill.
 * - speedEl: the .speedRead container inside the rotor
 * - pillText: string to render in the pill ('' or null => no pill)
 */
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



/* my code recommendation: */
async function dR_kWh() {
  const bucketId = 'rightChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;
  const existing = bucket.querySelector('.baseStats[data-role="kwh"]');
  if (existing) return existing;

  const kwhT12 = await getKwhT12Value();

  return setupRotor({
    role: 'kwh',
    bucketId,
    labelText: 'kWh Provided',
    valueGetter: () => kwhT12,

    pillText: (val) => {
      const fmt = formatKwhCompact(val ?? 0);
      return fmt?.unit ? (unitFull(fmt.unit) + ' kWh') : '';
    },
    digitsRenderer: (speedEl, val) => {
      const fmt = formatKwhCompact(val ?? 0);         // returns {digitsOnly, dotIndex}
      buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);
    },
    digitsRoller: (speedEl, val) => {
      const fmt = formatKwhCompact(val ?? 0);
      window.setRotorValue(speedEl, fmt.digitsOnly ?? '');
    },

    appearWhen: 'focus',
    hideWhen: 'blur',
    startHidden: true, syncReveal: 'transitionEnd',
    positions: { 1: 2, 2: 5 }
  });
}



async function dR_usage() {
  const bucketId = 'rightChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;
  const existing = bucket.querySelector('.baseStats[data-role="usage"]');
  if (existing) return existing;

  const { avg } = await getAvgConnQualityT12(); // 0..1.25

  return setupRotor({
    role: 'usage',
    bucketId,
    labelText: 'Shore Power Usage',
    pillText: 'Usage Rate',
    valueGetter: () => Math.max(0, avg) * 100,          // pass a float percent (e.g., 87.0)

    digitsRenderer: (speedEl, val) => {
      const fmt = formatPercentCompact(val ?? 0);
      buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);
    },
    digitsRoller: (speedEl, val) => {
      const fmt = formatPercentCompact(val ?? 0);
      window.setRotorValue(speedEl, fmt.digitsOnly ?? '');
    },

    appearWhen: 'focus',
    hideWhen: 'blur',
    startHidden: true, syncReveal: 'transitionEnd',
    positions: { 1: 5, 2: 2 }
  });
}

/* my code recommendation: */
// Connections count rotor (T12), 3-digit, no fractional — RIGHT bucket
async function dR_connections() {
  const bucketId = 'rightChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="connections"]');
  if (existing) return existing;

  /* my code recommendation: */
  const { t12ConnectionsCount } = await window.fillBuckets();
  const connCount = t12ConnectionsCount;

  return setupRotor({
    role: 'connections',
    bucketId,
    labelText: 'Connections',
    pillText: 'Connections',
    valueGetter: () => connCount,

    digitsRenderer: (speedEl, val) => {
      const n = Math.max(0, Math.floor(Number(val) || 0));
      const s = String(n).padStart(3, '0');
      buildFixed3Odometer(speedEl, s, -1);
    },
    digitsRoller: (speedEl, val) => {
      const n = Math.max(0, Math.floor(Number(val) || 0));
      const s = String(n).padStart(3, '0');
      window.setRotorValue(speedEl, s);
    },

    appearWhen: 'always',
    hideWhen: 'never',
    startHidden: false, syncReveal: 'transitionEnd',
    
/* my code recommendation: */
  positions: { 0: 1, 1: 4, 2: 4 } 

  });
}



/* my code recommendation: */
// Ship calls count rotor (T12), 3-digit, no fractional — LEFT bucket

/* my code recommendation: */
// Ship calls count rotor (T12), 3-digit, no fractional — LEFT bucket
async function dR_calls() {
  const bucketId = 'leftChartContainer';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="calls"]');
  if (existing) return existing;

  /* my code recommendation: */
  const { t12Calls } = await window.fillBuckets(); // arrival ∈ T12
  const callCount = t12Calls.length;

  return setupRotor({
    role: 'calls',
    bucketId,
    labelText: 'Ship Calls (T12)',
    pillText: 'Ship Calls',
    valueGetter: () => callCount,                 // function; factory requirement

    // Always 3-digit width, no fractional; start stacks at "000"
    digitsRenderer: (speedEl, val) => {
      const n = Math.max(0, Math.floor(Number(val) || 0));
      const s = String(n).padStart(3, '0');
      buildFixed3Odometer(speedEl, s, -1);        // dotIndex=-1 ⇒ no .is-frac
    },
    digitsRoller: (speedEl, val) => {
      const n = Math.max(0, Math.floor(Number(val) || 0));
      const s = String(n).padStart(3, '0');
      window.setRotorValue(speedEl, s);           // roll during fade
    },

    appearWhen: 'always',
    hideWhen: 'never',
    startHidden: false, syncReveal: 'transitionEnd',
    positions: { 0: 1, 1: 1, 2: 1 }
  });
}


/* my code recommendation: */
// When user clicks the kWh rotor, escalate to level-2 for the right bucket
document.addEventListener('click', (e) => {
  const kwhEl = e.target.closest('.baseStats[data-role="kwh"]');
  if (!kwhEl) return;
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


/* my code recommendation: */
// Track currently selected call
let activeCallId = null;

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

// Attach click handler to each call segment in the LEFT radial chart
document.querySelectorAll('#leftRadialChart g.power-item').forEach(item => {
  item.addEventListener('click', () => {
    const callId = item.__data__?.call?.id;
    const bucket = document.getElementById('leftChartContainer');
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


    // Replace any existing canvas
    if (existing) existing.remove();

    // Create new canvas
    const canvas = createPowerCanvas(bucket);
    document.body.appendChild(canvas);
    activeCallId = callId;
  });
});


/* my code recommendation: REPLACEMENT — focus.js (left bucket observer) */
const leftBucket = document.getElementById('leftChartContainer');
if (leftBucket) {
  const obs = new MutationObserver(() => {
    const rightBucket = document.getElementById('rightChartContainer');
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






/* my code recommendation: REPLACEMENT of the entire drawPowerCanvasChart function */
async function drawPowerCanvasChart(shipName) {
  const canvas = document.getElementById('powerCanvas');
  if (!canvas) return;

  canvas.innerHTML = '';

  // --- helpers (local; no external scorer dependency) ---
  const norm = s => String(s || '')
    .toLowerCase()
    .replace(/[\s\-]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
  const nameScore = (a, b) => (norm(a) === norm(b) ? 1 : 0);

  const toTOD = d => new Date(0, 0, 0, d.getHours(), d.getMinutes(), d.getSeconds(), 0);
  const clampTOD = dt => {
    const min = new Date(0,0,0,6,0);
    const max = new Date(0,0,0,18,0);
    const t = toTOD(dt);
    return t < min ? min : t > max ? max : t;
  };
  const isMultiDay = (start, end) => start.toDateString() !== end.toDateString();
  const fmtDuration = ms => {
    const min = Math.round(ms / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  // --- data: calls for T12 window + vessel info ---
  const { t12Calls } = await window.fillBuckets();
  const vesselInfo = window.getVesselInfo
    ? window.getVesselInfo(shipName)
    : { correctedName: shipName, cruiseLine: '' };
  console.debug('[powerCanvas] vesselInfo:', vesselInfo);

  const callsForShip = t12Calls.filter(c => nameScore(c.vessel, vesselInfo.correctedName) >= 0.75);

  // diagnostics
  console.log(
    `[powerCanvas] target ship: "${shipName}" → corrected: "${vesselInfo.correctedName}" (line: ${vesselInfo.cruiseLine})`
  );
  console.log(`[powerCanvas] calls matching this ship (score ≥ 0.75): ${callsForShip.length}`);

  if (!callsForShip.length) {
    canvas.textContent = `No data for ${shipName} (${vesselInfo.cruiseLine})`;
    return;
  }

  callsForShip.sort((a, b) => a.arrival - b.arrival);

  // --- layout ---
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const margin = { top: 60, right: 40, bottom: 60, left: 80 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.select(canvas)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // --- scales ---
  const x = d3.scaleBand()
    .domain(callsForShip.map(c => c.id))
    .range([0, innerW])
    .paddingInner(0.2);

  const y = d3.scaleTime()
    .domain([new Date(0,0,0,6,0), new Date(0,0,0,18,0)])
    .range([innerH, 0]);

  // --- axis ---
  /*
  g.append('g')
    .attr('class', 'y-axis')
    .call(
      d3.axisLeft(y)
        .ticks(d3.timeHour.every(2))
        .tickFormat(d3.timeFormat('%H:%M'))
    );
*/

const yAxis = d3.axisLeft(y)
  .ticks(d3.timeHour.every(2))
  .tickFormat(d3.timeFormat('%H:%M'))
  .tickSizeInner(0)   // prevent short tick stubs along the axis
  .tickSizeOuter(0);  // prevent the long end ticks at 6:00 and 18:00



// remove the axis baseline (domain path) so no vertical line appears
//yAxisG.select('.domain').remove();
const yAxisG = g.append('g')
  .attr('class', 'y-axis')
  .call(yAxis);
  

  //.selectAll('line')

  g.append('g')
  .attr('class', 'grid-lines')
  .call(
    d3.axisLeft(y)
      .ticks(d3.timeHour.every(2))
      .tickSize(-innerW) // extend ticks across plot width
      .tickFormat('')    // no labels for grid
  )


  // --- title (CSS styles .chart-title) ---
  svg.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .text('T12 Shore Power Usage Rates');

  // --- legend (measure without bbox) ---
  const legendText = `${vesselInfo.correctedName} (${vesselInfo.cruiseLine})`;
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
    : (legendText.length * 7); // conservative fallback
  const textHeight = 14; // align with CSS font-size for legend

  legendG.insert('rect', ':first-child')
    .attr('class', 'legend-pill')
    .attr('x', -(textWidth / 2) - 12)
    .attr('y', -(textHeight / 2) - 6)
    .attr('width', textWidth + 24)
    .attr('height', textHeight + 12);
    // rx/ry handled in CSS (no inline styling)

  // --- plot area (CSS styles .plot-area) ---
  g.append('rect')
    .attr('class', 'plot-area')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerW)
    .attr('height', innerH);

  

/* my code recommendation: REPLACEMENT — visits thinner, centered */
const visitWidth = x.bandwidth() * 0.45;            // 45% width for visit
const visitX = (id) => x(id) + (x.bandwidth() - visitWidth) / 2;

/* my code recommendation: REPLACEMENT — visits as lines using radial class .power-stay */
const centerX = id => x(id) + x.bandwidth() / 2;

/*
g.selectAll('line.visit')
  .data(callsForShip)
  .enter()
  .append('line')
  .attr('class', 'visit power-stay')  // add shared selector
  .attr('x1', d => centerX(d.id))
  .attr('x2', d => centerX(d.id))
  .attr('y1', d => {
    const startY = y(clampTOD(d.arrival));
    const endY = isMultiDay(d.arrival, d.departure) ? y.range()[0] : y(clampTOD(d.departure));
    return Math.min(startY, endY);
  })
  .attr('y2', d => {
    const startY = y(clampTOD(d.arrival));
    const endY = isMultiDay(d.arrival, d.departure) ? y.range()[0] : y(clampTOD(d.departure));
    return Math.max(startY, endY);
  })
  .append('title')
  .text(d => `${d.vessel} — Visit: ${fmtDuration(d.departure - d.arrival)}`);
*/



  // --- connections: draw from connect to disconnect with the same logic ---

/* my code recommendation: REPLACEMENT — connections drawn as lines with quality class */
const connCenterX = (id) => x(id) + x.bandwidth() / 2;

// Map connection value (0..1.25) to 5 bins: 0..4
function qualityBin(value) {
  const v = Math.max(0, Math.min(1.25, Number(value || 0)));
  if (v < 0.33) return 0;
  if (v < 0.66) return 1;
  if (v < 1.00) return 2;
  if (v < 1.25) return 3;
  return 4;
}


/* my code recommendation: REPLACEMENT — connections as thicker, centered rectangles overlaying visits */
const connWidth = x.bandwidth() * 0.70;             // 70% width for connection (thicker than visit)
const connX = (id) => x(id) + (x.bandwidth() - connWidth) / 2;

/* my code recommendation: REPLACEMENT — connections as lines using radial class .power-conn + quality */

/* my code recommendation: REPLACEMENT — connections (line) with shared selector + quality */
function binQuality(value) {
  const v = Math.max(0, Math.min(1.25, Number(value || 0)));
  if (v < 0.33) return 0;
  if (v < 0.66) return 1;
  if (v < 1.00) return 2;
  if (v < 1.25) return 3;
  return 4;
}

//const centerX = id => x(id) + x.bandwidth() / 2;

g.selectAll('line.conn')
  .data(callsForShip.filter(c => c.connection))
  .enter()
  .append('line')
  /* we originally added the class to try to color the connection lines in css
  .attr('class', d => {
    const stayMsRaw = d.departure - d.arrival;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));
    let connValue = 0;
    if (d.connection && stayMsAdj > 0) {
      const connMs = d.connection.disconnect - d.connection.connect;
      connValue = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
    }
    return `conn power-conn quality-${binQuality(connValue)}`; // add shared selector + quality
  })
  */
  .attr('x1', d => centerX(d.id))
  .attr('x2', d => centerX(d.id))
  .attr('y1', d => {
    const startY = y(clampTOD(d.connection.connect));
    const endY = isMultiDay(d.connection.connect, d.connection.disconnect) ? y.range()[0] : y(clampTOD(d.connection.disconnect));
    return Math.min(startY, endY);
  })
  .attr('y2', d => {
    const startY = y(clampTOD(d.connection.connect));
    const endY = isMultiDay(d.connection.connect, d.connection.disconnect) ? y.range()[0] : y(clampTOD(d.connection.disconnect));
    return Math.max(startY, endY);
  })
  .append('title')
  .text(d => `Shore Power: ${fmtDuration(d.connection.disconnect - d.connection.connect)}`);


/* my code recommendation: REPLACEMENT — group per call, shared selectors, wide hit rectangle */
//const centerX = id => x(id) + x.bandwidth() / 2;

// 1) One group per call (so :hover affects both bars via existing CSS)
const callGroups = g.selectAll('g.power-item')
  .data(callsForShip)
  .enter()
  .append('g')
  .attr('class', 'power-item')
  .attr('transform', d => `translate(${centerX(d.id)},0)`);

// 2) Visit line (arrival → departure) — uses .power-stay (shared with radial)
callGroups.append('line')
  .attr('class', 'power-stay')
  .attr('x1', 0).attr('x2', 0)


/* my code recommendation: REPLACEMENT — focus.js (drawPowerCanvasChart visit line y1/y2)
   Find the block that builds the visit line inside:
   callGroups.append('line').attr('class', 'power-stay')
   and REPLACE ONLY the two .attr('y1') and .attr('y2') lines with the following: */

.attr('y1', d => {
  const arrTOD = toTOD(d.arrival);
  const depClampedY = y(clampTOD(d.departure));
  const arrivedAfterWindow = arrTOD > new Date(0, 0, 0, 18, 0); // arrival after 6 PM

  if (isMultiDay(d.arrival, d.departure) && arrivedAfterWindow) {
    // Edge case: arrival after window — show departure-day portion (6 AM → departure)
    const startY = y.range()[0]; // 6 AM (bottom)
    const endY = depClampedY;    // departure time (clamped)
    return Math.min(startY, endY);
  }

  // Default: arrival-day portion — arrival (clamped) → top edge if multi-day, else departure
  const startY = y(clampTOD(d.arrival));
  const endY = isMultiDay(d.arrival, d.departure) ? y.range()[1] : depClampedY; // 6 PM (top) if multi-day
  return Math.min(startY, endY);
})
.attr('y2', d => {
  const arrTOD = toTOD(d.arrival);
  const depClampedY = y(clampTOD(d.departure));
  const arrivedAfterWindow = arrTOD > new Date(0, 0, 0, 18, 0); // arrival after 6 PM

  if (isMultiDay(d.arrival, d.departure) && arrivedAfterWindow) {
    // Edge case: arrival after window — show departure-day portion (6 AM → departure)
    const startY = y.range()[0]; // 6 AM (bottom)
    const endY = depClampedY;    // departure time (clamped)
    return Math.max(startY, endY);
  }

  // Default: arrival-day portion — arrival (clamped) → top edge if multi-day, else departure
  const startY = y(clampTOD(d.arrival));
  const endY = isMultiDay(d.arrival, d.departure) ? y.range()[1] : depClampedY; // 6 PM (top) if multi-day
  return Math.max(startY, endY);
})


  .append('title')
  .text(d => `${d.vessel} — Visit: ${fmtDuration(d.departure - d.arrival)}`);

// 3) Connection line (connect → disconnect) — uses .power-conn + quality-*
function binQuality(value) {
  const v = Math.max(0, Math.min(1.25, Number(value || 0)));
  if (v < 0.33) return 0;
  if (v < 0.66) return 1;
  if (v < 1.00) return 2;
  if (v < 1.25) return 3;
  return 4;
}


//////
/*
callGroups.filter(d => d.connection).append('line')
  .attr('class', d => {
    const stayMsRaw = d.departure - d.arrival;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));
    let connValue = 0;
    if (stayMsAdj > 0) {
      const connMs = d.connection.disconnect - d.connection.connect;
      connValue = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
    }
    return `conn power-conn quality-${binQuality(connValue)}`;
  })
  .attr('x1', 0).attr('x2', 0)
  .attr('y1', d => {
    const startY = y(clampTOD(d.connection.connect));
    const endY = isMultiDay(d.connection.connect, d.connection.disconnect)
      ? y.range()[0] : y(clampTOD(d.connection.disconnect));
    return Math.min(startY, endY);
  })
  .attr('y2', d => {
    const startY = y(clampTOD(d.connection.connect));
    const endY = isMultiDay(d.connection.connect, d.connection.disconnect)
      ? y.range()[0] : y(clampTOD(d.connection.disconnect));
    return Math.max(startY, endY);
  })
  .append('title')
  .text(d => `Shore Power: ${fmtDuration(d.connection.disconnect - d.connection.connect)}`);
*/

const connColor = window.buildConnColorScale(); // use the existing continuous color scale

callGroups.filter(d => d.connection).append('line')
  .attr('class', 'conn power-conn') // no quality-* class; CSS uses --conn-color
  .style('--conn-color', d => {
    const stayMsRaw = d.departure - d.arrival;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));
    let connValue = 0;
    if (stayMsAdj > 0) {
      const connMs = d.connection.disconnect - d.connection.connect;
      connValue = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
    }
    return connColor(connValue); // set per-visit color via CSS variable
  })
  .attr('x1', 0).attr('x2', 0)
  .attr('y1', d => {
  const startY = y(clampTOD(d.connection.connect));
  const endY = isMultiDay(d.connection.connect, d.connection.disconnect)
    ? y.range()[1] // extend to top edge for multi-day
    : y(clampTOD(d.connection.disconnect));
  return Math.min(startY, endY);
})
.attr('y2', d => {
  const startY = y(clampTOD(d.connection.connect));
  const endY = isMultiDay(d.connection.connect, d.connection.disconnect)
    ? y.range()[1]
    : y(clampTOD(d.connection.disconnect));
  return Math.max(startY, endY);
})

  .append('title')
  .text(d => `Shore Power: ${fmtDuration(d.connection.disconnect - d.connection.connect)}`);



// 4) Wide rectangular hit area — full column, centered on the line
const hitWidth = x.bandwidth();                 // half band on each side of the center line
callGroups.append('rect')
  .attr('class', 'power-hit')                   // duplicated class selector for hover behavior
  .attr('x', -hitWidth / 2)                     // center the rect on the line
  .attr('y', 0)
  .attr('width', hitWidth)
  .attr('height', innerH)
  .style('fill', 'transparent')
  .style('pointer-events', 'all')
  .append('title')
  .text(d => {
    const fmtMD = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fmtHM = (dt) => dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const visit = `${fmtMD(d.arrival)}, ${fmtHM(d.arrival)} → ${fmtMD(d.departure)}, ${fmtHM(d.departure)}`;
    const conn = d.connection;
    const connText = conn
      ? `\nShore Power: ${fmtMD(conn.connect)}, ${fmtHM(conn.connect)} → ${fmtMD(conn.disconnect)}, ${fmtHM(conn.disconnect)}\nConnection Duration: ${fmtDuration(conn.disconnect - conn.connect)}`
      : `\nShore Power: Did not connect`;
    return `${d.vessel}\nVisit: ${visit}${connText}`;
  });

}


function updateRadialHighlights(selectedCallId = null, selectedVessel = null) {
  // 1) Clear any existing highlight classes on both radial charts
  const items = document.querySelectorAll('#rightRadialChart g.power-item, #leftRadialChart g.power-item');
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

