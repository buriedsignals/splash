# Eurostat — *Energy balance flow diagram* (EU-27, 2024)

## What it is

Eurostat's own energy-balance sankey tool: an application, not an article. `Imports 1 187 770 KTOE`,
`Production 550 850 KTOE` and two statistical adjustments flow into `Available from all sources`,
through `Transformation`, and out to `Final consumption`, `Exports`, `Transformation losses`,
`Marine bunkers`, `International aviation` and five more sinks. Twenty-odd nodes, one product
selection (`All products`), one year, one country selector.

**What was actually read — and this record has a real defect, stated here rather than in a
footnote.** The picker chose an `svg` at `x: 0, y: 0, w: 1440, h: 900` (`style.graphic`): the
application's SVG spans the entire viewport and lies *under* the site's own header and footer, so
photographing the element photographed the whole page. On top of that, the page opened its
**guided-tour modal** (`Introduction — Welcome to the tutorial of Eurostat's Sankey diagram`) with a
grey veil over everything, and its cookie bar was never dismissed — `record.consent` is `null`,
because Eurostat's `Accept all cookies` control is not a `<button>` the consent handler matches.

The **modal itself** was hidden by the harvester's floating-chrome pass before the picture was taken
(it is `position: fixed`), which is why `graphic.png` shows the diagram where `screenshot.png` shows
the dialog. **The veil was not**, because it is painted inside the same SVG the picker was
photographing.

So: the diagram **was reached and read** — the whole flow, every node, every label is legible in
`graphic.png`, and the description below is of the real thing. The **colour measurement is not the
diagram's** and is not used as such. This is METHOD correction 3 recurring, and correction 15's
point exactly: `measuredFrom: "graphic.png"` is true and is not sufficient.

## What it does with information

**The flow runs left to right and folds.** Rather than a fixed set of columns, the ribbons bend
through right angles with generous radii — a pipe network — and the layout wraps: `Transformation`
sits below and left of `Available from all sources`, and the outputs fan down and right. The form is
being used as a schematic of a process, not as a grid of stages.

**Direction is drawn, not implied.** Every ribbon ends in a solid black **arrowhead**, and every
source ribbon begins with a black chevron notch. `record.style.marks` holds `fill rgb(0, 0, 0)` ×13
against `stroke rgb(125, 128, 136)` ×12 — thirteen black caps for twelve grey pipes. In a diagram
that folds back on itself, left-to-right no longer means "downstream", so the arrowhead is load
bearing rather than decorative.

**Every node label is two lines: name, then value with unit.** `Imports` / `1 187 770 KTOE`.
`Transformation losses` / `222 154 KTOE`. The record carries **40 tuples** of `Arial | 10.6 | 400`
in `rgb(33, 37, 41)` — one register for all of them, no hierarchy by size, exactly as Carbon Brief
does it. The unit is repeated on **every** label rather than stated once, which is a defensible
choice for a tool whose unit the reader can change (`Kilotonnes of oil equivalent` is a control in
the header, set in `Arial 16 / 100` — a hairline weight, which is unusual and deliberate).

**The whole diagram is one neutral, because a filter is what carries colour.** With `All products`
selected, every ribbon is the same grey and the legend reads `Legend (top-down) — All products`.
Choosing a product is what introduces a hue. So this is a third answer to where colour goes in a
sankey — Ferdio puts it on the ribbon, Carbon Brief on the node, IEA on the source, and Eurostat
puts it **on the selection**: colour appears only when the reader has asked a question narrow enough
for it to mean something.

**Small flows are hairlines and are labelled.** `Stock build 4 347 KTOE`, `Statistical difference —
outflow 7 156 KTOE` are one-pixel lines, drawn and named, next to a `Final consumption` pipe two
hundred pixels thick.

## What it does with style

**The pixel reading is of the page, under a modal veil, and must not be quoted as the diagram's
palette.** For completeness, what `record.pixel` actually holds: ground `#999999` at **68.42 %** —
that is the grey veil over the white page, not a ground; `#14337C` at **6.82 %** and `#10244F` at
3.24 % — the Eurostat header and footer bars; neutrals `#515357` 8.01 %, `#929293` 5.45 %,
`#323232` 2.96 %. The reported shape `sequential` is a description of a dimmed screenshot. **None
of these is a design decision of the flow diagram**, and no downstream treatment should cite them.

What *can* honestly be said about its style comes from the style route and the eye:

- ribbons `stroke rgb(125, 128, 136)`, a mid grey, uniform across the diagram
  (`record.style.marks`);
- terminals `fill rgb(0, 0, 0)`;
- one text register for the diagram, `Arial 10.6 / 400` in `rgb(33, 37, 41)`, 40 occurrences;
- the application chrome is a different world — `Arial 28 / 700` white on the title bar, `arial 16`
  ×45 for controls, `Inter` for the EU cookie and site-identification strips — and `Helvetica Neue
  14 / 400` for the tutorial the diagram was photographed under.

The page's declared `style.ground` is `rgb(255, 255, 255)`; the `#999999` in the pixel record is the
veil.

## What is transferable

- **Put an arrowhead on a flow that changes direction.** As soon as the layout folds, position stops
  encoding sequence and something has to.
- **One text register for every node label, name over value with unit.** Confirms Carbon Brief
  independently: no size hierarchy among nodes, the bar does the ranking.
- **Repeat the unit on every label when the unit is a control the reader can change.**
- **Colour as a consequence of a filter, not a property of the diagram.** An unfiltered view in one
  neutral is honest about the fact that nothing has been asked yet; hue arrives with the question.
- **And a harvesting lesson worth more than any of them**: a graphic element that spans the whole
  viewport is not a graphic, it is a page, and photographing it produces a record that passes every
  guard while measuring a website.

## What was not verified

- **The diagram's palette, ground and any of its colours.** See above. The pixel route measured a
  dimmed page. Nothing chromatic in this record may be cited.
- **Conservation.** Every node's value is printed and none was added.
- **What the diagram looks like with a product selected.** The legend implies per-product hues; no
  control was operated, so the coloured state was never seen and the claim that hue arrives with the
  filter is read off the legend, not observed.
- **Interaction, tooltips, the zoom control.** Untouched.
- **Whether the tutorial modal appears on every visit.** It appeared on the one visit made. It was
  not re-harvested, because the veil is inside the photographed element and a second attempt would
  have produced the same contaminated reading by the same mechanism.
