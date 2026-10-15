// Inkora: download free-licence photos into photos/ with their credits.
// Run once on a computer with internet:  node tools/fetch-photos.mjs
// Needs Node 18+. No packages. Safe to re-run: existing photos are kept.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
const API = 'https://en.wikipedia.org/w/api.php';
const UA = { 'User-Agent': 'Inkora-photo-fetch/1.0 (hobby project by SSK-BLUM)' };
const STOP = new Set(['pen','pens','fountain','company','the','and','ltd','manufacturing','corporation','brand']);
const BAD = /logo|icon|flag|symbol|wordmark|signature|commons-|question|edit-|stub|ambox|disambig|map|diagram|patent|advert|poster/i;
const OKEXT = /\.(jpe?g|png)$/i;
const words = (t) => String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(w => (w.length>2||/^\d+$/.test(w)) && !STOP.has(w));
const plain = (h) => String(h||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/\s+/g,' ').trim();
const api = async (p) => { const r = await fetch(API+'?'+new URLSearchParams({format:'json',formatversion:'2',...p}),{headers:UA}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const exists = (f) => access(f).then(()=>true,()=>false);
const brands = JSON.parse(await readFile('data/brands.json','utf8'));
const models = JSON.parse(await readFile('data/models.json','utf8'));
const byBrand = Object.fromEntries(brands.map(b=>[b.id,b]));
let out = {}; try { out = JSON.parse(await readFile('photos/credits.json','utf8')); } catch {}
await mkdir('photos',{recursive:true});

async function find(kind, rec) {
  const brand = kind==='model' ? byBrand[rec.brandId] : rec;
  const bt = words(brand?.name), mt = kind==='model' ? words(rec.name) : [];
  const q = kind==='model' ? `${brand.name} ${rec.name} fountain pen` : `${rec.name} fountain pen`;
  const r = await api({action:'query',generator:'search',gsrsearch:q,gsrnamespace:'0',gsrlimit:'5',prop:'pageimages',piprop:'name',pilimit:'5'});
  const pages = (r.query?.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0));
  const page = pages.find(pg => { const tt = words(pg.title); return bt.some(w=>tt.includes(w)) && (kind==='brand'||!mt.length||mt.some(w=>tt.includes(w))); });
  if (!page) return null;
  let file = page.pageimage && OKEXT.test(page.pageimage) && !BAD.test(page.pageimage) ? page.pageimage : null;
  if (!file) {
    const r2 = await api({action:'query',prop:'images',titles:page.title,imlimit:'50'});
    const list = (r2.query?.pages?.[0]?.images||[]).map(i=>i.title.replace(/^File:/,''));
    const key = bt.concat(mt);
    file = list.find(n => OKEXT.test(n) && !BAD.test(n) && words(n).some(w=>key.includes(w))) || null;
  }
  if (!file) return null;
  const r3 = await api({action:'query',prop:'imageinfo',titles:'File:'+file,iiprop:'url|extmetadata|size',iiurlwidth:'800'});
  const ii = r3.query?.pages?.[0]?.imageinfo?.[0]; if (!ii) return null;
  const m = ii.extmetadata||{}, v = k => m[k]?.value||'';
  const lic = plain(v('LicenseShortName')) || plain(v('UsageTerms'));
  const free = /^(CC|public domain|PD|GFDL|attribution|FAL)/i.test(lic) && String(v('NonFree')).toLowerCase()!=='true';
  if (!free) return null;
  return { url: ii.thumburl||ii.url, w: ii.thumbwidth||ii.width, h: ii.thumbheight||ii.height, file,
    artist: plain(v('Artist'))||'Unknown author', credit: plain(v('Credit')), license: lic, licenseUrl: v('LicenseUrl'), descUrl: ii.descriptionurl,
    article: page.title, articleUrl: 'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_')) };
}

let ok=0, none=0, fail=0;
for (const [kind, list] of [['brand',brands],['model',models]]) {
  for (const rec of list) {
    const key = kind+':'+rec.id, path = `photos/${kind}-${rec.id}.jpg`;
    if (out[key] && await exists(path)) { ok++; continue; }
    try {
      const d = await find(kind, rec);
      if (!d) { none++; console.log('no free photo:', key); await sleep(300); continue; }
      const img = await fetch(d.url,{headers:UA}); if(!img.ok) throw new Error('image HTTP '+img.status);
      await writeFile(path, Buffer.from(await img.arrayBuffer()));
      const { url, ...rest } = d; out[key] = { ...rest, src: path }; ok++;
      console.log('saved', key, '-', d.license);
      await writeFile('photos/credits.json', JSON.stringify(out,null,1));
    } catch (e) { fail++; console.log('FAILED', key, e.message); }
    await sleep(500);
  }
}
await writeFile('photos/credits.json', JSON.stringify(out,null,1));
console.log(`\nDone. ${ok} photos, ${none} without a free photo, ${fail} failed (re-run to retry).`);
console.log('Now bump VERSION in sw.js, then commit the photos/ folder.');
