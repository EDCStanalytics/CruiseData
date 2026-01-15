console.log('Connection notes are loading');

// This script mirrors the style of your power data loader.
// It loads a ConnectionsNotes CSV and exposes:
//   - window.connectionNotesPromise : Promise<NotesMap>
//   - window.connectionNotesMap     : plain object map { CallID: ConnectionNote }
//   - window.getConnectionNote(id)  : convenience lookup (returns string or '')
//   - window.attachNotesToCalls(calls) : optional helper to add .note to call objects
//
// Configure your CSV source here. Use either a relative path or a raw GitHub URL.
// Example local: 'ConnectionsNotes.csv'
// Example GitHub: 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Actuals/ConnectionsNotes.csv'
const notesDataURL = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Data/ConnectionsNotes.csv'

// Split a CSV line into fields, respecting quotes (copied from your powerData file)
function splitCSVLine(line) {
  const tokens = line.match(/(".*?"|[^,]+)/g) || [];
  return tokens.map(s => s.replace(/^"|"$/g, '').trim());
}

// Factory: coerce the two expected columns into a record
// Expected columns: CallID, ConnectionNote
function notesFactory(rawLine) {
  const fields = splitCSVLine(rawLine);
  const callId = String(fields[0] ?? '').trim();
  const note   = String(fields[1] ?? '').trim();
  return { callId, note };
}

// Robust loader that uses window.Helpers.getCSV if present; otherwise falls back to fetch
async function getNotes(url) {
  let lines = [];
  try {
    if (window.Helpers?.getCSV) {
      lines = await window.Helpers.getCSV(url);
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      lines = text.split(/\r?\n/).filter(l => l.trim().length);
    }
  } catch (err) {
    console.error('Failed to retrieve ConnectionsNotes CSV:', err);
    throw err;
  }

  // Filter out a header line if present
  const noHeader = lines.filter((l, i) => {
    const first = splitCSVLine(l)[0]?.toLowerCase?.() ?? '';
    const looksHeader = (i === 0) && (first.includes('callid') || first.includes('id'));
    return !looksHeader;
  });

  const map = {};   // { CallID: Note }
  const rows = [];  // [{ callId, note }]

  for (const line of noHeader) {
    const rec = notesFactory(line);
    if (!rec.callId) continue; // skip blank keys
    // Keep the latest non-empty note for duplicate keys
    if (rec.note || !(rec.callId in map)) {
      map[rec.callId] = rec.note;
    }
    rows.push(rec);
  }

  return { map, rows };
}

// Publish a single promise, and a plain map once resolved
window.connectionNotesPromise = getNotes(notesDataURL)
  .then(({ map }) => {
    window.connectionNotesMap = map; // plain object for synchronous lookups after load
    console.log(`Loaded ${Object.keys(map).length} connection notes`);
    return map;
  })
  .catch(err => {
    console.error('Failed to load connection notes:', err);
    window.connectionNotesMap = window.connectionNotesMap || {}; // keep defined
    throw err;
  });

// Convenience synchronous lookup (returns '' if missing or not loaded yet)
window.getConnectionNote = function(callId) {
  const key = String(callId ?? '').trim();
  if (!key) return '';
  const map = window.connectionNotesMap || {};
  return String(map[key] ?? '');
};

// Optional helper: attach .note to each call via CallID or id
window.attachNotesToCalls = function(calls) {
  try {
    const map = window.connectionNotesMap || {};
    for (const c of (calls || [])) {
      const key = String(c?.CallID ?? c?.id ?? '').trim();
      if (key) c.note = String(map[key] ?? '');
    }
    return calls;
  } catch (err) {
    console.error('attachNotesToCalls failed:', err);
    return calls;
  }
};

// Make the results of this script accessible to other scripts
window.connectionNotesPromise = getNotes(notesDataURL)
  .then(({ map }) => {
    window.connectionNotesMap = map; // plain object for synchronous lookups after load
    console.log(`Loaded ${Object.keys(map).length} connection notes`);
    return map; // return the map so other scripts can await it
  })
  .catch(err => {
    console.error('Failed to load connection notes:', err);
    window.connectionNotesMap = window.connectionNotesMap || {}; // keep defined
    throw err;
  });

