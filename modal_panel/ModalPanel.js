/**
 * ModalPanel.js
 * A zero-dependency ES module for draggable, resizable floating panels.
 *
 * Panels are brought to front on interaction.  Multiple panels share a
 * z-index stack managed automatically.
 *
 * Usage:
 *   import ModalPanel from './ModalPanel.js';
 *
 *   const panel = new ModalPanel({
 *     container : document.body,           // parent element
 *     title     : 'My Panel',
 *     content   : someElement,             // optional, DOM element
 *     x         : 100,                     // initial left (px)
 *     y         : 80,                      // initial top  (px)
 *     width     : 420,                     // initial width  (px)
 *     height    : 300,                     // initial height (px)
 *     minWidth  : 180,                     // optional, default 120
 *     minHeight : 100,                     // optional, default 60
 *     resizable : true,                    // optional, default true
 *     closable  : true,                    // optional, default true
 *     onClose   : () => {},                // optional
 *     onMove    : (x, y) => {},            // optional
 *     onResize  : (w, h) => {},            // optional
 *     onFocus   : () => {},                // optional
 *   });
 *
 *   panel.setTitle('New Title');
 *   panel.setContent(el);
 *   panel.moveTo(200, 100);
 *   panel.resize(500, 400);
 *   panel.open();
 *   panel.close();
 *   panel.toggle();
 *   panel.destroy();
 */

// ── Z-index stack (shared across all instances) ─────────────────────────
let _zBase   = 1000;
let _zTop    = _zBase;
const _instances = new Set();

function _bringToFront(panel) {
  _zTop += 1;
  panel._el.style.zIndex = _zTop;
}

// ── Resize handle positions ─────────────────────────────────────────────
const HANDLE_POSITIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const HANDLE_CURSORS = {
  n: 'ns-resize',   s: 'ns-resize',
  e: 'ew-resize',   w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

export default class ModalPanel {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {string}      opts.title
   * @param {HTMLElement} [opts.content]
   * @param {number}  [opts.x=60]
   * @param {number}  [opts.y=60]
   * @param {number}  [opts.width=380]
   * @param {number}  [opts.height=260]
   * @param {number}  [opts.minWidth=120]
   * @param {number}  [opts.minHeight=60]
   * @param {boolean} [opts.resizable=true]
   * @param {boolean} [opts.closable=true]
   * @param {function} [opts.onClose]
   * @param {function} [opts.onMove]
   * @param {function} [opts.onResize]
   * @param {function} [opts.onFocus]
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
    } = opts;

    if (!container) throw new Error('[ModalPanel] opts.container is required');

    this._container = container;
    this._minW      = minWidth;
    this._minH      = minHeight;
    this._onClose   = onClose;
    this._onMove    = onMove;
    this._onResize  = onResize;
    this._onFocus   = onFocus;
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
    this._on(this._el, 'mousedown', () => this._focus());

    // Mount
    this._container.appendChild(this._el);
    _instances.add(this);
    _bringToFront(this);
  }

  // ─── Public API ─────────────────────────────────────────────────────────

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
    this._focus();
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
    _instances.delete(this);
  }

  // ─── Private: listener tracking ─────────────────────────────────────────

  _on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
  }

  // ─── Private: focus / z-index ───────────────────────────────────────────

  _focus() {
    _bringToFront(this);
    this._onFocus?.();
  }

  // ─── Private: title-bar drag ────────────────────────────────────────────

  _onDragStart(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    const rect   = this._el.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    const onMove = (ev) => {
      const x = ev.clientX - startX;
      const y = ev.clientY - startY;
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
