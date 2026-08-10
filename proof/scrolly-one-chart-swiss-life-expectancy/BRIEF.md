# One line, four readings — life expectancy in Switzerland, 1876–2023

**Type:** line (single series, one picture read four ways). **Medium/genre:** chart / **scrolly**.
**Channel:** article web, one self-contained page — no export frame, because the scroll IS the
artifact.

A scroll-driven interactive. **One chart. The steps do not swap pictures — they interrogate the same
picture**, and the scroll drives it: a run of the line lifted into the accent, a band called out
behind it, and finally both axes flying in on the last twelve years.

Sibling beat, deliberately the OTHER form: `scrolly-chart-eu-carbon` shows one subject through FOUR
encodings, and the comparison between them is its argument. This one is the classic form the vehicle
was named for.

## The four readings, and why one frame cannot hold them

| # | What the reader is asked to see | What changes |
| --- | --- | --- |
| 1 | the shape of 148 years — 40.2 to 84.0, a gain of 43.8 | nothing lifted; the accent is absent on purpose |
| 2 | ONE year inside it: 1918, 55.8 → 46.3 | the accent DRAWS ITSELF back along the 1917–1918 segment from a run of zero length, and a dot and its label arrive with it |
| 3 | how long that year took to undo | the SAME accent run grows forward to 1921; a band grows under it |
| 4 | the same line, axes narrowed to 2012–2023 | both domains travel; the 1918 mark leaves with the frame, 2020's arrives |

**The argument, with a number rather than an opinion.** On reading 1's axis — 36.5 to 87.5 years —
2020's fall of 0.72 years is **1.4% of the plot's own height**. Drawn at that scale it is a
thickness, not an event. Drawn at reading 4's scale it is the steepest single-year fall since
**1944**. Those are the same nine data points; **no single axis shows both**, and a frame that tried
would be a chart with two y axes, which is the cluttered picture this beat exists to avoid.

Reading 3 is the second half of the argument. The band from 1918 to 1921 is only legible on the
whole-record axis; on reading 4's axis it is off the left edge entirely. And the recovery is a thing
the reader has to sit with and count — a video would take that pace away from them.

The one form this beat does NOT use is "one series lifted while the rest recede", because there is
one series. What the scroll lifts here is **a run of the line** — which is what the owner's
"highlight and focus on parts of the chart" asks for when the chart has one line in it.

## Every number, computed

Nothing in the title, the credit or any step's prose is typed. `life-data.ts` derives it; `render.mjs`
interpolates it; `claims-grounded-in-data.test.ts` enforces it.

| Figure | Where it comes from |
| --- | --- |
| 1876–2023, 148 readings, 40.2 → 84.0, +43.8 | first/last row of `swiss-life-expectancy.csv` |
| 1918, 55.8 → 46.3, −9.5 | the steepest year-on-year fall in the file, sorted |
| ×5.5 the next-steepest | that fall over the second-steepest (1900, −1.7) |
| 1921, 4 years | the first year after 1918 at or above the 1917 level |
| 2020, −0.72 | the steepest fall of the last 25 years, by position in the record, not by year |
| since 1944 | the most recent EARLIER fall at least as steep |
| 1.4% of the plot's height | 0.72 over reading 1's own y-domain — a figure about the PICTURE, computed from the picture, so narrowing that axis would change the sentence |

Two assertions in `render.mjs` stop the run if a re-export moves either claim: the steepest fall must
be the one reading 2 is built on, and the recent fall must be smaller than the record fall.

`parseReadings` additionally refuses a file with more than one entity (the Our World in Data grapher
endpoint returns the whole world unless the fetch says otherwise) and refuses a gap in the years,
because every claim assumes one row per year.

## How the scroll drives it

`chart-drive.mjs` is **one implementation used twice**: `ChartFrame.tsx` imports it in node to SSR
the first state; `render.mjs` inlines the same file into the page to drive every state after it. A
browser-only copy of the layout maths is how the pre-script picture and the driven picture drift
apart, so there is not one.

- **Progress is READ, never re-derived.** `scrolly` publishes `data-progress` on its own root on
  every scroll — the fractional index of the panel on the lane's centre line, interpolated between
  the two card centres that bracket it — and this driver reads it. It used to derive its own from
  panel overlaps against a band at the bottom `data-prose-lane`% of the scrollport, which was right
  while a panel PARKED in that band and became meaningless the moment the vehicle's eighth
  correction moved the prose into its own travelling column. **Measured on the delivered file at
  1600×900 before the repair: the scaffold's `data-progress` ran a clean 0 → 0.2527 → 0.5707 →
  0.8886 → … → 3.0000 while this beat's `data-position` read 0.000 at seven probes of eleven and a
  whole integer at the other four.** A slideshow with a fade. The repair is not better arithmetic —
  it is having one opinion instead of two. `data-prose-lane` is deliberately no longer read: bending
  that number to make a consumer's sums work would be corrupting a value to fit its reader.
- **The picture is therefore always mid-change.** With a continuous 0 → 3, `stateAt` interpolates
  every field of every state on every animation frame: the two domains travel, the accent run grows,
  the band widens, the marks fade. Driven at three widths in both directions, **every single frame
  on which the signal moved and the step did not changed the chart's GEOMETRY** — not just an
  opacity. 92/92, 81/81 and 28/28.
- **Nothing depends on the document scrolling**, or on the layout at all. The one number this beat
  needs is on an ancestor element; the vehicle can rearrange its own boxes without this driver
  noticing, which is exactly what it failed to survive last time.
- **The visual re-parents itself out of the per-step frame stack** on load, so the scaffold's own
  one-frame-at-a-time swap can never un-paint it. See "What the vehicle is missing", below.

## Reduced motion

`prefers-reduced-motion: reduce` makes `stateAt` **snap to the nearer step** — one of the four
authored states exactly, never a blend. Every reading still arrives; there is no flight between two
of them. Measured over 99 continuous scroll positions at 1600×900: **4 distinct states, no fifth**.

## What was driven, and what it found

`drive.mjs` scrolls the real file in real Chrome at 1600×900, 1280×800 and 375×812, **down and back
up**, in 30px increments with **no settle wait** — a probe that jumps and waits measures the
destination, and a reader only ever sees the transition. At every increment it records the
scaffold's published progress, this beat's own echo of it, the driven state read off the element,
which step is painted, **a fingerprint of everything the driver wrote into the DOM**, and the
bounding box of everything the frame annotates against the visible part of every prose panel.

**The fingerprint is the assertion whose absence let a slideshow ship.** Every guard here used to be
about ARRIVAL — the right frame, the right panel, no collision — and a visual that jumps between
four stills satisfies all of them, because they only look at a settled state. `scroll-report.mjs`'s
`fluidity` asks the other question: on the frames where the ACTIVE STEP does not change and the
signal does, does the picture? Two fingerprints are taken, one over everything positional and one
over that plus every opacity, so a step that merely cross-fades shows up as a gap between them
rather than passing as motion. Frames where the signal itself is CLAMPED — the head and tail of the
piece, where there is nowhere further to go — are counted and exempted, and a held signal anywhere
else is its own problem.

Final run, on the delivered file at three widths in both directions, **0 problems**:

| | 1600×900 | 1280×800 | 375×812 |
| --- | --- | --- | --- |
| samples per sweep | 99 | 87 | 32 |
| progress span | 0 → 3 / 3 → 0 | 0 → 3 / 3 → 0 | 0 → 3 / 3 → 0 |
| intra-step frames where the GEOMETRY moved | 92 / 92 | 81 / 81 | 28 / 28 |
| frames where only an opacity moved | 0 | 0 | 0 |
| clamped frames, exempted | 3 | 2 | 0 |
| beat's position vs scaffold's progress, worst | 0.0005 | 0.0005 | 0.0005 |
| painted step vs progress, worst | 0.51 | 0.52 | 0.54 |
| tallest panel, as a fraction of the scrollport | 0.161 | 0.219 | 0.607 |

The 0.0005 is the 4 decimals the scaffold writes with against this driver's 3-decimal echo. The 0.51
is the max-overlap crossover itself, which is where the two rules are supposed to meet.

**The same defect put back, live** — a full copy of the tree pinned to the committed vehicle, the
beat's `readProgress` call replaced by a literal `0`, re-rendered and re-driven: `paintChanged` 92 →
**0**, `fractionMoving` 1.000 → **0.000**, position-vs-progress 0.0005 → **3**, problems 0 → **93**,
and the run exits non-zero. Control and mutant differ in one line.

Seven defects the driving found that no test and no screenshot would have:

1. **The driver never ran.** Its `<script>` sits inside the graphic, which the scaffold emits before
   the prose column, so at parse time no panel existed and the driver exited on its own guard —
   silently. The page looked exactly like a page whose script had never been inlined.
2. **The fourth reading was unreachable.** The first anchor model called a step "arrived" when its
   panel reached its parked position; a bottom-sticky panel parks long before its step is the one
   being read, and the last panel — with no scroll distance behind it — never reached the line at
   all. Measured span stopped at **2.77 of 3**, at every width. Replaced by the lane-occupancy rule
   above, which also cut the disagreement with the painted panel from 27 samples of 99 to the
   boundary frame alone.
3. **The 1918 mark was an ellipse.** A `<circle r=5>` inside a `preserveAspectRatio="none"` plot drew
   as a 14 × 2px dash at 1600×900 — the exact trap this project's own scrolly notes warn about. The
   dots are HTML now, like every other non-geometry mark on the frame.
4. **An annotation left the viewport at 27 consecutive positions** while reading 4's axes flew in:
   1918 leaves the frame long before its opacity finishes fading. Marks now fade over the last 70
   viewBox units at either end, so a label leaves with the plot rather than after it.
5. **The prose lane was too small for the prose.** At 375×812 the panel is 0.275 of the scrollport
   and parks 0.057 above its floor: it needs 0.332, and the vehicle reserves 0.28. The lane is
   **0.36** here and the prose was cut to at most two sentences a step. `drive.mjs` reports the
   tallest measured panel as a fraction of the scrollport at every width, so the budget stays a
   measurement.

6. **The frame froze, and every guard stayed green.** The vehicle's eighth correction moved the
   prose out of the graphic's box; this beat kept measuring panel overlaps against a band inside it,
   found nothing there for most of every step, and published position 0. Measured above. Closed by
   reading `data-progress` instead of deriving anything, and by an assertion that the beat's own
   published position and the scaffold's differ by no more than rounding.
7. **A mark stayed on screen after leaving the plot** — and this one was found by OPENING the
   mid-flight screenshot, not by any assertion. The last reading narrows BOTH domains, and the y
   domain closes onto 82.4–84.2 several tenths of a step before x0 passes 1918, so the 1918 dot and
   its label sank out of the bottom of the plot, onto the x-tick strip and level with the credit,
   while still at **opacity 0.537, 69 viewBox units below a 500-unit plot** (position 2.40). The
   fade was written against the X domain alone. Both axes fade now — X outside its own edge, because
   the x domain ends exactly on a data year and a mark on the last reading has to be full strength
   there; Y inside it, because every y domain here is padded away from its own extremes and below
   that floor there is furniture. **Worst excursion at any position, at any opacity above 0.02: 0.**

Screenshots in `drive/`: four settled steps at each width, plus a **mid-flight** frame at position
2.5 — the moment a sampled probe never looks at, and the one that shows the axes actually travelling
(the domain reads 55–85 by 1930–2027 while the band shrinks and both annotations cross).

## Which vehicle these artifacts were built against — read this before re-rendering

`render/one-line-four-readings.html` and every number above were produced against the **committed** `scrolly`,
the eighth correction, where the prose travels in its own cell of the track's grid beside the graphic.
While this round was being written a **ninth** correction was uncommitted in the working tree, putting
the prose card back OVER the graphic as a full-frame layer that crosses everything and rests nowhere.
The other four scrollies on disk were re-rendered against it; these two were not, so that this beat's
delivered file and its measurements are reproducible from a state that exists in git.

**The signal survives the change** — the ninth still writes `data-progress` on the same root at the
same four decimals — and so does everything this round is about: driven against the ninth's render,
the fluidity was 113/113, 99/99 and 84/84 intra-step frames moving the geometry and 7-9 clamped frames exempted, the position-vs-progress disagreement 0.0005, the span a full
0 → 3, all unchanged. What does NOT survive is `scroll-report.mjs`'s **collision** assertion: the
eighth guaranteed a card could never reach a label, and the ninth deliberately trades that guarantee
away, so the check fires on every frame of a ninth-correction render. Whoever re-renders these beats
against the landed ninth has to replace that assertion with whatever the ninth guarantees instead —
not delete it, and not widen it until it passes.

## JavaScript disabled

The visual is SSR'd inside the frame the scaffold marks active by default, so with no script a
reader gets the **whole of reading 1** — all 148 points, both axes, the credit — plus every step's
prose in ordinary document flow. Measured: visual present, 148 points, 4 paragraphs, credit present,
wrapper opacity 1.

## Colours

`PALETTE.md` beside this beat, read through `readPalette`. No hex is written in `render.mjs` or in
`ChartFrame.tsx`. The accent is spent on one thing across all four readings — **the years the line
goes down** — which is why it is a warm dark red (5.51:1 on this ground) rather than the house teal.
The reasoning, and the refusal, are recorded in that file.

## Credits

At the **bottom of the visual** — the frame's own floor, 8px up, anchored from the bottom so a second
line grows away from whatever is below (a `top` percentage did not work: the fixed header's own wrap
changes the frame's height, and the credit moved twice, in opposite directions, while the header was
being shortened). Full provenance is in the header, which under the fixed-page model never scrolls
away.

It used to be anchored above the prose lane rather than at the floor, which was right while a panel
parked there. **Measured on the delivered file after the eighth correction: at 375×812 the graphic is
361px tall, the lane takes 130 of them, and the two-line credit pushed up out of the lane ran
straight through the x-axis tick strip — 245 label-under-credit collisions per sweep.** At the floor
it clears everything at every width, and `scroll-report.mjs` now asserts on every frame that nothing
the frame annotates sits under the credit.

## The dead lane — measured, and deliberately NOT reclaimed here

Every frame this beat draws still keeps `PROSE_LANE` — 36% of its own height — clear at the bottom
for a prose panel that, since the vehicle's eighth correction, does not go there. **At 1600×900 that
is 295px of an 820px graphic below the credit, empty.** At 375×812 it is 130px of 361, and it is not
merely ugly: it is the room the map sibling's third label needs, and the reason this beat's own
credit had to move.

It is not reclaimed here, for two reasons that both point the same way. **It is a constant every
beat carries its own copy of** — six of them — and the twin's rule is that a change true for many
beats is made identically in each with a walking parity test, never in two of six. And the vehicle's
`proseLane` parameter, validated `0 < x < 0.6` and emitted as `--prose-lane`, **cannot express
"none"** without editing the scaffold. As this was written a NINTH correction was in flight doing
exactly that reclamation vehicle-wide — its own `renderScrolly` already accepts `proseLane: 0` and
its comment reads "the seed passes 0 and its own frames use their full height again". Doing it here,
in two beats, against a validator that rejects 0, would collide with that head-on.

## What the vehicle is missing — reported, not patched around

`scrolly`'s contract is **N pictures, exactly one painted**. A beat whose visual is ONE
persistent element driven by the scroll has no way to say so, so this beat's driver moves its own
node out of the per-step stack on load and hands the scaffold empty wrappers for steps 2–4. It works,
it degrades correctly with no JavaScript, and it is a workaround for a missing declaration. The
vehicle should offer a persistent-visual mode: one `frame`, N states, the swap disabled.

## Files

- `swiss-life-expectancy.csv` — the frozen Our World in Data fetch, 148 annual readings.
- `life-data.ts` — the reading layer. Every figure the beat says out loud comes from here.
- `chart-drive.mjs` — the geometry and the scroll driver, one implementation, used at SSR and inlined.
- `ChartFrame.tsx` — the one chart, SSR'd in its first state.
- `render.mjs` — the runner: the four states, the four steps, the inlined driver.
- `PALETTE.md` — the recorded colour answer and the reasoning behind it.
- `render/one-line-four-readings.html` — the delivered file, self-contained.
- `drive.mjs`, `drive/` — the browser run and what it saw, including `drive-report.json`.
- `scroll-report.mjs` — the pure half of the driving: what a swept sample sequence MEANS.
- `scroll.test.ts` — the guards on that, and on `readProgress`, each with the mutation that reddens
  it pasted into the file's own header.
