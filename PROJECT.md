# Inkora: how it works

*Created by **SSK-BLUM**.* Static PWA, vanilla HTML, CSS and JavaScript (ES2020). No build step, frameworks, npm packages, accounts or API keys.

## Structure

```
Inkora/
├─ index.html              markup for every view, dialogs, icon sprite, pre-paint script
├─ styles.css              tokens, themes, skins, components, layouts, motion
├─ app.js                  UI (one IIFE): layout, theme, routing, views, help/tour, About, PWA
├─ anim.js                 window.ILAnim: animation scenes and player
├─ write.js                window.ILWrite: writing pad
├─ bgm.js                  window.ILBgm: generated Egyptian ambience and the small player
├─ sw.js                   service worker (cache name inkora-vN)
├─ manifest.webmanifest    PWA manifest (start_url and scope "./")
├─ data/                   brands, models, fillers, timeline, methods (JSON)
├─ icons/                  SVG, 192, 512, maskable and Apple touch icons
├─ docs/screenshots/       README images
├─ .github/workflows/pages.yml
├─ README.md  PROJECT.md  CLAUDE.md  LICENSE  .nojekyll  .gitignore
```

## Startup

1. `index.html` runs a small script **before first paint**. It reads `il-theme`, `il-skin` and `il-layout` and sets `data-theme`, `data-skin` and the `lay-*` class on `<html>`, so there is no flash.
2. `app.js` builds the swatches, applies the layout, fetches the five JSON files, builds id maps, then calls `route()`.
3. The service worker registers on HTTPS or localhost. A failed data load shows a retry button.

## Layout modes (the optimise button)

The `<html>` element gets `lay-mobile`, `lay-tab` or `lay-web`, plus `data-layout` holding the user's choice (auto, mobile, tab, web). Auto rule: width ≤ 760 px is mobile. Width ≤ 1180 px with a coarse pointer is tab. Everything else is web.

- **Mobile:** one column, bottom navigation bar, header in two rows, bottom-sheet dialogs.
- **Tab:** larger touch targets and bigger type, wider cards.
- **Web:** wide grids and side panels.

The layout re-resolves on resize. The header height is exposed as `--top-h`. A small "A" badge on the button shows that Auto is on. Below 760 px the header always wraps so nothing overlaps.

## Theming

Dark-first colour tokens. Light applies for `@media (prefers-color-scheme: light)` unless `data-theme="dark"`, and for `data-theme="light"`. The palette menu has Auto, Light, Dark and eight pigment skins (`data-skin`): gold (default), carnelian (`burgundy`), malachite (`emerald`), ochre (`sepia`), lapis (`violet`), faience (`turquoise`), sunset (`orange`), papyrus (`mono`). The ids are kept so saved settings still work. The theme is ancient Egypt: Cinzel headings, Alegreya Sans body, lapis-night dark mode, papyrus light mode, gold rules, a zigzag border under the header, stele-style inset frames and a frieze of simple hieroglyph-style marks (sun, water, ankh, reed, eye) drawn in the SVG sprite as `#g-*`. Pen drawings use their own tokens (`--ink-blue`, `--metal`, `--resin`, `--paper`, `--leaf`, `--gold`, `--rubber`, `--glass`) so they follow every theme.

## Routing

Hash routes. Each route destroys the player and pad of the previous view.

| Hash | View |
| --- | --- |
| `#home` | Hero, stats, tiles, a random timeline fact |
| `#brands`, `#brand=<id>` | Brand list and detail |
| `#models`, `#model=<id>` | Model list and detail |
| `#animate` | Grid of 12 animations |
| `#anatomy` | How a pen writes |
| `#filler=<id>` | Filling-system page with player, pros, cons, example pens |
| `#history`, `#methods` | Timeline tab and Old methods tab |
| `#write` | Writing pad |
| `#saved` | Starred brands and models |
| `#search=<q>` | Results across brands, models, fillers, timeline and methods |

## Data (`data/*.json`)

- Brand: `{id, name, cc, country, city, founded, closed, summary, notable[], verify?, sources[{t,u}]}`
- Model: `{id, brandId, name, years[from|null, to|null], circa?, filler, nib?, summary, vintage, verify?, sources}`
- Filler: `{id, name, era[], circa?, scene, examples[], howItWorks, pros, cons, verify?, sources}`. The 11 ids double as scene keys.
- Timeline event: `{year (negative = BCE), circa?, title, text, tags[], verify?, sources}`
- Method: `{id, name, region, eraText, sort, tool, surface, how, verify?, sources}`

Sources are `{t, u}` objects, mostly Wikipedia search URLs. `verify: true` shows a "needs checking" tag. Models with unknown years use `years: [null, null]` and display "dates unconfirmed".

## Extra pages

All of these render into `#viewDetail` and are routed by hash:

| Hash | What it is |
| --- | --- |
| `#compare` or `#compare=<idA>,<idB>` | Two pens side by side. The URL updates as you pick. |
| `#quiz` | Five questions, scored against hand-made pen profiles (`PROFILES`), top three shown. A fun guide, not buying advice. |
| `#glossary` or `#glossary=<term>` | 30 plain-language terms from `data/glossary.json`, with a filter and links to the filling animations. |
| `#india` | A story page on Indian fountain pens, based on the ORF article and linked to the Indian brand pages. |
| `#nibs` | Five live canvas samples (fine, medium, broad, italic, flex). "Try it on the pad" stores the nib in `il-write-settings` and opens Write. |

Other additions: a brand timeline strip (`brandStrip`), `penArt(kind)` (SVG pen drawings for each filling system, used when no photo exists), copy-link buttons (`data-copy`), and reading options (`data-text="large"`, `data-contrast="high"`, saved as `il-text` and `il-contrast`).

## Bundled photos

`tools/fetch-photos.mjs` (Node 18+, no packages) runs the same Wikipedia search as the app and saves each free-licence photo as `photos/<kind>-<id>.jpg`, plus `photos/credits.json` keyed `brand:<id>` / `model:<id>`. `IMG.get` reads that file first and falls back to the live lookup. The script is safe to re-run; it skips photos it already has.

## Photos and credits

`IMG` in `app.js` finds a photo at view time with the Wikipedia API (CORS `origin=*`):

1. Search `<brand> [model] fountain pen`, and take the first page whose title contains a brand word (and a model word for models).
2. Use the page's lead image. If it is a logo, SVG or similar, pick an article image whose file name matches the brand or model. Otherwise show no photo.
3. Read `imageinfo` and `extmetadata` for the author, licence, licence URL and the Commons description URL. Non-free or unlicensed files are rejected. Author text is parsed with `DOMParser` and shown as plain text.

Results are cached in `il-img`. Detail pages show the photo with an **Image credit** drop-down (photo, author, licence, credit URL, article). Cards load thumbnails lazily as they scroll into view, three requests at a time. Failures show a note and are not cached. Service workers do not touch these cross-origin requests.

## Background music (`bgm.js`)

`ILBgm.mount(host, {toast})` builds the small player. `createEngine(ctx, dest)` synthesises the music with Web Audio, so there are no audio files:

- two tracks: **Nile Night** (Hijaz, 58 bpm, hand drum) and **Temple Dawn** (a Bayati-style scale with a half-flat second, 44 bpm, no drum, more chimes). The skip button switches tracks and `il-bgm` remembers it. Each track has a drone on D with slow volume drift, plus a breath of filtered-noise wind;
- a random-walk melody in the Hijaz scale (D Eb F# G A Bb C), played as Karplus-Strong plucked strings, in phrases that rest and land on the tonic or dominant;
- a quiet maqsum-style hand drum (dum and tak) that enters after four bars;
- finger-cymbal chimes every 6 to 13 seconds, with a shared convolution reverb and a compressor.

A scheduler looks 3 seconds ahead every 250 ms. Playing needs a click (browser rule). Pause fades out, then suspends the audio context. The music also pauses while the tab is hidden. Volume is saved in `il-bgm`. `ILBgm._renderTest(seconds)` renders offline and returns peak and RMS, used to check that the output is not silent and does not clip.

## Animation engine (`anim.js`)

A scene is declarative: an `init` state, `steps[{c, d, to}]` (caption, duration, target state), `build(svg)` to draw the SVG, and `draw(refs, state)` to apply a state. The player interpolates between steps with easing. Controls: previous, play/pause, next, restart, speed, and tap-a-step. The caption is an `aria-live` region. The player pauses when scrolled off-screen or when the tab is hidden. With reduced motion it does not autoplay and shows step frames. API: `ILAnim.create(host, key, {autoplay})` returns `{play, pause, seek, destroy, playing}`.

## Writing pad (`write.js`)

Three stacked canvases: surface, dry ink and wet ink. The wet layer is redrawn each frame only while ink is wet (about 2.4 s), then merged into the dry layer. Pointer events use pressure and coalesced events when available. Nibs set width, edge angle or flex. The palm leaf scratches with a stylus, and **Rub soot** animates soot into the grooves. Undo, Clear and Save as PNG. Settings persist in `il-write-settings`.

## Help and About

- `HELP` items (section, title, text, target selector, optional route) fill the guide dialog. **Show me** switches to the right page, scrolls the target into view and places a spotlight. `TOUR` is an eight-step subset.
- About shows credit, version, record counts, current layout and install state, with the source and trademark notes.
- Dialogs are `aria-modal`, trap focus, close on Esc and restore focus.

## Storage keys

`il-theme`, `il-skin`, `il-layout`, `il-saved`, `il-write-settings`, `il-seen-help`, `il-img`, `il-bgm` (photo lookup cache). All go through the `store` helper (try/catch, JSON).

## Service worker

`inkora-v10`. Pre-caches the shell and data. Navigation is network-first with cache fallback. Fonts are stale-while-revalidate. Own files are cache-first. Audio and range requests are not cached. **Bump `VERSION` whenever any shipped file changes.**

## Accessibility

Skip link, visible focus rings, labelled icon buttons, `aria-live` captions, keyboard-friendly lists, focus-trapped dialogs, Esc closes everything, `/` focuses search, reduced motion respected.

## Testing done

`node --check` on all scripts, JSON and cross-reference checks, and Playwright (Chromium) at 1280×800, 1024×768 touch, 390×844 and 320×640. No page errors, every animation plays, steps and destroys, no horizontal overflow in any forced layout at 320 px, every **Show me** works, reduced motion does not autoplay, the pad draws and saves a PNG, and the app opens offline.
