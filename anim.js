/* Inkora: animated explanations.
   window.ILAnim = { list, has, title, create(host, key, opts) }
   Each scene is plain data plus two functions:
     init     numeric starting state
     steps    [{ c: caption, d: ms, to: { key: value } }]  (keys are interpolated, eased, step by step)
     build(svg) -> refs     draw the static SVG parts
     draw(refs, S)          map the numeric state S to attributes
   The player handles play, pause, step, speed, captions, reduced motion,
   and pauses itself when off screen or when the tab is hidden. */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const $e = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ic = (n) => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  let uid = 0;

  /* ---------- shared drawing pieces ---------- */
  const BOTTLE = 'M140 300 H220 V328 C262 328 290 336 290 356 V405 Q290 425 270 425 H90 Q70 425 70 405 V356 C70 336 98 328 140 328 Z';
  const NIB = 'M170 248 L190 248 L184 276 L180 281 L176 276 Z';

  function base(svg) {
    const r = {};
    svg.setAttribute('viewBox', '0 -60 360 500');
    const bt = $e('g', {}, svg);
    $e('path', { d: BOTTLE, class: 'glass' }, bt);
    r.bInk = $e('rect', { x: 74, y: 366, width: 212, height: 55, rx: 14, class: 'ink-fill' }, bt);
    r.G = $e('g', {}, svg);
    r.barG = $e('g', {}, r.G);
    r.barrel = $e('rect', { x: 150, y: 40, width: 60, height: 176, rx: 12, class: 'barrel' }, r.barG);
    r.inner = $e('g', {}, r.barG);
    r.nibG = $e('g', {}, r.G);
    $e('path', { d: NIB, class: 'gold' }, r.nibG);
    $e('line', { x1: 180, y1: 262, x2: 180, y2: 280, class: 'slit' }, r.nibG);
    $e('circle', { cx: 180, cy: 259, r: 2, class: 'hole' }, r.nibG);
    r.drop = $e('circle', { cx: 180, cy: 285, r: 3.2, class: 'ink-fill', opacity: 0 }, r.nibG);
    r.sec = $e('g', {}, r.G);
    $e('path', { d: 'M154 216 H206 L192 252 H168 Z', class: 'section' }, r.sec);
    r.top = $e('g', {}, r.G);
    r.lbl = $e('g', {}, r.G);
    return r;
  }

  function label(r, text, px, py, tx, ty, anchor) {
    $e('line', { x1: px, y1: py, x2: tx, y2: ty, class: 'lbl-line' }, r.lbl);
    const t = $e('text', { x: tx + (anchor === 'end' ? -5 : 5), y: ty + 4, 'text-anchor': anchor || 'start', class: 'lbl' }, r.lbl);
    t.textContent = text;
  }

  function common(r, S) {
    r.G.setAttribute('transform', `translate(0 ${(S.dy || 0).toFixed(2)})`);
    const bl = S.bl || 0;
    r.bInk.setAttribute('y', 366 + bl * 7);
    r.bInk.setAttribute('height', 55 - bl * 7);
    const o = clamp(((S.ink || 0) - 0.85) / 0.15) * clamp(1 - (S.dy || 0) / 24);
    r.drop.setAttribute('opacity', o.toFixed(2));
  }

  const setT = (e, t) => e.setAttribute('transform', t);

  /* ---------- sac family: lever, button, crescent, aerometric, vacuum, snorkel ---------- */
  function sacScene(kind, title, capsPress, extra) {
    const snorkel = kind === 'snorkel';
    const dipTo = snorkel ? 72 : 112;
    const steps = snorkel
      ? [
          { c: 'Turn the knob to slide a thin tube out of the nib unit. The nib pulls back out of the way.', to: { tube: 1 } },
          { c: 'Lower the pen until only the tube dips into the ink. The nib stays clean and dry.', to: { dy: dipTo } },
          { c: 'Press the plunger. This squeezes the air in the barrel out through the tube.', to: { press: 1 } },
          { c: 'Release it. The diaphragm springs back and ink is pulled up the tube into the barrel.', to: { press: 0, ink: 1, bl: 1 } },
          { c: 'Lift the pen out of the bottle.', to: { dy: 0 } },
          { c: 'Retract the tube. The nib comes back and the pen is full and ready to write.', to: { tube: 0 } },
        ]
      : [
          { c: capsPress[0], to: { press: 1 } },
          { c: 'Lower the nib into the ink so the opening is under the surface.', to: { dy: dipTo } },
          { c: capsPress[1], to: { press: 0, ink: 1, bl: 1 } },
          { c: 'Lift the pen out and wipe the nib. The sac now holds ink and feeds the nib as you write.', to: { dy: 0 } },
        ];
    return {
      title,
      init: { dy: 0, press: 0, ink: 0, bl: 0, tube: 0 },
      steps,
      build(svg) {
        const r = base(svg);
        r.sacG = $e('g', {}, r.inner);
        r.sacInk = $e('rect', { x: 164, y: 108, width: 32, height: 100, rx: 16, class: 'ink-fill', opacity: 0 }, r.sacG);
        r.sac = $e('rect', { x: 164, y: 108, width: 32, height: 100, rx: 16, class: 'sac' }, r.sacG);
        if (kind === 'lever' || kind === 'button' || kind === 'crescent') {
          r.bar = $e('rect', { x: 198, y: 112, width: 5, height: 92, rx: 2, class: 'metal' }, r.inner);
        }
        if (kind === 'lever') {
          r.lev = $e('g', {}, r.top);
          $e('rect', { x: 210, y: 114, width: 7, height: 58, rx: 3, class: 'metal' }, r.lev);
          $e('circle', { cx: 213.5, cy: 117, r: 3.4, class: 'metal' }, r.top);
          label(r, 'lever', 217, 160, 238, 190);
          label(r, 'pressure bar', 202, 130, 238, 120);
          label(r, 'rubber sac', 168, 150, 120, 150, 'end');
        } else if (kind === 'button') {
          r.btn = $e('rect', { x: 166, y: 22, width: 28, height: 20, rx: 5, class: 'metal' }, r.top);
          label(r, 'button', 194, 30, 238, 24);
          label(r, 'pressure bar', 202, 130, 238, 120);
          label(r, 'rubber sac', 168, 150, 120, 150, 'end');
        } else if (kind === 'crescent') {
          r.cres = $e('path', { d: 'M147 112 Q131 143 147 174', class: 'metal-line', 'stroke-width': 7 }, r.top);
          label(r, 'crescent ring', 138, 143, 120, 100, 'end');
          label(r, 'pressure bar', 202, 130, 238, 120);
          label(r, 'rubber sac', 180, 190, 238, 200);
        } else if (kind === 'aerometric') {
          r.sleeve = $e('rect', { x: 158, y: 100, width: 44, height: 116, rx: 18, fill: 'none', class: 'metal-line', 'stroke-width': 4 }, r.top);
          r.aL = $e('g', { opacity: 0 }, r.top);
          $e('path', { d: 'M126 158 H146 M139 151 L146 158 L139 165', class: 'arrow' }, r.aL);
          r.aR = $e('g', { opacity: 0 }, r.top);
          $e('path', { d: 'M234 158 H214 M221 151 L214 158 L221 165', class: 'arrow' }, r.aR);
          label(r, 'metal sleeve', 160, 108, 110, 84, 'end');
          label(r, 'sac', 180, 190, 238, 214);
        } else {
          r.rod = $e('g', {}, r.top);
          $e('rect', { x: 176, y: 8, width: 8, height: 78, rx: 3, class: 'metal' }, r.rod);
          $e('rect', { x: 164, y: 0, width: 32, height: 9, rx: 4, class: 'metal' }, r.rod);
          label(r, snorkel ? 'plunger' : 'plunger rod', 196, 5, 238, 0);
          label(r, snorkel ? 'diaphragm' : 'diaphragm', 168, 150, 120, 150, 'end');
          if (snorkel) {
            r.tube = $e('rect', { x: 178.8, y: 250, width: 2.4, height: 0, class: 'metal' }, r.top);
            label(r, 'snorkel tube', 181, 285, 238, 300);
          }
        }
        return r;
      },
      draw(r, S) {
        common(r, S);
        const sx = 1 - 0.62 * S.press;
        setT(r.sacG, `translate(180 0) scale(${sx.toFixed(3)} 1) translate(-180 0)`);
        r.sacInk.setAttribute('opacity', clamp(S.ink).toFixed(2));
        if (r.bar) r.bar.setAttribute('x', (198 - 12 * S.press).toFixed(2));
        if (r.lev) setT(r.lev, `rotate(${(-40 * S.press).toFixed(2)} 213.5 117)`);
        if (r.btn) setT(r.btn, `translate(0 ${(14 * S.press).toFixed(2)})`);
        if (r.cres) setT(r.cres, `translate(${(7 * S.press).toFixed(2)} 0)`);
        if (r.aL) {
          const o = clamp(S.press * 2);
          r.aL.setAttribute('opacity', o); r.aR.setAttribute('opacity', o);
          setT(r.aL, `translate(${(8 * S.press).toFixed(2)} 0)`);
          setT(r.aR, `translate(${(-8 * S.press).toFixed(2)} 0)`);
        }
        if (r.rod) setT(r.rod, `translate(0 ${(16 * S.press).toFixed(2)})`);
        if (r.tube) {
          r.tube.setAttribute('height', (70 * S.tube).toFixed(2));
          setT(r.nibG, `translate(0 ${(-30 * S.tube).toFixed(2)})`);
        }
      },
    };
  }

  /* ---------- piston and plunger ---------- */
  function pistonScene(kind) {
    const plunger = kind === 'plunger';
    const travel = plunger ? 70 : 140;
    return {
      title: plunger ? 'Plunger filler' : 'Piston filler',
      init: { dy: 0, pis: plunger ? 0.5 : 0.35, ink: 0, bl: 0 },
      steps: plunger
        ? [
            { c: 'Push the plunger rod all the way in. The seal on its end pushes the air out of the barrel.', to: { pis: 0 } },
            { c: 'Lower the nib into the ink.', to: { dy: 112 } },
            { c: 'Pull the plunger out. Like a syringe, it draws ink in behind the seal.', to: { pis: 1, ink: 1, bl: 1 } },
            { c: 'Lift the pen out and screw the plunger knob down to seal the barrel.', to: { dy: 0 } },
          ]
        : [
            { c: 'Turn the knob so the piston runs down to the nib end of the barrel, pushing any air out.', to: { pis: 0 } },
            { c: 'Lower the nib into the ink.', to: { dy: 112 } },
            { c: 'Turn the knob the other way. The piston rises, and the vacuum behind it pulls ink up through the nib and feed.', to: { pis: 1, ink: 1, bl: 1 } },
            { c: 'Lift the pen out. The barrel is full of ink, and a clear barrel lets you see the level.', to: { dy: 0 } },
          ],
      build(svg) {
        const r = base(svg);
        r.air = $e('rect', { x: 156, y: 205, width: 48, height: 0, class: 'air' }, r.inner);
        r.chInk = $e('rect', { x: 156, y: 205, width: 48, height: 0, class: 'ink-fill', opacity: 0 }, r.inner);
        r.pis = $e('rect', { x: 155, y: 200, width: 50, height: 9, rx: 3, class: 'metal' }, r.inner);
        if (plunger) {
          r.rod = $e('rect', { x: 177, y: 40, width: 6, height: 165, rx: 2, class: 'metal' }, r.top);
          r.knob = $e('rect', { x: 160, y: 26, width: 40, height: 14, rx: 5, class: 'metal' }, r.top);
          label(r, 'plunger rod', 183, 90, 238, 80);
          label(r, 'seal / piston', 205, 205, 238, 232);
        } else {
          r.knob = $e('rect', { x: 158, y: 22, width: 44, height: 20, rx: 7, class: 'metal' }, r.top);
          r.ticks = $e('g', {}, r.top);
          for (let k = 0; k < 6; k++) $e('line', { x1: 0, y1: 25, x2: 0, y2: 39, stroke: 'var(--metal-2)', 'stroke-width': 1.6 }, r.ticks);
          label(r, 'turning knob', 202, 32, 238, 24);
          label(r, 'piston', 205, 190, 238, 190);
        }
        label(r, 'ink chamber', 154, 150, 118, 150, 'end');
        return r;
      },
      draw(r, S) {
        common(r, S);
        const pY = 205 - travel * S.pis;
        r.pis.setAttribute('y', pY.toFixed(2));
        const top = pY + 9, h = Math.max(0, 213 - top);
        r.air.setAttribute('y', top.toFixed(2)); r.air.setAttribute('height', h.toFixed(2));
        r.chInk.setAttribute('y', top.toFixed(2)); r.chInk.setAttribute('height', h.toFixed(2));
        r.chInk.setAttribute('opacity', clamp(S.ink).toFixed(2));
        if (plunger) {
          r.rod.setAttribute('y', (pY - 165).toFixed(2));
          r.knob.setAttribute('y', (pY - 165 - 14).toFixed(2));
        } else {
          const off = (S.pis * 140) % 6;
          [...r.ticks.children].forEach((ln, k) => setT(ln, `translate(${(163 + off + k * 6.4).toFixed(2)} 0)`));
        }
      },
    };
  }

  /* ---------- scenes ---------- */
  const SCENES = {};

  SCENES.lever = sacScene('lever', 'Lever filler', [
    'Lift the lever on the side of the barrel. It pushes a pressure bar against the rubber sac and squeezes the air out.',
    'Press the lever back down. The sac springs open and the suction it creates pulls ink up through the nib.',
  ]);
  SCENES.button = sacScene('button', 'Button filler', [
    'Press the button at the end of the barrel. It drives a pressure bar against the rubber sac and flattens it.',
    'Let the button go. The sac springs back to shape and draws ink in through the nib.',
  ]);
  SCENES.crescent = sacScene('crescent', 'Crescent filler', [
    'Press the crescent ring on the barrel inwards. It pushes a bar against the rubber sac and squeezes it flat.',
    'Release the ring. The sac recovers its shape and pulls ink into the pen.',
  ]);
  SCENES.aerometric = sacScene('aerometric', 'Aerometric filler', [
    'Squeeze the metal sleeve. This flattens the flexible sac inside it and pushes the air out.',
    'Let go of the sleeve. The sac springs open and draws ink up through the nib.',
  ]);
  SCENES.vacuum = sacScene('vacuum', 'Vacuum filler', [
    'Press the plunger at the end of the pen. It flexes the diaphragm inside the barrel and pushes air out.',
    'Release the plunger. The diaphragm springs back, and the vacuum it makes draws ink in.',
  ]);
  SCENES.snorkel = sacScene('snorkel', 'Snorkel filler', []);
  SCENES.piston = pistonScene('piston');
  SCENES.plunger = pistonScene('plunger');

  /* Capillary filler */
  SCENES.capillary = {
    title: 'Capillary filler',
    init: { dy: 0, ink: 0, bl: 0 },
    steps: [
      { c: 'Dip the nib into the ink. There is no lever, button or knob to work.', to: { dy: 112 } },
      { c: 'Narrow channels in the filler pull the ink upwards by capillary action, the same force that lifts water in a thin tube. Wait a few seconds.', to: { ink: 1, bl: 0.7 }, d: 4200 },
      { c: 'Lift the pen out. The filler holds the ink and releases it to the nib as you write.', to: { dy: 0 } },
    ],
    build(svg) {
      const r = base(svg);
      r.cInk = $e('rect', { x: 158, y: 212, width: 44, height: 0, class: 'ink-fill', opacity: 0.85 }, r.inner);
      for (let k = 0; k < 8; k++) $e('line', { x1: 160 + k * 5.7, y1: 112, x2: 160 + k * 5.7, y2: 212, class: 'fin' }, r.inner);
      label(r, 'narrow channels', 160, 130, 118, 120, 'end');
      label(r, 'ink rises', 200, 170, 238, 170);
      return r;
    },
    draw(r, S) {
      common(r, S);
      const h = 100 * S.ink;
      r.cInk.setAttribute('y', (212 - h).toFixed(2));
      r.cInk.setAttribute('height', h.toFixed(2));
    },
  };

  /* Cartridge and converter */
  SCENES.cartridge = {
    title: 'Cartridge and converter',
    init: { dy: 0, sep: 0, cart: 0, ink: 0, bl: 0 },
    steps: [
      { c: 'Unscrew the barrel and set it aside to reach the nib section.', to: { sep: 1 } },
      { c: 'Push a fresh cartridge onto the pin in the section. The pin pierces the seal and opens the way for the ink.', to: { cart: 1 } },
      { c: 'Screw the barrel back on, covering the cartridge.', to: { sep: 0 } },
      { c: 'Ink flows from the cartridge, down the feed to the nib. A converter does the same job but lets you fill from a bottle.', to: { ink: 1 }, d: 4200 },
    ],
    build(svg) {
      const r = base(svg);
      r.cart = $e('g', {}, r.G);
      $e('rect', { x: 170, y: 150, width: 20, height: 62, rx: 3, class: 'ink-fill' }, r.cart);
      $e('rect', { x: 167, y: 146, width: 26, height: 70, rx: 5, class: 'cart' }, r.cart);
      $e('rect', { x: 178, y: 208, width: 4, height: 12, class: 'metal' }, r.sec);
      r.feed = $e('path', { d: 'M180 218 V280', class: 'ink-line', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, r.top);
      label(r, 'ink cartridge', 193, 170, 238, 170);
      label(r, 'pin', 182, 212, 238, 226);
      label(r, 'feed', 181, 262, 238, 270);
      return r;
    },
    draw(r, S) {
      common(r, S);
      setT(r.barG, `translate(0 ${(-110 * S.sep).toFixed(2)})`);
      const e = 1 - S.cart;
      setT(r.cart, `translate(${(110 * e).toFixed(2)} ${(-40 * e).toFixed(2)})`);
      r.feed.setAttribute('stroke-dashoffset', (1 - S.ink).toFixed(3));
    },
  };

  /* Eyedropper */
  SCENES.eyedropper = {
    title: 'Eyedropper filler',
    init: { dy: 0, ink: 0, bl: 0, sep: 0, rot: 0, dpose: 0, sq: 0 },
    steps: [
      { c: 'Unscrew the nib section from the barrel and put it aside.', to: { sep: 1 } },
      { c: 'Turn the barrel so its open end faces up. The barrel itself will be the ink tank.', to: { rot: 1 } },
      { c: 'Squeeze the bulb of a glass dropper and draw ink up from the bottle.', to: { dpose: 1, bl: 1 } },
      { c: 'Carry the full dropper over the open barrel.', to: { dpose: 2 } },
      { c: 'Squeeze the bulb to empty the ink into the barrel.', to: { sq: 1 } },
      { c: 'Put the dropper away and turn the barrel upright again. The ink runs down to the open end.', to: { dpose: 3, rot: 0 } },
      { c: 'Screw the nib section back on, sealing the threads well.', to: { sep: 0 } },
      { c: 'Ink flows down the feed to the nib and the pen is ready. An eyedropper pen holds a lot of ink.', to: { ink: 1 }, d: 3600 },
    ],
    build(svg) {
      const r = base(svg);
      r.inkBar = $e('rect', { x: 156, y: 44, width: 48, height: 0, class: 'ink-fill' }, r.inner);
      r.dr = $e('g', {}, svg);
      r.dTube = $e('rect', { x: -3.5, y: 0, width: 7, height: 62, rx: 2, class: 'dropper' }, r.dr);
      r.dInk = $e('rect', { x: -2.2, y: 62, width: 4.4, height: 0, class: 'ink-fill' }, r.dr);
      r.bulb = $e('ellipse', { cx: 0, cy: -14, rx: 9, ry: 15, class: 'dropper' }, r.dr);
      label(r, 'glass dropper', 0, -20, 0, -40);
      return r;
    },
    draw(r, S) {
      common(r, S);
      const e = (v) => ease(clamp(v));
      /* barrel: turn it upside down, move it aside */
      setT(r.barG, `translate(${(-100 * S.rot).toFixed(2)} 0) rotate(${(180 * S.rot).toFixed(2)} 180 128)`);
      /* section and nib come off together */
      const st = `translate(${(112 * S.sep).toFixed(2)} ${(-34 * S.sep).toFixed(2)})`;
      setT(r.sec, st); setT(r.nibG, st);
      /* ink in the barrel: sits at the closed end while upside down, at the open end when upright */
      const h = 170 * 0.72 * S.sq;
      r.inkBar.setAttribute('height', h.toFixed(2));
      r.inkBar.setAttribute('y', lerp(212 - h, 44, S.rot).toFixed(2));
      /* dropper position along its path */
      const rest = [300, 70], bottle = [180, 332], barrel = [80, 8];
      let x, y;
      const d = S.dpose;
      if (d <= 1) { x = lerp(rest[0], bottle[0], e(d)); y = lerp(rest[1], bottle[1], e(d)); }
      else if (d <= 2) {
        const t = d - 1;
        if (t < 0.5) { x = bottle[0]; y = lerp(bottle[1], 100, e(t * 2)); }
        else { x = lerp(bottle[0], barrel[0], e((t - 0.5) * 2)); y = lerp(100, barrel[1], e((t - 0.5) * 2)); }
      } else {
        const t = d - 2;
        if (t < 0.5) { x = barrel[0]; y = lerp(barrel[1], -30, e(t * 2)); }
        else { x = lerp(barrel[0], rest[0], e((t - 0.5) * 2)); y = lerp(-30, rest[1], e((t - 0.5) * 2)); }
      }
      setT(r.dr, `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      const fill = d < 2 ? clamp((d - 0.65) / 0.35) : 1 - S.sq;
      r.dInk.setAttribute('height', (62 * fill).toFixed(2));
      r.dInk.setAttribute('y', (62 - 62 * fill).toFixed(2));
      r.bulb.setAttribute('ry', (15 * (1 - 0.3 * S.sq)).toFixed(2));
    },
  };

  /* How a pen writes (nib, feed, air) */
  SCENES.anatomy = {
    title: 'How a fountain pen writes',
    init: { touch: 0, flow: 0, air: 0, gap: 0, line: 0 },
    steps: [
      { c: 'The ink sits in a reservoir. Under the gold nib is the feed, a plastic or ebonite part with a narrow ink channel and fins that act as a valve.', to: {} },
      { c: 'Bring the nib to the paper. The paper pulls ink out of the slit by capillary action, the same force that makes a paper towel soak up water.', to: { touch: 1, flow: 0.5 } },
      { c: 'More ink slides along the feed. As ink leaves, air bubbles up through the feed to take its place. Without this, a vacuum would stop the flow.', to: { flow: 1, air: 1 }, d: 4200 },
      { c: 'Write. Pressing harder opens the two halves of the nib (the tines) and widens the line.', to: { line: 1, gap: 1 }, d: 4200 },
      { c: 'Lift the pen. When the nib leaves the paper, the ink stops at the tip and the flow settles.', to: { touch: 0, gap: 0, air: 0 } },
    ],
    build(svg) {
      const r = {};
      svg.setAttribute('viewBox', '0 -60 360 500');
      $e('rect', { x: 14, y: 381, width: 332, height: 56, rx: 8, class: 'paper-s' }, svg);
      r.trace = $e('rect', { x: 80, y: 383, width: 0, height: 5, rx: 2.5, class: 'ink-fill' }, svg);
      r.N = $e('g', {}, svg);
      /* reservoir */
      $e('rect', { x: 146, y: -40, width: 68, height: 108, rx: 12, class: 'barrel' }, r.N);
      $e('rect', { x: 152, y: -24, width: 56, height: 86, rx: 8, class: 'ink-fill', opacity: 0.88 }, r.N);
      /* feed with fins */
      $e('path', { d: 'M148 56 L212 56 L190 302 L170 302 Z', class: 'feedp' }, r.N);
      for (let k = 0; k < 6; k++) {
        const y = 110 + k * 30, half = lerp(30, 12, (y - 56) / 246);
        $e('line', { x1: 180 - half + 3, y1: y, x2: 180 + half - 3, y2: y, class: 'feed-fin' }, r.N);
      }
      r.chan = $e('path', { d: 'M180 20 V332', class: 'ink-line', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, r.N);
      /* nib on top of the feed */
      $e('path', { d: 'M132 74 L228 74 L192 308 L180 340 L168 308 Z', class: 'gold' }, r.N);
      r.slit = $e('line', { x1: 180, y1: 150, x2: 180, y2: 340, stroke: 'var(--surface-solid)', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, r.N);
      $e('circle', { cx: 180, cy: 146, r: 5.5, fill: 'var(--surface-solid)' }, r.N);
      r.bead = $e('circle', { cx: 180, cy: 344, r: 0, class: 'ink-fill' }, r.N);
      r.bub = [0, 1, 2].map(() => $e('circle', { cx: 190, cy: 300, r: 0, class: 'bubble' }, r.N));
      /* labels */
      label({ lbl: r.N }, 'ink reservoir', 146, 10, 112, -6, 'end');
      label({ lbl: r.N }, 'feed', 156, 230, 112, 232, 'end');
      label({ lbl: r.N }, 'gold nib', 214, 120, 246, 112);
      label({ lbl: r.N }, 'slit', 181, 250, 246, 250);
      label({ lbl: r.N }, 'air bubbles', 192, 200, 246, 196);
      r.paperLbl = $e('text', { x: 24, y: 428, class: 'hint' }, svg); r.paperLbl.textContent = 'paper';
      return r;
    },
    draw(r, S) {
      const dx = -100 + 200 * S.line;
      setT(r.N, `translate(${dx.toFixed(2)} ${(40 * S.touch).toFixed(2)})`);
      r.chan.setAttribute('stroke-dashoffset', (1 - S.flow).toFixed(3));
      r.slit.setAttribute('stroke-width', (1.5 + 3.5 * S.gap).toFixed(2));
      r.bead.setAttribute('r', (4.5 * clamp(S.flow * 2) * S.touch).toFixed(2));
      r.trace.setAttribute('width', (200 * S.line).toFixed(2));
      r.bub.forEach((b, k) => {
        const t = (S.air * 2 + k / 3) % 1;
        const on = S.air > 0.01 ? 1 : 0;
        b.setAttribute('cy', (300 - 230 * t).toFixed(2));
        b.setAttribute('cx', (186 + Math.sin(t * 9 + k) * 3).toFixed(2));
        b.setAttribute('r', (on * (2.4 + 1.6 * Math.sin(t * Math.PI))).toFixed(2));
      });
    },
  };

  const TITLES = {
    anatomy: ['How a pen writes', 'Nib, feed, capillary action and air'],
    eyedropper: ['Eyedropper filler', 'The barrel is the tank'],
    crescent: ['Crescent filler', 'Press a ring on the barrel'],
    lever: ['Lever filler', 'Lift and lower a side lever'],
    button: ['Button filler', 'Press a button at the end'],
    plunger: ['Plunger filler', 'Push and pull a rod, like a syringe'],
    vacuum: ['Vacuum filler', 'A diaphragm makes the suction'],
    piston: ['Piston filler', 'Turn a knob to move a piston'],
    snorkel: ['Snorkel filler', 'A tiny tube dips in the ink'],
    aerometric: ['Aerometric filler', 'Squeeze a metal sleeve'],
    capillary: ['Capillary filler', 'Just dip and wait'],
    cartridge: ['Cartridge and converter', 'Push in a sealed tube of ink'],
  };

  /* ---------- state at (step, progress) ---------- */
  function stateAt(sc, i, p) {
    const prev = Object.assign({}, sc.init);
    for (let k = 0; k < i; k++) Object.assign(prev, sc.steps[k].to);
    const to = Object.assign({}, prev, sc.steps[i].to);
    const e = ease(clamp(p));
    const S = {};
    for (const k in to) S[k] = lerp(prev[k], to[k], e);
    return S;
  }

  /* ---------- player ---------- */
  function create(host, key, opts) {
    opts = opts || {};
    const sc = SCENES[key];
    if (!sc) { host.textContent = 'This animation is not available.'; return null; }
    const n = sc.steps.length;
    host.innerHTML = `
      <div class="player">
        <div class="stage"><svg role="img" aria-label="${esc(sc.title)} animation" focusable="false"></svg></div>
        <div class="pl-side">
          <div class="pl-controls" role="group" aria-label="Animation controls">
            <button class="pl-btn" type="button" data-a="prev" aria-label="Previous step">${ic('prev')}</button>
            <button class="pl-btn main" type="button" data-a="play" aria-pressed="false">${ic('play')}<span>Play</span></button>
            <button class="pl-btn" type="button" data-a="next" aria-label="Next step">${ic('next')}</button>
            <button class="pl-btn" type="button" data-a="restart" aria-label="Restart">${ic('restart')}</button>
            <button class="pl-btn pl-speed" type="button" data-a="speed" aria-label="Playback speed: 1 times">1×</button>
          </div>
          <div class="pl-prog" aria-hidden="true"><i></i></div>
          <p class="pl-cap" aria-live="polite"></p>
          <ol class="pl-steps">${sc.steps.map((s, k) => `<li><button type="button" data-s="${k}">${esc(s.c)}</button></li>`).join('')}</ol>
        </div>
      </div>`;
    const svg = host.querySelector('svg');
    const refs = sc.build(svg);
    const q = (s) => host.querySelector(s);
    const playBtn = q('[data-a="play"]'), speedBtn = q('[data-a="speed"]'), prog = q('.pl-prog i'), cap = q('.pl-cap');
    const stepBtns = [...host.querySelectorAll('[data-s]')];
    const SPEEDS = [1, 0.5, 2];
    let si = 0, speedIdx = 0, i = 0, p = 0, playing = false, want = false, raf = 0, last = 0, hold = 0, visible = true, dead = false;

    const dur = (k) => sc.steps[k].d || 3000;
    function render() {
      sc.draw(refs, stateAt(sc, i, p));
      stepBtns.forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      const text = sc.steps[i].c;
      if (cap.textContent !== text) cap.textContent = text;
      prog.style.width = (((i + clamp(p)) / n) * 100).toFixed(1) + '%';
    }
    function ui() {
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.innerHTML = ic(playing ? 'pause' : 'play') + '<span>' + (playing ? 'Pause' : 'Play') + '</span>';
      q('[data-a="prev"]').disabled = i === 0 && p <= 0.01;
      q('[data-a="next"]').disabled = i === n - 1 && p >= 0.99;
    }
    function tick(ts) {
      raf = 0;
      if (!playing || dead || !visible) return;
      const dt = Math.min(64, ts - last); last = ts;
      const sp = SPEEDS[speedIdx];
      if (hold > 0) {
        hold -= dt * sp;
      } else {
        p += (dt * sp) / dur(i);
        if (p >= 1) {
          p = 1;
          if (i < n - 1) { i++; p = 0; hold = 250; }
          else if (i === n - 1) { hold = 1800; si = 1; }
        }
      }
      if (si === 1 && hold <= 0) { si = 0; i = 0; p = 0; hold = 500; }
      render();
      raf = requestAnimationFrame(tick);
    }
    function loop() { if (!raf && playing && visible && !dead) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function play() { if (dead) return; if (i === n - 1 && p >= 1) { i = 0; p = 0; } playing = true; want = true; si = 0; ui(); loop(); }
    function pause() { playing = false; want = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } ui(); }
    function seek(k) { i = clamp(k, 0, n - 1); p = 1; hold = 0; si = 0; render(); ui(); }
    function stepBy(d) {
      pause();
      if (d > 0) { if (p < 0.99) p = 1; else if (i < n - 1) { i++; p = 1; } }
      else { if (p > 0.01 && i >= 0 && p < 0.99) p = 0; else if (i > 0) { i--; p = 1; } else p = 0; }
      render(); ui();
    }

    host.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.dataset.s != null) { pause(); seek(+b.dataset.s); return; }
      const a = b.dataset.a;
      if (a === 'play') (playing ? pause : play)();
      else if (a === 'next') stepBy(1);
      else if (a === 'prev') stepBy(-1);
      else if (a === 'restart') { i = 0; p = 0; hold = 0; si = 0; render(); if (playing) loop(); else play(); }
      else if (a === 'speed') {
        speedIdx = (speedIdx + 1) % SPEEDS.length;
        const t = SPEEDS[speedIdx] + '×';
        speedBtn.textContent = t; speedBtn.setAttribute('aria-label', 'Playback speed: ' + SPEEDS[speedIdx] + ' times');
      }
    });

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => {
        visible = es[es.length - 1].isIntersecting;
        if (visible && want) { playing = true; ui(); loop(); }
        else if (!visible && playing) { playing = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } ui(); }
      }, { threshold: 0.05 });
      io.observe(host);
    }
    const onVis = () => {
      if (document.hidden && playing) { playing = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } ui(); }
      else if (!document.hidden && want && visible) { playing = true; ui(); loop(); }
    };
    document.addEventListener('visibilitychange', onVis);

    /* start: autoplay unless the user prefers reduced motion */
    if (opts.autoplay !== false && !reduceMotion()) { i = 0; p = 0; render(); play(); }
    else { seek(0); }
    ui();

    return {
      play, pause, seek, get playing() { return playing; },
      destroy() {
        dead = true; playing = false; want = false;
        if (raf) cancelAnimationFrame(raf);
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        host.innerHTML = '';
      },
    };
  }

  window.ILAnim = {
    scenes: SCENES,
    has: (k) => !!SCENES[k],
    title: (k) => (TITLES[k] ? TITLES[k][0] : (SCENES[k] ? SCENES[k].title : k)),
    blurb: (k) => (TITLES[k] ? TITLES[k][1] : ''),
    steps: (k) => (SCENES[k] ? SCENES[k].steps.length : 0),
    list: Object.keys(TITLES),
    create,
  };
})();
