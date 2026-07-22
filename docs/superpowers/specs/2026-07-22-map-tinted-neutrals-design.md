# S3 · Map tinted-neutral furniture — Design

> Pillar S3 of AUDIT #2 (§4, Colorimétrie), the fan-out residual that closes S3: map furniture
> gets the same house-hue whisper the chart furniture got in S3-slice-3b. Branch
> `feat/map-tinted-neutrals` off `main` (@ 7cec693).

## 0. The gap (read first)

S3-slice-3 + slice-3b gave **chart** furniture a tinted-neutral treatment: `deriveFurniture(bg?, houseHue?)`
tints `muted`/`axis`/`grid` toward the newsroom house hue at OKLCH chroma 0.03, preserving the grey's OKLCH L
(so contrast is preserved) — a branded whisper instead of a dead grey. The 16 charts that carry `baseColor`
were fanned out to thread it.

**Map furniture was not touched.** `resolveFrameColors(themeBg?)` (`lib/core/theme.ts:183`) returns
`{pill, ink, muted}` where `muted = _mix(ink, bg, 0.22)` — a **dead neutral grey**. So within the same pillar,
a newsroom's charts whisper its house hue in their furniture while its maps stay grey. This slice closes that
inconsistency by mirroring the chart treatment on maps.

## 1. Goal

When a map carries a house hue (`config.brandHue`, or Locator's `config.brandPalette[0]`), its frame furniture
`muted` (legend sub-text, pill body text) carries the same OKLCH-0.03 whisper of that hue that chart furniture
does — story-wide colour cohesion. Absent a house hue, every map is **byte-identical**. `pill`, `ink`, the
basemap, and all mark colours are untouched.

## 2. Scope

**Threaded** (gain a `houseHue` and tint `muted`):
- `lib/core/theme.ts` `resolveFrameColors` — the shared derivation.
- `skills/map-native/src/core/MapFrame.tsx` `MapFrameProps` — the furniture host, rendered by all 7 map types.
- The 3 sibling callers of `resolveFrameColors`, for coherence + honest conformance:
  - `skills/map-native/src/core/MapFilterBar.tsx` (interactive filter bar furniture)
  - `skills/map-native/src/theme/legend-theme.ts` `legendTheme` (legend sub-text)
  - `skills/map-native/src/core/map-produce-conformance.ts` (validates the *rendered* tinted muted, not a
    colour that isn't painted)
- The ~21 `<MapFrame>` render-sites (7 types × Reveal/Story/Scrolly + top-level `*Map.tsx`) + the legend-theme
  call-sites, pass `houseHue={config.brandHue ?? config.brandPalette?.[0]}`.

**NOT touched:**
- `pill` (the ground itself at 0.82 — already branded when `themeBg` is a house colour; a neutral ground
  otherwise, kept untouched so light-default stays byte-identical, mirroring charts where `bg` never tints).
- `ink` (max-contrast foreground — untouched, mirroring charts where `ink` never tints).
- Basemap, marks, ramp (their house-colour paths are already done — S3-slice-1 / the 2026-07-14 map colour work).
- `map-dw` (Datawrapper furniture is plan-gated — out of scope, as in every prior colour slice).

## 3. Architecture

### 3.1 The derivation (`lib/core/theme.ts`)

`resolveFrameColors(themeBg?, houseHue?)` gains a second optional arg. The tint mirrors `deriveFurniture`
exactly — same `tintNeutral(grey, houseHue, TINT_CHROMA)` helper, same chroma 0.03, same "tint on both paths"
structure:

- **Light-default short-circuit** (`!bg`): today returns `FRAME_COLORS` verbatim. Now: if `houseHue` is set,
  return `{ ...FRAME_COLORS, muted: tintNeutral(FRAME_COLORS.muted, houseHue) }`; else `FRAME_COLORS` verbatim
  (byte-identical).
- **Derived-ground path**: after computing `muted = _mix(ink, bg, 0.22)`, if `houseHue` is set,
  `muted = tintNeutral(muted, houseHue)`.

`tintNeutral` preserves the grey's OKLCH L, so the WCAG contrast of `muted` on its ground is preserved — the
chart sweep proved this (16 hues × 2 grounds, 0 failures, worst 5.25:1); map `muted` starts lighter (22% mix)
so has at least as much headroom. `pill` and `ink` are computed exactly as today.

### 3.2 `MapFrame` + siblings thread `houseHue`

- `MapFrameProps` gains `houseHue?: string`; `MapFrame` passes it: `resolveFrameColors(furnitureBg, houseHue)`.
- `MapFilterBarProps` gains `houseHue?: string`; threads to its `resolveFrameColors(...)`.
- `legendTheme(dark, themeBg?, houseHue?)` gains the arg; threads to its `resolveFrameColors(themeBg, houseHue)`.
- `map-produce-conformance`: computes `houseHue = config.brandHue ?? config.brandPalette?.[0]` (config is
  already in scope) and passes it to `resolveFrameColors(furnitureBg, houseHue)` so the guard validates the
  colour actually painted.

### 3.3 The render-sites pass the hue

Every `<MapFrame>` site and every `legendTheme(...)` site has `config` in scope. Each passes
`config.brandHue ?? config.brandPalette?.[0]` (Locator's hue lives in `brandPalette[0]`; every other type in
`brandHue`; both trace upstream to `profile.palette[0]` via `brand-profile.ts:394`). `MapFilterBar` sites pass
the same from their parent Map's config. One uniform expression — no per-type branching.

## 4. Data flow

`profile.palette[0]` → `brand-profile` seeds `config.brandHue` (+ `brandPalette`) → render-site resolves
`houseHue = config.brandHue ?? config.brandPalette?.[0]` → `MapFrame`/`legendTheme`/`MapFilterBar` →
`resolveFrameColors(bg, houseHue)` tints `muted` → produce-conformance validates the same tinted `muted`.
No house hue → `houseHue` undefined → byte-identical furniture.

## 5. Testing

- **`resolveFrameColors` byte-identity**: no `houseHue` → identical to today (light default AND dark preset).
  Independent assertion (compare to literal `FRAME_COLORS` / `FRAME_COLORS_DARK`), not a re-call comparison.
- **`resolveFrameColors` tint**: with a `houseHue`, `muted` differs from the untinted `muted` (perceptibly —
  reuse the slice-3 threshold), `pill`/`ink` unchanged, and `muted`'s OKLCH L equals the untinted `muted`'s L
  (contrast-preservation oracle, independent of the tint impl).
- **Contrast floor sweep**: a representative set of house hues × {light default, dark preset, a mid grey
  ground} → `muted` clears its WCAG floor on its ground (mirrors the slice-3 sweep; independent WCAG oracle).
- **Thread reaches the frame**: a `MapFrame`/`legendTheme` call with a `houseHue` yields tinted `muted`;
  without, untinted. Structural (assert the resolved colour object), not a pixel.
- **Conformance honesty**: `map-produce-conformance` with a `config.brandHue` validates the tinted `muted`
  (assert the guard's evaluated `muted` equals `tintNeutral(...)`, not the dead grey).
- Golden/structural, independent oracles (audit T1). No basemap/mark/ramp test changes.

## 6. Render-proof (acceptance)

A choropleth (or symbol) rendered with a house `brandHue` (e.g. a green `#2E7D57`) shows its legend sub-text /
pill body text carrying a faint green cast identical to the same newsroom's chart furniture — maintainer-judged
side-by-side (a chart + a map from the same profile). Confirm a no-house-hue render is byte-identical grey.

## 7. Non-goals

- Tinting `pill`, `ink`, basemap, marks, or the ramp (done elsewhere or intentionally untouched).
- `map-dw` furniture (plan-gated Datawrapper — separate follow-up).
- A new house-hue field: reuse `brandHue` / `brandPalette[0]`, already seeded.

## 8. Risks

- **A house hue collides so the tint is invisible** (hue whose OKLCH-0.03 whisper reads as plain grey) → same
  as charts; the whisper is deliberately subtle (render-tuned 0.03), acceptance is §6 side-by-side, not a
  saturation target.
- **Byte-identity break** for no-house-hue renders → §3.1 keeps the exact short-circuit; §5 byte-identity guard
  on both light default and dark preset.
- **A render-site lacks `config.brandHue`/`brandPalette`** → the `?? undefined` fallback yields no tint (grey),
  never a crash; the fan-out audits every site so the intended ones tint.
