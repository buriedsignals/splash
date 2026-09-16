# Radar — in web

**Argues:** A radar chart plots several variables as axes radiating from a shared centre, each on the SAME radial scale, with one item's readings joined into a closed polygon — so the shape of that polygon is the read.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-radar-electricity-mix` (2026-09-15), from
`proof/static-radar-electricity-mix`.

- **Vocabulary: `chart-web/assets/count.ts`**, which holds the arithmetic refusing a subset that
  draws a shape already on the page.
- **The gesture is choosing which sources are COUNTED in the shape** — the half of the type's own
  warning a newsroom actually decides. On the plate's eight axes Germany covers 1,45 times France;
  count only the low-carbon sources and France covers more, at 0,83; only the dispatchable ones and
  it is 1,56. Sixteen numbers, none of them touched.
- **Start from two shapes and never more**, on circular rings with the outermost carrying its own
  value — a polygonal grid makes a value near an axis look larger than the same value between two.
- **Let the outline travel and move nothing else**: `count.ts` builds every state with ONE POINT PER
  SPOKE, so a CSS `d` interpolates and the edge peels off a vertex that stands still. A set-aside
  spoke goes dashed, its name to a fade still over the text floor, its vertices to open rings — it
  must read as PRESENT AND UNCOUNTED, never as removed.
- **Refused: reordering the axes.** The owner read the ordering version twice and wrote the same
  sentence twice — a row of pills over a chart reads as a FILTER whatever its legend says, and under
  a filter a label that moves is a bug, not a finding. Not one label moves in any state.

## Reader gestures
- **`count` — « Si on ne comptait pas cette source-là, est-ce que je lirais la même chose ? »** — the type's structural weakness is that area is sensitive to axis ORDER and COUNT; the order half is refused outright, and the count half — the one a newsroom actually decides — is handed over
- **A set-aside axis stays drawn, stays named, keeps both vertices** — it did not stop being true; it stops being a CORNER, and the outlines close over it
- **What the page says BEFORE the gesture** — a reserved sentence under the pills states what pressing will do, and `count.ts` refuses a declaration that has none
- **`ask-a-mark`** — a vertex answers with the source, both items' shares and the gap
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-move-axis-label` — move an axis label, ever, in any state this page can reach — the owner read a row of pills as filters twice, and under a filter a label that moves is a bug, not a finding; the order gesture is gone
- `no-use-filter-ts-withdraw` — use `filter.ts` or `withdraw.ts`: nothing leaves and there is no running total — removing a term replaces two edges with one and the AREA CAN GO UP, which neither vocabulary can say

## Precision to assert
- every axis keeps the same fixed scale, so area is never a silently changing unit
- the beat throws if the two totals are not within the stated fraction of each other or if the headline gap is under its stated floor
- the page prints the measured SPAN of the distortion (the range of areas across every count, and how many counts turn the answer over) unconditionally, on the plate — the lie is the page's own finding and a reader who touches nothing must still be told it

## Devices the worked example implements
- **`count.ts`** — which readings are counted in the shape, with `countedOutline` and `enclosedArea` the same two functions the component draws with (`skills/chart-web/assets/count.ts`)
- **A reserved pre-gesture sentence** — required by the vocabulary's own declaration check (`skills/chart-web/assets/count.ts`)
- **Guards verified by mutation** — each refusal neutered to `if (false)` and the vocabulary test re-run, recorded in the brief (`skills/chart-web/test/count-vocabulary.test.ts`)

## Worked example
`proof/web-radar-electricity-mix/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedRadarWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/count.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type radar --beat proof/web-radar-<subject> --static proof/static-radar-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
