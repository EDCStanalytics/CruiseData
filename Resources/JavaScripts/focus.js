document.addEventListener("DOMContentLoaded", () => {
    const buckets = document.querySelectorAll(".kpiBucket");
    const shipCards = document.getElementById("cardSpace");

    buckets.forEach(bucket => {
        bucket.addEventListener("click", async () => {
            const isAlreadyFocused = bucket.classList.contains("focused");

            // Reset all buckets and shipCards if clicked again
            if (isAlreadyFocused) {
                buckets.forEach(b => b.classList.remove("focused", "shrunk"));
                shipCards.classList.remove("collapsed");
                removeRadial("rightRadialChart");
                removeRadial("leftradialChart");

                return;
            }

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

            // Collapse shipCards
            shipCards.classList.add("collapsed");

            if (bucket.id === "rightChartContainer") {
                //await window.circleToBars("rightChartContainer");
                //await window.barsToCircle("leftChartContainer");
                removeRadial("leftradialChart");
                await waitForTransitionEndOnce(bucket);
                drawRadialT12();
                
            } else {
                //await window.circleToBars("leftChartContainer");
                //await window.barsToCircle("rightChartContainer");
                removeRadial("rightRadialChart");
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

const drawRadialT12 = async () => {
    const container = document.getElementById("rightRadialChart");
    if (!container) return;

    const calls = await window.callsPromise;
    console.log('calls loaded in radial: ', calls.length)

    container.innerHTML = '';

    const bounds = container.getBoundingClientRect();
    const diameter = Math.min(bounds.width, bounds.height);     //this is the diameter of the element, which we don't want to draw on
    const radius = diameter / 2;
    const depth = radius / 6;
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    const cx = width/2;
    const cy = height/2;
    const stroke = 2;
    const r0 = radius + stroke/2;

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
            for (const c of calls) {
                const t = c.arrival
                if (t && t >= start && t <= end)
                    stamps.push(t);
            }
            buckets.push({y, m, start, end, stamps});
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
    const maxPowerDomain = Math.max(1,maxPower);
    console.log('max power count is: ', maxPowerDomain);


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
    window._radialMaxPower = maxPowerDomain;

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

    const rLabel = r0 - 16;
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
        .range([radius, radius + depth]) 
        .domain([0, maxPowerDomain]); //d3.max(data, d => d[2])]);

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
        .attr('stroke', '#4624cdff')
        .attr('stroke-width', stroke)

    const arcGen = d3.arc();
    const deg = d => d*Math.PI/180;
    const startAngleVis = (m3, q3) => deg(m3 *30 + q3 * 6) - Math.PI/2;
    const endAngleVis = (m4, q4) => deg(m4 * 30 + q4 * 6 + 5) - Math.PI/2;

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
        .attr('fill', '#4624cd')
        .attr('fill-opacity', 0.85)
        .attr('stroke', 'none')

    g.selectAll('line.tick')
        .data(labels)
        .enter()
        .append('line')
        .attr('class', 'tick')
        .attr('x1', d => toX(A(d)) * r0)
        .attr('y1', d => toY(A(d)) * r0)
        .attr('x2', d => toX(A(d)) * (r0 + 6))
        .attr('y2', d => toY(A(d)) * (r0 + 6))
        .attr('stroke', '#cd2435');
      
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
        .style('fill', 'rgba(220, 57, 24, 1)')
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
        .style('fill', 'rgba(180, 137, 9, 1)')
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
