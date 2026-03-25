/* scene-helpers.js — Three.js geometry and axis construction helpers */

import { sampleColormap } from './colormap.js';

/**
 * Build a BufferGeometry for the vol surface grid.
 * @param {object}     THREE    - Three.js namespace
 * @param {number[][]} grid     - N_T × N_D vol values
 * @param {number}     N_T      - number of tenor points
 * @param {number}     N_D      - number of delta points
 * @param {string}     colormap - colormap name
 * @returns {THREE.BufferGeometry}
 */
export function buildSurfaceGeometry(THREE, grid, N_T, N_D, colormap) {
  const geo = new THREE.BufferGeometry();
  const positions = [], colors = [], uvs = [], indices = [];

  let vmin = Infinity, vmax = -Infinity;
  grid.forEach(row => row.forEach(v => {
    if (v < vmin) vmin = v;
    if (v > vmax) vmax = v;
  }));

  for (let ti = 0; ti < N_T; ti++) {
    for (let di = 0; di < N_D; di++) {
      const x = (ti / (N_T - 1)) * 4 - 2;
      const z = (di / (N_D - 1)) * 4 - 2;
      const v = grid[ti][di];
      const y = (v - 7) * 0.18;
      positions.push(x, y, z);

      const t = (v - vmin) / (vmax - vmin + 0.001);
      const [r, g, b] = sampleColormap(t, colormap);
      colors.push(r / 255, g / 255, b / 255);
      uvs.push(ti / (N_T - 1), di / (N_D - 1));
    }
  }

  for (let ti = 0; ti < N_T - 1; ti++) {
    for (let di = 0; di < N_D - 1; di++) {
      const a = ti * N_D + di;
      const b = a + 1;
      const c = (ti + 1) * N_D + di;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Add axis lines, labels (sprites), and floor grid to the scene.
 */
export function buildAxes(THREE, scene, tenors, deltas) {
  const N_T = tenors.length;
  const N_D = deltas.length;
  const lineMat = new THREE.LineBasicMaterial({ color: 0x555566 });

  const line = pts => {
    const g = new THREE.BufferGeometry().setFromPoints(
      pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
    scene.add(new THREE.Line(g, lineMat));
  };

  line([[-2.3, -0.5, -2], [2.3, -0.5, -2]]);
  line([[-2, -0.5, -2.3], [-2, -0.5, 2.3]]);
  line([[-2, -0.5, -2],   [-2,  1.5, -2]]);

  const sprite = (text, [x, y, z], scaleX = 0.72, scaleY = 0.18) => {
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(180,180,210,0.92)';
    ctx.font = "bold 28px 'IBM Plex Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 44);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sp  = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(scaleX, scaleY, 1);
    scene.add(sp);
  };

  if (tenors.length) {
    tenors.forEach((t, i) => {
      const x = (i / (N_T - 1)) * 4 - 2;
      sprite(t, [x, -0.75, 2.45]);
    });
  }
  if (deltas.length) {
    deltas.forEach((d, i) => {
      const z = (i / (N_D - 1)) * 4 - 2;
      sprite(d + '\u0394', [-2.7, -0.6, z]);
    });
  }
  sprite('Maturity', [0, -0.95, 2.75], 1.0, 0.22);
  sprite('Delta',    [-3.2, -0.5, 0],  0.9, 0.22);
  sprite('IV %',     [-2.4, 0.7, -2.35], 0.72, 0.2);

  const gridMat = new THREE.LineBasicMaterial({ color: 0x1e1e3a, transparent: true, opacity: 0.7 });
  for (let ti = 0; ti < N_T; ti++) {
    const x = (ti / (N_T - 1)) * 4 - 2;
    const pts = Array.from({ length: N_D }, (_, di) =>
      new THREE.Vector3(x, -0.5, (di / (N_D - 1)) * 4 - 2)
    );
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }
  for (let di = 0; di < N_D; di++) {
    const z = (di / (N_D - 1)) * 4 - 2;
    const pts = Array.from({ length: N_T }, (_, ti) =>
      new THREE.Vector3((ti / (N_T - 1)) * 4 - 2, -0.5, z)
    );
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }
}
