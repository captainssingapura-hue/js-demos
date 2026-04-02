/**
 * ModalControl.js
 * A zero-dependency ES module for a single draggable, resizable floating panel.
 *
 * This is the low-level building block — it owns the DOM, drag, resize, and
 * open/close state for one panel.  It has no knowledge of other panels or
 * z-index stacking.  Use PanelManager for multi-panel orchestration, or
 * wire the onFocus hook into your own framework.
 *
 * ## Container constraint
 *
 * The drag and resize logic converts mouse `clientX`/`clientY` directly into
 * CSS `left`/`top` on the panel element.  This means the panel's positioned
 * parent must have its origin at the viewport origin (i.e. no offset from the
 * page edge).  In practice, **always use `document.body`** as the container.
 *
 * If you mount panels inside a nested `<div>` with margin, padding, or its
 * own offset, the drag coordinates will be wrong — the panel will jump on
 * first move by the container's offset amount.
 *
 * Usage:
 *   import ModalControl from './ModalControl.js';
 *
 *   const panel = new ModalControl({
 *     container : document.body,   // ← always use document.body
 *     title     : 'My Panel',
 *     content   : someElement,
 *     x: 100, y: 80, width: 420, height: 300,
 *     minWidth: 180, minHeight: 100,
 *     resizable: true, closable: true,
 *     onClose, onMove, onResize, onFocus,
 *   });
 *
 *   panel.el;                    // → the root DOM element
 *   panel.setTitle('New Title');
 *   panel.setContent(el);
 *   panel.moveTo(200, 100);
 *   panel.resize(500, 400);
 *   panel.open();  panel.close();  panel.toggle();
 *   panel.destroy();
 */

// ── Resize handle positions ─────────────────────────────────────────────
const HANDLE_POSITIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const HANDLE_CURSORS = {
  n: 'ns-resize',   s: 'ns-resize',
  e: 'ew-resize',   w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

export default class ModalControl {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container  - parent element to mount into
   * @param {string}      [opts.title='Panel']
   * @param {HTMLElement} [opts.content]
   * @param {number}  [opts.x=60]
   * @param {number}  [opts.y=60]
   * @param {number}  [opts.width=380]
   * @param {number}  [opts.height=260]
   * @param {number}  [opts.minWidth=120]
   * @param {number}  [opts.minHeight=60]
   * @param {boolean} [opts.resizable=true]
   * @param {boolean} [opts.closable=true]
   * @param {function} [opts.onClose]   - fires after panel is closed
   * @param {function} [opts.onMove]    - fires after drag ends: (x, y)
   * @param {function} [opts.onResize]  - fires after resize ends: (w, h)
   * @param {function} [opts.onFocus]   - fires on any mousedown on the panel
   */
  constructor(opts = {}) {
    const {
      container,
      title     = 'Panel',
      content   = null,
      x         = 60,
      y         = 60,
      width     = 380,
      height    = 260,
      minWidth  = 120,
      minHeight = 60,
      resizable = true,
      closable  = true,
      onClose   = null,
      onMove    = null,
      onResize  = null,
      onFocus   = null,
      bounds    = null,   // optional element — panel is clamped to its rect
    } = opts;

    if (!container) throw new Error('[ModalControl] opts.container is required');

    this._container = container;
    this._minW      = minWidth;
    this._minH      = minHeight;
    this._onClose   = onClose;
    this._onMove    = onMove;
    this._onResize  = onResize;
    this._onFocus   = onFocus;
    this._bounds    = bounds;
    this._listeners = [];
    this._open      = true;

    // ── Build DOM ────────────────────────────────────────────────────────
    this._el = document.createElement('div');
    this._el.className = 'mp-panel';
    this._el.style.left   = `${x}px`;
    this._el.style.top    = `${y}px`;
    this._el.style.width  = `${width}px`;
    this._el.style.height = `${height}px`;

    // Title bar
    this._titleBar = document.createElement('div');
    this._titleBar.className = 'mp-title-bar';

    this._titleLabel = document.createElement('span');
    this._titleLabel.className = 'mp-title-label';
    this._titleLabel.textContent = title;
    this._titleBar.appendChild(this._titleLabel);

    if (closable) {
      this._closeBtn = document.createElement('span');
      this._closeBtn.className = 'mp-close';
      this._closeBtn.textContent = '\u00d7';
      this._on(this._closeBtn, 'click', (e) => {
        e.stopPropagation();
        this.close();
        this._onClose?.();
      });
      this._titleBar.appendChild(this._closeBtn);
    }

    this._el.appendChild(this._titleBar);

    // Body
    this._body = document.createElement('div');
    this._body.className = 'mp-body';
    if (content) this._body.appendChild(content);
    this._el.appendChild(this._body);

    // Resize handles
    if (resizable) {
      for (const pos of HANDLE_POSITIONS) {
        const h = document.createElement('div');
        h.className = `mp-handle mp-handle-${pos}`;
        h.style.cursor = HANDLE_CURSORS[pos];
        this._on(h, 'mousedown', (e) => this._onResizeStart(e, pos));
        this._el.appendChild(h);
      }
    }

    // ── Events ───────────────────────────────────────────────────────────
    this._on(this._titleBar, 'mousedown', (e) => this._onDragStart(e));
    this._on(this._el, 'mousedown', () => this._onFocus?.());

    // Mount
    this._container.appendChild(this._el);
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /** The root DOM element for this panel. */
  get el() { return this._el; }

  setTitle(title) {
    this._titleLabel.textContent = title;
    return this;
  }

  setContent(el) {
    this._body.innerHTML = '';
    if (el) this._body.appendChild(el);
    return this;
  }

  moveTo(x, y) {
    if (this._bounds) {
      const br = this._bounds.getBoundingClientRect();
      const w  = this._el.offsetWidth  || 0;
      const h  = this._el.offsetHeight || 0;
      x = Math.max(br.left, Math.min(x, br.right  - w));
      y = Math.max(br.top,  Math.min(y, br.bottom - h));
    }
    this._el.style.left = `${x}px`;
    this._el.style.top  = `${y}px`;
    this._onMove?.(x, y);
    return this;
  }

  resize(w, h) {
    this._el.style.width  = `${Math.max(w, this._minW)}px`;
    this._el.style.height = `${Math.max(h, this._minH)}px`;
    this._onResize?.(w, h);
    return this;
  }

  open() {
    this._open = true;
    this._el.style.display = '';
    this._onFocus?.();
    return this;
  }

  close() {
    this._open = false;
    this._el.style.display = 'none';
    return this;
  }

  toggle() {
    return this._open ? this.close() : this.open();
  }

  isOpen() { return this._open; }

  destroy() {
    for (const [target, type, fn, opts] of this._listeners) {
      target.removeEventListener(type, fn, opts);
    }
    this._listeners = [];
    this._el.remove();
  }

  // ─── Private: listener tracking ─────────────────────────────────────────

  _on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
  }

  // ─── Private: title-bar drag ────────────────────────────────────────────

  _onDragStart(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    const rect   = this._el.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    const onMove = (ev) => {
      let x = ev.clientX - startX;
      let y = ev.clientY - startY;
      if (this._bounds) {
        const br = this._bounds.getBoundingClientRect();
        x = Math.max(br.left, Math.min(x, br.right  - this._el.offsetWidth));
        y = Math.max(br.top,  Math.min(y, br.bottom - this._el.offsetHeight));
      }
      this._el.style.left = `${x}px`;
      this._el.style.top  = `${y}px`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.body.classList.remove('mp-dragging');
      this._onMove?.(parseFloat(this._el.style.left), parseFloat(this._el.style.top));
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.body.classList.add('mp-dragging');
  }

  // ─── Private: resize handles ────────────────────────────────────────────

  _onResizeStart(e, pos) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = this._el.getBoundingClientRect();
    const orig = {
      x: rect.left, y: rect.top,
      w: rect.width, h: rect.height,
      mx: e.clientX, my: e.clientY,
    };

    const onMove = (ev) => {
      const dx = ev.clientX - orig.mx;
      const dy = ev.clientY - orig.my;

      let { x, y, w, h } = orig;

      if (pos.includes('e')) w = orig.w + dx;
      if (pos.includes('w')) { w = orig.w - dx; x = orig.x + dx; }
      if (pos.includes('s')) h = orig.h + dy;
      if (pos.includes('n')) { h = orig.h - dy; y = orig.y + dy; }

      // Enforce minimums — snap position back if size would underflow
      if (w < this._minW) {
        if (pos.includes('w')) x = orig.x + orig.w - this._minW;
        w = this._minW;
      }
      if (h < this._minH) {
        if (pos.includes('n')) y = orig.y + orig.h - this._minH;
        h = this._minH;
      }

      this._el.style.left   = `${x}px`;
      this._el.style.top    = `${y}px`;
      this._el.style.width  = `${w}px`;
      this._el.style.height = `${h}px`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.body.classList.remove('mp-resizing');
      this._onResize?.(parseFloat(this._el.style.width), parseFloat(this._el.style.height));
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.body.classList.add('mp-resizing');
  }
}
