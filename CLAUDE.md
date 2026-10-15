# CLAUDE.md: Inkora

Short rules for coding agents working in this repository. When they exist, read [PROJECT.md](PROJECT.md) for how everything works and [README.md](README.md) for the user-facing overview.

*Created by **SSK-BLUM**.* Keep this credit in the About window, the README and the LICENSE.

> **Status: v1.5 built.** See [PROJECT.md](PROJECT.md) for the working app. Keep this file in line with the real repository.

## What this is

Inkora is a static, installable web app (PWA) about **fountain pens**:

- **Brands:** fountain-pen makers worldwide, both current and defunct. Filter by country, era and status.
- **Models:** famous and vintage pens, with years, filling system, nib and notes.
- **Filling methods:** old and modern mechanisms, each with an **animated explanation**. Examples: eyedropper, crescent, button, lever, plunger, vacuum, piston, snorkel, aerometric, capillary, cartridge and converter.
- **How a pen works:** an animated look at the nib, the feed, capillary flow and air exchange.
- **History:** a timeline from reed pens and quills to the modern fountain pen.
- **Write:** a writing pad where you write with a simulated nib on **paper or a leaf**. Ink spreads, the line width varies with the nib, and the ink dries. There is also a section on palm-leaf manuscripts, the traditional way of writing on leaves.

The app is built with vanilla HTML, CSS and JavaScript (ES2020). It has **no build step, no server, no accounts and no API keys**. It follows the same conventions as G-Wave, Vid-Hunt and Jungly.

## Files

| Path | Role |
| --- | --- |
| `index.html` | Markup for all views, the dialogs, and a pre-paint script (theme, palette, layout) |
| `styles.css` | Tokens → light theme → palettes → components → Tab → Mobile → motion |
| `app.js` | UI in one IIFE: helpers, layout, theme, routing, views, search and filters, favourites, help/tour, About, PWA |
| `anim.js` | Animated explanations. Defines `window.ILAnim`, which holds one scene object per mechanism (see the scene contract below) |
| `bgm.js` | Background music. `window.ILBgm`: Web Audio synthesis (no audio files) and the small player. Never autoplay; start on a click only |
| `write.js` | The writing pad: canvas ink simulation with nib types and surfaces (paper, leaf) |
| `data/brands.json` | Brand records |
| `data/models.json` | Model records |
| `data/fillers.json` | Filling-method records, each linked to its animation scene |
| `data/timeline.json` | History events |
| `data/glossary.json` | Plain-language glossary terms (`term`, `def`, optional `see: [hash, label]`) |
| `data/methods.json` | Old writing methods (clay, reeds, quills, palm leaf…), shown in History → Old methods |
| `sw.js` | Service worker (`VERSION` = cache name, `inkora-vN`) |
| `manifest.webmanifest` | PWA manifest (`start_url` / `scope` = `./`) |
| `icons/`, `docs/screenshots/` | App icons, README images |
| `.github/workflows/pages.yml` | Deploys to GitHub Pages on push to `main` |

Views, routed by hash: `#home`, `#brands`, `#brand=<id>`, `#models`, `#model=<id>`, `#animate`, `#filler=<id>`, `#anatomy`, `#history`, `#methods`, `#write`, `#saved`, `#search=<q>`, `#compare[=a,b]`, `#quiz`, `#glossary[=term]`, `#india`, `#nibs`.

## Data shape (do not break it)

```js
// brands.json
{ id, name, country /* ISO */, founded, closed /* null if active */, founder?, city?,
  notable: [modelId], closedNote? /* shown instead of "closed YEAR" */, summary, sources: [{t,u}], verify?: true }

// models.json
{ id, brandId, name, years: [from, to|null], circa?: true, filler /* fillers.json id */,
  nib?: { material, sizes }, materials?, notable /* one line */, summary,
  vintage /* true if made before 1970 or discontinued */, sources: [{t,u}], verify?: true }

// fillers.json
{ id, name, era: [from, to|null], inventor?, howItWorks, pros, cons,
  examples: [modelId], scene /* ILAnim key */, sources: [{t,u}] }

// methods.json
{ id, name, region, eraText, sort, tool, surface, how, sources: [{t,u}], verify?: true }

// timeline.json
{ year, circa?: true, title, text, tags: ['invention'|'brand'|'model'|'filler'|'writing'], sources: [{t,u}] }
```

## Hard rules

1. **Accuracy first.** Every brand, model, date and inventor needs a `sources` entry from a reliable reference (a maker's history page, a museum, a reputable pen-history site, Wikipedia as a last resort). **Never invent models or dates.** Mark approximate years with `circa: true`, and mark anything unconfirmed with `verify: true`. The UI shows a "needs checking" tag on unconfirmed records.
2. **No logos and no copied artwork.** Brand names appear as text only. Pens, nibs and mechanisms are **drawn in code** (SVG or canvas) as generic illustrations. Real photos are allowed only from Wikipedia and Wikimedia Commons, loaded at runtime (never copied into the repo), free licences only, with the author, licence and credit URL in the **Image credit** drop-down under the photo. The lookup lives in the `IMG` helper in `app.js`.
3. **Write summaries in your own words.** Never paste text from sources.
4. **No build step, frameworks or npm dependencies.** Data is plain JSON fetched at runtime and cached by the service worker.
5. **All storage goes through `store.get/set/del`** (try/catch, JSON values). Keys use the `il-` prefix (`il-theme`, `il-skin`, `il-layout`, `il-saved`, `il-write-settings`, `il-seen-help`, `il-img`, `il-bgm`, `il-text`, `il-contrast`).
6. **Bump `VERSION` in `sw.js`** whenever any shipped file, including data, changes. The shell and `data/` are cached so that the whole app works offline.
7. **Animations follow the scene contract** (below). Each one can be paused and stepped through, has a caption for every step, and runs only while it is on screen (use an IntersectionObserver).
8. **Respect reduced motion.** With `prefers-reduced-motion`, scenes do not autoplay. They show static step frames with Next and Back buttons. The writing pad still works.
9. **Writing-pad performance.** Use one canvas at DPR (capped at 2), pointer events with pressure when available, and coalesced events. The ink-drying effect runs in `requestAnimationFrame` and must stay smooth on a mid-range phone. Offer **Clear** and **Save as PNG**.
10. **Layouts:** `lay-mobile`, `lay-tab` and `lay-web` on `<html>`, chosen by Auto/Mobile/Tab/Web as in the other apps. The header must fit at 320 px with no horizontal overflow.
11. **Every new button needs a `HELP` item** (add it to `TOUR` too if it is essential). Test **Show me** in all three layouts.
12. **Accessibility:**
    - every animation has a text description of each step
    - labelled icon buttons and visible focus rings
    - `aria-live` on scene captions
    - focus-trapped `aria-modal` dialogs, Esc everywhere
    - brand and model lists that work with a keyboard

## Animation scene contract (`anim.js`)

> The built engine is declarative: each scene has `init`, `steps[{c,d,to}]`, `build(svg)` and `draw(refs,S)`, and `ILAnim.create(host,key,opts)` returns `{play,pause,seek,destroy,playing}`. The sketch below is the original plan. Follow the real code in `anim.js`.

```js
ILAnim.scenes['piston'] = {
  title: 'Piston filler',
  steps: [{ caption: 'Turn the knob: the piston moves down…' }, …],
  mount(el, palette),   // build the SVG/canvas inside el
  play(), pause(),      // continuous playback
  seek(step),           // jump to a step (also used in reduced-motion mode)
  resize(w, h),
  destroy()             // remove listeners, stop rAF
};
```

Shared code talks to scenes only through these members. Colours come from CSS tokens (`--ink-blue`, `--metal`, `--resin`, `--paper`, `--leaf`, `--accent`), so every scene works in light, dark and every palette.

## Where to change things

| Task | Place |
| --- | --- |
| Brand or model | `data/brands.json` / `data/models.json`, with `sources`. Link it in `notable` / `brandId` |
| Filling method | `data/fillers.json` and a new scene in `anim.js` |
| History event | `data/timeline.json` |
| Nib or surface in Write | The `NIBS` / `SURFACES` tables in `write.js` |
| Palette | `SKINS` in `app.js` and `:root[data-skin="id"]` in `styles.css` |

## Commands

```bash
# Run (localhost or HTTPS is required for the service worker and install)
python3 -m http.server 8080

# Syntax and data checks
node --check app.js && node --check anim.js && node --check write.js && node --check sw.js
for f in data/*.json manifest.webmanifest; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "BAD: $f"; done
```

Also check that every `brandId`, `filler`, `examples` and `notable` value points to a record that exists, and that every record has at least one source.

## Before you commit

- Syntax and data checks pass, and no record is missing its sources.
- Playwright (Chromium) at 1280×800, 1024×768 touch, 390×844 and 320×640, in light and dark. Check: no page errors, every scene plays, steps and destroys cleanly, reduced-motion mode shows step frames, the writing pad draws and saves a PNG, there is no horizontal overflow, every **Show me** works, and the app opens offline.
- `sw.js` `VERSION` has been bumped.
- README.md and PROJECT.md match the change.

## Notes from the build

- Sources are Wikipedia search URLs labelled `Wikipedia: <term>`, so they always resolve.
- `header` uses backdrop blur, so `position: fixed` popovers inside it are positioned against the header. The mobile popover is therefore `absolute` below the header.
- Help targets can exist in hidden views. `findTarget` picks the first *visible* match.
- Tests need no external network. Google Fonts will fail in a sandbox, and that is expected.
- Photos: `IMG.get(kind, rec)` searches Wikipedia, picks a page whose title matches the brand (and model), skips logos and non-free files, and caches the result in `il-img` (30 days, 3 days for misses). Network failures are not cached. Test with Playwright `route()` mocks, since the sandbox cannot reach Wikipedia.
- `display:none` elements are never seen by an IntersectionObserver, so card photos observe the card, not the hidden image box.
- The hosted artifact page cannot load photos (its CSP blocks other hosts). Use the zip or GitHub Pages.
- Theme: ancient Egypt (v1.2). Cinzel headings and Alegreya Sans body; lapis-night dark and papyrus light tokens; pigment skins keep their old ids (`burgundy` is carnelian, `violet` is lapis, and so on). Ornaments are pure CSS and SVG sprite glyphs (`#g-sun`, `#g-wave`, `#g-ankh`, `#g-reed`, `#g-eye`); no copied artwork. Cinzel is wide, so check headings at 320 px with the real font.
- Music (v1.3): all sound is synthesised in `bgm.js`. Do not add recorded audio files. After changing it, run `ILBgm._renderTest(24)` in the browser: `peak` must stay below 0.98, `clipped` 0 and `rms` above 0.005.
- Indian-brand facts come from the ORF article "A Fountain Pen Story", the Chelpark Wikipedia page and Inked Happiness. Where only an era is known, the record carries `verify: true`, and `closedNote` holds wording such as "closed after 1991".
- Name: the app is **Inkora** (renamed from Ink Leaf). The `il-` localStorage prefix is kept on purpose so earlier saved settings still work. The cache name is `inkora-vN`, and the service worker also deletes old `ink-leaf-*` caches.
- Version 1.5 added the glossary, compare, quiz, nib guide, India story, brand strip, pen drawings, copy links, reading options and the second music track. The quiz profiles use model ids, so if you rename a model id, update `PROFILES` in `app.js`.
