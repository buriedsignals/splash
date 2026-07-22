# S3 slice-1 — OKLCH sequential ramp + uniformity gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chart heatmap ramp's muddy sRGB interpolation with the OKLCH engine `lib/core` already uses for the map ramp, and add a perceptual ramp-uniformity tripwire.

**Architecture:** One new perceptual ramp function (`hueRampOklch`) and one uniformity primitive (`rampUniformityIssues`) added to `lib/core/house-ramp.ts` (which already holds the hand-rolled OKLab round-trip). The chart engine's `hueRamp` becomes a thin caller. The uniformity primitive is wired fail-hard into `checkHeatmapConformance`. The map ramp (`houseRamp`) is untouched (byte-identical).

**Tech Stack:** Bun, TypeScript, `bun:test`. Zero new dependencies (OKLab is hand-rolled and already present).

## Global Constraints

- Runtime **Bun** only — never `npm`/`node`. Tests use `bun:test` (`describe`/`it`/`expect`).
- **TDD**: failing test before implementation, every task.
- Code, comments, identifiers, commit messages, branch names: **English** (non-negotiable).
- **No Claude/Anthropic mention** in any committed artifact (commits, code, docs). No `Co-Authored-By`.
- **No new `any`.** No new cross-engine `src/` imports (chart imports `lib/core` via `../../../../lib/core/house-ramp`).
- **Gate green each task**: `bun run check` (22 checks) must pass before every commit. Token-free (DW/MapTiler suites self-skip). The recurring red is the map-dw/map-native live-render network flake — re-run in isolation to confirm flake vs regression, never declared flake without proof.
- **Golden values, never tautological parity** (audit T1): pin generated ramp stops as hardcoded expected arrays; assert structural invariants (monotonic, span, floor) that are independently non-vacuous. No `core.X()` compared to a re-export of itself.
- **`houseRamp` (map ramp) output must not change** — a byte-identical regression guard protects it.
- Branch: `feat/oklch-sequential-ramp` (already created off `main`). Worktree: `/Users/rmdms/Sites/Professional/splash-merge`.

---

### Task 1: The perceptual ramp engine `hueRampOklch`

**Files:**
- Modify: `lib/core/house-ramp.ts` (add `hueRampOklch` + endpoint constants; `houseRamp` untouched)
- Modify: `lib/core/index.ts` (barrel already `export *`s house-ramp — confirm, no change if so)
- Test: `lib/core/house-ramp.test.ts` (extend)

**Interfaces:**
- Consumes: `hexToOklch`, `oklchToHex`, `relativeLuminance` (all already in `house-ramp.ts`).
- Produces:
  ```ts
  export function hueRampOklch(base: string, n: number, themeBg?: string): string[]
  ```
  A single-hue sequential ramp of `n` `#rrggbb` stops, interpolated linearly in OKLCH L. Light ground: pale→deep (L decreasing). Dark ground (`relativeLuminance(themeBg) < 0.2`): visible-mid→bright (L increasing), every stop ≥ 3:1 vs `#0b1220`.

- [ ] **Step 1: Write the failing test (structural invariants — non-vacuous by construction)**

Append to `lib/core/house-ramp.test.ts`:
```ts
import { hueRampOklch } from "./house-ramp";

describe("core/house-ramp hueRampOklch (perceptual sequential ramp)", () => {
  const HUES = ["#0072B2", "#0A5C36", "#C8102E", "#4B2E83"];
  const LIGHT = "#ffffff";
  const DARK = "#0b1220";
  const okL = (hex: string) => {
    // OKLCH L via the same round-trip the engine uses — asserted through outputs, not re-exported.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  };

  it("light ground: 7 stops, pale→deep, monotonic OKLCH L decreasing, span ≥ 0.60", () => {
    for (const hue of HUES) {
      const ramp = hueRampOklch(hue, 7, LIGHT);
      expect(ramp.length).toBe(7);
      for (const c of ramp) expect(c).toMatch(HEX);
      const Ls = ramp.map(okL);
      for (let i = 1; i < Ls.length; i++) expect(Ls[i]!).toBeLessThan(Ls[i - 1]!); // decreasing
      expect(Math.abs(Ls[0]! - Ls[Ls.length - 1]!)).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("dark ground: monotonic OKLCH L increasing (mid→bright), span ≥ 0.40, every stop clears 3:1, no collapse", () => {
    for (const hue of HUES) {
      const ramp = hueRampOklch(hue, 7, DARK);
      const Ls = ramp.map(okL);
      for (let i = 1; i < Ls.length; i++) expect(Ls[i]!).toBeGreaterThan(Ls[i - 1]!); // increasing
      // theme-aware span floor: the near-black a11y 3:1 floor caps the achievable L range below the
      // light-ground 0.60, but a collapsed ramp (identical tints, e.g. clamped reds) must still fail.
      expect(Math.abs(Ls[0]! - Ls[Ls.length - 1]!)).toBeGreaterThanOrEqual(0.4);
      for (const c of ramp) expect(core.contrastOk(c, true)).toBe(true); // ≥3:1 vs dark basemap
    }
  });

  it("is deterministic", () => {
    expect(hueRampOklch("#0072B2", 7, LIGHT)).toEqual(hueRampOklch("#0072B2", 7, LIGHT));
  });
});
```
(Delete the unused `lumOf` line before committing — it is a leftover; the `okL` helper is the real one.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/house-ramp.test.ts`
Expected: FAIL — `hueRampOklch` is not exported.

- [ ] **Step 3: Implement `hueRampOklch` in `lib/core/house-ramp.ts`**

Add after `houseRamp` (which stays unchanged):
```ts
// Perceptual sequential-ramp endpoints (OKLCH L). Tuning knobs — dialled against the render-proof
// (spec §2.1/§5); the ENGINE is what's fixed. Light ground: pale low-value → deep high-value.
// Dark ground: visible-mid low-value → bright high-value (high values read on near-black), and the
// low stop still clears the ≥3:1 non-text floor the old hand-tuned dark ramp held.
const RAMP_L_LIGHT_HI = 0.95; // pale low-value end, light ground
const RAMP_L_LIGHT_LO = 0.28; // deep high-value end, light ground
const RAMP_L_DARK_LO = 0.48; // saturated-mid low-value end, dark ground (clears ≥3:1 on near-black)
const RAMP_L_DARK_HI = 0.95; // bright high-value end, dark ground
const RAMP_C_LIGHT = 0.03; // the LOW-chroma pole of the ramp (pale/near-white end)

// A single-hue sequential ramp interpolated LINEARLY in OKLCH L (perceptual — no muddy sRGB
// midpoints). Light ground runs pale→deep (chroma GROWS toward the deep high-value end). A dark
// ground (bg luminance < 0.2) inverts to saturated-mid→bright: chroma SHRINKS toward the bright
// high-value end, because a near-white stop cannot hold chroma — it clamps out of gamut and the ramp
// collapses to near-identical tints (esp. reds). So on a dark ground the saturated pole is the LOW
// (mid-L) stop and the bright pole is near-white. Hue held constant. Replaces the sRGB `_mix` ramp.
export function hueRampOklch(base: string, n: number, themeBg?: string): string[] {
  const b = hexToOklch(base);
  const dark = themeBg !== undefined && relativeLuminance(themeBg) < 0.2;
  const lStart = dark ? RAMP_L_DARK_LO : RAMP_L_LIGHT_HI;
  const lEnd = dark ? RAMP_L_DARK_HI : RAMP_L_LIGHT_LO;
  // chroma poles by ground: light → [low@pale … base@deep]; dark → [base@mid … low@bright].
  const cStart = dark ? b.C : RAMP_C_LIGHT;
  const cEnd = dark ? RAMP_C_LIGHT : b.C;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const L = lStart + (lEnd - lStart) * t;
    const C = cStart + (cEnd - cStart) * t;
    out.push(oklchToHex({ L, C, h: b.h }));
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun test lib/core/house-ramp.test.ts`
Expected: PASS (all invariants hold). If the dark-ground 3:1 assertion fails for a hue, raise `RAMP_L_DARK_LO` a little until it clears — that is the a11y floor, a legitimate knob adjustment, not a test weakening. Do NOT raise it so far that the dark span drops below 0.40 (the collapse the theme-aware gate guards against); if 3:1 and span-0.40 genuinely conflict for a hue, report it as a concern rather than weakening either.

- [ ] **Step 5: Confirm the barrel exports it**

Run: `grep -n 'export \* from "./house-ramp"' lib/core/index.ts`
Expected: present (the barrel re-exports the whole module). If absent, add `export * from "./house-ramp";`.

- [ ] **Step 6: Gate + commit**

Run: `bun run check` → PASS (22/22).
```bash
git add lib/core/house-ramp.ts lib/core/house-ramp.test.ts lib/core/index.ts
git commit -m "feat(core): perceptual OKLCH sequential ramp (hueRampOklch)"
```

---

### Task 2: The uniformity primitive `rampUniformityIssues`

**Files:**
- Modify: `lib/core/house-ramp.ts` (add `rampUniformityIssues` + its two threshold constants)
- Test: `lib/core/house-ramp.test.ts` (extend)

**Interfaces:**
- Consumes: `hexToOklch` (for OKLCH L per stop).
- Produces:
  ```ts
  export function rampUniformityIssues(
    ramp: string[],
    opts?: { minSpan?: number; maxStepRatio?: number },
  ): string[]
  ```
  Returns human-readable reasons a sequential ramp is not perceptually even; `[]` if OK. Defaults `minSpan = 0.60`, `maxStepRatio = 1.8`.

- [ ] **Step 1: Write the failing test (real rejection cases — mutation-proof)**

Append to `lib/core/house-ramp.test.ts`:
```ts
import { rampUniformityIssues } from "./house-ramp";

describe("core/house-ramp rampUniformityIssues", () => {
  it("accepts an even OKLCH ramp (no issues)", () => {
    expect(rampUniformityIssues(hueRampOklch("#0072B2", 7, "#ffffff"))).toEqual([]);
  });
  it("rejects a too-short span (< 0.60) with a span reason", () => {
    // three near-identical light greys — L span far below 0.60
    const issues = rampUniformityIssues(["#eeeeee", "#e4e4e4", "#dadada"]);
    expect(issues.some((r) => /span/i.test(r))).toBe(true);
  });
  it("rejects a kinked ramp (one giant L-step) with a step reason", () => {
    // pale, pale, then a cliff to near-black — one huge step, the rest tiny
    const issues = rampUniformityIssues(["#f2f2f2", "#ededed", "#111111"]);
    expect(issues.some((r) => /step|kink/i.test(r))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test lib/core/house-ramp.test.ts`
Expected: FAIL — `rampUniformityIssues` not exported.

- [ ] **Step 3: Implement `rampUniformityIssues` in `lib/core/house-ramp.ts`**

```ts
const RAMP_MIN_SPAN = 0.6; // OKLCH L span floor (spec §2.2)
const RAMP_MAX_STEP_RATIO = 1.8; // largest ΔL ÷ smallest ΔL (anti-kink)

// A sequential ramp is perceptually uniform when: it spans a wide-enough OKLCH L range, its
// consecutive L-steps are all similar (no kink), and L is monotonic. Returns the reasons it is
// NOT — [] when uniform. Pure. The tripwire in checkHeatmapConformance pushes any reason as a
// conformance violation; hueRampOklch satisfies this by construction, so it fires on regressions.
export function rampUniformityIssues(
  ramp: string[],
  opts?: { minSpan?: number; maxStepRatio?: number },
): string[] {
  const minSpan = opts?.minSpan ?? RAMP_MIN_SPAN;
  const maxStepRatio = opts?.maxStepRatio ?? RAMP_MAX_STEP_RATIO;
  const issues: string[] = [];
  if (ramp.length < 3) return ["ramp needs ≥ 3 stops"];
  const L = ramp.map((c) => hexToOklch(c).L);
  const span = Math.abs(L[L.length - 1]! - L[0]!);
  if (span < minSpan)
    issues.push(`ramp OKLCH L span ${span.toFixed(2)} < ${minSpan} — too flat to read as a scale`);
  const steps: number[] = [];
  for (let i = 1; i < L.length; i++) steps.push(Math.abs(L[i]! - L[i - 1]!));
  const maxStep = Math.max(...steps);
  const minStep = Math.min(...steps);
  if (minStep <= 1e-6)
    issues.push("ramp has a zero-length L step — a flat/duplicated stop");
  else if (maxStep / minStep > maxStepRatio)
    issues.push(
      `ramp L steps are uneven (max/min ${(maxStep / minStep).toFixed(2)} > ${maxStepRatio}) — a perceptual kink`,
    );
  return issues;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun test lib/core/house-ramp.test.ts`
Expected: PASS (even ramp `[]`; short-span and kink cases each surface their reason).

- [ ] **Step 5: Gate + commit**

Run: `bun run check` → PASS.
```bash
git add lib/core/house-ramp.ts lib/core/house-ramp.test.ts
git commit -m "feat(core): perceptual ramp-uniformity check (rampUniformityIssues)"
```

---

### Task 3: Repoint the chart ramp onto the OKLCH engine (intentional output change)

**Files:**
- Modify: `skills/chart-native/src/core/tokens.ts` (`hueRamp` becomes a thin caller; `_mix` kept for greys)
- Test: existing chart-native heatmap tests — update any pinned ramp-hex golden values (intentional change)

**Interfaces:**
- Consumes: `hueRampOklch` from `../../../../lib/core/house-ramp` (Task 1).
- Produces: `hueRamp(base, n, themeBg)` with the **same signature** (callers `heatmapRamp`, geometry, colourbar, guard unchanged) but new OKLCH output.

- [ ] **Step 1: Repoint `hueRamp` in `tokens.ts`**

Add the import at the top of `tokens.ts` (next to the other `lib/core` imports):
```ts
import { hueRampOklch } from "../../../../lib/core/house-ramp";
```
Replace the body of `hueRamp` (lines ~268-277, the `_mix`-based one) with:
```ts
// N-stop single-hue sequential ramp DERIVED from a base hue (subject-fit / house baseColor),
// interpolated in OKLCH (perceptual, no muddy sRGB midpoints — hueRampOklch in lib/core, the SAME
// engine the map ramp uses). Light ground pale→deep; dark ground visible-mid→bright with the ≥3:1
// low-stop floor. Monotonic luminance = CVD-safe. Drives the heatmap the way houseRamp drives the map.
export function hueRamp(base: string, n: number, themeBg?: string): string[] {
  return hueRampOklch(base, n, themeBg);
}
```
Leave `_mix` and its callers (neutral furniture greys) untouched.

- [ ] **Step 2: Run the chart-native suite to surface changed golden ramp values**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/chart-native`
Expected: some heatmap/calendar tests that pin exact ramp hex now FAIL (the ramp changed on purpose). Note which files/assertions.

- [ ] **Step 3: Update the changed golden ramp values (intentional visual change)**

For each failing assertion that pins ramp hex (from `heatmapRamp`/`hueRamp`), replace the old expected array with the **new** ramp output, and add a one-line comment `// OKLCH ramp (S3): perceptual stops, was sRGB _mix`. Do NOT weaken structural assertions (monotonic, count, contrast floors) — only the exact-hex golden values move. If a test asserts monotonic luminance or a contrast floor, it must still PASS unchanged (the new engine preserves both); if such a structural test fails, that is a real bug in Task 1 — fix the engine, not the test.

- [ ] **Step 4: Confirm map ramp untouched + suite green**

Run: `bun test lib/core/house-ramp.test.ts skills/chart-native`
Expected: PASS. The `houseRamp` (map) parity/structural tests are unchanged and green (this task never touches `houseRamp`).

- [ ] **Step 5: Gate + commit**

Run: `bun run check` → PASS.
```bash
git add skills/chart-native/src/core/tokens.ts skills/chart-native
git commit -m "refactor(chart-native): heatmap ramp derives from shared OKLCH engine, not sRGB mix"
```

---

### Task 4: Wire the uniformity tripwire into `checkHeatmapConformance`

**Files:**
- Modify: `skills/chart-native/src/core/conformance.ts` (`checkHeatmapConformance`, ~line 1810)
- Test: `skills/chart-native/src/core/conformance.test.ts` (or the file holding the heatmap-conformance tests — locate with `rg -l checkHeatmapConformance skills/chart-native`)

**Interfaces:**
- Consumes: `rampUniformityIssues` from `../../../../lib/core/house-ramp` (Task 2).
- Produces: `checkHeatmapConformance` now also fails on a non-uniform derived ramp (same string-violation channel).

- [ ] **Step 1: Grandfather check — run the gate on the curated fixed ramp**

Run:
```bash
cd /Users/rmdms/Sites/Professional/splash-merge
bun -e 'import {rampUniformityIssues} from "./lib/core/house-ramp"; import {HEATMAP_RAMP_LIGHT} from "./skills/chart-native/src/core/tokens"; console.log(JSON.stringify(rampUniformityIssues(HEATMAP_RAMP_LIGHT)))'
```
Expected: prints the issues (if any) for the ColorBrewer Blues literal used by the calendar heatmap. **Record the result in the commit body.** If `[]`, no exemption needed. If it reports issues, the calendar's fixed ramp is curated/trusted — exempt it explicitly in Step 3 (guard only the DERIVED ramp) with a comment citing this run.

- [ ] **Step 2: Write the failing test**

In the heatmap-conformance test file, add:
```ts
it("checkHeatmapConformance flags a non-uniform (kinked) ramp", () => {
  const violations = checkHeatmapConformance(
    {
      title: "Heat",
      source: { name: "Src" },
      rampStops: ["#f2f2f2", "#ededed", "#e8e8e8", "#111111"], // even-ish then a cliff = kink
      valueDomain: [0, 10],
    },
    { text: ["#18181b"], bg: "#ffffff" },
  );
  expect(violations.some((r) => /step|kink|span/i.test(r))).toBe(true);
});

it("checkHeatmapConformance passes the derived OKLCH ramp (uniform)", () => {
  const violations = checkHeatmapConformance(
    {
      title: "Heat",
      source: { name: "Src" },
      rampStops: heatmapRamp("#0072B2", "#ffffff"),
      valueDomain: [0, 10],
    },
    { text: ["#18181b"], bg: "#ffffff" },
  );
  expect(violations).toEqual([]);
});
```
(Import `heatmapRamp` from `./tokens` if not already imported in that test file.)

- [ ] **Step 3: Run to verify the kink test fails (tripwire not yet wired)**

Run: `bun test <the heatmap-conformance test file>`
Expected: FAIL — the kink case is not yet flagged.

- [ ] **Step 4: Wire the tripwire into `checkHeatmapConformance`**

At the top of `conformance.ts`, add to the `lib/core/house-ramp` import (or create it):
```ts
import { rampUniformityIssues } from "../../../../lib/core/house-ramp";
```
Inside `checkHeatmapConformance`, after the existing monotonic-luminance block and before `const [lo, hi] = input.valueDomain;`, add:
```ts
// Perceptual uniformity (S3): a wide-enough OKLCH L span with even steps. hueRampOklch satisfies
// this by construction, so this fires on a regression or a hand-set non-uniform ramp — a tripwire.
// THEME-AWARE span floor: on a near-black ground the a11y 3:1 non-text floor physically caps the
// achievable L range below the light-ground 0.60 (see the ramp engine), so a dark ground uses a
// lower floor (0.40) — enough to reject a collapsed ramp, not so high it fails a valid dark ramp.
const rampMinSpan = relativeLuminance(textColors.bg) < 0.2 ? 0.4 : 0.6;
for (const r of rampUniformityIssues(input.rampStops, { minSpan: rampMinSpan }))
  v.push(r);
```

- [ ] **Step 5: Run to verify both tests pass**

Run: `bun test <the heatmap-conformance test file>`
Expected: PASS (kink flagged; derived ramp clean).

- [ ] **Step 6: Gate + commit**

Run: `bun run check` → PASS.
```bash
git add skills/chart-native/src/core/conformance.ts skills/chart-native
git commit -m "feat(chart-native): fail-hard ramp-uniformity tripwire in heatmap conformance"
```

---

### Task 5: Render-proof + branch gate (controller-run)

**Files:** none (verification only). No code change unless the render exposes a defect.

**Interfaces:** Consumes the finished state of Tasks 1–4.

- [ ] **Step 1: Render the heatmap before/after on light and dark grounds**

From `skills/chart-native/`, render the sample heatmap on both themes (the config carries `themeBg`):
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native
# light
bun scripts/produce.mjs heatmap assets/sample-data/heatmap.json /tmp/oklch-proof/light static
# dark: copy the sample with themeBg set to a dark bg, then render
bun -e 'const c=require("./assets/sample-data/heatmap.json"); c.themeBg="#0b1220"; require("fs").writeFileSync("/tmp/oklch-proof/heatmap-dark.json", JSON.stringify(c))'
bun scripts/produce.mjs heatmap /tmp/oklch-proof/heatmap-dark.json /tmp/oklch-proof/dark static
```
Expected: `static.png` under each out dir. (If `produce.mjs` needs a `candidates.json` provenance sibling, mark the config direct-branch as the DW-height fix did, or render via the same path Task 3's tests exercise — the goal is a PNG to eyeball.)

- [ ] **Step 2: Judge the render (maintainer is the quality authority)**

Open both PNGs. Confirm: midpoints no longer muddy, steps read evenly, high values read on the dark ground, low values still visible on dark. If the ramp reads too pale / too dark / over-saturated, adjust the endpoint knobs in `lib/core/house-ramp.ts` (`RAMP_L_*`, `RAMP_C_LIGHT`) and re-render — the engine is fixed, the numbers are dialled here (spec §5). Re-run the Task 1/3 tests after any knob change (golden values move with the knobs).

- [ ] **Step 3: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check`
Expected: PASS (22/22). If the only red is the map-dw/map-native live-render network flake, re-run that dir in isolation to confirm — never declare flake without proof.

- [ ] **Step 4: Commit any knob adjustment**

If Step 2 changed knobs:
```bash
git add lib/core/house-ramp.ts skills/chart-native lib/core/house-ramp.test.ts
git commit -m "fix(core): dial OKLCH ramp endpoints from the render-proof"
```

---

## Self-Review

**Spec coverage:**
- §2.1 perceptual engine → Task 1. §2.2 uniformity primitive → Task 2. §2.3 thin chart caller → Task 3. §2.4 fail-hard tripwire + grandfathering → Task 4 (Step 1 records the curated-ramp decision). §3 data flow (single path, no new call site) → Task 3 preserves `hueRamp`'s signature so all downstream readers are untouched. §4 tests golden/structural → Tasks 1-4 use structural invariants + rejection cases, not self-comparison. §5 render-proof + knob tuning → Task 5. §6 gate 22/22 → every task's final step. §7 non-goals → not implemented (correct). §8 risks: map byte-change → Task 3 Step 4 + the untouched `houseRamp`; curated ramp fails gate → Task 4 Step 1; endpoint numbers wrong → Task 5 Step 2; tautological tests → structural/golden design. No gap.

**Placeholder scan:** Task 1 test carries one deliberately-marked leftover (`lumOf`) with an explicit delete instruction — not a silent TODO. Task 3 Step 3 does not enumerate the exact failing files because they are discovered by running the suite (an intentional output change to unread golden fixtures) — the instruction (run, identify hex-pins, update golden, keep structural) is complete and concrete. Task 4 Step 1 locates the test file by `rg` (its exact path is not assumed). No "TBD/implement later".

**Type consistency:** `hueRampOklch(base, n, themeBg?)` and `rampUniformityIssues(ramp, opts?)` are named and typed identically across Tasks 1-4. `hueRamp`'s signature is preserved (Task 3), so `heatmapRamp`/geometry/colourbar/guard need no change. `checkHeatmapConformance`'s input shape is unchanged (Task 4 only adds violations to the existing `v` array).
