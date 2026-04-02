// ─── Audio Visualizer — app.js ───

import { Mic } from '../shared/audio/mic.js';
import { PitchDetector } from '../shared/audio/pitchdetect.js';
import { PanelManager } from '../modal_panel/ModalPanel.js';


// ─────────────────────────────────────────
//  1. STATE & DOM
// ─────────────────────────────────────────

const mic = new Mic({ fftSize: 4096, smoothing: 0.3 });
let detector = null;
let running = false;
let animId = null;
let specMode = 'linear'; // linear | log | bars

// DOM refs
const toggleBtn    = document.getElementById('vizToggle');
const levelBar     = document.getElementById('levelBar');
const levelLabel   = document.getElementById('levelLabel');
const statusText   = document.getElementById('statusText');
const panelArea    = document.getElementById('panelArea');

// Pitch scroll history
const PS_MAX_FRAMES = 400;
let psHistory = [];
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Panel manager
const mgr = new PanelManager({ zBase: 100 });


// ─────────────────────────────────────────
//  2. BUILD PANEL CONTENTS
// ─────────────────────────────────────────

// --- Pitch HUD content ---
function buildPitchContent() {
  const wrap = document.createElement('div');
  wrap.className = 'pitch-hud-content';
  wrap.innerHTML = `
    <div class="pitch-note" id="pitchNote">—</div>
    <div class="pitch-details">
      <span class="pitch-freq" id="pitchFreq">— Hz</span>
      <span class="pitch-cents" id="pitchCents"></span>
      <span class="pitch-conf" id="pitchConf"></span>
    </div>`;
  return wrap;
}

// --- Waveform content ---
function buildCanvasContent(id) {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.className = 'viz-canvas';
  return canvas;
}

// --- Spectrum content (buttons + canvas) ---
function buildSpectrumContent() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;';

  const controls = document.createElement('div');
  controls.className = 'spectrum-controls';
  controls.innerHTML = `
    <button class="spec-btn active" data-mode="linear">Linear</button>
    <button class="spec-btn" data-mode="log">Log</button>
    <button class="spec-btn" data-mode="bars">Bars</button>`;
  wrap.appendChild(controls);

  const canvas = document.createElement('canvas');
  canvas.id = 'specCanvas';
  canvas.className = 'viz-canvas';
  wrap.appendChild(canvas);

  // Mode switcher
  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('.spec-btn');
    if (!btn) return;
    controls.querySelectorAll('.spec-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    specMode = btn.dataset.mode;
  });

  return wrap;
}


// ─────────────────────────────────────────
//  3. CREATE MODAL PANELS
// ─────────────────────────────────────────

// Compute default layout based on available width.
// Panels mount on document.body (absolute positioning) so coordinates are viewport-relative.
function computeDefaults() {
  const areaRect = panelArea.getBoundingClientRect();
  const originX = areaRect.left + window.scrollX;
  const originY = areaRect.top  + window.scrollY;
  const areaW   = areaRect.width || 800;
  const gap = 10;
  const pitchW = Math.min(320, Math.floor(areaW * 0.35));
  const waveW = areaW - pitchW - gap;
  const row1H = 130;
  const row2Y = row1H + gap;
  const halfW = Math.floor((areaW - gap) / 2);
  const row2H = 220;

  return {
    pitch:    { title: 'Pitch Detection',    x: originX,                y: originY,           width: pitchW, height: row1H, minWidth: 180, minHeight: 80  },
    waveform: { title: 'Waveform',           x: originX + pitchW + gap, y: originY,           width: waveW,  height: row1H, minWidth: 200, minHeight: 100 },
    spectrum: { title: 'Frequency Spectrum',  x: originX,                y: originY + row2Y,   width: halfW,  height: row2H, minWidth: 200, minHeight: 120 },
    scroll:   { title: 'Pitch Scroll',       x: originX + halfW + gap,  y: originY + row2Y,   width: halfW,  height: row2H, minWidth: 200, minHeight: 140 },
  };
}

const PANEL_DEFAULTS = computeDefaults();

// Content builders
const pitchContent = buildPitchContent();
const waveContent  = buildCanvasContent('waveCanvas');
const specContent  = buildSpectrumContent();
const scrollContent = buildCanvasContent('pitchScrollCanvas');

// Panels object for quick reference
const panels = {};

function createPanel(key, contentEl) {
  const def = PANEL_DEFAULTS[key];
  const panel = mgr.create({
    container: document.body,
    id: key,
    title: def.title,
    content: contentEl,
    x: def.x, y: def.y,
    width: def.width, height: def.height,
    minWidth: def.minWidth, minHeight: def.minHeight,
    resizable: true,
    closable: true,
    onClose: () => {
      document.getElementById(`tog${key.charAt(0).toUpperCase() + key.slice(1)}`).classList.remove('active');
    },
    onResize: () => sizeAllCanvases(),
  });
  panels[key] = panel;
  return panel;
}

createPanel('pitch',    pitchContent);
createPanel('waveform', waveContent);
createPanel('spectrum', specContent);
createPanel('scroll',   scrollContent);

// Map toggle button IDs
const toggleMap = {
  togPitch: 'pitch',
  togWave:  'waveform',
  togSpec:  'spectrum',
  togScroll:'scroll',
};

// DOM refs for pitch HUD (now inside panel)
let pitchNote, pitchFreq, pitchCents, pitchConf;

function cachePitchDom() {
  pitchNote  = document.getElementById('pitchNote');
  pitchFreq  = document.getElementById('pitchFreq');
  pitchCents = document.getElementById('pitchCents');
  pitchConf  = document.getElementById('pitchConf');
}
cachePitchDom();

// Canvas refs
let waveCanvas, waveCtx, specCanvas, specCtx, psCanvas, psCtx;

function cacheCanvasRefs() {
  waveCanvas = document.getElementById('waveCanvas');
  waveCtx    = waveCanvas?.getContext('2d');
  specCanvas = document.getElementById('specCanvas');
  specCtx    = specCanvas?.getContext('2d');
  psCanvas   = document.getElementById('pitchScrollCanvas');
  psCtx      = psCanvas?.getContext('2d');
}
cacheCanvasRefs();


// ─────────────────────────────────────────
//  4. PANEL TOGGLE BUTTONS
// ─────────────────────────────────────────

document.getElementById('vizToolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('.panel-toggle[data-panel]');
  if (!btn) return;
  const key = btn.dataset.panel;
  const panel = panels[key];
  if (!panel) return;

  panel.toggle();
  btn.classList.toggle('active', panel.isOpen());
});

document.getElementById('resetLayout').addEventListener('click', () => {
  const defs = computeDefaults();
  for (const [key, panel] of Object.entries(panels)) {
    const def = defs[key];
    panel.moveTo(def.x, def.y);
    panel.resize(def.width, def.height);
    panel.open();
    const togBtn = document.querySelector(`.panel-toggle[data-panel="${key}"]`);
    if (togBtn) togBtn.classList.add('active');
  }
  sizeAllCanvases();
});


// ─────────────────────────────────────────
//  5. CANVAS SIZING
// ─────────────────────────────────────────

function sizeCanvas(canvas, ctx) {
  if (!canvas || !ctx) return false;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w === 0 || h === 0) return false;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  return false;
}

function sizeAllCanvases() {
  sizeCanvas(waveCanvas, waveCtx);
  sizeCanvas(specCanvas, specCtx);
  sizeCanvas(psCanvas, psCtx);
}

window.addEventListener('resize', sizeAllCanvases);
requestAnimationFrame(sizeAllCanvases);


// ─────────────────────────────────────────
//  6. WAVEFORM DRAWING
// ─────────────────────────────────────────

function drawWaveform(buf) {
  if (!waveCanvas || !waveCtx) return;
  const w = waveCanvas.getBoundingClientRect().width;
  const h = waveCanvas.getBoundingClientRect().height;
  if (w === 0 || h === 0) return;

  sizeCanvas(waveCanvas, waveCtx);

  waveCtx.fillStyle = '#0a0a0f';
  waveCtx.fillRect(0, 0, w, h);

  if (!buf) return;

  // Center line
  waveCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  waveCtx.lineWidth = 1;
  waveCtx.beginPath();
  waveCtx.moveTo(0, h / 2);
  waveCtx.lineTo(w, h / 2);
  waveCtx.stroke();

  // Waveform
  waveCtx.strokeStyle = '#4af0c8';
  waveCtx.lineWidth = 1.5;
  waveCtx.beginPath();

  const len = buf.length;
  const step = len / w;
  for (let i = 0; i < w; i++) {
    const idx = Math.floor(i * step);
    const v = buf[idx] || 0;
    const y = (1 - v) * h / 2;
    if (i === 0) waveCtx.moveTo(i, y);
    else waveCtx.lineTo(i, y);
  }
  waveCtx.stroke();

  // Amplitude grid labels
  waveCtx.fillStyle = 'rgba(255,255,255,0.15)';
  waveCtx.font = '9px "DM Mono", monospace';
  waveCtx.textAlign = 'left';
  waveCtx.fillText('+1', 4, 12);
  waveCtx.fillText(' 0', 4, h / 2 - 3);
  waveCtx.fillText('-1', 4, h - 4);
}


// ─────────────────────────────────────────
//  7. SPECTRUM DRAWING
// ─────────────────────────────────────────

const SPEC_COLORS = [
  '#4af0c8', '#38bdf8', '#a78bfa', '#f472b6', '#ff6b4a',
];

function freqColor(normalizedIndex) {
  const t = Math.min(1, normalizedIndex * 1.2);
  const i = t * (SPEC_COLORS.length - 1);
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, SPEC_COLORS.length - 1);
  const f = i - lo;
  const cA = hexToRgb(SPEC_COLORS[lo]);
  const cB = hexToRgb(SPEC_COLORS[hi]);
  return `rgb(${Math.round(cA[0] + (cB[0] - cA[0]) * f)},${Math.round(cA[1] + (cB[1] - cA[1]) * f)},${Math.round(cA[2] + (cB[2] - cA[2]) * f)})`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawSpectrum(freqData) {
  if (!specCanvas || !specCtx) return;
  const w = specCanvas.getBoundingClientRect().width;
  const h = specCanvas.getBoundingClientRect().height;
  if (w === 0 || h === 0) return;

  sizeCanvas(specCanvas, specCtx);

  specCtx.fillStyle = '#0a0a0f';
  specCtx.fillRect(0, 0, w, h);

  if (!freqData) return;

  const bins = freqData.length;
  const sampleRate = mic.sampleRate;
  const nyquist = sampleRate / 2;

  if (specMode === 'bars') {
    const bandCount = 64;
    const bandW = w / bandCount;

    for (let b = 0; b < bandCount; b++) {
      const fLo = nyquist * Math.pow(b / bandCount, 2);
      const fHi = nyquist * Math.pow((b + 1) / bandCount, 2);
      const binLo = Math.max(1, Math.floor(fLo / nyquist * bins));
      const binHi = Math.min(bins - 1, Math.ceil(fHi / nyquist * bins));

      let sum = 0, count = 0;
      for (let i = binLo; i <= binHi; i++) { sum += freqData[i]; count++; }
      const avg = count > 0 ? sum / count : 0;
      const barH = (avg / 255) * h * 0.95;

      const x = b * bandW;
      const color = freqColor(b / bandCount);

      specCtx.fillStyle = color;
      specCtx.globalAlpha = 0.85;
      specCtx.fillRect(x + 1, h - barH, bandW - 2, barH);

      specCtx.globalAlpha = 0.5;
      specCtx.fillRect(x + 1, h - barH, bandW - 2, 2);
      specCtx.globalAlpha = 1;
    }
  } else {
    specCtx.strokeStyle = '#a78bfa';
    specCtx.lineWidth = 1.5;
    specCtx.beginPath();

    for (let i = 0; i < w; i++) {
      let binIdx;
      if (specMode === 'log') {
        const minF = 20;
        const freq = minF * Math.pow(nyquist / minF, i / w);
        binIdx = Math.round(freq / nyquist * bins);
      } else {
        binIdx = Math.round(i / w * bins);
      }
      binIdx = Math.min(bins - 1, Math.max(0, binIdx));
      const val = freqData[binIdx] / 255;
      const y = (1 - val) * h;
      if (i === 0) specCtx.moveTo(i, y);
      else specCtx.lineTo(i, y);
    }
    specCtx.stroke();

    specCtx.lineTo(w, h);
    specCtx.lineTo(0, h);
    specCtx.closePath();
    specCtx.fillStyle = 'rgba(167, 139, 250, 0.08)';
    specCtx.fill();
  }

  // Frequency axis labels
  specCtx.fillStyle = 'rgba(255,255,255,0.2)';
  specCtx.font = '9px "DM Mono", monospace';
  specCtx.textAlign = 'center';

  const freqLabels = specMode === 'log'
    ? [50, 100, 200, 500, 1000, 2000, 5000, 10000]
    : [1000, 2000, 5000, 10000, 15000, 20000];

  for (const f of freqLabels) {
    let x;
    if (specMode === 'log') {
      x = w * Math.log(f / 20) / Math.log(nyquist / 20);
    } else {
      x = (f / nyquist) * w;
    }
    if (x > 10 && x < w - 20) {
      const label = f >= 1000 ? (f / 1000) + 'k' : f + '';
      specCtx.fillText(label, x, h - 4);

      specCtx.strokeStyle = 'rgba(255,255,255,0.06)';
      specCtx.lineWidth = 1;
      specCtx.beginPath();
      specCtx.moveTo(x, 0);
      specCtx.lineTo(x, h - 14);
      specCtx.stroke();
    }
  }
}


// ─────────────────────────────────────────
//  8. PITCH SCROLL DRAWING
// ─────────────────────────────────────────

function findSpectralPeaks(freqData, sampleRate, minMag = 140, minFreq = 27, maxFreq = 4200) {
  const bins = freqData.length;
  const nyquist = sampleRate / 2;
  const minBin = Math.max(1, Math.floor(minFreq / nyquist * bins));
  const maxBin = Math.min(bins - 2, Math.ceil(maxFreq / nyquist * bins));
  const peaks = [];

  for (let i = minBin; i <= maxBin; i++) {
    const val = freqData[i];
    if (val > minMag && val > freqData[i - 1] && val >= freqData[i + 1]) {
      const a = freqData[i - 1], b = freqData[i], c = freqData[i + 1];
      const denom = 2 * b - a - c;
      const offset = denom > 0 ? (a - c) / (2 * denom) : 0;
      const peakBin = i + offset;
      const freq = peakBin / bins * nyquist;
      peaks.push({ freq, magnitude: val });
    }
  }

  peaks.sort((a, b) => b.magnitude - a.magnitude);

  const filtered = [];
  for (const p of peaks) {
    const isDup = filtered.some(f => Math.abs(1200 * Math.log2(p.freq / f.freq)) < 80);
    if (!isDup) filtered.push(p);
    if (filtered.length >= 5) break;
  }

  return filtered.map(p => {
    const info = PitchDetector.frequencyInfo(p.freq, p.magnitude / 255);
    return { ...info, magnitude: p.magnitude };
  });
}

function drawPitchScroll(freqData, primaryPitch) {
  if (!psCanvas || !psCtx) return;
  const w = psCanvas.getBoundingClientRect().width;
  const h = psCanvas.getBoundingClientRect().height;
  if (w === 0 || h === 0) return;

  sizeCanvas(psCanvas, psCtx);

  // Detect peaks from spectrum
  const peaks = freqData ? findSpectralPeaks(freqData, mic.sampleRate) : [];

  // Build this frame's note set
  const frame = [];
  if (primaryPitch && primaryPitch.confidence > 0.8) {
    frame.push({ midi: primaryPitch.midi, note: primaryPitch.note, octave: primaryPitch.octave, primary: true });
  }
  for (const pk of peaks) {
    if (!frame.some(f => f.midi === pk.midi)) {
      frame.push({ midi: pk.midi, note: pk.note, octave: pk.octave, primary: false });
    }
  }

  psHistory.push(frame);
  if (psHistory.length > PS_MAX_FRAMES) psHistory.shift();

  // Compute MIDI range from history
  let midiMin = 127, midiMax = 0;
  for (const fr of psHistory) {
    for (const n of fr) {
      if (n.midi < midiMin) midiMin = n.midi;
      if (n.midi > midiMax) midiMax = n.midi;
    }
  }
  if (midiMin > midiMax) { midiMin = 55; midiMax = 72; }
  midiMin = Math.max(0, midiMin - 3);
  midiMax = Math.min(127, midiMax + 3);
  const rows = midiMax - midiMin + 1;

  const labelW = 30;
  const plotW = w - labelW;
  const rowH = Math.max(4, h / rows);

  // Background
  psCtx.fillStyle = '#0a0a0f';
  psCtx.fillRect(0, 0, w, h);

  // Grid lines
  psCtx.strokeStyle = 'rgba(255,255,255,0.04)';
  psCtx.lineWidth = 1;
  for (let i = 0; i <= rows; i++) {
    const midi = midiMax - i;
    const y = i * rowH;
    const noteIdx = midi % 12;

    if ([1, 3, 6, 8, 10].includes(noteIdx)) {
      psCtx.fillStyle = 'rgba(255,255,255,0.015)';
      psCtx.fillRect(labelW, y, plotW, rowH);
    }

    if (noteIdx === 0) {
      psCtx.strokeStyle = 'rgba(255,255,255,0.1)';
      psCtx.beginPath();
      psCtx.moveTo(labelW, y);
      psCtx.lineTo(w, y);
      psCtx.stroke();
      psCtx.strokeStyle = 'rgba(255,255,255,0.04)';
    }
  }

  // Plot notes from history
  const colW = Math.max(1.5, plotW / PS_MAX_FRAMES);
  const totalFrames = psHistory.length;

  for (let fi = 0; fi < totalFrames; fi++) {
    const fr = psHistory[fi];
    const x = labelW + (fi / PS_MAX_FRAMES) * plotW;
    const isLatest = fi === totalFrames - 1;
    const age = 1 - (totalFrames - 1 - fi) / PS_MAX_FRAMES;

    for (const n of fr) {
      const row = midiMax - n.midi;
      const y = row * rowH;

      if (n.primary) {
        psCtx.fillStyle = isLatest ? '#ff6b4a' : '#4af0c8';
        psCtx.globalAlpha = 0.3 + age * 0.7;
      } else {
        psCtx.fillStyle = '#a78bfa';
        psCtx.globalAlpha = 0.15 + age * 0.35;
      }

      const dotH = Math.max(3, rowH - 1);
      psCtx.fillRect(x, y + 0.5, colW, dotH);
      psCtx.globalAlpha = 1;

      if (isLatest && n.primary) {
        psCtx.shadowColor = '#ff6b4a';
        psCtx.shadowBlur = 8;
        psCtx.fillStyle = '#ff6b4a';
        psCtx.fillRect(x, y + 0.5, colW, dotH);
        psCtx.shadowBlur = 0;
      }
    }
  }

  // Playhead line
  const phX = labelW + (totalFrames / PS_MAX_FRAMES) * plotW;
  psCtx.strokeStyle = 'rgba(255,107,74,0.5)';
  psCtx.lineWidth = 1.5;
  psCtx.beginPath();
  psCtx.moveTo(phX, 0);
  psCtx.lineTo(phX, h);
  psCtx.stroke();

  // Label gutter
  psCtx.fillStyle = '#0a0a0f';
  psCtx.fillRect(0, 0, labelW, h);

  psCtx.font = '8px "DM Mono", monospace';
  psCtx.textAlign = 'right';
  psCtx.textBaseline = 'middle';

  for (let i = 0; i < rows; i++) {
    const midi = midiMax - i;
    const y = i * rowH;
    const noteIdx = midi % 12;
    const oct = Math.floor(midi / 12) - 1;

    if (noteIdx === 0 || rowH >= 10) {
      psCtx.fillStyle = noteIdx === 0 ? '#e8e8f0' : 'rgba(255,255,255,0.2)';
      psCtx.fillText(NOTE_NAMES[noteIdx] + oct, labelW - 3, y + rowH / 2);
    }
  }
}


// ─────────────────────────────────────────
//  9. MAIN LOOP
// ─────────────────────────────────────────

function tick() {
  if (!running) return;

  const timeBuf = mic.getTimeDomainData();
  const freqBuf = mic.getFrequencyData();

  // Level meter
  const level = mic.getLevel();
  const levelPct = Math.min(100, level * 500);
  levelBar.style.width = levelPct + '%';
  levelBar.className = 'level-bar' + (levelPct > 80 ? ' hot' : '');
  levelLabel.textContent = (level * 100).toFixed(1) + ' %';

  // Pitch detection
  const result = detector.detect(timeBuf);
  if (pitchNote) {
    if (result && result.confidence > 0.8) {
      const display = result.note + result.octave;
      pitchNote.textContent = display;
      pitchNote.className = 'pitch-note detected';
      pitchFreq.textContent = result.freq.toFixed(1) + ' Hz';
      const sign = result.cents >= 0 ? '+' : '';
      pitchCents.textContent = sign + result.cents + ' cents';
      pitchConf.textContent = 'confidence: ' + (result.confidence * 100).toFixed(0) + '%';
    } else {
      pitchNote.textContent = '—';
      pitchNote.className = 'pitch-note';
      pitchFreq.textContent = '— Hz';
      pitchCents.textContent = '';
      pitchConf.textContent = level > 0.005 ? 'detecting...' : '';
    }
  }

  // Draw all panels
  drawWaveform(timeBuf);
  drawSpectrum(freqBuf);
  drawPitchScroll(freqBuf, result);

  animId = requestAnimationFrame(tick);
}


// ─────────────────────────────────────────
//  10. START / STOP
// ─────────────────────────────────────────

async function startViz() {
  const ok = await mic.start();
  if (!ok) {
    statusText.textContent = 'Microphone access denied';
    return;
  }

  detector = new PitchDetector({
    sampleRate: mic.sampleRate,
    threshold: 0.15,
    minFreq: 27,
    maxFreq: 4200,
  });

  running = true;
  psHistory = [];
  toggleBtn.textContent = 'Stop Mic';
  toggleBtn.classList.add('active');
  statusText.textContent = 'Listening...';

  sizeAllCanvases();
  tick();
}

function stopViz() {
  running = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  mic.stop();
  detector = null;

  toggleBtn.textContent = 'Start Mic';
  toggleBtn.classList.remove('active');
  statusText.textContent = 'Ready';

  if (pitchNote) {
    pitchNote.textContent = '—';
    pitchNote.className = 'pitch-note';
    pitchFreq.textContent = '— Hz';
    pitchCents.textContent = '';
    pitchConf.textContent = '';
  }
  levelBar.style.width = '0%';
  levelLabel.textContent = '—';
}

toggleBtn.addEventListener('click', () => {
  if (running) stopViz();
  else startViz();
});
