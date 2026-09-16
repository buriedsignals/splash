---
format: scrolly
type: histogram
medium: chart
grounding: supported
derived: v1
---

# Beat — 6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne (scrolly)

**Type:** histogram. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `histogram` type in the scrolly format, drawn once per filed direction from the same 213 countries, bins, claim and
cut as the directed `static-carbon-footprint-spread` renders.

## The choreography

A histogram counts things into intervals; the scroll shows the things first, then lets them fall into the intervals
they are counted in (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | 213 countries, each a dot at its own tonnes per person; most packed left, Qatar alone at 40.1 t | **reveal** | a strip of dots along the value axis, Qatar named |
| 2 | the dots fall into 4-tonne bins; every country counts once, unweighted | **stack** | each dot drops into its bin's column, lowest values first; the counts appear |
| 3 | under 4 tonnes: 127 of 213, six in ten | **mark** | the cut at 4 t, the dots under it in the accent |
| 4 | half the countries emit under 3.1 t: the median | **mark** | a dashed line at the median |
| 5 | 9 countries above 16 t, mostly oil and gas producers | **name** | the tail's names listed above their columns |
| 6 | the reading line | **pull back** | the columns become bars: the static plate |

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
        "stack"
      ],
      "changes": [
        "stack",
        "tail"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "mark"
      ],
      "changes": [
        "cut"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "mark"
      ],
      "changes": [
        "median"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "name"
      ],
      "changes": [
        "cut",
        "median",
        "tail"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "bars",
        "cut",
        "tail"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: ten equal bins, the last open; a column holds its bin's countries a few to a row,
  the row width chosen so the fullest column fits the plot, and a bar is exactly as tall as its column would be.
- **A phone** lowers the dot strip below the resting card, labels every other bin and names only Qatar in the tail.
- **Every sentence is asserted**: only 2023 rows, the bins accounting for every country, six in ten under 4 t, the
  median under the cut, the nine countries at 16 t or more exactly, Qatar the furthest out.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "a-phone",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "bin-edges-are-fixed-across-every": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
