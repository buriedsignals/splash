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

Applied by driving a real browser at SEVERAL WIDTHS, not by reading the markup, not by trusting a
unit test, and not by reading a computed-style value in isolation. `twin-doctrine` states the "drive
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
