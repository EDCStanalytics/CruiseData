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
    lastStart.setDate(1);
    lastStart.setHours(0,0,0,0);
    lastStart.setMonth(lastStart.getMonth()-12);

    const lastEnd = new Date(lastStart);
    lastEnd.setMonth(lastEnd.getMonth()+12);
    lastEnd.setMilliseconds(-1);

    const prevStart = new Date(lastStart);
    prevStart.setMonth(prevStart.getMonth()-12);

    const prevEnd = new Date(lastStart);
    prevEnd.setMilliseconds(-1);

    return {lastStart,lastEnd,prevStart,prevEnd}
  }

const help_monthLabels = (now = new Date()) => {
  const {lastStart} = help_getT24(now);
  const labels = [];
  const d = new Date(lastStart);
  for (let i = 0; i < 12; i++) {
    const month = d.toLocaleString('en-US', {month: 'short'});
    const year = String(d.getFullYear()).slice(-2);
    labels.push(`${month} ${year}`);
    d.setMonth(d.getMonth() + 1);
  }
  return labels;
}


function help_initOdometer(el, initialValue = 0) {
  el.dataset.odometer = '1';
  el.innerHTML = ''; // fresh build

  const str = Number(initialValue).toLocaleString('en-US');
  for (const ch of str) {
    if (ch === ',') {
      const sep = document.createElement('div');
      sep.className = 'sep';
      sep.textContent = ',';
      el.appendChild(sep);
      continue;
    }
    const digit = document.createElement('div');
    digit.className = 'digit';
    const stack = document.createElement('div');
    stack.className = 'stack';
    // Build 0–9 vertical stack
    for (let i = 0; i <= 9; i++) {
      const s = document.createElement('span');
      s.textContent = String(i);
      stack.appendChild(s);
    }
    digit.appendChild(stack);
    el.appendChild(digit);
  }

  // First draw
  help_rollOdometer(el, initialValue, { immediate: true });
}

function help_rollOdometer(el, value, opts = {}) {
  if (!el || !el.dataset.odometer) return;
  
  
  const immediate = !!opts.immediate;

  
// helpers.js — replace the main loop inside help_rollOdometer()
const raw = Number(value).toLocaleString('en-US');
const nums = raw.replace(/,/g, '').split('');  // digits only, e.g., "1234" -> ["1","2","3","4"]
const digits = Array.from(el.querySelectorAll('.digit'));

let dIndex = digits.length - 1;          // walk digit DOM from right to left
let nIndex = nums.length - 1;            // walk target number from right to left

for (; dIndex >= 0; dIndex--, nIndex--) {
  const digitEl = digits[dIndex];
  const stack = digitEl.querySelector('.stack');
  const row = stack.querySelector('span');
  const height = row ? row.clientHeight : digitEl.clientHeight || 48;

  // If the number has fewer digits, pad with 0 on the left
  const target = nIndex >= 0 ? Number(nums[nIndex]) : 0;
  if (Number.isNaN(target)) continue;

  if (immediate) {
    stack.style.transition = 'none';
    stack.style.transform = `translateY(-${target * height}px)`;
    // force reflow then restore transition
    stack.getBoundingClientRect();
    stack.style.transition = '';
  } else {
    stack.style.transform = `translateY(-${target * height}px)`;
  }
  }
    

  // Visual hint for leading zeros (optional)
  let hitNonZero = false;
  for (const digitEl of digits) {
        const stack = digitEl.querySelector('.stack');
        const row = stack.querySelector('span');
        const height = row ? row.clientHeight : digitEl.clientHeight || 48;
    
const m = stack.style.transform.match(/translateY\(-([0-9.]+)px\)/);
const currentY = m ? Number(m[1]) : 0;

    
const num = height ? Math.round(currentY / height) : 0;
if (num !== 0) hitNonZero = true;

    digitEl.classList.toggle('is-leading', !hitNonZero);
  }
}


// Lightweight intent logger available to all scripts.
function help_emitIntent(type, payload) {
  try { console.debug('[intent]', type, payload); } catch (e) {}
}



  const coerceDate = help_CoerceDate;
  const coerceTime = help_CoerceTime;
  const timeStamp = (d, t) => help_TimeStamp(d, t);
  const rangeCheck = help_rangeCheck;
  const getT24 = help_getT24;
  const getCSV = help_getCSV;
  const initOdometer = help_initOdometer;
  const rollOdometer = help_rollOdometer;
  const monthLabels = help_monthLabels;
const emitIntent = help_emitIntent;


  window.Helpers = {
    coerceDate, 
    coerceTime, 
    timeStamp, 
    rangeCheck, 
    getT24, 
    getCSV,
    initOdometer,
    rollOdometer,
    monthLabels,
    emitIntent
  };