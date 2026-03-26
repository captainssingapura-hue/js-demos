/**
 * SplitPane.js
 * A zero-dependency ES module for 2-dimensional split-pane layouts.
 *
 * Usage:
 *   import SplitPane from './SplitPane.js';
 *
 *   const sp = new SplitPane({
 *     container : document.getElementById('my-container'),
 *     panes     : {
 *       topLeft     : document.getElementById('pane-tl'),
 *       topRight    : document.getElementById('pane-tr'),
 *       bottomLeft  : document.getElementById('pane-bl'),
 *       bottomRight : document.getElementById('pane-br'),
 *     },
 *     dividers: {
 *       vertical   : document.getElementById('div-v'),   // col splitter(s)
 *       horizontal : document.getElementById('div-h'),   // row splitter
 *       vertical2  : document.getElementById('div-v2'),  // optional 2nd col splitter
 *     },
 *     // optional
 *     splitX    : 0.5,   // initial horizontal split ratio (0–1)
 *     splitY    : 0.5,   // initial vertical split ratio (0–1)
 *     minPx     : 60,    // minimum pane size in pixels
 *     onChange  : ({ splitX, splitY }) => {},  // called on every resize
 *   });
 *
 *   sp.setSplit(0.3, 0.7);  // programmatic resize
 *   sp.getSplit();          // → { splitX, splitY }
 *   sp.destroy();           // remove all event listeners
 */

export default class SplitPane {
  /**
   * @param {object} opts
   * @param {HTMLElement}  opts.container
   * @param {{ topLeft, topRight, bottomLeft, bottomRight }} opts.panes
   * @param {{ vertical, horizontal, vertical2? }}          opts.dividers
   * @param {number}   [opts.splitX=0.5]
   * @param {number}   [opts.splitY=0.5]
   * @param {number}   [opts.minPx=60]
   * @param {function} [opts.onChange]
   */
  constructor(opts = {}) {
    const {
      container,
      panes,
      dividers,
      splitX   = 0.5,
      splitY   = 0.5,
      minPx    = 60,
      onChange = null,
    } = opts;

    if (!container)          throw new Error('[SplitPane] opts.container is required');
    if (!panes)              throw new Error('[SplitPane] opts.panes is required');
    if (!dividers)           throw new Error('[SplitPane] opts.dividers is required');
    if (!dividers.vertical)  throw new Error('[SplitPane] opts.dividers.vertical is required');
    if (!dividers.horizontal)throw new Error('[SplitPane] opts.dividers.horizontal is required');

    this._container = container;
    this._panes     = panes;
    this._dividers  = dividers;
    this._minPx     = minPx;
    this._onChange  = onChange;
    this._splitX    = splitX;
    this._splitY    = splitY;

    // Bound references kept so we can remove them in destroy()
    this._listeners = [];

    this._bindDividers();
    this._bindResize();
    this._apply();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Programmatically set split ratios and re-render. */
  setSplit(splitX, splitY) {
    if (splitX != null) this._splitX = splitX;
    if (splitY != null) this._splitY = splitY;
    this._apply();
  }

  /** Return current split ratios. */
  getSplit() {
    return { splitX: this._splitX, splitY: this._splitY };
  }

  /** Remove all event listeners and clean up. */
  destroy() {
    for (const [target, type, fn, opts] of this._listeners) {
      target.removeEventListener(type, fn, opts);
    }
    this._listeners = [];
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /** Register an event listener and track it for cleanup. */
  _on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
  }

  /** Clamp splitX / splitY and apply sizes to DOM. */
  _apply() {
    const { _container: c, _panes: p, _minPx: min } = this;
    const DIVIDER_V = this._dividers.vertical.offsetWidth  || 6;
    const DIVIDER_H = this._dividers.horizontal.offsetHeight || 6;

    const availW = c.clientWidth  - DIVIDER_V;
    const availH = c.clientHeight - DIVIDER_H;

    // Clamp ratios so neither pane goes below minPx
    this._splitX = Math.max(min / availW, Math.min(1 - min / availW, this._splitX));
    this._splitY = Math.max(min / availH, Math.min(1 - min / availH, this._splitY));

    const leftW  = Math.round(availW * this._splitX);
    const rightW = availW - leftW;
    const topH   = Math.round(availH * this._splitY);
    const botH   = availH - topH;

    // Row heights
    const rowTop = p.topLeft.parentElement;
    const rowBot = p.bottomLeft.parentElement;
    if (rowTop) rowTop.style.height = topH + 'px';
    if (rowBot) rowBot.style.height = botH + 'px';

    // Pane widths (heights fill their row via CSS flex / 100%)
    [p.topLeft,    p.bottomLeft ].forEach(el => { el.style.width = leftW  + 'px'; });
    [p.topRight,   p.bottomRight].forEach(el => { el.style.width = rightW + 'px'; });

    this._onChange?.({ splitX: this._splitX, splitY: this._splitY });
  }

  /** Attach drag behaviour to a divider element. */
  _bindDragger(divider, onMove) {
    const start = (e) => {
      e.preventDefault();
      divider.classList.add('sp-active');
      document.body.classList.add('sp-dragging');

      const move = (ev) => {
        const [cx, cy] = this._clientXY(ev);
        onMove(cx, cy);
        this._apply();
      };
      const stop = () => {
        divider.classList.remove('sp-active');
        document.body.classList.remove('sp-dragging');
        document.removeEventListener('mousemove',  move);
        document.removeEventListener('touchmove',  move);
        document.removeEventListener('mouseup',    stop);
        document.removeEventListener('touchend',   stop);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('mouseup',   stop);
      document.addEventListener('touchend',  stop);
    };

    this._on(divider, 'mousedown',  start);
    this._on(divider, 'touchstart', start, { passive: false });
  }

  _bindDividers() {
    const rect = () => this._container.getBoundingClientRect();

    // Vertical divider(s) — control splitX
    const moveX = (cx) => {
      const r = rect();
      this._splitX = (cx - r.left) / r.width;
    };
    this._bindDragger(this._dividers.vertical, moveX);
    if (this._dividers.vertical2) {
      this._bindDragger(this._dividers.vertical2, moveX);
    }

    // Horizontal divider — controls splitY
    this._bindDragger(this._dividers.horizontal, (_, cy) => {
      const r = rect();
      this._splitY = (cy - r.top) / r.height;
    });
  }

  _bindResize() {
    const fn = () => this._apply();
    this._on(window, 'resize', fn);
  }

  /** Normalise mouse / touch coordinates → [clientX, clientY]. */
  _clientXY(e) {
    const src = e.touches?.[0] ?? e;
    return [src.clientX, src.clientY];
  }
}
