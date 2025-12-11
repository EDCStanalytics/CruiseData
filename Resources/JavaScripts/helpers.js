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
    const dateValue = coerceDate(dateString);
    if (!dateValue) return null;
    if (timeString && timeString.length) {
        return coerceTime(dateValue, timeString)
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
  const calls = dataLines.map(callFactory)
  return calls
  }

const help_rangeCheck = (d, start, end) => {
    return d && d >= start && d <=end;
  }