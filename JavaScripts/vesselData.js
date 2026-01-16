
/* my code recommendation: INSERTION into new file vesselData.js */
console.log('The vessel data is loading');

const vesselDataURL = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Data/VesselData_Cruise.csv'; // adjust if hosted remotely

function splitCSVLine(line) {
  return line.split(',').map(s => s.trim());
}

const vesselFactory = (rawData) => {
  const [vessel, imo, line, yearRaw] = splitCSVLine(rawData);
  return {
    vessel,
    imo,
    line,
    year: Number(yearRaw) || null
  };
};

async function getVessels(vesselDataURL) {
  const dataLines = await window.Helpers.getCSV(vesselDataURL);
  return dataLines.map(vesselFactory);
}

window.vesselsPromise = getVessels(vesselDataURL)
  .then(vessels => {
    console.log(`Loaded ${vessels.length} vessels`);
    console.table(vessels);
    return vessels;
  })
  .catch(err => {
    console.error('Failed to load vessel data:', err);
    throw err;
  });

  
/* my code recommendation: INSERTION in vesselData.js (place after window.vesselsPromise) */
// Cache the loaded list for quick lookups
window.vesselsPromise.then(vessels => { window.vesselsCache = vessels; });

// Simple normalizer so names match despite punctuation/spacing
const _normName = s => String(s || '')
  .toLowerCase()
  .replace(/[\s\-]+/g, ' ')
  .replace(/[^\w\s]/g, '')
  .trim();

// Lookup: returns { correctedName, cruiseLine } for the given shipName
window.getVesselInfo = function (shipName) {
  const target = _normName(shipName);
  const list = Array.isArray(window.vesselsCache) ? window.vesselsCache : [];
  const hit = list.find(v => _normName(v.vessel) === target);

  return hit
    // Map CSV column "Line" → legend field "cruiseLine"
    ? { correctedName: hit.vessel, cruiseLine: hit.line }
    : { correctedName: shipName, cruiseLine: '' };
};

