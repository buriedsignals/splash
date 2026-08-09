# Scrolly discipline

The rules the scroll-driven vehicle is written under. There was no doctrine for this genre before
this file — it was written while building this skill's own first seed, then REWRITTEN against the
same seed's second build after two structural corrections, and REWRITTEN AGAIN against the third:
the composition, and the crossfade mechanism, both corrected in the same round. Every rule below is
either a decision this genre needed and the others did not, or an explicit inheritance from
`twin-doctrine` stated so it is not silently assumed. Every section below describes the CURRENT
code, not a remedy it once used and no longer does — a stale section here is what this file's own
third correction was written to stop being (see "The graphic advances continuously," below, for
the corrected sections; "The one gotcha" and "Measuring prose over the graphic" are unchanged from
the second build and remain accurate as written).

## The one gotcha that will waste your day (read first)

**`position: sticky` reserves its element's ORIGINAL layout box at its original document
position.** This is a fact about how `sticky` works, not a bug — but this skill's first build
treated it as one, because it did not think through the consequence: everything AFTER the sticky
element in the document keeps its own position exactly as if the sticky element had never moved,
so as the reader scrolls, a later sibling's position in VIEWPORT coordinates keeps climbing —
through the exact band where it visually sits WITHIN the sticky element's own screen footprint. In
a single stacked column, with an opaque graphic pinned above ordinary-flow prose, that is not a
corner case — it happens on ordinary use, every single step, and it is what this skill's own first
build shipped: a rendered page that *looked* correct in a screenshot taken before scrolling (title
present, every frame present, every paragraph present) and only revealed the defect once a real
browser was scrolled to the third step and a screenshot taken AFTER.

**What this skill's first build did about it — kept as a documented dead end, not the current
shape.** It put the sticky graphic and the scrolling steps in two separate columns, side by side, so
they never shared horizontal space at any scroll position. This made the COLLISION structurally
impossible. It also produced the wrong SHAPE: the project owner's correction, verbatim in spirit —
*"you solved the sticky-overlap bug by splitting into two columns, that avoids the problem rather
than solving it, and it produces the wrong form. The intended shape is the ordinary scrollytelling
one: a graphic filling the frame behind, prose travelling over it."* Avoiding a collision by never
letting two things occupy the same space is not the same thing as making the two things that DO
occupy the same space legible together — and the second thing is what a real scrollytelling piece
needs, because "the graphic is the ground the prose reads against" is the whole visual grammar of
the format.

**What this skill ships instead — the remedy that survived, gravure-worthy for the next scrolly
built anywhere in this project.** Put the sticky graphic BEHIND the scrolling prose, on purpose,
using the SAME reservation behaviour that caused the original defect rather than fighting it:

```css
.scrolly-track { --graphic-h: min(70vh, 640px); position: relative; }
.scrolly-graphic { position: sticky; top: 0; height: var(--graphic-h); z-index: 0; }
.scrolly-steps { position: relative; z-index: 1; margin-top: calc(-1 * var(--graphic-h)); }
```

`.scrolly-graphic` reserves a `--graphic-h`-tall box at the top of `.scrolly-track`, in normal flow
— exactly the reservation the "one gotcha" paragraph above describes. `.scrolly-steps`, the very
next sibling, is pulled back UP over that exact box with a negative top margin equal to the
graphic's own height, and given a higher `z-index` so it paints on top. The two elements now start
at the SAME document coordinate on purpose: the sticky graphic pins there for as long as
`.scrolly-track` has scroll distance left to give (its own total height, after the negative margin
collapses the graphic's box into the steps', equals the steps' own height — so the graphic sticks
for the steps' full length, then unpins naturally as the track ends), and the reader's prose
literally travels over it as they scroll. **The remedy did not remove the reservation behaviour this
file's own "one gotcha" describes — it exploited it.** That is why this section keeps the original
root-cause explanation above unchanged and only replaces what USED to follow it: the fix is not "put
things in different columns so they never meet," it is "let them meet on purpose, and make sure
meeting is legible" — which the next section covers.

## Measuring prose over the graphic

**A panel that LOOKS opaque does not, by itself, prove the text on it is legible against everything
that might be behind it.** The project owner's own instruction: *"measure the contrast where text
actually crosses the graphic; do not assume a panel background settles it."* This genre answers that
literally, not by eye:

1. Every step's own prose sits inside a `.step-panel` painted **fully opaque**, `background:
   var(--ground)` — never a translucent scrim. A translucent scrim's EFFECTIVE colour is a blend of
   the scrim and whatever part of the graphic happens to sit behind it at a given scroll position,
   which is not a single, measurable value — it changes frame to frame, pixel to pixel. An opaque
   panel has no such ambiguity: wherever it sits, over the photograph or over the diagram, the
   colour a reader's eye actually meets is `--ground`, full stop, because the panel fully occludes
   whatever the graphic shows underneath it.
2. Because the background a reader meets is always exactly `--ground`, the only contrast question
   left is ink-on-ground — the SAME pairing `deriveFurniture`
   (`twin-doctrine/references/visual-system.md`'s own escalation rule) already computes and
   guarantees for every other piece of furniture in this twin. This is not a new rule invented for
   this genre; it is the SAME rule `visual-system.md` states for a mark's colour reused as a label
   ("A mark's colour is measured again when it becomes a label") — prose sitting over a drawing is
   exactly that situation, a second measurement owed because the pairing changed (page ground → a
   panel over a graphic), even though the mechanism computing it is identical.
3. This is asserted, not assumed, in TWO places: `renderScrolly`'s own tripwire (`scripts/
   render-scrolly.mjs`) throws if the computed `contrast(ink, ground)` ever falls under 4.5 — which
   should be structurally impossible given `deriveFurniture`'s own guarantee, so the tripwire exists
   to catch a REGRESSION in that guarantee, not to make a decision — and again, independently, in
   `test/render-scrolly.test.ts`. On this seed's own light ground (`#FFFFFF`), the measured value is
   **21.00:1** — pure black ink on white ground, the maximum possible ratio.
4. This was confirmed a SECOND way — not merely computed in node — by driving a real Chrome to the
   rendered page and reading `getComputedStyle(panel).backgroundColor` /
   `getComputedStyle(panel).color` directly off the live DOM: `rgb(255, 255, 255)` /
   `rgb(0, 0, 0)`, matching the build-time computation exactly. A panel's CSS declaring an opaque
   colour is not proof the browser actually painted it that way at the moment text crosses the
   graphic; reading the computed style in a driven browser is.

**What this means for a real beat with a non-white house ground.** `deriveFurniture(ground)`
escalates `ink` to whichever pole (`#000000`/`#FFFFFF`) measures higher against that `ground`, the
same mid-grey-band escalation `visual-system.md` describes — so the 4.5:1 floor holds for any valid
`ground`, not just this seed's own white. A beat that wants the PANEL itself to read as part of the
graphic's own colour story (a tinted panel, not plain page-white) would need to pass that panel
colour through `deriveFurniture` as its OWN ground and re-derive ink from it — `renderScrolly`'s
signature only accepts one `ground` today (the page's own), so a beat wanting a differently-tinted
panel is a real, not-yet-built extension, not a silent gap.

## The composition is a centred reading column, not edge-to-edge

**The assembly — header, sticky graphic, scrolling prose, all of it — sits in a centred column
sized to a comfortable reading measure, never stretched to the window's own edges.** This is
independent of the overlap mechanism above: "the graphic fills the frame" (the previous section)
describes the graphic filling ITS OWN box; it says nothing about how wide that box is allowed to be
on a wide window, and the second build left that box exactly as wide as the page's own content
width — `max-width: 720px`, which is a reasonable reading measure on a genuinely maximised monitor
but leaves almost no margin at all on a realistic, NOT maximised desktop browser window (a docked
editor-plus-browser split, a window sized to roughly 700–900px, common enough to be the ordinary
case rather than an edge one): at a 750px window, a 720px column leaves 15px on each side, which
reads as edge-to-edge even though it is, technically, centred. The project owner's own correction:
*the whole thing centred, a readable column, the graphic sized to a comfortable reading measure,
not bleeding to the window edges.*

The fix: `.scrolly`'s own `max-width` dropped from `720px` to `640px` — the classic editorial
column width, comfortably under the ~75-character line-length ceiling even measured against the
panel's own 17px prose — and its side padding changed from a fixed `16px` to
`clamp(16px, 6vw, 56px)`, so the margin visible on either side of the column SCALES with the window
instead of vanishing at exactly the width where a fixed padding stops mattering. Measured, in a
real, driven browser, at three widths: a 1440px desktop window leaves 400px on each side; the
750–800px "realistic desktop, not maximised" window this section names leaves roughly 55–80px on
each side (never single digits); a 375px phone viewport uses the window's full width, as a phone
should, but keeps the same `clamp`-derived inset (≈22px on a 375px screen) so the prose panel and
the graphic both still sit inboard of the true screen edge, with no horizontal overflow at either
the top of the page or partway through the second step (`document.documentElement.scrollWidth`
never exceeds `window.innerWidth`, confirmed at both scroll positions, not only the first).

This is purely a box-model change — it does not touch the sticky-graphic/negative-margin mechanism
the previous section describes, which is scoped to the VERTICAL relationship between
`.scrolly-graphic` and `.scrolly-steps` and does not care how wide the column containing both of
them is.

## What survives with JavaScript disabled

**Everything survives except which step's own frame is on screen.** The header (title, source),
every step's own frame markup, and every step's own prose paragraphs are plain SSR'd HTML — nothing
about the beat's argument depends on the script executing. What CSS alone does, with no script at
all: the first step is wrapped `active` in the markup at build time by `renderScrolly` itself, and
`.step-frame { opacity: 0 }` / `.step-frame.active { opacity: 1 }` is what keeps exactly that one
frame visible and every other one invisible, permanently, with no script involved. `position:
sticky` pinning the graphic is CSS too — the reader still sees the pin behave correctly with the
inline script entirely removed from the page. What does NOT survive: the frame ever advancing past
the first step as the reader scrolls. This holds for BOTH mechanisms `assets/interaction.mjs` ships
(see "The graphic advances continuously," below) — `initScrolly`'s own discrete class toggle never
runs without the script, and `initProgressiveCrossfade`'s continuous, scroll-linked opacity writes
never start either, for the same reason: neither function exists to the page at all. This was
driven and confirmed in a real browser (`page.setJavaScriptEnabled(false)`, then reloaded) — not
inferred from reading the markup — see "Verification."

## Keyboard and screen readers reach every step without scrolling being the only route

**Every step's prose is an ordinary `<p>` in ordinary document flow — not toggled, not clipped, not
`aria-hidden`, not dependent on the reader's scroll position.** A screen reader user reading the page
top to bottom, or a keyboard user pressing Page Down / the down arrow, reaches every step's own
words in the same order a sighted reader scrolling the page does; nothing about reaching a step's
text depends on the sticky graphic ever reaching the matching frame. The graphic itself is marked
`aria-hidden="true"` on its wrapper for every frame — a deliberate choice, made by the SCAFFOLD
(`renderScrolly`), never by an individual frame component: the argument this beat makes is stated in
full, in words, in the prose and the unconditional header; the graphic reinforces it visually but
carries nothing an accessible reader needs that the text does not already say. Exposing only
whichever ONE frame happens to be visually active at a given scroll position — a description that
changes out from under a screen reader user with no navigable boundary marking when — would be a
worse reading than not exposing the graphic at all.

## What the graphic is allowed to be silent about

Because every step's prose already states its own claim in words, a step's own frame is allowed to
be purely reinforcing: neither `ImageFrame` nor `DrawnGraphicFrame` introduces a value, a year, or a
claim that is not also in that step's own paragraph. This is the inverse of
`twin-chart-web/references/web-discipline.md`'s "what hover reveals" rule (there, interaction adds
detail the static frame had no room for); here, the graphic never carries detail the prose does not
already carry, because the graphic is the one layer this genre allows to go unheard by assistive
technology.

## The graphic advances continuously as the reader scrolls

**The second build's crossfade was a SNAP wearing a transition: `IntersectionObserver` picks one
winning step and toggles a class, and the 0.3s CSS `transition` on `.step-frame`'s own opacity is
what makes that toggle look like a fade instead of an instant swap — but the toggle itself only
ever fires at ONE threshold (crossing the `-45%/-45%` centre band), so for the entire rest of a
step's own scroll distance the frame sits flat at 0 or 1 and does nothing at all.** The project
owner's own correction: *the chart or map should advance as the reader scrolls — the line extends,
the marks arrive, the map moves — rather than snapping between finished states.* A single
transitioned toggle is exactly the snap this names, dressed in an ease curve.

**The fix is a SECOND mechanism, `initProgressiveCrossfade` in `assets/interaction.mjs`, layered on
top of the first — never a replacement for it (see that file's own header comment for the full
division of labour):**

- `initScrolly` (unchanged from the second build) keeps running unconditionally: an
  `IntersectionObserver` toggles the `.active` class on the winning step/frame pair. This alone is
  the ENTIRE mechanism `prefers-reduced-motion: reduce` sees, because the second mechanism below
  never engages under that preference.
- `initProgressiveCrossfade` starts ONLY when `matchMedia("(prefers-reduced-motion: reduce)")` does
  not match. Once running, it writes each `.step-frame`'s own `opacity` directly, as an inline
  style, to a value computed CONTINUOUSLY from the reader's actual scroll position — every step's
  frame is some fractional opacity at almost every scroll position, not just the two it used to
  ever be. `scripts/render-scrolly.mjs`'s own `buildCss` adds one rule,
  `.scrolly--progressive .step-frame { transition: none; }` (a class `initProgressiveCrossfade`
  itself adds, and only on this path), so the inline writes track the scroll 1:1 instead of each one
  re-triggering the 0.3s ease meant for the OTHER mechanism's own binary toggle — layering the two
  transitions would have made the graphic visibly LAG behind the reader's own scroll, chasing a
  moving target instead of tracking it.
- The weight itself is `frameWeight`/`computeFrameWeights` (pure, unit-tested in
  `test/render-scrolly.test.ts`): each step's own centre, in viewport coordinates, at distance 0
  from the viewport's centre scores 1; at a distance equal to the CLOSER neighbouring step's own
  centre, it scores 0; linear in between. This is the continuous generalisation of the same "closer
  to centre wins" idea `pickActiveStep`'s discrete band already uses — a continuum instead of one
  binary switch — and it is why the crossfade spans the step's own FULL scroll distance rather than
  only the narrow band the discrete mechanism reacts to.

**Performance: the one avoidable failure named in the brief — work on every scroll event — is
answered by the standard rAF-gate, not by an intention.** A `scroll`/`resize` listener does nothing
but ask for one `requestAnimationFrame` callback (a boolean, `ticking`, refuses to ask twice before
the first answer lands); the actual read (`getBoundingClientRect` on every step) and write
(`style.opacity` on every frame) happen once per animation frame at most, batched read-then-write
(never interleaved, so painting never forces an extra layout pass). Measured, in a real, driven
browser, not assumed:

- A burst of 400 raw `scroll` events fired synchronously inside a single JS turn (an extreme stand-
  in for a trackpad reporting faster than the display can paint) produced exactly **1** scheduled
  `requestAnimationFrame` call for the whole burst — the gate collapsing 400 events to 1 unit of
  work as designed.
- A more realistic simulation — 420 `scroll` events spread across 20 real animation frames (≈20
  events per frame, the way a high-frequency trackpad's own events actually land relative to a 60Hz
  display) — produced **20** scheduled paints, one per real frame, never more. Each paint's own
  execution time, measured directly (`performance.now()` around the callback): **0.125ms average,
  1.3ms worst-of-20** — roughly 8% of a single 16.6ms frame budget at its worst sample, nowhere near
  the point of dropping a frame. `PerformanceObserver({entryTypes: ["longtask"]})` recorded ZERO
  long tasks (>50ms) across the whole run.
- Sampled continuously through an actual scroll (nine positions spanning the full scrollable
  distance), both frames' own `opacity` moved smoothly and monotonically toward the crossover and
  past it (photograph frame: 0.94 → 0.85 → 0.75 → 0.66 → 0.63 → 0.59 → 0.50 → 0.40 → 0.31; the
  instrument frame is the exact complement at every sample) — a genuine, continuous crossfade, not a
  plateau punctuated by one jump.

## Reduced motion

**A reader who asks for no animation gets `initScrolly`'s own discrete class toggle and NOTHING
from `initProgressiveCrossfade` — not a slower or smaller version of the same crossfade, and not the
continuous mechanism running with its transition simply disabled. The whole continuous mechanism
never starts.** `initProgressiveCrossfade` checks `matchMedia("(prefers-reduced-motion: reduce)")`
once at page load and again on every `change` event the media query itself fires (so a reader who
flips the OS preference while the page is already open is honoured immediately, without a reload);
when it matches, the function's own `sync()` calls `stop()` (a no-op if the continuous mechanism
never started) instead of `start()`, and the continuous mechanism's `scrolly--progressive` class and
every inline `opacity` override are never applied. What is left running is exactly `initScrolly`'s
own class toggle — the same mechanism, unmodified, that the second build already shipped — governed
by the SAME CSS rule as before: `.step-frame`'s own `transition` only exists inside
`@media (prefers-reduced-motion: no-preference)`, so under `reduce` there is no transition property
at all, and any class change is instantaneous.

Confirmed, in a real, driven browser, under `prefers-reduced-motion: reduce`
(`page.emulateMediaFeatures`): scrolling through nine positions spanning the full scrollable
distance, every sampled `.step-frame`'s own computed `opacity` was EITHER exactly `0` or exactly
`1` — never once an intermediate value — and the page's own `.scrolly` root never carried the
`scrolly--progressive` class at any point. This is the proof that matters (the mechanism literally
never engaged, not merely that a transition happened to read `0s`); the transition-duration
measurement the second build relied on alone (`0.3s` without the preference, `0s` with it) still
holds too, but is no longer sufficient on its own to prove "no interpolation" now that a second,
non-CSS-transition mechanism exists that could in principle animate without any CSS transition at
all — a purely CSS-side check would not have caught THAT class of regression.

## What must not become interactive-only

The same rule `web-discipline.md` states for hover applies here to scroll: the title and the source
are drawn unconditionally in the HTML header, AHEAD of the sticky track entirely — none of them
appears only on some steps or only once the reader has scrolled to a particular one. What genuinely
changes per step is only which FRAME is on screen and which step's own prose the reader is currently
beside — never the beat's own argument, which the persistent header states in full before the reader
has scrolled at all.

## What this genre does not attempt

**A map track.** This seed carries a photograph and a diagram; a scroll-driven map beat (`flyTo`
waypoints reusing `twin-map-beat`'s own `mapStory` shape) is a different vehicle load, not built
here, and would need its own pass through this file's own "one gotcha" before it ships — a map's
basemap tiles are not free to duplicate the way an SSR'd `<svg>` frame or an embedded `<img>` is.

**Roving-tabindex / single-stop keyboard navigation of the reveal itself.** There is no keyboard
shortcut that advances the active step directly (no `ArrowDown` handler, unlike
`twin-chart-web/assets/interaction.mjs`'s `ArrowRight`/`ArrowLeft`) — the reveal is scroll-only for a
sighted or motor-abled reader who has JavaScript on; the CONTENT is keyboard/screen-reader reachable
regardless (see above), but the animated GRAPHIC advancing on command is not. This is a known, stated
gap, the same register `web-discipline.md`'s own "Known cost, not hidden" section keeps for its
75-Tab-stops limitation.

**Stepping a single chart through several reveal states.** This genre's own `SKILL.md`, "When to
use," states this as the primary reason to reach for a DIFFERENT tool: a scrolly earns its existence
by assembling media a single beat cannot assemble on its own; a chart stepped through several states
belongs to `twin-chart-web`, which animates on its own. This skill's own `test/canon.test.ts` locks
the seed itself to at least two visibly different `frameKind`s so this genre's own worked example
never regresses into the shape it exists to redirect a reader away from.

**A per-beat-tinted prose panel.** `renderScrolly`'s `ground` argument derives furniture for the
whole render once; a beat wanting its prose panel tinted differently from the page's own ground
would need to pass that panel colour through `deriveFurniture` separately and thread the result in —
a real, not-yet-built extension (see "Measuring prose over the graphic," above), not a silent gap in
this seed.

## Verification

Applied by driving a real browser, not by reading the markup or trusting a screenshot taken before
scrolling. `twin-doctrine` states this as a universal rule, and this genre is the reason it exists
in the first place: this skill's own first build passed a static look at the rendered HTML (title
present, every frame present, every `<p>` present, one `.active` class present) and still shipped
the sticky-reservation defect this file describes — a defect visible only once a script actually
scrolled the page and a screenshot was taken AFTER that scroll, not before. Confirmed, in a real,
Puppeteer-driven Chrome, all of it together (this round's own run, superseding any older number
below that it contradicts — see this file's own intro on why a stale claim here is worse than none):

- **Centred composition**: `.scrolly`'s own left/right margin measured equal (`getBoundingClientRect`)
  at a 1440px window (400px each side) and an 800px window (80px each side, the "realistic desktop"
  case this file's own composition section names); at 375px, no horizontal overflow
  (`document.documentElement.scrollWidth` never exceeds `window.innerWidth`) at either the top of
  the page or scrolled into the second step.
- **Continuous advance**: sampling nine scroll positions spanning the full scrollable distance, both
  frames' own `getComputedStyle(frame).opacity` moved smoothly and monotonically through
  intermediate values (never just 0 or 1) toward and past the crossover — a real crossfade, not a
  snap. `initProgressiveCrossfade`'s own `scrolly--progressive` class was present on `.scrolly`
  throughout.
- **Prose legibility**: the prose panel's own computed background/colour, read live at the exact
  scroll position where the panel visually sits over the graphic, matches the build-time-measured
  21.00:1 contrast.
- **Reduced motion is an instant cut**: under `page.emulateMediaFeatures([{ name:
  "prefers-reduced-motion", value: "reduce" }])`, sampling the same nine scroll positions, every
  `.step-frame`'s own computed `opacity` was EITHER exactly `0` or exactly `1` — never an
  intermediate value — and `.scrolly` never carried `scrolly--progressive`. (The single computed-
  transition-duration check the second build relied on — `0.3s` with no preference, `0s` with
  `reduce` — is a WEAKER, no-longer-sufficient signal on its own now that a second, non-transition
  mechanism exists: measured this round, a page with NO reduced-motion preference set also reads
  `0s` once `initProgressiveCrossfade` has started and added `scrolly--progressive`, which
  deliberately turns the transition off — see "The graphic advances continuously," above, for why
  that is correct, not a regression. A reader of this file who checked only the transition-duration
  number, the way the second build's own version of this section did, would have drawn the wrong
  conclusion from a still-true-but-no-longer-sufficient measurement — the exact trap the intro
  paragraph names.)
- **JavaScript disabled**: `page.setJavaScriptEnabled(false)` (reloaded) still shows exactly one
  active frame and both paragraphs' own full text, unchanged.

`test/render-scrolly.test.ts` covers what a unit test CAN honestly prove (the seed's own shape, the
pure `pickActiveStep`/`frameWeight`/`computeFrameWeights` helpers, that every step's prose is
present and ungated in the raw HTML, that the panel's own computed contrast is asserted ≥4.5:1, that
the generic scaffold's own source never names a frame kind) and stops there; the sticky/overlap/
composition/legibility/continuous-scroll/reduced-motion/no-JS behaviour above is proven, or not, by
opening the rendered file and driving it.
