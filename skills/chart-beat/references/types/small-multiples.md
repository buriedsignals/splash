# Small multiples

**Argues:** Small multiples isn't a chart type — it's a layout decision: repeat the same small chart once per category, panel after panel, all built the same way.

Small multiples isn't a chart type — it's a layout decision: instead of forcing every group into
one crowded chart, repeat the same small chart once per category, panel after panel, all built
the same way. It answers a question that a single crowded chart structurally can't: "how does the
same pattern vary across many groups," where the *comparison across panels* is the point, and
the repetition itself is what lets a reader's eye do that comparison — because every panel speaks
the same visual language, the only thing that differs from one to the next is the data, and
differences jump out precisely because everything else holds still.

Faceting earns its place exactly at the point where a single chart has started fighting itself —
too many bars in a group, too many overlapping lines, too many series wearing too many colours
for a legend to stay legible. As a rough feel for where that point sits: a grouped bar comparing
more than about three series per category starts reading as a picket fence, not a comparison; a
stack past about five series becomes an unreadable ribbon; a bar chart past twenty-some categories
becomes a comb nobody can parse one tooth at a time. Any of those is the moment to stop trying to
cram more into one frame and split into a grid instead.

Do not reach for it just because there happen to be multiple series. A time trend with several
lines — say, three countries' GDP over forty years — usually reads *better* overlaid in one
frame with each line direct-labelled at its end than split into three separate small panels; the
whole value of overlaying a trend is letting the reader compare slopes and crossings directly,
in the same visual field, which faceting would tear apart into three frames the eye has to hold
in memory and compare across. Small multiples is for when the count or the density of things
being compared has actually made a single frame illegible — it's not the default move whenever
more than one of something shows up. Reaching for it reflexively, on data that would have been
fine overlaid, is itself a documented mistake: a genuinely single-trend, multi-series time chart
got mis-turned into a per-period panel grid once, and the fix was recognizing that a shared-axis
overlay was the right read the whole time, not a symptom of needing to facet.

The one thing that goes wrong: letting each panel scale itself independently to its own data. It
feels natural — every panel "fits" its own range — and it is the single fastest way to make the
whole exercise pointless, because the entire premise of faceting is that panels are directly
comparable, and a panel with a narrow real range stretched to fill the same box as a panel with a
huge real range will *look* just as dramatic as it, for no reason connected to the actual
numbers. A small country's modest year-over-year wobble gets blown up to the same visual
amplitude as a large country's genuine boom-bust cycle, and a reader walks away with exactly the
wrong impression, confidently.

What has to stay identical across every panel, non-negotiably: the scale — same domain, same
axis, same units, on every single panel, full stop, even if that means some panels look nearly
flat and others look dramatic, because that flatness or drama *is* the finding. Panel size,
aspect ratio, and the position of the axis inside the panel stay identical too, so panels are
visually swappable except for the data itself; and if colour is used at all, the same category or
role maps to the same colour in every panel, not re-picked per facet. Order the panels
meaningfully — by the value the story cares about, geographically, or in a natural sequence —
rather than alphabetically by default, which buries the comparison the grid exists to enable.

There's no WCAG-specific trap unique to faceting, but there's a real repetition trap that behaves
like one: printing the full axis title, the unit, and the source line on every single panel in a
grid of a dozen is not reinforcement, it's redundant decoding work repeated a dozen times over —
put the shared axis label and unit once, at the level of the whole grid, and let each panel carry
only its own category name. A reader who has already read "GDP growth, %" on panel one shouldn't
have to re-verify it eleven more times to reach the panel that actually matters to them.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the grid as a whole — the pattern across the panels is the claim, and the grid is the form that makes such a pattern visible (and the form in which it would be easy to believe one that was not there)
- **Then** one panel, which a reader must be able to read on its own: its name and its delta are drawn IN it
- **Then** the key, which states once what is shared — the dates and the ceiling
- **Subordinate** — each panel's own short baseline, exactly as wide as its own pair; no rules, no alternating tint, no grid, because the CUT is the boundary
- **The claim lands on** the ordering of the panels against the sizes of their gains

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-fit-panel-own` — fit a panel to its own data: one scale governs every panel, or these are sixteen unrelated charts in a grid
- `no-draw-rule-tint` — draw a rule or a tint between panels — the gap is the boundary, and each panel's own short baseline is what makes a gap look like a new axis
- `no-let-panel-name` — let a panel's name sit nearer the previous panel's block than its own: on a grid PROXIMITY IS THE GROUPING, and nothing else says which name goes with which pair

## Precision to assert
- every panel keeps the same axis scale, asserted equal
- a claim about a PATTERN is derived rather than eyeballed — here the correlation between start and gain is computed and asserted clearly negative
- the gap between panels is checked to be at least twice the gaps inside one before the plate draws

## Devices the worked example implements
- **The between-panel gap as a checked quantity** — a defect that was invisible to every guard, now a precondition (`render-directions.mjs`)
- **The cut as the boundary** — no rules, no tint, each panel with its own short baseline (`DirectedSmallMultiples.tsx`)
- **Shared stated once, varying repeated** — the dates and the ceiling in the key, the name and the delta in the panel (`DirectedSmallMultiples.tsx`)

## Worked example

`proof/static-small-multiples-lowcarbon` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedSmallMultiples.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type small-multiples --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
