/* vol-walker.js — Mean-reverting random walk for volatility simulation
   Pure computation module — no DOM, no Three.js dependencies.
*/

// Mean-reverting random walk: each cell drifts with correlated noise and
// pulls back toward its baseline value, keeping the surface shape realistic.

export function createWalker(baselineGrid) {
  // Deep-copy baseline so we never mutate it
  const base = baselineGrid.map(row => [...row]);
  // Current "live" grid starts at baseline
  let grid = base.map(row => [...row]);

  const MEAN_REVERT = 0.08;   // pull-back strength per step
  const BASE_VOL    = 0.12;   // base per-cell noise amplitude (vol pts)
  const CORR_WEIGHT = 0.45;   // how much of the noise is a common (level) shock
  let magnitude = 1.0;        // user-controllable multiplier (0 = frozen, 2 = wild)

  return {
    /** Set the magnitude multiplier (0–2) */
    setMagnitude(m) { magnitude = m; },

    /** Advance one step and return the new grid */
    step() {
      const vol = BASE_VOL * magnitude;
      // Common shock applied to the whole surface (level shift)
      const common = (Math.random() - 0.5) * 2 * vol * CORR_WEIGHT;

      for (let ti = 0; ti < grid.length; ti++) {
        for (let di = 0; di < grid[ti].length; di++) {
          const idio = (Math.random() - 0.5) * 2 * vol * (1 - CORR_WEIGHT);
          const revert = (base[ti][di] - grid[ti][di]) * MEAN_REVERT;
          grid[ti][di] += common + idio + revert;
          // Floor at 1% IV — never go negative or unrealistically low
          if (grid[ti][di] < 1) grid[ti][di] = 1;
        }
      }
      return grid;
    },

    /** Reset to baseline (e.g. on pair switch) */
    reset(newBaseline) {
      for (let ti = 0; ti < newBaseline.length; ti++) {
        base[ti] = [...newBaseline[ti]];
        grid[ti] = [...newBaseline[ti]];
      }
    },

    /** Get the current grid without stepping */
    current() {
      return grid;
    },
  };
}
