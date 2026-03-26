# FX Volatility Surface — How the Effects Are Achieved

## The 3D surface geometry

Three.js builds the surface as a `BufferGeometry` — a flat grid of vertices arranged by tenor (x-axis) and delta (z-axis). Each vertex's height (y) is driven by the implied volatility value at that point. The triangles connecting adjacent vertices are computed manually by walking the grid and pushing index pairs, giving you a smooth mesh rather than a wireframe of disconnected points.

## The volatility smile shape

The vol at each point isn't random — it follows a simplified SVI (Stochastic Volatility Inspired) formula. For each tenor/delta pair it computes:

```
vol = ATM level
    + skew adjustment     (linear in moneyness, driven by the risk reversal)
    + smile curvature     (quadratic in moneyness, driven by the butterfly spread)
```

This is why the surface curves upward at the wings and tilts depending on the pair — USD/JPY has a positive tilt because its risk reversal is positive, EUR/USD tilts the other way.

## Vertex coloring

Instead of a single material color, each vertex gets its own RGB value baked directly into the geometry via a `color` attribute. The color is sampled from a colormap (Plasma, Viridis, etc.) based on where that vertex's vol sits between the surface minimum and maximum. Three.js interpolates colors smoothly across each triangle, which is what produces the continuous gradient shading.

## Lighting and shading

`MeshPhongMaterial` with `vertexColors: true` means the vertex colors are multiplied by the lighting calculation. Two directional lights — one white from above, one soft blue from below-left — create the highlight and shadow that give the surface its 3D depth. Without lighting it would look flat even in 3D.

## Orbit controls

There's no Three.js `OrbitControls` plugin used here — it's a hand-rolled version. Mouse drag updates two spherical coordinates (`phi` for vertical angle, `theta` for horizontal rotation), and the camera position is recomputed each frame from those angles using basic trigonometry (`sin`/`cos` on a sphere of radius `r`). Right-click drag shifts `panX`/`panY` offsets instead, and scroll adjusts the radius.

## The tooltip

On every mouse move, a `Raycaster` is fired from the camera through the cursor into the scene. If it intersects the mesh, Three.js returns the 3D hit point, which gets reverse-mapped back to the nearest grid indices (tenor row, delta column) to look up the exact vol value — that's what populates the floating label.

## The axis labels

Each label (tenor names, delta values, axis titles) is a `Sprite` — a flat canvas texture that always faces the camera regardless of rotation. The text is drawn onto an offscreen HTML5 canvas, uploaded as a `CanvasTexture`, and attached to a `SpriteMaterial`. This avoids needing a font loader and keeps labels readable at any angle.
