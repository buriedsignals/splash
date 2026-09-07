# Design base implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a measured knowledge base of treatments (information encoding) and directions
(style) extracted from three archives, and wire it into the renderer so a beat is drawn with the
craft of published work — provably, not advisedly.

**Architecture:** Two harvest routes write immutable reference records into a corpus under
`docs/design-base/`. Judgement turns records into *treatments* (conditional, plural, arbitrated)
and *directions* (global, exclusive). The two meet only through **registers**. Runtime modules live
in `shared/chart-beat/` and are carried byte-identical into the seven skills that need them. Three
guards prove the knowledge reached the pixel.

**Tech Stack:** Bun, TypeScript, `bun:test`, React + `renderStill` (resvg), `puppeteer-core` with a
resolved system Chrome, `pngjs`, d3-scale/array/shape.

**Spec:** `docs/splash/2026-09-07-design-base-treatments-and-directions-spec.md`

## Global Constraints

- **Bun only.** Never `npm`, never `node`. Tests: `bun test`.
- **Code, comments, commit messages and branch names in English**, without exception.
- **No cross-skill imports.** `skills/splash/test/no-cross-skill-imports.test.ts` fails on any
  specifier that leaves a skill directory. A mechanism two skills share is **carried**, never
  imported.
- **Carried copies.** Line 1 of a carried file is `// twin/<canonical repo path>`; the copy holds
  the canonical's own line 1 and is byte-identical. `skills/splash/test/carried-copies.test.ts`
  walks the tree and enforces it with no registry. A new `shared/chart-beat/*.mjs` must be copied to
  all nine locations listed in Task 7.
- **TDD with mutation proof.** A test that does not go red when the behaviour is removed is not a
  test. Every guard task ends with a step that breaks the code and observes red.
- **The fast lane stays green:** `bun test $(bun scripts/test-lanes.mjs --fast)` — 2257 pass, 4
  skip, 0 fail on 113 files at `c9bc6e99`. Never let it regress.
- **No credential in the repository.** `skills/splash/test/no-key-in-the-repository.test.ts`. Keys
  come from the environment; harvested pages never carry one into a record.
- **`renderStill({ name })` takes a STEM.** It writes `join(outDir, name + ".svg")` and
  `join(outDir, name + ".png")` (`shared/chart-beat/render-still.mjs:478-479`). Passing `"foo.png"`
  produces `foo.png.png`. This was hit during the probes.
- **`scale`:** pass `scale: 1` for any beat that pins its export size; `2` is the un-migrated
  default and doubles every `strokeWidth` and `strokeDasharray` the component asked for.

## File Structure

**Harvest chain — repo scripts, not a skill** (they run at authoring time, never inside a delivered
root):

| file | responsibility |
| --- | --- |
| `scripts/design-base/pixel-palette.mjs` | the pixel route: ground, chromatic palette, neutral furniture, palette shape |
| `scripts/design-base/harvest-styles.mjs` | the style route: computed-style type tuples, SVG mark colours, column measure, graphic box |
| `scripts/design-base/harvest.mjs` | runs both routes over a pool, writes `measured.json` + `screenshot.png` per reference |
| `scripts/design-base/build-indexes.mjs` | regenerates both indexes from the records |

**Corpus — records and judgement:**

| path | responsibility |
| --- | --- |
| `docs/design-base/METHOD.md` | the runbook and the yield log |
| `docs/design-base/references/<family>/<id>/` | `measured.json`, `screenshot.png`, `NOTES.md` |
| `docs/design-base/treatments/<id>.md` | one treatment |
| `docs/design-base/directions/<id>.md` | one direction |
| `docs/design-base/INDEX-BY-ARTIFACT.md` | generated |
| `docs/design-base/INDEX-BY-LEVER.md` | generated |

**Runtime — canonical in `shared/chart-beat/`, carried into skills:**

| file | responsibility |
| --- | --- |
| `shared/chart-beat/registers.mjs` | the six register names, and `resolveRegister(direction, name)` |
| `shared/chart-beat/direction.mjs` | parse and validate a direction record; `readDirection(dir)` |
| `shared/chart-beat/treatments.mjs` | the treatment registry and `applicableTreatments(facts)` |
| `shared/chart-beat/arbiter.mjs` | resolve competing label placements; report available vs taken |
| `shared/chart-beat/glyph-coverage.mjs` | does this family cover this text, before render |

**Guards — `skills/splash/test/`:**

| file | proves |
| --- | --- |
| `design-base-records-are-complete.test.ts` | every record has its sections; every treatment has ≥2 evidence |
| `treatment-labels-do-not-collide.test.ts` | guard 1, composition |
| `a-direction-covers-its-glyphs.test.ts` | guard 2, glyph coverage |
| `a-direction-clears-the-contrast-floors.test.ts` | guard 3, contrast |

---

## Phase 1 — the harvest chain

### Task 1: The pixel route

**Files:**
- Create: `scripts/design-base/pixel-palette.mjs`
- Create: `skills/splash/test/pixel-palette.test.ts`
- Create: `skills/splash/test/fixtures/palette/` (four tiny PNGs, written by the test's own setup)

**Interfaces:**
- Produces: `readPixelPalette(pngPath, { crop?: [x,y,w,h], top?: number })` returning
  `{ ground: {hex, share}, chromatic: Colour[], neutral: Colour[], shape, clusters }`
  where `Colour = { hex, share, h, s, l }` and
  `shape ∈ "diverging" | "sequential" | "categorical" | "monochrome"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { readPixelPalette } from "../../../scripts/design-base/pixel-palette.mjs";

const DIR = join(import.meta.dirname, "fixtures", "palette");

/** Paint a 100x100 image: a white ground, then `bands` painted as equal vertical stripes. */
function paint(name: string, bands: Array<[number, number, number]>): string {
  mkdirSync(DIR, { recursive: true });
  const png = new PNG({ width: 100, height: 100 });
  for (let y = 0; y < 100; y += 1)
    for (let x = 0; x < 100; x += 1) {
      const i = (100 * y + x) << 2;
      // The stripes occupy the left 40%, so the ground stays the modal colour.
      const band = x < 40 ? bands[Math.floor((x / 40) * bands.length)] : [255, 255, 255];
      png.data[i] = band[0]; png.data[i + 1] = band[1]; png.data[i + 2] = band[2]; png.data[i + 3] = 255;
    }
  const path = join(DIR, `${name}.png`);
  writeFileSync(path, PNG.sync.write(png));
  return path;
}

describe("the pixel route", () => {
  it("should report the modal colour as the ground", () => {
    const out = readPixelPalette(paint("one", [[228, 30, 38]]));
    expect(out.ground.hex).toBe("#FFFFFF");
  });

  it("should call two opposed hues diverging, not categorical", () => {
    // The defect this closes: max(hue) - min(hue) reported 207 degrees for a two-pole poster and
    // called it categorical. Spread cannot tell two clusters from six.
    const out = readPixelPalette(paint("two", [[228, 30, 38], [17, 106, 181]]));
    expect(out.shape).toBe("diverging");
    expect(out.clusters).toHaveLength(2);
  });

  it("should call four separated hues categorical", () => {
    const out = readPixelPalette(paint("four", [[228, 30, 38], [17, 106, 181], [255, 228, 51], [89, 93, 156]]));
    expect(out.shape).toBe("categorical");
  });

  it("should find every pole on a sparse graphic, where each covers under one percent", () => {
    // The defect this closes: an absolute noise floor of 0.4% of all pixels called a network
    // diagram monochrome, because each of its six hues covered ~0.3% of a 90.9% white page. The
    // floor is relative to the coloured ink, never to the image.
    const png = new PNG({ width: 200, height: 200 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255; png.data[i + 1] = 255; png.data[i + 2] = 255; png.data[i + 3] = 255;
    }
    const poles: Array<[number, number, number]> = [[228, 30, 38], [17, 106, 181], [255, 228, 51]];
    poles.forEach((c, k) => {
      for (let y = 0; y < 12; y += 1)
        for (let x = 0; x < 12; x += 1) {
          const i = (200 * (10 + y) + (10 + k * 20 + x)) << 2;
          png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2];
        }
    });
    mkdirSync(DIR, { recursive: true });
    const path = join(DIR, "sparse.png");
    writeFileSync(path, PNG.sync.write(png));

    const out = readPixelPalette(path);
    expect(out.ground.hex).toBe("#FFFFFF");
    expect(out.clusters.length).toBe(3);
    expect(out.shape).toBe("categorical");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/pixel-palette.test.ts`
Expected: FAIL — `Cannot find module '../../../scripts/design-base/pixel-palette.mjs'`.

- [ ] **Step 3: Implement**

Port the validated probe from the session scratchpad, exporting `readPixelPalette` rather than printing.
Line 1 must be `// twin/scripts/design-base/pixel-palette.mjs` so `carried-copies.test.ts` reads it
as a canonical.

```js
// twin/scripts/design-base/pixel-palette.mjs
//
// The PIXEL route: an artifact's colour signature read off its own pixels. The computed-style route
// only reaches SVG marks; a poster, a canvas chart and a video frame carry a full art direction and
// expose no styles at all — measured on informationisbeautiful.net, where four pieces returned
// 17-23 type tuples and ZERO mark colours.

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const BITS = 5;
const SHIFT = 8 - BITS;
/** Below this saturation a colour is furniture, not palette. Measured at the point where the IIB
 *  posters' own pale zone tints still separate from their greys. */
const CHROMATIC_MIN_SATURATION = 0.22;
/** A hue cluster carrying less than this share of the COLOURED ink is noise, not a pole. */
const CLUSTER_MIN_INK_SHARE = 0.06;
/** Two colours within this many degrees are the same pole. */
const SAME_POLE_DEGREES = 40;
/** A cluster whose members span at least this much lightness is a ramp, not a flat category. */
const RAMP_MIN_LIGHTNESS_SPAN = 0.12;

function hsl(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0)) / 6
    : max === G ? ((B - R) / d + 2) / 6
    : ((R - G) / d + 4) / 6;
  return { h: h * 360, s, l };
}

const hex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Hue is circular: 358 and 2 are four degrees apart, not 356. */
function hueGap(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function hueClusters(colours) {
  const clusters = [];
  for (const c of [...colours].sort((a, b) => b.share - a.share)) {
    const home = clusters.find((cl) => hueGap(cl.h, c.h) <= SAME_POLE_DEGREES);
    if (home) { home.members.push(c); home.share += c.share; }
    else clusters.push({ h: c.h, members: [c], share: c.share });
  }
  const ink = colours.reduce((sum, c) => sum + c.share, 0) || 1;
  return clusters.filter((cl) => cl.share / ink >= CLUSTER_MIN_INK_SHARE);
}

export function readPixelPalette(file, { crop = null, top = 10 } = {}) {
  const png = PNG.sync.read(readFileSync(file));
  const [cx, cy, cw, ch] = crop ?? [0, 0, png.width, png.height];
  const buckets = new Map();
  let counted = 0;
  for (let y = cy; y < Math.min(png.height, cy + ch); y += 1)
    for (let x = cx; x < Math.min(png.width, cx + cw); x += 1) {
      const i = (png.width * y + x) << 2;
      if (png.data[i + 3] < 250) continue;
      const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
      const key = ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);
      const seen = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      seen.n += 1; seen.r += r; seen.g += g; seen.b += b;
      buckets.set(key, seen);
      counted += 1;
    }

  const entries = [...buckets.values()]
    .map((v) => {
      const r = v.r / v.n, g = v.g / v.n, b = v.b / v.n;
      return { hex: hex(r, g, b), share: v.n / counted, ...hsl(r, g, b) };
    })
    .sort((a, b) => b.share - a.share);

  const coloured = entries.filter((e) => e.s >= CHROMATIC_MIN_SATURATION && e.l > 0.06 && e.l < 0.97);
  // Cluster over a wider set than is reported: a pole and its tints must both be present for the
  // ramp test to see them, and `top` is a reporting choice, not a measurement one.
  const clusters = hueClusters(coloured.slice(0, 24));
  const ramped = clusters.filter((cl) => {
    const ls = cl.members.map((m) => m.l);
    return cl.members.length >= 2 && Math.max(...ls) - Math.min(...ls) >= RAMP_MIN_LIGHTNESS_SPAN;
  }).length;

  const shape =
    coloured.length === 0 ? "monochrome"
    : clusters.length <= 1 ? (ramped ? "sequential" : "monochrome")
    : clusters.length === 2 ? "diverging"
    : "categorical";

  return {
    ground: entries[0],
    chromatic: coloured.slice(0, top),
    neutral: entries.filter((e) => e.s < CHROMATIC_MIN_SATURATION).slice(0, top),
    clusters: clusters.map((c) => ({ hue: Math.round(c.h), share: c.share, size: c.members.length })),
    ramped,
    shape,
    pixels: counted,
  };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/pixel-palette.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Prove the guards bite**

Change `CLUSTER_MIN_INK_SHARE` to an absolute filter (`cl.share >= 0.004`) and re-run: the sparse
test must go red. Change the shape rule back to `max(hue) - min(hue) > 120`: the diverging test must
go red. Restore both.

- [ ] **Step 6: Commit**

```bash
git add scripts/design-base/pixel-palette.mjs skills/splash/test/pixel-palette.test.ts
git commit -m "feat(design-base): read an artifact's colour signature off its pixels" -- \
  scripts/design-base/pixel-palette.mjs skills/splash/test/pixel-palette.test.ts
```

> **Pathspec, always.** This tree is worked by more than one agent. `git commit` without a pathspec
> takes the whole index, including someone else's staged work.

---

### Task 2: The style route

**Files:**
- Create: `scripts/design-base/harvest-styles.mjs`
- Create: `skills/splash/test/harvest-styles.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `harvestStyles(page)` — takes an open Puppeteer page, returns
  `{ title, ground, type: TypeTuple[], marks: MarkColour[], column, graphic }` where
  `TypeTuple = { family, size, weight, style, tracking, transform, count, sample, colors }`.
  Exported separately from the browser driving so it can be unit-tested against a fixture page.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { harvestStyles } from "../../../scripts/design-base/harvest-styles.mjs";

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

describe("the style route", () => {
  it("should record italic, tracking and case as distinct tuples", async () => {
    const chrome = CHROMES.find(existsSync);
    if (!chrome) return; // headless Chrome is a live-lane dependency, not a fast-lane one
    const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><body style="background:#FFFCEE">
      <h1 style="font-family:Georgia;font-size:30px;font-weight:700">Plain heading</h1>
      <p style="font-family:Georgia;font-size:14px;font-style:italic">An italic caveat that runs long enough to measure.</p>
      <span style="font-family:Helvetica;font-size:10px;letter-spacing:2px;text-transform:uppercase">tracked label</span>
      <svg width="50" height="50"><circle cx="25" cy="25" r="20" fill="#0B7A75"></circle></svg>
    </body>`);
    const out = await harvestStyles(page);
    await browser.close();

    expect(out.ground).toBe("rgb(255, 252, 238)");
    const italic = out.type.find((t) => t.style === "italic");
    expect(italic?.family).toBe("Georgia");
    const tracked = out.type.find((t) => Number(t.tracking) === 2);
    expect(tracked?.transform).toBe("uppercase");
    expect(out.marks.some((m) => m.colour.includes("11, 122, 117"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/harvest-styles.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Port the validated probe from the session scratchpad, splitting the in-page measurement into an
exported `harvestStyles(page)` that calls `page.evaluate`. Line 1 is
`// twin/scripts/design-base/harvest-styles.mjs`. Keep the in-page rules exactly as validated:

- one entry per element that paints its **own** text nodes, so a wrapper never inherits its child's
  run;
- visibility judged by a real box (≥2 px on both axes), `visibility`, `display` and `opacity > 0.05`;
- key is `family | size | weight | style | tracking | transform`, with `normal` tracking recorded as
  `0`;
- marks read `fill` and `stroke` off `svg path|rect|circle|line|polygon|ellipse`, skipping `none`
  and fully transparent;
- the column measure is taken from the widest painted `<p>` of at least 120 characters;
- the graphic is the largest visible `svg`, `canvas` or `figure img`, with its ratio.

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/harvest-styles.test.ts`
Expected: PASS.

- [ ] **Step 5: Prove the tests bite, and check the lane is derived**

`scripts/test-lanes.mjs` derives lanes **off the source**, following imports — there is no list to
edit. A test importing `puppeteer-core` lands in the HEAVY lane on its own; only a `*.live.test.ts`
filename means live. Confirm with `bun scripts/test-lanes.mjs --why | grep harvest-styles`.

Then mutate three decisions and watch each kill a distinct test:

1. drop `style`, `tracking` and `transform` from the tuple key → the four-register test goes red;
2. record `letterSpacing: "normal"` as the word rather than `0` → the zero-tracking test goes red;
3. remove the `painted(el)` guard → the not-painted test goes red.

**A fixture whose runs differ on more than one axis cannot catch mutation 1.** Four spans agreeing
on family, size and weight and differing one axis each are what make the key testable; without them
the mutation stays green and the test proves nothing.

- [ ] **Step 6: Commit**

```bash
git add scripts/design-base/harvest-styles.mjs skills/splash/test/harvest-styles.test.ts scripts/test-lanes.mjs
git commit -m "feat(design-base): read a page's own typographic signature from its computed styles" -- \
  scripts/design-base/harvest-styles.mjs skills/splash/test/harvest-styles.test.ts scripts/test-lanes.mjs
```

---

### Task 3: One harvest, both routes

**Files:**
- Create: `scripts/design-base/harvest.mjs`
- Create: `skills/splash/test/a-record-names-its-route.test.ts`

**Interfaces:**
- Consumes: `readPixelPalette` (Task 1), `harvestStyles` (Task 2).
- Produces: `harvestReference({ url, archive, family, id, outRoot })` writing
  `docs/design-base/references/<family>/<id>/measured.json` and `screenshot.png`. The JSON shape:

```json
{
  "url": "https://…",
  "archive": "url-list | informationisbeautiful | datavizproject | buried-signals",
  "family": "line",
  "id": "abc-mullet-count",
  "harvestedAt": "2026-09-07",
  "style": { "title": "…", "ground": "…", "type": [], "marks": [], "column": {}, "graphic": {} },
  "pixel": { "ground": {}, "chromatic": [], "neutral": [], "clusters": [], "shape": "diverging" },
  "routes": { "style": "ok", "pixel": "ok" }
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const REFS = join(ROOT, "docs", "design-base", "references");

describe("every harvested record", () => {
  it("should carry both routes and say what each returned", () => {
    if (!existsSync(REFS)) return;
    for (const family of readdirSync(REFS)) {
      for (const id of readdirSync(join(REFS, family))) {
        const dir = join(REFS, family, id);
        const record = JSON.parse(readFileSync(join(dir, "measured.json"), "utf8"));
        expect(record.routes, `${family}/${id} names no routes`).toBeDefined();
        // Neither route is a fallback for the other. A record measured by one only is
        // under-measured, and must say so rather than look complete.
        expect(Object.keys(record.routes).sort()).toEqual(["pixel", "style"]);
        for (const [route, state] of Object.entries(record.routes))
          expect(["ok", "failed", "not-applicable"], `${family}/${id} ${route}`).toContain(state);
        expect(["url-list", "informationisbeautiful", "datavizproject", "buried-signals"])
          .toContain(record.archive);
        expect(existsSync(join(dir, "screenshot.png")), `${family}/${id} has no visual trace`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and watch it pass vacuously, then make it real**

Run: `bun test skills/splash/test/a-record-names-its-route.test.ts`
Expected: PASS with zero records — which proves nothing yet. Write one record by hand with
`routes` missing and re-run: it must go red. Delete the hand-written record.

- [ ] **Step 3: Implement the harvester**

`harvest.mjs` opens one browser, and per url: navigates, settles, scrolls once and back (so lazy
graphics and the first scrollytelling step paint), screenshots at 1440×900, runs `harvestStyles`,
then runs `readPixelPalette` over the screenshot. Both routes always run. A route that throws is recorded
as `"failed"` with its message; it never silently omits the key.

Crop for the pixel route: the graphic's own box from the style route when one was found, else the
full screenshot. Record which was used.

- [ ] **Step 4: Harvest one real reference end to end**

Run: `bun scripts/design-base/harvest.mjs --family line --archive url-list --url "https://www.abc.net.au/news/2024-05-23/afl-mullet-count-data-analysis/103850072"`
Expected: a record directory with both routes `ok`, and a screenshot you open and look at.

- [ ] **Step 5: Run the guard against the real record**

Run: `bun test skills/splash/test/a-record-names-its-route.test.ts`
Expected: PASS, now over one real record.

- [ ] **Step 6: Commit**

```bash
git add scripts/design-base/harvest.mjs skills/splash/test/a-record-names-its-route.test.ts docs/design-base
git commit -m "feat(design-base): harvest a reference by both routes, and record which answered" -- \
  scripts/design-base/harvest.mjs skills/splash/test/a-record-names-its-route.test.ts docs/design-base
```

---

### Task 4: The runbook, the indexes, and the completeness guard

**Files:**
- Create: `docs/design-base/METHOD.md`
- Create: `scripts/design-base/build-indexes.mjs`
- Create: `skills/splash/test/design-base-records-are-complete.test.ts`

**Interfaces:**
- Consumes: the record shape from Task 3.
- Produces: `INDEX-BY-ARTIFACT.md` and `INDEX-BY-LEVER.md`, both generated. Nothing hand-edits them:
  two families harvested in parallel would conflict on a hand-edited index.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const BASE = join(ROOT, "docs", "design-base");

const REQUIRED_NOTE_SECTIONS = [
  "## What it is",
  "## What it does with information",
  "## What it does with style",
  "## What is transferable",
  "## What was not verified",
];

describe("the design base", () => {
  it("should give every reference the five sections a judgement needs", () => {
    const refs = join(BASE, "references");
    if (!existsSync(refs)) return;
    for (const family of readdirSync(refs))
      for (const id of readdirSync(join(refs, family))) {
        const notes = join(refs, family, id, "NOTES.md");
        expect(existsSync(notes), `${family}/${id} has no NOTES.md`).toBe(true);
        const text = readFileSync(notes, "utf8");
        for (const section of REQUIRED_NOTE_SECTIONS)
          expect(text, `${family}/${id} is missing "${section}"`).toContain(section);
      }
  });

  it("should back every treatment with at least two independent references", () => {
    const dir = join(BASE, "treatments");
    if (!existsSync(dir)) return;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const text = readFileSync(join(dir, file), "utf8");
      const evidence = [...text.matchAll(/^- evidence:\s*(\S+)/gm)].map((m) => m[1]);
      // One reference is an anecdote. Two independent uses is the floor at which a treatment is
      // a practice rather than one publication's habit.
      expect(new Set(evidence).size, `${file} cites ${evidence.length} reference(s)`)
        .toBeGreaterThanOrEqual(2);
    }
  });

  it("should keep both indexes in step with the records", () => {
    for (const name of ["INDEX-BY-ARTIFACT.md", "INDEX-BY-LEVER.md"]) {
      const path = join(BASE, name);
      if (!existsSync(path)) continue;
      // Generated, never hand-edited: two families harvested in parallel would conflict.
      expect(readFileSync(path, "utf8"))
        .toContain("<!-- generated by scripts/design-base/build-indexes.mjs — do not edit -->");
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/design-base-records-are-complete.test.ts`
Expected: FAIL on the Task 3 record, which has no `NOTES.md`.

- [ ] **Step 3: Write `METHOD.md` and the index builder**

`METHOD.md` carries §6 of the spec as an executable runbook — the eight steps, the parallel-safety
rule, the two routes, and a yield table with one row per family per archive:

```markdown
| family | archive | drawn | harvested | survived reading | filed |
| --- | --- | ---: | ---: | ---: | ---: |
```

`build-indexes.mjs` walks the records and writes both indexes, each opening with the
do-not-edit marker the test asserts. `INDEX-BY-ARTIFACT.md` uses DVP's own STORY / PROPERTY / SHAPE
vocabulary for its shape column rather than inventing a parallel one.

- [ ] **Step 4: Write the missing `NOTES.md` and run both**

Run: `bun scripts/design-base/build-indexes.mjs && bun test skills/splash/test/design-base-records-are-complete.test.ts`
Expected: PASS.

- [ ] **Step 5: Prove the guard bites**

Delete one required heading from the `NOTES.md`; the first test must go red. Remove one of a
treatment's two evidence lines; the second must go red. Hand-edit an index to drop the marker; the
third must go red. Restore all three.

- [ ] **Step 6: Commit**

```bash
git add docs/design-base scripts/design-base/build-indexes.mjs skills/splash/test/design-base-records-are-complete.test.ts
git commit -m "feat(design-base): the runbook, the generated indexes, and the record floor" -- \
  docs/design-base scripts/design-base/build-indexes.mjs skills/splash/test/design-base-records-are-complete.test.ts
```

---

## Phase 2 — the corpus for the line family

### Task 5: Harvest the line family across three archives and four exports

**Files:**
- Create: `docs/design-base/references/line/<id>/` × ~15
- Modify: `docs/design-base/METHOD.md` (the yield table)

**Interfaces:**
- Consumes: `harvest.mjs` (Task 3).
- Produces: the reference records Task 6 files treatments and directions from.

- [ ] **Step 1: Draw the pool, and write down how**

Filter `~/Downloads/infoviz-source-urls-alive.txt` to time-series pieces, then to domains that serve
without a paywall. Measured on 2026-09-07: NYT + WaPo + Bloomberg + WSJ ≈ 1 184 of the 3 827 urls
are largely paywalled and are excluded unless a route to the real artifact exists. Add pieces from
`informationisbeautiful.net` (by subject) and from `100.datavizproject.com` (its line and area
encodings of the fixed dataset). Record the filter and the counts in `METHOD.md`.

Target the spread deliberately: at least three references per export — static, web, video, scrolly —
and at least two from each archive.

- [ ] **Step 2: Harvest**

Run `harvest.mjs` over the pool. Expect failures; record them as failures.

- [ ] **Step 3: Look at every screenshot, and read what sits beside the graphic**

This is the step that cannot be skipped or automated. `reference-set.md`'s standing rule applies
verbatim: a lesson written from a promotional card, a `<meta>` image or a design mockup is not a
lesson. `NOTES.md` states which kind of artifact was actually read.

- [ ] **Step 4: Write `NOTES.md` for each surviving reference**

Five sections, per the guard in Task 4. Separate what is transferable from what belongs to that
publication.

- [ ] **Step 5: Regenerate and check**

Run: `bun scripts/design-base/build-indexes.mjs && bun test skills/splash/test/design-base-records-are-complete.test.ts skills/splash/test/a-record-names-its-route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/design-base
git commit -m "feat(design-base): the line family's references, measured by both routes" -- docs/design-base
```

---

### Task 6: File the treatments and the directions

**Files:**
- Create: `docs/design-base/treatments/*.md` (≥4)
- Create: `docs/design-base/directions/*.md` (≥3)

**Interfaces:**
- Produces: the records Phase 3's runtime reads. A treatment file's fields are exactly §5.2 of the
  spec; a direction's are exactly §5.3.

Four treatments are already evidenced by the probes and are the floor, not the ceiling:

| id | applies when | draws |
| --- | --- | --- |
| `area-to-reference` | the beat carries a reference level | a band between the series and the level, accent tint above, neutral below |
| `crossing-marked` | …and the series crosses it | a mark and an `annot` label at the crossing |
| `raw-under-smoothed` | the series is long and visibly noisy | faint per-reading dots under a bold centred mean |
| `era-bands` | datable events fall inside the series' span | a flat band per era with an `eyebrow` label |

Three directions are already measured and are the floor: `creme` (ABC), `nocturne` (The Pudding),
`rapport` (ProPublica).

- [ ] **Step 1: Write one treatment and watch the evidence guard fail**

Write `area-to-reference.md` citing **one** reference. Run
`bun test skills/splash/test/design-base-records-are-complete.test.ts`.
Expected: FAIL — "cites 1 reference(s)".

- [ ] **Step 2: Find the second use, or drop the treatment**

Add the second independent reference from the corpus. Re-run: PASS. A treatment that cannot find a
second use is not filed — that is the guard doing its job, not an obstacle to route around.

- [ ] **Step 3: File the remaining treatments and the three directions**

Each direction's `measuredFrom` names the reference **and the measurement that produced each
value** — `ground: #FFFCEE (pixel route, modal colour, 61.5% coverage)`, not `ground: #FFFCEE`.

- [ ] **Step 4: Regenerate the indexes and check**

Run: `bun scripts/design-base/build-indexes.mjs && bun test skills/splash/test/design-base-records-are-complete.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/design-base
git commit -m "feat(design-base): four treatments and three directions, each with its evidence" -- docs/design-base
```

---

## Phase 3 — the runtime, and the guards that prove it reached the pixel

### Task 7: Registers

**Files:**
- Create: `shared/chart-beat/registers.mjs`
- Create: `skills/splash/test/registers.test.ts`
- Copy to (byte-identical, line 1 `// twin/shared/chart-beat/registers.mjs`):
  `skills/chart-beat/scripts/`, `skills/chart-video/scripts/`, `skills/chart-web/scripts/`,
  `skills/image-beat/scripts/`, `skills/map-beat/scripts/`, `skills/map-web/scripts/`,
  `skills/scrolly/scripts/`, `skills/splash/assets/root-template/shared/chart-beat/`

**Interfaces:**
- Produces:
  - `REGISTERS` — the frozen list `["display","eyebrow","body","axis","annot","value"]`
  - `resolveRegister(direction, name)` → `{ family, fontSize, fontWeight, fontStyle, letterSpacing, transform, ink }`
  - `applyCase(text, transform)` → the text as the register sets it

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { REGISTERS, resolveRegister, applyCase } from "../../../shared/chart-beat/registers.mjs";

const DIRECTION = {
  id: "rapport",
  ground: "#FFFFFF",
  accent: "#1F5C8B",
  registers: {
    display: { family: "Iowan Old Style", size: 27, weight: 700, italic: false, tracking: -0.3, transform: "none", ink: "ink" },
    eyebrow: { family: "Helvetica Neue", size: 9.5, weight: 700, italic: false, tracking: 1.6, transform: "uppercase", ink: "accent" },
    body: { family: "Iowan Old Style", size: 13, weight: 400, italic: true, tracking: 0, transform: "none", ink: "muted" },
    axis: { family: "Helvetica Neue", size: 11, weight: 400, italic: false, tracking: 0.5, transform: "none", ink: "muted" },
    annot: { family: "Helvetica Neue", size: 10, weight: 700, italic: false, tracking: 1.3, transform: "uppercase", ink: "ink" },
    value: { family: "Helvetica Neue", size: 14.5, weight: 700, italic: false, tracking: 0, transform: "none", ink: "accent" },
  },
};

describe("registers", () => {
  it("should name six, and only six", () => {
    expect(REGISTERS).toEqual(["display", "eyebrow", "body", "axis", "annot", "value"]);
  });

  it("should resolve a register into attributes an SVG text element can take", () => {
    const r = resolveRegister(DIRECTION, "body");
    expect(r.fontStyle).toBe("italic");
    expect(r.fontSize).toBe(13);
    expect(r.letterSpacing).toBe(0);
  });

  it("should refuse a register the direction does not define", () => {
    const partial = { ...DIRECTION, registers: { display: DIRECTION.registers.display } };
    expect(() => resolveRegister(partial, "annot")).toThrow(/annot/);
  });

  it("should apply the register's own case rather than leaving it to the caller", () => {
    // The probe hard-coded `.toUpperCase()` at four call sites. A treatment must not know whether
    // a direction sets its annotations in capitals.
    expect(applyCase("sous le niveau", DIRECTION.registers.annot.transform)).toBe("SOUS LE NIVEAU");
    expect(applyCase("sous le niveau", DIRECTION.registers.body.transform)).toBe("sous le niveau");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/registers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// twin/shared/chart-beat/registers.mjs
//
// The one interface between the two axes of the design base. A TREATMENT names the register it
// writes into; a DIRECTION says what that register looks like. Neither knows the other's internals,
// which is what lets treatments compose across directions and directions apply across treatments.

/** Six, and the list is closed: a seventh register is a design decision, not a convenience. */
export const REGISTERS = Object.freeze(["display", "eyebrow", "body", "axis", "annot", "value"]);

const INK_ROLES = Object.freeze(["ink", "muted", "accent"]);

/**
 * A register resolved into the attributes an SVG `<text>` actually takes. `ink` stays a ROLE here,
 * not a colour: the colour is derived from the newsroom ground by `deriveFurniture`, which is what
 * keeps a dark direction legible without any direction naming a literal.
 */
export function resolveRegister(direction, name) {
  if (!REGISTERS.includes(name)) throw new Error(`no such register: ${name}`);
  const spec = direction?.registers?.[name];
  if (!spec) throw new Error(`direction ${direction?.id ?? "?"} defines no ${name} register`);
  if (!INK_ROLES.includes(spec.ink))
    throw new Error(`register ${name} asks for ink role ${spec.ink}, not one of ${INK_ROLES.join(", ")}`);
  return {
    fontFamily: spec.family,
    fontSize: spec.size,
    fontWeight: spec.weight,
    fontStyle: spec.italic ? "italic" : "normal",
    letterSpacing: spec.tracking,
    transform: spec.transform,
    ink: spec.ink,
  };
}

/** The register's own case, applied here rather than at every call site. */
export function applyCase(text, transform) {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/registers.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Carry the copies and prove the parity guard sees them**

Copy the file to the eight locations listed under **Files**, byte for byte, each keeping line 1 as
`// twin/shared/chart-beat/registers.mjs`. Then change one byte in one copy and run
`bun test skills/splash/test/carried-copies.test.ts` — it must go red naming that copy. Restore it.

- [ ] **Step 6: Commit**

```bash
git add shared/chart-beat/registers.mjs skills/*/scripts/registers.mjs \
  skills/splash/assets/root-template/shared/chart-beat/registers.mjs skills/splash/test/registers.test.ts
git commit -m "feat(design-base): registers, the one interface between treatment and direction" -- \
  shared/chart-beat/registers.mjs skills/*/scripts/registers.mjs \
  skills/splash/assets/root-template/shared/chart-beat/registers.mjs skills/splash/test/registers.test.ts
```

---

### Task 8: Glyph coverage — guard 2

**Files:**
- Create: `shared/chart-beat/glyph-coverage.mjs` (+ the eight carried copies from Task 7)
- Create: `skills/splash/test/a-direction-covers-its-glyphs.test.ts`

**Interfaces:**
- Consumes: `resolveRegister` (Task 7).
- Produces: `assertCoversText(family, text, { where })` — throws naming the family, the missing
  code points and where they were asked for; `missingGlyphs(family, text)` → `string[]`.

**Why this exists, measured:** `CO2` sets in the requested family at the requested weight; `CO₂`
(U+2082) drops the **entire text run** to an oblique fallback and loses the weight — on
Superclarendon, Iowan Old Style and Futura, three for three, with the render exiting zero. It does
not bite today only because the default family is `Helvetica, Arial, sans-serif`. It bites the day a
newsroom records a display serif.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { missingGlyphs, assertCoversText } from "../../../shared/chart-beat/glyph-coverage.mjs";

describe("glyph coverage", () => {
  it("should find the subscript that silently drops a whole run to a fallback", () => {
    // Measured 2026-09-07: one missing code point does not fall back for that CHARACTER, it falls
    // back for the entire text element, and the requested weight is lost with it.
    expect(missingGlyphs("Superclarendon", "CO₂")).toContain("U+2082");
  });

  it("should pass a family that covers everything it is asked for", () => {
    expect(missingGlyphs("Helvetica", "CO₂ territoire")).toEqual([]);
  });

  it("should name the family, the code point and the caller in what it throws", () => {
    expect(() => assertCoversText("Superclarendon", "CO₂", { where: "display register, title" }))
      .toThrow(/Superclarendon.*U\+2082.*display register, title/s);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/a-direction-covers-its-glyphs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Measure coverage the way the rest of this tree measures type: rasterise a probe and read its box.
`render-still.mjs` already resolves system fonts through resvg's `loadSystemFonts`, and already
measures a string's box (`measureText`). A character the family lacks is drawn by the fallback and
its advance differs; the reliable signal is comparing the probe rendered in the family against the
same probe rendered in a family known to lack the character. Prefer the direct route where the
platform allows it: read the font file's `cmap` for the code point, and fall back to the raster
comparison only when the family cannot be located on disk. Record in the file's header which route
the implementation took and why.

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/a-direction-covers-its-glyphs.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Prove it bites where it matters**

Add a fourth test that walks every filed direction (Task 6) and every string
`proof/co2-suisse/render-web.mjs`'s `BEAT` carries, asserting coverage for the register each string
is set in. It must go red today for `creme`, `nocturne` and `rapport` on the title — which is the
defect the probes found. Fix the three directions by choosing covering families or by declaring a
fallback chain, and watch it go green.

- [ ] **Step 6: Commit**

```bash
git add shared/chart-beat/glyph-coverage.mjs skills/*/scripts/glyph-coverage.mjs \
  skills/splash/assets/root-template/shared/chart-beat/glyph-coverage.mjs \
  skills/splash/test/a-direction-covers-its-glyphs.test.ts docs/design-base/directions
git commit -m "fix(design-base): a family that cannot set the text is refused before the render" -- \
  shared/chart-beat/glyph-coverage.mjs skills/*/scripts/glyph-coverage.mjs \
  skills/splash/assets/root-template/shared/chart-beat/glyph-coverage.mjs \
  skills/splash/test/a-direction-covers-its-glyphs.test.ts docs/design-base/directions
```

---

### Task 9: Treatments and their applicability

**Files:**
- Create: `shared/chart-beat/treatments.mjs` (+ the eight carried copies)
- Create: `skills/splash/test/treatments-apply-to-the-data-they-claim.test.ts`

**Interfaces:**
- Consumes: `REGISTERS` (Task 7).
- Produces:
  - `applicableTreatments(facts)` → `Treatment[]`, where
    `facts = { hasReference, crosses, crossingYear, seriesLength, noisiness, eras, peers }`
  - `beatFacts(data, { reference, eras })` → `facts`, so a caller never assembles them by hand

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { beatFacts, applicableTreatments } from "../../../shared/chart-beat/treatments.mjs";

const SERIES = Array.from({ length: 75 }, (_, i) => ({ year: 1950 + i, mt: 10 + Math.sin(i) * 3 + i * 0.3 }));

describe("treatment applicability", () => {
  it("should offer the crossing treatment only when the series actually crosses", () => {
    const crossing = beatFacts(SERIES, { reference: 25 });
    expect(applicableTreatments(crossing).map((t) => t.id)).toContain("crossing-marked");

    const never = beatFacts(SERIES, { reference: 1000 });
    expect(applicableTreatments(never).map((t) => t.id)).not.toContain("crossing-marked");
  });

  it("should not offer era bands for events outside the series' own span", () => {
    const facts = beatFacts(SERIES, { reference: 25, eras: [{ from: 1830, to: 1840, label: "too early" }] });
    expect(applicableTreatments(facts).map((t) => t.id)).not.toContain("era-bands");
  });

  it("should name, for every offered treatment, the register it writes into", () => {
    const facts = beatFacts(SERIES, { reference: 25 });
    for (const t of applicableTreatments(facts)) expect(t.draws.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/treatments-apply-to-the-data-they-claim.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

The four treatments from Task 6, each with its `applies` predicate evaluated against `facts`, and
each declaring the registers it writes into. `beatFacts` derives `crosses`/`crossingYear` the way
`proof/co2-suisse/crossing-geometry.ts` already does — the first reading after the peak at or below
the reference — and derives `noisiness` as the mean absolute year-on-year change over the series'
own range, so "noisy" is a measured property rather than a judgement.

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/treatments-apply-to-the-data-they-claim.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Carry the copies, and check parity**

Run: `bun test skills/splash/test/carried-copies.test.ts` — PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/chart-beat/treatments.mjs skills/*/scripts/treatments.mjs \
  skills/splash/assets/root-template/shared/chart-beat/treatments.mjs \
  skills/splash/test/treatments-apply-to-the-data-they-claim.test.ts
git commit -m "feat(design-base): a treatment applies to the data shape it claims, and says so" -- \
  shared/chart-beat/treatments.mjs skills/*/scripts/treatments.mjs \
  skills/splash/assets/root-template/shared/chart-beat/treatments.mjs \
  skills/splash/test/treatments-apply-to-the-data-they-claim.test.ts
```

---

### Task 10: The arbiter, and guard 1 — composition

**Files:**
- Create: `shared/chart-beat/arbiter.mjs` (+ the eight carried copies)
- Create: `skills/splash/test/treatment-labels-do-not-collide.test.ts`

**Interfaces:**
- Consumes: `applicableTreatments` (Task 9), `resolveRegister` (Task 7).
- Produces:
  - `placeLabels(requests, { frame, measure })` → `{ placed: Placed[], dropped: Dropped[] }`
    where `Placed = { id, treatment, x, y, anchor, box }` and
    `Dropped = { id, treatment, why }`
  - `report(available, taken)` → the line a journalist is shown

**Why this exists, measured:** with five treatments enabled, three labels stacked in one corner —
`PIC DE 1973`, `CHOC PÉTROLIER`, `SECOND CHOC`. Each treatment placed *its own* correctly; none
could see the others.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { placeLabels } from "../../../shared/chart-beat/arbiter.mjs";

/** A measure stub: every character is 6px wide, every line 12px tall. */
const measure = (text: string) => ({ width: text.length * 6, height: 12 });
const FRAME = { left: 0, top: 0, right: 900, bottom: 500 };

describe("the arbiter", () => {
  it("should not place two labels on top of each other", () => {
    const { placed } = placeLabels(
      [
        { id: "peak", treatment: "peak-marked", text: "PIC DE 1973", at: { x: 300, y: 100 }, priority: 2 },
        { id: "era-1", treatment: "era-bands", text: "CHOC PÉTROLIER", at: { x: 305, y: 104 }, priority: 1 },
      ],
      { frame: FRAME, measure },
    );
    const [a, b] = placed.map((p) => p.box);
    const overlaps =
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlaps).toBe(false);
  });

  it("should drop the lower-priority label rather than push it off the frame", () => {
    const { placed, dropped } = placeLabels(
      [
        { id: "a", treatment: "t1", text: "AAAAAAAAAAAAAAAAAAAA", at: { x: 880, y: 10 }, priority: 3 },
        { id: "b", treatment: "t2", text: "BBBBBBBBBBBBBBBBBBBB", at: { x: 882, y: 12 }, priority: 1 },
      ],
      { frame: FRAME, measure },
    );
    expect(placed.map((p) => p.id)).toEqual(["a"]);
    expect(dropped[0]).toMatchObject({ id: "b" });
    expect(dropped[0].why).toMatch(/collide|room/i);
  });

  it("should keep every placed box inside the frame", () => {
    const { placed } = placeLabels(
      [{ id: "edge", treatment: "t", text: "A LABEL AT THE EDGE", at: { x: 895, y: 495 }, priority: 1 }],
      { frame: FRAME, measure },
    );
    for (const p of placed) {
      expect(p.box.x).toBeGreaterThanOrEqual(FRAME.left);
      expect(p.box.x + p.box.width).toBeLessThanOrEqual(FRAME.right);
      expect(p.box.y + p.box.height).toBeLessThanOrEqual(FRAME.bottom);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/treatment-labels-do-not-collide.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Place in descending `priority`. For each request, try its anchor's preferred positions in order
(above, below, right, left of the anchor); accept the first whose measured box sits inside the frame
and overlaps nothing already placed; otherwise drop it with a reason. Never push a box outside the
frame to make room — an off-frame label is worse than an absent one, and `three-sizes-no-collision`
already refuses overflow elsewhere in this tree.

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/treatment-labels-do-not-collide.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Prove it bites on the real artifact**

Add a fourth test that renders `proof/co2-suisse` with all four treatments enabled, reads the
delivered SVG, and asserts no two `<text>` boxes belonging to different treatments overlap. Then
bypass the arbiter (place every label at its raw anchor) and watch it go red naming the three
stacked labels. Restore.

- [ ] **Step 6: Commit**

```bash
git add shared/chart-beat/arbiter.mjs skills/*/scripts/arbiter.mjs \
  skills/splash/assets/root-template/shared/chart-beat/arbiter.mjs \
  skills/splash/test/treatment-labels-do-not-collide.test.ts
git commit -m "feat(design-base): treatments compose through an arbiter, never by stacking" -- \
  shared/chart-beat/arbiter.mjs skills/*/scripts/arbiter.mjs \
  skills/splash/assets/root-template/shared/chart-beat/arbiter.mjs \
  skills/splash/test/treatment-labels-do-not-collide.test.ts
```

---

### Task 11: Guard 3 — a direction clears the contrast floors

**Files:**
- Create: `skills/splash/test/a-direction-clears-the-contrast-floors.test.ts`
- Modify: `docs/design-base/directions/*.md` (whichever fail)

**Interfaces:**
- Consumes: `readDirection` (Task 6 records), `resolveRegister` (Task 7), the existing
  `shared/chart-beat/annotation-ink.mjs` and `skills/palette`'s floors.

**Not yet measured, and owed:** the `nocturne` direction (`#111044` ground, `#4FE0C0` accent) has
never been through the contrast gate. It may fail. That is the point of the task.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveRegister, REGISTERS } from "../../../shared/chart-beat/registers.mjs";
import { deriveFurniture } from "../../../shared/chart-beat/render-still.mjs";
import {
  contrast,
  TEXT_CONTRAST_MIN,
  LARGE_TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "../../../shared/chart-beat/colour.mjs";
import { readDirectionFromMarkdown } from "../../../scripts/design-base/read-direction.mjs";

const BASE = join(import.meta.dirname, "..", "..", "..", "docs", "design-base", "directions");

/**
 * SC 1.4.3, relaxed at large sizes. The two numbers come from `colour.mjs`, never from here: this
 * tree's duplication ratchet exists because one decision living in two places drifts, and a floor
 * re-typed as a literal in a test is exactly that shape.
 */
function textFloor(size: number, weight: number): number {
  return size >= 24 || (size >= 18.66 && weight >= 700) ? LARGE_TEXT_CONTRAST_MIN : TEXT_CONTRAST_MIN;
}

describe("every filed direction", () => {
  it("should set every register above its own text floor on its own ground", () => {
    if (!existsSync(BASE)) return;
    for (const file of readdirSync(BASE).filter((f) => f.endsWith(".md"))) {
      const direction = readDirectionFromMarkdown(readFileSync(join(BASE, file), "utf8"));
      const furniture = deriveFurniture(direction.ground);
      const inkOf = { ink: furniture.ink, muted: furniture.muted, accent: direction.accent };
      for (const name of REGISTERS) {
        const r = resolveRegister(direction, name);
        const ratio = contrast(inkOf[r.ink], direction.ground);
        const floor = textFloor(r.fontSize, r.fontWeight);
        expect(ratio, `${file} ${name}: ${ratio.toFixed(2)}:1 against ${direction.ground}`)
          .toBeGreaterThanOrEqual(floor);
      }
    }
  });

  it("should keep the accent above the non-text floor as a mark", () => {
    if (!existsSync(BASE)) return;
    for (const file of readdirSync(BASE).filter((f) => f.endsWith(".md"))) {
      const direction = readDirectionFromMarkdown(readFileSync(join(BASE, file), "utf8"));
      // SC 1.4.11: a series stroke is a non-text mark, and its floor is a different question from
      // the same hue read as a label, which the first test asks.
      expect(contrast(direction.accent, direction.ground), `${file} accent as a mark`)
        .toBeGreaterThanOrEqual(NON_TEXT_CONTRAST_MIN);
    }
  });
});
```

`readDirectionFromMarkdown(text)` parses Task 6's direction format into the object
`resolveRegister` takes; write it as `scripts/design-base/read-direction.mjs` in this task, with
line 1 `// twin/scripts/design-base/read-direction.mjs`. Task 12's render script imports the same
parser, so it is written once here and never re-derived.

- [ ] **Step 2: Run it and record what fails**

Run: `bun test skills/splash/test/a-direction-clears-the-contrast-floors.test.ts`
Expected: at least one FAIL, with the measured ratio in the message. Write the measured numbers into
the failing direction's own record before changing anything — the number is the finding.

- [ ] **Step 3: Fix the directions, not the floors**

Adjust ground or accent in the failing direction until it clears. Never relax the floor; never add
an exception. If a direction cannot clear, it is not filed, and `METHOD.md` records why.

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test skills/splash/test/a-direction-clears-the-contrast-floors.test.ts`
Expected: PASS.

- [ ] **Step 5: Prove the guard bites**

Set one register's ink role to `muted` at a small size on the `creme` ground and watch it go red.
Restore.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/test/a-direction-clears-the-contrast-floors.test.ts \
  scripts/design-base/read-direction.mjs docs/design-base
git commit -m "feat(design-base): a direction is measured against the floors before it is offered" -- \
  skills/splash/test/a-direction-clears-the-contrast-floors.test.ts \
  scripts/design-base/read-direction.mjs docs/design-base
```

---

### Task 12: The line family's beat, drawn in every filed direction

**Files:**
- Modify: `proof/co2-suisse/EmissionsLine.tsx`
- Modify: `proof/co2-suisse/render-web.mjs` (its `BEAT` gains an `eyebrow`)
- Create: `proof/co2-suisse/render-directions.mjs`
- Create: `skills/splash/test/a-beat-renders-in-every-filed-direction.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 7–11.
- Produces: `proof/co2-suisse/renders/<direction-id>.png` and `.svg`, one per filed direction.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
const RENDERS = join(ROOT, "proof", "co2-suisse", "renders");

describe("the line family's beat", () => {
  it("should have a committed render for every filed direction", () => {
    // `renders/`, plural. A render written to `render/` receives no approval and is invisible to
    // the export guard — a defect this tree has already paid for once.
    const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
    expect(filed.length).toBeGreaterThanOrEqual(3);
    for (const id of filed)
      expect(existsSync(join(RENDERS, `${id}.png`)), `no render for direction ${id}`).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/a-beat-renders-in-every-filed-direction.test.ts`
Expected: FAIL — no renders.

- [ ] **Step 3: Rewrite the component against the interface**

`EmissionsLine.tsx` takes a `direction` and draws every text through `resolveRegister` + `applyCase`
instead of its local `TITLE`/`SUBTITLE`/`AXIS`/`LABEL`/`NOTE` constants. Treatment marks come from
`applicableTreatments(beatFacts(...))`, and every treatment label goes through `placeLabels` before
it is drawn. Delete the local constants — a constant left behind is the uniformity this whole plan
exists to remove.

- [ ] **Step 4: Render, and look at every one**

Run: `bun proof/co2-suisse/render-directions.mjs`
Expected: one `.png` and `.svg` per direction in `renders/`. **Open each and look at it.** A green
test is not a rendered chart; the probes found three real defects by looking.

- [ ] **Step 5: Run the whole fast lane**

Run: `bun test $(bun scripts/test-lanes.mjs --fast)`
Expected: PASS, with no regression against the 2257/4/0 baseline.

- [ ] **Step 6: Commit**

```bash
git add proof/co2-suisse skills/splash/test/a-beat-renders-in-every-filed-direction.test.ts
git commit -m "feat(design-base): the CO2 beat draws through registers, treatments and an arbiter" -- \
  proof/co2-suisse skills/splash/test/a-beat-renders-in-every-filed-direction.test.ts
```

---

### Task 13: The report the journalist is shown

**Files:**
- Modify: `shared/chart-beat/arbiter.mjs` (+ carried copies) — `report()`
- Modify: `proof/co2-suisse/render-directions.mjs`
- Create: `skills/splash/test/the-journalist-is-told-what-was-available.test.ts`

**Interfaces:**
- Produces: `report(available, taken, dropped)` → a plain-language block naming what was applied,
  what was available and not applied, and why each dropped label was dropped.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "bun:test";
import { report } from "../../../shared/chart-beat/arbiter.mjs";

describe("the availability report", () => {
  it("should name what was available and not taken, not only what was drawn", () => {
    const text = report(
      [{ id: "area-to-reference" }, { id: "crossing-marked" }, { id: "era-bands" }],
      [{ id: "area-to-reference" }, { id: "crossing-marked" }],
      [{ id: "era-1", treatment: "era-bands", why: "would collide with the peak label" }],
    );
    expect(text).toContain("era-bands");
    expect(text).toContain("would collide with the peak label");
  });

  it("should speak to a journalist, not print a diagnostic", () => {
    // A previous export guard handed the journalist the technical cause to arbitrate. The report
    // says what happened to the graphic, never what the code decided.
    const text = report([{ id: "era-bands" }], [], [{ id: "e", treatment: "era-bands", why: "no room" }]);
    expect(text).not.toMatch(/undefined|null|Error|stack/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test skills/splash/test/the-journalist-is-told-what-was-available.test.ts`
Expected: FAIL — `report` is not exported.

- [ ] **Step 3: Implement, and print it from the render script**

- [ ] **Step 4: Run it and watch it pass, then read the real output**

Run: `bun test skills/splash/test/the-journalist-is-told-what-was-available.test.ts && bun proof/co2-suisse/render-directions.mjs`
Expected: PASS, and a report you read as a journalist would.

- [ ] **Step 5: Carry the copies and check parity**

Run: `bun test skills/splash/test/carried-copies.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/chart-beat/arbiter.mjs skills/*/scripts/arbiter.mjs \
  skills/splash/assets/root-template/shared/chart-beat/arbiter.mjs \
  proof/co2-suisse/render-directions.mjs \
  skills/splash/test/the-journalist-is-told-what-was-available.test.ts
git commit -m "feat(design-base): the journalist sees what was available, not only what was drawn" -- \
  shared/chart-beat/arbiter.mjs skills/*/scripts/arbiter.mjs \
  skills/splash/assets/root-template/shared/chart-beat/arbiter.mjs \
  proof/co2-suisse/render-directions.mjs \
  skills/splash/test/the-journalist-is-told-what-was-available.test.ts
```

---

## Definition of done

The first lot is complete when all of the following hold at once:

- `docs/design-base/` holds ~15 line-family references, each with `measured.json` (both routes named),
  `screenshot.png` and a five-section `NOTES.md`;
- at least four treatments and three directions are filed, each treatment with two independent
  references;
- both indexes are generated and carry the do-not-edit marker;
- `METHOD.md` carries the runbook and a yield table broken down by archive;
- the three guards are green **and each has been shown to go red under mutation**;
- `proof/co2-suisse/renders/` holds one render per filed direction, and each has been looked at;
- `bun test $(bun scripts/test-lanes.mjs --fast)` passes with no regression against 2257/4/0.

## Natural stopping point

Phase 1 + Phase 2 (Tasks 1–6) deliver a filled, indexed, repeatable corpus and change no rendered
output. Phase 3 (Tasks 7–13) spends that corpus. If the work is to be split across sessions or
across agents, that boundary is the one to split on — and Task 5 onwards can run in parallel per
family, which is what §6's parallel-safety rule exists for.

## Still open, and not settled by this plan

- Whether a direction may override a newsroom's recorded ground and accent, or may only supply type
  and space when a palette exists. This is Tom's to answer (spec §9).
- Whether directions are chosen per newsroom, per story, or per beat. The palette's ladder
  (newsroom, else subject) is the working assumption; no probe has tested it.
- Video and scrolly. Both probes were static. Nothing here is proved for a direction that must hold
  across motion or across scroll steps, and Task 5's pool deliberately includes both so the corpus
  is ready when that work is planned.
