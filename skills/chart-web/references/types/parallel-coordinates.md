# Parallel coordinates — in web

**Argues:** Parallel coordinates lay several variables out as parallel vertical axes, each keeping its own scale, with one item drawn as a polyline crossing every axis in turn — so the crossing pattern reveals trade-offs a table hides.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-parallel-coordinates-electricity` (2026-09-15), from
`proof/static-parallel-coordinates-electricity-mix`.

- **Vocabulary: `chart-web/assets/brush.ts`** — five NAMED bands over three of the seven rails, as
  radios plus generated CSS. The corpus ships this gesture nowhere else.
- **The gesture is the reader cutting a band on a rail** and getting back the cross-axis reading that
  selection produces — two of the five bands ask about a NON-ADJACENT pair (hydro against gas, coal
  against hydro), readings that do not exist on the plate at all.
- **Start from the rails, each headed by what it is**: every axis carries its own name and its own
  ceiling in its own units; on a plate only ADJACENT axes show a relationship, so the axis order is
  the argument and a still can carry exactly one of the twenty-one pairs.
- **Make the vertex the hit target, never the line**: `verify-web.mjs` probes a mark at the centre of
  its bounding box, which for a path spanning seven axes is empty space — a page built on `.line-hit`
  reports 47 failures that are not defects. Each vertex carries its whole country's row.
- **Refused: a drag, and a step back.** A drag costs a script, and this format's promise is the
  complete plate without one. The inside steps FORWARD; the fourteen context lines are already at the
  non-text floor, so there is no step back that leaves them legible — and nothing is painted through
  an `opacity` that would destroy a contrast measured before it.

## Reader gestures
- **`brush` — « Ce groupe-là, il vaut quoi sur l'autre axe ? »** — the reader picks a BAND on any axis and the rest of the plot reads as *these, against all of them*; two of the bands ask about a NON-ADJACENT pair, readings the plate's axis order cannot put side by side
- **A brushed member stays DRAWN** — a brush selects ON the encoded variable, unlike a filter, so the whole reading depends on the selected lines remaining visible against the field
- **`ask-a-mark` (a vertex)** — one line answers with its name and its value on every axis
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-use-filter-ts` — use `filter.ts` for this: a filter's narrowed set must be ORTHOGONAL to the encoded variable so narrowing can never hide the claim, and a brush is the opposite — hence a different word, a different file and a different attribute (`data-brush`)
- `no-let-states-selected` — let the two states of a selected mark differ by less than a MEASURED contrast step, which is the one refusal `filter.ts` has no reason to make

## Precision to assert
- each axis keeps its own fixed scale across every state, so a line's slope always means the same thing
- the correlation the claim reports is computed here, not asserted from elsewhere
- each band's membership and what that set does on the other axes are derived in the runner

## Devices the worked example implements
- **`brush.ts`** — what may be selected on an axis, and what the rest of the plot then reads as (`skills/chart-web/assets/brush.ts`)
- **Non-adjacent pair readings** — two of the five bands exist nowhere on the plate (`render-directions-web.mjs`)
- **A measured contrast step between brushed and unbrushed** — refused below the floor (`skills/chart-web/assets/brush.ts`)

## Worked example
`proof/web-parallel-coordinates-electricity/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedParallelWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/brush.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type parallel-coordinates --beat proof/web-parallel-coordinates-<subject> --static proof/static-parallel-coordinates-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
