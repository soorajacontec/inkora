/* Inkora: background music.
   Egyptian-style ambience made in the browser with the Web Audio API. There are no audio files,
   so nothing is downloaded, nothing is copyrighted and it works offline.
   Sound: a low drone on D, a Hijaz-style melody (D Eb F# G A Bb C) played by plucked strings,
   soft hand-drum, finger-cymbal chimes, and a breath of desert wind.
   window.ILBgm = { mount(host, {toast}), createEngine, _renderTest(seconds) } */
(() => {
  'use strict';

  const D3 = 146.83;
  /* two tracks: "night" uses Hijaz (D Eb F# G A Bb C), "dawn" uses a Bayati-style scale with a half-flat second */
  const TRACKS = {
    night: { name: 'Nile Night', note: 'Egyptian ambience', semis: [0, 1, 4, 5, 7, 8, 10], bpm: 58, drums: true, chime: [6, 13], wind: 0.16 },
    dawn: { name: 'Temple Dawn', note: 'Slow and calm', semis: [0, 1.5, 3, 5, 7, 8, 10], bpm: 44, drums: false, chime: [3.5, 8], wind: 0.2 },
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function impulse(ctx, seconds, decay) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds), buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function noiseBuf(ctx, seconds) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }  // soft, brown-ish noise
    return buf;
  }

  function createEngine(ctx, dest, trackId) {
    const cfg = TRACKS[trackId] || TRACKS.night;
    const SCALE = [];                                         // three octaves from D3
    for (let o = 0; o < 3; o++) cfg.semis.forEach((s) => SCALE.push(D3 * Math.pow(2, (s + 12 * o) / 12)));
    const TICK = 60 / cfg.bpm / 2;                            // eighth note
    /* signal chain: voices -> dry + reverb -> mix -> volume -> fade -> compressor -> destination */
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.3;
    comp.connect(dest);
    const fade = ctx.createGain(); fade.gain.value = 0; fade.connect(comp);
    const vol = ctx.createGain(); vol.gain.value = 0.3; vol.connect(fade);
    const mix = ctx.createGain(); mix.connect(vol);
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 3.4, 2.6);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.7; verb.connect(verbOut); verbOut.connect(mix);
    const dry = ctx.createGain(); dry.gain.value = 0.85; dry.connect(mix);
    const send = ctx.createGain(); send.gain.value = 1; send.connect(verb);
    const bus = (g) => { const n = ctx.createGain(); n.gain.value = g; n.connect(dry); n.connect(send); return n; };
    const melodyBus = bus(0.55), drumBus = bus(0.4), chimeBus = bus(0.35);
    const droneBus = ctx.createGain(); droneBus.gain.value = 0.9; droneBus.connect(mix);

    /* drone and wind run for the whole session */
    function startDrone() {
      const t = ctx.currentTime;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.connect(droneBus);
      [[73.42, 'sine', 0.2], [73.9, 'sine', 0.1], [110.0, 'triangle', 0.07], [146.83, 'sine', 0.05], [220.0, 'sine', 0.02]].forEach(([f, type, g], i) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = g;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.023;
        const lg = ctx.createGain(); lg.gain.value = g * 0.5;
        lfo.connect(lg); lg.connect(og.gain);
        o.connect(og); og.connect(lp); o.start(t); lfo.start(t);
      });
    }
    function startWind() {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx, 6); src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = cfg.wind;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
      const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.037;
      const lg2 = ctx.createGain(); lg2.gain.value = 0.08; lfo2.connect(lg2); lg2.connect(g.gain);
      src.connect(bp); bp.connect(g); g.connect(mix);
      src.start(t); lfo.start(t); lfo2.start(t);
    }

    /* plucked string (Karplus-Strong), cached per pitch */
    const cache = new Map();
    function pluckBuffer(freq) {
      const key = Math.round(freq * 4);
      if (cache.has(key)) return cache.get(key);
      const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / freq)), len = Math.floor(sr * 3.2);
      const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
      let prev = 0;
      for (let i = 0; i < N; i++) { prev = prev * 0.55 + (Math.random() * 2 - 1) * 0.45; ring[i] = prev; }
      let idx = 0;
      for (let n = 0; n < len; n++) {
        const a = ring[idx], b = ring[(idx + 1) % N], v = (a + b) * 0.5 * 0.9975;
        ring[idx] = v; d[n] = a; idx = (idx + 1) % N;
      }
      const out = { buf, base: sr / N };
      cache.set(key, out); return out;
    }
    function pluck(t, freq, dur, level) {
      const { buf, base } = pluckBuffer(freq);
      const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = freq / base;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(4200, freq * 6);
      const g = ctx.createGain();
      const hold = Math.max(0.5, Math.min(dur, 2.2));
      g.gain.setValueAtTime(level, t);
      g.gain.setValueAtTime(level, t + hold * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, t + hold + 1.2);
      s.connect(lp); lp.connect(g); g.connect(melodyBus);
      s.start(t); s.stop(t + hold + 1.3);
    }

    /* hand drum: a low "dum" and a dry "tak" */
    function dum(t, level) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.2);
      const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g); g.connect(drumBus); o.start(t); o.stop(t + 0.45);
    }
    let noise = null;
    function tak(t, level) {
      if (!noise) noise = noiseBuf(ctx, 1);
      const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = 3.2;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.1;
      const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      s.connect(bp); bp.connect(g); g.connect(drumBus); s.start(t, Math.random() * 0.5); s.stop(t + 0.12);
    }
    /* finger-cymbal chime */
    function chime(t) {
      const f = pick([SCALE[14], SCALE[11], SCALE[18], SCALE[9]]) * 2;
      [[1, 0.5], [2.76, 0.18], [5.4, 0.07]].forEach(([m, lv]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lv * 0.18, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / m + 0.4);
        o.connect(g); g.connect(chimeBus); o.start(t); o.stop(t + 3);
      });
    }

    /* composer: runs one eighth-note tick at a time */
    let tickTime = 0, tickNo = 0, started = false;
    let idx = 7, remaining = 0, notesLeft = 0, pause = 0, nextChime = 0;
    const PATTERN = ['D', '', 'T', 'T', 'D', '', 'T', ''];   // maqsum-like, 8 ticks per bar
    function nextNote(t) {
      if (pause > 0) { pause--; remaining = 1; return; }
      if (notesLeft <= 0) {                                   // phrase finished: rest, then start a new one
        notesLeft = Math.floor(rnd(6, 10)); pause = Math.floor(rnd(3, 7)); remaining = 1;
        idx = pick([7, 11, 9, 7]); return;
      }
      const ending = notesLeft === 1;
      let step = pick([-2, -1, -1, 0, 1, 1, 2, 3]);
      if (idx > 13) step = -Math.abs(step) - 1;
      if (idx < 5) step = Math.abs(step) + 1;
      idx = Math.max(4, Math.min(15, idx + step));
      if (ending) idx = pick([7, 7, 11, 14]);                // land on the tonic or the dominant
      const dur = ending ? pick([4, 6]) : pick([1, 1, 2, 2, 3, 4]);
      const freq = SCALE[idx];
      const lv = rnd(0.34, 0.62);
      if (!ending && Math.random() < 0.22 && idx < 14) {     // quick ornament before the note
        pluck(t - TICK * 0.3, SCALE[idx + 1], TICK, lv * 0.55);
      }
      pluck(t, freq, dur * TICK + 0.4, lv);
      notesLeft--; remaining = dur;
    }
    function tick(t) {
      const bar = Math.floor(tickNo / 8), pos = tickNo % 8;
      if (remaining <= 0) nextNote(t);
      remaining--;
      if (cfg.drums && bar >= 4 && !(bar % 9 === 8)) {                    // drum enters after four bars, rests every ninth bar
        const hit = PATTERN[pos];
        if (hit === 'D') dum(t, 0.42); else if (hit === 'T') tak(t, 0.11);
      }
      if (t >= nextChime) { chime(t + 0.02); nextChime = t + rnd(cfg.chime[0], cfg.chime[1]); }
      tickNo++;
    }
    function schedule(until) {
      if (!started) return;
      while (tickTime < until) { tick(tickTime); tickTime += TICK; }
    }
    function start() {
      if (started) return;
      started = true; tickTime = ctx.currentTime + 0.15; nextChime = ctx.currentTime + 4;
      startDrone(); startWind();
    }
    const ramp = (param, v, secs) => {
      const t = ctx.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(v, t + secs);
    };
    return {
      start, schedule,
      fadeIn(secs) { ramp(fade.gain, 1, secs || 1.6); },
      fadeOut(secs) { ramp(fade.gain, 0, secs || 0.8); },
      setVolume(v) { const x = Math.max(0, Math.min(1, v)); vol.gain.setTargetAtTime(1.0 * x * x, ctx.currentTime, 0.05); },
      instant() { fade.gain.value = 1; },
      dispose() { try { comp.disconnect(); } catch (e) { /* already gone */ } },
    };
  }

  /* ---------- small player ---------- */
  const lsGet = () => { try { return JSON.parse(localStorage.getItem('il-bgm')) || {}; } catch (e) { return {}; } };
  const lsSet = (o) => { try { localStorage.setItem('il-bgm', JSON.stringify(o)); } catch (e) { /* ignore */ } };
  const icon = (n) => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  function mount(host, opts) {
    const toast = (opts && opts.toast) || (() => {});
    const saved = lsGet();
    let vol = typeof saved.vol === 'number' ? saved.vol : 0.5;
    let track = TRACKS[saved.track] ? saved.track : 'night';
    host.innerHTML = `<div class="bgm" role="group" aria-label="Background music">
      <button type="button" class="bgm-btn" id="bgmBtn" aria-pressed="false" aria-label="Play background music" title="Play background music (M)">${icon('play')}</button>
      <div class="bgm-meta"><b id="bgmName">Nile Night</b><span id="bgmNote">Egyptian ambience</span></div>
      <button type="button" class="bgm-track" id="bgmTrack" aria-label="Change track" title="Change track">${icon('next')}</button>
      <span class="bgm-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <label class="sr" for="bgmVol">Music volume</label>
      <input type="range" id="bgmVol" min="0" max="100" step="1" value="${Math.round(vol * 100)}" aria-label="Music volume">
    </div>`;
    const wrap = host.firstElementChild, btn = $('#bgmBtn'), range = $('#bgmVol');
    function $(s) { return host.querySelector(s); }
    let ctx = null, eng = null, timer = 0, playing = false, hiddenPause = false;
    const nameEl = $('#bgmName'), noteEl = $('#bgmNote');
    const label = () => { nameEl.textContent = TRACKS[track].name; noteEl.textContent = TRACKS[track].note; };
    label();

    function paint() {
      wrap.classList.toggle('on', playing);
      btn.setAttribute('aria-pressed', String(playing));
      btn.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
      btn.title = (playing ? 'Pause background music' : 'Play background music') + ' (M)';
      btn.innerHTML = icon(playing ? 'pause' : 'play');
    }
    async function begin() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { toast('This browser cannot play the background music.'); return false; }
        ctx = new AC();
      }
      if (!eng) { eng = createEngine(ctx, ctx.destination, track); eng.setVolume(vol); eng.start(); }
      try { await ctx.resume(); } catch (e) { return false; }
      eng.fadeIn(1.6);
      clearInterval(timer);
      eng.schedule(ctx.currentTime + 3);
      timer = setInterval(() => eng.schedule(ctx.currentTime + 3), 250);
      return true;
    }
    function halt() {
      if (!eng) return;
      eng.fadeOut(0.8);
      setTimeout(() => { if (!playing || hiddenPause) { clearInterval(timer); if (ctx && ctx.state === 'running') ctx.suspend(); } }, 900);
    }
    async function play() { if (playing) return; playing = true; hiddenPause = false; paint(); if (!(await begin())) { playing = false; paint(); } }
    function pause() { if (!playing) return; playing = false; hiddenPause = false; paint(); halt(); }
    const toggle = () => (playing ? pause() : play());

    function nextTrack() {
      const ids = Object.keys(TRACKS); track = ids[(ids.indexOf(track) + 1) % ids.length]; label(); lsSet({ vol, track });
      toast('Track: ' + TRACKS[track].name);
      if (!eng) return;
      const old = eng; eng = null;
      old.fadeOut(1.0); setTimeout(() => old.dispose(), 1100);
      if (playing && ctx) { clearInterval(timer); begin(); }
    }
    $('#bgmTrack').addEventListener('click', nextTrack);
    btn.addEventListener('click', toggle);
    range.addEventListener('input', () => { vol = range.value / 100; if (eng) eng.setVolume(vol); lsSet({ vol, track }); });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) toggle();
    });
    document.addEventListener('visibilitychange', () => {   // save battery: stop while the tab is hidden
      if (document.hidden && playing) { hiddenPause = true; halt(); }
      else if (!document.hidden && playing && hiddenPause) { hiddenPause = false; begin(); }
    });
    paint();
    return { play, pause, toggle, get playing() { return playing; }, get ctx() { return ctx; } };
  }

  /* Offline render for tests: returns peak and rms of N seconds of music. */
  async function renderTest(seconds, trackId) {
    const sr = 22050, ctx = new OfflineAudioContext(2, sr * seconds, sr);
    const eng = createEngine(ctx, ctx.destination, trackId);
    eng.instant(); eng.setVolume(0.5); eng.start(); eng.schedule(seconds);
    const out = await ctx.startRendering();
    let peak = 0, sum = 0, n = 0, nan = 0, loud = 0;
    for (let c = 0; c < out.numberOfChannels; c++) {
      const d = out.getChannelData(c);
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (v !== v) nan++; const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; n++; if (a > 0.98) loud++; }
    }
    return { peak, rms: Math.sqrt(sum / n), nan, clipped: loud };
  }

  window.ILBgm = { mount, createEngine, _renderTest: renderTest };
})();
