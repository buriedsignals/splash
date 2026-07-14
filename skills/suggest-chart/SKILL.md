---
name: suggest-chart
description: Use to decide which visual ELEMENT (chart or map) + FORMAT + producer serves an article's intent, and emit the right spec. Routes to dw-chart (static chart, default), chart-native (motion/interactivity), map-dw (static choropleth map), or map-native (interactive/video choropleth map). Reads the data profile + the editorial intent, grounded on the KB references. Keywords suggest, choose chart, map, choropleth, geographic, map-dw, map-native, format selection, intent, dataviz, orchestration, producer, datawrapper, chart-native, video, interactive.
---

# suggest-chart — decide the visual element, format, and producer

## Overview

The visual-element suggester. Given a **data profile** (columns, types, cardinality) and an **editorial
intent**, it decides the right visual element (chart or map), format (static / interactive / scrolly / video),
and producer, then emits the matching spec. It never invents data; if no visual serves the story, it says so.

Producers: **dw-chart** (static Datawrapper chart — default), **chart-native** (motion or rich interactivity),
**map-dw** (static choropleth map via Datawrapper), **map-native** (interactive / video choropleth map),
**scrolly** (scroll-driven guided narrative — geographic, Gate 3).

## Inputs

- Data (CSV or a profile of it) + a one-line **intent** ("show the unemployment trend 2018-2023").

## Language

**Every reader-facing string you emit — `title`, `intro`, `altInsight`, `directLabel`, annotation
text, and any source label you write — MUST be in the language of the article / the journalist's
dialogue (detected upstream), never English by default.** A French newsroom gets a French chart
title, not an English one. Do not translate proper nouns, the source publication's name, or data
values themselves.

**You MUST also set the `lang` field on the emitted spec** (a BCP-47 tag — `"fr"`, `"de"`, `"it"`, `"en"`,
`"fr-CH"`…) to that same article language. `lang` is what makes the PRODUCER format **numbers and furniture**
per locale. The native renderer honours **fr / de / it / en** (unknown → English):
- French → "1 900" / "19,3" (narrow-space thousands, comma decimal) and "Source :" (space before the colon).
- German → "1.900" / "19,3" (period thousands, comma decimal) and "Quelle:".
- Italian → "1.900" / "19,3" (period thousands, comma decimal) and "Fonte:".
- English (default) → "1,900" / "19.3" and "Source:".

It flows to every producer — `ChartSpec` (dw-chart sets the Datawrapper chart `language`), `NativeSpec`
(chart-native), and the map configs. Omit it only for an English deliverable (English is the default).
Writing a German title but leaving `lang` unset ships German words with English numbers and an English
"Source:" — the exact mismatch this field prevents. (Swiss newsrooms: a `de-CH` / `it-CH` tag resolves to
base `de` / `it` today.)

## Runtime procedure

② is the host agent. Execute these steps in order — do not skip the self-check.

1. **Profile** the data: list columns, infer each type (numeric / categorical / temporal), cardinality,
   and the row count. This fixes the data shape (single-series, multi-series, or two-value).

2. **Detect geographic structure**: check whether any column holds region identifiers — country names,
   ISO-A2/A3 codes, or a recognised admin code (NUTS, FIPS, …). If found, record the region column and the
   candidate basemap family (world-countries, eu-nuts2, us-states, …). Also note whether the numeric column
   is a **normalised rate** (per-capita, %, index) or an absolute count — this matters for Gate 5.

3. **Gate 5 — geographic only** (skip if no geographic structure was detected):
   Read `<repo-root>/knowledge/references/formats/format-selection.md` (Gate 5).
   Emit a **map** ONLY when ALL THREE conditions hold:
   - the **spatial pattern is the story** (clustering, spread, adjacency, diffusion — NOT a ranking).
     **Ranking-framing prose — "X leads, Y lags", "swings from 27% to 6%", "which country is highest",
     a leaders-vs-laggards spread — is a BAR signal, not a licence for a map; "map" in the headline does
     not make the spatial pattern the story.** And a spatial pattern can only BE the story when the units
     form a **contiguous area** where adjacency is readable: a **hand-picked, NON-CONTIGUOUS set of blocs**
     — a scattered list of countries/regions that do not tile a continuous space (e.g. eight cherry-picked
     EU members, not every NUTS region of a country) — has **no adjacency/cluster to read**, so this
     condition structurally CANNOT hold. Ranking framing + non-contiguous blocs → **sorted bar**, always.
   - the value is **map-safe** — a normalised rate (per-capita, %, index) **OR a per-region
     categorical/temporal attribute (year an event took effect, class, rank)**; the guard is only against
     **raw absolute counts** (which redraw the population map).
   - the **regions are legible** in number and label (not 200+ micro-regions).
   A **self-location motive** ("find my own region") can ALSO earn a map, but ONLY when that is the piece's
   explicit purpose — NOT merely because the data is per-region (that weak pull alone never earns a map).
   If ANY condition fails, OR the case could go either way → emit a **sorted bar chart** (`d3-bars`,
   `sort:"desc"`) — the honest default for "which region is highest" (drop-into-a-bar tie-breaker). State
   WHY (cite Gate 5) in the decision output.

4. **Format (Gates -1→4):** read `<repo-root>/knowledge/references/formats/format-selection.md`.
   **The channel sets the format default FIRST (GATE -1) — there is no single global "static-first" rule.**
   On the two social channels static-first governs (the only escalation available is to video). On
   **article-web the channel default is interactive** (`skills/atelier/src/channel.ts`
   `article-web.interactiveDefault: true`), always shipped with a self-contained static HTML (no-JS) a11y
   fallback — see the channel block below. The format-selection "escalation" conditions (large/multi-series
   data · a personal-data hook · web-only distribution) are **signals of how strongly a visual benefits from
   interactivity — NOT a precondition an article-web interactive must clear.** A plain article-web
   interactive with none of those signals is the intended default, not an over-escalation; the static-HTML
   fallback guarantees a11y either way.

   **Channel restricts the format set FIRST — before any gate below.** The confirmed distribution channel
   (`skills/atelier/src/channel.ts` `Channel`) hard-constrains which formats are even reachable, before the
   gates below choose within that set:
   - **social-vertical / social-feed ⇒ format ∈ {static image, video} — NEVER interactive or scrolly.** A
     social post/story has no host page for a live component; do not propose one for these channels.
   - **article-web ⇒ format ∈ {static, interactive, video, scrolly}, and interactive is the DEFAULT** — it
     wins unless a concrete reason (not a mere preference) rules it out. **Whenever interactive is chosen, a
     static fallback that carries the claim on its own is ALSO produced** — the interactive layer is
     additive, never load-bearing (a11y invariant: most readers never hover/click/scroll).

   **Aspect↔type guard.** For a portrait (social-vertical) or square (social-feed) channel, NEVER choose a
   row-driven horizontal type (`d3-bars`, `d3-dot-plot`, `d3-arrow-plot`, `d3-range-plot`) — they cannot
   take that aspect. Route to a vertical **column** type instead (e.g. `column-chart`), or a
   portrait/square-composed media render. (This is the recyclage failure: a confirmed vertical channel
   shipped a landscape bar strip.)

   Once the format is chosen within the channel's allowed set, the decision to make is the reconciled
   `{format, size, sub-format}` against the channel — emit it explicitly, not as a silent default (the
   PROPOSITION step is what surfaces this to the journalist, vetoable).

   **Commit to exactly ONE `format`.** The emitted spec carries a single `VisualFormat`
   (`static|interactive|video|scrolly`, `skills/atelier/src/channel.ts`) chosen from `allowedFormats(channel)`
   — never the whole allowed set. `interactiveDefault` (above) only steers WHICH single format article-web
   defaults to; it is not a fallback list to emit alongside the choice. This single pinned format is what
   PROPOSITION (`skills/atelier/SKILL.md` Gate 2) announces for the journalist's veto, and what
   `assertFormatAllowed(channel, format)` re-checks at produce time.

   **Map element type FIRST — before the format ladder.** Branch on what the data is:
   - **Symbol / proportional / dot data** (coordinates carrying a VALUE mapped to circle size/colour —
     city populations, event counts, amounts by place) → **ALWAYS `map-native`**, regardless of extent or
     static/interactive. `map-dw` CANNOT produce a claim-carrying static symbol map: Datawrapper draws the
     proportional circles with values on HOVER only and offers no "label symbols by column" option (verified
     against the Datawrapper Academy "Customizing your symbol map" docs), so its owned static PNG ships mute,
     unlabeled circles — no place identifiable, no value readable without interaction. Every atelier channel
     requires a claim-carrying static (the social static, or the article-web a11y static fallback), so a
     valued point map MUST use `map-native`, whose proportional-symbol renderer directly labels the top-N
     circles by name + value (conformance asserts `labeled`). `validateMapSpec` now **rejects** a `map-dw`
     symbol spec with a route-to-`map-native` error — there is NO `map-dw` symbol path.
   - **Locator data** (a few point markers/pins calling out places — NO value) that is **sub-national or
     regional** (a country, a region, a city cluster) → **`map-native`**, regardless of static/interactive.
     `map-native`'s MapTiler basemap auto-fits and renders coastlines accurately at any zoom — `map-dw`'s
     locator basemap generalizes the coast at wide zoom, so inland places can render offshore. This mirrors
     the HARD RULE in the map-native POINT / LOCATOR section. `map-dw` locator stays valid ONLY for **wide**
     national / continental / global point maps (extent ≥ ~12°), where the pins carry their own title labels;
     `validateMapSpec` warns if you route a tighter locator to `map-dw`.
   - **Choropleth data** (region fills) → apply the format ladder below.
   - **Choropleth BASEMAP FIT — sub-national subsets** (routing PREFERENCE, not a hard rule): when the
     data clearly covers ONE region of a country (e.g. the 7 provinces of Veneto, one canton's
     districts), do NOT put it on the full-country basemap — the filled regions render as an illegible
     micro-cluster in one corner, the rest of the country grey. Prefer, in order: (1) a **region-scoped
     DW basemap** when one exists (DW carries per-region cuts, e.g. `italy-veneto-municipalities`,
     `switzerland-bern-2026-municipalities` — discover via `GET /v3/basemaps`); (2) **`map-native`**,
     whose viewport auto-fits the data extent (when the needed type/format is reachable there — it may
     not be, which is why this stays a preference). The **full-country basemap is for national-coverage
     data**. Mechanical net: `validateMapSpec` WARNS (advisory, never a hard fail) when the data covers
     < 10% of the chosen basemap's regions with < 20 rows (`SPARSE_REGION_FRACTION` / `SPARSE_MAX_ROWS`,
     `map-dw/src/map-spec.ts`) — a deliberately sparse national map (few values SPREAD across the
     country, like 8 of 26 swiss cantons ≈ 31% of the basemap's regions) is legitimate and does not
     trip the warning.

   **Map format ladder** (choropleth; applied after Gate 5 routes to a map — the SAME channel-first rule
   as charts: the channel sets the format default, the producer follows the format):
   - **Static → `map-dw`** — the static-choropleth producer: used on the social channels (their non-video
     format), and on article-web only when a concrete reason prefers static over the interactive default.
   - **Interactive → `map-native`** — on **article-web this is the channel default** (a live choropleth:
     "find your country", per-region hover at scale), shipped with map-native's static HTML (no-JS) a11y
     fallback. The exploration hooks describe when interactivity pays off MOST — a signal, NOT a gate the
     article-web interactive must clear.
   - **Video → `map-native`** (Gate 4: temporal/spatial diffusion, social/vertical distribution).
   - **Scrolly (Gate 3:** the story is **irreducibly sequential** — the author paces a guided north→south /
     step-by-step walk through the data, a single map evolves across 4+ discrete states, the piece is
     long-form and NOT breaking news, and resources exist for the added production): → `scrolly`. See the
     `scrolly` producer section below for emission, self-check, and produce call. A geographic story that
     does NOT meet all four Gate 3 conditions stays `map-dw` (static) or `map-native` (interactive/video).

   **Chart format ladder:** static → `dw-chart`; motion/rich interactivity → `chart-native` (see Producer
   section).

5. **Choose chart family** (chart path only): use the shared KB
   `<repo-root>/knowledge/references/chart-selection.md` — map intent → family → the *simplest* type that
   serves it. When in doubt, bars/columns on a common baseline.

6. **Fill the spec** (chart or map — see sections below) applying
   `<repo-root>/knowledge/references/design-conformance.md`.

7. **Self-check**: the spec MUST pass the relevant validator (`validateChartSpec` for charts,
   `validateMapSpec` for maps — run it). Read all returned `warnings` and fix them — do not ignore them.

8. **Produce**: call the producer for the chosen path (see Producer section).

9. **Or `no-chart`**: if no visual serves the data and intent (data too thin, or the intent is not a
   visualisation question), emit `{ "decision": "no-chart", "reason": "..." }` instead of forcing a visual.

## How it decides

1. Read the shared KB `<repo-root>/knowledge/references/chart-selection.md` (at the atelier repo root, not under this skill) → map **intent → DW type** (intent first, simplest type that serves it).
2. Read `<repo-root>/knowledge/references/design-conformance.md` (shared KB, repo root) → fill the conformance fields.
3. Emit a **ChartSpec** (the exact shape `dw-chart/src/chart-spec.ts` validates):
   `{ type, title (the insight, sentence case), intro?, data (CSV), subject (the topic hint, e.g. "solar"),
   baseColor (a subject-fit Okabe-Ito hue — see Colour below), seriesColors? (multi-series: series → hue),
   highlight? (bar-family accent — see below), seriesLabels? (machine column → human name), valueLabels?,
   numberFormat?, source?,
   channel (the CADRAGE Q3 answer — one of the structured channels `social-vertical | social-feed |
   article-web` from `skills/atelier/src/channel.ts`; sizes the static export: social-feed→square,
   social-vertical→9:16, article-web→16:9. `normalizeChannel` still accepts legacy free text, e.g. "feed"
   or "stories", and maps it to the same enum),
   altInsight (WCAG: the insight, not the structure) }`.
   **`highlight`** (optional) = the CATEGORY VALUE (a first-column cell, e.g. `"Basel"`) to accent on a
   single-series ranked bar — **`d3-bars` and `column-chart` ONLY** (the two DW engines that key per-bar
   `custom-colors` by category, verified live; every other type REJECTS the field). The highlighted bar
   takes the accent (`baseColor` if set, else the library default); every other bar drops to the muted DW
   palette grey. A VALUE, never a row index (`sort` re-orders the rows — an index would accent the wrong
   bar). The same CADRAGE-framing discipline as the native `highlight` applies: only accent a category the
   confirmed insight singles out; omit it for a neutral overview. There is NO `highlightColor` field —
   the accent IS `baseColor`; `validateChartSpec` is STRICT and rejects any unknown top-level field
   (a hallucinated field once shipped a silently-unhighlighted chart).
4. Guardrails: **≤2 colours**; **CHOOSE `baseColor` by subject — NEVER leave a chart on a blue-family hue
   for a subject that is not water/cold/sky/marine** (the validator FAILS a declared `subject` whose
   `baseColor` is absent or the default `#0072B2`); if the data is too complex for a clean chart, return
   `{ "decision": "no-chart", "reason": "..." }` instead of forcing one.

**Colour — newsroom house palette FIRST, else subject-fit.** If the project has a newsroom profile with a
`palette` (NEWSROOM-PROFILE.md / brand.json — the F2 house style), the **house colour IS the `baseColor`**:
set `baseColor = palette[0]` and do NOT pick a subject-fit hue — the house palette is the newsroom's
default and replaces the auto pick (the profile merge enforces this at produce time regardless, so match
it here for a truthful proposal). The ONE exception: if the journalist EXPLICITLY names a colour for THIS
chart, honour their choice AND set `baseColorExplicit: true` (that flag shields it from the house palette).
No profile → choose by subject, as below.

**Colour — choose by subject, free but quality-guarded** (palette-freedom principle: the system CHOOSES a
colour that FITS the subject, guarded by CVD-safety + contrast — it does NOT default everything to blue).
Set `subject` to the topic and pick the Okabe-Ito hue whose meaning fits:
- energy / solar / gold → amber `#E69F00`
- environment / forest / growth → green `#009E73`
- heat / temperature / warning / danger → vermilion `#D55E00`
- water / cold / sky / marine → blue `#0072B2` (the ONE case the default blue is correct)
- social / culture / politics-neutral → reddish-purple `#CC79A7`
- **housing / rent / cost-of-living / real estate → amber `#E69F00`** — a "cost of living / hearth"
  subject; warm, and pointedly NOT the blue that reads as water/cold (found shipped with NO `baseColor`
  at all on a rent chart — leaving it unset is the same defect as leaving it blue: both fall through to
  the component's blue default).
- **labour market / cross-border commuting / migration / transport-flow → vermilion `#D55E00`** — a
  friction/flow subject; if vermilion is already used elsewhere in the same piece, fall back to reddish-
  purple `#CC79A7` rather than to blue.

**NEVER leave blue for a subject that is not water/cold/sky/marine — and "blue" means the WHOLE blue
family, not just the exact library default.** Both `#0072B2` (blue) and `#56B4E9` (sky) read as "blue" to
a reader; swapping the literal default for the lighter sky-blue is the SAME defect with a different hex —
found shipped live on a "cross-border commuting" chart (`baseColor: "#56B4E9"`), a subject that matches
none of water/cold/sky/marine. If the subject doesn't match that list, NEITHER `#0072B2` NOR `#56B4E9` may
be the `baseColor` — pick amber/green/vermilion/purple/yellow/black deliberately instead.

All eight Okabe-Ito hues are CVD-safe, so any choice passes the guard; the point is that the choice must
FIT the subject, not fall through to blue (in either shade) by default. Never invent a hex outside this
set of eight — the guard only recognises the Okabe-Ito hues.

## Producer — dw-chart (default) vs chart-native vs map-dw vs map-native

Before emitting the spec, decide the **producer**. The producer set is `{dw-chart, chart-native, map-dw, map-native}`.

### dw-chart (static chart — default)

The default for all chart paths. Emit the `ChartSpec` as above → hand to `dw-chart`.

### chart-native (motion / rich interactivity)

Choose `chart-native` ONLY when the intent explicitly wants **motion** (a video / animated reveal —
landscape/square/portrait mp4) OR **rich interactivity** (keyboard focus, per-point tooltips beyond DW's
hover). A plain static chart stays `dw-chart`.

Emit a `NativeSpec` instead:
`{ producer: "chart-native", nativeType, title, source{name,url}, unit, data (CSV), sort?, orientation?,
directLabel?, highlight?, highlights?, subject?, baseColor, altInsight }`. **`baseColor` and `altInsight`
are MANDATORY on every `NativeSpec` you emit — never omit either just because `spec-to-config.ts`'s type
comment marks `baseColor` optional-with-a-default:**
- **`baseColor`**: pick a deliberate subject-fit Okabe-Ito hue using the exact same Colour rule as
  `ChartSpec` above (reason about the subject, then set the hex). Leaving `baseColor` unset silently
  falls back to the component's blue default — the same "everything is blue" defect this rule exists to
  stop (found shipped live: a housing/rent native chart with no `baseColor` key at all).
- **`subject`** (recommended): set the topic string (e.g. `"housing rents"`). It is injected onto the
  produced config and the produce-time guard then HARD-FAILS a chart left on a blue-family hue for a
  non-water/cold subject — the same subject-fit enforcement `ChartSpec` has. It is the belt-and-braces
  for the `baseColor` rule (today wired for `beeswarm`; other types can adopt it).
- **`altInsight`**: the WCAG alt text — the insight, not the chart's structure — same requirement and
  wording discipline as `ChartSpec.altInsight` above. Always include it: chart-native's produce gate now
  HARD-REQUIRES a non-empty `altInsight` on every produced chart (fail-hard, like dw-chart/map-dw spec
  validation) — a spec without it refuses to produce. Originally found missing entirely on a shipped
  beeswarm spec, leaving the visual with no accessible description at all.

The mapped native families are **bar/column, line, scatter, pie, grouped, stacked,
stacked-area, histogram, lollipop, connected-scatter, beeswarm, dot-strip, waffle, radial-bar, diverging,
waterfall, dumbbell, slope, bullet, treemap, boxplot, violin, diverging-stacked, pyramid, fan, bump, heatmap** (`spec-to-config.ts`);
for any type NOT in this list the native producer exits with `FALLBACK_TO_DW` and you route to `dw-chart` instead.
Produce with `bun skills/chart-native/scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]`
→ static PNG + interactive HTML + 3 mp4s. `nativeType` uses the chart-native keys (`bar`, `line`,
`scatter`, `pie`, `grouped`, `stacked`, `stacked-area`, `histogram`, `lollipop`, `connected-scatter`, `beeswarm`, `dot-strip`, `waffle`, `radial-bar`, `diverging`, `waterfall`, `dumbbell`, `slope`, `bullet`, `treemap`, `boxplot`, `violin`, `diverging-stacked`, `pyramid`, `fan`, `bump`, `heatmap`); `highlight` is
the category to accent; `directLabel` is the line's series label.
**`highlight` MUST match the confirmed CADRAGE framing — omit it when the framing is a NEUTRAL overview.**
Only accent a category when the confirmed insight singles that category out ("education dominates", "one
region leads"). When the journalist confirmed a neutral "vue d'ensemble" / "how it breaks down" framing
with no single subject, leave `highlight` UNSET — accenting one category then steers the eye to a story the
journalist explicitly did NOT choose (an encoding drift from the confirmed takeaway). Same discipline as the
title rule: the encoding may not narrow or diverge from the framing confirmed at Gate 1b.
`grouped` expects a **wide CSV**: the first column is the category, and every following numeric column
is a series (≤3 — beyond that use small multiples). Example: `region,urban,rural` then a row like
`North,2400,1900`.
`stacked` expects a **wide CSV**: the first column is the category/time, and every following numeric
column is a series that stacks bottom→top (≤5 — beyond that group into "Other" or use small
multiples); a composition/part-to-whole story. Example: `year,hydro,wind,solar` then a row like
`2024,130,110,90`.
`stacked-area` expects a **wide CSV** with a **numeric time key** first column (e.g. `year`) and 2–5
numeric series columns that stack bottom→top over that continuous time axis; a composition-over-time
story (the continuous sibling of `stacked`). Example: `year,gas,coal,renewables` then a row like
`2024,45,55,150`.
`histogram` expects **one numeric column of RAW individual observations** (not pre-binned counts); the
engine bins them.
`lollipop` expects **category + one value** (a ranking/magnitude dot-and-stem); `highlight` names the
category to accent.
`connected-scatter` expects the **first column as the ordering/time key, then TWO numeric measure
columns**; rows must be ordered by that key (the path follows row order).
`beeswarm` expects **one numeric value column** (raw observations) + an **optional low-cardinality
grouping column** (≤5 groups → colours) + an optional per-point label column. A SINGLE-HUE swarm (no
grouping column) honours `baseColor` — a housing rent-dispersion swarm is amber, never the default blue;
set `subject` so the produce guard enforces it. Name the outliers that "break away" via `highlights`
(an array, e.g. `["Cologny","Genthod"]`; the single `highlight` also works) — they render larger with a
direct name+value label so they read without a hover.
`dot-strip` expects **category + one value, with MANY rows per category** (raw observations, NOT
pre-aggregated) — shows the spread of individual values within a few groups, one horizontal strip per
category plus a mean marker; a single category with only one observation per row is still valid, but the
type earns its keep when several rows share a category.
`waffle` expects **category + one value, ≤6 categories** (a part-to-whole composition made countable,
one square per unit) — group any tail beyond 6 into "Other"; `unit` must name what one square represents
(e.g. "each square = 1%"), it renders as the subtitle. Not for change over time (use `stacked-area`)
or for more than ~6 slices (use `pie` or `bar`).
`radial-bar` expects **category + one value**; use it ONLY when the category axis is CYCLICAL (hours
of the day, months of the year, compass points) and the cycle itself is part of the story — keep rows
in **CSV order** (do NOT sort by value; angle encodes the category's cyclical position, unlike every
other single-value type above). For a non-cyclical magnitude/ranking, prefer plain `bar`.
`diverging` expects **category + one signed value that CROSSES zero** (gain↔loss / above↔below a
midpoint). Route it ONLY when values span both negative and positive — otherwise use `bar`.
`waterfall` expects **ordered label + one signed value** (a bridge of increases/decreases); an optional
`total` column (1/true) marks opening/closing running-total bars. Route it for step-by-step build-up to
a final figure.
`dumbbell` expects **category + exactly two numeric columns** (start/end, e.g. `2019`,`2024`); the two
column headers become the series labels. Route it for a two-point comparison per category — never a line
(two points imply no trend).
`slope` expects **category + exactly TWO time-point columns** (e.g. `2019`,`2024`); the two column headers
become the period captions. Route it for a two-point change/comparison per category — NOT for 3+ points
(use `line`). **A slope asserts a MONOTONIC change between its two points** — if the underlying series
reverses in between (a peak or dip the two endpoints hide), the slope misrepresents the trend: keep a
`line`, or disclose the dropped middle to the journalist. `highlight` names the one line that bucks the trend.
`bullet` expects **category + a measure value + a `target`** (a column named `target`, or the last numeric
column). Route it ONLY when there's a target to measure against (a KPI vs its goal). The measure is coloured
by hit (blue) / miss (vermillion); by default it sits on a single neutral track — qualitative range bands
require explicit threshold columns (deferred), never invent them.
`treemap` expects **label + one value, with an OPTIONAL grouping category column** (`label,value` or
`label,value,category`) — a part-to-whole layout where each cell's AREA is proportional to value; when a
grouping column has **≤5 distinct values**, cells are coloured and clustered by group. Past 5 distinct
values, the mapper degrades to a **flat single-hue treemap** (grouping dropped, no legend) rather than
wrapping the 5-colour palette. For a flat ranking with few items, prefer `bar`/`waffle`; for ≤6 shares with
no hierarchy, prefer `pie`.
`boxplot` expects **category + one numeric value column, with MANY raw observations per category**
(not pre-aggregated summary stats — the engine computes the five-number summary itself); shows the
distribution spread (median, IQR, whiskers, outliers) per group. For a single ungrouped distribution,
or to see every individual point, prefer `histogram`/`beeswarm`/`dot-strip` instead.
`violin` expects the **same CSV shape as `boxplot`**: category + one numeric value column, with MANY
raw observations per category (not pre-aggregated). Unlike `boxplot`, it draws a density silhouette (a
KDE) so multimodal/skewed shapes are visible, not just the five-number summary — route it when the
distribution's SHAPE is the story, not only its centre/spread. Needs at least 2 observations per
category (a density is undefined below that). For very few categories or small n, prefer `boxplot`,
`dot-strip`, or `beeswarm` instead.
`diverging-stacked` expects a **wide CSV**: the first column is the item/statement, and every following
numeric column is an ORDERED Likert response (negative → neutral → positive) that sums to ~100% per row
(e.g. `item,stronglyDisagree,disagree,neutral,agree,stronglyAgree`). With an ODD response count, the
middle column straddles the centre (half each side, grey) — a genuine neutral bucket; an EVEN count has
no true middle and splits evenly with no straddle. Do NOT reorder responses — order encodes sign. Route
it for survey/opinion composition per item; for a plain (non-signed) composition use `stacked`.
`pyramid` expects **band + exactly two numeric columns** (e.g. `ageBand,male,female`); the two column
headers become the mirrored side labels, drawn back-to-back from a shared central axis on the SAME
magnitude scale. Route it for a paired age/sex (or any two-group) population breakdown — for a plain
two-point comparison per category (not mirrored/centred), prefer `dumbbell`.
`fan` is NOT a tidy wide CSV — it expects **forecast-style columns with MAGIC names**: a time column
first, then `actual` (the historical series), `central` (the forecast's point estimate), and paired
`lo{n}`/`hi{n}` confidence-band columns for each level (e.g. `year,actual,central,lo80,hi80,lo95,hi95`).
The first column must be a **numeric time axis** (e.g. a year). History rows populate `actual` and leave
`central`/the bands blank; forecast rows are the mirror (blank `actual`, populated `central`+bands).
Levels are derived from whichever `lo{n}`/`hi{n}` pairs are present (**≥2 confidence-band pairs required**,
e.g. `lo80`/`hi80` AND `lo95`/`hi95` — a single pair fails shape-validation). Route it ONLY for a
forecast/projection story where the UNCERTAINTY itself is the point — never invent bands for a plain
point forecast (use `line`).
`bump` expects a **wide CSV**: the first column is the item's label, and every following numeric column
is an ORDERED period holding that item's RANK at that period (1 = top), e.g. `team,2021,2022,2023`. Route
it for a ranking-over-time race where the CROSSINGS are the story (who overtook whom) — for a magnitude/
value trend over time, prefer `line`; for a single before/after comparison, prefer `slope`. `highlight`
names the ONE item to accent (others render as neutral grey context); at most a few highlights keep the
tangle of lines readable. A `highlight` is **effectively required** — without it every line renders the
same colour (all-blue) and the chart is an indistinguishable tangle.
`heatmap` expects a **wide MATRIX CSV**: the first column is the ROW dimension, and every following
numeric column is a value of the COLUMN dimension — a value over TWO categorical/temporal dimensions
where **colour encodes the value** (e.g. `day,06-10,10-14,14-18,18-22` then `Mon,52,38,41,60`). Route it
when the story is a PATTERN over two dimensions — activity by day×hour, intensity over region×year, a
correlation matrix — and the eye should scan the grid for hot/cold clusters. This is the ONE native type
where colour is the quantitative channel: it paints a **sequential CVD-safe ramp** (single-hue Blues,
monotonic luminance), NOT the Okabe-Ito categorical palette, so do NOT set `baseColor` (it is ignored —
the ramp is the encoding); a colourbar legend + optional in-cell value labels come built in. For a value
over ONE dimension prefer `bar` (length reads more precisely than colour); for too-fine grids, aggregate
the bins first. `unit` names the value the colour encodes (e.g. "median wait (minutes)"). Ships static +
interactive (per-cell hover/focus) + video (a diagonal fade-in reveal).

### map-dw (static choropleth map) — default map path

Used when Gate 5 routes to a map AND the format ladder (Gates 1–4) yields **static** (the default).
Emits a **`MapSpec`** with `producer: "map-dw"` as the discriminator (the eval gate uses this field to
identify the path).

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
  "channel": "<the CADRAGE Q3 channel — social-vertical | social-feed | article-web>"
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
  still be the WRONG key for your columns — the registry only lists which keys exist; QA: this cost a full
  corrective pass, caught only by the dataless-join guard); `fips` is `"FRB9"`-style; `code_hasc` is
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
- `channel`: the CADRAGE Q3 answer — the same structured channels as `ChartSpec.channel`
  (`social-vertical | social-feed | article-web`, `skills/atelier/src/channel.ts`). It sizes the static
  PNG export box (social-feed→1080x1080 square, social-vertical→1080x1920 9:16, article-web→1200x675)
  and the render-size floor verifies the delivered PNG against it. Emit it explicitly: the spine also
  injects the proposal's confirmed channel at dispatch (`withProposalChannel` in
  `skills/atelier/src/adapters.ts`, proposal wins), but a spec run directly against `produceMap` has no
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
  a rainfall map must read "624 mm", never a bare "624" (QA Wave 10: the journalist explicitly asked for
  the exact millimetres on hover, and an emitted `unit: undefined` left map-dw's tooltip-unit mechanism
  with nothing to append). It is a LITERAL suffix with the leading-space semantics `map-dw/src/map-spec.ts`
  documents: include a leading space unless the unit hugs the number (`" mm"` → "624 mm", `" €"` →
  "17 600 €", `"%"` → "70%"). Do not double-declare a percent — either `unit:"%"` or a `"%"` `numberFormat`
  token is enough on its own (map-dw suppresses the collision, but one declaration is the honest spec).

**Basemap fallback rule:** if no known DW basemap matches the region identifiers in the data → do NOT
force a map. Fall back to a **sorted bar chart** (`d3-bars`, `sort:"desc"`) and state why in the decision
output (cite the basemap-fallback rule).

**Produce:** route the `MapSpec` to `map-dw`'s producer via the `MapSpec → spec-to-map-metadata →
produceMap` seam. The Datawrapper token comes from `/atelier/.env` (`DATAWRAPPER_API_TOKEN`) — it is
**never logged**.

### map-native (interactive / video choropleth map)

Used when Gate 5 routes to a map AND the chosen format is **interactive** (Gate 2: exploration hook,
"find your area", per-region hover at scale — on article-web this is the channel default, not an
escalation) or **video** (Gate 4: temporal/spatial diffusion that motion clarifies, or social/vertical
distribution). `map-dw` stays the static-choropleth producer — the social static, or the article-web
case where a concrete reason prefers static over the interactive default.

**ISO-A3 requirement:** `map-native` joins on `world.geojson`'s ISO-A3 codes. Region identifiers MUST be
ISO-A3 (e.g. `NOR`, `DEU`, `FRA`). If the region codes in the data cannot be matched to ISO-A3 — fall
back to `map-dw` or a sorted bar chart (`d3-bars`, `sort:"desc"`) and state why in the decision output.

**Emitted config (exact — validated by `validateChoroplethConfig` in `map-native/src/validate-config.ts`):**

```json
{
  "producer": "map-native",
  "regionKey": "<data column holding ISO-A3 codes>",
  "valueField": "<data column holding the normalised rate>",
  "labelField": "<data column holding the region NAME in the deliverable language>",
  "rows": [{ "<regionKey>": "<ISO-A3>", "<labelField>": "<region name>", "<valueField>": <number> }, "…"],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, never a label>",
  "description": "<what / when / where context>",
  "unit": "<long legend label, e.g. 'Share of renewables (%)'>",
  "valueUnit": "<short callout unit, e.g. '%'>",
  "subject": "<the topic hint, e.g. 'electricity access' — drives the subject-fit ramp>",
  "scaleType": "sequential",
  "palette": "<subject-fit registry ramp — see the Map colour rule below; NEVER default blue for a non-water subject>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```

Field notes:
- `producer`: MUST be `"map-native"` — the routing discriminator.
- `regionKey` / `valueField`: the data column names. `rows` is an **array of objects** (not CSV string).
- **`labelField` (REQUIRED when the deliverable language is not English, recommended always)**: the data
  column holding a human-readable region NAME **in the deliverable's language** (e.g. `"Éthiopie"`,
  `"Soudan du Sud"`). The narration (scrolly/video beats) uses THIS name — without it, a French map narrates
  the basemap's ENGLISH names (`"Ethiopia"`, `"S. Sudan"`), the exact defect. Put the name column in every
  row alongside the ISO-A3 code. If the data has no name column, add one with the correct-language names.
- `basemap`: `"world"` for world ISO-A3 preset (slice 1b; other presets are later scope).
- `title`: the spatial finding as a sentence — NOT a label or year range (validator enforces ≥12 chars).
- `description`: the what/when/where — required (furniture standard; a missing value is a warning).
- **`subject` + `palette`**: set BOTH (see the Map colour rule below). The produce guard FAILS a declared
  `subject` left on the default blue ramp — so a warm subject (energy) MUST carry `palette:"oranges"`, water
  keeps `"blues"`, vegetation `"greens"`. Emitting `subject` without a subject-fit `palette` blocks produce.
- `source.name` + `source.url`: required (furniture standard; missing is a warning).
- `unit` / `valueUnit`: **EMIT them whenever the measured quantity has a short unit (mm, %, €, t,
  hab.)** — the unit feeds the legend and the hover/caption surfaces and is part of faithful data
  representation, not decoration (same rule as the map-dw `unit` field note above; QA Wave 10: a
  rainfall map emitted without a unit hovered a bare number where the journalist asked for exact
  millimetres). Omit only when the quantity truly has none.

**Filters (INTERACTIVE maps only — reader exploration).** When the format is **interactive** (Gate 2
fired) AND the data shape supports it, add a `filters` array so the reader can explore. Emit a filter
ONLY when it serves the story's exploration intent — never "all possible filters." **At most 2.** The
bar derives its values from the data; you name the FIELD, not the values. Two kinds are supported today:

```json
"filters": [
  { "kind": "category", "field": "<a categorical column, 2–8 distinct values>", "label": "<optional>" },
  { "kind": "range",    "field": "<a numeric column>", "mode": "atLeast", "label": "<optional>" }
]
```
- `category` → toggle chips (e.g. hospital type, party). `range` → a value-threshold slider
  (`mode`: `atLeast` default / `atMost` / `between`).
- **Do NOT emit `kind:"time"` yet** — the interactive time-scrub re-derivation is not wired for any map
  type, so a time filter would render a control that does nothing. A temporal story stays a **video /
  scrolly** (Gate 3/4), not an interactive time slider.
- **Do NOT emit `kind:"category"` for a dot-density map** — category filters are unsupported for
  dot-density; use a range filter on a numeric field, or drop filters entirely.
- Filters are **interactive-only**: the static PNG and the video render the default (all categories,
  full range) with no filter bar. If the format is static (`map-dw` or a static `map-native`), omit `filters`.
- `validateChoroplethConfig` rejects a bad filters block (unknown field, category cardinality outside
  2–8, non-numeric range, >2 filters) — fix any error it reports.

### map-native (POINT / LOCATOR or SYMBOL path)

Use when the data is **point data** (coordinates, not region fills) — a set of located events, places,
or symbols — and Gate 5 still routes to a map (the spatial pattern is the story).

**★ HARD RULE — coordinate provenance (NEVER fabricate lon/lat).** A point map needs a `lon`/`lat` for
every marker/point. Those numbers MUST come from ONE of:
1. the **supplied data** — the newsroom's table has explicit `lon`/`lat` (or `x`/`y` / `longitude`/
   `latitude`) columns; read them straight through; OR
2. a **real deterministic geocoding step** — an actual geocoder run (e.g. a MapTiler geocoding API call
   with the place names, from `/atelier/.env`'s `MAPTILER_API_KEY`), whose returned coordinates you use.
   A geocode is a real lookup, not a recollection.

You must **NEVER hand-type a coordinate from the model's own knowledge** ("Gare du Nord is at ~2.35,
48.88") — that is fabricated data, indistinguishable at a glance from a real value but wrong in ways no
one can audit. The `lon`/`lat` in the config examples below (`2.35, 48.85`) are **illustrative
placeholders**, not values to copy. `validateLocatorConfig` / `validateSymbolConfig` only check that a
coordinate is a number in range — they CANNOT tell a real coordinate from an invented one, so the honesty
guard is HERE, at emission time, not in the validator. **If the data has no coordinates and no geocoder
is available, do NOT emit a point map**: stop and ask the journalist for a coordinates file, or fall back
to a non-spatial visual (e.g. a sorted bar of the places by value). The same rule governs every other
required value the source does not state — a date, a dimension label, a number: source it, look it up
deterministically, or decline; never synthesize it.

**Config shape — locator (discrete markers):**
```json
{
  "type": "locator",
  "markers": [
    { "lon": 2.35, "lat": 48.85, "label": "Paris", "category": "capital" }
  ],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, ≥12 chars>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```
`category` is optional (used for a `kind:"category"` filter). Validate with `validateLocatorConfig`.

**Config shape — symbol (sized / valued points):**
```json
{
  "type": "symbol",
  "points": [
    { "lon": 2.35, "lat": 48.85, "value": 1200, "label": "Paris" }
  ],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, ≥12 chars>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```
Validate with `validateSymbolConfig`.

**HARD RULE — basemap for point maps:** only `"world"` and `"us-states"` are registered. For ANY
sub-national or regional point map (one country, a region, a city cluster), use **`"basemap":"world"`**
— the map auto-fits to the marker extent, so `world` correctly frames the region. Do NOT invent a
basemap name such as `"france"`, `"italy"`, or `"europe"` — the point-map validators reject an
unregistered basemap. A regional choropleth (sub-national fill) is also not currently supported (only
world ISO-A3 + us-states); if the data is regional fills, fall back to a locator/symbol on `"world"`
or a sorted bar chart.

**Filters:** an interactive locator/symbol may carry a `filters` block (same syntax as the choropleth
path — `kind:"category"` on a marker attribute; `kind:"range"` on a numeric value field).

**Self-check:** after filling the config, run `validateChoroplethConfig` (from
`skills/map-native/src/validate-config.ts`). Fix all errors; address warnings (description + source).

**Produce:** write the config to a temp JSON, then run from the `skills/map-native/` directory:
`bun scripts/produce.mjs <config.json> <outDir> [all|static]`
→ static PNG + interactive HTML + 3 mp4s (landscape, square, portrait). The MapTiler key comes from
`/atelier/.env` (`MAPTILER_API_KEY`) — it is **never logged**.

### scrolly (scroll-driven geographic guided narrative — Gate 3)

Used when Gate 5 routes to a map AND the format ladder (Gate 3) fires: the story is **irreducibly
sequential** (north→south / step-by-step walk the author paces), a single map evolves across 4+ states,
the piece is long-form (not breaking news), and resources exist. The scrolly engine has **two tracks**:
a **map** track (below) and a **chart** track (see *Chart scrolly* below). Both build via the same
`skills/scrolly/scripts/produce.mjs`; the engine dispatches on whether the config carries `nativeType`.

**ISO-A3 requirement** (same as `map-native`): region identifiers MUST be ISO-A3 codes. If the data
cannot be matched to ISO-A3 → fall back to `map-dw` or a sorted bar chart and state why.

**Emitted config:** the scrolly engine reuses the choropleth config `map-native` uses — emit
`producer:"scrolly"` + the same ChoroplethConfig fields:

```json
{
  "producer": "scrolly",
  "regionKey": "<data column holding ISO-A3 codes>",
  "valueField": "<data column holding the normalised rate>",
  "labelField": "<data column holding the region NAME in the deliverable language>",
  "rows": [{ "<regionKey>": "<ISO-A3>", "<labelField>": "<region name>", "<valueField>": <number> }, "…"],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, ≥12 chars, not a label or year range>",
  "description": "<what / when / where context>",
  "unit": "<long legend label, e.g. 'Share of renewables (%)'>",
  "valueUnit": "<short callout unit, e.g. '%'>",
  "subject": "<the topic hint, e.g. 'electricity access' — drives the subject-fit ramp>",
  "scaleType": "sequential",
  "palette": "<subject-fit registry ramp — see the Map colour rule; energy → 'oranges', water → 'blues'>",
  "valueKind": "temporal | magnitude",
  "lang": "<deliverable language, e.g. 'fr' — localizes numbers, 'Source', beat descriptors>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```

**Same subject-fit + labelField + lang discipline as `map-native` above** — a scrolly is a narration, so it
is the surface where an English basemap name or a blue energy ramp is most visible:
- **`labelField`** (REQUIRED for a non-English deliverable): the scrolly BEATS narrate the DATA name — set
  it so a French scrolly says `"Éthiopie"`, not the basemap's `"Ethiopia"`.
- **`subject` + `palette`**: pick the subject-fit ramp (energy → `"oranges"`); the scrolly audit FAILS a
  declared subject on the default blue.
- **`lang`**: localizes the auto-generated beat descriptors, numbers, and the concluding takeaway.

**Narrative pattern hint — `valueKind` (set it):** when the value field is a **year / date / ordinal
step** and the story is a **diffusion / spread over time** (e.g. the year an event took effect per
country), set `"valueKind": "temporal"`. The scrolly then narrates the SEQUENCE — the first (earliest),
notable leaps, the most recent — instead of the generic "highest / lowest" ranking template (defect #3:
a year field framed as "high/low year" instead of the wave). For a rate / count / magnitude, set
`"valueKind": "magnitude"` (or omit it — magnitude is the default). The narrative must EXPLAIN the data
for what it is: a temporal field is a spread, not a rank.

**Self-check:** run `validateChoroplethConfig` (from `skills/map-native/src/validate-config.ts`) on the
emitted config. Fix all errors; address warnings (description + source are required by the furniture
standard). The scrolly config IS a choropleth config — the same validator applies.

**Produce:** write the config to a temp JSON, then run from the `skills/scrolly/` directory:
`bun scripts/produce.mjs <config.json> <outDir>` → produces a single-file `scrolly.html`.
The MapTiler key comes from `/atelier/.env` (`MAPTILER_API_KEY`) — it is **never logged**.

#### Chart scrolly (line / bar / scatter ONLY)

Used when the format ladder fires for a **non-geographic** story that is irreducibly sequential (the
author walks the reader through the data point by point) and long-form. The chart track narrates ONE
native chart as a sticky graphic, adapting to the type: **line** = the curve draws on with scroll (the
head lands on each captioned point); **bar** = a ranked highlight walk (leaders → the tail); **scatter**
= an outlier label walk. The scaffold shows the title + source once; the embedded chart suppresses its own.

**HARD CONSTRAINT — supported `nativeType`: `line`, `bar`, `scatter` only.** A `pie` (or any other of the
41 native types) has no progressive-reveal / ranked-walk narrative and is **rejected** by the engine.
For those, route to a **static** chart-native (or `dw-chart`) instead — never emit a chart scrolly for them.

**Emitted config:** `producer:"scrolly"` + the chart-native spec fields (`nativeType` is what routes the
engine to the chart track), plus an `insight` for the closing takeaway:

```json
{
  "producer": "scrolly",
  "nativeType": "line | bar | scatter",
  "title": "<the insight — sentence case, not a label or year range>",
  "description": "<what / when context — shown on the intro card>",
  "insight": "<the closing takeaway line>",
  "unit": "<LONG axis label, e.g. 'Share of global CO₂ (%)' or 'Births per woman'>",
  "valueUnit": "<SHORT callout unit for the scroll captions, e.g. '%' or 't' — keep it terse; a long unit is NOT repeated in every caption>",
  "directLabel": "<line only: the y series column>",
  "orientation": "horizontal",
  "source": { "name": "<honest source>", "url": "<URL>" },
  "data": "col1,col2\\n<CSV rows — line: x,y · bar: category,value · scatter: label,x,y>",
  "beats": [{ "x": "<line: x value>", "xEnd": "<line, optional: range end>", "category": "<bar: category value>", "text": "<the confirmed step caption>" }, "… (OPTIONAL — only when the journalist confirmed an explicit beat plan; omit for the auto narrative)"]
}
```

**Narrative control — explicit `beats` (optional, line/bar only).** DEFAULT (field absent): the engine
auto-picks the steps — line: first + last + the 2 biggest step-to-step moves; bar: top-3 leaders + the
tail (a fixed 4-step walk); scatter: 3 outliers. When the journalist **confirmed an explicit beat plan**
(a named sequence of narrative steps, or specific categories that must each get a step), EMIT it as
`beats` — never keep the plan in prose and let the auto-pick override it:
- **line**: each beat = `{ "x": <an x value from the data>, "xEnd": <optional range end>, "text": <the
  confirmed caption> }`. A range beat (`x`..`xEnd`) draws the line to `xEnd` and captions the span.
- **bar**: each beat = `{ "category": <a category value from the data>, "text": <optional caption> }` —
  the highlight walk follows the LIST (its length and its order), not the fixed leaders+tail pick, so a
  5-entry list is a 5-step walk and « Alpes-Maritimes » listed = its own step, guaranteed.
- **Order is the narrative**: beats are rendered exactly as given — the journalist's confirmed order
  wins, even non-chronological (a line scrolly scrubs back to an earlier point).
- **Anchors must exist in the data VERBATIM** (string-compared against the x/category column). A typo
  fails loud at the spine validation gate (`narrativeBeatErrors`) and again at derive — same tripwire
  philosophy as dw-chart's annotation-domain guard. Never "fix" an anchor silently; go back to the
  journalist.
- **`text` is optional per beat** — absent, the step falls back to the auto data-tied caption for that
  anchor. Scatter and the MAP scrolly track have NO override (a `beats` field there is rejected).

**Self-check:** the emitted spec MUST pass `validateChartSpec` (run it via the dw-chart skill) — title +
insight state the insight, not column names. Confirm `nativeType` ∈ {line, bar, scatter} before emitting.
If `beats` is present, confirm every `x`/`xEnd`/`category` appears verbatim in the emitted CSV.

**Produce:** same as the map track — `bun scripts/produce.mjs <config.json> <outDir>` from
`skills/scrolly/`. No MapTiler key needed for a chart config (the map modules load but never render).

## Guardrails (the code enforces these — propose within them)

- **Type:** pick from the 22 supported types (single-series, multi-series, or two-value per the data shape).
- **Sort:** for ranking intents (bars/columns where order matters), set `"sort": "desc"` — the producer sorts the CSV.
- **Colours:** single-series → at most 2 Okabe-Ito colours (default `#0072B2`); multi-series → one Okabe-Ito colour per series in `seriesColors`, at most 8.
- **Pie/donut:** at most 5 slices — if more, group into "Other" or choose bars.
- **Annotations:** add a `text-annotation` for the key outlier or turning point ("annotations explain WHY"). Keep the text TERSE (≈ ≤ 30 chars, e.g. "Crossed 50% urban, c. 2007" — not a full sentence): a long annotation clips or overlaps a value label at 340 px and the responsive label-safety guardrail will REJECT the whole chart. Put the elaboration in the intro, not the annotation.
- **Title:** state the insight, not a label or a year range (the validator warns otherwise). It must
  match the takeaway the journalist confirmed at CADRAGE — not a narrower or different claim (a specific
  multiplier like "2x" standing in for a confirmed "widening gap"; a scope word like "Nordic countries"
  that excludes an entity the visual itself shows, e.g. an Alpine country on the same map). If the data
  supports more than the title states, widen the title's wording rather than narrowing the claim.
- **Multi-series orientation:** `transpose:true` is ONLY for stacked/grouped **categorical** charts (e.g. stacked `year, Coal, Gas, Renewables`) where the x-category, not the series, belongs on the axis. **Never transpose a line/time chart** — a multi-series time trend (`year, France, Switzerland`) is `d3-lines` with one line per column and NO transpose. `multiple-lines`/`multiple-columns` = deliberate small multiples (one panel per series), not a single trend.
- **Two-point comparison (prose-extracted):** a claim with exactly two values (e.g. 2019 vs 2024) renders as a **slope**, **dumbbell**, or **paired columns** — NEVER a continuous line, which would imply a trend from two points.
- **Honest source label (prose):** when the data is `provenance: "prose"`, the chart's source reads "Figures as reported in this article" (or the source the article itself names) — never a fabricated dataset attribution.
- **`numberFormat` = a Datawrapper numeral token, NOT printf/Python.** Use `"0.0"` (one decimal), `"0.00"` (two), `"0,0"` (thousands), `"0%"`, `"$0,0"`. NEVER `".1f"` / `".2f"` — a printf token ships silently-wrong value labels (".1f" renders 8.4 as ".40"). The producer auto-corrects the common printf mistakes and `validateChartSpec` warns, but emit the numeral token directly.
- **`"%"` APPENDS the percent sign — it does NOT multiply by 100 (empirically verified against real rendered exports).** A value already in percentage points (e.g. `41`) with `numberFormat:"0%"` renders `"41%"` — correct, no ×100 to worry about. A 0–1 FRACTION (e.g. `0.41`) with `"0%"` renders `"0%"` — precision destroyed, because Datawrapper never multiplies. So: **always pre-scale a fraction to a percentage point before emitting it** (`0.41` → `41`, i.e. `value * 100`) whenever you set a `%` format (on either `numberFormat` or the axis `valueFormat`) — never emit raw 0–1 fractions alongside a `%` token. `validateChartSpec` now hard-rejects (not just warns) a `%` format applied to data that looks like 0–1 fractions, so this is caught before publish — but fix it at the source (scale the data) rather than relying on the guard.

## Self-check

- **Chart path:** the emitted spec MUST pass `validateChartSpec` (run it via the dw-chart skill). Title
  and altInsight must state the **insight**, not the column names.
- **Map path — static (`map-dw`):** the emitted `MapSpec` MUST pass `validateMapSpec` (run it via
  `map-dw/src/map-spec.ts`). Read all returned `warnings` and fix them. A `title looks like a label`
  warning means rewrite `title` as the spatial insight. `altInsight` must be non-empty and match the insight.
- **Map path — interactive/video (`map-native`):** the emitted config MUST pass `validateChoroplethConfig`
  (run it via `map-native/src/validate-config.ts`). Fix all errors. Address warnings (description +
  source.url are required by the furniture standard).
- **Map path — scrolly (`scrolly`):** the emitted config MUST pass `validateChoroplethConfig` (same
  validator as `map-native` — the scrolly config is a choropleth config). Fix all errors; address all
  warnings. Cite Gate 3 as the format trigger in the decision output.
- In all cases: the decision output MUST cite which gate(s) drove the routing (Gate 5 for geographic
  routing; the channel/format gates for the format decision — GATE -1 for the article-web interactive
  default or a social channel's static/video-only set, Gate 2/3/4 when a specific signal drove a
  particular format; ISO-A3 fallback rule if applicable).

## Output

One of:
- a `ChartSpec` JSON for `dw-chart` (the default static chart path);
- a `NativeSpec` JSON for `chart-native` (when motion/interactivity is the ask for a chart);
- a `MapSpec` JSON with `producer: "map-dw"` (when Gate 5 routes to a map and format is static);
- a `ChoroplethConfig` JSON with `producer: "map-native"` (when Gate 5 routes to a map and format is
  interactive or video — ISO-A3 codes required, else fall back to `map-dw` or bars);
- a `ChoroplethConfig` JSON with `producer: "scrolly"` (when Gate 5 routes to a map and Gate 3 fires:
  the story is an irreducibly sequential guided narrative — ISO-A3 codes required, validated via
  `validateChoroplethConfig`, produced via `bun skills/scrolly/scripts/produce.mjs`);
- or a `no-chart` decision with a reason.
