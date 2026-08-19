# Scrolly discipline

The rules the scroll-driven vehicle is written under. There was no doctrine for this format before
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
at the width/height extremes this format's own full-bleed shape now guarantees it will actually meet,
and `DrawnGraphicFrame`'s own annotations (a label, a tick, the reading dot) were never designed
against that crop — see "Nothing annotated can be cropped," below, for the geometry and the
mechanically-enforced `SAFE_AREA` that fixes it. REWRITTEN AN EIGHTH TIME against the round that reversed the SEVENTH's
own prose-panel pin: the seventh correction stopped the panel travelling in order to stop it crossing
the graphic's labels, and stopping it travelling is the defect the owner reported next — a scrolly
whose prose does not scroll. That round's answer was to give the prose its OWN cell of the track,
where it could travel the full height without ever meeting a label. AND REWRITTEN A NINTH TIME
against the round that reversed THAT: a cell of its own is a side column, and the owner's next
correction names the form outright — *"Le panel avec le texte ne doit pas être sur le côté mais
centré et par dessus le contenu visuel."* The card is back over the visual, centred, and the
collision it re-opens is answered by the card being OPAQUE and measured rather than by the two
things never meeting (see "What the card covers," at the top of this file, for what was measured on
a continuous scroll in both directions at three widths, the two width regimes, the step height, and
the band the frames used to reserve — now reclaimed in the seed). Every rule below is either a
decision this format needed and the others did not, or an explicit inheritance from `doctrine`
stated so it is not silently assumed. Every section below describes the CURRENT code, not a remedy it once used and no
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

## What the card covers, and what was done about it (the ninth correction)

**Read this before every section below it, including the eighth's.** The section under this one
describes the two-cell split, in full, because it is only legible against what replaced it. That
split is gone. What follows here is what ships.

**The owner's correction, after driving the beats the eighth correction shipped:** *"Le panel avec
le texte ne doit pas être sur le côté mais centré et par dessus le contenu visuel."*

**What the eighth correction got right, and it is kept in full.** The prose TRAVELS — an ordinary
flow box centred in a step taller than the box it scrolls in, moving by the reader's own scroll on
every animation frame, nothing pinned and nothing parked. The page does not scroll, the header does
not move, the active step is decided from every panel measured against the lane, and
`data-progress` is published on every scroll with the same meaning it was given there. Measured
after this round, on the seed at 1600x900: 627, 931, 931 and 639px of travel per card, **0% held**,
in both scroll directions. Every one of those properties was re-measured rather than assumed.

**What it got wrong is the shape.** Two cells make a prose/graphic collision impossible by never
letting the two things occupy the same space — which is exactly the dead end this file's own "one
gotcha" section already records the owner rejecting once: *"you solved the sticky-overlap bug by
splitting into two columns, that avoids the problem rather than solving it, and it produces the
wrong form."* The eighth correction's cell was not the third build's narrow-graphic column — the
graphic did fill its own cell — but it is a side column, and a scrollytelling piece's whole grammar
is that the graphic is the ground the prose reads AGAINST.

**So the collision is answered the other way, and this is the only answer that is measurable.** The
card is fully OPAQUE, painted with the exact `ground` this render's furniture was derived from. A
translucent card's EFFECTIVE colour is a blend of the card and whatever part of the graphic sits
behind it at a given scroll position — not a single value, changing frame to frame and pixel to
pixel. An opaque card has no such ambiguity: wherever it sits, over the photograph or the plot or
the basemap, the colour a reader's eye meets is `ground`, so the only contrast question left is
ink-on-ground, which `deriveFurniture` already guarantees, `renderScrolly` asserts before it writes
a byte, and `scripts/verify-scrolly.mjs`'s assertion F3 asserts AGAIN off the live computed styles
of a driven browser — 21.00:1 on this seed's own white, read as `rgb(0, 0, 0)` on `rgb(255, 255,
255)` from the DOM rather than from the stylesheet.

### What it covers — measured before it was decided

A continuous scroll, a per-frame recorder installed before the scroll was touched, **both
directions**, three widths, the seed and all six beats on disk:

| | 1600x900 | 1280x800 | 375x812 |
|---|---|---|---|
| card | 409 x 132-183 | 409 x 132-183 | 375 x 132-183 |
| as a share of the frame | 26% wide, 16-22% tall | 32% wide, 18-26% tall | 100% wide, 21-31% tall |
| frames the card sat over a label | 44-129 of ~241 | 44-125 of ~240 | 16-175 of ~240 |
| frames the visual stood entirely clear | 26-35 | 21-33 | 12-27 |
| longest run a label was SLICED down its side | 0-9 | 0-12 | **0** |

**Three things follow from those numbers, and none of them is "reserve a band."**

1. **No band can be reserved, and that is arithmetic rather than opinion.** The card crosses the
   whole height of the frame once per step, at the reader's own uniform rate, so every row is
   crossed equally often. And at the one position that is editorially load-bearing —
   `data-progress = i`, the moment step `i`'s own sentence sits on the lane's centre line — the card
   is DEAD CENTRE of the frame, by the definition of that signal. A band at the bottom protects the
   one place the card never dwells.
2. **The card's WIDTH is the vehicle's one real lever, and it has two settings.** A label sitting
   under the card reads as absent, which is what a card over a picture means. A label the card's own
   VERTICAL edge cuts down the middle reads as broken text, and stays broken for every frame the
   card spends at that row — *"the 'flood day' label reduced to 'flo…'"* is the owner's own report
   of exactly that, from the last round a card was centred. So: the card is either comfortably
   narrower than the frame, its edges landing in the middle where a frame does not put its axis
   furniture, or exactly as wide as the frame, with no edge inside it at all. **Never in between.**
   Frames keep their margin content in the outer ~15% (`CHART_LAYOUT`'s y-axis gutter is
   `max(62px, 13%)`), so "comfortably narrower" is at most 70%; the reading measure renders at
   410px and 410 / 0.7 = 586, which is where the regimes change — `600px` in the stylesheet.
   Measured at 375px: the in-between shape (a 330px card, 88% of the frame) cut the seed's own
   y-axis labels for **48, 41, 12 and 12 consecutive animation frames**; edge to edge it cuts
   nothing, on any beat, at that width. Asserted by F4.
3. **Some frames must be composed differently, and the seed now shows how.** On a desktop the card
   HAS vertical edges inside the frame, and whether a label straddles one is the beat's own
   composition. The seed's `flow` label sat at x 380 and straddled the right edge at 1600x900 — 10
   consecutive frames of "flo", measured, and visible in a screenshot taken at the moment the step
   is narrated. **There is no placement that is outside the stripe at every width**, and that is the
   finding rather than a limitation of one drawing: a COVER-cropped frame's scale changes with the
   viewport, so 410px is 164 viewBox units at 1600 and 437 at 600, nearly the whole canvas. So a
   label on a CROPPED frame is placed INSIDE the stripe — hidden whole while the card passes, whole
   the rest of the time, never across an edge. A FITTED frame escapes this entirely: its layout is
   in fractions of its own box, so a left gutter is on the left at every width, which is why the
   chart's tick labels are never sliced on a desktop. `flow` and its arrow moved to x 286..400 and
   the sliced run went to 0.

### The step is 140% of the frame, and the number is measured

A step is the distance between two consecutive card centres, so the share of a pass on which no card
is over the graphic is `1 - (L + p) / S` — track height `L`, card height `p`, step `S`. Raising `S`
buys clear air and costs LOCK-STEP, because the active step flips when the incoming card enters the
bottom edge, at `progress = i + 1 - (L + p) / (2S)`, and the guard's ceiling is 0.65 of a step.
Driven on the seed at three heights:

| step | frames the visual stood clear | worst step/progress drift | two cards on screen |
|---|---|---|---|
| 115% (the eighth correction's) | **0 of 217**, at every width | 0.50 | 1-14 frames |
| **140%** | 28-31 of ~230 | 0.58 | **0** |
| 170% | 48-58 of ~235 | 0.64-0.66 — at or over the ceiling | 0 |

115% was chosen when the card lived beside the graphic and covering it was impossible; over the
graphic it means a reader never once sees the visual unobstructed. 140% is the largest step with
real margin on both numbers, and it also happens to be where two opaque cards are never on screen at
once — beside a visual that is what a boundary looks like, ON it, it is a wall. The frame swap now
happens in the clear gap, as the next card enters at the bottom edge: `pickActiveStep` returns null
while no card is in the lane and the last frame is held, so the reader sees the visual change with
nothing over it, then the card arrives to narrate it.

### The band the frames reserved: it became WRONG, and the seed has reclaimed it

The eighth correction left this residue and named it: every frame reserved `PROSE_LANE`, 28% of its
own height, at the bottom, for a panel that no longer parked there — about 230px of bare ground under
the seed's chart at 1600x900. Of the three things it could have become, it is **wrong**: it is not
"right again" (the card rests nowhere, and where it is at the narrated moment is the CENTRE, the
furthest point from that band), and it is not "the card's clear path" (the card's path is the entire
height, at a uniform rate, so a clear path is the whole frame). So in the seed, `PROSE_LANE` and
`CONTENT_TOP` are gone, `safeBand` no longer takes a lane, and `CHART_LAYOUT.plot.bottom` is 0.90
instead of 0.63 — the plot uses the frame's own height and what is left below it is the strip the
x-axis labels actually occupy, asserted against that rather than reserved by a constant.

`renderScrolly` still ACCEPTS a `proseLane` (now `>= 0`, defaulting to 0) and still emits
`--prose-lane`/`data-prose-lane`, because **four beats on disk still carry their own copy of the
constant** and two of them derive a CAMERA from it rather than only a plot box. Reclaiming there is
a re-composition of those beats, not a constant edited, and it is deliberately not smuggled into
this round — named residue, again, but named smaller.

### One consequence to state rather than discover later

The card layer is `position: absolute; inset: 0` OVER the graphic, so it takes every pointer event
in the frame — which is right (a reader's wheel and finger belong to the scroll) and means **a beat
whose graphic wants hover cannot have it through this scaffold**. That was equally true under the
seventh correction's stack and untrue for the one round the two had separate cells; no beat on disk
relies on it (the only `pointerEvents` in any scrolly frame component is a `none`), and a beat that
did would need the card layer to pass events through everything except the card itself. Named, not
built.

### What replaces the reservation is a composition rule, not another band

> Nothing whose only copy a reader needs may sit alone in the card's own stripe down the middle of
> the frame — and nothing may straddle its edge. On a FITTED frame, keep the axis furniture in the
> gutters, which are outside the stripe at every width. On a CROPPED frame, no placement is outside
> the stripe at every width, so place a label INSIDE it and let the card hide it whole.

**And the one instance of that rule this round did NOT close, because it is a BAKE rather than a
placement.** The seed's own map track has exactly one mark — the station's dot and its
`Point of Rocks, MD` label — and `scripts/bake-plate.mjs` centres the camera on the station, so the
mark lands dead centre of the plate and therefore dead centre of the frame, which is where the card
rests at the narrated moment. Screenshot-confirmed in `output-proof/track-3-map.png`: the marker is
behind the card at `data-progress = 2`, and reappears as the card travels on. The prose names the
station in words at that exact moment, so nothing a reader needs is lost, but the picture would be
better if the camera were offset so the subject sat clear of the middle. **A single-subject frame
should be BAKED off-centre** — that is a change to the bake and its committed geometry file, needs a
live MapTiler key, and is named here rather than smuggled in.

### The card is an overlay: it enters NO measurement of the visual (the tenth correction)

> **A visual's own state, and every assertion made about it, are independent of the prose layer
> travelling over it.** The card is an element above. It does not alter what the graphic draws, and
> it may not be subtracted from what the graphic is measured to have drawn. No guard, at any width,
> may report a defect whose cause is the card being in front of something.

*"Le text panel du scrolly ne doit pas impacter le déroulé de la map. C'est un élément au-dessus, il
n'a pas d'incidence."* — the owner, ruling on the Danube beat, 2026-08-10.

**Why this needs writing down rather than leaving to sense.** The rule above about what the card
covers is a COMPOSITION rule — it constrains where a beat puts its furniture. It is easy, and wrong,
to read it as also licensing a *measurement*: if the card must not cover a label, then surely a
guard should check what the card covers. The Danube beat built exactly that. Its reveal probe reads
the painted pixels along the route, so it has to know where the card is — otherwise the card's white
fill reads as unpainted river and the guard invents a hole every time the card crosses the line. From
there it is one short step to counting *how much* the card takes away, and then to failing on it, and
the beat shipped a red that said the river could only be followed in two pieces at 1600 × 900, three
at 1280 × 800, and none at all on a phone. Every one of those numbers was correct about the
composited picture and none of them was about the river, which is drawn whole underneath at every
width.

**The distinction that survives, and it is the useful half.** Knowing where the card is remains
necessary — as an INSTRUMENT concern, never a subject one. A pixel the card is in front of is
*unobservable*: it supports no claim in either direction. It may not count as a hole in the reveal,
and it may not be aggregated into a defect of its own. Where an assertion needs the pixel it cannot
read (Danube's "does the reveal reach the end of the river?"), the assertion is made against what
*could* be read, or it is made somewhere else entirely — on the geometry, or on the state the driver
publishes. Danube's `routeGeometry` is the model: it reads the delivered path against the beat's own
last badge, sees a truncated or holed river with no browser at all, and cannot be confused by an
overlay because it never looks at a composited pixel.

**The practical test for a new guard.** Ask whether the same visual, rendered with the prose layer
deleted, would produce a different verdict. If it would, the guard is measuring the overlay and does
not belong.

## The prose has its own space (the eighth correction — REVERSED in part by the ninth, above)

**Read the ninth correction first.** What this section describes that STILL SHIPS is the TRAVEL: an
un-pinned card centred in a step taller than the box it scrolls in, and the measurements that
condemned the pin. What it describes that no longer ships is the two-cell SPLIT, `--prose-col`,
`--prose-band` and the 860px breakpoint — all removed. The seventh correction, one section down,
made the graphic fixed and took the scroll off the document; both of those ship, unchanged.

**The owner's report, after driving the three beats the seventh correction shipped:** *le panel avec
le texte ne bouge plus alors que l'effet c'est vraiment de les faire défiler au scroll vers le haut.*
The panels do not move any more, and the whole effect is meant to be them scrolling UPWARD past the
fixed graphic.

**He is right, and every guard on this vehicle was green while it was true.** `scripts/
verify-scrolly.mjs` asserted six things and each one was about WHICH step was painted. Not one asked
whether the words MOVE. Run over the same shipped artifacts with the travel assertion added, it
measured, on `scrolly-chart-eu-carbon` at 1600×900: the middle panels held ONE screen offset for 42%
and 44% of every scroll-advancing animation frame, and the last panel for 78%, sweeping 187px of an
821px track. On the Danube beat, 45% and 44%, and 218px of 836. That is a slideshow with a scrollbar.

**Why the pin was there, because reverting it alone would re-open a real defect.** An OPAQUE panel
travelling the full height of a box it SHARES with the graphic crosses every part of that graphic at
some offset. Whatever rectangle a frame keeps its labels inside, the panel reaches it eventually —
measured, before the pin: this seed's own "flood day" label reduced to "flo…" at 1600×900, 55% of the
way through a step. Five rounds of safe areas did not fix it and could not: no reservation survives a
travelling occluder.

**So the prose gets its own space instead of a reservation inside the graphic's.** `.scrolly-track`
is a two-cell grid and each cell clips its own content:

```css
.scrolly-track   { display: grid; grid-template-rows: minmax(0,1fr) var(--prose-band); }  /* phone */
@media (min-width: 860px) {
  .scrolly-track { grid-template-columns: minmax(0,1fr) var(--prose-col);
                   grid-template-rows: minmax(0,1fr); }                                    /* desktop */
}
.step       { min-height: 115%; align-items: center; }   /* was flex-end, for the pin */
.step-panel { /* no position, no offset — an ordinary flow box */ }
```

The panel is centred in a step 15% taller than the column it scrolls inside, so it crosses that
column once per step: **it enters at the bottom edge, passes the middle, and leaves past the top,
moving by exactly the reader's own scroll on every animation frame.** Nothing clamps it, because
nothing needs to — the graphic is not underneath it. Measured after the change, on the same beat at
the same width: 544px, 992px, 992px and 553px of travel per panel, and a held share of 0% everywhere.

**This is NOT the two-column layout the third build shipped and the owner rejected.** That rejection
is quoted below ("The one gotcha", the documented dead end): *"you solved the sticky-overlap bug by
splitting into two columns, that avoids the problem rather than solving it, and it produces the wrong
form."* What was wrong there was a NARROW graphic stranded in a wide viewport — the graphic and the
prose each got a comfortable reading measure and the visual stopped filling anything. Here the
graphic fills its own cell edge to edge, at 1160×821 of a 1600×900 viewport, and the prose column is
the only thing taken off it. The form a reader meets is a full graphic with words travelling beside
it, not a picture in a column.

**How the two numbers were chosen — measured, not picked.** Both cells were driven at every width
and the render opened at each:

- **The prose column, `clamp(300px, 30%, 440px)`.** The floor is the panel's own measure: `.step`'s
  gutter takes 32px and `min(46ch, 100%)` needs about 390px to read as a paragraph rather than a
  ladder, so below roughly 300px the column stops being a column. The 30% is what leaves the graphic
  the larger share at every desktop width; the 440px cap stops a 2560px monitor handing the prose a
  third of the screen. Rendered: 440×821 at 1600×900, 384×721 at 1280×800.
- **The graphic's floor, and therefore the breakpoint.** The frames are SSR'd at a fixed canvas and
  COVER-cropped onto whatever box they get, so a NARROWER box crops them LESS, not more —
  `safeBand`'s own `ASPECT_ENVELOPE` (`0.42`..`2.4`) covers everything from a tall phone to an
  ultrawide, and the narrowest cell any width produces is 375×332 (aspect 1.13), well inside it. The
  binding constraint is the FITTED chart frame instead: `CHART_LAYOUT`'s y-axis gutter is
  `max(62px, 13%)`, and below 477px of width the percentage falls under the fixed floor and the
  layout stops scaling. 300 + 477 = 777, so the two cells stop fitting side by side at about 800px;
  **860px** is that with room for the gutters. Below it they stack.
- **The prose band on a phone, `clamp(150px, 42%, 340px)`.** The open finding the previous round left
  was that at 375×812 the prose needs 209px against a 177px lane. 42% of the track resolves to
  **265px** on the seed, 271px on `scrolly-chart-eu-carbon`, 240px on the Grinnell beat — and the
  tallest panel fits in every one of them, on all six beats on disk. **It resolves the finding; it
  does not relocate it.** The guard reports the tallest panel against its band at every width and
  says so when it does not fit; that note is silent on all six beats. The cost is paid by the
  graphic, which gets 332-374px instead of the full track.

**What it costs, stated rather than discovered later.** The graphic no longer spans the full viewport
width on a desktop — it spans the viewport minus the prose column. "All web visuals take the full
width", satisfied by the sixth correction, now holds only up to that column. The alternative is the
parked panel the owner rejected, and this scaffold cannot have both.

**What it removed.** `pickLanePanel`, the `in-lane` class and `.scrolly--live` are gone from
`assets/interaction.mjs` and from the CSS. They existed because a `bottom`-sticky panel un-pinned one
panel-height before the next one parked and spent that gap opaque and climbing over the graphic's
labels — closed by not painting it. The prose is now clipped inside its own cell and cannot reach a
label at any offset, so that rule has nothing to protect, and keeping it would do harm: the reader
would watch the words they are reading DISSOLVE halfway up the column instead of scrolling out of it,
which is the same defect the owner named wearing a different costume. **Two panels on screen through
a boundary is not a bug in a scroll-driven piece; it is what a boundary looks like.**

**The residue this correction did NOT close — closed for the seed by the ninth, above.** Every frame
reserved `PROSE_LANE`, 28% of its own height, at the bottom, for a panel that no longer went there;
on the seed's own chart step at 1600×900 that was roughly 230px of empty ground under the plot. The
seed has reclaimed it (`safeBand` takes no lane, `CONTENT_TOP` is gone, `CHART_LAYOUT.plot.bottom` is
0.90); four beats still carry their own copy, and two of them derive a camera from it.

**And the guard that was missing is the point of the round.** `scripts/verify-scrolly.mjs` gained two
assertions and lost none: **F**, no panel is ever painted over the graphic (the visible part of every
panel, clipped by the column that scrolls it, measured against the graphic's box — the structural
claim of this correction, and impossible to satisfy under the model it replaced); and **G**, the
prose travels — each panel must sweep a real distance across its column and must not HOLD one offset,
measured as the share of scroll-advancing animation frames at which its own top did not move. Both
are mutation-proved in `test/scroll-integrity.test.ts`'s own header, including the honest note that
G's enter/leave halves do NOT fire under the pin; the held share is what discriminates.

## The visual evolves as the reader scrolls — the vehicle publishes a CONTINUOUS signal, not only a step

**The eighth correction's second half, and it is a missing SIGNAL rather than a tuning.** With the
prose travelling again, the owner drove the two single-visual beats and reported the navigation
itself: *"Pour le scrolly navigation, on y est pas du tout. Pourquoi tu ne suis pas un peu le principe
d'une animation au scrolly, faut que ce soit fluide et que l'élément évolue au fur et à mesure du
temps."*

**He is right, and the reason is structural.** The vehicle published exactly two things a consumer
could read: which step is `active`, and a 0.3s CSS transition that finishes precisely when that class
moves. Between two boundaries NOTHING changed. A visual re-parented into the frame stack had nothing
to scrub against, so however smoothly it could animate it could only ever CATCH UP at the handover —
a slideshow with a fade, which is what the owner was looking at.

**What ships: `data-progress`, on the same root that carries `data-prose-lane`, written on every
scroll.** It is the FRACTIONAL INDEX of the prose panel sitting on the lane's own centre line —
exactly `i` when panel `i`'s centre is on that line, exactly `i + 1` when panel `i + 1`'s is, a
linear interpolation between the two card centres that bracket it, clamped to `0 … steps - 1`.
`measureProgress(panels, lane)` in `assets/interaction.mjs` is the pure function, unit-tested; the
scaffold draws nothing with it and never consumes it.

**Why it is measured over the CARDS and not over the scroller's own `scrollTop`.** A raw
`scrollTop / scrollHeight` fraction is cheaper, and it is the wrong number: it says how far the
CONTAINER has moved, and the reader is looking at the words. Interpolating between card centres makes
"the drawing reaches the moment this sentence names" and "this sentence reaches the middle of its
column" the SAME event — at any panel height, any step height, on a phone and on a desktop. The scrub
and the caption cannot drift apart because they are one measurement. **In our model the reference is
the LANE's centre, not the viewport's**, because the document does not scroll and the prose travels
inside its own cell; that is the coordinate that had to change when the idea was carried over.

**It is in lock-step with `pickActiveStep` by construction, and the guard checks it.** For panels of
equal height the max-overlap winner changes at exactly the moment progress passes `i + 0.5`: at
`u = 0.5` the outgoing card's centre sits `0.075 × L` above the column's top and the incoming card's
the same distance below its bottom, so their visible heights are equal. Measured across the seed and
all six beats at three widths, the worst step-versus-progress drift is **0.50 to 0.54 of a step** —
which is the crossover itself, not a drift. `scripts/verify-scrolly.mjs`'s assertion H fails above
0.65.

**What assertion H measures, and why it is the one whose absence let this ship.** Between two
boundaries the discrete state is constant BY DEFINITION; if the continuous one is constant too, the
element is not evolving, whatever else is green. So H counts the scroll-advancing animation frames on
which the active step did NOT change, and requires progress to have moved on essentially all of them:
measured, **6-8 still frames of 170-192** (the clamped ends), against **181 of 182 (99%)** under a
mutation that quantises the signal to its own step. It also asserts the signal is present at all,
never goes backwards on a forward pass, spans `0 … steps - 1`, and stays in lock-step.

## One page, two inlined scripts, one global scope

**`inlineable()` strips `export` from every top-level declaration, which makes every one of them a
GLOBAL — and a beat that inlines a second script of its own lands in the same scope.** Both
single-visual beats do exactly that: they re-parent their visual into the frame stack and scrub it
themselves. When this scaffold gained a `measureProgress`, theirs — a different function, taking an
array of lane overlaps rather than panels and a lane — was silently overwritten by whichever
declaration the browser parsed last, and their paint loop threw
`Cannot read properties of undefined (reading 'top')` on every animation frame of every scroll. It
was found by driving one beat with `pageerror` wired up, not by any test.

**The fix is one line and it is in `render-scrolly.mjs`: the inlined scaffold is wrapped in an IIFE**,
so it declares nothing globally. Nothing about this scaffold was ever meant to be reachable from a
beat's own script; the wrapper makes that true instead of merely intended. A beat's own inlined script
is still global — that is the beat's business — but it can no longer be shadowed by the vehicle
carrying it.

**Standing rule for anything added to `assets/interaction.mjs`:** a page can carry more than one
inlined script, and the vehicle must never be the one that breaks the beat. If the wrapper is ever
removed, every name in that file becomes an API a beat can collide with.

## A camera flight this vehicle does not own, and the trap it sets

**Recorded rather than fixed, because cameras belong to the beats.** This scaffold owns the scroll,
the step decision and the progress signal; it owns no camera. The seed's own map track is a plate
BAKED once with no camera at runtime at all (see "A map track without a live map"), and the map beats
that do fly a live camera do it in their own `map-drive.mjs`. So this is doctrine for the next person
rather than a change here.

**The trap.** A reader can scroll faster than a camera flight completes, so each step's flight
INTERRUPTS the last one mid-air. If the new flight's floor is computed from the camera's LIVE zoom at
the moment of interruption, that floor ratchets wider on every interruption — the camera drifts out
and never reaches the target the beat named. The fix is to cap a flight's apex at the TIGHTER of its
two endpoints with no added margin: the motion becomes monotonic, and interrupting it at any point
leaves the next flight starting from a state the next cap still bounds. A camera that cannot ratchet
cannot drift.

**And with `data-progress` published, a beat has the alternative that avoids flights entirely**:
derive the camera from progress on every frame instead of firing a transition at each boundary.
A camera written as a function of a monotonic scrub has nothing to interrupt.

## The graphic is fixed and the page does not scroll (the seventh correction, and the one that
## removed a mechanism rather than tuning it)

**Read this before the two sections below it.** They describe the sticky model, in full, because
five rounds of this file's own corrections are only legible against it — and because the defect it
produced is the clearest thing in this project about the difference between *a check that passes*
and *a page that works*. That model is gone. What follows here is what ships.

**The owner's report, after driving the three new beats: `le scrolly est buggé pour tous`.** Not one
beat — all of them, and the shipped seed with them. Two sentences of his named the model rather than
a bug in it: *en scrolly le contenu ne doit pas bouger, donc pas avoir la possibilité de scroller
dans la page. Seul le bloc texte explication bouge au scroll. Hors là on scroll d'abord dans la page
qui fait disparaître le titre alors que ça devrait être fixe.*

**What the sticky model could not avoid, however well it was tuned.** The DOCUMENT scrolled and the
graphic was `position: sticky`, so:

1. **The graphic arrived late.** Between scroll 0 and the moment its top reached `top: 0` it was
   still climbing from below the header — ordinary sticky catch-up, not a bug in the CSS. In that
   band its whole box hangs below the fold by the header's own height, which drags a FITTED frame's
   content down into the pinned panel's lane. Measured on `scrolly-chart-eu-carbon`: 90px of a
   3,330px track at 1600×900, and 177px of 3,100px at 375×812, where the phone's taller header
   makes it worst. The seed and the Danube beat dodged it by accident of frame kind — their first
   step is COVER-cropped with its annotations high — so the corpus had been lucky, not correct.
2. **The title disappeared on the reader's first gesture**, because the header was in the document
   that scrolled. That is the owner's own sentence, and no value of `--graphic-h` addresses it.
3. **The component fought its host for the scroll.** Ruling R2 makes web an embed component; a
   component that takes over an article's scroll is a nuisance in it.

**The model that replaced it, in four rules.** `.scrolly` is a two-row grid exactly one frame tall
(`grid-template-rows: auto minmax(0, 1fr)`), `html, body` are `height: 100%; overflow: hidden`, and:

```css
.scrolly-track  { position: relative; overflow: hidden; }              /* row 2: the frame */
.scrolly-graphic{ position: absolute; inset: 0; z-index: 0; }          /* fixed. never moves. */
.scrolly-steps  { position: absolute; inset: 0; z-index: 1; overflow-y: auto; }  /* the one scroller */
.step           { min-height: 115%; }                                  /* % of the track, not vh */
```

The header is row 1, OUTSIDE the scroller, so it is fixed by construction rather than by a
`position` keyword that has to be got right. The graphic is not positioned from the scroll at all,
so it cannot lag behind it. The deliberate overlap this format is built on survives unchanged — it is
now two absolutely-positioned layers sharing one box instead of a negative margin cancelling a
sticky reservation, which is the same picture with one fewer number to keep in step.

**What this made unnecessary, and it is a long list**: `--graphic-h`; `.scrolly-steps`'s negative
top margin; the whole sticky-reservation trick and the gotcha section that explains it; the approach
band and every measurement of it; the un-pin band at the end of the track; and `115vh` versus the
track's real height, which were the same number under the old model and are not under this one.

**What it cost, and this is not free.** The graphic no longer fills the viewport's full height — it
fills the viewport minus the fixed header, measured at 821px of 900 at 1600×900 and 588px of 812 at
375×812. That is the price of a title that stays, and it is the shape the reader already saw at
scroll 0 under the old model; what changed is that it now stays that way. Taking the scroll off the
document also takes the reader's default keyboard scrolling with it, which is why `.scrolly-steps`
carries `tabindex="0"` — a scroll container that cannot be focused cannot be driven by a keyboard,
and losing Page Down would have been a real regression traded for a visual one.

## The active step is decided from every panel, on every scroll — never from a delta

**The second half of the same correction, and the one that had actually broken every beat.** The
model above explains why the title moved and why a fitted frame's content sat in the lane. It does
not explain the owner's other sentence — *les steps sont mal gérés, des charts/maps/images
apparaissent au mauvais moment* — which contradicted a measurement taken the same week: 25 scroll
positions, three widths, the active frame at exactly `opacity: 1` and every other at exactly `0`,
25 out of 25.

**Both were true, and the instrument is why.** Every round of this skill was verified by JUMPING to
N discrete scroll offsets, waiting ~450ms for the page to settle, and reading the state. Driven
CONTINUOUSLY instead — the only way a reader has ever met one of these — the same five pages at the
same three widths measured:

- **in FOURTEEN of the fifteen runs at least one step's frame was never painted at all.** On
  `scrolly-chart-eu-carbon` at 1600×900 the sequence was `direction → level → change`, and `spread`
  — the last step, with its own chart and its own paragraph — simply never appeared;
- the graphic lagged the prose by up to **1,800px of a 3,300px track**;
- roughly **45% of every animation frame the browser drew was a blend of two frames**, which is the
  "permanent double exposure" a previous round of this file claims to have removed. It had come
  back through a different door.

**The cause: `pickActiveStep` decided from the delta set.** The old rule took the entries of the
CURRENT `IntersectionObserver` callback — the panels whose ratio had just crossed one of
`[0, 0.25, 0.5, 0.75, 1]` — and activated the best of those. A callback carrying one panel activated
that panel unconditionally, whatever every other panel was doing. On a teleport the browser
recomputes every panel at once, so the delta set IS the full state and the rule is accidentally
right; on a continuous scroll the outgoing and incoming panels cross thresholds on alternating
frames and the active class OSCILLATED between them — measured, on one boundary at 1600×900:
`change` handed the class 8 times, `level` 5, `direction` 3. Each flip restarted the 0.3s opacity
transition from wherever the last one had reached, so nothing ever finished arriving.

**What ships instead is smaller, not larger.** There is no observer, no threshold list and no
`rootMargin`. On every `scroll` of the prose column, measure where every panel currently is and give
the step to whichever occupies the most of the lane. Lane occupancy changes monotonically as a panel
enters and leaves, so the winner changes exactly once per boundary — a property of the rule, not a
tuning of it, and true at any scroll speed and through any number of frames the browser skipped.

**And which panel is PAINTED used to be a different decision from which frame is SHOWN — the eighth
correction removed the second decision entirely. The paragraph below describes the seventh build and
is kept because the reasoning is why the split exists.** With the prose in its own clipped cell there
is nothing to withhold paint from, so `pickLanePanel`, `in-lane` and `.scrolly--live` are gone;
`pickActiveStep` is the only decision left, and the lane it measures against is now the prose column
itself rather than a band inside a shared box. Historically: this was the third
piece, and it closed the last of the prose-over-annotation collisions. A `bottom`-sticky panel
un-pins one panel-height BEFORE the next one parks, and spends that gap climbing up over the
graphic — still `active`, still opaque, straight across the band the lane exists to keep clear. So
`active` (which frame) is held across the gap, because the graphic is fixed and has nothing else to
show; `in-lane` (which panel may be painted) is not. A panel that has left the lane is not painted,
so it cannot cover anything. Leaving is a CUT and arriving is a fade, deliberately: a panel mid-fade
is a translucent box over the graphic, harmless inside the lane and exactly the forbidden scrim
outside it. Measured with a 0.12s exit, that was still 168px of track per boundary with prose over
the tick labels; a cut is 0.

**What that leaves, named rather than discovered later.** A panel taller than its lane can never be
inside it, and every beat on disk has one at 375×812 (209px of prose plus a 32px offset against a
177px lane) and most have one at 1280×800. Such a panel is painted anyway — a reader with a graphic
and no words is worse than an overlap — and `scripts/verify-scrolly.mjs` reports the beat and the
width every time. Two more residues belong to beats and not to this scaffold: the Danube beat's
numbered badge "6" sits inside the lane at 1600×900 (2 animation frames of 229), and the Grinnell
beat's photo-credit line sits inside it at 1280×800 (213 of 224). The vehicle cannot move a beat's
own marks.

## The one gotcha that wasted five rounds (historical — the model above replaced it)

**Everything from here to "The prose lane" describes the STICKY model, which no longer ships.** It
is kept because the corrections in it were each right about the thing they measured and wrong about
the thing they did not, and that pattern is this file's most useful content. Read it as history.

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
actually crosses the graphic; do not assume a panel background settles it."* This format answers that
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
   (`doctrine/references/visual-system.md`'s own escalation rule) already computes and
   guarantees for every other piece of furniture in this twin. This is not a new rule invented for
   this format; it is the SAME rule `visual-system.md` states for a mark's colour reused as a label
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
width* is a house-wide rule this format had never actually satisfied for its own sticky ground. Fixed
by MOVING the reading-measure constraint off `.scrolly` (now unconstrained — no `max-width`, no
padding) and onto the two things that were then taken to be prose: `.scrolly-header` (its own
`max-width: 640px; margin: 0 auto; padding: 0 clamp(16px, 6vw, 56px) 0` — the exact values
`.scrolly` used to carry, simply relocated) and `.step` (`padding: 24px clamp(16px, 6vw, 56px)`, the gutter that used
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

**Sixth build → seventh build: the HEADER joined the graphic at full bleed; the PANEL did not
(2026-08-10).** The sixth round moved the reading-measure cap onto "the two things that are actually
prose" and treated the header and the step panel as one category. They are not one category, and the
owner's feedback names the difference: *the title and the description must take the full width too*
— "too", meaning *as the visual does*. The header sits ABOVE the graphic, in document flow, framing
it; it is furniture over a visual, and a title stopping at 640px above a graphic running to 1600
reads as a box that failed to stretch. So `.scrolly-header`'s `max-width: 640px` is **removed**. Its
`clamp(16px, 6vw, 56px)` side padding stays and is the whole point of what survives: the header goes
edge to edge but never *touches* the edge, at any viewport.

**The step panel keeps its measure, and this section's argument for it stands unchanged.** The panel
is a different thing in a different place: prose travelling OVER the sticky graphic, read a sentence
at a time as the reader scrolls, a card floating on a ground. Its `max-width: min(46ch, 100%)` and
`.step`'s `justify-content: center` are what make it read as a card rather than as a band of text
laid across a picture — the "narrow, centred card on top of it" the measurements above describe.
Widening it would not make it "match the graphic"; it would dissolve it into the graphic. So this
round splits the sixth round's single category in two: **header = furniture, full bleed with a
gutter; panel = prose over the ground, measured.**

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
stretch, the same trade-off every full-bleed frame in this format already makes at every width it
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
the crop never reaches it"** — is `safeBand()`, exported from `assets/ScrollySeed.tsx`. It is
COMPUTED, never eyeballed, from an explicit `ASPECT_ENVELOPE` (`{ min: 0.42, max: 2.4 }` — a tall
phone through a 21:9 ultrawide) via COVER's own scale-factor math, with margin kept for text-metric
slack: the NARROWEST aspect in the envelope sets how narrow the visible width ever gets, the WIDEST
sets how short the visible height ever gets. `SAFE_AREA` is `safeBand(FRAME)` — a call, not a pair
of literals that can drift from the envelope they are supposed to come from, which is what they were
in the round that introduced them.

**The same function now returns a band that is BOTH uncropped AND above the prose lane** (see "The
prose lane", above): it takes `PROSE_LANE` off the bottom of the visible slice, in viewBox units, so
one call answers both placement questions at once — they are the same measurement made from
opposite edges. Every element `DrawnGraphicFrame` draws that carries MEANING — the staff, its six
ticks, the "cm" label, the reading dot, `dayLabel`, the flow arrow and its own "flow" label — is
placed inside that band BY CONSTRUCTION; the reading dot's own `waterTop` is
`staffTop + clamp(waterLevelT, 0, 1) * (staffBottom - staffTop)`, which cannot leave it for ANY
caller-supplied `waterLevelT`, in or out of `[0, 1]`. `MapFrame` uses the same function against the
PLATE's own dimensions rather than `FRAME`'s, and clamps a station the bake put outside the band
rather than drawing it off screen. Only plain colour fills — the bank and water rectangles, no text
on either edge — are free to bleed past the band and past `FRAME` itself; cropping a fill is not a
legibility problem the way cropping a label is.

**Enforced, not eyeballed, in two independent places.** `test/render-scrolly.test.ts` parses every
`<text>`/`<line>`/`<circle>` coordinate straight out of the RENDERED SVG STRING (not re-derived from
the component's own formula, so a typo'd literal is caught exactly as a wrong formula would be) and
asserts each falls inside the band, at seven `waterLevelT` values including two deliberately
out-of-range ones. `test/seed-tracks.test.ts` goes the other way and checks the FUNCTION against
real boxes: for six viewport sizes spanning the envelope, it recomputes COVER's visible slice
independently and asserts the band survives the crop and its bottom edge lands above the lane.

**And confirmed by driving, which is the check that matters.** Across 1600×900, 1280×800 and
375×812, sampling 25 scroll positions each, every annotated element of the active frame measured
fully inside the viewport AND non-overlapping with every visible prose panel: 0 collisions,
0 off-screen. The earlier round of this file reported the opposite honestly — that the travelling
panel "can transiently cover part of the flow arrow's own label at the widest aspect ratios" — and
recorded it as a different, already-proven-safe mechanism rather than a bug. It was a bug, and the
lane is what closed it.

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
format's own diagram is barred from) — and `test/render-scrolly.test.ts` locks the mechanism at 4, 6
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

## A step that does not redraw is not a step (the eleventh correction)

**Every assertion this format carried was about the VEHICLE, and a delivered page proved that a
vehicle in perfect health can carry nothing at all.** `splash-test-b-route-access`, a five-stop route
scrolly published on 2026-08-18, passed the lot: the active step handed over exactly once per
boundary, the frames arrived in order and settled, the card travelled centred and opaque over the
graphic, `data-progress` advanced 0 → 4 without ever going backwards. And the map never moved, the
route was never drawn, and the reader who scrolled through five stops met one identical picture five
times. Measured with the panels hidden, its steps repainted **0.3%, 0.0%, 0.0% and 0.0%** of the
frame. Assertion H asks whether the SIGNAL a consumer could scrub against evolves; nothing asked
whether anything CONSUMED it.

Two rules come out of it, and they fail differently.

### Every step changes the picture

`verify-scrolly.mjs` now reads the graphic at each step — waiting for that step's own frame to be
the only one painted — and fingerprints **what a reader can see**: every painted node's box,
opacity, fill, stroke, transform, path data and leaf text, as a multiset. It reports the share of
those marks that differ from the step before. This tree's seven scrollies redraw **6.5% to 96.8%**
of their marks per step, at every width; the delivered route page redraws **0.0%** on three of its
four transitions and 4.4% on the fourth, where one of five stops lights up and nothing else. The
floor is 1%.

**Pixels were the first instrument and they were wrong twice, in both directions.** A byte hash
called the frozen page "5 of 5 redrawn", because the prose card travels over the graphic and because
a crossfade leaves a residue differing on 98% of pixels by at most 7/255. Then, once that was
answered, `page.screenshot` itself lied: on `one-line-four-readings` at its last step the DOM read
position 3.000 with the x ticks at 2012–2022, opacity 1 — the axes had flown — while every capture
still showed the whole 1876–2023 record. Puppeteer reads the compositor surface and that surface was
stale; an ELEMENT screenshot came back carrying a prose card that is not inside that element, and
the same frame through CDP with `fromSurface: false` showed the truth. **Five of this tree's own
beats were briefly reported as shipping dead steps on that evidence, and not one of them does.**
Read the picture where it is decided, never where it is presented.

The DOM alone is not enough either, and the multiset is why: the delivered page carries five copies
of one frame and swaps which is painted, so a fingerprint keyed by position in the tree called its
identical pictures 97.7% redrawn. A reader sees the marks, not their addresses — and copies count,
because dropping one of fifteen identical labels is a redraw.

**What survived the correction:** one page fails this, the delivered one. Every beat in this tree is
alive at every step, down to `danube-scrolly`'s quietest transition at 6.5%. A beat with four
sentences and two states still does not have four steps — the prose is not the sequence, the picture
is — but nothing in this tree is that beat, and the guard now says so rather than the opposite.

### Two models, and the one that owes the reader a continuous line

**A beat is an ASSEMBLY or a SCRUB, and the choice decides what it owes.** The rebuilt route beat
passed every cargo guard — each step redrew, one plate, one projection, a dash in the path's own
units — and its owner read it in one scroll: *"le dessin de la ligne n'est pas progressif au scroll,
il est un peu abrupt au step là."* It had been given five finished SSR'd pictures, so the line jumped
at each boundary and never moved under his gesture. **Passing the cargo guards is not the same as
carrying the cargo.**

- An **ASSEMBLY** builds a picture into every step frame and swaps between them. That is the seed's
  own model — a photograph, a diagram, a baked map, a chart — and there is nothing to scrub between a
  photograph and a chart. `quakes-four-maps` (four encodings of one dataset) and
  `eu-carbon-four-charts` are assemblies too.
- A **SCRUB** builds ONE picture on step 1's frame, lifts it out of the stack on boot and drives it
  off `data-progress`. It is the only model that can draw a line, grow a band or fly an axis under
  the reader's own gesture, and it is what a beat whose steps are STATES OF ONE THING must use.

The vehicle has published a continuous `data-progress` since its eighth correction. Nothing required
a beat to CONSUME it until now: `verify-scrolly.mjs` reads which model a beat is built on straight
off the markup — an assembly fills every frame, a scrub fills one — and, for a scrub, refuses any
step whose picture never moves anywhere inside itself. Measured with the guard working: this tree's
scrub beats move 4.4% to 32% of their marks inside a step; the same beat with its driver disabled
moves 0.0%.

Two things that instrument had to learn before it told the truth, both worth keeping:

- **Sample the MIDDLE of a step, never its edges.** The vehicle's own 0.3s crossfade lives at the
  boundaries and registers as motion; a slideshow sampled there read as 91% moving.
- **Wait past that crossfade.** Every sample is a jump, and a jump starts a transition — measuring
  260ms later measures the fade the measurement caused. At 550ms the same slideshow reads 0.0%.

### One visual, instantiated once

The delivered page's own bug, and it is worth naming because the correct pattern already existed and
lived nowhere anyone could find it. The scaffold emits one `.step-frame` per step. A beat may
therefore work in either of two ways, and MUST NOT mix them:

- **N pictures.** Each step's frame carries its own SSR'd drawing, differing by camera, by state, by
  what is revealed. Nothing runs at read time.
- **ONE picture, detached.** The visual and its script ride step 1's frame — the one the scaffold
  marks `active` at build time, so a reader without JavaScript still meets the opening state — and
  the script lifts it OUT of the stack on boot, where the step swap can never fade it away. It then
  scrubs itself off `data-progress`. `proof/mapmore-scrolly-danube/render.mjs` and
  `proof/scrolly-one-chart-swiss-life-expectancy/render.mjs` both do this.

The delivered page did both. It put its visual in all five frames AND drove it with a script that
ran `document.querySelector('[data-visual="…"]')` — singular. The animated copy was frame 1,
invisible from step 2 onward; the four copies the reader actually saw were frozen at their
build-time state, route hidden, stops at 28% opacity. The same defect read off the file: the same
340 KiB basemap plate inlined **five times**, 1.33 MB of a 1.80 MB page that no reader benefits
from. `verify-scrolly.mjs` fails a page that carries any asset twice, which is the cheap fingerprint
of this mistake — and it caught 1.50 MB in `grinnell-glacier` and 371 KiB in `quakes-four-maps` on
the way past.

### One geography, one projection

Found at 375x812 on the same page, and the rule was already written here — see "Two kinds of frame,"
below — with nothing measuring it. Its plate was painted `object-fit: cover` (an `!important` the
beat wrote over its own `contain`) while the SVG carrying the stops kept
`preserveAspectRatio="xMidYMid meet"`. One crops, the other letterboxes: the marks were laid out
across a 375x188 band while the basemap showed the middle third of its width, so **Lisbon was drawn
over Switzerland**, at a scale that made every stop a 4px smear. A plate and the overlay drawn on it
pair `cover` with `slice`, `contain` with `meet`, `fill` with `none`. The alignment half of the
attribute stays the beat's own business.

### A reveal is measured in the path's own units, never in screen space

**The defect that took six hours and five wrong diagnoses, and the reason it survived them.** The
Danube beat drew its river with `stroke-dasharray` set to the route's own length and an offset that
shrank as the reader scrolled. The two paths also carried `vector-effect: non-scaling-stroke`, which
takes the stroke — and with it the dash pattern — out of the path's user units and into screen
space. A dash pattern repeats forever, so a pattern measured against a line of a different length
draws **a head, a hole and a tail**, all sliding together as the offset moves. That is exactly what
the owner photographed, three times, while every measurement taken here said the file was healthy.

It was two compensations for one scale, applied at once: `strokeWidthsFor` already divides the
intended screen width back out of the camera's CSS scale, and the vector-effect then asked the
browser not to scale the stroke at all. The comment beside it argued the effect was harmless because
"it neutralises the viewBox transform, which is the identity here" — true of the WIDTH, and beside
the point for the DASH.

The fix is both halves: `pathLength={1}` so the pattern is one whole path long whatever the scale,
and **no vector-effect on a measuring dash**. `verify-scrolly.mjs` refuses the pairing now — a dash
that measures (a declared `pathLength`, or an offset that is not zero) alongside
`non-scaling-stroke`. A DECORATIVE dash in screen space is right and is left alone: eight delivered
files in this tree carry a dashed gridline or leader, and none of them measure anything.

**What this cost, and the honest part of it.** Five explanations were proposed and each was killed by
measurement: a stale cache, a reprojection desync, the live tile canvas, the window size, reduced
motion, a progress cap, real wheel input. All were wrong. What finally isolated it was an
instrumented copy of the delivered page, handed to the person who could see the defect, with a
button that hid one layer at a time — his click proved the two pieces came from the SVG paths, which
no amount of driving here had established. **When a report and a measurement disagree, instrument
the reporter's screen; do not keep re-measuring your own.** And note what does NOT explain it: this
verifier drives the beat at camera scales of 1.78, 1.42 and 0.42, so "the guard only ever ran at
scale 1" is not why it missed this. The symptom needs the renderer as well as the scale, and it is
therefore not reproducible on demand here — which is precisely why the guard is written against the
PAIRING, something that can be read off any file, rather than against the picture it produces.

## What survives with JavaScript disabled

**Everything survives except which step's own frame is on screen.** The header title, bottom source,
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
`chart-web/references/web-discipline.md`'s "what hover reveals" rule (there, interaction adds
detail the static frame had no room for); here, the graphic never carries detail the prose does not
already carry, because the graphic is the one layer this format allows to go unheard by assistive
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

## The prose lane, and why five rounds of collision patching did not fix the collision (historical — the eighth correction replaced the pin)

**The lane described below no longer places anything.** Its diagnosis is intact and is why the eighth correction did not simply revert the pin: a travelling opaque panel in a SHARED box reaches every label eventually. What changed is the answer — the prose got its own cell instead of a reserved band, so it can travel without ever meeting a label. Read this section for the defect; read "The prose has its own space" for what ships. The frames still keep `PROSE_LANE` clear, and nothing occupies it: see that section's own residue paragraph.

**The panel used to TRAVEL. That is the whole defect, and no safe area could survive it.** Every
build up to the fifth centred each step's panel inside its own step box (`align-items: center`), so
across a step's scroll distance the panel crossed the screen from bottom to top — passing over every
part of the graphic at some offset. Whatever rectangle a frame kept its labels inside, the panel
reached it eventually. The owner's own measured symptom: the seed's "flood day" label reduced to
"flo…" at 1600×900, 55% of the way through a step, and two steps' panels on screen together during
every transition.

**The fix is a LANE, and it has two halves that must agree.**

1. **The panel is pinned.** `.step-panel` is `position: sticky` with a BOTTOM offset, so it parks at
   a fixed distance from the viewport's bottom edge for the whole of its step — 100vh of a 115vh
   step, measured. Its screen position no longer depends on where inside the step the reader is.
2. **The frames keep out of the lane.** `PROSE_LANE` (a fraction of the graphic's own height,
   currently 0.28) is reserved at the bottom, and every frame places everything it annotates above
   it — `safeBand()` for the COVER-cropped frames, `CONTENT_TOP` for the fitted ones.

`renderScrolly` writes that same fraction into `--prose-lane` and onto the root as
`data-prose-lane`, so the CSS, the frames and the interaction layer all read ONE number.
`test/render-scrolly.test.ts` asserts they agree; a lane the CSS reserves and the frames ignore (or
the reverse) is exactly the collision this constant exists to make impossible.

**The one thing about `position: sticky` that will cost you an hour.** A `bottom` offset only ever
shifts a box UP — it clamps a box that would otherwise sit BELOW the offset line, and it can never
push one down. A panel placed at the TOP of its step therefore has nowhere to be shifted to, and
travels with the scroll exactly as if `position: sticky` were not there. This was shipped and
measured before it was caught: the panel moved from y=768 to y=−32 across one step at 1600×900,
every annotation collision still present, and the CSS looked correct the whole time. The panel must
sit at the BOTTOM of its step box (`align-items: flex-end`) for the offset to do anything at all.

**And every step must be the SAME height, including the last.** A shorter final step ends the
document while its own panel has already un-pinned and started riding up the screen — which puts the
last step's prose back over the last step's graphic at the one scroll position every reader is
guaranteed to stop at. Measured with a 96vh last step: the final panel settled at y=35 of a 900px
viewport, over the chart.

**One panel is PAINTED at a time.** Pinning does not stop two panels being on screen together: the
outgoing one is still riding out of the lane while the incoming one has parked in it. That is
unavoidable in a flow layout, and it is not fixed by geometry — it is fixed by painting only the
step the reader is on. `assets/interaction.mjs` adds `.scrolly--live` to the root at init, and the
CSS fades every non-active panel to `opacity: 0` only under that class. Three properties of that
choice are load-bearing: the rule exists ONLY where a script runs, so with JavaScript off no word is
ever hidden; `opacity` rather than `display`/`visibility`, so a faded panel stays in the document
and in the accessibility tree and a screen reader still meets every step's words in order; and the
class is added by the script, never baked into the markup.

**The interaction layer observes the PANEL, not the section.** An earlier build watched the `.step`
sections through a thin band at the middle of the screen — which asks "whose 115vh-tall section
crosses the centre right now", a different question from "whose words are in the lane right now",
with a different answer for tens of vh either side of every boundary. Observing the pinned panel
through a band the size of the lane makes the active step and the visible prose the same fact by
construction, which is what makes fading the others safe.

## Two kinds of frame: scenery is cropped, evidence is fitted

**Not every medium wants the same treatment, and this is the rule that decides.** A basemap is
SCENERY: it reads best full-bleed, and cropping it costs nothing, because no part of the ground
under a map is a claim. A chart is EVIDENCE: cropping an axis label is not a cosmetic loss, it is a
chart that reads wrong.

**A PHOTOGRAPH MOVED FROM THE FIRST GROUP TO THE SECOND ON 2026-08-10, by the owner's ruling:**
*"Pour les scrolly images respecte le ratio mais remplis au max en largeur ou hauteur."* The
sentence this file used to make — that a photograph is scenery and "no part of the image is a
claim" — is exactly backwards for the thing the image track exists to carry. A journalist's
photograph IS the claim; it is a document, and a silent crop changes what it shows. Measured at
1600x900, `object-fit: cover` on a portrait frame shows the middle 27% of its height, so a
four-frame sequence is compared as four horizontal slices nobody chose. So a photograph now keeps
its own ratio and is scaled up until it meets the frame on whichever axis binds first, and the other
axis is letterboxed in the render's own `ground` — the value the whole page's furniture is derived
from, so the letterbox is a colour someone chose rather than a default.

- **Cropped (`preserveAspectRatio="xMidYMid slice"`)** — the drawn track and the map track. They
  fill the viewport edge to edge; anything they annotate goes inside `safeBand()`, which is the
  rectangle guaranteed to survive the crop across `ASPECT_ENVELOPE` AND to sit above the lane.
- **Contained (`object-fit: contain`)** — the image track. Whole, at its own ratio, as large as the
  binding axis allows.
- **Fitted (an HTML box in percentages, or `meet`)** — the chart track. A fitted frame needs no
  aspect envelope at all: fitted height is always at most the box height and the fitted box is
  centred, so content ending at `CONTENT_TOP` of the viewBox lands at `H/2 + f·(CONTENT_TOP − 0.5)`
  on screen, which is at most `H · CONTENT_TOP` — clear of the lane for EVERY aspect ratio, with
  nothing to compute per box.

**And a chart's type does not scale with its box.** The chart frame's SVG carries geometry only,
stretched with `preserveAspectRatio="none"`; every word is HTML at a fixed pixel size positioned in
percentages over the same box — the separation the two web formats in this project already ship
("geometry stretches; type does not"). A 15px tick label stays 15px at 375px and at 1600px.

**One number in that layout is a `max()`, not a percentage, and driving found out why.** The
y-axis gutter is `max(62px, 13%)`: a fixed-size label in a shrinking box eventually runs out of
room, and `80,000` at 15px needs about 50px against 13% of a 375px phone, which is 49px. A
percentage-only gutter clips the widest tick label at exactly the width where legibility matters
most.

## A map on a scrolly is LIVE, and it has NO CONTROLS — the ruling of 2026-08-10

**Read this before the section under it**, which describes the seed's own baked map track and is
kept because the plate is still what sits under the tiles.

The owner drove the three map scrollys on disk and reported the fact: *"j'ai l'impression que le
scrolly map n'utilise pas MapTiler correctement, je ne vois aucun canvas dans le DOM. Or il faut
tout le temps utiliser MapTiler."* He was right — `grep maplibregl` over every committed map-scrolly
page returned 0, and there was no `<canvas>` in any of them. He had already ruled the same way for
map × web (R1). **A map uses MapTiler, in every format, including this one.**

**The argument the plate was kept for was real, and it is answered rather than dismissed.** A free-pan
map's set of camera positions is infinite, which is why R1 is unarguable there; a scrolly's cameras
are AUTHORED — a handful of known positions on one continuous path — so a plate CAN hold them, and a
reader mid-scrub can outrun a tile server, arriving at a reading as grey squares at the moment its
own sentence names what to look at. Because the cameras are known at build time, they are **warmed**:
every authored camera and the positions between them are walked through MapLibre's own tile cache
before the live layer is revealed, and the baked plate stays UNDERNEATH the tiles as the fallback
layer rather than instead of them. Measured on `mapscrolly-one-map-europe-carbon`, keyed copy, one
localhost hop: the warm costs 10 cameras in 367–567 ms; at reading speed 13 of 126 animation frames
still have a tile outstanding against **34 of 126 unwarmed**, and at a trackpad flick 0 of 10 against
1 of 10. Settle is 1–4 ms either way. Those numbers are a fast network — a newsroom on a slow one
gets the plate showing through until the tiles land, which is what the fallback layer is for.

**NO CONTROLS, and no reader-driven camera at all**, which is a deliberate DIFFERENCE from map × web
rather than an omission. The owner, same day: *"Pas de controls sur le scrolly, le scroll pilote et
la map doit prendre toute la largeur."* R1 requires `NavigationControl` on a map × web page, because
there the reader IS the camera. On a scrolly the scroll already drives the camera, so a reader who
panned or zoomed would have their view taken back by the next step — worse than not offering the
gesture. The map is constructed `interactive: false`: no drag, no wheel, no double-click zoom, no
keyboard pan, no touch, no control widget. **Do not "fix" this by adding controls.**

**And `interactive: false` is load-bearing beyond the ruling, which is the thing to check if anyone
ever reaches for `true`.** A live map fills the frame, so the reader's pointer naturally RESTS on
it — and an interactive MapLibre canvas swallows the wheel. The piece would then refuse to scroll
at exactly the position a reader is most likely to be pointing at. Verified rather than reasoned:
a real `Input.dispatchMouseEvent` wheel (not `scrollTop =`, which bypasses hit testing) dispatched
25 times with the pointer at (300, 600), in the middle of the map, moved the scrollport **0 → 3000
px** and `data-progress` **0.0000 → 2.4688** on both live map scrollys tested, with the map's own
zoom moving only because the scroll took it there.

**The map takes the whole frame.** Live tiles fill the container edge to edge, which is what makes
the full-width instruction free: what the beat DRAWS stays at the plate's own fitted scale, so
nothing it counts is cropped, while the ground under it reaches every edge. One consequence to check
when copying this: a veil or scrim that used to be a rectangle the size of the PLATE now draws its
own edges, because the plate no longer covers everything the reader sees. Put it on the frame.

## A map track without a live map (the seed's baked track, and the fallback layer under the tiles)

The map track carries a plate BAKED once (`scripts/bake-plate.mjs`) and embedded as a data URI. Since
the ruling above that plate is the FALLBACK layer rather than the whole map — what a reader gets with
no script, no network, a rotated key or a blocked `api.maptiler.com` — and the committed artifact
carries the `__MAPTILER_KEY__` placeholder, never a key (R1b); `deliver` substitutes at
delivery. Two decisions are worth copying:

- **The camera is a centre and a zoom, not a bounds box**, so the marked point lands on the plate's
  own centre by construction. That is what makes "the marker is inside the safe band" a fact rather
  than a coincidence to re-check every time the camera moves. The frame still clamps a point that
  falls outside the band rather than drawing it off screen.
- **The basemap's own place labels stay.** `geo-discipline.md` rule 9 ("quiet the plate") exists
  because a layer doing none of the beat's jobs is noise — but a locator's whole job is "where is
  this", and the toponyms are what answer it. Boundary lines are still hidden; water is still tinted
  blue rather than left as `dataviz-light`'s near-grey, which on a river beat would read as no-data
  exactly where the subject is.
- **The plate is a JPEG.** It is embedded in a self-contained file, and a 2000×1280 PNG of a basemap
  costs several megabytes where a quality-88 JPEG of the same capture costs a few hundred kilobytes.
  Continuous-tone imagery is the one medium JPEG is built for; the drawn and chart frames stay
  vector, where the same trade would be a real loss.

## What this format does not attempt

**A moving camera.** The map track shows one baked plate. A scroll-driven `flyTo` between waypoints
would mean either a live map in the delivered file (no longer self-contained, and shipping a key) or
one baked plate per waypoint. Reusing one plate and changing only what is drawn ON it is the shape
`proof/mapmore-scrolly-danube` already ships as a consumer of this scaffold.

**Roving-tabindex / single-stop keyboard navigation of the reveal itself.** There is no keyboard
shortcut that advances the active step directly (no `ArrowDown` handler, unlike
`chart-web/assets/interaction.mjs`'s `ArrowRight`/`ArrowLeft`) — the reveal is scroll-only for a
sighted or motor-abled reader who has JavaScript on; the CONTENT is keyboard/screen-reader reachable
regardless (see above), but the animated GRAPHIC advancing on command is not. This is a known, stated
gap, the same register `web-discipline.md`'s own "Known cost, not hidden" section keeps for its
75-Tab-stops limitation.

**Stepping a single chart through several reveal states.** This format's own `SKILL.md`, "When to
use," states this as the primary reason to reach for a DIFFERENT tool: a scrolly earns its existence
by assembling media a single beat cannot assemble on its own; a chart stepped through several states
belongs to `chart-web`, which animates on its own. This skill's own `test/canon.test.ts` locks
the seed itself to at least three visibly different `frameKind`s — and specifically to carrying a
`map` and a `chart` — so this format's own worked example never regresses into the shape it exists to
redirect a reader away from. Two kinds was the earlier floor, and it was too weak: a picture and a
diagram are media no other skill here produces, so a seed carrying only those demonstrated the
mechanism without ever demonstrating the point. A map and a chart are media other skills DO produce
on their own, which is exactly why assembling BOTH behind one narrative is the thing that earns this
vehicle its keep.

**A per-beat-tinted prose panel.** `renderScrolly`'s `ground` argument derives furniture for the
whole render once; a beat wanting its prose panel tinted differently from the page's own ground
would need to pass that panel colour through `deriveFurniture` separately and thread the result in —
a real, not-yet-built extension (see "Measuring prose over the graphic," above), not a silent gap in
this seed.

## Verification

**A SAMPLED PROBE IS NOT A WEAKER VERSION OF DRIVING; IT IS BLIND BY CONSTRUCTION, AND IT PASSED A
VEHICLE THAT WAS BROKEN ON EVERY BEAT.** Every claim below the horizontal rule in this section was
measured by jumping to N scroll offsets and reading the state after the page had settled. Every one
of those numbers was true. The pages they were taken on never painted their last step for a reader
who scrolled. The standing rule this bought:

- **Install the recorder before you touch the scroll position, and read back every frame the
  browser drew.** `scripts/verify-scrolly.mjs` runs a `requestAnimationFrame` recorder through a
  continuous pass at one step per ~60 frames — derived from each beat's own step height, so a phone
  and a desktop get the same dwell rather than the same pixel rate — and asserts, over every scrolly
  on disk at 1600×900, 1280×800 and 375×812: the document has no scroll of its own; the graphic's
  box and the header's box are identical at every recorded frame; every step's frame reaches
  opacity 1, in the order the steps are declared; each step is handed `active` exactly once per
  pass; the graphic settles to a clean 1/0 when the scroll stops; never two panels painted at once;
  and no panel is painted while its top sits above the lane. `test/scroll-integrity.test.ts` walks
  it, and names the three mutations that redden it.
- **Ask what the instrument cannot see, and write the answer down.** That test's own header does.

Measured this way, with the model and decision rule this file now describes, on the seed and all
six scrollies on disk at three widths — **0 failures**. The same instrument on the same beats before
the seventh correction: 14 runs of 15 with a step's frame never painted, and oscillation on every
boundary.

- **Ask what the instrument does not ASSERT, not only what it cannot see.** That is the eighth
  correction's own lesson and it cost a whole round: the recorder was right, the six assertions were
  right, and the page had stopped moving. Every one of them was about WHICH step was painted. Run
  over the shipped artifacts with assertion G added — travel per panel, and the share of
  scroll-advancing animation frames at which a panel's own top did not move — the same instrument
  produced 36 failures across two beats at three widths, on code that had been green all week. When
  a human reports something the guard says is fine, the first question is not "is the measurement
  wrong" but "what did nobody ask it".

Measured after the eighth correction, on the seed and all six beats at three widths: 0 failures, and
the travel each panel makes is REPORTED at every width — 528-992px per panel at 1600×900, 200-475px
at 375×812, against 162-187px for the last panel and 42-80% held offsets before it.

---

Older claims, kept for the history above and superseded wherever the two disagree. Applied by
driving a real browser, not by reading the markup or trusting a screenshot taken before scrolling. `doctrine` states this as a universal rule, and this format is the reason it exists
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
