# S3 · OKLCH sequential ramp + uniformity gate — Design

> Pillar S3 of AUDIT #2 (`docs/splash/audit-2026-07-21-orchestration-and-quality.md` §4, Colorimétrie),
> first slice (workhorse-first, mirroring S2). Branch `feat/oklch-sequential-ramp` off `main`.

## 0. The reframe (read first)

The audit says "la rampe maison est en HSL → boueuse". The code says something more precise, and the
design targets the real defect:

- **Map ramp** (`lib/core/house-ramp.ts` → `houseRamp`, drives choropleth / hex-grid / cartogram) is
  **already OKLCH**: L linear 0.95→0.32 (span 0.63 ≥ 0.60), monotonic luminance, CVD-safe. **Unchanged by
  this work.**
- **Chart ramp** (`skills/chart-native/src/core/tokens.ts` → `hueRamp`, drives the heatmap / calendar
  value-encoding) interpolates via `_mix` = a **naïve sRGB byte blend** (`_mix` is even commented "good
  enough for neutral furniture greys" — it is mis-used to encode a quantitative channel). Mixing sRGB
  toward white/black gives muddy, perceptually uneven midpoints. **This is the "pas top".**
- **No ramp-uniformity gate exists.** Only `isMonotonicLuminanceRamp` (CVD-safety) exists; nothing checks
  that the perceptual *steps* are even (no kinks) or that the span is wide enough.

So S3 slice-1 is **not** "HSL→OKLCH everywhere". It is: **unify the chart ramp onto the OKLCH engine the map
ramp already uses, and add a perceptual uniformity gate.** Accent/neutral discipline, a dedicated muted-chroma
cap, tinted neutrals, and a story-level palette are **later S3 slices** (non-goals here).

**This slice intentionally CHANGES rendered output** (the whole point — the heatmap ramp gets prettier),
unlike S1/S2 which were behaviour-preserving. Proof is therefore a **rendered-PNG check** with the maintainer
as quality authority, not a byte-identical assertion.

## 1. Goal

One perceptual OKLCH sequential-ramp engine in `lib/core`, consumed by both the map and chart ramps, plus a
`lib/core` uniformity primitive wired as a fail-hard tripwire (sibling of the WCAG contrast snap) on the
derived heatmap ramp.

## 2. Architecture

Three units, one new primitive each in `lib/core`, one thin caller in the chart engine, one gate wire-in.

### 2.1 `lib/core/house-ramp.ts` — the perceptual ramp engine (extend, don't rewrite)

Add ONE exported function beside the existing `houseRamp`/`hexToOklch`/`oklchToHex` (all kept):

```ts
// A theme-oriented single-hue sequential ramp, interpolated LINEARLY IN OKLCH L (perceptual —
// no muddy sRGB midpoints). Light ground: pale → deep (low→high value). Dark ground: visible-mid →
// bright (so high values read on near-black), keeping the ≥3:1 non-text floor the current dark ramp holds.
export function hueRampOklch(base: string, n: number, themeBg?: string): string[]
```

- Endpoints are chosen in **OKLCH**, not sRGB:
  - **Light ground**: `L 0.95 → ~0.40`, `C small → base.C` (mirrors `houseRamp`'s light→dark intent).
  - **Dark ground**: `L ~0.62 → ~0.90`, `C shaped` so the low stop clears 3:1 on `#0b1220` and high stops
    read bright. (The exact endpoint numbers are **tuning knobs** — see §5; the *engine* is what this spec
    locks, the values are dialled at render.)
- Interpolation: `L` linear across `n` stops; `C` follows a monotonic shape (light→base) that avoids an
  over-saturated or washed midpoint. Hue held constant (single-hue ramp).
- `houseRamp` (map) is **not** routed through this — it stays exactly as-is (its output is already good and
  must not change). Both functions share the same `hexToOklch`/`oklchToHex` primitives already in the file.
  (If, at implementation, `houseRamp` can be expressed as `hueRampOklch` with light-ground params that
  reproduce its output *byte-identically* under the parity test in §4, do so; otherwise leave it separate —
  the DRY win is the shared OKLab round-trip either way, and a byte change to the map ramp is a hard NO.)

### 2.2 `lib/core` — the uniformity primitive

Add:
```ts
// Perceptually-even sequential ramp check: wide enough (OKLCH L span ≥ minSpan), no kink (the largest
// L-step is not disproportionate to the smallest), monotonic. Returns the failing reason(s), [] if OK.
export function rampUniformityIssues(
  ramp: string[],
  opts?: { minSpan?: number; maxStepRatio?: number },
): string[]
```
- Defaults: `minSpan = 0.60`, `maxStepRatio = 1.8` (largest ΔL ÷ smallest ΔL). Both are named constants.
- Computes OKLCH L per stop (via the existing `hexToOklch`). Reuses the monotonic-luminance idea but in
  OKLCH L (the perceptual axis), not WCAG relative luminance.
- Pure, dependency-free, returns human-readable reasons (for the conformance violation message).

### 2.3 `skills/chart-native/src/core/tokens.ts` — thin caller

`hueRamp(base, n, themeBg)` becomes a one-line delegate to `hueRampOklch` (imported from
`../../../../lib/core/house-ramp`). Everything downstream is unchanged because they all read `heatmapRamp()`
→ `hueRamp()` (the single path: `heatmap-geometry.ts` geometry, the colourbar gradient, and the
produce-time guard). The `_mix`-based body is deleted; `_mix` itself stays (still used for neutral furniture
greys, its legitimate purpose).

### 2.4 The gate wire-in (fail-hard tripwire)

In `checkHeatmapConformance` (`skills/chart-native/src/core/conformance.ts:1810`), which already receives
`rampStops`, add a uniformity check: `rampUniformityIssues(rampStops)` → any issue becomes a conformance
violation (fail-hard, same channel as the existing WCAG/monotonic checks). Because `hueRampOklch` generates
uniform ramps **by construction**, this fires only on a regression or a bad hand-set ramp — a tripwire, not
a blocker of legitimate editorial input.

**Grandfathering:** the fixed `HEATMAP_RAMP_LIGHT` (ColorBrewer Blues, used verbatim by the calendar
heatmap) and any registry ramp must be run through `rampUniformityIssues` at implementation. If they pass
(Blues is fairly even), no exemption is added. If a curated ramp fails, it is exempted **explicitly** with a
comment (curated palettes are trusted; the gate targets *derived* ramps). Decision recorded in the commit.

## 3. Data flow

`baseColor` (subject-fit / house) + `themeBg`
→ `heatmapRamp()` → `hueRamp()` → **`hueRampOklch()` [new OKLCH engine]**
→ consumed identically by: heatmap geometry, colourbar-legend gradient, `checkHeatmapConformance`
→ `checkHeatmapConformance` now also runs **`rampUniformityIssues()`** on those stops (fail-hard).

No new call sites, no new config field — the change is entirely inside the single existing ramp path.

## 4. Testing (with the T1 lesson baked in)

The audit's finding-A: ~40% of `lib/core` parity tests are **tautological** (`core.X()` compared to a
re-export of itself — cannot fail). This slice uses **golden values**, never self-comparison:

- **`lib/core/house-ramp.test.ts`** (extend): `hueRampOklch` on representative hues × {light, dark} ground —
  assert **hardcoded expected hex stops** (golden), assert monotonic OKLCH L, assert span ≥ 0.60, assert the
  dark-ground low stop clears 3:1 on `#0b1220`. Non-vacuous by construction (golden hex, not a re-export).
- **`rampUniformityIssues`**: accepts an even OKLCH ramp (`[]`), **rejects** a kinked ramp (one giant L-step)
  and a too-short ramp (span < 0.60) with the right reason — mutation-proof (a broken threshold flips a case).
- **Map parity**: `houseRamp` output **byte-identical** to pre-change (regression guard — the map ramp must
  not move).
- **Chart suite**: `checkHeatmapConformance` still green on derived ramps; a deliberately kinked ramp fixture
  makes it fail (proves the tripwire is live, not vacuous).

## 5. Render-proof (the real acceptance test)

Because output changes intentionally, the acceptance gate is **rendered PNGs**, maintainer-judged:
- A heatmap on a real chart, **light theme** and **dark theme**, **before vs after**.
- Judge: midpoints no longer muddy, steps read evenly, high values read on dark ground.
- The endpoint knobs (§2.1) are **dialled at this step** if the first render reads too pale / too dark /
  too saturated — same feedback loop as the map-story pacing chantier. The spec locks the *engine*; the
  numbers are tuned against the render.

## 6. Gate

`bun run check` **22/22** each commit (token-free; DW/MapTiler suites self-skip). The one recurring red in
this repo is the map-dw / map-native live-render network flake — re-run in isolation to distinguish from a
real regression, never declared flake without proof.

## 7. Non-goals (later S3 slices)

Accent/neutral discipline ("1 accent, rest grey"), saturation-as-f(background) beyond the theme orientation,
tinted neutrals, and a story-level palette. Each is its own slice; this one is the perceptual-ramp foundation
they build on.

**Scope note (amended after the Task-4 review):** a **muted-chroma cap** (§4's lever, originally deferred)
was pulled into THIS slice as Task 4b. The Task-4 review found the fail-hard uniformity tripwire would block
~14/24 saturated house hues (their derived ramps clamp out of gamut → collapsed span / kinked steps), and
`baseColor` is a free-form brand hex with no saturation clamp. Capping peak chroma (~0.12) keeps every hue's
ramp in-gamut and uniform-by-construction (swept: 0/24 fail), which is a precondition for the fail-hard gate
to be safe — so it belongs here, not in a later slice.

## 8. Risks

- **Changing the map ramp by accident** → §4 byte-identical parity guard on `houseRamp`.
- **A curated ramp fails the new gate** → §2.4 grandfather-with-explicit-exemption, decided at implementation
  on real values, not assumed now.
- **Endpoint numbers wrong on first render** → §5 render-tuning loop; the engine is separable from the knobs.
- **Tautological tests** (the T1 debt) → §4 golden values, explicit kink/short rejection cases.
