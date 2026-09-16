---
format: video
size: landscape
type: treemap
medium: chart
grounding: supported
derived: v1
---

# Beat — L’eau et l’atome portent encore 77 % du bas-carbone européen, mais dix pays ont basculé (video)

**Type:** treemap (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-treemap-europe-capacity/stations.csv`, WRI Global Power Plant Database v1.3.0)
and the same derivation as `proof/static-treemap-europe-capacity`: installed low-carbon capacity by country, a squarified
treemap, the cells that cannot carry their own value folded into two remainders split along the thread. Asserted, as the
static does: hydro and nuclear carry over 70 %; at least five countries have tipped (wind and solar above half their
low-carbon capacity); those hold under 25 %; the largest cell, France, is not one of them.

## The argument, in one sentence

Each country's wind and solar rise inside its cell and only ten pass the middle — and those ten, gathered, fit inside
France's cell alone, filling about two thirds of it.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the treemap takes the frame: one cell per drawn country, its value and its name at its top-left; two
   remainder cells; under it, at the right, the key (one swatch, « éolien + solaire », the count of tipped countries).
3. **No end card** — the video ends on the whole treemap, the ten in the accent, France ringed; the credit on one line at
   the bottom left.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | Europe's low-carbon capacity is one whole | **grow + count** | one block fills the frame from the left, its width the running total, « 469 GW » counting in it | the total |
| `reveal` | the whole is made of countries | **split** | seams of the ground cut the block into its cells, largest first, each value and name arriving as its seam lands; the whole's count gives way | every cell's area = its share of the box; the cells tile the block |
| `subject` | ten have tipped, and together they are smaller than France | **fill → filter → gather** | in every cell the wind-and-solar part rises from its floor to its share, a midline across each; the cells past the middle flood with the accent, the others drain, « 10 pays » counting in the key; the flooded cells slide onto France's cell, each keeping its area, and pack into its lower part, « 65,8 GW » on them | fill = cell × share; ten tipped; the packed cells' area = their sum, under France's (0,68) |
| `conclusion` | the whole, the lesson marked | **pull back + name** | the ten slide back to their own places, keeping their areas — the whole treemap; France ringed; the credit | every cell home; France not in the thread |
| `hold` | the treemap | — | nothing | hold = conclusion |

```json splash:choreography
{
  "kind": "time",
  "fps": 30,
  "shots": [
    {
      "shot": "establish",
      "gesture": [],
      "start": 0,
      "duration": 45,
      "asserts": []
    },
    {
      "shot": "reference",
      "gesture": [
        "grow",
        "count"
      ],
      "start": 51,
      "duration": 60,
      "asserts": [
        "the-total"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "split"
      ],
      "start": 111,
      "duration": 84,
      "asserts": [
        "every-cell-area-its-share-of",
        "the-cells-tile-the-block"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "fill",
        "filter",
        "gather"
      ],
      "start": 195,
      "duration": 216,
      "asserts": [
        "fill-cell-share",
        "ten-tipped",
        "the-packed-cells-area-their-sum",
        "under-france-0-68"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back",
        "name"
      ],
      "start": 411,
      "duration": 90,
      "asserts": [
        "every-cell-home",
        "france-not-in-the-thread"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 501,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The values and names in the cells, « 469 GW », « éolien + solaire », « 10 pays », « 65,8 GW ». A brisk rhythm: 18,7 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "the-total",
    "every-cell-area-its-share-of",
    "the-cells-tile-the-block",
    "fill-cell-share",
    "ten-tipped",
    "the-packed-cells-area-their-sum",
    "under-france-0-68",
    "every-cell-home",
    "france-not-in-the-thread",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "the-total"
    ],
    "reveal": [
      "every-cell-area-its-share-of",
      "the-cells-tile-the-block"
    ],
    "subject": [
      "fill-cell-share",
      "ten-tipped",
      "the-packed-cells-area-their-sum",
      "under-france-0-68"
    ],
    "conclusion": [
      "every-cell-home",
      "france-not-in-the-thread"
    ],
    "hold": [
      "hold-conclusion"
    ]
  },
  "onlyOnHold": [
    "hold-conclusion"
  ],
  "covers": {
    "claim-datum": null,
    "tile-area-stays-proportional-to-the": null,
    "the-packed-cells-total-area-equals": null,
    "the-remainders-are-declared-and-their": null,
    "asserted-per-shot": null
  }
}
```
