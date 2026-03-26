/* demo.js — FX Volatility Surface demo
   Exports createDemo() which builds the entire UI and returns a managed root element.
*/

import { VolSurface, COLORMAPS } from './vol-surface.js';
import { PAIRS, buildVolGrid } from './fx-data.js';
import { createRandomProvider } from './random-provider.js';

// ── DOM helpers ──────────────────────────────────────────────────────────
function el(tag, cls, attrs) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  });
  return e;
}

function buildHeader() {
  const header = el('div', 'header');
  const left   = el('div');
  left.appendChild(el('div', 'header-title', { text: 'FX Implied Volatility Surface' }));
  const pair = el('div', 'header-pair', { text: 'EUR/USD' });
  left.appendChild(pair);
  header.appendChild(left);
  header.appendChild(el('div', 'header-note', { text: 'Illustrative SVI-style surface \u00b7 not live data' }));
  return { header, pairLabel: pair };
}

function buildControls() {
  const controls = el('div', 'controls');

  // Pair buttons
  const pairBtns = el('div', 'pair-buttons');
  const pairs = [
    ['EURUSD', 'EUR/USD'],
    ['USDJPY', 'USD/JPY'],
    ['GBPUSD', 'GBP/USD'],
    ['USDCHF', 'USD/CHF'],
  ];
  pairs.forEach(([key, label]) => {
    const btn = el('button', 'pair-btn', { text: label, 'data-pair': key });
    if (key === 'EURUSD') btn.classList.add('active');
    pairBtns.appendChild(btn);
  });
  controls.appendChild(pairBtns);

  // Right-side controls
  const right = el('div', 'controls-right');

  // Wireframe toggle
  const wireLabel = el('label', 'toggle-label');
  const wireCheck = el('input', null, { type: 'checkbox' });
  wireLabel.appendChild(wireCheck);
  wireLabel.appendChild(document.createTextNode(' Wireframe'));
  right.appendChild(wireLabel);

  // Colormap select
  const selWrap = el('div', 'select-wrap');
  selWrap.appendChild(el('span', null, { text: 'Colormap' }));
  const select = el('select');
  Object.keys(COLORMAPS).forEach(name => {
    const opt = el('option', null, { value: name, text: name.charAt(0).toUpperCase() + name.slice(1) });
    select.appendChild(opt);
  });
  selWrap.appendChild(select);
  right.appendChild(selWrap);

  controls.appendChild(right);
  return { controls, pairBtns, wireCheck, colormapSelect: select };
}

function buildStats() {
  const stats = el('div', 'stats');
  const cards = [
    ['ATM 1M',    'stat-atm'],
    ['25\u0394 RR 1Y', 'stat-rr'],
    ['Vol Skew',  'stat-skew'],
    ['Term Slope','stat-slope'],
  ];
  const refs = {};
  cards.forEach(([label, key]) => {
    const card = el('div', 'stat-card');
    card.appendChild(el('div', 'stat-label', { text: label }));
    const val = el('div', 'stat-value', { text: '\u2014' });
    card.appendChild(val);
    stats.appendChild(card);
    refs[key] = val;
  });
  return { stats, refs };
}

function buildCanvas() {
  const wrap = el('div', 'canvas-wrap');
  wrap.appendChild(el('div', 'axes-hint', { text: 'Drag to rotate \u00b7 Scroll to zoom \u00b7 Right-drag to pan' }));
  return wrap;
}

function buildLegend() {
  const row = el('div', 'legend-row');
  row.appendChild(el('span', 'legend-label', { text: 'Low vol \u2192 High vol' }));
  row.appendChild(el('span', 'legend-note',  { text: 'Three.js r128' }));
  return row;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Create the full demo UI.
 * @param {object}  options
 * @param {object}  options.THREE - Three.js namespace
 * @returns {{ el: HTMLElement, destroy: Function }}
 */
export function createDemo({ THREE }) {
  const root = el('div', 'vol-demo');

  // Build DOM sections
  const { header, pairLabel }                        = buildHeader();
  const { controls, pairBtns, wireCheck, colormapSelect } = buildControls();
  const { stats, refs }                              = buildStats();
  const canvasWrap                                   = buildCanvas();
  const legend                                       = buildLegend();

  root.append(header, controls, stats, canvasWrap, legend);

  // VolSurface (needs to be in DOM for clientWidth/Height)
  let vs = null;
  let currentPair = 'EURUSD';

  function init() {
    vs = new VolSurface(canvasWrap, {
      THREE,
      colormap:    colormapSelect.value,
      wireframe:   wireCheck.checked,
      provider:    createRandomProvider,
      initialData: buildVolGrid(currentPair),
    });

    // Pair buttons
    pairBtns.addEventListener('click', e => {
      const btn = e.target.closest('.pair-btn');
      if (!btn) return;
      setPair(btn.dataset.pair);
    });

    wireCheck.addEventListener('change', () => vs.setWireframe(wireCheck.checked));
    colormapSelect.addEventListener('change', () => vs.setColormap(colormapSelect.value));

    updateStats(currentPair);
  }

  function setPair(pairKey) {
    currentPair = pairKey;
    vs.setBaseline(buildVolGrid(pairKey));
    pairBtns.querySelectorAll('.pair-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pair === pairKey);
    });
    updateStats(pairKey);
  }

  function updateStats(pairKey) {
    const p = PAIRS[pairKey];
    refs['stat-atm'].textContent   = p.atm[1].toFixed(1) + '%';
    refs['stat-rr'].textContent    = (p.rr[4] >= 0 ? '+' : '') + p.rr[4].toFixed(1) + ' vol';
    refs['stat-skew'].textContent  = p.skew;
    refs['stat-slope'].textContent = p.slope;
    pairLabel.textContent          = p.label;
  }

  // Defer init until the root is in the DOM (so container has dimensions)
  const observer = new MutationObserver(() => {
    if (root.isConnected) {
      observer.disconnect();
      init();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return {
    el: root,
    destroy() {
      observer.disconnect();
      if (vs) vs.destroy();
    },
  };
}
