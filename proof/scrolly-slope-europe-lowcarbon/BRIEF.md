---
format: scrolly
type: slope
medium: chart
grounding: supported
derived: v1
---

# Beat — Les seize pays ont tous gagné du bas-carbone depuis 2000 — un seul a doublé la France (scrolly)

**Type:** slope (two dated rails). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `slope` type in the scrolly format, drawn once per filed direction from the same data, claim and assertions as
`static-slope-europe-lowcarbon`.

## The choreography

A slope draws the order as well as the levels; the scroll lays the first order down, grows the slopes into the second,
and then points at what changed (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | sixteen countries in 2000, from 1.6 % in Poland to 96.7 % in Sweden; France 90.7 %, Finland 65.5 % | **reveal** | the 2000 rail alone, sixteen points named |
| 2 | in 2024 every country draws its slope: sixteen of sixteen rise | **grow** | the slopes grow to the 2024 rail, its values written as they land |
| 3 | where two slopes cross, two countries swapped: 16 crossings | **mark** | a ring at every crossing |
| 4 | one concerns France: Finland was 25.1 points below, is 0.4 above, and is the only one to pass | **filter** | the pair in the accent, its crossing ringed, the rest stepping back |
| 5 | the largest gains: Denmark +73.7, Portugal +55.4 | **highlight** | the two slopes in the ink, their changes written |
| 6 | the reading line; the plate keeps the pair and the four largest producers | **pull back** | ten lines leave, the six re-seated with their changes: the static plate |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [
        "reveal"
      ],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "grow"
      ],
      "changes": [
        "right"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "mark"
      ],
      "changes": [
        "cross"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "filter"
      ],
      "changes": [
        "pair"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "highlight"
      ],
      "changes": [
        "cross",
        "gains",
        "pair"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "gains",
        "six"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: one value scale for both rails; every label relaxed so no two touch, once for
  the sixteen and once for the six, the seats crossfading between the two.
- **Crossings are computed, not drawn by eye**: a pair crosses where the sign of its gap flips, at the fraction of
  the run where the gap is zero, and its ring appears only once the slopes have grown past it.
- **Every sentence is asserted**: all sixteen rose, Finland passed France, and it is the only country to have passed
  France.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "crossings-are-computed-not-drawn-by",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "both-end-columns-keep-the-same": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
