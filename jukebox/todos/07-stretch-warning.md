# 07 — Finger Stretch Warning

**Priority:** 7 | **Effort:** Low | **Impact:** Medium

## Summary

Visually warn when consecutive notes require a fret jump larger than a comfortable hand span (typically 4 frets), signaling the learner needs to shift hand position.

## Rationale

Beginners often don't anticipate hand shifts and fumble when a large jump appears. Seeing the warning ahead of time lets them prepare mentally and physically.

## Implementation Notes

- In `fretTick()`, compare `primary.fret` between the active note and each upcoming note.
- If the fret distance exceeds a threshold (default 4), add a CSS class (e.g., `stretch-warning`) to the upcoming note's cell.
- Visual treatment: a dashed border, a subtle red tint, or a small arrow icon indicating direction of the shift.
- The threshold could be configurable via a setting, but a sensible default of 4 frets covers most hand positions.

## Files to Modify

- `shared/audio/fretboard.css` — `stretch-warning` class styling
- `shared/audio/fretboard.js` — add `stretch-warning` to `clearAll()`
- `jukebox/app.js` — compute fret distance in `fretTick()`, apply class

## Acceptance Criteria

- [ ] Notes requiring a large fret jump are visually distinct
- [ ] Warning appears on the upcoming note, not the current one
- [ ] Warning is visible but doesn't obscure the sequence number or color
- [ ] Works correctly when fret range filter is active
