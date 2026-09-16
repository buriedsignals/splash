---
format: scrolly
type: pictogram
medium: chart
grounding: supported
derived: v1
---

# Beat — L'Europe électrique est aux deux bouts : 6 pays seulement au milieu (scrolly)

**Type:** pictogram (unit grid). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to
a wide desktop.

The `pictogram` type in the scrolly format, drawn once per filed direction from the same data, floors, classes, claim
and assertions as `static-pictogram-europe-lowcarbon`.

## The choreography

A unit grid is read by counting; the scroll first shows where each unit comes from, then has the reader count
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | forty countries, one square each, from 11 % in Moldova to 100 % in Albania and Iceland | **place** | every square set down at its share on a 0–100 % axis, stacking on its neighbours |
| 2 | two floors, 60 % and 75 % | **mark** | two dashed rules rise from the axis, their numbers on the tick row |
| 3 | 16 above 75 %, 18 below 60 %, 6 between | **count** | the squares leave the axis and settle in three blocks, each with its count |
| 4 | the six in the middle, named | **filter** | the two ends step back; the six are named with their shares |
| 5 | the 34 at the two ends, each in the fill of its class | **recolour** | the middle steps back; the squares take the ramp, the key appears |
| 6 | the reading line | **pull back** | the static plate and its key |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [
        "place"
      ],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "mark"
      ],
      "changes": [
        "floors",
        "note"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "count"
      ],
      "changes": [
        "counts",
        "ends",
        "floors",
        "mode",
        "note"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "filter"
      ],
      "changes": [
        "middle",
        "note"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "recolour"
      ],
      "changes": [
        "classes",
        "key",
        "middle",
        "note",
        "sides"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "note",
        "sides"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: the axis has one column per 2.5 points of share (per 5 points on a narrow
  stage); an end's name sits above every tower it spans; a floor's number takes the tick row and the tick it would
  touch steps back; the block rows use the static plate's ladder — twenty, sixteen, thirteen, ten or eight per row —
  whichever gives the largest square.
- **The unit stays a country**: no square is ever scaled to a quantity; the transition only moves and resizes squares
  together.
- **Every sentence is asserted**: the three blocks account for every country, the middle holds under a quarter of the
  field, exactly one country is unreported and it is Ukraine, every country has a French name.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "the-unit-stays-a-country",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "one-icon-always-equals-the-same": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
