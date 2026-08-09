# Scrolly discipline

The rules the scroll-driven vehicle is written under. There was no doctrine for this genre before
this file — it was written while building this skill's own first seed, then REWRITTEN against the
same seed's second build after two structural corrections, REWRITTEN AGAIN against the third (the
composition, and the crossfade mechanism, both corrected in the same round), REWRITTEN A FOURTH TIME
against a round that reversed part of the third (the continuous crossfade the third build introduced
turned out, once actually driven and sampled across the full scroll distance rather than at two or
three points, to never settle — see "The graphic is fixed; only the text moves," below; the same
round also took the seed from two steps to four, see "More than two steps," and fixed a composition
bug the third build's own centring fix did not catch, see "The reading measure belongs to the
prose; the graphic goes full-bleed"), REWRITTEN A FIFTH TIME against a round that fixed the fourth
build's graphic HEIGHT (capped at `min(70vh, 640px)`, a leftover from before the graphic became the
sticky ground, leaving up to 30% of a viewport as bare page below it — see "The graphic fills the
viewport it is pinned in"), and REWRITTEN A SIXTH TIME against a round that reversed part of the
FOURTH: constraining the graphic's own WIDTH to the same comfortable measure as the prose was never
right — the fourth round's own fix centred the whole assembly, `.scrolly`'s width included, and that
width rule was inherited by every descendant, the sticky GRAPHIC among them, capping a visual that
is meant to fill the frame it is pinned in to a narrow column stranded in a wide viewport (see "The
reading measure belongs to the prose; the graphic goes full-bleed," below — same section as the
fourth round's panel fix, since both are the same "who does `.scrolly`'s own width rule actually
belong to" question, answered twice). The reading measure was never wrong for the PROSE — the
header, and the step panel already fixed in the fourth round — only for the graphic that happened to
share a parent with it. REWRITTEN A SEVENTH TIME against a round that fixed a defect the sixth round's
own full-bleed fix made ROUTINE rather than exceptional: a full-bleed graphic gets COVER-cropped hard
at the width/height extremes this genre's own full-bleed shape now guarantees it will actually meet,
and `DrawnGraphicFrame`'s own annotations (a label, a tick, the reading dot) were never designed
against that crop — see "Nothing annotated can be cropped," below, for the geometry and the
mechanically-enforced `SAFE_AREA` that fixes it. Every rule below is either a decision this genre
needed and the others did not, or an explicit inheritance from `twin-doctrine` stated so it is not
silently assumed. Every section below describes the CURRENT code, not a remedy it once used and no
longer does — a stale section here is what this file's own corrections exist to stop being ("The one
gotcha" and "Measuring prose over the graphic" are unchanged since the second build and remain
accurate as written).

**A standing lesson repeated across FOUR rounds: a check on the wrong element, or the wrong
dimension, passes for the wrong reason — and fixing the dimension a human named does not mean the
fix was the right SHAPE, and does not mean the fix has no cost elsewhere.** The third build's own
"Verification" section measured `.scrolly`'s own
left/right margin, found it symmetric, and called the composition centred. It was — `.scrolly`
itself was exactly as centred as claimed. What that measurement never looked at was the
`.step-panel` INSIDE it, which sat flush against the graphic column's own left edge at every width,
because `.step`'s flex row centred its child vertically (`align-items: center`) but never
horizontally (`justify-content` was never set, so it defaulted to `flex-start`) — fixed in the fourth
round, by constraining `.scrolly`'s own width to a comfortable reading measure. That fix was correct
for the PROSE and, without anyone deciding it should, ALSO constrained the sticky GRAPHIC, which
happened to be a descendant of the same `.scrolly` — width was never re-examined for the graphic
specifically, only inherited by it. The fifth round then fixed the graphic's own HEIGHT (capped at a
fraction of the viewport) without ever re-examining the WIDTH the fourth round had set — three
separate rounds, three separate dimensions, each one individually correct about the number it
reported and each one leaving a real, visible defect unfixed on some OTHER axis nobody had asked
"is this still right?" about since an earlier round set it for an earlier reason. A reader does not
see `.scrolly`'s own invisible margin, does not read a percentage of viewport height, and does not
read a pixel count either; a reader sees the panel they are meant to read, and the graphic behind it,
at whatever size it actually renders, in both dimensions at once. Measuring the one axis currently
under discussion is not the same thing as measuring what a reader's eye actually meets — the
standing fix: when a human says something looks wrong and a computed style says otherwise,
screenshot the thing a human is actually looking at, not the outermost box that contains it, and
check EVERY dimension of it, not only the one the previous round happened to be fixing. The sixth
round's own fix — making the graphic full-bleed on both axes — is itself the clearest instance yet
of this lesson's second half: it was the CORRECT fix for the width defect it targeted, and it made a
DIFFERENT, previously-dormant defect routine — a graphic that only ever rendered at a narrow column's
own width never got cropped hard enough for `DrawnGraphicFrame`'s own top-of-frame annotations to
fall outside the visible slice; a graphic that fills a 1600px-wide viewport does, every time. Fixing
a defect can EXPOSE the next one; that is not a reason to distrust the fix, it is a reason to look
again at the picture the fix produces before calling the round closed.

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

## The reading measure belongs to the prose; the graphic goes full-bleed

**The PROSE — the header, and the step panel — sits in a centred column at a comfortable reading
measure. The GRAPHIC does not: it fills the full width it is given, edge to edge.** This section's
own history is the clearest example in this file of the "check every dimension, not only the one
under discussion" lesson this file's own intro now states outright, so it is kept below rather than
silently replaced — three rounds, each fixing one real defect the previous round left standing.

**Second build → third build.** The assembly's `max-width: 720px` left almost no margin on a
realistic, not-maximised desktop window (a 750px window left 15px each side — technically centred,
reads as edge-to-edge). Fixed by dropping to `640px` (the classic editorial column width) with a
`clamp(16px, 6vw, 56px)` side gutter that scales with the viewport instead of vanishing at exactly
the width where a fixed padding stops mattering.

**Third build → fourth build.** That `640px`/`clamp` rule lived on `.scrolly` itself — the OUTERMOST
element, ancestor of the header, the sticky graphic, AND the prose panel alike. Centring `.scrolly`
centred all three, but said nothing about whether each one INSIDE it was centred on its own axis:
`.step`'s flex row centred its child (`.step-panel`) vertically (`align-items: center`) from the
second build onward but never set `justify-content`, the main-axis property, which defaulted to
`flex-start` — the panel sat pinned to its row's own start edge (the left edge, in this document's
flow) regardless of how generously `.scrolly` itself was centred. Fixed with one property: `.step {
justify-content: center; }`.

**Fourth build → sixth build (the fifth round fixed the graphic's height, not its width — see "The
graphic fills the viewport it is pinned in").** The THIRD build's own `640px`/`clamp` rule, still
living on `.scrolly`, was ALSO still capping the sticky GRAPHIC to the same narrow column as the
prose — nobody had asked, since the third build set that rule for the assembly as a whole, whether
the graphic specifically should be narrow too. It should not: *all web visuals must take the full
width* is a house-wide rule this genre had never actually satisfied for its own sticky ground. Fixed
by MOVING the reading-measure constraint off `.scrolly` (now unconstrained — no `max-width`, no
padding) and onto the two things that are actually prose: `.scrolly-header` (its own `max-width:
640px; margin: 0 auto; padding: 0 clamp(16px, 6vw, 56px) 0` — the exact values `.scrolly` used to
carry, simply relocated) and `.step` (`padding: 24px clamp(16px, 6vw, 56px)`, the gutter that used
to come from `.scrolly`'s own padding, now supplying the panel's floor of breathing room directly,
with `.step-panel`'s own `max-width: min(42ch, 100%)` and `.step`'s `justify-content: center`
unchanged from the fourth round). `.scrolly-track`, `.scrolly-graphic`, `.scrolly-steps` and `.step`
carry no width rule of their own at all — none is needed: a block element with no `max-width`
defaults to 100% of its parent, and with `.scrolly` now unconstrained, that chain resolves all the
way out to `body`'s own full width.

Measured, in a real, driven browser, at three widths: at 1600px, `.scrolly-graphic` is exactly
1600px wide (`left: 0`, `right: 1600`, no gap on either side) while the active `.step-panel` is
373.7px wide, centred at x=800 — exactly the viewport's own centre; at 1024px the graphic is
1024px wide edge to edge and the panel (373.7px) centres at x=512, exactly the viewport centre; at
375px the graphic is 375px wide edge to edge and the panel (330px, floored by the `clamp` gutter)
centres at x=187.5, exactly the viewport centre. `document.documentElement.scrollWidth` equals
`window.innerWidth` exactly at all three widths — no horizontal overflow introduced by the graphic
going full-bleed. Confirmed by screenshot at each width: the graphic's own edges meet the true
browser window edges with no white margin, and the panel floats as a narrow, centred card on top of
it — the ordinary scrollytelling shape.

**Filling the width does not stretch the artwork.** Both frame components already paint with
`object-fit: cover` (`ImageFrame`) / `preserveAspectRatio="xMidYMid slice"` (`DrawnGraphicFrame`) —
COVER, not CONTAIN: the artwork scales uniformly (no independent X/Y stretch) until it fully covers
whatever box it is given, cropping whatever overflows. `FRAME`'s own native canvas (640×900,
portrait) is now being covered onto boxes that are often landscape (e.g. 1600×900 at a wide desktop
window) — this crops significantly more of the artwork's own top/bottom than the narrower column the
fourth round shipped did, the necessary cost of "fill the frame, do not distort it" when the
frame's own aspect diverges sharply from the artwork's. This was a decision, not an oversight: the
alternative (`contain`/`grow-to-fit`, letterboxing rather than cropping) would leave bars of bare
`--ground` on two sides at exactly the widths this correction exists to stop looking bare — cropping
serves "the graphic fills the frame" more literally than letterboxing does, and neither one
stretches. See `DrawnGraphicFrame`'s and `ImageFrame`'s own doc-comments; this file changes neither
component, only the box the generic scaffold now gives them.

This is purely a box-model change — it does not touch the sticky-graphic/negative-margin mechanism
the previous section describes, which is scoped to the VERTICAL relationship between
`.scrolly-graphic` and `.scrolly-steps` and does not care how wide the column containing both of
them is.

## The graphic fills the viewport it is pinned in

**Letting the graphic's HEIGHT stay capped at a fraction of the viewport was a mistake — a mistake
that shipped in the SAME round that (wrongly, see "The reading measure belongs to the prose; the
graphic goes full-bleed," above) also capped the graphic's WIDTH, and this section only ever fixed
the height.** `--graphic-h` had been `min(70vh, 640px)` since before the graphic was ever the sticky
ground — a value tuned for the third build's own two-column layout and never revisited once the
graphic became full-bleed-behind. At a 900px-tall desktop viewport that resolves to 630px, leaving
270px — 30% of the viewport — as bare page below the graphic while it is pinned. The project owner's
own correction: *the graphic is small and adrift in white space... the reader's viewport is the
frame, and the graphic should occupy it.* A graphic that fills three-quarters of its own box exactly
as designed is still a bug if the box itself is the wrong size for what a reader expects a PINNED,
full-screen graphic to be. (At the time this fix shipped, the graphic's own WIDTH was still capped
too — that width cap is what the sixth round removed; this section describes the height fix as it
was made, in a round that had not yet re-examined width.)

**The fix is one value: `--graphic-h: 100vh`.** The graphic now fills the FULL viewport height for
as long as it is pinned, not a capped band with page visible past its bottom edge. This does not
distort anything: `ImageFrame` already paints with `object-fit: cover` and `DrawnGraphicFrame` with
`preserveAspectRatio="xMidYMid slice"` — both CROP to whatever box they are given rather than
stretch, the same trade-off every full-bleed frame in this genre already makes at every width it
ships. A taller box only means more of the artwork's own edges are cropped away to cover it; nothing
in the artwork itself is squashed or stretched. `FRAME`'s own native aspect (640×900, ≈0.71) is
portrait already, so a `100vh`-tall box — now also full VIEWPORT width, not the narrower column this
section originally measured against (see the width correction, above) — crops the artwork more
aggressively still, on whichever axis the viewport's own aspect diverges from 0.71 on; confirmed by
screenshot, below, nothing in the drawn instrument or the photograph reads as cut off in a way that
loses the image's own subject (the staff, the gauge
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
375×800, height `800` — 100%. (At the time this height fix was measured, the graphic's own WIDTH was
still capped to a narrow column by `.scrolly`'s own — since-removed — width constraint; see "The
reading measure belongs to the prose; the graphic goes full-bleed," above, for the current width
measurements, taken after that constraint was removed. No horizontal overflow was introduced by
either fix, then or now: `document.documentElement.scrollWidth` never exceeds `window.innerWidth`
at any sampled width or scroll position.)

## Nothing annotated can be cropped

**A full-bleed graphic gets COVER-cropped hard at the width and height extremes the sixth round's
own fix made routine, not exceptional — and `DrawnGraphicFrame`'s own annotations were never placed
against that crop.** `preserveAspectRatio="xMidYMid slice"` scales `FRAME`'s own 640×900 portrait
viewBox up until it fully covers whatever box `.scrolly-graphic` gives it, then crops whatever
overflows. At a 1600×900 box (aspect 1.778, well past `FRAME`'s own 0.711), the scale factor is set
by WIDTH (`1600/640 = 2.5`) and the visible SLICE of the viewBox is only `900/2.5 = 360px` tall,
centred on the canvas — vb-y `[270, 630]` out of `[0, 900]`. The staff's own top (vb-y 216, before
this round) and the "cm" label beside it (vb-y 222) both sat OUTSIDE that visible slice — cropped by
the viewport's own top edge, not by a bug in the crop math, which is exactly what COVER is supposed
to do. The project owner's own correction: *the "flood day" label is cut in half by the top edge of
the viewport, and the top of the gauge is outside the frame entirely — fix so that nothing annotated
can be cropped at any width.*

**The fix — route 2 of the two the owner named, "keep cover, but define a safe area... and guarantee
the crop never reaches it"** — is `SAFE_AREA`, a constant exported from `assets/ScrollySeed.tsx`:
`{ x: [150, 490], y: [330, 570] }`, in `FRAME`'s own viewBox coordinates. It is computed, not
eyeballed, from an explicit, documented `ASPECT_ENVELOPE` (`{ min: 0.42, max: 2.4 }` — a tall phone
through a 21:9 ultrawide monitor, comfortably covering the acceptance widths this round was checked
against and a realistic margin beyond them) via COVER's own scale-factor math (`ScrollySeed.tsx`'s
own doc-comment on `SAFE_AREA` walks the derivation), with margin kept inside both computed limits
for text-metric slack. Every element `DrawnGraphicFrame` draws that carries MEANING — the staff, its
six ticks, the "cm" label, the reading dot, `dayLabel`, the flow arrow and its own "flow" label — is
now placed inside `SAFE_AREA` BY CONSTRUCTION: `staffTop`/`staffBottom` (350/520) sit inside
`SAFE_AREA.y`; `staffX` (320) sits at `SAFE_AREA.x`'s own centre; the reading dot's own `waterTop` is
`staffTop + clamp(waterLevelT, 0, 1) * (staffBottom - staffTop)`, which cannot leave
`[staffTop, staffBottom] ⊂ SAFE_AREA.y` for ANY caller-supplied `waterLevelT`, in or out of `[0, 1]`;
the flow arrow/label sit at fixed coordinates (380–460, y 545/565) chosen inside `SAFE_AREA` and
INDEPENDENT of `waterLevelT` (they name a direction, not a reading, so they do not need to track the
water level the way the dot does). Only the bank/water RECTANGLES — plain colour fills, no text on
either edge — are free to bleed past `SAFE_AREA`, and past `FRAME` itself, at any aspect ratio;
cropping a fill is not a legibility problem the way cropping a label is.

**Enforced, not eyeballed: `test/render-scrolly.test.ts`'s own "nothing annotated can be cropped"
suite parses every `<text>`/`<line>`/`<circle>` coordinate straight out of the RENDERED SVG STRING**
(not re-derived from the component's own formula, so a typo'd literal would be caught exactly as a
wrong formula would) and asserts each one falls inside `SAFE_AREA`, at seven `waterLevelT` values —
the default, both safe extremes (`t=0`, `t=1`), the seed's own real flood/drought readings (`0.05`,
`0.95`), AND two DELIBERATELY out-of-range values (`t=-1`, `t=2`) to prove the clamp holds even
against a caller that ignores the prop's own documented range — plus a dedicated check against the
seed's own three real `DRAWN_VARIANTS` values (`scripts/render-scrolly.mjs`'s own map), not only
synthetic ones.

**Confirmed by screenshot, in a real, driven browser, at all four widths the acceptance test named
(1600×900, 1440×900, 1024×768, 375×812), on the "flood" step — the most extreme real reading
(`waterLevelT: 0.05`) and the one the owner's own screenshot caught the original defect on:** at
every width, EVERY element `DrawnGraphicFrame` draws for that step — "cm", "flood day", the reading
dot, all six ticks, the flow arrow, and the "flow" label — measured fully inside the viewport
(`getBoundingClientRect()` never negative, never past `innerWidth`/`innerHeight`), confirmed across a
spread of scroll offsets within the step's own active window, not a single lucky instant.

**A second, DIFFERENT thing was found while checking this, and it is reported here rather than
cropped out of the account: the opaque PROSE PANEL, travelling over the full-bleed graphic exactly as
"Measuring prose over the graphic" (above) describes it doing since the second build, can — at the
widest aspect ratios (1600×900, 1440×900, 1024×768), where COVER's own scale factor is largest and
the safe-area content therefore renders at its most magnified — transiently cover part of the flow
arrow's own "flow" text label at some scroll instants within the "flood" step's active window.** This
is NOT the crop this round fixes — the label is never cut by the viewport edge, at any width, at any
scroll position; it is covered by another piece of this genre's own furniture that is DELIBERATELY
opaque and DELIBERATELY sits on top of the graphic, and whose own prose states the exact same
direction in words nowhere the flow arrow does not already show it wordlessly. At 375×812 (the
narrowest, least-magnified case) and at a majority of scroll offsets at the wider three, no overlap
occurs at all. Distinguishing the two — a viewport-edge CROP (this round's own bug, now closed) from
a panel TRAVELLING OVER a full-bleed graphic it was always going to travel over (a different, already
proven-safe mechanism from round one) — is the same discipline this file's own intro states for every
correction in it: report what is actually happening, not merely what confirms the round's own thesis.

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
- **The graphic is full-bleed; the prose stays a centred, narrow column**: `.scrolly-graphic`'s own
  `getBoundingClientRect()` measured `left: 0`, `right` equal to `window.innerWidth`, at all three
  widths checked (1600px, 1024px, 375px) — the graphic's own edges meet the true browser window
  edges exactly, no margin either side, confirmed by screenshot. Separately, `.step-panel`'s own
  centre measured against the VIEWPORT's own centre (not the graphic's — the graphic has no
  narrower "column" left to centre against, it IS the viewport) at each width: 1600px (panel centre
  800.0, viewport centre 800), 1024px (512.0 vs 512), 375px (187.5 vs 187.5) — exact centring, not
  approximate, at every width. `.scrolly-header` independently measured against its own `max-width:
  640px` constraint, unaffected by the graphic's own width change. No horizontal overflow at any
  width (`document.documentElement.scrollWidth` never exceeds `window.innerWidth`) despite the
  graphic itself spanning the full viewport.
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
- **Nothing annotated is cropped**: at all four acceptance-test widths (1600×900, 1440×900,
  1024×768, 375×812), on the "flood" step, every element `DrawnGraphicFrame` draws for it — "cm",
  "flood day", the reading dot, all six ticks, the flow arrow, the "flow" label — measured fully
  inside the viewport at a spread of scroll offsets within the step's own active window; the
  mechanically-enforced `SAFE_AREA` this depends on is additionally locked in
  `test/render-scrolly.test.ts` at seven `waterLevelT` values including two deliberately
  out-of-range ones. See "Nothing annotated can be cropped," above, for the full account — including
  the separate, pre-existing prose-panel-over-graphic overlap this round's own screenshots also
  surfaced and did not paper over.

`test/render-scrolly.test.ts` covers what a unit test CAN honestly prove (the seed's own shape,
including that it now carries more than two steps; the pure `pickActiveStep` helper, tested at 4/6/8
synthetic entry counts; that every step's prose is present and ungated in the raw HTML; that the
panel's own computed contrast is asserted ≥4.5:1; that the panel-centring `justify-content: center`
rule and no trace of the removed scroll-linked mechanism are present in the rendered CSS; that the
sticky graphic's own `--graphic-h: 100vh` is present; that no `max-width` rule constrains `.scrolly`
itself while `.scrolly-header` still carries its own `max-width: 640px`; that every annotated element
`DrawnGraphicFrame` draws — parsed straight out of the rendered SVG string — stays inside `SAFE_AREA`
at seven `waterLevelT` values, including two out-of-range ones proving the clamp holds, and at the
seed's own three real `DRAWN_VARIANTS` readings; that the generic scaffold's own source never names a
frame kind; that `renderScrolly` itself produces well-formed markup at 4/6/8 synthetic steps) and
stops there; the sticky/overlap/composition/legibility/fixed-graphic/crop/reduced-motion/no-JS
behaviour above is proven, or not, by opening the rendered file and driving it.
