# Beat — eleven international organisations in and around Geneva (web)

**Type:** locator. **Medium/genre:** map / web. **Channel:** article web, one self-contained
`locator.html`: a LIVE MapTiler map (ruling R1) over one 420 px baked plate
(`bake-plate.mjs --size 420`) kept as the script-free fallback layer, one HTML overlay of names and
hit targets, and an always-rendered table of all eleven organisations. One render, no second layout
— the two SSR'd `WebLayout` frames this beat used to ship were removed with B5.1.

## Claim

Eleven international organisations are headquartered in and around Geneva, in three declared tiers —
4 UN-system agencies, 5 other intergovernmental bodies, 2 other international bodies — all inside
4.4 km of the city centre. Nine sit within 1.3 km of their common centre; **two** stand apart from
that cluster, and they are not the same colour: the World Economic Forum (green) 4.18 km east, and
the International Civil Defence Organisation (orange) 4.00 km south.

*Corrected 2026-08-09.* This line used to read "with the World Economic Forum the one outlier to the
east, in Cologny", and the rendered alt said the orange tier was "nearby". Both were false of the
delivered picture: by distance to its own nearest neighbour the ICDO is the MOST isolated marker on
this map (3.317 km, against the WEF's 3.252), and it is orange. Separation is now derived — every
marker's nearest-neighbour distance, sorted, split at the single largest gap in that sorted list
(2.290 km wide here, five times the next largest, putting exactly two markers on the far side) — and
the caveat and alt are built from it. See `proof/map-geneva-locator/BRIEF.md` for the full table;
the two beats share this csv byte for byte and now share the derivation.

## Exact values — computed 2026-08-09 from `geneva-orgs.csv` (11 rows, byte-identical to `proof/map-geneva-locator/geneva-orgs.csv`)

- Tiers: UN system 4 (UNOG, WHO, ILO, WIPO) · Other intergovernmental 5 (WTO, EFTA, IPU, ICDO,
  ISSA) · Other international body 2 (WEF, AKDN).
- Great-circle distance from central Geneva (46.2044, 6.1432): **maximum 4.39 km** (WEF), then IPU
  3.38 km, WHO 3.31 km — the "within 6 km" in the source line is true with room to spare.
- UN-system mean latitude 46.22792 vs 46.22336 across all eleven: the blue tier sits **≈ 510 m**
  north of the set's own centre of mass. That is the whole of "cluster … in the north" — a real but
  small offset, not a separate district.
- The rendered `locator.html` carries **11 table rows**, one per organisation, name and category —
  counted in the committed file, not assumed.
- Closest pair: **ILO ↔ International Social Security Association, 13.3 m** — 0.53 px at the bake's
  own 25.18 m per pixel, which is why the live camera and its derived headroom exist.

## Subject and accent

No single accent, by the type's own rule: a locator encodes position, and colour carries one
categorical variable only — `#0072B2` / `#E69F00` / `#009E73`, the same three Okabe-Ito hues as the
static sibling. Every marker is the same radius; the alt text says so explicitly ("eleven markers,
all the same size") because a reader's first instinct on a map of circles is to read area as value.

## Interaction

Hover, tap and keyboard focus all reach the same eleven markers and reveal the same string; nothing
argument-bearing is behind them. The title, the colour key, the caveat, the source and every marker
are drawn unconditionally, so the claim survives with JavaScript off, offline, and after a MapTiler
key is rotated — that state is the baked plate, complete, with the table under it.

**The map is live, and for this beat that is the point rather than a feature** (ruling R1,
2026-08-10). `AUDIT-W5-W6-map.md` §4.2 measured the delivered page drawing **3 labels for 11
organisations** while the family's video title says "All 11". The cause is not the label rule: the
closest pair — the ILO and the International Social Security Association — is **13.3 m apart, which
is 0.53 px** on this beat's own plate. No declutter separates two names that share a pixel; only a
camera can. So every one of the eleven is an anchor in the live plan, the names and hit targets
follow the camera, and the declutter is re-run against the boxes the browser actually measured at
every camera move. Measured on the delivered file, driven with a real key:

| view | labels a reader can read |
|---|---|
| the baked plate, script-free (was the whole beat) | **3 of 11** |
| live, fitted view, 1600×900 | **8 of 11** |
| live, fitted view, 375×812 | 4 of 11 |
| live, zoomed onto the 13 m pair | **both**, 24 px apart |

**The reader's leash is derived, not picked** (`render-web.mjs`'s `separationHeadroom`): the zoom at
which that closest pair's two painted discs stop overlapping is 4.666 zoom levels above the bake's
own, so that is the floor the plan carries — measured on the delivered page as a fitted 11.921 →
maximum 16.587 at 1600×900 and 11.253 → 15.919 at 375×812. Panning is bounded to the view the camera
fitted to: asked for Lausanne (6.63°E), the map stops at 6.23°E.

The table is still the part that matters for this type. A map is spatial and a screen reader has no
spatial access, so the eleven rows — **name and category, in the same order as keyboard Home/End** —
are the non-visual route to the same content, always rendered, never a screen-reader-only trick, and
never narrowed by anything the map is not narrowed by. Whether it should be more compact than eleven
full rows is B5.2, an open question for the owner; this beat does not answer it.

The three-tier legend and the category filter are ONE control: each chip carries its category's own
swatch, so the colour key is drawn unconditionally (it reads with JavaScript off and with `:has()`
unsupported) and narrowing the map, its labels, its hit targets and the table is one radio away.

## Anti-patterns for this case

- Never size a locator's markers. There is no magnitude in this data.
- Two organisations 13 m apart (**computed: ILO ↔ International Social Security Association, 13 m**)
  land on the same pixel at city scale; left alone the last-drawn marker paints over the first and a
  reader sees one colour beside a label naming an organisation of the other tier. Two further pairs
  sit inside a marker width — WIPO ↔ EFTA 272 m, WTO ↔ AKDN 275 m. The separation pass is
  deterministic and order-stable so the same input always produces the same frame; the displaced
  positions are a legibility concession and not surveyed locations.
- A marker near the right edge must flip its label side from its PROJECTED pixel, not from its
  longitude — the WEF is this data's own case, and the plate width, not the data, decides. Live, the
  projected pixel changes with every pan, so the side is re-decided from the camera rather than
  replayed from the plate.
- Never size a locator's marker from the camera either. A pin is not a measurement: it holds the
  same screen size at every zoom (`radius: "fixed"`), because there is no magnitude for a growing
  circle to encode.
- Do not gate the caveat behind interaction. "A locator marks position only" is the sentence that
  stops a reader inventing a magnitude, and it is drawn in the frame.

## Source line

`Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva · basemap © MapTiler, © OpenStreetMap`
