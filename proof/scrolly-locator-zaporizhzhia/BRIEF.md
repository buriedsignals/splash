---
format: scrolly
type: locator
---

# Beat — La plus grosse centrale bas-carbone d'Europe est en Ukraine (scrolly)

**Type:** locator (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `locator` type in the scrolly format, drawn once per filed direction from the same stations, electricity file,
named places by their stated rules and assertions as `static-locator-zaporizhzhia`.

## The choreography

A locator answers "where"; the scroll starts from the whole continent and closes on the point
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the largest low-carbon stations in Europe: one in Ukraine, 6,000 MW, then three French | — | Europe; four dots sized by capacity, labelled |
| 2 | Ukraine is the only country with no reported 2024 generation | **isolate** | Ukraine outlined; the rest of the map steps back |
| 3 | closer: Ukraine, the Black Sea, the Sea of Azov | **zoom** | the camera travels onto the region, the station held in the upper part of the stage |
| 4 | countries in capitals, towns in lower case on a dot, water in italic | **name** | the three classes of place named |
| 5 | Zaporizhzhia, on the Dnieper, 6,000 MW installed | **ring** | the station ringed and named in the accent |
| 6 | installed capacity, never output | **pull back** | the camera eases back part-way, every label kept |

## Precision

- **Vectors in the equal-area projection**, one camera for land, stations, towns and water; the land and sea take
  the sibling map beats' measured tints (`plateTints`).
- **The camera travels in log scale** so the zoom reads as a steady approach; every label is HTML, seated in the
  reader's pixels, pushed to another side when it would touch one already placed or a station's dot, dropped only
  when no side is free.
- **Every sentence is asserted**: the largest station in Ukraine and at 6,000 MW, the next three French, Ukraine the
  only country with no reported generation, every country label and the station inside their countries.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
