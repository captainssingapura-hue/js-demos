# Sonic Playground — How It Works

## Overview

Sonic Playground is a browser-based audio demo that combines two complementary technologies: **Howler.js** (a popular audio playback library) and the native **Web Audio API**. It demonstrates three core patterns for working with audio on the web: procedural sound generation, sample playback with runtime control, and real-time oscillator synthesis with visualization.

## Architecture

The app is a single-page application with three views, all driven by one HTML file, one CSS file, and one JavaScript module.

```
index.html          Entry point — loads Howler.js from CDN, links styles, loads app.js as a module
styles.css          Layout, theming, responsive design
app.js              All application logic, organized into numbered sections
```

There is no build step. The app runs directly in any modern browser.

## Key Concepts

### 1. Procedural Sound Synthesis

Rather than loading audio files from disk, the drum sounds are **generated mathematically** at startup. Each synth function (e.g. `synthKick`, `synthSnare`) fills a `Float32Array` with sample values computed from sine waves, noise, and exponential decay envelopes.

```
synthKick():
  For each sample at time t:
    frequency = 150 * e^(-12t) + 40      (pitch sweep from 150 Hz down to 40 Hz)
    envelope  = e^(-6t)                   (volume decay)
    sample    = sin(2pi * freq * t) * env
```

The raw samples are then encoded into a WAV file in memory using `encodeWAV()`, which manually writes the 44-byte WAV header and 16-bit PCM sample data into an `ArrayBuffer`. The result is turned into a blob URL via `URL.createObjectURL`.

This approach means the app has **zero external audio assets** — everything is self-contained in code.

### 2. Howler.js Playback

Each generated WAV blob URL is wrapped in a `Howl` instance, giving access to Howler's cross-browser playback engine with features like volume control, playback rate adjustment, and automatic handling of browser autoplay restrictions.

The `format: ['wav']` option is required because Howler infers audio format from the URL file extension, and blob URLs have none.

The Mixer page demonstrates runtime manipulation of Howl instances — adjusting `volume()` and `rate()` on the fly through slider controls.

### 3. Web Audio API Oscillator Synth

The Synth Keys page bypasses Howler entirely and uses the Web Audio API directly. It creates `OscillatorNode` instances connected through `GainNode` envelopes to an `AnalyserNode` for visualization.

```
OscillatorNode  -->  GainNode  -->  AnalyserNode  -->  AudioContext.destination
  (waveform)        (envelope)      (FFT data)          (speakers)
```

Key details:
- The `AudioContext` is created lazily on first interaction (required by browser autoplay policies)
- Attack/release envelopes use `linearRampToValueAtTime` for click-free note transitions
- Active oscillators are tracked in a map so they can be stopped individually
- The `AnalyserNode` feeds time-domain data to a canvas for real-time waveform rendering

### 4. Audio Unlock

Modern browsers suspend `AudioContext` playback until a user gesture occurs. The app handles this in two places:
- Howler.js has built-in auto-unlock for its internal context
- The synth page calls `synthCtx.resume()` on first note interaction

## Extension Points for Real-World Use

### Game Audio Engine
The procedural synthesis pattern scales well for games. Instead of shipping megabytes of sound files, you can generate variations at runtime — randomize pitch envelopes for footsteps, layer noise profiles for explosions, or sweep filters for power-ups. Howler.js already supports sprites (multiple sounds in one file), spatial audio, and sound pooling, making it a practical foundation for a game audio manager.

### Accessible UI Feedback
The pad trigger pattern (keyboard + click + touch with visual feedback) maps directly to accessible UI sound design. Consider adding audio cues to form validation, notifications, or navigation events. The procedural approach lets you generate tones that match your brand's pitch and timbre without licensing audio assets.

### Music Education Tools
The synth keyboard demonstrates the relationship between frequency, waveform shape, and perceived sound. This could be extended into an educational tool by adding interval training, chord visualization, scale highlighting, or a step sequencer that records and loops pad triggers.

### Audio-Reactive Visualization
The `AnalyserNode` waveform renderer is a minimal example of audio-reactive graphics. In production, you could feed FFT frequency data into WebGL shaders, drive CSS animations, or sync visual transitions to beat detection — useful for music players, live performance tools, or immersive web experiences.

### Voice and Microphone Processing
The Web Audio API graph (`source -> processing -> analyser -> destination`) is the same pattern used for microphone input. Replace the oscillator source with `getUserMedia` and you have a foundation for voice effects, real-time pitch detection, noise suppression, or audio recording with waveform preview.
