document.addEventListener("DOMContentLoaded", () => {
    const buckets = document.querySelectorAll(".kpiBucket");
    const shipCards = document.getElementById("cardSpace");
//

const root = document.documentElement;
const probeBucket = document.querySelector('.kpiBucket');
if (probeBucket) {
    const h = probeBucket.clientHeight;      // height of a bucket    const h = probeBucket.clientHeight;      // height of a bucket in normal state
    const OFFSET_COEFF = 2;               // 40% of bucket height (adjust if needed)
    const offsetY = Math.round(h * OFFSET_COEFF);
    root.style.setProperty('--focus-offset-y', `${offsetY}px`);
}

    //


    buckets.forEach(bucket => {
        bucket.addEventListener("click", async () => {
            const isAlreadyFocused = bucket.classList.contains("focused");

            // Reset all buckets and shipCards if clicked again
            if (isAlreadyFocused) {
                bucket.classList.remove('focused');
                const kpi = bucket.querySelector('.baseStats');               
                await waitForTransitionEndOnce(kpi)
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
                removeRadial("leftRadialChart");
                await waitForTransitionEndOnce(bucket);
                window.drawPerformCentral('rightCentralChart');
            } else {
                removeRadial("rightRadialChart");
                await waitForTransitionEndOnce(bucket);
                drawRadialT12('leftRadialChart');
            }

        });
    });
});


//this function generates a 12 month axis series for all of our time related charts
const get12Labels = (now = new Date()) => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const startYear = now.getFullYear() -1;
    const startMonth = now.getMonth();

    const monthLabels = [];
    let y = startYear;
    let m = startMonth;

    for (let i = 0; i < 12; i++) {
        monthLabels.push(`${monthNames[m]} ${y - 2000}`);
        m++;
        if (m===12) {m = 0, y++;;}
    }
    return monthLabels
}

const fmtShortMD = d =>
    d ? d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '';

const drawRadialT12 = async (containerID) => {
    const container = document.getElementById(containerID);
    if (!container) return;

    const rimPx = container ? parseFloat(getComputedStyle(container).getPropertyValue('--instrument-rim')) || 0 : 0;
    const calls = await window.callsPromise;
    console.log('calls loaded in radial: ', calls.length)
    console.log('we got an inner padding of ', rimPx)
    const segGap = 2;

    container.innerHTML = '';

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
    //const r0 = radius + stroke/2;

    const monthStart = (y, m) => {
        const d = new Date(y, m, 1);
        d.setHours(0,0,0,0);
        return d;
    }

    const monthEnd = (y, m) => {
        const d = new Date(y, m + 1, 1);
        d.setMilliseconds(-1);
        return d;
    }

    const monthBuckets = (now, calls) => {
        const firstY = now.getFullYear() - 1;
        const firstM = now.getMonth();
        const buckets = [];
        for (let i = 0; i < 12; i++) {
            const y = firstY + Math.floor((firstM + i) / 12);
            const m = (firstM + i) % 12;
            const start = monthStart(y, m);
            const end = monthEnd(y, m);
            const stamps = [];
            const callsInBucket = [];
                for (const c of calls) {
                    const t = c.arrival;
                        if (t && t >= start && t <= end) {
                            stamps.push(t);
                            callsInBucket.push(c);
                        }
                    }

            buckets.push({y, m, start, end, stamps, calls: callsInBucket});
        }
        return buckets;
    }

    const quintSplits = (start, end, stamps) => {
        const startMs = start.getTime();
        const endMs = end.getTime();
        const totalMs = (endMs - startMs + 1);
        const slotMs = totalMs / 5;

        const counts = [0,0,0,0,0];
        for (const t of stamps) {
            const ms = t.getTime();
            if (ms < startMs || ms > endMs) continue;
            const offset = ms - startMs;
            let q = Math.floor(offset / slotMs);
            if (q < 0) q = 0;
            if (q > 4) q = 4;
            counts[q]++;
        }
        return counts;
    }
    
    const quintGroups = (start, end, calls) => {
        const startMs = start.getTime();
        const endMs   = end.getTime();
        const totalMs = (endMs - startMs + 1);
        const slotMs  = totalMs / 5;
        const groups  = [[],[],[],[],[]];
            for (const c of calls) {
                const ms = c.arrival?.getTime?.() ?? NaN;
                    if (!Number.isFinite(ms) || ms < startMs || ms > endMs) continue;
                        let q = Math.floor((ms - startMs) / slotMs);
                            if (q < 0) q = 0; if (q > 4) q = 4;
                            groups[q].push(c);
                }
  // optional: sort each quintile by arrival time
        for (const g of groups) g.sort((a,b) => a.arrival - b.arrival);
        return groups;
    };


    

    const now = new Date();
    const buckets = monthBuckets(now, calls);
    const labels = get12Labels(now);
    const quintiles = buckets.map(b => quintSplits(b.start, b.end, b.stamps));
    const columns60 = [];
        for (let m1 = 0; m1 < 12; m1++) {
            for (let q1 = 0; q1 < 5; q1++) {
                columns60.push({m1, q1, count: quintiles[m1][q1]})
            }
        }

    const maxPower = columns60.reduce((m2, c2) => Math.max(m2, c2.count), 0);
    const segCount = Math.max(1,maxPower);
    const axisPad = Math.max(2, stroke);
    const rimPad = 1;
    console.log('max power count is: ', segCount);
    const rUnit = segCount > 0 ? (depth - axisPad - rimPad - ((segCount-1) * segGap)) / segCount : depth;
    
    depth / segCount; // one call = one radial slice
    

    const columns60Calls = [];
        for (let m1 = 0; m1 < 12; m1++) {
            const groups = quintGroups(buckets[m1].start, buckets[m1].end, buckets[m1].calls);
            for (let q1 = 0; q1 < 5; q1++) {
                const g = groups[q1];
                for (let idx = 0; idx < g.length; idx++) {
                    columns60Calls.push({ m1, q1, idx, call: g[idx] });
                }
            }
        }


    


    //for debugging purposes this lets you print out the table that will be graphed
    const qTable = labels.map((lbl, i) => ({
            month: lbl,
            q0: quintiles[i][0],
            q1: quintiles[i][1],
            q2: quintiles[i][2],
            q3: quintiles[i][3],
            q4: quintiles[i][4],
            total: buckets[i].stamps.length
    }))

    console.table(qTable);
    window._radialQuintiles = quintiles;
    window._radialColumns60 = columns60;
    window._radialBuckets = buckets;
    window._radialMaxPower = segCount;

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

    const r = d3.scaleLinear()
        .range([r0 + stroke/2, r0 + depth]) 
        .domain([0, segCount]); //d3.max(data, d => d[2])]);

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
    const deg = d => d*Math.PI/180;
    const startAngleVis = (m3, q3) => deg(m3 *30 + q3 * 6 + 2.5);
    const endAngleVis = (m4, q4) => deg(m4 * 30 + q4 * 6 + 3 + .5);

    g.selectAll('path.call-seg')
        .data(columns60Calls)
        .enter()
        .append('path')
        .attr('class', 'call-seg')
        .attr('d', d=> {
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
            .style('cursor', 'pointer')
            .attr('data-vessel', d => d.call.vessel ?? '')
            .attr('data-arrival', d => d.call.arrival ? d.call.arrival.toISOString() : '')
            .attr('data-id', d => d.call.id ?? '')
  // simple native tooltip for now (optional)
            .append('title')
            .text(d => `${d.call.vessel ?? 'Unknown'} — ${fmtShortMD(d.call.arrival)}`)

    /*
    g.selectAll('path.col')
        .data(columns60)
        .enter()
        .append('path')
        .attr('class', 'col')
        .attr('d', d => arcGen({
            innerRadius: r(0),
            outerRadius: r(d.count),
            startAngle: startAngleVis(d.m1, d.q1),
            endAngle: endAngleVis(d.m1, d.q1)
        }))
        .attr('fill', '#b78a3d')
        .attr('fill-opacity', 0.85)
        .attr('stroke', 'none')
    */

    g.selectAll('line.tick')
        .data(labels)
        .enter()
        .append('line')
        .attr('class', 'tick')
        .attr('x1', d => toX(A(d)) * r0)
        .attr('y1', d => toY(A(d)) * r0)
        .attr('x2', d => toX(A(d)) * (r0 + 6))
        .attr('y2', d => toY(A(d)) * (r0 + 6))
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
        
}


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
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '';

    const [calls, connections] = await Promise.all([
        window.callsPromise,
        window.connectionsPromise
    ]);

    
    const { lastStart, lastEnd } = window.Helpers.getT24();
    const t12Calls = calls.filter(c => 
        window.Helpers.rangeCheck(c.arrival, lastStart, lastEnd));

    const t12Connections = connections.filter(c =>
        window.Helpers.rangeCheck(c.connect, lastStart, lastEnd)
    );
    
    const callsSorted = t12Calls
        .slice()
        .sort((a, b) => a.arrival - b.arrival)

    console.log('t12Calls: ' , t12Calls.length, 't12Connections: ', t12Connections.length);
    const xDomain = callsSorted.map(c => c.id);



    const monthChangeIndices = [];
    for (let i = 1; i < callsSorted.length; i++) {
        const prev = callsSorted[i - 1].arrival;
        const curr = callsSorted[i].arrival;
        if (prev.getMonth() !== curr.getMonth()) {
            monthChangeIndices.push(i)
        }
    }

    const width = el.clientWidth;
    const height = el.clientHeight;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };

    const svg = d3.select(el)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const innerWidthFactor = 0.8;
    const innerHeightFactor = 0.4;
    const W = width;
    const H = height;
    const D = Math.min(W, H);
    
    const innerW = Math.round(D * innerWidthFactor);
    const innerH = Math.round(D * innerHeightFactor);
    
    const originX = Math.round((W - innerW) / 2);
    const originY = Math.round((H - innerH) / 2);

    const axisX_Y = originY + innerH;
    const axisY_X = originX;

    const xByCalls = d3.scaleBand()
        .domain(xDomain)
        .range([originX + margin.left, originX + innerW - margin.right])
        .paddingInner(0.14)
        .paddingOuter(0.04);

    const labels = window.Helpers.monthLabels();

    /*
    const xMonth = d3.scaleBand()
        .domain(labels)
        .range([originX + margin.left, originX + innerW - margin.right])
        .paddingInner(0.1);
*/

    const y = d3.scaleTime()
        .domain([new Date(0,0,0,6,0), new Date(0,0,0,22,0)])
        .range([originY + margin.top + innerH, originY + margin.top]);

    const toTOD = (d) => new Date(0,0,0, d.getHours(), d.getMinutes(), d.getSeconds(),0);
/*
    svg.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${axisX_Y})`)
        .call(d3.axisBottom(xByCalls));

        */
/*
    const grouped = d3.group(t12Calls, d => d.connect.getMonth());
    grouped.forEach((rows, m) => rows.forEach((row, i) => row.callIndex = i));

    */

    //const maxCalls = d3.max(Array.from(grouped.values(), v => v.length));




    svg.selectAll('line.call-span')
        .data(callsSorted)
        .enter().append('line')
        .attr('class', 'call-span')
        .attr('x1', d => xByCalls(d.id) + xByCalls.bandwidth()/2)
        .attr('x2', d => xByCalls(d.id) + xByCalls.bandwidth() / 2)
        //.attr('width', xByCalls.bandwidth())
        .attr('y1', d => y(toTOD(d.arrival)))
        .attr('y2', d => y(toTOD(d.departure)))
        //.attr('height', d => Math.abs(y(d.arrival) - y(d.departure)))
        .attr('height', d => Math.max(1, Math.abs(y(toTOD(d.arrival)) - y(toTOD(d.departure)))))
        .attr('rx', 6).attr('ry', 6)
        .attr('fill', getComputedStyle(document.documentElement)
            .getPropertyValue('--brass-mid').trim());
    
    svg.append('g')
        .selectAll('line.month-sep')
        .data(monthChangeIndices)
        .enter().append('line')
        .attr('class', 'month-sep')
        .attr('x1', i => xByCalls(callsSorted[i].id))
        .attr('x2', i => xByCalls(callsSorted[i].id))
        .attr('y1', originY + margin.top)
        .attr('y2', originY + innerH - margin.bottom)
        .attr('stroke', getComputedStyle(document.documentElement)
        .getPropertyValue('--ink-300').trim())

}