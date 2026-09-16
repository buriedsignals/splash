# Box plot — in web

**Argues:** A box plot compresses a distribution into a five-number summary — minimum, first quartile, median, third quartile, maximum — and draws it as a box with whiskers, one per category.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-boxplot-france-co2-decades` (2026-09-15).

- **The gesture**: the reader parks one decade's OWN THREE LEVELS — Q1, median, Q3 — flat across all
  eight boxes, and reads every other box against that band instead of against the axis.
- **Start from what falling medians bury.** Eight medians fall monotonically just as happily when the
  boxes underneath sit on top of each other, and nobody sees that in a row of rectangles at eight
  different x. The yardstick returns the fact: the 1980s box and the 1960s box are the same box.
- **Build it with `chart-web/assets/level.ts`** — no fourth vocabulary — and lay ALL THREE LEVELS or
  none. A box plot's argument is the SPREAD; a yardstick carrying only the median measures this
  picture on the one channel a plain line chart already has, and `assertLevelDeclaration` refuses it.
- **Draw the sample beside its own summary**: a box hides the readings it was computed from, so every
  year is its own dot beside its box and every dot answers with its year, its value and where it sits
  inside its decade. The still could draw the dots; it could not name any of them.
- **Whiskers are Tukey's and the fence is computed, never drawn to the extreme** — a whisker that
  always reaches min and max is a range plot in a box plot's clothes. Each box prints its own median
  and its own n, so a partial decade cannot be read as a full one.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Cette décennie-là est vraiment au-dessous de la précédente, ou est-ce que les deux se recouvrent ? »** — the chosen category's Q1, median and Q3 lie FLAT across every box as dashed rules on a ground casing, so the others are read against that band rather than against the axis; its own box takes an ink ring and the other labels step back
- **`ask-a-mark`** — a box answers with the readings the five-number summary hides: its n, its span, and how many of another decade's years fall inside its band
- **What does NOT move** — the eight boxes, their positions, the falling-median claim and the partial category's stated n
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-let-control-hide` — let a control hide a box: overlap is the fact the page exists to expose, and it needs every box present
- `no-let-yardstick-re` — let the yardstick re-derive anything — a level lays ONE reference across the plot and every mark keeps exactly the meaning it had

## Precision to assert
- every summary is computed from the frozen file and the runner throws rather than draw the headline if any decade after the peak is not below the one before it
- a partial category states its n under its own label rather than being padded or dropped
- the overlap counts the sentence reports are computed server-side over the real readings, not estimated off the boxes

## Devices the worked example implements
- **Three levels at once** — Q1, median and Q3 laid flat together, which is what turns "do they overlap" into a look (`skills/chart-web/assets/level.ts`)
- **Ground casing under the dashed rules** — the reference reads over boxes and whiskers alike (`DirectedBoxplotWeb.tsx`)
- **Derived overlap counts** — how many of one decade's years fall in another's band, baked at build time (`render-directions-web.mjs`)

## Worked example
`proof/web-boxplot-france-co2-decades/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedBoxplotWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type boxplot --beat proof/web-boxplot-<subject> --static proof/static-boxplot-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
