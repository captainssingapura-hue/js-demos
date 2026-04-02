# 08 — Scale / Key Overlay

**Priority:** 8 | **Effort:** Medium | **Impact:** Medium-High

## Summary

Dimly highlight all notes belonging to the current key/scale across the entire fretboard, giving the learner context for where the melody "lives" on the neck.

## Rationale

Understanding which notes are "safe" (in key) helps learners make sense of the melody pattern and eventually improvise. It bridges the gap between mechanical note-following and musical understanding.

## Implementation Notes

- Add a key/scale selector (e.g., "A minor", "C major", "E pentatonic").
- Compute all note frequencies for the selected scale across all frets and strings.
- Use a new CSS class (e.g., `fb-cell.scale`) with very subtle background tinting — must not compete with active/next highlights.
- Could auto-detect the key from the melody's note set (find the best-fitting major/minor scale) or let the user pick manually.
- Each track could optionally declare its key in the track definition.
- The overlay should persist even when no notes are playing.

## Files to Modify

- `jukebox/index.html` — key/scale selector UI
- `jukebox/app.js` — scale computation, fretboard overlay logic
- `shared/audio/fretboard.js` — new `highlightScale(notes[])` method
- `shared/audio/fretboard.css` — `.scale` class (very dim styling)
- `jukebox/styles.css` — selector styling

## Acceptance Criteria

- [ ] Scale overlay is visible as dim highlights across the fretboard
- [ ] Active/next note highlights render clearly on top of scale overlay
- [ ] User can select key and scale type (major, minor, pentatonic)
- [ ] Overlay updates when selection changes
- [ ] Optional: auto-detect key from track melody
