// twin/skills/image-beat/scripts/build-sample-photos.mjs
//
// Generates this skill's OWN three sample "photographs" — `assets/sample-data/lot-1-before.png`,
// `lot-2-during.png`, `lot-3-after.png` — deterministically, from flat shapes, the same move
// `scrolly/scripts/build-sample-photo.mjs` makes and for the same reason: nothing in this
// toolchain fetches real photographs, and a freely-licensed real one still has a licence to state
// and a credit line to get right — this skill's own doctrine (`references/image-discipline.md`,
// "Alt text and credit are not optional") is exactly the rule a borrowed photo would have to
// clear. Authored here, there is nothing to credit and nothing licensed to worry about.
//
// The three are drawn at TWO DIFFERENT aspect ratios on purpose: `lot-1-before.png` and
// `lot-3-after.png` are landscape (900x560), `lot-2-during.png` is portrait (560x900) — the case
// `SKILL.md`'s own "Quick start" names, that exposes a beat's box math when it only handles tidy,
// matching inputs.
//
// Not run by any test or by `render-preview.mjs` itself — the PNGs it writes are committed assets,
// read as plain bytes at render time. Re-run this only if the scene changes; there is no `--check`
// mode because, unlike `preview.png` (a render OF the seed, which must track the seed), these
// files ARE the seed's own raw material — they have no separate "current" state to drift out of.
//
// RASTERISER: @resvg/resvg-js, the same native module `scripts/render-still.mjs` uses.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "assets", "sample-data");

function render(svg, width) {
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

// Flat, illustrated scenes — no gradient wash, the same "the field is flat" rule this project's
// own doctrine states for every data ground. Decorative sample content, not a data mark.

const beforeSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#CFE0EC"/>
  <rect x="0" y="${h * 0.5}" width="${w}" height="${h * 0.5}" fill="#B79A6E"/>
  <rect x="0" y="${h * 0.86}" width="${w}" height="${h * 0.14}" fill="#8C7350"/>
  <!-- a chain-link fence: verticals + two rails -->
  ${Array.from({ length: 14 }, (_, i) => `<line x1="${(i + 0.5) * (w / 14)}" x2="${(i + 0.5) * (w / 14)}" y1="${h * 0.42}" y2="${h * 0.58}" stroke="#9AA0A6" stroke-width="2"/>`).join("\n  ")}
  <line x1="0" x2="${w}" y1="${h * 0.46}" y2="${h * 0.46}" stroke="#9AA0A6" stroke-width="3"/>
  <line x1="0" x2="${w}" y1="${h * 0.55}" y2="${h * 0.55}" stroke="#9AA0A6" stroke-width="3"/>
  <!-- a few weeds -->
  <circle cx="${w * 0.18}" cy="${h * 0.62}" r="${h * 0.02}" fill="#7C8A5A"/>
  <circle cx="${w * 0.63}" cy="${h * 0.66}" r="${h * 0.018}" fill="#7C8A5A"/>
  <circle cx="${w * 0.81}" cy="${h * 0.6}" r="${h * 0.022}" fill="#7C8A5A"/>
</svg>`.trim();

const duringSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#D7E4EC"/>
  <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="#A48A63"/>
  <!-- site fencing along the bottom third -->
  <rect x="0" y="${h * 0.66}" width="${w}" height="${h * 0.06}" fill="#E8B23A"/>
  <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.06}" fill="#E8B23A"/>
  <!-- a crane arm, tall because this frame is portrait -->
  <rect x="${w * 0.46}" y="${h * 0.18}" width="${w * 0.05}" height="${h * 0.48}" fill="#C0392B"/>
  <line x1="${w * 0.485}" x2="${w * 0.85}" y1="${h * 0.2}" y2="${h * 0.28}" stroke="#C0392B" stroke-width="6"/>
  <line x1="${w * 0.485}" x2="${w * 0.18}" y1="${h * 0.2}" y2="${h * 0.24}" stroke="#C0392B" stroke-width="6"/>
  <circle cx="${w * 0.485}" cy="${h * 0.18}" r="${w * 0.04}" fill="#5D6D7E"/>
  <!-- a stack of pallets -->
  <rect x="${w * 0.14}" y="${h * 0.5}" width="${w * 0.22}" height="${h * 0.08}" fill="#8C5A2E"/>
  <rect x="${w * 0.14}" y="${h * 0.42}" width="${w * 0.22}" height="${h * 0.08}" fill="#A06B36"/>
</svg>`.trim();

const afterSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#BFD9E8"/>
  <rect x="0" y="${h * 0.46}" width="${w}" height="${h * 0.54}" fill="#6E9E5C"/>
  <!-- a gravel path -->
  <polygon points="${w * 0.42},${h} ${w * 0.58},${h} ${w * 0.52},${h * 0.46} ${w * 0.48},${h * 0.46}" fill="#D8CDB8"/>
  <!-- three planted beds -->
  <ellipse cx="${w * 0.18}" cy="${h * 0.66}" rx="${w * 0.1}" ry="${h * 0.05}" fill="#3E7A3A"/>
  <ellipse cx="${w * 0.82}" cy="${h * 0.7}" rx="${w * 0.09}" ry="${h * 0.045}" fill="#3E7A3A"/>
  <ellipse cx="${w * 0.7}" cy="${h * 0.58}" rx="${w * 0.07}" ry="${h * 0.035}" fill="#4E8A48"/>
  <!-- a bench -->
  <rect x="${w * 0.26}" y="${h * 0.8}" width="${w * 0.1}" height="${h * 0.03}" fill="#8C5A2E"/>
  <line x1="${w * 0.28}" x2="${w * 0.28}" y1="${h * 0.83}" y2="${h * 0.88}" stroke="#5A3C1E" stroke-width="3"/>
  <line x1="${w * 0.34}" x2="${w * 0.34}" y1="${h * 0.83}" y2="${h * 0.88}" stroke="#5A3C1E" stroke-width="3"/>
</svg>`.trim();

const SPECS = [
  { name: "lot-1-before.png", width: 900, height: 560, svg: beforeSvg },
  { name: "lot-2-during.png", width: 560, height: 900, svg: duringSvg },
  { name: "lot-3-after.png", width: 900, height: 560, svg: afterSvg },
];

await mkdir(OUT_DIR, { recursive: true });
for (const spec of SPECS) {
  const png = render(spec.svg(spec.width, spec.height), spec.width);
  const path = join(OUT_DIR, spec.name);
  await writeFile(path, png);
  console.log(`wrote ${path} (${png.length} bytes, ${spec.width}x${spec.height})`);
}
