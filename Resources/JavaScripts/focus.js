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

const drawRadialT12 = () => {
    const container = document.getElementById("rightRadialChart");
    if (!container) return;

    container.innerHTML = '';

    const bounds = container.getBoundingClientRect();
    const diameter = Math.min(bounds.width, bounds.height);     //this is the diameter of the element, which we don't want to draw on
    const radius = diameter / 2;
    const depth = radius / 5;
    const outerDiameter = diameter + depth * 2;
    
    const width = container.offsetHeight;
    const height = container.offsetWidth;
    //const margin = { top: 50, right: 50, bottom: 50, left: 50 };

    const cx = width/2;
    const cy = height/2;
    const stroke = 5;
    const r0 = Math.min(width, height) / 2 - stroke;

    
 

    //const chartWidth = width - margin.left - margin.right;
    //const chartHeight = height - margin.top - margin.bottom;

    const labels = get12Labels(new Date());

    const angle = d3.scalePoint()
        .domain(labels)
        .range([0,2*Math.PI]);

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width*1.5)
        .attr('height', height*1.5)
        //.attr('viewBox', `${-pad} ${-pad} ${width + pad*2} ${height + pad * 2}`)
        .style('display', 'block')
        .style('overflow','visible');

    const g = svg.append('g')
        .attr('transform',`translate(${cx},${cy})`);

    g.append('circle')
        .attr('r', r0)
        .attr('fill', 'none')
        .attr('stroke', '#cd2435')
        .attr('stroke-width', stroke)

    g.selectAll('line.tick')
        .data(labels)
        .enter()
        .append('line')
        .attr('class', 'tick')
        .attr('x1', d => Math.cos(angle(d)) * r0)
        .attr('y1', d => Math.sin(angle(d)) * r0)
        .attr('x2', d => Math.cos(angle(d)) * (r0 + 6))
        .attr('y2', d => Math.sin(angle(d)) * (r0 + 6))
        .attr('stroke', '#cd2435');
      
    g.selectAll('text.month')
        .data(labels)
        .enter()
        .append('text')
        .attr('class', 'month')
        .attr('x', d => Math.cos(angle(d)) * (r0 + 12))
        .attr('y', d => Math.sin(angle(d)) * (r0 + 12))
        .attr('text-anchor', d => {
            const a = angle(d), c = Math.cos(a);
            return c > 0.1 ? 'start' : (c < -0.1 ? 'end' : 'middle');
        })
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('fill', '#334')
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
