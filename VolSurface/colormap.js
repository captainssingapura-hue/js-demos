/* colormap.js — Colormap definitions and interpolation */

export const COLORMAPS = {
  plasma:   [[13,8,135],[84,2,163],[139,10,165],[185,50,137],[219,92,104],[244,136,73],[254,188,43],[240,249,33]],
  viridis:  [[68,1,84],[72,40,120],[62,83,160],[49,104,142],[38,130,142],[31,158,137],[53,183,121],[110,206,88],[181,222,43],[253,231,37]],
  rdylgn:   [[165,0,38],[215,48,39],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[217,239,139],[166,217,106],[102,189,99],[26,152,80],[0,104,55]],
  spectral: [[158,1,66],[213,62,79],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[230,245,152],[171,221,164],[102,194,165],[50,136,189],[94,79,162]],
};

/**
 * Interpolate a colormap at position t (0–1). Returns [r, g, b] in 0–255 range.
 */
export function sampleColormap(t, name) {
  const c = COLORMAPS[name];
  const idx = t * (c.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, c.length - 1);
  const f  = idx - lo;
  return [
    c[lo][0] * (1 - f) + c[hi][0] * f,
    c[lo][1] * (1 - f) + c[hi][1] * f,
    c[lo][2] * (1 - f) + c[hi][2] * f,
  ];
}
