/* vol-surface.js — FX Implied Volatility Surface Library
   ES Module · Three.js is a peer dependency (pass via options.THREE)
*/

import { sampleColormap } from './colormap.js';
import { buildSurfaceGeometry, buildAxes } from './scene-helpers.js';
import { attachControls } from './surface-controls.js';

// Re-export colormap utilities for library consumers
export { COLORMAPS, sampleColormap } from './colormap.js';

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

    // Event handlers map
    this._handlers = { hover: [] };

    this._animFrameId   = null;
    this._mesh          = null;
    this._wireframeMesh = null;
    this._detachControls = null;

    this._init();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Set the volatility surface data and re-render.
   * @param {object} data
   * @param {number[][]} data.grid    - N_T × N_D array of IV % values
   * @param {string[]}   data.tenors  - tenor labels
   * @param {number[]}   data.deltas  - delta values
   * @param {string}     [data.label] - display label
   */
  setData({ grid, tenors, deltas, label = '' }) {
    this._volData = grid;
    this._tenors  = tenors;
    this._deltas  = deltas;
    this._label   = label;
    this._rebuildSurface();
    this._buildLegend();
  }

  setColormap(name) {
    this._colormap = name;
    if (this._volData) {
      this._rebuildSurface();
      this._buildLegend();
    }
  }

  setWireframe(enabled) {
    this._wireframe = enabled;
    if (this._wireframeMesh) this._wireframeMesh.visible = enabled;
  }

  on(event, handler) {
    if (this._handlers[event]) this._handlers[event].push(handler);
  }

  destroy() {
    cancelAnimationFrame(this._animFrameId);
    if (this._detachControls) this._detachControls();

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

  // ── Private ───────────────────────────────────────────────────────────────

  _init() {
    const THREE = this._THREE;
    const container = this._container;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0d0d14);

    this._camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 100
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

    this._detachControls = attachControls(this);
    this._updateCamera();
    this._buildAxesOnce();
    this._animate();
  }

  _buildAxesOnce() {
    buildAxes(this._THREE, this._scene, this._tenors, this._deltas);
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

    const N_T = this._tenors.length;
    const N_D = this._deltas.length;
    const geo = buildSurfaceGeometry(THREE, this._volData, N_T, N_D, this._colormap);

    this._mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.DoubleSide,
      shininess: 60, specular: new THREE.Color(0x333366),
    }));
    this._scene.add(this._mesh);

    this._wireframeMesh = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
      color: 0x1a1a40, wireframe: true, transparent: true, opacity: 0.4,
    }));
    this._wireframeMesh.visible = this._wireframe;
    this._scene.add(this._wireframeMesh);
  }

  _buildLegend() {
    if (!this._legendEl) return;
    const ctx = this._legendEl.getContext('2d');
    for (let i = 0; i < 160; i++) {
      const [r, g, b] = sampleColormap(i / 159, this._colormap);
      ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      ctx.fillRect(i, 0, 1, 12);
    }
  }

  _updateCamera() {
    const x = this._radius * Math.sin(this._phi) * Math.sin(this._theta) + this._panX;
    const y = this._radius * Math.cos(this._phi) + this._panY;
    const z = this._radius * Math.sin(this._phi) * Math.cos(this._theta);
    this._camera.position.set(x, y, z);
    this._camera.lookAt(this._panX, this._panY, 0);
  }

  _emit(event, data) {
    (this._handlers[event] || []).forEach(fn => fn(data));
  }

  _animate() {
    this._animFrameId = requestAnimationFrame(() => this._animate());
    this._renderer.render(this._scene, this._camera);
  }
}
