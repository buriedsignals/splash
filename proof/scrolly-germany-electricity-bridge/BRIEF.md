---
format: scrolly
type: waterfall
medium: chart
grounding: supported
derived: v1
---

# Beat — L'Allemagne a produit 143 TWh d'électricité de moins en 2024 qu'en 2015 (scrolly)

**Type:** waterfall (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to
a wide desktop.

The `waterfall` type in the scrolly format, drawn once per filed direction from the same data, groups and replayed
bridge as `static-germany-electricity-bridge`.

## The choreography

A waterfall is a walk; the scroll takes it one step per card, then opens the step that carries the story
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | 2015: 639.2 TWh | — | the opening total; the running total in the header |
| 2 | renewables add 102.7 TWh: wind +61.0, solar +36.1 | **build** | the step climbs from the total's level, a connector behind it |
| 3 | the nuclear exit takes 91.8: together, +10.9 only | **build** | the step drops almost as far as the last climbed |
| 4 | fossil falls 154.1, and coal alone falls 165.9 | **build + unfold** | the fossil step drops, then its slot widens into coal, gas, oil |
| 5 | 2024: 496.0 TWh, 143.2 fewer | **measure** | the fossil step folds back; the closing total rises; the opening level carried across and the net change bracketed; step values step back |
| 6 | the reading line | **pull back** | the whole bridge, every value on its bar |

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
        "build"
      ],
      "changes": [
        "ren"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "build"
      ],
      "changes": [
        "nuc"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "build",
        "unfold"
      ],
      "changes": [
        "fos",
        "unfold"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "measure"
      ],
      "changes": [
        "closing",
        "focus",
        "net",
        "unfold"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "focus"
      ]
    }
  ]
}
```

## Precision

- **The bridge is replayed before it is drawn**, and every sentence asserted: renewables up, nuclear and fossil
  down, nuclear cancelling most of renewables, coal alone falling further than the whole bridge, wind and solar
  making the renewables step.
- **Slots in the reader's pixels**: five columns, the fossil one widening to three; a bar is 62 % of a column and
  its value sits on its growing edge, never inside it. Labels too wide for their column take a short form, and a
  short form still too wide steps down a line.
- **On a narrow stage** the plot takes the larger of the two bands the resting card leaves free — above it or below
  it — so the levels the steps move through are never under the card. Totals still start at zero.
- **One accent for every step**, as the static directed plate: the signs carry the direction.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "the-bridge-is-replayed-before-it",
    "slots-in-the-reader-pixels",
    "on-a-narrow-stage",
    "one-accent-for-every-step"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "the-running-total-after-every-delta": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
