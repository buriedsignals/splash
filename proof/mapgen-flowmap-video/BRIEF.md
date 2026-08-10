# Beat — the Danube drawn in its own direction of travel, nine territories in crossing order

**Type:** flow / route map. **Medium/genre:** map / video. **Channel:** `render/flowmap.mp4`,
1080 × 1080, 30 fps, **326 frames = 10.87 s**, over a 940 × 420 baked plate; a static frame from the
same component family ships alongside it (`render/static.png`).

## Claim

The Danube touches ten countries; nine are drawn, and the video's whole reason to exist is that they
arrive **in the order the river reaches them** — Germany, Austria, Slovakia, Hungary, Croatia,
Serbia, Romania, Bulgaria, Ukraine. The tenth, Moldova, has a frontage too short to register at this
resolution.

## Data

- Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines ("Danube" and "Donau",
  merged into one ordered path); territory shapes — Natural Earth 1:50m Admin 0 Countries.
- `danube-route.csv`: **911 points**, `seq` 0 → 910, strictly consecutive with no gaps — the
  property the motion depends on, since a hole in `seq` would make the line jump.
- `countries.geojson`: 16 territories, Moldova included.

## Exact values — computed 2026-08-09 from the frozen route and shapes

- Start (seq 0) **8.17921, 48.093533** (Black Forest); end (seq 910) **28.747, 45.23074** (the delta
  at the Ukrainian border). Polyline length **2,567 km** at this generalisation.
- **Derived crossing order: Germany → Austria → Slovakia → Hungary → Croatia → Serbia → Romania →
  Bulgaria → Ukraine** — the nine named, in the order printed on the frame.
- First route index inside each: Germany 0, Austria 249, Slovakia 355, Hungary 371, Croatia 497,
  Serbia 506, Romania 639, Bulgaria 722, Ukraine 898.
- **Moldova: 0 of 911 points** — the caveat is a measured result.
- Route points inside no territory at all: **0**.

## Subject and accent

One accent, `#E69F00`, on the route and nothing else; the nine territories use a separate
categorical cycle that excludes it, so the line stays distinguishable from every fill it crosses.
Numbered badges carry order, colour does not.

## Reveal order — this is the beat

30 fps, 326 frames. `establish` 0–26 (title, source) → `reference` 32–52 (the empty territories and
the legend, the ground the route will be measured against) → **`reveal` 58–228**, the long event:
170 frames, 5.7 s, the line drawing itself from the Black Forest to the delta in `seq` order, with
each territory's fill and badge arriving as the line first reaches it (`territoryArrivalProgress`,
a 4.5% window of the route per territory, so a country appears when the line gets there and not
before) → `subject` 234–254 → `conclusion` 260–286 → `hold` 286–326 (1.33 s of stillness).
Contract-checked; `hold` ends exactly at frame 326.

The order of arrival is the argument. A static frame can print 1–9 as badges; only the video makes
the sequence something a reader receives rather than decodes — which is the honest test of whether
this beat should have been a video at all, and here it passes.

## Anti-patterns for this case

- **Never let a territory's fill arrive before the line reaches it.** Arrival is gated on the
  route's own progress, not on a per-country timer — otherwise the motion tells a different story
  from the geography.
- "Crossed" is not "flowed through". For long stretches (Slovakia–Hungary near Bratislava,
  Croatia–Serbia, Serbia–Romania, Romania–Bulgaria) the river IS the border, so the route runs along
  an edge, not through an interior. The caveat carries this and holds through the entire hold.
- The order is each territory's FIRST entry, not the distance travelled inside it (Bulgaria's 51
  points against Germany's 249). Say which rule is in force.
- Do not animate the camera. One fixed frame holds the whole course; a flying camera would make the
  route's own progress unreadable, because two things would be moving at once.
- Do not smooth the course to make the motion prettier — the resolution decides whether Moldova
  appears at all, and hiding that behind a spline would erase the caveat's evidence.

## Source line

`Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines ("Danube" and "Donau" features, merged into one ordered path); territory shapes — Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap`
