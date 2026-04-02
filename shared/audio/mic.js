// ─── Shared Microphone Input Module ───
// Handles mic access, AudioContext wiring, and raw audio data capture.

export class Mic {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.fftSize]       — AnalyserNode FFT size (default 2048)
   * @param {number} [opts.smoothing]     — AnalyserNode smoothing (default 0)
   * @param {number} [opts.minDecibels]   — AnalyserNode min dB (default -100)
   * @param {number} [opts.maxDecibels]   — AnalyserNode max dB (default -10)
   */
  constructor(opts = {}) {
    this.fftSize     = opts.fftSize     || 2048;
    this.smoothing   = opts.smoothing   ?? 0;
    this.minDecibels = opts.minDecibels || -100;
    this.maxDecibels = opts.maxDecibels || -10;

    this.ctx      = null;   // AudioContext
    this.stream   = null;   // MediaStream
    this.source   = null;   // MediaStreamAudioSourceNode
    this.analyser = null;   // AnalyserNode
    this.active   = false;

    this._timeBuf = null;   // Float32Array for time-domain data
    this._freqBuf = null;   // Uint8Array for frequency-domain data
  }

  /** Request mic access and start capturing. Returns true on success. */
  async start() {
    if (this.active) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
    } catch (err) {
      console.warn('Mic access denied:', err.message);
      return false;
    }

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = this.smoothing;
    this.analyser.minDecibels = this.minDecibels;
    this.analyser.maxDecibels = this.maxDecibels;

    this.source.connect(this.analyser);
    // Do NOT connect analyser to destination — no feedback loop

    this._timeBuf = new Float32Array(this.analyser.fftSize);
    this._freqBuf = new Uint8Array(this.analyser.frequencyBinCount);

    this.active = true;
    return true;
  }

  /** Stop capturing and release mic. */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.analyser = null;
    this._timeBuf = null;
    this._freqBuf = null;
    this.active = false;
  }

  /** Get the current sample rate. */
  get sampleRate() {
    return this.ctx ? this.ctx.sampleRate : 44100;
  }

  /**
   * Get current time-domain audio data (waveform).
   * @returns {Float32Array|null} — buffer of samples in [-1, 1], or null if inactive
   */
  getTimeDomainData() {
    if (!this.active || !this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this._timeBuf);
    return this._timeBuf;
  }

  /**
   * Get current frequency-domain data (spectrum).
   * @returns {Uint8Array|null} — buffer of byte values [0, 255], or null if inactive
   */
  getFrequencyData() {
    if (!this.active || !this.analyser) return null;
    this.analyser.getByteFrequencyData(this._freqBuf);
    return this._freqBuf;
  }

  /**
   * Get the current RMS level (volume) in range [0, 1].
   * Useful for detecting silence / signal presence.
   */
  getLevel() {
    const buf = this.getTimeDomainData();
    if (!buf) return 0;
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }
}
