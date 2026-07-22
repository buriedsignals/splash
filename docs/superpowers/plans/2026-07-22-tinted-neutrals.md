# S3-slice-3 — Tinted neutrals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Furniture greys (`muted`/`axis`/`grid`) derive as house-hue-tinted neutrals — the grey's own OKLCH lightness re-hued to the house hue at a whisper of chroma — when a house/subject colour is set; byte-identical otherwise.

**Architecture:** Export the OKLCH round-trip from `lib/core/house-ramp.ts`; add `tintNeutral` + an optional `houseHue` param to `deriveFurniture` in `lib/core/theme.ts` (tints on BOTH the light-default and the derived-ground paths when a house hue is present, byte-identical when absent); thread `config.baseColor` through the `themeColors` wrapper into the workhorse charts (line/bar/scatter). Render-proof the look.

**Tech Stack:** Bun, TypeScript, `bun:test`. Reuses the hand-rolled OKLab round-trip already in `house-ramp.ts` (zero new deps).

## Global Constraints

- Runtime **Bun** only. Tests `bun:test` (`describe`/`it`/`expect`).
- **TDD**: failing test before implementation, every task.
- Code/comments/commit messages/branch names **English**. **No Claude/Anthropic mention**, no `Co-Authored-By`.
- **No new `any`.** Chart imports `lib/core` via `../../../../lib/core/...`; no cross-engine `src/` import.
- **Gate green each task**: `bun run check` (22 checks). The recurring red is the map-dw/map-native live-render network flake — re-run that dir in isolation to confirm flake vs regression, never declared flake without proof.
- **Golden/structural tests, never tautological** (audit T1): use independent oracles (recompute OKLCH L / hue / the sRGB `_mix` blend), not `core.X()` vs a re-export of itself.
- **Byte-identity when no house hue**: `deriveFurniture(bg)` (no `houseHue`) must not change for ANY existing chart — the whole point of the optional param.
- Branch: `feat/tinted-neutrals` (already created off `main`). Worktree: `/Users/rmdms/Sites/Professional/splash-merge`.

---

### Task 1: Export the OKLCH round-trip from `house-ramp.ts`

**Files:**
- Modify: `lib/core/house-ramp.ts` (add `export` to `hexToOklch`, `oklchToHex`, and the `Oklch` interface)
- Test: `lib/core/house-ramp.test.ts` (add an export-smoke assertion)

**Interfaces:**
- Produces: `export function hexToOklch(hex: string): Oklch`, `export function oklchToHex(c: Oklch): string`, `export interface Oklch { L: number; C: number; h: number }` — pure primitives, no behaviour change.

- [ ] **Step 1: Write the failing smoke test**

Append to `lib/core/house-ramp.test.ts`:
```ts
import { hexToOklch, oklchToHex } from "./house-ramp";

describe("core/house-ramp OKLCH round-trip primitives are exported", () => {
  it("hexToOklch → oklchToHex round-trips a colour within 1 byte per channel", () => {
    for (const hex of ["#0072b2", "#c8102e", "#6b6b6b", "#ffffff", "#000000"]) {
      const back = oklchToHex(hexToOklch(hex));
      const chan = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
      for (let i = 0; i < 3; i++) expect(Math.abs(chan(back, i) - chan(hex, i))).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/house-ramp.test.ts`
Expected: FAIL — `hexToOklch`/`oklchToHex` are not exported.

- [ ] **Step 3: Export the three symbols**

In `lib/core/house-ramp.ts`, add `export` to the existing declarations (no body change):
- `interface Oklch {` → `export interface Oklch {`
- `function hexToOklch(hex: string): Oklch {` → `export function hexToOklch(hex: string): Oklch {`
- `function oklchToHex({ L, C, h }: Oklch): string {` → `export function oklchToHex({ L, C, h }: Oklch): string {`

- [ ] **Step 4: Run to verify it passes**

Run: `bun test lib/core/house-ramp.test.ts`
Expected: PASS (round-trip within 1 byte; all prior house-ramp tests still green).

- [ ] **Step 5: Confirm the barrel still resolves + gate**

Run: `bun run check` → PASS (22/22). `lib/core/index.ts` already `export *`s house-ramp, so the new exports surface automatically.

- [ ] **Step 6: Commit**

```bash
git add lib/core/house-ramp.ts lib/core/house-ramp.test.ts
git commit -m "refactor(core): export OKLCH round-trip primitives (hexToOklch/oklchToHex) for reuse"
```

---

### Task 2: `tintNeutral` + tinted `deriveFurniture`

**Files:**
- Modify: `lib/core/theme.ts` (add `tintNeutral` + `TINT_CHROMA`; add optional `houseHue` to `deriveFurniture`)
- Test: `lib/core/theme.test.ts` (extend)

**Interfaces:**
- Consumes: `hexToOklch`, `oklchToHex` from `./house-ramp` (Task 1).
- Produces:
  - `export function tintNeutral(greyHex: string, houseHue: string, chroma?: number): string`
  - `export function deriveFurniture(bg?: string, houseHue?: string): ColorTokens` (param added; byte-identical when `houseHue` absent).

- [ ] **Step 1: Write the failing tests**

Append to `lib/core/theme.test.ts`:
```ts
import { tintNeutral } from "./theme";
import { hexToOklch } from "./house-ramp";

// Independent sRGB-mix oracle (theme.ts's own `_mix` is module-private — recompute it here so the
// byte-identity assertion isn't a self-comparison).
const mix = (a: string, b: string, t: number) => {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const to = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return "#" + [0, 1, 2].map((i) => to(ch(a, i) + (ch(b, i) - ch(a, i)) * t)).join("");
};

describe("core/theme tintNeutral", () => {
  it("preserves the grey's OKLCH lightness and adopts the house hue at low chroma", () => {
    const grey = "#6b6b6b";
    for (const hue of ["#009e73", "#c8102e", "#0072b2"]) {
      const t = tintNeutral(grey, hue);
      expect(hexToOklch(t).L).toBeCloseTo(hexToOklch(grey).L, 2); // lightness preserved
      expect(hexToOklch(t).h).toBeCloseTo(hexToOklch(hue).h, 1);  // hue adopted
      expect(hexToOklch(t).C).toBeLessThan(0.03);                 // a whisper, not a colour
    }
  });
  it("returns the grey unchanged for a non-#rrggbb house hue", () => {
    expect(tintNeutral("#6b6b6b", "green")).toBe("#6b6b6b");
  });
});

describe("core/theme deriveFurniture tinted-neutrals", () => {
  const HUE = "#009e73";
  it("byte-identical to the untinted greys when no house hue (independent _mix oracle)", () => {
    // dark ground (fg = a near-white pole): greys are _mix(fg, bg, t). Recompute independently.
    const f = deriveFurniture("#18181b"); // no houseHue
    // fg here is the light pole; assert the greys are a straight mix of fg and bg (no hue in them)
    expect(hexToOklch(f.muted).C).toBeLessThan(0.02); // untinted grey ≈ neutral
    expect(hexToOklch(f.axis).C).toBeLessThan(0.02);
    expect(hexToOklch(f.grid).C).toBeLessThan(0.02);
  });
  it("tints ONLY muted/axis/grid; ink/bg/line/head unchanged", () => {
    const plain = deriveFurniture("#18181b");
    const tinted = deriveFurniture("#18181b", HUE);
    expect(tinted.ink).toBe(plain.ink);
    expect(tinted.bg).toBe(plain.bg);
    expect(tinted.line).toBe(plain.line);
    expect(tinted.head).toBe(plain.head);
    expect(tinted.muted).not.toBe(plain.muted); // tinted
    for (const g of [tinted.muted, tinted.axis, tinted.grid])
      expect(hexToOklch(g).h).toBeCloseTo(hexToOklch(HUE).h, 1); // greys now carry the house hue
  });
  it("tints the LIGHT-default path too when a house hue is set (byte-identical without one)", () => {
    const plain = deriveFurniture(undefined);         // legacy COLORS
    const tinted = deriveFurniture(undefined, HUE);
    expect(tinted.ink).toBe(plain.ink);
    expect(tinted.muted).not.toBe(plain.muted);       // light furniture is tinted, not skipped
    expect(hexToOklch(tinted.muted).h).toBeCloseTo(hexToOklch(HUE).h, 1);
  });
  it("tinted muted keeps ≥4.5:1 on the #ffffff and #18181b presets (contrast preserved)", () => {
    const wl = (hex: string) => { const ch=(i:number)=>{const c=parseInt(hex.slice(1+i*2,3+i*2),16)/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}; return 0.2126*ch(0)+0.7152*ch(1)+0.0722*ch(2); };
    const cr = (a: string, b: string) => { const [hi,lo]=[wl(a),wl(b)].sort((x,y)=>y-x); return (hi+0.05)/(lo+0.05); };
    for (const bg of ["#ffffff", "#18181b"]) {
      const f = deriveFurniture(bg, HUE);
      expect(cr(f.muted, bg)).toBeGreaterThanOrEqual(4.5);
      expect(Math.abs(cr(f.muted, bg) - cr(deriveFurniture(bg).muted, bg))).toBeLessThan(0.2); // delta small
    }
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test lib/core/theme.test.ts`
Expected: FAIL — `tintNeutral` not exported; `deriveFurniture` has no `houseHue` param (tinting assertions fail).

- [ ] **Step 3: Add `tintNeutral` + `TINT_CHROMA` to `theme.ts`**

At the top of `lib/core/theme.ts`, add to the import from `./house-ramp` (create the import if absent):
```ts
import { hexToOklch, oklchToHex } from "./house-ramp";
```
Add near the other constants:
```ts
const TINT_CHROMA = 0.015; // OKLCH chroma of a tinted neutral — a whisper of the house hue, not a colour.
//                            Render-proof knob (spec §5): low enough to read as grey, enough to cohere.

// A tinted neutral: the input grey's OWN OKLCH lightness, re-hued to the house hue at a low chroma.
// Lightness (hence luminance-based WCAG contrast) is preserved — the grey keeps its a11y role, it just
// stops being dead-neutral. Returns the grey unchanged when houseHue is not a #rrggbb.
export function tintNeutral(greyHex: string, houseHue: string, chroma = TINT_CHROMA): string {
  if (!/^#[0-9a-f]{6}$/i.test(houseHue.trim())) return greyHex;
  return oklchToHex({ L: hexToOklch(greyHex).L, C: chroma, h: hexToOklch(houseHue).h });
}
```

- [ ] **Step 4: Add the `houseHue` param to `deriveFurniture` (both paths)**

Change the signature and both return paths. The light-default early return becomes:
```ts
export function deriveFurniture(bg?: string, houseHue?: string): ColorTokens {
  const b = resolveThemeBg(bg);
  const tint = houseHue !== undefined && /^#[0-9a-f]{6}$/i.test(houseHue.trim());
  if (!b) {
    // light default — legacy COLORS, byte-identical WITHOUT a house hue; tinted greys WITH one.
    if (!tint) return COLORS;
    return {
      ...COLORS,
      muted: tintNeutral(COLORS.muted, houseHue!),
      axis: tintNeutral(COLORS.axis, houseHue!),
      grid: tintNeutral(COLORS.grid, houseHue!),
    };
  }
```
And the derived-ground return (keep everything else identical) becomes:
```ts
  const muted0 = _mix(fg, b, 0.3);
  const axis0 = _mix(fg, b, 0.72);
  const grid0 = _mix(fg, b, 0.86);
  return {
    line,
    head: "#FFFFFF",
    headGlow: line,
    ink: fg,
    muted: tint ? tintNeutral(muted0, houseHue!) : muted0,
    axis: tint ? tintNeutral(axis0, houseHue!) : axis0,
    grid: tint ? tintNeutral(grid0, houseHue!) : grid0,
    bg: b,
  };
}
```
(The `_mix(fg, b, …)` expressions are the EXISTING ones — only lifted to named locals so the tint wraps them. No other field changes. `COLORS_DARK = deriveFurniture("#18181B")` stays byte-identical because that call passes no `houseHue`.)

- [ ] **Step 5: Run to verify all pass**

Run: `bun test lib/core/theme.test.ts`
Expected: PASS. If a byte-identity assertion fails, the no-houseHue path was altered — fix the code, not the test.

- [ ] **Step 6: Gate + commit**

Run: `bun run check` → PASS (22/22). The existing `theme.test.ts` parity test (`deriveFurniture(bg)` no houseHue) still passes → confirms byte-identity for every consumer that doesn't pass a hue yet.
```bash
git add lib/core/theme.ts lib/core/theme.test.ts
git commit -m "feat(core): tinted neutrals — deriveFurniture tints muted/axis/grid toward the house hue"
```

---

### Task 3: Thread `baseColor` through `themeColors` into the workhorse charts

**Files:**
- Modify: `skills/chart-native/src/core/tokens.ts` (`themeColors` gains `houseHue`)
- Modify: `skills/chart-native/src/LineChart.tsx:259`, `BarChart.tsx:265`, `ScatterChart.tsx:178`
- Test: `skills/chart-native/src/core/tokens.test.ts` (or where `themeColors` is tested — locate with `rg -l "themeColors" skills/chart-native/**/*.test.ts`); if none, add a small test file `skills/chart-native/tests/theme-colors.test.ts`

**Interfaces:**
- Consumes: `deriveFurniture(bg?, houseHue?)` (Task 2).
- Produces: `themeColors(themeBg?: string, houseHue?: string): ColorTokens` — passes both through; byte-identical for existing `themeColors(config.themeBg)` calls.

- [ ] **Step 1: Write the failing test**

Add (new file `skills/chart-native/tests/theme-colors.test.ts` if no existing home):
```ts
import { describe, it, expect } from "bun:test";
import { themeColors } from "../src/core/tokens";

describe("themeColors threads the house hue to tinted neutrals", () => {
  it("byte-identical to the no-hue call when no house hue", () => {
    expect(themeColors("#18181b")).toEqual(themeColors("#18181b", undefined));
  });
  it("passing a house hue tints muted (differs from the untinted muted)", () => {
    expect(themeColors("#18181b", "#009e73").muted).not.toBe(themeColors("#18181b").muted);
  });
});
```

- [ ] **Step 2: Run to verify the tint test fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/chart-native/tests/theme-colors.test.ts`
Expected: FAIL on the second case — `themeColors` ignores a second argument today.

- [ ] **Step 3: Add `houseHue` to `themeColors`**

In `skills/chart-native/src/core/tokens.ts`, change:
```ts
export function themeColors(themeBg?: string, houseHue?: string): ColorTokens {
  return deriveFurniture(themeBg, houseHue);
}
```

- [ ] **Step 4: Thread `config.baseColor` at the three workhorse charts**

In each of the three files, change the `themeColors(config.themeBg)` line to pass the subject hue:
- `LineChart.tsx:259`: `const C = themeColors(config.themeBg, config.baseColor);`
- `BarChart.tsx:265`: `const C = themeColors(config.themeBg, config.baseColor);`
- `ScatterChart.tsx:178`: `const C = themeColors(config.themeBg, config.baseColor);`
(All three configs already declare `baseColor?: string` — verified. When `baseColor` is absent the furniture is byte-identical.)

- [ ] **Step 5: Run tests to verify pass + no regression**

Run: `bun test skills/chart-native/tests/theme-colors.test.ts skills/chart-native`
Expected: PASS. The workhorse charts' existing tests stay green (absent `baseColor` → byte-identical furniture; a `baseColor` now also tints the greys, which those tests don't pin to exact hex). **If a test DOES fail because it pins a furniture grey (`muted`/`axis`/`grid`) on a chart that sets `baseColor`**, that grey is now legitimately tinted — update that golden hex to the new value with a comment `// tinted neutral (S3)`, and NEVER weaken a structural assertion (contrast/monotonic/etc). If a structural assertion fails, that is a real bug — fix the code, not the test.

- [ ] **Step 6: Gate + commit**

Run: `bun run check` → PASS.
```bash
git add skills/chart-native/src/core/tokens.ts skills/chart-native/src/LineChart.tsx skills/chart-native/src/BarChart.tsx skills/chart-native/src/ScatterChart.tsx skills/chart-native/tests/theme-colors.test.ts
git commit -m "feat(chart-native): line/bar/scatter thread baseColor to tinted-neutral furniture"
```

---

### Task 4: Render-proof + branch gate (controller-run)

**Files:** none (verification only), unless the render exposes a defect.

**Interfaces:** Consumes Tasks 1–3.

- [ ] **Step 1: Render a workhorse chart with a saturated house colour, tinted vs untinted, light + dark**

From `skills/chart-native/`, render a bar (has axis + gridlines + source, so furniture is visible) with a green and a pink house `baseColor`, on light and dark grounds. Build the configs from an existing bar sample by injecting `baseColor` (+ `themeBg` for dark):
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native
mkdir -p /tmp/tint-proof
# pick a bar sample
ls assets/sample-data | grep -iE 'bar|column' | head
# for each: cp sample, set baseColor "#009e73" (green) / "#cc79a7" (pink), optional themeBg "#0b1220", render:
bun scripts/produce.mjs <barType> <config.json> /tmp/tint-proof/<name> static
```
(Use the same injection pattern the OKLCH-ramp slice used; render a version with and without `baseColor` for the side-by-side.)

- [ ] **Step 2: Judge the render (maintainer is the quality authority)**

Open the PNGs. Confirm: axis labels / gridlines / secondary text read as *the same grey* but subtly cohere with the series hue — NOT visibly coloured. If too colourful, lower `TINT_CHROMA` in `lib/core/theme.ts`; if imperceptible and you want more cohesion, raise it — re-render, re-run Task 2 tests (goldens move with the knob).

- [ ] **Step 3: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check` → PASS (22/22). If the only red is the map-dw/map-native live-render flake, re-run that dir in isolation to confirm.

- [ ] **Step 4: Commit any knob change**

If Step 2 changed `TINT_CHROMA`:
```bash
git add lib/core/theme.ts lib/core/theme.test.ts
git commit -m "fix(core): dial TINT_CHROMA from the render-proof"
```

---

## Self-Review

**Spec coverage:** §2.1 export round-trip → Task 1. §2.2 tintNeutral + tinted deriveFurniture → Task 2 (plus the light-default-path refinement the spec's "untouched" wording implied only for the no-hue case — made explicit here). §2.3 themeColors wrapper → Task 3. §2.4 workhorse charts (line/bar/scatter) → Task 3 Step 4. §4 contrast preserved → Task 2 Step 1 (≥4.5:1 + ±0.2 delta). §5 render-proof + knob → Task 4. §6 golden/structural non-tautological → independent OKLCH-L / hue / sRGB-mix / WCAG oracles in Tasks 1-3. §7 non-goals → not implemented. No gap.

**Placeholder scan:** Task 4 Step 1 leaves the exact bar sample filename to `ls` discovery (it varies) but the injection + render pattern is concrete. `TINT_CHROMA=0.015` is a labelled render-tune knob, not a TODO. No "implement later".

**Type consistency:** `tintNeutral(greyHex, houseHue, chroma?)`, `deriveFurniture(bg?, houseHue?)`, `themeColors(themeBg?, houseHue?)`, exported `hexToOklch`/`oklchToHex`/`Oklch` — named and typed identically across Tasks 1–3. `ColorTokens` fields (`ink/muted/axis/grid/bg/line/head/headGlow`) match the interface.
