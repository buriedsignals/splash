# SP4 — Map Scrolly-as-Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the last missing map video format — scrolly-as-video — rendering the interactive
map-scrolly (same `ScrollyStory` content, scrolling text panel + pinned map) as deterministic
MP4 in 3 sizes for choropleth, symbol, and route.

**Architecture:** A shared scrolly shell (`ScrollyPanel` + `scrollyPanelLayout`, a scrolly
timeline over `ScrollyStory.steps`, the existing `resolveScene` title scene) plus three focused
per-type renderers (`ChoroplethScrolly`, `SymbolScrolly`, `RouteScrolly`) ported from the
existing `*Story` / `RouteReveal` components — each swaps the overlay for the scrolly panel and
paces on steps. `MapScrolly.tsx` is a thin dispatcher on `config.type`. Content is derived
through the same `mapStoryToChapters` the interactive scrolly uses (choropleth/symbol) and a new
`routeStoryToChapters` (route). Camera reuses `cameraForFrame`; route `drawTo` reuses
`RouteReveal`'s draw-head. Composition durations are derived from the real props via Remotion
`calculateMetadata`, so arbitrary step counts are never truncated.

**Tech Stack:** Bun, TypeScript, Remotion, MapTiler SDK, turf, `bun:test`.

## Global Constraints

- Runtime: **Bun** always — never npm/node. Run tests with `bun test`.
- Code, comments, commit messages, branch names: **English**.
- **No** Claude/Anthropic mention, **no** `Co-Authored-By`, **no** Claude-Session trailer in any
  commit, PR, file, README, or doc.
- MapTiler key lives in `atelier/.env` (gitignored) — never commit or log its value.
- Frame-deterministic Remotion: no `Date.now`, no `Math.random`, no argless `new Date()`. Map
  updates use `delayRender` → `jumpTo`/`setData` → `map.once("idle")` → `continueRender`; render
  with `--gl=angle --concurrency=1`.
- Reuse existing building blocks (`cameraForFrame`/`buildTimeline`, `RouteReveal` draw-head,
  `resolveScene`, `mapStoryToChapters`); do not fork or duplicate them.
- The `ScrollyStory` / `ScrollyStep` contract in `skills/scrolly/src/chapters.ts` is imported,
  never modified. Importing it into map-native is safe: `chapters.ts` imports only `type { Beat }`
  from map-native (erased at runtime), so there is no runtime import cycle.

---

## File structure

**Create:**
- `skills/map-native/src/route-story.ts` — `routeStoryToChapters`, `scrollyFrames`,
  `scrollyStepCount`. Route→ScrollyStory contract + scrolly duration helpers.
- `skills/map-native/src/components/ScrollyPanel.tsx` — `scrollyPanelLayout` (pure) + the panel
  component (side column / bottom card, slide animation).
- `skills/map-native/src/components/ChoroplethScrolly.tsx` — choropleth flyTo scrolly renderer.
- `skills/map-native/src/components/SymbolScrolly.tsx` — symbol flyTo scrolly renderer.
- `skills/map-native/src/components/RouteScrolly.tsx` — route drawTo scrolly renderer.
- `skills/map-native/src/components/MapScrolly.tsx` — dispatcher on `config.type`.
- `skills/map-native/knowledge/references/map/formats/video-scrolly.md` — KB reference.
- `skills/map-native/tests/route-story.test.ts`
- `skills/map-native/tests/scrolly-contract.test.ts`
- `skills/map-native/tests/scrolly-panel.test.ts`

**Modify:**
- `skills/map-native/src/conformance.ts` — add `checkScrollyConformance`.
- `skills/map-native/remotion/src/Root.tsx` — register `MapScrolly{,Square,Portrait}` with
  `calculateMetadata` deriving `durationInFrames`.
- `skills/map-native/scripts/produce.mjs` — new `scrolly` format for all 3 types.
- `skills/map-native/SKILL.md` — document the scrolly format.

**Decision (spec deviation, intentional):** the spec listed `validate-config.ts` as modified.
Scrolly steps are always **derived** (never user-supplied in config), so there is nothing new to
validate on the raw config pre-render — the existing per-type config validation already covers
it. The scrolly contract is validated post-derivation by `checkScrollyConformance` (Task 2).
`validate-config.ts` is therefore left unchanged.

---

## Task 1: Route→ScrollyStory contract + scrolly duration helpers

**Files:**
- Create: `skills/map-native/src/route-story.ts`
- Test: `skills/map-native/tests/route-story.test.ts`

**Interfaces:**
- Consumes: `RouteRevealLayout` (from `./route-geo` — `{ route, territories: RouteRevealTerritory[], bounds, totalLengthKm }`; each territory `{ key, label, color, order, anchor, stop, border }`), `buildTimeline` (from `./story-timeline`), `TITLE_SCENE_FRAMES` (from `./video-scene`), `ScrollyStory`/`ScrollyStep` (from `../../scrolly/src/chapters`), `computeRouteReveal`/`deriveMapStory`/`deriveSymbolStory`/`computeChoropleth`/`mapStoryToChapters` for `scrollyStepCount`.
- Produces:
  - `routeStoryToChapters(layout: RouteRevealLayout, meta: { title: string; description?: string; source?: { name: string; url: string } }): ScrollyStory`
  - `scrollyFrames(stepCount: number, fps: number): number`
  - `scrollyStepCount(config: any, world: GeoJSON.FeatureCollection): number`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/route-story.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { routeStoryToChapters, scrollyFrames } from "../src/route-story";
import { computeRouteReveal } from "../src/route-geo";
import world from "../assets/geo/world.geojson";

const sampleRoute = {
  type: "route" as const,
  route: [
    [116.4, 39.9], // Beijing
    [96.0, 33.0], // Qinghai
    [88.0, 29.0], // Tibet
    [77.2, 28.6], // Delhi
  ] as [number, number][],
  basemap: "dataviz",
  title: "A river's path from Tibet to the sea",
  description: "The route crosses several territories.",
  source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
};

describe("routeStoryToChapters", () => {
  const layout = computeRouteReveal(sampleRoute, world as any);
  const story = routeStoryToChapters(layout, {
    title: sampleRoute.title,
    description: sampleRoute.description,
    source: sampleRoute.source,
  });

  it("emits an intro step plus one drawTo step per territory", () => {
    const drawSteps = story.steps.filter((s) => s.action === "drawTo");
    expect(drawSteps.length).toBe(layout.territories.length);
    expect(story.steps.length).toBe(layout.territories.length + 1);
  });

  it("makes the first step the intro (flyTo, carries the description)", () => {
    expect(story.steps[0].action).toBe("flyTo");
    expect(story.steps[0].prose.length).toBeGreaterThan(0);
  });

  it("gives every step non-empty prose", () => {
    for (const s of story.steps) expect(s.prose.trim().length).toBeGreaterThan(0);
  });

  it("references territories by ascending index in drawTo steps", () => {
    const refs = story.steps
      .filter((s) => s.action === "drawTo")
      .map((s) => s.ref as number);
    for (let i = 0; i < refs.length; i++) expect(refs[i]).toBe(i);
  });

  it("carries the story title and source", () => {
    expect(story.title).toBe(sampleRoute.title);
    expect(story.source?.name).toBe("Natural Earth");
  });
});

describe("scrollyFrames", () => {
  it("grows with step count", () => {
    expect(scrollyFrames(5, 30)).toBeGreaterThan(scrollyFrames(3, 30));
  });
  it("includes the title scene (≥ one title hold)", () => {
    expect(scrollyFrames(2, 30)).toBeGreaterThanOrEqual(75);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/route-story.test.ts`
Expected: FAIL — `routeStoryToChapters`/`scrollyFrames` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/route-story.ts`:

```typescript
import type { RouteRevealLayout } from "./route-geo";
import { computeRouteReveal } from "./route-geo";
import { computeChoropleth } from "./choropleth-geo";
import { deriveMapStory } from "./map-story";
import { deriveSymbolStory } from "./symbol-story";
import { buildTimeline } from "./story-timeline";
import { TITLE_SCENE_FRAMES } from "./video-scene";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import type { ScrollyStory, ScrollyStep } from "../../scrolly/src/chapters";

// Route → ScrollyStory: an intro step (flyTo, carries the description) followed by one
// drawTo step per crossed territory (in the layout's already-sorted order). Each drawTo
// step's `ref` is the territory index; the renderer looks up territory.stop from it. Prose
// is the territory label (always non-empty — computeRouteReveal defaults label to the key);
// config.territories[].label lets the curator enrich it upstream.
export function routeStoryToChapters(
  layout: RouteRevealLayout,
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
  },
): ScrollyStory {
  const intro: ScrollyStep = {
    id: "step-0-intro",
    visual: "map",
    action: "flyTo",
    ref: 0,
    prose: meta.description?.trim() ? meta.description : meta.title,
    align: "center",
  };

  const drawSteps: ScrollyStep[] = layout.territories.map((t, i) => ({
    id: `step-${i + 1}-draw`,
    visual: "map",
    action: "drawTo",
    ref: i,
    prose: t.label,
    align: "center",
  }));

  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "map",
    steps: [intro, ...drawSteps],
  };
}

// Total frames for a scrolly video: step 0 is the full-screen title scene (buildTimeline's
// "title" hold defaults to 2.5s = TITLE_SCENE_FRAMES @30fps), each later step is a "reveal"
// (move + hold). Reusing buildTimeline keeps scrolly pacing identical to the storytelling video.
export function scrollyFrames(stepCount: number, fps: number): number {
  const kinds = Array.from({ length: Math.max(1, stepCount) }, (_, i) =>
    i === 0 ? "title" : "reveal",
  );
  return buildTimeline(kinds, fps).totalFrames;
}

// Derive the scrolly step count for a config (used by Root's calculateMetadata to size the
// composition to the real data, not the sample). Mirrors the per-type derivation the
// renderers use.
export function scrollyStepCount(
  config: any,
  world: GeoJSON.FeatureCollection,
): number {
  if (config.type === "route") {
    return computeRouteReveal(config, world).territories.length + 1;
  }
  if (config.type === "symbol") {
    const beats = deriveSymbolStory(config.points, {
      title: config.title ?? "",
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: config.points.length,
    }).steps.length;
  }
  const layout = computeChoropleth(config, world, "iso_a3", {
    bins: 5,
    scaleType: "sequential",
  });
  const beats = deriveMapStory(layout, world, "iso_a3", {
    title: config.title ?? "",
    insight: config.insight ?? config.title ?? "",
    unit: config.valueUnit ?? "",
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: layout.joined.filter((j) => j.value !== null).length,
  }).steps.length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/route-story.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/route-story.ts skills/map-native/tests/route-story.test.ts
git commit -m "feat(map-native): route→ScrollyStory contract + scrolly duration helpers"
```

---

## Task 2: Scrolly conformance guard

**Files:**
- Modify: `skills/map-native/src/conformance.ts`
- Test: `skills/map-native/tests/scrolly-contract.test.ts`

**Interfaces:**
- Consumes: `ScrollyStory`/`ScrollyStep` (from `../../scrolly/src/chapters`).
- Produces: `checkScrollyConformance(input: { story: ScrollyStory; territoryCount?: number }): { violations: string[] }`

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/scrolly-contract.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { checkScrollyConformance } from "../src/conformance";
import type { ScrollyStory } from "../../scrolly/src/chapters";

const good: ScrollyStory = {
  title: "A river's path from Tibet to the sea",
  description: "The route crosses several territories.",
  source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
  visual: "map",
  steps: [
    { id: "s0", visual: "map", action: "flyTo", ref: 0, prose: "Intro caption here." },
    { id: "s1", visual: "map", action: "drawTo", ref: 0, prose: "China" },
    { id: "s2", visual: "map", action: "drawTo", ref: 1, prose: "India" },
  ],
};

describe("checkScrollyConformance", () => {
  it("accepts a well-formed story", () => {
    expect(
      checkScrollyConformance({ story: good, territoryCount: 2 }).violations,
    ).toEqual([]);
  });

  it("rejects fewer than 2 steps", () => {
    const s = { ...good, steps: [good.steps[0]] };
    expect(checkScrollyConformance({ story: s }).violations.join(" ")).toContain(
      "at least 2 steps",
    );
  });

  it("rejects empty prose", () => {
    const s = {
      ...good,
      steps: [good.steps[0], { ...good.steps[1], prose: "  " }],
    };
    expect(checkScrollyConformance({ story: s }).violations.join(" ")).toContain(
      "empty prose",
    );
  });

  it("rejects a drawTo ref beyond the territory count", () => {
    expect(
      checkScrollyConformance({ story: good, territoryCount: 1 }).violations.join(
        " ",
      ),
    ).toContain("out of range");
  });

  it("rejects a missing source", () => {
    const s = { ...good, source: undefined };
    expect(checkScrollyConformance({ story: s }).violations.join(" ")).toContain(
      "cite a source",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/scrolly-contract.test.ts`
Expected: FAIL — `checkScrollyConformance` not exported.

- [ ] **Step 3: Write the implementation**

Append to `skills/map-native/src/conformance.ts` (add the import at the top with the other imports):

```typescript
import type { ScrollyStory } from "../../scrolly/src/chapters";
```

```typescript
// Scrolly-video contract: validated on the DERIVED ScrollyStory (post mapStoryToChapters /
// routeStoryToChapters), not the raw config — steps are always derived. territoryCount, when
// given, range-checks drawTo refs (route).
export function checkScrollyConformance(input: {
  story: ScrollyStory;
  territoryCount?: number;
}): { violations: string[] } {
  const v: string[] = [];
  const { story, territoryCount } = input;

  if (story.steps.length < 2)
    v.push("scrolly needs at least 2 steps (intro + one content step)");

  const title = story.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (!story.source?.name?.trim()) v.push("scrolly must cite a source");

  for (const s of story.steps) {
    if (!s.prose?.trim()) v.push(`step ${s.id} has empty prose`);
    if (s.action !== "flyTo" && s.action !== "drawTo")
      v.push(`step ${s.id} has unknown action "${s.action}"`);
    if (typeof s.ref === "number") {
      if (s.ref < 0) v.push(`step ${s.id} ref ${s.ref} out of range`);
      if (
        s.action === "drawTo" &&
        territoryCount !== undefined &&
        s.ref >= territoryCount
      )
        v.push(`step ${s.id} drawTo ref ${s.ref} out of range (${territoryCount})`);
    }
  }
  return { violations: v };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/scrolly-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/scrolly-contract.test.ts
git commit -m "feat(map-native): checkScrollyConformance — validate the derived scrolly story"
```

---

## Task 3: ScrollyPanel — layout helper + component

**Files:**
- Create: `skills/map-native/src/components/ScrollyPanel.tsx`
- Test: `skills/map-native/tests/scrolly-panel.test.ts`

**Interfaces:**
- Produces:
  - `scrollyPanelLayout(input: { width: number; height: number; align?: "left" | "right" | "center"; slide: number }): { side: "left" | "right" | "center" | "bottom"; x: number; y: number; width: number; opacity: number }`
  - `ScrollyPanel` React component: props `{ width; height; align?; slide; prose; dark?: boolean }`
- `slide` semantics: 0 = fully below the reading zone (entering), 1 = pinned, 2 = fully above
  (exited). Opacity is 0 at slide 0 and 2, 1 at slide 1.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/scrolly-panel.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { scrollyPanelLayout } from "../src/components/ScrollyPanel";

describe("scrollyPanelLayout", () => {
  it("puts the panel at the bottom for narrow (square/portrait) canvases", () => {
    expect(scrollyPanelLayout({ width: 1080, height: 1080, align: "left", slide: 1 }).side).toBe("bottom");
    expect(scrollyPanelLayout({ width: 1080, height: 1350, align: "right", slide: 1 }).side).toBe("bottom");
  });

  it("honors align as the side on wide (landscape) canvases", () => {
    expect(scrollyPanelLayout({ width: 1280, height: 720, align: "left", slide: 1 }).side).toBe("left");
    expect(scrollyPanelLayout({ width: 1280, height: 720, align: "right", slide: 1 }).side).toBe("right");
    expect(scrollyPanelLayout({ width: 1280, height: 720, align: "center", slide: 1 }).side).toBe("center");
  });

  it("is invisible at slide 0 and slide 2, full at slide 1", () => {
    const at = (slide: number) => scrollyPanelLayout({ width: 1280, height: 720, slide }).opacity;
    expect(at(0)).toBeCloseTo(0, 5);
    expect(at(2)).toBeCloseTo(0, 5);
    expect(at(1)).toBeCloseTo(1, 5);
  });

  it("keeps the panel inside the viewport horizontally", () => {
    const p = scrollyPanelLayout({ width: 1280, height: 720, align: "right", slide: 1 });
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(1280);
  });

  it("moves the panel upward as slide increases (pinned → exiting)", () => {
    const y1 = scrollyPanelLayout({ width: 1280, height: 720, slide: 1 }).y;
    const y2 = scrollyPanelLayout({ width: 1280, height: 720, slide: 1.8 }).y;
    expect(y2).toBeLessThan(y1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd skills/map-native && bun test tests/scrolly-panel.test.ts`
Expected: FAIL — `scrollyPanelLayout` not exported.

- [ ] **Step 3: Write the implementation**

Create `skills/map-native/src/components/ScrollyPanel.tsx`:

```tsx
import React from "react";

// Panel geometry — pure so it is unit-testable. Narrow canvases (≤1080 wide: square/portrait)
// get a bottom card; wide canvases get a side column whose side is the step's `align`. `slide`
// runs 0 (below, entering) → 1 (pinned) → 2 (above, exited); opacity fades in over [0,0.35] and
// out over [1.65,2]; y travels upward as slide grows.
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function scrollyPanelLayout(input: {
  width: number;
  height: number;
  align?: "left" | "right" | "center";
  slide: number;
}): {
  side: "left" | "right" | "center" | "bottom";
  x: number;
  y: number;
  width: number;
  opacity: number;
} {
  const { width, height, slide } = input;
  const narrow = width <= 1080;
  const align = input.align ?? "center";
  const inset = Math.round(width * 0.04);

  // Opacity: in over [0,0.35], out over [1.65,2].
  const opacity =
    slide <= 1
      ? clamp01(slide / 0.35)
      : clamp01((2 - slide) / 0.35);

  // Reading-zone anchor (pinned position) and travel distance for the slide.
  const travel = Math.round(height * 0.12);

  if (narrow) {
    const panelWidth = Math.round(width * 0.84);
    const pinnedY = Math.round(height * 0.7);
    const y = Math.round(pinnedY + (1 - slide) * travel);
    return { side: "bottom", x: Math.round((width - panelWidth) / 2), y, width: panelWidth, opacity };
  }

  const panelWidth =
    align === "center" ? Math.round(width * 0.5) : Math.round(width * 0.33);
  let x: number;
  let side: "left" | "right" | "center";
  if (align === "left") {
    x = inset;
    side = "left";
  } else if (align === "right") {
    x = width - panelWidth - inset;
    side = "right";
  } else {
    x = Math.round((width - panelWidth) / 2);
    side = "center";
  }
  const pinnedY = Math.round(height * (align === "center" ? 0.62 : 0.4));
  const y = Math.round(pinnedY + (1 - slide) * travel);
  return { side, x, y, width: panelWidth, opacity };
}

export const ScrollyPanel: React.FC<{
  width: number;
  height: number;
  align?: "left" | "right" | "center";
  slide: number;
  prose: string;
  dark?: boolean;
}> = ({ width, height, align, slide, prose, dark }) => {
  const p = scrollyPanelLayout({ width, height, align, slide });
  if (p.opacity <= 0) return null;
  const bg = dark ? "rgba(18,18,20,0.82)" : "rgba(255,255,255,0.92)";
  const ink = dark ? "#f4f4f5" : "#1a1a1a";
  const narrow = width <= 1080;
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: p.width,
        background: bg,
        backdropFilter: "blur(6px)",
        borderRadius: 12,
        padding: narrow ? "20px 28px" : "22px 30px",
        opacity: p.opacity,
        pointerEvents: "none",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: ink,
          fontSize: narrow ? 30 : 26,
          fontWeight: 600,
          lineHeight: 1.35,
          letterSpacing: "0.01em",
        }}
      >
        {prose}
      </p>
    </div>
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/map-native && bun test tests/scrolly-panel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/components/ScrollyPanel.tsx skills/map-native/tests/scrolly-panel.test.ts
git commit -m "feat(map-native): ScrollyPanel — slide-animated prose panel + pure layout helper"
```

---

## Task 4: Choropleth + symbol scrolly (flyTo) — renderers, dispatcher, wiring, render-verify

**Files:**
- Create: `skills/map-native/src/components/ChoroplethScrolly.tsx`
- Create: `skills/map-native/src/components/SymbolScrolly.tsx`
- Create: `skills/map-native/src/components/MapScrolly.tsx`
- Modify: `skills/map-native/remotion/src/Root.tsx`
- Modify: `skills/map-native/scripts/produce.mjs`

**Interfaces:**
- Consumes: `ScrollyPanel` (Task 3), `scrollyFrames`/`scrollyStepCount` (Task 1), `mapStoryToChapters` (from `../../scrolly/src/chapters`), `deriveMapStory`/`deriveSymbolStory`, `buildTimeline`/`cameraForFrame` (`story-timeline`), `resolveScene`/`TITLE_SCENE_FRAMES` (`video-scene`), `TitleCard` (`StoryCards`), `MapFrame`/`resolveMapFrame`.
- Produces: `MapScrolly` React component (`{ config }`) that dispatches on `config.type`; `ChoroplethScrolly` and `SymbolScrolly` renderers.

**Shared step-slide helper** (used by all three renderers — define it inline at the top of
`ChoroplethScrolly.tsx` and export it so `SymbolScrolly`/`RouteScrolly` import it):

```tsx
import type { Phase } from "../story-timeline";
// Slide value in [0,2] for content step i (i ≥ 1; step 0 is the title scene, no panel).
// enter over the first ENTER_S of the hold, exit over the last EXIT_S before the next step.
export function stepSlide(
  frame: number,
  phases: Phase[],
  i: number,
  fps: number,
  totalFrames: number,
): number {
  const ENTER = Math.round(0.4 * fps);
  const EXIT = Math.round(0.4 * fps);
  const a = phases[i].startFrame;
  const pin = phases[i].startFrame + phases[i].moveFrames;
  const end = i + 1 < phases.length ? phases[i + 1].startFrame : totalFrames;
  const outStart = end - EXIT;
  if (frame <= pin) return Math.max(0, Math.min(1, (frame - a) / Math.max(1, pin - a)));
  if (frame >= outStart)
    return 1 + Math.max(0, Math.min(1, (frame - outStart) / Math.max(1, end - outStart)));
  return 1;
}
```

- [ ] **Step 1: Create `ChoroplethScrolly.tsx`**

Port the map init + per-frame block from `ChoroplethStory.tsx` (lines 87–395), keeping the map
setup, `enrichWorld`, `deriveMapStory`, `solutions`, and fill/stroke layers **unchanged**. Apply
exactly these deltas:

1. After building `beats`, also build the scrolly story and step timeline:
   ```tsx
   import { mapStoryToChapters } from "../../scrolly/src/chapters";
   import { scrollyFrames } from "../route-story";
   // ...inside load, after `const beats = deriveMapStory(...)`:
   const story = mapStoryToChapters(beats, {
     title: config.title ?? "",
     description: config.description,
     source: config.source,
     regionsWithData: layout.joined.filter((j) => j.value !== null).length,
   });
   // Step camera solutions: each step flies to its ref beat's camera.
   const stepKinds = story.steps.map((_, i) => (i === 0 ? "title" : "reveal"));
   const { phases } = buildTimeline(stepKinds, fps);
   const stepSolutions = story.steps.map((s) => solutions[s.ref as number]);
   ```
   Store `story`, `phases`, `stepSolutions` in `mapState` alongside the existing fields (extend
   the `MapStory` interface).

2. Replace the per-frame camera/overlay block: drive with `cameraForFrame(frame, phases, stepSolutions)`
   for camera + `fillReveal`; set `choropleth-fill` opacity exactly as `ChoroplethStory` does;
   use `story.steps[beatIndex].ref` as the beat index for `enrichWorld` highlight. Drop the
   `CountryLabel`/`CaptionCard` overlay computation.

3. Replace the JSX overlay section with the scrolly panels + title scene:
   ```tsx
   const total = scrollyFrames(mapState?.story.steps.length ?? 2, fps);
   const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });
   // ...
   return (
     <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
       <MapFrame /* same props as ChoroplethStory, furnitureOpacity={scene.furnitureOpacity} */>
         <div ref={ref} style={{ width, height, position: "absolute" }} />
       </MapFrame>
       {mapState &&
         mapState.story.steps.map((s, i) =>
           i === 0 ? null : (
             <ScrollyPanel
               key={s.id}
               width={width}
               height={height}
               align={s.align}
               slide={stepSlide(frame, mapState.phases, i, fps, total)}
               prose={s.prose}
             />
           ),
         )}
       {scene.titleOpacity > 0 && config.title && (
         <TitleCard
           text={config.title}
           description={config.description}
           opacity={scene.titleOpacity}
         />
       )}
     </AbsoluteFill>
   );
   ```

The title scene uses the fixed `TITLE_SCENE_FRAMES` end frame (step 0's hold = 2.5s = 75 frames
via `buildTimeline`, so this matches `phases[0]` end). Export `stepSlide` from this file.

- [ ] **Step 2: Create `SymbolScrolly.tsx`**

Port from `SymbolStory.tsx` the same way: keep its map init + circle/label layers + `deriveSymbolStory`
+ per-beat camera solutions unchanged; apply the identical three deltas as Step 1 (build `story`
via `mapStoryToChapters` with `regionsWithData: config.points.length`, drive on step phases,
render `ScrollyPanel` + `TitleCard`, import `stepSlide` from `./ChoroplethScrolly`). Drop the
symbol story's caption/callout overlays.

- [ ] **Step 3: Create `MapScrolly.tsx` dispatcher**

```tsx
import React from "react";
import { ChoroplethScrolly } from "./ChoroplethScrolly";
import { SymbolScrolly } from "./SymbolScrolly";
import { RouteScrolly } from "./RouteScrolly";

export const MapScrolly: React.FC<{ config: any }> = ({ config }) => {
  if (config?.type === "symbol") return <SymbolScrolly config={config} />;
  if (config?.type === "route") return <RouteScrolly config={config} />;
  return <ChoroplethScrolly config={config} />;
};
```

`RouteScrolly` lands in Task 5. To keep Task 4 compiling, create a minimal placeholder
`RouteScrolly.tsx` that renders an `AbsoluteFill` (Task 5 replaces it fully):

```tsx
import React from "react";
import { AbsoluteFill } from "remotion";
export const RouteScrolly: React.FC<{ config: any }> = () => <AbsoluteFill />;
```

- [ ] **Step 4: Register the compositions in `Root.tsx`**

Add imports and three compositions using `calculateMetadata` so duration follows the real props:

```tsx
import { MapScrolly } from "../../src/components/MapScrolly";
import { scrollyFrames, scrollyStepCount } from "../../src/route-story";

const scrollyMeta = ({ props }: { props: { config: any } }) => ({
  durationInFrames: scrollyFrames(scrollyStepCount(props.config, world as any), 30),
});
```

```tsx
<Composition
  id="MapScrolly"
  component={MapScrolly}
  fps={30}
  width={1280}
  height={720}
  defaultProps={choroplethDefaultProps}
  calculateMetadata={scrollyMeta}
/>
<Composition
  id="MapScrollySquare"
  component={MapScrolly}
  fps={30}
  width={1080}
  height={1080}
  defaultProps={choroplethDefaultProps}
  calculateMetadata={scrollyMeta}
/>
<Composition
  id="MapScrollyPortrait"
  component={MapScrolly}
  fps={30}
  width={1080}
  height={1350}
  defaultProps={choroplethDefaultProps}
  calculateMetadata={scrollyMeta}
/>
```

- [ ] **Step 5: Wire `produce.mjs`**

Add `scrolly` to the valid formats and dispatch it to the `MapScrolly` triple for all types.

Change the `VALID` set and usage line:
```js
const VALID = new Set(["static", "reveal", "story", "scrolly", "all"]);
```
```js
console.error("usage: produce.mjs <config.json> <outDir> <static|reveal|story|scrolly|all>");
```
Add a scrolly composition set and fold it into the `VIDEO_COMPS`/kinds logic:
```js
const SCROLLY_COMPS = [
  ["MapScrolly", "landscape"],
  ["MapScrollySquare", "square"],
  ["MapScrollyPortrait", "portrait"],
];
```
Extend `STILL_FRAME`:
```js
const STILL_FRAME = { reveal: 120, story: 140, scrolly: 140 };
```
Update the `kinds` computation to include `scrolly` (route gains it too; route still has no
reveal):
```js
const kinds = isRoute
  ? (format === "static" ? [] : format === "scrolly" ? ["scrolly"] : format === "all" ? ["story", "scrolly"] : ["story"])
  : (format === "all" ? ["reveal", "story", "scrolly"]
     : format === "reveal" ? ["reveal"]
     : format === "story" ? ["story"]
     : format === "scrolly" ? ["scrolly"]
     : []);
```
In the render loop, dispatch scrolly:
```js
const comps = kind === "story"
  ? storyComps(config, cameraMode)
  : kind === "scrolly"
    ? SCROLLY_COMPS
    : VIDEO_COMPS[kind];
```

- [ ] **Step 6: Typecheck + full test suite**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: no type errors; all existing + new tests pass.

- [ ] **Step 7: Render-verify choropleth + symbol (landscape/square/portrait)**

```bash
cd skills/map-native
for C in MapScrolly MapScrollySquare MapScrollyPortrait; do
  bunx remotion render remotion/src/index.ts $C /tmp/sp4/cho-$C.mp4 \
    --gl=angle --concurrency=1 --timeout=120000 \
    --props=assets/sample-data/choropleth.json
  bunx remotion render remotion/src/index.ts $C /tmp/sp4/sym-$C.mp4 \
    --gl=angle --concurrency=1 --timeout=120000 \
    --props=assets/sample-data/symbol.json
done
```
Expected: 6 MP4s render to completion (no delayRender timeout). Capture a mid still to confirm
the panel is pinned, the map framed the flyTo target, and the title scene played:
```bash
bunx remotion still remotion/src/index.ts MapScrolly /tmp/sp4/cho-mid.png \
  --frame=140 --gl=angle --props=assets/sample-data/choropleth.json
```
Expected: PNG shows the map + a pinned prose panel + MapFrame furniture (no full-screen title
card at frame 140).

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/src/components/ChoroplethScrolly.tsx \
  skills/map-native/src/components/SymbolScrolly.tsx \
  skills/map-native/src/components/MapScrolly.tsx \
  skills/map-native/src/components/RouteScrolly.tsx \
  skills/map-native/remotion/src/Root.tsx \
  skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): choropleth+symbol scrolly-video (flyTo) + MapScrolly dispatch + produce wiring"
```

---

## Task 5: Route scrolly (drawTo) — renderer + wiring + render-verify

**Files:**
- Modify (replace placeholder): `skills/map-native/src/components/RouteScrolly.tsx`

**Interfaces:**
- Consumes: `computeRouteReveal`/`resolveMapStyle`/`RouteConfig`/`RouteRevealLayout` (`route-geo`), `routeStoryToChapters`/`scrollyFrames` (`route-story`), `buildTimeline`/`cameraForFrame` (`story-timeline`), `stepSlide` (`./ChoroplethScrolly`), `ScrollyPanel`, `TitleCard`, `resolveScene`/`TITLE_SCENE_FRAMES`, `MapFrame`/`resolveMapFrame`, the `RouteReveal` draw-head helpers (`buildDraw`/`sliceBorder`/`clampBounds`/electric colour sets).
- Produces: `RouteScrolly` React component (`{ config: RouteConfig }`).

**Approach:** port `RouteReveal.tsx` and change the draw driver from a single continuous sweep to
a **per-step target**. Reuse its map init, electric line layers, per-territory fill/trail layers,
and camera-from-bounds unchanged. The deltas:

1. Build the story + step timeline from the layout:
   ```tsx
   const layout = computeRouteReveal(config, world);
   const story = routeStoryToChapters(layout, {
     title: config.title ?? "",
     description: config.description,
     source: config.source ?? { name: "", url: "" },
   });
   const stepKinds = story.steps.map((_, i) => (i === 0 ? "title" : "reveal"));
   const { phases, totalFrames } = buildTimeline(stepKinds, fps);
   ```
   `totalFrames` here equals `scrollyFrames(story.steps.length, fps)` — use `scrollyFrames` in
   Root's `calculateMetadata` (already wired in Task 4 via `scrollyStepCount`, which returns
   `territories.length + 1` for route).

2. Per frame, find the active step with `cameraForFrame(frame, phases, stepSolutions)` where
   `stepSolutions[i]` = camera fitted to the bounds of the route drawn through territory `i-1`'s
   `stop` ∪ territory `i-1` (for `i ≥ 1`), and the full route bounds for `i === 0`. Compute these
   solutions once at init via `m.cameraForBounds` (same pattern as `RouteReveal`, using
   `mapFrame.pad`).

3. **drawTo driver:** the route line is drawn up to the active step's territory `stop` fraction,
   animated across that step's move phase. Replace `RouteReveal`'s `reveal` computation with:
   ```tsx
   const active = cameraForFrame(frame, phases, stepSolutions).beatIndex; // step index
   // Target arc-length fraction for this step: 0 for the intro step, territory stop otherwise.
   const targetStop = active === 0 ? 0 : layout.territories[active - 1].stop;
   const prevStop = active <= 1 ? 0 : layout.territories[active - 2].stop;
   // Animate from prevStop → targetStop across the step's move phase.
   const ph = phases[active];
   const moveT = ph.moveFrames > 0
     ? Math.max(0, Math.min(1, (frame - ph.startFrame) / ph.moveFrames))
     : 1;
   const reveal = prevStop + (targetStop - prevStop) * easeInOutCubic(moveT);
   const riverDrawnKm = lineKm * reveal;
   (map.getSource("river") as any)?.setData(
     turf.lineSliceAlong(line, 0, Math.max(0.001, riverDrawnKm)),
   );
   ```
   Keep `RouteReveal`'s electric head + per-territory border/fill/label logic, but trigger each
   territory's border/fill/label off the step that reveals it (territory `active-1`) rather than
   the continuous `trigger(t)` clock: when `active` advances to territory `k`, draw territory
   `k`'s border/fill/label over the hold phase. Import `easeInOutCubic` from `../story-timeline`.

4. Replace the JSX overlays (`CountryLabel` stays for territory labels; drop nothing there) —
   add the scrolly panel + keep the title card:
   ```tsx
   {story.steps.map((s, i) =>
     i === 0 ? null : (
       <ScrollyPanel
         key={s.id}
         width={width}
         height={height}
         align={s.align}
         slide={stepSlide(frame, phases, i, fps, totalFrames)}
         prose={s.prose}
         dark={dark}
       />
     ),
   )}
   ```
   Keep the existing `TitleCard` block and `MapFrame` (with `dark`), and the projected
   `CountryLabel`s.

- [ ] **Step 1: Implement `RouteScrolly.tsx`** per the approach above (port + 4 deltas).

- [ ] **Step 2: Typecheck + tests**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: clean typecheck; all tests pass.

- [ ] **Step 3: Render-verify route (landscape/square/portrait), both map styles**

```bash
cd skills/map-native
for C in MapScrolly MapScrollySquare MapScrollyPortrait; do
  bunx remotion render remotion/src/index.ts $C /tmp/sp4/route-$C.mp4 \
    --gl=angle --concurrency=1 --timeout=120000 \
    --props=assets/sample-data/route.json
done
bunx remotion still remotion/src/index.ts MapScrolly /tmp/sp4/route-mid.png \
  --frame=180 --gl=angle --props=assets/sample-data/route.json
```
Expected: 3 MP4s complete; the mid still shows the route partially drawn up to a territory
`stop`, that territory filled + labelled, and a pinned prose panel. If the sample route's
`mapStyle` is dark, confirm the panel uses the dark variant (`dark` prop) and furniture is dark.

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/components/RouteScrolly.tsx
git commit -m "feat(map-native): route scrolly-video (drawTo) — step-paced draw-on + prose panel"
```

---

## Task 6: KB reference, SKILL.md, final matrix confirmation

**Files:**
- Create: `skills/map-native/knowledge/references/map/formats/video-scrolly.md`
- Modify: `skills/map-native/SKILL.md`

- [ ] **Step 1: Write the KB reference**

Create `skills/map-native/knowledge/references/map/formats/video-scrolly.md` (<500 lines,
structured synthesis) covering: what scrolly-video is (interactive scrolly captured as MP4, same
`ScrollyStory` content + scrolling panel + pinned map), when to choose it over the storytelling
guided-tour video (when the piece is scroll-native / the editorial voice is step-by-step captions
rather than cinematic), the 3 sizes and their panel treatment (side column landscape / bottom card
square+portrait), the per-type actions (`flyTo` for choropleth+symbol, `drawTo` for route), and
that it is frame-deterministic. Mirror the structure of the sibling `formats/video-storytelling.md`.
Credit conventions per the repo's KB (data-to-viz, FT visual-vocabulary) where relevant.

- [ ] **Step 2: Document the format in SKILL.md**

Add `scrolly` to the format matrix / produce usage description in `skills/map-native/SKILL.md`
wherever the `static | reveal | story | all` formats are listed, noting it covers all 3 types
and route gains it alongside `story`.

- [ ] **Step 3: Final full test suite**

Run: `cd skills/map-native && bun test`
Expected: all tests pass.

- [ ] **Step 4: Final render matrix confirmation (3 types × 3 sizes = 9)**

Confirm the full matrix renders end-to-end via produce for one config per type:
```bash
cd skills/map-native
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/sp4/prod-cho scrolly
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/sp4/prod-sym scrolly
bun scripts/produce.mjs assets/sample-data/route.json /tmp/sp4/prod-route scrolly
```
Expected: each run prints `PRODUCE_RESULT` with a `scrolly: { landscape, square, portrait }` block
and the 3 MP4s exist for each type.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/knowledge/references/map/formats/video-scrolly.md skills/map-native/SKILL.md
git commit -m "docs(map-native): KB + SKILL — scrolly-as-video format shipped"
```

---

## Self-Review

**Spec coverage:**
- Shared `ScrollyStory` content (choropleth/symbol via `mapStoryToChapters`; route via new
  `routeStoryToChapters`) → Task 1 + Tasks 4/5.
- Scrolling panel look (side column landscape / bottom card square+portrait, honors `align`) →
  Task 3 (`scrollyPanelLayout`) + Tasks 4/5 wiring.
- `flyTo` (choropleth+symbol) + `drawTo` (route) → Task 4 (flyTo) + Task 5 (drawTo).
- Reuse camera pipeline + draw-head + title scene → Tasks 4/5 (ports with precise deltas).
- New `scrolly` format across all 3 types; `all` includes scrolly; route gains scrolly →
  Task 4 Step 5 (produce).
- Conformance on the derived story → Task 2.
- 3 sizes → Root registrations (Task 4 Step 4) + render-verify (Tasks 4/5/6).
- KB + SKILL.md → Task 6.
- `validate-config.ts`: intentionally unchanged (documented deviation — steps are derived, so the
  contract is validated post-derivation by conformance, not on the raw config).

**Placeholder scan:** No "TBD"/"handle edge cases". The two component tasks (4/5) specify ports
from named source files with exact line ranges and enumerated deltas rather than repeating ~450
lines of faithful boilerplate — this is complete-by-reference to real in-repo code, not a vague
"similar to". The `RouteScrolly` placeholder in Task 4 Step 3 is explicitly a compile stub that
Task 5 replaces.

**Type consistency:** `routeStoryToChapters(layout, meta)`, `scrollyFrames(stepCount, fps)`,
`scrollyStepCount(config, world)`, `checkScrollyConformance({ story, territoryCount })`,
`scrollyPanelLayout({ width, height, align?, slide })`, `stepSlide(frame, phases, i, fps, total)`,
`MapScrolly({ config })` — names and signatures match across tasks. `ScrollyStep.ref` is the beat
index for `flyTo` and the territory index for `drawTo`, consistently. Composition ids
`MapScrolly` / `MapScrollySquare` / `MapScrollyPortrait` match between Root (Task 4) and produce
(Task 4) and the render-verify commands (Tasks 4/5/6).
