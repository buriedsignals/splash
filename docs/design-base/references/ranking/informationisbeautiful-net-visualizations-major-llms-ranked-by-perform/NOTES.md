# Information is Beautiful — "Major Large Language Models (LLMs), ranked by capabilities"

- url: https://informationisbeautiful.net/visualizations/major-llms-ranked-by-performance/
- archive: informationisbeautiful
- type: ~200-entry ranking scatter, searchable and filterable
- export: web
- readAs: the published graphic as the page serves it, read at rest in the 1440×900 screenshot. The
  graphic is embedded, so the **style route measured the page wrapper only** — its `IBM Plex Sans` /
  `Quicksand` tuples are informationisbeautiful.net's template, not the chart. See the style section
  for a second, arithmetic caveat on the pixel palette.

## What it is

Roughly two hundred language models plotted against release date, ranked vertically on an MMLU
score, sized by training parameters and coloured by producer. The subtitle states the encoding in
one line: "ranked by capabilities, sized by billion parameters used for training".

## What it does with information

**A long ranking carries a search field, and the search field sits in the graphic's own header.** A
`search…` input and a `show only: all` control are set on the same baseline as the colour legend,
right-aligned, above the plot. Not in a toolbar, not below, not in a modal — in the header block the
reader is already reading.

**The legend is the filter, and the piece says so.** Above the legend, in a small tracked caps line:
`CLICK LEGEND ITEMS TO FILTER`. Seven producer swatches — anthropic, chinese, google, meta, mistral,
openAI, other, xAI — each of which is both key and control. One row of ink doing two jobs, and an
instruction so it is not left to be discovered.

**The rank scale carries named thresholds, not just numbers.** Two dotted horizontal rules cross the
plot, each with a boxed label at the left margin: `89.8 = human expert` and `▲ 70+ IDEAL ▲`. A
position on the scale therefore reads against a *meaning* — above human expert, above ideal — rather
than only against its neighbours. In a ranking whose units are an arbitrary benchmark index, this is
what makes a number legible at all.

**Every point is labelled directly.** There is no hover-only identity: each model's name is set
beside its dot in the producer's colour. Identity never depends on the legend.

**And the top of the ranking is illegible at rest, which the piece answers with the search field
rather than by pretending otherwise.** The upper-right cluster — o3, Kimi K2 Thinking, GPT-5,
Gemini 3, Claude Opus 4.5 and a dozen more — is a solid mass of overlapping labels in the capture.
That is the honest state of a crowded ranking on a static frame, and the reason a long ranking needs
a *find* apparatus and not just a good layout.

## What it does with style

Ground `#FFFFFF` at **80.17 %** coverage (pixel route). The style route reports the page body as
`rgba(0, 0, 0, 0)` — transparent — so the ground is the pixel route's alone.

**The pixel route's chromatic palette on this record is not the graphic.** Seven `(hex, share)`
pairs — `#D4537A` 0.696 %, `#EAAB4A` 0.683 %, `#ECB445` 0.651 %, `#E69B53` 0.635 %, `#DE7B64`
0.630 %, `#E28B5B` 0.627 %, `#D65C76` 0.612 % — are **bit-identical across all four
informationisbeautiful.net records harvested in this wave**, and the three remaining entries in this
record's top ten are identical to the Marvel record's. They are the site's own pink-to-amber
"Learn to do data-viz" promotional banner, which spans the full width above every piece. Every
colour in this record's measured chromatic list belongs to the banner and none of it to the chart.
No hue is quoted from it here.

Read from the capture instead: the plot is seven distinct producer hues on white, with a dashed
grey trend line, dotted grey threshold rules and grey axis numerals.

## What is transferable

- **Put a search field in the graphic's own header** when the ranking is longer than a screen.
- **Make the legend the filter and label it as one.**
- **Draw named thresholds across a rank scale** so a position means something absolute.
- **Label every point directly**, so the legend carries only category, never identity.

## What is this piece's own

The subject's churn — a ranking that is re-published as models ship — and IIB's producer palette.
The crowding is also this piece's own: it plots two hundred entries at one scale because the shape
of the whole field is the story.

## What was not verified

The graphic's own typography, at any size: the style route never reached it. Every hue in the plot.
The search field's and legend filter's behaviour — nothing was typed or clicked. Whether the
diamond-versus-circle "open access" encoding is legible at the sizes used. Whether the two threshold
rules are drawn from stated sources.
