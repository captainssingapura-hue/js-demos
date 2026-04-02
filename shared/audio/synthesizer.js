// ─── Shared Audio Synthesizer Module ───

export const SAMPLE_RATE = 44100;

export function encodeWAV(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

// Note frequency helper
export const N = (note, octave) => {
  const semitones = { C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11 };
  return 440 * Math.pow(2, (semitones[note] - 9) / 12 + (octave - 4));
};

export const R = 0; // rest

// ─── Drum Synthesis Functions ───

export function synthKick() {
  const len = SAMPLE_RATE * 0.5;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 150 * Math.exp(-t * 12) + 40;
    const env = Math.exp(-t * 6);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
  }
  return encodeWAV(samples);
}

export function synthSnare() {
  const len = SAMPLE_RATE * 0.3;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.6;
    const tone = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 20) * 0.5;
    samples[i] = noise + tone;
  }
  return encodeWAV(samples);
}

export function synthHihat() {
  const len = SAMPLE_RATE * 0.1;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.4;
  }
  return encodeWAV(samples);
}

export function synthClap() {
  const len = SAMPLE_RATE * 0.25;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const burst = t < 0.01 ? 1 : (t < 0.02 ? 0.5 : (t < 0.03 ? 0.8 : Math.exp(-t * 18)));
    samples[i] = (Math.random() * 2 - 1) * burst * 0.6;
  }
  return encodeWAV(samples);
}

export function synthTom() {
  const len = SAMPLE_RATE * 0.4;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 120 * Math.exp(-t * 5) + 60;
    samples[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5) * 0.7;
  }
  return encodeWAV(samples);
}

export function synthRim() {
  const len = SAMPLE_RATE * 0.05;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = (Math.sin(2 * Math.PI * 1800 * t) + Math.sin(2 * Math.PI * 600 * t))
                  * Math.exp(-t * 80) * 0.5;
  }
  return encodeWAV(samples);
}

export function synthCowbell() {
  const len = SAMPLE_RATE * 0.3;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = (Math.sin(2 * Math.PI * 545 * t) * 0.6 + Math.sin(2 * Math.PI * 815 * t) * 0.4)
                  * Math.exp(-t * 8) * 0.5;
  }
  return encodeWAV(samples);
}

export function synthCymbal() {
  const len = SAMPLE_RATE * 0.8;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1);
    const ring = Math.sin(2 * Math.PI * 3000 * t) * 0.15 + Math.sin(2 * Math.PI * 6000 * t) * 0.1;
    samples[i] = (noise * 0.3 + ring) * Math.exp(-t * 3) * 0.5;
  }
  return encodeWAV(samples);
}

export function synthPerc() {
  const len = SAMPLE_RATE * 0.15;
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 30) * 0.6
                + (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.3;
  }
  return encodeWAV(samples);
}
