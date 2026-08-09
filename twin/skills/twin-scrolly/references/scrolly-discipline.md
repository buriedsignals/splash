# Scrolly discipline

The rules the scroll-driven vehicle is written under. There was no doctrine for this genre before
this file — it was written while building this skill's own first seed (`assets/ScrollySeed.tsx`,
the sample-basin flow beat), the same way `twin-chart-beat/references/static-discipline.md` was
written against the first static beat and `twin-chart-web/references/web-discipline.md` against
the first web beat. Every rule below is either a decision this genre needed and the others did
not, or an explicit inheritance from `twin-doctrine` stated so it is not silently assumed.

## The one gotcha that will waste your day (read first)

**A `position: sticky` graphic pinned above a single column of prose does not stay above it —
scrolled far enough, the prose scrolls UNDER it, and an opaque graphic paints straight over the
words.** This is not a hypothetical: it is what this skill's own first build did, and it was only
caught by driving a real browser and scrolling to the third of four steps, exactly the rule
`twin-doctrine` states and this genre's own `references/scrolly-discipline.md` restates below under
"Verification." The rendered page *looked* correct at the very top (frame 1 pinned, step 1's prose
visible below it) — a screenshot taken before scrolling proves nothing here, the same trap
`twin-chart-web/references/web-discipline.md` names for its own genre.

**Why it happens.** `position: sticky` reserves its element's ORIGINAL layout box at its original
document position — the element behaves like `position: static` until its scroll-position rule
starts, then like `position: fixed` until its containing block's far edge scrolls past. Everything
after it in the DOCUMENT keeps its own position exactly as if the sticky element had never moved:
a later sibling's distance from the top of the page is fixed at layout time, not relative to
whether the sticky element is currently pinned or not. As the reader scrolls down, that sibling's
position in VIEWPORT coordinates keeps climbing — past the point where it visually clears the
pinned graphic's own screen footprint (fine), through the exact band where it visually sits WITHIN
that footprint (not fine — this is where the overlap happens), and eventually above it entirely.
Any narrative step whose own "centred and legible" reading position lands inside the pinned
graphic's box, at ANY point in the scroll, will visually collide with it. In a single stacked
column, with the graphic tall enough and the reader scrolling through several 70vh-tall steps, that
collision is not a corner case — it happens on ordinary use, every single step.

**What does NOT fix it**: giving the graphic a solid `background` so the collision is "only"
visual clipping rather than transparent double-exposure (both still unreadable); reducing the
step's `min-height` (moves the collision, does not remove it); raising the sticky graphic's
`z-index` so it wins the overlap (makes the graphic legible and the prose invisible instead of the
reverse — same bug, different victim).

**What this skill does instead — the fix, gravure-worthy for the next scrolly built anywhere in
this project**: put the sticky graphic and the scrolling steps in **separate columns**, side by
side (`scripts/render-scrolly.mjs`'s own `buildCss`, `.scrolly-track` under the
`@media (min-width: 720px)` rule — a CSS grid, graphic column sticky, steps column scrolling next
to it). Two columns make the collision **structurally impossible**, not merely less likely: the
graphic's sticky box and the steps' scrolling box never share the same horizontal space, at any
scroll position, so there is no coordinate at which one can paint over the other. This is the
standard shape real editorial scrollies use for exactly this reason, and it is worth reaching for
first rather than rediscovering the collision this file describes.

**Below the two-column breakpoint, this seed does not attempt to keep the graphic sticky at all —
it sits once, statically, above the steps.** A single stacked column has nowhere to put an opaque
pinned graphic that a normal-flow paragraph below it can never eventually scroll under (shrinking
the graphic only narrows the collision band, it does not remove it, and a narrower band is a
sneakier bug, not a fixed one). A graphic that does not advance per step, but is fully present with
the reveal's own most complete frame, is an honest, deliberate scope cut for narrow screens — not a
silently degraded version of the desktop bug. The next beat that genuinely needs an advancing
graphic on narrow screens should look at an overlay-scrim pattern (text cards floating ON the
graphic, not beside it) rather than reaching for a taller sticky box in one column; that pattern
was not built here — see "What this genre does not attempt" below.

## What survives with JavaScript disabled

**Everything survives except which step's own frame is on screen.** The header (title, source),
all four step frames' own markup, and every step's own prose paragraphs are plain SSR'd HTML —
nothing about the beat's argument depends on the script executing. What CSS alone does, with no
script at all: `STEPS[0]` is marked `active` in the markup at build time
(`assets/ScrollySeed.tsx`'s own doc-comment, item 3), and `.step-frame { opacity: 0 }` /
`.step-frame.active { opacity: 1 }` is what keeps exactly that one frame visible and every other
one invisible, permanently, with no script involved. `position: sticky` pinning the graphic (at the
two-column breakpoint) is CSS too — the reader still sees the pin behave correctly with the inline
script entirely removed from the page. What does NOT survive: the frame ever advancing past
`STEPS[0]` as the reader scrolls. This was driven and confirmed in a real browser with
`page.setJavaScriptEnabled(false)` — not inferred from reading the markup — see "Verification."

## Keyboard and screen readers reach every step without scrolling being the only route

**Every step's prose is an ordinary `<p>` in ordinary document flow — not toggled, not clipped,
not `aria-hidden`, not dependent on the reader's scroll position.** A screen reader user reading the
page top to bottom, or a keyboard user pressing Page Down / the down arrow, reaches all four steps'
own words in the same order a sighted reader scrolling the page does; nothing about reaching a
step's text depends on the sticky graphic ever reaching the matching frame. The graphic itself is
marked `aria-hidden="true"` on every one of its stacked SVGs — a deliberate choice, not an
oversight: the argument this beat makes (the 2016 level, the four-year fall, the 2021 rebound, the
34.6% final drop) is stated in full, in words, in the prose and the unconditional header; the
graphic reinforces it visually but carries nothing an accessible reader needs that the text does
not already say. Exposing only whichever ONE frame's own `<desc>` happens to be visually active at
a given scroll position — a description that changes out from under a screen reader user with no
navigable boundary marking when — would be a worse reading than not exposing the graphic at all.

## What the graphic is allowed to be silent about

Because every step's prose already states its own numbers in words, the per-step SVG frame is
allowed to be purely reinforcing: it never introduces a value, a year, or a claim that is not also
in that step's own paragraph. This is the inverse of `twin-chart-web/references/web-discipline.md`'s
"what hover reveals" rule (there, interaction adds detail the static frame had no room for); here,
the graphic never carries detail the prose does not already carry, because the graphic is the one
layer this genre allows to go unheard by assistive technology.

## Reduced motion

**The only animated CSS property this genre ships is the `.step-frame` opacity crossfade, and it
is gated entirely behind `@media (prefers-reduced-motion: no-preference)`.** A reader who asks for
no animation gets an instant cut between frames, not a slower or smaller version of the same
crossfade — confirmed by reading the computed `transition-duration` in a real browser under both
preferences (`0.3s` without the preference set, `0s` with `prefers-reduced-motion: reduce`), not by
reading the CSS and assuming the media query works. No other layer in this genre animates: the
sticky pin itself is a static CSS position, not a scroll-driven transform, and the inline script
never calls `scrollTo` or any other JS-driven motion — see `assets/interaction.mjs`'s own
doc-comment on what it does and does not do.

## What must not become interactive-only

The same rule `web-discipline.md` states for hover applies here to scroll: the title, the source,
the reference rule and its label are drawn unconditionally in every one of the four SSR'd frames —
none of them appears only on some steps or only once the reader has scrolled to a particular one.
What genuinely changes per step is only the REVEAL (how much of the line is traced) and the
step-specific annotation (the rebound marker, the end label) — never the beat's own argument, which
the persistent HTML `<header>` states in full before the reader has scrolled at all. This is also
why the title and source live in that HTML header rather than being baked into each SVG frame, a
deliberate departure from `twin-chart-web/assets/ChartWebSeed.tsx`'s own pattern (there, the title
is drawn inside the one SVG because there is only ever one frame on screen at a time in a
non-stepping sense): here, four frames exist in the same DOM at once, and duplicating the same
title/source string into all four — with three of them `aria-hidden` and invisible — would be pure
waste for no accessibility gain, since the header alone already reaches every reader.

## What this genre does not attempt

**A map track.** This seed carries a chart (the same "one series, revealed step by step" shape
this file's own title claim uses); a scroll-driven map beat (`flyTo` waypoints reusing
`twin-map-beat`'s own `mapStory` shape) is a different vehicle load, not built here, and would need
its own pass through this file's own "one gotcha" before it ships — a map's basemap tiles are not
free to duplicate four times the way an SSR'd SVG frame is.

**Roving-tabindex / single-stop keyboard navigation of the reveal itself.** There is no keyboard
shortcut that advances the active step directly (no `ArrowDown` handler, unlike
`twin-chart-web/assets/interaction.mjs`'s `ArrowRight`/`ArrowLeft`) — the reveal is scroll-only for
a sighted or motor-abled reader who has JavaScript on; the CONTENT is keyboard/screen-reader
reachable regardless (see above), but the animated GRAPHIC advancing on command is not. This is a
known, stated gap, the same register `web-discipline.md`'s own "Known cost, not hidden" section
keeps for its 75-Tab-stops limitation.

**A narrow-width advancing graphic.** See "The one gotcha," above — the two-column layout this
skill ships keeps the pin sticky only from `720px` up; below that the graphic is static, present,
and fully accessible, but does not step. An overlay-scrim pattern (text cards on top of a
full-bleed graphic, common in mobile-first editorial scrollies) is the natural next iteration and
is not built here.

## Verification

Applied by driving a real browser, not by reading the markup or trusting a screenshot taken before
scrolling. `twin-doctrine` states this as a universal rule, and this genre is the reason it exists
in the first place: this skill's own first build passed a static look at the rendered HTML (title
present, four frames present, four `<p>` present, one `.active` class present) and still shipped
the sticky-overlap defect this file describes — a defect visible only once a script actually
scrolled the page and a screenshot was taken AFTER that scroll, not before. Confirmed, in a real
Chrome, all four together: the active frame changes as each step is scrolled to (not merely that
`.active` moves in the DOM — that a DIFFERENT frame is now the one at `opacity: 1`); the graphic and
the currently-legible step's own prose never occupy the same screen pixels at any scroll position;
`page.setJavaScriptEnabled(false)` still shows the default frame and all four paragraphs, nothing
blank; `page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }])` yields a
`0s` computed transition where the same page without that preference yields `0.3s`; a `375px`
viewport produces no horizontal overflow and no clipped text. `test/render-scrolly.test.ts` covers
what a unit test CAN honestly prove (the geometry, the reveal cutoffs, the palette, the pure
`pickActiveStep` helper, that every step's prose is present and ungated in the raw HTML) and stops
there; the sticky/overlap/scroll behaviour above is proven, or not, by opening the rendered file and
scrolling it.
