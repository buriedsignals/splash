# Beat — what the world wrote down about rabies in 2024 (web)

**Type:** choropleth. **Medium/format:** map / web. **Channel:** article web, one self-contained
`renders/reported-rabies-deaths-2024.html`, plus an accessible table of all 194 readings behind the
disclosure ruling B5.2 requires on every map page.

**reading: raw.** The number on this map is a count of forms filed with WHO, not a rate. The frozen
table carries no population column, and the profile's own `denominatorNotInThisTable` note says a
panel published one indicator per file keeps its denominator elsewhere. This beat does not go and
get one, and the reason is editorial rather than lazy: dividing an acknowledged under-report by a
population would produce a per-capita rabies death rate wrong by roughly a factor of twenty, which
neither WHO nor any ministry has ever claimed. The caveat on the page says "raw counts of people,
never a rate" in those words.

## Claim

WHO's own fact sheet states an estimate — *"Globally there are an estimated 59 000 deaths from
rabies annually; however, due to underreporting, documented case numbers often differ from the
estimate."* The register states the other half. For 2024, 195 countries appear in WHO's own row:
**57 reported at least one death, 44 reported zero, and 94 filed nothing at all.** The 101 that filed
a number reported **3 021** deaths between them. India, which reported 395 in 2023 and 971 in 2015,
is one of the 94; so are China and Pakistan.

The map states which countries wrote something down. It does not state where rabies is.

## Data

- Source: WHO Global Health Observatory, indicator `NTD_RAB2`, "Reported number of human rabies
  deaths", downloaded 23 August 2026 from `https://ghoapi.azureedge.net/api/NTD_RAB2`. The frozen
  payload is 2 919 country-year rows, 2010–2024, WHO-stamped 9 September 2025.
- The publisher's documented CSV endpoint (`apps.who.int/gho/athena/data/GHO/NTD_RAB2.csv`) returns
  an HTML shell rather than a CSV. The OData endpoint is what a journalist can actually use.
- Shapes: Natural Earth 1:50m Admin 0 Countries, joined on `ADM0_A3`, never `ISO_A3`.
- Names: WHO's own `DIMENSION/COUNTRY` table, frozen beside the data. Not Natural Earth's `NAME`,
  which is a cartographic abbreviation ("Dem. Rep. Congo").

## The three silences, declared

`JOIN.json`, written by `prepare-inputs.mjs` and read back by `checkClaim`:

| Silence | Count | What was done |
| --- | ---: | --- |
| Countries whose 2024 cell reads `No data` | 94 | Declared as `expectedNoData`, painted with the derived no-data surface, named in the caveat with India, China and Pakistan spelled out |
| Aliases needed | 1 | `SSD` → `SDS`. South Sudan reported 249, the fourth-highest count in the file; unaliased it renders as no-data and looks entirely legitimate |
| Readings that land on no shape at all | 1 | French Guiana reported 3 and Natural Earth folds it into France, which itself filed nothing. Those 3 are drawn nowhere. Declared in the caveat, and the register's 3 021 and the map's 3 018 are carried as two separate numbers |

## Exact values — 2024, human rabies deaths reported to WHO

| Rank | Country | Reported |
| --- | --- | ---: |
| 1 | Afghanistan | 641 |
| 2 | Philippines | 425 |
| 3 | Ghana | 265 |
| 4 | South Sudan | 249 |
| 5 | Democratic Republic of the Congo | 221 |
| 6 | Kenya | 205 |
| 7 | Ethiopia | 195 |
| 8 | Indonesia | 122 |
| … | 44 countries | 0 |
| — | 94 countries | no return filed |

Class breaks `[1, 5, 25, 100, 250]`, six classes, counts 44 / 24 / 16 / 9 / 5 / 3. Round numbers in
the data's own unit, not quantiles that move when one country files late.

## Subject and comparison

One sequential ramp. The subject is **Afghanistan**, outlined in the accent, the highest reading.
The comparison is **India**, outlined in ink — and India has **no value at all**. That is the point
of the beat and it is what the shipped component could not express: it required both ends of the
claim to carry a joined value. Changed here, with the measurement in the file.

## Interaction

The frame carries the whole claim before any interaction: title, legend with its six classes and its
no-data swatch, both callouts, the caveat, the source, and all 194 shaded countries are in the SSR'd
fallback. Driven at 1600×900, 2990×1718 and 375×812, live and with the script off.

**Pan and zoom.** MapTiler's own NavigationControl. `minZoom` is the fitted zoom, so the reader
cannot pull back past the view the title claims; the leash allows 5.54 zoom levels in, derived from
the smallest region this beat draws.

**Where the pointer lands.** Live, the hit area is the rendered fill and a reader gets a country's
value on entering it. In the fallback the 28px buttons are the target, and on a world camera they
bury each other: 68 of 160 at 1600px, 158 of 160 at 375px. **Afghanistan — the subject of this beat —
is one of the buried ones in the fallback**: a real pointer at the centre of its own button opens
Pakistan's tooltip at 1600×900 and Uzbekistan's at 375×812. Accepted knowingly, with the reasons in
`APPROVED.md`: live, which is what a reader gets, Afghanistan answers correctly; and its number is
printed under the map in the accent, so nothing this beat claims depends on that hover.

**Marks with no pointer path.** 33 of 194 at 1600px and 78 at 375px by the production-time count,
50 of 194 measured live at 1600×900. The keyboard and the table are their only path, and both carry
every one of them — `marksStrandedWithNoChannel` returns no unreachable mark at any width.

**No filter.** The 194 countries have one natural subsetting dimension (WHO's six regions), but the
unfiltered view already shows the whole claim and narrowing it would move argument-bearing content
behind an interaction. `map-web/SKILL.md`'s own test does not pass here.

The table is the non-visual route, one row per country, named, largest first, with `No data` written
in words for the 94 — a screen-reader user hears the silence rather than inferring it from a colour.

## Anti-patterns for this case

- **A count on a choropleth is normally a lie of area, and here it is not** — because the quantity
  being mapped is an administrative act, not a risk. The title says "wrote down". A reader who takes
  this as a map of rabies has been misled by the subject, not by the encoding, which is why the
  caveat's first four words are "REPORTED deaths, not deaths."
- **Grey is not zero.** Two states that a careless choropleth merges. They are drawn as two things,
  labelled as two things in the legend, and separated in words in the caveat and the table.
- Six classes, not a continuous ramp a reader must interpolate by eye.
- Do not gate either end of the claim behind hover. Both are printed under the map.

## Source line

`World Health Organization, Global Health Observatory — NTD_RAB2, "Reported number of human rabies deaths" (retrieved 23 August 2026) · shapes: Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap`
