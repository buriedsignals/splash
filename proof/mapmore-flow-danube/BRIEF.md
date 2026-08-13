# Beat — one river, nine territories, in the order the Danube reaches them

**Type:** flow / route map. **Medium/format:** map / static. **Channel:** article web, over a
900 × 420 baked plate (`plate/`, frozen beside this brief), one fixed camera holding the whole
course.

## Claim

The Danube touches ten countries; nine of them are drawn here, numbered in the order the route first
reaches them — **Germany 1, Austria 2, Slovakia 3, Hungary 4, Croatia 5, Serbia 6, Romania 7,
Bulgaria 8, Ukraine 9**. The tenth, Moldova, has a frontage too short to register at this map's
resolution.

## Data

- Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines ("Danube" and "Donau"
  features, merged into one ordered path); territory shapes — Natural Earth 1:50m Admin 0 Countries.
- `danube-route.csv`: **911 points**, `seq, lon, lat`, `seq` running 0 → 910 with **no gap** (every
  step is exactly +1 — checked, because a route beat that silently skips a sample draws a straight
  line through a bend). Byte-identical to the route in `proof/mapgen-flowmap-video` and
  `proof/mapmore-scrolly-danube` (same md5).
- `countries.geojson`: 16 territories, including Moldova — so the Moldova claim is a real test
  against a real shape, not a shape that is missing.

## Exact values — computed 2026-08-09 by point-in-polygon over the frozen route and shapes

- Start (seq 0): **8.17921, 48.093533** — the Black Forest headwaters. End (seq 910): **28.747,
  45.23074** — the delta, at the Ukrainian border.
- **Crossing order, derived: Germany → Austria → Slovakia → Hungary → Croatia → Serbia → Romania →
  Bulgaria → Ukraine.** Exactly the nine named, in exactly the order printed.
- Route points falling inside each territory: Germany 249, Romania 174, Serbia 146, Hungary 115,
  Austria 106, Bulgaria 51, Croatia 39, Slovakia 27, Ukraine 4.
- **Moldova: 0 of 911 points.** The caveat's "does not register at this map's resolution" is
  measured, not assumed.
- **Zero** route points fall outside every territory polygon — the course never runs off the shapes
  it is being classified against.
- Length of the frozen polyline, great-circle sum: **2,567 km**. This is the generalised 1:10m
  course, shorter than the river's ~2,850 km surveyed length; the number belongs in the brief, not
  on the frame, precisely because it is a property of the file rather than of the river.

## Subject and accent

One accent, `#E69F00` (Okabe-Ito orange), reserved for the ROUTE and nothing else. The nine
territories take a separate categorical cycle (Tol's Muted set — indigo, green, olive, sand, rose,
wine, purple — with its two LIGHT COOL members replaced) that deliberately excludes the accent, so
the line can never be confused with a country. Numbered badges carry the order; colour does not have
to.

**Why two slots are not Tol's, measured rather than judged.** The fills are laid over the plate at
`fill-opacity` 0.45, and the wash pulls every hue toward the pale basemap — so a light cool hue lands
on the water tint. Tol's cyan `#88CCEE` composited to **11.06 ΔE76 from the Adriatic**, under half the
23.77 ΔE76 the bare basemap already puts between its own land and its own water: the paint made
Austria's coastline harder to read than no paint at all, and Austria came within 7.6 px of rendered
water at the Bodensee. Cyan cannot be rescued by opacity (11.06 at 0.42, 6.9 at 0.70) because it *is*
a water tint; Tol's pale teal needs 0.70 before it clears. Both were replaced by dark hues chosen by
running the measurement over a candidate pool — `#8B0000` and ColorBrewer PRGn's `#40004B` — which
improves every axis at once: nearest fill-to-water **11.06 → 24.47**, tightest pair **9.40 → 10.10**,
tightest pair under simulated deuteranopia/protanopia **5.10 → 8.39**, route accent still 58.0 ΔE76
from the nearest fill. The rule and the numbers live in `geo-flow.ts`
(`assertTerritoryFillsReadAsLand`, which fails the render rather than a test) and in
`geo-discipline.md` rule 7a.

**Known, unfixed, and stated because a reader can see it:** the crossed territories' fills are laid
over inland water as well as land, so the Bodensee, Balaton and Neusiedl render as darker patches of
their country's own colour rather than as lakes — measured at 13.7 ΔE76 from the fill they sit in
against 28.8 from open water. Closing it needs lake geometry baked beside the beat (rule 3), not a
colour change; the sibling dot-density beat closed the same defect by tinting instead of covering,
which this beat cannot do without putting the fills back under the water tint.

## Hierarchy of the proof

1. The single unbroken orange line, source to delta — the "one continuous line" of the title.
2. The nine numbered territories, in crossing order, so the sequence is readable without following
   the line.
3. The ordered legend, repeating 1–9 as a list for a reader who cannot trace badges on a map.
4. The caveat, which is where the honesty lives (see below).

## Anti-patterns for this case

- **"Crossed" is not "flowed through".** For long stretches — Slovakia–Hungary near Bratislava,
  Croatia–Serbia, Serbia–Romania, Romania–Bulgaria — the river IS the border, so a territory can be
  "touched" along its edge without the river ever entering its interior. The caveat says this; a
  route map that does not is quietly claiming more than a polyline can support.
- The order is each territory's FIRST entry along the route, not the distance travelled inside it.
  Bulgaria is 8th with 51 points; Germany is 1st with 249. Ranking by exposure would produce a
  different, equally defensible, and completely different-looking map — so the ordering rule is
  stated rather than implied.
- Do not smooth or simplify the course to make it prettier. The number of points is the resolution,
  and the resolution is what decides whether Moldova appears.
- Do not spend the accent twice. One route, one accent.

## Source line

`Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines ("Danube" and "Donau" features, merged into one ordered path); territory shapes — Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap`
