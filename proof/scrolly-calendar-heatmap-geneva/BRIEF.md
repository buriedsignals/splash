---
format: scrolly
type: calendar heatmap
medium: chart
grounding: supported
derived: v1
---

# Beat — Genève a tenu 31 jours d'affilée au-dessus de 20 °C en 2024 (scrolly)

**Type:** calendar heatmap (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic,
from a phone to a wide desktop.

The `calendar heatmap` type in the scrolly format, drawn once per filed direction from the same data,
streak search, extremes, warmest month, quantile bins, assertions and words as
`static-calendar-heatmap-geneva`.

## The choreography

The static plate is the floor — data, streak search, extremes, warmest month, quantile bins, assertions,
colour rules. The scroll tells the subject with its own gestures
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | one cell a day, one row a month | — | the empty calendar |
| 2 | six bins of roughly equal count, breaks in °C | **reveal in order** | the year fills day by day, 1 January to 31 December, the key arrives |
| 3 | 59 days passed 20 °C | **filter** | every day under 20 °C steps back to a neutral |
| 4 | the longest run, 18 July to 17 August: 31 days | **zoom + trace + count** | July and August open to fill the frame and print their values; the outline traces the run day by day while a counter climbs to 31 |
| 5 | August (22,2), not July (20,9) | **pull back + compare** | the year returns in full colour; every month's mean is drawn beside its row, August in the accent |
| 6 | the hottest and coldest days; missing dates | **name** | 30 July and 12 January ringed and labelled |

The warm-day count is derived and asserted in the runner; the monthly means are the static beat's own.

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
        "reveal in order"
      ],
      "changes": [
        "fill",
        "key"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "filter"
      ],
      "changes": [
        "filter"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "zoom",
        "trace",
        "count"
      ],
      "changes": [
        "outline",
        "zoom"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "pull back",
        "compare"
      ],
      "changes": [
        "filter",
        "means",
        "zoom"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "name"
      ],
      "changes": [
        "extremes"
      ]
    }
  ]
}
```

## Precision

- **The zoom is row heights, not a transform.** The calendar is a grid; zooming interpolates its row
  tracks, so every word stays at its register's size. Values print inside a focused cell only where the
  cell, at full zoom, is wider and taller than the value — on a phone they do not, and the counter
  carries the number.
- **Everything is placed on the grid**: the counter, the outlines, the two names and the means column
  are grid items on the lines of the cells they belong to; a name or the counter that would hang
  outside the frame slides back in.
- **Values on a filtered day are set in the ink**, not the ground: white on the neutral measured
  unreadable.
- **A number never parts from its unit** at a line end (`20 °C` with a no-break space).
- **The title steps down a ladder of three forms** until the fixed header fits its share of the frame.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "the-zoom-is-row-heights-not",
    "everything-is-placed-on-the-grid",
    "values-on-a-filtered-day-are",
    "a-number-never-parts-from-its",
    "the-title-steps-down-a-ladder"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "the-colour-scale-domain-is-fixed": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
