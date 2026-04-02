// ─── Sonic Playground — app.js ───

import {
  SAMPLE_RATE, encodeWAV,
  synthKick, synthSnare, synthHihat, synthClap,
  synthTom, synthRim, synthCowbell, synthCymbal, synthPerc
} from '../shared/audio/synthesizer.js';


// ─────────────────────────────────────────
//  1. PAD DEFINITIONS & HOWLER INSTANCES
// ─────────────────────────────────────────

const padDefs = [
  { name: 'Kick',    icon: '🔴', key: 'Q', color: '--accent-1', glow: '--glow-1', gen: synthKick },
  { name: 'Snare',   icon: '🟡', key: 'W', color: '--accent-4', glow: '--glow-4', gen: synthSnare },
  { name: 'Hi-Hat',  icon: '🟢', key: 'E', color: '--accent-2', glow: '--glow-2', gen: synthHihat },
  { name: 'Clap',    icon: '🟣', key: 'R', color: '--accent-3', glow: '--glow-3', gen: synthClap },
  { name: 'Tom',     icon: '🔵', key: 'A', color: '--accent-6', glow: '--glow-6', gen: synthTom },
  { name: 'Rim',     icon: '🩷', key: 'S', color: '--accent-5', glow: '--glow-5', gen: synthRim },
  { name: 'Cowbell', icon: '🟠', key: 'D', color: '--accent-4', glow: '--glow-4', gen: synthCowbell },
  { name: 'Cymbal',  icon: '⚪', key: 'F', color: '--accent-2', glow: '--glow-2', gen: synthCymbal },
  { name: 'Perc',    icon: '🔮', key: 'G', color: '--accent-3', glow: '--glow-3', gen: synthPerc },
];

// Create Howl instances
const sounds = padDefs.map(p => ({
  ...p,
  howl: new Howl({ src: [p.gen()], volume: 0.8, format: ['wav'] })
}));


// ─────────────────────────────────────────
//  2. SPA ROUTER
// ─────────────────────────────────────────

const navBtns = document.querySelectorAll('#nav button');
const pages = document.querySelectorAll('.page');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
  });
});


// ─────────────────────────────────────────
//  3. SOUND PADS PAGE
// ─────────────────────────────────────────

const padGrid = document.getElementById('padGrid');
const status = document.getElementById('statusText');

sounds.forEach((s, i) => {
  const el = document.createElement('div');
  el.className = 'pad';
  el.style.setProperty('--pad-color', `var(${s.color})`);
  el.style.setProperty('--pad-glow', `var(${s.glow})`);
  el.style.cssText += `--pad-color: var(${s.color}); --pad-glow: var(${s.glow});`;
  el.innerHTML = `
    <span class="key-hint">${s.key}</span>
    <span class="icon">${s.icon}</span>
    <span class="label">${s.name}</span>
  `;

  el.addEventListener('click', () => triggerPad(i));
  el.addEventListener('touchstart', (e) => { e.preventDefault(); triggerPad(i); });
  padGrid.appendChild(el);
});

function triggerPad(i) {
  const s = sounds[i];
  s.howl.stop();
  s.howl.play();
  status.textContent = `▸ Playing: ${s.name}`;

  const el = padGrid.children[i];
  el.classList.add('playing');
  setTimeout(() => el.classList.remove('playing'), 200);
}

// Keyboard shortcuts for pads
document.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase();
  const idx = sounds.findIndex(s => s.key === key);
  if (idx !== -1) triggerPad(idx);
});


// ─────────────────────────────────────────
//  4. MIXER PAGE
// ─────────────────────────────────────────

const mixerContainer = document.getElementById('mixerChannels');

sounds.forEach((s, i) => {
  const ch = document.createElement('div');
  ch.className = 'mixer-channel';
  ch.innerHTML = `
    <div class="ch-name">${s.icon} ${s.name}</div>
    <div class="ch-controls">
      <div class="slider-group">
        <label>Volume</label>
        <input type="range" min="0" max="100" value="80" data-idx="${i}" data-param="volume">
      </div>
      <div class="slider-group">
        <label>Rate</label>
        <input type="range" min="25" max="300" value="100" data-idx="${i}" data-param="rate">
      </div>
      <button class="ch-play-btn" data-idx="${i}">▸</button>
    </div>
  `;
  mixerContainer.appendChild(ch);
});

mixerContainer.addEventListener('input', (e) => {
  if (e.target.type !== 'range') return;
  const idx = +e.target.dataset.idx;
  const param = e.target.dataset.param;
  const val = +e.target.value;
  if (param === 'volume') sounds[idx].howl.volume(val / 100);
  if (param === 'rate') sounds[idx].howl.rate(val / 100);
});

mixerContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.ch-play-btn');
  if (!btn) return;
  triggerPad(+btn.dataset.idx);
});


// ─────────────────────────────────────────
//  5. SYNTH PAGE (Web Audio oscillator)
// ─────────────────────────────────────────

let synthCtx = null;
let analyser = null;
let currentWave = 'sine';
const activeOscs = {};

function ensureSynthCtx() {
  if (!synthCtx) {
    synthCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = synthCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.connect(synthCtx.destination);
    drawWaveform();
  }
  if (synthCtx.state === 'suspended') synthCtx.resume();
}

// Wave selector
document.getElementById('waveSelect').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#waveSelect button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentWave = btn.dataset.wave;
});

// Keyboard notes
const notes = [
  { note: 'C4',  freq: 261.63, type: 'white', label: 'Z' },
  { note: 'C#4', freq: 277.18, type: 'black', label: '' },
  { note: 'D4',  freq: 293.66, type: 'white', label: 'X' },
  { note: 'D#4', freq: 311.13, type: 'black', label: '' },
  { note: 'E4',  freq: 329.63, type: 'white', label: 'C' },
  { note: 'F4',  freq: 349.23, type: 'white', label: 'V' },
  { note: 'F#4', freq: 369.99, type: 'black', label: '' },
  { note: 'G4',  freq: 392.00, type: 'white', label: 'B' },
  { note: 'G#4', freq: 415.30, type: 'black', label: '' },
  { note: 'A4',  freq: 440.00, type: 'white', label: 'N' },
  { note: 'A#4', freq: 466.16, type: 'black', label: '' },
  { note: 'B4',  freq: 493.88, type: 'white', label: 'M' },
  { note: 'C5',  freq: 523.25, type: 'white', label: ',' },
];

const keyboardEl = document.getElementById('keyboard');

notes.forEach((n, i) => {
  const key = document.createElement('div');
  key.className = n.type === 'white' ? 'key-white' : 'key-black';
  key.textContent = n.label || n.note;
  key.dataset.idx = i;

  key.addEventListener('mousedown', () => startNote(i, key));
  key.addEventListener('mouseup', () => stopNote(i, key));
  key.addEventListener('mouseleave', () => stopNote(i, key));
  key.addEventListener('touchstart', (e) => { e.preventDefault(); startNote(i, key); });
  key.addEventListener('touchend', () => stopNote(i, key));
  keyboardEl.appendChild(key);
});

const keyMap = {};
notes.forEach((n, i) => { if (n.label) keyMap[n.label.toUpperCase()] = i; });

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toUpperCase();
  if (k in keyMap) {
    const i = keyMap[k];
    startNote(i, keyboardEl.children[i]);
  }
});

document.addEventListener('keyup', (e) => {
  const k = e.key.toUpperCase();
  if (k in keyMap) {
    const i = keyMap[k];
    stopNote(i, keyboardEl.children[i]);
  }
});

function startNote(i, el) {
  if (activeOscs[i]) return;
  ensureSynthCtx();

  const osc = synthCtx.createOscillator();
  const gain = synthCtx.createGain();
  osc.type = currentWave;
  osc.frequency.value = notes[i].freq;
  gain.gain.setValueAtTime(0, synthCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, synthCtx.currentTime + 0.02);

  osc.connect(gain);
  gain.connect(analyser);
  osc.start();

  activeOscs[i] = { osc, gain };
  el.classList.add('active');
  status.textContent = `♪ ${notes[i].note} — ${notes[i].freq} Hz [${currentWave}]`;
}

function stopNote(i, el) {
  if (!activeOscs[i]) return;
  const { osc, gain } = activeOscs[i];
  gain.gain.linearRampToValueAtTime(0, synthCtx.currentTime + 0.08);
  setTimeout(() => osc.stop(), 100);
  delete activeOscs[i];
  el.classList.remove('active');
}


// ─────────────────────────────────────────
//  6. WAVEFORM VISUALIZER
// ─────────────────────────────────────────

const canvas = document.getElementById('waveform');
const ctx = canvas.getContext('2d');

function drawWaveform() {
  if (!analyser) { requestAnimationFrame(drawWaveform); return; }

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 32;
  canvas.height = rect.height - 32;

  const bufLen = analyser.frequencyBinCount;
  const data = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(data);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a78bfa';
  ctx.beginPath();

  const sliceWidth = canvas.width / bufLen;
  let x = 0;
  for (let i = 0; i < bufLen; i++) {
    const v = data[i] / 128.0;
    const y = (v * canvas.height) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  requestAnimationFrame(drawWaveform);
}


// ─────────────────────────────────────────
//  7. AUDIO UNLOCK
// ─────────────────────────────────────────

document.addEventListener('click', () => {
  if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
  status.textContent = 'Audio active';
}, { once: true });
