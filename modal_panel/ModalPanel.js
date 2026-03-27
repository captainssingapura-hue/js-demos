/**
 * ModalPanel.js
 * Convenience facade that combines ModalControl + PanelManager into a single
 * import for simple use cases.  A shared PanelManager is created automatically.
 *
 * For framework integration or custom stacking, import ModalControl and
 * PanelManager separately instead.
 *
 * Usage (unchanged from before the split):
 *   import ModalPanel from './ModalPanel.js';
 *
 *   const panel = new ModalPanel({
 *     container : document.body,
 *     title     : 'My Panel',
 *     content   : someElement,
 *     x: 100, y: 80, width: 420, height: 300,
 *   });
 *
 *   panel.setTitle('New');  panel.open();  panel.close();  panel.destroy();
 */

import ModalControl from './ModalControl.js';
import PanelManager from './PanelManager.js';

// Shared default manager for facade usage
const _defaultMgr = new PanelManager();

export default class ModalPanel {
  /**
   * Creates a managed ModalControl.
   * Accepts all ModalControl options.
   * @param {object} opts
   */
  constructor(opts = {}) {
    /** @type {ModalControl} */
    this._ctrl = _defaultMgr.create(opts);
  }

  // ─── Delegate public API to the underlying ModalControl ───────────────

  get el()           { return this._ctrl.el; }
  setTitle(t)        { this._ctrl.setTitle(t);     return this; }
  setContent(el)     { this._ctrl.setContent(el);  return this; }
  moveTo(x, y)       { this._ctrl.moveTo(x, y);    return this; }
  resize(w, h)       { this._ctrl.resize(w, h);    return this; }
  open()             { this._ctrl.open();           return this; }
  close()            { this._ctrl.close();          return this; }
  toggle()           { this._ctrl.toggle();         return this; }
  isOpen()           { return this._ctrl.isOpen(); }

  destroy() {
    _defaultMgr.remove(this._ctrl);
    this._ctrl.destroy();
  }
}

// Re-export building blocks for advanced usage
export { ModalControl, PanelManager };
