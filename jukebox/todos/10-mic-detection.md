# 10 — Microphone Pitch Detection

**Priority:** 10 | **Effort:** High | **Impact:** Transformative

## Summary

Use the device microphone to detect the pitch the learner is playing and provide real-time feedback — correct (green) or wrong (red) — turning the app from "watch and follow" into "play and get verified."

## Rationale

The ultimate practice tool confirms the learner played the right note. Immediate feedback accelerates learning far beyond passive observation. This is what separates a practice app from a video tutorial.

## Implementation Notes

- **Audio input:** `navigator.mediaDevices.getUserMedia({ audio: true })` to capture mic input.
- **Pitch detection:** Feed the mic stream into an `AnalyserNode`, use autocorrelation (YIN or McLeod) algorithm on the time-domain data to detect the fundamental frequency.
- **Comparison:** Compare detected frequency to the expected note frequency. Allow a tolerance of ~50 cents (half a semitone) to account for natural tuning variation.
- **Visual feedback:**
  - Fretboard: flash the cell green if correct, red if wrong.
  - Pitch roll: overlay the detected pitch as a dot or line on the canvas.
  - HUD: show "Correct!" or "Try again" with the detected vs expected note.
- **Latency:** Pitch detection adds ~50-100ms latency. The comparison window needs to be generous.
- **Privacy:** Microphone access requires user permission. Clearly indicate when mic is active. Never transmit audio data.
- Consider a separate shared module: `shared/audio/pitchdetect.js`.

## Files to Modify

- `shared/audio/pitchdetect.js` — new module: mic capture + pitch detection algorithm
- `jukebox/index.html` — mic toggle button, permission prompt
- `jukebox/app.js` — integrate detection results with fretboard/HUD feedback
- `shared/audio/fretboard.css` — `.correct` and `.wrong` highlight classes
- `shared/audio/pitchroll.js` — optional: overlay detected pitch
- `jukebox/styles.css` — mic button and feedback styles

## Acceptance Criteria

- [ ] Mic toggle button requests permission on first click
- [ ] Detected pitch is shown in real-time
- [ ] Correct notes get green feedback, wrong notes get red
- [ ] Detection works in step-through mode (if implemented)
- [ ] Mic can be toggled off at any time
- [ ] No audio data leaves the browser
- [ ] Graceful fallback if mic permission is denied

## References

- YIN algorithm: "YIN, a fundamental frequency estimator for speech and music" (de Cheveigne & Kawahara, 2002)
- Web Audio API AnalyserNode: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
