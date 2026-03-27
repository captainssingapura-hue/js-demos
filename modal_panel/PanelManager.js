/**
 * PanelManager.js
 * Orchestrates multiple ModalControl instances — manages z-index stacking,
 * panel registry, and bulk operations.
 *
 * Usage:
 *   import PanelManager from './PanelManager.js';
 *   import ModalControl from './ModalControl.js';
 *
 *   const mgr = new PanelManager({ zBase: 1000 });
 *
 *   // Create a panel — the manager wires focus automatically
 *   const panel = mgr.create({
 *     container: document.body,
 *     title: 'My Panel',
 *     content: el,
 *     x: 100, y: 80, width: 400, height: 300,
 *   });
 *
 *   // Or adopt an existing ModalControl
 *   mgr.add(existingPanel);
 *
 *   mgr.bringToFront(panel);
 *   mgr.get('my-id');
 *   mgr.closeAll();
 *   mgr.openAll();
 *   mgr.forEach(p => ...);
 *   mgr.remove(panel);        // unregisters (does not destroy)
 *   mgr.destroyAll();
 */

import ModalControl from './ModalControl.js';

export default class PanelManager {
  /**
   * @param {object} [opts]
   * @param {number} [opts.zBase=1000] - starting z-index
   */
  constructor(opts = {}) {
    const { zBase = 1000 } = opts;
    this._zTop   = zBase;
    this._panels = new Map();   // id → ModalControl
  }

  // ─── Panel lifecycle ──────────────────────────────────────────────────

  /**
   * Create a new ModalControl and register it.
   * Accepts all ModalControl opts plus an optional `id`.
   * Returns the created ModalControl.
   *
   * @param {object} opts - ModalControl options + { id?: string }
   * @returns {ModalControl}
   */
  create(opts = {}) {
    const id = opts.id || _uid();

    // Intercept onFocus to wire z-index stacking
    const userOnFocus = opts.onFocus || null;
    const panel = new ModalControl({
      ...opts,
      onFocus: () => {
        this.bringToFront(panel);
        userOnFocus?.();
      },
    });

    panel._managerId = id;
    this._panels.set(id, panel);
    this.bringToFront(panel);
    return panel;
  }

  /**
   * Adopt an existing ModalControl into this manager.
   * Replaces the panel's onFocus to wire z-index stacking.
   *
   * @param {ModalControl} panel
   * @param {string} [id]
   * @returns {this}
   */
  add(panel, id) {
    const resolvedId = id || panel._managerId || _uid();
    panel._managerId = resolvedId;

    // Wrap existing onFocus
    const prev = panel._onFocus;
    panel._onFocus = () => {
      this.bringToFront(panel);
      prev?.();
    };

    this._panels.set(resolvedId, panel);
    this.bringToFront(panel);
    return this;
  }

  /**
   * Unregister a panel without destroying it.
   * @param {ModalControl|string} panelOrId
   * @returns {boolean} true if found and removed
   */
  remove(panelOrId) {
    const id = typeof panelOrId === 'string' ? panelOrId : panelOrId._managerId;
    return this._panels.delete(id);
  }

  // ─── Lookup ───────────────────────────────────────────────────────────

  /**
   * Get a panel by id.
   * @param {string} id
   * @returns {ModalControl|undefined}
   */
  get(id) { return this._panels.get(id); }

  /** Number of registered panels. */
  get size() { return this._panels.size; }

  /**
   * Iterate all panels.
   * @param {function} fn - (panel, id) => void
   */
  forEach(fn) {
    this._panels.forEach((panel, id) => fn(panel, id));
  }

  /** Return an array of all registered [id, panel] pairs. */
  entries() { return [...this._panels.entries()]; }

  // ─── Z-index stacking ────────────────────────────────────────────────

  /**
   * Bring a panel to the front of the z-index stack.
   * @param {ModalControl|string} panelOrId
   */
  bringToFront(panelOrId) {
    const panel = typeof panelOrId === 'string'
      ? this._panels.get(panelOrId)
      : panelOrId;
    if (!panel) return;

    this._zTop += 1;
    panel.el.style.zIndex = this._zTop;
  }

  // ─── Bulk operations ──────────────────────────────────────────────────

  /** Close all panels. */
  closeAll() {
    this._panels.forEach(p => p.close());
  }

  /** Open all panels. */
  openAll() {
    this._panels.forEach(p => p.open());
  }

  /** Destroy all panels and clear the registry. */
  destroyAll() {
    this._panels.forEach(p => p.destroy());
    this._panels.clear();
  }
}

// ── Unique ID generator ─────────────────────────────────────────────────
let _counter = 0;
function _uid() { return `mp_${++_counter}`; }
