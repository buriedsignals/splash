---
size: landscape
type: flow-map
---

# Beat — the Danube drawn in its own direction of travel, nine territories in crossing order

**Type:** flow / route map. **Medium/genre:** map / static **and** map / video — two genres from one
directory, and after this migration they give two different answers. **Size:** landscape
(1920 × 1080), over a 940 × 420 baked plate (bounds `[6.3, 42.6] → [30, 50.1]`, 24.4° of longitude,
aspect 2.238 — the flattest plate in this corpus).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render-map.mjs` reads it with `readPinnedSize`. It used to say "Channel:
`render/flowmap.mp4`, 1080 × 1080", checked by nothing, while each component carried its own
`const FRAME` and `Root.tsx` repeated the same two numbers in its `<Composition>`.

## What each size does with this geography — and why the two genres disagree

The plate is FLAT (940 × 420 over 24.4° of longitude, 2.238:1), and the map is drawn at the plate's
own aspect at every size — never stretched, never cropped (`mapStageBox`). A flat plate is cheap in
height, which is the one thing a 16:9 frame is short of, so at every size here the map is bound by
HEIGHT and the leftover lands on the WIDTH axis. That leftover is what the caveat is put in.

The two genres read two different tables, and that is the whole story of this beat:

| genre | table | landscape floor | why |
| --- | --- | --- | --- |
| still | `chart-beat/sizes.mjs` | **26 px** | read in a ~900 px article column |
| video | `chart-video/sizes.mjs` | **30 px** | watched on a phone turned sideways, ~800 dp |

### The STILL — delivered

| size | delivered | the map | furniture | leftover |
| --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | **yes**, measured 1920 × 1080 from the PNG's own IHDR | 980 × 438 at (85, 455) | title 3 lines @ 51 px, key 1 row of 9 chips, caveat 8 lines @ 28 px, credit 2 lines @ 30 px | a 700 px column beside the map, which is where the caveat went |
| square 1080 × 1080 | refused | — | 1762 px of a 936 px band | −826 px |
| portrait 1080 × 1920 | refused | — | 1762 px of an 835 px band | −927 px |

Nothing is letterboxed at landscape: the 2.238 plate in a 1750 × 438 body is bound by height, so the
map takes 980 × 438 and the 700 px left on the other axis is the caveat's column. Moving the caveat
there rather than stacking it under the map is worth **246 px of map height** — measured: 980 × 438
beside, 625 × 279 stacked — and which arrangement is drawn is measured per size, not chosen.

Both refusals are the type floor's, not the geography's: at 36 px this beat's own words take 1762 px
(an 8-line title, a 3-row key, an 8-line caveat, a 5-line credit). The ladder was run — R3 down to
one sentence, then R7, the caveat entirely — and neither leaves an **880 px-wide** map, which is the
width at which this beat's two closest badges (Hungary and Croatia, 77.0 px apart in the 940 px
plate) stop overlapping. Below that the picture can no longer state the crossing order it exists to
state. `render-map.mjs --still --size square` reproduces the refusal with these numbers in it.

### The VIDEO — refused at all three, with its own arithmetic

The video's type was tuned at 1080 × 1080 at roughly HALF its own floor: a 15 px caveat on a 1080
frame is 5 CSS px on the 360 dp phone a social video is watched on. Raised to the floor it does not
fit, and the reason is not the caveat:

| size | budget | the four blocks NO rung may remove | left for the map | map floor |
| --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | 910 px | **885 px** — title 4 lines @ 60 px, key 2 rows, conclusion 2 lines, credit 3 lines | **25 px**, before the 5-line caveat is placed at all | 746 × 334 |
| square 1080 × 1080 | 936 px | 1944 px | −1008 px | 880 × 394 |
| portrait 1080 × 1920 | 835 px | 1944 px | −1109 px | 880 × 394 |

**The ladder cannot reach it.** R0/R1/R2/R4/R5 name furniture a map does not carry; R3 and R7 touch
only the caveat, which is already outside that stack (it lives in the column beside the map); and
nothing in the ladder makes type smaller. **R9.** `render-map.mjs --final-frame` reproduces it.

The key is not a droppable block here, which is why it is counted among the four: nine numbered
chips in crossing order ARE the claim this beat exists to make. Dropping it to buy 198 px would buy
the map by spending the argument.

**The residue, recorded rather than hidden.** `render/flowmap.mp4` is the PRE-MIGRATION artifact:
1080 × 1080, 326 frames, from a composition id (`flowmap-video`) that no longer exists. It cannot be
re-rendered — the migrated component refuses at all three table sizes — and it is kept only because
`skills/splash/test/beat-genre-produces-artifact.test.ts` requires a beat carrying a `*Video.tsx` to
ship a non-empty `.mp4`, and that guard has no residue row to add one to. Its four extracted frames
(`final-frame.png`, `frame-early/mid/hold.png`, all 1080 × 1080) were removed, because a pinned beat
must deliver PNGs that measure its pin and those cannot.

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

## Reveal order — this is the beat, and after the migration it is the beat that does not ship

The edit below is unchanged and still contract-checked; what changed is that no size on the video
table has room to draw it (see the refusal table above). The still ships the same nine badges in the
same order, statically — the sequence is what is lost, not the claim.

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
