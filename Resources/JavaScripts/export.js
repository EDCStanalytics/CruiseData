
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
  const RAW_VESSEL = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/dataExport/Actuals/VesselData_Cruise.csv";
  const RAW_CALLS  = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/dataExport/Actuals/CallData_Cruise.csv";
  const RAW_POWER  = "https://raw.githubusercontent.com/EDCStanalytics/CruiseData/dataExport/Actuals/ShorePowerData_Cruise.csv";

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
    const header = rows[0].map(h => (h || '').trim());           // NEW: trim headers
    const data = rows.slice(1).map(r => {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); }); // NEW: trim cells
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

  // --- 4) Fetch utility ---
  async function fetchText(url) {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    return res.text();
  }

  // --- 5) Combine logic ---
  async function buildCombinedRows() {
    const [vesselCSV, callsCSV, powerCSV] = await Promise.all([
      fetchText(RAW_VESSEL),
      fetchText(RAW_CALLS),
      fetchText(RAW_POWER)
    ]);

    const vessel = parseCSV(vesselCSV);   // Vessel,IMO,Line,YearOfConstruction
    const calls  = parseCSV(callsCSV);    // CallID,VesselName,ArrivalDate,Arrival,DepartDate,Depart
    const power  = parseCSV(powerCSV);    // CallID,ConnectionDate,DisconnectionDate,Connect,Disconnect,Usage(kWh)

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

    // Index shore power by CallID
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

    // Output schema
    const headers = [
      'CallID','VesselName','ArrivalDate','Arrival','DepartDate','Depart',
      'IMO','Vessel','Line','YearOfConstruction',
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
        Vessel: v.Vessel || '',
        Line: v.Line || '',
        YearOfConstruction: v.YearOfConstruction || '',
        ConnectionDate: sp.ConnectionDate,
        DisconnectionDate: sp.DisconnectionDate,
        Connect: sp.Connect,
        Disconnect: sp.Disconnect,
        'Usage(kWh)': sp['Usage(kWh)']
      });
    }

    // NEW: replace empty values with "NA" across all rows/headers
    for (const row of combined) {
      for (const h of headers) {
        const val = row[h];
        if (val === undefined || val === null || String(val).trim() === '') {
          row[h] = 'NA';
        }
      }
    }

    return { headers, combined };
  }

  // --- 6) Excel download (SheetJS required on page) ---
  function downloadExcel(headers, rows, filename = "ComboFile.xlsx") {
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS (XLSX) is not loaded. Include xlsx.full.min.js before this script.");
    }

    // Create worksheet with fixed column order
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

    // Auto-size columns (basic heuristic)
    const colWidths = headers.map(h => {
      const maxLen = Math.max(h.length, ...rows.map(r => (r[h] ? String(r[h]).length : 0)));
      return { wch: Math.min(Math.max(10, maxLen + 2), 40) };
    });
    ws['!cols'] = colWidths;

    // NEW: try to bold the header row (A1:...1)
    // NOTE: In the SheetJS Community Edition, cell styling is not supported in the writer.
    // This code sets the style objects on cells, but many builds will *not* render them.
    // See the note below for reliable styling options.
    try {
      const range = XLSX.utils.decode_range(ws['!ref']);
      // Encode each header cell in the first row (row index 0)
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        const cell = ws[addr] || (ws[addr] = { t: 's', v: headers[c] });
        cell.s = cell.s || {};
        cell.s.font = Object.assign({}, cell.s.font, { bold: true }); // attempt bold
      }
    } catch (e) {
      // If anything fails, silently continue without styling
      console.warn('Header bold styling not applied:', e);
    }

    // Build workbook and trigger download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Combined");
    XLSX.writeFile(wb, filename);
  }

  // --- 7) Public API ---
  const CruiseExporter = {
    async download(filename = "ComboFile.xlsx") {
      const { headers, combined } = await buildCombinedRows();
      downloadExcel(headers, combined, filename);
      return combined.length;
    }
  };

  // Attach to window for easy use from HTML
  global.CruiseExporter = CruiseExporter;

})(typeof window !== "undefined" ? window : this);