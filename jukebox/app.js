// ─── 8-Bit Jukebox — app.js ───

import { N, R } from '../shared/audio/synthesizer.js';
import { Fretboard } from '../shared/audio/fretboard.js';
import { PitchRoll } from '../shared/audio/pitchroll.js';
import { Mic } from '../shared/audio/mic.js';
import { PitchDetector } from '../shared/audio/pitchdetect.js';
import { PanelManager } from '../modal_panel/ModalPanel.js';


// ─────────────────────────────────────────
//  1. TRACK DEFINITIONS
// ─────────────────────────────────────────

const tracks = [
  {
    name: 'Super Mario Bros',
    game: 'Nintendo, 1985',
    icon: '🍄',
    bpm: 240,
    waveform: 'square',
    melody: [
      [N('E',5),1],[N('E',5),1],[R,1],[N('E',5),1],[R,1],[N('C',5),1],[N('E',5),1],[R,1],
      [N('G',5),2],[R,2],[N('G',4),2],[R,2],
      [N('C',5),2],[R,1],[N('G',4),2],[R,1],[N('E',4),2],[R,1],
      [N('A',4),1],[R,1],[N('B',4),1],[R,1],[N('A#',4),1],[N('A',4),1],[R,1],
      [N('G',4),1.5],[N('E',5),1.5],[N('G',5),1.5],[N('A',5),1],[R,1],[N('F',5),1],[N('G',5),1],
      [R,1],[N('E',5),1],[R,1],[N('C',5),1],[N('D',5),1],[N('B',4),2],[R,1],
      [N('C',5),2],[R,1],[N('G',4),2],[R,1],[N('E',4),2],[R,1],
      [N('A',4),1],[R,1],[N('B',4),1],[R,1],[N('A#',4),1],[N('A',4),1],[R,1],
      [N('G',4),1.5],[N('E',5),1.5],[N('G',5),1.5],[N('A',5),1],[R,1],[N('F',5),1],[N('G',5),1],
      [R,1],[N('E',5),1],[R,1],[N('C',5),1],[N('D',5),1],[N('B',4),2],[R,1],
    ]
  },
  {
    name: 'Contra — Jungle',
    game: 'Konami, 1987 — Stage 1',
    icon: '🔫',
    bpm: 225,
    waveform: 'square',
    melody: [
      [N('E',5),1],[N('E',5),1],[R,1],[N('E',5),1],[R,1],[N('E',5),1],[N('D',5),1],[N('E',5),1],
      [N('G',5),2],[N('E',5),1],[N('D',5),1],[N('B',4),2],[R,2],
      [N('E',5),1],[N('E',5),1],[R,1],[N('E',5),1],[R,1],[N('E',5),1],[N('D',5),1],[N('E',5),1],
      [N('A',5),2],[N('G',5),1],[N('E',5),1],[N('D',5),2],[R,2],
      [N('B',4),1],[N('D',5),1],[N('E',5),1],[N('G',5),1],[N('A',5),2],[N('G',5),1],[N('E',5),1],
      [N('D',5),1],[N('E',5),1],[N('G',5),1],[N('E',5),1],[N('D',5),2],[N('B',4),2],
      [N('B',4),1],[N('D',5),1],[N('E',5),1],[N('G',5),1],[N('B',5),2],[N('A',5),1],[N('G',5),1],
      [N('E',5),1],[N('D',5),1],[N('E',5),2],[R,2],
      [N('E',4),1],[N('G',4),1],[N('B',4),1],[N('E',5),1],[N('G',5),1],[N('E',5),1],[N('B',4),1],[N('G',4),1],
      [N('A',4),1],[N('C',5),1],[N('E',5),1],[N('A',5),1],[N('G',5),1],[N('E',5),1],[N('C',5),1],[N('A',4),1],
      [N('B',4),1],[N('D',5),1],[N('G',5),1],[N('B',5),2],[N('A',5),1],[N('G',5),1],[N('E',5),1],
      [N('D',5),1],[N('E',5),2],[N('B',4),2],[R,3],
    ]
  },
  {
    name: 'Tetris (Korobeiniki)',
    game: 'Alexey Pajitnov, 1984',
    icon: '🧱',
    bpm: 195,
    waveform: 'square',
    melody: [
      [N('E',5),2],[N('B',4),1],[N('C',5),1],[N('D',5),2],[N('C',5),1],[N('B',4),1],
      [N('A',4),2],[N('A',4),1],[N('C',5),1],[N('E',5),2],[N('D',5),1],[N('C',5),1],
      [N('B',4),2],[R,1],[N('C',5),1],[N('D',5),2],[N('E',5),2],
      [N('C',5),2],[N('A',4),2],[N('A',4),2],[R,2],
      [R,1],[N('D',5),2],[N('F',5),1],[N('A',5),2],[N('G',5),1],[N('F',5),1],
      [N('E',5),2],[R,1],[N('C',5),1],[N('E',5),2],[N('D',5),1],[N('C',5),1],
      [N('B',4),2],[N('B',4),1],[N('C',5),1],[N('D',5),2],[N('E',5),2],
      [N('C',5),2],[N('A',4),2],[N('A',4),2],[R,2],
    ]
  },
  {
    name: 'Pac-Man',
    game: 'Namco, 1980',
    icon: '👾',
    bpm: 260,
    waveform: 'sawtooth',
    melody: [
      [N('B',4),1],[N('B',5),1],[N('F#',5),1],[N('D#',5),1],
      [N('B',5),1],[N('F#',5),1.5],[N('D#',5),2],[R,1],
      [N('C',5),1],[N('C',6),1],[N('G',5),1],[N('E',5),1],
      [N('C',6),1],[N('G',5),1.5],[N('E',5),2],[R,1],
      [N('B',4),1],[N('B',5),1],[N('F#',5),1],[N('D#',5),1],
      [N('B',5),1],[N('F#',5),1.5],[N('D#',5),2],[R,1],
      [N('D#',5),1],[N('E',5),1],[N('F',5),1],[R,1],
      [N('F',5),1],[N('F#',5),1],[N('G',5),1],[R,1],
      [N('G',5),1],[N('G#',5),1],[N('A',5),1],[R,1],[N('B',5),3],[R,2],
    ]
  },
  {
    name: 'Legend of Zelda',
    game: 'Nintendo, 1986',
    icon: '🗡️',
    bpm: 205,
    waveform: 'triangle',
    melody: [
      [N('A#',4),1.5],[R,0.5],
      [N('F',4),1],[N('F',4),0.5],[N('A#',4),0.5],[N('A#',4),0.5],[N('C',5),0.5],[N('D',5),0.5],[N('D#',5),0.5],
      [N('F',5),3],[R,1],
      [N('F',5),1],[N('F',5),0.5],[N('F',5),0.5],[N('F#',5),0.5],[N('G#',5),1.5],
      [N('A#',5),3],[R,1],
      [N('A#',5),1],[N('A#',5),0.5],[N('A#',5),0.5],[N('G#',5),0.5],[N('F#',5),0.5],
      [N('G#',5),1],[N('F#',5),0.5],[N('F',5),2],[R,1],
      [N('F',5),1],[N('D#',5),0.5],[N('D#',5),1],[N('C',5),0.5],[N('D',5),2],[R,2],
    ]
  },
  {
    name: 'Für Elise',
    game: 'Beethoven, 1810',
    icon: '🎹',
    bpm: 210,
    waveform: 'triangle',
    melody: [
      [N('E',5),1],[N('D#',5),1],
      [N('E',5),1],[N('D#',5),1],[N('E',5),1],[N('B',4),1],[N('D',5),1],[N('C',5),1],
      [N('A',4),2],[R,1],[N('C',4),1],[N('E',4),1],[N('A',4),1],
      [N('B',4),2],[R,1],[N('E',4),1],[N('G#',4),1],[N('B',4),1],
      [N('C',5),2],[R,1],[N('E',4),1],[N('E',5),1],[N('D#',5),1],
      [N('E',5),1],[N('D#',5),1],[N('E',5),1],[N('B',4),1],[N('D',5),1],[N('C',5),1],
      [N('A',4),2],[R,1],[N('C',4),1],[N('E',4),1],[N('A',4),1],
      [N('B',4),2],[R,1],[N('E',4),1],[N('C',5),1],[N('B',4),1],
      [N('A',4),2],[R,2],
      [N('B',4),1],[N('C',5),1],[N('D',5),1],
      [N('E',5),2],[R,1],[N('G',4),1],[N('F',5),1],[N('E',5),1],
      [N('D',5),2],[R,1],[N('F',4),1],[N('E',5),1],[N('D',5),1],
      [N('C',5),2],[R,1],[N('E',4),1],[N('D',5),1],[N('C',5),1],
      [N('B',4),2],[R,1],[N('E',4),1],[N('E',5),1],[N('D#',5),1],
      [N('E',5),1],[N('D#',5),1],[N('E',5),1],[N('B',4),1],[N('D',5),1],[N('C',5),1],
      [N('A',4),2],[R,1],[N('C',4),1],[N('E',4),1],[N('A',4),1],
      [N('B',4),2],[R,1],[N('E',4),1],[N('G#',4),1],[N('B',4),1],
      [N('C',5),2],[R,1],[N('E',4),1],[N('E',5),1],[N('D#',5),1],
      [N('E',5),1],[N('D#',5),1],[N('E',5),1],[N('B',4),1],[N('D',5),1],[N('C',5),1],
      [N('A',4),2],[R,1],[N('C',4),1],[N('E',4),1],[N('A',4),1],
      [N('B',4),2],[R,1],[N('E',4),1],[N('C',5),1],[N('B',4),1],
      [N('A',4),2],[R,3],
    ]
  },
  {
    name: 'American Patrol',
    game: 'Circus Charlie — Konami, 1984',
    icon: '🎪',
    bpm: 240,
    waveform: 'square',
    melody: [
      [N('C',5),0.5],[N('E',5),0.5],
      [N('G',5),1],[N('E',5),0.5],[N('G',5),0.5],[N('C',6),1.5],[N('G',5),0.5],
      [N('B',5),0.5],[N('A',5),0.5],[N('G',5),1],[R,0.5],[N('E',5),0.5],
      [N('G',5),1],[N('E',5),0.5],[N('G',5),0.5],[N('A',5),1.5],[N('G',5),0.5],
      [N('E',5),0.5],[N('D',5),0.5],[N('C',5),1],[R,0.5],[N('C',5),0.5],
      [N('D',5),0.5],[N('E',5),0.5],[N('F',5),0.5],[N('G',5),0.5],[N('A',5),1],[N('G',5),0.5],[N('F',5),0.5],
      [N('E',5),1],[N('C',5),0.5],[N('D',5),0.5],[N('E',5),1],[N('D',5),0.5],[N('B',4),0.5],
      [N('C',5),2],[R,1],[N('C',5),0.5],[N('E',5),0.5],
      [N('G',5),1],[N('E',5),0.5],[N('G',5),0.5],[N('C',6),1.5],[N('G',5),0.5],
      [N('B',5),0.5],[N('A',5),0.5],[N('G',5),1],[R,0.5],[N('E',5),0.5],
      [N('G',5),1],[N('E',5),0.5],[N('G',5),0.5],[N('A',5),1.5],[N('G',5),0.5],
      [N('E',5),0.5],[N('D',5),0.5],[N('C',5),1],[R,0.5],[N('E',5),0.5],
      [N('F',5),0.5],[N('G',5),0.5],[N('A',5),0.5],[N('B',5),0.5],[N('C',6),1.5],[N('A',5),0.5],
      [N('G',5),1],[N('E',5),0.5],[N('D',5),0.5],[N('E',5),1],[N('D',5),0.5],[N('B',4),0.5],
      [N('C',5),2],[R,3],
    ]
  },
];


// ─────────────────────────────────────────
//  2. PANEL MANAGER & CONTENT BUILDERS
// ─────────────────────────────────────────

const panelArea = document.getElementById('panelArea');
const mgr = new PanelManager({ zBase: 100 });

// --- Fretboard panel content ---
function buildFretboardContent() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="fb-header-row">
      <div class="fb-range-controls">
        <div class="fb-range-group">
          <label>Frets</label>
          <input type="number" id="fretMin" value="0" min="0" max="21" class="fb-range-input">
          <span class="fb-range-sep">–</span>
          <input type="number" id="fretMax" value="21" min="0" max="21" class="fb-range-input">
        </div>
        <div class="fb-range-group">
          <label>Strings</label>
          <input type="number" id="strMin" value="1" min="1" max="6" class="fb-range-input">
          <span class="fb-range-sep">–</span>
          <input type="number" id="strMax" value="6" min="1" max="6" class="fb-range-input">
        </div>
      </div>
      <div class="octave-control">
        <label>Octave</label>
        <button class="oct-btn" id="octDown">-</button>
        <span class="oct-value" id="octValue">0</span>
        <button class="oct-btn" id="octUp">+</button>
      </div>
    </div>
    <div id="fretboard" style="width:100%;height:150px;"></div>
    <div class="note-hud" id="noteHud"></div>`;
  return wrap;
}

// --- Pitch Roll panel content ---
function buildPitchRollContent() {
  const wrap = document.createElement('div');
  wrap.id = 'pitchRoll';
  wrap.style.cssText = 'width:100%;height:100%;min-height:0;';
  return wrap;
}

// --- Melody Editor panel content ---
function buildEditorContent() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="editor-desc">
      Type notes as <code>Note Octave/Duration</code> separated by spaces. Use <code>R</code> for rests.<br>
      Examples: <code>C5/1 D#5/0.5 R/1 E4/2</code> — sharps use <code>#</code>, duration is in beats.
    </div>
    <div class="editor-controls">
      <div class="editor-row">
        <label>Name</label>
        <input type="text" id="editorName" value="Custom Track" placeholder="Track name">
      </div>
      <div class="editor-row">
        <label>BPM</label>
        <input type="number" id="editorBpm" value="200" min="60" max="400">
      </div>
      <div class="editor-row">
        <label>Wave</label>
        <div class="wave-select" id="editorWaveSelect">
          <button class="active" data-wave="square">Square</button>
          <button data-wave="sawtooth">Saw</button>
          <button data-wave="triangle">Triangle</button>
          <button data-wave="sine">Sine</button>
        </div>
      </div>
    </div>
    <textarea class="editor-textarea" id="editorMelody" rows="4" spellcheck="false"
      placeholder="C5/1 D5/1 E5/1 F5/1 G5/2 R/1 A5/1 B5/1 C6/2"></textarea>
    <div class="editor-actions">
      <button class="jb-btn" id="editorPlay">▸ Preview</button>
      <button class="jb-btn" id="editorSave">+ Add to Jukebox</button>
    </div>`;
  return wrap;
}


// ─────────────────────────────────────────
//  3. CREATE PANELS
// ─────────────────────────────────────────

function computeDefaults() {
  const areaRect = panelArea.getBoundingClientRect();
  const originX = areaRect.left + window.scrollX;
  const originY = areaRect.top  + window.scrollY;
  const areaW   = areaRect.width || 800;
  const gap = 10;
  const row1H = 280;
  const row2Y = row1H + gap;
  const halfW = Math.floor((areaW - gap) / 2);
  const row2H = 260;

  return {
    fretboard: { title: 'Guitar Fretboard', x: originX, y: originY,
                 width: areaW, height: row1H, minWidth: 400, minHeight: 160 },
    pitchroll: { title: 'Pitch Roll',       x: originX, y: originY + row2Y,
                 width: halfW, height: row2H, minWidth: 200, minHeight: 120 },
    editor:    { title: 'Melody Editor',    x: originX + halfW + gap, y: originY + row2Y,
                 width: halfW, height: row2H, minWidth: 280, minHeight: 200 },
  };
}

const PANEL_DEFAULTS = computeDefaults();
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
      const togBtn = document.querySelector(`.panel-toggle[data-panel="${key}"]`);
      if (togBtn) togBtn.classList.remove('active');
    },
  });
  panels[key] = panel;
  return panel;
}

createPanel('fretboard', buildFretboardContent());
createPanel('pitchroll', buildPitchRollContent());
createPanel('editor',    buildEditorContent());


// ─────────────────────────────────────────
//  4. CACHE DOM REFS (elements now live inside panels)
// ─────────────────────────────────────────

const status      = document.getElementById('statusText');
const trackSelect = document.getElementById('trackSelect');
const npTitle     = document.getElementById('npTitle');

const fretboard = new Fretboard(document.getElementById('fretboard'));
const pitchRoll = new PitchRoll(document.getElementById('pitchRoll'));
const noteHud   = document.getElementById('noteHud');

const NOTE_NAMES   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const STRING_NAMES = ['E2','A','D','G','B','e'];

function freqToNoteName(freq) {
  const midi = Math.round(12 * Math.log2(freq / 440) + 69);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return note + octave;
}

function positionLabel(pos) {
  return `${STRING_NAMES[pos.string]} string, fret ${pos.fret}`;
}

let octaveOffset = 0;
const octValueEl = document.getElementById('octValue');
const fretMinEl  = document.getElementById('fretMin');
const fretMaxEl  = document.getElementById('fretMax');
const strMinEl   = document.getElementById('strMin');
const strMaxEl   = document.getElementById('strMax');

function filterPositions(freq) {
  const fMin = parseInt(fretMinEl.value) || 0;
  const fMax = parseInt(fretMaxEl.value) || 21;
  const sMin = (parseInt(strMinEl.value) || 1) - 1;
  const sMax = (parseInt(strMaxEl.value) || 6) - 1;

  const { primary, alternates } = fretboard.findAllPositions(freq);
  const all = primary ? [primary, ...alternates] : [];
  const filtered = all.filter(p =>
    p.fret >= fMin && p.fret <= fMax && p.string >= sMin && p.string <= sMax
  );

  if (filtered.length === 0) return { primary: null, alternates: [] };
  filtered.sort((a, b) => a.fret - b.fret);
  return { primary: filtered[0], alternates: filtered.slice(1) };
}

document.getElementById('octDown').addEventListener('click', () => {
  octaveOffset = Math.max(-3, octaveOffset - 1);
  octValueEl.textContent = octaveOffset > 0 ? `+${octaveOffset}` : octaveOffset;
});
document.getElementById('octUp').addEventListener('click', () => {
  octaveOffset = Math.min(3, octaveOffset + 1);
  octValueEl.textContent = octaveOffset > 0 ? `+${octaveOffset}` : octaveOffset;
});


// ─────────────────────────────────────────
//  5. POPULATE TRACK DROPDOWN
// ─────────────────────────────────────────

function populateTrackSelect() {
  // Keep the first placeholder option, clear the rest
  while (trackSelect.options.length > 1) trackSelect.remove(1);
  tracks.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${t.icon} ${t.name}`;
    trackSelect.appendChild(opt);
  });
}
populateTrackSelect();


// ─────────────────────────────────────────
//  6. PANEL TOGGLE & RESET
// ─────────────────────────────────────────

document.getElementById('jbToolbar').addEventListener('click', (e) => {
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
});


// ─────────────────────────────────────────
//  7. JUKEBOX PLAYBACK ENGINE
// ─────────────────────────────────────────

let jbCtx = null;
let jbScheduled = [];
let jbPlaying = false;
let jbPaused = false;
let jbActiveTrack = -1;
let jbProgressTimer = null;
let jbMaster = null;
let jbFretTimer = null;
let jbFretEvents = [];
let jbPauseTime = 0;
let jbStartTime = 0;
let jbTotalDur = 0;

function createReverbIR(ctx, duration = 1.2, decay = 2.5) {
  const length = ctx.sampleRate * duration;
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return ir;
}

function ensureJbCtx() {
  if (!jbCtx) {
    jbCtx = new (window.AudioContext || window.webkitAudioContext)();

    const comp = jbCtx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 4;

    const shaper = jbCtx.createWaveShaper();
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x));
    }
    shaper.curve = curve;
    shaper.oversample = '2x';

    const delay = jbCtx.createDelay(1);
    delay.delayTime.value = 0.18;
    const delayGain = jbCtx.createGain();
    delayGain.gain.value = 0.2;
    const feedback = jbCtx.createGain();
    feedback.gain.value = 0.3;

    const reverb = jbCtx.createConvolver();
    reverb.buffer = createReverbIR(jbCtx, 1.2, 2.5);
    const reverbGain = jbCtx.createGain();
    reverbGain.gain.value = 0.12;

    comp.connect(shaper);
    shaper.connect(jbCtx.destination);
    shaper.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(jbCtx.destination);
    shaper.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(jbCtx.destination);

    jbMaster = comp;
  }
  if (jbCtx.state === 'suspended') jbCtx.resume();
}

function stopJukebox() {
  jbScheduled.forEach(node => {
    try { if (node.gain) { node.gain.cancelScheduledValues(0); node.gain.value = 0; } } catch {}
    try { if (node.stop) node.stop(); } catch {}
  });
  jbScheduled = [];
  clearInterval(jbFretTimer);
  jbFretTimer = null;
  jbFretEvents = [];
  fretboard.clearAll();
  noteHud.innerHTML = '';
  pitchRoll.stop();
  jbPlaying = false;
  jbPaused = false;
  jbActiveTrack = -1;
  jbPauseTime = 0;
  clearInterval(jbProgressTimer);
  npTitle.textContent = '—';
  document.getElementById('jbProgress').style.width = '0%';
  document.getElementById('jbPause').textContent = '❚❚';
  trackSelect.value = '-1';
  status.textContent = 'Jukebox stopped';
}

const NEXT_CLASSES = ['next-1', 'next-2', 'next-3', 'next-4'];

function fretTick() {
  const elapsedMs = Date.now() - jbStartTime;

  let active = null;
  const upcoming = [];
  for (const ev of jbFretEvents) {
    if (ev.endMs <= elapsedMs) continue;
    if (!active && ev.startMs <= elapsedMs) { active = ev; continue; }
    if (ev.startMs > elapsedMs) {
      upcoming.push(ev);
      if (upcoming.length === 4) break;
    }
  }

  fretboard.batch(() => {
    fretboard.clearAll();

    if (active) {
      const name = freqToNoteName(active.freq);
      fretboard.highlight(active.primary.string, active.primary.fret, 'active', name);
      for (const a of active.alternates) fretboard.highlight(a.string, a.fret, 'octave');
    }

    for (let i = 0; i < upcoming.length; i++) {
      const ev = upcoming[i];
      const name = freqToNoteName(ev.freq);
      fretboard.highlight(ev.primary.string, ev.primary.fret, NEXT_CLASSES[i], name);
    }
  });

  // Update HUD (outside batch — it's DOM, not canvas)
  if (active) {
    const name = freqToNoteName(active.freq);
    const pos = positionLabel(active.primary);
    const next1 = upcoming[0];
    let hudText = `<span class="hud-now">${name}</span> <span class="hud-pos">${pos}</span>`;
    if (next1) {
      const n1Name = freqToNoteName(next1.freq);
      const n1Pos = positionLabel(next1.primary);
      hudText += `<span class="hud-arrow">→</span><span class="hud-next">${n1Name}</span> <span class="hud-pos">${n1Pos}</span>`;
    }
    noteHud.innerHTML = hudText;
  } else {
    noteHud.innerHTML = '';
  }
}

function startFretTicker() {
  clearInterval(jbFretTimer);
  jbFretTimer = setInterval(fretTick, 50);
}

function stopFretTicker() {
  clearInterval(jbFretTimer);
  jbFretTimer = null;
  fretboard.clearAll();
  noteHud.innerHTML = '';
}

function startProgressTimer() {
  clearInterval(jbProgressTimer);
  jbProgressTimer = setInterval(() => {
    const elapsed = (Date.now() - jbStartTime) / 1000;
    const pct = Math.min(100, (elapsed / jbTotalDur) * 100);
    document.getElementById('jbProgress').style.width = pct + '%';
    if (pct >= 100) {
      clearInterval(jbProgressTimer);
      stopFretTicker();
      pitchRoll.stop();
      jbPlaying = false;
      jbActiveTrack = -1;
      document.getElementById('jbPause').textContent = '❚❚';
      trackSelect.value = '-1';
      status.textContent = 'Ready';
    }
  }, 200);
}

function togglePause() {
  if (!jbCtx || !jbPlaying) return;

  if (!jbPaused) {
    jbCtx.suspend();
    jbPaused = true;
    jbPauseTime = (Date.now() - jbStartTime) / 1000;
    clearInterval(jbProgressTimer);
    clearInterval(jbFretTimer);
    jbFretTimer = null;
    pitchRoll.pause();
    document.getElementById('jbPause').textContent = '▸';
    status.textContent = 'Paused — follow along on the fretboard';
  } else {
    jbCtx.resume();
    jbPaused = false;
    jbStartTime = Date.now() - jbPauseTime * 1000;
    startProgressTimer();
    startFretTicker();
    pitchRoll.resume();
    document.getElementById('jbPause').textContent = '❚❚';
    status.textContent = `♫ Playing: ${npTitle.textContent}`;
  }
}

function playTrack(idx) {
  stopJukebox();
  ensureJbCtx();

  const track = tracks[idx];
  jbPlaying = true;
  jbActiveTrack = idx;

  npTitle.textContent = `${track.icon} ${track.name}`;
  trackSelect.value = idx;
  status.textContent = `♫ Playing: ${track.name}`;

  const beatDur = 60 / track.bpm;
  let time = jbCtx.currentTime + 0.05;
  const ADSR = { a: 0.008, d: 0.06, s: 0.7, r: 0.04 };

  function scheduleADSR(param, peak, t, dur, env) {
    const e = env || ADSR;
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + e.a);
    param.setTargetAtTime(peak * e.s, t + e.a, e.d);
    param.setValueAtTime(peak * e.s, t + dur - e.r);
    param.linearRampToValueAtTime(0, t + dur);
  }

  const rollNotes = [];

  track.melody.forEach(([freq, beats]) => {
    const dur = beats * beatDur;
    if (freq !== R) {
      const end = time + dur + 0.08;
      const noteStartMs = (time - jbCtx.currentTime) * 1000;
      rollNotes.push({ startMs: noteStartMs, endMs: noteStartMs + dur * 1000, freq });

      const filter = jbCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 2;
      const fOpen = Math.min(freq * 4, 12000);
      const fSustain = Math.min(freq * 2, 8000);
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.linearRampToValueAtTime(fOpen, time + ADSR.a + 0.02);
      filter.frequency.setTargetAtTime(fSustain, time + ADSR.a + 0.02, 0.1);
      filter.frequency.setValueAtTime(fSustain, time + dur - ADSR.r);
      filter.frequency.linearRampToValueAtTime(300, time + dur);
      filter.connect(jbMaster);
      jbScheduled.push(filter);

      const osc1 = jbCtx.createOscillator();
      const gain1 = jbCtx.createGain();
      osc1.type = track.waveform;
      osc1.frequency.value = freq;
      scheduleADSR(gain1.gain, 0.14, time, dur);
      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(time);
      osc1.stop(end);
      jbScheduled.push(osc1, gain1);

      const osc2 = jbCtx.createOscillator();
      const gain2 = jbCtx.createGain();
      const pan2 = jbCtx.createStereoPanner();
      osc2.type = track.waveform;
      osc2.frequency.value = freq * 1.004;
      pan2.pan.value = 0.3;
      scheduleADSR(gain2.gain, 0.06, time, dur);
      osc2.connect(gain2);
      gain2.connect(pan2);
      pan2.connect(filter);
      osc2.start(time);
      osc2.stop(end);
      jbScheduled.push(osc2, gain2, pan2);

      const osc3 = jbCtx.createOscillator();
      const gain3 = jbCtx.createGain();
      const pan3 = jbCtx.createStereoPanner();
      osc3.type = track.waveform;
      osc3.frequency.value = freq * 0.996;
      pan3.pan.value = -0.3;
      scheduleADSR(gain3.gain, 0.06, time, dur);
      osc3.connect(gain3);
      gain3.connect(pan3);
      pan3.connect(filter);
      osc3.start(time);
      osc3.stop(end);
      jbScheduled.push(osc3, gain3, pan3);

      const oscSub = jbCtx.createOscillator();
      const gainSub = jbCtx.createGain();
      oscSub.type = 'triangle';
      oscSub.frequency.value = freq / 2;
      scheduleADSR(gainSub.gain, 0.05, time, dur, { a: 0.015, d: 0.08, s: 0.7, r: 0.06 });
      oscSub.connect(gainSub);
      gainSub.connect(filter);
      oscSub.start(time);
      oscSub.stop(end);
      jbScheduled.push(oscSub, gainSub);

      const lfo = jbCtx.createOscillator();
      const lfoGain = jbCtx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 5.5;
      lfoGain.gain.value = freq * 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(time);
      lfo.stop(end);
      jbScheduled.push(lfo);

      // Record fretboard event
      const shiftedFreq = freq * Math.pow(2, octaveOffset);
      const { primary, alternates } = filterPositions(shiftedFreq);
      if (primary) {
        const startMs = (time - jbCtx.currentTime) * 1000;
        const endMs = startMs + dur * 1000;
        jbFretEvents.push({ startMs, endMs, primary, alternates, freq: shiftedFreq });
      }
    }
    time += dur;
  });

  jbTotalDur = time - jbCtx.currentTime;
  jbStartTime = Date.now();

  startFretTicker();
  startProgressTimer();

  pitchRoll.setNotes(rollNotes);
  pitchRoll.start(() => Date.now() - jbStartTime);
}


// ─────────────────────────────────────────
//  8. TOOLBAR CONTROLS
// ─────────────────────────────────────────

document.getElementById('jbPlay').addEventListener('click', () => {
  const idx = parseInt(trackSelect.value);
  if (idx >= 0 && idx < tracks.length) {
    playTrack(idx);
  }
});

document.getElementById('jbStop').addEventListener('click', () => {
  if (practiceActive) stopPractice();
  stopJukebox();
});

document.getElementById('jbPause').addEventListener('click', togglePause);

trackSelect.addEventListener('change', () => {
  const idx = parseInt(trackSelect.value);
  if (idx >= 0) playTrack(idx);
});


// ─────────────────────────────────────────
//  9. MELODY EDITOR
// ─────────────────────────────────────────

function parseMelody(text) {
  const tokens = text.trim().split(/[\s,]+/).filter(Boolean);
  const melody = [];
  for (const token of tokens) {
    const parts = token.split('/');
    if (parts.length !== 2) continue;
    const dur = parseFloat(parts[1]);
    if (isNaN(dur) || dur <= 0) continue;
    const noteStr = parts[0].toUpperCase();
    if (noteStr === 'R') {
      melody.push([R, dur]);
    } else {
      const match = noteStr.match(/^([A-G]#?)(\d)$/);
      if (!match) continue;
      melody.push([N(match[1], parseInt(match[2])), dur]);
    }
  }
  return melody;
}

let editorWave = 'square';

document.getElementById('editorWaveSelect').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#editorWaveSelect button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  editorWave = btn.dataset.wave;
});

document.getElementById('editorPlay').addEventListener('click', () => {
  const melody = parseMelody(document.getElementById('editorMelody').value);
  if (!melody.length) return;
  const bpm = parseInt(document.getElementById('editorBpm').value) || 200;
  const name = document.getElementById('editorName').value || 'Preview';

  const tempIdx = tracks.length;
  tracks.push({ name, game: 'Custom', icon: '🎵', bpm, waveform: editorWave, melody });
  playTrack(tempIdx);
  tracks.pop();
});

document.getElementById('editorSave').addEventListener('click', () => {
  const melody = parseMelody(document.getElementById('editorMelody').value);
  if (!melody.length) return;
  const bpm = parseInt(document.getElementById('editorBpm').value) || 200;
  const name = document.getElementById('editorName').value || 'Custom Track';

  tracks.push({ name, game: 'Custom', icon: '🎵', bpm, waveform: editorWave, melody });

  // Add to dropdown
  const opt = document.createElement('option');
  opt.value = tracks.length - 1;
  opt.textContent = `🎵 ${name}`;
  trackSelect.appendChild(opt);

  status.textContent = `Added: ${name}`;
});


// ─────────────────────────────────────────
//  10. AUDIO UNLOCK
// ─────────────────────────────────────────

document.addEventListener('click', () => {
  if (jbCtx && jbCtx.state === 'suspended') jbCtx.resume();
  status.textContent = 'Audio active';
}, { once: true });


// ─────────────────────────────────────────
//  11. PRACTICE MODE
// ─────────────────────────────────────────

const mic = new Mic({ fftSize: 4096, smoothing: 0 });
let practiceDetector = null;
let practiceActive = false;
let practiceTrack = null;
let practiceNotes = [];
let practiceIdx = 0;
let practiceAnimId = null;
let practiceListening = false;
let practiceCorrectCount = 0;

const practiceBtnEl    = document.getElementById('jbPractice');
const practiceHudEl    = document.getElementById('practiceHud');
const practiceStatusEl = document.getElementById('practiceStatus');
const practiceNoteEl   = document.getElementById('practiceNote');
const practiceProgEl   = document.getElementById('practiceProgress');

const PRACTICE_TOLERANCE = 50;
const PRACTICE_CONFIRM_FRAMES = 3;

function buildPracticeNotes(track) {
  const notes = [];
  for (const [freq, beats] of track.melody) {
    if (freq !== R) {
      const info = PitchDetector.frequencyInfo(freq);
      notes.push({ freq, beats, note: info.note, octave: info.octave, midi: info.midi });
    }
  }
  return notes;
}

function playSingleNote(freq, track, duration) {
  ensureJbCtx();
  const beatDur = 60 / track.bpm;
  const dur = duration * beatDur;
  const time = jbCtx.currentTime + 0.05;
  const end = time + dur + 0.08;
  const ADSR = { a: 0.008, d: 0.06, s: 0.7, r: 0.04 };

  function scheduleADSR(param, peak, t, d, env) {
    const e = env || ADSR;
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + e.a);
    param.setTargetAtTime(peak * e.s, t + e.a, e.d);
    param.setValueAtTime(peak * e.s, t + d - e.r);
    param.linearRampToValueAtTime(0, t + d);
  }

  const filter = jbCtx.createBiquadFilter();
  filter.type = 'lowpass'; filter.Q.value = 2;
  filter.frequency.setValueAtTime(400, time);
  filter.frequency.linearRampToValueAtTime(Math.min(freq * 4, 12000), time + 0.03);
  filter.frequency.setTargetAtTime(Math.min(freq * 2, 8000), time + 0.03, 0.1);
  filter.connect(jbMaster);

  const osc = jbCtx.createOscillator();
  const gain = jbCtx.createGain();
  osc.type = track.waveform;
  osc.frequency.value = freq;
  scheduleADSR(gain.gain, 0.14, time, dur);
  osc.connect(gain); gain.connect(filter);
  osc.start(time); osc.stop(end);
}

function practiceUpdateFretboard() {
  let hudText = '';

  fretboard.batch(() => {
    fretboard.clearAll();

    for (let i = 0; i < 5 && practiceIdx + i < practiceNotes.length; i++) {
      const n = practiceNotes[practiceIdx + i];
      const shiftedFreq = n.freq * Math.pow(2, octaveOffset);
      const { primary } = filterPositions(shiftedFreq);
      if (!primary) continue;

      const name = `${n.note}${n.octave}`;
      if (i === 0) {
        fretboard.highlight(primary.string, primary.fret, 'active', name);
        const pos = positionLabel(primary);
        hudText = `<span class="hud-now">${name}</span> <span class="hud-pos">${pos}</span>`;
      } else {
        fretboard.highlight(primary.string, primary.fret, NEXT_CLASSES[i - 1], name);
        if (i === 1) {
          const pos = positionLabel(primary);
          hudText += `<span class="hud-arrow">→</span><span class="hud-next">${name}</span> <span class="hud-pos">${pos}</span>`;
        }
      }
    }
  });

  noteHud.innerHTML = hudText;
}

function practiceUpdatePitchRoll() {
  const track = practiceTrack;
  const beatDur = 60 / track.bpm;
  const rollNotes = [];
  let t = 0;
  for (const n of practiceNotes) {
    const dur = n.beats * beatDur * 1000;
    rollNotes.push({ startMs: t, endMs: t + dur, freq: n.freq });
    t += dur;
  }
  pitchRoll.setNotes(rollNotes);

  let elapsed = 0;
  for (let i = 0; i < practiceIdx; i++) {
    elapsed += practiceNotes[i].beats * beatDur * 1000;
  }
  pitchRoll.start(() => elapsed);
  pitchRoll.pause();
}

function practiceStartListening() {
  practiceListening = true;
  practiceCorrectCount = 0;
  const n = practiceNotes[practiceIdx];

  practiceStatusEl.textContent = 'Play this note';
  practiceNoteEl.textContent = `${n.note}${n.octave}`;
  practiceNoteEl.className = 'practice-note listening';
  practiceProgEl.textContent = `Note ${practiceIdx + 1} of ${practiceNotes.length}`;

  playSingleNote(n.freq, practiceTrack, Math.min(n.beats, 2));

  practiceUpdateFretboard();
  practiceUpdatePitchRoll();

  if (practiceAnimId) cancelAnimationFrame(practiceAnimId);
  practiceDetectionLoop();
}

function practiceDetectionLoop() {
  if (!practiceActive || !practiceListening) return;

  const buf = mic.getTimeDomainData();
  const result = practiceDetector.detect(buf);
  const expected = practiceNotes[practiceIdx];

  if (result && result.confidence > 0.8) {
    const { match, cents } = PitchDetector.matchFrequency(result.freq, expected.freq, PRACTICE_TOLERANCE);

    if (match) {
      practiceCorrectCount++;
      practiceNoteEl.className = 'practice-note correct';
      practiceStatusEl.textContent = `Correct! (${cents >= 0 ? '+' : ''}${cents}¢)`;

      const shiftedFreq = expected.freq * Math.pow(2, octaveOffset);
      const { primary } = filterPositions(shiftedFreq);
      if (primary) {
        fretboard.clearAll();
        fretboard.highlight(primary.string, primary.fret, 'correct', '✓');
      }

      if (practiceCorrectCount >= PRACTICE_CONFIRM_FRAMES) {
        practiceListening = false;
        setTimeout(() => practiceAdvance(), 200);
        return;
      }
    } else {
      practiceCorrectCount = 0;
      practiceNoteEl.className = 'practice-note wrong';
      const detected = `${result.note}${result.octave}`;
      practiceStatusEl.textContent = `Heard ${detected} (${cents >= 0 ? '+' : ''}${cents}¢) — try again`;

      const wrongFreq = result.freq * Math.pow(2, octaveOffset);
      const { primary: wrongPos } = filterPositions(wrongFreq);
      practiceUpdateFretboard();
      if (wrongPos) fretboard.highlight(wrongPos.string, wrongPos.fret, 'wrong');
    }
  }

  practiceAnimId = requestAnimationFrame(practiceDetectionLoop);
}

function practiceAdvance() {
  practiceIdx++;
  if (practiceIdx >= practiceNotes.length) {
    practiceStatusEl.textContent = 'Complete!';
    practiceNoteEl.textContent = '🎉';
    practiceNoteEl.className = 'practice-note correct';
    practiceProgEl.textContent = `All ${practiceNotes.length} notes played`;
    fretboard.clearAll();
    status.textContent = 'Practice complete!';
    return;
  }
  practiceStartListening();
}

async function startPractice(trackIdx) {
  stopJukebox();
  stopPractice();

  const track = tracks[trackIdx];
  if (!track) return;

  const ok = await mic.start();
  if (!ok) {
    status.textContent = 'Microphone access needed for practice mode';
    return;
  }

  practiceDetector = new PitchDetector({
    sampleRate: mic.sampleRate,
    threshold: 0.15,
    minFreq: 60,
    maxFreq: 1200,
  });

  ensureJbCtx();

  practiceActive = true;
  practiceTrack = track;
  practiceNotes = buildPracticeNotes(track);
  practiceIdx = 0;

  npTitle.textContent = `🎸 ${track.icon} ${track.name}`;
  trackSelect.value = trackIdx;
  jbActiveTrack = trackIdx;
  practiceBtnEl.classList.add('active');
  practiceHudEl.classList.add('visible');
  status.textContent = `Practice: ${track.name}`;

  practiceStartListening();
}

function stopPractice() {
  practiceActive = false;
  practiceListening = false;
  if (practiceAnimId) { cancelAnimationFrame(practiceAnimId); practiceAnimId = null; }
  mic.stop();
  practiceDetector = null;
  practiceTrack = null;
  practiceNotes = [];
  practiceIdx = 0;
  practiceBtnEl.classList.remove('active');
  practiceHudEl.classList.remove('visible');
  practiceNoteEl.textContent = '';
  practiceStatusEl.textContent = '';
  practiceProgEl.textContent = '';
  fretboard.clearAll();
  pitchRoll.stop();
}

practiceBtnEl.addEventListener('click', () => {
  if (practiceActive) {
    stopPractice();
    status.textContent = 'Practice stopped';
  } else {
    const idx = jbActiveTrack >= 0 ? jbActiveTrack : parseInt(trackSelect.value);
    if (idx >= 0) startPractice(idx);
    else status.textContent = 'Select a track first';
  }
});
