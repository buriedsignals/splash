# ONS — disabled vs non-disabled adults, fifteen categories and an error bar on every one

- url: https://www.ons.gov.uk/visualisations/dvc847/fig4/index.html
- archive: search
- type: horizontal grouped bar — 2 series (non-disabled, disabled) × 15 categories, with confidence
  intervals drawn on every bar
- export: live SVG, 700 × 579, at `documentTop` 0, `nearTheTop: true`
- readAs: `graphic.png`, the chart's own SVG including its legend. Both routes `ok`;
  `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the page, which contains
  the graphic — the two are not separated"**; as with the other ONS permalink the page is the chart
  and nothing else. `consent: null`.

## What it is

An ONS Opinions and Lifestyle Survey figure: the share of adults aged 16 and above reporting each of
fifteen effects of the coronavirus pandemic, split by whether they are disabled. It is the same
design system as `dvc2203` pushed to five times the category count.

## What it does with information

**It is the picket fence, and it survives by going horizontal and dropping the value labels.** At
fifteen categories × two series the type's own guidance says stop; this figure does not stop, and
what it gives up to stay readable is instructive. Horizontal bars mean the category labels are
horizontal type of any length (`Spending too much time with others in household`) instead of
rotated stubs, and the thirty values are read off a single bottom axis instead of thirty printed
numbers. Where `dvc2203` labelled four pairs directly, this one labels none.

**Every bar carries a confidence interval as a black whisker through its cap.** That is what the
absent value labels are traded for: a printed number invites a precision the survey does not have,
and the whisker states the uncertainty in the same visual grammar as the length it qualifies. On
several rows (`Feeling like a burden on others`) the two intervals do not overlap, and on several
others (`Strain on my personal relationships`) they do — the chart is legible as "which of these
differences are real", which no bare pair of bars could say.

**The categories are sorted by the disabled series, descending.** The blue bars fall monotonically
from `Feeling worried about the future` to `Other*`; the grey bars do not. Sorting by the series
that carries the argument, not by the reference series and not alphabetically, is what makes fifteen
rows scannable at all.

**The legend is above the plot, left-aligned, in the same top-to-bottom order as the bars.** Grey
`Non-disabled adults aged 16 and above` first, blue `Disabled adults aged 16 and above` second;
grey on top of blue in every one of the fifteen groups. Same rule as `dvc2203`, same order.

**The axis is a bare `0 … 80` with faint gridlines and a single `%` under its right end** — the unit
named once, in one character, at the point the eye leaves the axis.

## What it does with style

**Style route (the live DOM).** `marks`: `fill rgb(170, 170, 170)` × **15** and
`fill rgb(32, 96, 149)` × **15** — fifteen categories × two series. Type is `Open Sans`, two tuples:

| tuple | count | sample | colours |
| --- | ---: | --- | --- |
| Open Sans 12 / 400 | 35 | `Non-disabled adults aged 16 and above` | `rgb(0,0,0)` |
| Open Sans 16 / 700 | 1 | `Source: Office for National Statistics – Opinions and Lifest…` | `rgb(50,49,50)` |

**One type tuple for the entire chart.** Legend, category labels and axis ticks are all 12/400 black
— no bold value labels here, because there are no value labels. And again the source line is *larger*
than anything in the chart (16/700 against 12/400): the provenance is set as the loudest text on the
plate, which is a house rule visible on both ONS figures.

**Pixel route (`graphic.png`).** Ground `#FFFFFF` at **72.857 %**. Chromatic `#3670A0` at
**10.747 %** (207°), then `#336D9D` 0.318 %, `#86A3BA` 0.246 %, `#9BB7CF` 0.169 %. Neutrals
`#B3B3B3` at **9.345 %**, `#F3F3F3` 0.570 %, `#E5E5E5` 0.488 %, `#DADADA` 0.486 %. Shape
**sequential**, one cluster at 207° (11.703 %, 24 members).

**The two routes disagree about the blue, and the disagreement is recorded rather than resolved.**
The DOM declares `rgb(32, 96, 149)` = `#206095`, the same value `dvc2203` declares and the same
value `dvc2203`'s pixels return. Here the pixels return `#3670A0` — lighter and greyer. Fifteen
thin bars crossed by black whiskers and set against gridlines give the modal sampled hex a good deal
to blend with, and the greys shift the same way (`rgb(170,170,170)` declared, `#B3B3B3` measured).
**The authored colour is the DOM's; the pixel figure is a blend and should not be quoted as a house
value.** This is the useful counter-example to the corpus's habit of quoting `record.pixel`: on a
dense plate the modal pixel is not the authored ink.

**And these two ONS records do NOT agree exactly**, which matters given the arithmetic guard: the
grounds are 76.990 % and 72.857 %, the blues 10.195 % and 10.747 %, the greys 7.869 % and 9.345 %.
Two figures from one design system, not one ink layer photographed twice.

## What is transferable

- **Past a handful of categories, go horizontal and stop printing values.** Long category names stay
  horizontal; thirty numbers would be noise.
- **Trade the value label for an interval.** Where the number is an estimate, a whisker says more
  than a printed figure and says it in the geometry's own language.
- **Sort the categories by the series that carries the argument.**
- **Name the unit once, as a single character at the end of the axis.**
- **Set the source line as the largest type on the plate** if provenance is meant to be read.

## What is this piece's own

The ONS house blue and grey pairing, and the fifteen ONS survey categories.

## What was not verified

The figure's own title — the SVG begins with its legend at `documentTop` 0, so any title lives in
the parent article and was not read. Interactive behaviour (read at rest). What the `*` footnote
markers on four categories refer to. Whether the whiskers are 95 % intervals — the chart does not
say so within the clip.
