# Beat — eleven international organisations in and around Geneva (web)

**Type:** locator. **Medium/genre:** map / web. **Channel:** article web, one self-contained
`locator.html`, two SSR'd layouts over one 420 px baked plate (`bake-plate.mjs --size 420`), plus an
always-rendered table of all eleven organisations.

## Claim

Eleven international organisations are headquartered in and around Geneva, in three declared tiers —
4 UN-system agencies, 5 other intergovernmental bodies, 2 other international bodies — all inside
4.4 km of the city centre, with the World Economic Forum the one outlier to the east, in Cologny.

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

## Subject and accent

No single accent, by the type's own rule: a locator encodes position, and colour carries one
categorical variable only — `#0072B2` / `#E69F00` / `#009E73`, the same three Okabe-Ito hues as the
static sibling. Every marker is the same radius; the alt text says so explicitly ("eleven markers,
all the same size") because a reader's first instinct on a map of circles is to read area as value.

## Interaction

Hover, tap and keyboard focus all reach the same eleven markers and reveal the same string; nothing
argument-bearing is behind them. The title, the three-tier legend, the caveat, the source and every
marker are drawn unconditionally in the SSR'd SVG, so the claim survives with JavaScript off.

The table is the part that matters for this type. A map is spatial and a screen reader has no
spatial access, so the eleven rows — **name and category, in the same order as keyboard Home/End** —
are the non-visual route to the same content, always rendered, never a screen-reader-only trick.
It is also what fixes the static sibling's gap: on the static frame only 5 of 11 markers are
labelled, so the WEF that the caveat names by name has no visible label. Here every organisation is
named.

## Anti-patterns for this case

- Never size a locator's markers. There is no magnitude in this data.
- Two organisations 13 m apart (**computed: ILO ↔ International Social Security Association, 13 m**)
  land on the same pixel at city scale; left alone the last-drawn marker paints over the first and a
  reader sees one colour beside a label naming an organisation of the other tier. Two further pairs
  sit inside a marker width — WIPO ↔ EFTA 272 m, WTO ↔ AKDN 275 m. The separation pass is
  deterministic and order-stable so the same input always produces the same frame; the displaced
  positions are a legibility concession and not surveyed locations.
- A marker near the right edge must flip its label side from its PROJECTED pixel, not from its
  longitude — the WEF is this data's own case, and the plate width, not the data, decides.
- Do not gate the caveat behind interaction. "A locator marks position only" is the sentence that
  stops a reader inventing a magnitude, and it is drawn in the frame.

## Source line

`Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva · basemap © MapTiler, © OpenStreetMap`
