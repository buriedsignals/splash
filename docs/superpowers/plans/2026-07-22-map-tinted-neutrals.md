# Map Tinted-Neutral Furniture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give map-native frame furniture the same house-hue whisper chart furniture got in S3-slice-3b — tint the neutral `muted` toward the newsroom hue, byte-identical when no hue is set.

**Architecture:** `resolveFrameColors(themeBg?, houseHue?)` in `lib/core/theme.ts` tints its `muted` via the existing `tintNeutral` (OKLCH chroma 0.03, lightness preserved), mirroring `deriveFurniture` exactly. `MapFrame` + its three sibling `resolveFrameColors` consumers gain a `houseHue?` prop; all 43 render/call-sites pass `config.brandHue ?? config.brandPalette?.[0]` — one uniform expression, no per-type branching. A drift-guard source-scan test locks completeness.

**Tech Stack:** Bun, TypeScript, bun:test, React/Remotion components.

## Global Constraints

- Runtime **Bun** only — never npm/node. Tests `bun:test`. TDD (failing test first).
- Code, comments, identifiers, commit messages, branch names: **English**.
- **No Claude/Anthropic/Co-Authored-By/Claude-Session mention** in any commit or artifact — plain subject line only.
- **Byte-identity invariant:** with no `houseHue` (undefined / non-`#rrggbb`), every furniture colour is identical to today, on BOTH the light-default and dark-preset paths. This is the review's first check.
- Tint knob is fixed at the existing `TINT_CHROMA = 0.03` — do NOT introduce a new constant.
- Only `muted` tints. `pill`, `ink`, basemap, marks, and the ramp are untouched.
- `map-dw` (Datawrapper) is out of scope.
- Independent test oracles (audit T1): assert against literal expected values / an independent OKLCH computation, never against the function-under-test re-called with the same args.

---

### Task 1: `resolveFrameColors` tints `muted` toward the house hue

**Files:**
- Modify: `lib/core/theme.ts:183-200` (`resolveFrameColors`)
- Test: `lib/core/theme.test.ts`

**Interfaces:**
- Consumes (already in `lib/core/theme.ts`): `tintNeutral(greyHex: string, houseHue: string, chroma?: number): string`; `FRAME_COLORS: FrameColors = {pill:"rgba(255,255,255,0.92)", ink:"#1a1a1a", muted:"#5f5f5f"}`; `FrameColors` interface `{pill, ink, muted}`; `resolveThemeBg`, `contrastRatio`, `_rgb`, `_mix`, `DARK_FRAME_BG`.
- Consumes (from `lib/core/house-ramp.ts`, for the test oracle only): `hexToOklch(hex: string): {L:number; C:number; h:number}`.
- Produces: `resolveFrameColors(themeBg?: string, houseHue?: string): FrameColors` — same shape, `muted` tinted when `houseHue` is a `#rrggbb`.

- [ ] **Step 1: Write the failing tests**

Add to `lib/core/theme.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { resolveFrameColors, FRAME_COLORS, FRAME_COLORS_DARK, DARK_FRAME_BG } from "./theme";
import { hexToOklch } from "./house-ramp";

describe("resolveFrameColors house-hue tint", () => {
  const HUE = "#2E7D57"; // a green house hue

  it("is byte-identical to FRAME_COLORS on the light default with no house hue", () => {
    expect(resolveFrameColors()).toEqual(FRAME_COLORS);
    expect(resolveFrameColors(undefined, undefined)).toEqual(FRAME_COLORS);
  });

  it("is byte-identical to the dark preset with no house hue", () => {
    expect(resolveFrameColors(DARK_FRAME_BG)).toEqual(FRAME_COLORS_DARK);
  });

  it("ignores a non-#rrggbb house hue (byte-identical)", () => {
    expect(resolveFrameColors(undefined, "purples")).toEqual(FRAME_COLORS);
  });

  it("tints muted toward the house hue on the light default, leaving pill and ink untouched", () => {
    const tinted = resolveFrameColors(undefined, HUE);
    expect(tinted.pill).toBe(FRAME_COLORS.pill);
    expect(tinted.ink).toBe(FRAME_COLORS.ink);
    expect(tinted.muted).not.toBe(FRAME_COLORS.muted);
  });

  it("tints muted on a derived ground too (dark preset), pill and ink unchanged", () => {
    const tinted = resolveFrameColors(DARK_FRAME_BG, HUE);
    expect(tinted.pill).toBe(FRAME_COLORS_DARK.pill);
    expect(tinted.ink).toBe(FRAME_COLORS_DARK.ink);
    expect(tinted.muted).not.toBe(FRAME_COLORS_DARK.muted);
  });

  it("preserves the muted OKLCH lightness (contrast-preservation oracle)", () => {
    for (const bg of [undefined, DARK_FRAME_BG]) {
      const base = resolveFrameColors(bg);
      const tinted = resolveFrameColors(bg, HUE);
      // independent oracle: tint re-hues at constant L, so L is unchanged within rounding
      expect(hexToOklch(tinted.muted).L).toBeCloseTo(hexToOklch(base.muted).L, 2);
    }
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/theme.test.ts`
Expected: the new tests FAIL — `resolveFrameColors` currently ignores the second arg, so tinted `muted` equals base `muted`.

- [ ] **Step 3: Implement the tint**

In `lib/core/theme.ts`, change the signature and body of `resolveFrameColors` (currently lines 183-200) to:

```ts
export function resolveFrameColors(themeBg?: string, houseHue?: string): FrameColors {
  const tint = houseHue !== undefined && /^#[0-9a-f]{6}$/i.test(houseHue.trim());
  const bg = resolveThemeBg(themeBg);
  if (!bg) {
    // light default — legacy tokens, byte-identical WITHOUT a house hue; tinted muted WITH one
    if (!tint) return FRAME_COLORS;
    return { ...FRAME_COLORS, muted: tintNeutral(FRAME_COLORS.muted, houseHue!) };
  }
  const softDark = contrastRatio("#1a1a1a", bg) >= contrastRatio("#f4f4f5", bg);
  let ink = softDark ? "#1a1a1a" : "#f4f4f5";
  if (contrastRatio(ink, bg) < 4.5) ink = softDark ? "#000000" : "#ffffff";
  const [r, g, b] = _rgb(bg);
  let muted = _mix(ink, bg, 0.22);
  if (tint) muted = tintNeutral(muted, houseHue!);
  return { pill: `rgba(${r},${g},${b},0.82)`, ink, muted };
}
```

(Preserve the existing explanatory comment block above the function.)

- [ ] **Step 4: Run the tests, verify they pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/theme.test.ts`
Expected: PASS, including the pre-existing theme tests (byte-identity of the no-hue path guarantees no regression).

- [ ] **Step 5: Add the WCAG contrast-floor sweep**

Add to the same `describe` block:

```ts
import { contrastRatio } from "./contrast";

it("muted clears its WCAG floor on every ground for representative house hues", () => {
  const hues = ["#2E7D57", "#B4232A", "#1F4FA2", "#7A1FA2", "#C98A00", "#008080"];
  const grounds: (string | undefined)[] = [undefined, DARK_FRAME_BG, "#2B2B2B", "#EDEDED"];
  for (const hue of hues) {
    for (const g of grounds) {
      const fc = resolveFrameColors(g, hue);
      const ground = g && /^#[0-9a-f]{6}$/i.test(g) ? g : fc.pill.startsWith("rgba(255") ? "#ffffff" : "#18181b";
      expect(contrastRatio(fc.muted, ground)).toBeGreaterThanOrEqual(4.5);
    }
  }
});
```

If `contrastRatio` is already imported in the file, don't duplicate the import.

- [ ] **Step 6: Run tests, verify pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/theme.test.ts`
Expected: PASS. If any hue×ground fails the 4.5:1 floor, STOP and report the exact pair — do not weaken the assertion.

- [ ] **Step 7: Commit**

```bash
git add lib/core/theme.ts lib/core/theme.test.ts
git commit -m "feat(core): resolveFrameColors tints muted toward the house hue (map furniture)"
```

---

### Task 2: Thread `houseHue` through MapFrame and its three sibling consumers

**Files:**
- Modify: `skills/map-native/src/core/MapFrame.tsx` (`MapFrameProps` line 17-33, `resolveFrameColors` call line 86)
- Modify: `skills/map-native/src/core/MapFilterBar.tsx` (`MapFilterBarProps` line 10-16, `resolveFrameColors` call line 31)
- Modify: `skills/map-native/src/theme/legend-theme.ts` (`legendTheme` line 26, `resolveFrameColors` call line 28)
- Modify: `skills/map-native/src/core/map-produce-conformance.ts` (furniture check line ~152)
- Test: `skills/map-native/src/core/map-produce-conformance.test.ts` (or the nearest existing map-native furniture test — locate with `ls skills/map-native/src/**/*.test.ts`)

**Interfaces:**
- Consumes: `resolveFrameColors(themeBg?: string, houseHue?: string): FrameColors` (Task 1).
- Produces:
  - `MapFrameProps.houseHue?: string`
  - `MapFilterBarProps.houseHue?: string`
  - `legendTheme(dark: boolean, themeBg?: string, houseHue?: string): LegendTheme`
  - `map-produce-conformance` resolves `houseHue = config.brandHue ?? config.brandPalette?.[0]` and validates the tinted `muted`.

- [ ] **Step 1: Write the failing conformance-honesty test**

Add to the map-native conformance test file:

```ts
import { tintNeutral } from "../../../../lib/core/theme"; // adjust relative depth to lib/core/theme
```

Then a test that the furniture guard evaluates the TINTED muted when `config.brandHue` is set. Model it on an existing conformance test in the file (copy the config-object shape used there — do not invent fields). The assertion: run the furniture-conformance path with a config carrying `brandHue: "#2E7D57"` and assert the `muted` it validates equals `tintNeutral(<the untinted muted for that ground>, "#2E7D57")`, not the dead grey. If the guard doesn't expose its evaluated `muted`, assert instead that a `config.brandHue` whose tinted muted would fail contrast (there is none that both tints and fails, since L is preserved) — SKIP that variant and rely on the equality assertion by importing the guard's furniture helper directly. Locate the exact furniture helper (`resolveFrameColors` call at `map-produce-conformance.ts:152`) and assert it now receives the house hue.

Concretely, the minimal honest test:

```ts
it("furniture conformance validates the tinted muted, not the dead grey", () => {
  const config = { /* copy a passing map config from a sibling test */, brandHue: "#2E7D57" };
  const grey = resolveFrameColors(furnitureBgFor(config)).muted;      // untinted
  const tinted = resolveFrameColors(furnitureBgFor(config), "#2E7D57").muted;
  expect(tinted).not.toBe(grey);
  // the guard must now see `tinted` — assert via the guard's public result or a spy on resolveFrameColors
});
```

If the guard has no public seam to observe its `muted`, add a narrow exported helper `furnitureColorsFor(config): FrameColors` in `map-produce-conformance.ts` that returns `resolveFrameColors(furnitureBg, config.brandHue ?? config.brandPalette?.[0])`, have the guard use it, and assert on it directly.

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/map-native/src/core/map-produce-conformance.test.ts`
Expected: FAIL — the guard currently calls `resolveFrameColors(furnitureBg)` with no hue, so it validates the dead grey.

- [ ] **Step 3: Add `houseHue` to `MapFrameProps` and thread it**

In `skills/map-native/src/core/MapFrame.tsx`: add `houseHue?: string;` to `MapFrameProps` (next to `themeBg?: string;` at line 33), destructure `houseHue` in the component params (next to `themeBg,` at line 52), and change the call at line 86:

```tsx
const colors = resolveFrameColors(furnitureBg, houseHue);
```

- [ ] **Step 4: Add `houseHue` to `MapFilterBarProps` and thread it**

In `skills/map-native/src/core/MapFilterBar.tsx`: add `houseHue?: string;` to `MapFilterBarProps`, destructure it, and change the call at line 31-32:

```tsx
const colors = resolveFrameColors(
  themeBg ?? (dark ? DARK_FRAME_BG : undefined),
  houseHue,
);
```

- [ ] **Step 5: Add `houseHue` to `legendTheme` and thread it**

In `skills/map-native/src/theme/legend-theme.ts`: change the signature to `legendTheme(dark: boolean, themeBg?: string, houseHue?: string)` and the call at line 28 to `resolveFrameColors(themeBg, houseHue)`. Check `skills/map-native/src/theme/map-tokens.ts:16,24` re-exports `resolveFrameColors` with the new 2-arg signature — TS will surface any mismatch.

- [ ] **Step 6: Thread `houseHue` in `map-produce-conformance.ts`**

At the furniture check (line ~152), resolve and pass the hue:

```ts
const houseHue =
  typeof config.brandHue === "string" ? config.brandHue
  : Array.isArray(config.brandPalette) && typeof config.brandPalette[0] === "string" ? config.brandPalette[0]
  : undefined;
const fc = resolveFrameColors(furnitureBg, houseHue);
```

(If you added the `furnitureColorsFor` helper in Step 1, use it here instead so the test and the guard share one code path.)

- [ ] **Step 7: Run the tests, verify pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/map-native/src/core/map-produce-conformance.test.ts`
Expected: PASS. Then `bun test skills/map-native` to confirm no furniture/legend regression (byte-identity holds for every existing test — none set `brandHue` on the furniture path).

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/src/core/MapFrame.tsx skills/map-native/src/core/MapFilterBar.tsx skills/map-native/src/theme/legend-theme.ts skills/map-native/src/core/map-produce-conformance.ts skills/map-native/src/core/map-produce-conformance.test.ts
git commit -m "feat(map-native): thread houseHue through MapFrame + filter bar + legend + conformance"
```

---

### Task 3: Fan-out — every render/call-site passes the house hue + drift guard

**Files (all Modify):**
- 27 `<MapFrame>` sites:
  - Top-level: `skills/map-native/src/{CartogramMap,ChoroplethMap,DotDensityMap,HexGridMap,LocatorMap,RouteMap,SymbolMap}.tsx`
  - Components: `skills/map-native/src/components/{Cartogram,Choropleth,DotDensity,HexGrid,Locator,Symbol}{Reveal,Story,Scrolly}.tsx` and `{Route}{Reveal,Scrolly}.tsx` (Route has no Story)
- 10 `legendTheme(` call-sites: the 7 top-level Maps + `skills/map-native/src/components/Choropleth{Reveal,Story,Scrolly}.tsx`
- 6 `<MapFilterBar>` sites: `skills/map-native/src/{Cartogram,Choropleth,DotDensity,HexGrid,Locator,Symbol}Map.tsx`
- Create (drift guard): `skills/map-native/src/core/frame-house-hue-parity.test.ts`

**Interfaces:**
- Consumes: `MapFrameProps.houseHue?`, `MapFilterBarProps.houseHue?`, `legendTheme(dark, themeBg?, houseHue?)` (Task 2).
- The uniform hue expression at every site: `config.brandHue ?? config.brandPalette?.[0]`. Every site already has `config` in scope. (Type note: `config.brandHue`/`config.brandPalette` may not be on every component's config type — if TS errors that a field is absent, widen that component's config type to include `brandHue?: string; brandPalette?: string[];`, mirroring the geo-layer types that already declare them.)

- [ ] **Step 1: Write the failing drift-guard test**

Create `skills/map-native/src/core/frame-house-hue-parity.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Every place that renders <MapFrame> or <MapFilterBar>, or calls legendTheme(), must forward the
// newsroom house hue so map furniture tints in lockstep with chart furniture (S3). This guard fails
// loud when a new render-site forgets the hue — the fan-out completeness lock.
const SRC = join(import.meta.dir, "..");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith(".tsx") || e.name.endsWith(".ts") ? [p] : [];
  });
}

describe("map furniture house-hue parity", () => {
  const files = walk(SRC).filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));

  it("every <MapFrame> render-site forwards houseHue", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // for each JSX <MapFrame ...> opening tag, require a houseHue= prop before its close
      const tags = src.split("<MapFrame").slice(1);
      for (const seg of tags) {
        const open = seg.slice(0, seg.indexOf("/>") >= 0 ? seg.indexOf("/>") : seg.indexOf(">"));
        if (!/houseHue=/.test(open)) missing.push(f);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every <MapFilterBar> render-site forwards houseHue", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const tags = src.split("<MapFilterBar").slice(1);
      for (const seg of tags) {
        const open = seg.slice(0, seg.indexOf("/>") >= 0 ? seg.indexOf("/>") : seg.indexOf(">"));
        if (!/houseHue=/.test(open)) missing.push(f);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every legendTheme() call passes a third argument", () => {
    const missing: string[] = [];
    for (const f of files) {
      if (f.endsWith("legend-theme.ts")) continue; // the definition
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/legendTheme\(([^)]*)\)/g)) {
        const args = m[1].split(",");
        if (args.length < 3) missing.push(`${f}: legendTheme(${m[1]})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the guard, verify it fails listing the sites**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/map-native/src/core/frame-house-hue-parity.test.ts`
Expected: FAIL — the three `missing` arrays list every un-threaded site (27 MapFrame, 6 MapFilterBar, 10 legendTheme).

- [ ] **Step 3: Thread the hue at every `<MapFrame>` site**

For each of the 27 files, add `houseHue={config.brandHue ?? config.brandPalette?.[0]}` to the `<MapFrame ...>` props (next to the existing `themeBg`/`lang` props). If a file has more than one `<MapFrame>`, thread all of them. If TS reports `config.brandHue`/`config.brandPalette` is not on the config type, add `brandHue?: string; brandPalette?: string[];` to that component's local config interface.

- [ ] **Step 4: Thread the hue at every `<MapFilterBar>` site (6 top-level Maps)**

Add `houseHue={config.brandHue ?? config.brandPalette?.[0]}` to each `<MapFilterBar ...>`.

- [ ] **Step 5: Thread the hue at every `legendTheme()` call (10 sites)**

Change each `legendTheme(dark, themeBg)` (or `legendTheme(dark)`) call to `legendTheme(dark, themeBg, config.brandHue ?? config.brandPalette?.[0])`. Preserve whatever the site currently passes as the `themeBg` 2nd arg — pass `undefined` explicitly only if the site passes nothing today.

- [ ] **Step 6: Run the drift guard + typecheck, verify green**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/map-native/src/core/frame-house-hue-parity.test.ts`
Expected: PASS (all three `missing` arrays empty).
Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bunx tsc --noEmit -p skills/map-native/tsconfig.json` (or the project's map-native typecheck — check `package.json` scripts; use the same one `bun run check` invokes for map-native).
Expected: no type errors.

- [ ] **Step 7: Run the map-native suite, verify no regression**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/map-native`
Expected: PASS — no existing test sets `brandHue`, so furniture stays byte-identical for all of them.

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/src/
git commit -m "feat(map-native): fan out houseHue to all 43 furniture render/call-sites + drift guard"
```

---

### Task 4: Render-proof acceptance

**Files:** none (produces artifacts under a scratch dir; no source change unless the proof reveals a bug).

**Interfaces:** consumes the full pipeline from Tasks 1-3.

- [ ] **Step 1: Render a choropleth and a symbol map with a house hue, plus a chart from the same profile**

Use the existing map-native render path (the same one the map render-proofs used in prior sessions — check `skills/map-native/package.json` scripts and prior CHANGELOG entries for the exact command; typically a `produce`/`render-main` script with a config carrying `brandHue: "#2E7D57"`). Render:
- a choropleth static PNG with `brandHue: "#2E7D57"`,
- a symbol static PNG with `brandHue: "#2E7D57"`,
- one chart (e.g. a lollipop or bar) with the same `baseColor: "#2E7D57"` for side-by-side comparison.

Write outputs to the scratchpad dir.

- [ ] **Step 2: Judge the proof side-by-side**

Open the three PNGs. Confirm (maintainer judgment): the map legend sub-text / pill body text carries the same faint green cast as the chart's tinted furniture (axis/muted). Confirm the map marks, basemap, `ink`, and `pill` are unchanged from their pre-slice appearance.

- [ ] **Step 3: Confirm the no-hue byte-identity at the render level**

Render the SAME choropleth with NO `brandHue`. Confirm its furniture is the pre-slice grey (visually indistinguishable from `main`). This is the render-level echo of the Task 1 byte-identity unit test.

- [ ] **Step 4: Record the proof**

Note the artifact paths and the side-by-side verdict in the task report. No commit (artifacts are scratch). If Step 2 or 3 reveals a discrepancy, STOP and report — it means a render-site was missed (Task 3 guard gap) or the tint is mis-wired.

---

## Notes for the executor

- After all tasks: run the full gate `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check` (22 checks). The map-native interactive/video produce and map-dw e2e can flake under network contention — confirm any failure reproduces in isolation before treating it as real (per CLAUDE.md).
- Final whole-branch review on the most capable model, then `superpowers:finishing-a-development-branch`.
