# Small multiples — in web

**Argues:** Small multiples isn't a chart type — it's a layout decision: repeat the same small chart once per category, panel after panel, all built the same way.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-small-multiples-solar-eu-six` (2026-09-15), from
`proof/static-small-multiples-lowcarbon`.

- **Vocabulary: `chart-web/assets/carry.ts`** — one of the six carried into ALL SIX FRAMES at once,
  as a filled silhouette on the grid's own shared scale, unchanged.
- **The gesture answers the wall**: faceting buys honesty with a frame, and two curves in two boxes
  NEVER MEET, so who was ahead, for how long, and the year the order changed are structurally absent.
  Six panels hide fifteen pairs; drawing them all is thirty-six panels.
- **Start from one scale, or it is not a grid**: every panel runs 0 to the SAME ceiling on the same
  years, and the component throws rather than fit a panel to its own data. The cost is stated — the
  smallest country's curve is nearly flat, and that flatness is the true reading.
- **Move nothing when the silhouette lands**: same six frames, same scale, same years, same names;
  every crossing the wall hid becomes a place where a line enters or leaves a mountain, and the
  carried country's own panel shows the silhouette lying exactly under its own line.
- **Refused: two greys on the same floor, and a stretched frame.** Two colours calibrated
  independently onto one floor come out the SAME grey (1,068:1 on creme), so the neutral line is held
  to 5:1 instead and every line is cased in the panel's own ground. And the grid letterboxes
  (`xMidYMid meet`) rather than squeeze: a viewBox stretched 1,41× would make every slope a lie about
  its own rate.

## Reader gestures
- **`carry` — « Et si je posais cette courbe-là dans les autres cases ? »** — faceting buys honesty with a FRAME, and a frame is a wall: two curves in different boxes never meet, so everything that lives at a meeting is out of reach until one panel's curve is carried into the others
- **`ask-a-mark`** — a point answers with its panel, its period and its value, which a small panel's axis cannot print
- **What does NOT move** — the shared scale, the panel order, and every panel's own curve
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-fit-panel-own` — fit a panel to its own data — same domain, same axis, same units on every single panel, even if that means some panels look nearly flat; that is the layout's only non-negotiable
- `no-let-carried-curve` — let a carried curve be re-scaled into its host panel: it is carried at the SHARED scale, or the comparison it exists for is a lie

## Precision to assert
- every panel keeps the same axis scale, asserted equal
- the unit printed on every panel and in the caveat is the unit the data is in — a defect this beat found and fixed in its first pass
- the frozen file is the static sibling's, byte for byte, with the hash recorded

## Devices the worked example implements
- **`carry.ts`** — one panel's curve laid into the others at the shared scale, so a factor and a quantity stop being confused (`skills/chart-web/assets/carry.ts`)
- **A recorded file hash** — the shared floor with the sibling made checkable (`render-directions-web.mjs`)
- **The shared scale stated once above the grid** — furniture paid for one time, not per panel (`DirectedSmallMultiplesWeb.tsx`)

## Worked example
`proof/web-small-multiples-solar-eu-six/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedSmallMultiplesWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/carry.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type small-multiples --beat proof/web-small-multiples-<subject> --static proof/static-small-multiples-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
