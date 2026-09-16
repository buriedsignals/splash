# Proportional symbol — in web

**Argues:** A proportional symbol map answers "how big is this quantity AT this specific place" — where the geography is a set of POINTS, not a partition of area.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-proportional-symbol-europe-capacity` (2026-09-15), from `proof/static-proportional-symbol-europe-capacity`.
Vocabulary: `skills/map-web/assets/area-scale.ts` + `skills/map-web/assets/live-symbols.ts`.
**The gesture**: the reader picks the EXPONENT of the size scale, because the spread between the circles — the only thing the map is for — is a free parameter the author otherwise sets in silence.

- **Pin the anchor across the laws**: three laws over the same circles at the same places, the biggest circle at the same radius in all
  three, so the only cue that changes is the spread. The ranking is right under every law; that is precisely why the exponent is invisible.
- **Use `radius: "camera"`**: the circle encodes a VALUE, so its size is derived from the camera at the fit and then HELD in screen pixels
  as the reader zooms — the same number must not mean two things at two zooms. Halo, label gutter and hit target are sized from the same
  remembered radius (`data-r`), never from a second number describing the same circle.
- **Keep the size legend true at every zoom**: the key is drawn by the same exponent and the same camera-held radii as the marks, so it
  cannot drift out of agreement with the picture when the reader zooms or switches law.
- **Print what Mercator costs THIS subject, measured again rather than quoted**: the marks are held in screen pixels, so every ratio between
  them is exact at every latitude — the cost falls on the LAND UNDERNEATH, and therefore on the second reading every reader of a symbol map
  takes anyway ("how big is this circle for the size of its country"), which is false in the north by the measured factor.

## Reader gestures
- **`area-scale` — « L'écart entre ces cercles, il est réel ? »** — the reader picks the EXPONENT of the size scale, because the spread between the circles — the only thing the map is for — is a free parameter the author otherwise sets in silence
- **The anchor is pinned across the laws** — three laws over the same circles at the same places, the biggest circle at the same radius in all three, so the only cue that changes is the SPREAD; the ranking is right under every law, which is precisely why the exponent is invisible
- **`ask-a-mark`** — a circle answers with its place and its value, which area ranks but does not measure
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- hold the radius to the ground or to the screen arbitrarily: the circle encodes a VALUE, so `radius: "camera"` — derived from the camera at the fit and then HELD in screen pixels — because the same number must not mean two things at two zooms
- size a halo, a label gutter or a hit target from a second number describing the same circle: all of them come from the remembered radius (`data-r`)

## Precision to assert
- symbol AREA (never radius alone) is proportional to the value, under every law
- the size legend is drawn by the same exponent and the same camera-held radii as the marks, so it cannot drift out of agreement when the reader zooms or switches law
- the marks are held in screen pixels so every ratio between them is exact at every latitude — Mercator's cost falls on the LAND UNDERNEATH, and therefore on the second reading every reader of a symbol map takes anyway, which is false in the north by the measured factor

## Devices the worked example implements
- **`area-scale.ts`** — the exponent as the control, with the anchor pinned so only the spread moves (`skills/map-web/assets/area-scale.ts`)
- **`live-symbols.ts` with camera-held radii** — one number, one meaning, at every zoom (`skills/map-web/assets/live-symbols.ts`)
- **A legend drawn by the marks' own function** — no second derivation of the same number (`DirectedProportionalSymbolWeb.tsx`)

## Worked example
`proof/web-proportional-symbol-europe-capacity/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), `camera.ts` (the MEASUREMENT projection, its window and `project` — the beat's central claim), `bake.mjs` (`BEAT.bounds`, the camera gate, one plate per filed direction), `DirectedSymbolMapWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/area-scale.ts`, `skills/map-web/assets/live-symbols.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type proportional-symbol --beat proof/web-proportional-symbol-<subject> --static proof/static-proportional-symbol-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
