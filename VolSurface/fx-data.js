/* fx-data.js — FX pair definitions and SVI-style vol computation
   Pure data/computation module — no DOM, no Three.js dependencies.
*/

// ── FX pair definitions ────────────────────────────────────────────────────
export const PAIRS = {
  EURUSD: {
    label: 'EUR/USD',
    atm:   [8.2, 8.5, 8.9, 9.4, 10.1],
    rr:    [-0.4, -0.6, -0.8, -1.0, -1.3],
    fly:   [0.12, 0.18, 0.22, 0.28, 0.35],
    skew:  'Negative',
    slope: 'Upward',
  },
  USDJPY: {
    label: 'USD/JPY',
    atm:   [7.1, 7.8, 8.6, 9.8, 11.2],
    rr:    [0.8, 1.1, 1.4, 1.8, 2.3],
    fly:   [0.20, 0.28, 0.35, 0.45, 0.58],
    skew:  'Positive',
    slope: 'Steep Up',
  },
  GBPUSD: {
    label: 'GBP/USD',
    atm:   [8.8, 9.1, 9.6, 10.3, 11.1],
    rr:    [-0.6, -0.9, -1.2, -1.5, -1.9],
    fly:   [0.15, 0.22, 0.30, 0.38, 0.48],
    skew:  'Negative',
    slope: 'Upward',
  },
  USDCHF: {
    label: 'USD/CHF',
    atm:   [6.8, 7.2, 7.7, 8.4, 9.3],
    rr:    [-0.3, -0.4, -0.5, -0.7, -0.9],
    fly:   [0.10, 0.14, 0.18, 0.23, 0.30],
    skew:  'Mild Neg',
    slope: 'Moderate',
  },
  AUDUSD: {
    label: 'AUD/USD',
    atm:   [9.5, 9.9, 10.5, 11.2, 12.1],
    rr:    [-0.7, -1.0, -1.3, -1.7, -2.1],
    fly:   [0.18, 0.25, 0.33, 0.42, 0.52],
    skew:  'Negative',
    slope: 'Steep Up',
  },
  NZDUSD: {
    label: 'NZD/USD',
    atm:   [10.1, 10.6, 11.3, 12.0, 13.0],
    rr:    [-0.8, -1.1, -1.5, -1.9, -2.4],
    fly:   [0.20, 0.28, 0.36, 0.46, 0.58],
    skew:  'Negative',
    slope: 'Steep Up',
  },
  USDCAD: {
    label: 'USD/CAD',
    atm:   [6.2, 6.6, 7.1, 7.8, 8.7],
    rr:    [0.2, 0.3, 0.5, 0.7, 1.0],
    fly:   [0.08, 0.12, 0.16, 0.21, 0.27],
    skew:  'Mild Pos',
    slope: 'Moderate',
  },
  EURGBP: {
    label: 'EUR/GBP',
    atm:   [7.4, 7.8, 8.3, 8.9, 9.6],
    rr:    [-0.2, -0.3, -0.4, -0.5, -0.7],
    fly:   [0.09, 0.13, 0.17, 0.22, 0.28],
    skew:  'Mild Neg',
    slope: 'Flat-ish',
  },
};

export const TENORS = ['1W', '1M', '3M', '6M', '1Y'];
export const DELTAS = [10, 25, 50, 75, 90];

// ── SVI-style vol computation ─────────────────────────────────────────────
export function computeVol(pair, ti, di) {
  const atm  = pair.atm[ti];
  const rr   = pair.rr[ti];
  const fly  = pair.fly[ti];
  const moneyness = (DELTAS[di] - 50) / 50;
  const smile     = fly * moneyness * moneyness;
  const skewAdj   = -rr * moneyness * 0.5;
  const jitter    = (Math.sin(ti * 7.3 + di * 13.1) * 0.5 + 0.5) * 0.08 - 0.04;
  return atm + skewAdj + smile + jitter;
}

export function buildVolGrid(pairKey) {
  const pair = PAIRS[pairKey];
  return {
    grid:   TENORS.map((_, ti) => DELTAS.map((_, di) => computeVol(pair, ti, di))),
    tenors: TENORS,
    deltas: DELTAS,
    label:  pair.label,
  };
}
