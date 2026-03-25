/* FX Volatility Surface Display — main.js
   Dependencies: Three.js r128 (loaded via CDN in index.html)
*/

"use strict";

// ── Currency pair definitions ─────────────────────────────────────────────────
const PAIRS = {
  EURUSD: {
    label: "EUR/USD",
    atm:   [8.2, 8.5, 8.9, 9.4, 10.1],
    rr:    [-0.4, -0.6, -0.8, -1.0, -1.3],
    fly:   [0.12, 0.18, 0.22, 0.28, 0.35],
    skew:  "Negative",
    slope: "Upward",
  },
  USDJPY: {
    label: "USD/JPY",
    atm:   [7.1, 7.8, 8.6, 9.8, 11.2],
    rr:    [0.8, 1.1, 1.4, 1.8, 2.3],
    fly:   [0.20, 0.28, 0.35, 0.45, 0.58],
    skew:  "Positive",
    slope: "Steep Up",
  },
  GBPUSD: {
    label: "GBP/USD",
    atm:   [8.8, 9.1, 9.6, 10.3, 11.1],
    rr:    [-0.6, -0.9, -1.2, -1.5, -1.9],
    fly:   [0.15, 0.22, 0.30, 0.38, 0.48],
    skew:  "Negative",
    slope: "Upward",
  },
  USDCHF: {
    label: "USD/CHF",
    atm:   [6.8, 7.2, 7.7, 8.4, 9.3],
    rr:    [-0.3, -0.4, -0.5, -0.7, -0.9],
    fly:   [0.10, 0.14, 0.18, 0.23, 0.30],
    skew:  "Mild Neg",
    slope: "Moderate",
  },
};

const TENORS_LABEL = ["1W", "1M", "3M", "6M", "1Y"];
const DELTAS       = [10, 25, 50, 75, 90];
const N_T          = TENORS_LABEL.length;
const N_D          = DELTAS.length;

// ── Colormaps (RGB stops) ─────────────────────────────────────────────────────
const COLORMAPS = {
  plasma:   [[13,8,135],[84,2,163],[139,10,165],[185,50,137],[219,92,104],[244,136,73],[254,188,43],[240,249,33]],
  viridis:  [[68,1,84],[72,40,120],[62,83,160],[49,104,142],[38,130,142],[31,158,137],[53,183,121],[110,206,88],[181,222,43],[253,231,37]],
  rdylgn:   [[165,0,38],[215,48,39],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[217,239,139],[166,217,106],[102,189,99],[26,152,80],[0,104,55]],
  spectral: [[158,1,66],[213,62,79],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[230,245,152],[171,221,164],[102,194,165],[50,136,189],[94,79,162]],
};

function sampleColormap(t, name) {
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

// ── Vol surface maths (SVI-style) ─────────────────────────────────────────────
function computeVol(pairKey, ti, di) {
  const p = PAIRS[pairKey];
  const atm  = p.atm[ti];
  const rr   = p.rr[ti];
  const fly  = p.fly[ti];
  const moneyness = (DELTAS[di] - 50) / 50;
  const smile     = fly * moneyness * moneyness;
  const skewAdj   = -rr * moneyness * 0.5;
  // tiny seeded jitter so the surface looks natural, not mechanical
  const jitter = (Math.sin(ti * 7.3 + di * 13.1) * 0.5 + 0.5) * 0.08 - 0.04;
  return atm + skewAdj + smile + jitter;
}

function buildVolGrid(pairKey) {
  const grid = [];
  for (let ti = 0; ti < N_T; ti++) {
    const row = [];
    for (let di = 0; di < N_D; di++) row.push(computeVol(pairKey, ti, di));
    grid.push(row);
  }
  return grid;
}

// ── Three.js scene state ──────────────────────────────────────────────────────
let scene, camera, renderer, mesh, wireframeMesh, raycaster, mouse;
let volData    = [];
let currentPair = "EURUSD";
let phi = 0.65, theta = 0.7, radius = 10, panX = 0, panY = 0;
let isMouseDown = false, lastX = 0, lastY = 0, isRightClick = false;

// ── Geometry builder ──────────────────────────────────────────────────────────
function buildGeometry() {
  const geo       = new THREE.BufferGeometry();
  const positions = [], colors = [], uvs = [], indices = [];

  let vmin = Infinity, vmax = -Infinity;
  volData.forEach(row => row.forEach(v => {
    if (v < vmin) vmin = v;
    if (v > vmax) vmax = v;
  }));

  const cmap = document.getElementById("colormap-select").value;

  for (let ti = 0; ti < N_T; ti++) {
    for (let di = 0; di < N_D; di++) {
      const x = (ti / (N_T - 1)) * 4 - 2;
      const z = (di / (N_D - 1)) * 4 - 2;
      const v = volData[ti][di];
      const y = (v - 7) * 0.18;
      positions.push(x, y, z);

      const t = (v - vmin) / (vmax - vmin + 0.001);
      const [r, g, b] = sampleColormap(t, cmap);
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

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.Float32BufferAttribute(colors,    3));
  geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs,       2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ── Axis sprites & grid ───────────────────────────────────────────────────────
function addAxes() {
  const lineMat = new THREE.LineBasicMaterial({ color: 0x555566 });

  function line(pts) {
    const g = new THREE.BufferGeometry().setFromPoints(
      pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
    scene.add(new THREE.Line(g, lineMat));
  }

  line([[-2.3, -0.5, -2], [2.3, -0.5, -2]]);
  line([[-2, -0.5, -2.3], [-2, -0.5, 2.3]]);
  line([[-2, -0.5, -2],   [-2,  1.5, -2]]);

  function sprite(text, [x, y, z], scaleX = 0.72, scaleY = 0.18) {
    const canvas = document.createElement("canvas");
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = "rgba(180,180,210,0.92)";
    ctx.font = "bold 28px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 44);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sp  = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(scaleX, scaleY, 1);
    scene.add(sp);
  }

  TENORS_LABEL.forEach((t, i) => {
    const x = (i / (N_T - 1)) * 4 - 2;
    sprite(t, [x, -0.75, 2.45]);
  });
  DELTAS.forEach((d, i) => {
    const z = (i / (N_D - 1)) * 4 - 2;
    sprite(d + "Δ", [-2.7, -0.6, z]);
  });
  sprite("Maturity", [0, -0.95, 2.75], 1.0, 0.22);
  sprite("Delta",    [-3.2, -0.5, 0],  0.9, 0.22);
  sprite("IV %",     [-2.4, 0.7, -2.35], 0.72, 0.2);

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

// ── Camera update ─────────────────────────────────────────────────────────────
function updateCamera() {
  const x = radius * Math.sin(phi) * Math.sin(theta) + panX;
  const y = radius * Math.cos(phi) + panY;
  const z = radius * Math.sin(phi) * Math.cos(theta);
  camera.position.set(x, y, z);
  camera.lookAt(panX, panY, 0);
}

// ── Surface rebuild ───────────────────────────────────────────────────────────
function rebuildSurface() {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  if (wireframeMesh) {
    scene.remove(wireframeMesh);
    wireframeMesh.geometry.dispose();
    wireframeMesh.material.dispose();
  }

  volData = buildVolGrid(currentPair);
  const geo = buildGeometry();

  mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 60,
      specular: new THREE.Color(0x333366),
    })
  );
  scene.add(mesh);

  wireframeMesh = new THREE.Mesh(
    geo.clone(),
    new THREE.MeshBasicMaterial({ color: 0x1a1a40, wireframe: true, transparent: true, opacity: 0.4 })
  );
  wireframeMesh.visible = document.getElementById("wireframe-toggle").checked;
  scene.add(wireframeMesh);

  buildLegend();
}

// ── Stats panel ───────────────────────────────────────────────────────────────
function updateStats() {
  const p = PAIRS[currentPair];
  document.getElementById("stat-atm").textContent   = p.atm[1].toFixed(1) + "%";
  document.getElementById("stat-rr").textContent    = (p.rr[4] >= 0 ? "+" : "") + p.rr[4].toFixed(1) + " vol";
  document.getElementById("stat-skew").textContent  = p.skew;
  document.getElementById("stat-slope").textContent = p.slope;
  document.getElementById("header-pair").textContent = p.label;
}

// ── Legend canvas ─────────────────────────────────────────────────────────────
function buildLegend() {
  const canvas = document.getElementById("legend-canvas");
  const ctx    = canvas.getContext("2d");
  const cmap   = document.getElementById("colormap-select").value;
  for (let i = 0; i < 160; i++) {
    const [r, g, b] = sampleColormap(i / 159, cmap);
    ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    ctx.fillRect(i, 0, 1, 12);
  }
}

// ── Pair switcher ─────────────────────────────────────────────────────────────
function setPair(pair) {
  currentPair = pair;
  document.querySelectorAll(".pair-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pair === pair);
  });
  rebuildSurface();
  updateStats();
}

// ── Wireframe toggle ──────────────────────────────────────────────────────────
function toggleWireframe() {
  if (wireframeMesh) {
    wireframeMesh.visible = document.getElementById("wireframe-toggle").checked;
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// ── Mouse / touch controls ────────────────────────────────────────────────────
function setupControls(el) {
  el.addEventListener("mousedown", e => {
    isMouseDown    = true;
    lastX          = e.clientX;
    lastY          = e.clientY;
    isRightClick   = e.button === 2;
    e.preventDefault();
  });
  el.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("mouseup", () => { isMouseDown = false; });

  window.addEventListener("mousemove", e => {
    if (!isMouseDown) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (isRightClick) {
      panX -= dx * 0.01;
      panY += dy * 0.01;
    } else {
      theta -= dx * 0.01;
      phi    = Math.max(0.1, Math.min(Math.PI - 0.1, phi + dy * 0.01));
    }
    updateCamera();
  });

  el.addEventListener("wheel", e => {
    radius = Math.max(4, Math.min(20, radius + e.deltaY * 0.02));
    updateCamera();
    e.preventDefault();
  }, { passive: false });

  // Tooltip on hover
  el.addEventListener("mousemove", e => {
    const rect = el.getBoundingClientRect();
    mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const tooltip = document.getElementById("tooltip");
    if (!mesh) return;
    const hits = raycaster.intersectObject(mesh);
    if (hits.length > 0) {
      const pt = hits[0].point;
      const ti = Math.round(((pt.x + 2) / 4) * (N_T - 1));
      const di = Math.round(((pt.z + 2) / 4) * (N_D - 1));
      const cti = Math.max(0, Math.min(N_T - 1, ti));
      const cdi = Math.max(0, Math.min(N_D - 1, di));
      if (volData[cti]?.[cdi] !== undefined) {
        const vol = volData[cti][cdi];
        tooltip.innerHTML =
          `<b>${PAIRS[currentPair].label}</b><br>` +
          `Tenor: ${TENORS_LABEL[cti]}<br>` +
          `Delta: ${DELTAS[cdi]}Δ<br>` +
          `IV: <b>${vol.toFixed(2)}%</b>`;
        tooltip.style.display = "block";
        tooltip.style.left    = (e.clientX - rect.left + 14) + "px";
        tooltip.style.top     = (e.clientY - rect.top  - 12) + "px";
      }
    } else {
      tooltip.style.display = "none";
    }
  });
  el.addEventListener("mouseleave", () => {
    document.getElementById("tooltip").style.display = "none";
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  const container = document.getElementById("canvas-wrap");

  scene    = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d14);

  camera   = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  raycaster = new THREE.Raycaster();
  mouse    = new THREE.Vector2();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 8, 5);
  scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
  dir2.position.set(-5, 3, -5);
  scene.add(dir2);

  addAxes();
  setupControls(renderer.domElement);
  updateCamera();
  rebuildSurface();
  updateStats();
  animate();

  // Bind UI
  document.querySelectorAll(".pair-btn").forEach(btn => {
    btn.addEventListener("click", () => setPair(btn.dataset.pair));
  });
  document.getElementById("wireframe-toggle").addEventListener("change", toggleWireframe);
  document.getElementById("colormap-select").addEventListener("change", () => {
    rebuildSurface();
  });

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

window.addEventListener("load", init);
