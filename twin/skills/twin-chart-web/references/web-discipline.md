# Web discipline

The rules the interactive chart genre is written under. There was no doctrine for this genre before
this file — it was written while building the first web beat (`proof/co2-suisse/EmissionsWeb.tsx`,
the CO₂ story), the same way `static-discipline.md` was written against the first static beat and
`motion-grammar.md` against the first video build. It was rewritten again against this skill's
SECOND build, when the owner's own read of the first build's shipped output was that the frame did
not fill its container — see "Responsive behaviour" below, which is the section this rewrite
actually overturns; every other section in this file still holds from the first build. Every rule
below is either a decision this genre needed and the others did not, or an explicit inheritance from
`twin-doctrine` stated so it is not silently assumed.

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
via `aspect-ratio` avoids both failure modes with one CSS property and no script. The two places a
long line of prose genuinely does become unreadable at full bleed — the header block (title +
caveat) and the source line — are the ONLY things given a reading-measure cap (`640px`, `render-web.mjs`'s
`buildCss`); the chart frame itself is never capped, on purpose, because a line chart's own geometry
does not have a "too wide to read" failure mode the way a paragraph does — it has an "empty space
either side" failure mode instead, which is the one this rewrite closes.

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

**Nothing argument-bearing may sit behind a filter — the same rule "What must not become
interactive" states for hover, extended to a second interaction surface this skill's second build
adds.** A filter lets a reader explore PAST the claim a beat already states; it must never be the
thing that reveals the claim in the first place. Concretely, in this seed: the default "All years"
state is the ONLY state with no script or CSS override active — it is what a no-JS reader sees, and
it already draws the full fall the title claims. The other two options ("2015–2019", "2020–2025")
narrow the reader's FOCUS by dimming (`opacity: 0.2`, `render-web.mjs`) the segments and points
outside the chosen period — they never hide, remove, or fail to SSR a reading, and they never touch
the reference rule, the peak marker/label or the end point/label, none of which carries the
`data-period` attribute the filter's CSS keys off. A beat whose headline is only true after the
reader operates a filter is exactly as broken as one whose headline is only true after a hover — see
`SKILL.md`'s "When to use" for the three-part test a beat applies before shipping a filter at all
(most should not).

**Mechanism: native controls, pure CSS, no script required.** Three `<input type="radio"
name="period">` elements, each with an `id` the shared stylesheet keys off
(`.chart-figure:has(#period-early:checked) …`). `:has()` — not the general sibling combinator this
genre might otherwise reach for — because the radios sit inside `<label>`s inside a `<fieldset>`,
never as a direct sibling of the plot it needs to reach; a sibling combinator cannot cross that
nesting, `:has()` can, and is supported in every evergreen browser this genre targets. Keyboard and
touch parity fall out of using real `<input>` elements rather than inventing a custom widget: Tab
reaches the group, arrow keys move within it, and a screen reader announces it as the radio group it
is, all without a line of this genre's own script.

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
This genre keeps `<desc>` and drops `role="img"` from the SVG root. The reason is structural, not
stylistic: `role="img"` tells assistive technology to treat the element and everything inside it as
one flat, non-interactive image — correct for a static beat, and exactly wrong here, because it would
silence the individually-focusable, individually-labelled points this file spends most of its words
defending. `<desc>` is still picked up as the SVG's accessible description without that role,
so the beat-level alt text survives; only the "flatten my children" behaviour is opted out of, and
only because this genre, uniquely among the three, has children that need their own names.

## Verification

**There is a script, and it is the evidence: `scripts/verify-web.mjs`.** This section used to state
the rule and then leave the doing to whoever remembered — which is how a genre ends up with
"hover works" as a sentence somebody wrote after looking once. It now drives Chrome and reports 153
measurements: the window fit at seven viewport sizes, real pointer events over every reading at two,
real clicks on every filter option with scripting on AND with JavaScript disabled, and the control's
own keyboard reach, focus ring and contrast. `bun skills/twin-chart-web/scripts/verify-web.mjs
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
isolation. `twin-doctrine` states the "drive
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
