# Areal Reveal Choreography — Design (sub-project A′)

> Cinematic per-region reveal for map-native areal story videos, by extracting the
> proven RouteReveal vocabulary into a shared core and applying it to the polygon
> archetype comps (Choropleth, Cartogram, HexGrid).

**Status:** design approved 2026-07-20. Branch `feat/areal-reveal-choreography`.
**Sub-project of:** "Integrate Tom's map-video technique into Splash to full potential."
**This is A′** (revised A). See *Context* for why the original A/B split was rewritten.

---

## Context — why this shape

Tom (Buried Signals) shipped an improved `map-animation/map-explainer` skill (on the
`origin/main` git ref). The ask was to integrate his technique into Splash "to full
potential." A grounded capability diff (Tom's `RiverReveal.tsx` + references vs our
`map-native` story engine) rewrote the naive plan:

- **Our `RouteReveal.tsx` is already a full, generalized, arguably-better port of Tom's
  entire RiverReveal beat** — electric head, `sliceBorder`, per-territory
  `border-draw → fill-bloom → label-rise` in seconds-from-trigger, HTML-overlay labels
  with rise/fade, complete clutter stripping (incl. admin-1). Plus config-driven,
  `brandHue`-themed, responsive, bounded-hang-safe (`continueWhenMapSettles`), and
  antimeridian-aware — none of which Tom has. **So "port Tom's flow reveal" is already done.**
- **The genuine gap is elsewhere:** the six archetype Story comps
  (Choropleth, Symbol, DotDensity, HexGrid, Cartogram, Locator) use a *different*
  mechanic — a **single global fill ramp** at "establish" + a beat-to-beat camera tour
  with static dim/highlight. No per-feature choreography. That is the "simplified" feel.
- **Fixed-plate camera (Tom's headline render-stability technique) has low proven payoff
  for us.** A render proof (symbol + choropleth Story MP4s, peak-pan frames inspected)
  showed our vector `DATAVIZ` basemap slides cleanly with per-frame `jumpTo`; the
  shimmer Tom fights is a satellite/hillshade effect. Fixed-plate is deferred to a
  separate, conditional spec (only pays off bundled with a satellite basemap option).

**Therefore A′ = propagate RouteReveal's own choreography to the areal archetype comps.**
It reuses code we already own and trust, rather than porting anything new from Tom.

### Scope decisions (locked with the user)

- **Both reveal modes** via a `revealMode: "context" | "sequential"` knob (editorial
  choice per story), default `context`.
- **Areal comps first:** Choropleth (proving ground), then Cartogram, then HexGrid.
  Point comps (Symbol / Locator / DotDensity) have a different entrance verb
  (circle-grow / stipple-in, not border-draw) → **their own follow-up spec** (A′-points).
- **Typography-agnostic labels IN this spec** (de-hardcode Space Grotesk via CSS vars).
- **Non-goals:** fixed-plate + satellite (separate conditional spec); sub-project B
  (any genuinely-new narrative capability beyond RouteReveal); point-comp choreography.

---

## Vocabulary — what changes on screen

Today (areal comps): global `fillReveal` ramp during the establish beat
(`story-timeline.ts` `cameraForFrame`/fill ramp; applied e.g. `ChoroplethStory.tsx`
`fill-opacity = fillReveal*0.9`), then each reveal beat applies a **static** highlight
stroke + an HTML callout.

After A′: when a reveal beat becomes active, its subject region performs a **3-phase
entrance**, timed in **real seconds from its own trigger** (never a fraction of a global
progress — this is the invariant our audit confirmed we already hold elsewhere):

```
border-draw (BORDER_S = 2.5s) → fill-bloom, opacity overshoot (FILL_S = 1.0s) → label-rise (LABEL_S = 0.7s)
```

This is byte-for-byte the RouteReveal envelope (`RouteReveal.tsx:145-147`, `:441-467`).

### The two modes (`revealMode`)

Same envelope; only the **base state** the entrance animates against differs:

- **`context` (default)** — all regions stay filled from establish (distribution context
  preserved). A region's entrance is a **spotlight**: its border draws on, a fill-bloom
  **pulse** (a transient overshoot **above** its base color that returns to base — never a
  drop to zero, or the region would blink), label rises. Replaces today's static highlight stroke.
- **`sequential`** — regions start **unlit** (no fill, or a dim base). A region **lights up
  from zero** when its beat arrives (border → fill 0→base → label), Tom-style. Others stay
  unlit until visited.

**Both modes read the same `stagedEntrance` output**; only how the fill value is *composited*
against the base differs (see the trigger model). `stagedEntrance.fillOpacity` is defined as
the canonical `0 → overshoot(target*1.25) → target` ramp; the two modes derive their applied
fill from it without the core needing to know the mode.

The suggester emits `revealMode` from narrative intent: distribution/comparison → `context`;
journey/progression/temporal-accumulation → `sequential`. Default `context` when unset.

---

## Architecture

### The structural move: extract RouteReveal's core, make RouteReveal consume it

RouteReveal currently holds the vocabulary inline. Extract three **pure** modules into
`skills/map-native/src/core/`, then refactor RouteReveal to import them. RouteReveal's
rendered output must stay **byte-identical** (parity is the extraction's correctness proof).

1. **`core/staged-reveal.ts`** — the timing envelope, pure:
   ```ts
   export const STAGED_BORDER_S = 2.5;
   export const STAGED_FILL_S = 1.0;
   export const STAGED_LABEL_S = 0.7;
   export interface StagedEntrance {
     borderProgress: number; // 0..1, eased  — how much of the border is drawn
     fillOpacity: number;    // eased with overshoot to `fillOpacity` target, settles
     labelReveal: number;    // 0..1, eased  — label rise/fade progress
   }
   // localSeconds = (frame - triggerFrame) / fps
   export function stagedEntrance(
     localSeconds: number,
     opts: { fillOpacity: number; borderS?: number; fillS?: number; labelS?: number },
   ): StagedEntrance;
   ```
   Body lifted verbatim from `RouteReveal.tsx:441-467` (border ease `interpolate(clamp01(lt/BORDER_S),…)`;
   fill overshoot `interpolate(fp,[0,0.6,1],[0,fillOpacity*1.25,fillOpacity],…)`; label
   `clamp01((lt-BORDER_S-FILL_S)/LABEL_S)`). Uses Remotion `interpolate`/`Easing` (already a dep).

2. **`core/border-slice.ts`** — `buildDraw(feature)` + `sliceBorder(draw, fromKm, toKm)`,
   moved verbatim from `RouteReveal.tsx:89` and `:101` (multi-segment cumulative-length
   slice → `MultiLineString`, `0.0008` km skip threshold). No behavior change.

3. **`core/label-anchor.ts`** — `poleOfInaccessibility(feature, opts?)`: grid-search of the
   most-interior point (Tom's `prep-geo.mjs` pole, ported to runtime with `@turf/turf`),
   `{ nudge?: [number, number] }` optional operator offset. Guarantees an **inside,
   edge-avoiding** anchor. Replaces `centroid`/`pointOnFeature` for areal callouts.
   ```ts
   export function poleOfInaccessibility(
     feature: Feature<Polygon | MultiPolygon>,
     opts?: { samples?: number; nudge?: [number, number] },
   ): [number, number]; // lng,lat, guaranteed inside the polygon
   ```

RouteReveal after refactor: imports `stagedEntrance` (replaces its inline `bp`/`fp`/`fo`/`lp`),
`buildDraw`/`sliceBorder` (replaces its local copies), and MAY adopt `poleOfInaccessibility`
for territory anchors (currently `pointOnFeature` in `route-geo.ts` — upgrade is optional,
gated on render parity; if it shifts any label pixel it stays `pointOnFeature` for parity
and the pole upgrade is a separate follow-up).

### The trigger model (no new beat plumbing)

Each reveal beat already carries what we need (`map-story.ts:10-14`):
`kind`, `camera`, `highlight: string[]`, `dim`, `callout: { region, name, value, text }`.
`buildTimeline` gives each beat a `startFrame`. So:

```
triggerFrameByRegion: Map<regionKey, number>   // regionKey (beat.highlight[0] / callout.region) → beat.startFrame
// per frame, per entered region R:
localSeconds = (frame - triggerFrameByRegion.get(R)) / fps
{ borderProgress, fillOpacity, labelReveal } = stagedEntrance(localSeconds, { fillOpacity: baseFor(R, mode) })
```

- **`context`**: every region renders at base fill for all frames. The subject's applied fill =
  `base + max(0, stagedEntrance.fillOpacity − base)` — i.e. only the transient overshoot **delta**
  (which is ≥0 only around the bloom peak) is added on top of base, returning to base as the ramp
  settles. The region never drops below base (no blink). Plus a drawn emphasis border on a
  dedicated line layer + label rise. Non-subject regions keep base fill.
- **`sequential`**: a region is "entered" only once `frame ≥ triggerFrame`; before that it renders
  unlit. Applied fill = `stagedEntrance.fillOpacity` directly (ramps 0 → overshoot → base).

The border-draw phase feeds a **dedicated emphasis line source/layer** per comp (fed by
`sliceBorder(buildDraw(regionBorder), 0, total*borderProgress)`), separate from the fill —
so it composes over the existing choropleth fill without disturbing it.

---

## Per-comp application (geometry-honest)

The envelope has three phases; **each comp enables the phases its geometry supports.**

### Choropleth — proving ground (all three phases)
- Border-draw on the region's exterior rings (`buildDraw` from the region polygon), fill-bloom
  on `__highlight`/subject fill, label-rise via existing `CountryLabel` overlay.
- **Callout anchor switches from `centroid(mainlandFeature(f))` (`ChoroplethStory.tsx:222`) to
  `poleOfInaccessibility(mainlandFeature(f))`** — fixes the latent bug where a concave mainland
  centroid falls outside the polygon and drops the callout off-region.
- ✅ **VALIDATION CHECKPOINT — RESOLVED 2026-07-20 (KEEP border-draw).** The concern was that a
  per-region emphasis border drawing on *over its neighbors* might read as noisy/crawling on
  adjacent choropleth regions. Both modes were render-judged (real MP4s). On a landlocked subject
  with many neighbors (**Germany** — France/Poland/Czechia/Austria/…), the emphasis border draws
  as a **clean, distinct outline** that delineates the subject without noise, in both `context`
  and `sequential`. Coastal subjects (Norway/Sweden) draw their full coastline+islands cleanly
  (MultiPolygon rings all included). **Decision: keep the border-draw phase for Choropleth.**
  Plan 2 (Cartogram/HexGrid) inherits this: border-draw stays on for areal comps; the phase remains
  independently switchable per comp via the shared core, so a future comp that reads poorly can drop
  it by config without a rewrite.
- **Render-judged polish note (context mode, non-blocking, for follow-up):** the context-mode
  fill-bloom is a same-color opacity *delta* over the region's already-painted base fill, so on a
  top-bin (already-dark) region it is nearly imperceptible — the border-draw + label-rise carry the
  spotlight. Candidate refinement: make the context bloom a *lightness* shift (mix toward a brighter
  tint) so it reads across all bins. `sequential` mode is unaffected (there the bloom is the region's
  entire 0→base fill and reads fully).

### Cartogram — border-draw (cell outline) + fill-bloom + label-rise
- Cells (scaled polygons or grid squares): `buildDraw` on the cell outline, fill-bloom on the cell,
  label-rise where the comp labels. Callout anchor → `poleOfInaccessibility` (or cell center for
  uniform grid squares, which is trivially interior).

### HexGrid — border-draw (hex outline) + fill-bloom; label-rise only if callout
- Hexagons are uniform and HexGrid currently renders **no per-feature labels** (`text-field` = 0).
  Do **not** force labels. Entrance = hex-outline draw + fill-bloom; label-rise engages **only**
  when a `beat.callout` exists for the subject.

---

## Foundation fixes folded in (orthogonal, proven)

1. **Pole label anchors** on the areal comps (`core/label-anchor.ts`) — closes the
   `ChoroplethStory.tsx:222` centroid bug; applied to Cartogram/HexGrid callouts too.
2. **Clutter-strip completeness:**
   - Areal comps currently strip `type === "symbol"` only. Add admin-1 inner-border stripping
     (`/other border/i`), matching RouteReveal (`RouteReveal.tsx:270-271`) and Tom.
   - **Symbol & Locator strip nothing today** → basemap place labels double up under their own
     labels. Add the strip call. (Their *choreography* is a later spec; this 2-line strip fix is
     mechanical and proven, so it is folded in here.)
3. **Typography-agnostic labels** — `CountryLabel.tsx` hardcodes Space Grotesk. Replace with CSS
   custom-property indirection with a fallback (`var(--map-label-font, "Space Grotesk", …)`, and
   likewise weight/size/tracking/color/shadow, mirroring Tom's `CountryLabel`). Default output
   byte-identical (fallback = today's values); a newsroom profile can later set the vars. The
   newsroom-profile → CSS-var threading itself is out of scope; this spec only removes the hardcode.

---

## Testing & proof discipline

- **RouteReveal parity (gate):** after extraction, RouteReveal's rendered output is unchanged.
  Prove by unit-testing `stagedEntrance` against the old inline values at sampled `localSeconds`,
  and by a RouteReveal render still/snap match (the existing `snap-video` path already runs
  fail-hard in produce).
- **Per-comp render-proof (our "verify the delivered artifact" rule):** real MP4 + still for
  **Choropleth in BOTH modes**, then **Cartogram**, then **HexGrid**. Inspect: entrance timing,
  bloom overshoot-then-settle, label rise, and (Choropleth) the adjacency checkpoint. The
  pixel-blind `snap-video` check is necessary but **not sufficient** — a human/lens judgment on
  the actual MP4 is required (label churn and reveal feel are exactly what a blind check misses).
- **Unit tests:** `stagedEntrance` (phase boundaries, overshoot peak, monotonic label);
  `poleOfInaccessibility` (returns an **inside** point on concave/crescent + multipolygon fixtures
  where `centroid` falls outside — the regression that motivates it).
- **Determinism:** no clocks/random in core modules (harness rule); triggers derive from
  `beat.startFrame`.
- **Gate:** new tests live in existing `TEST_DIRS` (`skills/map-native`); no new gate line.
  Known env caveat: map-native video produce is slow/flaky under contention — render-proofs run
  in isolation, not in the gate.

---

## File plan (informative — the implementation plan will bite-size this)

**New**
- `skills/map-native/src/core/staged-reveal.ts` (+ test)
- `skills/map-native/src/core/border-slice.ts` (+ test)
- `skills/map-native/src/core/label-anchor.ts` (+ test)

**Modified**
- `skills/map-native/src/components/RouteReveal.tsx` — consume the three core modules (parity).
- `skills/map-native/src/components/ChoroplethStory.tsx` — trigger map, staged entrance, both
  modes, pole anchor, admin-1 strip.
- `skills/map-native/src/components/CartogramStory.tsx` — staged entrance (cell), both modes,
  pole/center anchor, admin-1 strip.
- `skills/map-native/src/components/HexGridStory.tsx` — staged entrance (hex, no forced label),
  both modes, admin-1 strip.
- `skills/map-native/src/components/SymbolStory.tsx`, `LocatorStory.tsx` — add clutter strip only.
- `skills/map-native/src/story-timeline.ts` or a new helper — `triggerFrameByRegion` builder.
- `skills/map-native/src/map-story.ts` (+ Cartogram/HexGrid story derivers) — carry `revealMode`.
- `skills/map-native/assets/CountryLabel.tsx` — CSS-var typography indirection.
- Suggester (`skills/suggest-chart` map path) — emit `revealMode` from narrative intent; default `context`.
- `skills/map-native` config schema/validation — accept `revealMode`.

---

## Global Constraints

- Runtime **Bun**; TypeScript; `bun:test`; TDD. No `any` introduced.
- Code / comments / identifiers / commits / branches in **English**. No Claude/Anthropic
  mention in any published artifact.
- **Light/default output byte-identical** where a fix is meant to be invisible (typography
  fallback, RouteReveal parity). Deliberate visual changes (the choreography itself) are the
  point and are render-proved, not asserted.
- Core modules **pure** (no clock/random); reuse existing engine helpers
  (`continueWhenMapSettles`, `lerpLongitude`, `MapFrame` furniture) — do not reinvent.
- **Feedback → system:** every render finding is fixed at the shared-core / SKILL / reference
  level so all areal types inherit it, not patched per comp.

## Open follow-ups (explicitly deferred)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- **A′-points:** Symbol / Locator / DotDensity entrance choreography (circle-grow overshoot,
  stipple-in) + their point-label declutter interaction.
- **Fixed-plate + satellite basemap** — conditional spec; only if a satellite/hillshade cinematic
  mode is wanted (per-frame `jumpTo` → CSS-plate transform across all camera comps + overlay
  re-projection). Low payoff on vector basemaps (render-proved).
- **Newsroom-profile → CSS-var typography threading** (this spec only removes the hardcode).
- **RouteReveal territory anchor → pole** upgrade (gated on render parity).
