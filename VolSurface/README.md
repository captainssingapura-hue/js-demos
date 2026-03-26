# VolSurface

Interactive 3D implied volatility surface renderer built on [Three.js](https://threejs.org/). Designed for embedding in trading dashboards, risk platforms, and financial analytics tools.

## Quick Start

VolSurface is a zero-build ES Module. Include Three.js (r128+) and import the library directly:

```html
<div id="surface" style="width: 800px; height: 500px; position: relative;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script type="module">
  import { VolSurface } from './vol-surface.js';

  const surface = new VolSurface(document.getElementById('surface'), {
    THREE: window.THREE,
  });

  surface.setData({
    grid: [
      [12.1, 10.8, 9.5, 10.2, 11.4],   // 1W across deltas
      [12.5, 11.0, 9.8, 10.5, 11.9],   // 1M
      [13.2, 11.6, 10.3, 11.1, 12.7],  // 3M
      [14.0, 12.3, 10.9, 11.8, 13.5],  // 6M
      [15.1, 13.2, 11.7, 12.6, 14.6],  // 1Y
    ],
    tenors: ['1W', '1M', '3M', '6M', '1Y'],
    deltas: [10, 25, 50, 75, 90],
    label: 'EUR/USD',
  });
</script>
```

**Important:** The container element must have `position: relative` (or `absolute`/`fixed`) for the tooltip and legend to position correctly inside it.

## Installation

No package manager required. Copy `vol-surface.js` into your project and import it as an ES Module. Three.js is a **peer dependency** — you provide it, either via a CDN script tag or an npm import.

### With a bundler (Vite, webpack, etc.)

```bash
npm install three
```

```js
import * as THREE from 'three';
import { VolSurface } from './vol-surface.js';

const surface = new VolSurface(container, { THREE });
```

### Without a bundler

Load Three.js via a `<script>` tag before your module, then reference `window.THREE`:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script type="module">
  import { VolSurface } from './vol-surface.js';
  const surface = new VolSurface(container, { THREE: window.THREE });
</script>
```

## API Reference

### `new VolSurface(container, options)`

Creates a new 3D vol surface renderer inside the given DOM element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `container` | `HTMLElement` | Yes | DOM element to render into. Must have explicit dimensions and `position: relative`. |
| `options.THREE` | `object` | Yes | The Three.js namespace. Passed explicitly so the library has no global dependency. |
| `options.colormap` | `string` | No | Initial colormap. One of `'plasma'`, `'viridis'`, `'rdylgn'`, `'spectral'`. Default: `'plasma'`. |
| `options.wireframe` | `boolean` | No | Show wireframe overlay on initial render. Default: `false`. |

### `surface.setData({ grid, tenors, deltas, label })`

Sets the vol surface data and triggers a full re-render. Call this whenever your data changes.

| Field | Type | Description |
|-------|------|-------------|
| `grid` | `number[][]` | 2D array of implied volatility values in percent. Dimensions: `tenors.length` rows x `deltas.length` columns. Each row represents one tenor, each column one delta. |
| `tenors` | `string[]` | Tenor labels displayed along the X axis (e.g. `['1W', '1M', '3M', '6M', '1Y']`). |
| `deltas` | `number[]` | Delta values displayed along the Z axis (e.g. `[10, 25, 50, 75, 90]`). |
| `label` | `string` | Optional label shown in the hover tooltip (e.g. `'EUR/USD'`). |

The grid is **data-agnostic**. You can feed it any vol surface — FX options, equity index options, commodity options, interest rate swaptions — as long as the data is structured as a 2D grid of IV percentages.

### `surface.setColormap(name)`

Switch the surface colormap at runtime.

```js
surface.setColormap('viridis');
```

Available colormaps: `'plasma'`, `'viridis'`, `'rdylgn'`, `'spectral'`.

### `surface.setWireframe(enabled)`

Toggle the wireframe mesh overlay.

```js
surface.setWireframe(true);
```

### `surface.on(event, handler)`

Subscribe to surface events.

#### `'hover'` event

Fires when the user hovers over the surface. The handler receives an object with the intersected data point, or `null` when the cursor leaves the surface.

```js
surface.on('hover', (data) => {
  if (data) {
    console.log(`${data.tenor} ${data.delta}Δ → IV: ${data.iv.toFixed(2)}%`);
  }
});
```

| Field | Type | Description |
|-------|------|-------------|
| `data.tenor` | `string` | The tenor label at the hovered point (e.g. `'3M'`). |
| `data.delta` | `number` | The delta value at the hovered point (e.g. `25`). |
| `data.iv` | `number` | The implied volatility at the hovered point. |

### `surface.destroy()`

Disposes all Three.js resources (geometries, materials, renderer), removes DOM elements (canvas, tooltip, legend), and detaches all event listeners. Call this when removing the surface from the page to prevent memory leaks.

```js
surface.destroy();
```

### Exported Utilities

#### `COLORMAPS`

The raw colormap definitions as RGB stop arrays. Useful if you want to render your own legends or apply the same color scheme elsewhere.

```js
import { COLORMAPS } from './vol-surface.js';
console.log(COLORMAPS.plasma); // [[13,8,135], [84,2,163], ...]
```

#### `sampleColormap(t, name)`

Interpolate a colormap at position `t` (0 to 1). Returns `[r, g, b]` in the 0-255 range.

```js
import { sampleColormap } from './vol-surface.js';
const [r, g, b] = sampleColormap(0.5, 'viridis'); // midpoint color
```

## Real-World Integration Examples

### Live Market Data Feed

Connect to a WebSocket or REST API and update the surface in real time:

```js
import { VolSurface } from './vol-surface.js';

const surface = new VolSurface(document.getElementById('surface'), {
  THREE: window.THREE,
  colormap: 'spectral',
});

const ws = new WebSocket('wss://your-market-data.example.com/vol-surface');

ws.addEventListener('message', (event) => {
  const { pair, grid, tenors, deltas } = JSON.parse(event.data);
  surface.setData({ grid, tenors, deltas, label: pair });
});
```

### Equity Options with Strike-Based Grid

The library is not limited to FX delta conventions. Use strikes, moneyness, or any other axis:

```js
surface.setData({
  grid: ivMatrix,                              // rows = expirations, cols = strikes
  tenors: ['Apr 25', 'May 25', 'Jun 25', 'Sep 25', 'Dec 25'],
  deltas: [3800, 4000, 4200, 4400, 4600],     // strike prices
  label: 'SPX Options',
});
```

### Dashboard Panel with Hover Details

Use the hover event to populate a side panel with point details:

```js
const detailPanel = document.getElementById('detail-panel');

surface.on('hover', (data) => {
  if (data) {
    detailPanel.innerHTML = `
      <strong>${data.tenor}</strong> / ${data.delta}Δ<br>
      IV: ${data.iv.toFixed(2)}%
    `;
    detailPanel.style.opacity = '1';
  } else {
    detailPanel.style.opacity = '0';
  }
});
```

### Comparing Two Surfaces Side by Side

Create multiple independent instances in separate containers:

```js
const surfaceA = new VolSurface(document.getElementById('panel-a'), {
  THREE: window.THREE,
  colormap: 'plasma',
});

const surfaceB = new VolSurface(document.getElementById('panel-b'), {
  THREE: window.THREE,
  colormap: 'viridis',
});

surfaceA.setData(buildGrid('EURUSD'));
surfaceB.setData(buildGrid('USDJPY'));
```

### Displaying a Vol Surface Diff (Change Over Time)

Compute the difference between two snapshots and render as a surface:

```js
function diffGrid(gridA, gridB) {
  return gridA.map((row, ti) =>
    row.map((val, di) => val - gridB[ti][di])
  );
}

const yesterday = await fetchVolSurface('EURUSD', '2025-03-24');
const today     = await fetchVolSurface('EURUSD', '2025-03-25');

surface.setData({
  grid:   diffGrid(today.grid, yesterday.grid),
  tenors: today.tenors,
  deltas: today.deltas,
  label:  'EUR/USD 1d Change',
});
surface.setColormap('rdylgn'); // diverging colormap works well for diffs
```

### Cleanup on SPA Navigation

In single-page applications, destroy the surface when the component unmounts to avoid memory leaks:

```js
// React example
useEffect(() => {
  const surface = new VolSurface(containerRef.current, { THREE });
  surface.setData(volData);

  return () => surface.destroy();
}, []);
```

```js
// Vue example
onMounted(() => {
  surface = new VolSurface(containerRef.value, { THREE });
  surface.setData(volData);
});

onUnmounted(() => {
  surface.destroy();
});
```

## Mouse Controls

The surface has built-in interactive controls:

| Action | Effect |
|--------|--------|
| Left-drag | Rotate the view (orbit) |
| Right-drag | Pan the view |
| Scroll wheel | Zoom in / out |
| Hover | Tooltip with tenor, delta, and IV |

## Container Requirements

The container element must:

1. Have explicit **width and height** (via CSS or inline styles).
2. Have `position: relative`, `absolute`, or `fixed` — needed for tooltip and legend positioning.
3. Not be `display: none` at construction time — Three.js needs dimensions to initialize the camera.

```css
#surface {
  width: 100%;
  height: 500px;
  position: relative;
}
```

## Browser Support

Works in all modern browsers that support WebGL and ES Modules (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+).

## License

MIT
