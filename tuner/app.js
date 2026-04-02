// ─── Guitar Tuner — app.js ───

import { N } from '../shared/audio/synthesizer.js';
import { Mic } from '../shared/audio/mic.js';
import { PitchDetector } from '../shared/audio/pitchdetect.js';


// ─────────────────────────────────────────
//  1. CONSTANTS & STATE
// ─────────────────────────────────────────

const STRINGS = [
  { note: 'E', octave: 2, label: '6th', freq: N('E', 2) },
  { note: 'A', octave: 2, label: '5th', freq: N('A', 2) },
  { note: 'D', octave: 3, label: '4th', freq: N('D', 3) },
  { note: 'G', octave: 3, label: '3rd', freq: N('G', 3) },
  { note: 'B', octave: 3, label: '2nd', freq: N('B', 3) },
  { note: 'E', octave: 4, label: '1st', freq: N('E', 4) },
];

const IN_TUNE_CENTS = 5;   // within ±5 cents = in tune

const mic = new Mic({ fftSize: 4096, smoothing: 0 });
let detector = null;
let running = false;
let animId = null;

// Reference tone playback
let refCtx = null;
let refOsc = null;
let refGain = null;

// DOM
const noteEl     = document.getElementById('tunerNote');
const octaveEl   = document.getElementById('tunerOctave');
const freqEl     = document.getElementById('tunerFreq');
const needleEl   = document.getElementById('tunerNeedle');
const centsEl    = document.getElementById('tunerCents');
const indicatorEl = document.getElementById('tunerIndicator');
const statusTextEl = document.getElementById('tunerStatusText');
const toggleBtn  = document.getElementById('tunerToggle');
const statusBar  = document.getElementById('statusText');
const vizCanvas  = document.getElementById('vizCanvas');
const vizCtx     = vizCanvas.getContext('2d');


// ─────────────────────────────────────────
//  2. TUNER CORE LOOP
// ─────────────────────────────────────────

function tick() {
  if (!running) return;

  const buf = mic.getTimeDomainData();
  const result = detector.detect(buf);

  if (result && result.confidence > 0.85) {
    // Find the closest guitar string
    let bestString = null;
    let bestCents = Infinity;
    for (const s of STRINGS) {
      const diff = PitchDetector.centsDiff(result.freq, s.freq);
      if (Math.abs(diff) < Math.abs(bestCents)) {
        bestCents = diff;
        bestString = s;
      }
    }

    const absCents = Math.abs(bestCents);
    const inTune = absCents <= IN_TUNE_CENTS;
    const centsRounded = Math.round(bestCents);

    // Note display
    noteEl.textContent = result.note + (result.note.length === 1 ? '' : '');
    noteEl.className = 'tuner-note' + (inTune ? ' in-tune' : bestCents > 0 ? ' sharp' : ' flat');
    octaveEl.textContent = `octave ${result.octave}`;
    freqEl.textContent = `${result.freq.toFixed(1)} Hz`;

    // Needle — map cents to 0–100% (±50 cents range)
    const pct = 50 + Math.max(-50, Math.min(50, bestCents));
    needleEl.style.left = pct + '%';
    needleEl.className = 'meter-needle' + (inTune ? ' in-tune' : '');

    // Cents text
    if (inTune) {
      centsEl.textContent = 'In tune!';
      centsEl.style.color = 'var(--accent-2)';
    } else {
      const dir = centsRounded > 0 ? '+' : '';
      centsEl.textContent = `${dir}${centsRounded} cents — tune ${centsRounded > 0 ? 'down' : 'up'}`;
      centsEl.style.color = 'var(--text-dim)';
    }

    // Status indicator
    indicatorEl.className = 'status-indicator' + (inTune ? ' in-tune' : ' detected');
    statusTextEl.textContent = bestString
      ? `Detected: ${bestString.note}${bestString.octave} string (${bestString.label})`
      : 'Pitch detected';

    // Highlight matched string button
    document.querySelectorAll('.string-btn').forEach((btn, i) => {
      btn.classList.toggle('matched', STRINGS[i] === bestString);
    });

  } else {
    // No pitch — listening state
    indicatorEl.className = 'status-indicator listening';
    statusTextEl.textContent = 'Listening...';
  }

  // Draw waveform
  drawWaveform(buf);

  animId = requestAnimationFrame(tick);
}

function drawWaveform(buf) {
  const dpr = window.devicePixelRatio || 1;
  const rect = vizCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  if (vizCanvas.width !== w * dpr || vizCanvas.height !== h * dpr) {
    vizCanvas.width = w * dpr;
    vizCanvas.height = h * dpr;
    vizCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  vizCtx.fillStyle = '#0a0a0f';
  vizCtx.fillRect(0, 0, w, h);

  if (!buf) return;

  vizCtx.strokeStyle = '#4af0c8';
  vizCtx.lineWidth = 1.5;
  vizCtx.beginPath();

  // Draw ~2 periods worth of samples centered in view
  const len = Math.min(buf.length, 1024);
  const step = len / w;
  for (let i = 0; i < w; i++) {
    const idx = Math.floor(i * step);
    const v = buf[idx] || 0;
    const y = (1 - v) * h / 2;
    if (i === 0) vizCtx.moveTo(i, y);
    else vizCtx.lineTo(i, y);
  }
  vizCtx.stroke();
}


// ─────────────────────────────────────────
//  3. START / STOP
// ─────────────────────────────────────────

async function startTuner() {
  const ok = await mic.start();
  if (!ok) {
    statusBar.textContent = 'Microphone access denied';
    return;
  }

  detector = new PitchDetector({
    sampleRate: mic.sampleRate,
    threshold: 0.15,
    minFreq: 60,
    maxFreq: 1200,
  });

  running = true;
  toggleBtn.textContent = 'Stop';
  toggleBtn.classList.add('active');
  statusBar.textContent = 'Tuner active';
  indicatorEl.className = 'status-indicator listening';
  statusTextEl.textContent = 'Listening...';
  tick();
}

function stopTuner() {
  running = false;
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  mic.stop();
  detector = null;

  toggleBtn.textContent = 'Start';
  toggleBtn.classList.remove('active');
  noteEl.textContent = '—';
  noteEl.className = 'tuner-note';
  octaveEl.textContent = '';
  freqEl.textContent = '—';
  needleEl.style.left = '50%';
  needleEl.className = 'meter-needle';
  centsEl.textContent = '';
  indicatorEl.className = 'status-indicator';
  statusTextEl.textContent = 'Press Start to begin';
  statusBar.textContent = 'Ready';

  document.querySelectorAll('.string-btn').forEach(b => b.classList.remove('matched'));

  // Clear waveform
  drawWaveform(null);
}

toggleBtn.addEventListener('click', () => {
  if (running) stopTuner();
  else startTuner();
});


// ─────────────────────────────────────────
//  4. STRING REFERENCE TONES
// ─────────────────────────────────────────

function ensureRefCtx() {
  if (!refCtx) {
    refCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (refCtx.state === 'suspended') refCtx.resume();
}

function playReferenceTone(freq, duration = 1.5) {
  ensureRefCtx();

  // Stop previous tone
  if (refOsc) {
    try { refOsc.stop(); } catch {}
    refOsc = null;
  }

  refOsc = refCtx.createOscillator();
  refGain = refCtx.createGain();
  refOsc.type = 'sine';
  refOsc.frequency.value = freq;
  refGain.gain.setValueAtTime(0.15, refCtx.currentTime);
  refGain.gain.setTargetAtTime(0, refCtx.currentTime + duration * 0.7, duration * 0.15);

  refOsc.connect(refGain);
  refGain.connect(refCtx.destination);
  refOsc.start();
  refOsc.stop(refCtx.currentTime + duration);
}

const stringGrid = document.getElementById('stringGrid');

STRINGS.forEach((s, i) => {
  const btn = document.createElement('button');
  btn.className = 'string-btn';
  btn.innerHTML = `
    <span class="string-name">${s.note}${s.octave}</span>
    <span class="string-hz">${s.freq.toFixed(1)} Hz</span>
    <span class="string-label">${s.label}</span>
  `;
  btn.addEventListener('click', () => {
    // Visual feedback
    document.querySelectorAll('.string-btn').forEach(b => b.classList.remove('playing'));
    btn.classList.add('playing');
    setTimeout(() => btn.classList.remove('playing'), 1500);
    playReferenceTone(s.freq);
  });
  stringGrid.appendChild(btn);
});


// ─────────────────────────────────────────
//  5. AUDIO UNLOCK
// ─────────────────────────────────────────

document.addEventListener('click', () => {
  if (refCtx && refCtx.state === 'suspended') refCtx.resume();
}, { once: true });
