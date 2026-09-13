# Anatomy Atlas

An interactive 3D human anatomy site built with **Three.js** — frontend-only,
no backend, no build step. A real scanned 3D muscular figure turns
continuously on stage; drag any time to look closer, and tap any of the
colour-coded pins to open its atlas entry (location, size, function,
clinical notes) on the left, across six body systems: circulatory,
respiratory, nervous, digestive, musculoskeletal and immune.

This satisfies the Week-1 brief: *"Build a frontend-only 3D website
showcasing various parts of the human body along with brief info details,
using Three.js."*

## Credit (required by the model's licence)

The figure is `"human antomy"` by **rickkeditz37** on Sketchfab, licensed
[CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) — commercial use is
allowed, attribution is required. The site already displays this credit in
the footer and the About panel; keep it there if you redeploy or fork this.
The licence text is also kept at `assets/model/LICENSE.txt`.

## How it's built

There's **no bundler and no `node_modules` to install** — the browser
loads Three.js straight from a CDN via an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
declared in `index.html`. That keeps the project simple to open, run, and
deploy, while still using real ES module imports (`import * as THREE from
"three"`) in the source files.

```
anatomy-atlas/
├── index.html          ← page shell, nav, left info-panel markup, import map
├── css/style.css        ← all styling (white / parchment theme)
├── assets/model/         ← the scanned GLTF model + textures + its licence
├── js/
│   ├── main.js          ← scene, camera, auto-rotating controls, raycasting
│   ├── model.js           ← loads the GLTF model, places the clickable pins
│   ├── ui.js              ← nav, info panel, legend, about modal, credit
│   └── data/organs.js     ← the atlas content (from the SRS) for every organ
├── package.json          ← optional convenience scripts (see below)
└── vercel.json           ← tells Vercel this is a static site, no build
```

## How the clicking works

The scan is one continuous sculpted mesh (not pre-split into named organs),
so `model.js` scatters 24 small colour-coded "pin" markers over it at
anatomically sensible spots, positioned as *fractions* of the model's own
bounding box (e.g. "78% of the way up, just left of centre") so they land
correctly regardless of the model's exact proportions. Clicking a pin opens
its entry from `data/organs.js` in the left panel — the same content as
before, just attached to a real scan instead of procedural shapes.

## Run it locally in VS Code

You need any static file server — the site can't be opened with a plain
`file://` double-click because ES modules require `http://`.

**Option A — no installs, using the included script**
```bash
cd anatomy-atlas
npm run dev
```
This runs `npx serve .` (downloads a tiny static server on first run) and
prints a local URL, typically `http://localhost:3000`. Open that in your
browser.

**Option B — VS Code's Live Server extension**
1. Install the "Live Server" extension in VS Code.
2. Right-click `index.html` → "Open with Live Server".

**Option C — Python (if you already have it installed)**
```bash
cd anatomy-atlas
python -m http.server 3000
```
Then open `http://localhost:3000`.

Any of these work — there's nothing to compile, so all three just serve
the folder as-is.

## Deploying to Vercel

Because this is a static site with no build step, Vercel needs almost no
configuration (the included `vercel.json` spells it out explicitly):

1. Push this folder to a GitHub repo.
2. In Vercel, "Add New Project" → import that repo.
3. Framework preset: **Other**. Build command: **(leave empty)**. Output
   directory: **`.`** (the project root).
4. Deploy — Vercel will serve `index.html` and the `css/`/`js/` folders
   directly.

You can also deploy from the CLI:
```bash
npm i -g vercel
cd anatomy-atlas
vercel
```

## Notes / next steps

- Content for every structure (location, size, function, clinical
  significance) is condensed from the project's SRS document.
- The model is ~6 MB total (mesh + texture), loaded once on page load —
  fine for a study site, but worth compressing further (e.g. via
  [gltf-transform](https://gltf-transform.dev/)) if you add more assets later.
- Good follow-ups if you want to extend it: nudge individual pin positions
  once you've looked at the model from every angle, add a search box over
  the organ list, or persist the last-viewed system in the URL so links
  are shareable.
