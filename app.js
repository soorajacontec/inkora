/* Inkora: application logic (one IIFE).
   Sections: 1 helpers, 2 layout, 3 theme and ink colour, 4 data, 5 state and routing,
   6 cards, 7 home, 8 brands, 9 models, 10 animations, 11 detail pages, 12 history,
   13 write, 14 saved, 15 search, 16 modals, 17 help and tour, 18 about, 19 PWA and boot. */
(() => {
  'use strict';

  const VERSION = '1.5.0';

  /* ======================= 1. Helpers ======================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('il-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('il-' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem('il-' + k); } catch (e) { /* ignore */ } },
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = (n) => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let toastTimer = 0;
  function toast(msg, ms = 2600) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }
  const yr = (y) => (y < 0 ? Math.abs(y) + ' BCE' : String(y));
  function yearsLabel(years, circa) {
    if (!years || years[0] == null) return 'dates unconfirmed';
    const [a, b] = years, c = circa ? 'c. ' : '';
    if (b == null) return `${c}${a} to present`;
    return a === b ? c + a : `${c}${a} to ${b}`;
  }
  const WARN_TAG = '<span class="tag warn" title="Some details are less certain. Please check with the maker or a pen-history reference.">needs checking</span>';

  /* ======================= 2. Layout ======================= */
  let layoutPref = store.get('layout', 'auto');
  if (!['auto', 'mobile', 'tab', 'web'].includes(layoutPref)) layoutPref = 'auto';
  const resolveLayout = (pref) => {
    if (pref === 'mobile' || pref === 'tab' || pref === 'web') return pref;
    const w = innerWidth, touch = matchMedia('(pointer:coarse)').matches;
    return w <= 760 ? 'mobile' : (w <= 1180 && touch ? 'tab' : 'web');
  };
  let layoutNow = resolveLayout(layoutPref);
  function measureTop() {
    const h = $('#top').offsetHeight;
    if (h) document.documentElement.style.setProperty('--top-h', h + 'px');
  }
  function syncLayoutMenu() {
    $$('#layoutMenu [data-layout]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.layout === layoutPref)));
    $('#layoutAuto').hidden = layoutPref !== 'auto';
  }
  function applyLayout() {
    layoutNow = resolveLayout(layoutPref);
    const cl = document.documentElement.classList;
    ['lay-mobile', 'lay-tab', 'lay-web'].forEach((c) => cl.remove(c));
    cl.add('lay-' + layoutNow);
    document.documentElement.setAttribute('data-layout', layoutPref);
    syncLayoutMenu(); measureTop();
  }
  function setLayout(p) { layoutPref = p; store.set('layout', p); applyLayout(); toast(p === 'auto' ? 'Layout: Auto (fits your screen)' : 'Layout: ' + p.charAt(0).toUpperCase() + p.slice(1)); }
  const isMobile = () => layoutNow === 'mobile';

  /* ======================= 3. Theme and ink colour ======================= */
  const SKINS = [
    { id: '', name: 'Gold', c: '#e2b44d' }, { id: 'burgundy', name: 'Carnelian', c: '#ee7a5a' },
    { id: 'emerald', name: 'Malachite', c: '#3cc38d' }, { id: 'sepia', name: 'Ochre', c: '#dd9c5e' },
    { id: 'violet', name: 'Lapis', c: '#86a4ff' }, { id: 'turquoise', name: 'Faience', c: '#35c9bb' },
    { id: 'orange', name: 'Sunset', c: '#ff9a4d' }, { id: 'mono', name: 'Papyrus', c: '#efe6d0' },
  ];
  const root = document.documentElement;
  const themePref = () => root.getAttribute('data-theme') || 'auto';
  const isDark = () => (themePref() === 'dark') || (themePref() === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  function syncTheme() {
    $$('#themeSeg [data-theme]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === themePref())));
    $('#themeIco').innerHTML = `<use href="#i-${isDark() ? 'sun' : 'moon'}"/>`;
    $('#themeBtn').setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    const dark = isDark();
    $$('meta[name="theme-color"]').forEach((m) => {
      if (themePref() === 'auto') m.setAttribute('content', m.media.includes('dark') ? '#0d1020' : '#f1e4c1');
      else m.setAttribute('content', dark ? '#0d1020' : '#f1e4c1');
    });
  }
  function setTheme(t) {
    if (t === 'light' || t === 'dark') { root.setAttribute('data-theme', t); store.set('theme', t); }
    else { root.removeAttribute('data-theme'); store.del('theme'); }
    syncTheme();
  }
  function setSkin(id) {
    if (id) { root.setAttribute('data-skin', id); store.set('skin', id); } else { root.removeAttribute('data-skin'); store.del('skin'); }
    $$('#swatches .sw').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.skin === id)));
  }
  function syncReading() {
    const large = root.getAttribute('data-text') === 'large', hi = root.getAttribute('data-contrast') === 'high';
    $$('#textSeg [data-textsize]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.textsize === (large ? 'large' : 'normal'))));
    $('#contrastBtn').setAttribute('aria-checked', String(hi));
  }
  function setTextSize(v) { if (v === 'large') { root.setAttribute('data-text', 'large'); store.set('text', 'large'); } else { root.removeAttribute('data-text'); store.del('text'); } syncReading(); measureTop(); }
  function setContrast(on) { if (on) { root.setAttribute('data-contrast', 'high'); store.set('contrast', true); } else { root.removeAttribute('data-contrast'); store.del('contrast'); } syncReading(); }
  function buildSwatches() {
    const cur = root.getAttribute('data-skin') || '';
    $('#swatches').innerHTML = SKINS.map((s) => `<button type="button" class="sw" role="radio" data-skin="${s.id}" aria-checked="${s.id === cur}" aria-label="${s.name}"><i style="--c:${s.c}"></i>${s.name}</button>`).join('');
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);

  /* ======================= 4. Data ======================= */
  const D = { brands: [], models: [], fillers: [], timeline: [], methods: [], glossary: [] };
  const BY = { brand: {}, model: {}, filler: {} };
  async function loadData() {
    const names = Object.keys(D);
    const res = await Promise.all(names.map((n) => fetch('data/' + n + '.json').then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
    names.forEach((n, i) => { D[n] = res[i]; });
    D.brands.forEach((b) => { BY.brand[b.id] = b; });
    D.models.forEach((m) => { BY.model[m.id] = m; });
    D.fillers.forEach((f) => { BY.filler[f.id] = f; });
    D.timeline.sort((a, b) => a.year - b.year);
    D.methods.sort((a, b) => a.sort - b.sort);
  }
  const brandName = (id) => (BY.brand[id] ? BY.brand[id].name : id);
  const fillerName = (id) => (BY.filler[id] ? BY.filler[id].name : id);
  const countries = () => [...new Map(D.brands.map((b) => [b.cc, b.country])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  /* ======================= 5. State and routing ======================= */
  let saved = store.get('saved', []); if (!Array.isArray(saved)) saved = [];
  const isSaved = (k) => saved.includes(k);
  function syncSaved() {
    const c = $('#savedCount'); c.textContent = saved.length; c.hidden = !saved.length;
    $$('[data-save]').forEach((b) => {
      const on = isSaved(b.dataset.save); b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('btn')) b.querySelector('span').textContent = on ? 'Saved' : 'Save';
    });
  }
  function toggleSaved(k) {
    const i = saved.indexOf(k);
    if (i >= 0) { saved.splice(i, 1); toast('Removed from Saved'); } else { saved.unshift(k); toast('Saved. Find it under the star in the top bar.'); }
    store.set('saved', saved); syncSaved();
    if (!$('#viewSaved').hidden) renderSaved();
  }
  const linkBtn = (hash, label) => `<button type="button" class="link-btn" data-copy="${esc(hash)}" aria-label="Copy link to ${esc(label)}" title="Copy link">${ICON('share')}</button>`;
  const starBtn = (key, label) => `<button type="button" class="star-btn" data-save="${key}" aria-pressed="${isSaved(key)}" aria-label="Save ${esc(label)}">${ICON('star')}</button>`;

  const VIEW_IDS = ['home', 'brands', 'models', 'animate', 'history', 'write', 'saved', 'search', 'detail'];
  const NAV_OF = { home: 'home', brands: 'brands', brand: 'brands', models: 'models', model: 'models', animate: 'animate', filler: 'animate', anatomy: 'animate', history: 'history', methods: 'history', write: 'write', compare: 'models', quiz: 'home', glossary: 'history', india: 'history', nibs: 'write' };
  let player = null, pad = null, tlObserver = null;
  function cleanup() {
    if (player) { player.destroy(); player = null; }
    if (pad) { pad.destroy(); pad = null; }
    if (tlObserver) { tlObserver.disconnect(); tlObserver = null; }
    if (cardIO) { cardIO.disconnect(); cardIO = null; }
  }
  function show(view, navKey, title) {
    $('#loading').hidden = true;
    VIEW_IDS.forEach((v) => { $('#view' + v[0].toUpperCase() + v.slice(1)).hidden = v !== view; });
    $$('#nav a').forEach((a) => { if (a.dataset.view === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = (title ? title + ' · ' : '') + 'Inkora';
    window.scrollTo(0, 0);
    const m = $('#main'); try { m.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function parseHash() {
    let h = location.hash.slice(1);
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    const i = h.indexOf('=');
    return i < 0 ? { name: h || 'home', arg: '' } : { name: h.slice(0, i), arg: h.slice(i + 1) };
  }
  function route() {
    closePops(); cleanup();
    const { name, arg } = parseHash();
    if (!D.brands.length) return;
    switch (name) {
      case 'brands': renderBrands(); break;
      case 'models': renderModels(); break;
      case 'animate': renderAnimate(); break;
      case 'history': renderHistory('tl'); break;
      case 'methods': renderHistory('me'); break;
      case 'write': renderWrite(); break;
      case 'saved': renderSaved(); break;
      case 'search': renderSearch(arg); break;
      case 'brand': if (BY.brand[arg]) renderBrandDetail(BY.brand[arg]); else renderHome(); break;
      case 'model': if (BY.model[arg]) renderModelDetail(BY.model[arg]); else renderHome(); break;
      case 'filler': if (BY.filler[arg]) renderFillerDetail(BY.filler[arg]); else renderHome(); break;
      case 'anatomy': renderAnatomy(); break;
      case 'compare': renderCompare(arg); break;
      case 'quiz': renderQuiz(); break;
      case 'glossary': renderGlossary(arg); break;
      case 'india': renderIndia(); break;
      case 'nibs': renderNibs(); break;
      default: renderHome();
    }
  }
  async function goTo(hash) {
    if (location.hash !== hash) { location.hash = hash; await wait(120); }
  }

  /* ======================= 5b. Photos (Wikipedia and Wikimedia Commons, loaded at runtime) ======================= */
  const IMG = (() => {
    const API = 'https://en.wikipedia.org/w/api.php';
    const TTL = 30 * 864e5, TTL_NONE = 3 * 864e5;
    const STOP = new Set(['pen', 'pens', 'fountain', 'company', 'the', 'and', 'ltd', 'manufacturing', 'corporation', 'brand']);
    const BAD = /logo|icon|flag|symbol|wordmark|signature|commons-|question|edit-|stub|ambox|disambig|map|diagram|patent|advert|poster/i;
    const OKEXT = /\.(jpe?g|png)$/i;
    let cache = store.get('img', {}); if (!cache || typeof cache !== 'object') cache = {};
    const pending = new Map();
    let active = 0; const waiting = [];
    const limit = (fn) => new Promise((res, rej) => {
      const run = () => { active++; fn().then(res, rej).finally(() => { active--; const n = waiting.shift(); if (n) n(); }); };
      if (active < 3) run(); else waiting.push(run);
    });
    const words = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => (w.length > 2 || /^\d+$/.test(w)) && !STOP.has(w));
    const api = (params) => fetch(API + '?' + new URLSearchParams(Object.assign({ format: 'json', origin: '*', formatversion: '2' }, params))).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    const plain = (h) => { try { return (new DOMParser().parseFromString(h || '', 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return ''; } };
    const persist = () => { try { const keys = Object.keys(cache); if (keys.length > 150) keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - 150).forEach((k) => delete cache[k]); } catch (e) { /* ignore */ } store.set('img', cache); };

    async function find(kind, rec) {
      const brand = kind === 'model' ? BY.brand[rec.brandId] : rec;
      const bt = words(brand ? brand.name : ''), mt = kind === 'model' ? words(rec.name) : [];
      const query = kind === 'model' ? `${brand.name} ${rec.name} fountain pen` : `${rec.name} fountain pen`;
      const r = await api({ action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '0', gsrlimit: '5', prop: 'pageimages', piprop: 'name', pilimit: '5' });
      const pages = (r.query && r.query.pages || []).slice().sort((a, b) => (a.index || 0) - (b.index || 0));
      const page = pages.find((pg) => {
        const tt = words(pg.title);
        return bt.some((w) => tt.includes(w)) && (kind === 'brand' || !mt.length || mt.some((w) => tt.includes(w)));
      });
      if (!page) return null;
      let file = page.pageimage && OKEXT.test(page.pageimage) && !BAD.test(page.pageimage) ? page.pageimage : null;
      if (!file) {
        const r2 = await api({ action: 'query', prop: 'images', titles: page.title, imlimit: '50' });
        const list = ((r2.query && r2.query.pages && r2.query.pages[0] && r2.query.pages[0].images) || []).map((i) => i.title.replace(/^File:/, ''));
        const key = bt.concat(mt);
        file = list.find((n) => OKEXT.test(n) && !BAD.test(n) && words(n).some((w) => key.includes(w))) || null;
      }
      if (!file) return null;
      const r3 = await api({ action: 'query', prop: 'imageinfo', titles: 'File:' + file, iiprop: 'url|extmetadata|size', iiurlwidth: '720' });
      const pg = r3.query && r3.query.pages && r3.query.pages[0], ii = pg && pg.imageinfo && pg.imageinfo[0];
      if (!ii) return null;
      const m = ii.extmetadata || {}, v = (k) => (m[k] && m[k].value) || '';
      const lic = plain(v('LicenseShortName')) || plain(v('UsageTerms'));
      const free = /^(CC|public domain|PD|GFDL|attribution|FAL)/i.test(lic) && String(v('NonFree')).toLowerCase() !== 'true';
      if (!free) return null;
      return {
        src: ii.thumburl || ii.url, w: ii.thumbwidth || ii.width, h: ii.thumbheight || ii.height,
        file, artist: plain(v('Artist')) || 'Unknown author', credit: plain(v('Credit')),
        license: lic, licenseUrl: v('LicenseUrl'), descUrl: ii.descriptionurl,
        article: page.title, articleUrl: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')),
      };
    }

    /* Resolves to {d} (a photo), {none:true} (no free photo), or {err:true} (network blocked or offline). */
    function get(kind, rec) {
      const key = kind + ':' + rec.id, hit = cache[key];
      if (hit && Date.now() - hit.t < (hit.d ? TTL : TTL_NONE)) return Promise.resolve(hit.d ? { d: hit.d } : { none: true });
      if (pending.has(key)) return pending.get(key);
      const p = limit(() => find(kind, rec)).then((d) => { cache[key] = { t: Date.now(), d }; persist(); return d ? { d } : { none: true }; }, () => ({ err: true })).finally(() => pending.delete(key));
      pending.set(key, p); return p;
    }
    const cached = (kind, id) => { const h = cache[kind + ':' + id]; return h && h.d ? h.d : null; };
    return { get, cached };
  })();

  const PA_EXTRA = {
    eyedropper: '<path d="M158 32 q16 -2 16 8 q0 10 -16 8 z" class="pa-acc"/><rect x="150" y="36" width="10" height="8" class="pa-acc"/>',
    crescent: '<path d="M104 26 a15 15 0 0 1 0 28" class="pa-ring"/><path d="M96 26 a15 15 0 0 1 0 28" class="pa-ring" opacity=".5"/>',
    lever: '<rect x="90" y="24" width="40" height="5" rx="2.5" class="pa-acc"/><circle cx="90" cy="30" r="3" class="pa-acc"/>',
    button: '<circle cx="164" cy="40" r="6" class="pa-acc"/>',
    plunger: '<rect x="160" y="37" width="26" height="6" class="pa-acc"/><rect x="184" y="30" width="8" height="20" rx="3" class="pa-acc"/>',
    vacuum: '<rect x="158" y="26" width="18" height="28" rx="5" class="pa-acc"/><line x1="112" y1="32" x2="112" y2="48" class="pa-ring"/>',
    piston: '<rect x="158" y="28" width="18" height="24" rx="5" class="pa-acc"/><rect x="146" y="33" width="10" height="14" class="pa-ring" fill="none"/>',
    snorkel: '<path d="M30 46 L12 54 L2 62" class="pa-ring"/>',
    aerometric: '<rect x="76" y="31" width="44" height="18" rx="9" class="pa-acc" opacity=".85"/>',
    capillary: '<path d="M70 36 H150 M70 44 H150" class="pa-ring"/>',
    cartridge: '<rect x="92" y="34" width="52" height="12" rx="3" class="pa-acc"/>',
  };
  const penArt = (k) => `<svg class="penart" viewBox="0 0 200 80" role="img" aria-label="Pen illustration"><g transform="rotate(-10 100 40)"><rect x="52" y="30" width="110" height="20" rx="10" class="pa-barrel"/><rect x="30" y="33" width="28" height="14" class="pa-section"/><path d="M30 33 L6 40 L30 47 Z" class="pa-nib"/><line x1="6" y1="40" x2="24" y2="40" class="pa-slit"/><circle cx="22" cy="40" r="1.6" class="pa-slit"/>${PA_EXTRA[k] || ''}</g></svg>`;
  const phFor = (kind, rec) => penArt(kind === 'model' ? rec.filler : 'generic');
  const commonsSearch = (t) => 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(t + ' fountain pen') + '&ns6=1';
  function creditHTML(d) {
    return `<dl>
        <div><dt>Photo</dt><dd>${esc(d.file.replace(/_/g, ' '))}</dd></div>
        <div><dt>Author</dt><dd>${esc(d.artist)}</dd></div>
        ${d.credit && d.credit !== d.artist ? `<div><dt>Credit</dt><dd>${esc(d.credit)}</dd></div>` : ''}
        <div><dt>Licence</dt><dd>${d.licenseUrl ? `<a href="${esc(d.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(d.license)} ↗</a>` : esc(d.license)}</dd></div>
        <div><dt>Credit URL</dt><dd><a href="${esc(d.descUrl)}" target="_blank" rel="noopener noreferrer">${esc(d.descUrl)}</a></dd></div>
        <div><dt>Article</dt><dd><a href="${esc(d.articleUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia: ${esc(d.article)} ↗</a></dd></div>
      </dl>
      <p class="muted small">Loaded from Wikimedia at view time. Always check the licence page before reusing a photo.</p>`;
  }
  const photoBox = (kind, id) => `<figure class="photo" data-photo="${kind}:${esc(id)}"><div class="photo-ph">Looking for a photo…</div></figure>`;
  async function hydratePhoto(box) {
    if (!box) return;
    const [kind, id] = box.dataset.photo.split(':'), rec = BY[kind][id];
    const r = await IMG.get(kind, rec);
    if (!box.isConnected) return;
    if (r.d) {
      const d = r.d;
      box.innerHTML = `<div class="photo-frame"><a class="photo-img" href="${esc(d.descUrl)}" target="_blank" rel="noopener noreferrer"><img src="${esc(d.src)}" alt="${esc(rec.name)}: photo from Wikimedia" ${d.w && d.h ? `width="${d.w}" height="${d.h}"` : ''} referrerpolicy="no-referrer"></a>
        <button type="button" class="photo-i" aria-expanded="false" aria-label="Image credit" title="Image credit">${ICON('info')}</button>
        <div class="photo-credit" role="region" aria-label="Image credit" hidden><h3>Image credit</h3>${creditHTML(d)}</div></div>`;
      const im = $('img', box); im.addEventListener('error', () => { box.innerHTML = '<div class="photo-art">' + phFor(kind, rec) + '</div><div class="photo-ph">The photo could not be loaded.</div>'; });
    } else if (r.none) {
      box.innerHTML = `<div class="photo-art">${phFor(kind, rec)}</div><div class="photo-ph">No free-licence photo was found for this one. <a href="${esc(commonsSearch(kind === 'model' ? brandName(rec.brandId) + ' ' + rec.name : rec.name))}" target="_blank" rel="noopener noreferrer">Search Wikimedia Commons ↗</a></div>`;
    } else {
      box.innerHTML = `<div class="photo-art">${phFor(kind, rec)}</div>` + '<div class="photo-ph">Photos need an internet connection to Wikimedia, and are not available right now.</div>';
    }
  }
  let cardIO = null;
  function hydrateCards(root) {
    if (cardIO) cardIO.disconnect();
    const boxes = $$('.ci-img[data-img]', root);
    const fill = async (el) => {
      const [kind, id] = el.dataset.img.split(':'), rec = BY[kind][id];
      const r = await IMG.get(kind, rec);
      if (!el.isConnected || !r.d) return;
      el.innerHTML = `<img src="${esc(r.d.src)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
      const im = $('img', el); im.addEventListener('error', () => { el.innerHTML = phFor(kind, rec); });
      el.classList.add('has');
    };
    if (!('IntersectionObserver' in window)) return;
    cardIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { cardIO.unobserve(e.target); const b = $('.ci-img[data-img]', e.target); if (b) fill(b); } }), { rootMargin: '200px 0px' });
    boxes.forEach((b) => { const c = b.closest('.card-item'); if (c) cardIO.observe(c); });
  }

  /* ======================= 6. Cards ======================= */
  function brandCard(b) {
    return `<article class="card-item">
      <a class="ci-main" href="#brand=${esc(b.id)}">
        <div class="ci-img" data-img="brand:${esc(b.id)}" aria-hidden="true">${penArt('generic')}</div>
        <div class="ci-top"><span class="ci-cc" title="${esc(b.country)}">${esc(b.cc)}</span>${b.closed ? `<span class="tag gone">${esc(closedLabel(b))}</span>` : '<span class="tag">active</span>'}${b.verify ? WARN_TAG : ''}</div>
        <h3 class="ci-name">${esc(b.name)}</h3>
        <p class="ci-meta">${esc(b.city)}, ${esc(b.country)} · founded ${b.founded}</p>
        <p class="ci-sum">${esc(b.summary)}</p>
      </a>${linkBtn('#brand=' + b.id, b.name)}${starBtn('brand:' + b.id, b.name)}</article>`;
  }
  function modelCard(m) {
    return `<article class="card-item">
      <a class="ci-main" href="#model=${esc(m.id)}">
        <div class="ci-img" data-img="model:${esc(m.id)}" aria-hidden="true">${penArt(m.filler)}</div>
        <div class="ci-top"><span class="tag">${esc(fillerName(m.filler))}</span>${m.vintage ? '<span class="tag old">vintage</span>' : ''}${m.verify ? WARN_TAG : ''}</div>
        <h3 class="ci-name">${esc(m.name)}</h3>
        <p class="ci-meta">${esc(brandName(m.brandId))} · ${esc(yearsLabel(m.years, m.circa))}</p>
        <p class="ci-sum">${esc(m.summary)}</p>
      </a>${linkBtn('#model=' + m.id, brandName(m.brandId) + ' ' + m.name)}${starBtn('model:' + m.id, brandName(m.brandId) + ' ' + m.name)}</article>`;
  }
  const closedLabel = (b) => (b.closedNote || 'closed ' + b.closed);
  const empty = (t, s) => `<div class="empty"><h3>${esc(t)}</h3><p>${esc(s || '')}</p></div>`;
  const factsHTML = (rows) => `<div class="facts"><dl>${rows.filter(Boolean).map(([k, v]) => `<div class="row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
  const sourcesHTML = (src) => `<div class="src-list">${(src || []).map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)} ↗</a>`).join('')}</div>`;
  const verifyNote = () => '<p class="note-warn"><b>Needs checking.</b> Some details on this page (dates, names or technical points) are less certain than the rest. Please confirm them with the maker or a pen-history reference before relying on them.</p>';

  /* ======================= 7. Home ======================= */
  const FLOURISH = 'M30 190 C70 90 120 90 118 150 S90 215 150 170 S210 80 245 140 S290 205 330 130 S370 80 392 120';
  function renderHome() {
    const v = $('#viewHome');
    const facts = D.timeline.filter((t) => !t.verify);
    const f = facts[Math.floor(Math.random() * facts.length)];
    v.innerHTML = `
      <div class="hero">
        <div>
          <h1>Every pen has <em>a story.</em></h1>
          <p class="lead">Explore fountain-pen makers from around the world, famous and forgotten models, and the clever ways pens have been filled. Watch each mechanism move, read the history, and try writing on paper or a leaf.</p>
          <div class="cta">
            <a class="btn primary" href="#brands">${ICON('brand')}Explore brands</a>
            <a class="btn" href="#animate">${ICON('play')}Watch how pens work</a>
            <a class="btn" href="#write">${ICON('edit')}Try writing</a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="false">
          <svg viewBox="0 0 420 270" role="img" aria-label="A gold pen nib drawing a flourish across ruled paper">
            <g>${[60, 100, 140, 180, 220, 255].map((y) => `<line class="ruled" x1="14" y1="${y}" x2="406" y2="${y}"/>`).join('')}</g>
            <path id="hFlourish" class="flourish" d="${FLOURISH}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">
              <animate attributeName="stroke-dashoffset" values="1;0;0;1" keyTimes="0;0.6;0.9;1" dur="7s" repeatCount="indefinite"/>
            </path>
            <g id="hNib">
              <g transform="rotate(24)">
                <rect class="nib-pen" x="-9" y="-92" width="18" height="60" rx="6"/>
                <path class="nibg" d="M0 0 L-9 -20 L-6 -34 L6 -34 L9 -20 Z"/>
                <line x1="0" y1="0" x2="0" y2="-22" stroke="#7a5a18" stroke-width="1.2"/>
                <circle cx="0" cy="-26" r="2.2" fill="#7a5a18"/>
              </g>
              <animateMotion dur="7s" repeatCount="indefinite" path="${FLOURISH}" keyPoints="0;1;1;0" keyTimes="0;0.6;0.9;1" calcMode="linear"/>
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.6;0.62;1" dur="7s" repeatCount="indefinite"/>
            </g>
          </svg>
        </div>
      </div>
      <div class="frieze" aria-hidden="true">${['wave', 'sun', 'ankh', 'reed', 'eye', 'reed', 'ankh', 'sun', 'wave'].map((g) => `<svg class="ico"><use href="#g-${g}"/></svg>`).join('')}</div>
      <div class="stats">
        <div class="stat"><b>${D.brands.length}</b><span>brands</span></div>
        <div class="stat"><b>${D.models.length}</b><span>models</span></div>
        <div class="stat"><b>${countries().length}</b><span>countries</span></div>
        <div class="stat"><b>${D.fillers.length}</b><span>filling systems</span></div>
        <div class="stat"><b>${D.methods.length}</b><span>writing methods</span></div>
      </div>
      <h2 class="sec-title">Explore</h2>
      <div class="tiles">
        <a class="tile" href="#brands"><span class="ti">${ICON('brand')}</span><div><h3>Brands</h3><p>Makers from Japan, Germany, Italy, the US, the UK, China and more, past and present.</p></div></a>
        <a class="tile" href="#models"><span class="ti">${ICON('pen')}</span><div><h3>Models</h3><p>Classic and vintage pens, and what made each one special.</p></div></a>
        <a class="tile" href="#animate"><span class="ti">${ICON('play')}</span><div><h3>Animated explanations</h3><p>${D.fillers.length + 1} animations: how a nib writes and how every filling system works.</p></div></a>
        <a class="tile" href="#history"><span class="ti">${ICON('clock')}</span><div><h3>History</h3><p>A timeline from reed pens to the modern pen.</p></div></a>
        <a class="tile" href="#methods"><span class="ti">${ICON('leaf')}</span><div><h3>Old writing methods</h3><p>Clay, reeds, quills, wax, birch bark and palm leaves.</p></div></a>
        <a class="tile" href="#write"><span class="ti">${ICON('edit')}</span><div><h3>Write</h3><p>Try a simulated nib on paper or a leaf, and scratch a palm leaf with a stylus.</p></div></a>
        <a class="tile" href="#india"><span class="ti">${ICON('brand')}</span><div><h3>Pens in India</h3><p>Swadeshi workshops, famous makers and how rules shaped the trade.</p></div></a>
        <a class="tile" href="#compare"><span class="ti">${ICON('layout')}</span><div><h3>Compare two pens</h3><p>Put any two models side by side.</p></div></a>
        <a class="tile" href="#quiz"><span class="ti">${ICON('help')}</span><div><h3>Which pen suits you?</h3><p>Five quick questions and three suggestions.</p></div></a>
        <a class="tile" href="#nibs"><span class="ti">${ICON('edit')}</span><div><h3>Nib guide</h3><p>See fine, medium, broad, italic and flex lines drawn live.</p></div></a>
        <a class="tile" href="#glossary"><span class="ti">${ICON('flask')}</span><div><h3>Pen words</h3><p>A short glossary: feed, sac, ebonite, sheen and more.</p></div></a>
      </div>
      ${f ? `<h2 class="sec-title">Did you know</h2><div class="fact"><span class="muted small">${esc(yr(f.year))}${f.circa ? ' (approximately)' : ''}</span><b>${esc(f.title)}</b><p class="muted">${esc(f.text)}</p><p style="margin-top:10px"><a href="#history">See the full timeline</a></p></div>` : ''}`;
    if (reduceMotion()) {
      $$('animate, animateMotion', v).forEach((a) => a.remove());
      $('#hFlourish', v).setAttribute('stroke-dashoffset', '0');
      $('#hNib', v).setAttribute('transform', 'translate(392 120)');
    }
    show('home', 'home', '');
  }

  /* ======================= 8. Brands ======================= */
  const bf = { country: 'all', status: 'all', sort: 'az' };
  function renderBrands() {
    const cs = countries();
    $('#brandFilters').innerHTML = `
      <div class="grp"><span class="lbl">Country</span>
        <button class="chip" type="button" data-bc="all" aria-pressed="${bf.country === 'all'}">All</button>
        ${cs.map(([cc, n]) => `<button class="chip" type="button" data-bc="${cc}" aria-pressed="${bf.country === cc}">${esc(n)}<small>${D.brands.filter((b) => b.cc === cc).length}</small></button>`).join('')}
      </div>
      <div class="grp"><span class="lbl">Status</span>
        ${[['all', 'All'], ['active', 'Active'], ['closed', 'Closed']].map(([k, n]) => `<button class="chip" type="button" data-bs="${k}" aria-pressed="${bf.status === k}">${n}</button>`).join('')}
      </div>
      <div class="grp"><label class="sr" for="bSort">Sort brands</label>
        <select id="bSort" class="chip"><option value="az"${bf.sort === 'az' ? ' selected' : ''}>A to Z</option><option value="old"${bf.sort === 'old' ? ' selected' : ''}>Oldest first</option><option value="new"${bf.sort === 'new' ? ' selected' : ''}>Newest first</option></select>
      </div>`;
    drawBrands();
    show('brands', 'brands', 'Brands');
  }
  function brandStrip(list) {
    if (list.length < 2) return '';
    const fs = list.map((b) => b.founded), lo = Math.floor((Math.min(...fs) - 10) / 10) * 10, hi = Math.ceil((Math.max(...fs) + 10) / 10) * 10;
    const W = Math.max(720, (hi - lo) * 9), px = (y) => ((y - lo) / (hi - lo)) * (W - 60) + 20;
    const rows = [];
    const dots = list.slice().sort((a, b) => a.founded - b.founded).map((b) => {
      const x = px(b.founded), w = b.name.length * 6.4 + 22;
      let r = rows.findIndex((end) => end < x - 4); if (r < 0) { rows.push(0); r = rows.length - 1; }
      rows[r] = x + w;
      return `<a class="bs-dot${b.closed ? ' gone' : ''}" href="#brand=${esc(b.id)}" style="left:${x.toFixed(0)}px;top:${46 + r * 24}px" title="${esc(b.name)}, founded ${b.founded}"><i></i><span>${esc(b.name)}</span></a>`;
    }).join('');
    const ticks = []; for (let y = Math.ceil(lo / 50) * 50; y <= hi; y += 50) ticks.push(`<span class="bs-tick" style="left:${px(y).toFixed(0)}px">${y}</span>`);
    return `<div class="bstrip" role="group" aria-label="Brands by founding year, scrolls sideways"><div class="bs-track" style="width:${W}px;height:${60 + rows.length * 24}px"><div class="bs-axis"></div>${ticks.join('')}${dots}</div></div>`;
  }
  function drawBrands() {
    let l = D.brands.filter((b) => (bf.country === 'all' || b.cc === bf.country) && (bf.status === 'all' || (bf.status === 'closed') === !!b.closed));
    l = l.slice().sort((a, b) => (bf.sort === 'az' ? a.name.localeCompare(b.name) : bf.sort === 'old' ? a.founded - b.founded : b.founded - a.founded));
    $('#brandsSub').textContent = `${l.length} of ${D.brands.length} brands`;
    $('#brandStrip').innerHTML = brandStrip(l);
    $('#brandGrid').innerHTML = l.length ? l.map(brandCard).join('') : empty('No brands match', 'Try a different country or status.');
    hydrateCards($('#brandGrid'));
  }

  /* ======================= 9. Models ======================= */
  const mf = { filler: 'all', vintage: false, brand: 'all', sort: 'az', era: 'all' };
  const ERAS = [['all', 'Any era'], ['pre1920', 'Before 1920'], ['1920', '1920 to 1949'], ['1950', '1950 to 1969'], ['1970', '1970 onward'], ['unknown', 'Dates unconfirmed']];
  const eraOf = (m) => { const y = m.years && m.years[0]; return y == null ? 'unknown' : y < 1920 ? 'pre1920' : y < 1950 ? '1920' : y < 1970 ? '1950' : '1970'; };
  function renderModels() {
    const usedBrands = [...new Set(D.models.map((m) => m.brandId))].map((id) => BY.brand[id]).sort((a, b) => a.name.localeCompare(b.name));
    $('#modelFilters').innerHTML = `
      <div class="grp"><span class="lbl">Filling</span>
        <button class="chip" type="button" data-mf="all" aria-pressed="${mf.filler === 'all'}">All</button>
        ${D.fillers.map((f) => `<button class="chip" type="button" data-mf="${f.id}" aria-pressed="${mf.filler === f.id}">${esc(f.name)}<small>${D.models.filter((m) => m.filler === f.id).length}</small></button>`).join('')}
      </div>
      <div class="grp">
        <button class="chip" type="button" data-mv="1" aria-pressed="${mf.vintage}">Vintage only</button>
        <a class="chip" href="#compare">Compare two pens</a>
        <label class="sr" for="mEra">Era</label>
        <select id="mEra" class="chip">${ERAS.map(([k, n]) => `<option value="${k}"${mf.era === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <label class="sr" for="mBrand">Brand</label>
        <select id="mBrand" class="chip"><option value="all">All brands</option>${usedBrands.map((b) => `<option value="${b.id}"${mf.brand === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>
        <label class="sr" for="mSort">Sort models</label>
        <select id="mSort" class="chip"><option value="az"${mf.sort === 'az' ? ' selected' : ''}>A to Z</option><option value="old"${mf.sort === 'old' ? ' selected' : ''}>Oldest first</option><option value="new"${mf.sort === 'new' ? ' selected' : ''}>Newest first</option></select>
      </div>`;
    drawModels();
    show('models', 'models', 'Models');
  }
  function drawModels() {
    let l = D.models.filter((m) => (mf.filler === 'all' || m.filler === mf.filler) && (!mf.vintage || m.vintage) && (mf.era === 'all' || eraOf(m) === mf.era) && (mf.brand === 'all' || m.brandId === mf.brand));
    const key = (m) => (m.years[0] == null ? 99999 : m.years[0]);
    l = l.slice().sort((a, b) => (mf.sort === 'az' ? (brandName(a.brandId) + a.name).localeCompare(brandName(b.brandId) + b.name) : mf.sort === 'old' ? key(a) - key(b) : key(b) - key(a)));
    $('#modelsSub').textContent = `${l.length} of ${D.models.length} models`;
    $('#modelGrid').innerHTML = l.length ? l.map(modelCard).join('') : empty('No models match', 'Try removing a filter.');
    hydrateCards($('#modelGrid'));
  }

  /* ======================= 10. Animations ======================= */
  function renderAnimate() {
    const items = [['anatomy', '#anatomy', 'How a pen writes', window.ILAnim.blurb('anatomy'), window.ILAnim.steps('anatomy'), 'Nib, feed, air']]
      .concat(D.fillers.map((f) => [f.scene, '#filler=' + f.id, f.name, window.ILAnim.blurb(f.scene), window.ILAnim.steps(f.scene), f.era[0] ? 'from about ' + f.era[0] : '']));
    $('#animGrid').innerHTML = items.map(([k, href, t, b, n, e]) => `
      <article class="card-item"><a class="ci-main" href="${href}">
        <div class="ci-top"><span class="tag">${ICON('play')} ${n} steps</span>${e ? `<span class="tag gone">${esc(e)}</span>` : ''}</div>
        <h3 class="ci-name">${esc(t)}</h3><p class="ci-sum">${esc(b)}</p></a></article>`).join('');
    show('animate', 'animate', 'Animated explanations');
  }
  function mountPlayer(host, key) {
    player = window.ILAnim.create(host, key, { autoplay: true });
  }

  /* ======================= 11. Detail pages ======================= */
  const shareBtn = () => `<button class="btn" type="button" data-share>${ICON('share')}<span>Share</span></button>`;
  const saveBtn = (key) => `<button class="btn" type="button" data-save="${key}" aria-pressed="${isSaved(key)}">${ICON('star')}<span>${isSaved(key) ? 'Saved' : 'Save'}</span></button>`;

  function renderBrandDetail(b) {
    const models = D.models.filter((m) => m.brandId === b.id);
    const fills = [...new Set(models.map((m) => m.filler))];
    $('#viewDetail').innerHTML = `
      <a class="back-btn" href="#brands">${ICON('back')}All brands</a>
      <div class="dt-head">
        <div><h1 class="dt-title">${esc(b.name)}</h1>
          <p class="dt-sub"><span class="ci-cc">${esc(b.cc)}</span>${esc(b.city)}, ${esc(b.country)} ${b.closed ? `<span class="tag gone">${esc(closedLabel(b))}</span>` : '<span class="tag">active</span>'}${b.verify ? WARN_TAG : ''}</p></div>
        <div class="dt-actions">${saveBtn('brand:' + b.id)}${shareBtn()}</div>
      </div>
      <div class="dt-body">
        <div>
          <p class="lead">${esc(b.summary)}</p>
          ${models.length ? `<h2 class="sec-title">Models in this collection</h2><div class="link-list">${models.map((m) => `<a href="#model=${esc(m.id)}">${esc(m.name)}<small>${esc(yearsLabel(m.years, m.circa))}</small></a>`).join('')}</div>` : '<p class="muted" style="margin-top:14px">No models from this brand are listed yet.</p>'}
          ${b.verify ? verifyNote() : ''}
          <h2 class="sec-title">Sources</h2>${sourcesHTML(b.sources)}
        </div>
        <aside>${photoBox('brand', b.id)}${factsHTML([
          ['Founded', esc(b.founded)], ['Status', b.closed ? esc(b.closedNote ? b.closedNote.charAt(0).toUpperCase() + b.closedNote.slice(1) : 'Closed ' + b.closed) : 'Still active'],
          ['Country', esc(b.country)], ['Base', esc(b.city)], ['Models listed', models.length],
          fills.length ? ['Filling systems', fills.map((f) => `<a href="#filler=${esc(f)}">${esc(fillerName(f))}</a>`).join(', ')] : null,
        ])}</aside>
      </div>`;
    show('detail', 'brands', b.name);
    hydratePhoto($('.photo', $('#viewDetail')));
  }

  function renderModelDetail(m) {
    const b = BY.brand[m.brandId], f = BY.filler[m.filler];
    $('#viewDetail').innerHTML = `
      <a class="back-btn" href="#models">${ICON('back')}All models</a>
      <div class="dt-head">
        <div><h1 class="dt-title">${esc(b ? b.name : '')} ${esc(m.name)}</h1>
          <p class="dt-sub"><span class="tag">${esc(fillerName(m.filler))}</span>${m.vintage ? '<span class="tag old">vintage</span>' : ''}${m.verify ? WARN_TAG : ''}<span>${esc(yearsLabel(m.years, m.circa))}</span></p></div>
        <div class="dt-actions">${saveBtn('model:' + m.id)}${shareBtn()}</div>
      </div>
      <div class="dt-body">
        <div>
          <p class="lead">${esc(m.summary)}</p>
          ${f ? `<h2 class="sec-title">How it fills: ${esc(f.name)}</h2><p>${esc(f.howItWorks)}</p><p style="margin-top:12px"><a class="btn primary" href="#filler=${esc(f.id)}">${ICON('play')}Watch the animation</a></p>` : ''}
          ${m.verify ? verifyNote() : ''}
          <h2 class="sec-title">Sources</h2>${sourcesHTML(m.sources)}
        </div>
        <aside>${photoBox('model', m.id)}${factsHTML([
          ['Brand', b ? `<a href="#brand=${esc(b.id)}">${esc(b.name)}</a>` : ''], ['Made', esc(yearsLabel(m.years, m.circa))],
          ['Filling system', f ? `<a href="#filler=${esc(f.id)}">${esc(f.name)}</a>` : ''], m.nib ? ['Nib', esc(m.nib)] : null,
          ['Era', m.vintage ? 'Vintage (designed before 1970)' : 'Modern'],
        ])}</aside>
      </div>`;
    show('detail', 'models', (b ? b.name + ' ' : '') + m.name);
    hydratePhoto($('.photo', $('#viewDetail')));
  }

  function renderFillerDetail(f) {
    $('#viewDetail').innerHTML = `
      <a class="back-btn" href="#animate">${ICON('back')}All animations</a>
      <div class="dt-head">
        <div><h1 class="dt-title">${esc(f.name)}</h1>
          <p class="dt-sub">${f.era[0] ? `<span>from about ${f.era[0]}${f.era[1] ? ' to ' + f.era[1] : ''}</span>` : ''}${f.verify ? WARN_TAG : ''}</p></div>
        <div class="dt-actions">${shareBtn()}</div>
      </div>
      <div id="playerHost"></div>
      <div class="dt-body">
        <div>
          <h2 class="sec-title">How it works</h2><p class="lead">${esc(f.howItWorks)}</p>
          <div class="pros-cons"><div><b>Good</b>${esc(f.pros)}</div><div><b>Not so good</b>${esc(f.cons)}</div></div>
          ${f.verify ? verifyNote() : ''}
          <h2 class="sec-title">Sources</h2>${sourcesHTML(f.sources)}
        </div>
        <aside>
          <h2 class="sec-title" style="margin-top:0">Pens that use it</h2>
          <div class="link-list">${f.examples.map((id) => BY.model[id]).filter(Boolean).map((m) => `<a href="#model=${esc(m.id)}">${esc(brandName(m.brandId))} ${esc(m.name)}<small>${esc(yearsLabel(m.years, m.circa))}</small></a>`).join('')}</div>
        </aside>
      </div>`;
    show('detail', 'animate', f.name + ' animation');
    mountPlayer($('#playerHost'), f.scene);
  }

  function renderAnatomy() {
    $('#viewDetail').innerHTML = `
      <a class="back-btn" href="#animate">${ICON('back')}All animations</a>
      <div class="dt-head"><div><h1 class="dt-title">How a pen writes</h1><p class="dt-sub">Nib, feed, capillary action and air</p></div><div class="dt-actions">${shareBtn()}</div></div>
      <div id="playerHost"></div>
      <div class="dt-body"><div>
        <h2 class="sec-title">The idea</h2>
        <p class="lead">A fountain pen has no pump pushing the ink out. The ink moves because of a tiny slit, a toothed feed and a trade of ink for air.</p>
        <p style="margin-top:12px" class="muted">Next, see how pens are filled: <a href="#animate">all filling systems</a>.</p>
      </div></div>`;
    show('detail', 'animate', 'How a pen writes');
    mountPlayer($('#playerHost'), 'anatomy');
  }

  /* ======================= 11b. Compare, quiz, glossary, India story, nib guide ======================= */
  const wikiSearch = (t) => 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(t);
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const backLink = (href, label) => `<a class="back-btn" href="${href}">${ICON('back')}${label}</a>`;

  /* --- compare two pens --- */
  function renderCompare(arg) {
    const parts = (arg || '').split(',');
    const sorted = D.models.slice().sort((a, b) => (brandName(a.brandId) + a.name).localeCompare(brandName(b.brandId) + b.name));
    let a = BY.model[parts[0]] ? parts[0] : 'parker-51', b = BY.model[parts[1]] ? parts[1] : 'lamy-safari';
    if (!BY.model[a]) a = sorted[0].id; if (!BY.model[b]) b = sorted[1].id;
    const opts = (cur) => sorted.map((m) => `<option value="${esc(m.id)}"${m.id === cur ? ' selected' : ''}>${esc(brandName(m.brandId) + ' ' + m.name)}</option>`).join('');
    $('#viewDetail').innerHTML = `${backLink('#models', 'All models')}
      <h1 class="dt-title">Compare two pens</h1><p class="muted" style="margin:6px 0 16px">Pick any two models to see them side by side.</p>
      <div class="cmp-pick"><label>Pen A<select id="cmpA" class="chip">${opts(a)}</select></label><label>Pen B<select id="cmpB" class="chip">${opts(b)}</select></label></div>
      <div id="cmpOut"></div>`;
    const draw = () => {
      const A = BY.model[$('#cmpA').value], B = BY.model[$('#cmpB').value];
      try { history.replaceState(null, '', '#compare=' + A.id + ',' + B.id); } catch (e) { /* ignore */ }
      const col = (m) => { const br = BY.brand[m.brandId], f = BY.filler[m.filler]; return [
        penArt(m.filler), `<a href="#model=${esc(m.id)}">${esc(brandName(m.brandId))} ${esc(m.name)}</a>`,
        esc(br ? br.country : ''), esc(yearsLabel(m.years, m.circa)), `<a href="#filler=${esc(m.filler)}">${esc(fillerName(m.filler))}</a>`,
        esc(m.nib || 'Not listed'), m.vintage ? 'Vintage' : 'Modern', esc(f ? f.pros : ''), esc(f ? f.cons : ''), esc(m.summary)]; };
      const ca = col(A), cb = col(B), rows = ['', 'Pen', 'Country', 'Made', 'Filling system', 'Nib', 'Era', 'Filling is good for', 'Filling is less good for', 'About'];
      $('#cmpOut').innerHTML = `<div class="cmp-wrap"><table class="cmp"><tbody>${rows.map((r, i) => i === 0 ? `<tr><td></td><td>${ca[0]}</td><td>${cb[0]}</td></tr>` : `<tr><th scope="row">${r}</th><td>${ca[i]}</td><td>${cb[i]}</td></tr>`).join('')}</tbody></table></div>`;
    };
    $('#cmpA').addEventListener('change', draw); $('#cmpB').addEventListener('change', draw);
    show('detail', 'models', 'Compare two pens'); draw();
  }

  /* --- which pen suits you --- */
  const QUIZ = [
    { q: 'What budget feels right?', key: 'budget', w: 2, a: [['low', 'Small, an everyday pen'], ['mid', 'Medium'], ['high', 'Large, a pen for life']] },
    { q: 'Where will you mostly write?', key: 'use', w: 3, a: [['school', 'School or study'], ['daily', 'Work and daily notes'], ['travel', 'On the go'], ['calligraphy', 'Lettering and calligraphy'], ['collect', 'Collecting and display']] },
    { q: 'How do you feel about filling and cleaning?', key: 'care', w: 2, a: [['easy', 'Keep it simple'], ['hands', 'I enjoy it']] },
    { q: 'Which look do you like?', key: 'look', w: 2, a: [['modern', 'Modern'], ['classic', 'Classic'], ['vintage', 'Vintage']] },
    { q: 'How should the writing feel?', key: 'feel', w: 2, a: [['smooth', 'Smooth and precise'], ['wet', 'Wet and rich'], ['flex', 'Expressive, thick and thin']] },
  ];
  const PROFILES = {
    'lamy-safari': { budget: ['low'], use: ['school', 'daily'], care: ['easy'], look: ['modern'], feel: ['smooth'] },
    'twsbi-eco': { budget: ['low'], use: ['daily', 'school'], care: ['hands'], look: ['modern'], feel: ['wet'] },
    'kaweco-sport': { budget: ['low', 'mid'], use: ['travel'], care: ['easy'], look: ['modern', 'classic'], feel: ['smooth'] },
    'pelikan-m800': { budget: ['high'], use: ['daily', 'collect'], care: ['hands'], look: ['classic'], feel: ['wet', 'smooth'] },
    'montblanc-149': { budget: ['high'], use: ['collect', 'daily'], care: ['hands'], look: ['classic'], feel: ['wet'] },
    'pilot-custom-823': { budget: ['mid', 'high'], use: ['daily'], care: ['hands'], look: ['classic', 'modern'], feel: ['smooth'] },
    'parker-51': { budget: ['mid'], use: ['collect', 'daily'], care: ['hands'], look: ['vintage', 'classic'], feel: ['smooth'] },
    'parker-vacumatic': { budget: ['mid'], use: ['collect'], care: ['hands'], look: ['vintage'], feel: ['wet'] },
    'esterbrook-j': { budget: ['low', 'mid'], use: ['calligraphy', 'collect'], care: ['hands'], look: ['vintage'], feel: ['flex', 'smooth'] },
    'sailor-pro-gear': { budget: ['mid'], use: ['daily'], care: ['hands', 'easy'], look: ['classic'], feel: ['smooth'] },
    'lamy-2000': { budget: ['mid'], use: ['daily', 'school'], care: ['hands'], look: ['modern'], feel: ['smooth'] },
    'wingsung-601': { budget: ['low'], use: ['collect', 'school'], care: ['hands'], look: ['vintage'], feel: ['smooth'] },
  };
  function renderQuiz() {
    const ans = {}; let i = 0;
    const host = () => $('#quizBody');
    const ask = () => {
      const q = QUIZ[i];
      host().innerHTML = `<p class="muted small" aria-live="polite">Question ${i + 1} of ${QUIZ.length}</p><h2 style="margin:6px 0 14px">${esc(q.q)}</h2>
        <div class="quiz-opts">${q.a.map(([k, n]) => `<button type="button" class="chip" data-qa="${k}">${esc(n)}</button>`).join('')}</div>
        ${i ? '<p style="margin-top:14px"><button type="button" class="btn" data-qback>Back</button></p>' : ''}`;
    };
    const result = () => {
      const scored = Object.keys(PROFILES).filter((id) => BY.model[id]).map((id) => {
        const pr = PROFILES[id]; let sc = 0;
        QUIZ.forEach((q) => { if (pr[q.key].includes(ans[q.key])) sc += q.w; });
        return [sc, id];
      }).sort((x, y) => y[0] - x[0]).slice(0, 3);
      const max = QUIZ.reduce((t, q) => t + q.w, 0);
      host().innerHTML = `<h2 style="margin-bottom:6px">Your pens</h2><p class="muted" style="margin-bottom:14px">A fun guide, not buying advice. Open a pen to see how it fills.</p>
        <div class="grid">${scored.map(([sc, id]) => `<div>${modelCard(BY.model[id])}<p class="muted small" style="margin-top:6px">Match: ${Math.round((sc / max) * 100)}%</p></div>`).join('')}</div>
        <p style="margin-top:16px"><button type="button" class="btn" data-qrestart>Start again</button></p>`;
      hydrateCards(host());
    };
    $('#viewDetail').innerHTML = `${backLink('#home', 'Home')}<h1 class="dt-title">Which pen suits you?</h1><div id="quizBody" class="quiz"></div>`;
    show('detail', 'home', 'Which pen suits you?'); ask();
    host().addEventListener('click', (e) => {
      const a = e.target.closest('[data-qa]');
      if (a) { ans[QUIZ[i].key] = a.dataset.qa; i++; if (i < QUIZ.length) ask(); else result(); return; }
      if (e.target.closest('[data-qback]')) { i = Math.max(0, i - 1); ask(); }
      if (e.target.closest('[data-qrestart]')) { i = 0; ask(); }
    });
  }

  /* --- glossary --- */
  function renderGlossary(arg) {
    const list = D.glossary.slice().sort((x, y) => x.term.localeCompare(y.term));
    $('#viewDetail').innerHTML = `${backLink('#history', 'History')}<h1 class="dt-title">Pen words</h1><p class="muted" style="margin:6px 0 14px">Short explanations of the terms you will meet.</p>
      <div class="filters"><label class="sr" for="glQ">Filter words</label><input id="glQ" class="chip" type="search" placeholder="Filter words" autocomplete="off"></div>
      <dl class="gloss" id="glList"></dl>`;
    const draw = (q) => {
      const t = (q || '').toLowerCase();
      $('#glList').innerHTML = list.filter((g) => !t || (g.term + ' ' + g.def).toLowerCase().includes(t)).map((g) => `
        <div class="gl" id="g-${slug(g.term)}"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}
          <span class="gl-links">${g.see ? `<a href="${esc(g.see[0])}">${esc(g.see[1])}</a>` : ''}<a href="${esc(wikiSearch(g.term))}" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a></span></dd></div>`).join('') || empty('No words match');
    };
    draw(''); $('#glQ').addEventListener('input', (e) => draw(e.target.value));
    show('detail', 'history', 'Pen words');
    if (arg) { const el = document.getElementById('g-' + slug(arg)); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); } }
  }

  /* --- India story --- */
  function renderIndia() {
    const B = (id, label) => BY.brand[id] ? `<a href="#brand=${id}">${esc(label || BY.brand[id].name)}</a>` : esc(label || id);
    const sec = (t, body) => `<section class="story"><h2 class="sec-title">${esc(t)}</h2>${body}</section>`;
    $('#viewDetail').innerHTML = `${backLink('#history', 'History')}
      <h1 class="dt-title">Fountain pens in India</h1>
      <p class="lead" style="margin-top:8px">From imported pens to swadeshi workshops, price controls and a small but loyal market today.</p>
      ${sec('Imports first', `<p>Early fountain pens in India were imported. Parker, Sheaffer, Waterman, Swan, Blackbird and Pilot were popular names. Local work began early: ${B('luxmy-stylo', 'Luxmy Stylo Pen Works')} in Varanasi is dated to 1907 by one history, and ${B('deccan-pen-stores')} opened in Hyderabad in 1918.</p>`)}
      ${sec('Swadeshi pens', `<p>In 1932 the brothers Kosuri Venkata Ratnam and Satyanarayana set up ${B('ratnam-pen-works')} in Rajahmundry. Gandhi rejected their first ebonite pen as not swadeshi enough, and thanked them for a second pen sent in 1935. ${B('gem-gama')} in Chennai later made the Gama brand, and ${B('hilal-sultan', 'Hilal')} started Sultan in Hyderabad in 1952.</p>`)}
      ${sec('Ink and nibs', `<p>Krishnaveni Inks in Madras (1920) was the first commercial fountain pen ink factory in India. ${B('camlin')} (1931) and Sulekha (1934) followed. Nib making centred on Sattur in Tamil Nadu, with about 250 enterprises in the 1960s and 53 units counted in a 2013 study.</p>`)}
      ${sec('Licences, rules and closures', `<p>${B('rightaids', 'Rightaids')} in Bangalore started in 1951 under a Waterman licence, and Pilot’s Indian company was incorporated in 1952. ${B('chelpark')} took over Parker’s Indian arm in 1943. Fountain pens were reserved for small-scale production from 1967, and import restrictions were lifted only in April 2001. After 1991 several domestic makers closed.</p>`)}
      ${sec('Today', `<p>Fountain pens are about a tenth of the writing instrument market. Indian brands such as Mohi, Click, Kanwrite, Lotus, Ranga and Rytol sell mostly at lower prices, while ${B('wality')} has been in business since the mid-20th century. Makers face weak distribution, a reliance on ebonite and imported parts such as nibs and acrylic.</p>`)}
      <p class="muted small" style="margin-top:16px">Main source: <a href="https://www.orfonline.org/research/a-fountain-pen-story-68679" target="_blank" rel="noopener noreferrer">ORF, A Fountain Pen Story ↗</a>. Dates for some early makers are approximate and carry a “needs checking” tag on their pages.</p>
      <p style="margin-top:12px"><a class="btn primary" href="#brands" id="indiaBrands">${ICON('brand')}See Indian brands</a></p>`;
    $('#indiaBrands').addEventListener('click', () => { bf.country = 'IN'; });
    show('detail', 'history', 'Fountain pens in India');
  }

  /* --- nib guide with live stroke samples --- */
  const NIB_TEXT = {
    fine: ['Fine', 'A thin line. Good for small handwriting, notes and margins. Shows little shading.'],
    medium: ['Medium', 'A balanced line for everyday writing. Forgiving on most paper.'],
    broad: ['Broad', 'A wide, wet line that shows off ink colour, shading and sheen.'],
    italic: ['Italic', 'A flat edge. Downstrokes are thick and crossstrokes thin, which gives a calligraphic look.'],
    flex: ['Flex', 'A soft nib that spreads under pressure for thick and thin lines. Needs a light touch.'],
  };
  function nibSample(cv, kind) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = 300, H = 90;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = '100%'; cv.style.maxWidth = W + 'px'; cv.style.aspectRatio = W + '/' + H;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const ink = getComputedStyle(root).getPropertyValue('--ink-blue').trim() || '#2548b4';
    c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round';
    const base = { fine: 1.3, medium: 2.4, broad: 4.2, italic: 5, flex: 1.6 }[kind];
    let px = null, py = null;
    for (let t = 0; t <= 4.6; t += 0.005) {
      const x = 14 + t * 58 + 13 * Math.sin(t * 2 * Math.PI), y = 46 - 26 * Math.cos(t * 2 * Math.PI) * (0.55 + 0.45 * Math.sin(t * 1.3));
      if (px !== null) {
        const dx = x - px, dy = y - py;
        if (kind === 'italic') { const a = (40 * Math.PI) / 180, L = base * 1.25; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - Math.cos(a) * L, y + Math.sin(a) * L); c.lineTo(x + Math.cos(a) * L, y - Math.sin(a) * L); c.stroke(); }
        else { const w = kind === 'flex' ? base + Math.max(0, dy) * 3.4 : base; c.lineWidth = w; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); }
      }
      px = x; py = y;
    }
  }
  function renderNibs() {
    $('#viewDetail').innerHTML = `${backLink('#write', 'Write')}<h1 class="dt-title">Nib guide</h1><p class="muted" style="margin:6px 0 16px">The same hand movement, drawn with five nib types.</p>
      <div class="grid nibgrid">${Object.keys(NIB_TEXT).map((k) => `<article class="card-item nibcard"><h3 class="ci-name">${NIB_TEXT[k][0]}</h3><canvas data-nib="${k}" role="img" aria-label="${NIB_TEXT[k][0]} nib sample"></canvas><p class="ci-sum">${esc(NIB_TEXT[k][1])}</p><p><button type="button" class="btn" data-trynib="${k}">${ICON('edit')}Try it on the pad</button></p></article>`).join('')}</div>`;
    show('detail', 'write', 'Nib guide');
    $$('canvas[data-nib]').forEach((cv) => nibSample(cv, cv.dataset.nib));
    $$('[data-trynib]').forEach((b) => b.addEventListener('click', () => {
      const cur = store.get('write-settings', {}) || {}; store.set('write-settings', Object.assign({}, cur, { nib: b.dataset.trynib })); location.hash = '#write';
    }));
  }

  /* ======================= 12. History ======================= */
  const TAGS = [['all', 'All'], ['invention', 'Inventions'], ['filler', 'Filling systems'], ['model', 'Models'], ['brand', 'Brands'], ['writing', 'Writing']];
  let tlTag = 'all';
  function renderHistory(tab) {
    $('#tabTl').setAttribute('aria-selected', String(tab === 'tl')); $('#tabMe').setAttribute('aria-selected', String(tab === 'me'));
    $('#tlPane').hidden = tab !== 'tl'; $('#mePane').hidden = tab !== 'me';
    if (tab === 'tl') drawTimeline(); else drawMethods();
    show('history', 'history', tab === 'tl' ? 'History timeline' : 'Old writing methods');
    if (tab === 'tl') observeTimeline();
  }
  function drawTimeline() {
    const l = D.timeline.filter((t) => tlTag === 'all' || t.tags.includes(tlTag));
    $('#tlPane').innerHTML = `
      <div class="filters" role="group" aria-label="Filter timeline"><div class="grp">${TAGS.map(([k, n]) => `<button class="chip" type="button" data-tl="${k}" aria-pressed="${tlTag === k}">${n}</button>`).join('')}</div></div>
      <ol class="tl" style="list-style:none;margin-left:0">${l.map((t) => `
        <li class="tl-item"><div class="tl-year">${esc(yr(t.year))}${t.circa ? '<small>approx.</small>' : ''}${t.verify ? WARN_TAG : ''}</div>
          <div class="tl-body"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>
          <div class="tl-tags">${t.tags.map((g) => `<span class="tag gone">${esc(g)}</span>`).join('')}${(t.sources || []).slice(0, 1).map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">source ↗</a>`).join('')}</div></div></li>`).join('')}</ol>`;
  }
  function observeTimeline() {
    const items = $$('.tl-item');
    if (!('IntersectionObserver' in window) || reduceMotion()) { items.forEach((i) => i.classList.add('in')); return; }
    tlObserver = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); tlObserver.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach((i) => tlObserver.observe(i));
  }
  function drawMethods() {
    $('#mePane').innerHTML = `<p class="muted" style="margin-bottom:14px">People have written with many tools over five thousand years. Open any method to see how it worked.</p>` + D.methods.map((m) => `
      <details class="method"${m.id === 'palm-leaf' ? ' open' : ''}>
        <summary><div><h3>${esc(m.name)}</h3><span>${esc(m.region)} · ${esc(m.eraText)}</span></div>${ICON('chev')}</summary>
        <div class="m-body"><p>${esc(m.how)}</p>
          <dl><dt>Tool</dt><dd>${esc(m.tool)}</dd><dt>Surface</dt><dd>${esc(m.surface)}</dd></dl>
          ${m.verify ? WARN_TAG : ''}
          <div class="tl-tags">${(m.sources || []).map((s) => `<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)} ↗</a>`).join('')}${m.id === 'palm-leaf' ? '<a class="btn" href="#write">' + ICON('edit') + 'Try it on the writing pad</a>' : ''}</div>
        </div>
      </details>`).join('');
  }

  /* ======================= 13. Write ======================= */
  function renderWrite() {
    show('write', 'write', 'Write');
    pad = window.ILWrite.mount($('#writeHost'), { toast });
  }

  /* ======================= 14. Saved ======================= */
  function renderSaved() {
    const bs = saved.filter((k) => k.startsWith('brand:')).map((k) => BY.brand[k.slice(6)]).filter(Boolean);
    const ms = saved.filter((k) => k.startsWith('model:')).map((k) => BY.model[k.slice(6)]).filter(Boolean);
    $('#savedBody').innerHTML = !bs.length && !ms.length
      ? empty('Nothing saved yet', 'Tap the star on any brand or model to keep it here.')
      : (bs.length ? `<h2 class="sec-title">Brands</h2><div class="grid">${bs.map(brandCard).join('')}</div>` : '') +
        (ms.length ? `<h2 class="sec-title">Models</h2><div class="grid">${ms.map(modelCard).join('')}</div>` : '');
    show('saved', '', 'Saved');
    hydrateCards($('#savedBody'));
  }

  /* ======================= 15. Search ======================= */
  function renderSearch(q) {
    q = (q || '').trim();
    $('#q').value = q;
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (hay) => toks.every((t) => hay.includes(t));
    const sc = (name, hay) => (toks.every((t) => name.toLowerCase().includes(t)) ? 0 : 1) + (hit(hay) ? 0 : 99);
    const B = D.brands.map((b) => [sc(b.name, [b.name, b.country, b.city, b.summary, b.cc].join(' ').toLowerCase()), b]).filter((x) => x[0] < 99).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const M = D.models.map((m) => [sc(m.name, [m.name, brandName(m.brandId), m.summary, fillerName(m.filler), m.nib || ''].join(' ').toLowerCase()), m]).filter((x) => x[0] < 99).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const F = D.fillers.filter((f) => hit([f.name, f.howItWorks].join(' ').toLowerCase()));
    const T = D.timeline.filter((t) => hit([t.title, t.text, t.year].join(' ').toLowerCase()));
    const ME = D.methods.filter((m) => hit([m.name, m.region, m.how, m.tool].join(' ').toLowerCase()));
    const G = D.glossary.filter((g) => hit([g.term, g.def].join(' ').toLowerCase()));
    const total = B.length + M.length + F.length + T.length + ME.length + G.length;
    $('#searchTitle').textContent = q ? `“${q}”` : 'Search';
    $('#searchSub').textContent = q ? `${total} result${total === 1 ? '' : 's'}` : 'Type a brand, a model, a mechanism or a year.';
    $('#searchBody').innerHTML = !q ? '' : !total ? empty('Nothing found', 'Try a shorter word, like “parker”, “piston” or “1921”.') :
      (B.length ? `<h2 class="sec-title">Brands (${B.length})</h2><div class="grid">${B.map(brandCard).join('')}</div>` : '') +
      (M.length ? `<h2 class="sec-title">Models (${M.length})</h2><div class="grid">${M.map(modelCard).join('')}</div>` : '') +
      (F.length ? `<h2 class="sec-title">Filling systems (${F.length})</h2><div class="mini-list">${F.map((f) => `<a class="mini" href="#filler=${esc(f.id)}"><b>${esc(f.name)}</b><span>${esc(f.howItWorks.slice(0, 90))}…</span></a>`).join('')}</div>` : '') +
      (T.length ? `<h2 class="sec-title">History (${T.length})</h2><div class="mini-list">${T.map((t) => `<a class="mini" href="#history"><b>${esc(yr(t.year))}</b><span>${esc(t.title)}</span></a>`).join('')}</div>` : '') +
      (G.length ? `<h2 class="sec-title">Pen words (${G.length})</h2><div class="mini-list">${G.map((g) => `<a class="mini" href="#glossary=${encodeURIComponent(g.term)}"><b>${esc(g.term)}</b><span>${esc(g.def.slice(0, 80))}…</span></a>`).join('')}</div>` : '') +
      (ME.length ? `<h2 class="sec-title">Old writing methods (${ME.length})</h2><div class="mini-list">${ME.map((m) => `<a class="mini" href="#methods"><b>${esc(m.name)}</b><span>${esc(m.region)}</span></a>`).join('')}</div>` : '');
    show('search', '', q ? 'Search: ' + q : 'Search');
    hydrateCards($('#searchBody'));
  }

  /* ======================= 16. Modals and popovers ======================= */
  let lastFocus = null;
  const modals = ['helpModal', 'aboutModal'];
  function openModal(id) {
    closePops(); modals.forEach((m) => { if (m !== id) $('#' + m).hidden = true; });
    lastFocus = document.activeElement; const el = $('#' + id); el.hidden = false;
    const c = $('[data-close]', el); if (c) c.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    const el = $('#' + id); if (!el || el.hidden) return; el.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  const openModalId = () => modals.find((m) => !$('#' + m).hidden);
  function trapFocus(ev) {
    const id = openModalId(); if (!id || ev.key !== 'Tab') return;
    const f = $$('button, a[href], input, select, [tabindex]:not([tabindex="-1"])', $('#' + id)).filter((e) => !e.disabled && e.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
  function closePops() {
    ['layoutMenu', 'paletteMenu'].forEach((id) => { const m = $('#' + id); if (m && !m.hidden) { m.hidden = true; } });
    $('#layoutBtn').setAttribute('aria-expanded', 'false'); $('#paletteBtn').setAttribute('aria-expanded', 'false');
  }
  function togglePop(menuId, btnId) {
    const m = $('#' + menuId), open = m.hidden;
    closePops(); m.hidden = !open; $('#' + btnId).setAttribute('aria-expanded', String(open));
  }

  /* ======================= 17. Help and tour ======================= */
  const HELP = [
    { id: 'nav', sec: 'Start', title: 'Six sections', icon: 'home', text: 'Use the tabs to move between Home, Brands, Models, Animated explanations, History and Write. On a phone they sit along the bottom.', target: '#nav' },
    { id: 'search', sec: 'Start', title: 'Search', icon: 'search', text: 'Type a brand, a model, a filling system or a year and press Enter. Press / to jump to the search box.', target: '#searchForm' },
    { id: 'bgm', sec: 'Top bar', title: 'Background music', icon: 'play', text: 'The round button at the bottom corner plays calm Egyptian-style ambience: a drone, plucked strings, soft drum and chimes. Press it to start, press again to pause, and slide to set the volume. The keyboard shortcut is M. The music is made on your device, so it works offline and never starts by itself.', target: '#bgmBtn' },
    { id: 'about', sec: 'Top bar', title: 'About and credits', icon: 'pen', text: 'Tap the Inkora logo to see who made the app, where the information comes from, and how many records are loaded.', target: '#brandBtn' },
    { id: 'saved', sec: 'Top bar', title: 'Saved', icon: 'star', text: 'The star opens your saved brands and models. Tap a star on any card to keep it. Saved items stay on this device.', target: '#savedBtn' },
    { id: 'help', sec: 'Top bar', title: 'How to use', icon: 'help', text: 'This guide. “Show me” highlights a control in the real app, and the one-minute tour walks through the essentials.', target: '#helpBtn' },
    { id: 'layout', sec: 'Top bar', title: 'Optimise layout', icon: 'layout', text: 'Choose Auto (fits your screen), Mobile (one column and a bottom bar), Tab (bigger touch targets) or Web (wide grid and side panels). A small “A” on the button means Auto is on.', target: '#layoutBtn' },
    { id: 'palette', sec: 'Top bar', title: 'Light, dark and ink colour', icon: 'palette', text: 'Pick Auto, Light (papyrus) or Dark (lapis night), and choose a pigment that tints the whole app: Gold, Carnelian, Malachite, Ochre, Lapis, Faience, Sunset or Papyrus.', target: '#paletteBtn' },
    { id: 'reading', sec: 'Top bar', title: 'Large text and high contrast', icon: 'palette', text: 'Open the colour button and look under Reading. Choose Large text for bigger content, or switch on High contrast for stronger lines and text.', target: '#textSeg', prep: () => { const b = $('#paletteBtn'); if (b && $('#paletteMenu').hidden) b.click(); } },
    { id: 'theme', sec: 'Top bar', title: 'Quick light or dark switch', icon: 'moon', text: 'One tap flips between light and dark. On the Mobile layout use the colour menu instead.', target: '#themeBtn', when: () => !isMobile() },
    { id: 'install', sec: 'Top bar', title: 'Install the app', icon: 'download', text: 'When your browser offers it, this button installs Inkora like an app. It then works offline.', target: '#installBtn', optional: true },
    { id: 'brandFilters', sec: 'Brands and models', title: 'Filter brands', icon: 'brand', text: 'Narrow the list by country or by active and closed makers, and sort by name or age.', target: '#brandFilters', hash: '#brands' },
    { id: 'star', sec: 'Brands and models', title: 'Save with the star', icon: 'star', text: 'Tap the star on a card to save it.', target: '.star-btn', hash: '#brands' },
    { id: 'modelFilters', sec: 'Brands and models', title: 'Filter models', icon: 'pen', text: 'Filter by filling system, show only vintage pens, pick an era (such as before 1920) or choose one brand. Open any model to see how it fills.', target: '#modelFilters', hash: '#models' },
    { id: 'credit', sec: 'Brands and models', title: 'Photos and image credit', icon: 'image', text: 'Open a brand or model to see a photo from Wikimedia, when a free-licence one exists. Tap the small i button at the photo’s top right to show the author, licence and the credit URL. Photos need an internet connection.', target: '.photo-i', hash: '#brand=parker', optional: true },
    { id: 'warn', sec: 'Brands and models', title: '“Needs checking” tag', icon: 'help', text: 'Records with this tag have details that are less certain. Please confirm them with the maker or a pen-history reference.', target: '.tag.warn', hash: '#models', optional: true },
    { id: 'animGrid', sec: 'Animations', title: 'Animated explanations', icon: 'play', text: 'Twelve animations: how a nib writes, and how each filling system works, from the eyedropper to the cartridge.', target: '#animGrid', hash: '#animate' },
    { id: 'plControls', sec: 'Animations', title: 'Player controls', icon: 'play', text: 'Play, pause, step forwards and back, restart, and change the speed. Animations pause on their own when you scroll away.', target: '.pl-controls', hash: '#filler=piston' },
    { id: 'plSteps', sec: 'Animations', title: 'Steps and captions', icon: 'check', text: 'Every step is written out. Tap a step to jump to it.', target: '.pl-steps', hash: '#filler=piston' },
    { id: 'tl', sec: 'History', title: 'Timeline', icon: 'clock', text: 'A timeline from reed pens to the modern fountain pen. Use the chips to focus on inventions, filling systems, models, brands or writing.', target: '#tlPane', hash: '#history' },
    { id: 'methods', sec: 'History', title: 'Old writing methods', icon: 'leaf', text: 'Clay, reeds, wax tablets, brushes, palm leaves, birch bark and quills. Open any method to see how it worked.', target: '#tabMe', hash: '#history' },
    { id: 'wpStage', sec: 'Write', title: 'Writing pad', icon: 'edit', text: 'Write with a finger, a pen or a mouse. Ink looks wet at first and dries in a couple of seconds.', target: '#wpStage', hash: '#write' },
    { id: 'wpBar', sec: 'Write', title: 'Surface, nib and ink', icon: 'edit', text: 'Choose paper, a fresh leaf or a palm leaf. Pick a fine, medium, broad, italic or flex nib, an ink colour and a size.', target: '.wp-bar', hash: '#write' },
    { id: 'wpRub', sec: 'Write', title: 'Rub soot on a palm leaf', icon: 'flask', text: 'On the palm leaf you scratch letters with a stylus. Rub soot smears lamp-black over the leaf and wipes it off, so the letters turn dark, just like old manuscripts.', target: '#wpRub', hash: '#write', prep: () => { const b = $('[data-surface="palm"]'); if (b) b.click(); } },
    { id: 'wpSave', sec: 'Write', title: 'Save as PNG', icon: 'image', text: 'Save your writing as an image. Use Undo to remove the last stroke and Clear to start again.', target: '#wpSave', hash: '#write' },
    { id: 'tilesMore', sec: 'More tools', title: 'Compare, quiz, words and the India story', icon: 'layout', text: 'On Home you will find Pens in India, Compare two pens, Which pen suits you?, the Nib guide and Pen words, a short glossary. Search finds glossary words too.', target: '[href="#quiz"]', hash: '#home' },
    { id: 'copy', sec: 'More tools', title: 'Copy a link', icon: 'share', text: 'The small share button on every brand and model card copies a link to that page.', target: '.link-btn', hash: '#brands' },
    { id: 'strip', sec: 'More tools', title: 'Brand timeline strip', icon: 'clock', text: 'The strip above the brand cards places every maker on a line by the year it began. Scroll sideways and tap a name to open it.', target: '.bstrip', hash: '#brands' },
    { id: 'tips', sec: 'Tips', title: 'Works offline', icon: 'download', text: 'After the first visit the app and all its data are stored on your device. Press Esc to close any window.', target: null },
  ];
  const TOUR = ['nav', 'search', 'brandFilters', 'animGrid', 'plControls', 'wpStage', 'layout', 'palette'];
  const itemById = (id) => HELP.find((h) => h.id === id);

  function renderHelp() {
    const secs = [...new Set(HELP.map((h) => h.sec))];
    $('#helpBody').innerHTML = `<p class="muted">Inkora is a friendly guide to fountain pens. Here is what every button does.</p>
      <p><button class="btn primary" type="button" data-tour>${ICON('play')}Take the 1-minute tour</button></p>` +
      secs.map((s) => `<section class="help-sec"><h3>${esc(s)}</h3>${HELP.filter((h) => h.sec === s && (!h.when || h.when())).map((h) => `
        <div class="help-item"><span class="help-ico">${ICON(h.icon)}</span><div><b>${esc(h.title)}</b><span>${esc(h.text)}</span></div>
        ${h.target ? `<button class="btn" type="button" data-show="${h.id}">Show me</button>` : '<span></span>'}</div>`).join('')}</section>`).join('');
  }
  function openHelp(scroll) {
    renderHelp(); openModal('helpModal'); store.set('seen-help', true); $('#helpBtn').classList.remove('pulse');
    if (scroll) $('#helpBody').scrollTop = scroll;
  }

  /* spotlight */
  let spot = { items: [], i: 0, mode: 'show', scroll: 0 };
  async function prepare(item) {
    if (item.hash) await goTo(item.hash);
    if (item.prep) { item.prep(); await wait(60); }
    await wait(80);
  }
  function findTarget(item) {
    if (!item.target) return null;
    return $$(item.target).find((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed') || null;
  }
  async function spotGo(i) {
    spot.i = i;
    const item = spot.items[i];
    $('#spot').hidden = false; $('#spot').style.visibility = 'hidden';
    await prepare(item);
    const el = findTarget(item);
    if (el) { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); await wait(60); }
    $('#spotStep').textContent = spot.mode === 'tour' ? `Step ${i + 1} of ${spot.items.length}` : 'Show me';
    $('#spotTitle').textContent = item.title;
    $('#spotText').textContent = el || !item.target ? item.text : item.text + ' (This control is not visible in the current layout.)';
    const last = i === spot.items.length - 1;
    $('#spotActions').innerHTML = spot.mode === 'tour'
      ? `<button class="btn" type="button" data-spot="end">Skip</button>${i > 0 ? '<button class="btn" type="button" data-spot="prev">Back</button>' : ''}<button class="btn primary" type="button" data-spot="${last ? 'end' : 'next'}">${last ? 'Finish' : 'Next'}</button>`
      : `<button class="btn" type="button" data-spot="back">Back to guide</button><button class="btn primary" type="button" data-spot="end">Done</button>`;
    placeSpot(el);
    $('#spot').style.visibility = 'visible';
    const p = $('#spotActions .primary'); if (p) p.focus({ preventScroll: true });
  }
  function placeSpot(el) {
    const hole = $('#spotHole'), tip = $('#spotTip'), vw = innerWidth, vh = innerHeight;
    if (el) {
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    } else { Object.assign(hole.style, { display: 'block', left: vw / 2 + 'px', top: vh / 2 + 'px', width: '0px', height: '0px' }); }
    const tw = Math.min(340, vw - 24);
    tip.style.width = tw + 'px';
    const th = tip.offsetHeight;
    let left, top;
    if (el) {
      const r = el.getBoundingClientRect();
      left = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), vw - tw - 12);
      top = r.bottom + 16 + th <= vh - 8 ? r.bottom + 16 : (r.top - 16 - th >= 8 ? r.top - 16 - th : Math.max(8, vh - th - 12));
    } else { left = (vw - tw) / 2; top = Math.max(12, (vh - th) / 2); }
    tip.style.left = left + 'px'; tip.style.top = Math.min(Math.max(8, top), Math.max(8, vh - th - 8)) + 'px';
  }
  function endSpot() { $('#spot').hidden = true; document.body.style.overflow = ''; }
  function startShow(id) {
    const item = itemById(id); if (!item) return;
    const sc = $('#helpBody').scrollTop;
    spot = { items: [item], i: 0, mode: 'show', scroll: sc };
    closeModal('helpModal'); spotGo(0);
  }
  function startTour() {
    const items = TOUR.map(itemById).filter((h) => h && (!h.when || h.when()));
    spot = { items, i: 0, mode: 'tour', scroll: 0 };
    closeModal('helpModal'); spotGo(0);
  }

  /* ======================= 18. About ======================= */
  function renderAbout() {
    const installed = (matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? 'Installed app' : 'Web page';
    $('#aboutBody').innerHTML = `
      <div class="about-hero"><span class="logo">${ICON('pen')}</span><div><h3 style="font-size:30px">Inkora</h3><p class="muted">The world of fountain pens</p><p>Created by <b>SSK-BLUM</b></p></div></div>
      <div class="about-grid">
        <div class="stat"><b>${D.brands.length}</b><span>brands</span></div><div class="stat"><b>${D.models.length}</b><span>models</span></div>
        <div class="stat"><b>${countries().length}</b><span>countries</span></div><div class="stat"><b>${D.fillers.length}</b><span>filling systems</span></div>
        <div class="stat"><b>${D.timeline.length}</b><span>timeline events</span></div><div class="stat"><b>${D.methods.length}</b><span>writing methods</span></div>
      </div>
      <div class="facts"><dl>
        <div class="row"><dt>Version</dt><dd>${VERSION}</dd></div>
        <div class="row"><dt>Layout</dt><dd>${esc(layoutNow)}${layoutPref === 'auto' ? ' (auto)' : ''}</dd></div>
        <div class="row"><dt>Running as</dt><dd>${installed}</dd></div>
      </dl></div>
      <ul class="about-list">
        <li><b>Where the facts come from.</b> Each record links to a public reference, mostly Wikipedia articles. Records marked “needs checking” are less certain. Please verify details with the maker before relying on them.</li>
        <li><b>Photos.</b> Brand and model photos are looked up on Wikipedia and Wikimedia Commons when you view them, and only free-licence photos are used. Tap the i button on a photo to see the author, licence and the Commons page. If there is no free photo, none is shown.</li>
        <li><b>No logos.</b> Logos are never shown. Pens and mechanisms are drawn in code as simple illustrations. Brand names are shown as text only and belong to their owners; Inkora is not affiliated with any maker.</li>
        <li><b>Private.</b> No accounts, no tracking. Your saved items and settings stay on this device.</li>
        <li><b>Music.</b> The background music is generated in your browser with Web Audio. It is original, uses no audio files and only plays when you press the button.</li>
        <li><b>Fonts.</b> Cinzel and Alegreya Sans from Google Fonts. The look is inspired by ancient Egyptian art: lapis, gold and papyrus.</li>
      </ul>`;
  }

  /* ======================= 19. PWA and boot ======================= */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('#installBtn').hidden = false; measureTop(); });
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; deferredInstall = null; toast('Inkora is installed'); });
  function registerSW() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  function bind() {
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      const pi = t.closest('.photo-i');
      if (pi) { const pc = $('.photo-credit', pi.parentNode), open = pc.hidden; pc.hidden = !open; pi.setAttribute('aria-expanded', String(open)); return; }
      $$('.photo-credit:not([hidden])').forEach((pc) => { if (!pc.contains(t)) { pc.hidden = true; $('.photo-i', pc.parentNode).setAttribute('aria-expanded', 'false'); } });
      const bc = t.closest('[data-bc]'); if (bc) { bf.country = bc.dataset.bc; renderBrands(); return; }
      const bs = t.closest('[data-bs]'); if (bs) { bf.status = bs.dataset.bs; renderBrands(); return; }
      const mfb = t.closest('[data-mf]'); if (mfb) { mf.filler = mfb.dataset.mf; renderModels(); return; }
      const mv = t.closest('[data-mv]'); if (mv) { mf.vintage = !mf.vintage; renderModels(); return; }
      const tl = t.closest('[data-tl]'); if (tl) { tlTag = tl.dataset.tl; if (tlObserver) tlObserver.disconnect(); drawTimeline(); observeTimeline(); return; }
      const sv = t.closest('[data-save]'); if (sv) { ev.preventDefault(); toggleSaved(sv.dataset.save); return; }
      if (t.closest('[data-share]')) { shareCurrent(); return; }
      const cp = t.closest('[data-copy]'); if (cp) { ev.preventDefault(); copyLink(cp.dataset.copy); return; }
      const tab = t.closest('[data-tab]'); if (tab) { location.hash = tab.dataset.tab === 'tl' ? '#history' : '#methods'; return; }
      const sk = t.closest('#swatches [data-skin]'); if (sk) { setSkin(sk.dataset.skin); return; }
      const ts = t.closest('#textSeg [data-textsize]'); if (ts) { setTextSize(ts.dataset.textsize); return; }
      if (t.closest('#contrastBtn')) { setContrast(root.getAttribute('data-contrast') !== 'high'); return; }
      const th = t.closest('#themeSeg [data-theme]'); if (th) { setTheme(th.dataset.theme); return; }
      const lay = t.closest('#layoutMenu [data-layout]'); if (lay) { setLayout(lay.dataset.layout); closePops(); return; }
      const sh = t.closest('[data-show]'); if (sh) { startShow(sh.dataset.show); return; }
      if (t.closest('[data-tour]')) { startTour(); return; }
      const sp = t.closest('[data-spot]');
      if (sp) {
        const a = sp.dataset.spot;
        if (a === 'next') spotGo(spot.i + 1); else if (a === 'prev') spotGo(spot.i - 1);
        else if (a === 'back') { endSpot(); openHelp(spot.scroll); }
        else endSpot();
        return;
      }
      const cl = t.closest('[data-close]'); if (cl) { const m = cl.closest('.overlay'); if (m) closeModal(m.id); return; }
      if (t.classList.contains('overlay')) { closeModal(t.id); return; }
      if (!t.closest('.pop-wrap')) closePops();
    });
    $('#brandBtn').addEventListener('click', () => { renderAbout(); openModal('aboutModal'); });
    $('#helpBtn').addEventListener('click', () => openHelp());
    $('#savedBtn').addEventListener('click', () => { location.hash = '#saved'; });
    $('#layoutBtn').addEventListener('click', (e) => { e.stopPropagation(); togglePop('layoutMenu', 'layoutBtn'); });
    $('#paletteBtn').addEventListener('click', (e) => { e.stopPropagation(); togglePop('paletteMenu', 'paletteBtn'); });
    $('#themeBtn').addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
    $('#installBtn').addEventListener('click', async () => {
      if (!deferredInstall) { toast('Use your browser menu: Add to Home Screen'); return; }
      deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { /* ignore */ }
      deferredInstall = null; $('#installBtn').hidden = true;
    });
    $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#q').value.trim(); location.hash = q ? '#search=' + encodeURIComponent(q) : '#home'; $('#q').blur(); });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'bSort') { bf.sort = e.target.value; drawBrands(); }
      else if (e.target.id === 'mSort') { mf.sort = e.target.value; drawModels(); }
      else if (e.target.id === 'mEra') { mf.era = e.target.value; drawModels(); }
      else if (e.target.id === 'mBrand') { mf.brand = e.target.value; drawModels(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#spot').hidden) { if (spot.mode === 'show') { endSpot(); openHelp(spot.scroll); } else endSpot(); return; }
        const oc = $('.photo-credit:not([hidden])'); if (oc) { oc.hidden = true; const bt = $('.photo-i', oc.parentNode); bt.setAttribute('aria-expanded', 'false'); bt.focus(); return; }
        const m = openModalId(); if (m) { closeModal(m); return; }
        closePops();
      } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !openModalId()) { e.preventDefault(); $('#q').focus(); }
      else if (e.key === 'Tab') trapFocus(e);
    });
    window.addEventListener('hashchange', route);
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const n = resolveLayout(layoutPref); if (n !== layoutNow) applyLayout(); else measureTop(); if (!$('#spot').hidden) placeSpot(findTarget(spot.items[spot.i])); }, 120); });
    if ('ResizeObserver' in window) new ResizeObserver(measureTop).observe($('#top'));
  }

  async function copyLink(hash) {
    const url = location.href.split('#')[0] + hash;
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast('Copy the link from the address bar after opening it'); }
  }
  async function shareCurrent() {
    const url = location.href, title = document.title;
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast('Copy the link from the address bar'); }
  }

  async function boot() {
    buildSwatches(); syncTheme(); syncReading(); applyLayout(); syncSaved(); bind();
    if (!store.get('seen-help', false)) $('#helpBtn').classList.add('pulse');
    registerSW();
    if (window.ILBgm) window.ILBgm.mount($('#bgm'), { toast });
    try { await loadData(); }
    catch (e) {
      $('#loading').innerHTML = 'Could not load the pen data. Check your connection and <button class="btn" type="button" id="retry">try again</button>.';
      $('#retry').addEventListener('click', () => location.reload());
      return;
    }
    syncSaved(); route();
    /* test and console hook */
    window.Inkora = { D, route, goTo, get player() { return player; }, get pad() { return pad; }, VERSION };
  }
  boot();
})();
