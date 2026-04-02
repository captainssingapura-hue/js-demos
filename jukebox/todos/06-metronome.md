# 06 — Metronome / Count-In

**Priority:** 6 | **Effort:** Low-Medium | **Impact:** Medium

## Summary

Add a 4-beat count-in before melody playback and an optional audible metronome click on each beat during playback.

## Rationale

Guitar teachers always count students in ("1, 2, 3, 4...") so they're prepared for the first note. An ongoing click helps maintain rhythm awareness, especially at slower tempos.

## Implementation Notes

- **Count-in:** In `playTrack()`, schedule 4 click sounds before the first melody note. Offset `time` by `4 * beatDur` before the melody loop. Use `synthRim()` from `synthesizer.js` or a simple oscillator click.
- **Metronome:** Optionally schedule a quiet click on every beat boundary throughout the track. Add a toggle to enable/disable.
- The click sound should be distinct from the melody — short, percussive, lower volume.
- Visual count-in: flash "1... 2... 3... 4..." in the status bar or HUD before the melody starts.

## Files to Modify

- `jukebox/index.html` — metronome toggle button
- `jukebox/app.js` — count-in scheduling, beat click scheduling
- `shared/audio/synthesizer.js` — possibly add a lightweight click sound function
- `jukebox/styles.css` — button styling

## Acceptance Criteria

- [ ] 4-beat count-in plays before the melody starts
- [ ] Metronome toggle enables/disables ongoing beat clicks
- [ ] Click volume is balanced (audible but not overpowering)
- [ ] Count-in respects the current tempo setting
- [ ] Visual count displayed during count-in
