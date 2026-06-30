# Map Conformance Parity (map-native slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the maps conformance guard to chart parity — a shared L0 (`checkGlobalMapConformance`), a format-aware framing check (`checkMapFraming`), and an optional `format?` hook on the per-type guards.

**Architecture:** Extract the title/description/source/contrast block duplicated in both per-type checks into one `checkGlobalMapConformance` (+ a new ALL-CAPS rule for chart parity); add a pure `checkMapFraming` that uses slice 1's `resolveMapFrame` to assert the title fits and the source band is present at a given canvas; let each per-type guard optionally run the framing check when a `format` is supplied. All pure, no renders.

**Tech Stack:** Bun, TypeScript, bun:test.

## Global Constraints

- **Bun only** — `bun`, `bun test`.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO `Co-Authored-By: Claude`.
- **Code, comments, commit messages in English.**
- **Pure** — `conformance.ts` stays framework-free; the only new import allowed is `resolveMapFrame` from `./core/map-format`.
- **Back-compat** — existing two-arg call sites/tests keep working unchanged; `format?` is an optional field.

All paths are relative to `skills/map-native/`.

---

### Task 1: `checkGlobalMapConformance` — shared L0 + ALL-CAPS, refactor both per-type checks

**Files:**
- Modify: `skills/map-native/src/conformance.ts`
- Test: `skills/map-native/tests/conformance.test.ts` (append a `checkGlobalMapConformance` describe block; existing per-type tests must keep passing)

**Interfaces:**
- Produces: `function checkGlobalMapConformance(input: { title: string; description?: string; source: { name?: string; url?: string } }, textColors: { text: string[]; bg: string }): string[]`. Consumed by both per-type checks (this task) and indirectly relied on by Task 3.

- [ ] **Step 1: Write the failing test**

Append to `tests/conformance.test.ts`:

```ts
import { checkGlobalMapConformance } from "../src/conformance";

const gText = { text: ["#1A1A1A", "#5f5f5f"], bg: "#FFFFFF" };
const gOk = {
  title: "Renewables power most of Europe's north",
  description: "Share of electricity from renewables, 2024",
  source: { name: "Ember 2025", url: "https://example.org/x" },
};

describe("checkGlobalMapConformance", () => {
  it("passes a conformant header", () => {
    expect(checkGlobalMapConformance(gOk, gText)).toEqual([]);
  });
  it("flags a too-short title", () => {
    expect(
      checkGlobalMapConformance({ ...gOk, title: "Too short" }, gText).some((m) =>
        /too short/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a year-range title", () => {
    expect(
      checkGlobalMapConformance({ ...gOk, title: "2020   –   2024" }, gText).some(
        (m) => /year range/.test(m),
      ),
    ).toBe(true);
  });
  it("flags an ALL CAPS title", () => {
    expect(
      checkGlobalMapConformance(
        { ...gOk, title: "RENEWABLES POWER EUROPE'S NORTH" },
        gText,
      ).some((m) => /ALL CAPS/.test(m)),
    ).toBe(true);
  });
  it("flags a missing description", () => {
    expect(
      checkGlobalMapConformance({ ...gOk, description: "" }, gText).some((m) =>
        /description/.test(m),
      ),
    ).toBe(true);
  });
  it("flags a missing source name and url", () => {
    const r = checkGlobalMapConformance({ ...gOk, source: {} }, gText);
    expect(r.some((m) => /source name/.test(m))).toBe(true);
    expect(r.some((m) => /source url/.test(m))).toBe(true);
  });
  it("flags low-contrast text", () => {
    expect(
      checkGlobalMapConformance(gOk, { text: ["#DDDDDD"], bg: "#FFFFFF" }).some(
        (m) => /contrast/.test(m),
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL — `checkGlobalMapConformance` not exported.

- [ ] **Step 3: Implement the L0 and refactor both per-type checks**

In `src/conformance.ts`, add the shared L0 ABOVE `checkChoroplethConformance` (keep `relativeLuminance`/`contrastRatio` as they are):

```ts
// Shared L0 — the header rules every map type + format must satisfy (mirrors chart-native's
// checkGlobalConformance). Both per-type guards call this first, then add their own rules.
export function checkGlobalMapConformance(
  input: {
    title: string;
    description?: string;
    source: { name?: string; url?: string };
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v: string[] = [];
  const title = input.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (/[A-Za-z]/.test(title) && title === title.toUpperCase())
    v.push(`title is ALL CAPS — write it as a sentence: "${title}"`);
  if (!input.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!input.source?.name?.trim()) v.push("missing source name");
  if (!input.source?.url?.trim()) v.push("missing source url");
  for (const t of textColors.text) {
    const r = contrastRatio(t, textColors.bg);
    if (r < 4.5)
      v.push(
        `text colour ${t} contrast ${r.toFixed(2)}:1 on ${textColors.bg} < 4.5:1`,
      );
  }
  return v;
}
```

Then in `checkChoroplethConformance`, REPLACE the opening L0 block (the lines computing `title`, the `< 12`, year-range, description, source name, source url, and the text-contrast `for` loop) with a single call, keeping ALL the choropleth-specific rules below it:

```ts
export function checkChoroplethConformance(
  input: { /* unchanged */ },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalMapConformance(
    { title: input.title, description: input.description, source: input.source },
    textColors,
  );
  if (!input.hasLegend)
    v.push("choropleth needs a legend (the map is undecodable without it)");
  if (!input.boundsNonEmpty)
    v.push("empty data bounds — basemap-fit impossible");
  if (input.regionsWithData < 1) v.push("no region has data");
  if (input.scaleColors.length < 3)
    v.push("scale has too few steps to read as a CVD-safe ramp");
  if (input.storyBeats !== undefined && input.storyBeats < 3)
    v.push(
      `story: only ${input.storyBeats} beats — a narrated map needs at least establish + reveal + takeaway (3)`,
    );
  return v;
}
```

Do the SAME for `checkSymbolConformance` — replace its opening L0 block with `const v = checkGlobalMapConformance({ title: input.title, description: input.description, source: input.source }, textColors);` and keep all the symbol-specific rules (sizingMode, hasLegend, legendStops, maxRadiusPx, pointsWithData, boundsNonEmpty, strokeContrast, labeled) below it unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `cd skills/map-native && bun test tests/conformance.test.ts` → PASS (new L0 tests + the existing choropleth/symbol suites, now routing through the extracted fn). Then `cd skills/map-native && bun test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "refactor(map-native): extract checkGlobalMapConformance L0 + add ALL-CAPS title rule"
```
(NO Claude-Session trailer.)

---

### Task 2: `checkMapFraming` — the format-aware framing check

**Files:**
- Modify: `skills/map-native/src/conformance.ts` (append `checkMapFraming` + its two consts)
- Test: `skills/map-native/tests/conformance.test.ts` (append a `checkMapFraming` describe block)

**Interfaces:**
- Consumes: `resolveMapFrame` from `./core/map-format` (slice 1) — `resolveMapFrame(w, h, { titleLines, hasDescription }) → { scale, pad:{top,right,bottom,left}, type:{title,description,source} }`.
- Produces: `function checkMapFraming(input: { width: number; height: number; title: string; description?: string; hasSource: boolean; titleLines?: number }): string[]`. Consumed by Task 3.

- [ ] **Step 1: Write the failing test**

Append to `tests/conformance.test.ts`:

```ts
import { checkMapFraming } from "../src/conformance";

describe("checkMapFraming", () => {
  it("passes a normal landscape title with a source", () => {
    expect(
      checkMapFraming({
        width: 1280,
        height: 720,
        title: "Renewables power Europe's north",
        description: "Share, 2024",
        hasSource: true,
      }),
    ).toEqual([]);
  });
  it("passes a short title on portrait with a source", () => {
    expect(
      checkMapFraming({
        width: 1080,
        height: 1350,
        title: "Europe's renewables divide",
        hasSource: true,
      }),
    ).toEqual([]);
  });
  it("flags a title too long for a portrait frame", () => {
    expect(
      checkMapFraming({
        width: 1080,
        height: 1350,
        title: "T".repeat(160),
        hasSource: true,
      }).some((m) => /too long/.test(m)),
    ).toBe(true);
  });
  it("flags a missing source (the video gap)", () => {
    expect(
      checkMapFraming({
        width: 1280,
        height: 720,
        title: "Renewables power Europe's north",
        hasSource: false,
      }).some((m) => /source band empty/.test(m)),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL — `checkMapFraming` not exported.

- [ ] **Step 3: Implement**

At the TOP of `src/conformance.ts`, add the import (it is the only non-pure-stdlib import; `resolveMapFrame` is itself framework-free):

```ts
import { resolveMapFrame } from "./core/map-format";
```

Append at the end of `src/conformance.ts`:

```ts
// Average glyph width in ems (conservative) and the frame left/right inset, used to estimate
// whether a title fits its band at the scaled size.
const CHAR_W = 0.55;
const FRAME_INSET = 12;

// Format-aware framing/legibility check. Uses resolveMapFrame (slice 1) to assert the frame is
// adequate for THIS canvas: the title fits the width at its scaled size, the title/source bands
// are reserved, and a source is present (the rule that catches a video with no attribution).
export function checkMapFraming(input: {
  width: number;
  height: number;
  title: string;
  description?: string;
  hasSource: boolean;
  titleLines?: number;
}): string[] {
  const v: string[] = [];
  const titleLines = input.titleLines ?? 2;
  const frame = resolveMapFrame(input.width, input.height, {
    titleLines,
    hasDescription: !!input.description?.trim(),
  });
  const title = input.title?.trim() ?? "";
  const titlePx = title.length * frame.type.title * CHAR_W;
  const capacity = (input.width - 2 * FRAME_INSET) * titleLines;
  if (titlePx > capacity)
    v.push(
      `title too long for the ${input.width}×${input.height} frame — it overruns the title band`,
    );
  if (frame.pad.top <= 0) v.push("no title band reserved");
  if (frame.pad.bottom <= 0) v.push("no source band reserved");
  if (!input.hasSource)
    v.push("source band empty — every format must cite the source");
  return v;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd skills/map-native && bun test tests/conformance.test.ts` → PASS. Then `cd skills/map-native && bun test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "feat(map-native): checkMapFraming — format-aware title-fit + source-present guard"
```
(NO Claude-Session trailer.)

---

### Task 3: Wire the optional `format?` hook into both per-type guards

**Files:**
- Modify: `skills/map-native/src/conformance.ts`
- Test: `skills/map-native/tests/conformance.test.ts` (append format-hook cases)

**Interfaces:**
- Consumes: `checkMapFraming` (Task 2).
- Produces: both per-type check inputs gain an optional field `format?: { width: number; height: number }`; when present the guard merges `checkMapFraming` violations.

- [ ] **Step 1: Write the failing test**

Append to `tests/conformance.test.ts`. (Reuse the existing conformant fixtures already in the file — `ok` for choropleth and `okSymbol` for symbol; if their exact names differ, build a minimal conformant input inline.)

```ts
describe("per-type guards — optional format hook", () => {
  const text = { text: ["#1A1A1A"], bg: "#FFFFFF" };
  const choro = {
    title: "Renewables power most of Europe's north",
    description: "Share of electricity from renewables, 2024",
    source: { name: "Ember 2025", url: "https://example.org/x" },
    scaleColors: ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"],
    scaleType: "sequential" as const,
    hasLegend: true,
    regionsWithData: 24,
    regionsTotal: 27,
    boundsNonEmpty: true,
  };
  it("with no format, behaviour is unchanged (conformant → [])", () => {
    expect(checkChoroplethConformance(choro, text)).toEqual([]);
  });
  it("with a format + an over-long title, the framing violation appears", () => {
    const r = checkChoroplethConformance(
      { ...choro, title: "T".repeat(160), format: { width: 1080, height: 1350 } },
      text,
    );
    expect(r.some((m) => /too long/.test(m))).toBe(true);
  });
  it("with a conformant format, no framing violation is added", () => {
    const r = checkChoroplethConformance(
      { ...choro, format: { width: 1280, height: 720 } },
      text,
    );
    expect(r).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL — `format` is not an accepted field / the framing violation is not produced (TypeScript will also flag the unknown field until the input type is widened).

- [ ] **Step 3: Implement**

In `src/conformance.ts`, add `format?: { width: number; height: number }` to BOTH per-type input object types, and after computing each guard's `v` (the L0 + type rules), merge the framing check when `format` is present. For `checkChoroplethConformance`, add to its `input` type:

```ts
    boundsNonEmpty: boolean;
    storyBeats?: number;
    format?: { width: number; height: number };
```

and just before `return v;` add:

```ts
  if (input.format)
    v.push(
      ...checkMapFraming({
        width: input.format.width,
        height: input.format.height,
        title: input.title,
        description: input.description,
        hasSource: !!input.source?.name?.trim(),
      }),
    );
  return v;
```

Do the SAME in `checkSymbolConformance`: add `format?: { width: number; height: number }` to its `input` type and the identical `if (input.format) v.push(...checkMapFraming({...}))` block before its `return v;`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd skills/map-native && bun test tests/conformance.test.ts` → PASS. Then `cd skills/map-native && bun test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "feat(map-native): optional format hook runs checkMapFraming in per-type guards"
```
(NO Claude-Session trailer.)

## Notes for the executor

- All three tasks are pure TDD (complete code above; run the failing test first). No renders, no MapTiler, no env.
- The ALL-CAPS rule is NEW — the existing sample titles are sentence-case, so the existing suites still pass; if any pre-existing test fixture is all-caps, that's a real finding to surface, not silently work around.
- Keep `conformance.ts` framework-free: the ONLY new import is `resolveMapFrame` from `./core/map-format`.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- After all tasks: `cd skills/map-native && bun test` → full suite green; the map guard now has a shared L0, a format-aware framing check, and an opt-in `format` hook — chart-parity structure.
