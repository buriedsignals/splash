# Bullet — in web

**Argues:** A bullet chart answers "did this hit its target" for one or more measures, each on its own row: a single bar grows from zero to the actual value, a tick mark shows the target it was measured against, and a neutral backdrop can carry qualitative zones behind the bar.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-bullet-low-carbon-share` (2026-09-15), from `proof/static-bullet-low-carbon-share`.

- **The gesture**: the reader chooses the TARGET, and every verdict on the page is re-derived from it.
- **Start from the verdict, which is half data and half decision.** A bullet is the only type whose
  reading is not a quantity but *did this hit the mark* — and the target is chosen by whoever drew the
  plate. `chart-beat/references/types/bullet.md` puts its whole warning there. A still picks one target
  and asks to be trusted; this format is the one that can hand over the question the form provokes.
- **Build it with `chart-web/assets/benchmark.ts`.** The six measure bars NEVER MOVE — the measurement
  is not in dispute, the yardstick is. What moves is the apparatus of judgement (tick, gap, band),
  drawn at all times and only transformed, so the change interpolates instead of cutting, and the mark
  that answers a pointer is the one no option touches.
- **Re-derive the gap as a number** and let the reader see the order invert: ranked by the plate's own
  target the six run one way, ranked against Sweden they are that list read backwards, with not one
  number moved. The runner asserts the inversion before the render, so the sentence cannot outlive
  the data. Every track runs the full 0–100 %, because the remainder is the reading a bare bar cannot
  give.
- **Refused: two accent hues, one for hit and one for miss.** The verdict is drawn in SHAPE — filled
  beyond the tick, hollow short of it. Hue is already spent on which row the story is about; a
  hue-only verdict is lost on a colour-blind reader; and two hues calibrated onto the same floor
  against the same ground come out identical by construction (measured at 1,023:1 and 1,000:1).

## Reader gestures
- **`benchmark` — « Par rapport à quoi ? »** — the reader chooses the target every row is JUDGED against, and the verdict is re-derived per row: the sign of the gap, its length, the fill it takes and the count of rows that clear it
- **Provenance is part of the option** — each benchmark declares where it comes from (`own-earlier-value`, `stated-in-the-claim`, `a-statistic-of-the-drawn-set`) and the vocabulary refuses a provenance it cannot verify
- **What does NOT move** — the measured values, the row order, and the claim's own words (the target named in the title has to stay in those words, because that is what the `stated-in-the-claim` provenance is checked against)
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- invent a target just to unlock the bullet's shape — every option names a provenance and is verified against the data
- let an option leave a row unjudged: a benchmark is per row, confined to that row's own track, and every row gets a verdict

## Precision to assert
- the target marker's position is computed from the same data as the bar and asserted equal to it
- the share is computed from the source columns, never read off a column that does not exist in the file
- both halves of the claim (furthest moved, only one under the threshold) are asserted before the render

## Devices the worked example implements
- **`benchmark.ts`** — what each row is JUDGED against, with a per-row arithmetic whose SIGN flips, which is why it is not an option in `level.ts` (`skills/chart-web/assets/benchmark.ts`)
- **Declared provenance per option** — the type's own "don't invent a target" warning turned into a check (`render-directions-web.mjs`)
- **Native radios plus build-time CSS** — four verdicts, zero JavaScript, complete plate without script (`DirectedBulletWeb.tsx`)

## Worked example
`proof/web-bullet-low-carbon-share/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedBulletWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/benchmark.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type bullet --beat proof/web-bullet-<subject> --static proof/static-bullet-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
