---
format: video
size: landscape
type: locator
medium: map
grounding: supported
derived: v1
---

# Beat — La plus grosse centrale bas-carbone d'Europe est en Ukraine (video)

**Type:** locator (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen files (`../static-locator-zaporizhzhia/stations.csv`, `electricity.csv`, `places.csv`) and the
same assertions as `proof/static-locator-zaporizhzhia`: the largest low-carbon station in the register is in Ukraine, at
6 000 MW installed, and Ukraine is the one country whose 2024 generation the electricity file does not report. The same
naming rules: the country the story is in and its neighbours in frame, the six largest settlements in frame, three bodies
of water — three classes of place, three treatments.

## The map: the live MapTiler map of the scrolly pilot (2026-09-15)

The owner (2026-09-15): the map videos are produced « comme dans scrolly » — `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`.

- **The plan** (`map-plan.mjs`): MapTiler dataviz style, flat Web Mercator, every country drawn by the basemap and its own
  labels removed; the sea a tint of the water hue and the land a step off the ground (`PALETTE.md`). Read from MapTiler
  Countries beneath the basemap's water: Ukraine's tint (`level` 0, `iso_a2` UA), its regions (`level` 1) and every
  national border. The station's ring and dot are circle layers, the ring closing with the travel; « UKRAINE » on the
  continent and every name of the close-up (countries, settlements with their dots, waters) are symbol layers at 30 px
  or more, each bound to its moment.
- **Two fixed cameras**: Europe's window fitted "meet" into 1920 × 1080, and the still's window fitted "meet" centred on
  the station on both axes. `mapStateAt` travels between them in Web Mercator numbers, centre and zoom linear in the
  eased travel (the choropleth video's `cameraAt`); `useLiveMap` releases a frame only once every tile is loaded.
- **Measured** once per camera (`measure.mjs` → `measured.json`): Europe at the end of reference, the close-up settled
  and still unnamed (`settledBareFrameOf`). The names, their halos (the colour measured under each), the station's
  block and the credit are placed in Bun on the close-up's cells; a neighbour's name keeps its middle half off the
  measured Ukraine. A plan changed since is refused.
- **The words outside the map** stay SVG: the station's name and its capacity counting up in measured texts, the credit,
  the title card.
- **The credit** is one line over open sea with « © MapTiler © OpenStreetMap »: creme and rapport set « WRI · Natural
  Earth · © MapTiler © OpenStreetMap », nocturne « WRI · © MapTiler © OpenStreetMap » — provisional, the owner to rule.
- « Dniepr » is set at 33.1° E, 46.8° N (the still's 33.4° E, 47.0° N stands against the ring on the Mercator close-up).
- The key reaches MapTiler only through the local proxy; `no-key.live.test.ts` holds every output to it.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the live map on the whole frame, the camera travelling: Europe, then the close-up the still frames.
3. **No end card** — the video ends on the close-up with every name; the credit on one line over open sea.

## The choreography

A locator answers « where ». What only a video can do is **travel there**: the viewer is shown the continent first, the
place is ringed on it, and the camera closes in until the names that let a reader place it can be printed.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | Europe, and a point in Ukraine | **name** | the continent; Ukraine takes its tint and its name; the station's ring lands | largest station in UKR |
| `reveal` | here | **zoom** | the camera travels from Europe to the still's window, eased; its regions' borders are drawn as it closes in; once it has settled, the neighbours' names (capitals), the six largest settlements (a dot and a name) and the waters (italic) land | the naming rules |
| `subject` | Zaporijjia, 6 000 MW installed | **name + count up** | the ring closes on the station; « Zaporijjia » lands and « MW installés » counts up to 6 000 | capacity ≥ 6 000 MW |
| `conclusion` | — | — | the credit | — |
| `hold` | the located station | — | nothing | hold = conclusion |

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
        "name"
      ],
      "start": 51,
      "duration": 75,
      "asserts": [
        "largest-station-in-ukr"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "zoom"
      ],
      "start": 132,
      "duration": 135,
      "asserts": [
        "the-naming-rules"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "name",
        "count up"
      ],
      "start": 273,
      "duration": 105,
      "asserts": [
        "capacity-6-000-mw"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [],
      "start": 378,
      "duration": 60,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 438,
      "duration": 90,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## The focus country's regions

The owner (2026-09-14): « si tu focus sur un pays il faut montrer les frontières des régions ». Once the camera closes on
Ukraine, its oblasts' borders are drawn — thinner and paler than a national border, landing as the camera settles and
absent from the continental shot. Source: MapTiler Countries, `level` 1, `iso_a2` UA (the Natural Earth 10 m lines
frozen beside the SVG version are gone with it).

## Write as little as the picture allows

No standfirst and no reading line: « installés » on the figure carries « capacity, not output ». No key: a locator has
nothing to encode.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "largest-station-in-ukr",
    "the-naming-rules",
    "capacity-6-000-mw",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "largest-station-in-ukr"
    ],
    "reveal": [
      "the-naming-rules"
    ],
    "subject": [
      "capacity-6-000-mw"
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
    "marker-radius-stays-uniform-across-every": null,
    "each-measured-camera-is-measured-separately": null,
    "a-neighbour-name-keeps-a-stated": null,
    "asserted-per-shot": null
  }
}
```
