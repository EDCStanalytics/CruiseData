//this js file contains some helpful functions for standardizing times and dates

const help_CoerceDate = (rawDate) => {
    if (!rawDate) return null;
    const [m, d, y] = rawDate.trim().split('/').map(Number);

    if(!y || !m || !d) return null;
    return new Date(y, m-1, d);
}

const help_CoerceTime = (baseDate, rawTime) => {
    const parts = rawTime.split(':').map(Number);
    const h = parts[0] || 0;
    const min = parts[1] || 0;
    const s = parts[2] || 0;
    const d = new Date(baseDate);
    d.setHours(h, min, s, 0);
    return d;
}

const help_TimeStamp = (dateString, timeString) => {
    const dateValue = help_CoerceDate(dateString);
    if (!dateValue) return null;
    if (timeString && timeString.length) {
        return help_CoerceTime(dateValue, timeString)
    } else {
        dateValue.setHours(0,0,0,0);
        return dateValue
    }
}

async function help_getCSV(csvURL) {
  const res = await fetch(csvURL);
    if (!res.ok) {
      throw new Error(`Failed to fetch CSV (${res.status} ${res.statusText})`);
    }

  const text = await res.text();

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const dataLines = lines.slice(1)
  
  return dataLines
  }

const help_rangeCheck = (d, start, end) => {
    return d && d >= start && d <=end;
  }

const help_getT24 = (now = new Date()) => {
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

  const coerceDate = help_CoerceDate;
  const coerceTime = help_CoerceTime;
  const timeStamp = (d, t) => help_TimeStamp(d, t);
  const rangeCheck = help_rangeCheck;
  const getT24 = help_getT24;
  const getCSV = help_getCSV;

  window.Helpers = {coerceDate, coerceTime, timeStamp, rangeCheck, getT24, getCSV};