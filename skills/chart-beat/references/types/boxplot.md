# Box plot

**Argues:** A box plot compresses a distribution into a five-number summary — minimum, first quartile, median, third quartile, maximum — and draws it as a box with whiskers, one per category.

A box plot compresses a distribution into a five-number summary — minimum, first quartile,
median, third quartile, maximum — and draws it as a box with whiskers, one per category. It
answers "how do these groups compare on centre, spread, and skew, in one glance across many
categories at once" — a job a histogram can't do past two or three groups, because two or three
histograms side by side is already a lot to hold in the eye, and ten is unreadable.

Do not reach for it when a group has few observations. A box built from five points draws the
same confident rectangle as one built from five thousand, and nothing in the shape communicates
which you're looking at — a reader has no way to tell "this is a real distribution" from "this is
five points wearing a distribution's costume." Show the n somewhere, or better, show the points
themselves (a strip or beeswarm) instead of summarizing them away. Don't reach for it either when
the underlying shape is multimodal — a box plot cannot show two humps; it will draw one
confident-looking box over data that actually has two clusters with a gap between them, and the
box actively hides the gap that is the actual story. A histogram or violin earns its keep exactly
where a box plot's summary erases the thing worth seeing.

The one thing that goes wrong: this type is only ever as honest as its handling of outliers, and
the tempting shortcut — letting a whisker just stretch to the most extreme point — is the
mistake. It launders a lone extreme value into looking like part of the ordinary spread. State
the whisker rule (the standard is Tukey's: a whisker reaches the furthest point still within
1.5 times the interquartile range of its nearest quartile) and plot everything beyond that as an
individual outlier dot, not as a longer whisker. When a category carries only a handful of
outliers — two or three — write the value next to each dot so it reads as a real measurement, not
a rendering glitch; once there are many, drop the per-point labels and let hover or focus carry
the value instead, or the plot drowns in numbers.

What the drawing needs: this is a position encoding, not a length encoding, so — unlike a bar or
a histogram — the value axis does not need to start at zero; a zoomed range that shows the actual
spread of the data is the honest choice here, not a padding-to-zero that would flatten small real
differences into nothing. What the value axis does need, always, is a label naming the unit —
without it a reader can't tell if the box spans dollars, years, or percentiles. Categories keep
whatever order tells the story (often sorted by median), one hue for the boxes (a second hue only
if you are deliberately comparing two groups side by side, and no more than two), with the median
line and axis text in ink rather than the box's own color.

There's nothing distinct to this type past the ordinary rule that runs through every labelled
mark here: whatever color decorates the box is not automatically safe to reuse as the color of a
value label sitting next to it. If outliers get numbers, render those numbers in ink, not in the
box's fill or stroke color — check the actual contrast of the label against its real background,
not against an assumption of white.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the row of medians, which is the shape the claim is about
- **Then** the boxes themselves, in ONE hue across every category, because this is a single-group comparison and not two groups being compared
- **Then** the one outlier, drawn as its own dot with its value in INK, and the whisker clipped to the furthest reading still inside the fence
- **Subordinate** — the value axis fitted to the data (a position encoding, so no zero floor), the unit on the top tick, and the n under each category
- **The claim lands on** the peak category and the monotone fall after it, readable off the medians alone

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-resort-categories-median` — resort the categories by median — a time-ordered categorical axis keeps its own order, or the rise-then-fall shape is destroyed
- `no-use-hue-unless` — use more than one hue unless two groups are deliberately being compared; the median line and any value label stay in ink, never the box's own fill or stroke
- `no-stretch-whisker-outlier` — stretch a whisker to the outlier it excludes

## Precision to assert
- every summary is computed from the frozen file and the beat throws rather than draw a claim its own numbers do not support
- outliers are COUNTED from the computed summaries rather than asserted, and a partial category states its n
- no token may sit under the size table's type floor — the two smallest things here were the n and the outlier's own value, and both were raised rather than the floor lowered

## Devices the worked example implements
- **`summarizeDecade`** — quartiles, the Tukey fence and fence-clipped whiskers in one place, shared with the video and web siblings (`render.mjs`)
- **The monotone-fall assertion** — the headline refused if the computed medians stop supporting it (`render.mjs`)
- **A category band derived from where the credit sits** — so the n row cannot land on the source line (`DecadeBoxplot.tsx`)

## Worked example

`proof/more-boxplot-france-co2-decades` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedBoxplot.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type boxplot --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
