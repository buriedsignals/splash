# Al Jazeera / AJLabs — a history of US government shutdowns

- url: https://www.aljazeera.com/news/2025/10/1/a-history-of-us-government-shutdowns-every-closure-and-how-long-it-lasted
- archive: url-list
- type: **duration bars with the span in the row label**, plus a right-hand gutter in which the
  presidency IS a positioned span merged across the rows it covers
- export: static (an `img 770 × 1078` at `documentTop 2134`, `nearTheTop: false`)
- readAs: the published page at 1440 × 900. A OneTrust consent dialog was dismissed first
  (`#onetrust-accept-btn-handler`), recorded in the reference. Both routes `ok`; the pixel route
  measured `graphic.png` — **and that clip carries Al Jazeera's masthead across its top**, see the
  last section.

## What it is

Twenty rows, one per shutdown, 1976 → 2019. The bar length is days; the axis runs `0 days` to
`30 days`. To the right of the plot, a separate column names the president, drawn as a solid block
in party colour spanning **all the rows of that presidency at once** — Carter's block covers five
shutdown rows, Reagan's eight, and Ford's, Bush's, Clinton's, Obama's and Trump's cover one or two
each.

## What it does with information

**The row label is the span, written out in full: `Sep 30, 1976 – Oct 11, 1976`.** This is the
disambiguation the type reference calls load-bearing, solved without a caption. A reader who might
otherwise read bar length as a magnitude has both endpoints in front of them on every single row, in
the same size and weight as any other row label. The bar then only has to rank the durations.

**The presidency is a merged span, not a repeated label.** Rather than printing "Ronald Reagan" on
each of eight rows, the block runs the height of all eight and is labelled once at its top. That is
a gantt row for a coarser entity, laid alongside the fine rows, and it is why the plate can be read
two ways at once: which shutdowns were long, and whose administrations had them.

**Two-tone bars mark a change in the underlying regime, and an annotation says when and why.**
The legend distinguishes a light **Funding gap** from a dark **Shutdown**; every row up to 1979 is
light, every row from 1981 down is dark; a dashed rule sits at the boundary and the note beside it
reads *"The US Attorney General ruled in 1980 that federal agencies must stop operating if they
don't get funding"*. **The encoding change is dated and explained rather than left to the legend.**

**The GAP between spans is named.** A second dashed rule between the 1995–96 row and the 2013 row
carries *"The US government went 16 years without a shutdown"*. Nothing is drawn there — that is the
point. On a chart of durations the empty stretch is invisible, so the desk wrote it in. For a beat
whose subject is spans, the silence between them is usually the story and almost never gets ink.

**The ordering is chronological, top to bottom, and never re-sorted by length.** The longest bar is
last because it is most recent. The chart is a history, and the ordering says so.

## What it does with style

Measured on the 829 290-px clip. Ground `#FFFFFF` at **72.102 %**. The two bar tones are neutral:
`#B9C3D3` at **2.512 %** (funding gap) and `#262E36` at **3.593 %** (shutdown), with `#B6C3D3`
**0.587 %**, `#CCD5E2` **0.446 %** and `#292D33` **0.353 %** as their edges. The colour on the plate
is the president gutter: `#B23A47` at **5.417 %** and `#335A96` at **3.927 %**, tails `#B33A49`
**0.565 %**, `#AE3C44` **0.111 %**, `#335A99` **0.090 %**, `#AD3C49` **0.082 %**, `#A2434D`
**0.065 %**, `#3A598B` **0.063 %**, `#FFD1D3` **0.043 %**. Two hue clusters, 354° at **6.398 %** and
216° at **4.225 %**; `shape: diverging`, `ramped: 2`.

**Which is the most quotable number here: the data bars are grey and the METADATA is in colour.**
The subject of the chart — how long each shutdown lasted — is drawn in two neutrals, and the only
saturated ink on the plate belongs to the column that says whose presidency it was. That is a
deliberate inversion of the usual budget, and it works because the party reading is categorical and
the duration reading is ordinal: the eye ranks the grey bars by length and picks the political
pattern out of the colour beside them without the two competing.

Furniture: `#F4F4F4` **0.675 %**, `#EBEBEC` **0.488 %**, `#E4E4E4` **0.338 %**, `#DBDBDB`
**0.285 %** — the gridlines at 5-day intervals and the legend swatches.

## What is transferable

- **Write both dates in the row label** when the bar is a duration. It costs a gutter and it removes
  the form's characteristic misreading entirely.
- **Merge a coarser entity's span across the rows it covers**, labelled once, in a gutter beside the
  plot.
- **Date the moment the encoding changes and say why**, on the plate, with a rule at the boundary.
- **Annotate the gap.** An empty stretch between spans is a finding and has no mark of its own.
- **Grey the data and colour the metadata** when the data reading is ordinal and the metadata
  reading is categorical.

## What was not verified

**The clip is contaminated at the top by the site's own masthead.** Al Jazeera's header — the orange
logo and the white nav row — is painted across roughly the first 120 px of `graphic.png`, over the
graphic's own title. `#FA9000` at **0.426 %** in the chromatic list is that logo and **is not a chart
colour**; the white nav strip is inside the `#FFFFFF` 72.1 % figure, so the true ground share is a
little lower than stated. The chart's own colours (`#B23A47`, `#335A96`, `#262E36`, `#B9C3D3`) are
far enough from the masthead's to be safe, but this is `METHOD.md` correction 15 happening again and
it is recorded rather than quietly averaged away.

The graphic is a raster, so **the chart's own typography was not measured**. `style.type` on this
record — Roboto and Georgia at Al Jazeera's article sizes — is the publisher's page furniture and
not the chart's. The presidency blocks' exact row extents were read off the picture. One
publication.
