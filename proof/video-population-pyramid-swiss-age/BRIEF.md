---
format: video
size: landscape
type: population-pyramid
medium: chart
grounding: supported
derived: v1
---

# Beat — Les femmes passent devant les hommes à partir de 60-64 ans (video)

**Type:** population pyramid (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-swiss-age-pyramid/data.csv`, UN World Population Prospects 2024 via Our World in
Data) and the same derivation as the directed still `proof/static-swiss-age-pyramid` (`DirectedPyramid.tsx`): Switzerland's
residents in 2023 by sex and five-year band, foot first, the crossing band found by `beatFacts(…).mirrorCrossingKey`.
Asserted: 21 bands summing to 8 870 560; men ahead in every band up to 55-59, women in every band from 60-64, never
crossing back.

## The argument, in one sentence

Fold the men's half onto the women's, keep only what one sex has over the other, slide that difference onto the spine and
magnify it ten times: the difference changes side at 60-64, then the pyramid is rebuilt from the part both share.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the pyramid across the frame: « Hommes » over the left half, « Femmes » over the right, the band names in
   the spine, the scale's ticks under the halves.
3. **No end card** — the video ends on the whole pyramid, the crossing marked by one rule; the credit on one line.

## The choreography — an argument, not a reveal

At the crossing the two bars differ by 841 people out of 585 263, a third of a pixel: the still cannot show where the halves
change places. The video shows it by **comparing the halves on one side**, **keeping only the difference** and
**magnifying** it.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | Switzerland by age and sex | **reveal in order** | the names, the ticks; band after band from the foot, each pair of bars grows out of the spine | every band's two lengths on one scale |
| `reveal` | the two halves compared, and what one has over the other | **compare + split** | every men's bar slides, keeping its length, across the spine onto the women's; the part both share turns neutral and leaves; what is left — the difference — slides to the spine, on the side of the sex that has it | each difference = \|women − men\|, on the leader's side |
| `subject` | the difference changes side at 60-64 | **zoom + name** | the scale multiplies ×10 around the spine (the ticks go from 100k to 10k); a rule draws between 55-59 and 60-64, the two differences either side of it print their values | men ahead to 55-59, women from 60-64; 5 136 and 841 |
| `conclusion` | the whole pyramid, rebuilt | **pull back + rebuild** | the camera returns ×1; the shared part grows back out of the spine on both sides, pushing each difference out to its bar's end — the whole pyramid, the rule kept; the credit | every band back to its two lengths |
| `hold` | the pyramid | — | nothing | hold = conclusion |

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
      "duration": 60,
      "asserts": [
        "every-band-two-lengths-on-one"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "compare",
        "split"
      ],
      "start": 111,
      "duration": 150,
      "asserts": [
        "each-difference"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "zoom",
        "name"
      ],
      "start": 261,
      "duration": 120,
      "asserts": [
        "men-ahead-to-55-59",
        "women-from-60-64",
        "5-136-and-841"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back",
        "rebuild"
      ],
      "start": 381,
      "duration": 90,
      "asserts": [
        "every-band-back-to-its-two"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 471,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

« Hommes », « Femmes », the band names, the ticks, « ×10 » and the two values at the crossing. No standfirst, no « Femmes
devant dès 60-64 » callout: the differences change side under the rule, and the title already says it.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "every-band-two-lengths-on-one",
    "each-difference",
    "men-ahead-to-55-59",
    "women-from-60-64",
    "5-136-and-841",
    "every-band-back-to-its-two",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "every-band-two-lengths-on-one"
    ],
    "reveal": [
      "each-difference"
    ],
    "subject": [
      "men-ahead-to-55-59",
      "women-from-60-64",
      "5-136-and-841"
    ],
    "conclusion": [
      "every-band-back-to-its-two"
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
    "the-shared-centre-never-moves-and": null,
    "each-difference-drawn-is-the-absolute": null,
    "the-bands-sum-to-the-asserted": null,
    "asserted-per-shot": null
  }
}
```
