/* surface-controls.js — Mouse interaction for VolSurface
   Orbit, pan, zoom, and raycaster tooltip — all as closures over
   the surface instance so the class stays lean.
*/

/**
 * Attach mouse controls to a VolSurface instance.
 * Returns a detach function for cleanup.
 * @param {VolSurface} s - the surface instance
 */
export function attachControls(s) {
  const el = s._renderer.domElement;
  let isMouseDown = false, lastX = 0, lastY = 0, isRightClick = false;

  function onMouseDown(e) {
    isMouseDown  = true;
    lastX        = e.clientX;
    lastY        = e.clientY;
    isRightClick = e.button === 2;
    e.preventDefault();
  }

  function onMouseUp() {
    isMouseDown = false;
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  function onMouseMove(e) {
    // Orbit / pan when dragging
    if (isMouseDown) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (isRightClick) {
        s._panX -= dx * 0.01;
        s._panY += dy * 0.01;
      } else {
        s._theta -= dx * 0.01;
        s._phi = Math.max(0.1, Math.min(Math.PI - 0.1, s._phi + dy * 0.01));
      }
      s._updateCamera();
    }

    // Tooltip (only when hovering our canvas)
    if (e.target !== el) return;

    const rect = el.getBoundingClientRect();
    s._mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    s._mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    s._raycaster.setFromCamera(s._mouse, s._camera);

    if (!s._mesh) return;
    const hits = s._raycaster.intersectObject(s._mesh);
    if (hits.length > 0) {
      const pt  = hits[0].point;
      const N_T = s._tenors.length;
      const N_D = s._deltas.length;
      const ti  = Math.max(0, Math.min(N_T - 1, Math.round(((pt.x + 2) / 4) * (N_T - 1))));
      const di  = Math.max(0, Math.min(N_D - 1, Math.round(((pt.z + 2) / 4) * (N_D - 1))));

      if (s._volData[ti]?.[di] !== undefined) {
        const iv    = s._volData[ti][di];
        const tenor = s._tenors[ti];
        const delta = s._deltas[di];

        s._tooltipEl.innerHTML =
          `<b>${s._label}</b><br>` +
          `Tenor: ${tenor}<br>` +
          `Delta: ${delta}\u0394<br>` +
          `IV: <b>${iv.toFixed(2)}%</b>`;
        s._tooltipEl.style.display = 'block';
        s._tooltipEl.style.left    = (e.clientX - rect.left + 14) + 'px';
        s._tooltipEl.style.top     = (e.clientY - rect.top  - 12) + 'px';

        s._emit('hover', { tenor, delta, iv });
      }
    } else {
      s._tooltipEl.style.display = 'none';
      s._emit('hover', null);
    }
  }

  function onWheel(e) {
    s._radius = Math.max(4, Math.min(20, s._radius + e.deltaY * 0.02));
    s._updateCamera();
    e.preventDefault();
  }

  function onMouseLeave() {
    s._tooltipEl.style.display = 'none';
    s._emit('hover', null);
  }

  function onResize() {
    s._camera.aspect = s._container.clientWidth / s._container.clientHeight;
    s._camera.updateProjectionMatrix();
    s._renderer.setSize(s._container.clientWidth, s._container.clientHeight);
  }

  // Observe container resizes (manual drag-resize + window resize)
  const resizeObserver = new ResizeObserver(() => onResize());
  resizeObserver.observe(s._container);

  // Attach
  el.addEventListener('mousedown',   onMouseDown);
  el.addEventListener('contextmenu', onContextMenu);
  el.addEventListener('wheel',       onWheel, { passive: false });
  el.addEventListener('mousemove',   onMouseMove);
  el.addEventListener('mouseleave',  onMouseLeave);
  window.addEventListener('mouseup',   onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  // Return detach function
  return function detach() {
    resizeObserver.disconnect();
    el.removeEventListener('mousedown',   onMouseDown);
    el.removeEventListener('contextmenu', onContextMenu);
    el.removeEventListener('wheel',       onWheel);
    el.removeEventListener('mousemove',   onMouseMove);
    el.removeEventListener('mouseleave',  onMouseLeave);
    window.removeEventListener('mouseup',   onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
  };
}
