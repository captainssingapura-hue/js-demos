# ModalPanel — Technical Design

## Overview

`ModalPanel.js` is a zero-dependency ES module that provides draggable, resizable
floating panels.  Multiple panels coexist on the same page and automatically
manage their stacking order.  The design follows the same patterns as the sibling
`MultiTabPane.js` library: single options-object constructor, `_on()` listener
tracking, and a clean `destroy()` teardown.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Module scope (shared across all instances)          │
│                                                     │
│   _zBase / _zTop   – monotonic z-index counter      │
│   _instances       – Set of live ModalPanel objects  │
│   _bringToFront()  – increment _zTop, apply to el   │
│   HANDLE_POSITIONS – ['n','s','e','w','ne',...]      │
│   HANDLE_CURSORS   – { n:'ns-resize', ... }         │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  class ModalPanel                                    │
│                                                     │
│  Public:  setTitle, setContent, moveTo, resize,     │
│           open, close, toggle, isOpen, destroy       │
│                                                     │
│  Private: _on, _focus, _onDragStart, _onResizeStart │
└─────────────────────────────────────────────────────┘
```

### Module-level singletons

| Symbol | Purpose |
|--------|---------|
| `_zBase` | Starting z-index (1000). High enough to sit above typical page content. |
| `_zTop` | The highest z-index assigned so far.  Only increments — never decreases. |
| `_instances` | `Set<ModalPanel>` of all live panels.  Used for cleanup tracking; could be extended for global operations (e.g. "close all", "tile"). |
| `_bringToFront(panel)` | Increments `_zTop` by 1 and sets the panel element's `style.zIndex`. Because it only ever increments, the most recently focused panel is always on top. |

### Why a monotonic counter instead of re-sorting?

Re-sorting all panels' z-indices on every focus would be O(n) and cause style
recalc on every panel.  The monotonic counter is O(1) — just one style write on
the focused panel.  The counter can theoretically overflow, but would need ~9
quadrillion focus events to reach `Number.MAX_SAFE_INTEGER`.

---

## DOM Structure

The constructor builds this tree and appends it to `opts.container`:

```
div.mp-panel                          ← position:absolute, sized via inline styles
├── div.mp-title-bar                  ← drag handle, cursor:grab
│   ├── span.mp-title-label           ← title text, flex:1
│   └── span.mp-close                 ← × button (if closable)
├── div.mp-body                       ← flex:1, overflow:auto, holds user content
├── div.mp-handle.mp-handle-n         ← resize handles (if resizable)
├── div.mp-handle.mp-handle-s         │  8 invisible divs positioned along
├── div.mp-handle.mp-handle-e         │  edges and corners with appropriate
├── div.mp-handle.mp-handle-w         │  resize cursors
├── div.mp-handle.mp-handle-ne        │
├── div.mp-handle.mp-handle-nw        │
├── div.mp-handle.mp-handle-se        │
└── div.mp-handle.mp-handle-sw        ┘
```

All positioning is done with inline `style.left`, `style.top`, `style.width`,
`style.height` in pixels.  This avoids CSS class proliferation and makes the
current geometry directly readable from the DOM.

The panel uses `display: flex; flex-direction: column` so that `.mp-body`
stretches to fill whatever space the title bar doesn't consume.

---

## Drag (title bar)

### How it works

1. **mousedown on `.mp-title-bar`** → `_onDragStart(e)`
2. Snapshot the panel's `getBoundingClientRect()` and compute the cursor's
   offset within the panel: `startX = e.clientX - rect.left`,
   `startY = e.clientY - rect.top`.
3. Attach `mousemove` and `mouseup` listeners to `document` (not the panel).
4. On every `mousemove`, set `style.left = clientX - startX`,
   `style.top = clientY - startY`.
5. On `mouseup`, remove both listeners and fire `onMove` callback.

### Why listen on `document`?

If listeners were on the panel element, fast mouse movement would escape the
element's bounds and the drag would "stick".  Listening on `document` ensures
every mouse event is captured regardless of cursor position.

### Cursor feedback

- `.mp-title-bar` has `cursor: grab` at rest and `cursor: grabbing` on `:active`.
- During drag, `body.mp-dragging` is added with `cursor: grabbing !important`
  and `user-select: none`.  The `!important` ensures the grab cursor overrides
  any element the cursor passes over.  `user-select: none` prevents accidental
  text selection in other elements during the drag.

### Why `e.preventDefault()`?

Called in `_onDragStart` to suppress the browser's native drag behaviour
(e.g. image ghosting, text selection start).  Without it, dragging over text
or images triggers the browser's built-in drag-and-drop.

---

## Resize (edge/corner handles)

### Handle layout

Eight invisible `<div>` elements are absolutely positioned along the panel's
edges and corners.  Their size is controlled by the CSS variable `--handle`
(default 6 px).

```
 NW ──────── N ──────── NE
 │                       │
 W        (body)         E
 │                       │
 SW ──────── S ──────── SE
```

Corner handles are `--handle × --handle` squares.  Edge handles span the full
edge minus the corners (using `left: var(--handle); right: var(--handle)` etc.)
so they don't overlap.

Each handle has the appropriate CSS cursor set inline from the `HANDLE_CURSORS`
map (e.g. `se` → `nwse-resize`).

### How resize works

1. **mousedown on a handle** → `_onResizeStart(e, pos)` where `pos` is one of
   `'n'`, `'se'`, etc.
2. `e.stopPropagation()` prevents the mousedown from also triggering the
   panel-level focus handler twice (it already fires on the handle's own
   mousedown bubble, but we don't want the drag handler on the title bar to
   also activate).
3. Snapshot the panel's current rect and cursor position into `orig`.
4. Attach `mousemove`/`mouseup` on `document`.
5. On each `mousemove`, compute `dx`/`dy` (cursor delta from start), then
   adjust `x`, `y`, `w`, `h` based on which edges the handle represents:

   | Handle contains | Effect |
   |-----------------|--------|
   | `'e'` | `w += dx` (grow right) |
   | `'w'` | `w -= dx`, `x += dx` (grow left, move origin) |
   | `'s'` | `h += dy` (grow down) |
   | `'n'` | `h -= dy`, `y += dy` (grow up, move origin) |

   Corner handles (e.g. `'se'`) contain two letters, so both axes are adjusted.

6. **Minimum size enforcement**: if `w < minWidth` or `h < minHeight`, the size
   is clamped.  For left/top edges (`'w'`, `'n'`), the position is also snapped
   back so the opposite edge doesn't move:
   ```
   if (w < minW && pos includes 'w'):
     x = orig.x + orig.w - minW    // pin the right edge
     w = minW
   ```

7. All four properties (`left`, `top`, `width`, `height`) are written every
   frame.  This is intentional — writing only the changed properties would
   require branching logic that adds complexity without measurable perf gain
   (style writes are batched by the browser before the next paint).

8. On `mouseup`, fire `onResize` callback with final dimensions.

---

## Z-Index Stacking (focus)

```
mousedown on .mp-panel
  └→ _focus()
       └→ _bringToFront(this)
            └→ _zTop++; el.style.zIndex = _zTop
```

Every `mousedown` anywhere on the panel element (including title bar, body,
resize handles) bubbles up to the panel-level handler registered in the
constructor:

```js
this._on(this._el, 'mousedown', () => this._focus());
```

This means clicking inside the panel's content, starting a drag, or starting a
resize all bring the panel to front.  The `_onFocus` callback fires so the
consumer can react (e.g. highlight a toolbar button).

---

## Listener Tracking & Cleanup

### The `_on()` pattern

```js
_on(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  this._listeners.push([target, type, fn, opts]);
}
```

Every event listener registered during construction is routed through `_on()`,
which stores a `[target, type, fn, opts]` tuple.  On `destroy()`:

```js
for (const [target, type, fn, opts] of this._listeners) {
  target.removeEventListener(type, fn, opts);
}
```

This guarantees zero leaked listeners after teardown, even for listeners on
elements that are still in the DOM (e.g. if the container outlives the panel).

### What about the drag/resize `document` listeners?

The `mousemove`/`mouseup` listeners attached to `document` during drag and
resize are **not** tracked via `_on()`.  They don't need to be — they are
self-cleaning: the `mouseup` handler removes both itself and the `mousemove`
handler.  They only exist for the duration of a single drag/resize gesture.

---

## Open / Close / Toggle

| Method | Behaviour |
|--------|-----------|
| `close()` | Sets `this._open = false`, `style.display = 'none'`. |
| `open()` | Sets `this._open = true`, clears `display`, calls `_focus()` to bring to front. |
| `toggle()` | Delegates to `close()` or `open()` based on `this._open`. |

Using `display: none` vs. `visibility: hidden`: `display: none` fully removes
the element from layout and paint, which is appropriate for a "closed" panel
that shouldn't be interactable.  `visibility: hidden` would still occupy z-index
space and respond to events in some edge cases.

---

## CSS Design Decisions

### Component styles live in the consumer's HTML, not the JS

The library creates DOM elements with class names (`mp-panel`, `mp-title-bar`,
etc.) but does not inject a `<style>` tag.  This is deliberate:

- The consumer has full control over theming.
- No specificity battles with injected styles.
- SSR-friendly — no runtime style injection.
- The demo HTML contains the reference stylesheet that consumers can copy.

### Class prefix `mp-`

All classes use the `mp-` prefix (ModalPanel) to avoid collisions, following
the same convention as `mtp-` (MultiTabPane) and `sp-` (SplitPane).

### `overflow: hidden` on `.mp-panel`

Prevents resize handles and content from painting outside the panel's rounded
corners.  The body has its own `overflow: auto` for scrollable content.

---

## Public API Summary

| Method | Returns | Notes |
|--------|---------|-------|
| `setTitle(title)` | `this` | Updates title bar text |
| `setContent(el)` | `this` | Replaces body content (clears previous) |
| `moveTo(x, y)` | `this` | Sets position, fires `onMove` |
| `resize(w, h)` | `this` | Sets size (clamped to min), fires `onResize` |
| `open()` | `this` | Shows panel, brings to front |
| `close()` | `this` | Hides panel |
| `toggle()` | `this` | Toggles open/close |
| `isOpen()` | `boolean` | Current visibility state |
| `destroy()` | `void` | Removes DOM, cleans listeners, unregisters from `_instances` |

All mutator methods return `this` for chaining:
```js
panel.setTitle('Updated').moveTo(100, 100).resize(500, 400).open();
```

---

## File Layout

```
modal_panel/
├── ModalPanel.js      ← library (zero dependencies, ES module)
├── demo.html          ← showcase with 3 panels + toolbar
└── tech_design.md     ← this document
```
