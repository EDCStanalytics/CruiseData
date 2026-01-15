//this script is meant to embed vega specifications into the webpage as interactive charts


var testChart = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/shipCallsT12.json';
var vega_Calls1 = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/shipCallsT12.json';
var vega_Pax1 = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/CruisePaxT12.json';
var vega_Power1 = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/ShorePowerT12.json';

var vega_Calls2 = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/FleetProfileDupe.json';
var vega_Pax2 = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/CruisePaxDupe';
var vega_Power2 = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Visuals/ShorePowerDupe.json';

const embedOptions = {actions: false};

//can we assign the charts programatically?
const vizElements = Array.from(document.getElementsByClassName('dataViz'));

vizElements.forEach(element => {
    let ingoing_chart;
    console.log('looking for ' + element.id);

    switch (element.id) {
        case 'calls_sum':
            ingoing_chart = vega_Calls1;
            break;
        case 'calls_original':
            ingoing_chart = vega_Calls2;
            break;
        case 'pax_sum':
            ingoing_chart = vega_Pax1;
            break;
        case 'pax_original':
            ingoing_chart = vega_Pax2;
            break;
        case 'power_sum':
            ingoing_chart = vega_Power1;
            break;
        case 'power_original':
            ingoing_chart = vega_Power2;
            break;
        default:
            ingoing_chart = '';
        }
    
        if (ingoing_chart.length > 1) {
    vegaEmbed(element, ingoing_chart, embedOptions)
        .then(function (result) {
            const view = result.view;

            const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target === element) {
                    const newWidth = entry.contentRect.width;
                    const newHeight = entry.contentRect.height;

                    view.width(newWidth).height(newHeight).run();
                }
                //const { width, height } = entry.contentRect;
                // Update the view's width and height signals and re-render
                 
                }
            });
        
            resizeObserver.observe(element);
        })
        .catch(console.error);
    }
});

