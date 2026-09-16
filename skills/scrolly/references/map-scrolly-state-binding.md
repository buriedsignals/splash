# Map scrolly plans — the `$state` binding contract

Every map type's plan (`<type>-plan.mjs`) paints through the same mechanism, defined once in
`shared/map-beat/scrolly.mjs` (`bindState`, `validateScrollyPlan`) and applied by `shared/map-beat/mount.mjs`
(`mountPlan`). This is the piece a cold run has to reverse-engineer from a worked beat if it isn't read first —
read it before writing a plan's `layers`.

## The shape

A plan layer looks like:

```js
{
  id: "class-0",
  type: "fill",
  source: countries,
  sourceLayer: "administrative",
  filter: ["all", ["==", ["get", "level"], 0], ["match", ["get", "iso_a2"], members, true, false]],
  paint: { "fill-color": "#c33", "fill-opacity": 0 },       // the value MapLibre starts with
  bindings: { "fill-opacity": { $state: "reveal" } },        // what the scroll overwrites it with, per card
}
```

`bindings` names, per paint PROPERTY, a MapLibre expression tree that may contain one or more
`{ $state: "fieldName" }` tokens anywhere inside it — as the whole value (`{ $state: "reveal" }`) or nested
inside ordinary MapLibre operators (`["*", { $state: "reveal" }, ["max", arrived, atRest]]`, `["case", …]`).

## What happens to it, at each frame

`bindState(value, state)` walks that tree and replaces every `{ $state: "field" }` token with the plain
number `state.field` — throwing if `state.field` isn't a finite number. Every other node is returned
UNCHANGED: `bindState` never evaluates the surrounding array itself. What comes out is still a live MapLibre
expression (`["*", 0.62, ["max", 0.1, 0.9]]`), which the runtime then hands to `map.setPaintProperty(layer.id,
property, expression)` — MapLibre evaluates that expression itself, per frame, per feature, exactly as it
would any other paint value. This file's code never computes a colour or an opacity; it only substitutes
numbers into an expression MapLibre goes on to run.

## What `validateScrollyPlan` accepts and refuses

Called once per direction, before any card renders (`validateScrollyPlan(plan, STATES)` in the runner):

- **Refuses a `bindings` expression that reads feature data.** A tree containing `get`, `has`, `properties`,
  `feature-state`, `id`, `geometry-type`, `global-state`, `accumulated` or `line-progress` anywhere is
  rejected: `layer "…": "…" reads feature data (…) in a binding — MapLibre reloads the source's tiles on
  every frame it changes; split the layer so the binding is data-constant`. Every bound paint value must be
  **data-constant** — a plain expression over `$state` tokens and literals only, never over `["get", …]`.
  Reason: MapLibre 5.24 answers a `setPaintProperty` call whose value is data-driven with a relayout of the
  layer's WHOLE SOURCE — reloading every tile of it — on every call, i.e. every scroll frame. Measured on the
  choropleth pilot: 116 frames with a missing tile in one slow scrub, from exactly this mistake.
- **Refuses a card with no camera** — every state in `STATES` must carry finite `camX`, `camY`, `camZoom`
  (`cameraFields()` produces these; merge its output into each state).
- **Refuses a binding whose `$state` field isn't on every card.** If layer X binds `"opacity": {$state:
  "reveal"}`, every object in `STATES` must carry a `reveal` field — `stateFieldsIn` collects every field a
  plan's bindings reference and the check is against every card, not just the first.

`bindState` itself throws at paint time (defensively, should the above ever be bypassed) if a token's field
resolves to anything but a finite number.

None of this touches `filter`: a layer's `filter` IS allowed to read feature data (`["get", "iso_a2"]`,
`["==", …]`) freely — it is set once, at `map.addLayer`, and the scroll never touches it again. Only
`bindings` (paint properties the scroll rewrites every frame) are held to the data-constant rule.

## How buckets replace data-driven paint

A choropleth (or any type whose mark VALUE differs per feature — a share, a class, a rank) cannot paint that
value with one feature-driven bound expression (`["match", ["get", "iso_a2"], …]` inside `bindings` — refused
above). Instead, classify the features ONCE, in plain JS, before any MapLibre expression is built:

1. **Group** the features that should carry the same paint at every card into one bucket (e.g. every country
   in class 2, or every country still above the floor at the current card).
2. **One MapLibre layer per bucket**, selected by a STATIC `filter` naming that bucket's members
   (`["match", ["get", "iso_a2"], members, true, false]`) — free, because filters aren't re-set per frame.
3. **One binding per bucket-layer**, over `$state` fields only — legal, because every feature the layer
   draws shares the one paint value the binding produces.

So a five-class choropleth over 40 countries becomes ~5 fill layers (one per class), not one layer with 40
per-feature values — each layer's opacity/colour bound to the scroll, its membership fixed by `filter`. See
`proof/scrolly-choropleth-europe-lowcarbon/plan.mjs` (`classLayers`) for the worked shape, and the map
scaffold's own `<type>-plan.mjs` for a small, runnable version of exactly this pattern.

## See also

- `shared/map-beat/scrolly.mjs` — `bindState`, `stateFieldsIn`, `validateScrollyPlan`, `cameraFields`,
  `viewOf`, `stageViewOf`.
- `shared/map-beat/scrolly-live.mjs` — the frame loop that calls `bindState(layer.bindings[property],
  state)` and hands the result to `map.setPaintProperty`, once per changed property per frame.
- `shared/map-beat/mount.mjs` — `mountPlan` (adds every source and layer once, from its unbound `paint`),
  `beforeIdFor` (the `beneath: "water"` placement), `validateExpressions` (the pair-property trap).
