# Histogram

A histogram bins one continuous variable into contiguous intervals and draws a bar per bin
whose height is the count that landed there. It answers a question a bar chart cannot: not
"how big is each category" but "where does the mass of this variable sit, how spread out is it,
and does it have a long tail or a second hump." If the reader's question is about the shape of a
distribution — commute times, sale prices, ages — this is the type; if the question is "which of
these five things is biggest," it is not, and reaching for it anyway is the most common
misreading of the type.

Do not use it to compare categories. A histogram's bars touch because the bins are contiguous
slices of one continuum — remove the gap and a reader's eye reads it as one connected shape, not
as discrete things being ranked. The moment the x-axis is a set of labelled categories instead of
a numeric variable, this is a bar chart wearing a histogram's clothes, and the touching bars now
lie about contiguity that isn't there. Reach for a bar chart instead. Likewise, don't use a
histogram to compare two distributions precisely side by side — overlapping or stacked bars at
that density just occlude each other; small multiples (its own sheet) or a density curve reads
better for that job.

The one thing that goes wrong: bin width is a decision the histogram maker makes, invisibly, and
it can manufacture or erase a peak that isn't a property of the data at all. Too wide and a real
bimodal split disappears into one fat bar; too narrow and sampling noise starts looking like
structure. There is no universally correct width, but there is a floor and a ceiling worth
holding onto as sanity checks: fewer than about three bins can't show a shape at all (you have a
number, not a distribution), and more than about fifty is functionally noise, not a chart. A
useful working default when nothing else is dictating the choice is the value range divided into
about ten roughly-round bins — adjust from there once you've actually looked at the shape it
produces, don't ship the first guess unseen.

What the drawing needs: the x-axis is the continuous variable itself, in its real unit, with bin
edges markable on it — not bin index. Bar height is count (or frequency), and because it's a
length, the count axis has to start at zero — the same non-negotiable rule as any bar: halving a
bar's height by starting the axis partway up halves what the bar claims about how many
observations fell there. Bars are drawn edge-to-edge with no gap between adjacent bins. If the
story turns on a central tendency, mark the median or mean with its own line and label, sparingly
— one accent color, not the bar's own fill repeated as a second signal.

There's no separate accessibility trap specific to a histogram's geometry — it inherits the bar
family's baseline-zero rule and nothing about bins-as-cells changes the standard text-contrast
math. But the concrete failure worth knowing happened right here: a highlight color chosen
because it reads fine as a bar fill (Okabe-Ito vermillion, which clears every CVD test as a
*mark* color) measured at roughly 3.9:1 as *text* on a white ground — under the 4.5:1 floor body
text needs. The fix generalizes past this one chart: a color that's safe on a shape is not
automatically safe as a label. If the median gets a value label, render the label in ink and
reserve the accent color for the mark itself (the line, not the number next to it).

**Amendment, measured 2026-08-10 on `proof/static-carbon-footprint-spread`.** "Reserve the accent
for the line" holds only while the line can be SEEN in it. A histogram's median rule runs from the
top of the plot to the baseline, so on a right-skewed distribution it spends nearly its whole length
*inside the tallest bar* — and it is then measured against that bar's fill, not against the page.
Measured on the committed still: `#0B7A75` against the `#FFFFFF` page is 5.18:1 and against the
`#616161` bar it crosses for 97 % of its length is **1.20:1**. There is no ink that reads at 3:1
over both a white page and a mid-grey bar except a near-black one, so on this beat the median rule
is near-black and the beat takes no accent at all. Derive it — `marksUnder` then `inkThatReadsOver`,
`twin-chart-beat/scripts/annotation-ink.mjs` — rather than typing either colour. A rule a reader
cannot see was not carrying the accent either. The same arithmetic moves the median's LABEL: it
cannot be inked at all while it lies half on the page and half on a bar, so it is pushed clear of
every bar it would sit on and then inked against what is left.
