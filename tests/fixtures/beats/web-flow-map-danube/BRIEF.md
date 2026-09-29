# web-flow-map-danube — brief

Type: `flow-map` · sheet: `skills/map-web/references/types/flow-map.md` ·
static sibling: `mapmore-flow-danube` · pattern: `proof/web-choropleth-europe-lowcarbon`

## The one thing this map proves

**« Le Danube traverse ton pays » veut dire trois choses différentes, et elles ne désignent pas le
même pays** — le plus long Danube en propre est allemand, le plus long Danube-frontière est roumain,
et le pays le plus dense en Danube est la Serbie.

The still sibling cannot prove it. `mapmore-flow-danube` draws one unbroken orange line and numbers
the nine territories in the order the river first reaches them — and its own brief states, as an
anti-pattern rather than as a picture, that *« "crossed" is not "flowed through" »* and that *ranking
by exposure would produce a different, equally defensible, and completely different-looking map.*
That is a whole second map living in a paragraph. The web format is where it stops being a caveat.

## The gesture — argued BEFORE any code

**What the author otherwise decides in silence: what a kilometre of Danube COUNTS AS.**

Every one of the nine territories has a number of kilometres of Danube. Three honest ones, actually,
and a still can print only one of them into a width:

- **En propre** — the stretch where the river is inside the country and shared with nobody. 523,6 km
  for Germany; 25,2 km for Slovakia.
- **En frontière** — the stretch where the Danube *is* the border with another Danube country, so two
  states count the same water. 256,5 km for Romania; 175,8 km for Bulgaria, which is 83 % of the
  Bulgarian Danube.
- **Pour 1 000 km² de territoire** — how much Danube a country has for its own size. 5,04 for Serbia;
  0,02 for Ukraine.

The lead changes hands on all three: **Allemagne → Roumanie → Serbie.** That is not an artefact of
this beat's framing, it is the subject: a river is a length, a frontier and a density at once, and
which of the three a reader is looking at was, until now, a decision the map made for them without
saying so.

**Which vocabulary spends it: `skills/map-web/assets/live-flow.ts`**, the sheet's own — the reader
picks what the width is divided by. The sheet writes that gesture for an origin-destination FAN, and
this is a route, so what carries over is the mechanism and the argument, not the wording: there is no
second *place* to divide by here, there is a second *sense* of the same kilometre. The width law
(width ∝ value, anchored on the largest), Minard's fourth rule (a band too thin to see is counted and
not drawn), the one-vocabulary slug, the CSS half and the `setPaintProperty` half — all of it
transfers unchanged, and none of it decides what this beat argues.

**No filter.** The test in the discipline file fails here: nine territories in one ordered sequence
is not a set with an orthogonal subsetting dimension, and hiding any of the nine would hide part of
the claim. The unfiltered, untouched state already shows every stretch the title counts.

**The opening state is `en propre`**, and it is not the sum. A total-kilometres measure would crown
Romania twice (total and frontier), so the control would have a state that changes nothing, and the
reading a reader takes from a route map at rest — *the Danube is Germany's, then Austria's, then…* —
is already the "en propre" reading said out loud. Opening there means the picture at rest disagrees
with the reader's own eye immediately: **Romania draws the longest band and Germany the widest one.**
That tension is the claim, and it is fully present with nothing touched.

## The camera

Window `7,2°–29,8° E, 42,8°–49,9° N`, declared in `camera.ts` and held by `bake.mjs`.

- **What it holds whole: the course.** All 911 frozen points, 8,18°–28,75° E and 43,65°–49,03° N. A
  route whose window cuts it draws a river that leaves the frame and comes back — a claim the
  polyline does not make. Measured against the DECLARED window, never against the frame, which
  overshoots longitude to 6,0°–31,0° because latitude binds first.
- **What it deliberately does not hold whole: the nine territories.** Germany reaches 54,9° N,
  Ukraine runs 1 500 km east of this box. A choropleth's camera must hold its units whole because its
  marks *are* the units; this beat's marks are nine stretches of one river, and the territories are
  the ground beneath them. Holding them whole would cost more than half again the longitude, all of
  it ground with no river on it.
- **Why this projection.** The page draws in flat Web Mercator (ruling R1, and « oui une carte
  MapLibre plate pas un globe »). It MEASURES in Lambert azimuthal equal-area centred at 46° N 19° E,
  the middle of the basin: two of the three measures are great-circle lengths and the third divides
  one by a spherical area. A per-1 000 km² figure computed on a Mercator area would be a number about
  the page, and Serbia's lead would go to whichever territory sits furthest north.
- **What Mercator costs THIS subject, printed on the page.** Not an area (a choropleth's cost) and
  not the arms of a fan: the cost falls on the LENGTH OF THE COURSE, unevenly along it. Drawn ground
  scale runs as 1/cos(latitude), and the Danube descends from 48,1° N at the spring to 43,7° N at the
  Iron Gates — so the **German stretch is drawn 1,088 times longer per real kilometre than the
  Bulgarian one**, derived on every render from the beat's own 911 points and refused if it stops
  being true. It matters here more than on most types because the opening measure is a length and the
  drawn length is the first thing a reader reads off a route.

## The two layers

1. A **live MapTiler map** (`dataviz-light`, tinted by the direction), flat Mercator, with MapTiler's
   own zoom, pan, wheel and keyboard, leashed to the fit: `minZoom` is the zoom the camera fitted at,
   so the whole course is always on screen, and the ceiling is derived from the **shortest stretch the
   map draws** — Ukraine's 0,087° of drawn extent, the two ends a reader zooms in to tell apart.
2. A **frozen fallback**, photographed from this page's own live map and embedded as a data URI.

With JavaScript off, offline, behind a CSP that refuses `api.maptiler.com`, or after a key lapses,
the reader still gets: the frozen picture of all nine stretches at the opening widths, the width key
in kilometres, the title, the derived claim naming all three leaders, the caveat with the Mercator
number, and the full nine-row table whose width samples and ranks follow the chosen measure **in pure
CSS**. What is lost is the map's own re-widening — no stylesheet reaches a MapLibre layer — and the
reading line says so on the page.

The key never enters a committed file: the pages carry `__MAPTILER_KEY__`, and the runner writes the
keyed `renders/<id>.local.html` beside them, git-ignored.

## The reader who cannot see the shape

**The table is ON.** A hover tooltip is not an answer to a spatial medium — it has to be found first,
which is exactly the access this reader does not have. And on this beat the table is not a fallback at
all: it is the **only place the gesture survives without script**, because the map's half is
`setPaintProperty` and the table's half is `:has()`. Nine rows is also cheap — the ruling that
collapsed every map table into a native `<details>` costs this page 34 px of summary, not four
thousand pixels of rows.

Rows are in the **river's own order** (first entry along the course: Allemagne 1 … Ukraine 9), which
is the still sibling's own rule and the one order a route has. The RANK cell is what moves: three
spans in one grid cell, of which the stylesheet reveals one, so the ranking inverts completely between
the three measures and **no row moves** to say so.

## The refusals

Markup half, asked of the file read back off disk:

- `assertOneMeasure` — one radio group, one default, every measure's own `data-flow-var` and
  `data-stack-note`, every territory's own sample in the table.
- the nine territories are exactly the nine the route crosses, in entry order, and Moldova — 0 of 911
  points — is named in the caveat rather than silently absent.

Live half, asked of the same file's plan:

- `assertMeasuresReachTheLayers` — the plan's per-measure `line-width` expressions rebuilt from the
  RAW kilometres, not read back from the markup.
- the three leaders are distinct, or the title and the three sentences are false and the render is
  refused.
- the Mercator stretch spread is above 1,05, or the caveat's sentence is false and the render is
  refused.

## Verification

- [x] `bun proof/web-flow-map-danube/render-directions-web.mjs` — three directions, none refused
- [x] the keyed `.local.html` copy opened and DRIVEN: pan, zoom, hover, Tab, the gesture
- [x] screenshotted at 1600 / 1024 / 768 / 375 and LOOKED AT — a computed value can lie
- [x] JavaScript off: the fallback stands, complete
