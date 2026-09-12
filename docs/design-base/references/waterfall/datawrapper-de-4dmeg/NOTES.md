# Datawrapper — "How Alphabet's $402.8B in revenue became $132.2B in net income"

- url: https://www.datawrapper.de/_/4dmeg/
- archive: url-list (the chart's own published page, reached from Datawrapper Academy's gallery
  `https://www.datawrapper.de/academy/waterfall-chart-examples`, which was found by searching the
  form's own vocabulary; not a line of `~/Downloads/infoviz-source-urls-alive.txt`)
- readAs: the published chart page at 1440×900. `style.graphic.tag` is **`iframe`** 640×503 at
  `documentTop: 219`, `nearTheTop: true`, frame `https://datawrapper.dwcdn.net/4dmeg/1/`;
  `routes.pixel.measuredFrom: "graphic.png"`. **The graphic's type is `style.graphicFrame.type`**;
  `style.type` (Roboto 16/500 `Login`, Bitter 26/700) is datawrapper.de's own page furniture.

## What it is

An income-statement bridge: revenue → cost of revenue → operating expenses → **operating income** →
other income → **income before taxes** → income taxes → **net income**. Eight bars, four of them
absolute levels, drawn from a true zero baseline.

## What it does with information

**Three roles, three fills, and the total's fill is a neutral rather than a hue.** Decreases are
`#E57A62` at 4.444 %, the single increase is `#9AC9AC` at 0.404 %, and the four absolute bars are
`#4A606C` at **12.196 %** — a reading the pixel route files under *neutral*, not chromatic. The
totals are the largest painted area in the chart and they are deliberately the least colourful
thing in it.

**The category label's weight repeats the role.** In `graphicFrame.type`, Roboto 13/400 carries 24
runs (`Cost of revenue`, the step names) and Roboto 13/700 carries 4 (`Revenue`, and the three other
subtotals). A reader who cannot separate the fills still gets the structure from the type.

**Every delta is signed and sits outside its bar, in the bar's own colour.** `−$162.5B`, `−$111.3B`,
`+$29.8B` below or above the growing edge; the four totals are labelled `$402.8B`, `$129B`,
`$158.8B`, `$132.2B` in black above the bar. Two label systems, two inks, no label ever painted on
a fill.

**A mid-sequence subtotal is drawn as a full bar from zero.** `Operating income` and `Income before
taxes` are not floating — they restate the running level, which is what makes the arithmetic
checkable by eye: revenue minus two costs must land on the top of the operating-income bar.

**Two annotations in ink explain what a delta cannot.** `Includes a ~$24B one-time gain on
investment sales` with a curved leader into the green step, and `17% effective tax rate` sitting
above the tax step — the second is a *derived* reading the bars do not contain.

## What it does with style

Ground `#FFFFFF` at **75.46 %**; palette read as **diverging**. Beyond the three role fills, the
chromatic tail is antialiasing (`#C15B46` 0.040 %, `#7B473C` 0.028 %) plus Datawrapper's link blue
`#0289CD` at 0.016 % in the source line. Furniture: `#000000` 1.031 % and `#181818` 0.704 % (ink),
`#F3F3F3` 0.854 % and `#EBEBEB` 0.453 % (gridlines).

Type inside the frame is Roboto throughout: 22/700 title (`How Alphabet's $402.8B in revenue became
$132.2B in net income`), 15/400 subtitle (`Alphabet Inc. (GOOGL) income statement, full year 2025,
in USD`), 13/400 and 13/700 labels, 11/400 source in `rgb(136, 136, 136)`.

**The title is the finding, in the units the bars are in.** It names both end totals, so the chart's
one sentence is legible before a single bar is read.

## What is transferable

- **Give the absolute totals a neutral fill and the deltas the only two hues.** Colour then means
  *change*, and the levels stay quiet even though they are the biggest shapes on the plate.
- **Bold the subtotal's category label.** The role is then encoded twice, once in fill and once in
  type weight, and neither carries it alone.
- **Signed labels outside the bar in the bar's own colour; total labels in ink above.**
- **Restate the running level as a full bar wherever the reader is meant to check the arithmetic.**
- **A title that names both end totals** turns a bridge into a sentence.

## What was not verified

The arithmetic was not replayed against a data table — the printed deltas and totals are internally
consistent to the eye (402.8 − 162.5 − 111.3 = 129.0; 129.0 + 29.8 = 158.8; 158.8 − 26.7 = 132.1 vs
a printed 132.2, a rounding difference of 0.1), but the underlying figures were not fetched from
Yahoo! Finance. Hover, tooltip and the chart's mobile layout were not read. One publication.
