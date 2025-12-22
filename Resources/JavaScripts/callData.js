//logging the start up of the script for debugging purposes
console.log('The call data is loading');

//this script relies on a number of helper functions located in the helpers.js file.
const help = window.Helpers;

//the call data is currently stored on our gitHub repo but will hopefully be moved to the EDC site
const callDataURL = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Actuals/CallData_Cruise.csv'

//the data is stored in a csv and not strictly typed. this factory function coerces data types and converts the data into an object
const callFactory = (rawCallData) => {
    const callArray = rawCallData.split(',').map(s => s.trim());
    const id = callArray[0] || '';
    const vessel = callArray[1] || '';
    const arrivalDate = callArray[2] || '';
    const arrivalTime = callArray[3] || '';
    const departDate = callArray[4] || '';
    const departTime = callArray[5] || '';
    const arriveTimeStamp = help.timeStamp(arrivalDate, arrivalTime);
    const departTimeStamp = help.timeStamp(departDate, departTime);

    return {
        id,
        vessel,
        arrival: arriveTimeStamp,
        departure: departTimeStamp
    }
}

//this function retrieves the call data AND pushes it through the factory
async function getCalls(callDataURL) {
  const dataLines = await help.getCSV(callDataURL);
  const calls = dataLines.map(callFactory)
  return calls
  }

//this is the part of the code that makes the results of this script accessible to other scripts  
window.callsPromise = getCalls(callDataURL)
  .then(calls => {
    console.log(`Loaded ${calls.length} calls`);
    return calls;
  })
  .catch(err => {
    console.error('Failed to load the call data:', err);
    throw err;
  })

//the following code blocks are used to generate some basic kpis and load them to the main page  
const annualCallCount = (calls, start, end) => {
    let n = 0;
    for (const c of calls) {
      const reference = c.arrival || c.departure;
      if (reference && help.rangeCheck(reference, start, end)) n++;
    }
    return n;
  }

const popCalls = (calls) => {
    const {lastStart,lastEnd,prevStart,prevEnd} = help.getT24();

    const lastCount = annualCallCount(calls, lastStart, lastEnd);
    const prevCount = annualCallCount(calls, prevStart, prevEnd);

    const delta = lastCount - prevCount;
    //const deltaSymbol = delta > 0 ? '▲' : (delta < 0 ? '▼' : '—');
    const deltaPerc = prevCount ? (lastCount - prevCount) / prevCount : 0;
    const percFmt = new Intl.NumberFormat('en-US', {
      style: 'percent',
      signDisplay: 'always',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })


    const el = document.getElementById('shipCallCounter');
        if (el && !el.dataset.odometer) {
            window.Helpers.initOdometer(el, lastCount);
            window.Helpers.rollOdometer(el, 0, { immediate: true });
            setTimeout(() => window.Helpers.rollOdometer(el, lastCount), 500);
        } else if (el) {
            setTimeout(() => window.Helpers.rollOdometer(el, lastCount), 500);
        }
    //const arrowEl = document.getElementById('shipCallArrow');
    const percEl = document.getElementById('shipCallPerc');

    
    //arrowEl.textContent = deltaSymbol;
    percEl.textContent = percFmt.format(deltaPerc);
  }

window.callsPromise.then(popCalls);