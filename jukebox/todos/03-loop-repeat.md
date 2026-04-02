# 03 — Loop / Section Repeat

**Priority:** 3 | **Effort:** Medium | **Impact:** Very High

## Summary

Add the ability to loop a section of a melody (A-B repeat) so learners can drill a difficult passage repeatedly without manual restart.

## Rationale

Real practice means playing a hard phrase dozens of times until it becomes automatic. Currently the app plays through once and stops. A loop feature is essential for any serious practice tool.

## Implementation Notes

- **Phase 1 (simple):** A "Loop" toggle button that replays the entire track on completion. In `startProgressTimer()`, when `pct >= 100`, call `playTrack(jbActiveTrack)` again instead of stopping.
- **Phase 2 (A-B loop):** Let user set loop start/end points:
  - Click on the pitch roll or progress bar to set A (start) and B (end) markers.
  - Slice the melody array to the A-B range, replay that subset.
  - Visual markers on the progress bar and pitch roll showing the loop region.
- The melody is an array of `[freq, beats]` pairs with known cumulative timing — slicing by time offset is straightforward.
- Need to track loop state: `jbLooping`, `jbLoopStart`, `jbLoopEnd`.

## Files to Modify

- `jukebox/index.html` — add loop toggle button in now-playing bar
- `jukebox/app.js` — loop state, auto-restart logic, A-B markers
- `jukebox/styles.css` — loop button and marker styles
- `shared/audio/pitchroll.js` — optional: render A-B markers on the canvas

## Acceptance Criteria

- [ ] Loop toggle replays the track continuously
- [ ] Loop state resets on stop or track change
- [ ] (Phase 2) A-B markers can be set and cleared
- [ ] (Phase 2) Only the selected section replays
- [ ] Fretboard and pitch roll stay in sync during loops
