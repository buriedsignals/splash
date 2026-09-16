# Area — in web

**Argues:** A single-series area chart is a line chart with the space beneath it filled.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-area-swiss-co2` (2026-09-15), from `proof/static-area-swiss-co2`.

- **The gesture**: the reader stands a reference up at a year they choose, and the surface
  re-partitions on it — the seam leaves the author's 1986 and travels, so the accent block IS their
  own lifetime.
- **Start from the plate's one cut**: an area's claim is that the SURFACE is a quantity, and the still
  states it by cutting the surface once and printing the two shares. A plate holds one cut; hand that
  cut over.
- **Build it with `chart-web/assets/level.ts`** — native radios plus CSS generated at build time. The
  sentence that comes back carries the integral on both sides, which is the reading no eye takes off
  an area.
- **The two halves are ONE hue at two chromas**, never two hues: they are two states of one quantity,
  and the partition moving does not change which of the two it is. The zero baseline is asserted in
  code, not commented — a filled series over a clipped base turns every missing unit into surface.
- **Refused: the transform.** Every option's surface, rule and name is drawn ONCE at its own
  coordinate and hidden; the stylesheet only reveals them. `interaction.mjs` reads `cx`/`cy` once at
  init, so a mark a control moved would answer for the slot it landed in.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Depuis l'année où je suis né, quelle part a été émise ? »** — the surface RE-PARTITIONS at a year the reader picks: the seam leaves the author's cut and travels, an ink rule cased in ground stands up on it, that year's reading takes a ring among the anonymous rest, and a sentence gives four readings no axis holds (years lived, share of the time, the stock since, the mean rate against the mean before)
- **What does NOT move** — the author's own midpoint rule, its note, the title, the total and the reading line are drawn unconditionally: the reader's cut is laid AGAINST the claim, never instead of it
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- let the reader's cut replace the author's — a partition the plate never states is a second claim, not an answer
- let the surface leave zero under any control: the surface IS the stock

## Precision to assert
- the total, the crossing year and the split are recomputed in the runner from the frozen file, which throws rather than render if the split is not near half
- every readings a control reveals (years lived, share of the time, share of the stock, the two mean rates) is derived server-side; the browser formats no number
- the untouched state's label names the author's own cut, so the default is legibly the plate

## Devices the worked example implements
- **A reference stood UP at a reader-chosen year** — `level.ts`, generated `:has()`/`:checked` CSS, no script (`skills/chart-web/assets/level.ts`)
- **The seam as the control's only geometry** — the tint/accent boundary is the answer, so nothing else has to move (`DirectedAreaWeb.tsx`)
- **Four derived readings in one sentence** — the reading a still cannot hold, baked at build time (`render-directions-web.mjs`)

## Worked example
`proof/web-area-swiss-co2/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedAreaWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type area --beat proof/web-area-<subject> --static proof/static-area-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
