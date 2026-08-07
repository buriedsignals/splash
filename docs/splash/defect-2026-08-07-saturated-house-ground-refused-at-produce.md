# Defect — a saturated house ground is refused at produce over a backdrop that cannot occur (2026-08-07) — OPEN

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

## Why it was left open

Loosening a WCAG guard is a decision with a11y consequences and it belongs to Rémy, not to the
agent that found it. The shape of a fix, if one is wanted: composite the pill over the basemap
POLE the config actually pins (`dark ? a dark-basemap extreme : a light one`) rather than over
both absolute extremes — the `dark` boolean is already in scope at the call site
(`map-produce-conformance.ts`, `furnitureGround(furnitureBg, houseHue)`). The conservative half
that must survive any such change: a ground whose muted text cannot clear 4.5:1 on the basemap it
DOES pin must still fail loud.
