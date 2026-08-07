# Defect — a saturated house ground is refused at produce over a backdrop that cannot occur (2026-08-07) — CLOSED

Found while proving the newsroom charter's GROUND axis on a render (branch
`fix/charter-ground-proof`). Not fixed here: the change is to an a11y guard's model, which is a
decision, not a repair.

## What was measured

A newsroom declares `theme: "#0A5C36"` (a green) or `theme: "#F2C6D6"` (a pink) in
`NEWSROOM-PROFILE.md`. The loop assembles a correct config — `themeBg` and `mapStyle` arrive, the
engine's own `mapNativeConfigErrors` is empty — and `produce` then **refuses the run**:

```
#0A5C36 → engine-failed: [produce map] CONFORMANCE VIOLATION — refusing to produce:
            ✗ text colour #e1c7c4 contrast 3.26:1 on #36795a < 4.5:1
#F2C6D6 → engine-failed: [produce map] CONFORMANCE VIOLATION — refusing to produce:
            ✗ text colour #523d3b contrast 4.40:1 on #c6a2af < 4.5:1
```

Measured live through `lib/loop/produce.ts` with a `Decor.house` carrying each theme, on a
`map-native` / `choropleth` / `static` element.

## Why the refusal is wrong on these two grounds

`furnitureGround` (`skills/map-native/src/core/map-produce-conformance.ts`) composites the
translucent pill over **both black and white** and keeps whichever leaves the muted text less
headroom. For a saturated ground the black extreme dominates and darkens the pill far below
anything the render produces:

| ground | pill | guard's backdrop (over black) | muted vs guard | muted vs the REAL basemap |
|---|---|---|---|---|
| `#0A5C36` | `rgba(10,92,54,0.82)` | `#36795a` | **3.26:1 → refused** | `#0b4e2f` → **6.14:1** |
| `#F2C6D6` | `rgba(242,198,214,0.82)` | `#c6a2af` | **4.40:1 → refused** | `#f3cfdc` → **7.07:1** |
| `#18181B` (dark preset) | `rgba(24,24,27,0.82)` | `#424244` | 5.67:1 | `#161619` → 10.21:1 |
| `#F7D9E3` (pale pink) | `rgba(247,217,227,0.82)` | `#cbb2ba` | 4.85:1 | `#f7dee7` → 7.56:1 |

The black extreme is not a basemap this config can render. `mergeProfileDefaults` snaps the ground
to one of MapTiler's two basemaps by luminance, and the very same function that composites over
black has already resolved which one (`dark`, three lines above). A light ground pins
`dataviz-light`; the pill never sits on black there. `furnitureGround`'s own header states the
intent — *"Measuring the composite is what makes the guard's answer the render's"* — and on a
saturated ground its answer is not the render's.

The guard is not simply too strict everywhere: `#717171`, a genuinely illegible mid-grey, is
correctly refused, and the pale-pink `#F7D9E3` used by the render proof passes at 4.85:1. It is
the SATURATED band that fails — and a saturated house colour is what a newsroom with a charter
usually has.

## What is NOT in question

The ground itself arrives, and it is proven on pixels for the grounds that clear the guard —
`lib/loop/house-ground-e2e.test.ts` renders the dark preset, an arbitrary dark navy and an
arbitrary light pink, and samples the title and source pills off the delivered PNG. The delivery
break that sat in front of all of them (`snap-theme.mjs` writing `theme.png` into the produce
outDir) is closed on the same branch.

## How it was closed (2026-08-07, branch `fix/house-ground-choice`)

Measured before and after, with the newsroom hue `#d5121e` threaded exactly as the engine threads
it (the muted furniture is tinted toward it, so an untinted measurement is not the render's):

| ground | basemap it pins | pill the guard measured on | muted BEFORE | pill now | muted AFTER | verdict |
|---|---|---|---|---|---|---|
| `#0A5C36` | `dataviz-dark` | `#36795a` (over WHITE) | 3.26:1 REFUSED | `#16593a` | **5.22:1** | produced |
| `#F2C6D6` | `dataviz-light` | `#c6a2af` (over BLACK) | 4.40:1 REFUSED | `#e9c5d2` | **6.40:1** | produced |
| `#717171` | `dataviz-dark` | `#8b8b8b` (over WHITE) | 2.55:1 REFUSED | `#6b6b6b` | **4.38:1** | still refused |

(The table above said "over black" for `#0A5C36`; the arithmetic says over WHITE — `rgba(10,92,54,.82)`
over black is `#084b2c`. The mechanism is unchanged: the guard kept whichever pole left LESS headroom,
and that is always the pole the ground's own basemap rules out.)

Five things changed, in the order they matter:

1. **The measurement.** `lib/core/ground.ts` composites the pill over the pinned basemap's own
   harshest area colour — `#4D4D4D` on `dataviz-dark`, `#C1C2C2` on `dataviz-light`, both reduced
   from the shipped MapTiler style JSONs (fetched 2026-08-07) over every background/fill/line
   layer. A render sampled at the same time puts `#141414`/`#292929` and `#E0E0E1`/`#F7F7F7` under
   the bands, well inside those bounds, so the guard stays conservative. `furnitureGround` now
   REQUIRES the basemap rather than guessing it.
2. **Compliance by construction.** The chart furniture's `muted` was a FIXED 30% blend toward the
   ground, and on `#0A5C36` it landed at 4.47:1 — so chart-native refused the same colour for a
   reason that was NOT a bad backdrop. It is now the largest blend the ground can carry, floored at
   15% so the role survives and a genuinely illegible ground still fails (`#717171` tops out at
   4.06:1, `#8A6D3B` at 4.01:1). Every ground that produced before is byte-identical — the walk
   only runs where the fixed value was already refused.
3. **The refusal became a question.** `lib/loop/ground.ts` puts it before anything is assembled:
   what happens to the text, a colour of the same shade that works, Splash's own ground, and the
   right to keep theirs. In the newsroom's language, with no ratio and no field name.
4. **"Keep mine anyway" is recorded**, on `run.ground`, against the colour it was given for — a
   newsroom that edits its profile afterwards is asked again. It reaches the producers as
   `groundAccepted`, which turns the furniture refusal into the review CONCERN the house HUE has
   always had (policy b), so the ground is kept and never silent.
5. **The charter stopped proposing what it could not defend.** `groundTheme` withholds a measured
   ground that fails and names a legible variant of the same shade in its notes.

Proven on pixels (`lib/loop/house-ground-e2e.test.ts`, `SPLASH_MAP_E2E=1`): `#0A5C36` renders its
title at `#f4f4f5` on the painted pill `#0c4f30` = **8.78:1** and its source line at `#e1c7c4` on
`#0f5233` = **5.79:1**, both read off the delivered PNG; `#717171` is refused, and produces only
after the decision is recorded.

Left alone: Datawrapper's two engines are exempt from the gate — they render on their own
plan-gated white and the ground never reaches them, which `lib/brain/eligibility.ts` already states
at the offer (the dark-ground exclusion and the light-ground limit both still say the true thing).
The VIDEO furniture path has no pill at all (a text-shadow instead, `MapFrame.tsx`), so this guard
does not speak for it — unchanged, and still owned by the render snaps.

## Why it was left open

Loosening a WCAG guard is a decision with a11y consequences and it belongs to Rémy, not to the
agent that found it. The shape of a fix, if one is wanted: composite the pill over the basemap
POLE the config actually pins (`dark ? a dark-basemap extreme : a light one`) rather than over
both absolute extremes — the `dark` boolean is already in scope at the call site
(`map-produce-conformance.ts`, `furnitureGround(furnitureBg, houseHue)`). The conservative half
that must survive any such change: a ground whose muted text cannot clear 4.5:1 on the basemap it
DOES pin must still fail loud.
