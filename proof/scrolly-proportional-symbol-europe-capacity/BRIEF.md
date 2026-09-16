---
format: scrolly
type: proportional-symbol
medium: map
grounding: supported
derived: v1
---

# Beat — Un centième des sites porte plus d'un tiers de la puissance bas-carbone d'Europe (scrolly)

**Type:** proportional symbol (map). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `proportional symbol` type in the scrolly format, drawn once per filed direction from the same stations, scale,
claim and assertions as `static-proportional-symbol-europe-capacity`. The map is a live MapTiler map (flat Web
Mercator) driven by `plan.mjs` (addendum 2026-09-15): every country comes from the basemap, the circles are circle
layers over it, one per rank band, and the largest station's name is a symbol layer. One frozen image per card is
baked from the same plan under the live map (`fallback/`). The page carries `__MAPTILER_KEY__`; the key is
substituted at delivery.

## The choreography

A proportional symbol map trades the count for the weight; the scroll adds the stations largest first, so the reader
watches the weight pile up long before the count does (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the largest station, Zaporizhzhia: 6,000 MW, 1.3 % of the power alone | **reveal by datum** | one circle, named; the counter reads 1 station · 0.01 % of the sites · 1.3 % of the power |
| 2 | the ten largest: 0.1 % of the sites, 9.7 % of the power | **count** | nine more circles; the counter climbs |
| 3 | the hundred largest: 1.1 % of the sites, 43 % of the power, 65 of them nuclear | **count** | ninety more circles |
| 4 | nuclear alone: 72 sites, 0.8 %, 34.4 % of the power; France holds 19 | **filter + zoom** | the nuclear sites in the accent's fine stroke, the rest stepping back, the camera centred on France's |
| 5 | every station, to the 8,900th: the field closes | **count** | thousands of small circles fill the west |
| 6 | the plate's cut: 193 stations of 400 MW or more, 2.2 % of the sites, 54.5 % of the power; the reading line | **pull back** | the static plate, its key and its cut |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [
        "reveal by datum"
      ],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "count"
      ],
      "changes": [
        "level"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "count"
      ],
      "changes": [
        "largest",
        "level"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "filter",
        "zoom"
      ],
      "changes": [
        "subject",
        "zoom"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "count"
      ],
      "changes": [
        "level",
        "subject",
        "zoom"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "cut",
        "level"
      ]
    }
  ]
}
```

## Precision

- **Area is capacity**: a circle's radius is √(MW / 6,000 MW) times the largest station's radius, and the largest
  takes the radius the SVG beat gave it at the whole-map camera on a 1280 × 800 page (27.8 px). Every other camera and
  stage takes it through one zoom interpolation set at mount, growing by 2^(0.35 · Δzoom) — the SVG's gentle close-up
  growth. No frame sets a radius.
- **Largest first, with constant bindings**: the stations are split into 41 rank buckets (each of the ten largest
  alone, then ten per decade; the plate's cut, 193, and 1,000 are edges), each into nuclear and not. Between two
  cards each bucket fades in over its own staggered stretch, 45 % of the transition, overlapping its neighbours, so
  circles arrive one after another (a bucket's fade: 133 ms before, 617 ms median on a wheel trace). The stroke thins
  from 1.3 to 0.8 between 500 and 2,000 stations.
- **The scroll is followed, not jumped to**: the painted position eases toward the scroll (`reveal.mjs`, τ = 90 ms),
  so a wheel notch never moves the camera or the paint in one frame.
- **The counter counts what is drawn**: the same staggered arrivals, and the running share of the power from a
  cumulative sum computed in node.
- **The key states the scale at the camera the reader sees**, by the same radius rule, and grows with the close-up as
  the circles do; each key circle sits in a box of fixed height, so it never moves the stage.
- **The whole map holds every station**: the window runs north to 71.2° N; the circle sizes and the phone's close-up
  stay fitted to the window the owner approved (to 68° N), so on a phone nothing changed.
- **A phone keeps the largest station clear of the resting card**: on a stage taller than the study window the whole
  map sits at the bottom of the stage (`camAlignY: 1`); the close-up centres France's nuclear sites on both axes.
- **Every sentence is asserted**: the largest station is the Ukrainian 6,000 MW nuclear site at Zaporizhzhia's
  coordinates, a hundred stations are under 2 % of the sites and over a third of the power, most of them nuclear,
  nuclear is under 1 % of the sites and over 30 % of the power, the cut carries over half of it; the named station
  and every French nuclear site are in their card's view on a desktop and a phone stage.

- **Every page opened from disk has a live map**: each render writes `renders/<id>.local.html` with the key from the
  environment (git-ignored); the committed page keeps the placeholder.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "area-is-capacity",
    "largest-first-with-constant-bindings",
    "the-scroll-is-followed-not-jumped",
    "the-counter-counts-what-is-drawn",
    "the-key-states-the-scale-at",
    "the-whole-map-holds-every-station",
    "a-phone-keeps-the-largest-station",
    "every-sentence-is-asserted",
    "every-page-opened-from-disk-has"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "symbol-area-never-radius-alone-stays": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs` (live map).
