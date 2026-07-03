# Workflow test — Case 1: Solar electricity share by European country, 2024

End-to-end run of the atelier pipeline (suggest-article → suggest-chart → producer) on
one real article + its data. No git branch switch, no commit.

## (a) ① suggest-article — ProposalSet

Followed `skills/suggest-article/SKILL.md` steps 1–8. The article was segmented into
paragraphs; quantified claims extracted; each claim bound to rows/columns of `data.csv`
(provenance tier `table`). Every visualized value comes from the CSV — nothing invented.

```jsonc
{
  "proposals": [
    {
      "anchor": {
        "paragraphIndex": 3,
        "quote": "The gap between Hungary's 27.3 percent and Czechia's 5.8 percent ... underlines how much policy, grid rules and investment, rather than latitude alone, shape a country's solar footprint."
      },
      "claim": "Solar's share of national electricity in 2024 spans from 27.3% (Hungary, highest) down to 5.8% (Czechia, lowest) across 15 European countries — a spread of over 20 percentage points.",
      "intent": "How does the share of electricity from solar differ across European countries in 2024, and which lead or lag?",
      "data": "country,iso3,solar_share_2024_pct\nHungary,HUN,27.3\nSpain,ESP,21.9\nNetherlands,NLD,21.1\nGreece,GRC,19.8\nLithuania,LTU,18.8\nBulgaria,BGR,18.2\nGermany,DEU,17.9\nPortugal,PRT,17.3\nItaly,ITA,16.9\nBelgium,BEL,15.6\nAustria,AUT,14.1\nDenmark,DNK,13.4\nPoland,POL,11.3\nRomania,ROU,9.8\nCzechia,CZE,5.8",
      "dataSource": { "table": "data.csv", "columns": ["country", "iso3", "solar_share_2024_pct"] },
      "provenance": "table",
      "confidence": "high",
      "rationale": "The full 15-country distribution is the article's spine: a leaders-vs-laggards ranking with a >20pp spread. This is the one claim that carries the whole story and is fully backed by the CSV."
    }
  ],
  "notes": "One proposal kept (soft ceiling is 3), because the article is a single distribution told country by country — sub-claims (Hungary tops, Czechia trails, the high-teens cluster, Denmark outpacing southern peers) are all facets of the SAME 15-row series, not separate visuals. Deliberately NOT proposed: the closing-paragraph EU-27 aggregates (solar 11%, coal 10%, 304 TWh, +22% YoY). Per SOURCE.md those four figures are context cited to Ember and are NOT in data.csv; binding them would require inventing/adding rows, so they stay prose (they would only qualify as a small separate 'solar vs coal' two-value prose proposal, which is weaker than the main distribution and out of scope for this data file)."
}
```

## (b) ② suggest-chart — decision

Followed `skills/suggest-chart/SKILL.md` runtime procedure on the top proposal's
`(data, intent)`.

1. **Profile.** 15 rows; columns `country` (categorical, cardinality 15), `iso3`
   (categorical region id), `solar_share_2024_pct` (numeric, 5.8–27.3). Data shape:
   single-series (one label + one value), with a geographic id column.
2. **Geographic structure.** Yes — `iso3` holds ISO-A3 country codes (HUN, ESP, …).
   Candidate basemap family: world-countries. The numeric column is a **normalised
   rate** (% of national electricity), not an absolute count — relevant to Gate 5.
3. **Gate 5 (MAP vs sorted-bar)** — read `knowledge/references/formats/format-selection.md`.
   The three MAP conditions:
   - **normalised rate?** YES (% share).
   - **regions legible OR self-location motive?** YES — 15 named countries with clear
     labels; and a "find your country" self-location motive applies.
   - **spatial pattern IS the story?** WEAK / borderline. The article's editorial frame
     is explicitly spatial ("Solar's uneven **map**", "the map of who is leading that
     shift ... remains anything but uniform"), and the data ships with iso3 by design for
     mapping. Against that, the analytical thesis is a **ranking** that deliberately
     *breaks* naive geography ("policy, grid rules and investment, **rather than latitude
     alone** ... the cloudier Netherlands nearly matches [Spain], and Denmark outpaces
     several southern peers").
   **Routing:** MAP. The editorial framing is spatial (an "uneven map" of who leads the
   shift) and a self-location motive is present, so the spatial distribution is the
   presentation the article itself chooses. This is the ambiguous call of the run — a
   strict reading of "spatial pattern IS the story" (finding = ranking, not clustering)
   would route to a **sorted bar chart** (`d3-bars`, `sort:"desc"`). See friction note.
4. **Format (Gates 1–4).** Gate 2 (interactive) fires on the "find your country"
   personal-hook + per-region hover across 15 regions, web delivery. The map ladder
   therefore escalates from static (`map-dw`) to **interactive → `map-native`**. Gate 3
   (scrolly) does NOT fire: the story is not irreducibly sequential (no author-paced
   north→south walk; a single snapshot year, not 4+ evolving states). Gate 4 (video) does
   NOT fire: no temporal diffusion, no social/vertical distribution requirement.
   ISO-A3 requirement for `map-native` is satisfied (iso3 column).

**Decision:** element = **choropleth map** · format = **interactive** · producer =
**map-native** · why = "iso3 + normalised % + the article's own spatial 'uneven map'
framing route to a choropleth (Gate 5), and the find-your-country hook escalates it to an
interactive `map-native` render (Gate 2); Gates 3/4 do not fire."

## (c) Spec produced

`ChoroplethConfig` (`producer: "map-native"`), saved to `spec.json`. All 15 values copied
verbatim from `data.csv` (`iso3` → `code`, `solar_share_2024_pct` → `share`). Self-check
`validateChoroplethConfig` → **ok: true, 0 warnings** (title is an insight ≥12 chars,
description + source name/url all present).

Title: "Solar's share of national electricity swings from 27% in Hungary to 6% in Czechia".
Source: Wikipedia — Solar power by country (compiled from Ember / Our World in Data), 2024.

## (d) Produced files + what the render shows

Producer run: `bun scripts/produce.mjs .../spec.json /tmp/wf-case1 static` (static +
interactive path; no video).

- `/tmp/wf-case1/static.png` — static choropleth snapshot.
- `/tmp/wf-case1/interactive.png` — interactive proof (with a live tooltip open).
- `/tmp/wf-case1/responsive-{360,768,1100,1600}.png` — responsive proofs.
- `/tmp/wf-case1/a11y.png` — accessibility proof.
- `skills/map-native/dist/interactive-wf-case1/index.html` — the shippable interactive map.

**Render check (passed):** the map shades 15 European countries on a binned sequential
blue scale (6–10 / 10–14 / 14–19 / 19–23 / 23–27). Hungary is the darkest (top bin,
23–27), matching its 27.3% lead; Czechia the lightest. The interactive proof
programmatically opened a region and asserted the tooltip read **"Germany — 17.9%"** —
exactly the CSV value (value-assertion passed). Furniture present: insight title,
description, binned legend with unit, source line linking to the source URL, and
MapTiler/OSM attribution. Responsive (4 widths) and a11y (region role + label, 3 control
buttons, tooltip, bounded nav, non-occluded controls) checks all passed.

## Pipeline friction / ambiguity noted

1. **Gate 5 condition 1 is genuinely ambiguous here, and the skill gives no tie-breaker.**
   The article's finding is fundamentally a **ranking** (leaders vs laggards, >20pp
   spread) and it explicitly argues *against* a clean spatial/latitude pattern — which by
   the literal Gate 5 "practical test" (drop into a sorted bar; if equally legible → bar)
   points to a **sorted bar chart**. Yet the article's own framing is a "map", the data
   ships with iso3 specifically for mapping, and there is a find-your-country motive —
   which point to a choropleth. The run routed to MAP on the editorial-framing +
   self-location signals, but a defensible strict reading yields `d3-bars sort:desc` via
   `dw-chart`. The skill would benefit from an explicit tie-breaker for "ranking story
   that is editorially framed as a map" (e.g. does the article's own presentation choice
   or a self-location motive override the analytical-finding test?).

2. **Env var name mismatch in the SKILL.** `suggest-chart`/`map-native` docs say the
   MapTiler key is `MAPTILER_API_KEY` in `.env`, but the actual `.env` exposes
   `VITE_MAPTILER_KEY` and `REMOTION_MAPTILER_KEY` (no `MAPTILER_API_KEY`). Production
   still worked because `produce.mjs` reads the Vite/Remotion vars via `process.env`, but
   the documented variable name is wrong and would mislead anyone setting up the key.

3. **suggest-article prose-vs-table edge on the EU-27 aggregates.** SOURCE.md flags that
   the four closing figures (11%/10%/304 TWh/+22%) are the only ones outside the CSV. The
   skill's provenance tiers handle this cleanly (they stay prose), but it is worth noting
   the pipeline correctly resisted over-proposing a second visual from prose-only numbers.

4. **Minor:** `produce.mjs`'s `static` mode actually emits static + interactive + the
   responsive/a11y proof set (not "static only"), which is more than the arg name implies
   — not a bug, just a naming surprise.
