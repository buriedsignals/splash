// twin/skills/twin-scrolly/scripts/build-sample-photo.mjs
//
// Generates this skill's OWN sample "photograph" — `assets/sample-data/basin-photo.png` — the
// stand-in `assets/ScrollySeed.tsx`'s `ImageFrame` step embeds. Nothing in this toolchain fetches
// or generates real photographs yet (`SKILL.md`'s own "When to use" names the gap), so this seed's
// own image evidence is authored here, deterministically, from flat shapes — not sourced from
// anywhere else, so there is nothing to credit and nothing licensed to worry about.
//
// Not run by any test or by `render-scrolly.mjs` itself — the PNG it writes is a committed asset,
// read as plain bytes at render time (`scripts/render-scrolly.mjs`'s own seed runner). Re-run this
// only if the scene itself changes; there is no `--check` mode because, unlike `preview.png`
// (a render OF the seed, which must track the seed), this file IS the seed's own raw material — it
// has no separate "current" state to drift out of.
//
// RASTERISER: @resvg/resvg-js, the same native module `scripts/render-still.mjs` uses.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets", "sample-data", "basin-photo.png");

const WIDTH = 640;
const HEIGHT = 900;

// A flat, illustrated scene — no gradient wash, the same "the field is flat" rule this project's
// own doctrine states for every data ground (`twin-doctrine/references/visual-system.md`, "The
// field is flat"). This is decorative sample content, not a data mark, so it is not subject to that
// rule's letter — but there is no reason to reach for a texture this project's own doctrine would
// flag if it WERE a data ground, so it does not.
// THE SUBJECT SITS IN THE SAME BAND EVERY OTHER FRAME KEEPS ITS MEANING IN. This scene was
// originally composed for a portrait frame and put the gauge hut at 58–83% of the canvas height.
// Once the graphic went full-bleed, a 1600×900 viewport COVER-crops this portrait canvas to the
// middle 40% of it (vb-y 270–630) — so a reader met a hillside and no gauge at all, which a
// screenshot showed immediately and no test could ever have. The hut now sits at 33–56%: inside
// the crop at every aspect in the envelope, and above the prose lane at every one of them too.
// An image carries no LABEL to crop, so nothing mechanical enforces this — but "nothing annotated
// can be cropped" is a rule about what the reader must be able to see, and on a photograph the
// subject is that thing.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#BFD9E8"/>
  <circle cx="${WIDTH * 0.8}" cy="${HEIGHT * 0.22}" r="46" fill="#F2C14E"/>
  <polygon points="0,${HEIGHT * 0.3} ${WIDTH * 0.35},${HEIGHT * 0.19} ${WIDTH * 0.62},${HEIGHT * 0.31} ${WIDTH},${HEIGHT * 0.22} ${WIDTH},${HEIGHT * 0.38} 0,${HEIGHT * 0.38}" fill="#8FAF8A"/>
  <rect x="0" y="${HEIGHT * 0.38}" width="${WIDTH}" height="${HEIGHT * 0.62}" fill="#5B7A52"/>
  <rect x="0" y="${HEIGHT * 0.53}" width="${WIDTH}" height="${HEIGHT * 0.47}" fill="#4C7A93"/>
  <rect x="${WIDTH * 0.44}" y="${HEIGHT * 0.4}" width="${WIDTH * 0.14}" height="${HEIGHT * 0.1}" fill="#E8E4DA"/>
  <polygon points="${WIDTH * 0.42},${HEIGHT * 0.4} ${WIDTH * 0.51},${HEIGHT * 0.33} ${WIDTH * 0.6},${HEIGHT * 0.4}" fill="#A8543F"/>
  <line x1="${WIDTH * 0.51}" x2="${WIDTH * 0.51}" y1="${HEIGHT * 0.4}" y2="${HEIGHT * 0.56}" stroke="#3A3A38" stroke-width="6"/>
</svg>
`.trim();

const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } })
  .render()
  .asPng();

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, png);
console.log(`wrote ${OUT} (${png.length} bytes)`);
