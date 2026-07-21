# map-dw — exact `MapSpec` fields (static choropleth)

Detail for the `map-dw` producer path referenced from `skills/suggest-chart/SKILL.md` (§ map-dw,
static choropleth map — default map path). Read this before filling a `MapSpec`.

## Contents

- [Emitted MapSpec fields](#emitted-mapspec-fields-exact--validated-by-validatemapspec-in-map-dwsrcmap-spects)
- [Field notes](#field-notes)
- [Map colour — newsroom house palette FIRST, else subject-fit](#map-colour--newsroom-house-palette-first-else-subject-fit)
- [Map colour — scaleType by semantic, palette by subject](#map-colour--scaletype-by-semantic-palette-by-subject)

#### Emitted MapSpec fields (exact — validated by `validateMapSpec` in `map-dw/src/map-spec.ts`)

```json
{
  "producer": "map-dw",
  "mapType": "choropleth",
  "basemap": "<DW basemap id — e.g. world-2019>",
  "mapKeyAttr": "<the join key on that basemap — e.g. DW_STATE_CODE for ISO-A3 country codes>",
  "regionKey": "<data column holding region codes/names>",
  "valueColumn": "<data column holding the normalised rate>",
  "data": "<CSV text>",
  "title": "<the insight — sentence case, never a column label>",
  "intro": "<description of the map for context>",
  "altInsight": "<the insight — WCAG alt, same wording as title>",
  "unit": "<the value's short unit as a literal suffix, e.g. ' mm' / '%' / ' €' — see the unit rule below>",
  "source": { "name": "<honest source>", "url": "<its real URL>" },
  "channel": "<the CADRAGE Q6 channel — social-vertical | social-feed | article-web>"
}
```

Field notes:
- `mapType` MUST be `"choropleth"` — required by the validator.
- `basemap` + `mapKeyAttr`: pick the DW basemap whose key matches the region identifiers. Slice 1 supports
  the common case — **countries by ISO-A3 → basemap `"world-2019"`, key `mapKeyAttr: "DW_STATE_CODE"`**
  (`DW_STATE_CODE` is world-2019's ISO-A3 alpha-3 key; verified live it joins ~all ISO-A3 rows). **Do NOT
  emit `mapKeyAttr: "ISO_A3"` on `world-2019`** — world-2019 has no `ISO_A3` join key (its keys are
  `DW_NAME`, `NAME_SHORT`, `DW_STATE_CODE`, `ISO_2`, …), so that combo joins 0 rows and ships a fully grey,
  dataless map. `validateMapSpec` now HARD-rejects it against the `map-dw/src/basemap-keys.ts` registry and
  names the valid keys. Country *names* (English) join on `DW_NAME`; ISO-A2 codes on `ISO_2`. **French
  départements → basemap `"france-metropolitan-departments"`, key `mapKeyAttr: "name"`** (accent-exact
  department names: `"Ain"`, `"Haute-Savoie"`). Its other registered keys do NOT carry what their names
  suggest (probed live): `postal` holds two-letter POSTAL ABBREVIATIONS (`"FF"`, `"CY"`) — **NOT INSEE
  department numbers**, so joining `"01"…"95"` codes on `postal` matches 0 rows (a registered key can
  still be the WRONG key for your columns — the registry only lists which keys exist, not which fits your
  data; the dataless-join guard is the net); `fips` is `"FRB9"`-style; `code_hasc` is
  `"FR.AI"`-style. **No key on this basemap carries INSEE codes** — convert INSEE codes to department
  names first and join on `name`. For any registered basemap, read the valid keys off
  `map-dw/src/basemap-keys.ts` verbatim; for an unregistered one, confirm the exact `mapKeyAttr` via the
  basemap-key discovery `map-dw` documents (`GET /v3/basemaps/{id}` → `meta.keys`, and check the sample
  `keys` VALUES match your data column, not just the key's name) — never assume `ISO_A3` exists on a
  basemap; check its declared keys first. **Basemap SCOPE must match the data's coverage**: a
  sub-national subset (one region's provinces/districts) prefers a region-scoped basemap or `map-native`
  over the full-country cut — see the Choropleth BASEMAP FIT rule in Gate 4 (`validateMapSpec` warns on
  a sparse subset).
- `regionKey`: the data column holding the region codes (ISO-A2/A3, country name, …).
- `valueColumn` (NOT `valueField`): the numeric column with the normalised rate per Gate 5.
- `title`: the spatial finding as a sentence ("Nordic countries generate most of their electricity from
  renewables") — NOT a label or column name.
- `intro`: the description / context for the map.
- `altInsight`: WCAG accessible alternative — the same insight as `title`.
- `source`: the honest source the article names (prose-provenance rule). Never fabricated, and **never the
  data FILENAME** (`youth_unemployment.csv` is not a public attribution) — use the publication the article
  cites, or the honest prose label. **A NAMED dataset/publication (e.g. "Eurostat") MUST carry both its
  name AND a real, verifiable URL — never ship the name alone, and never invent a URL to fill the field.**
  **The URL MUST point to the SPECIFIC, traceable dataset/page the figures come from** (e.g. the Eurostat
  dataset page for the exact table/code, the Insee series page) — a generic organisation homepage
  (`eurostat.ec.europa.eu`, `insee.fr`) is NOT traceable and must be treated the same as a missing URL. If
  the journalist only gives an organisation name, its homepage, or the true specific URL isn't known, ASK
  for the specific dataset/page reference (free text, collecting name + the specific URL together) rather
  than shipping it generic or incomplete. The only legitimate name-only case is the honest prose fallback
  below, which names no separate dataset to link.
- `channel`: the CADRAGE Q6 answer — the same structured channels as `ChartSpec.channel`
  (`social-vertical | social-feed | article-web`, `skills/splash/src/channel.ts`). It sizes the static
  PNG export box (social-feed→1080x1080 square, social-vertical→1080x1920 9:16, article-web→1200x675)
  and the render-size floor verifies the delivered PNG against it. Emit it explicitly: the spine also
  injects the proposal's confirmed channel at dispatch (`withProposalChannel` in
  `skills/splash/src/adapters.ts`, proposal wins), but a spec run directly against `produceMap` has no
  proposal to inherit from and would otherwise silently size against the article-web default.
- `colorScale` (optional): an array of `{color: hex, position: 0..1}` stops, ascending. If omitted,
  `map-dw` applies the default blue sequential scale. Choose the stops from a subject-fit ramp per the
  **Map colour** rule below — do NOT leave every map blue.

**Map colour — newsroom house palette FIRST, else subject-fit.** Same rule as the chart `baseColor`, for
maps. If the project has a newsroom profile with a `palette` (NEWSROOM-PROFILE.md / brand.json — the F2
house style), the **house colour drives the map** and you do NOT pick a subject-fit ramp:
- **sequential** map (magnitude): still emit `subject` + `scaleType:"sequential"`, but do **NOT** emit a
  `palette` (native) or `colorScale` stops (map-dw) — leave the colour UNSET so the produce merge derives
  the house luminance ramp / fill from the house hue. (The merge enforces this regardless — it clears an
  auto palette — but omitting it makes a truthful proposal, and it is the ONLY way map-dw becomes
  house-coloured, since map-dw reads `colorScale`, not `palette`.)
- **diverging** map (a signed anomaly around a midpoint): a single-hue house luminance ramp cannot encode a
  signed divergence — so KEEP the subject-fit diverging `palette`/`colorScale` (the house colour is not
  applied to diverging maps; a house diverging ramp is a follow-up).
- The ONE exception (either scale): if the journalist EXPLICITLY names a colour/ramp for THIS map, honour it
  AND set `baseColorExplicit: true` — that flag shields it from the house palette (mirrors the chart rule).

No profile → choose the ramp by subject, as below.

**Map colour — scaleType by semantic, palette by subject** (palette-freedom principle: free choice guarded
by CVD-safety; the conformance guard FAILS a semantic↔scaleType mismatch, a non-CVD-safe ramp, and a clear
subject left on the library default). Two decisions:
1. **scaleType from the data semantic** — magnitude (all one sign, a rate/count/year) → `sequential`;
   an anomaly / signed value around a meaningful midpoint (change, deviation, gain↔loss) → `diverging`;
   unordered categories → a qualitative scheme (not a ramp).
2. **`palette` from the subject** — a named registry palette from `map-native/src/theme/scale.ts` (the
   choropleth mirror of the chart `baseColor` rule: the ramp HUE must fit the subject, never fall through
   to blue by default):
   - sequential: **energy / electricity / solar / heat / fire → `oranges`** (warm = light/power — a blue
     ramp reads water/cold/generic, wrong for an energy story); water / rainfall / cold / marine → `blues`
     (the ONE case blue is correct); environment / forest / vegetation → `greens`; culture /
     politics-neutral magnitude → `purples`
   - diverging: temperature/anomaly → `rdbu` (red = warm/high); environment deficit↔surplus → `brbg`;
     neutral signed change → `puor`; legacy orange↔blue → `orbu`
Emit `subject` + `scaleType` + `palette` on the map config (native) or subject-fit `colorScale` stops
(map-dw). Every registry ramp is vetted CVD-safe (a single-hue sequential ramp is always CVD-safe), so any
FITTING choice passes; the rule is the choice must FIT the subject — **NEVER the blue default for a
non-water subject.** The produce guard (`checkPaletteConformance`) FAILS a declared `subject` sitting on the
default blue, so an energy/electricity map MUST carry `palette:"oranges"` — the exact recurrence guarded.
- `numberFormat` (optional): format string to strip noise from the value labels.
- `unit` — **EMIT IT whenever the measured quantity has a short unit (mm, %, €, t, hab.)**; omit only
  when the quantity truly has none (a count of people, an index). The unit is part of faithful data
  representation, not decoration: it feeds the legend endpoints AND the hover tooltip — a reader hovering
  a rainfall map must read "624 mm", never a bare "624". It is a LITERAL suffix with the leading-space semantics `map-dw/src/map-spec.ts`
  documents: include a leading space unless the unit hugs the number (`" mm"` → "624 mm", `" €"` →
  "17 600 €", `"%"` → "70%"). Do not double-declare a percent — either `unit:"%"` or a `"%"` `numberFormat`
  token is enough on its own (map-dw suppresses the collision, but one declaration is the honest spec).
