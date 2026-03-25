/* vol-surface.js — FX Implied Volatility Surface Library
   ES Module · Three.js is a peer dependency (pass via options.THREE)
*/

// ── Colormaps (RGB stops) ──────────────────────────────────────────────────
export const COLORMAPS = {
  plasma:   [[13,8,135],[84,2,163],[139,10,165],[185,50,137],[219,92,104],[244,136,73],[254,188,43],[240,249,33]],
  viridis:  [[68,1,84],[72,40,120],[62,83,160],[49,104,142],[38,130,142],[31,158,137],[53,183,121],[110,206,88],[181,222,43],[253,231,37]],
  rdylgn:   [[165,0,38],[215,48,39],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[217,239,139],[166,217,106],[102,189,99],[26,152,80],[0,104,55]],
  spectral: [[158,1,66],[213,62,79],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[230,245,152],[171,221,164],[102,194,165],[50,136,189],[94,79,162]],
};

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

// ── VolSurface class ───────────────────────────────────────────────────────
export class VolSurface {
  /**
   * @param {HTMLElement} container  - Element to render into
   * @param {object}      options
   * @param {object}      options.THREE     - Three.js namespace (peer dep)
   * @param {string}      [options.colormap='plasma']
   * @param {boolean}     [options.wireframe=false]
   */
  constructor(container, options = {}) {
    const { THREE, colormap = 'plasma', wireframe = false } = options;
    if (!THREE) throw new Error('VolSurface: options.THREE is required');

    this._THREE     = THREE;
    this._container = container;
    this._colormap  = colormap;
    this._wireframe = wireframe;

    // Vol data
    this._volData = null;
    this._tenors  = [];
    this._deltas  = [];
    this._label   = '';

    // Camera state
    this._phi    = 0.65;
    this._theta  = 0.7;
    this._radius = 10;
    this._panX   = 0;
    this._panY   = 0;

    // Mouse state
    this._isMouseDown  = false;
    this._lastX        = 0;
    this._lastY        = 0;
    this._isRightClick = false;

    // Event handlers map
    this._handlers = { hover: [] };

    // Bound listener refs for cleanup
    this._onMouseDown  = this._handleMouseDown.bind(this);
    this._onMouseUp    = this._handleMouseUp.bind(this);
    this._onMouseMove  = this._handleMouseMove.bind(this);
    this._onWheel      = this._handleWheel.bind(this);
    this._onContextMenu = e => e.preventDefault();
    this._onResize     = this._handleResize.bind(this);

    this._animFrameId = null;
    this._mesh        = null;
    this._wireframeMesh = null;

    this._init();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Set the volatility surface data and re-render.
   * @param {object} data
   * @param {number[][]} data.grid    - N_T × N_D array of IV % values
   * @param {string[]}   data.tenors  - tenor labels e.g. ['1W','1M','3M','6M','1Y']
   * @param {number[]}   data.deltas  - delta values e.g. [10,25,50,75,90]
   * @param {string}     [data.label] - display label e.g. 'EUR/USD'
   */
  setData({ grid, tenors, deltas, label = '' }) {
    this._volData = grid;
    this._tenors  = tenors;
    this._deltas  = deltas;
    this._label   = label;
    this._rebuildSurface();
    this._buildLegend();
  }

  /** @param {string} name - colormap name */
  setColormap(name) {
    this._colormap = name;
    if (this._volData) {
      this._rebuildSurface();
      this._buildLegend();
    }
  }

  /** @param {boolean} enabled */
  setWireframe(enabled) {
    this._wireframe = enabled;
    if (this._wireframeMesh) this._wireframeMesh.visible = enabled;
  }

  /**
   * Subscribe to events.
   * @param {'hover'} event
   * @param {Function} handler  - called with {tenor, delta, iv} or null on leave
   */
  on(event, handler) {
    if (this._handlers[event]) this._handlers[event].push(handler);
  }

  /** Dispose all Three.js resources and remove DOM elements. */
  destroy() {
    cancelAnimationFrame(this._animFrameId);

    const el = this._renderer.domElement;
    el.removeEventListener('mousedown',   this._onMouseDown);
    el.removeEventListener('contextmenu', this._onContextMenu);
    el.removeEventListener('wheel',       this._onWheel);
    el.removeEventListener('mousemove',   this._onMouseMove);
    el.removeEventListener('mouseleave',  this._onMouseLeave);
    window.removeEventListener('mouseup',    this._onMouseUp);
    window.removeEventListener('mousemove',  this._onMouseMove);
    window.removeEventListener('resize',     this._onResize);

    if (this._mesh) {
      this._mesh.geometry.dispose();
      this._mesh.material.dispose();
    }
    if (this._wireframeMesh) {
      this._wireframeMesh.geometry.dispose();
      this._wireframeMesh.material.dispose();
    }
    this._renderer.dispose();
    this._container.removeChild(this._renderer.domElement);
    if (this._tooltipEl) this._container.removeChild(this._tooltipEl);
    if (this._legendEl)  this._container.removeChild(this._legendEl);
  }

  // ── Private: init ─────────────────────────────────────────────────────────

  _init() {
    const THREE = this._THREE;
    const container = this._container;

    this._scene  = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0d0d14);

    this._camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this._raycaster = new THREE.Raycaster();
    this._mouse     = new THREE.Vector2();

    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this._renderer.domElement);

    // Lighting
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 8, 5);
    this._scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    dir2.position.set(-5, 3, -5);
    this._scene.add(dir2);

    // Tooltip element
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.id = 'vs-tooltip';
    Object.assign(this._tooltipEl.style, {
      position: 'absolute', display: 'none', pointerEvents: 'none',
      background: 'rgba(10,10,24,0.92)', color: '#c8c8e8',
      border: '1px solid #2a2a5a', borderRadius: '6px',
      padding: '8px 12px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace',
      lineHeight: '1.6', zIndex: '10',
    });
    container.appendChild(this._tooltipEl);

    // Legend element
    this._legendEl = document.createElement('canvas');
    this._legendEl.width  = 160;
    this._legendEl.height = 12;
    Object.assign(this._legendEl.style, {
      position: 'absolute', bottom: '8px', left: '50%',
      transform: 'translateX(-50%)', display: 'block', pointerEvents: 'none',
    });
    container.appendChild(this._legendEl);

    this._setupControls();
    this._updateCamera();
    this._addAxes();
    this._animate();

    window.addEventListener('resize', this._onResize);
  }

  // ── Private: geometry ─────────────────────────────────────────────────────

  _buildGeometry() {
    const THREE = this._THREE;
    const geo   = new THREE.BufferGeometry();
    const positions = [], colors = [], uvs = [], indices = [];

    const grid   = this._volData;
    const N_T    = this._tenors.length;
    const N_D    = this._deltas.length;

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
        const [r, g, b] = sampleColormap(t, this._colormap);
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

  _rebuildSurface() {
    const THREE = this._THREE;
    if (this._mesh) {
      this._scene.remove(this._mesh);
      this._mesh.geometry.dispose();
      this._mesh.material.dispose();
    }
    if (this._wireframeMesh) {
      this._scene.remove(this._wireframeMesh);
      this._wireframeMesh.geometry.dispose();
      this._wireframeMesh.material.dispose();
    }

    const geo = this._buildGeometry();

    this._mesh = new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 60,
        specular: new THREE.Color(0x333366),
      })
    );
    this._scene.add(this._mesh);

    this._wireframeMesh = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({
        color: 0x1a1a40, wireframe: true, transparent: true, opacity: 0.4,
      })
    );
    this._wireframeMesh.visible = this._wireframe;
    this._scene.add(this._wireframeMesh);
  }

  // ── Private: axes & legend ────────────────────────────────────────────────

  _addAxes() {
    const THREE   = this._THREE;
    const scene   = this._scene;
    const tenors  = this._tenors;
    const deltas  = this._deltas;
    const N_T     = tenors.length;
    const N_D     = deltas.length;
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

    // Tenor labels along X
    if (tenors.length) {
      tenors.forEach((t, i) => {
        const x = (i / (N_T - 1)) * 4 - 2;
        sprite(t, [x, -0.75, 2.45]);
      });
    }
    // Delta labels along Z
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

  _buildLegend() {
    if (!this._legendEl) return;
    const ctx  = this._legendEl.getContext('2d');
    for (let i = 0; i < 160; i++) {
      const [r, g, b] = sampleColormap(i / 159, this._colormap);
      ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      ctx.fillRect(i, 0, 1, 12);
    }
  }

  // ── Private: camera ───────────────────────────────────────────────────────

  _updateCamera() {
    const x = this._radius * Math.sin(this._phi) * Math.sin(this._theta) + this._panX;
    const y = this._radius * Math.cos(this._phi) + this._panY;
    const z = this._radius * Math.sin(this._phi) * Math.cos(this._theta);
    this._camera.position.set(x, y, z);
    this._camera.lookAt(this._panX, this._panY, 0);
  }

  // ── Private: controls ─────────────────────────────────────────────────────

  _setupControls() {
    const el = this._renderer.domElement;

    el.addEventListener('mousedown',   this._onMouseDown);
    el.addEventListener('contextmenu', this._onContextMenu);
    el.addEventListener('wheel',       this._onWheel, { passive: false });

    // mousemove for both orbit/pan and tooltip
    el.addEventListener('mousemove', this._onMouseMove);

    this._onMouseLeave = () => {
      this._tooltipEl.style.display = 'none';
      this._emit('hover', null);
    };
    el.addEventListener('mouseleave', this._onMouseLeave);

    window.addEventListener('mouseup',   this._onMouseUp);
    // window mousemove for drag outside canvas
    window.addEventListener('mousemove', this._onMouseMove);
  }

  _handleMouseDown(e) {
    this._isMouseDown  = true;
    this._lastX        = e.clientX;
    this._lastY        = e.clientY;
    this._isRightClick = e.button === 2;
    e.preventDefault();
  }

  _handleMouseUp() {
    this._isMouseDown = false;
  }

  _handleMouseMove(e) {
    // Orbit / pan when dragging
    if (this._isMouseDown) {
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      if (this._isRightClick) {
        this._panX -= dx * 0.01;
        this._panY += dy * 0.01;
      } else {
        this._theta -= dx * 0.01;
        this._phi = Math.max(0.1, Math.min(Math.PI - 0.1, this._phi + dy * 0.01));
      }
      this._updateCamera();
    }

    // Tooltip (only when event target is our canvas)
    const el = this._renderer.domElement;
    if (e.target !== el) return;

    const rect = el.getBoundingClientRect();
    this._mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this._camera);

    if (!this._mesh) return;
    const hits = this._raycaster.intersectObject(this._mesh);
    if (hits.length > 0) {
      const pt   = hits[0].point;
      const N_T  = this._tenors.length;
      const N_D  = this._deltas.length;
      const ti   = Math.max(0, Math.min(N_T - 1, Math.round(((pt.x + 2) / 4) * (N_T - 1))));
      const di   = Math.max(0, Math.min(N_D - 1, Math.round(((pt.z + 2) / 4) * (N_D - 1))));

      if (this._volData[ti]?.[di] !== undefined) {
        const iv = this._volData[ti][di];
        const tenor = this._tenors[ti];
        const delta = this._deltas[di];

        this._tooltipEl.innerHTML =
          `<b>${this._label}</b><br>` +
          `Tenor: ${tenor}<br>` +
          `Delta: ${delta}\u0394<br>` +
          `IV: <b>${iv.toFixed(2)}%</b>`;
        this._tooltipEl.style.display = 'block';
        this._tooltipEl.style.left    = (e.clientX - rect.left + 14) + 'px';
        this._tooltipEl.style.top     = (e.clientY - rect.top  - 12) + 'px';

        this._emit('hover', { tenor, delta, iv });
      }
    } else {
      this._tooltipEl.style.display = 'none';
      this._emit('hover', null);
    }
  }

  _handleWheel(e) {
    this._radius = Math.max(4, Math.min(20, this._radius + e.deltaY * 0.02));
    this._updateCamera();
    e.preventDefault();
  }

  _handleResize() {
    const container = this._container;
    this._camera.aspect = container.clientWidth / container.clientHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // ── Private: event emitter ────────────────────────────────────────────────

  _emit(event, data) {
    (this._handlers[event] || []).forEach(fn => fn(data));
  }

  // ── Private: render loop ──────────────────────────────────────────────────

  _animate() {
    this._animFrameId = requestAnimationFrame(() => this._animate());
    this._renderer.render(this._scene, this._camera);
  }
}
