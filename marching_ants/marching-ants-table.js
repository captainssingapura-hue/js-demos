const ROWS = 10, COLS = 10, SEL = 3;
let startR = 0, startC = 0;
let color = '#378ADD';
let offset = 0, lastTime = null, rafId = null;
const colWidths = Array(COLS).fill(56);

/* ── Table build ── */

function buildTable() {
  const tbl = document.getElementById('tbl');
  tbl.innerHTML = '';

  const colgroup = document.createElement('colgroup');
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('col');
    col.id = `col${c}`;
    col.style.width = colWidths[c] + 'px';
    colgroup.appendChild(col);
  }
  tbl.appendChild(colgroup);

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (let c = 0; c < COLS; c++) {
    const th = document.createElement('th');
    th.innerHTML = `<div class="th-inner">${String.fromCharCode(65 + c)}</div><div class="resize-handle" data-col="${c}"></div>`;
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < ROWS; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < COLS; c++) {
      const td = document.createElement('td');
      td.id = `c${r}_${c}`;
      td.textContent = `${String.fromCharCode(65 + c)}${r + 1}`;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);

  setupResizeHandles();
}

/* ── Column resize ── */

function setupResizeHandles() {
  document.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', onResizeStart);
  });
}

function onResizeStart(e) {
  e.preventDefault();
  const col = parseInt(e.target.dataset.col);
  const startX = e.clientX;
  const startW = colWidths[col];
  e.target.classList.add('dragging');

  function onMove(e) {
    const newW = Math.max(36, startW + e.clientX - startX);
    colWidths[col] = newW;
    document.getElementById(`col${col}`).style.width = newW + 'px';
  }
  function onUp() {
    e.target.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/* ── Selection ── */

function applySelection() {
  document.querySelectorAll('td').forEach(td => td.classList.remove('selected'));
  for (let r = startR; r < startR + SEL; r++)
    for (let c = startC; c < startC + SEL; c++)
      document.getElementById(`c${r}_${c}`).classList.add('selected');

  const col1 = String.fromCharCode(65 + startC);
  const col2 = String.fromCharCode(65 + startC + SEL - 1);
  document.getElementById('info-text').innerHTML =
    `Selected: <span>${col1}${startR + 1} → ${col2}${startR + SEL}</span>`;
  offset = 0;
}

function getSelectionRect() {
  const tl = document.getElementById(`c${startR}_${startC}`);
  const br = document.getElementById(`c${startR + SEL - 1}_${startC + SEL - 1}`);
  const container = document.getElementById('container');
  const cr  = container.getBoundingClientRect();
  const tlr = tl.getBoundingClientRect();
  const brr = br.getBoundingClientRect();
  return {
    x: tlr.left - cr.left,
    y: tlr.top  - cr.top,
    w: brr.right  - tlr.left,
    h: brr.bottom - tlr.top
  };
}

/* ── Canvas drawing ── */

function drawSide(ctx, x1, y1, x2, y2, startOffset, dash, period) {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  ctx.beginPath();
  let pos = ((-startOffset % period) + period) % period;
  if (pos > dash) pos -= period;
  while (pos < len) {
    const s = Math.max(pos, 0);
    const e = Math.min(pos + dash, len);
    if (e > s) {
      ctx.moveTo(x1 + ux * s, y1 + uy * s);
      ctx.lineTo(x1 + ux * e, y1 + uy * e);
    }
    pos += period;
  }
  ctx.stroke();
}

function drawMarch(ts) {
  if (lastTime === null) lastTime = ts;
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  const speed = parseFloat(document.getElementById('c-speed').value);
  const period = 16;
  offset = (offset + speed * dt / 1000) % period;

  const cvs = document.getElementById('cvs');
  const ctx = cvs.getContext('2d');
  const tbl = document.getElementById('tbl');
  const tblRect = tbl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  cvs.width  = tblRect.width  * dpr;
  cvs.height = tblRect.height * dpr;
  cvs.style.width  = tblRect.width  + 'px';
  cvs.style.height = tblRect.height + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, tblRect.width, tblRect.height);

  const { x, y, w, h } = getSelectionRect();
  const dash = 8, gap = 8;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';

  drawSide(ctx, x,     y,     x + w, y,     offset,                dash, period);
  drawSide(ctx, x + w, y,     x + w, y + h, offset + w,            dash, period);
  drawSide(ctx, x + w, y + h, x,     y + h, offset + w + h,        dash, period);
  drawSide(ctx, x,     y + h, x,     y,     offset + w + h + w,    dash, period);

  rafId = requestAnimationFrame(drawMarch);
}

/* ── Init ── */

function randomize() {
  startR = Math.floor(Math.random() * (ROWS - SEL + 1));
  startC = Math.floor(Math.random() * (COLS - SEL + 1));
  applySelection();
}

document.getElementById('c-color').addEventListener('input', e => { color = e.target.value; });

buildTable();
randomize();
lastTime = null;
requestAnimationFrame(drawMarch);
