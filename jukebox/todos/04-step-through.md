# 04 — Step-Through Mode

**Priority:** 4 | **Effort:** Medium | **Impact:** Very High

## Summary

Add a note-by-note step mode where the learner advances manually (spacebar or button). Each note sounds and highlights, then the app pauses until the user is ready for the next one.

## Rationale

Guitar teachers often have students play one note at a time — find the position, check finger placement, play it, then move on. This transforms the app from passive viewing to active practice.

## Implementation Notes

- Add a "Step" toggle button. When active, playback mode changes:
  - Schedule only the current note's audio.
  - After the note ends, auto-pause (like `togglePause()` but triggered programmatically).
  - On spacebar / "Next" button press, resume with the next note.
- Track a `jbStepIndex` pointing into the melody array.
- Reuse the existing pause/resume infrastructure (`jbCtx.suspend()`/`resume()`).
- Fretboard and pitch roll already handle pause state — they'll freeze correctly.
- Consider: play the note audio at full duration, but pre-highlight the *next* note's fretboard position while paused so the learner can prepare.

## Files to Modify

- `jukebox/index.html` — add Step toggle button, Next button
- `jukebox/app.js` — step mode state, per-note scheduling, keyboard listener (spacebar)
- `jukebox/styles.css` — button styles

## Acceptance Criteria

- [ ] Step mode toggle is visible in the UI
- [ ] Each note plays then pauses automatically
- [ ] Spacebar or Next button advances to the next note
- [ ] Fretboard shows current + next 4 notes while paused in step mode
- [ ] Exiting step mode resumes continuous playback
- [ ] Step mode works with tempo control (if implemented)
