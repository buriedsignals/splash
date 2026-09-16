---
format: video
size: landscape
type: diverging-bar
medium: chart
grounding: supported
derived: v1
---

# Beat — La Croatie est le seul pays de l'UE à émettre plus de CO₂ par personne qu'en 1990 (video)

**Type:** diverging bar (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-diverging-bar-eu-per-capita/data.csv`, Global Carbon Budget 2025 via Our World
in Data), read with the static beat's own `changesBetween`: the 27 member states' CO₂ per person in 1990 and 2024 and
the change. Asserted: all 27 read in both years, exactly one rose, 26 fell. Names in French (the still printed English).

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — 27 rows in two columns (at the type floor 27 rows do not hold one column of 1080 pixels), on ONE scale
   for the levels and the changes; over them the year, then the count, at the left, the unit at the right.
3. **No end card** — the video ends on the whole diverging chart, Croatia ringed; the credit on one line. About 20 s.

## The choreography — an argument, not a reveal

The still shows the answer. The video shows **where the answer comes from**: a level, the part of it that is gone, that
part becoming the change — and the one rise, too small to see, made visible by the camera.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | where they stood in 1990 | **reveal in order** | « 1990 »; the 27 levels grow from zero row after row | every 1990 level |
| `reveal` | 2024 | **shrink + count** | every level goes to 2024, the largest fall first; the part lost stays, pale, past the new end; « {n} baisses depuis 1990 » climbs to 26 | 26 falls |
| `subject` | the change, and the one rise | **transform + zoom** | the levels go; every pale part slides, keeping its length, across to the zero line and becomes the change; then the camera closes ×200 onto the zero line — every fall runs out of the frame and Croatia's +0,03 t becomes a bar | exactly one rise |
| `conclusion` | — | **pull back + name** | the whole chart again, nothing stepped back; Croatia ringed; the credit | — |
| `hold` | the answer | — | nothing | hold = conclusion |

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
        "reveal in order"
      ],
      "start": 51,
      "duration": 90,
      "asserts": [
        "every-1990-level"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "shrink",
        "count"
      ],
      "start": 141,
      "duration": 150,
      "asserts": [
        "26-falls"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "transform",
        "zoom"
      ],
      "start": 291,
      "duration": 180,
      "asserts": [
        "exactly-one-rise"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back",
        "name"
      ],
      "start": 471,
      "duration": 75,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 546,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

« 1990 », the count, the unit, « ×200 », the names and the changes. No standfirst, no « la seule hausse » note, no average.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "every-1990-level",
    "26-falls",
    "exactly-one-rise",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "every-1990-level"
    ],
    "reveal": [
      "26-falls"
    ],
    "subject": [
      "exactly-one-rise"
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
    "all-categories-are-read-in-both": null,
    "one-scale-pixels-per-unit-carries": null,
    "the-magnification-factor-used-to-make": null,
    "asserted-per-shot": null
  }
}
```
