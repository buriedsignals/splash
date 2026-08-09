---
name: twin-image-beat
description: Use to produce an image beat — a beat whose evidence is a photograph, not a drawing — by WRITING a bespoke component under doctrine, then rendering a still and looking at it. Carries the seed that teaches the anatomy (the journalist's own photos, one consistent letterboxed box, the journalist's own words), the image discipline (required alt and credit, letterbox not crop or stretch, EXIF orientation detected not corrected, a weight ceiling), and the render ladder's first rung for this medium. SP1 covers the static genre only.
---

# twin-image-beat — write the beat, embed the photos, render the still, look at it

## Overview

The image craft skill. It does not hold a photo library and it does not fill a config: it holds
the **doctrine** an image beat is written under (`references/image-discipline.md`), **one seed**
that demonstrates the wiring (`assets/ImageBeatSeed.tsx`, marked `REPLACE ME. Do not parameterise
me.`), and the **render step** that turns a React element plus a set of photograph files into one
self-contained SVG and a PNG on disk (`scripts/render-still.mjs`, `scripts/render-preview.mjs`).

**This is what makes the scroll vehicle worth having.** `twin-scrolly` carries any beat's own
geometry through narrative steps; before this skill, the only geometry it had ever carried was a
chart's — and a scrolly that steps through one chart could have been an animated chart instead
(`twin-scrolly/SKILL.md`, "When to use"). A scrolly that moves from a photograph to a chart could
not have been anything else. This skill exists so that step is a real photograph the journalist
took, not a stand-in drawn in flat shapes — the exact gap `twin-scrolly/scripts/build-sample-photo.mjs`
names in its own header comment ("nothing in this toolchain fetches or generates real photographs
yet").

This skill **generates nothing and interprets nothing**. It does not caption a photo, does not
choose which one comes first, and does not describe what is in a picture — it takes images the
journalist supplies, with the alt text and the credit the journalist wrote, and lays them out
honestly. Editorial intent never leaves the journalist; that rule matters most exactly here, where
a machine could plausibly "help" by describing a photograph nobody asked it to describe.

The PNG exists to be looked at, the same as every other genre in this twin: the checklist in
`image-discipline.md` applies to pixels, and a beat is not finished because its tests are green.
Rendering the seed is what caught its own first real case — a portrait photo between two landscape
ones, letterboxed rather than cropped or stretched — and looking at that render is the proof this
skill's `SKILL.md` points to, not a description of what should happen.

**SP1 scope: the static genre only.** This skill normalises a set of photographs to one consistent
box and composes a single static beat (title, per-photo caption, alt, credit) to a self-contained
artifact. An interactive or scroll-driven image beat is a later sub-project — `twin-scrolly` can
already carry one once a real beat's own component exists; this skill is what makes that component
possible to write honestly, it does not build the scrolly wiring itself.

## When to use

- When a chosen candidate in a closed `STORYBOARD.md` has medium `image` and genre `static`, and
  the beat's `BRIEF.md` names the photographs, their alt text and their credits. No brief, no code
  — same rule as every other genre.
- When the evidence for a claim is photographs the journalist themselves took or was given the
  rights to use — a place, a before/after, a short sequence — not a quantity that belongs on an
  axis. A claim that needs a number belongs to `twin-chart-beat`; a claim that needs a shape on a
  map belongs to `twin-map-beat`.
- To write a **new** component for this story. Read the seed to learn the shape, then write the
  beat. Do not import the seed, extend it, or add a `layout` prop to it.
- To render and re-render a still while working, because every box decision — in particular
  whether a mismatched photo's letterbox bars land where the arithmetic says — is settled by
  looking at the render, not by reasoning about the markup.
- **Not** a place to fetch a photograph from the internet, generate one, or describe one in words
  on the journalist's behalf. If a photo, its alt text, or its credit do not exist yet, this skill
  is not the one to invent them — go back to the journalist.

## The one gotcha that will waste your day (read first)

**A photograph the journalist did not supply "correctly rotated" will look right in whatever tool
they last viewed it in and wrong here, silently, unless this skill's own orientation check catches
it first.** Most viewers — Photos, Preview, a phone's own camera roll — apply a JPEG's EXIF
`Orientation` tag when they display it, so a photo taken with a phone held sideways still looks
upright there. `resvg`, the rasteriser every genre in this twin uses, does not apply that tag; it
paints the stored pixels exactly as they sit in the file. Embed such a JPEG directly and the render
is sideways, or mirrored, with nothing in the markup or the SVG itself saying so — the defect is
invisible until a human looks at the actual PNG, which is exactly the failure mode this whole
project's own "verify the pixels" doctrine exists to catch, one render too late for comfort.

`checkOrientation` in `scripts/render-still.mjs` reads the tag and throws BEFORE any pixel is drawn
if it is anything other than "normal" — it does not attempt to rotate the image itself (see
`references/image-discipline.md`, "Colour and orientation", for why correcting eight possible EXIF
values is a different, unclosed problem from detecting one). Call it on every photo's raw bytes
before building the props a real beat's component will use; `scripts/render-preview.mjs`'s own seed
runner shows where in the sequence that check belongs.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `references/image-discipline.md` | Required alt + credit and why neither can be derived, letterbox vs. crop vs. stretch and why this skill only ever letterboxes, EXIF orientation detected not corrected, colour profiles not managed, the weight ceiling and what happens at it, order never re-sorted |
| Doctrine | `references/seed-anatomy.md` | What the seed teaches and what adding a `layout` prop to it would cost |
| Seed | `assets/ImageBeatSeed.tsx` | `imageBeatLayout` (pure: box math, wrapped title/caption lines, the required-alt/required-credit check) and the `ImageBeatSeed` component. Replaced per story |
| Sample | `assets/sample-data/manifest.json` + three PNGs | A three-photo sequence — a vacant lot, before/during/after — with two matching (landscape) aspect ratios and one deliberately mismatched (portrait), each with its own required alt and credit |
| Preview | `assets/preview.png` | The seed rendered on a light ground — what this skill produces, without running it |
| Render | `scripts/render-still.mjs` | This skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`/`renderStill`, plus the genre-specific `readImageMeta`, `readOrientation`/`checkOrientation`, `fitBox`, `toDataUri`, `checkWeight` |

`scripts/render-still.mjs` is this skill's one script with dependencies — `react-dom/server` and
`@resvg/resvg-js`, both from the root's own `package.json` — and its header says so, the same as
its sibling copies in `twin-chart-beat` and `twin-scrolly`. **A skill never imports another skill's
copy of this file** — the three copies are intentionally byte-similar where the rule is identical
(`deriveFurniture`/`contrast`/`measureText`/`renderStill`) and genuinely different where the medium
is (everything under "image-genre additions" in this skill's own copy has no sibling in the other
two, because reading a raster file's own size, checking its EXIF tag, fitting it into a box and
capping its combined weight are all things a drawn chart never needs to do).

**Not yet vendored.** `twin-chart-beat/scripts/render-still.mjs` is physically copied into every
fresh Splash root at `<root>/shared/twin-chart-beat/` by `splash-twin`'s own root template
(`twin-chart-beat/SKILL.md`, Architecture) — this skill's own copy is not vendored there yet. A
real beat written tonight imports this skill's `render-still.mjs` and `ImageBeatSeed.tsx`-shaped
component the way this skill's own tests do, by a relative path inside a Splash root's own copy of
this skill's directory; wiring the `#shared/twin-image-beat/*` subpath the other genre already has
is a named follow-up, not done as part of closing this gap (it touches `splash-twin`'s own root
template, outside this skill's own directory).

**Rasteriser: `@resvg/resvg-js`**, the same choice `twin-chart-beat/SKILL.md` explains and for the
same reasons, with one addition verified for this genre specifically: resvg decodes and paints a
base64-embedded raster `<image href="data:image/png;base64,…">` correctly — checked by rendering a
known 4×4 red square through exactly that path and reading the resulting PNG's own pixels before
this skill's seed was written around the assumption.

## How it works (the shape)

1. **The brief names the photographs, their alt text, their credits, and the claim they support.**
   The component is written from it — never from looking at the photographs itself.
2. **Read each photo's own bytes and refuse what is not safe to embed as-is.** `readImageMeta`
   reads its real pixel size from PNG's `IHDR` chunk or a JPEG's Start-Of-Frame marker — never
   assumed from a filename. `checkOrientation` reads a JPEG's EXIF tag and throws on anything but
   "normal." Both run once, in node, before any React element is built — see this skill's own
   gotcha, above.
3. **Encode, then bound the total.** `toDataUri` turns each photo's bytes into the one form this
   skill's SVG ever references a photograph by. `checkWeight` sums every photo's raw bytes across
   the whole beat and throws, naming the largest offenders, past `WEIGHT_LIMIT_BYTES`.
4. **Geometry first, and pure.** `imageBeatLayout` turns a title, an array of already-resolved
   photo props and this seed's own fixed box size into pixel coordinates for every element —
   `fitBox` decides where each photo's own aspect ratio lands inside the shared box, letterboxed,
   never cropped or stretched. This same function is the one place the required-alt/required-credit
   check lives.
5. **Furniture derived from the ground.** `deriveFurniture(ground)` gives ink, muted and grid —
   grid also doubles as the letterbox fill, so a photo that does not reach the edge of its box
   leaves a visibly explained bar, not an unexplained gap the same colour as the page.
6. **`renderStill`** writes `<name>.svg` and `<name>.png`. The SVG is already self-contained — every
   photo is a `data:` URI, nothing it references lives outside the file — and it refuses to
   rasterise at a size the element was not drawn at, the same invariant every genre in this twin
   keeps.
7. **Look at the PNG**, and specifically at whichever photo does not share the others' aspect
   ratio — that is the one frame that exposes a layout only proven on tidy, matching inputs. Then
   apply `image-discipline.md`'s checklist to what you see.

## Quick start

```sh
# this skill's own seed, from this skill's own sample data — nothing else on disk is needed
bun skills/twin-image-beat/scripts/render-preview.mjs --out /tmp/image-beat-preview
# then open /tmp/image-beat-preview/preview.png and look at it — in particular the middle
# (portrait) frame's letterbox bars against the two landscape frames either side of it.
```

This is the shape a real beat, written into an installed Splash root, follows —
`stories/annemasse-lot/beats/2-before-after/CornerLot.tsx`:

```js
import { createElement } from "react";
import { readFile } from "node:fs/promises";
import { renderStill, readImageMeta, checkOrientation, checkWeight, toDataUri } from "./render-still.mjs"; // this skill's own copy, vendored into the story's beat directory
import { CornerLotBeat } from "./CornerLotBeat.tsx"; // THIS beat's own component, written from the seed's shape

const files = [
  { path: "before.jpg", alt: "The lot behind its fence, bare dirt, in March.", credit: "Photo: J. Rivera/Heidi.news" },
  { path: "after.jpg", alt: "The same lot in July, planted and fenced open.", credit: "Photo: J. Rivera/Heidi.news" },
];
const photos = await Promise.all(files.map(async (f) => {
  const bytes = await readFile(f.path);
  const meta = readImageMeta(bytes);
  checkOrientation(bytes, f.path);
  return { ...f, bytes, dataUri: toDataUri(bytes, meta.mime), intrinsicWidth: meta.width, intrinsicHeight: meta.height };
}));
checkWeight(photos);

const { svgPath, pngPath } = await renderStill({
  element: createElement(CornerLotBeat, { photos, title: "The corner lot, before and after", ground: "#FFFFFF" }),
  width: 900,
  height: 940, // must match what imageBeatLayout(photos, title) computes for THIS beat's own content
  outDir: "renders",
  name: "still",
});
// Now open pngPath and look at it.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The frame's own content width (every photo's box shares it) | `900` (`FRAME_WIDTH`) | `ImageBeatSeed.tsx` |
| The margin around everything | `40` (`PAD`) | `ImageBeatSeed.tsx` |
| The one consistent box height every photo is letterboxed into | `420` (`BOX_HEIGHT`) | `ImageBeatSeed.tsx` |
| Air between one photo's whole block and the next | `32` (`BLOCK_GAP`) | `ImageBeatSeed.tsx` |
| Title size and line spacing | `26` / `34` | `TITLE`, `ImageBeatSeed.tsx` |
| Caption size and line spacing | `15` / `20` | `CAPTION`, `ImageBeatSeed.tsx` |
| Credit size | `13` | `CREDIT`, `ImageBeatSeed.tsx` |
| Photos below which the beat refuses to render | `2` | `imageBeatLayout`, `ImageBeatSeed.tsx` |
| The combined raw-byte ceiling for one beat's embedded photographs | `20 MB` (`WEIGHT_LIMIT_BYTES`) | `render-still.mjs` |
| The contrast floor muted text (the credit line) must clear against the ground | `4.5` | `deriveFurniture`, `render-still.mjs` |
| How closely the still survives being looked at | `2` (raster scale) | `rasterise`, `render-still.mjs` |

## Files

- `references/image-discipline.md` — the rules, each attached to the reasoning or the render that
  produced it: required alt + credit, letterbox vs. crop vs. stretch, EXIF orientation, colour
  profiles, the weight ceiling, order never re-sorted, verification.
- `references/seed-anatomy.md` — what the seed teaches, and what adding a `layout` prop to it would
  cost.
- `assets/ImageBeatSeed.tsx` — the seed. `imageBeatLayout` is pure and exported (box math, wrapped
  lines, the alt/credit check); `ImageBeatSeed` paints it. Read here, in this repository, to learn
  the shape — **not vendored into a Splash root and never imported by a beat**; a beat writes its
  own component from scratch, in this shape.
- `assets/sample-data/manifest.json` — this seed's own title and, per photo, its file name, alt,
  caption and credit.
- `assets/sample-data/lot-1-before.png`, `lot-2-during.png`, `lot-3-after.png` — three illustrated
  stand-ins generated by `scripts/build-sample-photos.mjs`, not real photographs (their own credit
  lines say so). Two share a landscape aspect ratio (900×560); the middle one is portrait
  (560×900), on purpose — the mismatched case `SKILL.md`'s own "How it works" step 7 points a
  reader at.
- `assets/preview.png` — the seed rendered on a light ground, so a reader of this skill sees what
  it produces without running anything. Regenerate with `bun scripts/render-preview.mjs` whenever
  the seed or the sample data changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `scripts/render-still.mjs` — this skill's OWN copy of `deriveFurniture`/`contrast`/`measureText`/
  `renderStill`, plus `readImageMeta`, `readOrientation`/`checkOrientation`, `fitBox`, `toDataUri`,
  `WEIGHT_LIMIT_BYTES`/`checkWeight` — the genre-specific additions with no sibling in
  `twin-chart-beat`'s own copy.
- `scripts/build-sample-photos.mjs` — generates this skill's three sample PNGs deterministically
  from flat shapes, the same move `twin-scrolly/scripts/build-sample-photo.mjs` makes and for the
  same reason: nothing to credit, nothing licensed to worry about. Not run by any test; re-run only
  if the sample scenes themselves change.
- `scripts/render-preview.mjs` — resolves this skill's own `manifest.json` and PNGs into `PhotoInput`
  props (reading bytes, checking orientation, checking combined weight, encoding to `data:` URIs),
  then renders the seed to PNG; accepts `--out <dir>` and `--check` (re-renders and fails non-zero
  if the committed PNG no longer matches a fresh render).
- `test/render-still.test.ts` — `bun:test` coverage: `deriveFurniture`/`contrast`/`measureText`
  parity with the sibling copies, `readImageMeta` on a real PNG and a hand-built minimal JPEG,
  `readOrientation`/`checkOrientation` on a JPEG carrying a non-normal EXIF tag (throws, names the
  file) and on one carrying none (passes), `fitBox`'s letterbox math on a narrower-than-box and a
  taller-than-box intrinsic size, `toDataUri`'s round-trip, and `checkWeight`'s ceiling (throws,
  names the largest file first).
- `test/canon.test.ts` — the canon's own shape: `REPLACE ME` wording present, sample manifest has
  at least two photos each carrying a non-empty alt and credit, at least one sample photo's aspect
  ratio differs from the others', and `preview.png` is a current render.
