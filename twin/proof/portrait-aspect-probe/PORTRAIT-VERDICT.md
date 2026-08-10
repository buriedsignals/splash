# Portrait — the verdict, after opening all ten

`PORTRAIT-MEASUREMENTS.md` is generated. This file is not: it is what a person saw when the PNGs
were opened, which is the half of the probe a counter cannot do.

**The folder is a sibling, not a subfolder of the histogram beat.** The prior probe lives inside
`static-carbon-footprint-spread/` because it probed that beat. This one spans three types — the
histogram, the seed's line, and a ranking — so it lives in its own folder with its own copies of
the three frozen files, which keeps invariant 3 (a beat's inputs and outputs live in its own
folder) true of a probe that reads from nowhere else.

Open, in this order, side by side:

- `h-a-stretch.png` beside `h-b0-capped-bare.png` beside `h-b-capped-furnished.png`
- `h-b2-story-type.png` — the arm that changed the conclusion
- `l-a-stretch.png` beside `l-b-capped-furnished.png`
- `r-a-columns-stretch.png` beside `r-b-columns-furnished.png` beside `r-c-bars-transposed.png`

---

## The short answer

**The rule holds. It is not the whole answer, and it is not global in the same form for every type.**

| | verdict | why |
|---|---|---|
| histogram | **B beats A, clearly** | the shape comes back; nothing else recovers it |
| line | **B beats A, clearly** | a 34% drift stops reading as a crash |
| ranking | **C beats B beats A** | this type has a twin FORM, and it beats the twin aspect |

And one thing the probe did not set out to find, which is the sharpest result in it:

> **The leftover height is not really "leftover". It only looks like a gap because everything in
> these frames is typeset for an article column.** Typeset the same chart and the same words for a
> phone (`h-b2-story-type.png`), and the frame fills, the annotations become readable, and the plot
> lands at **2.39:1 — its own native 2.35:1** — without the clamp ever binding. The clamp is the
> guard rail; the type scale is the mechanism.

---

## What I saw, arm by arm

### The histogram

**A (`h-a-stretch`, 0.54:1, 84.2% fill, tallest bar 18.4:1).** Reproduces the prior probe's numbers
exactly, so this is the tool's real output and not a rebuild. One grey column three-quarters of the
frame tall, nine slivers beside it, and a third of the frame empty white to the right of bin 28. The
reader's take-away is "one enormous thing"; the beat's claim is "a right-skewed distribution". The
axis is fine, the labels are fine, nothing is clipped, and the chart is not making its point.

**B0 (`h-b0-capped-bare`, 1.1:1, 41% fill, tallest bar 9:1).** The control, and it settles the
attribution: **the shape comes back from the clamp alone, before a single extra word is added.** The
second bar has presence, the third and fourth are legible, the decay reads as a decay and the tail
as a tail. It is also, plainly, an unfinished graphic — 45% of the frame is blank below the axis and
it reads as a chart that failed to load the rest of itself. So the clamp fixes the chart and breaks
the frame, which is exactly why the hypothesis pairs it with furniture.

**B (`h-b-capped-furnished`, 1.1:1, 41% fill, 142 editorial words against A's 58).** The chart is
B0's — identical geometry — with a headline at 44px instead of 30, and three annotations under it
that say in full what the landscape frame could only imply: 127 of 213, the first bar 2.4× the
second, Qatar at 40.1 against a median of 3.1. This is the best of the three as an editorial object.
It still leaves about 20% of the frame as air between the axis and the annotation rule; anchoring
the annotations to the bottom margin turned that from a blank tail into a section break, which
helps, but it is air.

Two rendering defects were found by looking and fixed before the arm could be judged, and both are
worth carrying: the annotation's bold lead-in ran straight into its body (`The bulk.127 of the…`)
because the gutter was measured as `measureText(lead + " ")` and **a trailing space has no ink**; and
`headerScale` applied to the whole header block grew the SOURCE to 25px, where it read as a second
standfirst. **What the leftover buys is a bigger title, not a bigger credit.**

**B2 (`h-b2-story-type`, 2.39:1, 16.2% fill, same 142 words).** The same clamp and the same words,
typeset for a phone (`typeScale` 1.9, header 2.6) instead of for an article column. The frame is
full. The annotations are readable at arm's length. And the plot ends up at **2.39:1, which is
within a rounding error of the beat's own 900×560 native 2.35:1** — the clamp did not bind at all;
the furniture pushed the plot to a sensible aspect on its own. The chart is now small (16% of frame
height) and the y tick labels are tight, and the median label crowds the top gridline — real costs
that a story-format layout would need to answer (fewer ticks, the median named in prose instead of
at the mark). But as a story post it is the only one of the four I would publish.

### The line — the harder case, and it fails harder

**A (`l-a-stretch`, 0.41:1, 88.3% fill; steepest segment 80.6°, first-to-last 65.2°).** Byte-for-byte
the seed's own portrait render — the cross-check confirms it, so nothing here is a straw man. What
it draws is not a one-third fall over ten years. It draws a cliff: 2016→2017 plunges at **80.6° off
horizontal**, and the 2020→2021 recovery is a wall. A reader who knows nothing else would describe
this series as volatile and collapsing. It is neither: the largest year-on-year change is 89 mm,
about 10% of the 2015 total. **This is the same defect as the histogram's and it is worse**, because
a line's argument is not just distorted by the aspect, it is *produced* by it — slope is the only
thing a line says.

**B (`l-b-capped-furnished`, 0.8:1, 44.9% fill; steepest 71.9°, first-to-last 47.7°).** The descent
reads as a descent. The dip at 2017 and the bumps at 2021 and 2023 are proportionate to it instead
of competing with it, and the standfirst plus three annotations carry what the shape now understates
(89 mm largest change, 34% over ten years, the missing 2019 reading, the fitted axis). Better on
every count.

**But the range that produced it is too permissive, and this is a real weakness in the derivation
method.** The line's declared range came out **0.8–1.8**, and its floor is the SQUARE render's
0.81:1 — a render this project nominally accepted but which is itself already a stretched plot. So
the clamp let B sit at 0.8:1, and what actually improved B was the furniture eating the height, not
the clamp. The end-to-end slope landing at **47.7°** is suggestive: it is essentially the classic
"bank to 45°" target for judging a line's slope (Cleveland's rule), and A's 65.2° is far past it.
**For a line the aspect range should be derived from its landscape and base renders only, or stated
directly as a slope target — not from a square render that already contained the defect.**

### The ranking — the sibling case, where a third answer wins

**A (`r-a-columns-stretch`, 0.62:1, tallest column 21.9:1).** China's column is a 1.4-metre-tall
teal stripe; ranks 5 to 10 are indistinguishable stubs at the bottom; the whole middle of the frame
is white. The callout rule sits at the very top of the frame with its caption beside it, which is
the one thing that still works. As a ranking it has stopped ranking: below rank four you cannot tell
Japan from Germany.

**B (`r-b-columns-furnished`, 1.26:1, tallest column 10.7:1).** Better — the ten columns become a
readable decay, and the annotations carry the ratios the small bars can no longer show. Still, the
bottom six columns are stubs, four country labels wrap to two lines, and about 26% of the frame is
air.

**C (`r-c-bars-transposed`, horizontal bars, longest bar 10.7:1, 58.8% fill).** This is the one I
would publish, and it is not close. Ten rows running down the frame, every country name horizontal
and legible on one line (`United States`, `Saudi Arabia`, `South Korea` — no wrapping, no rotation),
every value printed at the end of its own bar, and the ranking read top-to-bottom, which is how a
ranking is read anyway. The tall frame is this drawing's **native** shape: nothing was clamped,
nothing was stretched, and the frame is used without a hole in it.

**Its one real cost, stated because it is a genuine loss:** the beat's argument device degrades. In
the column arms the "more than the next five combined" comparison is a dashed rule at China's level
crossing every other column — you see the gap. Transposed, that rule becomes a vertical dashed line
hard against the right edge of the frame, where it reads as a border, and its caption is stranded
below the plot with nothing pointing at it. **C wins on legibility and loses on argument**, and the
fix is not to go back to columns — it is to draw the comparison as a stacked "the next five
combined" bar under China's, which is a better device than the rule was.

---

## The verdict, and the reasoning

**1 — Is a stretched plot a defect? Yes, on all three types, and no measurement sees it.** Every arm
above scored zero clipped and zero collisions, including the three worst-reading ones. The counters
this project already trusts are blind to it by construction. The three numbers that DO see it are
now measured and should be kept: **plot aspect**, **primary mark aspect**, and — for a line —
**slope in degrees**, which is the only one of the three that catches a line's version of the fault.

**2 — Does the clamp fix it? Yes, and the control proves it is the clamp.** `h-b0-capped-bare`
changes nothing but the plot's aspect and the histogram's shape returns. That is the finding I most
wanted a control for, because B changes two things at once and would otherwise have been
unattributable.

**3 — Is the furniture necessary? Yes, but for the FRAME, not for the chart.** B0 is a correct chart
in a broken frame. The annotations do not improve the chart at all; they make the 9:16 frame a
finished object. That is a cleaner statement of the hypothesis than "the leftover goes to
furniture": **the clamp is for the chart, the furniture is for the frame, and they are two separate
justifications that happen to solve each other's residue.**

**4 — Is the rule global? No. It is global in SHAPE and per-type in its PARAMETERS, and one family
supersedes it.**

- Every type needs a declared range — the failure is universal.
- The range itself is per-type and cannot be one number: histogram 1.1–2.9, ranking-columns 1.3–3.4,
  line 0.8–1.8 as derived (and that last one is wrong for the reason given above).
- **Types with a nominal category axis have a twin FORM, and where they do, the form beats the
  clamp.** Vertical columns → horizontal bars is not a rescaling, it is the right drawing for a tall
  frame, and it needs no clamp because there is no aspect to distort — the layout is row-driven.
  This applies to bar/column, lollipop, dumbbell, diverging bar and any other band-scale type.
- It does **not** apply to the histogram, whose x axis is a continuum: transposing it would put a
  continuous variable on a band scale and lie about it. That was stated as a caution in the brief
  and the probe agrees — no C arm exists for the histogram, deliberately.

**5 — The result I did not expect, and the one that should change the spec.** `h-b2-story-type` says
the "leftover" is largely an artefact of typesetting a story-format post as if it were an article
graphic. At phone type sizes the same chart and the same words fill the frame with no gap, and the
plot lands at its own native aspect with the clamp inactive. This does not make the clamp
unnecessary — a beat with a short title and no annotations would still stretch to 0.55:1 at any type
size, which is precisely the common case. **It means the clamp is a floor-and-ceiling guard and the
per-size type scale is the thing that actually decides the layout.** The prior probe already
recorded "square's static row wants a larger scale than `width / 900` gives it" as an open question;
this is the same open question arriving on the portrait row, with evidence, and it is now the
cheapest high-value thing left in W4.

---

## What it would cost to write into the type sheets, and whether that is the right home

**The sheets are the right home for the RANGE. They are the wrong home for the mechanism.**

The 40 sheets (32 in `twin-chart-beat/references/types/`, 8 in `twin-map-beat/references/types/`)
are prose, not fields — their own README says each answers five questions: what it is for, when not
to reach for it, the one thing that makes it lie, what the drawing needs, and the accessibility trap.
An aspect range is a natural **sixth**, and it belongs beside "what the drawing needs" because that
is exactly what it is. The cost:

- **One paragraph per sheet, 40 sheets.** Not a line — a paragraph, because a bare pair of numbers
  is the kind of value nobody can defend later. Each sheet should say the range AND where it came
  from, the way the histogram's bin-count floor and ceiling are stated with their reasoning.
- **The numbers have to be MEASURED, not assigned.** This probe's method — render the type's own
  stretch arm at the frames already accepted and take the extremes — is cheap and mechanical, and it
  reproduced the prior probe exactly. But it is only as good as the accepted renders: the line's
  floor came out wrong precisely because the square render it learned from was already stretched. So
  the honest cost is **render-and-open per type**, not a table filled in from source. At roughly the
  pace of this probe that is a session's work for the chart family, not an afternoon.
- **A twelfth of them need a second sentence** naming the portrait FORM rather than a range —
  bar/column, lollipop, dumbbell, diverging bar and their relatives. That sentence is worth more than
  the range for those types.

**What must NOT go in the sheets**, because the sheets are read by a person writing a component and
are not executed: the clamp itself, the leftover arithmetic, and the annotation block. Those are
seven lines of layout (`clampPlotHeight` here is four) repeated identically in each craft skill's
beat, with a walking parity test proving the copies stay in step — the twin's standing answer to
"make this true for N types". The sheet tells the writer what range to clamp to; the beat does the
clamping.

**And the type scale is not a sheet's business at all.** It is per size and per craft skill, it
already lives in `sizes.mjs`, and B2 says its portrait row is the highest-leverage number in this
whole area. That is a `sizes.mjs` change with a phone-sized look attached, and it is independent of
the 40 sheets.

---

## What this probe does NOT close

- **Only three types were looked at.** Histogram, line and a ten-row ranking. Nothing here says what
  a scatter, a heatmap, a pyramid or a map does at 9:16, and the map family is where R2's "charts and
  maps both, one model" will be hardest — a camera does not have a plot rectangle.
- **The type scale for portrait was demonstrated, not chosen.** `h-b2` used 1.9/2.6 because they are
  roughly phone-legible, and nobody has looked at a portrait render on an actual phone. Same open
  question as square's, now with a second frame attached to it.
- **The line's range is wrong and the probe knows it.** The derivation method is sound for the
  histogram and the ranking and produced a bad floor for the line. Either derive from landscape and
  base only, or state a line's constraint as a slope target instead of an aspect range.
- **How much furniture is "enough" is undecided.** Three annotations at article type sizes leave a
  fifth of the frame empty; the same three at phone sizes overfill it. Nothing in the rule tells a
  journalist how many words a portrait frame wants, and nothing should force them to write more.
- **C's argument device is a known regression** (the reference rule at the frame's edge), sketched
  above but not built.
- **Nothing here is wired into any production component.** Three probe components, one runner, ten
  renders and this file. `skills/` and every beat under `proof/` are untouched.
