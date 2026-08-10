---
size: landscape
type: flow-map
---

# Beat — one river, nine territories, in the order the Danube reaches them

**Type:** flow / route map. **Medium/genre:** map / static. **Size:** landscape (1920 × 1080), over
a 900 × 420 baked plate (`plate/`, frozen beside this brief), one fixed camera holding the whole
course.

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. It used to say "Channel: article web",
checked by nothing, while the component carried its own `const FRAME = { width: 960, height: 780 }`
and the render script repeated the same two literals.

## What each size does with this geography

The plate is the FLATTEST in this corpus — 900 × 420, 2.143:1, over 23.7° of longitude — and the map
is drawn at the plate's own aspect at every size, never stretched and never cropped. What changes is
where the leftover goes.

| size | delivered | arrangement | the map | leftover |
| --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | **yes**, measured 1920 × 1080 from the PNG's own IHDR | title above, map left, legend beside it, caveat + credit below | 1015 × 474 | 735 px of width → 70 px gutter + a 665 px legend column |
| square 1080 × 1080 | refused | — | — | — |
| portrait 1080 × 1920 | refused | — | — | — |

**The going-in intuition was wrong, and the arithmetic says why.** A 2.143:1 plate looked like the
one shape in the corpus that would finally have height to spare in a tall frame. It does not, and
the reason is that a frame's flatness is not spent on the map — it is spent on TYPE. A 1920 px frame
is read in a ~900 px article column, so every token multiplies by 2.2 to clear the 26 px floor, and
this beat carries an unusual amount of text: a 205-character title that names all nine countries, a
470-character caveat that is where the "crossed is not flowed through" honesty lives, a two-line
source, and a nine-chip legend. Title + caveat + credit alone take **322 px of the 910 px band**
before a gap or the legend is drawn.

So what is actually left over at landscape is **width, not height**: a map bound by the band's height
is 1015 px wide inside a 1750 px content box. The 735 px that leaves is spent on the LEGEND, which
moves out of the vertical stack and into the column beside the map. Which arrangement is drawn is
MEASURED, not chosen per size — the beat lays out both and keeps whichever leaves the taller map —
and it is not a matter of taste: stacked, the legend fits one row and the map is **649 × 303**, which
is under the 677 px the nine numbered badges need before the closest pair TOUCH.

**Both refusals are the same refusal, and it is the type floor's, not the geography's.** The map
would fit at either tall size with room to spare: a 936 px-wide box gives a 936 × 436 map and hands
back 500 px of the band. What will not fit is this beat's own prose at a 36 px floor — the title
wraps to 7 lines, the caveat to 8, the credit to 5, which is **1 143 px of a 936 px band (square) or
an 835 px band (portrait)**, an overrun of 363 px and 464 px respectively *before* the nine-chip
legend or a single gap. Nothing in the removal ladder makes type smaller, and the caveat is the
sentence that keeps the claim honest, so it is not a line to drop.
`render.mjs --still --size square` reproduces the refusal with these numbers in it.

The badge floor comes **close** to refusing the tall sizes on its own, and it is worth recording that
it does not: at a 36 px floor a badge is 66 px across, so the nine of them need 926 px of plate width
— against the 936 px a 1080-wide frame offers when the map takes the ENTIRE content box and no
furniture is drawn at all. Ten pixels of margin, and only in a frame with nothing else in it. The
words are what refuse; the numbering merely would not have survived either.

**What is left over after that, and why nothing else goes in it.** The legend takes 192 px of the
474 px band, so about 280 px of the 665 px column is air. The obvious use for it is the caveat, and
that was swept rather than guessed: across every map width from 900 to 1400 px the column is never
tall enough for the legend *and* the caveat together — closest is a 1 050 × 490 map, where the column
still overruns by 34 px, and the map it would buy is 35 px wider than the one delivered. A narrower
column also costs the caveat lines faster than it saves the map height (at a 430 px column the caveat
wraps to 13 lines). The air stays, and it reads as the bottom margin of a legend rather than as a
missing block.

## The floor a route map is still a route map at — derived, not typed

`badgeFloor` in `FlowMapStill.tsx` is the guard the bigger frame made necessary. A badge holds a
numeral that must clear the size's legibility floor, so it is a fixed number of TYPE pixels across;
the distance between two anchors scales with the PLATE. The two move in opposite directions as the
map shrinks, and the numbering — which is this beat's entire claim — fails silently, with nothing
clipped and nothing colliding that any counter measures. The floor is read off this beat's own baked
anchors: the binding pair is **Hungary and Croatia, 75.8 px apart on a 900 px plate**, so a badge
`d` px across needs `d × 900 / 75.8` of plate width. At landscape that is 677 px against the 1015 px
delivered — cleared. Stacked it would have been 649 px, and the render refuses rather than ship nine
badges that read as six.

## The two tokens that moved, and why neither is a tuning

1. **The legend chip's order number, 9 px inside an 8 px-radius circle** — a shrunken copy of the
   badge it is the key to. `typeScaleFor` puts a beat's SMALLEST token on the size's floor, so a 9 px
   token would have set the whole beat's type scale to 2.89, which measures **1 010 px of furniture
   against a 910 px band**: this beat would have refused landscape as well, to protect a numeral
   nobody can read. The chip is now drawn at the badge's own size and with the badge's own numeral —
   the key and the mark it keys are one object.
2. **The caveat, 11.5 → 12.** The size table derives every row's `typeScale` from a smallest base
   token of 12, so a beat holding 11.5 misses every floor by construction and makes `typeScaleFor`
   invent 2.26 where the table says 2.2. Raising the token is the smaller change and keeps the beat
   inside the table's own arithmetic; the caveat renders at 26 px either way, so the delivered line
   is unchanged, and the 20 px of furniture it gives back is 23 px of map width.

Both are recorded rather than quietly applied because a base token is the beat's design, not a knob:
what is NOT allowed is the reverse move, shrinking type to make a layout fit.

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
