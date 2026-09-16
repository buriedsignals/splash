---
format: scrolly
type: diverging stacked bar
medium: chart
grounding: supported
derived: v1
---

# Beat — Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis (scrolly)

**Type:** diverging stacked bar (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic,
from a phone to a wide desktop.

The `diverging stacked bar` type in the scrolly format, drawn once per filed direction from the same data,
classification, claim and assertions as `static-diverging-stacked-electricity`.

## The choreography

The form's own move is re-anchoring a 100 % bar on its neutral; the scroll performs it, then reads each camp
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | six mixes; each row is 100 % | — | plain stacked bars, aligned left, 0–100 |
| 2 | nuclear is neither: set it on the axis | **re-anchor** | each bar slides until the middle of its nuclear sits on the axis; the lean appears; ticks change set |
| 3 | fossil: Poland leans furthest, 68.9 % | **filter + name** | only fossil segments keep their ramp; fossil totals at the left ends; Poland in bold |
| 4 | renewables: Norway, 98.6 %, no nuclear | **filter + name** | only renewable segments; totals at the right ends; Norway in bold |
| 5 | France: 67.7 % nuclear against 5.1 + 27.2 = 32.3 % | **compare** | France climbs to the first row and opens two lanes: nuclear above, fossil and renewables laid end to end below from the same start |
| 6 | the reading line | **pull back** | every row and total, France in the accent |

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
        "re-anchor"
      ],
      "changes": [
        "centre"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "filter",
        "name"
      ],
      "changes": [
        "left"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "filter",
        "name"
      ],
      "changes": [
        "left",
        "right"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "compare"
      ],
      "changes": [
        "compare",
        "right"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "all",
        "compare"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: the name and total columns as wide as their widest text; below 520 px
  the names go above their bars, so the plot keeps the width.
- **The comparison climbs to the first row**, because the card comes to rest on the middle of the stage,
  where France's row sits.
- **The neutral is floored** at 1.6:1 against the ground: the static plate's 0.14 of the ink leaves nuclear
  a near-black mass on `nocturne`'s navy.
- **Every sentence is asserted**: every source classified, each row summing to 100 %, the neutral outweighing
  both sides in the subject, the rightmost country carrying no nuclear.
- The legend is its own row under the chart: each camp's name, its ramp from the centre outward, nuclear.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "the-comparison-climbs-to-the-first",
    "the-neutral-is-floored",
    "every-sentence-is-asserted",
    "the-legend-is-its-own-row"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "segment-shares-sum-to-the-same": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
