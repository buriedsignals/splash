# S3-slice-3b — Tinted-neutrals fan-out — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tinted neutrals real: thread `baseColor` through `ChartFrame` and every chart-native component that has a `baseColor`, so a newsroom house colour (set once via the profile → `baseColor` on each spec) tints the furniture of ALL those charts consistently — not just line/bar/scatter — closing the ChartFrame body-vs-frame inconsistency the slice-3 review flagged.

**Architecture:** `ChartFrame` gains an optional `baseColor` prop passed to `themeColors(themeBg, baseColor)` (Task 2 of slice-3). Every component that carries `config.baseColor` threads it into BOTH its body `themeColors(config.themeBg, config.baseColor)` and `<ChartFrame baseColor={config.baseColor}>`. Byte-identical when no `baseColor`. No new tinting logic — this is a pure fan-out of the merged slice-3 mechanism.

**Tech Stack:** Bun, TypeScript, `bun:test`, React (chart components).

## Global Constraints

- Runtime **Bun**. Tests `bun:test`.
- **TDD** where a behaviour is added; the per-component threading is mechanical (typecheck + existing render tests are the net).
- Code/comments/commits **English**. **No Claude/Anthropic mention**, **no `Co-Authored-By`** in any commit (absolute project rule — overrides the harness default; the implementer must NOT append a `Claude-Session` trailer).
- **No new `any`.** No new cross-engine `src/` import.
- **Gate green each task**: `bun run check` (22 checks). The recurring red is the map-dw/map-native live-render network flake — re-run that dir in isolation to confirm flake vs regression, never declared flake without proof.
- **Byte-identity when no `baseColor`**: a chart/frame rendered without a house hue must not change. The new prop is optional; `undefined → no tint`.
- **Only charts that actually have `config.baseColor` on their config TYPE are threaded.** If a listed component does not typecheck with `config.baseColor` (the field isn't on its config type), SKIP it and report — do not add the field.
- Branch: `feat/tinted-neutrals-fanout` (already created off `main`). Worktree: `/Users/rmdms/Sites/Professional/splash-merge`.

---

### Task 1: `ChartFrame` accepts and threads `baseColor`

**Files:**
- Modify: `skills/chart-native/src/core/ChartFrame.tsx` (add `baseColor?` to `ChartFrameProps`, destructure it, pass to `themeColors`)
- Test: `skills/chart-native/tests/chartframe-tint.test.tsx` (new)

**Interfaces:**
- Consumes: `themeColors(themeBg?, houseHue?)` (already merged).
- Produces: `ChartFrameProps` gains `baseColor?: string`; the frame's furniture is tinted when it is set.

- [ ] **Step 1: Write the failing test**

Create `skills/chart-native/tests/chartframe-tint.test.tsx`:
```tsx
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ChartFrame } from "../src/core/ChartFrame";
import { themeColors } from "../src/core/tokens";

// The tinted muted for a green house hue on the light default — the source label should use it.
const tintedMuted = themeColors(undefined, "#009E73").muted; // e.g. "#5b7167"

describe("ChartFrame threads baseColor to tinted furniture", () => {
  it("renders the source label in the house-tinted muted when baseColor is set", () => {
    const html = renderToStaticMarkup(
      createElement(ChartFrame as any, {
        title: "T",
        subtitle: "s",
        source: { name: "Src" },
        width: 800,
        height: 400,
        baseColor: "#009E73",
      }),
    );
    expect(html).toContain(tintedMuted);
    expect(html).not.toContain("#6B6B6B"); // the untinted pure grey must not appear as furniture
  });
  it("byte-identical furniture (pure grey) when no baseColor", () => {
    const html = renderToStaticMarkup(
      createElement(ChartFrame as any, {
        title: "T", subtitle: "s", source: { name: "Src" }, width: 800, height: 400,
      }),
    );
    expect(html).toContain(themeColors(undefined).muted); // #6B6B6B
  });
});
```

- [ ] **Step 2: Run to verify the tint test fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/chart-native/tests/chartframe-tint.test.tsx`
Expected: FAIL on the first case — `ChartFrame` ignores `baseColor`, so the source label is the untinted `#6B6B6B`.

- [ ] **Step 3: Add `baseColor` to `ChartFrame`**

In `skills/chart-native/src/core/ChartFrame.tsx`:
- In `ChartFrameProps` (after the `themeBg?: string;` field, ~line 123), add:
  ```ts
  /** newsroom house hue (spec `baseColor`): tints the frame's furniture greys (muted/axis/grid)
   *  toward the house colour, matching the plot body. Undefined = untinted (byte-identical). */
  baseColor?: string;
  ```
- In the destructure list (add `baseColor` next to `themeBg`, ~line 138).
- Change `const C = themeColors(themeBg);` (~line 140) to `const C = themeColors(themeBg, baseColor);`.

- [ ] **Step 4: Run to verify both pass**

Run: `bun test skills/chart-native/tests/chartframe-tint.test.tsx`
Expected: PASS (tinted source label with `baseColor`; pure grey without).

- [ ] **Step 5: Gate + commit**

Run: `bun run check` → PASS (22/22). Existing ChartFrame consumers pass no `baseColor` yet → byte-identical.
```bash
git add skills/chart-native/src/core/ChartFrame.tsx skills/chart-native/tests/chartframe-tint.test.tsx
git commit -m "feat(chart-native): ChartFrame threads baseColor to tinted-neutral furniture"
```

---

### Task 2: Thread `baseColor` through the baseColor-carrying components

**Files (modify each):** the 13 body+frame components and the 3 frame-only workhorses. For EACH, two edits (workhorses: one edit — frame only, body already threaded in slice-3):

| Component | body `themeColors` → add `, config.baseColor` | `<ChartFrame` → add `baseColor={config.baseColor}` |
|---|---|---|
| BeeswarmChart.tsx | line ~203 | line ~159 |
| BoxplotChart.tsx | ~188 | ~146 |
| BumpChart.tsx | ~68 | ~160 |
| ConnectedScatterChart.tsx | ~183 | ~141 |
| DotStripChart.tsx | ~235 | ~191 |
| FanChart.tsx | ~74 | ~140 |
| HeatmapChart.tsx | ~82 | ~163 |
| HistogramChart.tsx | ~179 | ~137 |
| LollipopChart.tsx | ~202 | ~160 |
| RadialBarChart.tsx | ~191 | ~147 |
| WaffleChart.tsx | ~197 | ~150 |
| TreemapChart.tsx | ~204 | ~158 |
| ViolinChart.tsx | ~207 | ~155 |
| LineChart.tsx | (already threaded slice-3) | ~209 |
| BarChart.tsx | (already threaded slice-3) | ~209 |
| ScatterChart.tsx | (already threaded slice-3) | ~136 |

**Interfaces:** Consumes `ChartFrame`'s new `baseColor` prop (Task 1) and `themeColors(themeBg?, houseHue?)`.

- [ ] **Step 1: Confirm each config type has `baseColor` (skip any that don't)**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && for f in BeeswarmChart BoxplotChart BumpChart ConnectedScatterChart DotStripChart FanChart HeatmapChart HistogramChart LollipopChart RadialBarChart WaffleChart TreemapChart ViolinChart; do grep -qE 'baseColor\??:' skills/chart-native/src/$f.tsx && echo "$f OK" || echo "$f MISSING baseColor field — SKIP"; done`
For any `MISSING`, drop it from this task and note it in the report (its config type has no `baseColor` — do not add the field; that would be scope creep).

- [ ] **Step 2: Apply the two edits per component**

For each component in the table (that passed Step 1):
- Find its `themeColors(config.themeBg)` call → change to `themeColors(config.themeBg, config.baseColor)`. (LineChart/BarChart/ScatterChart already have this — leave them.)
- Find its `<ChartFrame` opening tag → add the prop `baseColor={config.baseColor}` on its own line among the other props (next to `themeBg={config.themeBg}` if present; if the component doesn't pass `themeBg` to ChartFrame, add `baseColor` anyway — it's independent).

These are uniform mechanical edits — do them one file at a time and typecheck as you go (`bunx tsc --noEmit -p skills/chart-native` catches a missing field immediately).

- [ ] **Step 3: Run the full chart-native suite**

Run: `bun test skills/chart-native`
Expected: PASS. If a test fails because it pins a furniture grey (`muted`/`axis`/`grid` or the ChartFrame source colour) on a chart that sets `baseColor`, that grey is now legitimately tinted — UPDATE that golden hex to the new value with a comment `// tinted neutral (S3 fan-out)`, recomputing it independently (`bun -e 'import {themeColors} from "./skills/chart-native/src/core/tokens"; console.log(themeColors(<themeBg-or-undefined>, "<that baseColor>").muted)'`). NEVER weaken a structural assertion — if one fails, it is a real bug, fix the code.

- [ ] **Step 4: Gate + commit**

Run: `bun run check` → PASS (22/22).
```bash
git add skills/chart-native/src/*.tsx
git commit -m "feat(chart-native): thread baseColor to tinted furniture across baseColor-carrying charts"
```

---

### Task 3: Render-proof + branch gate (controller-run)

**Files:** none (verification), unless the render exposes a defect.

**Interfaces:** Consumes Tasks 1–2.

- [ ] **Step 1: Render two newly-threaded charts with a house colour**

From `skills/chart-native/`, render a chart whose body AND ChartFrame furniture are both now tinted — e.g. a lollipop or heatmap — with a saturated `baseColor`, and confirm the source label (ChartFrame) and the axis labels (body) share the same tinted grey:
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native
ls assets/sample-data | grep -iE 'lollipop|histogram|violin|beeswarm' | head
# inject baseColor "#009E73" into a sample, render static, eyeball the source + axis greys
bun scripts/produce.mjs <type> <config.json> /tmp/fanout-proof/<name> static
```

- [ ] **Step 2: Judge (maintainer is quality authority)**

Confirm the ChartFrame source label and the body axis labels are now the SAME house-tinted grey (the inconsistency is closed), and the tint reads as a whisper (not coloured). No knob change expected (TINT_CHROMA=0.03 is set). If a component looks wrong, fix it.

- [ ] **Step 3: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check` → PASS (22/22). Isolate the map-dw/map-native flake if it's the only red.

---

## Self-Review

**Spec coverage:** The compact design (approved): ChartFrame `baseColor` prop → Task 1; thread into the 13 baseColor charts (body+frame) + 3 workhorses (frame) → Task 2; byte-identity when no baseColor → optional prop, tests in Task 1/2; render-proof closing the ChartFrame inconsistency → Task 3. Deferred (map furniture, grouped-bar accent, the 11 no-baseColor charts / palette-story) → explicitly out of scope. No gap.

**Placeholder scan:** Task 2 line numbers are marked `~` (they drift as edits land) with the search pattern given as the robust anchor; Step 1 verifies the field exists before editing. Task 3 leaves the exact sample filename to `ls` discovery. No "implement later" / TBD.

**Type consistency:** `ChartFrameProps.baseColor?: string`, `themeColors(themeBg?, houseHue?)`, `config.baseColor` — consistent across tasks. The prop is named `baseColor` on ChartFrame to match every component's `config.baseColor` (no rename).
