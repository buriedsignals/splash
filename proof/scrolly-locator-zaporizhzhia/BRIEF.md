---
format: scrolly
type: locator
medium: map
grounding: supported
derived: v1
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
| 3 | closer: Ukraine, the Black Sea, the Sea of Azov | **zoom** | the camera travels onto the region and centres the station; Ukraine's oblasts appear as the camera arrives |
| 4 | countries in capitals, towns in lower case on a dot, water in italic | **name** | the three classes of place named |
| 5 | Zaporizhzhia, on the Dnieper, 6,000 MW installed | **ring** | the station ringed and named in the accent |
| 6 | installed capacity, never output | **pull back** | the camera eases back part-way, every label kept |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "isolate"
      ],
      "changes": [
        "country",
        "tops"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "zoom"
      ],
      "changes": [
        "zoom"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "name"
      ],
      "changes": [
        "places"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "ring"
      ],
      "changes": [
        "subject"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "limit"
      ]
    }
  ]
}
```

## Precision

- **Vectors in the equal-area projection**, one camera for land, stations, towns and water; the land and sea take
  the sibling map beats' measured tints (`plateTints`).
- **The camera travels in log scale** so the zoom reads as a steady approach; every label is HTML, seated in the
  reader's pixels, pushed to another side when it would touch one already placed or a station's dot, dropped only
  when no side is free.
- **Every sentence is asserted**: the largest station in Ukraine and at 6,000 MW, the next three French, Ukraine the
  only country with no reported generation, every country label and the station inside their countries.
- **Batch pass (2026-09-16)**: all three directions baked and rendered, `verify-scrolly.mjs` and
  `verify-live-map-scrolly.mjs` clean on all three, a frozen-image-to-live-map swap check on `creme` at
  1280×800 and 375×812 shows only the live map's own place labels added — no other check failed.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "vectors-in-the-equal-area-projection",
    "the-camera-travels-in-log-scale",
    "every-sentence-is-asserted",
    "batch-pass-2026-09-16"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "marker-radius-stays-uniform-across-every": null,
    "asserted-per-card": null
  }
}
```

## The regions

Ukraine's 24 oblasts and Kyiv city, drawn as light dashed boundaries once the camera has closed on the country:
Natural Earth 10 m admin-1 (public domain), frozen beside this beat as `regions.geojson`, the 25 features whose
`adm0_a3` is `UKR`. Natural Earth assigns Crimea and Sevastopol to Russia, as the 50 m country shapes this beat draws
already do, so the regions and the country outline agree. Fetched on 2026-09-14:

```
curl -sSL https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
