---
format: scrolly
type: dot strip
medium: chart
grounding: supported
derived: v1
---

# Beat — Le plancher européen est monté de 30 points, le plafond de 2 (scrolly)

**Type:** dot strip (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone
to a wide desktop.

The `dot strip` type in the scrolly format, drawn once per filed direction from the same shares, floor, ceiling,
spread and assertions as `static-dot-strip-lowcarbon-spread`.

## The choreography

A strip shows the shape of a field. The scroll moves the field on one strip before it opens into the static
plate's two (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | in 2000 the field runs from 1.6 % to 96.7 % | — | one ruled strip, sixteen pins with their codes in chips; the range as a large figure |
| 2 | to 2024 each pin slides; the median goes from 27.5 % to 70.6 % | **travel + count** | every pin slides along the strip, a tick left where it stood; the median's mark moves with them and counts |
| 3 | the floor: Poland, 1.6 → 31.1 %, +30 points | **focus + trace** | Poland's trail along the strip in the accent, the others stepping back |
| 4 | the ceiling: Sweden, 96.7 → 98.8 %, +2 points | **focus + trace** | Sweden's trail, the same |
| 5 | the spread closes from 95.1 to 67.6 points | **compare** | both years' floor-to-ceiling brackets under the strip |
| 6 | the reading line | **split** | the strip opens into two, 2000 above and 2024 below on one scale, a leader from each pin to its later self |

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
        "travel",
        "count"
      ],
      "changes": [
        "median",
        "year"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "focus",
        "trace"
      ],
      "changes": [
        "floor",
        "median"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "focus",
        "trace"
      ],
      "changes": [
        "ceil",
        "floor"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "compare"
      ],
      "changes": [
        "ceil",
        "spread"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "split"
      ],
      "changes": [
        "split",
        "spread"
      ]
    }
  ]
}
```

## Precision

- **Chips are stacked so none overlaps another**, once for the 2000 values and once for the 2024 values; a
  chip's row slides between the two as its pin does. The rows stretch to the height they are given, within a
  band.
- **The strip sits low in the stage and the card's reading is a large figure at the top**: the card comes to
  rest across the middle, and a strip drawn on its own left the top of the stage bare.
- **Both strips share one scale object**, and the plate says so, as the static plate does.
- **Every sentence is asserted**: the floor rose over 20 points and the ceiling under 5; the spread closed by
  more than a fifth; the subject is the 2000 floor and still the floor in 2024; the 2000 ceiling is still the
  ceiling in 2024.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "chips-are-stacked-so-none-overlaps",
    "the-strip-sits-low-in-the",
    "both-strips-share-one-scale-object",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "point-positions-never-shift-to-avoid": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
