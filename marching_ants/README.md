# Marching Ants — Table Selection

A single-page demo that renders a 10x10 data table with an animated "marching ants" dashed border around a selected region, drawn on a canvas overlay.

## Features

- **Click to select** — click any cell to select a 3x3 range starting from that cell
- **Randomize** — jump the selection to a random position
- **Clear selection** — press `Esc` to dismiss the selection
- **Resizable columns** — drag the right edge of any column header
- **Customizable animation** — color picker and speed slider for the marching ants effect
- **Dark mode** — automatic via `prefers-color-scheme`
- **High-DPI aware** — canvas scales with `devicePixelRatio`

## Usage

Open `marching-ants-table.html` in a browser. No build step or dependencies required.
