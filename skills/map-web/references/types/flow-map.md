# Flow map — in web

**Argues:** A flow/route map answers "what path did this take, and what did it pass through, in order" — where the sequence of places crossed is part of the claim.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-flow-map-ukraine-protection` (2026-09-15), from `proof/static-flow-map-ukraine-protection`.
Vocabulary: `skills/map-web/assets/live-flow.ts`.
**The gesture**: the reader picks WHAT THE WIDTH IS DIVIDED BY, because a band measures two places, so it has a second denominator and a still can only pick one without leaving a trace of the pick.

- **Offer the honest denominators and let the lead change hands**: the people, the people per thousand inhabitants of the receiving country,
  the people per thousand square kilometres of its ground. When the lead changes three times across the three, that IS the subject, and no
  single plate can carry it.
- **Count what you do not draw, and recount it per denominator**: Minard's rule — a band too thin to see is counted, not drawn — and which
  bands fall under the floor is a function of the denominator and is not a stable set. State the number under each, and state that they are
  not the same bands.
- **No `radius` at all for the bands**: they are `line`/`fill` layers, so none of `live-map.mjs`'s three radius behaviours applies to them;
  any seat marker the beat adds is a pin, `radius: "fixed"`, the same screen size at every zoom, because it locates and does not measure.
- **Print what Mercator costs THIS subject**: on a fan the inflation falls neither on an area nor on a mark but on the LENGTH OF THE ARMS —
  the northern destinations are drawn further per real kilometre than the southern ones. Derive every arm on every render against an
  equal-area camera kept in the beat for measuring, and carry the sharpest pair in the caveat in the reader's own words.

## Reader gestures
- **`live-flow` — « Rapporté à quoi ? »** — a band measures TWO places, so it has a second denominator; the reader picks what the WIDTH is divided by, and a still can only pick one without leaving a trace of the pick
- **The lead changes hands** — across the honest denominators (the people, the people per thousand inhabitants of the receiving country, the people per thousand square kilometres of its ground) the lead changes three times, and THAT is the subject no single plate can carry
- **`ask-a-band`** — a band answers with its two ends, its value and its value under the current denominator
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-draw-only-above` — draw only what is above the floor and say nothing: Minard's rule — a band too thin to see is COUNTED, not drawn — and which bands fall under the floor is a function of the denominator and is NOT a stable set, so the count is stated per denominator and stated to be different bands
- `no-size-seat-marker` — size a seat marker by anything: a marker here is a pin, `radius: "fixed"`, the same screen size at every zoom, because it locates and does not measure

## Precision to assert
- the route's drawn order matches the data's own sequence, and every region beneath the route is present
- the undrawn bands are counted and recounted per denominator, and the page says they are not the same bands
- on a fan Mercator's inflation falls on the LENGTH OF THE ARMS: derive every arm on every render against an equal-area camera kept in the beat for measuring, and carry the sharpest pair in the caveat

## Devices the worked example implements
- **`live-flow.ts`** — the denominator as the control, over `line`/`fill` layers with no radius behaviour in play (`skills/map-web/assets/live-flow.ts`)
- **A per-denominator census of the undrawn** — Minard's rule kept under a control that moves the floor (`render-directions-web.mjs`)
- **An equal-area camera kept only for measuring** — the arms checked against a projection the page never draws (`camera.ts`)

## Worked example
`proof/web-flow-map-ukraine-protection/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), `camera.ts` (the MEASUREMENT projection, its window and `project` — the beat's central claim), `bake.mjs` (`BEAT.bounds`, the camera gate, one plate per filed direction), `DirectedFlowMapWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/live-flow.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type flow-map --beat proof/web-flow-map-<subject> --static proof/static-flow-map-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
