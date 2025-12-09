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
                drawRadialT12();
            } else {
                //await window.circleToBars("leftChartContainer");
                //await window.barsToCircle("rightChartContainer");
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
    console.log('labeling the months...')
    const container = document.getElementById("rightRadialChart");
    if (!container) return;

    container.innerHTML = '';

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 160;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('display', 'block');

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform',`translate(${margin.left},${margin.top})`)

    const labels = get12Labels(new Date());
    const x = d3.scaleBand()
        .domain(labels)
        .range([0,chartWidth])
        .padding(0.05);

    const xAxis = d3.axisBottom(x).tickSizeOuter(0);

    const axisG = g.append('g')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

    axisG.selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#334')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35) translate(-6, 0)');
    
    axisG.selectAll('.tick line')
        .attr('stroke', '#ccd')
        .attr('y2', -chartHeight);

    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 34)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('fill', '#445')
        .text('Monthly ship calls — last 12 months (axis only)');
}

