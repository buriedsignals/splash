# Beat — Germany's electricity generation fell as coal and nuclear losses outpaced renewable growth, 2010–2023

**Proves:** between 2010 and 2023, Germany's total electricity generation *fell* by 117.49 TWh
overall — not because renewables failed to grow (wind, solar and bioenergy together added 171.24
TWh; 171.40 as drawn, with the 0.16 TWh `Other renewables` column merged into Bioenergy; 171.69
counting hydropower's +0.29), but because coal and nuclear together lost 271.45 TWh — **1.58× the
whole renewable gain**, 1.59× the wind-solar-bioenergy trio alone. The popular "renewables replaced
fossil fuels" framing undersells what actually happened: generation shrank, net, even as the clean
sources grew.

*(Correction, 2026-08-09: this paragraph read "**more than twice as much as renewables gained**"
and attached **171.69** to "wind, solar and bioenergy". Recomputed from this beat's own `data.csv`
rather than retyped: coal −138.11 + nuclear −133.34 = −271.45; wind +101.99 + solar +51.91 +
bioenergy +17.34 = **171.24**, +0.16 for `Other renewables` = 171.40 as the bridge draws it, +0.29
for hydropower = **171.69**, which is all renewables and not the trio. 271.45 ÷ 171.69 = **1.5810**;
÷ 171.24 = **1.5852**. On no denominator does it reach 2, so "more than twice" was wrong on the
beat's own stated proof. Nothing rendered changes — the video's title says "outpaced", which the
1.58× supports, and its three drawn totals reproduce exactly.)*

**Medium / genre:** chart / video. **Type:** waterfall (bridge) — one opening total bar (2010), one
closing total bar (2023), and eight signed steps in between, each a source's generation delta
between the two years. Bars float from the previous running total; connectors link each bar's end
to the next bar's start; category order is thematic story order (renewables first, then the fossil
and nuclear sources that outweighed them) — never resorted by magnitude.

## Data

- Source: Our World in Data, `electricity-mix` grapher (the slug `electricity-prod-source-stacked`
  named in the trap doc has since 301-redirected to `electricity-mix` — confirmed live by following
  the redirect, not assumed; both are Our World in Data's own URLs). Underlying attribution per the
  grapher's own metadata: Ember (2026), Pinto et al. (2023), Energy Institute – Statistical Review
  of World Energy (2026), "with major processing by Our World in Data."
- Fetched: `https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv?country=~DEU&csvType=filtered`
  (redirects to `electricity-mix.csv?frequency=annual&metric=by_source&source=total&country=%7EDEU&csvType=filtered`)
  — verified effective: **36 rows, one distinct entity (`Germany`)**, years 1990–2025. `csvType=filtered`
  was present from the start of the fetch, so the CSV-filter trap this doc warns about did not bite
  here — checked anyway, per the rule ("always verify by counting rows and checking distinct
  entities," not by trusting the parameter alone).
- `data.csv`: the frozen, unedited fetch — all 36 years, nine source columns (`Other renewables`,
  `Bioenergy`, `Solar`, `Wind`, `Hydropower`, `Nuclear`, `Gas`, `Oil`, `Coal`), all in TWh. The beat
  draws only the **2010** and **2023** rows; 2023 is the latest year with a complete comparison
  window that reads cleanly as "since the Energiewende accelerated" (2024/2025 rows exist in the
  frozen file but are not drawn).

## Exact values — verified 2026-08-09 (TWh, Germany, `data.csv` rows for 2010 and 2023)

| Source | 2010 | 2023 | Delta |
| --- | --- | --- | --- |
| Other renewables | 0.03 | 0.19 | +0.16 |
| Bioenergy | 33.92 | 51.26 | +17.34 |
| Solar | 11.96 | 63.87 | +51.91 |
| Wind | 38.55 | 140.54 | +101.99 |
| Hydropower | 20.95 | 21.24 | +0.29 |
| Nuclear | 140.56 | 7.22 | −133.34 |
| Gas | 88.76 | 76.66 | −12.10 |
| Oil | 26.59 | 20.96 | −5.63 |
| Coal | 262.89 | 124.78 | −138.11 |
| **Total (sum of all nine columns)** | **624.21** | **506.72** | **−117.49** |

`Other renewables` is folded into `Bioenergy` for the drawn bridge (0.16 TWh on its own is too
small to read as its own bar at this scale; the type doctrine allows merging tiny categories "if the
merge still sums correctly" — verified below). The eight drawn steps, in story order (renewables
first, then the fossil/nuclear sources that outweighed them), with the running total re-derived
step by step from the raw 2010 total:

| # | Category | Delta (TWh) | Running total after |
| --- | --- | --- | --- |
| — | **2010 (opening total, full bar from zero)** | — | **624.21** |
| 1 | Bioenergy *(incl. other renewables)* | +17.50 | 641.71 |
| 2 | Solar | +51.91 | 693.62 |
| 3 | Wind | +101.99 | 795.61 |
| 4 | Hydropower | +0.29 | 795.90 |
| 5 | Nuclear | −133.34 | 662.56 |
| 6 | Gas | −12.10 | 650.46 |
| 7 | Oil | −5.63 | 644.83 |
| 8 | Coal | −138.11 | 506.72 |
| — | **2023 (closing total, full bar from zero)** | — | **506.72** |

**Arithmetic replayed, per the type doctrine's explicit warning:** 624.21 + 17.50 + 51.91 + 101.99 +
0.29 − 133.34 − 12.10 − 5.63 − 138.11 = 506.72, which is exactly the real 2023 column sum (506.72,
computed independently above by summing 2023's nine raw columns). The two numbers match because
they're required to — `render.mjs`'s `readingsFromCsv` throws if the walked running total and the
independently-summed closing total disagree by more than 1e-6, so this is checked by the render
itself, not just by hand here. Renewables' combined gain (Bioenergy *as merged, 17.50* + Solar +
Wind + Hydropower = **+171.69**; the raw `Bioenergy` column alone puts it at 171.53, and the trio
without hydropower at 171.24) and the fossil/nuclear combined loss (Nuclear+Gas+Oil+Coal =
**−289.18**) net to exactly −117.49, confirming the headline claim.

## The motion problem

This type gets a real staged reveal, not a "maybe a build adds nothing" pass — the running total
walked step by step IS the argument. `establish` brings up the title, source and a three-swatch
legend (increase / decrease / total — a dumbbell only ever needs two hues, a waterfall needs three,
so the legend has to say which is which before any bar lands). `reference` draws the 2010 total as
a full bar from zero — it doubles as the reference the rest of the bridge is read against, per the
type doctrine ("first and last bars — the true totals — are drawn as full bars from zero"), and is
left alone long enough to be read (624.21 TWh) before anything else moves. `reveal` cascades the
eight steps left to right, one at a time, each floating from exactly where the previous one ended —
never resorted by magnitude, the CSV's own thematic column order (clean sources, then the sources
that outweighed them) is the story order. `subject` is the 2023 closing total, landing as its own
distinct full bar from zero — the confirmed takeaway is about this number, so it gets the type
doctrine's third emphasis channel (a wash + an ink outline, never a fourth hue — the increase/
decrease/total channel is already spent). `conclusion` states the one fact not yet on screen: the
net change, "−117.49 TWh net" — this is not a repeat of the title's sentence, it's the precise
number the title only characterised qualitatively.

## Colour — three roles, and why the up/down pair is CVD-safe

The type doctrine requires three role colours (increase, decrease, total) where the increase/
decrease pair must not default to plain red/green (the pairing a deuteranope confuses most). This
beat uses the Okabe-Ito colour-universal-design palette's **blue** for increase and **vermillion**
for decrease — two of the eight colours Okabe & Ito (2008) specifically selected because they stay
mutually distinguishable under deuteranopia, protanopia and tritanopia, unlike a red/green pairing
which collapses under the two most common forms of CVD. This codebase already treats Okabe-Ito as
its reference safe palette (`twin-doctrine/references/visual-system.md` names "vermillion" by name
as a mark colour used elsewhere in this corpus).

- **Increase** — `#0072B2` (Okabe-Ito blue)
- **Decrease** — `#D55E00` (Okabe-Ito vermillion)
- **Total** — `#3D3D3D` (a neutral dark grey, deliberately off the blue/vermillion hue axis
  entirely, so it reads as "the anchor the bridge starts and ends on" rather than competing as a
  third signed colour)

Value labels never sit inside a bar's own fill — the type doctrine names this exact trap ("a label
drawn inside the bar in white... measured under 4:1 — a fail"), and `visual-system.md` independently
documents the same defect having shipped and been fixed on "waterfall's own value labels" before, by
name. This beat's value labels float just outside each bar's growing (currently-animating) edge, set
in `ink` — computed by `deriveFurniture` against the page ground, never inherited from the bar's own
role colour, so contrast never depends on which of the three role colours happens to be underneath.

## Anti-patterns for this case

- Category order is the CSV's own thematic column order (clean sources, then the sources that
  outweighed them) — never resorted by delta size. Coal (the single largest negative step) landing
  right before the closing total is a property of the *source data's own grouping*, not a choice to
  put the most dramatic bar last for effect.
- The value label for each step fades in early (within the first quarter of its own bar's local
  reveal window) and then rides the bar's growing tip as it extends, rather than gating on the last
  slice of the bar's growth — `visual-system.md` and `twin-chart-beat/references/types/diverging-bar.md`
  both name the opposite (gate-on-last-slice) as an already-shipped-and-fixed defect: "a label that
  only appears once a bar is fully grown is a label that's absent for most of the time the bar is on
  screen."
- The merged "Bioenergy" step is the only place in this beat where the drawn category isn't a raw
  CSV column — documented above, with the merge arithmetic shown, so a reader auditing the bridge
  against the raw `data.csv` can verify the merge itself, not just trust it.

## Source line

`Source: Ember & Energy Institute, via Our World in Data · TWh, 2010 vs 2023`
