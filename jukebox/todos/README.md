# Jukebox Guitar Learning — Feature Backlog

Prioritized improvements to help users learn and practice guitar with the jukebox app.

| # | Feature | Effort | Impact | Status | File |
|---|---------|--------|--------|--------|------|
| 1 | Tempo / Speed Control | Low | Very High | Planned | [01-tempo-control.md](01-tempo-control.md) |
| 2 | Note Names on Fretboard | Low | High | Planned | [02-note-names.md](02-note-names.md) |
| 3 | Loop / Section Repeat | Medium | Very High | Planned | [03-loop-repeat.md](03-loop-repeat.md) |
| 4 | Step-Through Mode | Medium | Very High | Planned | [04-step-through.md](04-step-through.md) |
| 5 | Current Note HUD | Low | Medium | Planned | [05-note-hud.md](05-note-hud.md) |
| 6 | Metronome / Count-In | Low-Med | Medium | Planned | [06-metronome.md](06-metronome.md) |
| 7 | Finger Stretch Warning | Low | Medium | Planned | [07-stretch-warning.md](07-stretch-warning.md) |
| 8 | Scale / Key Overlay | Medium | Medium-High | Planned | [08-scale-overlay.md](08-scale-overlay.md) |
| 9 | Alternate Tuning Selector | Low | Medium | Planned | [09-alt-tuning.md](09-alt-tuning.md) |
| 10 | Mic Pitch Detection | High | Transformative | Planned | [10-mic-detection.md](10-mic-detection.md) |

## Architecture Reference

- `shared/audio/fretboard.js` — Fretboard class (highlight, clearAll, findAllPositions)
- `shared/audio/fretboard.css` — fretboard styling with active/next-1..4/octave classes
- `shared/audio/pitchroll.js` — PitchRoll canvas class (scrolling piano roll)
- `shared/audio/synthesizer.js` — N(), R, encodeWAV, drum synths
- `jukebox/app.js` — playback engine, fret tick loop, melody editor, pause/resume
- `jukebox/index.html` — UI layout
- `jukebox/styles.css` — app-specific styles
