/**
 * MultiTabPane.js
 * A zero-dependency ES module for tabbed pane layouts with Chrome-style
 * drag-and-drop tab reordering and cross-pane tab transfer.
 *
 * Drag behaviour mirrors Chrome: tabs swap positions live when the
 * dragged tab passes the 50 % midpoint of a neighbour.
 *
 * Usage:
 *   import MultiTabPane from './MultiTabPane.js';
 *
 *   const tp = new MultiTabPane({
 *     container : document.getElementById('my-pane'),
 *     tabs: [
 *       { id: 'tab1', label: 'First',  content: someElement },
 *       { id: 'tab2', label: 'Second', content: anotherElement },
 *     ],
 *     activeTab : 'tab1',          // optional, defaults to first tab
 *     closable  : true,            // optional, show close buttons
 *     onChange  : (activeId) => {}, // optional, fires on tab switch
 *     onReorder : (order) => {},    // optional, fires after reorder / cross-pane drop
 *     onClose   : (tabId) => {},   // optional, fires after tab closed
 *   });
 *
 *   tp.addTab({ id: 'tab3', label: 'Third', content: el });
 *   tp.removeTab('tab2');
 *   tp.setActive('tab3');
 *   tp.getActive();       // → 'tab3'
 *   tp.getTabs();         // → [{ id, label }, ...]
 *   tp.destroy();
 */

// ── Shared drag state (singleton across all instances) ──────────────────
const _drag = {
  /** @type {MultiTabPane|null} */  current:  null,   // pane the tab is currently in
  /** @type {string|null} */        tabId:    null,
  /** @type {HTMLElement|null} */   btn:      null,
  active:   false,
  startX:   0,
  startY:   0,
  offsetX:  0,                                        // cursor offset within tab
};

const DRAG_THRESHOLD = 4;   // px of movement before entering drag mode

// Registry of all live instances
const _instances = new Set();

export default class MultiTabPane {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {Array<{ id: string, label: string, content: HTMLElement }>} [opts.tabs]
   * @param {string}   [opts.activeTab]
   * @param {boolean}  [opts.closable=false]
   * @param {function} [opts.onChange]
   * @param {function} [opts.onReorder]
   * @param {function} [opts.onClose]
   */
  constructor(opts = {}) {
    const {
      container,
      tabs      = [],
      activeTab = null,
      closable  = false,
      onChange   = null,
      onReorder = null,
      onClose   = null,
    } = opts;

    if (!container) throw new Error('[MultiTabPane] opts.container is required');

    this._container = container;
    this._closable  = closable;
    this._onChange   = onChange;
    this._onReorder = onReorder;
    this._onClose   = onClose;
    this._listeners = [];

    // Tab data: Map<id, { id, label, content, btn, panel }>
    this._tabs   = new Map();
    this._order  = [];         // ordered list of ids
    this._active = null;

    // Build DOM skeleton
    this._bar  = document.createElement('div');
    this._bar.className = 'mtp-bar';
    this._body = document.createElement('div');
    this._body.className = 'mtp-body';
    this._container.appendChild(this._bar);
    this._container.appendChild(this._body);

    // Seed initial tabs
    for (const t of tabs) this._insertTab(t);

    // Activate
    if (activeTab && this._tabs.has(activeTab)) {
      this._setActive(activeTab);
    } else if (this._order.length) {
      this._setActive(this._order[0]);
    }

    _instances.add(this);
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /** Add a tab at the end (or at a specific index). */
  addTab({ id, label, content }, index) {
    this._insertTab({ id, label, content }, index);
    if (this._order.length === 1) this._setActive(id);
    return this;
  }

  /** Remove a tab by id. */
  removeTab(id) {
    this._removeTab(id);
    return this;
  }

  /** Switch to a tab. */
  setActive(id) {
    if (!this._tabs.has(id)) return;
    this._setActive(id);
    return this;
  }

  /** Return active tab id. */
  getActive() { return this._active; }

  /** Return ordered tab descriptors. */
  getTabs() {
    return this._order.map(id => {
      const t = this._tabs.get(id);
      return { id: t.id, label: t.label };
    });
  }

  /** Clean up. */
  destroy() {
    for (const [target, type, fn, opts] of this._listeners) {
      target.removeEventListener(type, fn, opts);
    }
    this._listeners = [];
    this._bar.remove();
    this._body.remove();
    _instances.delete(this);
  }

  // ─── Private: listener tracking ─────────────────────────────────────────

  _on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
  }

  // ─── Private: tab management ────────────────────────────────────────────

  _insertTab({ id, label, content }, index) {
    if (this._tabs.has(id)) return;

    // Tab button
    const btn = document.createElement('div');
    btn.className = 'mtp-tab';
    btn.dataset.tabId = id;

    const span = document.createElement('span');
    span.className = 'mtp-tab-label';
    span.textContent = label;
    btn.appendChild(span);

    if (this._closable) {
      const close = document.createElement('span');
      close.className = 'mtp-tab-close';
      close.textContent = '\u00d7';
      this._on(close, 'click', e => {
        e.stopPropagation();
        this._removeTab(id);
        this._onClose?.(id);
      });
      btn.appendChild(close);
    }

    // Click to activate
    this._on(btn, 'mousedown', e => this._onTabPointerDown(e, id));

    // Content panel
    const panel = document.createElement('div');
    panel.className = 'mtp-panel';
    panel.dataset.tabId = id;
    if (content) panel.appendChild(content);

    // Insert at position
    const idx = (index != null && index >= 0 && index <= this._order.length)
      ? index : this._order.length;

    if (idx < this._order.length) {
      const refBtn = this._tabs.get(this._order[idx]).btn;
      this._bar.insertBefore(btn, refBtn);
      this._order.splice(idx, 0, id);
    } else {
      this._bar.appendChild(btn);
      this._order.push(id);
    }
    this._body.appendChild(panel);

    this._tabs.set(id, { id, label, content, btn, panel });
  }

  _removeTab(id) {
    const tab = this._tabs.get(id);
    if (!tab) return;

    tab.btn.remove();
    tab.panel.remove();
    this._tabs.delete(id);
    this._order = this._order.filter(i => i !== id);

    if (this._active === id) {
      this._active = null;
      if (this._order.length) this._setActive(this._order[0]);
    }
  }

  _setActive(id) {
    const prev = this._active;
    this._active = id;

    for (const [tid, t] of this._tabs) {
      const isActive = tid === id;
      t.btn.classList.toggle('mtp-tab-active', isActive);
      t.panel.classList.toggle('mtp-panel-active', isActive);
    }

    if (prev !== id) this._onChange?.(id);
  }

  // ─── Private: Chrome-style pointer drag ─────────────────────────────────

  _onTabPointerDown(e, id) {
    // Ignore right-click / close button
    if (e.button !== 0) return;
    if (e.target.classList.contains('mtp-tab-close')) return;

    const btn = this._tabs.get(id).btn;

    _drag.current = this;
    _drag.tabId   = id;
    _drag.btn     = btn;
    _drag.active  = false;
    _drag.startX  = e.clientX;
    _drag.startY  = e.clientY;
    _drag.offsetX = e.clientX - btn.getBoundingClientRect().left;

    const onMove = (ev) => this._onPointerMove(ev);
    const onUp   = (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      this._onPointerUp(ev);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

  _onPointerMove(e) {
    const dx = e.clientX - _drag.startX;
    const dy = e.clientY - _drag.startY;

    // Threshold check
    if (!_drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      _drag.active = true;
      _drag.btn.classList.add('mtp-tab-dragging');
      document.body.classList.add('mtp-dragging');
    }

    // Check if cursor entered a different pane's bar
    const targetPane = this._hitTestBar(e.clientX, e.clientY);

    if (targetPane && targetPane !== _drag.current) {
      // Cross-pane transfer
      const fromPane = _drag.current;
      const tabData  = fromPane._tabs.get(_drag.tabId);
      if (tabData) {
        const content = tabData.panel.firstChild;
        const label   = tabData.label;

        // Remove from source (without changing active in source yet)
        tabData.btn.remove();
        tabData.panel.remove();
        fromPane._tabs.delete(_drag.tabId);
        fromPane._order = fromPane._order.filter(i => i !== _drag.tabId);
        if (fromPane._active === _drag.tabId) {
          fromPane._active = null;
          if (fromPane._order.length) fromPane._setActive(fromPane._order[0]);
        }

        // Insert into target at the right position
        const insertIdx = targetPane._hitTestIndex(e.clientX);
        targetPane._insertTab({ id: _drag.tabId, label, content }, insertIdx);
        targetPane._setActive(_drag.tabId);

        // Update drag state
        _drag.btn     = targetPane._tabs.get(_drag.tabId).btn;
        _drag.current = targetPane;
        _drag.btn.classList.add('mtp-tab-dragging');

        fromPane._onReorder?.(fromPane._order);
        targetPane._onReorder?.(targetPane._order);
      }
    }

    const cx = e.clientX;

    // Same-pane reorder: check if we've passed the midpoint of a neighbour
    const pane    = _drag.current;
    const dragIdx = pane._order.indexOf(_drag.tabId);

    // Check rightward swap
    if (dragIdx < pane._order.length - 1) {
      const rightId  = pane._order[dragIdx + 1];
      const rightBtn = pane._tabs.get(rightId).btn;
      const rightRect = rightBtn.getBoundingClientRect();
      if (cx > rightRect.left + rightRect.width / 2) {
        pane._swapOrder(dragIdx, dragIdx + 1);
      }
    }

    // Check leftward swap
    else if (dragIdx > 0) {
      const leftId  = pane._order[dragIdx - 1];
      const leftBtn = pane._tabs.get(leftId).btn;
      const leftRect = leftBtn.getBoundingClientRect();
      if (cx < leftRect.left + leftRect.width / 2) {
        pane._swapOrder(dragIdx, dragIdx - 1);
      }
    }

    // Visual translate of dragged tab (follow cursor, clamped to bar)
    this._applyDragTranslate(cx);
  }

  _onPointerUp(_e) {
    if (_drag.active) {
      _drag.btn.classList.remove('mtp-tab-dragging');
      _drag.btn.style.transform = '';
      document.body.classList.remove('mtp-dragging');

      // Activate the tab we just dropped
      _drag.current._setActive(_drag.tabId);
    } else {
      // It was a click, not a drag — activate
      _drag.current._setActive(_drag.tabId);
    }

    _drag.current = null;
    _drag.tabId   = null;
    _drag.btn     = null;
    _drag.active  = false;
  }

  /** Swap two adjacent entries in _order and reorder the DOM to match. */
  _swapOrder(idxA, idxB) {
    const [lo, hi] = idxA < idxB ? [idxA, idxB] : [idxB, idxA];

    // Swap in the order array
    [this._order[lo], this._order[hi]] = [this._order[hi], this._order[lo]];

    // Reorder DOM: place the lo-index tab before the hi-index tab
    const loBtn = this._tabs.get(this._order[lo]).btn;
    const hiBtn = this._tabs.get(this._order[hi]).btn;
    this._bar.insertBefore(loBtn, hiBtn);

    this._onReorder?.(this._order);
  }

  /** Apply translateX to the dragged tab so it follows the cursor, clamped to bar bounds. */
  _applyDragTranslate(cx) {
    const tabRect = _drag.btn.getBoundingClientRect();
    const barRect = _drag.current._bar.getBoundingClientRect();
    const halfW   = tabRect.width / 2;

    // Clamp cursor so the tab stays within the bar
    const clampedCx = Math.max(barRect.left + halfW, Math.min(cx, barRect.right - halfW));

    const naturalCenter = tabRect.left + halfW;
    const shift = clampedCx - naturalCenter;
    _drag.btn.style.transform = `translateX(${shift}px)`;
  }

  /** Find which pane's bar the cursor is over (if any). */
  _hitTestBar(cx, cy) {
    for (const inst of _instances) {
      const r = inst._bar.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        return inst;
      }
    }
    return null;
  }

  /** Determine the insertion index for a cursor x position in this pane. */
  _hitTestIndex(cx) {
    for (let i = 0; i < this._order.length; i++) {
      const btn  = this._tabs.get(this._order[i]).btn;
      const rect = btn.getBoundingClientRect();
      if (cx < rect.left + rect.width / 2) return i;
    }
    return this._order.length;
  }
}
