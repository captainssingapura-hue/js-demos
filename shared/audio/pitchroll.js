// ─── Shared Pitch Roll Module ───
// Canvas-based horizontal scrolling pitch display.
// Notes scroll right-to-left with a fixed playhead line.

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/**
 * Convert a frequency (Hz) to a MIDI note number.
 * A4 (440 Hz) = MIDI 69.
 */
function freqToMidi(freq) {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

function midiToName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

export class PitchRoll {
  /**
   * @param {HTMLElement} container — element to mount the canvas into
   * @param {Object} [opts]
   * @param {number} [opts.rowHeight]    — px per semitone (default 10)
   * @param {number} [opts.pxPerMs]      — horizontal pixels per millisecond (default 0.15)
   * @param {number} [opts.playheadX]    — fraction of canvas width for the fixed playhead (default 0.25)
   * @param {string} [opts.noteColor]    — fill color for note blocks (default '#fbbf24')
   * @param {string} [opts.activeColor]  — fill color for the currently playing note (default '#ff6b4a')
   * @param {string} [opts.next1Color]   — fill color for next note (default '#4af0c8')
   * @param {string} [opts.next2Color]   — fill color for note +2 (default '#a78bfa')
   * @param {string} [opts.next3Color]   — fill color for note +3 (default '#f472b6')
   * @param {string} [opts.next4Color]   — fill color for note +4 (default '#38bdf8')
   * @param {string} [opts.bgColor]      — background (default '#0a0a0f')
   * @param {string} [opts.gridColor]    — grid line color (default 'rgba(255,255,255,0.06)')
   * @param {string} [opts.playheadColor] — playhead line color (default 'rgba(255,107,74,0.7)')
   * @param {string} [opts.labelColor]   — note label text color (default '#6a6a80')
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.rowHeight   = opts.rowHeight   || 10;
    this.pxPerMs     = opts.pxPerMs     || 0.15;
    this.playheadPct = opts.playheadX   || 0.25;
    this.noteColor     = opts.noteColor     || '#fbbf24';
    this.activeColor   = opts.activeColor   || '#ff6b4a';
    this.next1Color    = opts.next1Color    || '#4af0c8';
    this.next2Color    = opts.next2Color    || '#a78bfa';
    this.next3Color    = opts.next3Color    || '#f472b6';
    this.next4Color    = opts.next4Color    || '#38bdf8';
    this.bgColor       = opts.bgColor       || '#0a0a0f';
    this.gridColor     = opts.gridColor     || 'rgba(255,255,255,0.06)';
    this.playheadColor = opts.playheadColor || 'rgba(255,107,74,0.7)';
    this.labelColor    = opts.labelColor    || '#6a6a80';

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.borderRadius = '6px';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this._notes = [];      // [{startMs, endMs, midi, name}]
    this._midiMin = 60;
    this._midiMax = 84;
    this._elapsedMs = 0;
    this._playing = false;
    this._animId = null;
    this._getElapsed = null; // callback: () => elapsed ms

    this._resize();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);

    this._draw(); // initial empty state
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = Math.max(120, (this._midiMax - this._midiMin + 1) * this.rowHeight + 20);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = w;
    this._h = h;
  }

  /**
   * Load a melody for display.
   * @param {Array} notes — [{startMs, endMs, freq}] where freq > 0 (skip rests)
   */
  setNotes(notes) {
    this._notes = notes
      .filter(n => n.freq > 0)
      .map(n => {
        const midi = freqToMidi(n.freq);
        return { startMs: n.startMs, endMs: n.endMs, midi, name: midiToName(midi) };
      });

    if (this._notes.length) {
      this._midiMin = Math.min(...this._notes.map(n => n.midi)) - 2;
      this._midiMax = Math.max(...this._notes.map(n => n.midi)) + 2;
    } else {
      this._midiMin = 60;
      this._midiMax = 84;
    }

    this._resize();
    this._draw();
  }

  /**
   * Start the rolling animation.
   * @param {Function} getElapsedMs — callback returning current elapsed ms
   */
  start(getElapsedMs) {
    this.stop();
    this._getElapsed = getElapsedMs;
    this._playing = true;
    this._tick();
  }

  /** Pause the animation (keeps state). */
  pause() {
    this._playing = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  /** Resume after pause. */
  resume() {
    if (!this._getElapsed) return;
    this._playing = true;
    this._tick();
  }

  /** Stop and reset. */
  stop() {
    this._playing = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    this._elapsedMs = 0;
    this._getElapsed = null;
    this._draw();
  }

  _tick() {
    if (!this._playing) return;
    if (this._getElapsed) this._elapsedMs = this._getElapsed();
    this._draw();
    this._animId = requestAnimationFrame(() => this._tick());
  }

  _draw() {
    const { ctx, _w: w, _h: h } = this;
    const rh = this.rowHeight;
    const rows = this._midiMax - this._midiMin + 1;
    const playheadX = w * this.playheadPct;
    const elapsed = this._elapsedMs;
    const labelW = 32; // left gutter for note labels

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);

    // Horizontal grid lines + note labels
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    ctx.font = '9px "DM Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= rows; i++) {
      const midi = this._midiMax - i;
      const y = 10 + i * rh;

      ctx.beginPath();
      ctx.moveTo(labelW, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      // Black keys get a subtle fill
      const noteIdx = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteIdx);
      if (isBlack && i < rows) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(labelW, y, w - labelW, rh);
      }

      // C notes get a brighter line
      if (noteIdx === 0 && i < rows) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(labelW, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.strokeStyle = this.gridColor;
      }
    }

    // Find next four upcoming notes (notes are in chronological order)
    const upcoming = [];
    for (const note of this._notes) {
      if (note.startMs > elapsed) {
        upcoming.push(note);
        if (upcoming.length === 4) break;
      }
    }

    // Note blocks
    const cornerR = 3;
    for (const note of this._notes) {
      // x position: playhead is at elapsed time, notes scroll left
      const x = playheadX + (note.startMs - elapsed) * this.pxPerMs;
      const noteW = (note.endMs - note.startMs) * this.pxPerMs;
      const right = x + noteW;

      // Cull off-screen
      if (right < labelW || x > w) continue;

      const row = this._midiMax - note.midi;
      const y = 10 + row * rh + 1;
      const nh = rh - 2;

      // Determine note state
      const isActive = elapsed >= note.startMs && elapsed < note.endMs;
      const upIdx = upcoming.indexOf(note);
      const nextColors = [this.next1Color, this.next2Color, this.next3Color, this.next4Color];

      let color = this.noteColor;
      let alpha = 0.8;
      let glow = false;
      const isHighlighted = isActive || upIdx >= 0;
      if (isActive)       { color = this.activeColor;   alpha = 1.0; glow = true; }
      else if (upIdx >= 0) { color = nextColors[upIdx]; alpha = 1.0 - upIdx * 0.05; }

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;

      // Rounded rect
      const cx = Math.max(x, labelW);
      const cw = Math.min(right, w) - cx;
      if (cw > 0) {
        ctx.beginPath();
        ctx.roundRect(cx, y, cw, nh, cornerR);
        ctx.fill();
      }

      // Note name label inside block (if wide enough)
      if (cw > 24) {
        ctx.fillStyle = '#0a0a0f';
        ctx.globalAlpha = isHighlighted ? 0.9 : 0.7;
        ctx.font = `bold ${Math.min(nh - 2, 10)}px "DM Mono", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(note.name, cx + 4, y + nh / 2);
      }

      ctx.globalAlpha = 1.0;

      // Glow on active note
      if (glow && cw > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(cx, y, cw, nh, cornerR);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Label gutter (drawn over notes so labels stay readable)
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, labelW, h);
    ctx.font = '9px "DM Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < rows; i++) {
      const midi = this._midiMax - i;
      const y = 10 + i * rh;
      const noteIdx = midi % 12;
      ctx.fillStyle = noteIdx === 0 ? '#e8e8f0' : this.labelColor;
      ctx.fillText(midiToName(midi), labelW - 4, y + rh / 2);
    }

    // Playhead line
    const phX = playheadX;
    ctx.strokeStyle = this.playheadColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(phX, 0);
    ctx.lineTo(phX, h);
    ctx.stroke();

    // Playhead triangle
    ctx.fillStyle = this.playheadColor;
    ctx.beginPath();
    ctx.moveTo(phX - 5, 0);
    ctx.lineTo(phX + 5, 0);
    ctx.lineTo(phX, 8);
    ctx.closePath();
    ctx.fill();
  }

  /** Clean up. */
  destroy() {
    this.stop();
    this._resizeObserver.disconnect();
    this.canvas.remove();
  }
}
