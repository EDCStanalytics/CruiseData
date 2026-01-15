
/**
 * combineCruise.js
 * Fetches three CSVs from GitHub (Vessel, Calls, Shore Power),
 * combines them in-memory, and triggers a browser download of `combo.xlsx`.
 *
 * Usage (in your HTML):
 *   https://cdn.jsdelivr.net/npm/xlsx@0.19.3/dist/xlsx.full.min.js</script>
 *   combineCruise.js</script>
 *   <button onclick="CruiseExporter.download()">Download combined Excel</button>
 */


(function (global) {
  // --- 1) CSV source URLs (RAW GitHub endpoints) ---
  const RAW_VESSEL = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/dataExport/Data/VesselData_Cruise.csv";
  const RAW_CALLS  = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/dataExport/Data/CallData_Cruise.csv";
  const RAW_POWER  = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/dataExport/Data/ShorePowerData_Cruise.csv";

  // --- 2) Minimal CSV -> array of objects (handles quotes/commas/newlines) ---
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (inQuotes) {
        if (c === '"') {
          if (next === '"') { cell += '"'; i++; } else { inQuotes = false; }
        } else { cell += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\r') { /* ignore CR */ }
        else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else { cell += c; }
      }
    }
    if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
    if (rows.length === 0) return { header: [], data: [] };
    const header = rows[0].map(h => (h || '').trim());
    const data = rows.slice(1).map(r => {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
    return { header, data };
  }

  // --- 3) Helpers ---
  const cleanUsage = (raw) => {
    if (raw == null) return '';
    const s = String(raw).replace(/"/g, '').replace(/,/g, '').trim();
    if (!s) return '';
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  };
  const IMOFromCallID = (callId) => {
    if (!callId) return '';
    const i = callId.indexOf('-');
    return i > -1 ? callId.slice(0, i) : callId;
  };
  function fillNA(rows, headers) {
    for (const row of rows) {
      for (const h of headers) {
        const val = row[h];
        if (val === undefined || val === null || String(val).trim() === '') {
          row[h] = 'NA';
        }
      }
    }
    return rows;
  }

  // --- 4) Fetch utility ---
  async function fetchText(url) {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    return res.text();
  }

  // --- 5) Build combined + keep raw parsed datasets ---
  async function buildCombinedRows() {
    const [vesselCSV, callsCSV, powerCSV] = await Promise.all([
      fetchText(RAW_VESSEL),
      fetchText(RAW_CALLS),
      fetchText(RAW_POWER)
    ]);

    const vessel = parseCSV(vesselCSV);   // headers: Vessel,IMO,Line,YearOfConstruction
    const calls  = parseCSV(callsCSV);    // headers: CallID,VesselName,ArrivalDate,Arrival,DepartDate,Depart
    const power  = parseCSV(powerCSV);    // headers: CallID,ConnectionDate,DisconnectionDate,Connect,Disconnect,Usage(kWh)

    // Index vessel by IMO
    const vesselByIMO = new Map();
    for (const v of vessel.data) {
      vesselByIMO.set(v['IMO'], {
        Vessel: v['Vessel'] || '',
        IMO: v['IMO'] || '',
        Line: v['Line'] || '',
        YearOfConstruction: v['YearOfConstruction'] || ''
      });
    }

    // Index shore power by CallID (with numeric usage normalization)
    const powerByCallID = new Map();
    for (const p of power.data) {
      powerByCallID.set(p['CallID'], {
        CallID: p['CallID'] || '',
        ConnectionDate: p['ConnectionDate'] || '',
        DisconnectionDate: p['DisconnectionDate'] || '',
        Connect: p['Connect'] || '',
        Disconnect: p['Disconnect'] || '',
        'Usage(kWh)': cleanUsage(p['Usage(kWh)'])
      });
    }

    // Output schema for the combined sheet
    const combinedHeaders = [
      'CallID','VesselName','ArrivalDate','Arrival','DepartDate','Depart',
      'IMO','Line','YearOfConstruction',
      'ConnectionDate','DisconnectionDate','Connect','Disconnect','Usage(kWh)'
    ];

    // Build combined rows
    const combined = [];
    for (const c of calls.data) {
      const callId = c['CallID'];
      const imo = IMOFromCallID(callId);
      const v = vesselByIMO.get(imo) || { Vessel: '', IMO: imo, Line: '', YearOfConstruction: '' };
      const sp = powerByCallID.get(callId) || {
        CallID: callId, ConnectionDate: '', DisconnectionDate: '',
        Connect: '', Disconnect: '', 'Usage(kWh)': ''
      };

      combined.push({
        CallID: callId,
        VesselName: c['VesselName'] || '',
        ArrivalDate: c['ArrivalDate'] || '',
        Arrival: c['Arrival'] || '',
        DepartDate: c['DepartDate'] || '',
        Depart: c['Depart'] || '',
        IMO: v.IMO || '',
        Line: v.Line || '',
        YearOfConstruction: v.YearOfConstruction || '',
        ConnectionDate: sp.ConnectionDate,
        DisconnectionDate: sp.DisconnectionDate,
        Connect: sp.Connect,
        Disconnect: sp.Disconnect,
        'Usage(kWh)': sp['Usage(kWh)']
      });
    }

    // Replace empty values with "NA" in combined
    fillNA(combined, combinedHeaders);

    // Prepare per-CSV rows with NA fill and any needed normalization
    const vesselHeaders = vessel.header;
    const callsHeaders  = calls.header;
    const powerHeaders  = power.header;

    const vesselRows = fillNA([...vessel.data], vesselHeaders);
    const callsRows  = fillNA([...calls.data], callsHeaders);
    const powerRows  = fillNA(power.data.map(p => ({
      ...p,
      'Usage(kWh)': cleanUsage(p['Usage(kWh)'])
    })), powerHeaders);

    return {
      combinedHeaders,
      combined,
      sources: {
        vessel: { headers: vesselHeaders, rows: vesselRows },
        calls:  { headers: callsHeaders,  rows: callsRows  },
        power:  { headers: powerHeaders,  rows: powerRows  }
      }
    };
  }

  // --- 6) Worksheet helpers (SheetJS required on page) ---
  function makeColWidths(headers, rows) {
    return headers.map(h => {
      const maxLen = Math.max(h.length, ...rows.map(r => (r[h] ? String(r[h]).length : 0)));
      return { wch: Math.min(Math.max(10, maxLen + 2), 40) };
    });
  }
  function boldHeaderRow(ws) {
    try {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = cell.s || {};
        cell.s.font = Object.assign({}, cell.s.font, { bold: true });
      }
    } catch (e) {
      console.warn('Header bold styling not applied:', e);
    }
  }
  function createWorksheet(headers, rows) {
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = makeColWidths(headers, rows);
    boldHeaderRow(ws); // may not render in CE build
    return ws;
  }

  // --- 7) Excel downloads ---
  function downloadAllSheets(result, filename = "CruiseData.xlsx") {
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS (XLSX) is not loaded. Include xlsx.full.min.js before this script.");
    }
    const wb = XLSX.utils.book_new();

    // Combined sheet
    const wsCombined = createWorksheet(result.combinedHeaders, result.combined);
    XLSX.utils.book_append_sheet(wb, wsCombined, "Combined");

    // Per-CSV sheets
    const { vessel, calls, power } = result.sources;
    XLSX.utils.book_append_sheet(wb, createWorksheet(vessel.headers, vessel.rows), "Vessels");
    XLSX.utils.book_append_sheet(wb, createWorksheet(calls.headers,  calls.rows),  "Calls");
    XLSX.utils.book_append_sheet(wb, createWorksheet(power.headers,  power.rows),  "ShorePower");

    XLSX.writeFile(wb, filename);
  }

  // --- 8) Public API ---
  const CruiseExporter = {
    /** Original single-sheet download (kept for compatibility) */
    async download(filename = "ComboFile.xlsx") {
      const res = await buildCombinedRows();
      // Keep compatibility: just the Combined sheet
      if (typeof XLSX === "undefined") throw new Error("SheetJS (XLSX) is not loaded.");
      const ws = createWorksheet(res.combinedHeaders, res.combined);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Combined");
      XLSX.writeFile(wb, filename);
      return res.combined.length;
    },
    /** NEW: Multi-sheet download with separate tabs for each CSV + Combined */
    async downloadAllSheets(filename = "CruiseData.xlsx") {
      const res = await buildCombinedRows();
      downloadAllSheets(res, filename);
      return {
        combinedRowCount: res.combined.length,
        vesselRowCount: res.sources.vessel.rows.length,
        callsRowCount:  res.sources.calls.rows.length,
        powerRowCount:  res.sources.power.rows.length
      };
    }
  };

  // Attach to window for easy use from HTML
  global.CruiseExporter = CruiseExporter;

})(typeof window !== "undefined" ? window : this);

