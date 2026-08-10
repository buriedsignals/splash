# Web discipline

The rules the interactive chart genre is written under. There was no doctrine for this genre before
this file — it was written while building the first web beat (`proof/co2-suisse/EmissionsWeb.tsx`,
the CO₂ story), the same way `static-discipline.md` was written against the first static beat and
`motion-grammar.md` against the first video build. It was rewritten again against this skill's
SECOND build, when the owner's own read of the first build's shipped output was that the frame did
not fill its container — see "Responsive behaviour" below, which is the section this rewrite
actually overturns; every other section in this file still holds from the first build. Every rule
below is either a decision this genre needed and the others did not, or an explicit inheritance from
`doctrine` stated so it is not silently assumed.

## What hover reveals that the static chart could not show

**The honest use of interaction here is detail the static frame had to omit, never the same numbers
repeated on demand.** `static-discipline.md`'s "Axis density" rule gives a static frame a
conventional, dense grid — but even a dense grid on a long series only makes a handful of readings
locatable to the pixel; it cannot label all of them without becoming a table wearing a line's
clothes. That is the gap this genre closes: every reading gets an exact, on-demand value —
`data-detail="1967 · 32,5 Mt"` on every point, none of it printed by default, all of it one hover,
tap or keyboard focus away.

This is also the test for what does NOT belong behind interaction. The title, the reference rule's
own label, the peak's muted marker, the subject's end label — none of these are things the static
frame "had to omit." They are the argument, already stated, already visible. If a rule ever moves
one of them behind a hover — or, since this skill's second build, behind a filter — that is
decoration wearing this genre's clothes, not the thing this genre exists to add. See "What must not
become interactive" and "The filter obeys the same rule interaction does" below.

**A notable year's exact figure is reachable on hover, even though the printed marker stays silent
about it and the beat's own `BRIEF.md` says not to restate it.** These are not the same rule read two
ways. "Do not restate the number" is about the passive reading experience — a number the article's
own prose already states, printed a second time on the chart, is `anti-patterns.md`'s "repeated years
or values": redundant decoding work the reader did not ask for. Hover is opt-in: nothing is decoded
until the reader chooses to ask this specific point what it was, and every OTHER point on the curve
answers exactly the same kind of question the same way. Carving out one year as the sole exception
that stays mute even on request would be arbitrary, not principled — the rule this genre needs is
"printed nowhere by default," not "unknowable."

## Keyboard and touch

A hover-only chart excludes every keyboard user and every phone reader, so neither is treated as
an afterthought layered on top of a mouse-first build:

- **Every reading is `tabIndex={0}` at build time**, not a roving `-1`/`0` pair assembled by the
  inline script. This is a load-bearing decision in this file: a screen reader or keyboard user
  reaches every reading with Tab alone, and reading it does not require the inline script to have
  run at all — `aria-label` is a static SVG attribute, read by assistive tech independent of
  JavaScript. What the script adds on top is speed (`ArrowRight`/`ArrowLeft`/`Home`/`End` to jump
  between readings without one Tab press per reading) and the *visual* tooltip box for a sighted
  keyboard user, who cannot rely on a screen reader's announcement alone. **Known cost, not hidden**:
  many Tab stops with the script absent is slow on a long series. A roving-tabindex version that
  collapses this to one stop is the natural next iteration and is not built here.
- **Touch and mouse share one code path.** Pointer events (`pointerdown`/`pointermove`) fire for
  mouse, pen and touch alike, and detail is resolved by nearest-point-on-x over the whole plot
  rectangle (`.hit-area`), not by landing a tap on an individual 5px circle. A phone reader taps
  anywhere in the plot and gets the reading nearest that x position — the same target-size problem a
  real accessibility guideline exists for is sidestepped by not requiring a small target at all.
- **Focus shows the identical detail box hover shows.** One `show(point, x, y)` function, called from
  `focus`, `pointermove` and `pointerdown` alike (`assets/interaction.mjs`) — there is no second,
  degraded "keyboard mode" that answers a different or thinner question than the mouse path does.
- **The filter's own controls are native form elements**, reachable and operable the way any radio
  group always is (Tab in, arrow keys between options, no script required) — see "The filter obeys
  the same rule interaction does" below for why this had to be a hard requirement, not a nice-to-have.

## What survives with JavaScript disabled

**Everything the static genre would have shipped for this same story survives untouched**: title,
caveat/limits, source line, the reference rule and its label, the muted notable-year marker, the
full curve, the subject point and its end label. All of it is plain SSR'd markup — SVG for the
geometry, HTML for the words — and nothing about the chart's own argument depends on the script
executing. The filter also survives: its dimming rule is pure CSS (`:checked` plus `:has()`), so
narrowing to a period still works with the script absent, exactly like every other reading. **What
does not survive**: hover/tap detail on the individual points via the visual tooltip, and the
`ArrowRight`/`ArrowLeft`/`Home`/`End` shortcuts. A screen reader user still reaches every reading's
`aria-label` via plain Tab (see above) — the one path that survives JS being off is, not
coincidentally, the one this file spent the most words defending. For a newsroom that matters
because a CMS iframe, an AMP page or a stripped reader-mode view is a real deployment target, not a
hypothetical: this genre degrades to "the static beat, plus every reading silently reachable by a
keyboard, plus a working filter," never to a blank frame.

## Responsive behaviour

**REWRITTEN. The first build of this section argued for two pre-rendered widths, not a continuous
reflow — that argument is overturned here, deliberately, because the owner's own read of the shipped
output was that it did not fill its container it was given.** The reasoning below is not a patch on
the old section; it replaces it.

**What the first build actually argued, and what was wrong with it.** The first build reasoned that
a client-side layout engine recomputing `tickStep`'s round interval, re-wrapping the title and
re-measuring every gutter live in the browser, for every pixel of window width, is the same "one
universal component" anti-pattern this project already rejects for a beat's own composition — and
picked two hand-authored, independently-tuned frames (900px, 360px) instead, swapped by a single CSS
media query. That argument was correct on its own terms and remains correct: recomputing geometry on
every resize is still rejected below. What it never actually defended was the frame's own WIDTH — a
900px frame in a container wider than 900px simply stopped, leaving empty space either side, which
is what the owner's own screenshot showed. Two rungs did not cause that defect on their own, but they
also did nothing to prevent it, and swapping in a THIRD rung would only have deferred the same
question to the next container width nobody had tuned for.

**The actual problem a fluid `viewBox` creates, restated precisely.** Scale an SVG's `viewBox` up to
fill a wider box and every `<text>` element inside it scales too — a title correct at 900px becomes
oversized at 1600px and unreadable at 400px. This is the real reason two fixed rungs existed: not to
avoid recomputing geometry (a solved problem, see below), but to avoid this text-scaling defect,
which two DISCRETE, independently-typeset frames genuinely does avoid. It does not, however, solve
the more basic problem it was traded against — filling the container at all — and a genre that ships
public-facing web pages needs both.

**The fix: split what scales from what does not, structurally, not with more rungs.** `ChartWebSeed`'s
`<svg>` now draws GEOMETRY ONLY — grid lines, the accent path (or, with a filter active, its
segments), the points, the reference rule, the peak marker. Not one `<text>` element lives inside it.
Every WORD — title, caveat, source, axis labels, the reference/peak/end labels — is plain HTML,
layered over or beside that `<svg>` in the same CSS grid cell, styled from ordinary CSS with a FIXED
pixel `font-size` that never reads from, or writes to, the `viewBox`. The `<svg>` itself is scaled
with `preserveAspectRatio="none"` inside a box whose own `aspect-ratio` is set once, from the real
geometry, so it STRETCHES continuously to fill however much width its container gives it — a 1600px
container gets a 1600px-wide chart, not a 900px chart with empty gutters either side — while the type
around it stays exactly the size it was authored at, at any width. Geometry stretches; type stays
stable. That is the whole mechanism, and it costs nothing extra at render time: a browser already
does proportional layout of a `width: 100%` box with a fixed `aspect-ratio` and a set of absolutely
positioned `%`-placed children for free, on every resize, without a script — see "Cheap, not
recomputed" below for why this is not the same anti-pattern the first build correctly rejected.

**Height grows with width; width is never capped.** `.chart-plot` sets `aspect-ratio: <total width
units> / <total height units>` once, from the real geometry and the real measured gutter, and takes
`width: 100%` of whatever contains it — no `max-width` anywhere in the chain from `.chart-figure`
down to the `<svg>` itself. The alternative failure mode is exactly as real as the one this rewrite
fixes: letting BOTH width and height float independently (e.g. a fixed-height plot stretched
arbitrarily wide) turns a wide container into an unreadable letterbox strip. Tying height to width
via `aspect-ratio` avoids both failure modes with one CSS property and no script. The chart frame
itself is never capped, on purpose, because a line chart's own geometry does not have a "too wide to
read" failure mode the way a paragraph does — it has an "empty space either side" failure mode
instead, which is the one this rewrite closes.

**The words take the same width as the graphic — the 640px cap is REVERSED (2026-08-10).** Until
this date the header block (title + caveat) and the source line were the ONLY things given a
reading-measure cap (`640px`, in `render-web.mjs`'s `buildCss`), on the argument that a long line of
prose becomes unreadable at full bleed. That argument is not wrong about prose in the abstract. It
was wrong about **what this genre is**. A chart-web beat is not a document: it is one graphic, and
its title and its source are *furniture over that graphic*, not a paragraph beside it. At 1600px the
title stopped in the left third of a chart running the full frame — which reads as a broken box, a
layout that failed to stretch, not as a comfortable measure. The owner's feedback names exactly
that: *the title and the description must take the full width too.*

So the declaration is gone, and nothing in the chain from `.chart-figure` down caps a width any
more. **The cost this accepts, named:** on a very wide desktop viewport a short title can now run as
one long single line, at a measure longer than editorial prose would choose. **What bounds it
instead is the container, not a rule in this file** — this artifact is delivered as an embed and
sits inside the CMS's own article column (ruling R2, *"ça fonctionnera un peu comme un composant
embed"*), which is already at a reading measure for the article's own body text. `width: 100%` means
the beat inherits that bound for free, and gets the full frame when the frame genuinely is the whole
page. A cap in `buildCss` could not have known which of those two it was in.

What did NOT change: `.chart-header, .chart-filter, .chart-source { flex: 0 0 auto; }` — the
window-fit rule below. Words are still never squeezed to make a chart fit; the chart is.

**Cheap, not recomputed — the first build's own anti-pattern rule still holds.** Nothing about this
redesign asks a script to measure anything on resize. The one thing this genre still measures in
node is the y-axis gutter's own width (`yGutterPx` in `ChartWebSeed.tsx`) — computed ONCE, at build
time, from the widest tick label at its own fixed font size, and set as a CSS custom property
(`--y-gutter`) the grid track reads forever after. Tick density (`FRAME.yTickHint`/`xTickHint`),
gridline-drop distance (`FRAME.minGridlineGapPx`) and every type size are picked ONCE too, at the
frame's own canonical width, and never re-derived as the box stretches — the same "measured, not
assumed; decided once, not live" discipline the first build's own rejected anti-pattern rule already
argued for. What is genuinely free, and happens on every resize with zero script involvement, is
pure CSS: the browser's own layout engine resolves `width: 100%`, `aspect-ratio`, and every `%`-based
`left`/`top` on the overlay's children — proportional math it already does for a responsive image,
extended here to a chart. That is the "adapt cheaply" this genre requires, and it is a different
claim from "adapt without a client-side layout engine recomputing gutters and tick counts," which
this file continues to reject exactly as its first build did.

**A reading that belongs to a LINE is reachable on the line.** Until B6.9 every hit surface in this
genre was a point or a shared `.hit-area` rect resolved by nearest-x, and a slope chart's connector
— which exists precisely to say what LINKS its two ends — could not be pointed at. The primitive is
three pieces, all in this skill: a transparent stroked twin drawn immediately after the visible path
(`hoverableLineProps` in `assets/ChartWebSeed.tsx`, duplicated into the beats that draw one and
walked by `hoverable-line-parity.test.ts`), the `.line-hit` rule in `buildCss` whose
`pointer-events: stroke` makes the STROKE the hit region instead of the bounding box, and `initLines`
in `assets/interaction.mjs`.

Three things about it that were measured rather than assumed. **The twin is `non-scaling-stroke`**:
under `preserveAspectRatio="none"` a stroke stated in user units would be 60px wide on an ultrawide
frame and 8px on a phone. **The reading must link the two ends** — both values and the change — or
it is a second copy of an endpoint's own tooltip. And **the pointer resolves to the NEAREST line's
stroke, not to whichever twin caught the event**: the twin is deliberately wide, so on a chart whose
lines converge it covers its neighbours, and 21 of 60 probes taken ON a line answered with a
different line at 375px before the nearest rule was added. The residue is a true crossing, where the
two distances are equal and the answer between them is arbitrary.

**An annotation is placed by the shape it annotates, and it moves with the width.** A label parked
at a typed corner is the second form of the same mistake: `weby-population-pyramid-switzerland`'s
peak annotation sat at `left: 0%, top: 0%`, twelve rows above the band it named, with a 600px dashed
rule down the frame edge — and it overlapped nothing only because that corner happened to be empty,
which nothing measured. The rule this genre now holds: **find the position from the marks**, at the
width the label is actually drawn at, and let a `@container` step move it as the frame grows. Two
things that cost a build each, recorded so they are not rediscovered: a VERTICAL distance converts
through the plot's rendered HEIGHT, never through its width (the two differ whenever a `min-height`
floor is doing the work), and **a container query styles a container's descendants, never the
container itself** — a rule that sets a custom property on the queried element silently never
matches, and every width gets the base value. `web-annotation-clears-its-marks.test.ts` measures the
result: painted-fill sampling under the label, plus label-over-label, at four widths. It is also the
corpus's only measurement of label collision outside video.

**A rung IS a cap, and that is why the last two-rung beat had to be rewritten rather than adjusted.**
`more-heatmap-co2-per-capita-decades` shipped two pre-rendered SVGs — 900px and 375px — swapped by a
`@media` query under `.chart-figure { max-width: 900px }`. Its own runner argued at length about
where to put the boundary between them and concluded that the step in type size across the seam is a
property of the pattern that moving the boundary cannot close. It was right, and it was answering
the wrong question: an SVG with its words INSIDE it cannot be widened without magnifying its type,
so any such beat must be capped at its design width. The owner's sentence — *the visual must take
the full available width* — is a rejection of the rung, not of where it sits. The repair is the
separation this section already teaches, applied to that beat: geometry-only `<svg>`, every word
HTML at a fixed pixel size. Both rungs, the media query, the cap and the second copy of `buildCss`
retired together. `web-frame-is-fluid.test.ts` measures `.chart-figure` against the document at 1600
and 3440 so a cap cannot come back in any spelling. (The five `mapgen-*-web` beats DO still cap at
860–900px; they are the map genre, with their own frame contract and their own chantier.)

**"Decided once" is about the ARITHMETIC, never about the answer — and this genre shipped that
confusion once.** Deciding a type size or a tick *density* once is right: those are properties of
the type, and the type does not stretch. Deciding a *de-collision* once is not, because whether two
labels collide is a function of the width, and this genre has no single width. Measured on
`proof/webz-bump-emitter-rank`: its year-tick filter was evaluated server-side at
`NARROWEST_VIEWPORT_PX = 375` — a 205px plot — and the tick it dropped there was dropped at every
width, so a 3265px ultrawide axis read `1990 … 2015 2024` with a 797px hole in it where every other
gap was 431px. The owner found it by opening the file.

**The correction is a threshold, not a live measurement.** The de-collision arithmetic still runs
ONCE, in node, from the measured strings — but it computes, per candidate, *the width below which
that candidate has no room*, and every candidate is emitted. One `@container` rule per threshold
then hides it exactly there and nowhere else. Nothing is recomputed on resize, no script writes a
layout value, and the axis is still correct with JavaScript off — the anti-pattern rule above is
untouched. `BumpWeb.tsx`'s `yearTickPlan`/`tickVisibilityCss` is the worked example, including why
its packing pins the first and last tick and why a tick that would flicker back off as the plot
grows throws rather than shipping a rule that lies about it. `fluid-decisions-are-retaken.test.ts`
walks every delivered `.html` at 375 and 1600 and fails a beat that leaves a member of its own axis
run missing where the member's own position has room for it.

The residue, named: only the AXIS form of this is mechanised. A crossing caption's side and a peak
label's parked corner are still decided at one width in the beats that have them.

**The one accepted tradeoff, named rather than hidden.** The y-axis gutter is a FIXED pixel width
(content-measured, not scaled) inside a CSS grid whose other column is `1fr`. As the total frame
grows from 375px to 1600px, that fixed gutter is a shrinking fraction of the whole — which means the
PLOT rectangle's own aspect ratio drifts very slightly from its canonical proportions at any width
other than the one it was measured at. `preserveAspectRatio="none"` absorbs this by design: the
`<svg>` simply stretches to fill whatever rectangle results, with no letterboxing and no clipping.
This is the accepted cost of a fixed-width label column existing at all (the alternative — recomputing
the gutter's width per resize — is the anti-pattern rejected above), and it is imperceptible in
practice because the drift is a few percent of a narrow margin column, never the plot itself.

**What re-derives once, decided explicitly rather than left to guesswork**: the y-axis gutter
(measured against the axis font's own fixed size and the widest tick label that will actually be
drawn in it), the frame's own `aspect-ratio` (derived from the real gutter plus the canonical
geometry — never a hand-picked constant), and every `%` position on the overlay (computed from the
same coordinates the `<svg>`'s own geometry uses, so a label always lands on the exact point/line it
annotates, at any width). **What is fixed for the life of the render**: every font size, every stroke
width, the point/hit-area geometry — none of it scales continuously the way the `viewBox` does; only
the `viewBox`-to-container ratio does, via ordinary responsive SVG.

**"Fills the container" is a claim about the frame, not a licence for content to touch its edge.**
A first pass at this redesign filled the container correctly and stopped there — the owner's own
1600px screenshot showed the title, the axis labels, the source line and the end-point mark all
flush against the frame's own edge, which reads as unfinished rather than deliberate full-bleed.
`FRAME_PAD_PX` (`render-web.mjs`, `24`) is a fixed inner margin applied once, to `.chart-figure`,
so every word and every mark this genre draws has room to breathe at any width. FIXED, not a
fraction of the container, for the same reason every type size in this file is fixed: a `%`- or
`vw`-based inset shrinks toward nothing on a narrow frame or balloons on a wide one, and the whole
point of this section is that spacing should read the same at 375px as it does at 1600px. Measured
directly (not assumed) at all four verification widths: the gap between the frame's own edge and
its leftmost text (`.axis-label.y`, the topmost gridline's own label) and its topmost/bottommost
text stays at essentially the same ~24px at 1600, 1024, 768 and 375px — a fixed value that is
comfortably small at the widest width verified and does not eat the narrowest one. The end-point
label needed no separate fix beyond this: it is positioned relative to the point it labels
(`transform: translate(-100%, -50%) translateX(-10px)`, `ChartWebSeed.tsx`), which is itself already
inset from the frame edge by `POINT_INSET` plus, now, `FRAME_PAD_PX` — the label's own right edge
measures FARTHER from the frame edge than the point's own mark does, at every width checked, so it
never needed its own padding rule, only the frame's.

## The beat fits the visible window

**A beat is one thing a reader looks at, not a document they scroll through. No web beat may be
taller than the window it opens in.** This is the rule the fluid redesign above was missing, and it
was missing precisely BECAUSE that redesign succeeded: once width filled its container and height
followed from `aspect-ratio`, a wider viewport bought a taller chart, and past a certain width the
chart grew off the bottom of the screen. Measured on the seed, before the fix:

| viewport | figure height | overflow |
| --- | --- | --- |
| 3440 × 900 (ultrawide) | 1762px | **862px** |
| 1920 × 950 (desktop) | 1051px | **101px** |
| 1600 × 800 (laptop, wide window) | 902px | **102px** |
| 1440 × 780 | 827px | **47px** |
| 1280 × 720 | 752px | **32px** |

The 102px missing at 1600 × 800 were not decoration: they were the x-axis row, the subject's own end
label and the source line. A reader on a 16" laptop met a chart whose credit and whose final value
were below the fold.

**What it is NOT fixed with.** Not by capping the frame's width — that is precisely the defect the
fluid redesign overturned, and re-introducing it to buy back height would trade one owner correction
for the other. Not by shortening the canonical geometry either: the shape is the same at every
window that has room for it, and a beat should not render differently on a tall screen than the
author drew it.

**The mechanism.** `.chart-figure` is a flex column with `max-height: 100dvh` (a `100vh`
declaration first, for engines that do not know `dvh`; the later declaration simply wins where it
parses). `max-height`, never `height`: a figure that already fits is untouched and reserves no empty
space — which matters, because this file is embedded inside an article at least as often as it is
opened on its own. Header, filter and source line are `flex: 0 0 auto`; the plot is `flex: 0 1 auto`
with an explicit `min-height` floor. So when the column's preferred height exceeds the window, the
PLOT absorbs the entire shortfall and no word is ever squeezed. The `<svg>`'s own
`preserveAspectRatio="none"` follows the box down with no letterboxing and no clipping — the same
stretch that already absorbs the fixed-gutter drift named above.

**The cost, named rather than hidden.** A clamped plot is FLATTER than its canonical
`aspect-ratio`, so a slope is read at a shallower angle than the author drew it. That is a real
editorial cost and it is the right side of the trade: a shallower slope is still the same series,
whereas an end label below the fold is a value the reader never saw. It only ever happens in a
window too short for the canonical shape — measured after the fix, the plot's height is byte-for-byte
unchanged at 2560 × 1440 (1175px), 1920 × 1080 (875px), 1728 × 1000 (786px) and 1024 × 768 (456px),
and every one of the overflowing cases above now measures 0px of overflow.

**The floor, and what happens under it.** `PLOT_FLOOR_PX` (`render-web.mjs`, `120`) is where the
shrinking stops. It is set below the 153px the seed measures at 375px wide, so it cannot fire at any
width this genre actually verifies at and cannot change a rendering that was already correct; only a
window under roughly 300px tall reaches it, and such a window gets a scrollbar instead of a 20px
strip pretending to be a line chart. It doubles as the override of flexbox's own `min-height: auto`,
which would otherwise refuse to shrink the plot below its content size and re-open the overflow this
rule closes.

**What this rule does NOT claim.** It does not say the beat USES the window it is given. At 375 ×
812 the seed still renders a 153px plot in an 812px window, because height follows width through
`aspect-ratio` and a narrow viewport therefore buys a short chart. Fitting and filling are two
different rules; only the first is settled here.

## A width query is not a rung — what "no `@media`" meant, and what it means now

**NARROWED 2026-08-10 (W4 Task 5), under ruling R2.** The section above overturned the two-rung
layout, and `seed-fluid-frame.test.ts` pinned the overturn as `expect(css).not.toContain("@media")`
— twice. That assertion was right about the defect and wrong about the mechanism, and the difference
matters because R2 makes this genre's job explicit: **web is not a fourth export size. It fills
whatever container the CMS gives it, like an embed component.** Filling a 375px phone and filling a
1600px article well are different instructions, and a width query is the only sentence CSS has for
saying so. Forbidding the mechanism forces whoever implements the fill rule to DELETE the guard, and
a guard deleted is the failure mode the handover already documents.

So the rule is now stated as the pattern it always meant:

1. **At most one `@media (max-width: …)` block.** A second rung is a rung. An `orientation` or
   `resolution` query is a rung under another name and is refused too.
2. **Nothing inside a query may cap the frame.** `max-width` on `.chart-figure`, `.chart-plot`,
   `.chart` or any mark layer is the original defect, and it is refused by pattern rather than by
   forbidding the block it would have to live in.
3. **Nothing inside a query may take content away, except a redundant reading of a scale.**
   `display: none` / `visibility: hidden` is allowed on an allowlist of tick-label selectors and
   nowhere else. Dropping alternate x-tick labels on a phone removes a second way of reading an axis
   that is still fully drawn. An end label, a data point, an annotation, the source line — each of
   those IS the argument or its provenance, and a narrow window is not a reason to stop making it.
4. **A capability query is not a rung either**, so the `@supports selector(:has(*))` block must not
   have a width query nested inside it dressing a second layout up as a feature test.

The three assertions ship with the mutations that redden them, listed in the test's own header,
including the one that stays green on purpose.

**Not touched by this narrowing:** the 640px reading-measure cap on the header and the source line.
That is B3.3's, reversed by its own owner, and its guard scans the whole stylesheet — including
anything nested in a query. See "The words take the same width as the graphic" above.

## What `preserveAspectRatio="none"` costs, and the shape it will ruin

**The stretch that makes this genre fluid is a NON-UNIFORM scale, and a non-uniform scale turns a
circle into an ellipse.** `preserveAspectRatio="none"` is what lets one `viewBox` fill any container
without letterboxing; the price is that x and y are scaled by different factors, and every shape in
the `<svg>` is distorted by exactly that difference. Nothing warns. It is invisible in the markup, it
is invisible in a unit test, and at the width the author happened to look at it is often invisible on
screen too.

**When it does not matter.** A gridline, a reference rule, an axis-parallel bar, a line path: all of
these carry their meaning in position, and position is preserved exactly — a point at 40% across and
60% down stays at 40% across and 60% down under any stretch. A small round marker distorts, but a
5px dot reading as a 5×7 dot says nothing false about the data. The seed's own points and the CO₂
beat's end dot are in this category, which is why they are still `<circle>`.

**When it ruins the beat.** When the MARK'S OWN SHAPE is the argument. A scatter is the clear case:
the reader is being asked to see a cloud, and the roundness of the dots is part of reading its
density and its outliers — stretch them into ellipses and the cloud acquires a directional grain
that is a pure artefact of the container's width. One migrating beat hit exactly this and moved its
dots out of the `<svg>` into fixed-size HTML positioned in `%` over the same grid cell — the same
split this genre already uses for every word. That is the general remedy: **anything whose shape
must survive belongs in the HTML layer, not in the stretched `viewBox`.**

The test to apply, before drawing a mark as an SVG shape: *if this were 30% wider than tall, would
the reader be misled?* Gridline, no. Bar, no. Scatter dot, yes. Proportional circle whose AREA
encodes a value — emphatically yes, since the encoded quantity itself is what the distortion
corrupts.

## Nothing clipped — and the one edge this genre does not protect

**An SVG clips to its `viewBox`.** No `overflow: visible` is set, and setting one would only move
the problem into the neighbouring grid column, so a coordinate outside `[0, width] × [0, height]` is
silently cut at every container width at once. That is why `POINT_INSET` exists: it insets the
x-range on both sides by enough to clear the largest circle radius the genre draws, so a first or
last point never loses half its dot against the frame edge.

**The x promise is kept; there is no y equivalent, and that is a real gap.** The fitted vertical
scale maps the data straight onto `[height, 0]`, so a reading at the bottom of its own fitted range
sits within one radius of the floor and its hit circle overhangs it. Measured, rather than assumed:
worst vertical overhang **2.125 units of a 460-unit box** in `proof/co2-suisse`, and **0.657 of 380**
in `ChartWebSeed`; worst horizontal overhang **0.000** in both, which is `POINT_INSET` doing its job.

What a reader can actually lose is small: the overhanging circle is the INVISIBLE hit target
(`fill="transparent"`), so nothing is cut at rest — only a sliver of the muted disc CSS paints while
that lowest reading is hovered or focused. It is recorded here rather than quietly fixed because
closing it means changing the y-range in every composition in the genre, which is a decision about
the frame, not a test's to make. `test/render-web.test.ts` asserts the bound that keeps it small —
every point's CENTRE inside the box, so the overhang can never exceed the radius — and says in the
file why it does not assert more.

## The filter obeys the same rule interaction does

### The filter is DECLARED by the beat, and a beat that declares none ships none

**Rewritten 2026-08-10, on the owner's instruction: *"il faut que les filtres soient ajoutables et
supprimables en fonction des besoins pour tous les types."*** Before it, a filter was an ad-hoc
property of two genres and neither could be added or removed by a beat. This genre hard-wired ONE
story's dimension into the genre's own stylesheet — `#period-early` / `#period-late`, ids belonging
to the seed's rainfall beat — and the cost was measurable: **21 of 21 committed chart × web pages
carried 12 lines of `.chart-filter` styling and 3 `#period-*` rules, and not one of them contained a
`<fieldset class="chart-filter">`.** Dead control machinery in every delivered file, because the
stylesheet was written for one beat and handed to every beat.

**What a beat declares now** (`assets/filter.ts`, vendored per skill and never imported across one):

```js
filter: {
  label: "Filter by region",     // the <legend> — the dimension, in the beat's own words
  allLabel: "All regions",       // the unfiltered option; always first, always the default
  unit: "countries",             // the noun the narrowing note counts
  options: [{ label: "Europe", keys: ["CHE", "DEU", …] }, …],
}
```

**An option is a NAMED SET OF DATA KEYS, and that is the whole vocabulary.** Deliberately not three
kinds of control, because the three things a beat legitimately filters on all reduce to it — a
category column (`rows.filter(r => r.region === "Europe")`), a series
(`rows.filter(r => r.series === "coal")`), a threshold band (`rows.filter(r => r.value >= 5e6)`) —
and reducing them is what lets one control, one stylesheet rule and one guard cover every type.
A threshold as named bands is a real control a reader operates from the keyboard with no script; a
slider is a second mechanism with its own no-JS story, its own focus behaviour and its own
accessible name, bought for a capability the bands already give. `data-filter` is a whitespace TOKEN
LIST, so nested bands ("Above 3 M", "Above 8 M") need not partition the data.

**Leaving the declaration out is the whole of "removable".** There is no flag, and no control that
is merely hidden: `filterCss` returns the empty string, `buildFilterIndex` returns an empty map,
`attrsFor` returns `{}`, `filterOptionsForMarkup`/`filterNotes` return nothing, and
`assertOneVocabulary` **throws** if a `data-filter` attribute survives in a beat that declared none.
Guarded by `splash/test/filters-are-declared-or-absent.test.ts`, which walks every committed
page and requires all of it or none of it.

### Everything a value drew disappears together, by construction

The known failure is B6.18b: on a symbol map a filter hid the marks and left their labels on the
map. It happened because the hiding was four hand-written selectors — `.pt`, `.point-label`, the
decorative `<circle>`, the table row — four chances to forget the fifth kind of element. So:

- **The hiding is ONE rule per option, over `[data-filter]`**, never a list of element types.
  Whatever a beat draws from a datum is covered the moment it carries the attribute, including the
  kind of element that does not exist yet.
- **The attributes are handed out, never typed.** A component spreads `attrsFor(index, key)` on
  every element it draws from a datum; `assertOneVocabulary` reads the rendered markup back and
  refuses any element carrying `data-key` without the `data-filter` the vocabulary says that key
  has. A build cannot ship half a tagged datum.
- **What neither of those can see** — an element drawn from a datum that carries no attributes at
  all — is what the DRIVEN guard walks a real browser for, looking for the datum's own NAME still on
  screen. Proven, not assumed: dropping `attrsFor` from the scatter's `.point-label` and leaving its
  dot and leader line correctly tagged is invisible to the markup scan and reddens the driven walk
  with *"Switzerland belongs to a datum this option excludes and is still drawn"*.

**An annotation on a READING carries the vocabulary; an annotation on a LEVEL does not.** This is a
correction the first render of this rework earned by being opened and looked at, and it is the same
defect as B6.18b one layer up. The seed's notable-year marker belongs to 2020 and its end label
prints 2025's own value; under "2015–2019" both hung over an empty plot beside a line that had
stopped six years earlier, and the end label printed a number the narrowed view does not contain.
The reference rule is different in kind — a horizontal line at 912 mm annotates a LEVEL, not a
reading — so it is transversal furniture and stays drawn in every state, which is what "What must
not become interactive" was always about. Under the DIMMING this genre used to do, the orphaned
annotations read as merely faint; hiding makes them visible, which is an argument FOR hiding.

### One overturn, kept with its cost attached: filtering HIDES, it no longer dims

This section used to read that filtering "only ever DIMS a subset the default view already draws …
never hides", and `SKILL.md`'s own three-part test made that its third clause. Overturned, for two
reasons:

- **Dimming cannot satisfy what a filter is for.** A datum at `opacity: 0.2` is still on the page,
  still in the tab order, still answers a hover with its own value. "Everything that value drew
  disappears together" is not expressible as an opacity; the label left behind after its mark was
  hidden is the same defect one shade lighter.
- **Two genres cannot mean two things by one word.** `map-web` has always removed. A vocabulary
  vendored into both that dimmed in one and removed in the other would be one name over two
  behaviours.

What the dimming was protecting is kept by a different mechanism: the axis, the grid, the reference
rule and every piece of furniture carry no `data-filter` at all, so the frame a reader compares
against never moves when the marks inside it do.

### A narrowed view names itself

**A filtered view is a PARTIAL view while the title above it states the whole claim, and the two must
not contradict each other silently.** So every narrowed option reveals one sentence — *"Showing
Europe — 40 of 164 countries."* — both numbers derived from the beat's own frozen data by
`filterNotes`, never typed by an author who might edit the count and not the total. It is hidden by
default and revealed by the same `:checked` that narrows the marks, so it works with JavaScript off.
**The unfiltered option reveals no note, because it is not a subset of anything: it IS the claim.**

What this deliberately does NOT do, stated so a future reader meets a decision rather than an
accident: it does not police the beat's own PROSE. `proof/web-income-life-expectancy`'s subtitle
names Cuba, and under "Europe" that sentence is still printed while Cuba is off the plot. Hiding it
with one more rule would make the page consistent and the editorial problem invisible; the honest
answer is that a beat whose standfirst names three subjects should offer options that keep them, or
accept that the standfirst describes the unfiltered view — which is a decision about the beat, not
about this genre's code. (`map-web`'s discipline records the identical residue for its own
subject sentence.)

**Nothing argument-bearing may sit behind a filter — the same rule "What must not become
interactive" states for hover.** A filter lets a reader explore PAST the claim a beat already states;
it must never be the thing that reveals the claim. The unfiltered option carries `defaultChecked`
in the SSR'd markup, not set by script, so a reader who never touches the control — and a no-JS
reader who could not meaningfully touch it — both see everything the title claims. A beat whose
headline is only true after the reader operates a filter is exactly as broken as one whose headline
is only true after a hover; see `SKILL.md`'s "When to use" for the test a beat applies before
shipping one at all (most should not).

**Mechanism: native controls, pure CSS, no script required.** One `<input type="radio"
name="chart-filter">` per option, each with an `id` the generated stylesheet keys off
(`.chart-figure:has(#chart-filter-europe:checked) …`). `:has()` — not the general sibling combinator
this genre might otherwise reach for — because the radios sit inside `<label>`s inside a
`<fieldset>`, never as a direct sibling of the plot it needs to reach; a sibling combinator cannot
cross that nesting, `:has()` can, and is supported in every evergreen browser this genre targets.
Keyboard and touch parity fall out of using real `<input>` elements rather than inventing a custom
widget: Tab reaches the group, arrow keys move within it, and a screen reader announces it as the
radio group it is, all without a line of this genre's own script. The id, the `data-filter` token,
the selector and (on a map) the live layer's own `setFilter` value are ONE string from `slugOf`,
because the last time two of those were derived differently a raw group name HTML-escaped into a
selector emptied a whole map with nothing red.

**The control must look like a decision the newsroom made.** The first shipped filter was three
default radio dots with a bare word beside each, and the owner's read of it was that it looked like
a placeholder — an unfinished form sitting under a finished chart. It is: a native radio carries the
browser's own visual language, not the beat's, and a reader who has just been shown a considered
chart reads it as work that stopped early. So this genre draws a **segmented control** — the three
options inside one rounded track, the chosen one inverted — and the whole treatment is layered
**on top of** working native radios rather than replacing them:

- The markup does not change. `<fieldset>` / `<legend>` / three `<input type="radio" name="period">`
  inside `<label>`s, with one `<div class="options">` grouping them so the track can be drawn around
  the three without enclosing the legend. It is still a radio group to a keyboard and to a screen
  reader before a single rule is applied to it.
- The input is made **transparent and stretched over its own pill** (`position: absolute; inset: 0;
  opacity: 0`) — never `display: none`, never `visibility: hidden`, either of which would take it out
  of the focus order and out of the accessibility tree. That is the line between styling a control
  and destroying one.
- Because the transparent input can no longer show its own focus ring, the ring goes on the pill
  (`label:has(input:focus-visible)`). This is the single most easily-broken part of the treatment,
  which is why the verification measures it in PIXELS rather than in computed style — see
  "Verification" below.
- The checked pill inverts to **ink on ground**, not to the accent. One semantic accent is reserved
  for the subject (`visual-system.md`); a control that borrowed it would make the only colour that
  means anything in the frame also mean "you clicked here". ink/ground is the maximum-contrast pair
  `deriveFurniture` already computed for whatever ground the newsroom brought, so the inversion is
  legible by construction — measured 21.00:1 on white, 16.43:1 on a dark navy ground, 18.08:1 on a
  warm off-white.
- Font weight does not change between states. A bolder checked label is wider, and the pills beside
  it would shift sideways every time the reader changed their mind.
- The pill is the target, and it is measured: 89 × 26 CSS px at both verification widths, clearing
  WCAG 2.2 SC 2.5.8's 24 × 24 minimum. The treatment must not end up a SMALLER target than the plain
  radio it replaced.
- `<legend>` is floated. That is not a layout instruction — float is ignored outright inside a flex
  container — it is the HTML rendering spec's own opt-out: only the first `<legend>` child that is
  neither floated nor absolutely positioned becomes the "rendered legend" the browser lifts into the
  fieldset's border. Floated, it stays an ordinary child and can sit on the same line as the options,
  which is worth ~20px of the vertical budget the window-fit rule above is spending.

**Guarded on `:has()`, and that guard is the whole reason this is safe.** The entire segmented block
sits inside `@supports selector(:has(*))`. The checked state has to be expressed through `:has()`
(the thing that is `:checked` is the input; the thing that must change is its parent label), so an
engine without `:has()` could not draw a checked pill at all — and would otherwise be left with
three identical unlit pills over an invisible input, which is worse than no treatment. There, the
whole block is dropped and the reader gets the plain native radios, which state their own
checked-ness with no help. That is not a second design to maintain: it is the design this genre
already had, and it is the same engine in which the dimming rule above could not have worked either.
An `@supports` capability query is not a `@media` breakpoint — the "no rungs" rule above is
untouched.

**What the treatment does NOT cover, stated rather than hidden.** Forced-colors / high-contrast
mode: the pill's background is overridden by the OS and the checked state loses its only signal.
Nothing else in this genre honours forced colours either — the chart is SVG with explicit fills,
which that mode does not touch — so handling it here alone would be a half-measure that made the
control look covered while the chart beside it was not. It is a real gap, named here, not closed.

## What must not become interactive

**The takeaway, the reference rule, the accent on the subject: none of them require an action —
hover, tap, keyboard focus, OR operating the filter — to be seen.** Concretely, in a typical beat:
the title text, the reference rule's own dashed line and label, the notable-year marker's own muted
label, and the subject point's accent-coloured dot and end label are all drawn unconditionally —
none of them is toggled, revealed, altered, or dimmed by the inline script or by the filter's CSS.
`assets/interaction.mjs` only ever touches each point's own `class` and the shared `#tooltip`; the
filter's CSS only ever touches elements explicitly tagged `data-period`. Neither has a code path that
can reach the header, the source line, or any of the three named elements above.

**The accent stays reserved for the subject, interaction or filter state notwithstanding.** Hovering
or focusing a non-subject point highlights it in `muted` (`.pt:hover, .pt:focus, .pt-active { fill:
var(--muted); }`) — never in `var(--accent)`. If every point turned the accent colour on hover, the
one thing an accent is for (`visual-system.md`: "one semantic accent is reserved for the subject")
would mean nothing the moment a reader started exploring the chart. The subject point is the sole
exception, and it is not really an exception: it was already drawn in the accent before any
interaction, so hovering it — or dimming its period under the filter, which it never is, since the
end point carries no `data-period` — changes nothing about what colour means.

## The one box this genre allows, and why the rest of `static-discipline.md` still holds

`static-discipline.md`'s "every layer earns its place" rule calls out boxes and frames by name as
things that usually fail the removal test. This genre allows two, both for the same structural
reason: unlike the chart's own furniture, each has to sit ON TOP of something else and stay legible
regardless of what is under it. The `#tooltip` element follows the pointer and stays legible over
whatever curve or gridline happens to be under it while a reading is being actively inspected
(`hidden` otherwise). The small chips behind the reference/peak/end-label spans (`.note,
.end-label { background: var(--ground); padding: 1px 4px; }`) exist for the same reason at rest,
not only on interaction: since this skill's second build removed the dedicated end-label gutter the
first build reserved, that label now sits IN FRONT OF the plot rather than beside it, and needs an
opaque ground behind its text the way nothing else on this frame does. Both are styled from the same
derived furniture as everything else (`--ground`/`--ink`/`--muted` custom properties, computed once
by `deriveFurniture` in `render-web.mjs`, never a literal hex in the CSS) and neither is a permanent
dashboard-chrome panel sitting on the canvas by default — which is the actual shape
`anti-patterns.md`'s "fake texture, glassmorphism, dashboard chrome" entry warns against. Every other
rule in `static-discipline.md` — one accent, derived furniture, an honest fitted scale for a line,
measured gutters, no root `<title>` (though see the next section for the one deliberate departure
this genre takes there), direct end labels over a legend — applies to this genre's own chart
furniture completely unchanged.

## One deliberate departure from the static genre's accessibility pattern

`static-discipline.md` says: "no root `<title>`... use `role="img"` plus `<desc>` for the alt text."
This genre keeps `<desc>`, drops `role="img"` from the SVG root, and puts **`role="group"` plus an
`aria-label` carrying the beat's own headline** there instead. Two separate reasons, and the second
one was missing for a long time.

`role="img"` tells assistive technology to treat the element and everything inside it as one flat,
non-interactive image — correct for a static beat, and wrong here, because it would silence the
individually-focusable, individually-labelled points this file spends most of its words defending.
`role="group"` carries no such rule, which is why it is the one used.

**And the root needs a NAME, which the earlier version of this section assumed `<desc>` supplied.**
It does not. Measured in Chrome on a delivered artifact, through `Accessibility.getFullAXTree`: a
root `<svg>` carrying only a `<desc>` comes back as `SvgRoot` with `name: ""`. The description is
there — Chrome does expose it — but it is a description attached to a nameless node, which is
precisely why a bare `<desc>` is announced inconsistently or not at all. Twenty-three root `<svg>`s
in this repository shipped that way; the two that did not (`mapgen-dot-web`, `mapgen-symbol-web`)
had already reached for `role="group"` plus a label, and are what the rest now follow.

One correction worth keeping, because it is the kind of claim this project keeps having to walk
back: this section, and three components, stated that `role="img"` **would** flatten the focusable
marks. That was reasoned from the spec, never measured. Measured now, in Chrome, with `role="img"`
added to a copy of a delivered beat: all ten marks stayed in the accessibility tree, unignored, each
with its own name. The spec's children-presentational rule is real and applies to non-focusable
children; Chrome's SVG implementation does not apply it here. `group` is used because it does not
depend on which of those two is true, not because `img` was proven to break anything.

## Verification

**There is a script, and it is the evidence: `scripts/verify-web.mjs`.** This section used to state
the rule and then leave the doing to whoever remembered — which is how a genre ends up with
"hover works" as a sentence somebody wrote after looking once. It now drives Chrome and reports 153
measurements: the window fit at seven viewport sizes, real pointer events over every reading at two,
real clicks on every filter option with scripting on AND with JavaScript disabled, and the control's
own keyboard reach, focus ring and contrast. `bun skills/chart-web/scripts/verify-web.mjs
--file <beat.html> --shots --out <dir>` — exit 0 only when every check passed.

**It may only dispatch REAL input, and that constraint is the point.** This genre has already
shipped, once, a build where hover was completely dead: `.overlay` had no `pointer-events: none`, so
it swallowed every mouse and touch event over the whole plot before `.hit-area` beneath it saw one.
Nothing caught it. The markup was correct, every attribute a unit test could assert was present, and
**keyboard focus still worked — because `element.focus()` does not hit-test**. A verification allowed
to call `.focus()`, `.click()` or `dispatchEvent(new MouseEvent(...))` would have passed in that
world, cheerfully. So the script uses only `page.mouse.move` and `page.mouse.click` at real client
coordinates, hit-tested by the compositor exactly as a reader's own pointer is. One probe is placed
deliberately on the CENTRE OF THE PEAK LABEL — an `.overlay` child, the precise pixel the old defect
lived at — and requires the tooltip to answer with that year's reading.

**A check that cannot go red is not a check, and one of these could not.** Every check in that
script was run against a deliberately broken COPY of the rendered beat (`/tmp`, never the tree) to
confirm it fails there: `pointer-events: none` deleted → 52 failures, naming `div.overlay` as the
topmost element at the plot centre; the `max-height` clamp deleted → 13, reporting 863px of overflow
at 3440 × 900; the dimming rules neutralised → 6; the radio set to `display: none` → 4. **The
focus-ring check survived its mutant.** It read computed style and accepted an outline on EITHER the
pill or the input — and the input, being `opacity: 0`, still reported the user agent's own
`outline: auto 1px`, which paints nothing at all. It was rewritten to screenshot the control
unfocused and focused and require the two frames to DIFFER; against the mutant it now reports "5048B
vs 5048B — IDENTICAL, so nothing is drawn for focus". **A computed style is a claim about a box;
only a rendered frame is a claim about what a reader can see.** That lesson generalises past this
one check and is the same one the "trust the pixels over any intermediate number" rule below states.

**`page.mouse.move` SILENTLY DOES NOTHING AT FRACTIONAL COORDINATES.** Measured on a real beat
during the migration: a probe at x=65.63 produced no hover at all; the identical probe at x=66
worked. Nothing throws and nothing warns — the tooltip simply never appears, which is
indistinguishable from a chart whose hover is broken, and it cost one agent an entire wrong
verification round. Any probe computed from a `getBoundingClientRect` centre is fractional roughly
half the time, so this is the default case rather than an edge one. `verify-web.mjs` rounds every
coordinate at one boundary function (`probe`) rather than at each call site, where one would
eventually be forgotten. **Anything else in this project that drives a pointer must do the same.**

**Every check is conditional on the beat's own shape, and every skip is announced.** The first build
of the verifier hard-coded the SEED's shape — `.pt` for a mark, `#period-late` for a filter — and was
therefore unusable on most of the genre. Measured across the thirteen shipped web beats: all 13
carry `data-detail`, only 5 carry `.pt`, the hit element is variously `bin-hit`, `segment-hit`,
`step-hit`, `bar-hit`, `hit-row` or `row-hit`, and **not one of them ships a filter** — which is the
correct outcome of the three-part test above, not an omission. So:

- Marks are discovered by **`[data-detail]`**, the genre's real contract: it is the attribute
  `interaction.mjs` reads to fill the tooltip and the one thing every beat bakes server-side.
- The filter checks **skip aloud** when a beat ships no `fieldset.chart-filter`, and the invariant
  they were really protecting — the default view dims nothing, every argument-bearing word is drawn
  — is checked for every beat, filter or not.
- **Which reading a shared hit area resolves to is the beat's own business.** The seed resolves by
  nearest x, which is right for a line; a scatter resolves by nearest in both axes, which is right
  for a cloud where two countries share an income. The verifier asserts exact identity only where
  `elementFromPoint` names the mark itself, and otherwise demands only what survives every rule:
  the tooltip appears, and it names a reading the beat actually drew.
- A run prints `N passed, N failed, N skipped` and reprints every skip, so a run that verified
  nothing cannot look like a run that verified everything.

**A checker's own assumptions are the likeliest thing wrong with it.** Every one of the following
was this script mistaking its own layout assumption for a defect in a sound beat, and each was found
only by running it across all fifteen: "a `.pt` beat resolves by nearest x" (67 invented failures on
a scatter); "the mark I aimed at is the mark that answers" (false wherever marks overlap, i.e. most
dense beats at 375px); "the nearest mark is in my probe sample" (reported 1815 where 1817 was
correct, on a 224-reading beat sampled down to 40); "a hit area sits at the plot's centre" (a
small-multiples grid puts a gutter there); "every beat draws an x-axis row" (a slope, a ranking and a
small-multiples grid do not — this one crashed the script outright). **Run a new check against every
beat before believing what it says about one.**

**What the script does not reach, so a human still looks.** It reads text, geometry, opacity and
colour; it does not look at the picture. A label colliding with a line, a clipped mark, a squat plot
on a phone — none of that is visible from inside it, and `--shots` exists so those frames get looked
at by an eye. It drives one engine (Chrome); `:has()`, `dvh` and `@supports selector()` are all
Baseline but none is verified here on Safari or Firefox. Touch is exercised as a pointer, not as a
finger.

The rule the script implements, unchanged: verify by driving a real browser at SEVERAL WIDTHS, not
by reading the markup, not by trusting a unit test, and not by reading a computed-style value in
isolation. `doctrine` states the "drive
a real browser" rule as universal and it binds harder here than anywhere else in this twin: a static
render can be checked with a PNG; an interactive, fluid one cannot, because the thing being verified
— does hovering point X show point X's own value, does Tab actually reach it, does the frame
genuinely fill a wide container at the same type size it used at a narrow one, does nothing clip at
375px — is a behaviour over a RANGE of widths, not a single frame. **A style value that contradicts a
screenshot means the value is measuring the wrong box, not that the screenshot is wrong** — this
skill's own second build exists because a screenshot, not a computed-style reading, is what showed
the first build's frame stopping short of its container; trust the rendered pixels over any
intermediate number a script reports about them. `test/` in this skill covers what a unit test CAN
honestly prove (the geometry, the palette, the point count, the exact formatted value per point, the
pure `nearestIndex` helper, that the `<svg>` carries no `<text>`, that the shared stylesheet sets no
`max-width` on the chart frame, that the filter classifies periods correctly) and stops there; the
DOM wiring in `assets/interaction.mjs`'s `initChart`, the fluid stretch at a real container width,
and the filter's own keyboard/no-JS behaviour are proven, or not, by opening the rendered file at
several widths and using it.

## The entrance, and the one thing it may never become

**The owner asked for an entrance animation for the whole graphic and, asked what style, answered
*"dans le même style que la vidéo"*.** That answer decides the design: the web entrance **replays
the video's own choreography** — `chart-video/assets/timing.ts`'s five leading events, in its
order, under its ordering rule — rather than inventing a second animation grammar that would drift
from the first. The vocabulary is not decoration on this decision, it *is* the decision: borrowing
it is what makes the entrance carry the ARGUMENT'S order. An entrance that fades the whole figure in
as one layer is `motion-grammar.md`'s first anti-pattern, "motion added for energy", with a CSS
property attached — and `web-entrance-is-an-addition.test.ts` refuses it mechanically by requiring
at least three distinct delays.

**The contract is copied, not imported** (`assets/entrance.ts`), because nothing under a skill may
import out of it. What was copied verbatim, what was deliberately changed (`hold` dropped,
milliseconds not frames, motion ÷3 and the two pauses ÷5) and why is written in that file's own
header, event by event, with each video ancestor beside it.

**The mechanism belongs to the BEAT; the contract owns only when and in what order.** A line's
reveal is a head advancing along its own path, a bar chart's is bars growing from a baseline, a
pyramid's is two rows meeting. `ChartWebSeed.tsx` demonstrates one; it is not a general animator,
for the same reason nothing else in this genre is.

**Three rules that are not negotiable, and the last one is not a nicety.**

1. **SSR ships the settled page and every keyframe runs *to* it.** The animation takes something
   away and gives it back. With the script absent there is no `entered` class, no animation, and the
   complete graphic — driven: 0 animations, `transform: none`, minimum layer opacity 1.
2. **The trigger is the reader's view, never the load.** An embed sits below the fold of an article;
   an entrance that plays on load plays to nobody, and that is worse than a static chart.
3. **`prefers-reduced-motion: reduce` gives the finished graphic instantly, with no motion at all.**
   Not an animation that completes in 0ms — the keyframes and their rules live entirely inside
   `@media (prefers-reduced-motion: no-preference)`, so under `reduce` there is nothing to resolve.
   This is `scrolly`'s precedent (put the animated property out of reach rather than overriding
   it back), and it is the one place in this genre where "degrade gracefully" is a legal expectation.

**Measured, not chosen: the reveal is a clip wipe and not a `stroke-dashoffset`.** A probe drove the
dash form under this genre's own `vector-effect="non-scaling-stroke"` and
`preserveAspectRatio="none"`: **99 % drawn at t=0 and 80 % at the end** — the two coordinate spaces
disagree. The wipe tracked the clock exactly, and on a series monotone in x it is the same picture,
frame for frame, as the video's `drawnSoFar`.

**Verification is `scripts/verify-entrance.mjs`, and it measures GEOMETRY twice** — the clip's own
`scaleX` out of the computed matrix, and how many of the beat's segments are hit-testable at their
own midpoints through `elementsFromPoint`. An opacity fade over a finished picture reports every
segment hittable from the first sample; that is the failure this project already met on the scrolly,
and it is the signature these two instruments exist to tell apart.

**The copy is walked, in two halves, by `splash/test/web-entrance-parity.test.ts`.** A vendored copy
with no parity walker is the drift this whole method depends on catching, and this one went a day
without one. Half one compares `endOf` and `progressOf` as TEXT, normalised, with exactly one
declared substitution (`EntranceEvent` for `TimingEvent`) that is itself asserted to be real. Half
two runs the SAME sixteen fixtures through `checkTiming` and `checkEntrance` and makes the two agree
about legality — because **a text comparison cannot see a rule whose meaning drifted while its
letters stayed**. The verdicts cannot be compared sentence for sentence (the two word the same rule
differently on purpose, and three rules are deliberately unshared), so each message is CLASSIFIED
into a shared token or a named divergence — `hold`'s two rules, and `ENTRANCE_CEILING_MS` — and an
unclassified message fails loudly rather than being dropped.

Mutations, run in a copy under `/tmp`, never in the working tree:

| mutation | what went red |
| --- | --- |
| `progressOf` loses its lower clamp in `entrance.ts` | the text half — `progressOf should be the same function in both files`, printing both normalised bodies. 27 pass / 1 fail |
| `checkEntrance`'s ordering `<` becomes `<=` | **the text half stays green** and the fixture half goes red on 8 of 16 — `out-of-order:subject@1560<reveal@1560` on this genre's own edit, where the video reports nothing. 20 pass / 8 fail. This is the mutation that proves half two earns its place |
| a new rule pushed into `checkEntrance` only | `unclassified: ["the reveal is 78ms, too short to read"]` — a rule that appeared on one side and nothing compares. 27 pass / 1 fail |

Three things it provably does not catch, stated in its own header: a defect the two share (they are
compared against each other, never against the truth); the PACE, which is an edit and not a formula;
and `atProgress`, which has no video ancestor — its own claim,
`progressOf(atProgress(e, f), e) === f`, is asserted directly instead, to within the half
millisecond its rounding costs.

### A clip is right for a line and wrong for the whole bar family

**Measured, and paid for by a revert.** A lollipop entrance was built on the clip wipe above, driven
green by both of the instruments above, and reverted on looking at it. Every stem starts at the same
zero, so at 40 % of the wipe all fifteen stems are 40 % of the plot long: **for two thirds of the
build the chart states that all fifteen countries are equal, which is the opposite of what its title
says.** A clip uncovers a finished picture; that is the truth about a line whose x axis IS time, and
a lie about anything whose reading is a LENGTH FROM A BASELINE.

So the fourth motion is **`grow`**: one mark, scaling from **its own declared baseline** to **its own
value**, along the one axis that carries its reading, on **its own delay**. The other axis stays at 1
— a bar's thickness carries no reading and animating it would be motion added for energy. The
cascade's arithmetic is `entrance.ts`'s `markEvent`, which is the video's own `rowWindow` (seven
video beats here carry it as three typed lines) converted to milliseconds THROUGH `atProgress`, so
the cascade and the label rule are measured against the same window. **Which mark is index 0 is the
beat's own editorial call** and always will be — the contract owns the arithmetic, not the order.

The baseline is stated per mark because there is no single one: a column's is the plot floor, a
diverging bar's a centre line, a stem's wherever the value axis's zero landed. How it resolves was
**measured, not read off a spec**: with `transform-box: view-box`, Chrome resolves a length
`transform-origin` in the ELEMENT'S OWN local coordinates — a `<line x1="100">` given
`transform-origin: 100px 200px` and `scaleX(0.5)` keeps its left end at 100 and halves its length.

**A diverging bar is the type a clip cannot reveal at all**, which is worth stating separately: its
bars grow left AND right out of the zero line, so a left-to-right wipe would build every one of them
backwards — from its value toward the reference the value is measured from.

### The third instrument, and the reading that makes it work

Both instruments above read A CLIP, so neither could be pointed at a bar family beat. **A green
instrument that cannot see the defect is the defect.** So a bar-family beat DECLARES ITS MARKS
(`data-entrance-key`, written by `entranceLayer` when the beat asks for `grow`) and
`verify-entrance.mjs` measures, per mark, per frame:

- **its PAINTED EXTENT, in the same unit for every mark on the page** — the mark's own settled
  geometry walked from its baseline toward its tip in FIXED STEPS OF USER UNITS, each step
  hit-tested through `elementsFromPoint` at real client coordinates, mapped through the mark's
  **parent** screen CTM (the parent's, because the mark's own carries the animation being measured);
- **its own scale factor** off the computed transform matrix, on the axis it encodes along.

**Fixed shared steps rather than each mark's own fraction is the whole point.** Under a clip every
stem reports the identical painted extent in user units while their settled extents differ, and that
is the sentence the tool has to be able to say before it can refuse it.

Three clauses follow that the clip instruments cannot express — each mark's own extent GROWS; the
marks do NOT all arrive on one clock; and **no frame shows the marks all equal unless they really
are** (more than one step of extent, at least three marks and at least half of them, before an equal
reading is called a claim rather than a coincidence). The label rule is paired mark by mark
(`data-entrance-label` names a key), because in a cascade the first row's label is legitimately
painted while the last row's mark has not started, and it asks BOTH instruments: the scale, which is
exact at any size, and the painted extent, which is what catches a reveal that is not a per-mark
growth at all.

Mutations, run on the delivered artifact in a copy under `/tmp`, never in the working tree:

| mutation | what went red |
| --- | --- |
| the marks put back under one clip — the reverted design, restored | *"at reading 6 all 15 visible marks were the same length (147.78 ×15) while their own values are not (738.9, 718.63, …) — an intermediate frame is an assertion, and this one says they are equal"*, plus *"no mark's own scale ran from nothing to whole"*. 8 failures |
| every mark on the master clock (one delay, one duration) | *"the widest spread between the marks' own progress at any one reading was 0.04 — they arrive together, so the build states no order"*. 4 failures |
| every value label on the master clock | the label rule, mark by mark: *"the label for Belgium was painted while its own mark was 350.98 of 738.9"*. 2 failures |
| `--e-sx` stripped from every grow layer (tree copy) | the markup guard: *"its keyframe resolves to scale(1, 1) and the mark is drawn in full from the first millisecond"*. 19 pass / 1 fail |
| a reveal mark's `data-entrance-key` dropped (tree copy) | *"a grow mark on the reveal … without a key it sits outside every per-mark check"*, and the label that named it goes dangling. 19 / 1 |
| `markEvent`'s end computed outside `atProgress` | the parity test: the rowWindow comparison AND *"should keep every mark inside the reveal it divides"*. 31 / 2 |

**Two things the beats taught the instrument, and both were false readings on settled pages.** The
no-JS pass never scrolled, and `elementsFromPoint` answers about the VIEWPORT — it reported every
mark at zero painted extent on a page that is in fact complete. And three checks were inventing
their own tolerance from each mark's OWN settled length; six of the diverging bar's twenty-seven
bars are shorter than the shared step (Croatia's is 1.2 user units against a step of 19.7) and were
reported unfinished. **The reader publishes the step it used**, and every tolerance downstream is
that number.
