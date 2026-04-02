# 02 — Note Names on Fretboard

**Priority:** 2 | **Effort:** Low | **Impact:** High

## Summary

Display the note name (e.g., "E5", "G#4") inside each highlighted fretboard cell. Builds fretboard literacy — the most fundamental skill for guitar players.

## Rationale

Beginners don't know which note lives at each fret. Showing the name while the note sounds creates a visual-audio association that accelerates fretboard memorization.

## Implementation Notes

- The `highlight()` method already accepts a `label` parameter and renders via `data-label` + CSS `::after`.
- Currently labels show sequence numbers (0–4). Could combine: `"0 E5"` or use a second data attribute (`data-note`) with a separate CSS `::before`.
- Derive note name from frequency: `freqToNoteName(freq)` — the semitone table already exists in `synthesizer.js` (`N()` function). Add an inverse helper.
- Carry `noteName` in each `jbFretEvents` entry, pass to `fretboard.highlight()` in `fretTick()`.

## Files to Modify

- `shared/audio/synthesizer.js` — add `freqToNoteName(freq)` export
- `shared/audio/fretboard.js` — support a second label (note name)
- `shared/audio/fretboard.css` — style for note name display
- `jukebox/app.js` — compute and pass note names through events

## Acceptance Criteria

- [ ] Each highlighted cell shows its note name (e.g., "E5")
- [ ] Sequence number is still visible alongside the note name
- [ ] Note names are readable at the current cell size
- [ ] Works correctly for sharps (C#, F#, etc.)
