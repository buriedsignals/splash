---
name: suggest-chart
description: Use when a data profile and an editorial intent need to become a visual-element decision — which chart or map, which format, and which producer — before a spec is emitted for production. Invoked as part of the splash flow, not called directly by a journalist. Keywords suggest, choose chart, map, choropleth, geographic, map-dw, map-native, format selection, intent, dataviz, orchestration, producer, datawrapper, chart-native, video, interactive.
---

# suggest-chart — decide the visual element, format, and producer

> Type selection is NOT decided here. `lib/brain` computes the legal set from the KB sheets
> (`knowledge/references/**/types/*.md` frontmatter) and offers it to the journalist; this
> skill only emits a spec for the form that was chosen. Adding or changing a type is an edit
> to its sheet, never to this file.

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

**★ YOUR FIRST OUTPUT IS THE CANDIDATES LIST, NEVER A SINGLE DECISION (Stage 1 — canonical
12-step flow).** The gates below are HOW YOU RANK, not a funnel to one answer: walk them to
identify EVERY reachable candidate (chart AND map families) for the opportunity, score which
one you would recommend and WHY, and return the `candidates` JSON of the `## Output` section
(one `tier:"recommended"` + `solid` + `possible`, each with a real one-line `why`). Only AFTER
the journalist picks a candidate do you emit the single validated spec (Stage 2). Returning
one take-it-or-leave-it decision on a first invocation is the exact defect this flow replaced
(Tom feedback #2) — the harness fails any run whose transcript carries no candidates payload.

**Narrative candidates belong in the menu — the WHOLE family, matched to the story shape.** The
narrative formats are not just image-scrolly; consider each against the opportunity and ANALYSE's
`narrativePotential`:
- **`temporal` potential** (a series with 3+ moments) → a **chart-scrolly** (step-reveal of the
  line/bar) AND/OR a **chart-video** (line-reveal · ranked-bars race · proportional-squares) —
  offer the one that fits the channel (video for social/vertical, scrolly for article-web).
- **`geographic` potential** → a **map-story** (video) or **map-scrolly** (waypoints).
- **`visual` potential** → an **image-scrolly** (with the « si tu fournis 3-6 images » condition).
  **Image availability is NEVER a CADRAGE question and NEVER a rule-out reason.** If the prose
  carries a visual sequence, the image-scrolly candidate APPEARS in the menu with its condition;
  the journalist resolves photo availability by PICKING it (then suggest-image collects the
  images) or by not picking it. `narrativeRuledOut` for the visual mode fires ONLY when the prose
  has no witnessable sequence at all — never « the journalist has no photos » (which hasn't been
  asked, and asking it in CADRAGE both pre-filters a valid candidate and inflates the ≤6 cap).
Each appears with a why GROUNDED in the matching `narrativePotential.<mode>.hint` (quote it), on
data-RICH opportunities too — a trend worth scrolling, a ranking worth racing, a place worth
showing. Gate 3's strict escalation bar governs when a narrative option is RECOMMENDED first — it
does NOT govern whether it may APPEAR: a menu of static-only types on a story built of moments is
an impoverished menu. **image-scrolly appears WITH its requirement stated, never pre-filtered on it**: splash cannot
know whether the journalist has images — the candidate line carries the condition (« si tu peux
fournir 3-6 images — photos, vues satellite, archives — je dérive les légendes de ton
article ») and dies naturally if the journalist has none. Only a preflight-red engine excludes
it. **The trigger is the ARTICLE's own visual narrative, detected at ANALYSE — not data
poverty**: when the ProposalSet carries `narrativePotential.visual.potential: true` (suggest-article
found the prose narrating something visually witnessable), the image-scrolly candidate appears
with a why GROUNDED in that detection — quote the `visual.hint` (« ton article décrit trois
états du même lieu — une séquence d'images raconterait ça ») — on data-RICH opportunities too,
alongside the chart candidates, never only as a data-poor fallback. **Narrative is CONSIDERED on every opportunity — mechanically**: each opportunity's
candidates payload carries EITHER at least one narrative candidate (chart-scrolly · map-story ·
image-scrolly · video reveal) OR an explicit `"narrativeRuledOut": "<one-line reason>"` field
(e.g. « single-snapshot comparison, no sequence to narrate »). A payload with neither is
invalid — silent absence of the narrative option is not a possible state.

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
   **article-web the channel default is interactive** (`skills/splash/src/channel.ts`
   `article-web.interactiveDefault: true`). The format-selection "escalation" conditions (large/multi-series
   data · a personal-data hook · web-only distribution) are **signals of how strongly a visual benefits from
   interactivity — NOT a precondition an article-web interactive must clear.** A plain article-web
   interactive with none of those signals is the intended default, not an over-escalation. Since the
   single-format redesign there is NO auto no-JS static fallback — no-JS accessibility = pinning the
   `static` format.

   **Channel restricts the format set FIRST — before any gate below.** The confirmed distribution channel
   (`skills/splash/src/channel.ts` `Channel`) hard-constrains which formats are even reachable, before the
   gates below choose within that set:
   - **social-vertical / social-feed ⇒ format ∈ {static image, video} — NEVER interactive or scrolly.** A
     social post/story has no host page for a live component; do not propose one for these channels.
   - **article-web ⇒ format ∈ {static, interactive, video, scrolly}, and interactive is the DEFAULT** — it
     wins unless a concrete reason (not a mere preference) rules it out. An explicit journalist format
     signal ("statique", "pour le print") is such a reason and WINS. The pinned format is the ONLY
     artifact produced (single-format model) — no static fallback is produced alongside an interactive.

   **Aspect↔type guard.** For a portrait (social-vertical) or square (social-feed) channel, NEVER choose a
   row-driven horizontal type (`d3-bars`, `d3-dot-plot`, `d3-arrow-plot`, `d3-range-plot`) — they cannot
   take that aspect. Route to a vertical **column** type instead (e.g. `column-chart`), or a
   portrait/square-composed media render. (This is the recyclage failure: a confirmed vertical channel
   shipped a landscape bar strip.)

   Once the format is chosen within the channel's allowed set, the decision to make is the reconciled
   `{format, size, sub-format}` against the channel — emit it explicitly, not as a silent default (the
   PROPOSITION step is what surfaces this to the journalist, vetoable).

   **Commit to exactly ONE `format`.** The emitted spec carries a single `VisualFormat`
   (`static|interactive|video|scrolly`, `skills/splash/src/channel.ts`) chosen from `allowedFormats(channel)`
   — never the whole allowed set. `interactiveDefault` (above) only steers WHICH single format article-web
   defaults to; it is not a fallback list to emit alongside the choice. This single pinned format is what
   PROPOSITION (`skills/splash/SKILL.md` Gate 2) announces for the journalist's veto, and what
   `assertFormatAllowed(channel, format)` re-checks at produce time.

   **Map element type FIRST — before the format ladder.** Branch on what the data is:
   - **Symbol / proportional / dot data** (coordinates carrying a VALUE mapped to circle size/colour —
     city populations, event counts, amounts by place) → **ALWAYS `map-native`**, regardless of extent or
     static/interactive. `map-dw` CANNOT produce a claim-carrying static symbol map: Datawrapper draws the
     proportional circles with values on HOVER only and offers no "label symbols by column" option (verified
     against the Datawrapper Academy "Customizing your symbol map" docs), so its owned static PNG ships mute,
     unlabeled circles — no place identifiable, no value readable without interaction. A static symbol map
     must carry its claim on its own (the social channels' static format, or an article-web `static` pin), so a
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
     "find your country", per-region hover at scale). The exploration hooks describe when interactivity
     pays off MOST — a signal, NOT a gate the article-web interactive must clear.
   - **Video → `map-native`** (Gate 4: temporal/spatial diffusion, social/vertical distribution).
   - **Scrolly (Gate 3:** the story is **irreducibly sequential** — the author paces a guided north→south /
     step-by-step walk through the data, a single map evolves across 4+ discrete states, the piece is
     long-form and NOT breaking news, and resources exist for the added production): → `scrolly`. See the
     `scrolly` producer section below for emission, self-check, and produce call. A geographic story that
     does NOT meet all four Gate 3 conditions stays `map-dw` (static) or `map-native` (interactive/video).

   **Chart format ladder:** static → `dw-chart`; motion/rich interactivity → `chart-native` (see Producer
   section).

5. **Fill the spec** (chart or map — see sections below) applying
   `<repo-root>/knowledge/references/design-conformance.md`.

6. **Self-check**: the spec MUST pass the relevant validator (`validateChartSpec` for charts,
   `validateMapSpec` for maps — run it). Read all returned `warnings` and fix them — do not ignore them.

7. **Produce**: call the producer for the chosen path (see Producer section).

8. **Or `no-chart`**: if no visual serves the data and intent (data too thin, or the intent is not a
   visualisation question), emit `{ "decision": "no-chart", "reason": "..." }` instead of forcing a visual.

**Image-scrolly recognition (C5).** When the claim is NARRATIVE (a place, a process, a
before/after, a sequence of scenes) and the data test above fails (< 3 usable numbers — the
honest-data guard for CHARTS, unchanged), do NOT stop at `no-chart`: emit an
`image-scrolly` candidate (producer `image-native`, tier per fit) stating what the
journalist must supply — « tu fournis 3-6 images (photos, satellite, archives) + leur
crédit ; je dérive les légendes de ton article, tu valides tout avant rendu ». The chart
refusal stays exactly as-is when the journalist asks for a CHART; the candidate is the
alternative, not a softening of the data bar. Reachability: the format is `scrolly`, so the
candidate only appears when the channel allows it (article-web — a social channel keeps the
plain `no-chart`). A kept image-scrolly candidate is NOT specced here: hand it to the
**`suggest-image`** skill, which collects the images + per-image alt/credit, matches each
image to its article passage (vision = matching/ordering ONLY), and emits the
`image-story.json` manifest behind its own mandatory journalist gate; production is
`bun skills/image-native/scripts/produce.mjs <image-story.json> <outDir> scrolly`.

## Emitting the ChartSpec (dw-chart path)

1. Read `<repo-root>/knowledge/references/design-conformance.md` (shared KB, repo root) → fill the conformance fields.
2. Emit a **ChartSpec** (the exact shape `dw-chart/src/chart-spec.ts` validates):
   `{ type, title (the insight, sentence case), intro?, data (CSV), subject (the topic hint, e.g. "solar"),
   baseColor (a subject-fit Okabe-Ito hue — see Colour below), seriesColors? (multi-series: series → hue),
   highlight? (bar-family accent — see below), seriesLabels? (machine column → human name), valueLabels?,
   numberFormat?, source?,
   channel (the CADRAGE Q6 answer, asked LAST — one of the structured channels `social-vertical | social-feed |
   article-web` from `skills/splash/src/channel.ts`; sizes the static export: social-feed→square,
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
   the accent IS `baseColor`; `validateChartSpec` is STRICT and rejects any unknown top-level field.
3. Guardrails: **≤2 colours**; **CHOOSE `baseColor` by subject — NEVER leave a chart on a blue-family hue
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
  subject; warm, and pointedly NOT the blue that reads as water/cold. Leaving `baseColor` unset is the
  same defect as leaving it blue: both fall through to the component's blue default.
- **labour market / cross-border commuting / migration / transport-flow → vermilion `#D55E00`** — a
  friction/flow subject; if vermilion is already used elsewhere in the same piece, fall back to reddish-
  purple `#CC79A7` rather than to blue.

**NEVER leave blue for a subject that is not water/cold/sky/marine — and "blue" means the WHOLE blue
family, not just the exact library default.** Both `#0072B2` (blue) and `#56B4E9` (sky) read as "blue" to
a reader; swapping the literal default for the lighter sky-blue (`#56B4E9`) is the SAME defect with a
different hex on a non-water subject. If the subject doesn't match that list, NEITHER `#0072B2` NOR `#56B4E9` may
be the `baseColor` — pick amber/green/vermilion/purple/yellow/black deliberately instead.

All eight Okabe-Ito hues are CVD-safe, so any choice passes the guard; the point is that the choice must
FIT the subject, not fall through to blue (in either shade) by default. Never invent a hex outside this
set of eight — the guard only recognises the Okabe-Ito hues.

## Producer — dw-chart (default) vs chart-native vs map-dw vs map-native

Before emitting the spec, decide the **producer**. The producer set is `{dw-chart, chart-native, map-dw, map-native}`.

> **`cesium-flyover` is NOT in that set, and is never chosen from a data profile.** A 3D terrain
> flyover encodes no data at all — there is nothing in a table that can suggest one, so proposing
> it from a profile would be inventing an intent the journalist never expressed. It is reachable
> on **one** condition: the journalist ASKED for it in their own words — "a flyover of the gorge",
> "a drone shot down the valley", "show me the terrain the road cuts through". Then, and only
> then, emit `{ producer: "cesium-flyover", format: "video", spec: { type: "flyover", path |
> routeGeoJSON, title?, source?, channel } }` and read `skills/cesium-flyover/SKILL.md` before
> filling the knobs. Three things to say out loud when you do: it renders **video only** (no
> still, no interactive — the producer refuses those by name); it needs an **unrestricted**
> MapTiler key and the **network at render time** (the only engine here that cannot render
> offline); and the frame carries a **"CESIUM ion" credit mark** the newsroom has to be
> comfortable publishing. A place the reader should *explore*, or any value shaded by region,
> stays `map-native`.

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
  stop.
- **`subject`** (recommended): set the topic string (e.g. `"housing rents"`). It is injected onto the
  produced config and the produce-time guard then HARD-FAILS a chart left on a blue-family hue for a
  non-water/cold subject — the same subject-fit enforcement `ChartSpec` has. It is the belt-and-braces
  for the `baseColor` rule (today wired for `beeswarm`; other types can adopt it).
- **`altInsight`**: the WCAG alt text — the insight, not the chart's structure — same requirement and
  wording discipline as `ChartSpec.altInsight` above. Always include it: chart-native's produce gate now
  HARD-REQUIRES a non-empty `altInsight` on every produced chart (fail-hard, like dw-chart/map-dw spec
  validation) — a spec without it refuses to produce.

The mapped native families are **bar/column, line, scatter, pie, grouped, stacked,
stacked-area, histogram, lollipop, connected-scatter, beeswarm, dot-strip, waffle, radial-bar, diverging,
waterfall, dumbbell, slope, bullet, treemap, boxplot, violin, diverging-stacked, pyramid, fan, bump, heatmap, combo, pictogram** (`spec-to-config.ts`);
for any type NOT in this list the native producer exits with `FALLBACK_TO_DW` and you route to `dw-chart` instead.
The engine SHIPS more types than this (41 in `native-types.ts`); the rest are declared `deferred` and
the splash gate refuses a proposal naming one, by name and with its reason (`validate-gate.ts`) — so
this list, not the component inventory, is what may be offered. Both copies of it below are compared
to `MAPPERS` in BOTH directions by `skills/chart-native/tests/mappers-doc-parity.test.ts`: when a
mapper lands, edit both here or the gate goes red.
Produce with `bun skills/chart-native/scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> [all|static]`
→ static PNG + interactive HTML + 3 mp4s. `nativeType` uses the chart-native keys (`bar`, `line`,
`scatter`, `pie`, `grouped`, `stacked`, `stacked-area`, `histogram`, `lollipop`, `connected-scatter`, `beeswarm`, `dot-strip`, `waffle`, `radial-bar`, `diverging`, `waterfall`, `dumbbell`, `slope`, `bullet`, `treemap`, `boxplot`, `violin`, `diverging-stacked`, `pyramid`, `fan`, `bump`, `heatmap`, `combo`, `pictogram`); `highlight` is
the category to accent; `directLabel` is the line's series label.
**`highlight` MUST match the confirmed CADRAGE framing — omit it when the framing is a NEUTRAL overview.**
Only accent a category when the confirmed insight singles that category out ("education dominates", "one
region leads"). When the journalist confirmed a neutral "vue d'ensemble" / "how it breaks down" framing
with no single subject, leave `highlight` UNSET — accenting one category then steers the eye to a story the
journalist explicitly did NOT choose (an encoding drift from the confirmed takeaway). Same discipline as the
title rule: the encoding may not narrow or diverge from the framing confirmed at Gate 1b.
Per-type spec shapes (the CSV shape each `nativeType` expects, `grouped`…`heatmap`): see the
**Native chart type catalogue** in `knowledge/references/chart-selection.md` — consult the entry for the
chosen type when emitting the Stage-2 `NativeSpec`.

### map-dw (static choropleth map) — default map path

Used when Gate 5 routes to a map AND the format ladder (Gates 1–4) yields **static** (the default).
Emits a **`MapSpec`** with `producer: "map-dw"` as the discriminator (the eval gate uses this field to
identify the path).

**Exact `MapSpec` fields (JSON schema, per-field notes, and the Map colour rule) are in
`references/map-dw-spec.md`** — read it before filling this spec. Essential gotchas to keep in
mind even without opening it:
- Never emit `mapKeyAttr:"ISO_A3"` on basemap `world-2019` (it has no such key — 0-row join,
  fully grey map); use `DW_STATE_CODE` for ISO-A3 countries.
- A NAMED dataset/publication source MUST carry both a name AND a real, verifiable, SPECIFIC URL
  (never a generic org homepage, never an invented URL).
- Map colour: newsroom house palette wins if one exists (leave `colorScale` UNSET on a
  sequential map so the house ramp derives); else pick the `colorScale`/`palette` by subject —
  **never leave the default blue for a non-water subject** (the produce guard FAILS it).
- Emit `unit` whenever the quantity has a short unit (mm, %, €…) — it feeds the legend AND the
  hover tooltip.

**Basemap fallback rule:** if no known DW basemap matches the region identifiers in the data → do NOT
force a map. Fall back to a **sorted bar chart** (`d3-bars`, `sort:"desc"`) and state why in the decision
output (cite the basemap-fallback rule).

**Produce:** route the `MapSpec` to `map-dw`'s producer via the `MapSpec → spec-to-map-metadata →
produceMap` seam. The Datawrapper token comes from `/splash/.env` (`DATAWRAPPER_API_TOKEN`) — it is
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

**Exact config fields (JSON schema, per-field notes, and the `filters` shape) are in
`references/map-native-spec.md`** — read it before filling this config. Essential gotchas to
keep in mind even without opening it:
- `labelField` is **REQUIRED when the deliverable language is not English** — the scrolly/video
  narration uses this name; without it a French map narrates the basemap's English names
  (`"Ethiopia"` instead of `"Éthiopie"`).
- `subject` + `palette` must be set TOGETHER — the produce guard FAILS a declared `subject` left
  on the default blue ramp.
- Filters are interactive-only, **at most 2**; never emit `kind:"time"` (unwired) or
  `kind:"category"` on a dot-density map.
- **`cameraMode` (video only)** — the journalist's camera style: **`"guided-tour"`** (default —
  a beat-driven camera tour between the data's own highlights) or **`"simple"`** (a fixed
  camera; the data animates in place). Ask when the format is **video** and the choice actually
  matters to the story ("a guided tour between the highlights, or a fixed shot that fills in?");
  otherwise leave it unset — `"guided-tour"` is the documented preference and today's default.
  Do not infer `"simple"` heuristically.

### map-native (POINT / LOCATOR or SYMBOL path)

Use when the data is **point data** (coordinates, not region fills) — a set of located events, places,
or symbols — and Gate 5 still routes to a map (the spatial pattern is the story).

**★ HARD RULE — coordinate provenance (NEVER fabricate lon/lat).** A point map needs a `lon`/`lat` for
every marker/point. Those numbers MUST come from ONE of:
1. the **supplied data** — the newsroom's table has explicit `lon`/`lat` (or `x`/`y` / `longitude`/
   `latitude`) columns; read them straight through; OR
2. a **real deterministic geocoding step** — run
   **`bun skills/suggest-chart/scripts/resolve-place.mjs <runDir> --place "<name>"`**. Not a
   hand-rolled fetch, and not `geocodePlace()` called inline either: the script IS that function
   plus the one thing an inline call cannot do — it writes what came back to
   `<runDir>/places.json`, so the lookup leaves a record instead of living in this conversation.
   A geocode is a real lookup, not a recollection; a lookup nobody wrote down is a recollection
   again by the time PRODUCTION runs.

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

**★ HARD RULE — a coordinate you resolved is a coordinate you must SHOW (and be able to be corrected on).**
Provenance is not enough. A real geocoder run can be real and still be *wrong about what it pointed at*,
because a geocoder returns FEATURES and a feature's coordinate is its **centroid**. Asking MapTiler for
"Matterhorn" returns `Matterhorngletscher` — the glacier — whose centroid is **1063 m from the summit,
on the Zmutt flank**. That shipped, on `exports/glaciers-requiem-2026`, under a beat reading
« Au sommet du Cervin, à 4478 mètres ». The journalist had said the point was wrong **before** production
ran; there was no field for their correction to live in, so it reached nothing.

Therefore, for every place YOU resolved (not ones read from the newsroom's own lat/lon columns):

- **Ask for the right KIND of thing.** When the subject is a **peak** — the prose says *summit*, *sommet*,
  *Gipfel*, *cima*, or names an altitude — pass `--expect peak --elevation <the metres the sentence
  states>`. MapTiler's default layer contains **no peaks at all** (measured: Cervin, Matterhorn, Mont
  Blanc, Jungfrau, Eiger all return admin areas, landforms or streets); peaks live in its POI layer
  tagged `natural=peak`, usually with `ele`. The stated elevation also disambiguates the two real
  "Matterhorn" peaks (4478 m in the Alps, 3250 m in Nevada). If it found no summit the script **writes
  nothing and exits non-zero**, listing what did come back — **say so and ask**, never plot the nearest
  thing.

  Three more kinds are wired, each measured the same way, and each returning **null rather than an
  approximation**: `--expect lake` (the point is in the water), `--expect glacier` (on the ice — NOT
  the snout, so a retreat story's "the front has withdrawn 800 m" is not this), and
  `--expect settlement` for a town, village or hamlet (the point is the town **centre**, not the middle
  of the commune — Zermatt's commune is 26 × 16 km and contains the Matterhorn).

  **These three refuse when two features answer the name equally well**, because MapTiler ranks
  ALGERIA's *Lac Noir* above the Fribourg one and a village in **DJIBOUTI** above the Randa under the
  Matterhorn. Pass **`--country`** (ISO 3166-1 alpha-2 — `ch`, or `ch,fr` for a border feature) to
  resolve it; it is a hard server-side filter. A refusal listing several candidates is the geocoder
  telling you the article has not said which country — **ask**, do not pick.

  **`river`, `massif`, `landmark` and `admin-area` are REFUSED**, with the measurement, in
  `UNRESOLVABLE_PLACE_KINDS` (`lib/geo/geocode.ts`) — quote it to the journalist. Briefly: a river has
  no coordinate (asking for "Le Rhône" returns disjoint fragments of the channel, one of them with a
  point 500–1000 m from the water, on a road); no massif feature exists in the layers reachable here;
  "landmark" has no tag to filter on, and result order cannot stand in for one (*Gare de Cornavin*
  returns a supermarket first); and a region's point is a label anchor, not a place (Valais's lands on
  a bench on a footpath) — shade the region instead.
- **Show the journalist what it resolved to**, before producing. The script prints the line to relay,
  in its `showback` field, naming **what kind of feature** it found and its elevation when it has one:
  « Cervin → *Matterhorngletscher, Zermatt* (glacier) — 7.661, 45.986 » is correctable;
  « Cervin → 7.66, 45.99 » is not. Relay it verbatim and wait.
- **Record it in `resolvedPlaces[]` on the accepted proposal** (§5b, alongside `confirmedTakeaway` and
  `sourceHint`): `{ label, origin, lon, lat, resolvedName, categories, elevationM, shownToJournalist }`,
  plus `correctedFrom` when the journalist moved the point. **A correction they give must be applied to
  the marker itself** — the spine compares the two and fails when the record and the plotted coordinate
  disagree, so a correction recorded and not applied cannot ship.

These are **mechanically enforced**, and the enforcement no longer depends on you remembering to thread
anything:

- `lib/geo/place-resolution.ts`, wired into the spine's `validate-gate.ts` (GUARD 6), checks a record
  once it is there. One leg reads the spec ALONE: a marker whose own prose claims a summit and carries
  no `resolvedPlaces` record **fails hard**, threaded or not.
- `skills/splash/src/place-provenance.ts`, wired into `produce-all` before any engine runs, reads
  `places.json` and makes the accepted element ANSWER FOR IT. **Resolving a place and not carrying the
  record across stops the run**, by name. So does a record whose coordinate copies neither the
  resolution nor a declared `correctedFrom` of it. And so does a point map that can account for none of
  its coordinates at all — skipping the script is not a way around this.
- The one other honest answer: when **every** coordinate was read from the newsroom's own lon/lat
  columns and you resolved nothing, say so with **`coordinatesFromData: true`** on the accepted entry.
  That is a claim, not a blank — a run whose `places.json` shows it geocoded one of those places is
  refused for making it.

**Config shapes (locator + symbol, exact JSON) are in `references/map-native-spec.md`** — note the
`lon`/`lat` values shown there are ILLUSTRATIVE PLACEHOLDERS, never values to copy (see the
coordinate-provenance HARD RULE above). Locator validates with `validateLocatorConfig`, symbol
with `validateSymbolConfig`.

**HARD RULE — basemap for point maps:** only `"world"` and `"us-states"` are registered. For ANY
sub-national or regional point map (one country, a region, a city cluster), use **`"basemap":"world"`**
— the map auto-fits to the marker extent, so `world` correctly frames the region. Do NOT invent a
basemap name such as `"france"`, `"italy"`, or `"europe"` — the point-map validators reject an
unregistered basemap. A regional choropleth (sub-national fill) is also not currently supported (only
world ISO-A3 + us-states); if the data is regional fills, fall back to a locator/symbol on `"world"`
or a sorted bar chart.

**Filters:** an interactive locator/symbol may carry a `filters` block (same syntax as the choropleth
path — `kind:"category"` on a marker attribute; `kind:"range"` on a numeric value field).

**`cameraMode` (video only):** same knob as the choropleth path above — `"guided-tour"` (default,
a beat-driven tour of the markers/points) or `"simple"` (fixed camera, the points animate in).

**Self-check:** after filling the config, run `validateChoroplethConfig` (from
`skills/map-native/src/validate-config.ts`). Fix all errors; address warnings (description + source).

**Produce:** write the config to a temp JSON, then run from the `skills/map-native/` directory:
`bun scripts/produce.mjs <config.json> <outDir> [all|static]`
→ static PNG + interactive HTML + 3 mp4s (landscape, square, portrait). The MapTiler key comes from
`/splash/.env` (`MAPTILER_API_KEY`) — it is **never logged**.

### scrolly (scroll-driven geographic guided narrative — Gate 3)

Used when Gate 5 routes to a map AND the format ladder (Gate 3) fires: the story is **irreducibly
sequential** (north→south / step-by-step walk the author paces), a single map evolves across 4+ states,
the piece is long-form (not breaking news), and resources exist. The scrolly engine has **two tracks**:
a **map** track (below) and a **chart** track (see *Chart scrolly* below). Both build via the same
`skills/scrolly/scripts/produce.mjs`; the engine dispatches on whether the config carries `nativeType`.

**ISO-A3 requirement** (same as `map-native`): region identifiers MUST be ISO-A3 codes. If the data
cannot be matched to ISO-A3 → fall back to `map-dw` or a sorted bar chart and state why.

**Emitted config:** the scrolly engine reuses the choropleth config `map-native` uses — emit
`producer:"scrolly"` + the same ChoroplethConfig fields. **Exact JSON shape: `references/scrolly-spec.md`**
(Map track section).

**Same subject-fit + labelField + lang discipline as `map-native` above** — a scrolly is a narration, so it
is the surface where an English basemap name or a blue energy ramp is most visible:
- **`labelField`** (REQUIRED for a non-English deliverable): the scrolly BEATS narrate the DATA name — set
  it so a French scrolly says `"Éthiopie"`, not the basemap's `"Ethiopia"`.
- **`subject` + `palette`**: pick the subject-fit ramp (energy → `"oranges"`); the scrolly audit FAILS a
  declared subject on the default blue.
- **`revealMode`**: `"context"` (default) — leave it unless the story is genuinely a journey/progression;
  do not infer `"sequential"` heuristically (see the `map-native` field note above).
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
The MapTiler key comes from `/splash/.env` (`MAPTILER_API_KEY`) — it is **never logged**.

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
engine to the chart track), plus an `insight` for the closing takeaway. **Exact JSON shape:
`references/scrolly-spec.md`** (Chart track section).

**Narrative control — explicit `beats` (optional, line/bar only).** DEFAULT (field absent): the engine
auto-picks the steps — line: first + last + the 2 biggest step-to-step moves; bar: top-3 leaders + the
tail (a fixed 4-step walk); scatter: 3 outliers. When the journalist **confirmed an explicit beat plan**
(a named sequence of narrative steps, or specific categories that must each get a step), EMIT it as
`beats` — never keep the plan in prose and let the auto-pick override it:
- **line**: each beat = `{ "x": <an x value from the data>, "xEnd": <optional range end>, "text": <the
  confirmed caption> }`. A range beat (`x`..`xEnd`) draws the line to `xEnd` and captions the span.
- **bar**: each beat = `{ "category": <a category value from the data>, "text": <optional caption> }` —
  the highlight walk follows the LIST (its length and its order), not the fixed leaders+tail pick, so a
  5-entry list is a 5-step walk and « Alpes-Maritimes » listed = its own step, guaranteed. When `beats`
  are present with NO explicit `sort`, the BARS also render in the beat/data row order (effective sort
  `none`) so the highlight walks them in place — do NOT emit `sort` to keep a chosen order (e.g. a
  geographic north→south walk); an explicit `sort` overrides it and makes the highlight jump around.
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

## Output — candidates first, then ONE spec per kept opportunity

Since the canonical 12-step flow (2026-07-16), suggest-chart answers in two stages. The
channel is KNOWN at both stages (CADRAGE Q6 precedes this call).

**Stage 1: the candidates.** Emit, for the opportunity:

```json
{
  "candidates": [
    { "type": "column-chart", "producer": "dw-chart", "tier": "recommended",
      "why": "three fixed rates, one comparison — a column chart carries the 25% claim at a glance" },
    { "type": "d3-bars", "producer": "chart-native", "tier": "solid",
      "why": "same comparison as a sorted horizontal read — stronger if labels are long" },
    { "type": "dot-plot", "producer": "dw-chart", "tier": "possible",
      "why": "minimal ink for the same two values" }
  ]
}
```

- EVERY reachable candidate appears — reachable = mapper exists × data shape fits × every
  deterministic guardrail (Gates 0-5 above) passes × the channel allows at least one of the
  type's formats. A guard- or channel-barred type NEVER appears.
- Exactly ONE `tier: "recommended"` per opportunity, its `why` grounded in the confirmed
  takeaway. EVERY candidate carries a real one-line `why` ("en quoi elle peut être
  intéressante") — no bare names.
- The orchestrator batches ALL opportunities' candidate lists into ONE journalist message.
- Nothing reachable → emit the `no-chart` decision with a reason, as before — UNLESS the
  Image-scrolly recognition rule (C5, Runtime procedure step 8) fires: a NARRATIVE claim
  that fails the chart data test on an article-web channel emits the `image-scrolly`
  candidate (`{ "type": "image-scrolly", "producer": "image-native", "tier": "...",
  "why": "..." }`, its `why` stating what the journalist supplies) instead of a dead-end.

**Stage 2: ONE validated spec per kept opportunity** — exactly the historical output, one of:
- a `ChartSpec` JSON for `dw-chart` (the default static chart path);
- a `NativeSpec` JSON for `chart-native` (when motion/interactivity is the ask for a chart);
- a `MapSpec` JSON with `producer: "map-dw"` (when Gate 5 routes to a map and format is static);
- a `ChoroplethConfig` JSON with `producer: "map-native"` (when Gate 5 routes to a map and format is
  interactive or video — ISO-A3 codes required, else fall back to `map-dw` or bars);
- a `ChoroplethConfig` JSON with `producer: "scrolly"` (when Gate 5 routes to a map and Gate 3 fires:
  the story is an irreducibly sequential guided narrative — ISO-A3 codes required, validated via
  `validateChoroplethConfig`, produced via `bun skills/scrolly/scripts/produce.mjs`);
- or a `no-chart` decision with a reason.

The single pinned `format` is derived from channel × type (`allowedFormats(channel)`,
`interactiveDefault` on article-web, explicit journalist signal wins), announced for veto by
the orchestrator.
