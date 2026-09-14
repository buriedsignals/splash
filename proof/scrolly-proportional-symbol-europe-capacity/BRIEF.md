---
format: scrolly
type: proportional-symbol
---

# Beat — Un centième des sites porte plus d'un tiers de la puissance bas-carbone d'Europe (scrolly)

**Type:** proportional symbol (map). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `proportional symbol` type in the scrolly format, drawn once per filed direction from the same stations, scale,
claim and assertions as `static-proportional-symbol-europe-capacity`. The basemap is the Natural Earth geometry of
the sibling scrolly map beats, in an equal-area projection, tinted by `plateTints` — not the static plate's baked
MapTiler image, which a camera that moves cannot re-frame.

## The choreography

A proportional symbol map trades the count for the weight; the scroll adds the stations largest first, so the reader
watches the weight pile up long before the count does (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the largest station, Zaporizhzhia: 6,000 MW, 1.3 % of the power alone | **reveal by datum** | one circle, named; the counter reads 1 station · 0.01 % of the sites · 1.3 % of the power |
| 2 | the ten largest: 0.1 % of the sites, 9.7 % of the power | **count** | nine more circles; the counter climbs |
| 3 | the hundred largest: 1.1 % of the sites, 43 % of the power, 65 of them nuclear | **count** | ninety more circles |
| 4 | nuclear alone: 72 sites, 0.8 %, 34.4 % of the power; France holds 19 | **filter + zoom** | the nuclear sites in the ink, the rest stepping back, the camera centred on France's |
| 5 | every station, to the 8,900th: the field closes | **count** | thousands of small circles fill the west |
| 6 | the plate's cut: 193 stations of 400 MW or more, 2.2 % of the sites, 54.5 % of the power; the reading line | **pull back** | the static plate, its key and its cut |

## Precision

- **Laid out in the reader's pixels**: the largest circle takes a radius the stage allows and every other the radius
  its capacity's area gives it; the key's circles are computed by the same function. The close-up grows radii gently,
  so a crowd opens without the key's scale breaking.
- **The counter is the scroll's own**: it reads the count the reader has reached and the running share of the power,
  from a cumulative sum computed in node.
- **A phone keeps the largest station clear of the resting card**: the whole-map camera there holds it in the upper
  third of the stage; the close-up still centres its subject both ways.
- **Every sentence is asserted**: the largest station is the Ukrainian 6,000 MW nuclear site at Zaporizhzhia's
  coordinates, a hundred stations are under 2 % of the sites and over a third of the power, most of them nuclear,
  nuclear is under 1 % of the sites and over 30 % of the power, the cut carries over half of it.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
