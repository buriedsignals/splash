---
format: scrolly
type: grouped-bar
medium: chart
grounding: supported
derived: v1
---

# Beat — Dans 5 de ces 6 pays l'éolien devance le solaire — la Suisse est l'exception (scrolly)

**Type:** grouped bar. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `grouped bar` type in the scrolly format, drawn once per filed direction from the same six countries, shares and
claim as the directed `static-wind-vs-solar` renders; the frozen file's 2015 rows add the ghost.

## The choreography

A grouped bar asks the reader to compare two bars in every group; the scroll does the subtraction on the plate, so the
exception is the one bar on the other side of zero (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | wind's share of six countries' electricity in 2024: 28.5 % in Germany to 0.2 % in Switzerland | **grow** | the wind bars, alphabetical |
| 2 | solar beside it: 7.2 % in Switzerland | **grow** | the solar bars |
| 3 | only the gap, wind minus solar: one country below zero, Switzerland, −7.0 points | **transform** | each pair folds into one bar either side of zero, in the colour of the source that leads |
| 4 | ordered by gap: Sweden first at +21.1, Switzerland last | **reorder** | the groups travel to their new slots |
| 5 | in 2015 Switzerland was already below zero, −1.5; the gap is 4.6 times wider now | **ghost** | 2015's gap as a dashed outline, its value beside it |
| 6 | the reading line | **pull back** | the static plate |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [
        "grow"
      ],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "grow"
      ],
      "changes": [
        "solar"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "transform"
      ],
      "changes": [
        "gap"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "reorder"
      ],
      "changes": [
        "sort"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "ghost"
      ],
      "changes": [
        "ghost"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "gap",
        "ghost"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: the value scale and the zero line travel between the bars and the gaps, so a
  bar never jumps; names under the baseline take two alternating rows when a cell is too narrow for them.
- **Every sentence is asserted**: every source column counted in the total, Switzerland the only country where solar
  leads, Switzerland already below zero in 2015, its gap more than three times wider in 2024.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "one-shared-value-scale-from-zero": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
