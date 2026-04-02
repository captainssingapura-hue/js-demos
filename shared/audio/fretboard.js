// ─── Shared Fretboard Module (Canvas) ───

import { N } from './synthesizer.js';

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
const DOT_FRETS     = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOT    = [12];

// String thickness (low E thickest → high e thinnest)
const STRING_WIDTHS = [3.0, 2.4, 1.8, 1.4, 1.0, 0.8];

// Highlight colors keyed by class name
const COLORS = {
  active:  { bg: '#fbbf24', glow: 'rgba(251,191,36,0.5)',  text: '#0a0a0f' },
  'next-1':{ bg: '#4af0c8', glow: 'rgba(74,240,200,0.4)',  text: '#0a0a0f' },
  'next-2':{ bg: '#a78bfa', glow: 'rgba(167,139,250,0.4)', text: '#0a0a0f' },
  'next-3':{ bg: '#f472b6', glow: 'rgba(244,114,182,0.4)', text: '#0a0a0f' },
  'next-4':{ bg: '#38bdf8', glow: 'rgba(56,189,248,0.4)',  text: '#0a0a0f' },
  octave:  { bg: 'rgba(251,191,36,0.15)', glow: 'none',    text: '#fbbf24' },
  correct: { bg: '#4af0c8', glow: 'rgba(74,240,200,0.5)',  text: '#0a0a0f' },
  wrong:   { bg: '#ff6b4a', glow: 'rgba(255,107,74,0.5)',  text: '#0a0a0f' },
};

const PRIORITY = ['active', 'next-1', 'next-2', 'next-3', 'next-4', 'octave'];

export class Fretboard {
  /**
   * @param {HTMLElement} container — element to render into
   * @param {Object} [opts]
   * @param {number[]} [opts.strings] — open-string frequencies, low to high
   * @param {number} [opts.frets] — number of frets (default 21)
   */
  constructor(container, opts = {}) {
    this.strings = opts.strings || [N('E',2), N('A',2), N('D',3), N('G',3), N('B',3), N('E',4)];
    this.frets   = opts.frets  || 21;
    this.container = container;

    // State: cells[string][fret] = { cls: string|null, label: string }
    this.cells = [];
    for (let s = 0; s < this.strings.length; s++) {
      this.cells[s] = [];
      for (let f = 0; f <= this.frets; f++) {
        this.cells[s][f] = { cls: null, label: '' };
      }
    }

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.borderRadius = '4px';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Layout cache
    this._layout = null;
    this._dirty = false;
    this._batchDepth = 0;

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.container);
  }

  // ─── Layout ────────────────────────────────────────────────

  _resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height || 180;
    if (w === 0) return;

    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this._computeLayout(w, h);
    this._draw();
  }

  _computeLayout(w, h) {
    const nutW     = 28;                          // nut column width
    const headerH  = 16;                          // fret-number row height
    const padBot   = 2;
    const bodyH    = h - headerH - padBot;
    const rowH     = bodyH / this.strings.length;
    const fretArea = w - nutW;
    const fretW    = fretArea / this.frets;       // per-fret column width

    this._layout = { w, h, nutW, headerH, bodyH, rowH, fretArea, fretW, padBot };
  }

  /** Get the pixel rect for a cell. */
  _cellRect(stringIdx, fretIdx) {
    const L = this._layout;
    if (fretIdx === 0) {
      return { x: 0, y: L.headerH + stringIdx * L.rowH, w: L.nutW, h: L.rowH };
    }
    return {
      x: L.nutW + (fretIdx - 1) * L.fretW,
      y: L.headerH + stringIdx * L.rowH,
      w: L.fretW,
      h: L.rowH,
    };
  }

  // ─── Drawing ───────────────────────────────────────────────

  _draw() {
    const ctx = this.ctx;
    const L   = this._layout;
    if (!L) return;
    const { w, h, nutW, headerH, bodyH, rowH, fretW } = L;

    // Background
    ctx.fillStyle = '#0e0e16';
    ctx.fillRect(0, 0, w, h);

    // ── Fret number header ──
    ctx.font = '9px "DM Mono", monospace';
    ctx.fillStyle = '#6a6a80';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let f = 1; f <= this.frets; f++) {
      const x = nutW + (f - 1) * fretW + fretW / 2;
      ctx.fillText(f, x, headerH / 2);
    }

    // ── Fretboard body background ──
    ctx.fillStyle = '#18181f';
    ctx.fillRect(0, headerH, w, bodyH);

    // ── Nut column ──
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, headerH, nutW, bodyH);
    // Nut edge line
    ctx.strokeStyle = '#6a6a80';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(nutW, headerH);
    ctx.lineTo(nutW, headerH + bodyH);
    ctx.stroke();

    // ── Fret lines ──
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 1;
    for (let f = 1; f <= this.frets; f++) {
      const x = nutW + f * fretW;
      ctx.beginPath();
      ctx.moveTo(x, headerH);
      ctx.lineTo(x, headerH + bodyH);
      ctx.stroke();
    }

    // ── Row separator lines (very subtle) ──
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let s = 1; s < this.strings.length; s++) {
      const y = headerH + s * rowH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // ── Dot markers ──
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let f = 1; f <= this.frets; f++) {
      const cx = nutW + (f - 1) * fretW + fretW / 2;
      if (DOT_FRETS.includes(f)) {
        // Single dot at center of fretboard
        const cy = headerH + bodyH / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (DOUBLE_DOT.includes(f)) {
        // Two dots — between strings 1-2 and 4-5
        const cy1 = headerH + 1.5 * rowH;
        const cy2 = headerH + 4.5 * rowH;
        ctx.beginPath();
        ctx.arc(cx, cy1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Highlighted cells (under strings) ──
    for (let s = 0; s < this.strings.length; s++) {
      for (let f = 0; f <= this.frets; f++) {
        const cell = this.cells[s][f];
        if (!cell.cls) continue;
        this._drawHighlight(s, f, cell);
      }
    }

    // ── Guitar strings ──
    for (let s = 0; s < this.strings.length; s++) {
      const y = headerH + s * rowH + rowH / 2;
      const thickness = STRING_WIDTHS[s];

      // String shadow (subtle depth)
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = thickness + 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 1);
      ctx.lineTo(w, y + 1);
      ctx.stroke();

      // String body — metallic gradient
      const grad = ctx.createLinearGradient(0, y - thickness, 0, y + thickness);
      grad.addColorStop(0, '#888890');
      grad.addColorStop(0.3, '#c0c0c8');
      grad.addColorStop(0.5, '#e0e0e8');
      grad.addColorStop(0.7, '#c0c0c8');
      grad.addColorStop(1, '#707078');
      ctx.strokeStyle = grad;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      // String highlight (thin bright line on top)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y - thickness * 0.3);
      ctx.lineTo(w, y - thickness * 0.3);
      ctx.stroke();
    }

    // ── Nut string labels (on top of everything) ──
    ctx.font = 'bold 11px "Syne", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let s = 0; s < this.strings.length; s++) {
      const y = headerH + s * rowH + rowH / 2;
      // Label background
      ctx.fillStyle = '#2a2a3a';
      const lw = 18, lh = 15;
      ctx.fillRect(nutW / 2 - lw / 2, y - lh / 2, lw, lh);
      // Label text
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(STRING_LABELS[s], nutW / 2, y + 0.5);
    }

    // ── Highlight labels (on top of strings) ──
    for (let s = 0; s < this.strings.length; s++) {
      for (let f = 0; f <= this.frets; f++) {
        const cell = this.cells[s][f];
        if (!cell.cls || !cell.label) continue;
        this._drawLabel(s, f, cell);
      }
    }
  }

  _drawHighlight(s, f, cell) {
    const ctx = this.ctx;
    const color = COLORS[cell.cls];
    if (!color) return;

    const r = this._cellRect(s, f);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const radius = Math.min(r.w, r.h) * 0.4;

    // Glow
    if (color.glow !== 'none') {
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = 14;
    }

    // Filled circle
    ctx.fillStyle = color.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Bright ring for active/next
    if (cell.cls !== 'octave') {
      ctx.strokeStyle = color.bg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawLabel(s, f, cell) {
    const ctx   = this.ctx;
    const color = COLORS[cell.cls];
    if (!color) return;

    const r  = this._cellRect(s, f);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    ctx.font = 'bold 9px "Syne", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color.text;
    ctx.fillText(cell.label, cx, cy + 0.5);
  }

  // ─── Draw scheduling ────────────────────────────────────────

  /** Request a redraw. Deferred while inside a batch() call. */
  _requestDraw() {
    if (this._batchDepth > 0) { this._dirty = true; return; }
    this._draw();
  }

  /**
   * Group multiple highlight/clear calls into a single redraw.
   * Usage: fretboard.batch(() => { clearAll(); highlight(...); highlight(...); });
   */
  batch(fn) {
    this._batchDepth++;
    try { fn(); } finally {
      this._batchDepth--;
      if (this._batchDepth === 0 && this._dirty) {
        this._dirty = false;
        this._draw();
      }
    }
  }

  // ─── Public API ────────────────────────────────────────────

  static PRIORITY = PRIORITY;

  findFretPosition(freq) {
    let best = null;
    let bestFret = Infinity;

    for (let s = 0; s < this.strings.length; s++) {
      const openFreq = this.strings[s];
      const fret = Math.round(12 * Math.log2(freq / openFreq));
      if (fret >= 0 && fret <= this.frets) {
        if (fret < bestFret) {
          bestFret = fret;
          best = { string: s, fret };
        }
      }
    }
    return best;
  }

  findAllPositions(freq) {
    const positions = [];

    for (let s = 0; s < this.strings.length; s++) {
      const openFreq = this.strings[s];
      const fret = Math.round(12 * Math.log2(freq / openFreq));
      if (fret >= 0 && fret <= this.frets) {
        positions.push({ string: s, fret });
      }
    }

    if (positions.length === 0) return { primary: null, alternates: [] };
    positions.sort((a, b) => a.fret - b.fret);
    return { primary: positions[0], alternates: positions.slice(1) };
  }

  highlight(stringIdx, fretIdx, cls = 'active', label = '') {
    const cell = this.cells[stringIdx]?.[fretIdx];
    if (!cell) return;

    const newPri = PRIORITY.indexOf(cls);
    let curPri = PRIORITY.length;
    if (cell.cls) {
      const idx = PRIORITY.indexOf(cell.cls);
      if (idx >= 0) curPri = idx;
    }

    if (newPri <= curPri || !cell.cls) {
      cell.cls = cls;
    }

    if (label !== '') {
      cell.label = cell.label ? cell.label + ' ' + label : label;
    }

    this._requestDraw();
  }

  unhighlight(stringIdx, fretIdx) {
    const cell = this.cells[stringIdx]?.[fretIdx];
    if (cell) { cell.cls = null; cell.label = ''; }
    this._requestDraw();
  }

  clearAll() {
    for (const row of this.cells) {
      for (const cell of row) {
        cell.cls = null;
        cell.label = '';
      }
    }
    this._requestDraw();
  }
}
