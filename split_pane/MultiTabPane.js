/**
 * MultiTabPane.js
 * A zero-dependency ES module for tabbed pane layouts with drag-and-drop
 * tab reordering and cross-pane tab transfer.
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
 *     onDrop    : (tabId, from, to) => {}, // optional, fires after cross-pane drop
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
  /** @type {MultiTabPane|null} */ source: null,
  /** @type {string|null} */       tabId:  null,
  /** @type {HTMLElement|null} */   ghost:  null,
};

// Registry of all live instances — used for cross-pane drop detection
const _instances = new Set();

export default class MultiTabPane {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {Array<{ id: string, label: string, content: HTMLElement }>} [opts.tabs]
   * @param {string}   [opts.activeTab]
   * @param {boolean}  [opts.closable=false]
   * @param {function} [opts.onChange]
   * @param {function} [opts.onDrop]
   * @param {function} [opts.onClose]
   */
  constructor(opts = {}) {
    const {
      container,
      tabs      = [],
      activeTab = null,
      closable  = false,
      onChange   = null,
      onDrop    = null,
      onClose   = null,
    } = opts;

    if (!container) throw new Error('[MultiTabPane] opts.container is required');

    this._container = container;
    this._closable  = closable;
    this._onChange   = onChange;
    this._onDrop    = onDrop;
    this._onClose   = onClose;
    this._listeners = [];

    // Tab data: Map<id, { id, label, content }>
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

    // Drop indicator
    this._dropIndicator = document.createElement('div');
    this._dropIndicator.className = 'mtp-drop-indicator';
    this._bar.appendChild(this._dropIndicator);

    // Seed initial tabs
    for (const t of tabs) this._insertTab(t);

    // Activate
    if (activeTab && this._tabs.has(activeTab)) {
      this._setActive(activeTab);
    } else if (this._order.length) {
      this._setActive(this._order[0]);
    }

    // Listen for dragover / drop on bar (for receiving tabs)
    this._on(this._bar, 'dragover', e => this._onBarDragOver(e));
    this._on(this._bar, 'dragleave', e => this._onBarDragLeave(e));
    this._on(this._bar, 'drop', e => this._onBarDrop(e));

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
    btn.setAttribute('draggable', 'true');

    const span = document.createElement('span');
    span.className = 'mtp-tab-label';
    span.textContent = label;
    btn.appendChild(span);

    if (this._closable) {
      const close = document.createElement('span');
      close.className = 'mtp-tab-close';
      close.textContent = '\u00d7';
      close.addEventListener('click', e => {
        e.stopPropagation();
        this._removeTab(id);
        this._onClose?.(id);
      });
      btn.appendChild(close);
    }

    // Click to activate
    this._on(btn, 'click', () => this._setActive(id));

    // Drag start
    this._on(btn, 'dragstart', e => {
      _drag.source = this;
      _drag.tabId  = id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      btn.classList.add('mtp-tab-dragging');

      // Ghost
      const ghost = btn.cloneNode(true);
      ghost.classList.add('mtp-ghost');
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      _drag.ghost = ghost;

      requestAnimationFrame(() => btn.classList.add('mtp-tab-dragging'));
    });

    this._on(btn, 'dragend', () => {
      btn.classList.remove('mtp-tab-dragging');
      this._dropIndicator.style.display = 'none';
      if (_drag.ghost) { _drag.ghost.remove(); _drag.ghost = null; }
      _drag.source = null;
      _drag.tabId  = null;
      // Clear indicators on all instances
      for (const inst of _instances) {
        inst._dropIndicator.style.display = 'none';
      }
    });

    // Content panel
    const panel = document.createElement('div');
    panel.className = 'mtp-panel';
    panel.dataset.tabId = id;
    if (content) panel.appendChild(content);

    // Insert at position
    const idx = (index != null && index >= 0 && index < this._order.length)
      ? index : this._order.length;

    if (idx < this._order.length) {
      const refBtn = this._bar.querySelector(`[data-tab-id="${this._order[idx]}"]`);
      this._bar.insertBefore(btn, refBtn);
      this._order.splice(idx, 0, id);
    } else {
      this._bar.insertBefore(btn, this._dropIndicator);
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

  // ─── Private: drop target handling ──────────────────────────────────────

  _onBarDragOver(e) {
    if (!_drag.tabId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Find insertion position and show indicator
    const tabEls = [...this._bar.querySelectorAll('.mtp-tab:not(.mtp-tab-dragging)')];
    let insertIdx = this._order.length;

    for (let i = 0; i < tabEls.length; i++) {
      const rect = tabEls[i].getBoundingClientRect();
      if (e.clientX < rect.left + rect.width / 2) {
        insertIdx = this._order.indexOf(tabEls[i].dataset.tabId);
        // Position indicator
        this._dropIndicator.style.display = 'block';
        this._dropIndicator.style.left = (rect.left - this._bar.getBoundingClientRect().left) + 'px';
        return;
      }
    }

    // After last tab
    if (tabEls.length) {
      const last = tabEls[tabEls.length - 1].getBoundingClientRect();
      this._dropIndicator.style.display = 'block';
      this._dropIndicator.style.left = (last.right - this._bar.getBoundingClientRect().left) + 'px';
    }
  }

  _onBarDragLeave(e) {
    // Only hide if truly leaving the bar
    if (!this._bar.contains(e.relatedTarget)) {
      this._dropIndicator.style.display = 'none';
    }
  }

  _onBarDrop(e) {
    e.preventDefault();
    this._dropIndicator.style.display = 'none';

    const dragId     = _drag.tabId;
    const fromPane   = _drag.source;
    if (!dragId || !fromPane) return;

    // Determine insertion index
    const tabEls = [...this._bar.querySelectorAll('.mtp-tab:not(.mtp-tab-dragging)')];
    let insertIdx = this._order.length;
    for (let i = 0; i < tabEls.length; i++) {
      const rect = tabEls[i].getBoundingClientRect();
      if (e.clientX < rect.left + rect.width / 2) {
        insertIdx = this._order.indexOf(tabEls[i].dataset.tabId);
        break;
      }
    }

    if (fromPane === this) {
      // Reorder within same pane
      this._reorderTab(dragId, insertIdx);
    } else {
      // Cross-pane transfer
      const tabData = fromPane._tabs.get(dragId);
      if (!tabData) return;

      // Extract content before removing
      const content = tabData.panel.firstChild;
      const label   = tabData.label;
      fromPane._removeTab(dragId);

      this._insertTab({ id: dragId, label, content }, insertIdx);
      this._setActive(dragId);

      this._onDrop?.(dragId, fromPane, this);
      fromPane._onDrop?.(dragId, fromPane, this);
    }
  }

  _reorderTab(id, toIdx) {
    const fromIdx = this._order.indexOf(id);
    if (fromIdx === -1 || fromIdx === toIdx) return;

    // Remove from old position
    this._order.splice(fromIdx, 1);
    // Adjust index if needed
    if (toIdx > fromIdx) toIdx--;
    this._order.splice(toIdx, 0, id);

    // Reorder DOM
    const tab = this._tabs.get(id);
    if (toIdx < this._order.length - 1) {
      const refId  = this._order[toIdx + 1];
      const refBtn = this._tabs.get(refId).btn;
      this._bar.insertBefore(tab.btn, refBtn);
    } else {
      this._bar.insertBefore(tab.btn, this._dropIndicator);
    }
  }
}
