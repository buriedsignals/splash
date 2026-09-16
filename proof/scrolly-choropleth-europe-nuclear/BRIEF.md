---
format: scrolly
type: choropleth
---

# Beat — Only 16 of Europe's 41 countries generate any nuclear electricity, and three of them carry most of it

**Type:** choropleth. **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop. **Map:** a live MapTiler map, flat Web Mercator, with a frozen card image under it per card.

Subject: `data.csv`, per-country electricity generation by source in 2024 (Ember / Energy Institute, via Our
World in Data), copied from `proof/static-heatmap-europe-electricity/data.csv`. Claim: of the 41 European
countries reporting generation in 2024, only 16 produced any nuclear electricity at all — and three of those
16 (France, Russia, Spain) carry 69% of it, France alone at nearly twice Russia's output. Every number is
recomputed from the frozen rows and asserted in `render-directions-scrolly.mjs` (`loadSubject`), never typed.

## The choreography

| card | what the card says | gesture | camera | what the reader sees move |
| --- | --- | --- | --- | --- |
| 1 | Only 16 of 41 European countries generate any nuclear power at all | reveal | whole Europe | the 16 fill in |
| 2 | Even among those 16, output is concentrated: 3 carry 69% of it | reveal in order | whole Europe (same) | a second, deeper class arrives over France, Russia, Spain |
| 3 | France leads by far — nearly twice Russia's output | zoom + name | France, close-up | the camera travels onto France; it is ringed and named |

## Precision

Every bound paint is DATA-CONSTANT (`validateScrollyPlan` refuses one that is not): the two class fills
(`has-nuclear`, `top3`) are each one data-constant layer, opacity bound to a `{ $state: "…" }` STATES field —
never per-feature data that changes between cards. Fills join MapTiler Countries by ISO A2 at the whole-map
camera; a country with no reported nuclear generation keeps the basemap's own land tint and no in-map label.

## The owner's rules — checked before the render

- [ ] Every card changes the picture; the scroll interpolates continuously, never a slideshow of grouped marks.
- [ ] Every sentence is asserted against the frozen data, never a hand-typed number.
- [ ] ONE art direction, composed from this beat's own PALETTE.md and text — never the three filed demo
      directions, except for a catalogue proof (`--filed`).
- [ ] The no-break space written as the ` ` escape in the scripts, never typed.
- [ ] The committed page carries `__MAPTILER_KEY__`; the key is substituted only in the git-ignored
      `.local.html` copy and at delivery — never committed keyed.
- [ ] Driven CONTINUOUSLY (`skills/scrolly/scripts/verify-scrolly.mjs` and
      `skills/scrolly/scripts/verify-live-map-scrolly.mjs`), not checked by jumping to scroll positions — see
      "The one gotcha" in `skills/scrolly/SKILL.md`.

## Direction

One — the composer's best candidate for this beat's own PALETTE.md and text
(`render-directions-scrolly.mjs`): `renders/<id>.html` plus its `.local.html` copy. `--filed` renders `creme`,
`nocturne`, `rapport` instead, for a catalogue proof; `--no-bake` reuses the card images already on disk for a
fast iteration loop.
