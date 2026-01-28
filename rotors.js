/* ============================================================================================
   ROTOR DEFINITIONS (CENTRAL REGISTRY)
   --------------------------------------------------------------------------------------------
   Declarative, role-based definitions for every rotor used in the system.
   Contains:
     - bucket ownership
     - label text
     - pill text (string or function)
     - value getter
     - formatter (function applied before render)
     - trend series key (for arrow direction/color)
     - probe placement map by named layout

   Does NOT contain:
     - DOM creation
     - DOM placement
     - trend fetching
     - digitsRenderer / digitsRoller
     - reveal/hide logic
     - update logic
     - Wrangler logic
     - setupRotor logic

   This is the canonical “what exists” list for rotors.
   ============================================================================================ */

window.RotorDefinitions = {

  calls: {
    role: 'calls',
    bucket: 'frame-calls',
    label: 'Ship Calls (T12)',
    pill: 'Ship Calls',
    valueGetter: () => window.cruncher.getT12CallCount(),
    format: (n) => String(Math.max(0, Math.floor(n ?? 0))).padStart(3, '0'),
    trendKey: 'calls',
    positions: { overview: 1, calls: 1 }     // will be expanded later
  },

  connections: {
    role: 'connections',
    bucket: 'frame-connections',
    label: 'Connections',
    pill: 'Connections',
    valueGetter: () => window.cruncher.getT12ConnectionCount(),
    format: (n) => String(Math.max(0, Math.floor(n ?? 0))).padStart(3, '0'),
    trendKey: 'connections',
    positions: { osp: 5, 'osp-usage': 5, 'osp-impact': 5 }
  },

  kwh: {
    role: 'kwh',
    bucket: 'frame-connections',
    label: 'kWh Provided',
    pill: (val) => {
      const fmt = window.formatKwhCompact(val ?? 0);
      return fmt?.unit ? (window.unitFull(fmt.unit) + ' kWh') : '';
    },
    valueGetter: () => window.cruncher.getT12KwhTotal(),
    format: (n) => window.formatKwhCompact(n ?? 0),
    trendKey: 'kwh',
    positions: { osp: 2, 'osp-impact': 5 }
  },

  usage: {
    role: 'usage',
    bucket: 'frame-connections',
    label: 'Shore Power Usage',
    pill: 'Usage Rate',
    valueGetter: () => window.cruncher.getT12UsageRatePercent(),
    format: (n) => window.formatPercentCompact(n ?? 0),
    trendKey: 'usageRate',
    positions: { osp: 4, 'osp-usage': 2 }
  }

};

/* ============================================================================================
   END ROTOR DEFINITIONS
   ============================================================================================ */


/* ============================================================================================
   ROTOR CONFIG FACTORY
   --------------------------------------------------------------------------------------------
   Converts a declarative RotorDefinition into a fully-formed config object that setupRotor()
   can consume. This isolates:
     • data fetching
     • trend mapping
     • arrow direction/color
     • formatted digits
     • renderer/roller assembly

   Does NOT perform DOM placement — Wrangler handles lifecycle and placement.
   ============================================================================================ */

window.RotorConfigFactory = {

  // Build the final config object for a given rotor role
  async build(def) {
    if (!def) return null;

    // 1. Fetch trend data (arrow direction, color)
    let trend = null;
    try {
      trend = await charts.getT12Trend({});
    } catch (err) {
      console.error("RotorConfigFactory trend fetch failed:", err);
    }

    const series = trend?.series?.[def.trendKey] ?? {};
    const arrowDir = series.dir ?? 'up';
    const arrowColor = series.color ?? '#2b4d7d';

    // 2. Wrap the definition’s formatting function
    const wrapFormat = (n) => {
      try {
        return def.format ? def.format(n) : n;
      } catch (err) {
        console.error(`format(${def.role}) failed:`, err);
        return n;
      }
    };

    // 3. Build digitsRenderer
    const digitsRenderer = (speedEl, rawValue) => {
      const fmt = wrapFormat(rawValue);

      // fmt may be a string (fixed 3-digit) or an object (compact)
      if (typeof fmt === 'string') {
        // Fixed 3-digit integer rotors (calls, connections)
        buildFixed3Odometer(speedEl, fmt, -1);
      } else {
        // Compact formats (kWh, percent)
        buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);
      }

      // Attach the trend arrow
      attachTrendArrow(speedEl, arrowDir, arrowColor);
    };

    // 4. Build digitsRoller
    const digitsRoller = (speedEl, rawValue) => {
      const fmt = wrapFormat(rawValue);
      const digits = typeof fmt === 'string'
        ? fmt
        : fmt.digitsOnly;

      window.setRotorValue(speedEl, digits ?? '');
    };

    // 5. Build final config object for setupRotor()
    return {
      // identity
      role: def.role,
      bucketId: def.bucket,

      // text
      labelText: def.label,
      pillText: def.pill,

      // value fetcher
      valueGetter: def.valueGetter,

      // rendering
      digitsRenderer,
      digitsRoller,

      // behavior
      appearWhen: def.appearWhen ?? 'always',
      hideWhen:   def.hideWhen   ?? 'never',
      startHidden: def.startHidden ?? false,
      syncReveal: 'transitionEnd',

      // placement (per-layout probe map)
      positions: def.positions
    };
  }
};

/* ============================================================================================
   END ROTOR CONFIG FACTORY
   ============================================================================================ */

/* ============================================================================================
   SETUP ROTOR (UI‑ONLY BUILDER, STEP 4)
   --------------------------------------------------------------------------------------------
   This function no longer:
     • resolves buckets
     • inserts DOM into containers
     • manages focus, layout, or appear/hide transitions
     • observes bucket class changes
     • moves rotors between probes
     • handles lifecycle

   Wrangler is now responsible for mount/unmount and placement.

   setupRotor(config) now:
     • builds a <div class="baseStats" data-role="..."> rotor element
     • inserts all child UI structure
     • performs initial digits rendering
     • returns the DOM node (does NOT insert it anywhere)
   ============================================================================================ */

  window.Rotors = window.Rotors || {};

  window.Rotors.setup = async function setupRotor(config = {}) {
  const {
    role,
    labelText,
    pillText,
    valueGetter,
    digitsRenderer,
    digitsRoller
  } = config;

  // -------------------------------------------------------------------------------------------
  // 1. Create rotor root element
  // -------------------------------------------------------------------------------------------
  const rotorEl = document.createElement('div');
  rotorEl.className = 'baseStats';
  rotorEl.dataset.role = role || '';

  // -------------------------------------------------------------------------------------------
  // 2. Create the speed readout and label
  // -------------------------------------------------------------------------------------------
  const speedEl = document.createElement('div');
  speedEl.className = 'speedRead';
  speedEl.id = `rotor-${role}-value`;

  const labelEl = document.createElement('div');
  labelEl.className = 'baseLabel';
  labelEl.textContent = labelText ?? '';

  rotorEl.appendChild(speedEl);
  rotorEl.appendChild(labelEl);

  // -------------------------------------------------------------------------------------------
  // 3. INITIAL VALUE RENDER (first frame — static renderer)
  // -------------------------------------------------------------------------------------------
  try {
    const raw = await Promise.resolve().then(valueGetter);
    digitsRenderer(speedEl, Number(raw ?? 0));
  } catch (err) {
    console.error(`setupRotor initial render failed for role="${role}"`, err);
    digitsRenderer(speedEl, 0);
  }

  // -------------------------------------------------------------------------------------------
  // 4. POST‑REVEAL ROLL ANIMATION (run one async frame later)
  //    Wrangler will control when to call this in Step 5
  // -------------------------------------------------------------------------------------------
  rotorEl.reRoll = async () => {
    try {
      const raw = await Promise.resolve().then(valueGetter);
      digitsRoller(speedEl, Number(raw ?? 0));
    } catch (err) {
      console.error(`setupRotor reRoll failed for role="${role}"`, err);
      digitsRoller(speedEl, 0);
    }
  };

  // -------------------------------------------------------------------------------------------
  // 5. Attach pill if applicable (string or function)
  // -------------------------------------------------------------------------------------------
  if (pillText) {
    const pill = (typeof pillText === "function") ?
      pillText(labelText) :
      pillText;

    // pill rendering
    const tag = document.createElement('span');
    tag.className = 'magnitudeTag';
    tag.textContent = String(pill);
    speedEl.appendChild(tag);
  }

  // -------------------------------------------------------------------------------------------
  // 6. Final: return unplaced rotor DOM node
  // -------------------------------------------------------------------------------------------
  return rotorEl;
};

/* ============================================================================================
   END SETUP ROTOR (UI‑ONLY)
   ============================================================================================ */



/*
function setupRotor({
  // identity / placement
  role,                      // e.g., 'kwh'
  bucketId,                  // e.g., 'frame-connections'
  id,                        // optional element id; default: 'rotor-' + role
  adoptSelector,             // optional: adopt an existing element instead of creating a new one

  // content
  labelText,                 // e.g., 'kWh Provided'
  valueGetter,               // async () => number; supplies odometer value

 // STANDARD OPTIONS (no role-specific logic inside setup):
  pillText,                         // string or (value) => string
  digitsRenderer,                   // (speedEl, value) => void
  digitsRoller,                     // (speedEl, value) => void


  appearWhen,
  appearAt,
  moveAfterAppearTo,
  positions = null,
  scales = { 1: 1.8, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.8 },
  hideWhen,
  hideTo,
  startHidden = true,        // start hidden until rule is met

  // timing
  syncReveal = 'instant'     // 'instant' | 'transitionEnd' (wait for bucket focus transition)
}) {

// Wait for bucket's transition and one extra frame so geometry is current
async function afterGeometrySettles() {
  // If caller asked to sync with transitionEnd, await it
  if (syncReveal === 'transitionEnd') {
    await waitForTransitionEndOnce(bucket);
  }
  // Then give the browser one more paint to update clientWidth/clientHeight
  await new Promise(r => requestAnimationFrame(() => r()));
}

  // resolve bucket
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  // create or adopt rotor element
const rotorEl = adoptSelector
  ? RotorFactory.adopt(bucket, adoptSelector, role, appearAt)
  : RotorFactory.create(bucket, { role, id: id ?? `rotor-${role}` }, appearAt);

if (!rotorEl) return null;


/* my code recommendation: REPLACEMENT — focus.js */
/* Harden renderer: if digitsRenderer throws, fall back to odometer 
function buildContent(el, value) {
  el.innerHTML = '';
  const speed = document.createElement('div');
  speed.className = 'speedRead';
  speed.id = `rotor-${role}-value`;

  const label = document.createElement('div');
  label.className = 'baseLabel';
  label.textContent = labelText ?? '';

  el.appendChild(speed);
  el.appendChild(label);

  const v = Number(value ?? 0);

  if (typeof digitsRenderer === 'function') {
    try {
      digitsRenderer(speed, v);
    } catch (err) {
      console.error(`digitsRenderer(${role}) failed:`, err);
      // Safe fallback: plain odometer
      window.Helpers.initOdometer(speed, Math.round(v));
      window.Helpers.rollOdometer(speed, Math.round(v));
    }
  } else {
    window.Helpers.initOdometer(speed, Math.round(v));
    window.Helpers.rollOdometer(speed, Math.round(v));
  }

  // Attach pill using provided pillText (string or function)
  const pill = typeof pillText === 'function' ? pillText(v) : pillText;
  attachRotorPill(speed, pill);
}


// INSERT HERE 👉 read canonical (maps left/right* → calls/osp*)
function getFocusLevel(bucket) {
  return readLayoutCanonical(bucket);
}


  function applyScaleForProbe(humanPoint) {
    const scale = (scales && scales[humanPoint]) ?? null;
    if (scale != null) RotorFactory.scale(rotorEl, scale);  // sets --rotor-scale inline
  }


  // REPLACEMENT — resolve probe by *layout name* (no numeric scenes)
  function resolveProbeForLevel(layoutName) {
    // INSERT HERE 👉 positions is now an object keyed by descriptors: { 'right': 4, 'right-usage': 2, ... }
    if (!positions || Array.isArray(positions)) return null; // numeric maps no longer supported
    return positions[layoutName] ?? null;
  }


  // REPLACEMENT — position rotor using descriptor layout, then scale
  async function setToLevelPositionAsync(layoutName) {
    const human = resolveProbeForLevel(layoutName);
    if (human == null) return;
    await afterGeometrySettles();
    RotorFactory.toProbe(bucket, rotorEl, Math.max(0, Math.min(4, (human - 1) || 0)));
    applyScaleForProbe(human);
    rotorEl.dataset.probe = String(human);
    positionProbeDots(bucket);
  }




  // load the value once (initial build only)
  (async () => {
    try {
      const val = await Promise.resolve().then(valueGetter);
      buildContent(rotorEl, val);
    } catch (e) {
      console.error(`setupRotor(${role}) failed to populate:`, e);
      buildContent(rotorEl, 0);
    }
  })();

  // helper: human point → index
  const toIdx = (human) => Math.max(0, Math.min(4, (human ?? 1) - 1));

  // initial placement
  
  if (startHidden) {
    rotorEl.classList.add('is-hidden'); // CSS controls opacity/pointer-events
  }

  // visibility predicate
  const appearPredicate = (b) => {
    if (typeof appearWhen === 'function') return !!appearWhen(b);
    if (appearWhen === 'always') return true;
    if (appearWhen === 'focus') return b.classList.contains('focused');
    return false;
  };

  // hide rule
  const shouldHide = (b) => {
    if (hideWhen === 'never') return false;
    return !b.classList.contains('focused'); // default: blur
  };

  

  // Initial spawn: prefer positions[0] if provided; else appearAt
  const initialLevel = 0;
  const initialHuman = resolveProbeForLevel(initialLevel) ?? appearAt;
  RotorFactory.toProbe(bucket, rotorEl, Math.max(0, Math.min(4, (initialHuman - 1) || 0)));


  applyScaleForProbe(initialHuman);
rotorEl.dataset.probe = String(initialHuman);



async function revealAndMove() {
  if (syncReveal === 'transitionEnd') {
    await waitForTransitionEndOnce(bucket);
  }
  rotorEl.classList.remove('is-hidden');

  // One frame so the fade/roll overlap cleanly
  await new Promise(r => requestAnimationFrame(() => r()));

  const s = rotorEl.querySelector('.speedRead');
  if (s) {
    try {
      const v = await Promise.resolve().then(valueGetter);
      if (typeof digitsRoller === 'function') {
        digitsRoller(s, Number(v ?? 0));
      } else {
        window.Helpers.rollOdometer(s, Math.round(Number(v ?? 0)));
      }
    } catch (err) {
      console.error(`digitsRoller(${role}) failed:`, err);
      // Minimal fallback if getter/roller fails
      window.Helpers.rollOdometer(s, 0);
    }
  }

  positionProbeDots(bucket);
  // (no movement on reveal; we already spawn at appearAt)
}





// hide & reset
function hideAndReset() {
  rotorEl.classList.add('is-hidden');

  // Reset digit stacks to "000" so next reveal rolls from zero
  const s = rotorEl.querySelector('.speedRead');
  if (s) window.setRotorValue(s, '000');
}

  // REPLACEMENT — observe class + data-layout (no data-focus)
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type !== 'attributes') continue;
      if (m.attributeName !== 'class' && m.attributeName !== 'data-layout') continue;
      const layout = getFocusLevel(bucket); // descriptor string
      // INSERT HERE 👉 move rotor for this layout after geometry settles
      void setToLevelPositionAsync(layout);
      if (appearPredicate(bucket)) {
        void revealAndMove();
      } else if (shouldHide(bucket)) {
        hideAndReset();
      }
    }
  });
  obs.observe(bucket, { attributes: true, attributeFilter: ['class','data-layout'] });


// In case page loads with focus pre-set
void setToLevelPositionAsync(getFocusLevel(bucket));


  // in case the page loads with bucket already focused
  if (appearPredicate(bucket)) void revealAndMove();

  return rotorEl;
}  // ← CLOSES setupRotor PROPERLY
*/


// INSERT HERE 👉 batch digit transforms to one RAF for smoother updates
window.setRotorValue = function (speedReadEl, value) {
  const s = String(value);
  const stacks = speedReadEl.querySelectorAll('.digit .stack');
  const pad = s.padStart(stacks.length, '0');

  // Queue a single-frame batch of DOM writes
  window.TickBatch.queue(function () {
    for (let i = 0; i < stacks.length; i++) {
      const stack = stacks[i];
      const d = Number(pad[i]);
      // Guard against NaN and missing nodes
      if (!stack || Number.isNaN(d)) continue;
      stack.style.transform = `translateY(-${d}em)`;
    }
  });
};

function formatKwhCompact(n) {
  const abs = Math.max(0, Number(n) || 0);

  // 1) Determine magnitude group and unit
  let base = 1, unit = '';
  if (abs >= 1_000 && abs < 1_000_000) { base = 1_000; unit = 'k'; }
  else if (abs >= 1_000_000 && abs < 1_000_000_000) { base = 1_000_000; unit = 'M'; }
  else if (abs >= 1_000_000_000) { base = 1_000_000_000; unit = 'B'; }

  // 2) Scale to the group and pick exactly three digits
  const scaled = abs / base;                // e.g., 207.89 (k), 1.37 (M), 13.478 (M)
  const i = Math.floor(scaled);
  const frac = scaled - i;

  if (scaled >= 100) {
    // Has hundreds → show hundreds, tens, ones (no fractional)
    const hundreds = Math.floor(i / 100) % 10;
    const tens     = Math.floor(i / 10)  % 10;
    const ones     = i % 10;
    return {
      digitsOnly: '' + hundreds + tens + ones,  // e.g., "207"
      dotIndex: -1,                              // no fractional digit
      unit,
      fracDigits: 0
    };
  } else {
    // No hundreds → show tens, ones, tenths (last digit is fractional)
    const tens   = Math.floor(i / 10) % 10;     // keep leading 0 if needed
    const ones   = i % 10;
    const tenths = Math.floor(frac * 10) % 10;
    return {
      digitsOnly: '' + tens + ones + tenths,    // e.g., "013", "134"
      dotIndex: 2,                               // fractional starts at index 2 (third digit)
      unit,
      fracDigits: 1
    };
  }
}


function formatPercentCompact(n) {
  const v = Math.max(0, Math.min(125, Number(n) || 0)); // clamp 0..125
  const i = Math.floor(v);
  const frac = v - i;
  const tens   = Math.floor(i / 10) % 10;
  const ones   = i % 10;
  const tenths = Math.floor(frac * 10) % 10;            // always present (0..9)
  return { digitsOnly: '' + tens + ones + tenths, dotIndex: 2 };
}

function unitFull(u) {
  switch (u) {
    case 'k': return 'Thousand';
    case 'M': return 'Million';
    case 'B': return 'Billion';
    default:  return '';
  }
}

function buildFixed3Odometer(speedEl, digits3, dotIndex = -1) {
  if (!speedEl) return;

  // Clear and prepare container
  speedEl.innerHTML = '';

  // Helper: one rolling digit with 0..9 stack
  const makeDigit = () => {
    const d = document.createElement('span');
    d.className = 'digit';
    const stack = document.createElement('span');
    stack.className = 'stack';
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.textContent = String(i);
      stack.appendChild(s);
    }
    d.appendChild(stack);
    return d;
  };

  // Ensure exactly 3 characters; pad left with 0 if shorter
  const s = String(digits3 ?? '').padStart(3, '0');
  const chars = s.split('');

  // Create .int wrapper so a pill can be centered on non-fractional digits
  const intWrap = document.createElement('span');
  intWrap.className = 'int';
  speedEl.appendChild(intWrap);


  // Build three digit stacks
  for (let i = 0; i < 3; i++) {
    const d = makeDigit();
    // Tag fractional digits (>= dotIndex) if any
    if (dotIndex >= 0 && i >= dotIndex) d.classList.add('is-frac');
    (dotIndex >= 0 && i >= dotIndex ? speedEl : intWrap).appendChild(d);
  }

  window.setRotorValue(speedEl, '000');
}

function buildCompactOdometer(speedEl, fmt) {
  if (!speedEl || !fmt) return;
  speedEl.innerHTML = '';

  // helper: one rolling digit with 0..9 stack
  const makeDigit = () => {
    const d = document.createElement('span');
    d.className = 'digit';
    const stack = document.createElement('span');
    stack.className = 'stack';
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.textContent = String(i);
      stack.appendChild(s);
    }
    d.appendChild(stack);
    return d;
  };

  const digits = String(fmt.digitsOnly || '').split(''); // e.g., "137"
  const hasFrac = typeof fmt.dotIndex === 'number' && fmt.dotIndex >= 0;
  const intLen = hasFrac ? fmt.dotIndex : digits.length;


// Create a wrapper for the integer digits so we can center the pill on them
const intWrap = document.createElement('span');
intWrap.className = 'int';
speedEl.appendChild(intWrap);

// Build digits: integers go in .int; fractional digits follow in the main container
for (let i = 0; i < digits.length; i++) {
  const d = makeDigit();
  if (hasFrac && i >= intLen) d.classList.add('is-frac'); // mark decimal part
  (i < intLen ? intWrap : speedEl).appendChild(d);
}

/* my code recommendation: */
// Add the spelled-out magnitude pill (hide if < 1,000 => unit '')
if (fmt.unit) {
  const tag = document.createElement('span');
  tag.className = 'magnitudeTag';
  tag.textContent = unitFull(fmt.unit);  // thousand / million / billion
  intWrap.appendChild(tag);              // centered on integer digits
}

  // roll stacks to the target number
  window.setRotorValue(speedEl, '000');
}

function attachRotorPill(speedEl, pillText) {
  if (!speedEl || !pillText) return;

  // Create or reuse the pill directly under .speedRead (full-width anchor)
  let tag = speedEl.querySelector('.magnitudeTag');
  if (!tag) {
    tag = document.createElement('span');
    tag.className = 'magnitudeTag';
    speedEl.appendChild(tag);
  }
  tag.textContent = String(pillText);
}

function attachTrendArrow(speedEl, dir, color) {
  if (!speedEl) return;

  // host element (above digits)
  let wrap = speedEl.querySelector('.trendArrow');
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.className = 'trendArrow'; // positioned by CSS
    speedEl.appendChild(wrap);
  }

  // svg element (reused if present)
  let svg = wrap.querySelector('svg.trendArrowSvg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

svg.setAttribute('class', 'trendArrowSvg');
svg.setAttribute('viewBox', '0 0 100 30');             // ↓ half-height box
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
svg.setAttribute('aria-hidden', 'true');

const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('class', 'arrow-shape');


    /* Concave-sided UP arrow shape:
       - Tip at (50,0)
       - Side curves bow inward using cubic Beziers
       - Base is a gentle arc (quadratic) */


/* my code recommendation: REPLACEMENT — focus.js */
/* Concave-sided UP arrow with a straight horizontal base */


path.setAttribute(
  'd',
  'M50,0 ' +                  // tip
  'A 70 70 0 0 0 88,30 ' +    // right side arc (bows inward toward center)
  'L 12,30 ' +                // base: perfectly horizontal
  'A 70 70 0 0 0 50,0 Z'      // left side arc back to tip
);

    svg.appendChild(path);
    wrap.appendChild(svg);
  }

  // orientation
  svg.classList.toggle('is-down', dir === 'down');
  svg.classList.toggle('is-up',   dir !== 'down'); // 'up' or 'flat' treated as up orientation

  // color via CSS variable (no inline fill)
  speedEl.style.setProperty('--trend-color', String(color ?? '#2b4d7d'));
};

async function handleTrendArrowClick(role) {
//4th insertion

window.emitIntent('TOGGLE_T12_TREND', { role, vessel: window.activeVesselName ?? null });
window.onToggleTrend({ role, vessel: window.activeVesselName ?? null });

//end 4th insertion


  const leftBucket  = document.getElementById('frame-calls');
  const rightBucket = document.getElementById('frame-connections');
  const hostBucket  = leftBucket ?? rightBucket;
  if (!hostBucket) return;

  
  /* my code recommendation: INSERTION — focus.js */
  /* Instant reveal hook: cancel any pending delayed reveal and show PowerCanvas + Table now */
  if (window.PCReveal && window.PCReveal.timer) { clearTimeout(window.PCReveal.timer); window.PCReveal.timer = null; }
  const leftForAnchor = document.getElementById('frame-calls') || hostBucket;
  const resultNow = pcRender({ type: 'table' }, leftForAnchor); // ensures table is present immediately
  const canvasNow = resultNow && resultNow.canvas ? resultNow.canvas : document.getElementById('powerCanvas');
  if (canvasNow) {
    const right = document.getElementById('frame-connections');
    const childH = Math.round(((right && right.clientHeight) || leftForAnchor.clientHeight) * 0.4);
    canvasNow.style.setProperty('--pc-child-h', String(childH) + 'px');
  }

  // (continue with existing logic below)


  // Ensure PowerCanvas exists; do NOT clear existing content
  const { canvas, contentHost } = pcRender({ type: 'chart' }, hostBucket);

  // Give children a consistent height (one third of right bucket height)
  const childH = Math.round((rightBucket?.clientHeight ?? hostBucket.clientHeight) *0.4);
  canvas.style.setProperty('--pc-child-h', `${childH}px`);

  // Find existing trend host (top slot) if any
  let trendHost = contentHost.querySelector('.pc-trend');

  // Determine the desired state (role + vessel)
  const vessel = window.activeVesselName ?? null;

// INSERT HERE 👉 set layout by role (no numeric scenes)
const rightBucketEl = document.getElementById('frame-connections');



if (rightBucketEl && rightBucketEl.classList.contains('focused')) {
  if (role === 'usage')       window.Scene.set('osp-usage');
  else if (role === 'kwh')    window.Scene.set('osp-impact');
  else if (role === 'connections') window.Scene.set('osp'); // no separate "connections" layout
  else                         window.Scene.set('osp');
}




  const desiredRole   = role;
  const desiredVessel = vessel ?? '';
refreshOpenTrendFor(window.activeVesselName ?? null);
  // If a trend is already showing and matches this role+vessel → TOGGLE OFF

/* my code recommendation: REPLACEMENT — focus.js */
/* Toggle OFF: fade the chart and (if it will be empty) the canvas, then remove both */
if (trendHost && trendHost.dataset.role === role && trendHost.dataset.vessel === (window.activeVesselName ?? '')) {
  const canvas = document.getElementById('powerCanvas');
  const willBeEmpty =
    !contentHost.querySelector('.pc-chart') &&
    !contentHost.querySelector('.pc-table-host .pc-table'); // only trend is present

  // 1) Start chart fade (always)
  trendHost.classList.add('is-fading');

  // 2) If canvas will be empty after this removal, start canvas fade too
  if (canvas && willBeEmpty) {
    canvas.classList.add('is-fading');     // drive opacity → 0
    canvas.classList.remove('is-visible'); // ensure we're not holding it at 1
  }

  // Force a reflow so transitions actually run before we remove anything
  void trendHost.offsetWidth;

  // 3) When the chart fade completes, remove the chart
  const onChartFadeEnd = () => {
    trendHost.remove();

    // 4) If canvas was set to fade (empty after removal), remove it after its fade completes
    if (canvas && willBeEmpty) {
      const onCanvasFadeEnd = () => canvas.remove();
      canvas.addEventListener('transitionend', onCanvasFadeEnd, { once: true });

      // Safety timeout: remove even if transitionend doesn’t fire
      setTimeout(onCanvasFadeEnd, 400);
    }
  };

  trendHost.addEventListener('transitionend', onChartFadeEnd, { once: true });

  // Safety timeout for the chart as well
  setTimeout(onChartFadeEnd, 400);

  return;
}


  // Otherwise ensure there is a trend host and draw/refresh for the new role
  if (!trendHost) {
    trendHost = document.createElement('div');
    trendHost.className = 'pc-trend';
    contentHost.insertBefore(trendHost, contentHost.firstChild); // always top
  }

  // Track what's being displayed for robust toggling next time
  trendHost.dataset.role   = desiredRole;
  trendHost.dataset.vessel = desiredVessel;

  // Map rotor role → series key + legend label
  const cfg = {
    usage:       { key: 'usageRate',   label: 'Usage Rate' },
    connections: { key: 'connections', label: 'Connections' },
    kwh:         { key: 'kwh',         label: 'kWh Provided' }
  }[desiredRole];
  if (!cfg) return;

  // Draw chart for this role (respect vessel filter)

  await charts.getT12Trend({ vesselName: desiredVessel }); // ensure cache is ready
  charts.drawT12Trend(trendHost, {
    seriesKey:   cfg.key,
    legendLabel: cfg.label,
    vesselName:  desiredVessel
  });

  // Refresh canvas sizing/placement after content changes
  pcSizeFor(canvas, { type: 'chart' }, hostBucket);
  pcPlace(canvas, hostBucket);
}

document.addEventListener('click', (e) => {
  console.log("you poked my heart 3");
  const kwhEl = e.target.closest('.baseStats[data-role="kwh"]');
  if (!kwhEl) {console.log('you missed the kwh rotor!'); return};
  const bucket = kwhEl.closest('.kpiBucket');
  if (!bucket) return;
  
  if (bucket.classList.contains('focused')) {
    e.stopPropagation();         // avoid double-handling
    bucket.click();              // triggers the existing "unfocus + reset" behavior
    return;
  }

  // Otherwise, do nothing (no escalation to level 2).
  // Future: re-enable by setting bucket.dataset.focus = '2' when level-2 is supported.
});

/* my code recommendation: */
// Set rotor to a specific (x,y) within the bucket coordinate space
function setRotorXY(bucket, x, y) {
  const rotor = bucket.querySelector('.baseStats');
  if (!rotor) return;
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;
  rotor.style.setProperty('--rotor-x', `${x - cx}px`);
  rotor.style.setProperty('--rotor-y', `${y - cy}px`);
}

// Snap rotor to one of our 5 probe points (indices: 0..4 per computeProbePositions)
async function setRotorToProbe(bucket, index, timeoutMs = 600) {
  const pts = computeProbePositions(bucket);         // already added earlier
  const p = pts[index];
  setRotorXY(bucket, p.x, p.y);
  const rotor = bucket.querySelector('.baseStats');
  if (rotor) await waitForTransitionEndOnce(rotor, timeoutMs); // you already have this
}

(() => {
  function rf_setXY(bucket, x, y, rotorEl) {
    if (!rotorEl) return;
    const cx = bucket.clientWidth / 2;
    const cy = bucket.clientHeight / 2;
    rotorEl.style.setProperty('--rotor-x', `${x - cx}px`);
    rotorEl.style.setProperty('--rotor-y', `${y - cy}px`);
  }


/* my code recommendation: */
const toIdx = h => Math.max(0, Math.min(4, (h ?? 1) - 1));


  function rf_toProbe(bucket, rotorEl, index = 0) {
    const pts = window.computeProbePositions(bucket);
    const p = pts[index] || pts[0];
    rf_setXY(bucket, p.x, p.y, rotorEl);
  }

  function rf_toCenter(bucket, rotorEl) { rf_toProbe(bucket, rotorEl, 0); }
  function rf_show(el)  { el?.classList.remove('is-hidden'); }
  function rf_hide(el)  { el?.classList.add('is-hidden'); }
  function rf_scale(el, s) { el?.style.setProperty('--rotor-scale', String(s)); }



/* my code recommendation: */
function rf_adopt(bucket, selOrEl, role, startAtHuman = 1) {
  const el = typeof selOrEl === 'string' ? bucket.querySelector(selOrEl) : selOrEl;
  if (!el) return null;
  el.classList.add('baseStats');
  if (role) el.dataset.role = role;

  // PRE-SET POSITION VARS before reveal
  const pts = window.computeProbePositions(bucket);
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;
  const idx = Math.max(0, Math.min(4, (startAtHuman ?? 1) - 1));
  const p   = pts[idx] ?? pts[0];
  el.style.setProperty('--rotor-x', `${p.x - cx}px`);
  el.style.setProperty('--rotor-y', `${p.y - cy}px`);

  return el;
}




/* my code recommendation: */
function rf_create(bucket, { role, id } = {}, startAtHuman = 1) {
  const el = document.createElement('div');
  el.className = 'baseStats';
  if (role) el.dataset.role = role;
  if (id) el.id = id;

  // PRE-SET POSITION VARS *before* appending to the DOM
  const pts = window.computeProbePositions(bucket);
  const cx = bucket.clientWidth / 2;
  const cy = bucket.clientHeight / 2;
  const idx = Math.max(0, Math.min(4, (startAtHuman ?? 1) - 1));
  const p   = pts[idx] ?? pts[0];
  el.style.setProperty('--rotor-x', `${p.x - cx}px`);
  el.style.setProperty('--rotor-y', `${p.y - cy}px`);

  bucket.appendChild(el);          // append AFTER vars are set
  return el;
}



  window.RotorFactory = {
    adopt:  rf_adopt,
    create: rf_create,
    toProbe: rf_toProbe,
    toCenter: rf_toCenter,
    show: rf_show,
    hide: rf_hide,
    scale: rf_scale,
    setXY: rf_setXY
  };
})();


/* my code recommendation: */
// Build the kWh rotor markup (odometer + label)
function buildKwhRotorContent(rotorEl, kwhValue) {
  // Odometer container
  const speed = document.createElement('div');
  speed.className = 'speedRead';
  speed.id = 'kwhRotorValue';

  // Label under the odometer
  const label = document.createElement('div');
  label.className = 'baseLabel';
  label.textContent = 'kWh Provided';

  rotorEl.appendChild(speed);
  rotorEl.appendChild(label);

  // Initialize & roll odometer to the provided value
  window.Helpers.initOdometer(speed, Math.round(kwhValue));
  window.Helpers.rollOdometer(speed, Math.round(kwhValue));
}


/* my code recommendation: */
function unitFull(u) {
  switch (u) {
    case 'k': return 'Thousand';
    case 'M': return 'Million';
    case 'B': return 'Billion';
    default:  return '';
  }
}

/* my code recommendation: REPLACEMENT — focus.js */
/* kWh rotor: use T12 trend + SVG arrow 
async function dR_kWh() {
  const bucketId = 'frame-connections';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="kwh"]');
  if (existing) return existing;

  
// const trend = await window.ensureT12Trend();
const trend = await charts.getT12Trend({});


  const kwhT = trend.series.kwh;

  return setupRotor({
    role: 'kwh',
    bucketId,
    labelText: 'kWh Provided',
    pillText: (val) => {
      const fmt = formatKwhCompact(val ?? 0);
      return fmt?.unit ? (unitFull(fmt.unit) + ' kWh') : '';
    },
    valueGetter: window.cruncher.getT12KwhTotal,

    // build + arrow (SVG concave sides; color via trend mapping)


/* my code recommendation: REPLACEMENT — focus.js */
/* dR_kWh digitsRenderer: render digits, draw arrow, toggle trend on click 
digitsRenderer: (speedEl, val) => {
  // Render compact kWh (three digits; may include tenths depending on magnitude)
  const fmt = formatKwhCompact(val ?? 0);
  buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);

  // Draw the arrow with direction/color from the T12 trend
  attachTrendArrow(speedEl, kwhT.dir, kwhT.color);

  // Precise click handler on the arrow (wrapper & SVG), capture phase
  const arrowWrap = speedEl.querySelector('.trendArrow');
  const arrowSvg  = speedEl.querySelector('.trendArrowSvg');

  const onArrow = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    handleTrendArrowClick('kwh');     // toggles the kWh Provided trend chart
  };

  //arrowWrap?.addEventListener('click', onArrow, { capture: true });
  //arrowSvg ?.addEventListener('click', onArrow, { capture: true });
},



    // roll the three stacks to target digits
    digitsRoller: (speedEl, val) => {
      const fmt = formatKwhCompact(val ?? 0);
      window.setRotorValue(speedEl, fmt.digitsOnly ?? '');
    },

    appearWhen: 'focus',
    hideWhen: 'blur',
    startHidden: true,
    syncReveal: 'transitionEnd',
    positions: { 'osp': 2, 'osp-impact': 5 }
  });
}
*/

/* my code recommendation: REPLACEMENT — focus.js */
/* Usage Rate rotor: use T12 trend + SVG arrow 
async function dR_usage() {
  const bucketId = 'frame-connections';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="usage"]');
  if (existing) return existing;

  
// const trend = await window.ensureT12Trend();
const trend = await charts.getT12Trend({});

  const useT = trend.series.usageRate; // 0..1.25 (rate)

  return setupRotor({
    role: 'usage',
    bucketId,
    labelText: 'Shore Power Usage',
    pillText: 'Usage Rate',
    valueGetter: window.cruncher.getT12UsageRatePercent,


/* my code recommendation: REPLACEMENT — focus.js 
/* dR_usage digitsRenderer: render digits, draw arrow, toggle trend on click 
digitsRenderer: (speedEl, val) => {
  // Render 2 integer digits + tenths
  const fmt = formatPercentCompact(val ?? 0);
  buildFixed3Odometer(speedEl, fmt.digitsOnly, fmt.dotIndex);

  // Draw the arrow with direction/color from the T12 trend
  attachTrendArrow(speedEl, useT.dir, useT.color);

  // Precise click handler on the arrow (wrapper & SVG), capture phase
  const arrowWrap = speedEl.querySelector('.trendArrow');
  const arrowSvg  = speedEl.querySelector('.trendArrowSvg');

  const onArrow = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    handleTrendArrowClick('usage');   // toggles the Usage Rate trend chart
  };

  //arrowWrap?.addEventListener('click', onArrow, { capture: true });
  //arrowSvg ?.addEventListener('click', onArrow, { capture: true });
},



    // roll the three stacks to target digits
    digitsRoller: (speedEl, val) => {
      const fmt = formatPercentCompact(val ?? 0);
      window.setRotorValue(speedEl, fmt.digitsOnly ?? '');
    },

    appearWhen: 'focus',
    hideWhen: 'blur',
    startHidden: true,
    syncReveal: 'transitionEnd',
    positions: { 'osp': 4, 'osp-usage': 2 }
  });
}
*/

/* my code recommendation: 
// Connections count rotor (T12), 3-digit, no fractional — RIGHT bucket
async function dR_connections() {
  const bucketId = 'frame-connections';
  const bucket = document.getElementById(bucketId);
  if (!bucket) return null;

  const existing = bucket.querySelector('.baseStats[data-role="connections"]');
  if (existing) return existing;

  /* my code recommendation: 
  const { t12ConnectionsCount } = await window.fillBuckets();
  const connCount = t12ConnectionsCount;


/* my code recommendation: REPLACEMENT — focus.js 
/* Replace ONLY the setupRotor(...) block inside dR_connections(...) 

// const trend = await window.ensureT12Trend();
const trend = await charts.getT12Trend({});

const connT = trend.series.connections;

return setupRotor({
  role: 'connections',
  bucketId,
  labelText: 'Connections',
  pillText: 'Connections',
  valueGetter: window.cruncher.getT12ConnectionCount,



/* my code recommendation: REPLACEMENT — focus.js 
/* dR_connections digitsRenderer: render digits, draw arrow, toggle trend on click 
digitsRenderer: (speedEl, val) => {
  // Render 3 fixed digits (no fractional)
  const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
  buildFixed3Odometer(speedEl, s, -1);

  // Draw the arrow with direction/color from the T12 trend
  attachTrendArrow(speedEl, connT.dir, connT.color);

  // Precise click handler on the arrow (wrapper & SVG), capture phase
  const arrowWrap = speedEl.querySelector('.trendArrow');
  const arrowSvg  = speedEl.querySelector('.trendArrowSvg');



const onArrow = (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();

  const rightBucket = document.getElementById('frame-connections');
  const isRightFocused = !!rightBucket && rightBucket.classList.contains('focused');

  if (!isRightFocused) {
    // Ignore until the KPI bucket is focused
    return;
  }

  // Proceed: toggle the Connections trend chart
  handleTrendArrowClick('connections');
};


  //arrowWrap?.addEventListener('click', onArrow, { capture: true });
  //arrowSvg ?.addEventListener('click', onArrow, { capture: true });
},


  digitsRoller: (speedEl, val) => {
    const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
    window.setRotorValue(speedEl, s);
  },
  appearWhen: 'always',
  hideWhen: 'never',
  startHidden: false, syncReveal: 'transitionEnd',
  
positions: {
  "": 1,
  "osp": 5,
  "osp-usage": 5,
  "osp-impact": 5
}

});


}
*/

/*
// Ship calls count rotor (T12), 3-digit, no fractional — LEFT bucket
async function dR_calls() {
  const bucketId = 'frame-calls';
  //const bucket = document.getElementById(bucketId);
  //if (!bucket) return null;

  //const existing = bucket.querySelector('.baseStats[data-role="calls"]');
  //if (existing) return existing;


  const { t12Calls } = await window.fillBuckets(); // arrival ∈ T12
  const callCount = t12Calls.length;

const trend = await charts.getT12Trend({});

const callsT = trend.series.calls;


return setupRotor({
  role: 'calls',
  bucketId,
  labelText: 'Ship Calls (T12)',
  pillText: 'Ship Calls',
  valueGetter: window.cruncher.getT12CallCount,

  digitsRenderer: (speedEl, val) => {
    const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
    buildFixed3Odometer(speedEl, s, -1);
    attachTrendArrow(speedEl, callsT.dir, callsT.color);
  },
  digitsRoller: (speedEl, val) => {
    const s = String(Math.max(0, Math.floor(val ?? 0))).padStart(3, '0');
    window.setRotorValue(speedEl, s);
  },
  appearWhen: 'always',
  hideWhen: 'never',
  startHidden: false, syncReveal: 'transitionEnd',
  positions: { 0: 1, 1: 1, 2: 1 }
});


}
*/