# ModalPanel — Technical Design

## Overview

The modal panel system is split into two layers:

1. **`ModalControl.js`** — a single draggable, resizable floating panel.  Zero
   dependencies, no knowledge of other panels.  Can be integrated directly
   into any UI framework.
2. **`PanelManager.js`** — orchestrates multiple ModalControls: z-index
   stacking, panel registry, lookup, and bulk operations.

A convenience facade **`ModalPanel.js`** re-exports both and provides a
backward-compatible single-import experience with a shared default manager.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  ModalControl.js  (single panel, framework-friendly)             │
│                                                                  │
│  Owns: DOM tree, drag, resize, open/close, listener cleanup      │
│  Exposes: .el getter, onFocus hook                               │
│  Knows nothing about: other panels, z-index, registry            │
└──────────────────────┬───────────────────────────────────────────┘
                       │  onFocus hook
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PanelManager.js  (multi-panel orchestration)                    │
│                                                                  │
│  Owns: _panels Map, _zTop counter                                │
│  Wires: onFocus → bringToFront (z-index)                         │
│  Provides: create, add, remove, get, forEach, closeAll, etc.     │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  ModalPanel.js  (convenience facade)                             │
│                                                                  │
│  Creates a shared default PanelManager                           │
│  Delegates all public API calls to ModalControl                  │
│  Re-exports { ModalControl, PanelManager } for advanced usage    │
└──────────────────────────────────────────────────────────────────┘
```

### Why this split?

| Concern | Before (monolithic) | After (split) |
|---------|-------------------|---------------|
| Single panel in a React/Vue app | Must accept the module-level `_instances` Set and `_bringToFront` | Import `ModalControl` alone — no global state |
| Custom stacking logic (e.g. panel groups, pinning) | Impossible without forking | Supply your own `PanelManager` or wire `onFocus` directly |
| Simple multi-panel page | One import | Same one import (`ModalPanel.js` facade) |

The key design principle: **`ModalControl` has no module-level mutable state.**
All shared state lives in `PanelManager`, which is instantiated explicitly.

---

## ModalControl.js — Single Panel

### Responsibilities

- Build and mount the panel DOM tree
- Handle title-bar drag via mousedown/mousemove/mouseup on `document`
- Handle 8-direction resize via edge/corner handles
- Optionally clamp position within a `bounds` element
- Manage open/close visibility state
- Track all event listeners for clean `destroy()` teardown
- Fire callbacks: `onClose`, `onMove`, `onResize`, `onFocus`

### DOM Structure

```
div.mp-panel                          ← position:absolute, inline styles for geometry
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

All positioning uses inline `style.left`, `style.top`, `style.width`,
`style.height` in pixels.  The panel uses `display: flex; flex-direction: column`
so `.mp-body` stretches to fill remaining space.

### The `onFocus` hook — the integration point

The critical design decision is how `ModalControl` communicates "I was
interacted with" without knowing about z-index or other panels:

```js
// In ModalControl constructor:
this._on(this._el, 'mousedown', () => this._onFocus?.());
```

Any mousedown anywhere on the panel (title bar, body, resize handles) fires
`onFocus`.  This is the single hook that `PanelManager` (or a framework
integration) latches onto.  The control doesn't call `_bringToFront` itself —
it delegates upward.

Similarly, `open()` calls `this._onFocus?.()` so that re-opening a panel
brings it to front.

### The `el` getter

```js
get el() { return this._el; }
```

Exposes the root DOM element for external manipulation (z-index, CSS classes,
parent reparenting).  This is what `PanelManager.bringToFront()` uses to set
`style.zIndex`.

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

### Bounds clamping

An optional `bounds` element constrains where the panel can be positioned.
Both `moveTo()` and the title-bar drag handler clamp the panel's top-left
corner so the panel stays within the element's live `getBoundingClientRect()`:

```
clampedX = max(br.left,  min(x,  br.right  − panelWidth))
clampedY = max(br.top,   min(y,  br.bottom − panelHeight))
```

The bounds are re-evaluated on every move rather than snapshotted at drag
start. This means the panel correctly handles a resizing workspace (e.g. a
split-pane container) without needing explicit viewport-change notifications.

`moveTo()` clamps first, then writes to the DOM and fires `onMove`.  The drag
handler clamps inside the `mousemove` callback using `offsetWidth`/`offsetHeight`
(the panel's current rendered size), which correctly accounts for any resize
that occurred before or during the drag.

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
   title-bar drag handler (handles sit inside `.mp-panel` but outside
   `.mp-title-bar`; without stopPropagation the panel-level mousedown would
   still fire, which is fine for focus but we avoid double-handling).
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

## PanelManager.js — Multi-Panel Orchestration

### Responsibilities

- Maintain a `Map<id, ModalControl>` registry
- Manage a monotonic z-index counter
- Wire each panel's `onFocus` hook to `bringToFront`
- Provide bulk operations (closeAll, openAll, destroyAll)

### Z-Index Stacking

```js
bringToFront(panel) {
  this._zTop += 1;
  panel.el.style.zIndex = this._zTop;
}
```

The counter only increments — never decreases or re-sorts.  This is O(1) per
focus event (one style write on one element).  Re-sorting all panels would be
O(n) and cause style recalc on every panel.  The counter could theoretically
overflow, but would need ~9 quadrillion focus events to reach
`Number.MAX_SAFE_INTEGER`.

### Focus wiring

When `create()` builds a panel, it wraps the user's `onFocus` callback:

```js
const panel = new ModalControl({
  ...opts,
  onFocus: () => {
    this.bringToFront(panel);    // manager handles z-index
    userOnFocus?.();              // user's callback still fires
  },
});
```

When `add()` adopts an existing panel, it replaces `_onFocus` with a wrapper
that chains the manager's logic before the original callback.  This means
the manager never subclasses or monkey-patches ModalControl — it only uses
the public callback contract.

### Panel IDs

Each panel gets an id (user-supplied or auto-generated via `_uid()`).  IDs
enable lookup (`mgr.get('settings')`), targeted removal (`mgr.remove('log')`),
and are stored as `panel._managerId`.

### Lifecycle methods

| Method | Effect |
|--------|--------|
| `create(opts)` | Build a new ModalControl, wire focus, register, return it |
| `add(panel, id?)` | Adopt an existing ModalControl into the registry |
| `remove(panelOrId)` | Unregister without destroying (panel stays in DOM) |
| `get(id)` | Lookup by id |
| `forEach(fn)` | Iterate all panels |
| `entries()` | Return `[id, panel]` pairs |
| `closeAll()` | Close every panel |
| `openAll()` | Open every panel |
| `destroyAll()` | Destroy every panel + clear the registry |

---

## ModalPanel.js — Convenience Facade

For simple use cases that don't need framework integration or custom managers:

```js
import ModalPanel from './ModalPanel.js';

const panel = new ModalPanel({ container: document.body, title: 'Hello' });
```

Internally, this creates a module-level `_defaultMgr = new PanelManager()` and
delegates `new ModalPanel(opts)` to `_defaultMgr.create(opts)`.  All public
methods proxy to the underlying `ModalControl`.

For advanced usage:

```js
import { ModalControl, PanelManager } from './ModalPanel.js';
// or import them directly from their own files
```

---

## Listener Tracking & Cleanup

### The `_on()` pattern (in ModalControl)

```js
_on(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  this._listeners.push([target, type, fn, opts]);
}
```

Every listener registered during construction is tracked.  On `destroy()`:

```js
for (const [target, type, fn, opts] of this._listeners) {
  target.removeEventListener(type, fn, opts);
}
```

### Drag/resize `document` listeners

The `mousemove`/`mouseup` listeners attached to `document` during drag and
resize are **not** tracked via `_on()`.  They are self-cleaning: the `mouseup`
handler removes both itself and the `mousemove` handler.  They only exist for
the duration of a single gesture.

### PanelManager cleanup

`PanelManager.destroyAll()` calls `destroy()` on every panel and clears the
registry.  `PanelManager.remove()` only unregisters — the panel's DOM and
listeners remain intact for the caller to manage.

---

## Open / Close / Toggle

| Method | Behaviour |
|--------|-----------|
| `close()` | Sets `_open = false`, `style.display = 'none'`. |
| `open()` | Sets `_open = true`, clears `display`, fires `onFocus` to bring to front. |
| `toggle()` | Delegates to `close()` or `open()` based on `_open`. |

Using `display: none` vs. `visibility: hidden`: `display: none` fully removes
the element from layout and paint.  `visibility: hidden` would still occupy
z-index space and could respond to events in edge cases.

---

## CSS Design Decisions

### Styles live in the consumer's HTML, not the JS

The library creates DOM with class names (`mp-panel`, `mp-title-bar`, etc.)
but does not inject a `<style>` tag.  This is deliberate:

- Full theming control for the consumer
- No specificity battles with injected styles
- SSR-friendly — no runtime style injection
- The demo HTML contains the reference stylesheet

### Class prefix `mp-`

All classes use `mp-` (ModalPanel) to avoid collisions, matching the `mtp-`
(MultiTabPane) and `sp-` (SplitPane) convention.

### `overflow: hidden` on `.mp-panel`

Prevents resize handles and content from painting outside the panel's rounded
corners.  The body has its own `overflow: auto` for scrollable content.

---

## Framework Integration Examples

### Standalone (no manager)

```js
import ModalControl from './ModalControl.js';

const panel = new ModalControl({
  container: document.getElementById('app'),
  title: 'Settings',
  content: settingsEl,
  onFocus: () => {
    // bring to front yourself, e.g. panel.el.style.zIndex = ...
  },
});
```

### With a custom manager

```js
import ModalControl from './ModalControl.js';
import PanelManager from './PanelManager.js';

const mgr = new PanelManager({ zBase: 5000 });

const settings = mgr.create({ id: 'settings', container: el, title: 'Settings' });
const log      = mgr.create({ id: 'log',      container: el, title: 'Log' });

mgr.get('settings').close();
mgr.bringToFront('log');
mgr.closeAll();
```

### In React (example pattern)

```jsx
useEffect(() => {
  const ctrl = new ModalControl({
    container: containerRef.current,
    title: 'Panel',
    content: contentRef.current,
    onFocus: () => onFocusCallback(),
    onMove:  (x, y) => setPosition({ x, y }),
    onClose: () => setVisible(false),
  });
  return () => ctrl.destroy();
}, []);
```

---

## Integration with MultiTabPane — Tab Detach / Re-dock

`ModalControl` is used by `MultiTabPane` to implement Chrome-style tab
detachment: dragging a tab far enough away from its bar pops it into a
floating modal window; dragging the modal back over any bar re-docks it.

### Detach trigger

`MultiTabPane` tracks a module-level `_drag` singleton during pointer events.
Detachment fires when **all three** conditions are met simultaneously:

1. `Math.abs(dy) > DETACH_THRESHOLD_Y` (40 px) — cursor has moved far enough
   vertically in **either direction** (upward from a bottom pane or downward
   from a top pane).
2. `!_hitTestBar(cx, cy)` — cursor is not currently over any registered tab bar.
3. `this._detachable === true` — the pane has not opted out.

The bidirectional check (`Math.abs(dy)`) is essential: tabs in bottom panels
must be draggable upward, and tabs in top panels downward.  A positive-only
check (`dy > threshold`) would prevent detaching from bottom panes entirely.

### `_detachTab(e)` — what happens on detach

1. The tab's label and content element are saved into `_drag.detachLabel` /
   `_drag.detachContent` before the tab is removed from the pane.
2. `_removeTab()` removes the tab button and panel from the DOM.  The content
   element is now orphaned in memory (not in the DOM), but still referenced by
   `_drag.detachContent`.
3. A `ModalControl` is created with `container: document.body`, positioned at
   the cursor, and passed the content element (which `ModalControl` appends to
   its `.mp-body`).  The pane's `_workspace` element is passed as `bounds` to
   keep the modal inside the split-panel area.
4. `_drag.detached = true`, `_drag.btn = null`, `_drag.current = null` — the
   tab no longer belongs to any pane, so the regular docked-drag path is skipped
   in subsequent `mousemove` events.

### Re-dock during drag (mid-gesture)

While the mouse button is still held after detach, `_onPointerMove` enters
the detached branch:

```js
if (_drag.detached) {
  _drag.modal.moveTo(e.clientX - _drag.offsetX, e.clientY - 16);
  const dockTarget = this._hitTestBar(e.clientX, e.clientY);
  if (dockTarget) this._dockTab(dockTarget, e.clientX, e);
  return;
}
```

`moveTo()` applies the `bounds` clamp internally.  If the cursor re-enters
a bar the tab is immediately docked via `_dockTab()`.

### `_dockTab(targetPane, cx, e)` — inserting back

1. `_drag.modal.destroy()` removes the panel from the DOM.  The content
   element is now re-orphaned (still held by `_drag.detachContent`).
2. `_hitTestIndex(cx)` walks the target pane's tab buttons left-to-right to
   find the insertion index from the cursor position.
3. `_insertTab({ id, label, content }, idx)` creates a new tab button and
   panel, appending the content element back into the DOM inside the pane.
4. Drag state reverts to docked: `_drag.current = targetPane`,
   `_drag.btn = <new button>`, `_drag.startY = e.clientY` (critical — resetting
   `startY` prevents the `Math.abs(dy) > 40` detach check from immediately
   re-triggering with stale coordinates).

### Re-dock after mouseup — `_enableRedock`

If the user releases the mouse while the tab is floating, `_onPointerUp`
calls the module-level `_enableRedock(modal, tabId, label, content)` helper
before clearing drag state.  This wires up a new `mousedown` listener on
`modal.el`:

```
mousedown on modal.el
  └─ if target is .mp-title-bar
       ├─ attach document mousemove  ← check all _instances bar rects
       │    └─ cursor over a bar?
       │         ├─ removeEventListener (cleanup)
       │         ├─ modal.destroy()
       │         └─ inst._insertTab + _setActive + _onReorder
       └─ attach document mouseup   ← cleanup if dropped outside any bar
```

**Why a separate `_enableRedock` rather than a method?**
After `_onPointerUp` clears `_drag`, there is no `this` context that means
anything (the tab no longer belongs to any pane).  The function closes over
`tabId`, `label`, `content`, and iterates the module-level `_instances` Set
directly — it doesn't need an instance reference.

**Coexistence with ModalControl's own drag:**
`_enableRedock` adds a `mousedown` listener on `modal.el`.  ModalControl's
own title-bar drag is registered on `modal._titleBar` (a child element), so
both listeners fire on title-bar clicks.  They run independently:
ModalControl's listener moves the panel; `_enableRedock`'s listener monitors
for bar proximity.  When a bar is hit, `modal.destroy()` is called, which
removes `_el` from the DOM.  ModalControl's pending `mousemove`/`mouseup`
listeners continue to fire but write styles to a detached element — harmless.
The `mouseup` listener self-cleans regardless.

### Workspace bounds propagation

`MultiTabPane` accepts a `workspace` option (any DOM element).  It is stored
as `this._workspace` and passed as `bounds` to `ModalControl` at detach time:

```js
const workspace = fromPane._workspace;   // captured before _removeTab
const modal = new ModalControl({ ..., bounds: workspace });
```

The workspace is captured **before** `_removeTab` is called because
`_removeTab` does not modify `_workspace`, but capturing it early is a clear
signal that we are reading pane state before the pane is mutated.

`_enableRedock` does **not** receive the workspace reference — after mouseup,
the modal's bounds are already baked into the `ModalControl` instance via
`this._bounds`.

### Content element lifecycle

```
Tab in pane  →  panel.firstChild  →  tabData.content  (referenced in _tabs Map)
     │
     │  _detachTab
     ▼
Orphaned (not in DOM), referenced by _drag.detachContent
     │
     │  ModalControl({ content })
     ▼
Inside modal .mp-body
     │
     │  _dockTab → modal.destroy() → _insertTab({ content })
     ▼
Inside new pane .mtp-panel
```

The content element is never cloned — the same node travels through the
pipeline.  This preserves any internal state (e.g. a WebGL canvas, a running
timer, a filled form) across detach/re-dock cycles.

---

## File Layout

```
modal_panel/
├── ModalControl.js    ← single panel (drag, resize, open/close, bounds clamping)
├── PanelManager.js    ← multi-panel orchestration (z-index, registry)
├── ModalPanel.js      ← convenience facade + re-exports
├── demo.html          ← showcase with 3 panels + toolbar
└── tech_design.md     ← this document

split_pane/
├── MultiTabPane.js    ← imports ModalControl; implements detach / re-dock
└── demo.html          ← passes workspace: #container to each MultiTabPane
```
