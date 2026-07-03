# Chart Scrollytelling — Slice A (LINE reveal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working LINE chart-scrolly to the scrolly engine — a sticky line chart that
draws on progressively as the reader scrolls through prose steps.

**Architecture:** A `chart` visual track mirroring the map track. `deriveChartStory` (chart-native,
pure) emits `ChartBeat[]` (title → establish → progressive-reveal points → takeaway) with a
`progress` per reveal; `chartStoryToChapters` (scrolly, pure) turns them into `ScrollyStep[]`;
`ScrollyChart` (scrolly) is the sticky graphic that maps `currentStep → beat.progress` and drives
chart-native's `LineChart`. `Scrolly.tsx`/`mount.tsx` dispatch a chart config (has `nativeType`).

**Tech Stack:** Bun, TypeScript, React, D3, `bun:test`, Vite (single-file scrolly build), Playwright (smoke).

## Global Constraints

- Runtime **Bun** always; tests `bun test`. English everywhere. **No** Claude/Anthropic mention, no
  `Co-Authored-By`, no Claude-Session trailer in commits/PRs.
- Reuse chart-native's `specToNativeConfig` (`skills/chart-native/src/spec-to-config.ts`) and
  `LineChart` (`skills/chart-native/src/LineChart.tsx`, `progress` 0→1 reveal). Do NOT write new chart
  rendering.
- Never invent data; captions are data-tied. Match the F11 discipline (informative, not a bare "then").
- After writing any `.tsx`, verify NUL-free: `python3 -c "print(open('<f>','rb').read().count(b'\\x00'))"` prints 0.
- Slice A implements **line only**; `deriveChartStory` throws a clear error for bar/scatter (Slice B adds them).

## File structure

**Create:**
- `skills/chart-native/src/chart-story.ts` — `ChartBeat` type + `deriveChartStory(spec)` (line) + pure helpers `lineNotableIndices`, `mapStepToBeat`.
- `skills/chart-native/tests/chart-story.test.ts`.
- `skills/scrolly/src/chart-chapters.ts` — `chartStoryToChapters(beats, meta)`.
- `skills/scrolly/tests/chart-chapters.test.ts`.
- `skills/scrolly/src/ScrollyChart.tsx` — sticky line chart driven by `currentStep`.
- `skills/scrolly/assets/sample-data/line-scrolly.json` — a sample chart-scrolly config (NativeSpec).

**Modify:**
- `skills/scrolly/src/Scrolly.tsx` — chart-config discriminator + `<ScrollyChart>` dispatch.
- `skills/scrolly/src/mount.tsx` — accept chart configs.
- `skills/scrolly/scripts/smoke.mjs` — add a chart-scrolly smoke assertion (or a sibling `smoke-chart.mjs`).

**Reference (read):** `skills/scrolly/src/Scrolly.tsx` (story build + sticky dispatch), `skills/scrolly/src/chapters.ts` (`ScrollyStory`/`ScrollyStep` shapes), `skills/chart-native/src/spec-to-config.ts` (`NativeSpec`, `specToNativeConfig`, `UnsupportedNativeType`), `skills/chart-native/src/LineChart.tsx` (props).

---

## Task 1: `ChartBeat` + `deriveChartStory` (line) — chart-native, pure

**Files:** Create `skills/chart-native/src/chart-story.ts`, `skills/chart-native/tests/chart-story.test.ts`.

**Interfaces:**
- Consumes: `specToNativeConfig(spec: NativeSpec): { type: string; config: Record<string, unknown> }` and
  `UnsupportedNativeType` from `./spec-to-config`. The line `config` has
  `{ title, source, unit, directLabel, xField, yField, xType, points: Record<string,string|number>[] }`.
- Produces: `interface ChartBeat { kind: "title"|"establish"|"reveal"|"takeaway"; progress?: number;
  highlightIndex?: number; labelKey?: string; callout: { name: string; value: string; text: string } | null;
  copy: string; rank?: number; rankRole?: "leader"|"tail" }` and
  `deriveChartStory(spec: NativeSpec, insight?: string): ChartBeat[]`, plus pure helpers
  `lineNotableIndices(ys: number[]): number[]` and `mapStepToBeat(beats: ChartBeat[], step: number): ChartBeat`.

- [ ] **Step 1: Write the failing test** — `skills/chart-native/tests/chart-story.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import {
  deriveChartStory,
  lineNotableIndices,
  mapStepToBeat,
} from "../src/chart-story";

const lineSpec = {
  nativeType: "line",
  title: "Arctic sea ice has shrunk since 1979",
  unit: "million km²",
  source: { name: "NSIDC" },
  data: "year,extent\n1979,7.0\n1995,6.1\n2012,3.6\n2025,4.3",
  directLabel: "extent",
};

describe("lineNotableIndices", () => {
  it("always includes the first and last index", () => {
    const idx = lineNotableIndices([7, 6.1, 3.6, 4.3]);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(3);
  });
  it("includes the biggest drop/jump between (the 2012 minimum here)", () => {
    // 6.1 → 3.6 is the biggest move; index 2 must be a notable point.
    expect(lineNotableIndices([7, 6.1, 3.6, 4.3])).toContain(2);
  });
  it("is sorted ascending and unique", () => {
    const idx = lineNotableIndices([1, 9, 2, 8, 3, 7]);
    expect(idx).toEqual([...new Set(idx)].sort((a, b) => a - b));
  });
});

describe("deriveChartStory (line)", () => {
  const beats = deriveChartStory(lineSpec as any, "The ice keeps thinning");
  it("emits title → establish → reveals → takeaway", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    expect(beats.filter((b) => b.kind === "reveal").length).toBeGreaterThanOrEqual(2);
  });
  it("title copy = spec.title; establish has no progress; takeaway copy = insight", () => {
    expect(beats[0].copy).toBe(lineSpec.title);
    expect(beats[1].progress).toBeUndefined();
    expect(beats[beats.length - 1].copy).toBe("The ice keeps thinning");
  });
  it("reveal beats carry an increasing progress in (0,1] and a data-tied callout", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    for (let i = 1; i < reveals.length; i++)
      expect(reveals[i].progress!).toBeGreaterThan(reveals[i - 1].progress!);
    expect(reveals[reveals.length - 1].progress).toBeCloseTo(1, 5); // last point = full reveal
    expect(reveals[0].callout).not.toBeNull();
    expect(reveals[0].copy).toContain("1979"); // the x-label of the first point
  });
  it("throws a clear error for a non-line native type (Slice A)", () => {
    expect(() => deriveChartStory({ ...lineSpec, nativeType: "bar" } as any)).toThrow(
      /chart-scrolly.*line/i,
    );
  });
});

describe("mapStepToBeat", () => {
  const beats = deriveChartStory(lineSpec as any);
  it("clamps out-of-range steps to the first/last beat", () => {
    expect(mapStepToBeat(beats, -5)).toBe(beats[0]);
    expect(mapStepToBeat(beats, 999)).toBe(beats[beats.length - 1]);
    expect(mapStepToBeat(beats, 2)).toBe(beats[2]);
  });
});
```

- [ ] **Step 2: Run it — fails** `cd skills/chart-native && bun test tests/chart-story.test.ts` (Expected: FAIL, module not found).

- [ ] **Step 3: Implement** — `skills/chart-native/src/chart-story.ts`

```ts
import { specToNativeConfig, UnsupportedNativeType } from "./spec-to-config";
import type { NativeSpec } from "./spec-to-config";

export interface ChartBeat {
  kind: "title" | "establish" | "reveal" | "takeaway";
  progress?: number; // line: 0..1 reveal to this point
  highlightIndex?: number; // bar (Slice B)
  labelKey?: string; // scatter (Slice B)
  callout: { name: string; value: string; text: string } | null;
  copy: string;
  rank?: number;
  rankRole?: "leader" | "tail";
}

// Notable points on a line: ALWAYS the first and last, plus the interior points with the
// biggest step-to-step move (the peaks/drops that carry the story). Deterministic; up to 4
// points total so a short scrolly reads. Returns ascending unique indices.
export function lineNotableIndices(ys: number[]): number[] {
  const n = ys.length;
  if (n <= 2) return ys.map((_, i) => i);
  const interior = ys
    .slice(1, -1)
    .map((y, i) => ({ i: i + 1, jump: Math.abs(y - ys[i]) }))
    .sort((a, b) => b.jump - a.jump || a.i - b.i)
    .slice(0, 2)
    .map((c) => c.i);
  return [...new Set([0, ...interior, n - 1])].sort((a, b) => a - b);
}

// Clamp a scroll step index to a valid beat (out-of-range → first/last).
export function mapStepToBeat(beats: ChartBeat[], step: number): ChartBeat {
  const i = Math.max(0, Math.min(beats.length - 1, step));
  return beats[i];
}

// Build the ordered chart-scrolly beats from a NativeSpec. Slice A: LINE only.
export function deriveChartStory(spec: NativeSpec, insight?: string): ChartBeat[] {
  if (spec.nativeType !== "line")
    throw new Error(
      `chart-scrolly (Slice A) supports only line; got "${spec.nativeType}"`,
    );
  const { config } = specToNativeConfig(spec);
  const xField = config.xField as string;
  const yField = config.yField as string;
  const points = config.points as Record<string, string | number>[];
  const ys = points.map((p) => Number(p[yField]));
  const idx = lineNotableIndices(ys);
  const n = points.length;
  const fmt = (v: number) =>
    `${Math.round(v * 100) / 100}${spec.unit ? " " + spec.unit : ""}`;

  const beats: ChartBeat[] = [];
  beats.push({ kind: "title", callout: null, copy: spec.title });
  beats.push({ kind: "establish", callout: null, copy: "" });
  for (const i of idx) {
    const name = String(points[i][xField]);
    const value = fmt(ys[i]);
    const text = `${name} — ${value}`;
    beats.push({
      kind: "reveal",
      progress: n > 1 ? i / (n - 1) : 1,
      callout: { name, value, text },
      copy: text,
    });
  }
  beats.push({
    kind: "takeaway",
    callout: null,
    copy: insight && insight !== spec.title ? insight : "",
  });
  return beats;
}
```

- [ ] **Step 4: Run it — passes** `cd skills/chart-native && bun test tests/chart-story.test.ts` (Expected: PASS). Then full suite `bun test` (Expected: all pass).

- [ ] **Step 5: Commit**
```bash
git add skills/chart-native/src/chart-story.ts skills/chart-native/tests/chart-story.test.ts
git commit -m "feat(chart-native): deriveChartStory (line) — chart-scrolly beats"
```

---

## Task 2: `chartStoryToChapters` — scrolly, pure

**Files:** Create `skills/scrolly/src/chart-chapters.ts`, `skills/scrolly/tests/chart-chapters.test.ts`.

**Interfaces:**
- Consumes: `ChartBeat` from `../../chart-native/src/chart-story`; `ScrollyStory`/`ScrollyStep` from `./chapters`.
- Produces: `chartStoryToChapters(beats: ChartBeat[], meta: { title: string; description?: string; source?: { name: string; url: string } }): ScrollyStory`.

- [ ] **Step 1: Write the failing test** — `skills/scrolly/tests/chart-chapters.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { chartStoryToChapters } from "../src/chart-chapters";
import type { ChartBeat } from "../../chart-native/src/chart-story";

const beats: ChartBeat[] = [
  { kind: "title", callout: null, copy: "Arctic sea ice has shrunk" },
  { kind: "establish", callout: null, copy: "" },
  { kind: "reveal", progress: 0, callout: { name: "1979", value: "7 million km²", text: "1979 — 7 million km²" }, copy: "1979 — 7 million km²" },
  { kind: "reveal", progress: 1, callout: { name: "2025", value: "4.3 million km²", text: "2025 — 4.3 million km²" }, copy: "2025 — 4.3 million km²" },
  { kind: "takeaway", callout: null, copy: "The ice keeps thinning" },
];
const meta = { title: "Arctic sea ice has shrunk", description: "September minimum, 1979–2025", source: { name: "NSIDC", url: "https://nsidc.org" } };

describe("chartStoryToChapters", () => {
  const story = chartStoryToChapters(beats, meta);
  it("every step is visual:'chart' and ref = beat index", () => {
    expect(story.visual).toBe("chart");
    expect(story.steps.every((s) => s.visual === "chart")).toBe(true);
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3, 4]);
  });
  it("title + establish carry the description; the title is never a caption", () => {
    expect(story.steps[0].prose).toBe(meta.description);
    expect(story.steps[1].prose).toBe(meta.description);
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });
  it("reveal steps carry the beat copy; takeaway carries its copy", () => {
    expect(story.steps[2].prose).toBe("1979 — 7 million km²");
    expect(story.steps[4].prose).toBe("The ice keeps thinning");
  });
  it("line reveal steps use the drawTo action", () => {
    expect(story.steps[2].action).toBe("drawTo");
  });
});
```

- [ ] **Step 2: Run it — fails** `cd skills/scrolly && bun test tests/chart-chapters.test.ts`

- [ ] **Step 3: Implement** — `skills/scrolly/src/chart-chapters.ts`

```ts
import type { ChartBeat } from "../../chart-native/src/chart-story";
import type { ScrollyStory, ScrollyStep } from "./chapters";

// Chart analog of mapStoryToChapters: one scroll step per beat, self-contained data-tied
// captions (never article text). title + establish carry the figure DESCRIPTION (see all
// the data first); reveals carry the beat copy; the takeaway closes on the insight.
export function chartStoryToChapters(
  beats: ChartBeat[],
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
  },
): ScrollyStory {
  const desc = meta.description?.trim() ? meta.description : meta.title;
  const steps: ScrollyStep[] = beats.map((b, i) => {
    let prose: string;
    if (b.kind === "title" || b.kind === "establish") prose = desc;
    else if (b.kind === "takeaway") prose = b.copy?.trim() ? b.copy : desc;
    else prose = b.copy;
    return {
      id: `step-${i}-${b.kind}`,
      visual: "chart",
      action: "drawTo",
      ref: i,
      prose,
      align: "center",
    };
  });
  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "chart",
    steps,
  };
}
```

- [ ] **Step 4: Run it — passes** `cd skills/scrolly && bun test tests/chart-chapters.test.ts`

- [ ] **Step 5: Commit**
```bash
git add skills/scrolly/src/chart-chapters.ts skills/scrolly/tests/chart-chapters.test.ts
git commit -m "feat(scrolly): chartStoryToChapters — chart beats → scroll steps"
```

---

## Task 3: `ScrollyChart` sticky component (line) + wiring

**Files:** Create `skills/scrolly/src/ScrollyChart.tsx`; Modify `skills/scrolly/src/Scrolly.tsx`, `skills/scrolly/src/mount.tsx`; Create `skills/scrolly/assets/sample-data/line-scrolly.json`.

**Interfaces:**
- Consumes: `deriveChartStory`, `mapStepToBeat` from `../../chart-native/src/chart-story`; `LineChart` from `../../chart-native/src/LineChart`; `specToNativeConfig` from `../../chart-native/src/spec-to-config`; `chartStoryToChapters` from `./chart-chapters`.
- Produces: `ScrollyChart: React.FC<{ config: ChartScrollyConfig; currentStep: number }>` and
  `type ChartScrollyConfig = NativeSpec & { description?: string; insight?: string; source?: { name: string; url: string } }`.

- [ ] **Step 1: Create the sample config** — `skills/scrolly/assets/sample-data/line-scrolly.json`

```json
{
  "producer": "chart-native",
  "nativeType": "line",
  "title": "The Arctic's summer sea ice has shrunk by nearly 40% since 1979",
  "description": "September minimum sea-ice extent, million km², 1979–2025",
  "insight": "Five years of record lows have not reversed the long decline.",
  "unit": "million km²",
  "directLabel": "extent",
  "source": { "name": "NSIDC Sea Ice Index", "url": "https://nsidc.org/data/seaice_index" },
  "data": "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3"
}
```

- [ ] **Step 2: Write `ScrollyChart.tsx`** — the sticky line chart. Maps `currentStep → beat.progress`
  and renders the reused `LineChart`. Build the native config + beats once (deterministic).

```tsx
import React, { useMemo } from "react";
import { LineChart } from "../../chart-native/src/LineChart";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";
import {
  deriveChartStory,
  mapStepToBeat,
} from "../../chart-native/src/chart-story";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";

export type ChartScrollyConfig = NativeSpec & {
  description?: string;
  insight?: string;
  source?: { name: string; url?: string };
};

export const ScrollyChart: React.FC<{
  config: ChartScrollyConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const { native, beats } = useMemo(() => {
    const native = specToNativeConfig(config).config;
    const beats = deriveChartStory(config, config.insight);
    return { native, beats };
  }, [config]);

  const beat = mapStepToBeat(beats, currentStep);
  // establish/takeaway show the whole line; a reveal draws to its progress.
  const progress = beat.kind === "reveal" ? (beat.progress ?? 1) : 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <LineChart
        config={native as never}
        progress={progress}
        responsive
        interactive={false}
      />
    </div>
  );
};
```

- [ ] **Step 3: Verify NUL-free**
`python3 -c "print(open('skills/scrolly/src/ScrollyChart.tsx','rb').read().count(b'\\x00'))"` → prints `0`.

- [ ] **Step 4: Wire `Scrolly.tsx`** — (a) import `ScrollyChart`, `chartStoryToChapters`, `deriveChartStory`;
  (b) at the TOP of the `story` useMemo, handle a chart config (has `nativeType`) BEFORE the map branches;
  (c) in the sticky-graphic JSX, render `<ScrollyChart>` when the config has `nativeType`.

At the top of the `useMemo(() => { ... }, ...)` that builds `story`, add:
```tsx
    // CHART config (chart-native NativeSpec) — has `nativeType`. Build the chart story
    // BEFORE the map branches; a chart needs no geojson.
    if ("nativeType" in config) {
      const beats = deriveChartStory(
        config as unknown as import("./ScrollyChart").ChartScrollyConfig,
        (config as { insight?: string }).insight,
      );
      return chartStoryToChapters(beats, {
        title: (config as { title?: string }).title ?? "",
        description: (config as { description?: string }).description,
        source: (config as { source?: { name: string; url: string } }).source,
      });
    }
```
Add `ScrollyChart` / `ChartScrollyConfig` to the imports and to the `config` prop union. In the
sticky-graphic JSX (`<div style={stickyGraphicStyle}> … </div>`), make the FIRST branch:
```tsx
          {"nativeType" in config ? (
            <ScrollyChart
              config={config as unknown as ChartScrollyConfig}
              currentStep={activeBeatRef}
            />
          ) : config.type === "symbol" ? (
```
(where `activeBeatRef` is the same active-step value already passed to `ScrollyMap` as `currentStep`).
Add `| ChartScrollyConfig` to the `config` prop type union at the top of `Scrolly`.

- [ ] **Step 5: Wire `mount.tsx`** — the mount already passes the injected `__CONFIG__` to `<Scrolly config=…/>`;
  a chart config flows through unchanged (the union now includes `ChartScrollyConfig`). Confirm `mount.tsx`
  types the config as the same union or `any`; if it narrows to map configs, widen it to include
  `ChartScrollyConfig`. No behavioural change beyond the type.

- [ ] **Step 6: Typecheck + suites**
`cd skills/scrolly && bunx tsc --noEmit 2>&1 | grep -v "react-dom" ; bun test` (Expected: clean apart from any pre-existing TS2688; all tests pass).

- [ ] **Step 7: Commit**
```bash
git add skills/scrolly/src/ScrollyChart.tsx skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx skills/scrolly/assets/sample-data/line-scrolly.json
git commit -m "feat(scrolly): ScrollyChart line track + chart-config dispatch"
```

---

## Task 4: Produce + smoke + render-verify

**Files:** Modify `skills/scrolly/scripts/smoke.mjs` (add a chart branch) or create `skills/scrolly/scripts/smoke-chart.mjs`.

- [ ] **Step 1: Build a line chart-scrolly**
```bash
cd skills/scrolly
bun scripts/produce.mjs assets/sample-data/line-scrolly.json /tmp/chart-scrolly
# → /tmp/chart-scrolly/scrolly.html (single-file, config baked in; NO world.geojson → small bundle)
```

- [ ] **Step 2: Write the smoke assertion** — `skills/scrolly/scripts/smoke-chart.mjs`: headless-load the
  built HTML, assert (a) an SVG `<path>` (the line) renders, (b) advancing the scroll changes the revealed
  path — scroll to the first reveal step and to the last, read the line `<path>` `getTotalLength()`, and
  assert the last-step length > the first-step length (the line drew further).

```js
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const url = pathToFileURL("/tmp/chart-scrolly/scrolly.html").href;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await p.waitForSelector("svg path", { timeout: 15000 });

async function lineLenAtScroll(frac) {
  await p.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
  await p.waitForTimeout(600);
  return p.evaluate(() => {
    const paths = [...document.querySelectorAll("svg path")].filter((el) => {
      const s = el.getAttribute("stroke");
      return s && s !== "none" && (el.getAttribute("fill") ?? "none") === "none";
    });
    return Math.max(0, ...paths.map((pp) => { try { return pp.getTotalLength(); } catch { return 0; } }));
  });
}

const early = await lineLenAtScroll(0.15); // near the first reveal
const late = await lineLenAtScroll(0.9); // near the last reveal
console.log(JSON.stringify({ errors: errs.slice(0, 2), early: Math.round(early), late: Math.round(late) }));
if (errs.length) { console.error("PAGE ERRORS"); process.exit(1); }
if (!(late > early + 5)) { console.error("line did not draw further on scroll"); process.exit(1); }
console.log("chart-scrolly smoke OK");
await b.close();
```

- [ ] **Step 3: Run the smoke** `cd skills/scrolly && bun scripts/smoke-chart.mjs`
Expected: `chart-scrolly smoke OK`, `late > early`, no page errors. If the line does not draw further,
STOP — the step→progress mapping is wrong; fix `ScrollyChart`/`deriveChartStory`, not the smoke.

- [ ] **Step 4: Render-verify (controller).** Open `/tmp/chart-scrolly/scrolly.html`, scroll through: the
  line draws on progressively, each prose caption matches the segment revealed, the establish/takeaway show
  the full line, light build, at desktop AND a ~380px mobile width. This is a merge gate — confirm it reads
  as a scroll-driven reveal, not just "it renders".

- [ ] **Step 5: Commit**
```bash
git add skills/scrolly/scripts/smoke-chart.mjs
git commit -m "test(scrolly): chart-scrolly smoke — line draws further on scroll"
```

---

## Self-Review

**Spec coverage:** `deriveChartStory` (line) → Task 1; `chartStoryToChapters` → Task 2; `ScrollyChart` +
`Scrolly.tsx`/`mount.tsx` dispatch + sample → Task 3; produce + smoke + render-verify → Task 4. The spec's
line track, data model (`ChartBeat`), captions (data-tied), error handling (non-line throws), and testing
(pure + smoke + render) are all covered. Bar/scatter (Slice B) are explicitly out of this plan and throw.

**Placeholder scan:** every code step shows complete code; commands have expected output; no TBD.

**Type consistency:** `ChartBeat` (Task 1) is consumed unchanged by Task 2 (`chartStoryToChapters`) and Task 3
(`ScrollyChart` via `mapStepToBeat`). `deriveChartStory(spec, insight?)` and `mapStepToBeat(beats, step)`
signatures match across tasks. `ChartScrollyConfig` (Task 3) = `NativeSpec` + description/insight/source,
used by `Scrolly.tsx`. `ScrollyStep`/`ScrollyStory` reuse the existing `chapters.ts` shapes verbatim.
