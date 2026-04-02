# 09 — Alternate Tuning Selector

**Priority:** 9 | **Effort:** Low | **Impact:** Medium

## Summary

Add a dropdown to switch the fretboard between common guitar tunings (Standard, Drop D, DADGAD, Open G, Open D, etc.).

## Rationale

Many popular songs and styles use alternate tunings. Showing the correct fret positions for a given tuning makes the tool useful beyond standard tuning.

## Implementation Notes

- The `Fretboard` constructor already accepts `opts.strings` as an array of frequencies. The architecture supports this.
- Define a `TUNINGS` map:
  ```
  Standard:  [E2, A2, D3, G3, B3, E4]
  Drop D:    [D2, A2, D3, G3, B3, E4]
  DADGAD:    [D2, A2, D3, G3, A3, D4]
  Open G:    [D2, G2, D3, G3, B3, D4]
  Open D:    [D2, A2, D3, F#3, A3, D4]
  ```
- On tuning change: destroy and recreate the `Fretboard` instance with new string frequencies, or add a `setTuning(strings[])` method.
- The `filterPositions()` function in `app.js` calls `fretboard.findAllPositions()` which uses the string frequencies — everything downstream adapts automatically.

## Files to Modify

- `jukebox/index.html` — tuning dropdown
- `jukebox/app.js` — tuning change handler, fretboard recreation
- `shared/audio/fretboard.js` — optional: add `setTuning()` method
- `jukebox/styles.css` — dropdown styling

## Acceptance Criteria

- [ ] Tuning selector is visible near the fretboard
- [ ] Changing tuning updates the fretboard string labels (nut)
- [ ] Note positions recalculate correctly for the selected tuning
- [ ] Default is Standard tuning
- [ ] Works correctly with octave offset and fret/string range filters
