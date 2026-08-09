# Beat — eleven international organisations, three tiers, inside 4.4 km of central Geneva

**Type:** locator. **Medium/genre:** map / static. **Channel:** article web, 900 × 560, over a
496 × 496 baked plate (`bake.mjs --size 496`, bounds `[6.09, 46.165] → [6.225, 46.26]`).

## Claim

Eleven international organisations are headquartered in and around Geneva, and they fall into three
declared tiers — 4 UN-system agencies, 5 other intergovernmental bodies, 2 other international
bodies. Every one of them sits within 4.4 km of the city centre; the UN-system four cluster north
of the map's own centre of mass, and the World Economic Forum is the single outlier to the east.

## Exact values — computed 2026-08-09 from `geneva-orgs.csv` (11 rows)

| Tier | n | Members |
| --- | --- | --- |
| UN system | 4 | UN Office at Geneva, WHO, ILO, WIPO |
| Other intergovernmental | 5 | WTO, EFTA, Inter-Parliamentary Union, Int'l Civil Defence Org., Int'l Social Security Association |
| Other international body | 2 | World Economic Forum, Aga Khan Development Network |

- Extent: lat 46.191865 → 46.233535, lon 6.121882 → 6.191689. Northernmost WHO, southernmost the
  International Civil Defence Organisation, easternmost the WEF, westernmost the IPU.
- Distance from central Geneva (46.2044, 6.1432), great-circle: **maximum 4.39 km** (WEF, in
  Cologny) — so the source line's "within 6 km of central Geneva" holds for all eleven, with the
  farthest point at 73% of that radius. Next farthest: IPU 3.38 km, WHO 3.31 km.
- Mean latitude of the UN-system four is 46.22792 against 46.22336 for all eleven — the blue tier
  really does sit north of the set's own centre, by 0.0046° ≈ **510 m**, which is what the alt's
  "cluster … in the north" rests on. It is a 510 m offset, not a separate quarter: WIPO (46.22207)
  is south of three of the orange markers.
- No two rows share a coordinate; every row carries a Wikidata QID.

## Subject and accent

There is no single accent here, and that is the type's own discipline: a locator encodes POSITION,
nothing else. Colour carries one categorical variable — three Okabe-Ito hues, `#0072B2` UN system /
`#E69F00` other intergovernmental / `#009E73` other international body — and every marker is drawn
at the same radius (measured in `render/static.svg`: eleven circles, all `r="5"`), so size cannot be
mistaken for a value. Draw and label order come from a declared `priority` derived from category
rank then alphabetical name, never from the file's own row order.

## Hierarchy of the proof

1. The three-tier legend — the only key a reader needs, since colour is the only encoded variable.
2. The northern cluster of blue markers around the Palais des Nations — the "international quarter"
   the title names.
3. The WEF marker to the east, the one point that breaks the cluster, called out in the caveat by
   name because a reader will otherwise read it as an error.

## Anti-patterns for this case

- Never size a locator's markers by anything. There is no value in this data to size them by, and a
  reader reads area as magnitude whether or not one is intended.
- Do not let two organisations that are metres apart paint over each other. **Computed: the ILO and
  the International Social Security Association are 13 m apart**; at this plate's scale (10.40 km of
  longitude across 496 px = **21.0 m/px**) that is 0.6 px, against a marker radius of 5 px — one
  would be drawn entirely inside the other. Two more pairs are inside a marker width: WIPO ↔ EFTA
  272 m (13 px) and WTO ↔ AKDN 275 m (13 px). `separateOverlappingMarkers` nudges exactly those
  three pairs, and the rendered SVG shows all three sitting **14.0 px** apart afterwards — about
  294 m of drawn distance for organisations 13 m apart. That displacement is a legibility
  concession, and no reader may treat a locator marker as a surveyed position.
- Do not put a right-hand label on a marker near the right edge — the WEF is this data's own case,
  and `labelSide` flips it from the projected pixel, not from the coordinate.
- A coordinate is not an address. Every point is the organisation's own Wikidata point; the caveat
  says so rather than implying doorstep precision.

## Known gap, stated rather than hidden

The static frame labels **5 of the 11 markers** (ILO, UNOG, WHO, WIPO, ICDO — counted in
`render/static.svg`); the other six are drawn but unnamed, which is the declutter working. But the
alt text and the caveat both name the **World Economic Forum**, and the WEF is one of the six with
no label on the frame — so a sighted reader cannot find in the picture the marker the words single
out. The web sibling (`proof/mapgen-locator-web`) closes this by shipping all eleven names in a real
table; the static genre has no such surface, and the honest options are to label the WEF or to stop
naming it in the furniture.

## Source line

`Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva · basemap © MapTiler, © OpenStreetMap`
