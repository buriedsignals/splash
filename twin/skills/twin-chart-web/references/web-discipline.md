# Web discipline

The rules the interactive chart genre is written under. There was no doctrine for this genre before
this file — it was written while building the first web beat (`assets/EmissionsWeb.tsx`, the CO₂
story), the same way `static-discipline.md` was written against the first static beat and
`motion-grammar.md` against the first video build. Every rule below is either a decision this genre
needed and the others did not, or an explicit inheritance from `twin-doctrine` stated so it is not
silently assumed.

## What hover reveals that the static chart could not show

**The honest use of interaction here is detail the static frame had to omit, never the same numbers
repeated on demand.** `static-discipline.md`'s "Axis density" rule gives a static frame a
conventional, dense grid — but even a dense grid on a 75-point series (1950–2024) only makes a
handful of years locatable to the pixel; it cannot label all 75 without becoming a table wearing a
line's clothes. That is the gap this genre closes: every reading gets an exact, on-demand value —
`data-detail="1967 · 32,5 Mt"` on 75 circles, none of it printed by default, all of it one hover, tap
or keyboard focus away.

This is also the test for what does NOT belong behind interaction. The title, the reference rule's
own label, the peak's muted marker, the subject's end label — none of these are things the static
frame "had to omit." They are the argument, already stated, already visible. If a rule ever moves
one of them behind a hover, that is decoration wearing this genre's clothes, not the thing this
genre exists to add. See "What must not become interactive" below.

**The peak's exact figure (46,2 Mt, 1973) is reachable on hover, even though the printed marker
stays silent about it and `BRIEF.md` says not to restate it.** These are not the same rule read two
ways. "Do not restate 46,2" is about the passive reading experience — a number the article's own
prose already states, printed a second time on the chart, is `anti-patterns.md`'s "repeated years or
values": redundant decoding work the reader did not ask for. Hover is opt-in: nothing is decoded
until the reader chooses to ask this specific point what it was, and every OTHER point on the curve
answers exactly the same kind of question the same way. Carving out 1973 as the one year that stays
mute even on request would be arbitrary, not principled — the rule this genre needs is "printed
nowhere by default," not "unknowable."

## Keyboard and touch

A hover-only chart excludes every keyboard user and every phone reader, so neither is treated as
an afterthought layered on top of a mouse-first build:

- **Every one of the 75 points is `tabIndex={0}` at build time**, not a roving `-1`/`0` pair
  assembled by the inline script. This is the load-bearing decision in this file: a screen reader or
  keyboard user reaches every reading with Tab alone, and reading it does not require the inline
  script to have run at all — `aria-label` is a static SVG attribute, read by assistive tech
  independent of JavaScript. What the script adds on top is speed (`ArrowRight`/`ArrowLeft`/`Home`/
  `End` to jump between readings without 75 Tab presses) and the *visual* tooltip box for a sighted
  keyboard user, who cannot rely on a screen reader's announcement alone. **Known cost, not hidden**:
  75 Tab stops with the script absent is slow. A roving-tabindex version that collapses this to one
  stop is the natural next iteration and is not built here — seed this genre's own instructions with
  the *why* before adding the *how*, is the register this file's own header note recommends, and the
  one honest sentence at the end of this beat's own report names this gap explicitly.
- **Touch and mouse share one code path.** Pointer events (`pointerdown`/`pointermove`) fire for
  mouse, pen and touch alike, and detail is resolved by nearest-point-on-x over the whole plot
  rectangle (`.hit-area`), not by landing a tap on an individual 5px circle. A phone reader taps
  anywhere in the plot and gets the reading nearest that x position — the same target-size problem a
  71 iOS/Android accessibility guideline exists for is sidestepped by not requiring a small target at
  all.
- **Focus shows the identical detail box hover shows.** One `show(point, x, y)` function, called from
  `focus`, `pointermove` and `pointerdown` alike (`assets/interaction.mjs`) — there is no second,
  degraded "keyboard mode" that answers a different or thinner question than the mouse path does.

## What survives with JavaScript disabled

**Everything the static genre would have shipped for this same story survives untouched**: title,
limits subtitle, source line, the 1967 reference rule and its label, the muted 1973 peak marker, the
full curve, the 2024 subject point and its end label. All of it is plain SSR'd SVG markup — nothing
about the chart's own argument depends on the script executing. **What does not survive**: hover, tap
detail on the 75 individual points via the visual tooltip, and the `ArrowRight`/`ArrowLeft`/`Home`/
`End` shortcuts. A screen reader user still reaches every reading's `aria-label` via plain Tab (see
above) — the one path that survives JS being off is, not coincidentally, the one this file spent the
most words defending. For a newsroom that matters because a CMS iframe, an AMP page or a stripped
reader-mode view is a real deployment target, not a hypothetical: this genre degrades to
"the static beat, plus 75 silently-present numbers a keyboard can still reach," never to a blank
frame.

## Responsive behaviour

**Two rungs, not a continuous reflow.** `assets/EmissionsWeb.tsx` exports one component and two
`WebLayout` instances — `DESKTOP_LAYOUT` (900px) and `NARROW_LAYOUT` (360px) — and
`scripts/render-web.mjs` SSRs both, once, at build time, exactly the way the static genre SSRs its
one frame. The HTML wrapper picks between the two pre-rendered SVGs with a single CSS media query
(`max-width: 480px`); there is no client-side layout engine recomputing gutters or tick counts as the
window resizes; nothing about the chosen frame changes after the page loads except which of the two
`display: none`/`display: block` the media query is currently applying.

This mirrors the discipline the other two genres already keep, not a shortcut invented for this one:
`twin-chart-beat`'s own convention is "write the beat's own component, do not parameterise one
component into a universal shape" (`SKILL.md`, "When to use"); `twin-chart-video` keeps one
composition per beat rather than a single video chart driven by a config object. A responsive engine
that recomputes `tickStep`'s round interval, re-wraps the title and re-measures every gutter live in
the browser, for every pixel of window width, is that same "one universal shape" anti-pattern
wearing a resize listener — and every number that engine would need (`d3-scale`'s `.nice()`
rounding, `d3-array`'s `tickStep`) is exactly the kind of thing `static-discipline.md`'s own "Honest
scale" section already warns against hand-rolling under time pressure. Two hand-authored layouts,
each with its own tick hints and its own `plotMinHeight`, is both less code and less risk than one
continuously-adaptive one.

**What re-derives per layout, decided explicitly rather than left to guesswork**: gutters (`measure`d
against that layout's own font sizes and its own actual tick/end-label strings), x-tick density
(`tickStep` re-run at that layout's own `xTickHint`), title/subtitle wrapping (against that layout's
own width), and the frame's total height (`plotTop + plotMinHeight + bottomPad` — **derived, not a
hand-picked constant**, specifically so a title that wraps to three lines at 360px cannot silently
clip the plot below it, the exact failure mode a fixed height constant would risk). **What is fixed
within a layout**: font sizes, stroke widths, and the point/hit-area geometry all come from that one
layout's own numbers, applied consistently top to bottom — nothing scales continuously inside a
single rendered frame; only the `viewBox`-to-container ratio does, via ordinary responsive SVG
(`width: 100%; height: auto`), which is why the desktop frame still reads fine at, say, 600px wide —
mildly scaled down, not reflowed — before the 480px breakpoint hands off to the narrow layout's own,
independently-tuned numbers.

## What must not become interactive

**The takeaway, the reference rule, the accent on the subject: none of them require an action to be
seen.** Concretely, in this beat: the title text, the "Niveau de 1967" label and its dashed rule, the
"pic de 1973" marker's own muted label, and the 2024 point's accent-coloured dot and end label are
all drawn unconditionally in the SSR'd SVG — none of them is toggled, revealed, or altered by the
inline script. `assets/interaction.mjs` only ever touches the 75 `.pt` circles' own `class` and the
shared `#tooltip` element; it has no code path that can hide or move anything else.

**The accent stays reserved for the subject, interaction or not.** Hovering or focusing a
non-subject point highlights it in `muted` (`.pt:hover, .pt:focus, .pt-active { fill: var(--muted);
}`) — never in `var(--accent)`. If every point turned the accent colour on hover, the one thing an
accent is for (`visual-system.md`: "one semantic accent is reserved for the subject") would mean
nothing the moment a reader started exploring the chart. The 2024 point is the sole exception, and it
is not really an exception: it was already drawn in the accent before any interaction, so hovering it
changes nothing about what colour means.

## The one box this genre allows, and why the rest of `static-discipline.md` still holds

`static-discipline.md`'s "every layer earns its place" rule calls out boxes and frames by name as
things that usually fail the removal test. The `#tooltip` element in this genre is a box, and it is
the one exception: unlike the chart's own furniture, it has to sit ON TOP of the plot, follow the
pointer, and stay legible over whatever curve or gridline happens to be under it — which needs an
opaque ground behind its text the way nothing else on this static-derived frame does. It is styled
from the same derived furniture as everything else (`--ground`/`--ink`/`--muted` custom properties,
computed once by `deriveFurniture` in `render-web.mjs`, never a literal hex in the CSS) and it exists
only while a reading is being actively inspected (`hidden` otherwise) — it is not a permanent
dashboard-chrome panel sitting on the canvas by default, which is the actual shape
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
silence the 75 individually-focusable, individually-labelled points this file spends most of its
words defending. `<desc>` is still picked up as the SVG's accessible description without that role,
so the beat-level alt text survives; only the "flatten my children" behaviour is opted out of, and
only because this genre, uniquely among the three, has children that need their own names.

## Verification

Applied by driving a real browser, not by reading the markup or trusting a unit test. `twin-doctrine`
states this as a universal rule and it binds harder here than anywhere else in this twin: a static
render can be checked with a PNG; an interactive one cannot, because the thing being verified — does
hovering point X show point X's own value, does Tab actually reach it, does nothing clip at 360px —
is a behaviour over time, not a frame. `test/` in this skill covers what a unit test CAN honestly
prove (the geometry, the palette, the point count, the exact formatted value per point, the pure
`nearestIndex` helper) and stops there; the DOM wiring in `assets/interaction.mjs`'s `initChart` is
proven, or not, by opening the rendered file and using it.
