# Geography anywhere — what it would take for Splash to draw any zone on earth

Research + decision document. 2026-07-28. **Untracked, not committed.** No product code was written.

Every size in this document was **measured on this machine** unless marked *(cited)*. Every licence was
**read on its page and quoted**, not recalled. Where something is uncertain it says so, and says what
would settle it.

---

## 1. The requirement

The owner's ask, in two passes:

> « Il faut pouvoir faire des maps de n'importe où sur terre — le monde entier, la Suisse, la
> Thaïlande, l'Argentine, ou plus ou moins large. »

then the correction that changes the shape of the answer:

> not just cantons or provinces — **every level, and any zone one might need.**

So the target is: ADM0 countries · ADM1 states/provinces · ADM2 districts · ADM3–5
municipalities/communes — **and** zones that are not administrative at all: electoral districts,
postal-code areas, school catchments, police precincts, hospital regions, a newsroom's own custom
zoning for one investigation.

**Read literally, that requirement cannot be satisfied by shipping a dataset.** No global dataset
contains a newsroom's own zoning of Annemasse, and none ever will. The question therefore has to stop
being *"which dataset do we ship"* and become **"how does geography ENTER a run"**. Shipped sources
become a convenience layer covering the common cases; they stop being the ceiling.

### Where Splash is today (measured)

`skills/map-native/src/basemaps.ts` is the whole registry — **two entries**:

```ts
export const BASEMAPS: Record<string, BasemapMeta> = {
  world: { joinKey: "iso_a3", label: "World countries (ISO-A3 codes)" },
  "us-states": { joinKey: "postal", label: "US states (2-letter postal codes)" },
};
```

- `assets/geo/world.geojson` — 4 045 883 B, **241 features**, Natural Earth **admin-0 @ 1:50m**
  (per `assets/geo/README.md`), 63 properties per feature. 6 features carry `iso_a3 = "-99"`
  (Kosovo, Somaliland, N. Cyprus, Siachen Glacier, Ashmore and Cartier Is., Indian Ocean Ter.) —
  i.e. they are unjoinable by the registry's own join key.
- `assets/geo/us-states.geojson` — 89 112 B, 52 features, 2 properties (`name`, `postal`).

`docs/splash/capability-matrix-2026-07-28.md` §L1 already names the consequence:

> every map form Splash can offer is a form it can only actually build for world countries or US
> states. A Swiss cantonal choropleth — the pilot's own subject, Annemasse — is not in the matrix at
> all, and this limit is why.

**And a second, unstated cost, measured here.** `ChoroplethMap.tsx` statically imports *both*
geojson files via Vite `?raw`, so `vite-plugin-singlefile` inlines **both, in full, into every map
artifact, whatever it draws**. Measured across 40+ built artifacts in
`skills/map-native/dist/*/index.html`:

| | bytes |
|---|---|
| every map-native interactive artifact | **~5 950 000** (5.95 MB), ~1.60 MB gzipped |
| of which geodata (`world` + `us-states`) | ~4 135 000 (69%) |
| of which app + MapTiler SDK | ~1 815 000 |

Confirmed by content: a built artifact contains `iso_a3` 248 times — **all 241 country features are
present** in an artifact that may colour 26 of them. A Swiss cantonal map, once possible, would ship
the planet to draw Switzerland.

---

## 2. The candidate sources, and their licences

The licence question is decisive: Splash ships MIT, and it **inlines the geometry into the artifact
it hands a newsroom**. That is redistribution, and it is redistribution to a party that MIT tells
"you may use this for any purpose, including commercially". Splash cannot sub-licence what it does
not have.

### 2.1 Natural Earth — PUBLIC DOMAIN. Usable. ✅

https://www.naturalearthdata.com/about/terms-of-use/ , read 2026-07-28:

> "All versions of Natural Earth raster + vector map data found on this website are in the public
> domain. You may use the maps in any manner, including modifying the content and design, electronic
> dissemination, and offset printing. The primary authors, Tom Patterson and Nathaniel Vaughn Kelso,
> and all other contributors renounce all financial claim to the maps and invites you to use them for
> personal, educational, and commercial purposes.
>
> No permission is needed to use Natural Earth. Crediting the authors is unnecessary.
>
> However, if you wish to cite the map data, simply use one of the following.
> Short text: Made with Natural Earth.
> Long text: Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com."

No share-alike, no NC, no attribution obligation. **The cleanest licence of any candidate**, and the
one Splash already ships under.

Two honest caveats. (a) It is a public-domain *dedication in substance*, not a formal instrument
(not CC0-1.0, no fallback-licence clause), and the site footer carries contradictory WordPress
boilerplate ("© 2009 - 2026. Natural Earth. All rights reserved."). (b) The same page records
non-exclusive third-party grants "for the sole purpose of creating a world base map" (The Washington
Post; EC JRC IES for rivers/lakes; XNR for roads; IMA for time zones). Of these only the Washington
Post grant is potentially relevant to admin polygons — the others cover layers Splash does not use.
*Uncertain:* the provenance of the admin_1 polygons themselves is not stated on any page found.
*What would settle it:* the `nvkelso/natural-earth-vector` CHANGELOG / `housekeeping/` provenance notes.

**Coverage — the decisive finding, measured by parsing the actual files:**

| layer | features | countries | note |
|---|---|---|---|
| `ne_110m_admin_1_states_provinces` | **51** | **1** | United States only |
| `ne_50m_admin_1_states_provinces` | **294** | **9** | RUS 85, USA 51, IND 36, IDN 33, CHN 31, BRA 27, CAN 13, AUS 9, ZAF 9 |
| `ne_10m_admin_1_states_provinces` | **4 596** | **251** | the only global admin-1 tier |
| `ne_10m_admin_2_counties` | — | **1** | *"limited to United States"* (downloads page, verbatim) |

So: **Natural Earth is global at ADM0 and ADM1 only. There is no ADM2 outside the United States,
and no ADM3 at all.** Against the widened requirement, Natural Earth covers the top two rungs of
five and none of the non-administrative zones. There is also no lightweight global admin-1 tier —
1:10m or nothing.

**Update cadence — the project is effectively dormant.** Last GitHub release v5.1.2 **2022-05-13**;
last `master` commit 2022-06-02; every CDN artefact carries `Last-Modified: Fri, 13 May 2022`; the
project blog's last post is 2019-10-10; 445 open issues, repo not archived and no deprecation
notice. Boundaries are frozen at a 2022 vintage. *Uncertain:* whether a maintainer or successor
exists in 2026 — nothing credible found. *What would settle it:* NACIS.

**ADM1 tier semantics are not uniform, and this matters editorially.** Measured feature counts:
France **101** (départements — *not* the 18 régions), Italy **110** (province), UK 232, Germany 16
(Länder), Switzerland 26 (cantons), Thailand 77 (provinces), Argentina 24 (provinces). A French
journalist asking for a *régions* map will not find that tier in Natural Earth's "admin_1" at all.
"ADM1" is a dataset convention, not a journalistic one.

### 2.2 geoBoundaries — CC BY 4.0 on its own work, but per-file upstream licences ride along. ⚠️ usable with a mandatory per-file check

https://www.geoboundaries.org/ , read 2026-07-28:

> "the geoBoundaries Global Database of Political Administrative Boundaries Database is an online,
> open license (**CC BY 4.0**) resource of information on administrative boundaries (i.e., state,
> county) for every country in the world."

> "geoBoundaries datasets are provided under the CC BY 4.0 license, **which allows for most
> commmercial, noncommercial, and academic uses**." *(sic)*

> "Our license requires an acknowledgement in any products you produce which use this data."

> "When using geoBoundaries **on the web**, we ask that you put the name 'geoBoundaries' with a link
> back to this website, www.geoboundaries.org, somewhere prominent on the page that uses the
> boundaries."

**The caveat that decides how it must be wired.** `CITATION-AND-USE-geoBoundaries.txt` ships inside
*every* country/level folder:

> "Computer code and derivative works generated by the geoBoundaries project are released under the
> Attribution 4.0 International (CC BY 4.0) license. Attribution is required for use of this
> product."
> "**Users using individual boundary files from geoBoundaries should additionally ensure that they
> are citing the sources provided in the metadata for each file.**"

And the metadata carries a **per-file upstream licence**. Counted from
`releaseData/geoBoundariesOpen-meta.csv` (486 138 B, **715 rows** = one per country×level), column
`boundaryLicense`:

| bucket | rows |
|---|---|
| CC BY (attribution only) | 285 |
| **ODbL 1.0 (database copyleft)** | **225** |
| Public domain / CC0 / PDDL | 125 |
| **CC BY-SA (share-alike)** | **45** |
| national government licences (Etalab 2.0, OGL v3.0, swisstopo, Korea OGL, Singapore ODL, "Other – Direct Permission"…) | 35 |

**270 of 715 files derive from ODbL or CC-BY-SA sources.** The repo's own GitHub licence metadata is
`SPDX: NOASSERTION`; the README says "open license (CC BY 4.0 / **ODbL**)".

*(These counts, and the level counts below, were computed twice independently from the same CSV and
agree exactly. 25 distinct licence strings appear in the column. One of them is
`"Pixabay License for Content"` — for a national boundary file — which is worth reading as a signal
about how uniformly this metadata is curated.)*

**This hits the pilot directly.** Verified live against the API just now:

```
GET https://www.geoboundaries.org/api/current/gbOpen/CHE/ADM1/
  boundaryLicense: "Federal Office of Topography swisstopo License"
  licenseSource:   "www.swisstopo.admin.ch/en/home/meta/conditions/geodata/ogd.html"
  boundaryYearRepresented: "2022"
```

The Swiss cantons — the pilot's own geography — are **not CC BY 4.0** in geoBoundaries; they are
under swisstopo's open-government-data terms, which carry their own attribution requirement.

**And it is not an edge case — it hits every country the owner named.** Read straight out of
`geoBoundariesOpen-meta.csv` for the three named countries plus France:

| country | levels available | licence per level |
|---|---|---|
| **Switzerland** | ADM0–**ADM3** | swisstopo licence at **every level**, including the pilot's cantons |
| **Thailand** | ADM0–**ADM2** | ADM0 + **ADM1 (the provinces) = ODbL 1.0**; ADM2 = CC BY 3.0 IGO |
| **Argentina** | ADM0–**ADM2** | ADM0/ADM1 = CC BY 2.5; ADM2 = CC BY 3.0 IGO |
| France | ADM0–**ADM5** | ADM0 = CC0; ADM1–3 = Etalab 2.0; **ADM4 (communes) = ODbL 1.0**; ADM5 = ODC-BY 1.0 |

**Thai provinces — literally one of the three geographies in the requirement — are ODbL in
geoBoundaries.** So are French communes. A pipeline that ships geoBoundaries geometry without reading
`boundaryLicense` per file would inline ODbL data into an MIT project's artifact, silently, for the
owner's own named example.

*Uncertain, and it matters:* no page was found in which geoBoundaries states that its CC BY 4.0
re-licence **overrides** the upstream ODbL/SA obligations. The CITATION-AND-USE wording
("should *additionally* ensure…") reads as cumulative, not superseding. *What would settle it:*
a written question to team@geoboundaries.org.

**Coverage — measured by counting the API's own index and the 715-row CSV:**

| level | countries/entities | |
|---|---|---|
| ADM0 | **230** | |
| ADM1 | **~199** ±1 | |
| ADM2 | **180** | |
| ADM3 | **81** | |
| ADM4 | **21** | AUT BEL BGD CZE FJI FRA GLP IND IRN ITA LKA MDG MTQ MYT REU RWA SLB SLE SVK UGA ZAF |
| ADM5 | **4** | CAF, FRA, IND, RWA |

Total `admUnitCount` summed across all rows: **952 093 units**.

**Depth is deep but very patchy below ADM2 — "covers ADM3" is not a global claim.** Missing at ADM3:
**IDN, USA, BRA, RUS, NGA, JPN, MEX, EGY, VNM, COD, TUR, THA, AUS, ARG, COL, SAU, MAR.** Present at
ADM3: CHN, IND, DEU, FRA, GBR, ITA, ESP, PAK, BGD, ETH, PHL, KEN, ZAF, POL, UKR, CAN, DZA, IRN.
Note that **Thailand and Argentina — two of the three countries the owner named — stop at ADM2.**

**Editorial wrinkle worth knowing.** The global composites (CGAZ) and the per-country files take
*opposite* positions on disputed territory. CGAZ, verbatim: *"disputed areas are removed and
replaced with polygons following **US Department of State definitions**."* Per-country files:
*"seeks to represent every nation 'as they would represent themselves', with no special
identification of disputed areas"* — which means per-country files can **overlap**. For a journalism
tool that is an editorial decision, not a technical one.

**Cadence:** rolling `current` plus tagged releases (last tag v6.0.0, 2023-09-14), but `releaseData/`
keeps receiving commits (2025-02-11, 2024-12-18…) and repo `pushed_at` is 2026-04-15. **`current`
moves underneath you** — a build must pin a commit SHA (the API already resolves to one).
Per-country freshness varies: CHE ADM1's own `buildDate` is 2023-12-12.

### 2.3 GADM — NOT USABLE. Disqualified. ❌

https://gadm.org/license.html , read 2026-07-28, essentially the whole page:

> **"The data are freely available for academic use and other non-commercial use. Redistribution or
> commercial use is not allowed without prior permission."**
>
> "Using the data to create maps for publishing of academic research articles is allowed. Thus you
> can use the maps you made with GADM data for figures in articles published by PLoS, Springer
> Nature, Elsevier, MDPI, etc. […]"
>
> "Data for the following countries is covered by a a different license" *(sic)*
> "**Austria**: Creative Commons Attribution-ShareAlike 2.0 (source: Government of Ausria)" *(sic)*

Repeated on https://gadm.org/data.html:

> "The data are freely available for academic use and other non-commercial use. Redistribution, or
> commercial use is not allowed without prior permission."

**Verdict: disqualified, and not marginally.** Inlining the geometry into a delivered artifact *is*
redistribution; the carve-out is narrowly scoped to figures in academic articles and a newsroom
scrolly is not one. The non-commercial clause collides head-on with MIT's grant to downstream users.
No permission-request procedure is published — only a generic contact form.

This is a real loss, because **GADM has by far the best schema for the join problem** (see §3):
`GID_i` with a full parent chain, `VARNAME_i` pipe-separated aliases, `NL_NAME_i` non-Latin names,
`HASC_i`, `ISO_1`. It is also stale — 4.1 shapefiles are dated 2022-07-18, the site still says
"Version 5 will be released in January 2026" while `gadm5.0` 404s, and
https://gadm.org/changelog.html reads, in full: *"working on it..."*.

### 2.4 OpenStreetMap-derived — ODbL. The share-alike attaches to inlined data. ⚠️ architecturally constrained

ODbL v1.0, https://opendatacommons.org/licenses/odbl/1-0/ , the clauses that decide it:

> "**Derivative Database** – Means a database based upon the Database, and includes any translation,
> adaptation, arrangement, modification, or any other alteration of the Database or of a Substantial
> part of the Contents. This includes, but is not limited to, Extracting or Re-utilising the whole or
> a Substantial part of the Contents in a new Database."

> "**Produced Work** – a work (such as an image, audiovisual material, text, or sounds) resulting
> from using the whole or a Substantial part of the Contents (via a search or other query) from this
> Database […]"

> §4.4 "a. Any Derivative Database that You Publicly Use must be only under the terms of: i. This
> License […]"
> §4.4 "d. **Share Alike and additional Contents.** For the avoidance of doubt, You must not add
> Contents to Derivative Databases under Section 4.4 a that are incompatible with the rights granted
> under this License."

> §4.5 "b. Using this Database, a Derivative Database, or this Database as part of a Collective
> Database **to create a Produced Work does not create a Derivative Database** for purposes of
> Section 4.4"

> §4.6 "If You Publicly Use a Derivative Database or a Produced Work from a Derivative Database, You
> must **also offer to recipients … a copy in a machine readable form** of: a. The entire Derivative
> Database; or b. A file containing all of the alterations made […] free of charge if distributed
> over the internet."

OSMF's board-endorsed Produced Work guideline
(https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline), the
operative test, verbatim:

> "**If the published result of your project is intended for the extraction of the original data,
> then it is a database and not a Produced Work. Otherwise it is a Produced Work.**"
> "We can clearly define things that are USUALLY Produced Works: .PNG, JPG, .PDF, SVG images and any
> raster image […] Database dumps are usually not Produced Works"

**Applied to Splash, this splits cleanly along Splash's own format axis:**

- **`static` (PNG) and `video` (mp4) exports = Produced Work.** ODbL §4.5.b applies; share-alike does
  **not** reach them. Splash owes the ODbL §4.3 attribution notice and, per ODbL §4.6, an offer of the
  underlying data.
- **`interactive` / `scrolly` (self-contained HTML with inline GeoJSON) = conveys a Derivative
  Database.** The polygons inside are machine-readable, structured and trivially extractable
  (`JSON.parse`). ODbL §4.4 attaches to the geodata; ODbL §4.6 requires offering the data free of charge.

**And there is an avoidable landmine that is an architectural decision, not a footnote.** OSMF's
board-endorsed Collective Database guideline keeps the journalist's own numbers *out* of the
share-alike **only if the two datasets stay structurally separate** ("share-alike only applies to the
parts containing or derived from OSM-data"); merging a non-OSM list into OSM features **does**
trigger it. Splash's `computeChoropleth` currently does exactly the merging kind — it builds a
`coloredWorld` FeatureCollection with the journalist's values baked into feature `properties`. Under
ODbL geometry that single line converts a clean Collective Database into a Derivative Database whose
*whole* must go out under ODbL.

Note also the board-endorsed Substantial guideline sets the insubstantial floor at "**Less than 100
Features**" — a national admin layer is unambiguously Substantial, so there is no de-minimis escape.
The Geocoding guideline does not help either: it exempts names/addresses/lat-long, explicitly not
polygon geometry.

*Uncertain:* no OSMF guideline gives an example resembling an interactive web artifact; the
"intended for extraction" reading of inline GeoJSON is a reading, not a quoted ruling. The Trivial
Transformations guideline is explicitly still "at the proposal stage". *What would settle it:* a
written question to the OSMF Licensing Working Group, or the `legal-talk` / community licensing
category.

**ODbL does not infect Splash's code** — it is a data licence and MIT stays MIT. It attaches to
inlined OSM boundary data and to any merged data-plus-boundaries structure. That is exactly the
virality the project must avoid, and it is why OSM cannot be the *shipped* default — but it is
perfectly fine as a **journalist-supplied** source, where the newsroom, not Splash, is the publisher
making the ODbL choice.

**Concrete OSM-derived products:**

| product | licence | note |
|---|---|---|
| **osm-boundaries.com** | "All downloaded data follows the license of OpenStreetMap" → ODbL | Levels 0–12, topology-aware Visvalingam simplification (a genuinely useful feature), but **credit-gated since July 2024** ("1 credit per included boundary"), and the site's own T&Cs contradict its data licence ("You must not: Republish material from OSM-Boundaries") — copy-pasted boilerplate that cannot lawfully bind ODbL data but as written forbids exactly what Splash does. **Do not build a dependency on it.** |
| **Geofabrik admin-polygons** | ODbL | https://www.geofabrik.de/data/admin-polygons.html — unambiguous, no gating |
| **Overture Maps divisions** | **ODbL** — docs.overturemaps.org/attribution: *"Divisions — License for theme: ODbL"* | A *conflation* of OSM + geoBoundaries + Esri + LINZ, so the ODbL-encumbered geometry **cannot be separated** from the CC-BY parts after the fact. Excellent schema (`country` ISO 3166-1, `region` ISO 3166-2, `admin_level`, GERS ids), monthly cadence, wrong licence. **Strictly worse than raw OSM for this problem.** |
| **Who's On First** | **no blanket licence** — per-record patchwork; only the schema is CC0 | whosonfirst.org/docs/licenses: *"The Who's On First dataset is both an original work and a modification of existing open data… some sources require attribution, some do not."* **But every record carries `src:geom`, so contamination is mechanically auditable.** Measured: `whosonfirst-data-admin-ch` = 34 916 records, **zero with `src:geom = osm`** (sources: qs_pg 10 812, geonames 10 656, ch-cadastre 6 397, quattroshapes 3 468…). Only 2 countries sampled; Quattroshapes' own chain unverified. Global admin SQLite is 8.6 GB bz2 — build-time source only. |
| **Wikidata "boundaries"** | misnomer | Wikidata stores `geoshape (P3896)` **pointers** to Wikimedia Commons `Data:*.map` pages, whose licence is **per-page** and may be CC-BY-SA or ODbL (Help:Map_Data lists ODbL-1.0 among accepted licences). Not a licence-uniform product. **Would not build on this.** |

### 2.4b Eurostat GISCO / NUTS / LAU — NON-COMMERCIAL. Disqualified. ❌

This one matters more than its obscurity suggests: **NUTS/LAU is the standardised sub-national
coding system for Europe** — the natural answer to "what identifier works below ADM1" on the
continent the pilot is on. Fetched and read directly from
https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units (raw HTML, 2026-07-28):

> "The Commission agrees to grant the non-exclusive and non-transferable right to use and process the
> Eurostat/GISCO geographical data downloaded from this page (the 'data'). The permission to use the
> data is granted on condition that: **the data will not be used for commercial purposes**; the
> source will be acknowledged. A copyright notice, as specified below, must be visible on any printed
> or electronic publication using the data downloaded from this page."

> "When you use data downloaded from our webpages on: **communes / countries / postal codes** […] the
> data source must be acknowledged in the legend of the map and in the introductory page of the
> publication with the following copyright notice:
> EN: **© EuroGeographics for the administrative boundaries**
> FR: © EuroGeographics pour les limites administratives
> DE: © EuroGeographics bezüglich der Verwaltungsgrenzen"

> "If you intend to use the data commercially, please contact EuroGeographics for information about
> their licence agreements."

The dataset itself is otherwise ideal — NUTS 0/1/2/3 **and LAU**, in GeoPackage / Shapefile /
**TopoJSON** / GeoJSON / PBF / SVG, at 1:1M, 1:3M, 1:10M, 1:20M, 1:60M, in EPSG:3035 / 4326 / 3857,
for years 2024, 2021, 2016, 2013, 2010, 2006, 2003. Exactly the shape this project wants.

**And it is non-commercial, which is fatal for MIT** — same class as GADM. Splash cannot ship it,
and cannot grant a downstream newsroom the commercial rights MIT promises. *(It remains perfectly
available to a **newsroom** that downloads it itself for a non-commercial publication — which is
another argument for the journalist-supplied path: it puts the licence decision with the party
entitled to make it.)*

### 2.4c FAO GAUL 2024 — a late candidate, not verified enough to rely on. ❓

Relaunched after lapsing at GAUL 2015; global, reportedly to ADM2; reportedly **CC BY 4.0**. It is
the strongest global ADM2 candidate found. **But the licence was read from two mirrors, not from
FAO's own page (which returns HTTP 403 to automated fetching), so it is not asserted here.**
*What would settle it:* fetching FAO's own terms page from a browser. If it confirms CC BY 4.0, GAUL
2024 becomes a serious contender for the ADM2 tier that Natural Earth does not cover — and this
document's §6 options should be revisited on that basis.

### 2.5 Licence verdict, one line each

| dataset | verdict |
|---|---|
| **Natural Earth** | ✅ **Public domain, no obligations. Shippable and inlineable as-is** — but global only to ADM1, US-only at ADM2, none below, and frozen since 2022. |
| **geoBoundaries** | ⚠️ **Usable, with a mandatory per-file licence check.** Its own work is CC BY 4.0 (attribution required, prominent, with a link), but 270/715 country×level files derive from ODbL or CC-BY-SA upstreams — **Swiss cantons are swisstopo-licensed, Thai provinces are ODbL, French communes are ODbL.** Not shippable blind. |
| **GADM** | ❌ **Disqualified.** "Redistribution or commercial use is not allowed without prior permission" is incompatible with MIT downstream rights. Best schema, unusable licence. |
| **OpenStreetMap-derived** (Geofabrik, osm-boundaries, Overture divisions) | ⚠️ **ODbL — cannot be the shipped default.** Static/video exports are Produced Works and are fine; inlined interactive HTML conveys a Derivative Database and triggers ODbL §4.4 + §4.6. Fine as a *journalist-supplied* source where the newsroom is the publisher. |
| **FAO GAUL 2024** | ❓ **Promising, unverified.** Global, reportedly ADM2 and CC BY 4.0, but the licence was read only on mirrors — FAO's own page 403s. Would be the natural ADM2 tier if confirmed. |
| **Unicode CLDR + Wikidata + GeoNames** *(names/codes, no geometry)* | ✅ **All three MIT-compatible** — Unicode-3.0, CC0, CC BY 4.0 respectively. Together they solve the *join* problem globally to ADM2. |
| **Eurostat GISCO / NUTS / LAU** | ❌ **Disqualified — non-commercial.** *"the data will not be used for commercial purposes"*, © EuroGeographics. The standardised European sub-national system is licence-blocked for an MIT tool, though a newsroom may use it itself. |
| **Who's On First** | ⚠️ **Conditionally usable, mechanically checkable.** No blanket licence, but per-record `src:geom` makes ODbL records filterable; 0/34 916 OSM-sourced in the Swiss admin repo. Under-verified outside CH/LI. |

---

## 3. The join problem

### 3.1 What identifiers exist, and which datasets carry them

| system | what it is | reaches | who carries it |
|---|---|---|---|
| **ISO 3166-1 alpha-2/3** | country codes | ADM0 only | everything. NE `iso_a2`/`iso_a3` (6 features `-99`), geoBoundaries `shapeGroup`, GADM `GID_0` |
| **ISO 3166-2** | `CH-GE`, `US-CA`, `TH-10`, `AR-C`. **No parseable semantics** — you cannot infer a parent, a level or an ordering from the code | **ADM1 only.** Measured in OSM: 2 937 relations at `admin_level=4` carry an `ISO3166-2` tag, only **800** at level 6 | NE `iso_3166_2` (100 % filled, **95.9 % well-formed, not unique** — 60 duplicated values); geoBoundaries `shapeISO` (real at ADM1, **empty string at ADM2 and below in 100 % of features**); GADM `ISO_1` — **badly incomplete**: CHE 5/26 missing *including Genève*, KAZ 13/14 missing, NOR 16/19 missing |
| **HASC** | Gwillim Law's `CH.GE`, hierarchical. **Not a standard** — its own author: "not an official standard, sanctioned by any international body … intended for internal use within a database … not for display" | ADM1, patchily ADM2 | **The register itself is plain copyright, all rights reserved — unshippable** (statoids.com, "Copyright © 2005, 2011, 2013 by Gwillim Law", last updated 2013, site now maintained by family, data sold). It survives only as a *field*: NE `code_hasc` (100 % filled, 91.3 % well-formed, **public domain**) and GADM `HASC_i` (100 % at ADM1, more complete than GADM's own `ISO_1`) — but thins out fast below: **CHE L3 0/2 781, FRA L3 0/350, IND L3 0/2 347** |
| **geoBoundaries `shapeID`** | e.g. `14041887B70188811793840` | all levels | geoBoundaries only. **Opaque, and it identifies the boundary *set*, not the parent polygon — there is no parent code, so it disambiguates nothing** |
| **GADM `GID_i`** | `CHE.7_1`, `FRA.1.2.3.4.5_1` | all levels, **full parent chain on every feature** | GADM only — **the one schema that solves depth, and it is licence-disqualified** |
| **Wikidata QID** | `Q11917` = canton of Geneva | any level, wherever an item exists | NE `wikidataid` **94.3 %** at ADM1. The best *external* key: stable, multilingual, and the natural crosswalk hub |
| **GeoNames id** | integer, e.g. `2660646` | ADM1 + ADM2 globally | NE `gn_id` **97.2 %** at ADM1 — and it links straight into the GeoNames tables below |
| **National statistical codes** | INSEE (FR), OFS/BFS (CH), ISTAT (IT), AGS/ARS (DE), INE (ES), IBGE (BR), FIPS/GEOID (US) | **the level a journalist's data actually uses, all the way down** | **not in any global geometry dataset examined.** The French commune file measured in §3.2 carries INSEE `code` because it is a *national* file — that is the whole point |
| **NUTS / LAU** | the standardised European system below ADM1 | NUTS 0–3 + LAU | Eurostat GISCO — **non-commercial, disqualified (§2.4b)**. Revised every ~3 years (2003…2021, **2024 current**, 2027 already adopted); LAU re-published annually |
| **OSM relation id + tags** | per-feature OSM tagging | all levels where mapped | **measured live: `wikidata` is the reliably-populated key, not `ISO3166-2`** — see below |
| **P-codes** (OCHA/HDX) | humanitarian place codes, hierarchical (`HT` → `HT08` → `HT0811`) | **~168 countries only** (measured: 170 `cod-ab-*` datasets on HDX), skewed to crisis and low/middle-income states — no COD-AB for CH, FR, NO | Stability guarantee stronger than ISO's, verbatim: *"A given P-code can be removed … but never re-used to represent a different place."* Useless as a global key, excellent where it exists |
| **Unicode CLDR** `common/subdivisions/*.xml` | ISO 3166-2 codes **+ names in 119 languages** | ADM1 | **`SPDX-License-Identifier: Unicode-3.0`** in every file header — grants "permission … free of charge … to deal in the Data Files … without restriction, including … distribute, and/or sell copies". **MIT-equivalent.** Measured: `en.xml` 5 399 entries / 337 kB; fr 5 129, de 5 065, it 5 002 |
| **Wikidata QID** | `Q11917` = canton of Geneva | any level with an item | **CC0**, verified: *"All structured data in the main, property and lexeme namespaces is made available under the Creative Commons CC0 License (Public domain)"*. NE `wikidataid` 94.3 % at ADM1 |

**⚠️ Correction to a premise: the ISO 3166-2 code list is NOT demonstrably free to redistribute.**
ISO's own free-use sentence conspicuously omits subdivisions — verbatim (via Wayback; `iso.org`
returns HTTP 403 to all automated fetching):

> "**ISO allows free-of-charge use of its country, currency and language codes from ISO 3166,
> ISO 4217 and ISO 639, respectively.** Users of ISO country codes have the option to subscribe to a
> paid service…"

Country, currency, language — **not subdivision**. The paid "Country Codes Collection" is what
"Allows you to download the most recent official lists of country codes **and/or subdivisions**".
So ISO grants ISO 3166-**1** explicitly and is silent-to-commercial on ISO 3166-**2**. An MIT project
should not ship "the ISO 3166-2 list"; it should ship **CLDR** (Unicode-3.0) for codes + names in
119 languages and **Wikidata** (CC0) for the crosswalk. Both were read on their licence pages, both
are MIT-compatible, and both give exactly the case in the requirement: CLDR `chge` → en *Geneva* ·
fr *canton de Genève* · de *Genf* · it *Canton Ginevra*.

**Wikidata is the hub, and it measurably bridges** (SPARQL, run 2026-07-28):

| link | items |
|---|---|
| P300 (ISO 3166-2) | 5 454 |
| P402 (OSM relation id) | 573 464 |
| P1566 (GeoNames id) | 4 056 242 |
| **P300 ∩ P402 ∩ P1566** | **4 642 = 85.1 % of all ISO-coded subdivisions** |
| P300 ∩ P8714 (GADM) | 660 = **12.1 %** — weak |
| geoBoundaries | **no Wikidata property exists at all** |

**OSM's best key is `wikidata`, not `ISO3166-2`** (Overpass, 2026-07-28, `boundary=administrative`):

| level | relations | with `ISO3166-2` | with `wikidata` |
|---|---|---|---|
| 4 | 3 073 | 2 937 (95.6 %) | **3 050 (99.3 %)** |
| 6 | 47 696 | 800 (1.7 %) | 38 676 (81.1 %) |
| 8 | 250 484 | — | 192 956 (77.0 %) |

**And OSM is the only global source carrying national statistical codes at scale** — the keys §3.2
shows are the *only* thing that disambiguates at depth:

| key | relations | reality check |
|---|---|---|
| `ref:INSEE` | 45 344 | 34 875 French communes ✓ |
| `de:amtlicher_gemeindeschluessel` | 11 362 | 10 959 German Gemeinden ✓ |
| `ref:ISTAT` | 8 026 | 7 896 Italian comuni ✓ |
| `ine:municipio` | 8 145 | 8 132 Spanish municipios ✓ |
| `IBGE:GEOCODIGO` | 15 498 | 5 571 Brazilian municípios + sub-municipal ✓ |
| `swisstopo:BFS_NUMMER` | 2 397 | 2 102 Swiss communes ✓ |
| `ref:INE` / `ref:IBGE` / `ref:BFS` / `ref:FIPS` | **0** | **these key names do not exist** |

**A trap worth writing into the validator:** lowercase `ref:ine` *does* exist (83 006 objects) but its
values are 11-digit census-section codes like `49098000301`, **not** municipality codes. Joining on it
produces silent garbage. Thailand has effectively no national code in OSM at all (`tambon` 30
objects, `amphoe` 15).

**The layer that is licence-clean, global, deep and free — and it carries no geometry.**
**GeoNames** is CC BY 4.0, verified in two independent places:

> "This work is licensed under a Creative Commons Attribution 4.0 License,
> see https://creativecommons.org/licenses/by/4.0/"
> — https://download.geonames.org/export/dump/readme.txt , read 2026-07-28

> "This work is licensed under a Creative Commons Attribution 4.0 License."
> — https://www.geonames.org/about.html

Attribution only. No share-alike, no NC. **MIT-compatible.** Measured on the live download server:

| file | bytes | contents (measured by parsing) |
|---|---|---|
| `admin1CodesASCII.txt` | **151 572** | **3 865 rows, 228 countries** — `CH.ZH → Zurich`, with a `geonameId` per row |
| `admin2Codes.txt` | **2 370 419** | **47 549 rows, 189 countries** — CH 149, **TH 928**, **AR 529**, BR 5 570, US 3 143, MX 2 471, RU 2 648, JP 1 190, NG 785, IN 763, ID 514, IT 107, FR 96, DE 19 |
| `alternateNames.zip` | 200 591 315 | ~16 M alternate names across languages and scripts |

So the join problem and the geometry problem **decompose, and they have different answers**:

- **The join/crosswalk layer can be solved licence-clean, globally, down to ADM2** — and there are
  four independent MIT-compatible pieces to build it from: Natural Earth's own 26 language fields +
  alias lists (public domain, §3.3, a 1.4 MB index measured in §3.4), **Unicode CLDR** (Unicode-3.0,
  ISO 3166-2 codes + names in 119 languages), **Wikidata** (CC0, the 85 %-complete
  ISO↔OSM↔GeoNames bridge) and **GeoNames** (CC BY 4.0, code tables to ADM2 in 189 countries) —
  linked by the `gn_id` and `wikidataid` Natural Earth already carries on 97 % and 94 % of ADM1
  features.
- **The geometry at depth cannot.** Below ADM1 there is no licence-clean, global boundary source:
  Natural Earth stops (US-only ADM2), geoBoundaries is per-file licence roulette including ODbL for
  Thai provinces and French communes, GADM and Eurostat GISCO are outright disqualified.

**That asymmetry is the argument of this whole document.** Splash can know *what* a region is called
in five languages anywhere on earth. It cannot lawfully ship *the shape* of one below level 1. So
the shape has to be allowed to arrive with the run.

### 3.2 The measured failure at depth — name matching breaks below ADM1

This is the finding that most changes the answer, and it was measured locally on the real French
commune file (`gregoiredavid/france-geojson`, 45 291 317 B, **35 228 features**, properties = INSEE
`code` + `nom`):

| | |
|---|---|
| total communes | **35 228** |
| distinct names | 32 753 |
| names borne by more than one commune | **1 580** |
| **communes whose name is NOT unique in France** | **4 055 = 11.5 %** |
| worst offenders | Sainte-Colombe ×12, Saint-Sauveur ×11, Pin ×10, Saint-Loup ×10, Saint-Aubin ×10, Beaulieu ×10 |
| after accent/case/hyphen normalisation | 4 168 = **11.8 %** (normalising makes it *worse*, not better) |

**One French commune name in nine is ambiguous within its own country.** No amount of accent
folding, case folding or fuzzy matching fixes this — the information simply is not in the name. The
same pattern was independently measured in geoBoundaries: CHE ADM3 has 91 duplicated `shapeName`
across 2 286 units; FRA ADM5 has 1 456 duplicated across 35 010; IND ADM3 has 215 across 6 822.

**France is not the worst case — the United States is.** Counted from the official national files:

| country | unit | total | in a name collision | % |
|---|---|---|---|---|
| **USA** | counties (ADM2) | 3 222 | **1 684** | **52.3 %** |
| USA | places | 32 333 | 9 178 | 28.4 % (46.9 % on bare names) |
| **France** | communes (INSEE COG 2025) | 34 875 | **3 679** | **10.5 %** |
| Brazil | municípios (IBGE) | 5 571 | 505 | 9.1 % |
| Germany | Gemeinden (Destatis) | 10 959 | 675 | 6.2 % (8.9 % on bare names) |
| Switzerland | communes (BFS) | 2 102 | 0 official — **77 (3.7 %)** once the `(ZH)` canton suffix is stripped | |
| Spain | municipios (INE) | 8 132 | 34 | 0.4 % |
| Italy | comuni (ISTAT) | 7 896 | 10 | 0.1 % |

`Washington County` ×30 · `Jefferson County` ×25 · `Franklin County` ×24 · `Sainte-Colombe` ×12 ·
`Neuenkirchen` ×11 · `Rickenbach` ×5.

**And "name + parent region" is NOT a portable fallback.** It works in France keyed on *département*
(0 collisions), Brazil on UF, Spain on province, US counties on state. It **fails**:

- **Germany: 293 Gemeinden collide with another Gemeinde in the same Bundesland.**
- **US places: 436 units collide on bare name + state** — two distinct `Mount Olive CDP` in Alabama,
  two `Bayview CDP` in California, separable only by GEOID.
- **France, if the journalist's CSV carries *région* instead of *département*: 1 423 communes still
  collide.** That is the nastiest of the three, because the file *looks* disambiguated and is not.

And the datasets that are licence-clean are exactly the ones that give you nothing to disambiguate
with:

- **geoBoundaries carries exactly five fields at every level**: `shapeName`, `shapeISO`, `shapeID`,
  `shapeGroup`, `shapeType`. Measured: `shapeISO` is real ISO 3166-2 at ADM1 (CHE `CH-AG`, FRA
  `FR-IDF`, USA `US-MS`, BRA `BR-RR` — verified across every country tested) and is an **empty
  string in 100 % of features at ADM2 and below**, in all 12 country/level combinations checked.
  There is **no parent code** — `shapeID` is opaque (`"14041887B70188811793840"`) and identifies the
  boundary *set*, not the parent polygon — and **no alternate/local-language name field at all**.
  CGAZ carries even less: no `shapeISO` even at ADM1.
- **GADM would have solved it** — `GID_5` plus the full `NAME_1…NAME_5` ancestry makes the 1 456
  duplicate French commune names trivially separable — and GADM is licence-disqualified. That is the
  sharpest single trade-off in this document.

**Conclusion: below ADM1 there is no shippable global join key.** Any design that joins a
journalist's CSV to ADM2+ geometry *by name* will silently mis-join roughly one row in ten in France
and one in twenty-five in Switzerland. The only things that actually work at depth are (a) the
national statistical code that the journalist's data already carries — INSEE, BFS/OFS, ISTAT, AGS,
INE, IBGE, FIPS/GEOID — matched against a boundary file that carries the same code, or (b) a spatial
join. Both of those point at the same conclusion as §6: the boundary file has to be allowed to come
*with* the data.

### 3.3 What Natural Earth actually gives you at ADM1 — better than expected

Measured by parsing `ne_10m_admin_1_states_provinces` (4 596 features, **121 properties each**):

| field | fill |
|---|---|
| `iso_3166_2` | 4 596 / 4 596 (100 %) — but see the quality caveat |
| `code_hasc` | 4 596 / 4 596 |
| `adm1_code`, `ne_id` | 4 596 / 4 596, unique by construction |
| `wikidataid` | 4 332 / 4 596 (94 %) |
| `gn_id` (GeoNames) | 4 468 / 4 596 (97 %) |
| `postal` | 3 946 / 4 596 (86 %) |
| `fips` | 4 165 / 4 596 (91 %) |
| `name_alt` (pipe-separated aliases) | 1 980 / 4 596 (43 %) |
| `name_local` | **430 / 4 596 (9 %)** |
| **26 language fields** `name_ar, name_bn, name_de, name_el, name_en, name_es, name_fa, name_fr, name_he, name_hi, name_hu, name_id, name_it, name_ja, name_ko, name_nl, name_pl, name_pt, name_ru, name_sv, name_tr, name_uk, name_ur, name_vi, name_zh, name_zht` | ~4 589 / 4 596 each |

**The owner's exact example resolves out of the box.** Geneva, verbatim from the file:

```
name        Genève          name_en   Geneva
name_fr     canton de Genève  name_de  Kanton Genf
name_it     Canton Ginevra
name_alt    Cenevre|Genebra|Geneve|Geneva|Genevra|Genf|Ginebra|Ginevra
postal      GE   code_hasc  CH.GE   iso_3166_2  CH-GE   wikidataid  Q11917
```

"Genève", "GE", "CH-GE", "Geneva", "Genf" are **all five present** on the one feature. A matching
layer built over Natural Earth admin_1 does not need a translation service — it needs to index
`iso_3166_2 | code_hasc | postal | name | name_en | name_fr | name_de | name_it | name_alt.split("|")`
and normalise. That is a small, deterministic, testable function.

Thailand additionally has `name_local` in Thai script (`จังหวัดสุรินทร์`), so a Thai CSV joins too.

**Quality caveats, measured, not assumed:**
- `iso_3166_2` is 100 % *filled* but **not unique**: 60 code values are duplicated across features
  (`MW-CT`, `KZ-ALA`, `LV-JEL`, `LV-DGV`, `SD-DS`, `AZ-SA`, `MZ-L`, `BA-BIH`…), 188 values contain
  `~` (NE's marker for a code it invented or is unsure of), 12 start with `-99`. Measured
  well-formedness against `^[A-Z]{2}-[A-Za-z0-9]{1,3}$`: **4 408 / 4 596 = 95.9 %**; the malformed
  188 concentrate in KOS (30), HKG (18), AIA (14), ALD (11), COK (11), BIH (7), NZL (7).
  **`adm1_code` and `ne_id` are the unique keys; `wikidataid` is the best external one.**
- `code_hasc` well-formed 91.3 % (Slovenia carries 3-part codes like `SI.PM.GR`).
- 7 features have an empty `name`.
- The `admin` field still says `"Czech Republic"` for 14 Czech units although admin_0 was renamed to
  `Czechia` — joining NE layers on country *name* silently misses.

### 3.4 What a matching layer would actually cost — measured

A global ADM1 identifier index was built here from Natural Earth 10m admin_1: for every feature,
index `iso_3166_2 | code_hasc | postal | fips | wikidataid` plus 12 name fields
(`name, name_en, name_fr, name_de, name_it, name_es, name_pt, name_ru, name_ar, name_zh, name_local,
gn_name`) plus every `name_alt` alias, each normalised (NFD accent-strip, upper, hyphen/apostrophe →
space, whitespace collapse).

| | |
|---|---|
| distinct keys | **47 231** |
| keys resolving to more than one feature | **1 651 = 3.5 %** |
| index as JSON | **1 369 563 B** |
| gzipped | **374 421 B** |

**A whole-planet ADM1 matching table is 1.4 MB and 96.5 % unambiguous.** It is a build-time artifact,
never inlined — `geo-match` loads it, the artifact never sees it.

Resolution of the owner's own examples, and the failure modes, straight from the index:

| query | resolves to |
|---|---|
| `Genève` | `CHE-159` ✅ |
| `CH-GE` | `CHE-159` ✅ |
| `Geneva` | `CHE-159` ✅ |
| `Genf` | `CHE-159` ✅ |
| `Ginevra` | `CHE-159` ✅ |
| `Haute-Savoie` | `FRA-5302` ✅ (the pilot's own département) |
| `Chiang Mai` | `THA-390` ✅ |
| **`GE`** | **8 features** — Barbados, Bhutan, **Switzerland**, Italy, Morocco, Netherlands, Somalia, St Vincent ❌ |
| **`Buenos Aires`** | **2 features** — `ARG-1295`, `ARG-5493` (the province *and* the autonomous city) ❌ |
| `Suisse` | nothing — country names are ADM0, a different layer |

Four failure modes, each concrete:

1. **Bare subdivision codes are homonyms across countries.** `GE` means Geneva, Gelderland, Genova,
   Guelmim, Gewog… A matching layer *must* take a country scope, and a run that has none must ask
   rather than guess. This is the single most likely silent mis-join at ADM1.
2. **Homonyms exist within a country even at ADM1.** `Buenos Aires` is two Argentine features. Name
   matching is not safe at any level, only *safer* at the top.
3. **Language variants are solved by the data, not by the matcher** — but only where Natural Earth
   populated them (`name_local` is 9 % filled; the 26 language fields are ~100 %).
4. **Level confusion.** `Suisse` is an ADM0 name and finds nothing in an ADM1 index. A journalist
   writing country names in a run scoped to cantons gets zero matches, and the tool must say *which
   level it looked at* — the current `unmatched` list is right to exist and needs a level label.

### 3.5 Disputed territory is an editorial fact, not a data detail

Natural Earth, verbatim: *"Natural Earth shows de facto boundaries by default according to who
controls the territory, versus de jure."* It ships 41 `FCLASS_*` worldview fields (`FCLASS_ISO`,
`FCLASS_US`, `FCLASS_FR`, `FCLASS_RU`, `FCLASS_CN`, `FCLASS_TR`, `FCLASS_IN`, `FCLASS_PS`…) so a
publisher can choose a point of view. geoBoundaries' CGAZ takes US State Department definitions;
its per-country files let nations self-represent and therefore **overlap**. Splash currently makes
this choice silently, by shipping one file. Whatever option is chosen, this stops being invisible.

---

### 3.6 A key without an as-of date is not a key

The failure mode nobody plans for. Five distinct sub-modes, each with a verified instance (sources:
the `ISO 3166-2:XX` Wikipedia pages, which transcribe ISO newsletters and OBP entries — ISO's own
site is unfetchable, see §8):

1. **Code churn, no territorial change.** Kazakhstan, 2022-11-29: *all 17* alphabetic codes replaced
   by numeric in one round (`KZ-ALA`→`KZ-75`, `KZ-AST`→`KZ-71`…), plus 3 new regions. France
   2016-11-15: every région code went from 1 letter to 3 (`FR-A` Alsace folded into `FR-GES` Grand
   Est) while **département codes `FR-01`…`FR-95` did not change** — only their parent pointer did.
2. **Name churn, no code change.** Nepal's `NP-P1`…`NP-P7` kept their codes while names moved four
   times in five years — old data says "Province No. 1", current says "Koshi". Kazakhstan's `KZ-71`
   went Astana → Nur-Sultan (2020) → **back to Astana** (2022).
3. **A code reassigned to a different entity — silent wrong data.** Philippines: `PH-13` was the
   Cordillera Administrative Region, then moved to `PH-15`, and `PH-13` was given to **Caraga**. A
   join on `PH-13` across vintages returns the wrong region with no error at all.
4. **Boundary change under a stable code and name.** Indonesia 2022/2023 added `ID-PE`, `ID-PS`,
   `ID-PT`, `ID-PD` — carved out of `ID-PA` Papua and `ID-PB` Papua Barat, which **kept their codes
   and names while losing most of their territory**. Neither a name join nor a code join detects this.
5. **ISO lags reality by years.** Norway's 2024 county un-merger (Viken → Østfold/Akershus/Buskerud
   etc., effective 2024-01-01) is **still not in ISO 3166-2 as of 2026** — ISO still lists `NO-30`
   Viken. Ethiopia's Sidama took ~17 months to appear; South Ethiopia and Central Ethiopia (2023)
   have no ISO entry found.

**Four datasets, four different Norways** — measured: GADM 4.1 ships **19 pre-2020 counties**
(Akershus, Østfold, Sør-Trøndelag…), geoBoundaries ships **11** (the 2020 reform), ISO 3166-2 lists
**13**, and reality since 2024 is **15**. Natural Earth is frozen at its 2022 vintage and carries the
pre-2020 set. Ukraine is worse: the 2020 raion reform cut raions **490 → 136**, and because ISO codes
only Ukraine's 27 first-level entities, that reform produced *zero* ISO change and a total break for
any raion-level CSV.

Two more measured quality defects worth knowing before trusting any of these files:

- **GADM ships mojibake.** Raw bytes in `gadm41_NOR_1.json` are `"NAME_1":"\xc3\x83stfold"` —
  double-encoded "Østfold" → `Ãstfold`, while other `ø` characters in the same file are fine. GADM
  also strips whitespace (`AppenzellAusserrhoden`, `BangkokMetropolis`) and **hard-truncates
  `VARNAME_1` at 32 characters** — Geneva's alias list arrives as
  `Cenevre|Genebra|Geneve|Geneva|Ge`, cut mid-word.
- **geoBoundaries' identifier fields are present by convention, not guarantee.** The build of
  2023-12-11 shipped all 26 Swiss ADM1 features with `properties: {}` — no name, no ISO, no ID.
  Fixed two days later. Geneva's `shapeID` is otherwise identical across the Oct-2023 and current
  builds.

**No two global boundary datasets agree on which language `name` is in.** geoBoundaries gives French
for Geneva but German for Bern; GeoNames gives English for both. Graubünden has **four official names
in its own country** (de *Graubünden*, fr *Grisons*, it *Grigioni*, rm *Grischun*). And the two
global datasets disagree irreconcilably on Thai romanisation — the same five districts are
`Chaloem Phra Kiat` in geoBoundaries and `Chalermphrakiet` in GADM. **Matching on a geometry file's
`name` field is matching against an arbitrary language choice made per-country by whoever built the
dataset.**

**Consequence for the design:** the matcher needs a **vintage field**, an alias table covering
retired *names and codes*, and it must **fail loud on unmatched rows**. A silent 94 % match rate is
exactly how a wrong map ships.

---

## 4. The size evidence — does subset-at-produce hold?

The architectural insight to test: *an artifact only needs the shapes it draws.* Measured with
mapshaper 0.7.49, on Natural Earth 10m admin_1 and on real national files.

### 4.1 A Swiss cantonal subset — 26 polygons

Source: NE 10m admin_1 filtered to `adm0_a3 === "CHE"`. **4 947 vertices total.** Deviation is the
max distance from any original vertex to the simplified outline, measured by a script written for
this (`scratchpad/rm/dev.ts`), in metres. At 1200 px wide, Switzerland is ≈ **288 m/px**.

| variant | bytes | gzip | max deviation | in pixels |
|---|---|---|---|---|
| all 121 properties, full precision | **253 393** | 81 363 | 0 | — |
| 12 useful properties, full precision | 198 201 | 68 491 | 0 | — |
| 12 props, coords rounded to 0.0001° | **92 759** | 25 291 | **6 m** | 0.02 px |
| 12 props, 0.001° | 82 630 | 20 298 | 66 m | 0.23 px |
| **12 props + Visvalingam @ 100 m + 0.0001°** | **86 394** | **23 316** | **387 m** | **1.3 px** |
| + Visvalingam @ 250 m | 66 063 | 17 929 | 734 m | 2.5 px |
| + Visvalingam @ 500 m | 48 893 | 13 005 | 1 963 m | 6.8 px |
| **TopoJSON, 100 m, quantize 1e5** | **39 086** | **14 234** | 387 m | 1.3 px |
| minimal props (`name`,`iso_3166_2`) + 100 m | 80 109 | 21 664 | 387 m | 1.3 px |

**Answer: a Swiss cantonal subset at 1200 px quality is 40–95 kB** (39 kB TopoJSON, 93 kB GeoJSON,
~25 kB over the wire gzipped). Against a 5.95 MB artifact that today ships the whole planet to draw
nothing sub-national at all, that is not a constraint — it is a 98 % reduction on the geo payload.

**Property pruning is the single biggest cheap win, not simplification**: dropping 109 unused
Natural Earth fields and rounding coordinates to 0.0001° (a 6 m error — 1/50th of a pixel) takes
253 kB → 93 kB with *no visible change whatsoever*.

**A warning about percentage-based simplification.** mapshaper's `-simplify N%` is retention of
removable vertices, and at the levels people reach for it destroys the map:

| `-simplify` | vertices kept | max deviation | in pixels |
|---|---|---|---|
| 20 % | 723 / 4 947 | 14 029 m | **49 px** |
| 10 % | 447 | 14 473 m | 50 px |
| 5 % | 298 | 18 532 m | **64 px** |
| 1 % | 227 | 29 192 m | 101 px |

A 5 % simplify — a number that sounds conservative — moves the Swiss border by 64 pixels on a
1200 px map. **Any subsetting stage must use a metric tolerance derived from the target render
width, never a percentage.** Rule of thumb established here: *tolerance ≈ (map extent in metres) /
(render width in px) × 1*, i.e. one pixel.

### 4.2 Other subsets, same recipe (12 props, 250 m tolerance, 0.0001°)

| country | ADM1 features | GeoJSON | gzip |
|---|---|---|---|
| Argentina | 24 | 198 114 | 57 448 |
| Germany | 16 | 160 143 | 51 815 |
| Greece | 14 | 117 674 | 36 976 |
| Japan | 47 | 238 452 | 70 161 |
| Philippines | 118 | 243 600 | 69 237 |
| **Thailand** | **77** | **347 193** | **100 256** |
| France (départements) | 101 | 367 521 | 111 746 |
| UK | 232 | 383 959 | 102 308 |
| Norway | 21 | 295 649 | 97 050 |
| Indonesia | 33 | 435 915 | 140 368 |
| Brazil | 27 | 584 942 | 179 155 |
| China | 32 | 849 348 | 274 469 |
| USA | 51 | 918 166 | 275 958 |
| Canada | 13 | 1 301 603 | 415 032 |
| Russia | 86 | 1 907 105 | 638 025 |

Coastline complexity dominates, not feature count: Canada with 13 features is 6× Thailand with 77.
Even the worst case (Russia, 1.9 MB) is **less than half** of what every map artifact inlines today.

### 4.3 A global admin-1 source on disk

| encoding | bytes | gzip |
|---|---|---|
| NE 10m admin_1, all 121 props, full precision | 61 990 272 | 20 496 132 |
| 18 props, 0.0001° | 25 864 432 | 7 876 353 |
| 18 props, 500 m tolerance, GeoJSON | 17 605 762 | 5 450 752 |
| **18 props, 500 m, TopoJSON quantize 1e5** | **6 745 276** | 1 788 485 |
| 18 props, 2 km, TopoJSON | 4 037 967 | 1 085 884 |

**A global admin-1 source at usable precision is ~6.7 MB TopoJSON on disk** — shippable in a repo
that already ships a 4 MB `world.geojson`, and *not* inlineable into an artifact. That is exactly
the shape the subset-at-produce hypothesis predicts: **the source lives in the skill, the subset
lives in the artifact.**

*Bonus, free:* the current 4 045 883 B `world.geojson` becomes **1 469 372 B** (GeoJSON, 7 props,
2 km tolerance) or **677 115 B** (TopoJSON) at sub-pixel fidelity for a 1200 px world map —
validated on 10 compact countries: at 2 km tolerance max deviation is 17.7 km ≈ **0.5 px** at world
scale. A 63–83 % cut on every map artifact shipped today, with no capability change at all.
*(A global-scale deviation figure for the whole file could not be produced reliably — the
equirectangular metric used breaks on Antarctica and antimeridian-spanning features. The compact-
country figure is the defensible one.)*

### 4.4 Depth — what ADM3 actually costs

| dataset | features | bytes | gzip |
|---|---|---|---|
| France, all communes (source file, already generalised) | **35 228** | 45 291 317 | 12 425 536 |
| same, 100 m tolerance | 35 228 | 29 709 715 | 7 261 265 |
| **same, 250 m, TopoJSON** | 35 228 | **8 803 668** | 2 617 268 |
| **Haute-Savoie only — the pilot's own département** | **281** | **347 472** | **89 565** |
| geoBoundaries CHE ADM3 (Swiss communes) *(cited, measured by agent)* | 2 286 | 56.87 MB full / **3.68 MB simplified** | — |
| geoBoundaries FRA ADM5 simplified *(cited)* | 35 010 | 58.89 MB | — |
| geoBoundaries CHE ADM1 full / simplified *(cited)* | 26 | 8 283 120 / **439 174** | — |

**The pilot's actual geography — the 281 communes of Haute-Savoie — is 347 kB.** That is the number
that decides the architecture. A journalist almost never maps all 35 000 French communes; they map a
département, a region, a catchment. Subsetting turns the ADM3 problem from "impossible" into
"routine", and it is only the whole-country ADM3 case that stays heavy.

Note the geoBoundaries simplification ratio is **wildly inconsistent** — 18.9× for CHE ADM1, 32× for
FRA ADM2, but only 1.8× for BRA ADM2. *(cited)* Never trust the word "simplified"; measure.

### 4.5 Can the browser actually render it? — measured, not cited

Benchmark written for this: MapLibre GL JS **5.6.2** (the version in
`skills/map-native/node_modules`), headless Chromium via the repo's own Playwright 1.61.1, 1200×640
viewport, blank style (no basemap tiles, isolating the GeoJSON cost), `addSource` → fill + line
layers → first `idle`, then a zoom → `idle`.

| dataset | features | bytes | parse | add→idle | zoom→idle |
|---|---|---|---|---|---|
| Swiss cantons, 100 m | 26 | 86 kB | 1 ms | **449 ms** | 609 ms |
| Haute-Savoie communes | 281 | 347 kB | 1 ms | 384 ms | 609 ms |
| Thailand provinces | 77 | 345 kB | 1 ms | 386 ms | 617 ms |
| **`world.geojson` (shipped today)** | 241 | 4.0 MB | 10 ms | **395 ms** | 616 ms |
| global admin-1, 500 m | **4 596** | 17.5 MB | 58 ms | **1 168 ms** | 607 ms |
| French communes, 100 m | **35 228** | 29.7 MB | 104 ms | **2 251 ms** | 1 136 ms |
| French communes, full precision | 35 228 | 45.3 MB | 156 ms | **2 799 ms** | 1 140 ms |

**Rendering is not the binding constraint.** Even 35 228 polygons at 45 MB reach first idle in 2.8 s
and re-tile a zoom in 1.1 s. JSON parse cost is negligible throughout (≤156 ms). The binding
constraint is **page weight over a real network**, not GPU or CPU: a 45 MB self-contained HTML file
is a distribution failure, not a rendering one, and the 8.8 MB TopoJSON encoding of the same data is
the answer to it.

*Caveats:* fast dev machine, localhost, headless Chromium with software WebGL; `usedJSHeapSize` is
Chrome-quantised (reported 10.1 MB for all small cases and 202.2 MB for all large ones) so treat the
heap figures as buckets, not measurements. This benchmark isolates the GeoJSON source; the real
artifact additionally streams MapTiler basemap tiles.

**Independently corroborated in Bun/JSC** on the same 45.3 MB / 35 228-feature file: `JSON.parse`
193 ms, 2 168 123 coordinate pairs, 135 MB heap, geojson-vt index 246 ms, `getTile(6,32,22)` 21.4 ms
returning **11 806 features in a single tile**. Two conclusions that point opposite ways:

- **CPU is a non-issue.** Nothing measured here justifies vector tiles on compute grounds.
- **Transfer is the issue, and the ceiling is lower than the render benchmark suggests.** Coordinate
  precision is not the lever (the source is already at 5 dp; rounding to 4 dp saves only 10 %) —
  vertex count is. Naive decimation to 1/8 of points, with visibly degraded shapes, still lands at
  **8.8 MB**; even `quantize(1e4)` TopoJSON lands at 13.0 MB. And against the HTTP Archive 2025 Web
  Almanac, **the median mobile page is 2 362 kB** — so a 5 MB inline GeoJSON is roughly **twice an
  entire median web page**, uncacheable separately, blocking HTML parse.

**So the honest ceiling for a self-contained artifact is ~1–2 MB inline / a few thousand polygons** —
a département or a city's districts, not all of France. That is comfortably above every subset in
§4.1–4.2 (the worst, Russia's 86 ADM1 units, is 1.9 MB) and below the whole-country-ADM3 case.
Full-detail national coverage wants PMTiles, which — being a single static file — would not break
local-first ownership.

*On documented vendor guidance, plainly: there is very little.* MapLibre's own large-data guide gives
**no** feature-count or size threshold. Mapbox's is the closest to a number (*"over 500,000 data
points"*), and a MapLibre maintainer's rule of thumb is *"below 50,000 points"* for inline GeoJSON.
All of those are **points, not polygons**, and polygons are much heavier per feature, so none
transfers cleanly. The one peer-reviewed polygon benchmark located (MDPI IJGI 14(9):336, MapLibre /
Mapbox / OpenLayers / Leaflet at 10k–50k polygons) returned HTTP 403 and could not be read — **that
is the gap to close if this number becomes load-bearing.**

---

## 5. The seams that must move

Identified in files, with rough cost. This is **not** a design — it is the list of joints that any
option has to open.

### 5.1 `skills/map-native/src/basemaps.ts` — the registry stops being a hardcoded literal

Today: a 2-entry `Record<string, {joinKey, label}>` const, with `resolveBasemapMeta` throwing a
listed error on an unknown name. `BASEMAP_NAMES` is imported by
`skills/map-native/src/validate-config.ts` (4 call sites via `validateBasemap`) and by
`lib/loop/assemble/map-native.ts:13`.

It must become a **resolver over a described geography** rather than a closed enum:
`{ source, level, scope, joinKey }`. The `label` is currently human-facing only; the join key must
stop being one string per basemap and become *a set of candidate keys* (§3.3 shows a single ADM1
feature carries 9+ joinable identifiers). **Cost: small file, wide blast radius** — every
`BASEMAP_NAMES.includes(...)` check and every "valid basemaps: …" error message is written against a
closed list.

### 5.2 `skills/map-native/src/geo-match.ts` — grows a level axis, and stops being O(basemaps × columns)

Today `matchGeography(columns, rows)` loops **every column × every shipped basemap**, reads the whole
geojson per basemap (`keysOf`, cached), and keeps the best match by count. Two structural problems
against the widened requirement:

1. **It cannot scale to "every level of every country."** The current loop over 2 basemaps becomes a
   loop over ~199 ADM1 + 180 ADM2 + 81 ADM3 sets. It must invert: **index the identifiers once**
   (a compact key → `{scope, level, featureId}` table built at pack time), then look the data's
   values up, rather than scanning candidate basemaps.
2. **It matches on one key per basemap.** It must try the identifier *families* of §3.3 and report
   *which* one won — because the winning family is what the produce step needs to subset by, and
   what a journalist needs told ("matched on ISO 3166-2", "matched on French name").

Its two invariants are worth preserving verbatim: **it never throws** (I1 — `lib/loop/orient.ts`
calls it with no try/catch) and **it always names the orphans**, not just a count. Both survive the
change. **Cost: the largest single piece of work.**

`GeoMatch` itself (`lib/core/production-brief.ts:32`, mirrored as `GeoMatchSchema` in
`lib/loop/manifest.ts:190`) is `{column, basemap, matched, total, unmatched}`. `basemap: string`
becomes a geography descriptor, and both copies must move together — the manifest schema is
persisted, so this is a **migration**, not just a type change (`lib/loop/migrate.ts` precedent).

### 5.3 The produce step gains a subsetting stage — and the seam already exists

`skills/map-native/vite.config.ts` is 30 lines and already does the injection:

```ts
const injectedConfig = process.env.CONFIG ? JSON.parse(readFileSync(process.env.CONFIG, "utf8")) : null;
define: { __INTERACTIVE__: ..., __CONFIG__: JSON.stringify(injectedConfig) }
build: { assetsInlineLimit: interactive ? 100_000_000 : 4096 }
```

`src/mount.tsx` reads `declare const __CONFIG__`. **The geometry can ride the exact same path** — a
`__GEO__` define, or a `geometry` field on the config — and `vite-plugin-singlefile` inlines it.
The subsetting stage itself is `filter → prune properties → simplify at a tolerance derived from the
render width → write`, which is precisely what §4 measured. **Cost: genuinely small.** The expensive
part is not the plumbing, it is deciding the tolerance from the channel's render width (Splash
already knows the render width — `skills/splash/src/channel.ts`).

### 5.4 `ChoroplethMap.tsx` — `GEOJSON_BY_BASEMAP` is the wrong shape and should go

```ts
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
import usStatesGeoJsonRaw from "../assets/geo/us-states.geojson?raw";
const GEOJSON_BY_BASEMAP: Record<string, GeoJSON.FeatureCollection> = { world, "us-states" };
```

Two static `?raw` imports are what makes every artifact carry 4.1 MB of geodata it does not draw
(§1). A registry of N geographies cannot be expressed this way at all — you cannot statically import
199 countries × 3 levels. **`GEOJSON_BY_BASEMAP` must be replaced by "the geometry arrives with the
config"**, which is the same seam as §5.3.

**Cost: small and mechanical — and the blast radius is smaller than expected.** Counted: exactly
**8 static `?raw` geojson imports across 8 files** (plus one `vite-env.d.ts` module declaration):

```
map-native/src/ChoroplethMap.tsx   world + us-states   ← the only one with two
map-native/src/CartogramMap.tsx    world
map-native/src/DotDensityMap.tsx   world
map-native/src/RouteMap.tsx        world
scrolly/src/ScrollyMap.tsx              ../../map-native/assets/geo/world.geojson?raw
scrolly/src/ScrollyDotDensityMap.tsx    ../../map-native/assets/geo/world.geojson?raw
scrolly/src/ScrollyCartogramMap.tsx     ../../map-native/assets/geo/world.geojson?raw
scrolly/src/Scrolly.tsx                 ../../map-native/assets/geo/world.geojson?raw
```

Note the four `scrolly` imports reach **across the skill boundary** into `map-native/assets`. Any
change to how geometry is delivered has to move both skills together, and `skills/splash/scripts/
bundle-source.mjs` — whose import tracer already special-cases `.geojson` as a leaf asset
(`RESOLVE_EXTS` includes `.geojson`; `if (/\.(json|geojson|css)$/i.test(f)) continue`) — has to
learn that the geometry is no longer a static import at all, or the exported "code source" bundle
will build without its map.

### 5.5 Two guards that must move with it

- **`lib/loop/assemble/map-native.ts:200`** hard-refuses any non-`world` basemap for `dot-density`,
  because `DotDensityMap.tsx` hard-imports `world.geojson` and hard-codes `iso_a3`. That refusal is
  correct today and becomes **dead or wrong** the moment geometry arrives with the config — it must
  be re-derived, not deleted.
- **`lib/loop/assemble/map-native.ts:113`** refuses below half the rows matching. That threshold is
  sane at ADM0/ADM1 and **dangerous at ADM3**, where §3.2 shows ~11 % of French rows can match the
  *wrong* polygon with 100 % confidence. A count-based gate cannot see a mis-join. At depth the gate
  has to become "matched on an unambiguous key" rather than "matched enough rows".

### 5.6 `computeChoropleth` merges the journalist's values into feature properties

`skills/map-native/src/choropleth-geo.ts` builds `coloredWorld` with the data baked into
`properties`. Under a Natural Earth (public domain) geometry that is harmless. Under **any ODbL
geometry it is the difference between a Collective Database and a Derivative Database** (§2.4). If
journalist-supplied ODbL files are ever accepted, this one line decides whether share-alike reaches
the newsroom's own numbers. **Cost: small if done deliberately, expensive if discovered later.**

### 5.7 The manifest gains a declared geography input — and the precedent is already in the repo

`lib/loop/manifest.ts:127` already models exactly this shape for the journalist's own photographs,
added days ago:

```ts
export const ImageFrameSchema = z.strictObject({
  frameRef: z.string().min(1),
  alt: z.string().min(1),
  credit: z.strictObject({ name: z.string().min(1), url: z.string().optional() }),
});
export const ImageInputSchema = z.strictObject({ dir: z.string().min(1), frames: z.array(ImageFrameSchema) });
```

sitting in `input: { data, article, images }` (`manifest.ts:334`). Its header comment states the
principle precisely:

> "The journalist's own photographs, declared with the run — NOT frozen the way `data`/`article` are
> (no HashRef, no sha256): freezeInput copies a single file it can hash on the spot, while an image
> folder stays where the journalist keeps it and is read by `frameRef` at produce time."

**`alt` and `credit` are `.min(1)` — required, un-inventable.** That is the same editorial contract
a boundary file needs: the licence and the attribution string are facts about the source that Splash
must not fabricate, exactly as it must not fabricate a photo credit. **Cost: small — the shape
exists, and the strict-schema/shared-schema discipline is already written down.**

---

## 6. The options

### 6.0 What a journalist-supplied boundary file would demand

Before judging the options, the cost of the one that lifts the ceiling. Everything below was
measured or read on a primary source; the residual gaps are named in §8.

**The silent failure is the CRS, and it is silent by design.** RFC 7946 §4 is absolute:

> "The coordinate reference system for all GeoJSON coordinates is a geographic coordinate reference
> system, using the World Geodetic System 1984 (WGS 84) datum, with longitude and latitude units of
> decimal degrees."

and the escape hatch was deleted — §B: *"Specification of coordinate reference systems has been
removed."* **So a `.geojson` in Lambert-93 is simply non-conformant, and no metadata can rescue it.**
Demonstrated here by reprojecting the measured Swiss cantons:

| CRS | first coordinate | `crs` member emitted? |
|---|---|---|
| WGS84 (correct) | `[7.8496, 45.9397]` | n/a |
| **EPSG:2056** CH1903+/LV95 — what swisstopo and QGIS hand a Swiss journalist | `[2549973.72, 1139501.7]` | **no** |
| **EPSG:3857** Web Mercator | `[755647.84, 5845490]` | **no** |

**What actually happens downstream is worse than "it errors" — measured against geojson-vt's own
projection, which is what MapLibre runs on an inline GeoJSON source:**

| input | → world x (valid 0–1) | → world y |
|---|---|---|
| Bern WGS84 `7.4474, 46.9481` | 0.5207 | 0.3519 |
| Bern LV95 `2600000, 1200000` | **7222.7** | **0.2904** |
| Paris L93 `652000, 6862000` | **1811.6** | 0.3786 |
| London BNG `530000, 180000` | **1472.7** | 0.5000 |

**Nothing throws.** Every one was accepted and emitted tile geometry (coordinates ~29 584 270 against
a 4096 tile extent), placed thousands of world-copies east, with an empty console. MapLibre's
`geojson_worker_source.ts` validates *structure* only — there is no `180`/`90` check anywhere in it.
And the latitude half is the nastier one: `1200000` does **not** clamp, it aliases through sine
periodicity (1 200 000 mod 360 = 120°) to a **plausible-looking latitude near 57°N**. The data does
not vanish; it silently lands somewhere real.

**A range check is close to sufficient, and now quantified.** Sweeping **all 6 188 projected CRS in
`epsg-index`** with parseable definitions, projecting 9 points of each CRS's own declared area of
use: **exactly 2 passed `|x| ≤ 180, |y| ≤ 90`** — one a data artefact (`EPSG:900913`, `bbox [0,0,0,0]`),
the other `EPSG:102069`, an ESRI 150-km-unit atmospheric grid. This is also what mapshaper does, and
its function is honestly named `probablyDecimalDegreeBounds()`.

**The real false negatives are degree-valued, not metre-valued** — three, each measured:

1. **Wrong datum, right units.** 539 geographic CRS are in degrees; no range check can touch them.
   ED50 ≈ **147–150 m** off, OSGB36 geographic ≈ **125–160 m**. Note the inverse trap: ETRS89/RGF93
   (`EPSG:4258`) and NAD83 are **true positives that must not be rejected** — proj4 models them
   `+towgs84=0,0,0`, identical to WGS84.
2. **Non-Greenwich prime meridian.** NTF (Paris) `EPSG:4807`, still common in older IGN exports:
   Paris comes out at lon `0.0150`, Brest at `−6.8272` — plausible, displaced **~171 km west**.
3. **Axis swap**, and it is worse than "both ≤ 90": it needs only `|lon| ≤ 90`, i.e. all of Europe,
   Africa and the Americas east of 90°W. Bern `[7.44, 46.95]` swapped lands in Somalia; London in
   the Indian Ocean; New York in Antarctica. Detectable only when `|y| > 90`.

**⚠️ CORRECTION — winding order does NOT affect MapLibre's inline-GeoJSON path.** This was the
premise I carried into the draft, and testing killed it. geojson-vt's `convert.js` computes signed
ring area then does `out.size = Math.abs(size)` — **it discards the sign** — and earcut classifies
rings by **array order** (first = exterior, rest = holes), per GeoJSON semantics. Measured:

```
earcut RFC-correct (CCW outer, CW hole): { triangles: 8, area: 84 }
earcut reversed    (CW outer, CCW hole): { triangles: 8, area: 84 }   ← identical
geojson-vt tile geometry identical for both windings? true
```

A shapefile-convention polygon renders identically. Winding *is* load-bearing one level down, in the
**Mapbox Vector Tile spec** (*"An exterior ring is DEFINED as a linear ring having a positive area…
The winding order of the polygons is VERY important"*) — so it matters if Splash ever emits vector
tiles, and not before. Rewind on ingest anyway because it is cheap and makes output portable, but
**do not sell it as a rendering fix**, and per RFC 7946 §3.1.6 — *"parsers SHOULD NOT reject Polygons
that do not follow the right-hand rule"* — **never reject on it**. (The fixer is
`@mapbox/geojson-rewind` or `@turf/rewind`; **`d3-geo` has no `geoRewind`** — 47 `geo*` exports, none
of them that.)

**Two more RFC details a validator will get wrong if it is naive:** §3.1.9 says antimeridian-crossing
geometry SHOULD be cut in two, and §5.2 says a crossing bbox has `bbox[0] > bbox[2]` — **legal, not
corrupt**. A `minX < maxX` assertion rejects valid Fiji and Chukotka data.

**Format ranking, from what each costs:**

| format | CRS safety | verdict |
|---|---|---|
| **GeoPackage** (OGC 12-128r19) | **`gpkg_spatial_ref_sys` is mandatory**; every table declares its `srs_id` as structured data | **The only format where detection is deterministic, not heuristic.** `@loaders.gl/geopackage` is 99.5 kB pure-WASM (vs `@ngageoint/geopackage` at 13 MB unpacked). Not executed under Bun — verify. |
| **GeoJSON** | WGS84 mandated, undeclarable otherwise → range check | The sane default ingest target |
| **Shapefile** | `.prj` is a **later vendor convention, absent from the 1998 spec** | Accept it, because it is what journalists actually send. Winding is inverted by spec (*"always in clockwise order"*). DBF encoding has no dependable default — the three main JS libraries default to **three different encodings**, which is the proof. `Genève` in cp1252 read as UTF-8 → `Gen<?>ve`, **irreversible**. |
| **TopoJSON** | **⚠️ explicitly permits projected CRS** (§2.1.1: "easting, northing … in a projected coordinate reference system") with no way to declare which | **Strictly worse than GeoJSON for ingest safety** — a quantized Lambert-93 TopoJSON is fully conformant and undetectable except by range check. Also: **MapLibre cannot consume it** (source types are `vector, raster, raster-dem, geojson, image, video`), so it must be decoded first. Great as *storage* for Splash's own basemaps (measured: shared arcs −41 %, quantization another ~45 %, decode 63 ms). |
| **KML/KMZ** | **mandates WGS84**, no alternative-CRS mechanism (OGC KML 2.3 §6.2) | The reprojection problem vanishes — a real argument for accepting Google Earth exports. Cost is attributes: plain `<Data><value>` is always raw string, no schema. `@tmcw/togeojson` **does not handle KMZ**. |

**On reprojecting rather than refusing — proj4js is more capable than assumed, but not enough.**
Measured: `Object.keys(proj4.defs).length === 130`, and it **does** ship all 120 UTM zones plus
`4326/4269/3857`. It does **not** ship `2056`, `2154`, `27700`, `4258` — the exact four a European
journalist needs — and calling them **throws a bare string, not an `Error`**, so `catch (e) =>
e.message` prints `undefined`. The projections themselves (`somerc`, `lcc`, `omerc`) are in the
default bundle, and feeding raw ESRI WKT straight from a `.prj` works. Verified round-trips:
LV95 `[2600000,1200000]` → `7.43863, 46.95108`; Lambert-93 → `2.34581, 48.85625`; BNG →
`−0.12835, 51.50399`. Accuracy without a grid shift ≈ 163 m; with a 3-parameter Helmert ≈ **1 m**
(swisstopo's own figure) — fine for a newsroom map. Watch two failure modes: a missing mandatory
grid yields **`[NaN, NaN]`** (treat non-finite output as hard failure), and a missing `@`-prefixed
optional grid is a **silent no-op with a wrong answer**.

**⚠️ And the EPSG dataset is not open — this is a licence finding, not a footnote.** From
https://epsg.org/terms-of-use.html:

> "The EPSG Facilities are published by IOGP at no charge. **Distribution for profit is forbidden.**"
> "The data may be included in any commercial package provided that any commerciality is based on
> value added by the provider"
> "**Ownership of the EPSG Dataset by IOGP must be acknowledged** in any publication or transmission."
> "You are obliged to inform anyone to whom you provide the EPSG Facilities of these Terms of Use."

Redistribution *is* permitted, so bundling a `{code → proj4, bbox}` subset (measured: 1.5 MB raw /
199 kB gzipped) is fine — but **the repo would need an IOGP acknowledgement and the terms text as a
separate file**. Splash's *code* stays MIT; that *data* is not MIT, and the npm packages' ISC/CC0
claims are the packagers' and do not override IOGP. A GeoJSON-only v1 that refuses projected files
avoids taking this dependency at all.

**Size is not the constraint** (§4.5): even 35 228 polygons at 45 MB render. The constraint is page
weight, and the same subsetting stage that Option B needs solves it for supplied files too.

**And the non-administrative half of the requirement is served by essentially nothing.** This was
researched and the answer is stark:

- **Postal-code polygons.** GeoNames' postal dump is **points only** — one lat/lon per code, no
  boundary. OSM has near-complete postcode coverage in **four countries** (Geofabrik, verbatim:
  *"Deutschland, Österreich (einzelne Lücken), Belgien (nur Flandern), Ungarn"*). UK Code-Point Open
  is **centroids only** — the polygons are a paid Ordnance Survey product. France states it outright:
  *"Les contours géographiques des codes postaux ne sont pas fournis en open data."* Eurostat has
  European ones and they are **non-commercial** (§2.4b). **The US ZCTA (Census, public domain) is the
  exception, not the rule.**
- **Electoral districts.** The only multi-country set located is **CLEA GRED — 167 maps, 74 countries,
  frozen at a 2019 release, licence unresolved** (re3data records it as "Copyrights"; the CLEA site
  403s).
- **Catchments, precincts, circulation areas, a newsroom's own zoning.** No identifier, no standard,
  no source anywhere.

**This settles the architecture question.** It is not that a journalist-supplied path would be *nice*
alongside shipped data. For everything that is not an administrative unit — and for French communes,
Thai districts, and any postal-code map outside the United States — **it is the only mechanism that
can exist.**

**And the licence and the credit are editorial facts, not metadata — now with evidence.** Five real
sources were read, and the pattern is decisive:

| source | what it requires |
|---|---|
| **France, IGN ADMIN EXPRESS** (Licence Ouverte 2.0) | *"mentionner la paternité de l'«Information» : sa source (a minima le nom du «Concédant») et **la date de la dernière mise à jour**"* — **no fixed string; the licence mandates a shape.** And INSEE's COG, on the same portal, is LO **1.0** with a differently-named party |
| **Switzerland, swisstopo swissBOUNDARIES3D** | a **closed list of six** accepted strings, of which plain **`©swisstopo`** is one. The single case where a canned string is legitimate |
| **UK, ONS / Ordnance Survey** (OGL v3.0) | OGL *delegates* the wording — *"any attribution statement specified by the Information Provider(s)"*. ONS specifies: *"Source: Office for National Statistics licensed under the Open Government Licence v.3.0 / Contains OS data © Crown copyright and database right **[year]**"* — that literal bracketed placeholder is the whole point |
| **USA, Census TIGER/Line** | *"Copyright protection is not available for any work of the United States Government… **We would ask, however, that you cite the Census Bureau as the source.**"* — **requested, not required**; the only source here where omission is not a breach |
| **OpenStreetMap** (ODbL) | `© OpenStreetMap contributors`, plus the share-alike edge of §2.4 |

**Three of the five require a year or edition date that appears nowhere in the geometry file**, and
file mtime cannot supply it — a 2026 re-download of the 2021 edition has a 2026 mtime. Splash cannot
infer any of this, and must not invent it — which is exactly the contract `ImageFrameSchema` already
encodes for a photograph's `alt` and `credit` (§5.7). **A supplied boundary file should be
undeclarable without them.**

**The record a supplied file needs**, then, is
`{format, detected CRS, reprojection applied, join key, attribution string, licence, source URL,
edition/date}` — where the **CRS half can be largely mechanised** (range check has ~zero false
negatives against metre-based CRS; GeoPackage declares it outright) and the **credit half genuinely
cannot**.



### Option A — ship a curated set of extra basemaps

Add `ch-cantons`, `th-provinces`, `ar-provinces`, `fr-departements`… to `BASEMAPS` and `assets/geo/`.

| | |
|---|---|
| local-first | ✅ perfect |
| MIT | ✅ with Natural Earth |
| self-containment | ❌ **worsens it** — every extra file is statically imported and inlined into *every* artifact (§1). Ten curated basemaps ≈ a 10 MB artifact that draws one of them. |
| "anywhere, any scale" | ❌ **no.** Caps at ADM1 (Natural Earth has no non-US ADM2), covers the countries someone thought of, and covers zero non-administrative zones. |
| cost | small per basemap, and **linear forever** |

**Verdict: a stopgap, and it must be named as one.** It unblocks the pilot's cantons in an afternoon
and it makes the artifact-weight problem worse while doing so. Legitimate only as a deliberate
holding move with a stated end date.

### Option B — one global source on disk + subset at produce time

Ship NE 10m admin_1 as a packed source (~6.7 MB TopoJSON, §4.3). At produce, filter to the drawn
features, prune properties, simplify at a tolerance derived from the render width, inject through the
existing `__CONFIG__` seam.

| | |
|---|---|
| local-first | ✅ perfect — no network at produce |
| MIT | ✅ Natural Earth is public domain |
| self-containment | ✅ **and it makes it dramatically better** — Swiss cantons 40–95 kB instead of 4.1 MB; a 98 % cut on the geo payload of *every* map |
| "anywhere, any scale" | ⚠️ **partly.** ADM0 + ADM1 anywhere on earth, at any width. **ADM2 only in the US, ADM3+ nowhere, non-administrative zones nowhere.** |
| join quality | ✅ **excellent at ADM1** — ISO 3166-2 + HASC + postal + 26 languages + alias lists, all on the feature (§3.3). Geneva/Genf/Genève resolves with no extra data. |
| cost | the real work is §5.2 (geo-match) and §5.4 (~20 components); §5.3 is small |

**Verdict: necessary, sufficient for two rungs of five, insufficient alone.** It is also the only
option that *reduces* artifact weight, and it fixes the pilot properly.

### Option C — fetch on demand from a remote service

Query geoBoundaries' API (or Overture, or an Overpass endpoint) at produce time for the geography
needed.

| | |
|---|---|
| local-first | ❌ **violates the socle.** A produce that needs the network is a produce that fails in a newsroom behind a proxy, on a train, or in five years when the endpoint moves. |
| MIT | ⚠️ per-file licence roulette — 270/715 geoBoundaries files are ODbL/SA (§2.2). Swiss cantons are swisstopo-licensed, **Thai provinces are ODbL**, French communes are ODbL. A fetching pipeline would have to read and honour `boundaryLicense` per response and fail loud on an unexpected value — and would still be handing the newsroom an ODbL artifact for the owner's own example. |
| self-containment | ✅ once fetched |
| "anywhere, any scale" | ⚠️ deepest coverage available (ADM3 in 81 countries) but **Thailand and Argentina — two of the three countries named — stop at ADM2**, and non-administrative zones are still absent |
| reproducibility | ❌ geoBoundaries `current` moves under you; a build must pin a commit SHA |
| cost | medium, plus a permanent operational dependency |

**Verdict: rejected as a default.** Defensible only as an explicit, opt-in, journalist-invoked
"fetch me the boundaries for X" step whose output is then frozen into the run like any other input —
which is Option D wearing a helper.

### Option D — the run declares its own boundary file ★ RECOMMENDED, together with B

The manifest gains a geography input beside `data`, `article` and `images`: a path to a boundary
file, plus the two facts Splash must not invent — **the licence and the credit** — exactly as
`ImageFrameSchema` requires `alt` and `credit` (§5.7). Splash validates, subsets, joins, and carries
the attribution into the artifact. It does not own the geography.

| | |
|---|---|
| local-first | ✅ perfect — the file is on the journalist's disk |
| MIT | ✅ **and it resolves the licence problem instead of fighting it.** Splash ships nothing; the newsroom is the publisher choosing an ODbL, swisstopo, IGN or in-house source, and Splash records that choice. |
| self-containment | ✅ same subsetting as B; §4.5 shows even the extreme cases render |
| **"anywhere, any scale"** | ✅ **the only option that actually answers it.** Electoral districts, postal areas, catchments, a newsroom's own zoning — none of which exists in any global dataset — enter the same way. |
| join quality | ✅ **the only option that works at ADM3+**, because the journalist's file carries the same national code (INSEE, BFS, ISTAT, AGS, IBGE, FIPS) their CSV already uses — the one thing §3.2 shows actually disambiguates |
| cost | medium: format acceptance + validation (CRS, winding, geometry sanity) + the manifest field; the schema shape is already written |

### The recommendation

**Do B and D together, and name A as the stopgap it is.**

- **D is the ceiling-lifter.** It is the only option that answers the requirement as stated, and the
  repo has already made this exact move once, days ago, for photographs. The same reasoning applies
  verbatim: a boundary file, like a photograph, comes with editorial facts (licence, credit,
  vintage, the tier it represents) that a tool must carry and must never fabricate. It also
  side-steps the entire licence minefield of §2 — Splash stops being a redistributor of ODbL and
  swisstopo data and becomes a validator of what the newsroom brought.
- **B is the convenience layer that makes D usable.** Nobody should have to go find a shapefile to
  map countries or Swiss cantons. Natural Earth admin_0 + admin_1 is public domain, carries a
  genuinely excellent multilingual join surface (§3.3), and — the decisive point — **the subsetting
  machinery B requires is the same machinery D requires.** Building B builds D's engine. Building D
  first and B later would build it twice.
- **B pays for itself before it adds any capability**: it cuts every existing map artifact from
  5.95 MB to ~2 MB (§4.5, §1), because the current design inlines the planet to draw anything.
- **A is legitimate only as a bridge** — if the pilot needs Swiss cantons before B lands, add one
  basemap deliberately, in a commit that says it is a stopgap. Do not let it become the strategy;
  it is the option that scales linearly forever and answers no part of the widened requirement.

- **And the join layer should be built once, for both.** §3.1 showed that the *crosswalk* problem
  and the *geometry* problem decompose: Natural Earth's 26 language fields and alias lists, plus
  GeoNames' CC BY 4.0 code tables (152 kB at ADM1, 2.4 MB at ADM2, 189 countries), give a
  licence-clean multilingual matcher for the whole planet down to ADM2 — linked by the `gn_id`
  Natural Earth already carries on 97 % of ADM1 features. That matcher serves B's shipped geometry
  *and* helps a journalist's supplied file, which usually carries a national code the matcher can
  recognise. Measured cost: a 1.4 MB build-time index, 96.5 % unambiguous (§3.4).
- **Whatever is built, it must carry a vintage and fail loud.** §3.6 is the argument: ISO lags
  reality by years, four datasets ship four different Norways, and codes have been silently
  reassigned to different places (`PH-13`). A matcher that reports "94 % matched" and quietly drops
  the rest is the mechanism by which a wrong map ships under a journalist's byline. `geo-match`'s
  existing invariant — *it always names the orphans, never just a count* — is exactly right and
  should be strengthened, not relaxed, as coverage grows.

One-line reasoning for the record: **shipped data can never be complete — and below ADM1 it cannot
even be licence-clean — so the boundary file has to be an input the run declares, the same shape the
repo just gave photographs, with Natural Earth subset-at-produce as the batteries-included default
for the cases everyone needs.**

### What the recommendation is NOT

- It is **not** "ship geoBoundaries". Its per-file licences are heterogeneous in a way that hits the
  owner's own three countries (§2.2), and below ADM1 it carries no join key at all (§3.2).
- It is **not** "fetch at produce". That trades the local-first socle for coverage that still stops
  at ADM2 in Thailand and Argentina.
- It is **not** "support every format on day one". §6.0's open questions can be answered by
  accepting **GeoJSON and TopoJSON only**, validating hard, and **refusing loudly** anything else —
  including a projected CRS — until there is evidence that reprojection is worth carrying.

---

## 7. What is still unknown

Ordered by how much it would change the plan.

1. **Does geoBoundaries' CC BY 4.0 re-licence supersede the upstream ODbL/CC-BY-SA of its 270
   affected files, or is it cumulative?** The CITATION-AND-USE wording ("should *additionally*
   ensure") reads cumulative. If cumulative, geoBoundaries cannot be a *shipped* source without
   per-file gating — including for the pilot's own Swiss cantons, which are swisstopo-licensed.
   **Settle it:** email team@geoboundaries.org.
2. **Does OSMF consider a self-contained HTML with inline GeoJSON a Produced Work or a Derivative
   Database?** No endorsed guideline addresses an interactive web artifact. The reading in §2.4 is
   a reading. It decides whether journalist-supplied OSM data can be inlined at all, or only
   rendered to PNG/mp4. **Settle it:** the OSMF Licensing Working Group, in writing.
3. ~~What formats a journalist-supplied path must accept, and how to validate one.~~ **Largely
   resolved** (§6.0): CRS detection is quantified (2 false positives out of 6 188 projected CRS),
   the winding premise was **disproved** for this renderer, `proj4js`'s 130 bundled defs are
   enumerated, and the format ranking is evidence-backed. What remains is a *decision*, not a
   research gap: whether to take the EPSG-dataset dependency (non-open, IOGP acknowledgement
   required) in order to reproject, or to refuse projected files in v1.

3b. ~~Is there a free global postal-code polygon set?~~ **Resolved: no** (§6.0). Points yes, polygons
   only in four OSM countries and the US ZCTA. This promotes the journalist-supplied path from
   "recommended" to "the sole mechanism" for postal-code and electoral maps.

3c. **Is FAO GAUL 2024 really CC BY 4.0?** (§2.4c) It is the only plausible licence-clean *global*
   ADM2 geometry. FAO's own page 403s to automated fetching. **Settle it:** open it in a browser. If
   confirmed, the ADM2 tier stops being a hole and §6 should be re-judged.
4. **Is Natural Earth maintained in 2026?** Four years with no release, no archive notice, 445 open
   issues. Boundaries frozen at 2022 means Splash would ship a stale world (recent admin
   reorganisations — Norway's fylke reform, Turkish and Kazakh renames — will be wrong). **Settle
   it:** NACIS, or the `nvkelso/natural-earth-vector` issue tracker.
5. **How prevalent is `src:geom = osm` in Who's On First outside CH/LI?** 0/34 916 in Switzerland is
   promising and the check is mechanical and cheap. If it holds broadly, WOF is a licence-auditable
   deep source. **Settle it:** download more `whosonfirst-data-admin-*` repos and count — the method
   is exact.
6. **What tolerance does the subsetting stage actually pick, per channel?** §4.1 establishes the
   rule (one pixel at render width) and shows percentage-based simplification is unusable, but the
   number has to be threaded from `skills/splash/src/channel.ts` and verified at render, not
   asserted. **Settle it:** the render-verification discipline the repo already uses.
7. **The whole-country-at-ADM3 case.** 35 228 French communes is 8.8 MB TopoJSON and renders in
   2.8 s (§4.4, §4.5) — viable but unpleasant as a single HTML file. Whether that needs vector
   tiles, a coarser tier, or a refusal is an open product decision, not a technical unknown.
8. **Disputed-territory posture.** Natural Earth ships 41 `FCLASS_*` worldview fields; geoBoundaries
   CGAZ takes the US State Department line while its per-country files let nations self-represent
   and can overlap. Splash makes this choice silently today. Whatever ships, it should be a stated
   editorial default, not an accident of which file was downloaded.

---

## 8. What this document did NOT establish

Named explicitly so nothing here reads as more complete than it is.

**Track: identifier systems — reported, and it changed one premise.** Resolved: the ISO 3166-2 list
is *not* demonstrably free (§3.1, CLDR + Wikidata are the shippable substitutes); HASC's register is
plain copyright but survives inside public-domain Natural Earth; OSM tag fill rates measured
(`wikidata` 99.3 %/81 %/77 % at levels 4/6/8, and the national-code keys); P-codes cover ~168
humanitarian countries; postal-code and electoral polygons are essentially unserved (§6.0);
name-collision rates measured for eight countries (§3.2); vintage/rename failure modes catalogued
(§3.6). **Its own residual uncertainties, carried forward verbatim:**
- `iso.org` is unfetchable (403), so **every ISO-side date in §3.6 is Wikipedia's transcription of
  ISO newsletters, not a primary ISO document.** The Türkiye rename date rests on one secondary
  source; the date ISO added `TH-38` (Bueng Kan) is unknown; the *absence* of the Ethiopia-2023,
  Philippines-2024 and Norway-2024 changes could not be proven against ISO's own catalogue.
- **GADM 3.6 ↔ 4.1 GID stability is GADM's own assertion, not empirically diffed** (the 3.6 downloads
  404). Moot given the licence, but noted.
- "LAU code = the national code" has **no verbatim Eurostat confirmation** — inferred from the GISCO
  attribute schema.
- FAO GAUL, IBGE, swisstopo/BFS and US Census licences were **not read on the primary page** (403/500).

**Track: the journalist-supplied file — reported, and it corrected several premises.** Resolved in
§6.0: what actually happens to projected coordinates in MapLibre (nothing throws; latitude aliases
to a plausible value), the range check quantified across 6 188 CRS, the three real false negatives
with measured magnitudes, the format ranking, `proj4js`'s actual contents, and the EPSG licence.
**Premises it disproved, which had been in this document's draft:** winding order does *not* affect
MapLibre's inline-GeoJSON path; `d3-geo` has no `geoRewind`; TopoJSON is *less* CRS-safe than
GeoJSON, not more; shapefile's 2 GB figure is ESRI's implementation limit, not a spec limit (the
spec states none); `.prj`/`.cpg` are vendor conventions absent from the 1998 spec.
**Its own residual uncertainties, carried forward:**
- The **MDPI IJGI 14(9):336** polygon benchmark returned HTTP 403 — the only peer-reviewed MapLibre
  polygon-rendering numbers located. The §4.5 "1–2 MB inline" ceiling is inference from measurement,
  not from a published benchmark.
- Whether `@loaders.gl/shapefile` rewinds rings — unverified.
- **Nothing was executed under Bun** for the GeoPackage or shapefile loaders; `better-sqlite3` has
  documented Bun ABI friction.
- The ONS Northern Ireland attribution line is **not confirmed for boundary products** (ONS scopes
  that material to *postcode* products).

**Also not established here:** whether the geoBoundaries per-file licences are cumulative or
superseded (§7.1); OSMF's position on inline GeoJSON (§7.2); Natural Earth's 2026 maintenance
status (§7.4); FAO GAUL 2024's licence (§7.3c).

**All four research tracks have now reported.** Nothing in §4 (the measurements), §5 (the seams) or
the recommendation rests on the open items above — they bound *how* B and D get built, not *whether*
they are the right pair.

---

## Appendix — how the measurements were made

- mapshaper **0.7.49** via `bunx`, MapLibre GL JS **5.6.2** from `skills/map-native/node_modules`,
  Playwright **1.61.1** (the repo's own version), headless Chromium, 1200×640.
- Natural Earth **v5.1.1** shapefiles from `naciscdn.org` (`ne_10m_admin_1_states_provinces.zip`
  14 909 524 B, `ne_50m_admin_1_states_provinces.zip` 911 408 B), converted with mapshaper.
- French communes from `gregoiredavid/france-geojson@master/communes.geojson` (45 291 317 B,
  35 228 features).
- geoBoundaries via `https://www.geoboundaries.org/api/current/gbOpen/<ISO3>/<ADM>/` and
  `releaseData/geoBoundariesOpen-meta.csv`.
- Deviation figures: for every vertex of the source geometry, the minimum distance to any segment of
  the simplified geometry of the *same* feature, in local equirectangular metres. Script:
  `scratchpad/rm/dev.ts`. Valid for compact extents; it breaks on Antarctica and
  antimeridian-spanning features, and no global-scale deviation figure is claimed.
- Working files (not in the repo): `scratchpad/rm/`, `scratchpad/bench/`.

---

## Décisions de Rémy — 2026-07-28

Prises après lecture des constats ci-dessus, et consignées ici pour qu'un lecteur futur
sache qu'elles sont des choix et non des oublis.

**1. Un fichier OSM apporté par le journaliste alimente TOUS les formats, interactif compris,
avec le crédit OSM complet incrusté dans l'artefact.**

La réserve, telle qu'elle a été posée avant la décision : personne n'a tranché si un HTML
auto-contenu portant des coordonnées inline est une « œuvre produite » (le crédit suffit) ou
une « base de données dérivée » (partage à l'identique imposé à la rédaction qui publie).
Pour un PNG ou une vidéo, le cas est clair et non contesté ; c'est l'interactif inliné qui
est sans jurisprudence. Rémy a choisi de traiter l'artefact comme une œuvre produite.

Conséquence à tenir : le crédit OSM n'est pas décoratif, il est la contrepartie de ce choix —
il doit être présent dans l'artefact livré, pas seulement dans un README. Le jour où une
réponse écrite de l'OSMF existe, elle confirme ce choix ou renverse UNE ligne, identifiée
au moment de l'implémentation.

**2. Sous l'ADM1, quand une jointure est ambiguë ou partielle, Splash MESURE, MONTRE, et fait
TRANCHER le journaliste — puis mémorise la correspondance dans le run.**

Motivée par le constat mesuré ici : 11,5 % des communes françaises et 52,3 % des comtés
américains n'ont pas de nom unique dans leur propre pays, et `nom + parent` ne suffit pas non
plus (293 Gemeinden allemandes se percutent dans un même Land). Exiger une colonne de codes
aurait supprimé l'ambiguïté en rejetant la donnée la plus courante — celle qui ne porte que
des noms. Le tour de dialogue supplémentaire est le prix assumé.

C'est la même discipline que le reste de la boucle : mesurer, montrer les orphelins par leur
nom, laisser la décision éditoriale au journaliste.
