console.log('The power data is loading');

//this script relies on a number of helper functions located in the helpers.js file.
//const help = window.Helpers;

const powerDataURL = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Actuals/ShorePowerData_Cruise.csv';


// Split a CSV line into fields, respecting quotes



function splitCSVLine(line) {
  const tokens = line.match(/(".*?"|[^,]+)/g) || [];
  return tokens.map(s => s.replace(/^"|"$/g, '').trim());
}


//the data is stored in a csv and not strictly typed. this factory function coerces data types and converts the data into an object
const powerFactory = (rawData) => {
  const fields = splitCSVLine(rawData);
  const [id, connectDate, disconnectDate, connectTime, disconnectTime, usageRaw] = fields;

  const connectTS    = window.Helpers.timeStamp(connectDate,    connectTime);
  const disconnectTS = window.Helpers.timeStamp(disconnectDate, disconnectTime);

  // Numeric kWh: strip everything except digits and dot, then Number(...)
  const usage = Number(String(usageRaw ?? '').replace(/[^0-9.]/g, '')) || 0;

  return {
    id,                      
    usage,
    connect:    connectTS,
    disconnect: disconnectTS
  };

  /*
    const callArray = rawData.split(',').map(s => s.trim());
    const id = callArray[0] || '';
    const usage = callArray[5] || '';
    const connectDate = callArray[1] || '';
    const connectTime = callArray[3] || '';
    const disconnectDate = callArray[2] || '';
    const disconnectTime = callArray[4] || '';
    const connectTimeStamp = window.Helpers.timeStamp(connectDate, connectTime);
    const disconnectTimeStamp = window.Helpers.timeStamp(disconnectDate, disconnectTime);

    return {
        id,
        usage,
        connect: connectTimeStamp,
        disconnect: disconnectTimeStamp
    }

    */
}

//this function retrieves the call data AND pushes it through the factory
async function getConnections(powerDataURL) {
  const dataLines = await window.Helpers.getCSV(powerDataURL);
  const connections = dataLines.map(powerFactory)
  return connections
  }

//this is the part of the code that makes the results of this script accessible to other scripts  
window.connectionsPromise = getConnections(powerDataURL)
  .then(connections => {
    console.log(`Loaded ${connections.length} connections`);
    return connections;
  })
  .catch(err => {
    console.error('Failed to load the connection data:', err);
    throw err;
  }) 

//the following code blocks are used to generate some basic kpis and load them to the main page  
const annualConnectionCount = (connections, start, end) => {
    let n = 0;
    for (const c of connections) {
      const reference = c.connect || c.disconnect;
      if (reference && window.Helpers.rangeCheck(reference, start, end)) n++;
    }
    return n;
  }

const popConnections = (connections) => {
    const {lastStart,lastEnd,prevStart,prevEnd} = window.Helpers.getT24();

    const lastCount = annualConnectionCount(connections, lastStart, lastEnd);
    const prevCount = annualConnectionCount(connections, prevStart, prevEnd);

    const delta = lastCount - prevCount;
    //const deltaSymbol = delta > 0 ? '▲' : (delta < 0 ? '▼' : '—');
    const deltaPerc = prevCount ? (lastCount - prevCount) / prevCount : 0;
    const percFmt = new Intl.NumberFormat('en-US', {
      style: 'percent',
      signDisplay: 'always',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    const el = document.getElementById('shipConnectionCounter');
        if (el && !el.dataset.odometer) {
            window.Helpers.initOdometer(el, lastCount);
            window.Helpers.rollOdometer(el, 0, { immediate: true });
            setTimeout(() => window.Helpers.rollOdometer(el, lastCount), 500);
        } else if (el) {
            setTimeout(() => window.Helpers.rollOdometer(el, lastCount), 500);
        }
    //const arrowEl = document.getElementById('shipConnectionArrow');
    const percEl = document.getElementById('shipConnectionPerc');

    
    //arrowEl.textContent = deltaSymbol;
    percEl.textContent = percFmt.format(deltaPerc);
  }

window.connectionsPromise.then(popConnections);