# Native a11y contrast-harness + Group-A label fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install a render-time WCAG contrast guard that mechanically catches "value label painted in the mark colour" for ALL chart types, fix the 5 flagged components (diverging, dumbbell, waterfall, bullet, slope) label→ink, and productionize diverging/waterfall/dumbbell end-to-end.

**Architecture:** A new Playwright harness (`snap-contrast.mjs`) walks every `<text>` in the built STATIC chart, samples its REAL background from the live DOM (hide the glyph → topmost painted element behind it), and asserts WCAG ≥ 4.5:1 via the existing `contrastRatio`. Wired into `produce.mjs`, it fails a run on a real violation. The 5 component fixes turn it RED→GREEN. Three clean types then follow the proven productionization recipe (palette→tokens, guard, mapper, family, flip, SKILL.md, KB, render-verify).

**Tech Stack:** Bun, TypeScript, Playwright, D3/React (chart-native), bun:test.

## Global Constraints

- Runtime **Bun** (`bun`, `bunx` — never npm/node except Remotion's `render-video.mjs`). Tests `bun:test`, TDD.
- Code/comments/identifiers/commits/branches in **English**. No `any` / `@ts-ignore`. No Claude/Anthropic attributive mention anywhere.
- `bun run check` (repo root) MUST stay green after every task (tsc of 4 skills + 10 test suites).
- Work on branch `feat/native-a11y-contrast-harness` (already created). Merge `--no-ff` at the end.
- WCAG threshold is **4.5:1 uniform** (no large-text 3:1 exemption — the bugs we hunt, vermillion 3.87 / orange 2.25, sit in the 3–4.5 band a tiered check would miss).
- Established rule: **"le label porte la valeur, le mark porte la teinte"** — value labels render in `COLORS.ink`; sign/role/series is carried by the MARK colour + bold weight.
- **Render-verify every type at the PNG yourself** (Read the image) before claiming a fix works — tests are necessary, not sufficient.

**Grounding (verified file:line):**
- `contrastRatio(a: string, b: string): number` — `skills/chart-native/src/core/conformance.ts:38` (parses `#rrggbb`, returns 1..21).
- Static build path served by `snap-static.mjs`: `dist/static` (line) / `dist/<chart>/static`, served over http (module scripts are crossorigin-blocked over `file://`).
- `produce.mjs:82` runs `snap-proof.mjs` (builds already done at `:70-71`) — the contrast harness wires in right after.
- Component label-paint sites: diverging `DivergingBarChart.tsx:235`; dumbbell `DumbbellChart.tsx:297,308`; waterfall `WaterfallChart.tsx:288`; bullet `BulletChart.tsx:271`; slope `SlopeChart.tsx:345,365`. All five fixed labels sit on the WHITE PAGE (outer tips / above bar / beside endpoints), so their sampled background is the paper → unfixed = mark-colour-on-white (RED), fixed = ink-on-white (GREEN).

---

## File Structure

- **Create** `skills/chart-native/src/core/contrast-scan.ts` — pure decision helper (`worstContrast`, `isContrastViolation`). Unit-testable, no Playwright.
- **Create** `skills/chart-native/tests/contrast-scan.test.ts` — bun:test for the pure helper.
- **Create** `skills/chart-native/scripts/snap-contrast.mjs` — the Playwright walker + gate.
- **Modify** `skills/chart-native/scripts/produce.mjs:82` — wire the harness after `snap-proof`.
- **Modify** 5 components (one `fill=` edit each): `DivergingBarChart.tsx`, `DumbbellChart.tsx`, `WaterfallChart.tsx`, `BulletChart.tsx`, `SlopeChart.tsx`.
- **Modify** `skills/chart-native/src/core/tokens.ts` — add `DIVERGING_SIGN_COLORS`, `WATERFALL_ROLE_COLORS`, `DUMBBELL_DOT_COLORS`.
- **Modify** 3 components to import their palette from tokens (diverging/waterfall/dumbbell).
- **Modify** `skills/chart-native/src/core/produce-conformance.ts` — 3 guard cases + `PRODUCE_GUARDED_TYPES`.
- **Modify** `skills/chart-native/src/spec-to-config.ts` — 3 mapper entries in `MAPPERS`.
- **Modify** `skills/chart-native/src/native-types.ts` — flip `deferred` off diverging/waterfall/dumbbell (leave bullet, slope deferred).
- **Modify** `skills/suggest-chart/eval/native-family-types.ts` — add `deviation` key + dumbbell.
- **Modify** `skills/suggest-chart/SKILL.md` — advertise the 3 types + CSV shape notes.

---

## Task 1: Pure contrast-scan helper (TDD)

**Files:**
- Create: `skills/chart-native/src/core/contrast-scan.ts`
- Test: `skills/chart-native/tests/contrast-scan.test.ts`

**Interfaces:**
- Consumes: `contrastRatio` from `./conformance`.
- Produces: `worstContrast(fill: string, bgs: string[]): number` and `isContrastViolation(fill: string, bgs: string[], min?: number): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/chart-native/tests/contrast-scan.test.ts
import { describe, it, expect } from "bun:test";
import { worstContrast, isContrastViolation } from "../src/core/contrast-scan";

describe("contrast-scan", () => {
  it("should flag vermillion text on white paper (3.87 < 4.5)", () => {
    expect(isContrastViolation("#D55E00", ["#ffffff"])).toBe(true);
  });

  it("should pass ink text on white paper", () => {
    expect(isContrastViolation("#1a1a1a", ["#ffffff"])).toBe(false);
  });

  it("should take the worst background when a label straddles two colours", () => {
    // white label: fine over a dark blue slice, failing over the white paper
    const w = worstContrast("#ffffff", ["#0072B2", "#ffffff"]);
    expect(w).toBeCloseTo(1, 1); // white-on-white ~1:1 dominates
    expect(isContrastViolation("#ffffff", ["#0072B2", "#ffffff"])).toBe(true);
  });

  it("should pass white label fully inside a dark slice", () => {
    expect(isContrastViolation("#ffffff", ["#0072B2"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/chart-native && bun test tests/contrast-scan.test.ts`
Expected: FAIL — `Cannot find module '../src/core/contrast-scan'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// skills/chart-native/src/core/contrast-scan.ts
// Pure decision layer for the render-time contrast guard (snap-contrast.mjs): given
// a text fill and the background colours sampled behind it, report the WORST WCAG
// contrast and whether it violates the 4.5:1 floor. Worst-case is deliberate — a
// label straddling two stacked segments must clear contrast on BOTH.
import { contrastRatio } from "./conformance";

export const MIN_CONTRAST = 4.5;

export function worstContrast(fill: string, bgs: string[]): number {
  if (bgs.length === 0) return 21;
  return bgs.reduce((w, bg) => Math.min(w, contrastRatio(fill, bg)), 21);
}

export function isContrastViolation(
  fill: string,
  bgs: string[],
  min: number = MIN_CONTRAST,
): boolean {
  return worstContrast(fill, bgs) < min;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd skills/chart-native && bun test tests/contrast-scan.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Confirm the repo gate is green**

Run: `bun run check` (repo root)
Expected: PASS (the new test suite runs under chart-native).

- [ ] **Step 6: Commit**

```bash
git add skills/chart-native/src/core/contrast-scan.ts skills/chart-native/tests/contrast-scan.test.ts
git commit -m "feat(chart-native): pure contrast-scan helper (worst-case WCAG decision for the render-time guard)"
```

---

## Task 2: snap-contrast.mjs harness + wire into produce; prove RED

**Files:**
- Create: `skills/chart-native/scripts/snap-contrast.mjs`
- Modify: `skills/chart-native/scripts/produce.mjs` (after line 82, the `snap-proof` run)

**Interfaces:**
- Consumes: `worstContrast` from `../src/core/contrast-scan.ts`; the built `dist/<chart>/static`.
- Produces: a CLI that exits non-zero + prints `{chart, checked, violations[]}` when any label is below 4.5:1. Reads `CHART` env (default `line`).

> **Background-sampling method (refines the spec's "screenshot the bbox"):** we read the real
> rendered background via the live DOM — hide the glyph, then `document.elementsFromPoint` returns the
> topmost painted element behind it; its solid `fill` (SVG marks) or `background-color` (the paper) IS
> the background. This is the same intent as pixel-sampling (the REAL background, no per-component
> annotation) but needs no PNG decode / new dependency and is immune to anti-aliasing. Limitation
> (documented, acceptable for these chart types): assumes solid fills — a mark with a gradient/image
> fill or partial opacity would report its declared colour, not the blended pixel. chart-native marks
> are solid Okabe-Ito fills, so this holds. Multi-point sampling (3 points across the label) + worst-case
> keeps it conservative for labels straddling two marks.

- [ ] **Step 1: Write the harness**

```js
// skills/chart-native/scripts/snap-contrast.mjs
// Render-time WCAG guard: every <text> in the built STATIC chart must clear 4.5:1
// against its REAL background (the mark/paper behind it, sampled from the live DOM).
// Catches "value label painted in the mark colour" (vermillion 3.87:1, orange
// 2.25:1) mechanically for ALL chart types — the systemic backstop a hand-passed
// textColors guard misses. Wired into produce.mjs after snap-proof; a violation
// fails the run before export.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { worstContrast, MIN_CONTRAST } from "../src/core/contrast-scan.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const dist = join(root, chart === "line" ? "dist/static" : `dist/${chart}/static`);

// serve over http (module scripts get crossorigin -> blocked over file://)
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const p = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  try {
    const body = await readFile(join(dist, p));
    res.writeHead(200, { "content-type": mime[p.slice(p.lastIndexOf("."))] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector("svg");
await page.waitForTimeout(2100); // let the reveal settle to progress=1

// In-page: for every visible <text>, sample the real background behind it at 3
// points (glyph hidden first), returning {text, fill, bgs[]}. Contrast is computed
// in node with the shared helper.
const samples = await page.evaluate(() => {
  const toHex = (rgb) => {
    const m = rgb && rgb.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    if (a === 0) return null; // transparent → not a background
    const h = (n) => Math.round(n).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  };
  const bgAt = (x, y, glyph) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === glyph) continue;
      const fillAttr = el.getAttribute && el.getAttribute("fill");
      if (fillAttr && fillAttr !== "none") {
        const hx = toHex(getComputedStyle(el).fill);
        if (hx) return hx;
      }
      const bc = toHex(getComputedStyle(el).backgroundColor);
      if (bc) return bc;
    }
    return "#ffffff"; // the paper
  };
  const out = [];
  for (const t of Array.from(document.querySelectorAll("text"))) {
    const s = (t.textContent || "").trim();
    if (!s) continue;
    const cs = getComputedStyle(t);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    const fill = toHex(cs.fill);
    if (!fill) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const y = r.top + r.height / 2;
    const prev = t.style.visibility;
    t.style.visibility = "hidden"; // remove glyph + its halo before sampling
    const bgs = [0.2, 0.5, 0.8].map((f) => bgAt(r.left + r.width * f, y, t));
    t.style.visibility = prev;
    out.push({ text: s, fill, bgs });
  }
  return out;
});

await browser.close();
server.close();

const violations = [];
for (const s of samples) {
  const worst = worstContrast(s.fill, s.bgs);
  if (worst < MIN_CONTRAST) violations.push({ ...s, worst: Number(worst.toFixed(2)) });
}

console.log(JSON.stringify({ chart, checked: samples.length, violations }, null, 2));
if (violations.length) {
  console.error(`[snap-contrast ${chart}] ${violations.length} text label(s) below ${MIN_CONTRAST}:1 WCAG contrast`);
  process.exit(1);
}
console.log(`[snap-contrast ${chart}] OK — ${samples.length} labels clear ${MIN_CONTRAST}:1.`);
```

- [ ] **Step 2: Prove GREEN on a known-clean type (line)**

Run: `cd skills/chart-native && CHART=line bunx vite build && CHART=line bun scripts/snap-contrast.mjs`
Expected: exit 0, `"violations": []` (line's direct labels are already ink).

- [ ] **Step 3: Prove RED on an unfixed flagged type (diverging)**

Run: `cd skills/chart-native && CHART=diverging bunx vite build && CHART=diverging bun scripts/snap-contrast.mjs; echo "exit=$?"`
Expected: exit 1, a violation whose `fill` is the vermillion `#D55E00` signed value label (worst ≈ 3.87). This is the failing "test" the component fix (Task 3) will turn green.

> If diverging has no default sample config to build, build via its config the same way `snap-static.mjs`
> is exercised in the type's existing tests; the goal of this step is only to SEE the harness go RED on a
> real unfixed component.

- [ ] **Step 4: Wire the harness into produce.mjs**

In `skills/chart-native/scripts/produce.mjs`, immediately after the `snap-proof.mjs` run (line 82):

```js
run("bun", ["scripts/snap-proof.mjs"], { OUTDIR: outDir });

// 2b. render-time WCAG contrast guard — every text label must clear 4.5:1 against
// its real background. Fails the run before export on a mark-coloured label.
console.log(`[produce ${type}] checking text contrast (snap-contrast)…`);
run("bun", ["scripts/snap-contrast.mjs"]);
```

- [ ] **Step 5: Confirm the repo gate is green**

Run: `bun run check` (repo root)
Expected: PASS (`bun run check` runs tsc + tests, not `produce`, so the wired harness does not break it; the RED lives only in `produce` for unfixed types).

- [ ] **Step 6: Commit**

```bash
git add skills/chart-native/scripts/snap-contrast.mjs skills/chart-native/scripts/produce.mjs
git commit -m "feat(chart-native): render-time WCAG contrast guard (snap-contrast) wired into produce"
```

---

## Tasks 3–7: Component label→ink fixes (one per task)

Each task is the same shape: change the flagged `fill=` to `COLORS.ink`, rebuild the static, run `snap-contrast` for that type → GREEN, render-verify the PNG (mark keeps its hue, label legible in ink), commit. The mark/sign emphasis is preserved by the existing bold weight + the mark colour — do NOT touch marks or weights.

### Task 3: diverging

**Files:** Modify `skills/chart-native/src/DivergingBarChart.tsx:235`

- [ ] **Step 1: Edit** — the signed value label `<text>` at line 228-239:

```tsx
                fontWeight={700}
                fill={COLORS.ink}
                opacity={labelOp}
```
(was `fill={fill}`; `fontWeight={700}` already carries emphasis; the bar `rect` at line 200 keeps `fill={fill}`.)

- [ ] **Step 2: Rebuild + harness GREEN**

Run: `cd skills/chart-native && CHART=diverging bunx vite build && CHART=diverging bun scripts/snap-contrast.mjs`
Expected: exit 0, `"violations": []`.

- [ ] **Step 3: Render-verify PNG**

Run: `cd skills/chart-native && CHART=diverging bun scripts/snap-static.mjs /tmp/diverging-fixed.png`
Then Read `/tmp/diverging-fixed.png`: signed value labels are dark ink and legible; positive/negative bars keep blue/vermillion.

- [ ] **Step 4: Gate + commit**

```bash
bun run check
git add skills/chart-native/src/DivergingBarChart.tsx
git commit -m "fix(chart-native): diverging value labels render in ink (WCAG) — sign stays on the bar"
```

### Task 4: waterfall

**Files:** Modify `skills/chart-native/src/WaterfallChart.tsx:288`

- [ ] **Step 1: Edit** — the value label `<text>` (non-narrow branch, line 282-292):

```tsx
                  fontWeight={700}
                  fill={COLORS.ink}
                  opacity={labelOp}
```
(was `fill={fill}`. Leave the narrow-bar branch's `fill="#fff"` at line 276 as-is for now — see watch-item below.)

- [ ] **Step 2: Rebuild + harness GREEN**

Run: `cd skills/chart-native && CHART=waterfall bunx vite build && CHART=waterfall bun scripts/snap-contrast.mjs`
Expected: exit 0, `"violations": []` for the sample.

> **Watch-item (report, don't silently absorb):** if the sample renders in narrow-bar mode, the harness
> may flag the white-on-bar label at line 276 (white on a vermillion decrease bar ≈ 3.28:1). If it fires,
> STOP and report it — it's a real, separate WCAG finding (an on-mark label, not the page-label class
> this batch fixes). Decide the fix with the reviewer (e.g. darken the decrease role or move the label
> out); do not weaken the threshold to hide it.

- [ ] **Step 3: Render-verify PNG**

Run: `cd skills/chart-native && CHART=waterfall bun scripts/snap-static.mjs /tmp/waterfall-fixed.png`
Then Read `/tmp/waterfall-fixed.png`: signed step labels are ink; increase/decrease/total bars keep blue/vermillion/black.

- [ ] **Step 4: Gate + commit**

```bash
bun run check
git add skills/chart-native/src/WaterfallChart.tsx
git commit -m "fix(chart-native): waterfall value labels render in ink (WCAG) — role stays on the bar"
```

### Task 5: dumbbell

**Files:** Modify `skills/chart-native/src/DumbbellChart.tsx:297,308`

- [ ] **Step 1: Edit** — the two outer value labels (lines 290-311):

```tsx
                  fontWeight={600}
                  fill={COLORS.ink}
```
Apply to BOTH `<text>` fills (was `fill={leftIsMin ? LEFT_COLOR : RIGHT_COLOR}` at 297 and `fill={leftIsMin ? RIGHT_COLOR : LEFT_COLOR}` at 308). The endpoint dots (lines 277, 287) keep their series colours; the legend swatches convey which series is which.

- [ ] **Step 2: Rebuild + harness GREEN**

Run: `cd skills/chart-native && CHART=dumbbell bunx vite build && CHART=dumbbell bun scripts/snap-contrast.mjs`
Expected: exit 0, `"violations": []`.

- [ ] **Step 3: Render-verify PNG**

Run: `cd skills/chart-native && CHART=dumbbell bun scripts/snap-static.mjs /tmp/dumbbell-fixed.png`
Then Read `/tmp/dumbbell-fixed.png`: both value labels are ink and legible; the orange/blue dots + legend still identify the two series.

- [ ] **Step 4: Gate + commit**

```bash
bun run check
git add skills/chart-native/src/DumbbellChart.tsx
git commit -m "fix(chart-native): dumbbell value labels render in ink (WCAG) — series stays on the dots"
```

### Task 6: bullet

**Files:** Modify `skills/chart-native/src/BulletChart.tsx:271`

- [ ] **Step 1: Edit** — the measure value label `<text>` (lines 264-278), keep the white halo:

```tsx
                fontWeight={700}
                fill={COLORS.ink}
                stroke="#fff"
                strokeWidth={3 * sc}
                style={{ paintOrder: "stroke" }}
```
(was `fill={color}`. The white halo + paintOrder stay so the ink label is legible even over the target tick; the measure bar at line 222 keeps `fill={color}` = HIT/MISS hue.)

- [ ] **Step 2: Rebuild + harness GREEN**

Run: `cd skills/chart-native && CHART=bullet bunx vite build && CHART=bullet bun scripts/snap-contrast.mjs`
Expected: exit 0, `"violations": []`.

- [ ] **Step 3: Render-verify PNG**

Run: `cd skills/chart-native && CHART=bullet bun scripts/snap-static.mjs /tmp/bullet-fixed.png`
Then Read `/tmp/bullet-fixed.png`: the measure value is ink with a white halo; the measure bar keeps blue (hit) / vermillion (miss).

- [ ] **Step 4: Gate + commit**

```bash
bun run check
git add skills/chart-native/src/BulletChart.tsx
git commit -m "fix(chart-native): bullet measure value renders in ink (WCAG) — hit/miss stays on the bar"
```

### Task 7: slope

**Files:** Modify `skills/chart-native/src/SlopeChart.tsx:345,365`

- [ ] **Step 1: Edit** — the two end-label `<text>` fills (lines 338-348 and 358-368):

```tsx
                    fontWeight={hi ? 700 : 400}
                    fill={COLORS.ink}
```
and
```tsx
                    fontWeight={hi ? 700 : 600}
                    fill={COLORS.ink}
```
(both were `fill={hi ? ACCENT : COLORS.ink}` → now always ink. The highlighted line already stands out via `stroke={color}` accent (line 326) + bold weight; the endpoint circles at 336/356 keep `fill={color}`.)

- [ ] **Step 2: Rebuild + harness GREEN**

Run: `cd skills/chart-native && CHART=slope bunx vite build && CHART=slope bun scripts/snap-contrast.mjs`
Expected: exit 0, `"violations": []`.

- [ ] **Step 3: Render-verify PNG**

Run: `cd skills/chart-native && CHART=slope bun scripts/snap-static.mjs /tmp/slope-fixed.png`
Then Read `/tmp/slope-fixed.png`: all end-labels are ink and legible; the highlighted slope line is still visually dominant via its accent stroke + bold.

- [ ] **Step 4: Gate + commit**

```bash
bun run check
git add skills/chart-native/src/SlopeChart.tsx
git commit -m "fix(chart-native): slope end-labels render in ink (WCAG) — emphasis stays on the line"
```

---

## Task 8: Extract the 3 palettes to tokens.ts

**Files:**
- Modify: `skills/chart-native/src/core/tokens.ts`
- Modify: `skills/chart-native/src/DivergingBarChart.tsx:44-45`, `WaterfallChart.tsx:43-45`, `DumbbellChart.tsx:49-50`

**Interfaces:**
- Produces: `DIVERGING_SIGN_COLORS: readonly string[]` = `[blue, vermillion]`; `WATERFALL_ROLE_COLORS` = `[blue, vermillion, black]`; `DUMBBELL_DOT_COLORS` = `[orange, blue]`. The produce-time guard (Tasks 9-11) imports the SAME arrays the components paint, so it validates the real colours.

- [ ] **Step 1: Add the arrays to tokens.ts** (next to `GROUPED_SERIES_COLORS`/`STACKED_SERIES_COLORS`):

```ts
// Diverging bars: positive (blue) / negative (vermillion) sign colours — the guard
// (checkDivergingBarConformance) validates THESE, so component + guard never drift.
export const DIVERGING_SIGN_COLORS = [OKABE_ITO.blue, OKABE_ITO.vermillion] as const;

// Waterfall roles: increase (blue) / decrease (vermillion) / total (black).
export const WATERFALL_ROLE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
  OKABE_ITO.black,
] as const;

// Dumbbell endpoints: left series (orange) / right series (blue).
export const DUMBBELL_DOT_COLORS = [OKABE_ITO.orange, OKABE_ITO.blue] as const;
```

- [ ] **Step 2: Point each component at the shared array** — replace the module-private consts:

`DivergingBarChart.tsx:44-45`:
```tsx
import { COLORS, FONT, TYPE, OKABE_ITO, DIVERGING_SIGN_COLORS } from "./core/tokens";
// ...
const POS = DIVERGING_SIGN_COLORS[0]; // positive sign
const NEG = DIVERGING_SIGN_COLORS[1]; // negative sign
```

`WaterfallChart.tsx:43-45`:
```tsx
import { COLORS, FONT, TYPE, OKABE_ITO, WATERFALL_ROLE_COLORS } from "./core/tokens";
// ...
const UP = WATERFALL_ROLE_COLORS[0]; // increase
const DOWN = WATERFALL_ROLE_COLORS[1]; // decrease
const TOTAL = WATERFALL_ROLE_COLORS[2]; // a total (neutral)
```

`DumbbellChart.tsx:49-50`:
```tsx
import { COLORS, TYPE, OKABE_ITO, DUMBBELL_DOT_COLORS } from "./core/tokens";
// ...
const LEFT_COLOR = DUMBBELL_DOT_COLORS[0]; // series A dot
const RIGHT_COLOR = DUMBBELL_DOT_COLORS[1]; // series B dot
```
(Keep `OKABE_ITO` in each import only if still referenced elsewhere in the file; otherwise drop it to avoid an unused-import tsc error.)

- [ ] **Step 3: Re-verify renders unchanged** (colours byte-identical — this is a pure refactor):

Run: `cd skills/chart-native && for c in diverging waterfall dumbbell; do CHART=$c bunx vite build && CHART=$c bun scripts/snap-static.mjs /tmp/$c-palette.png; done`
Then Read the 3 PNGs: identical to the Task 3/4/5 fixed renders.

- [ ] **Step 4: Gate + commit**

```bash
bun run check
git add skills/chart-native/src/core/tokens.ts skills/chart-native/src/DivergingBarChart.tsx skills/chart-native/src/WaterfallChart.tsx skills/chart-native/src/DumbbellChart.tsx
git commit -m "refactor(chart-native): extract diverging/waterfall/dumbbell palettes to tokens (guard/component single source)"
```

---

## Task 9: Productionize diverging (guard → mapper → family → flip → SKILL → KB → render)

**Files:**
- Modify: `skills/chart-native/src/core/produce-conformance.ts`
- Modify: `skills/chart-native/src/spec-to-config.ts`
- Modify: `skills/chart-native/src/native-types.ts:56-61`
- Modify: `skills/suggest-chart/eval/native-family-types.ts`
- Modify: `skills/suggest-chart/SKILL.md`
- Verify: `knowledge/references/chart/types/diverging-bar.md` (exists — do NOT author)

**Interfaces:**
- Consumes: `DIVERGING_SIGN_COLORS` (Task 8), `computeDivergingLayout(data, dims, sort)` → `{ valueDomain: [number,number] }` (`diverging-bar-geometry.ts:44`), `checkDivergingBarConformance(input, textColors)` (`conformance.ts:153`), `DivergingBarConfig` (`DivergingBarChart.tsx`).
- Produces: `diverging` reachable from a `NativeSpec` (mapper) + produce-guarded + family-routed.

> **Guard BEFORE mapper** (recipe invariant): a guarded-but-unreachable type keeps the gate green; a
> reachable-but-unguarded type fails the HARD completeness invariant. Land the guard in this task's first
> steps, the flip+family+SKILL last.

- [ ] **Step 1: Add the guard case** to `produce-conformance.ts`. Add imports:

```ts
import { checkDivergingBarConformance } from "./conformance";
import { computeDivergingLayout } from "../diverging-bar-geometry";
import { DIVERGING_SIGN_COLORS } from "./tokens";
import type { DivergingBarConfig } from "../DivergingBarChart";
```
Add a dims const next to the others:
```ts
const DIVERGING_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 64, bottom: 40, left: 124 },
};
```
Add `"diverging"` to `PRODUCE_GUARDED_TYPES`. Add the case (mirror `stacked` at `:375`):
```ts
    case "diverging": {
      const cfg = config as unknown as DivergingBarConfig;
      const layout = computeDivergingLayout(
        { catField: cfg.catField, valField: cfg.valField, rows: cfg.rows },
        DIVERGING_DIMS,
        "desc",
      );
      return {
        checked: true,
        violations: checkDivergingBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
            signColors: [...DIVERGING_SIGN_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 2: Add the mapper** to `MAPPERS` in `spec-to-config.ts` (mirror `lollipop`/`pie`):

```ts
  diverging(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "diverging",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        catField: catCol,
        valField: valCol,
        rows,
      },
    };
  },
```

- [ ] **Step 3: Flip off `deferred`** in `native-types.ts` — the `diverging` entry (lines 56-61) becomes:

```ts
  { id: "diverging", family: "A", shape: "single" },
```

- [ ] **Step 4: Add to the family table** in `native-family-types.ts` — add a `deviation` intent key (diverging is "a signed value around a meaningful midpoint", per `suggest-chart/SKILL.md:225`):

```ts
  deviation: ["diverging"],
```

- [ ] **Step 5: Advertise in the suggester** — `suggest-chart/SKILL.md`: add `diverging` to the nativeType key lists (lines ~142 and ~146) and add a CSV-shape note near the other per-type notes (~line 175):

```md
`diverging` expects **category + one signed value that CROSSES zero** (gain↔loss / above↔below a
midpoint). Route it ONLY when values span both negative and positive — otherwise use `bar`.
```

- [ ] **Step 6: Verify the KB ref exists** (do not author):

Run: `ls knowledge/references/chart/types/diverging-bar.md`
Expected: the file exists.

- [ ] **Step 7: Completeness + gate green**

Run: `bun run check`
Expected: PASS — `chart-native/tests/completeness.test.ts` (reachable ⟹ guarded ∧ mapper ∧ ref) and `suggest-chart/eval/tests/native-family-types.test.ts` (every family id is a non-deferred native type) both pass for `diverging`.

- [ ] **Step 8: Render-verify E2E** — produce from a spec-shaped CSV that crosses zero and Read the PNG:

Run: build a small `category,change` sample where some rows are negative and some positive, then produce static for `diverging` and Read the output PNG. Confirm: title un-clipped, zero line centred, positive bars blue / negative bars vermillion, signed value labels in ink, source present.

- [ ] **Step 9: Commit**

```bash
git add skills/chart-native/src/core/produce-conformance.ts skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/SKILL.md
git commit -m "feat(chart-native): productionize diverging end-to-end (deviation mapper + guard + family + SKILL)"
```

---

## Task 10: Productionize waterfall

**Files:** same set as Task 9, for waterfall.

**Interfaces:**
- Consumes: `WATERFALL_ROLE_COLORS` (Task 8), `computeWaterfallLayout(data, dims)` → `{ countDomain: [number,number] }` (`waterfall-geometry.ts:51`), `checkWaterfallConformance(input, textColors)` (`conformance.ts:190`) — note `input` needs `countDomain` + `rows: {value, total?}[]` + `roleColors`, `WaterfallConfig` with `rows: {label, value, total?}[]` (`WaterfallChart.tsx`).

- [ ] **Step 1: Add the guard case** to `produce-conformance.ts`. Imports:

```ts
import { checkWaterfallConformance } from "./conformance";
import { computeWaterfallLayout } from "../waterfall-geometry";
import { WATERFALL_ROLE_COLORS } from "./tokens";
import type { WaterfallConfig } from "../WaterfallChart";
```
Dims:
```ts
const WATERFALL_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 24, bottom: 72, left: 52 },
};
```
Add `"waterfall"` to `PRODUCE_GUARDED_TYPES`. Case:
```ts
    case "waterfall": {
      const cfg = config as unknown as WaterfallConfig;
      const layout = computeWaterfallLayout({ rows: cfg.rows }, WATERFALL_DIMS);
      return {
        checked: true,
        violations: checkWaterfallConformance(
          {
            title: cfg.title,
            source: cfg.source,
            countDomain: layout.countDomain,
            rows: cfg.rows.map((r) => ({ value: r.value, total: r.total })),
            roleColors: [...WATERFALL_ROLE_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 2: Add the mapper** to `MAPPERS`. Waterfall needs `rows: {label, value, total?}[]`; a CSV may carry an optional `total` column (a running-total marker):

```ts
  waterfall(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    // optional boolean-ish "total" column marks running-total rows (opening/closing)
    const totalCol = columns.find((c) => c.toLowerCase() === "total");
    const wrows = rows.map((r) => ({
      label: String(r[labelCol]),
      value: Number(r[valCol]),
      ...(totalCol && String(r[totalCol]).toLowerCase().match(/^(1|true|yes)$/)
        ? { total: true }
        : {}),
    }));
    return {
      type: "waterfall",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        rows: wrows,
      },
    };
  },
```

- [ ] **Step 3: Flip** — `native-types.ts` waterfall entry (lines 62-67) → `{ id: "waterfall", family: "A", shape: "single" },`.

- [ ] **Step 4: Family** — add waterfall to the `deviation` key: `deviation: ["diverging", "waterfall"],`.

- [ ] **Step 5: SKILL.md** — add `waterfall` to the key lists + shape note:

```md
`waterfall` expects **ordered label + one signed value** (a bridge of increases/decreases); an optional
`total` column (1/true) marks opening/closing running-total bars. Route it for step-by-step build-up to
a final figure.
```

- [ ] **Step 6: KB** — `ls knowledge/references/chart/types/waterfall.md` (exists).

- [ ] **Step 7: Gate green** — `bun run check` PASS.

- [ ] **Step 8: Render-verify E2E** — produce static for waterfall from an ordered `stage,delta` CSV (with a closing `total` row) and Read the PNG: bridge arithmetic reads correctly, increase/decrease/total in blue/vermillion/black, value labels in ink, count axis at 0, title un-clipped, source present.

- [ ] **Step 9: Commit**

```bash
git add skills/chart-native/src/core/produce-conformance.ts skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/SKILL.md
git commit -m "feat(chart-native): productionize waterfall end-to-end (bridge mapper + guard + family + SKILL)"
```

---

## Task 11: Productionize dumbbell + record state

**Files:** same set as Task 9, for dumbbell; plus `CLAUDE.md`.

**Interfaces:**
- Consumes: `DUMBBELL_DOT_COLORS` (Task 8), `checkDumbbellConformance(input, textColors)` (`conformance.ts:607`) — `input` needs `leftLabel`, `rightLabel`, `dotColors` (NO layout / valueDomain), `DumbbellConfig` with `labelField, leftField, rightField, leftLabel, rightLabel, rows` (`DumbbellChart.tsx`).

- [ ] **Step 1: Add the guard case** to `produce-conformance.ts`. Imports:

```ts
import { checkDumbbellConformance } from "./conformance";
import { DUMBBELL_DOT_COLORS } from "./tokens";
import type { DumbbellConfig } from "../DumbbellChart";
```
Add `"dumbbell"` to `PRODUCE_GUARDED_TYPES`. Case (no compute-layout — dumbbell is a paired-position encoding):
```ts
    case "dumbbell": {
      const cfg = config as unknown as DumbbellConfig;
      return {
        checked: true,
        violations: checkDumbbellConformance(
          {
            title: cfg.title,
            source: cfg.source,
            leftLabel: cfg.leftLabel,
            rightLabel: cfg.rightLabel,
            dotColors: [...DUMBBELL_DOT_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }
```

- [ ] **Step 2: Add the mapper** — dumbbell is paired: `labelField=col0`, the two numeric columns are start/end, and their COLUMN NAMES are the series legend labels:

```ts
  dumbbell(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    const [leftField, rightField] = numericColumns.slice(0, 2);
    return {
      type: "dumbbell",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        labelField: labelCol,
        leftField,
        rightField,
        leftLabel: leftField,
        rightLabel: rightField,
        rows,
      },
    };
  },
```

- [ ] **Step 3: Flip** — `native-types.ts` dumbbell entry (lines 49-54) → `{ id: "dumbbell", family: "A", shape: "paired" },`.

- [ ] **Step 4: Family** — dumbbell is a two-point magnitude comparison across categories (`suggest-chart/SKILL.md:449`); add it to `magnitude`:

```ts
  magnitude: ["bar", "grouped", "radial-bar", "dumbbell"],
```

- [ ] **Step 5: SKILL.md** — add `dumbbell` to the key lists + shape note:

```md
`dumbbell` expects **category + exactly two numeric columns** (start/end, e.g. `2019`,`2024`); the two
column headers become the series labels. Route it for a two-point comparison per category — never a line
(two points imply no trend).
```

- [ ] **Step 6: KB** — `ls knowledge/references/chart/types/dumbbell.md` (exists).

- [ ] **Step 7: Gate green** — `bun run check` PASS.

- [ ] **Step 8: Render-verify E2E** — produce static for dumbbell from a `country,2019,2024` CSV and Read the PNG: paired dots orange/blue with a connector, value labels in ink, legend names both series, title un-clipped, source present.

- [ ] **Step 9: Record state in CLAUDE.md** — add a dated `★ État` block: harness landed (systemic WCAG text guard), 5 components fixed, **17 native types reachable** (14 + diverging/waterfall/dumbbell), bullet + slope fixed + harness-covered but still `deferred` (heavy mappers → later couture batch), plus the waterfall narrow-label watch-item if it surfaced.

- [ ] **Step 10: Commit**

```bash
git add skills/chart-native/src/core/produce-conformance.ts skills/chart-native/src/spec-to-config.ts skills/chart-native/src/native-types.ts skills/suggest-chart/eval/native-family-types.ts skills/suggest-chart/SKILL.md CLAUDE.md
git commit -m "feat(chart-native): productionize dumbbell end-to-end (paired mapper + guard + family + SKILL); record a11y batch state"
```

---

## Definition of done

- `snap-contrast.mjs` gates `produce`; RED on unfixed mark-coloured labels, GREEN after each fix.
- All 5 components (diverging, dumbbell, waterfall, bullet, slope) paint value labels in `COLORS.ink`; each render-verified at the PNG.
- diverging, waterfall, dumbbell reachable end-to-end (mapper + guard + family + flip + SKILL.md + KB), each render-verified E2E; completeness + family invariants green.
- bullet + slope fixed + harness-covered, remain `deferred(reason)`.
- `bun run check` green after every task. Zero `any`/`@ts-ignore`, zero vendor mention.
- **Whole-branch review (opus)** before merge `--no-ff`; per-task review between tasks.
- Any harness finding beyond the fixed 5 (e.g. waterfall narrow white-on-bar) reported, not silently absorbed.
</content>
