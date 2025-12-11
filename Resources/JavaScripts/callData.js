console.log('The call data is loading');

const callFactory = (rawCallData) => {
    const callArray = rawCallData.split(',').map(s => s.trim());

    const id = callArray[0] || '';
    const vessel = callArray[1] || '';
    const arrivalDate = callArray[2] || '';
    const arrivalTime = callArray[3] || '';
    const departDate = callArray[4] || '';
    const departTime = callArray[5] || '';
    const arriveTimeStamp = timeStamp(arrivalDate, arrivalTime);
    const departTimeStamp = timeStamp(departDate, departTime);

    return {
        id,
        vessel,
        arrival: arriveTimeStamp,
        departure: departTimeStamp
    }

}

const coerceDate = (rawDate) => {
    if (!rawDate) return null;
    const [m, d, y] = rawDate.trim().split('/').map(Number);

    if(!y || !m || !d) return null;
    return new Date(y, m-1, d);
}

const coerceTime = (baseDate, rawTime) => {
    const parts = rawTime.split(':').map(Number);
    const h = parts[0] || 0;
    const min = parts[1] || 0;
    const s = parts[2] || 0;
    const d = new Date(baseDate);
    d.setHours(h, min, s, 0);
    return d;
}

const timeStamp = (dateString, timeString) => {
    const dateValue = coerceDate(dateString);
    if (!dateValue) return null;
    if (timeString && timeString.length) {
        return coerceTime(dateValue, timeString)
    } else {
        dateValue.setHours(0,0,0,0);
        return dateValue
    }
}

const callDataURL = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Actuals/CallData_Cruise.csv'

async function getCalls() {
  const res = await fetch(callDataURL);
    if (!res.ok) {
      throw new Error(`Failed to fetch CSV (${res.status} ${res.statusText})`);
    }

  const text = await res.text();

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const dataLines = lines.slice(1)
  const calls = dataLines.map(callFactory)
  return calls
  }




window.callsPromise = getCalls()
  .then(calls => {
    console.log(`Loaded ${calls.length} calls`);
    return calls;
  })
  .catch(err => {
    console.error('Failed to load the call data:', err);
    throw err;
  })

  const rangeCheck = (d, start, end) => {
    return d && d >= start && d <=end;
  }

  const annualCallCount = (calls, start, end) => {
    let n = 0;
    for (const c of calls) {
      const reference = c.arrival || c.departure;
      if (reference && rangeCheck(reference, start, end)) n++;
    }
    return n;
  }

  const callWindows = (now = new Date()) => {
    const lastStart = new Date(now);
    lastStart.setHours(0,0,0,0);
    lastStart.setMonth(lastStart.getMonth()-12);

    const lastEnd = new Date(now);
    lastEnd.setHours(23,59,59,999);

    const prevStart = new Date(lastStart);
    prevStart.setMonth(prevStart.getMonth()-12);

    const prevEnd = new Date(lastStart);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds()-1);

    return {lastStart,lastEnd,prevStart,prevEnd}
  }

  const popCalls = (calls) => {
    const {lastStart,lastEnd,prevStart,prevEnd} = callWindows();

    const lastCount = annualCallCount(calls, lastStart, lastEnd);
    const prevCount = annualCallCount(calls, prevStart, prevEnd);

    const delta = lastCount - prevCount;
    const deltaSymbol = delta > 0 ? '▲' : (delta < 0 ? '▼' : '—');
    const deltaPerc = (lastCount - prevCount) / prevCount;
    const percFmt = new Intl.NumberFormat('en-US', {
      style: 'percent',
      signDisplay: 'always',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })


    const el = document.getElementById('shipCallCounter');
    const arrowEl = document.getElementById('shipCallArrow');
    const percEl = document.getElementById('shipCallPerc');

    el.textContent = lastCount.toLocaleString('en-US');
    arrowEl.textContent = deltaSymbol;
    percEl.textContent = percFmt.format(deltaPerc);
  }

  window.callsPromise.then(popCalls);