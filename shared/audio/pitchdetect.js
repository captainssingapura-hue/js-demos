// ─── Shared Pitch Detection Module ───
// Implements the YIN algorithm for fundamental frequency estimation.
// Reference: de Cheveigné & Kawahara (2002), "YIN, a fundamental frequency
// estimator for speech and music", JASA 111(4).

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * PitchDetector — stateless pitch detection from audio buffers.
 *
 * Usage:
 *   const detector = new PitchDetector({ sampleRate: 44100 });
 *   const result = detector.detect(float32Array);
 *   // result: { freq, midi, note, octave, cents, confidence } or null
 */
export class PitchDetector {
  /**
   * @param {Object} opts
   * @param {number} opts.sampleRate       — audio sample rate in Hz
   * @param {number} [opts.threshold]      — YIN absolute threshold (default 0.15, lower = stricter)
   * @param {number} [opts.minFreq]        — minimum detectable frequency in Hz (default 60)
   * @param {number} [opts.maxFreq]        — maximum detectable frequency in Hz (default 1200)
   * @param {number} [opts.silenceThreshold] — RMS below this = silence (default 0.01)
   */
  constructor(opts) {
    this.sampleRate       = opts.sampleRate || 44100;
    this.threshold        = opts.threshold  ?? 0.15;
    this.minFreq          = opts.minFreq    || 60;
    this.maxFreq          = opts.maxFreq    || 1200;
    this.silenceThreshold = opts.silenceThreshold ?? 0.01;

    // Pre-compute lag bounds
    this._minLag = Math.floor(this.sampleRate / this.maxFreq);
    this._maxLag = Math.ceil(this.sampleRate / this.minFreq);
  }

  /**
   * Detect the fundamental frequency from a time-domain buffer.
   * @param {Float32Array} buf — audio samples (at least 2 * maxLag long)
   * @returns {{ freq: number, midi: number, note: string, octave: number, cents: number, confidence: number } | null}
   */
  detect(buf) {
    if (!buf || buf.length < 2 * this._maxLag) return null;

    // Check silence
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < this.silenceThreshold) return null;

    const halfLen = Math.floor(buf.length / 2);
    const maxLag = Math.min(this._maxLag, halfLen);
    const minLag = this._minLag;

    // Step 1 & 2: Difference function + cumulative mean normalized difference (CMND)
    const yinBuf = new Float32Array(maxLag + 1);
    yinBuf[0] = 1;

    let runningSum = 0;
    for (let tau = 1; tau <= maxLag; tau++) {
      let diff = 0;
      for (let i = 0; i < halfLen; i++) {
        const delta = buf[i] - buf[i + tau];
        diff += delta * delta;
      }
      runningSum += diff;
      yinBuf[tau] = runningSum > 0 ? diff * tau / runningSum : 1;
    }

    // Step 3: Absolute threshold — find first dip below threshold
    let bestTau = -1;
    for (let tau = minLag; tau <= maxLag; tau++) {
      if (yinBuf[tau] < this.threshold) {
        // Find the local minimum in this valley
        while (tau + 1 <= maxLag && yinBuf[tau + 1] < yinBuf[tau]) tau++;
        bestTau = tau;
        break;
      }
    }

    // Fallback: if no dip below threshold, find global minimum in range
    if (bestTau === -1) {
      let minVal = Infinity;
      for (let tau = minLag; tau <= maxLag; tau++) {
        if (yinBuf[tau] < minVal) {
          minVal = yinBuf[tau];
          bestTau = tau;
        }
      }
      // If global min is still too high, no pitch detected
      if (minVal > 0.5) return null;
    }

    // Step 4: Parabolic interpolation for sub-sample accuracy
    const tau = bestTau;
    let betterTau = tau;
    if (tau > 0 && tau < maxLag) {
      const s0 = yinBuf[tau - 1];
      const s1 = yinBuf[tau];
      const s2 = yinBuf[tau + 1];
      const denom = 2 * s1 - s2 - s0;
      if (denom !== 0) {
        betterTau = tau + (s0 - s2) / (2 * denom);
      }
    }

    const freq = this.sampleRate / betterTau;
    const confidence = 1 - (yinBuf[tau] || 0);

    return PitchDetector.frequencyInfo(freq, confidence);
  }

  /**
   * Convert a frequency to full note info.
   * @param {number} freq — frequency in Hz
   * @param {number} [confidence] — detection confidence 0–1
   * @returns {{ freq, midi, note, octave, cents, confidence }}
   */
  static frequencyInfo(freq, confidence = 1) {
    const midiExact = 12 * Math.log2(freq / 440) + 69;
    const midi = Math.round(midiExact);
    const cents = Math.round((midiExact - midi) * 100);
    const note = NOTE_NAMES[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return { freq, midi, note, octave, cents, confidence };
  }

  /**
   * Calculate how far apart two frequencies are in cents.
   * @param {number} f1 — frequency 1
   * @param {number} f2 — frequency 2
   * @returns {number} — cents difference (positive = f1 is sharp)
   */
  static centsDiff(f1, f2) {
    return 1200 * Math.log2(f1 / f2);
  }

  /**
   * Check if a detected frequency matches an expected frequency.
   * @param {number} detected — detected Hz
   * @param {number} expected — expected Hz
   * @param {number} [toleranceCents] — allowed deviation (default 50)
   * @returns {{ match: boolean, cents: number }}
   */
  static matchFrequency(detected, expected, toleranceCents = 50) {
    const cents = PitchDetector.centsDiff(detected, expected);
    return { match: Math.abs(cents) <= toleranceCents, cents: Math.round(cents) };
  }
}
