# Vega-Lite — *Diverging Stacked Bar Chart (with Neutral Parts)*

- url: `https://vega.github.io/vega-lite/examples/bar_diverging_stack_transform.html`
- archive: `search`
- harvested: 2026-09-08, browser, no consent dialog, no entry screen
- what was actually looked at: `graphic.png` — the `<svg>` the page draws, 543 × 202 at
  `documentTop` 236, `nearTheTop: true`. Not a screenshot of the whole page, not a `<meta>` image.

## What it is

A **specimen**, not a published news graphic: the Vega-Lite example gallery's own worked instance of
this form, one chart on a documentation page above the JSON that produces it. It is the reference
implementation the Vega/UW Interactive Data Lab publishes for the type, and it is drawn with Vega's
default theme, so what it shows is the form's *canonical* apparatus rather than one desk's house
style.

Eight rows, `Question 1` … `Question 8`. Five response levels, named in a legend titled `Response`:
Strongly disagree, Disagree, Neither agree nor disagree, Agree, Strongly agree.

## What it does with information

- Segments grow outward from a shared centre; the neutral level **straddles** the zero, half of it
  laid to each side, so the centre falls inside the neutral block rather than at one of its edges.
- Rows keep the order the data gives them — `Question 1` to `Question 8`, not re-sorted by result —
  so a reader can find the same row in the same place across the set. Row 8 is 100 % `Strongly
  agree` and is drawn entirely to the right of zero; it is not moved to an end.
- The x axis is titled `Percentage` and is **signed**: its ticks run `−40 −20 0 20 40 60 80 100`.
  A bar reaching −40 is 40 % of respondents, not a negative quantity. The record's own type sample
  for the 10 px sans is `−40`, so this is measured, not inferred.
- One legend, at the right, naming every level once. No per-row legend, no in-segment numbers.
- No value labels at all: the reading is positional, and the axis carries the arithmetic.

## What it does with style

Read from `record.pixel`, whose `routes.pixel.measuredFrom` is `graphic.png`:

- ground `#FFFFFF` at **65.408 %**; `pixel.shape` is reported as **`diverging`**.
- the five fills, in the order the ramp runs from one end to the other:
  `#C30D24` (1.617 %) → `#F3A583` (1.798 %) → `#CCCCCC` (3.318 %, filed under *neutral*, not
  chromatic) → `#94C6DA` (14.418 %) → `#1770AB` (7.230 %).
  Deep at the two ends, pale beside the centre, achromatic grey on the neutral. Two ramps, one per
  side, meeting at a grey that belongs to neither.
- `#94C6DA` at 14.418 % is the largest painted colour in the chart — this data agrees far more than
  it disagrees, and the palette lets that read as a mass before any label is read.
- furniture is `#DDDDDD` gridlines (1 stroke in `style.marks`) and near-black text.

Type: `record.style.typeSource` is **"the page, which contains the graphic — the two are not
separated"**, so the families below are the documentation page's and the chart's mixed together.
What can be attributed to the chart is only what the samples name: tick labels `sans-serif 10/400`
(sample `−40`) and axis titles `sans-serif 11/700` (sample `Percentage`). The `Helvetica Neue` and
`monospace` families in the record are the docs page — its nav, its heading, its JSON block.

## What is transferable

- **The ramp deepens outward.** Lightest shade adjacent to the centre, deepest at the extreme, one
  ramp per side. Strength of opinion reads as colour intensity as well as as distance, which is the
  whole reason to prefer this over a plain stacked bar.
- **The neutral is a third thing.** Achromatic grey, belonging to neither ramp, and *straddled*
  across the zero rather than pushed to one side — so "which way does this row lean" is answered by
  which side is longer, with the undecided mass symmetric about the anchor.
- **One legend, naming every level once**, off the bars.
- **Rows are not re-sorted by result.**

## What was not verified

- The graphic's own type. The record says the page and the graphic are not separated, so no type
  tuple here is provably the chart's except where the *sample string* is chart content.
- Whether the neutral straddle is exactly half-and-half. It is what the picture shows and what the
  example's title ("with Neutral Parts") claims; the arithmetic was not checked against the spec.
- Contrast of anything against anything: no in-segment labels exist here to measure.
- This is a **tool's own example**. It proves the form's canonical apparatus and it does **not**
  prove that any newsroom draws it this way. Nothing here should be cited as newsroom practice.
