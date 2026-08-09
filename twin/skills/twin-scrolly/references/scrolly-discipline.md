# Scrolly discipline

The rules the scroll-driven vehicle is written under. There was no doctrine for this genre before
this file — it was written while building this skill's own first seed, then REWRITTEN against the
same seed's second build after two structural corrections, REWRITTEN AGAIN against the third (the
composition, and the crossfade mechanism, both corrected in the same round), REWRITTEN A FOURTH TIME
against a round that reversed part of the third (the continuous crossfade the third build introduced
turned out, once actually driven and sampled across the full scroll distance rather than at two or
three points, to never settle — see "The graphic is fixed; only the text moves," below; the same
round also took the seed from two steps to four, see "More than two steps," and fixed a composition
bug the third build's own centring fix did not catch, see "The composition is a centred reading
column"), and REWRITTEN A FIFTH TIME against a round that fixed a defect the fourth round's own
centring fix introduced: constraining the graphic's WIDTH to a comfortable measure was right, but
the fourth round left its HEIGHT capped at `min(70vh, 640px)` — a leftover from before the graphic
became the sticky ground — which read as a small illustration adrift in empty page, not a graphic
filling the frame it is pinned in (see "The graphic fills the viewport it is pinned in," below).
Every rule below is either a decision this genre needed and the others did not, or an explicit
inheritance from `twin-doctrine` stated so it is not silently assumed. Every section below describes
the CURRENT code, not a remedy it once used and no longer does — a stale section here is what this
file's own corrections exist to stop being ("The one gotcha" and "Measuring prose over the graphic"
are unchanged since the second build and remain accurate as written).

**A standing lesson repeated across two rounds: a check on the wrong element, or the wrong
dimension, passes for the wrong reason.** The third build's own "Verification" section measured
`.scrolly`'s own left/right margin, found it symmetric, and called the composition centred. It
was — `.scrolly` itself was exactly as centred as claimed. What that measurement never looked at was
the `.step-panel` INSIDE it, which sat flush against the graphic column's own left edge at every
width, because `.step`'s flex row centred its child vertically (`align-items: center`) but never
horizontally (`justify-content` was never set, so it defaulted to `flex-start`) — fixed in the fourth
round. That same fourth round then fixed the WIDTH of the composition without ever re-examining the
HEIGHT, and shipped a graphic that filled its own box completely (no bug in the fill itself) while
that box was itself too short for a full viewport — a dimension nobody had asked "is this still
right?" about since the third build's two-column era. A reader does not see `.scrolly`'s own
invisible margin, and does not read a percentage of viewport height either; a reader sees the panel
they are meant to read, and the graphic behind it, at whatever size it actually renders. Measuring
the box that happens to be easiest to query, on the one axis that happens to be under discussion, is
not the same thing as measuring what a reader's eye actually meets — the standing fix: when a human
says something looks wrong and a computed style says otherwise, screenshot the thing a human is
actually looking at, not the outermost box that contains it, and check every dimension the human
named, not only the one the previous round happened to be fixing.

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
.scrolly-track { --graphic-h: 100vh; position: relative; }
.scrolly-graphic { position: sticky; top: 0; height: var(--graphic-h); z-index: 0; }
.scrolly-steps { position: relative; z-index: 1; margin-top: calc(-1 * var(--graphic-h)); }
```

(`--graphic-h` shown here at its CURRENT value, `100vh` — see "The graphic fills the viewport it is
pinned in," below, for why it is not the `min(70vh, 640px)` an earlier round of this file shipped;
the mechanism this section describes does not care what the value is, only that `.scrolly-steps`'s
own negative margin matches it exactly.)

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

**The fourth build's own correction: `.scrolly` being centred says nothing about the PANEL being
centred, and the panel is what a reader actually looks at.** `.step` is `display: flex; align-items:
center;` — that centres its child (`.step-panel`) on the CROSS axis, vertically, which was correct
and unchanged since the second build. It never set `justify-content`, the MAIN-axis property, which
defaults to `flex-start`: for a panel narrower than its own row (`.step-panel`'s own `max-width:
min(42ch, 100%)` is almost always narrower than `.step`'s full-width row), that left the panel
pinned to the row's own start edge — the LEFT edge, in this document's left-to-right flow — no
matter how generously `.scrolly` itself was centred in the viewport. The project owner's own
correction, verbatim in spirit: *the graphic runs edge to edge, and the prose panel is jammed
against the left edge — centred means the whole assembly sits in a comfortable measure, AND the
panel centred over the graphic, not pinned left.* The fix is one property: `.step { justify-content:
center; }`. Measured, in a real, driven browser, at all three widths this file already names: at
1440px the graphic column spans 456–984px (centre 720) and the panel spans 533–907px (centre
719.5) — symmetric to within half a pixel of rounding; at 1024px the graphic spans 248–776 (centre
512) and the panel 325–699 (centre 511.5); at 375px the panel is nearly as wide as the graphic
column itself (322px of 330px), but its own margins are still equal (2px each side, confirmed by
screenshot, no overflow). This is a pure box-model change, exactly like the `max-width`/`clamp`
fix above — it touches neither the sticky/negative-margin mechanism nor which frame is active, only
where the panel sits inside the row `.step` already gives it.

## The graphic fills the viewport it is pinned in

**Constraining the graphic's WIDTH to a comfortable reading measure was right; letting its HEIGHT
stay capped at a fraction of the viewport was a separate mistake the same round made without
noticing.** `--graphic-h` had been `min(70vh, 640px)` since before the graphic was ever the sticky
ground — a value tuned for the third build's own two-column layout and never revisited once the
graphic became full-bleed-behind. At a 900px-tall desktop viewport that resolves to 630px, leaving
270px — 30% of the viewport — as bare page below the graphic while it is pinned. The project owner's
own correction: *the graphic is small and adrift in white space... the reader's viewport is the
frame, and the graphic should occupy it.* A graphic that fills three-quarters of its own box exactly
as designed is still a bug if the box itself is the wrong size for what a reader expects a PINNED,
full-screen graphic to be.

**The fix is one value: `--graphic-h: 100vh`.** The graphic now fills the FULL viewport height for
as long as it is pinned, not a capped band with page visible past its bottom edge. This does not
distort anything: `ImageFrame` already paints with `object-fit: cover` and `DrawnGraphicFrame` with
`preserveAspectRatio="xMidYMid slice"` — both CROP to whatever box they are given rather than
stretch, the same trade-off every full-bleed frame in this genre already makes at every width it
ships. A taller box only means more of the artwork's own left/right edge is cropped away to cover
it; nothing in the artwork itself is squashed or stretched. `FRAME`'s own native aspect (640×900,
≈0.71) is portrait already, so at typical desktop widths (the graphic's own COLUMN, not the
viewport — still capped by `.scrolly`'s own `max-width`/`clamp` padding, e.g. ~528px at 1440px) a
100vh-tall box is narrower still than that native aspect, meaning MORE is cropped from the sides
than before, not less legible — confirmed by screenshot, below, nothing in the drawn instrument or
the photograph reads as cut off in a way that loses the image's own subject (the staff, the gauge
house, the water line all stay comfortably inside frame at every width checked).

**Sizing the sticky box does not touch step-boundary timing.** `.step`'s own `min-height` (`70vh`,
`60vh` for the last) governs when `pickActiveStep`'s centre-band crossing fires — entirely
independent of `--graphic-h`, which only sets how tall the PINNED BOX is while any step is active.
Because the seed's total steps height (four steps' worth, ~280vh+) is far larger than a single
`100vh` graphic, `position: sticky`'s own pin distance (container height minus sticky height) barely
changes from before — the graphic still pins for effectively the entire track, unpinning naturally
only in the last sliver of scroll as the track itself ends, exactly as "The one gotcha" describes.

Measured, in a real, driven browser, at all three widths: at 1440×900, `.scrolly-graphic`'s own
`getBoundingClientRect().height` is `900` — **100% of the viewport height** — confirmed by
screenshot, the graphic's own top and bottom edges exactly meeting the top and bottom of the browser
window while pinned, no bare page visible past either edge. At 1024×800, height `800` — 100%. At
375×800, height `800` — 100%, with `.scrolly`'s own width constraint (the reading-measure fix from
the previous section) still holding: the graphic's own COLUMN stays narrower than the full 375px
screen width (330px, the same `clamp`-derived inset as before), it is only the HEIGHT that now fills
the viewport, and no horizontal overflow was introduced (`document.documentElement.scrollWidth`
still never exceeds `window.innerWidth` at any sampled width or scroll position).

## More than two steps

**The seed shipped with two steps for its first three builds; nothing about the mechanism was ever
actually driven with more than two until the fourth correction asked for it directly.** The project
owner's own words: a scroll vehicle whose whole purpose is a sequence has to handle an arbitrary
number of steps, and two is exactly the count most likely to let a boundary bug hide — with only one
possible transition (step 0 → step 1), there is no "middle" step to get wrong, no boundary between
two NON-adjacent-to-an-end steps to miscompute. `STEPS_META` (`assets/ScrollySeed.tsx`) now carries
FOUR steps — a photograph, then three narrated readings on the same drawn instrument (an ordinary
day, a flood day, a dry spell, sharing one parameterised `DrawnGraphicFrame` — see that component's
own doc-comment for why moving an illustrated water level is not the "data-driven reveal" this
genre's own diagram is barred from) — and `test/render-scrolly.test.ts` locks the mechanism at 4, 6
and 8 steps, not just the seed's own 4:

- `pickActiveStep` (pure, no DOM) is tested with the winner at the LAST position and at the MIDDLE
  position of synthetic entry arrays sized 4, 6 and 8 — a function that only ever compared adjacent
  pairs, or only ever checked the array's own ends, would pass a two-entry test and fail one of
  these.
- `renderScrolly` is exercised end to end with synthetic 4/6/8-step arrays: exactly one
  `step-frame active` in the output regardless of N, every step's own `data-step` id and prose
  present, `steps.length` echoed back correctly.

**Nothing in the shipped mechanism ever hard-coded two**, which is WHY the fix for this correction is
almost entirely tests, not code: `pickActiveStep` loops over however many entries
`IntersectionObserver` hands it; the sticky/negative-margin CSS trick (`margin-top: calc(-1 *
var(--graphic-h))`) pins the graphic for the ENTIRE steps column regardless of how many `.step`
sections that column holds, because it is keyed to the graphic's own height, never to a step count;
`renderScrolly`'s only count-related check is `steps.length < 2`, a FLOOR, not an assumption of
exactly two. The one place a step count of exactly two WAS silently assumed was outside the
mechanism entirely: the seed's own content. Rendered and driven at four steps in a real browser: the
sticky graphic still pins for the full track, each of the four `.step-panel`s reads its own distinct
prose, and the active frame advances through all four — photograph, ordinary day, flood day, dry
spell — one clean settled image at a time (see "The graphic is fixed," below, for what "settled"
means here and how it was measured).

## What survives with JavaScript disabled

**Everything survives except which step's own frame is on screen.** The header (title, source),
every step's own frame markup, and every step's own prose paragraphs are plain SSR'd HTML — nothing
about the beat's argument depends on the script executing. What CSS alone does, with no script at
all: the first step is wrapped `active` in the markup at build time by `renderScrolly` itself, and
`.step-frame { opacity: 0 }` / `.step-frame.active { opacity: 1 }` is what keeps exactly that one
frame visible and every other one invisible, permanently, with no script involved. `position:
sticky` pinning the graphic is CSS too — the reader still sees the pin behave correctly with the
inline script entirely removed from the page. What does NOT survive: the frame ever advancing past
the first step as the reader scrolls — `initScrolly`'s own `IntersectionObserver` class toggle (the
ONE mechanism `assets/interaction.mjs` ships — see "The graphic is fixed; only the text moves,"
above) never runs without the script, because the function that would run it does not exist on the
page at all. This was driven and confirmed in a real browser
(`page.setJavaScriptEnabled(false)`, then reloaded), against the four-step seed: all four steps'
prose present in full, unchanged, and exactly one `.step-frame` carrying `active` (the first,
server-rendered) — not inferred from reading the markup — see "Verification."

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

## The graphic is fixed; only the text moves

**The third build's continuous crossfade was itself a defect, not a refinement — it just took a
FULL scroll-through, not a two- or three-point sample, to see it.** The project owner's own words:
*le scrolly doit être fixe et seul le texte doit bouger* — the graphic stays fixed, only the text
moves. Whatever combination of sticky positioning and crossfade the third build shipped, the third
build's own "Verification" section had sampled nine scroll positions and reported the two frames'
opacity moving "smoothly and monotonically... toward the crossover and past it," treating that as
proof the mechanism worked. Sampling the FULL track this round, at eleven evenly spaced positions
from 0% to 100% of the scrollable distance, told a different story: **the two frames were still a
blend at every single sample, including the very last one.** At 0% scroll: 0.94/0.06. At 100%
scroll — the end of the track, nowhere left to go: 0.31/0.69. Never once, anywhere along the entire
scrollable distance, did either frame reach a clean 0 or a clean 1. The mechanism was not
approaching a resting state and occasionally caught mid-transition; it had no resting state at all —
`computeFrameWeights`' own linear falloff, keyed to the CLOSER neighbouring step's own centre
distance, never actually reaches its own zero or its own one except at an instant the reader's
scroll position would have to land on exactly, which normal scrolling essentially never does. A
graphic whose content is a permanent, unsettled double-exposure of two unrelated frames — a
landscape photograph bleeding into a technical diagram, both partially visible at once — does not
read as "fixed," however correctly `position: sticky` pins its BOX. The two things are different
claims: the third build proved the box does not move (true, and still true); it never established
that the CONTENT inside that box ever stops moving, and it does not.

**The fix removes the continuous mechanism; it does not replace it with a gentler version of the
same idea.** `frameWeight`, `computeFrameWeights` and `initProgressiveCrossfade` are gone from
`assets/interaction.mjs` entirely, along with the `.scrolly--progressive` CSS rule
`scripts/render-scrolly.mjs`'s own `buildCss` added for them. What remains is exactly what the
SECOND build already shipped and never removed: `initScrolly`'s own `IntersectionObserver` toggles
the `.active` class on the winning step/frame pair when a step crosses the centre band (`rootMargin:
"-45% 0px -45% 0px"`), and `.step-frame`'s own CSS `transition: opacity 0.3s ease` (gated behind
`prefers-reduced-motion: no-preference`, unchanged) turns that class swap into a brief, TIME-BOUNDED
dissolve — not a value written from scroll position, so it always settles within its own 0.3s
regardless of whether the reader keeps scrolling, pauses, or reverses. For the vast majority of a
step's own scroll distance — everywhere except the brief 0.3s window around a boundary crossing —
the active frame sits at a flat, settled opacity of exactly `1` and every other frame at exactly
`0`. That is what "fixed" means here: not merely a box that does not move, but content that holds
still for as long as the reader is reading, and changes once, briefly, at the moment the reader
actually crosses into a new step.

**Measured this round, in a real, driven browser, sampling eleven positions across the FULL track of
the four-step seed** (not the two- or three-point sample the third build's own verification relied
on): at every sampled fraction that did not happen to land inside the ~0.3s transition window, the
active frame read opacity `1` and every other frame read `0` — a clean, single, settled image, for
example at 30–50% of the track: `photograph: 0, instrument: 1, flood: 0, drought: 0`, unchanged
across three consecutive samples spanning roughly a quarter of the scrollable distance, and again at
70–90%: `flood: 1`, every other frame `0`. The samples that landed mid-transition (the observer had
just fired, the 0.3s dissolve was still running) showed a blend — but ONLY there, and it resolves on
its own within 0.3s whether or not the reader keeps scrolling, which is the behaviour a brief
CSS-transitioned swap is supposed to have and the removed mechanism never did.

## Reduced motion

**A reader who asks for no animation gets an instant cut — no transition property exists on
`.step-frame` at all under `prefers-reduced-motion: reduce`.** Since the fourth correction removed
`initProgressiveCrossfade` (see "The graphic is fixed; only the text moves," above), there is only
ONE mechanism left to gate: `initScrolly`'s own `IntersectionObserver`-driven class toggle, governed
entirely by the CSS this file's own `buildCss` already had before the third build ever added a
second mechanism to reason about — `.step-frame`'s own `transition: opacity 0.3s ease` sits inside
`@media (prefers-reduced-motion: no-preference)` and nowhere else, so under `reduce` the property
simply does not exist and any class change is instantaneous, in every browser, with no script-side
branching required. `initScrolly` itself does not check the media query at all — it does not need
to, because it never wrote an opacity value in the first place; it only ever toggles a class, and
what that class change LOOKS like (instant or dissolved) is entirely the CSS's own decision.

Confirmed, in a real, driven browser, under `prefers-reduced-motion: reduce`
(`page.emulateMediaFeatures`): scrolling through eight positions spanning the full scrollable
distance of the four-step seed, every sampled `.step-frame`'s own computed `opacity` was EITHER
exactly `0` or exactly `1` — never once an intermediate value — and the active frame advanced
cleanly through all four steps as scroll position increased (photograph → instrument → flood →
drought, one clean swap per crossing, confirmed via a fresh `getComputedStyle` read at each of the
eight positions). With only one mechanism left, a computed transition-duration check (`0s` under
`reduce`) is sufficient on its own again — the caveat the third build's own version of this section
carried, that a second, non-CSS-transition mechanism could in principle animate without any CSS
transition at all, no longer applies, because that second mechanism no longer exists.

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

- **The graphic is fixed, not a permanent blend**: sampling ELEVEN scroll positions spanning the
  FULL scrollable distance (not the nine-point, never-quite-full-track sample the third build's own
  version of this section relied on — see "The graphic is fixed; only the text moves," above, for
  why that distinction is the whole story here), the active frame's own
  `getComputedStyle(frame).opacity` read exactly `1`, and every other frame exactly `0`, across the
  large majority of sampled positions — for example, three consecutive samples spanning roughly a
  quarter of the track (30–50%) all read `instrument: 1`, every other frame `0`, unchanged. The only
  samples that read an intermediate value were ones that happened to land inside the ~0.3s
  CSS-transition window right at a step boundary — and unlike the removed mechanism, that blend
  resolves within 0.3s on its own, whether or not the reader keeps scrolling.
- **The graphic's own box never moves**: `.scrolly-graphic`'s `getBoundingClientRect()` — `top`,
  `left`, `width`, `height` — measured identical at every one of the eleven sampled positions once
  the sticky point is reached (the brief initial climb from the graphic's own static document
  position to `top: 0` is normal `position: sticky` catch-up, not a defect — see "The one gotcha,"
  above).
- **The graphic fills the viewport it is pinned in**: `.scrolly-graphic`'s own measured height while
  pinned equals `window.innerHeight` exactly at all three widths checked — 900px of a 900px-tall
  window at 1440×900, 800px of 800px at 1024×800, 800px of 800px at 375×800 — 100% in every case,
  confirmed by screenshot (the graphic's own top and bottom edges exactly meeting the browser
  window's own top and bottom, no bare page visible past either edge). See "The graphic fills the
  viewport it is pinned in," above, for the fifth correction this fixes and why filling the height
  does not distort the artwork (crop, via `object-fit: cover`/`preserveAspectRatio="...slice"`,
  never stretch).
- **Centred composition, including the panel**: `.scrolly`'s own left/right margin measured equal
  (`getBoundingClientRect`) at 1440px (400px each side), 1024px (192px each side) and 375px (no
  horizontal overflow — `document.documentElement.scrollWidth` never exceeds `window.innerWidth`, at
  the top of the page and scrolled mid-track). Separately, and this is the fourth correction's own
  addition, `.step-panel`'s own centre measured against `.scrolly-graphic`'s own centre at each
  width: 1440px (panel centre 719.5 vs graphic centre 720), 1024px (511.5 vs 512), 375px (equal 2px
  margins each side of an almost-full-width panel) — the panel is centred over the graphic, not
  pinned to its left edge.
- **Prose legibility**: the prose panel's own computed background/colour, read live at the exact
  scroll position where the panel visually sits over the graphic, matches the build-time-measured
  21.00:1 contrast.
- **Reduced motion is an instant cut**: under `page.emulateMediaFeatures([{ name:
  "prefers-reduced-motion", value: "reduce" }])`, sampling eight scroll positions spanning the full
  scrollable distance, every `.step-frame`'s own computed `opacity` was EITHER exactly `0` or exactly
  `1` — never an intermediate value — and the active frame advanced cleanly through all four steps
  as scroll position increased. With the third build's second mechanism gone, a plain
  computed-transition-duration check (`0.3s` with no preference, `0s` with `reduce`) is sufficient
  proof again — see "Reduced motion," above, for why the extra caveat the third build's own version
  of this section carried no longer applies.
- **JavaScript disabled**: `page.setJavaScriptEnabled(false)` (reloaded) still shows exactly one
  active frame and all four steps' own full prose text, unchanged.
- **More than two steps**: the four-step seed rendered and driven end to end shows the sticky
  graphic pinned for the full track and the active frame advancing through all four states
  (photograph → instrument → flood → drought) in order as the reader scrolls; `pickActiveStep` and
  `renderScrolly` are additionally exercised against synthetic 4/6/8-step fixtures in
  `test/render-scrolly.test.ts` — see "More than two steps," above.

`test/render-scrolly.test.ts` covers what a unit test CAN honestly prove (the seed's own shape,
including that it now carries more than two steps; the pure `pickActiveStep` helper, tested at 4/6/8
synthetic entry counts; that every step's prose is present and ungated in the raw HTML; that the
panel's own computed contrast is asserted ≥4.5:1; that the panel-centring `justify-content: center`
rule and no trace of the removed scroll-linked mechanism are present in the rendered CSS; that the
generic scaffold's own source never names a frame kind; that `renderScrolly` itself produces
well-formed markup at 4/6/8 synthetic steps) and stops there; the sticky/overlap/composition/
legibility/fixed-graphic/reduced-motion/no-JS behaviour above is proven, or not, by opening the
rendered file and driving it.
