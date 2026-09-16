# Beat — Poland now outpaces Germany, but everyone is down from their own peak

**Type:** heatmap (matrix). **Medium/format:** chart / web. **Channel:** article web, ONE fluid
frame — the figure fills whatever container it is given, at any width, and its height follows from
the grid's own aspect ratio inside the window-fit clamp. It used to ship two pre-rendered rungs
(900px desktop / 375px narrow) under a 900px cap; see `Co2HeatmapWeb.tsx`'s own doc-comment for why
a rung is a cap and what replaced it.

## Claim

Poland's 2020s per-capita CO₂ emissions (7.8 t) now exceed Germany's (7.5 t) — and every one of
these eight European countries emits less, per person, in the 2020s than at its own historical
peak decade.

## Subject and accent

No single subject hue — a heatmap encodes the whole grid by value, per
`references/types/heatmap.md`. One sequential, single-hue ramp (pale teal `#4A9C8F` to a near-black
deep pole `#04241E`), luminance moving in one direction only, checked mechanically at build time
(`checkRampFloor`) rather than eyeballed. Rows (countries) ordered by their own 2020s value,
ascending, so the low-emitting cluster (Sweden, Switzerland) and the high-emitting cluster (Germany,
Poland) each read as a block. Columns (decades) stay chronological.

## Source

Global Carbon Budget 2025, via Our World in Data · `co-emissions-per-capita.csv`, 8 countries
(Switzerland, France, Germany, Poland, Sweden, United Kingdom, Italy, Norway), 1960–2024, decade
averages (2020s is a partial, 5-year average — stated in the subtitle, never presented as
equivalent to the other seven full-decade columns).

## What went wrong, caught by looking

Two real defects, both caught only by rendering and driving a real browser, neither by the code
compiling or the tests passing:

1. **A language leak.** The first cell-value formatter (`fr1`) replaced the decimal point with a
   comma — copied by habit from this project's French-language sibling beats — inside a beat whose
   title, source and alt text are all in English. `static-discipline.md`'s own rule names this
   exact defect class: "a language leak in the furniture is a defect even when every number is
   right." Caught by reading the hover tooltip text in a live browser (`7,8 t CO2 per capita`) and
   fixed to a plain decimal point.
2. **A layout collision.** The legend's own min/max labels landed 7px above the column-header row
   ("3.6" printed almost on top of "1970s") in the first desktop screenshot — the vertical gap
   between the legend block and the grid header was derived from a constant that didn't actually
   account for the legend's own two-line height. Fixed by deriving the grid's origin from the
   legend block's own measured bottom edge instead of a flat offset, then re-rendered and
   re-screenshotted to confirm the two rows no longer touch.
3. **The ramp's own pale end nearly vanished against the white ground before either of the above** —
   `checkRampFloor` (run at build time, not just eyeballed) threw before a single pixel was drawn:
   the initial pale tint measured 1.15:1 against white, far under the 3:1 shape floor
   `heatmap.md`'s accessibility-trap section names. Replaced with the palest single-hue stop that
   still clears 3:1 (`#4A9C8F`, 3.26:1), keeping the whole ramp monotonic.

## What driving a real browser confirmed

Hover over the Poland/2020s cell shows `Poland · 2020s (5 yrs): 7.8 t CO2 per capita` — the exact
figure, the partial-decade note, and nothing else moves. Tab from a blank focus reaches the first
cell (`Sweden, 1960s`) with an identical tooltip from focus alone — every cell is reachable with no
dependency on a mouse. Measured at 375 / 768 / 1400 / 1600 / 3440: the figure's own width equals
the document's at every one of them, with no horizontal overflow — at 375 the plot is 327px wide,
at 3440 it is 3392px, and the same single frame drew both. Two things shorten at 375 and at no
other width, each by one `@container` rule derived from the real strings: the decade headers become
`60s`…`20s` below a 302px plot (at 375 the full form left 0px between them), and the in-cell values
would drop below a 215px plot (they do not at 375 — 11px values in a ~30px cell).
With JavaScript disabled, the title, legend, grid, axis labels and all 56 in-cell values survive
unchanged — only the hover/tap/keyboard detail box is gone, exactly the degrade
`web-discipline.md` asks for.
