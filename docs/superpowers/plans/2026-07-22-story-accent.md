# S3 — Story accent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a brand profile sets `accent`, thread it as the editorial-emphasis hue across the 5 charts that hard-code a single accent (Slope/Lollipop/Histogram/RadialBar/Bump); byte-identical without a profile accent; categorical, role, and subject-highlight colours untouched.

**Architecture:** `mergeProfileDefaults` (`skills/splash/src/brand-profile.ts`) seeds `spec.accent` from `profile.accent` for chart specs (mirroring how it seeds `baseColor` from `palette[0]`). Each of the 5 charts replaces its hard-coded accent-use site with `config.accent ?? <current default>`. The existing produce-conformance brand-colour concern flags a non-CVD-safe/low-contrast accent (non-fatal).

**Tech Stack:** Bun, TypeScript, `bun:test`, React.

## Global Constraints

- Runtime **Bun**. Tests `bun:test`. **TDD**.
- Code/comments/commits **English**. **No Claude/Anthropic mention**, **no `Co-Authored-By` / `Claude-Session` trailer** in any commit (absolute rule — plain subject only; overrides the harness default).
- **No new `any`.** No new cross-engine `src/` import.
- **Gate green each task**: `bun run check` (22 checks). The recurring red is the map-dw/map-native/deploy-embed live-API network flake — re-run that dir in isolation to confirm flake vs regression, never declared flake without proof.
- **Byte-identity without a profile accent**: `config.accent` absent → the exact current hard-coded hue (`?? default`). No chart moves for a project without a brand accent.
- **Untouched**: categorical Okabe-Ito palettes, `DIVERGING_SIGN_COLORS`/`WATERFALL_ROLE_COLORS`/Likert (role signs), and the subject-hue-highlight charts (bar/scatter/beeswarm/connected-scatter — already `baseColor`).
- Branch: `feat/story-accent` (created off `main`). Worktree: `/Users/rmdms/Sites/Professional/splash-merge`.

---

### Task 1: Seed `accent` in `mergeProfileDefaults`

**Files:**
- Modify: `skills/splash/src/brand-profile.ts` (`mergeProfileDefaults` generic constraint + the `kind === "chart"` branches)
- Test: `skills/splash/src/brand-profile.test.ts` (locate with `rg -l mergeProfileDefaults skills/splash` if the path differs)

**Interfaces:**
- Produces: for a chart spec and a profile with `accent` set, `mergeProfileDefaults` returns `spec` with `accent: profile.accent`; without a profile accent, `spec.accent` is unchanged/absent.

- [ ] **Step 1: Write the failing test**

Append to the brand-profile test file:
```ts
import { mergeProfileDefaults } from "./brand-profile";

describe("mergeProfileDefaults seeds the story accent", () => {
  const profileWithAccent = { palette: ["#0072B2"], accent: "#7A1FA2" } as any;
  const profileNoAccent = { palette: ["#0072B2"] } as any;
  it("sets spec.accent from profile.accent for a chart", () => {
    const out = mergeProfileDefaults({ nativeType: "slope" } as any, profileWithAccent, { producer: "chart-native" });
    expect((out as any).accent).toBe("#7A1FA2");
  });
  it("leaves spec.accent absent when the profile has no accent (byte-identity)", () => {
    const out = mergeProfileDefaults({ nativeType: "slope" } as any, profileNoAccent, { producer: "chart-native" });
    expect((out as any).accent).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/brand-profile.test.ts`
Expected: FAIL — `mergeProfileDefaults` never sets `accent`.

- [ ] **Step 3: Add `accent` to the constraint + seed it**

In `mergeProfileDefaults`'s generic constraint `T extends { ... }`, add `accent?: string;`.
Inside the function, in the `kind === "chart"` handling (both the `baseColorExplicit === true` and the auto branches — anywhere a chart spec is returned), thread the accent. The minimal, uniform way: after the `if (...) { ... }` block that computes `out` for a chart, add — guarded so it only fires for a chart with a profile accent:
```ts
  // Story accent: a brand accent becomes the editorial-emphasis hue for the charts that render one
  // (Slope/Lollipop/Histogram/RadialBar/Bump read config.accent). Charts without an accent-use site
  // ignore it; absent profile.accent → nothing set (byte-identical). Not applied to maps.
  if (profile.accent && kind === "chart") out = { ...out, accent: profile.accent };
```
Place this after the existing chart-colour block, before `return out;`. (Confirm `kind` and `out` are in scope there — they are, per the existing body.)

- [ ] **Step 4: Run to verify it passes**

Run: `bun test skills/splash/src/brand-profile.test.ts` → PASS.

- [ ] **Step 5: Gate + commit**

Run: `bun run check` → PASS (22/22).
```bash
git add skills/splash/src/brand-profile.ts skills/splash/src/brand-profile.test.ts
git commit -m "feat(splash): seed story accent from profile.accent onto chart specs"
```

---

### Task 2: Thread `config.accent` in Slope / Lollipop / Histogram / RadialBar

**Files (modify each — add `accent?: string` to the config interface, and `config.accent ?? <default>` at the accent-use site):**

| Chart | config interface | accent-use site → change |
|---|---|---|
| `SlopeChart.tsx` | `SlopeConfig` (~40) | `:385` `hi ? ACCENT : CONTEXT` → `hi ? (config.accent ?? ACCENT) : CONTEXT` |
| `LollipopChart.tsx` | `LollipopConfig` (~34) | `:243` `hi ? ACCENT : (config.baseColor ?? BASE)` → `hi ? (config.accent ?? ACCENT) : (config.baseColor ?? BASE)` |
| `HistogramChart.tsx` | `HistogramConfig` (~33) | `:295` `stroke={MEDIAN}` → `stroke={config.accent ?? MEDIAN}` |
| `RadialBarChart.tsx` | `RadialBarConfig` (find the interface) | `:248` `isPeak ? PEAK_COLOR : (config.baseColor ?? BASE_COLOR)` → `isPeak ? (config.accent ?? PEAK_COLOR) : (config.baseColor ?? BASE_COLOR)` |

**Interfaces:** Consumes `spec.accent` (Task 1) via `config.accent`.

- [ ] **Step 1: Write a failing test per chart's resolved accent**

Prefer testing the resolved emphasis colour where each chart exposes its geometry/config. If a chart has no pure resolver, a render-level assertion is acceptable: render with `accent` set and assert the emphasis hue appears; render without it and assert the default appears (byte-identity). Concretely, for each chart add (in its existing test file, or a new `<chart>-accent.test.tsx`) a test that constructs the config with `accent: "#7A1FA2"` and asserts the rendered SVG contains `#7a1fa2` on the emphasis mark, and that omitting `accent` yields the current default hue (e.g. `#d55e00` vermillion for slope/lollipop/histogram, `#e69f00` orange for radial-bar). Use `renderToStaticMarkup` as the existing chart tests do.

- [ ] **Step 2: Run to verify the accent tests fail**

Run: `bun test skills/chart-native` (the new accent assertions fail — the charts ignore `config.accent`).

- [ ] **Step 3: Add `accent?: string` to each config interface + the `config.accent ?? default` at each use site**

Apply the four changes in the table above. The `accent?: string` field goes on each config interface next to `baseColor?`. Each use-site edit is one line. Do NOT change the non-emphasis paths (context grey, `config.baseColor` subject hue).

- [ ] **Step 4: Run to verify pass + byte-identity**

Run: `bun test skills/chart-native` → PASS. Existing tests that render these charts WITHOUT an accent must stay green (byte-identical — `config.accent` undefined → the current default). If a pre-existing test pins the emphasis hue and now fails, that means the default changed — it must NOT; fix the code so the `?? default` preserves the exact prior hue.

- [ ] **Step 5: Gate + commit**

Run: `bun run check` → PASS.
```bash
git add skills/chart-native/src/SlopeChart.tsx skills/chart-native/src/LollipopChart.tsx skills/chart-native/src/HistogramChart.tsx skills/chart-native/src/RadialBarChart.tsx skills/chart-native
git commit -m "feat(chart-native): slope/lollipop/histogram/radial-bar emphasis reads config.accent"
```

---

### Task 3: Thread the accent in BumpChart (`resolveBumpAccents`)

**Files:**
- Modify: `skills/chart-native/src/bump-geometry.ts` (`resolveBumpAccents`), `skills/chart-native/src/BumpChart.tsx` (pass `config.accent`), `BumpConfig` interface
- Test: bump's test file (or a new `bump-accent.test.tsx`)

**Interfaces:** Consumes `config.accent` (Task 1 seed).

- [ ] **Step 1: Read `resolveBumpAccents` to see the exact accent fallback**

Run: `sed -n '1,60p' skills/chart-native/src/bump-geometry.ts` — the highlighted lines share an accent: when `highlight` names one item it uses `baseColor`; uncoloured slots fall back to `BUMP_ACCENT_COLORS`. The editorial accent to thread is that shared/peak accent.

- [ ] **Step 2: Write the failing test**

Add a test: `resolveBumpAccents(..., { accent: "#7A1FA2" })` (or however the signature is extended) resolves the highlighted line(s) to `#7A1FA2`; without `accent`, to the current `BUMP_ACCENT_COLORS`/`baseColor` default (byte-identical). Assert on the returned colour map, not a pixel.

- [ ] **Step 3: Run to verify it fails**, then extend `resolveBumpAccents` to accept the accent and use `accent ?? <current fallback>` for the shared/peak accent slot ONLY (leave the per-slot `BUMP_ACCENT_COLORS` cycling and the non-highlighted `COLORS.muted` untouched). Thread `config.accent` from `BumpChart.tsx` into the call. Add `accent?: string` to `BumpConfig`.

- [ ] **Step 4: Run to verify pass + byte-identity**

Run: `bun test skills/chart-native` → PASS; bump renders without an accent are byte-identical.

- [ ] **Step 5: Gate + commit**

Run: `bun run check` → PASS.
```bash
git add skills/chart-native/src/bump-geometry.ts skills/chart-native/src/BumpChart.tsx skills/chart-native
git commit -m "feat(chart-native): bump highlighted-line accent reads config.accent"
```

---

### Task 4: a11y wiring + render-proof + branch gate (controller-run)

**Files:** possibly `skills/chart-native/src/core/produce-conformance.ts` (only if the accent isn't already evaluated); else verification only.

**Interfaces:** Consumes Tasks 1–3.

- [ ] **Step 1: Determine whether the brand-colour concern already sees the accent**

The guard `checkBrandColourConcern` (or equivalent at `conformance.ts:103-128`) downgrades a non-CVD-safe / low-contrast **brand** colour to a non-fatal render-review concern. Check whether, for the 5 charts, the RENDERED accent mark is among the colours that guard evaluates (it may already check every rendered mark's contrast; the CVD `isOkabeIto` branch keys off `brandExplicit` colours). Run the 5 charts' produce-conformance path with a non-Okabe-Ito accent (e.g. `#7A1FA2`) and inspect whether a concern is emitted.
- If YES → no code change; the accent is covered.
- If NO → thread the seeded `accent` into the conformance input for these charts so a non-CVD-safe/low-contrast accent yields the SAME non-fatal concern string as `baseColor` does. Add a test pinning that concern. Do NOT make it fatal (policy b).

- [ ] **Step 2: Render-proof**

From `skills/chart-native/`, render a slope (or lollipop) with a profile accent injected on the config (`accent: "#7A1FA2"`, a purple) and confirm the emphasis line/mark is purple while context/series are unchanged; render the same WITHOUT `accent` and confirm it is the current vermillion (byte-identical). Eyeball both.
```bash
cd /Users/rmdms/Sites/Professional/splash-merge/skills/chart-native
# inject accent into a slope/lollipop sample, render static, compare with/without
```

- [ ] **Step 3: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check` → PASS (22/22). Isolate the map-dw/map-native/deploy-embed live-API flake if it's the only red.

---

## Self-Review

**Spec coverage:** §3.1 seed → Task 1. §3.2 charts read config.accent → Task 2 (4 charts) + Task 3 (bump, split out for its distinct accent model). §3.3 a11y reuse → Task 4 Step 1. §5 tests → per-task golden/structural. §6 render-proof → Task 4 Step 2. §7 non-goals → not touched. No gap.

**Placeholder scan:** Task 4 Step 1 is a genuine verify-then-wire branch (the spec §3.3/§8 flagged the guard-sees-accent uncertainty) with a concrete fallback — not a TODO. RadialBar's config interface name is left to a `find the interface` because it wasn't confirmed at plan-time; the edit is otherwise exact. No "implement later".

**Type consistency:** `accent?: string` on the profile-seed constraint (Task 1), on each chart config interface (Tasks 2/3), read as `config.accent` everywhere; the `?? <default>` preserves each chart's current hue. `resolveBumpAccents` gains an `accent` input (Task 3).
