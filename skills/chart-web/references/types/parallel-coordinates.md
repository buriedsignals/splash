# Parallel coordinates — in web

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
