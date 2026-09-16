---
format: scrolly
type: cartogram
---

# Beat — Just five countries produced almost two-thirds of Europe's 2024 hydropower (scrolly, live map)

**Type:** cartogram. **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop. **Map:** a live MapTiler map, flat Web Mercator, with a frozen card image under it per card.

**Subject:** hydroelectricity generation by country, Europe, 2024 (`proof/static-heatmap-europe-electricity/data.csv`,
frozen as this beat's own `data.csv`). **Claim:** Russia, Norway, Turkey, France and Sweden — five of 40
reporting countries — generated 63.3% of everything Europe's hydro plants produced in 2024; Russia alone,
the largest producer, 23.8%. Every number is recomputed from the frozen rows and asserted in
`render-directions-scrolly.mjs`, never typed.

## The choreography

| card | what the card says | gesture | camera | what the reader sees move |
| --- | --- | --- | --- | --- |
| 1 | 40 reporting countries, each taking the room of its territory | — | fixed Europe window | the live map, shaded by hydro TWh class |
| 2 | Russia alone generated 210 TWh — 23.8% of Europe's 2024 hydro | focus | same | Russia picked out on the map; "1 country: 23.8%" counts up |
| 3 | give every country the same room: one tile; add Norway and Turkey, the top three reach 47.9% | morph | same (handover to tiles) | countries shrink or swell into equal tiles; "3 countries: 47.9%" counts up |
| 4 | resize each tile to its own hydro TWh: France and Sweden complete the top five, 63.3% | resize | same | tiles become squares sized by production; "5 countries: 63.3%" counts up |
| 5 | one country a quarter, three near half, five nearly two-thirds — three counts, one concentration | compare | same | the three counters step onto one 0–100% rule |
| 6 | Ukraine has no 2024 reading; the other thirty-plus countries share what's left | pull back + name | same | the equal tiles again, Ukraine's hollow tile ringed and named |

## Precision

- Every bound paint is DATA-CONSTANT (`validateScrollyPlan` refuses one that is not) — a tile's size or class
  colour travels through a `{ $state: "…" }` expression bound to a STATES field (`morph`, `size`, `subject`,
  `area`, `country`, `production`, `rule`, `missing`), never through per-feature data that changes between
  cards.
- Assertions in `render-directions-scrolly.mjs`: Russia is the largest single producer; the top-1/top-3/top-5
  shares strictly increase and the top-5 share exceeds 60%; the top five, in order, are Russia, Norway,
  Turkey, France, Sweden; exactly one country (Ukraine) has no 2024 reading; the two smallest reporting
  producers are Cyprus and Malta.
- All 40 reporting countries are present at every card (plus Ukraine, hollow); area distortion is computed
  from the same frozen `hydro_generation__twh` value at every step.

## The owner's rules — checked before the render

- [x] Every card changes the picture; the scroll interpolates continuously, never a slideshow of grouped marks.
- [x] Every sentence is asserted against the frozen data, never a hand-typed number.
- [x] ONE art direction, composed from this beat's own PALETTE.md and text (`creme/creme/the newsroom`) —
      never the three filed demo directions, except for a catalogue proof (`--filed`).
- [x] The no-break space carried through the `NB` constant in the scripts, never typed by hand.
- [x] The committed page carries `__MAPTILER_KEY__`; the key is substituted only in the git-ignored
      `.local.html` copy — never committed keyed.
- [x] Driven CONTINUOUSLY (`skills/scrolly/scripts/verify-scrolly.mjs`: 0 failures, 15 notes, and
      `skills/scrolly/scripts/verify-live-map-scrolly.mjs`: guards hold at 1280x800 and 375x812), not
      checked by jumping to scroll positions.

## Direction

One — the composer's best candidate for this beat's own PALETTE.md and text
(`render-directions-scrolly.mjs`): `renders/creme.html` plus its git-ignored `.local.html` copy.
`--filed` renders `creme`, `nocturne`, `rapport` instead, for a catalogue proof; `--no-bake` reuses the card
images already on disk for a fast iteration loop once a real bake exists.

## Provenance

Scaffolded `--from proof/scrolly-cartogram-europe-lowcarbon` (shared plumbing: `plan.mjs`,
`cartogram-drive.mjs`, `DirectedEuropeHydroScrolly.tsx` carried over with only their decimal-formatting
hardcoded to English; `shapes.geojson` and `data.csv` copied by hand — the scaffold did not carry them).
`render-directions-scrolly.mjs` rewritten for this subject: data loading, assertions, choreography words,
and two relative-import path bugs the scaffold inherited from the worked example's own shallower nesting
(fixed in this beat only — see the friction log).
