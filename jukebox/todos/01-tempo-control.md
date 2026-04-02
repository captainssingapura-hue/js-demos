# 01 — Tempo / Speed Control

**Priority:** 1 | **Effort:** Low | **Impact:** Very High

## Summary

Add a slider or button group (25%, 50%, 75%, 100%) to control playback speed. Slowing down is the #1 practice technique guitar teachers recommend for beginners.

## Rationale

Beginners cannot keep up at the original BPM. Gradual speed-up from slow to full tempo builds muscle memory and accuracy.

## Implementation Notes

- Single point of change: `beatDur = 60 / track.bpm` in `playTrack()` — multiply by a speed factor.
- All downstream timing (audio scheduling, fretboard events, pitch roll, progress bar) derives from `beatDur`, so everything scales automatically.
- UI: a `.speed-control` row in the now-playing bar or fretboard header area. Buttons for presets (25/50/75/100%) plus an optional range slider for fine control.
- Persist last-used speed in `localStorage` as a convenience.

## Files to Modify

- `jukebox/index.html` — add speed control UI
- `jukebox/app.js` — apply speed multiplier to `beatDur` in `playTrack()`
- `jukebox/styles.css` — style the speed control

## Acceptance Criteria

- [ ] Speed control is visible in the UI
- [ ] Changing speed before or between tracks takes effect on next play
- [ ] All visuals (fretboard, pitch roll, progress bar) stay in sync at all speeds
- [ ] Default is 100%
