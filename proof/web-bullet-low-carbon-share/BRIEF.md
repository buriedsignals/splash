---
format: web
type: bullet
medium: chart
grounding: supported
---

# Beat — Six pays, six barres, et le verdict change avec la cible (web)

**Type:** bullet (measure, comparative state, neutral track). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Low-carbon electricity — nuclear plus every renewable — as a share of each country's own
generation: Pologne 13,8 → **31,1 %** (+17,3 pts), Allemagne 43,8 → 58,6, France 92,2 → 94,9,
Suisse 97,2 → 98,1, Suède 98,1 → 98,8, Norvège 98,0 → 98,6. **Poland moved furthest and is the only
one of the six still under 50 %** — both halves asserted before the render.

The share is **computed from the nine source columns**, never read off a "low-carbon" column that
does not exist in the file.

The page ships that claim in fewer words than the still does — *« Seule des six sous la moitié, la
Pologne est celle qui a le plus gagné depuis 2015 »* — and the shortening is a measurement, not a
preference: `nocturne` sets the display register at 32 px, uppercase, tracked 3,4, so the longer form
ran to twelve lines at 375 px, 408 px of an 812 px window before the control, its reserved sentence
and the plot had had any. Both halves survive; the number the old headline carried is printed on the
row it belongs to. **`la moitié` has to stay in those words** — it is what the vocabulary checks the
`stated-in-the-claim` target against.

## The reader's question, and the gesture

**« Par rapport à quoi ? »**

A bullet is the accountability chart. It is the one type in the catalogue whose reading is not a
quantity but a **VERDICT** — *did this hit the mark* — and a verdict is a function of two things,
only one of which is in the data. The value is measured. The target is **chosen by whoever drew the
plate**, and the catalogue's own warning is about exactly that choice: *"don't invent a target just
to unlock the bullet's shape."*

A still has to pick one target, print it, and ask to be trusted. So does a video, and so does a
scrolly — they can step through targets, but on the author's clock, in the author's order, and the
reader never gets to ask the one question the form provokes. **This page hands the target over.**

Four benchmarks, and not one of them is invented — each declares where it comes from, and the
vocabulary refuses a provenance it cannot verify:

| option | benchmark | provenance | clear it |
| --- | --- | --- | --- |
| **son propre 2015** (the plate's own state) | each row's own earlier value | `own-earlier-value` | 6 / 6 |
| **la moitié** | 50 % | `stated-in-the-claim` — the words are in the title | 5 / 6 |
| **la médiane des six** | 96,5 % | `a-statistic-of-the-drawn-set` | 3 / 6 |
| **la Suède** | 98,8 % | `a-statistic-of-the-drawn-set` | 1 / 6 |

## What changes in the image

The six bars **never move**. That is the whole point: the measurement is not in dispute, the
yardstick is. What moves is the apparatus of judgement, and every bit of it is interpolated rather
than cut, because all of it is drawn at all times and only transformed:

- **the target tick slides** across every row at once to the new benchmark, carrying its own
  ground-coloured halo;
- **the gap redraws** — one rect per row, from the bar's end to the tick. Beyond the tick it is the
  bar's own hue at a second chroma (*the surplus*); short of the tick it is a **void**: the ground,
  outlined in the row's own hue, at the bar's own height. The reader sees the missing piece of bar;
- **the pass band** behind the bar — the stretch of track that clears the benchmark — slides with
  the tick. That is the bullet's third element, the qualitative zone, and here it is *earned*: the
  benchmark itself partitions the track, so nothing is manufactured;
- **the verdict on each row** cross-fades from `+17,3 pts` to `−18,9 pts` and back. The number
  changes; **the label does not move**, because it is anchored to the bar's end and the bar's end is
  the one thing no option touches.

## What the picture then shows that no still can

**The podium turns over.** Ranked by the plate's own benchmark — progress since 2015 — the order is
Pologne, Allemagne, France, Suisse, Suède, Norvège. Ranked by distance to the Suède, it is exactly
that list read backwards. Same six bars, same six numbers, nothing moved, and the best performer
became the worst. A still can assert that in a caption; only a control can let the reader *watch the
shortfalls invert into a ladder* and stop trusting any single target again. The runner asserts the
inversion before the render, so the sentence cannot outlive the data.

## Treatments spent, and the one refused

- `the-track-runs-the-full-scale-so-the-remainder-is-legible` — every track runs 0–100 %, because
  the remainder is the reading a bare bar cannot give.
- `two-states-of-one-measure-are-one-hue-at-two-chromas` — the surplus segment is the bar's own hue
  at a second chroma, hunted until it clears a measured floor **against the bar it sits on**, and
  placed on one side of the fill for the whole direction rather than per row.
- `the-verdict-is-written-as-a-derived-number` — the gap in points is printed on the row, and it is
  re-derived per benchmark rather than left as a subtraction between a bar and a tick.
- `accent-marks-the-thread` — the subject alone carries the full accent.

**REFUSED: the catalogue's "exactly two accent hues — one for hit, one for miss."** It would have
been the obvious way to draw a verdict, and this page draws the verdict in SHAPE instead — filled
beyond the tick, hollow short of it. Two reasons, both paid for on this branch. A second hue would
collide with `accent-marks-the-thread`, which already spends hue on *which row the story is about*;
and a verdict carried by hue alone is a verdict a colour-blind reader does not get, while a hollow
bar with an outline is legible in a photocopy. The hollow/filled pair also survives `nocturne`,
where a second hue calibrated against the same ground as the first comes out indistinguishable from
it by construction — measured twice already on this branch.

## Vocabulary

A new sibling in `skills/chart-web/assets/`: **`benchmark.ts`** — *what each row is JUDGED
AGAINST*. Native radios plus build-time `:checked`/`:has()` CSS, zero JavaScript, complete plate
without script, like its eight siblings.

It is a ninth file rather than an option in `level.ts`, which is the near miss. A yardstick lays ONE
reference **across the whole plot** at one datum's own value, and nothing is re-derived: every mark
keeps exactly the meaning it had. A benchmark is **per row**, confined to that row's own track, and
it re-derives a *verdict* for every row — the sign of the gap, its length, the fill it takes, and
the count of rows that clear it. `LevelMark` carries one coordinate and one reach; it has nowhere to
put an arithmetic whose SIGN flips per row. And the default option here is *each row's own earlier
value* — six different references, one per row: drawn as levels that would be six full-width rules
across the plot, which is a picture of nothing.

`cutoff.ts` moves one line and outlines a REGION of the plate; six per-row gaps whose sign flips are
not a region. `filter.ts` removes, and nothing may leave here. `stack.ts` / `hold.ts` arrange, and
nothing is arranged. `withdraw.ts` subtracts a term from a sum, and no sum is touched.

## The two channels

1. **Ask a row** — hover, tap or Tab: the nine source columns the share was computed FROM, in order,
   with their own percentages. Poland's 31,1 % is almost all wind and biomass; Sweden's 98,8 % is
   hydro plus nuclear. The bar itself darkens, off its own fill, by a hunted dose — never a dot.
2. **Choose the benchmark** — the gesture above.

## What the three renders show, looked at rather than reasoned about

Captured at 1280 x 800 with the control operated, one per direction, plus one hover through
`Page.captureScreenshot` (`page.screenshot()` fires a `pointerleave` and lies about the hover state).

- **The default state IS the plate**, plus one thing the plate could not draw: every row's gain since
  2015 is now a segment rather than the distance between a bar and a tick.
- **Under `la Suède` the five voids line up into a ladder** ending on one tick at 98,8 %, longest at
  the top and shortest at the bottom — the inversion the note asserts, drawn. This is the state the
  gesture exists for.
- **The pass band earns its keep only under a high target.** With each row measured against its own
  2015 the band covers almost the whole track and reads as one tone; under `la médiane` and `la
  Suède` it shrinks to the sliver at the right that clears, which is the correct picture in both
  cases. Stated rather than hidden: it adds nothing to the default state.
- **A tick that lands under an end label still reads**, because it is drawn taller than the label
  box and pokes out above and below it — France's 92,2 % tick sits inside its own label and is
  legible in all three directions.
- **Three defects were found by looking and are fixed** (see below). One more was found by measuring.

## Verification

`verify-web.mjs` — creme **99 passed, 0 failed, 5 skipped**; nocturne **93/0/5**; rapport **87/0/6**.
The premier jet was 56/0/5.

Driven twice, once with scripting and once with JavaScript disabled: the transforms, fills, revealed
verdicts and revealed notes come back **byte-identical in both**, and `ArrowRight` on the radio group
moves the picture. The control is CSS and radios; nothing about it needs the script.

Six mutations, each verified red with its own refusal quoted, plus six unit probes on the refusals no
render can reach. **None stayed green.** One first attempt (a statistic moved to 20 %) crashed the
runner's own sentence-building before reaching the guard — a mutation that crashes looks like a
mutation that passes, so it was re-run at 99,5 %, where it refuses properly.

## The four defects this pass closed

1. **The hover was a grey dot.** The premier jet drew six transparent `.pt` circles with no
   `data-mark-ref`, so the format's own `.pt:hover { fill: var(--muted) }` printed a grey dot
   floating at each bar's end — the "rond au survol" refused three times on this branch. The bar now
   answers for itself.
2. **The threshold's name printed through the control's sentence.** `top: 0` plus
   `translateY(-100%)` puts a label outside its own layer; on `nocturne` it read "…à 18,9 pts — LA
   MOITIÉ tre 50 %". It now sits on the row-name line, inside the plot.
3. **The surplus segment and the answered bar were 1,04:1 apart on `nocturne`** — point at a row and
   the "beyond the target" reading dissolves into the bar. Two colours calibrated independently
   against the same floor against the same fill; the second is now hunted with the first in hand.
4. **The same encoding pointed two ways.** Hunted per fill, the surplus came out lighter than the
   subject's bar and darker than every other bar on the same plate. The poles are now chosen once
   per direction, which needed 25 % of headroom on the bar fills to be possible at all.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2015
and 2024. `data.csv` is a byte-for-byte copy of `proof/static-bullet-low-carbon-share/data.csv`.
