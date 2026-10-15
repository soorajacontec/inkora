/* Inkora: writing pad.
   window.ILWrite.mount(host, { toast }) -> { destroy }
   Three canvases are stacked: the surface (paper, leaf or palm leaf), the dry ink,
   and a small "wet" layer that is redrawn every frame only while ink is still wet.
   Palm-leaf mode scratches grooves with a stylus; "Rub soot" darkens them. */
(() => {
  'use strict';

  const store = {
    get(k, d) { try { const v = localStorage.getItem('il-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('il-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ic = (n) => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  const SURFACES = {
    paper: { name: 'Paper', info: 'Cream paper. Fresh ink looks darker and a little glossy, then dries lighter in a couple of seconds.', nibs: ['fine', 'medium', 'broad', 'italic', 'flex'] },
    leaf: { name: 'Fresh leaf', info: 'A green leaf. Dark inks show well; try ivory for a pale, glowing line. The ink dries as you watch.', nibs: ['fine', 'medium', 'broad', 'italic', 'flex'] },
    palm: { name: 'Palm leaf', info: 'Palm-leaf manuscripts were scratched with an iron stylus (ezhuthani). Scratch some letters, then press Rub soot: lamp-black is smeared over the leaf and wiped off, and stays only in the grooves.', nibs: ['stylus'] },
  };
  const NIBS = {
    fine: { name: 'Fine', w: 1.5, kind: 'round' },
    medium: { name: 'Medium', w: 2.6, kind: 'round' },
    broad: { name: 'Broad', w: 4.6, kind: 'round' },
    italic: { name: 'Italic', w: 5.4, kind: 'edge', angle: 40 },
    flex: { name: 'Flex', w: 2.4, kind: 'flex' },
    stylus: { name: 'Iron stylus', w: 1.7, kind: 'stylus' },
  };
  const INKS = [['Lapis blue', '#1d2f7a'], ['Black', '#16161c'], ['Carnelian', '#7d1330'], ['Malachite', '#0d6b4c'], ['Sepia', '#5a3718'], ['Lapis violet', '#4a2a8a'], ['Papyrus', '#f4ecd0']];

  /* tiny deterministic random, so the paper grain does not change on every redraw */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (c, t, a) => c.map((v, i) => Math.round(lerp(v, t[i], a)));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- surfaces ---------- */
  function drawSurface(ctx, kind, W, H) {
    ctx.clearRect(0, 0, W, H);
    if (kind === 'paper') {
      ctx.fillStyle = '#f6f0e2'; ctx.fillRect(0, 0, W, H);
      const r = rng(7);
      for (let i = 0; i < Math.min(2200, W * H / 260); i++) {
        ctx.fillStyle = `rgba(120,95,50,${(r() * 0.07).toFixed(3)})`;
        ctx.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6);
      }
      ctx.strokeStyle = 'rgba(70,100,170,.2)'; ctx.lineWidth = 1;
      for (let y = 72; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(190,70,70,.28)'; ctx.beginPath(); ctx.moveTo(62.5, 0); ctx.lineTo(62.5, H); ctx.stroke();
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .72);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,60,20,.16)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (kind === 'leaf') {
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#2a5636'); bg.addColorStop(1, '#1e4129');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const x0 = W * .05, x1 = W * .95, cy = H * .5, hh = H * .46;
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.bezierCurveTo(W * .22, cy - hh * 1.05, W * .7, cy - hh * 1.1, x1, cy);
      ctx.bezierCurveTo(W * .7, cy + hh * 1.1, W * .22, cy + hh * 1.05, x0, cy);
      ctx.closePath();
      const lg = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
      lg.addColorStop(0, '#78bb72'); lg.addColorStop(.5, '#5aa25c'); lg.addColorStop(1, '#478b4e');
      ctx.fillStyle = lg; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,50,25,.55)'; ctx.stroke();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(226,245,200,.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(226,245,200,.38)';
      const n = Math.max(6, Math.round(W / 60));
      for (let i = 1; i < n; i++) {
        const x = lerp(x0, x1, i / n);
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, cy); ctx.quadraticCurveTo(x + 30, cy + s * hh * .45, x + 78, cy + s * hh * .9); ctx.stroke(); }
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#1d160f'; ctx.fillRect(0, 0, W, H);
      const y0 = H * .16, y1 = H * .84, rad = 16;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(6, y0, W - 12, y1 - y0, rad) : ctx.rect(6, y0, W - 12, y1 - y0);
      const pg = ctx.createLinearGradient(0, y0, 0, y1);
      pg.addColorStop(0, '#e2cb97'); pg.addColorStop(.5, '#d3b87c'); pg.addColorStop(1, '#c1a064');
      ctx.fillStyle = pg; ctx.fill();
      ctx.save(); ctx.clip();
      const r = rng(11);
      for (let i = 0; i < Math.max(40, Math.round((y1 - y0) / 3)); i++) {
        const y = y0 + r() * (y1 - y0);
        ctx.strokeStyle = r() > .5 ? 'rgba(110,80,30,.14)' : 'rgba(255,240,200,.14)';
        ctx.lineWidth = .6 + r() * 1.2; ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(W - 6, y + (r() - .5) * 3); ctx.stroke();
      }
      const sh = ctx.createLinearGradient(0, y0, 0, y1);
      sh.addColorStop(0, 'rgba(60,35,10,.3)'); sh.addColorStop(.12, 'rgba(60,35,10,0)'); sh.addColorStop(.88, 'rgba(60,35,10,0)'); sh.addColorStop(1, 'rgba(60,35,10,.3)');
      ctx.fillStyle = sh; ctx.fillRect(0, y0, W, y1 - y0);
      ctx.restore();
      for (const hx of [W * .12, W * .88]) {
        const cy = (y0 + y1) / 2;
        ctx.fillStyle = '#1d160f'; ctx.beginPath(); ctx.arc(hx, cy, 8, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(80,55,20,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, cy, 10.5, 0, 7); ctx.stroke();
      }
    }
  }

  /* ---------- stroke drawing ---------- */
  function drawStroke(ctx, s, wet) {
    const pts = s.pts, nib = NIBS[s.nib];
    if (!pts.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (nib.kind === 'stylus') {
      const k = s.rub || 0;
      const col = mix([88, 64, 34], [22, 14, 8], k);
      ctx.strokeStyle = rgba(col, lerp(.5, .96, k)); ctx.fillStyle = ctx.strokeStyle;
      const w = pts[0].w * lerp(1, 1.35, k);
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, w / 2, 0, 7); ctx.fill(); }
      else { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
      ctx.restore(); return;
    }
    const base = hex(s.color);
    const dark = mix(base, [0, 0, 0], .34 * wet);
    const alpha = lerp(.9, .98, wet);
    const body = rgba(dark, alpha);
    const sheen = rgba(mix(base, [255, 255, 255], .3), .3 * (1 - wet) + .08);
    if (nib.kind === 'edge') {
      const a = nib.angle * Math.PI / 180, half = pts[0].w / 2;
      const nx = Math.cos(a) * half, ny = -Math.sin(a) * half;
      ctx.fillStyle = body; ctx.strokeStyle = body; ctx.lineWidth = Math.max(.8, half * .22);
      if (pts.length === 1) {
        ctx.beginPath(); ctx.moveTo(pts[0].x + nx, pts[0].y + ny); ctx.lineTo(pts[0].x - nx, pts[0].y - ny); ctx.stroke();
      }
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i];
        ctx.beginPath(); ctx.moveTo(p.x + nx, p.y + ny); ctx.lineTo(q.x + nx, q.y + ny); ctx.lineTo(q.x - nx, q.y - ny); ctx.lineTo(p.x - nx, p.y - ny); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    } else {
      ctx.fillStyle = body; ctx.strokeStyle = body;
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, pts[0].w / 2, 0, 7); ctx.fill(); }
      for (let i = 1; i < pts.length; i++) {
        ctx.lineWidth = (pts[i - 1].w + pts[i].w) / 2;
        ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
      }
      /* lighter centre where the ink is thick: gives the "shading" look of a dry fountain-pen line */
      if (pts.length > 1) {
        ctx.strokeStyle = sheen;
        for (let i = 1; i < pts.length; i++) {
          ctx.lineWidth = Math.max(.6, (pts[i - 1].w + pts[i].w) / 2 * .45);
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* ---------- mount ---------- */
  function mount(host, opts) {
    opts = opts || {};
    const saved = store.get('write-settings', {}) || {};
    const S = {
      surface: SURFACES[saved.surface] ? saved.surface : 'paper',
      nib: NIBS[saved.nib] ? saved.nib : 'medium',
      color: /^#[0-9a-f]{6}$/i.test(saved.color || '') ? saved.color : INKS[0][1],
      size: clamp(+saved.size || 1, .6, 2.4),
    };
    host.innerHTML = `
      <div class="wp">
        <div class="wp-bar">
          <div class="wp-grp" role="radiogroup" aria-label="Surface"><span class="lbl">Surface</span>
            ${Object.keys(SURFACES).map((k) => `<button type="button" class="chip" role="radio" data-surface="${k}">${SURFACES[k].name}</button>`).join('')}
          </div>
          <div class="wp-grp" role="radiogroup" aria-label="Nib" id="wpNibs"><span class="lbl">Nib</span></div>
          <div class="wp-grp" role="radiogroup" aria-label="Ink colour" id="wpInks"><span class="lbl">Ink</span>
            ${INKS.map(([n, c]) => `<button type="button" class="wp-ink" role="radio" data-color="${c}" style="--c:${c}" aria-label="${n}" title="${n}"></button>`).join('')}
          </div>
          <div class="wp-grp"><span class="lbl">Size</span><input class="wp-size" id="wpSize" type="range" min="0.6" max="2.4" step="0.1" aria-label="Nib size"></div>
        </div>
        <div class="wp-stage" id="wpStage">
          <canvas aria-hidden="true"></canvas><canvas aria-hidden="true"></canvas>
          <canvas class="top" role="img" aria-label="Writing area. Draw with a finger, pen or mouse."></canvas>
        </div>
        <p class="wp-info" id="wpInfo"></p>
        <div class="wp-actions">
          <button type="button" class="btn" id="wpUndo">${ic('undo')}Undo</button>
          <button type="button" class="btn" id="wpClear">${ic('trash')}Clear</button>
          <button type="button" class="btn" id="wpRub" hidden>${ic('flask')}Rub soot</button>
          <button type="button" class="btn primary" id="wpSave">${ic('image')}Save as PNG</button>
        </div>
      </div>`;
    const stage = host.querySelector('#wpStage');
    const [cSurf, cDry, cWet] = stage.querySelectorAll('canvas');
    const xs = cSurf.getContext('2d'), xd = cDry.getContext('2d'), xw = cWet.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    const strokes = [];
    let wetList = [], cur = null, raf = 0, rubStart = 0, toRub = [], dead = false;

    function persist() { store.set('write-settings', { surface: S.surface, nib: S.nib, color: S.color, size: S.size }); }

    function syncUI() {
      host.querySelectorAll('[data-surface]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.surface === S.surface)));
      host.querySelectorAll('[data-surface]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.surface === S.surface)));
      const nibBox = host.querySelector('#wpNibs');
      const allowed = SURFACES[S.surface].nibs;
      nibBox.innerHTML = '<span class="lbl">Nib</span>' + allowed.map((k) => `<button type="button" class="chip" role="radio" data-nib="${k}" aria-checked="${k === S.nib}" aria-pressed="${k === S.nib}">${NIBS[k].name}</button>`).join('');
      host.querySelector('#wpInks').hidden = S.surface === 'palm';
      host.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.color === S.color)));
      host.querySelector('#wpSize').value = S.size;
      host.querySelector('#wpRub').hidden = S.surface !== 'palm';
      host.querySelector('#wpInfo').textContent = SURFACES[S.surface].info;
    }

    function rebuildDry() {
      xd.clearRect(0, 0, W, H);
      for (const s of strokes) if (!wetList.includes(s)) drawStroke(xd, s, 0);
    }
    function paintSurface() { drawSurface(xs, S.surface, W, H); }

    function resize() {
      const r = stage.getBoundingClientRect();
      const w = Math.max(200, Math.round(r.width)), h = Math.max(200, Math.round(r.height));
      if (w === W && h === H) return;
      W = w; H = h; DPR = Math.min(2, window.devicePixelRatio || 1);
      for (const [c, x] of [[cSurf, xs], [cDry, xd], [cWet, xw]]) {
        c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
        x.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      paintSurface(); rebuildDry();
    }

    /* ---- animation loop: only runs while ink is wet or soot is being rubbed ---- */
    function frame(now) {
      raf = 0;
      if (dead) return;
      xw.clearRect(0, 0, W, H);
      let again = false;
      if (wetList.length) {
        const keep = [];
        for (const s of wetList) {
          const w = s === cur ? 1 : 1 - (now - s.tEnd) / 2400;
          if (w <= 0) { drawStroke(xd, s, 0); }
          else { drawStroke(xw, s, w); keep.push(s); }
        }
        wetList = keep; again = keep.length > 0;
      }
      if (rubStart) {
        const t = clamp((now - rubStart) / 1700);
        for (const s of toRub) s.rub = clamp((t - .45) / .55);
        rebuildDry();
        const a = t < .45 ? lerp(0, .8, t / .45) : lerp(.8, 0, (t - .45) / .55);
        xw.fillStyle = `rgba(22,15,9,${a.toFixed(3)})`; xw.fillRect(0, 0, W, H);
        if (t >= 1) { for (const s of toRub) { s.rub = 1; s.rubbed = true; } toRub = []; rubStart = 0; rebuildDry(); xw.clearRect(0, 0, W, H); }
        else again = true;
      }
      if (again) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && !dead) raf = requestAnimationFrame(frame); }

    /* ---- pointer input ---- */
    function pos(ev) { const r = cWet.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
    function widthFor(nib, size, v, pr, prevW, pen) {
      const base = nib.w * size;
      if (nib.kind === 'flex') {
        const press = pen && pr > 0 ? pr : clamp(1 - v * .55, .12, 1);
        const target = base * (.55 + 1.9 * press);
        return prevW == null ? target : prevW * .7 + target * .3;
      }
      if (nib.kind === 'round') return base * (1.12 - clamp(v * .25, 0, .3));
      return base;
    }
    function addPoint(s, ev, first) {
      const p = pos(ev), nib = NIBS[s.nib], last = s.pts[s.pts.length - 1];
      if (first) { s.pts.push({ x: p.x, y: p.y, t: ev.timeStamp, w: widthFor(nib, S.size, 0, ev.pressure, null, ev.pointerType === 'pen') }); return; }
      const sx = lerp(last.x, p.x, .6), sy = lerp(last.y, p.y, .6);
      const d = Math.hypot(sx - last.x, sy - last.y);
      if (d < 1.1) return;
      const v = d / Math.max(1, ev.timeStamp - last.t);
      s.pts.push({ x: sx, y: sy, t: ev.timeStamp, w: widthFor(nib, S.size, v, ev.pressure, last.w, ev.pointerType === 'pen') });
    }
    function down(ev) {
      if (ev.button > 0 && ev.pointerType === 'mouse') return;
      ev.preventDefault();
      try { cWet.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      const nib = NIBS[S.nib];
      cur = { pts: [], nib: S.nib, color: S.color, surface: S.surface, tEnd: 0, rub: 0, rubbed: false };
      addPoint(cur, ev, true);
      strokes.push(cur);
      if (nib.kind === 'stylus') { drawStroke(xd, cur, 0); } else { wetList.push(cur); kick(); }
    }
    function move(ev) {
      if (!cur) return;
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : null;
      for (const e of (evs && evs.length ? evs : [ev])) addPoint(cur, e, false);
      if (NIBS[cur.nib].kind === 'stylus') { rebuildDry(); } else kick();
    }
    function up(ev) {
      if (!cur) return;
      const s = cur; cur = null;
      s.tEnd = performance.now();
      if (NIBS[s.nib].kind === 'stylus') { rebuildDry(); return; }
      if (reduceMotion()) { wetList = wetList.filter((x) => x !== s); xw.clearRect(0, 0, W, H); drawStroke(xd, s, 0); }
      else kick();
    }
    cWet.addEventListener('pointerdown', down);
    cWet.addEventListener('pointermove', move);
    cWet.addEventListener('pointerup', up);
    cWet.addEventListener('pointercancel', up);
    cWet.addEventListener('contextmenu', (e) => e.preventDefault());

    /* ---- controls ---- */
    host.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.dataset.surface) {
        const next = b.dataset.surface;
        if (next === S.surface) return;
        const palmChange = (next === 'palm') !== (S.surface === 'palm');
        if (palmChange && strokes.length) { strokes.length = 0; wetList = []; toRub = []; rubStart = 0; xw.clearRect(0, 0, W, H); if (opts.toast) opts.toast('Pad cleared for the new surface'); }
        S.surface = next;
        if (!SURFACES[next].nibs.includes(S.nib)) S.nib = SURFACES[next].nibs[next === 'palm' ? 0 : 1] || SURFACES[next].nibs[0];
        if (next === 'leaf' && S.color === INKS[0][1]) { /* keep */ }
        persist(); syncUI(); paintSurface(); rebuildDry();
      } else if (b.dataset.nib) { S.nib = b.dataset.nib; persist(); syncUI(); }
      else if (b.dataset.color) { S.color = b.dataset.color; persist(); syncUI(); }
      else if (b.id === 'wpUndo') {
        const s = strokes.pop(); if (!s) return;
        wetList = wetList.filter((x) => x !== s); toRub = toRub.filter((x) => x !== s);
        xw.clearRect(0, 0, W, H); rebuildDry(); kick();
      } else if (b.id === 'wpClear') {
        strokes.length = 0; wetList = []; toRub = []; rubStart = 0; cur = null; xw.clearRect(0, 0, W, H); rebuildDry();
      } else if (b.id === 'wpRub') {
        const todo = strokes.filter((s) => s.surface === 'palm' && !s.rubbed);
        if (!todo.length) { if (opts.toast) opts.toast('Scratch some letters first, then rub soot.'); return; }
        if (reduceMotion()) { todo.forEach((s) => { s.rub = 1; s.rubbed = true; }); rebuildDry(); return; }
        toRub = todo; rubStart = performance.now(); kick();
      } else if (b.id === 'wpSave') { save(); }
    });
    host.querySelector('#wpSize').addEventListener('input', (e) => { S.size = +e.target.value; persist(); });

    function save() {
      const out = document.createElement('canvas');
      out.width = cSurf.width; out.height = cSurf.height;
      const o = out.getContext('2d');
      o.drawImage(cSurf, 0, 0); o.drawImage(cDry, 0, 0); o.drawImage(cWet, 0, 0);
      out.toBlob((blob) => {
        if (!blob) { if (opts.toast) opts.toast('Could not save the image.'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'inkora.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        if (opts.toast) opts.toast('Saved inkora.png');
      }, 'image/png');
    }

    let ro = null;
    if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(stage); }
    window.addEventListener('resize', resize);
    syncUI(); resize();

    return {
      /* exposed for tests */
      get strokeCount() { return strokes.length; },
      destroy() {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', resize);
        host.innerHTML = '';
      },
    };
  }

  window.ILWrite = { mount, SURFACES, NIBS };
})();
