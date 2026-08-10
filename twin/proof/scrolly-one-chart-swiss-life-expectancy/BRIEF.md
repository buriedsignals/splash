# One line, four readings — life expectancy in Switzerland, 1876–2023

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
| 2 | ONE year inside it: 1918, 55.8 → 46.3 | the 1917–1918 segment goes to the accent, a dot and its label arrive |
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

- **Progress is the SAME fact the scaffold uses.** `twin-scrolly`'s own `interaction.mjs` gives the
  step to whichever panel occupies the most of the prose lane. This driver takes the identical
  measurement and adds the continuous part: `t = 2·next / (active + next)`, which reaches exactly 1
  at the moment the two overlaps are equal — the moment the argmax flips and the words change. The
  picture therefore finishes arriving on the same frame the sentence changes, **by construction**.
- **Nothing depends on the document scrolling.** The lane and the panels are measured inside
  whatever element actually has scroll distance, found by measurement. The scaffold moved to the
  fixed-page model while this beat was being built and the driver needed no change.
- **The visual re-parents itself out of the per-step frame stack** on load, so the scaffold's own
  one-frame-at-a-time swap can never un-paint it. See "What the vehicle is missing", below.

## Reduced motion

`prefers-reduced-motion: reduce` makes `stateAt` **snap to the nearer step** — one of the four
authored states exactly, never a blend. Every reading still arrives; there is no flight between two
of them. Measured over 99 continuous scroll positions at 1600×900: **4 distinct states, no fifth**.

## What was driven, and what it found

`drive.mjs` scrolls the real file in real Chrome at 1600×900, 1280×800 and 375×812, **down and back
up**, in 30px increments with **no settle wait** — a probe that jumps and waits measures the
destination, and a reader only ever sees the transition. At every increment it records the driven
position, the driven state read off the element, which panel is actually painted, and the bounding
box of everything the frame annotates.

Final run: **99 / 99, 85 / 85 and 69 / 69 samples clean in both directions**, position spanning the
full 0 → 3 and 3 → 0, no monotonicity break, one panel painted at a time, nothing annotated under a
panel or outside the viewport, the graphic full-bleed, the document itself never scrolling.

Five defects it found that no test and no screenshot would have:

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

Screenshots in `drive/`: four settled steps at each width, plus a **mid-flight** frame at position
2.5 — the moment a sampled probe never looks at, and the one that shows the axes actually travelling
(the domain reads 1928–2027 while the band shrinks and both annotations cross).

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

At the **bottom of the visual**, immediately above the prose lane, anchored from the bottom so it
clears the lane at every width (a `top` percentage did not — the fixed header's own wrap changes the
frame's height, and the credit moved into the lane twice, in opposite directions, while the header
was being shortened). Full provenance is in the header, which under the fixed-page model never
scrolls away.

## What the vehicle is missing — reported, not patched around

`twin-scrolly`'s contract is **N pictures, exactly one painted**. A beat whose visual is ONE
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
