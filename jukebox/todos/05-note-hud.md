# 05 — Current Note HUD

**Priority:** 5 | **Effort:** Low | **Impact:** Medium

## Summary

Display a large, readable text area below the fretboard showing the current and next note with position details. e.g., "Now: E5 (fret 5, A string) -> Next: G5 (fret 3, high E string)".

## Rationale

The fretboard cells are small and can be hard to read at a glance, especially for beginners still learning to navigate the neck. A prominent text HUD provides instant clarity — like a guitar teacher pointing and calling out the note.

## Implementation Notes

- Add a `<div id="noteHud">` below the fretboard container.
- Update `fretTick()` to also set the HUD text content based on the active and next-1 events.
- Derive string name from string index (E, A, D, G, B, e) and note name from frequency.
- Show fret number and string name for quick reference.
- Use large, high-contrast text. Color the note name to match fretboard highlight colors.

## Files to Modify

- `jukebox/index.html` — add HUD element
- `jukebox/app.js` — update `fretTick()` to populate HUD
- `jukebox/styles.css` — large text styling for HUD

## Acceptance Criteria

- [ ] HUD shows current note name, fret number, and string name
- [ ] HUD shows next note info with a visual arrow separator
- [ ] Text colors match the fretboard highlight colors (gold for current, mint for next)
- [ ] HUD clears on stop and freezes on pause
- [ ] Readable at arm's length (large font)
