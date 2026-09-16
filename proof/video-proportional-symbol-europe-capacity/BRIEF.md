---
format: video
size: landscape
type: proportional-symbol
medium: map
grounding: supported
derived: v1
---

# Beat — Un centième des sites porte plus d'un tiers de la puissance bas-carbone d'Europe (video)

**Type:** proportional symbol (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen register (`../static-proportional-symbol-europe-capacity/stations.csv`) and the same assertion
as `proof/static-proportional-symbol-europe-capacity`: the 100 largest of the 8 900 low-carbon stations — 1,1 % of the
sites — carry over a third of the installed capacity (43,0 %). Area proportional to capacity; hollow circles, so an overlap
accumulates rather than hides; a key of named circles at stated megawatts, computed by the same function as the marks.

## The map: the live MapTiler map of the scrolly pilot (2026-09-15)

The owner (2026-09-15): the map videos are produced « comme dans scrolly » — `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`.

- **The plan** (`map-plan.mjs`): MapTiler dataviz style in the plate's sea and land, flat Web Mercator, every country
  drawn by the basemap; the still camera is the dot density video's (same register, same static window), never moving.
  No country is tinted and no close-up focuses one: no Countries layer.
- **Every bound paint is data-constant.** Each of the hundred arrives at its own time, so each is its own GeoJSON
  `circle` layer (largest first, the smallest on top), hollow, its radius a constant expression bound to its arrival
  `c<k>` (less half the stroke: MapLibre strokes outside); the other 8 800 are one layer bound to `rest`. 101 layers;
  `mapStateAt(props, frame)` drives them.
- **The words outside the map** (the two counts, the named circles, the credit) stay SVG, placed from `measured.json`:
  the real map measured once at the last frame (`measure.mjs`); the key and the credit over measured open sea, clear of
  every station.
- **The credit** is one line over open sea with « © MapTiler © OpenStreetMap ». As in the dot density video, the sea
  corner holds only « WRI · © MapTiler © OpenStreetMap » — provisional, the owner to rule.
- Fixed on the way: the last of the hundred only half-arrived (the arrival span overshot the reveal); every circle is
  now fully in at the end of `reveal`.
- The key reaches MapTiler only through the local proxy; `no-key.live.test.ts` holds every output to it.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — Europe on the whole frame on the live map; the key — the two counts and the named circles — standing
   on the Atlantic.
3. **No end card** — the video ends on the hundred circles over the faint field of the rest; the credit.

## The choreography

The dot density video grew every station into its weight. This one tells the ranking: **the circles arrive largest
first**, one after another, while the two counts climb together — sites and share of the power — so the viewer watches a
third of Europe's capacity land in a hundred marks. Then the other 8 800 arrive at once, as faint points, and their share
is set beside the first: a comparison, not a sentence.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | area is capacity | — (furniture) | Europe; the key's named circles, 4 000 and 400 MW | — |
| `reveal` | the largest hundred carry 43 % | **reveal in order + count up** | circles land largest first; « {n} centrales : {p} % » climbs to « 100 centrales : 43 % » | 100 / 8 900 < 2 %; share > 33 % |
| `subject` | the other 8 800 carry the rest | **compare** | the rest land as faint points at once; « 8 800 autres : 57 % » under the first line | the two shares sum to 100 % |
| `conclusion` | — | — | the credit | — |
| `hold` | the map, readable | — | nothing | hold = conclusion |

The reveal is linear in rank (a measured order); each circle eases its own arrival.

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
        "reveal in order",
        "count up"
      ],
      "start": 117,
      "duration": 210,
      "asserts": [
        "100-8-900-2",
        "share-33"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "compare"
      ],
      "start": 333,
      "duration": 105,
      "asserts": [
        "the-two-shares-sum-to-100"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [],
      "start": 438,
      "duration": 60,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 498,
      "duration": 90,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

No standfirst, no reading line, no note on the drawing threshold (the video draws no threshold: the rest are points).
The key is two counts and two named circles.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "100-8-900-2",
    "share-33",
    "the-two-shares-sum-to-100",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [],
    "reveal": [
      "100-8-900-2",
      "share-33"
    ],
    "subject": [
      "the-two-shares-sum-to-100"
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
    "symbol-area-never-radius-alone-stays": null,
    "every-symbol-is-fully-arrived-by": null,
    "the-two-shares-are-derived-and": null,
    "asserted-per-shot": null
  }
}
```
