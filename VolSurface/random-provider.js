/* random-provider.js — Random-walk data provider
   Implements the data-provider interface:
     createRandomProvider(onData)  → provider
     provider.setBaseline({ grid, tenors, deltas, label })
     provider.destroy()

   Starts ticking immediately at max magnitude, 100ms interval.
*/

import { createWalker } from './vol-walker.js';

export function createRandomProvider(onData) {
  let walker     = null;
  let data       = null;   // { grid, tenors, deltas, label }
  let intervalId = null;
  const intervalMs = 100;

  function tick() {
    if (!walker || !data) return;
    const grid = walker.step();
    onData({ grid, tenors: data.tenors, deltas: data.deltas, label: data.label });
  }

  function start() {
    if (intervalId) return;
    intervalId = setInterval(tick, intervalMs);
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
  }

  return {
    /** Update baseline data (e.g. on pair switch). Fires onData immediately, resumes ticking. */
    setBaseline({ grid, tenors, deltas, label }) {
      data = { grid, tenors, deltas, label };
      if (!walker) {
        walker = createWalker(grid);
        walker.setMagnitude(2);
      } else {
        walker.reset(grid);
      }
      onData({ grid: walker.current(), tenors, deltas, label });
      start();
    },

    destroy() {
      stop();
    },
  };
}
