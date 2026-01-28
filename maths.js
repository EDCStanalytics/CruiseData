
// maths.js
// Centralized T12 KPI computations (attached to window, no modules)

window.cruncher = {

  /* ---------------------------
     T12 CALL COUNT
  ---------------------------- */
  getT12CallCount: async function () {
    const { t12Calls } = await window.fillBuckets();
    return t12Calls.length;
  },

  /* ---------------------------
     T12 CONNECTION COUNT
  ---------------------------- */
  getT12ConnectionCount: async function () {
    const { t12ConnectionsCount } = await window.fillBuckets();
    return t12ConnectionsCount;
  },

  /* ---------------------------
     T12 kWh PROVIDED (using conn.usage)
  ---------------------------- */
  getT12KwhTotal: async function () {
    const connections = await window.connectionsPromise;
    const { lastStart, lastEnd } = window.Helpers.getT24();

    let total = 0;
    for (const c of connections) {
      const ts = c.connect ?? c.disconnect;
      if (ts && window.Helpers.rangeCheck(ts, lastStart, lastEnd)) {
        total += (c.usage ?? 0);
      }
    }
    return total;
  },

  /* ---------------------------
     T12 USAGE RATE (as PERCENT)
     0–1.25 → 0–125%
  ---------------------------- */

getT12UsageRatePercent: async function () {
  const { t12Calls } = await window.fillBuckets();

  let sum = 0;
  let n = 0;

  for (const c of t12Calls) {
    const stayMsRaw = c.departure - c.arrival;
    const stayMsAdj = Math.max(0, stayMsRaw - (3 * 60 * 60 * 1000));

    let val = 0; // default for calls with no connection

    if (c.connection && stayMsAdj > 0) {
      const connMs = c.connection.disconnect - c.connection.connect;
      val = Math.max(0, Math.min(1.25, connMs / stayMsAdj));
    }

    sum += val;
    n++; // always increment
  }

  const avg = n ? (sum / n) : 0;
  return avg * 100; // percent
}


};