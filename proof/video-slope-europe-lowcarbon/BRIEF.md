---
format: video
size: landscape
type: slope
medium: chart
grounding: supported
derived: v1
---

# Beat — Les seize pays ont tous gagné du bas-carbone depuis 2000 ; un seul a doublé la France (video)

**Type:** slope (two dated rails). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-slope-europe-lowcarbon/data.csv`) and the same assertions as
`proof/static-slope-europe-lowcarbon`, against all sixteen: every country rose between 2000 and 2024, Finland was under
France in 2000 and is above it in 2024, and it is the only country to pass France. No value axis: the slope carries the
direction, the end labels the level — so every drawn line carries both its numbers.

## Why the video draws all sixteen

The still draws six: at its size a rail holds six end labels. The video's frame holds all sixteen at the axis register's
pitch, so the first half of the title — « les seize pays ont tous gagné » — is shown rather than asserted on a subset. If a
direction's registers cannot seat sixteen on a rail, the render refuses.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — two rails, 2000 and 2024, sixteen lines between them; names and 2000 values on the left, 2024 values on
   the right, pushed apart to a legible pitch, never dropped; the count between the rails at the top.
3. **No end card** — the video ends on the whole chart, France and Finland in the accent, their crossing ringed; the credit
   on one line.

## The choreography — an argument, not a reveal

The still shows the two lines that cross. The video **runs the test**: every line rises — counted — then France's line
becomes the bar to clear, and every country that started under it is tried in turn, from the lowest finish up; each one
lights and falls back under France until the last, Finland, ends above it.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | sixteen countries in 2000 | — (furniture) | the rails; each country's 2000 dot, name and value | — |
| `reveal` | all sixteen rose | **trace + count** | the lines drawn to 2024 one after another, the largest rise first; « {n} en hausse » climbs to 16 | all 16 rose |
| `subject` | only Finland passed France | **test + count** | France's line takes the accent; Sweden, above it from the start, steps back; the fourteen that started under France light up in turn, lowest 2024 finish first, and step back ending under it — Finland, tried last, ends above it, takes the accent, its crossing ringed; « {n} dépasse la France » stops at 1 | the one crossing of France |
| `conclusion` | the whole slope | **pull back** | every line comes back — the whole chart — the pair in the accent; the credit | — |
| `hold` | the slope | — | nothing | hold = conclusion |

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
      "gesture": [],
      "start": 51,
      "duration": 60,
      "asserts": []
    },
    {
      "shot": "reveal",
      "gesture": [
        "trace",
        "count"
      ],
      "start": 111,
      "duration": 150,
      "asserts": [
        "all-16-rose"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "test",
        "count"
      ],
      "start": 261,
      "duration": 180,
      "asserts": [
        "the-one-crossing-of-france"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back"
      ],
      "start": 441,
      "duration": 75,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 516,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The rails, names and values, and the two counts. A brisk rhythm: 19,2 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "all-16-rose",
    "the-one-crossing-of-france",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [],
    "reveal": [
      "all-16-rose"
    ],
    "subject": [
      "the-one-crossing-of-france"
    ],
    "conclusion": [],
    "hold": [
      "hold-conclusion"
    ]
  },
  "onlyOnHold": [
    "hold-conclusion"
  ],
  "covers": {
    "claim-datum": null,
    "both-end-columns-keep-the-same": null,
    "every-line-carries-both-its-numbers": null,
    "the-count-of-risers-and-the": null,
    "asserted-per-shot": null
  }
}
```
