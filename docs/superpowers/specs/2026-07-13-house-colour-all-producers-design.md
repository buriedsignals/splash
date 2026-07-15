# Newsroom house colour on every producer — design

> The newsroom profile's colour must brand EVERY visual splash can produce, not just charts.
> Today `mergeProfileDefaults` seeds the house colour for **chart-native + dw-chart only**
> (`BRAND_COLOUR_PRODUCERS`, brand-profile.ts:280); maps / scrolly / image ignore it. Extend it to
> map-native (7 types, 4 formats, light + dark), map-dw, and scrolly — with the map-appropriate
> colour model (a derived house RAMP for value→colour types, a house ACCENT for single-hue types).
>
> Grounded against the tree on 2026-07-13 (workflow `ground-map-brand-colour`, file:line inline).

## Locked decisions (from brainstorming)

1. **Scope**: all at once — map-native (choropleth, hex-grid, cartogram, symbol, route, locator,
   dot-density), map-dw (choropleth + locator), scrolly (pass-through of the host), in light AND
   dark. image-native (photos, no data colour) is out of scope (a furniture-accent follow-up).
2. **Colour policy on maps**: a **house RAMP = a monotonic-luminance ramp derived from
   `palette[0]`** — CVD-safe BY CONSTRUCTION (colour-blind readers distinguish sequential bins by
   lightness), so it needs **no waiver**. A **single house FILL** (symbol/dot/route/locator) uses
   `palette[0]` directly; its only a11y risk is CONTRAST vs the (light/dark) basemap, handled by a
   `brandExplicit`-style keep-and-review waiver (mirroring charts' policy b) — NOT a CVD relaxation.

## The two colour models (why maps ≠ charts)

Charts colour by ONE `baseColor`. Maps split in two:
- **value → RAMP** (choropleth `choropleth-geo.ts:75`, hex-grid `hex-grid-geo.ts:168`, cartogram
  `cartogram-geo.ts:28`; map-dw choropleth `colorScale`, `map-spec.ts:41`): a sequential/diverging
  binned ramp. A newsroom's single house hue → a derived **sequential luminance ramp**.
- **single HUE / categorical** (symbol fill `SYMBOL_FILL="#2171b5"` hardcoded in 4 files;
  dot-density univariate accent token `dot-density-geo.ts:53`; route line accent
  `RouteMap.tsx:23`; locator/route-territory qualitative palette): a constant colour. A newsroom's
  `palette[0]` → the fill/accent.

## The CVD-validation wrinkle (must fix)

`isCvdSafeRamp(ramp)` (map-native `theme/scale.ts:142`) is **not an algorithm — it is a whitelist**:
`ramp.every(c => VETTED_COLORS.has(c))`. A house luminance ramp of arbitrary hexes is genuinely
CVD-safe but is NOT in `VETTED_COLORS`, so validate-config (`validate-config.ts:36-42 paletteErrors`)
would REJECT it. Per decision 2 (house ramp CVD-safe, no waiver), the fix is to make the check
**algorithmic for a house ramp**: accept a ramp when it is **strictly monotonic in relative
luminance** (the real CVD-safety criterion for a sequential ramp), in addition to the existing
whitelist for the registry palettes.

## Architecture

### 1. House-colour derivers — `skills/map-native/src/theme/house-ramp.ts` (new)

- `houseRamp(hex: string, n = 5): string[]` — a sequential ramp of `n` stops derived from the
  house hue: interpolate lightness from a light tint (~0.92 L) down to a near-full shade of the
  hue, in a perceptual space (OKLCH or HSLuv), keeping hue+chroma, so luminance is strictly
  monotonic. Returns the ramp light→dark (matching the registry ramps' orientation, `BLUES`
  `theme/scale.ts:2`). CVD-safe by construction.
- `isMonotonicLuminanceRamp(ramp: string[]): boolean` — strictly-monotonic relative-luminance test
  (WCAG relative luminance). This is what lets `houseRamp` output pass validation without the
  whitelist.
- `contrastOk(fill: string, dark: boolean): boolean` — does a single fill clear a contrast floor
  against the light vs dark DATAVIZ basemap (a coarse basemap-luminance reference)? Used only to
  RAISE a review concern (policy b keep-and-review), never to reject.

### 2. Relax the ramp validation — `theme/scale.ts` + `validate-config.ts`

`isCvdSafeRamp` (or `paletteErrors`) accepts a custom ramp when it is EITHER whitelist-vetted
(today) OR `isMonotonicLuminanceRamp` (new). A house ramp then validates with no waiver.

### 3. Open the single-hue config seams — `map-native`

New OPTIONAL config fields (defaulting to today's hardcoded literals, so nothing changes without a
profile), threaded to the renderers (interactive + video + scrolly/reveal/story dupes) AND their
dark variants:
- `symbolColor?` (SymbolMap/SymbolReveal/SymbolStory/SymbolScrolly — replaces `SYMBOL_FILL`).
- dot-density univariate `accentColor?` (replaces the `univariateAccent` token).
- route line `routeAccent?` (replaces `ELECTRIC_LIGHT/DARK` line — keep dark/light variants derived
  from the one house hue).
- locator/route-territory: seed the existing `palette?` override from the house categorical (a
  house profile carries `palette` + `accent`; a 2-colour house palette maps onto the first two
  qualitative slots, the rest fall back to Okabe-Ito).
Each single-hue seam also gains a `brandExplicit?: boolean` on its ConfigShape so the produce-time
CONTRAST check (new, `contrastOk`) downgrades a low-contrast house fill to a render-review concern
(map-produce-conformance.ts) instead of a hard block.

### 4. map-dw — `map-spec.ts` / `spec-to-map-metadata.ts`

- choropleth `colorScale`: seed the light→dark gradient endpoints from `houseRamp(palette[0])`
  (first + last stop), or the full derived ramp as GradientStop[].
- locator `marker.color` default: the house `palette` cycle instead of `OKABE_ITO`.
- map-dw is light-only (Datawrapper SaaS) — no dark branch.

### 5. Seed at the merge — `skills/splash/src/brand-profile.ts`

Add map-native + map-dw to `BRAND_COLOUR_PRODUCERS`. `mergeProfileDefaults` becomes map-aware:
for a map spec it seeds the ramp field (choropleth/hex/cartogram/map-dw-choropleth) OR the single-
hue field (symbol/dot/route/locator) from the profile, per the spec's `type`, with `brandExplicit`
+ deferring to `baseColorExplicit` (the journalist's explicit colour). The per-type field mapping
lives in a small `mapBrandTargets(type)` table. Scrolly inherits via its host spec (chart-scrolly
already works; map-scrolly seeds the same map fields).

### 6. scrolly dark-mode bug (pre-existing, fix in-scope)

`ScrollyMap.tsx:125` (choropleth) and `ScrollySymbolMap.tsx:95` (symbol) HARDCODE
`MapStyle.DATAVIZ.LIGHT`, ignoring `config.mapStyle` — contradicting "map-native dark complete incl.
scrolly". Fix: resolve `dark` from `mapStyle` like the other 4 scrolly map renderers
(ScrollyLocatorMap.tsx:79). Required for a house colour to be verified in a dark map-scrolly.

### 7. suggester + docs

- suggest-map SKILL.md: house palette FIRST for maps (mirror the suggest-chart rule) — when a
  profile palette exists, the ramp/accent comes from the house palette, not the auto pick.
- SKILL.md (splash) + CLAUDE.md: brand colour now reaches maps/scrolly; drop the "chart-only"
  caveat; note image-native is the remaining follow-up.

## Phasing (build order — all in this chantier)

- **A — the ramps**: `house-ramp.ts` + luminance-validation relax + map-native choropleth / hex /
  cartogram ramp seeding + map-dw choropleth ramp. Render-proof choropleth light + dark.
- **B — the single hues**: symbol / dot-density / route / locator seams + brandExplicit contrast
  waiver + dark variants. Render-proof symbol light + dark.
- **C — scrolly + wiring**: the mergeProfileDefaults map-awareness, the scrolly dark-mode bug fix,
  suggest-map prose, docs. Render-proof a map-scrolly.

## Verification

- Unit: `houseRamp` (monotonic luminance, n stops, light→dark), `isMonotonicLuminanceRamp`
  (accept monotone / reject non-monotone), `contrastOk`, `mergeProfileDefaults` map-awareness
  (each type → the right field seeded; brandExplicit; baseColorExplicit defers).
- Render-proof (the "vérifier le livré" bar): a real produce of choropleth (ramp), symbol (fill),
  and a map-scrolly, EACH in light AND dark, PNG-inspected — the house colour visibly applied and
  legible on both basemaps.
- Gate `bun run check` stays green (new tests under the touched skills).

## Out of scope (noted follow-ups)

- **Diverging** choropleth: a CVD-safe diverging ramp from two arbitrary house hues is not
  guaranteed — a diverging map keeps its registry CVD-safe diverging palette; the house colour
  applies to SEQUENTIAL ramps only (the common case). Noted.
- **image-native**: photos carry no data colour; a house furniture/caption accent is a separate
  small lot.
- **Logo / fonts** (all producers) — the F2 deferred axes.

## Risks

- **Dark contrast**: a dark house hue on a dark basemap (or light on light) can be illegible. The
  ramp path is safe (spans the lightness range); the single-fill path relies on `contrastOk` +
  the review waiver — a genuinely bad pairing is kept but flagged, matching charts' policy b.
- **Hardcoded-literal sprawl**: symbol/route fills are duplicated across interactive/video/scrolly
  files; each seam must be threaded to ALL dupes or a dark/scrolly variant silently stays default.
  A shared token module + a grep-guard test (no raw `#2171b5` outside the token) mitigates drift.
- **Perceptual-space dependency**: `houseRamp` needs OKLCH/HSLuv math; if no dep is available, a
  hand-rolled sRGB→OKLab conversion (small, well-specified) keeps it dependency-free.
