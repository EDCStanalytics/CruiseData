// ../JavaScripts/calendar-dialog.js
document.addEventListener("DOMContentLoaded", () => {
  //---------------------------------------------------------------------------
  // OPTIONAL DEBUG SWITCH (set to true to see logs in console)
  //---------------------------------------------------------------------------
  const DEBUG_ON = false;
  const D = (...args) => { if (DEBUG_ON) console.log("[CAL]", ...args); };
  const W = (...args) => { if (DEBUG_ON) console.warn("[CAL][WARN]", ...args); };
  const E = (...args) => { console.error("[CAL][ERROR]", ...args); };

  //---------------------------------------------------------------------------
  // ELEMENT REFERENCES
  //---------------------------------------------------------------------------
  const openPier12Btn     = document.getElementById("openPier12Btn");
  const calendarDialog    = document.getElementById("calendarDialog");
  const closeCalendarBtn  = document.getElementById("closeCalendarBtn");

  const monthYearEl       = document.getElementById("monthYear");
  const gridEl            = document.getElementById("calendarGrid");
  const prevBtn           = document.getElementById("prevBtn");
  const nextBtn           = document.getElementById("nextBtn");
  const routePanel        = document.getElementById("routePanel");

  if (!openPier12Btn || !calendarDialog || !closeCalendarBtn ||
      !monthYearEl || !gridEl || !prevBtn || !nextBtn || !routePanel) {
    E("Calendar dialog wiring error: missing elements.", {
      openPier12Btn, calendarDialog, closeCalendarBtn,
      monthYearEl, gridEl, prevBtn, nextBtn, routePanel
    });
    return;
  }

  //---------------------------------------------------------------------------
  // CONFIG
  //---------------------------------------------------------------------------
  const DATA_URL      = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Data/ShipSchedules.csv";
  const DATE_COLUMN   = "Date";
  const PORT_COLUMN   = "Port";
  const VESSEL_CANDIDATES     = ["Vessel","VesselName","Vessel Name","ShipName","Ship","Ship_Name","Vessel_Name"];
  const INCLUDED_CANDIDATES   = ["Included","Include?","included","INCLUDED"];
  // NOTE: We no longer depend on ItineraryID; the list is kept in case needed elsewhere.
  const ITINERARY_CANDIDATES  = ["ItineraryID","Itinerary ID","Itinerary_Id","Itinerary","Itenary ID","itinerary_id","itin_id","ItinID"];

  let VESSEL_COLUMN = null;

  // Keep the original behavior of starting in 2026
  let currentYear  = 2026;
  let currentMonth = new Date().getMonth();

  //---------------------------------------------------------------------------
  // DATA STORES
  //---------------------------------------------------------------------------
  // NYC-only icons (any NYC calls)
  let callsByDayNYC   = new Map();  // Map<"YYYY-MM-DD", count>
  let vesselsByDayNYC = new Map();  // Map<"YYYY-MM-DD", string[]>

  // Day -> vessels (Included == yes only), for context/tooltip (kept from original)
  let vesselsByAnyDay = new Map();

  // Raw rows: {date, vessel, port, included:boolean, itinId:string|null, _row:number}
  let allRows = [];
  let includedColumnMissing  = false;

  // NEW: Vessel index (irrespective of itinerary)
  // vessel -> Row[]
  let rowsByVessel = new Map();

  let callsLoaded = false;

  // For clicked-day highlight
  let lastSelectedCell = null;
  let lastSelectedKey  = null;

  //---------------------------------------------------------------------------
  // MONTH + DAY NAMES
  //---------------------------------------------------------------------------
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  //---------------------------------------------------------------------------
  // HELPERS
  //---------------------------------------------------------------------------
  const pad2 = n => String(n).padStart(2, "0");
  const keyFromDate = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const keyFromYMD  = (y,m,d) => `${y}-${pad2(m+1)}-${pad2(d)}`;

  // Converts "YYYY-MM-DD" -> Date (local, midnight)
  function dateFromKey(k){
    const [y, m, d] = k.split("-").map(Number);
    const dt = new Date(y, (m - 1), d);
    dt.setHours(0,0,0,0);
    return dt;
  }

  // Find the next date (strictly after 'afterDate') that has at least one NYC call
  function getNextNYCDate(afterDate){
    let next = null;
    for (const k of callsByDayNYC.keys()){
      const dt = dateFromKey(k);
      if (dt > afterDate && (!next || dt < next)){
        next = dt;
      }
    }
    return next; // Date or null
  }

  function sameDay(a,b){
    return a.getFullYear()===b.getFullYear()
        && a.getMonth()===b.getMonth()
        && a.getDate()===b.getDate();
  }

  function splitCSVLine(line) {
    return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
               .map(v => v.replace(/^"(.*)"$/, "$1").replace(/""/g,'"').trim());
  }

  function parseDateFlexible(s){
    if (!s) return null;
    // drop any time portion
    s = s.split(" ")[0];
    let m;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(+m[3], +m[1]-1, +m[2]);
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
    m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  function isNYCPort(str){
    if (!str) return false;
    const p = str.toLowerCase();
    return (p.includes("new york") || p.includes("nyc") || p.includes("manhattan") || p.includes("brooklyn"));
  }

  function normalizeYes(v){
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === "yes" || s === "y" || s === "true" || s === "1";
  }

  // Build compact stop objects from vessel rows (rows must be sorted by date)
  // Each stop: { port, dates:[Date], firstDate:Date, lastDate:Date, stopIndex:number }
  function buildStopsFromRows(rows) {
    const stops = [];
    for (const r of rows) {
      const p = r.port || "Unknown";
      if (!stops.length || stops[stops.length-1].port !== p) {
        stops.push({ port: p, dates: [r.date], firstDate: r.date, lastDate: r.date });
      } else {
        const s = stops[stops.length-1];
        s.dates.push(r.date);
        if (r.date < s.firstDate) s.firstDate = r.date;
        if (r.date > s.lastDate)  s.lastDate  = r.date;
      }
    }
    stops.forEach((s,i) => { s.stopIndex = i+1; });
    return stops;
  }

  // Find current stop index for clicked date
  function findCurrentStopIndex(stops, clickedDate) {
    if (!stops.length) return -1;
    for (let i=0;i<stops.length;i++){
      const s = stops[i];
      if (s.firstDate <= clickedDate && clickedDate <= s.lastDate) return i;
      if (s.dates.some(d => sameDay(d, clickedDate))) return i;
    }
    // nearest before
    let beforeIdx = -1;
    for (let i=0;i<stops.length;i++){
      if (stops[i].lastDate <= clickedDate) beforeIdx = i;
      else break;
    }
    if (beforeIdx !== -1) return beforeIdx;
    // first after
    for (let i=0;i<stops.length;i++){
      if (stops[i].firstDate >= clickedDate) return i;
    }
    return -1;
  }

  // Slice last K and next K around index
  function sliceAroundIndex(stops, idx, prevCount=3, nextCount=3) {
    if (idx < 0) return { prev: [], curr: null, next: [] };
    const startPrev = Math.max(0, idx - prevCount);
    const prev = stops.slice(startPrev, idx);
    const curr = stops[idx] || null;
    const next = stops.slice(idx+1, idx+1+nextCount);
    return { prev, curr, next };
  }

  function formatPorts(stops) {
    return stops.map(s => s.port || "Unknown").join(" → ");
  }

  //---------------------------------------------------------------------------
  // LOAD CSV
  //---------------------------------------------------------------------------
  async function ensureCallsLoaded(){
    if (callsLoaded) return;

    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) { E("Fetch failed", res.status, res.statusText); return; }

    const text = await res.text();
    const rawLines = text.split(/\r?\n/);
    const lines = rawLines.filter(l => l && l.trim().length > 0);
    if (!lines.length) { E("CSV appears empty."); return; }

    const headers = splitCSVLine(lines[0]);

    const dateIdx   = headers.indexOf(DATE_COLUMN);
    const portIdx   = headers.indexOf(PORT_COLUMN);

    let vesselIdx = headers.findIndex(h => VESSEL_CANDIDATES.includes(h));
    if (vesselIdx !== -1) VESSEL_COLUMN = headers[vesselIdx];

    let includedIdx = -1;
    for (const h of INCLUDED_CANDIDATES){
      const i = headers.indexOf(h);
      if (i !== -1){ includedIdx = i; break; }
    }
    if (includedIdx === -1) {
      includedColumnMissing = true;
      W("Included column not found. Will consider all rows for route panel.");
    }

    // We no longer rely on ItineraryID, but we won't error if present
    let itineraryIdx = -1;
    for (const h of ITINERARY_CANDIDATES){
      const i = headers.indexOf(h);
      if (i !== -1){ itineraryIdx = i; break; }
    }

    const NYC_counts = new Map();
    const NYC_names  = new Map();

    for (let i=1;i<lines.length;i++){
      const cols = splitCSVLine(lines[i]);
      if (!cols || cols.length === 0) continue;

      const dt = dateIdx !== -1 ? parseDateFlexible(cols[dateIdx]) : null;
      if (!dt) continue;

      const vessel = vesselIdx !== -1 ? (cols[vesselIdx]||"").trim() : null;
      const port   = portIdx   !== -1 ? (cols[portIdx]||"").trim()   : "";

      const incVal = includedIdx !== -1 ? cols[includedIdx] : null;
      const isInc  = includedIdx === -1 ? false : normalizeYes(incVal);

      const itinIdRaw = itineraryIdx !== -1 ? (cols[itineraryIdx] || "").trim() : "";
      const itinId    = itinIdRaw || null;

      const row = { date: dt, vessel, port, included: isInc, itinId, _row: i };
      allRows.push(row);

      // day→vessels (Included only) for tooltip/context
      if (isInc && vessel){
        const k = keyFromDate(dt);
        const list = vesselsByAnyDay.get(k) || [];
        list.push(vessel);
        vesselsByAnyDay.set(k, list);
      }

      // NYC icons (any NYC calls)
      if (isNYCPort(port)){
        const k = keyFromDate(dt);
        NYC_counts.set(k, (NYC_counts.get(k)||0) + 1);
        const arr = NYC_names.get(k) || [];
        if (vessel) arr.push(vessel);
        NYC_names.set(k,arr);
      }

      // NEW: Collect per-vessel rows irrespective of itinerary
      if (vessel) {
        const arr = rowsByVessel.get(vessel) || [];
        arr.push(row);
        rowsByVessel.set(vessel, arr);
      }
    }

    // Sort each vessel's rows chronologically (then by original row order)
    for (const [v, rows] of rowsByVessel) {
      rows.sort((a,b) => {
        const t = a.date - b.date;
        return t !== 0 ? t : ((a._row ?? 0) - (b._row ?? 0));
      });
    }

    callsByDayNYC   = NYC_counts;
    vesselsByDayNYC = NYC_names;

    callsLoaded = true;
    D("Loaded rows", {
      totalRows: allRows.length,
      vessels: rowsByVessel.size,
      nycDays: callsByDayNYC.size
    });
  }

  //---------------------------------------------------------------------------
  // RENDER CALENDAR
  //---------------------------------------------------------------------------
  function renderCalendar(month, year){
    gridEl.innerHTML = "";
    monthYearEl.textContent = `${monthNames[month]} ${year}`;

    // DOW header
    dayNames.forEach(d => {
      const el = document.createElement("div");
      el.className = "calendar__dow";
      el.textContent = d;
      gridEl.appendChild(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();

    for (let i=0;i<firstDay;i++){
      const empty = document.createElement("div");
      empty.className = "calendar__cell calendar__cell--empty";
      gridEl.appendChild(empty);
    }

    const today = new Date(); today.setHours(0,0,0,0);
    lastSelectedCell = null;

    for (let d=1; d<=daysInMonth; d++){
      const cell = document.createElement("div");
      cell.className = "calendar__cell";
      cell.style.position="relative";
      cell.textContent = d;
      cell.tabIndex = 0;

      const cellDate = new Date(year,month,d);
      cellDate.setHours(0,0,0,0);
      const key = keyFromYMD(year, month, d);

      if (sameDay(cellDate, today)){
        cell.classList.add("calendar__cell--today");
      }
      if (key === lastSelectedKey){
        cell.classList.add("calendar__cell--selected");
        lastSelectedCell = cell;
      }

      // NYC glyphs (all NYC calls)
      const countNYC   = callsByDayNYC.get(key)   || 0;
      const vesselsNYC = vesselsByDayNYC.get(key) || [];

      if (countNYC > 0){
        const isPast = cellDate < today;
        const icon = document.createElement("span");
        icon.style.cssText = `
          position:absolute; bottom:4px; left:50%; transform:translateX(-50%);
          width:16px; height:16px; line-height:0;
          ${isPast ? "opacity:0.55; filter:grayscale(40%);" : ""}
        `;
        icon.innerHTML = `
          <svg viewBox="0 0 64 64" width="25" height="25" aria-hidden="true">
            <path d="M6 44h40l8-8h4c0 6-8 16-20 16H14C10 52 6 49 6 44z" fill="#2b6cb0"></path>
            <path d="M10 40h30l6-6H16l-6 6z" fill="#2b6cb0"></path>
            <rect x="20" y="26" width="18" height="8" fill="#2b6cb0"></rect>
            <rect x="24" y="22" width="10" height="5" fill="#2b6cb0"></rect>
            <rect x="34" y="18" width="4" height="6" fill="#2b6cb0"></rect>
          </svg>
        `;
        cell.appendChild(icon);
    //    cell.title = vesselsNYC.join(", ");
      }

      //---------------------------------------------------------------------
      // CLICK → ROUTE PANEL (NYC-only last 3 / current / next 3, PER SHIP),
      // IRRESPECTIVE OF ITINERARY ID
      //---------------------------------------------------------------------
      cell.addEventListener("click", () => {
        // highlight clicked day
        if (lastSelectedCell && lastSelectedCell !== cell) {
          lastSelectedCell.classList.remove("calendar__cell--selected");
        }
        cell.classList.add("calendar__cell--selected");
        lastSelectedCell = cell;
        lastSelectedKey  = key;

        // NYC-only gate: if no NYC calls on this day, show a note + next NYC stop
        const nycCountForDay = callsByDayNYC.get(key) || 0;
        if (nycCountForDay === 0) {
          const nextNYC = getNextNYCDate(cellDate);
          routePanel.style.display = "block";
          routePanel.innerHTML = `
            <div>
              <div style="font-weight:700; margin-bottom:8px;">
                ${cellDate.toLocaleDateString()}
              </div>
              <b>No NYC stop today.</b>
              <div style="margin-top:6px; color:#666;">
                Next NYC stop scheduled on ${ nextNYC ? nextNYC.toLocaleDateString() : "—" }.
              </div>
            </div>
          `;
          return;
        }

        routePanel.style.display = "block";

        // Use the vessels known to be in NYC on this day (already collected for the icon/tooltip)
        const vesselsHere = Array.from(new Set(vesselsByDayNYC.get(key) || []));

        if (!vesselsHere.length) {
          routePanel.innerHTML = `
            <b>No ship data found for ${cellDate.toLocaleDateString()}.</b>
            <div style="margin-top:6px; color:#666;">No vessels listed for NYC calls on this date.</div>
          `;
          return;
        }

        const sections = [];

        for (const vessel of vesselsHere) {
          // Grab all rows for this vessel (irrespective of itinerary).
          // If we have an Included column, keep only included rows; otherwise use all rows.
          let rowsForVessel = rowsByVessel.get(vessel) || [];
         
          // Confirm this vessel truly has an NYC row on the clicked date (defensive)
          const inNYCToday = rowsForVessel.some(r => sameDay(r.date, cellDate) && isNYCPort(r.port));
          if (!inNYCToday) continue;

          // Build compact stop list from *all* rows this vessel has
          const stops = buildStopsFromRows(rowsForVessel);

          // Locate current stop index around the clicked date
          const currIdx = findCurrentStopIndex(stops, cellDate);

          // Slice last 3 / current / next 3
          const sliced  = sliceAroundIndex(stops, currIdx, 3, 3);

          const prevStr = sliced.prev.length ? formatPorts(sliced.prev) : "No previous stops for this ship.";
          const currStr = sliced.curr ? (sliced.curr.port || "Unknown") : "—";
          const nextStr = sliced.next.length ? formatPorts(sliced.next) : "There are no upcoming stops in the current voyage.";

          // Optional: overall min->max range this vessel has in the dataset (informational)
          const rangeLabel = (() => {
            if (!rowsForVessel.length) return "";
            const s = rowsForVessel[0].date;
            const e = rowsForVessel[rowsForVessel.length - 1].date;
            const f = { month: "short", day: "numeric" };
            return `${s.toLocaleDateString(undefined, f)} – ${e.toLocaleDateString(undefined, f)}`;
          })();

          sections.push(`
            <section style="border:1px solid #ddd; padding:10px; border-radius:6px; margin:10px 0;">
              <div style="font-weight:700;">${vessel}</div>
              <div style="margin-top:10px;">
                <div><span style="font-weight:600;">Last 3 Stops:</span> ${prevStr}</div>
                <div style="margin-top:6px;"><span style="font-weight:600;">Current:</span> ${currStr}</div>
                <div style="margin-top:6px;"><span style="font-weight:600;">Next 3 Stops:</span> ${nextStr}</div>
              </div>
            </section>
          `);
        }

        if (!sections.length) {
          routePanel.innerHTML = `
            <b>No ship-specific NYC stops found on ${cellDate.toLocaleDateString()}.</b>
            <div style="margin-top:6px; color:#666;">No eligible rows for vessels calling NYC on this date.</div>
          `;
          return;
        }

        routePanel.innerHTML = `
          <div>
            <div style="font-weight:700; margin-bottom:8px;">
              ${cellDate.toLocaleDateString()}
            </div>
            ${sections.join("")}
          </div>
        `;
      });

      gridEl.appendChild(cell);
    }
  }

  //---------------------------------------------------------------------------
  // DIALOG + BUTTON WIRES
  //---------------------------------------------------------------------------
  function openDialogSafe(d){
    if (d.showModal) d.showModal();
    else d.setAttribute("open","");
  }
  function closeDialogSafe(d){
    if (d.close) d.close();
    else d.removeAttribute("open");
  }

  openPier12Btn.addEventListener("click", async (e)=>{
    e.preventDefault();
    await ensureCallsLoaded();
    currentYear  = 2026; // preserve original behavior
    currentMonth = new Date().getMonth();
    renderCalendar(currentMonth, currentYear);
    openDialogSafe(calendarDialog);
  });

  closeCalendarBtn.addEventListener("click", () => closeDialogSafe(calendarDialog));

  // close when clicking outside dialog content
calendarDialog.addEventListener("click", (e) => {
  // Close only if the actual backdrop was clicked
  if (e.target === calendarDialog) {
    closeDialogSafe(calendarDialog);
  }
});


  //---------------------------------------------------------------------------
  // MONTH NAVIGATION
  //---------------------------------------------------------------------------
  prevBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    currentMonth--;
    if (currentMonth<0){ currentMonth=11; currentYear--; }
    renderCalendar(currentMonth,currentYear);
  });

  nextBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    currentMonth++;
    if (currentMonth>11){ currentMonth=0; currentYear++; }
    renderCalendar(currentMonth,currentYear);
  });
});
