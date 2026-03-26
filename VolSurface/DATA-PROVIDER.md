# Writing a Data Provider

A data provider supplies volatility surface data to `VolSurface`. The component is agnostic to where the data comes from — it could be a random walk, a WebSocket feed, a REST API, or a static file.

## Interface

A provider is a factory function with this signature:

```js
createMyProvider(onData) → provider
```

**`onData`** — callback the provider calls whenever it has new data:

```js
onData({
  grid,    // number[][] — N_T × N_D array of IV % values (e.g. 5×5)
  tenors,  // string[]   — tenor labels, one per row    (e.g. ['1W','1M','3M','6M','1Y'])
  deltas,  // number[]   — delta values, one per column (e.g. [10, 25, 50, 75, 90])
  label,   // string     — display label                (e.g. 'EUR/USD')
})
```

**`provider`** — the returned object must implement:

| Method | Description |
|--------|-------------|
| `setBaseline({ grid, tenors, deltas, label })` | Called when the selected instrument changes. The provider should adopt this as its new baseline and call `onData` at least once with the initial state. |
| `destroy()` | Called on teardown. Clean up timers, connections, listeners, etc. |

## Example: Static Provider

The simplest possible provider — just echoes the baseline back:

```js
// static-provider.js
export function createStaticProvider(onData) {
  return {
    setBaseline(data) {
      onData(data);
    },
    destroy() {},
  };
}
```

## Example: WebSocket Provider

A provider that subscribes to a server for live updates:

```js
// ws-provider.js
export function createWsProvider(onData) {
  let ws = null;
  let currentLabel = '';

  function connect(label) {
    if (ws) ws.close();
    ws = new WebSocket(`wss://example.com/vol?pair=${label}`);
    ws.onmessage = (e) => {
      const { grid, tenors, deltas } = JSON.parse(e.data);
      onData({ grid, tenors, deltas, label });
    };
  }

  return {
    setBaseline({ grid, tenors, deltas, label }) {
      currentLabel = label;
      onData({ grid, tenors, deltas, label }); // show baseline immediately
      connect(label);                           // then stream updates
    },
    destroy() {
      if (ws) ws.close();
    },
  };
}
```

## Wiring It Up

Pass the provider factory to the `VolSurface` constructor via the `provider` option. VolSurface will call the factory internally, supplying its own `setData` as the callback. Use `initialData` to supply the first snapshot:

```js
import { VolSurface } from './vol-surface.js';
import { createRandomProvider } from './random-provider.js';
import { buildVolGrid } from './fx-data.js';

const vs = new VolSurface(container, {
  THREE,
  provider:    createRandomProvider,
  initialData: buildVolGrid('EURUSD'),
});
```

To switch instruments, call `vs.setBaseline()`:

```js
vs.setBaseline(buildVolGrid('USDJPY'));
```

To swap providers, just change the import — the factory signature is the same for all providers.

## Container Sizing

`VolSurface` uses a `ResizeObserver` on its container element. It automatically adapts to external size changes — split panes, widget panels, window resizes, etc. No resize configuration is needed; just make sure the container has a defined size (e.g. via CSS) before constructing the `VolSurface`.

## Data Shape Notes

- `grid[ti][di]` is the implied volatility percentage at tenor index `ti` and delta index `di`.
- The grid dimensions must match `tenors.length` rows and `deltas.length` columns.
- Values are in percentage points (e.g. `8.5` means 8.5% IV), not decimals.
- There is no constraint on grid size, but the demo ships with 5×5 (5 tenors, 5 deltas).
