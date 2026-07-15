# Case 4 — Global diffusion of nationwide same-sex marriage: does ② escalate past dw-chart static?

Ran the splash ② workflow (suggest-article → suggest-chart) on `article.md` + `data.csv`, applying
the format gates HONESTLY. No branch switch, no commit. Keys stayed in `.env` (none needed — the
routing decision, not a full render, is the test).

## Subject + targeted escalation gate

**Subject:** the year nationwide same-sex marriage took effect in each of 36 countries, 2001–2025
(Netherlands first → Thailand latest). A **temporal-geographic diffusion** story: the payoff is the
*sequence and spatial spread* across a world map, not any single date or ranking.

**Targeted gate:** primarily **Gate 3 (scrolly)** — an irreducibly sequential guided walk through a
single map evolving across 4+ discrete states — with **Gate 4 (video, condition A: geographic
diffusion where motion is the encoding)** as the strong co-trigger. Either escalates past static.

## (a) suggest-article — ProposalSet

One strong proposal; the article has a single diffusion spine.

```jsonc
{
  "proposals": [{
    "anchor": { "paragraphIndex": 1, "quote": "The point of this piece is the sequence and the spread, not any one country's date." },
    "claim": "Nationwide same-sex marriage spread from 1 country (Netherlands, 2001) to 36 countries by 2025, diffusing by continental leaps — Western Europe → South Africa (2006) → Southern Cone (2010–13) → a 2015 tipping point (incl. USA) → Asia (Taiwan 2019, Thailand 2025).",
    "intent": "Where did nationwide same-sex marriage start, and in what order and geographic pattern did it spread across the world from 2001 to 2025?",
    "data": "iso_a3,country,year (all 36 rows of data.csv)",
    "dataSource": { "table": "data.csv", "columns": ["iso_a3","country","year"] },
    "confidence": "high",
    "rationale": "The article's entire structure is the ordered, cross-continental spread of one attribute across a map — a diffusion shape, the strongest single visual."
  }],
  "notes": "Provenance tier: table. Nepal excluded upstream (interim register, not full legalisation). No count/ranking sub-claims proposed — the story is the spread, not 'which region is highest'."
}
```

## (b) suggest-chart — decision + HONEST gate reasoning

**Profile:** 36 rows. `iso_a3` = region identifier (valid ISO-A3, joins `world.geojson`). `country`
categorical. `year` = the measure — a **year-of-adoption per region** (an ordinal temporal attribute,
one discrete state-change event per row).

**Gate 5 — map vs chart (geographic):**
1. *Spatial pattern IS the story?* **YES.** The prose is explicitly about where it started, the
   continental leaps (Europe → Africa → South America → Asia), the Nordic + Southern-Cone clusters,
   and the order of appearance. That is diffusion — a spatial pattern, not a "which is highest"
   ranking.
2. *Normalised, not a raw count?* **YES (in spirit).** `year` is not a per-capita rate, but the
   normalisation clause exists to reject **raw absolute counts** that just draw a population map.
   Year-of-event carries no population-magnitude confound; it is a legitimate per-region temporal
   encoding — exactly what a diffusion choropleth/animation encodes. The anti-pattern the gate guards
   against (population map) does not apply.
3. *Regions legible OR self-location?* **YES on both.** 36 sovereign countries on a world map are
   legible, and there is a clear "find your country" self-location motive.
   → **Gate 5 routes to a MAP.**

**Format ladder (map path):**
- **Gate 1 (static — default):** a static choropleth could colour 36 countries by adoption year, but
  it **collapses the sequence** — the article's payoff is the *order over time*, which a frozen image
  cannot deliver. Static fails to carry the core editorial intent. Escalate.
- **Gate 3 (scrolly) — ALL four hold:** (1) irreducibly sequential — the article literally frames
  itself as "a guided walk through 36 states of one evolving map," each step building on the prior;
  (2) a single map evolving across 4+ discrete states — 2001→2025, ~15 distinct year-steps, far more
  than 4; (3) long-form feature, not breaking news; (4) resources assumed for a flagship piece.
  **Gate 3 FIRES.**
- **Gate 4 (video) — condition A also holds:** geographic diffusion where motion is the encoding and
  small multiples would need too many frames. **Gate 4 co-fires.** (First-match-wins on the ladder
  puts Gate 3 ahead; the article's self-description makes scrolly the honest primary route, with
  map-native video the equally-valid alternative if the newsroom prefers a shareable clip.)

**Decision:** element = **choropleth map** · format = **scrolly (guided sequential map)** ·
producer = **`scrolly`** · why = Gate 5 → map (spatial diffusion is the story, legible regions +
self-location); Gate 3 → scrolly (irreducibly sequential, single map, 4+ states, long-form). ISO-A3
codes present, so the ISO-A3 join requirement is met — no fallback to `map-dw`/bars.

**Alternative honest route:** `map-native` **video** (Gate 4A) if the desired distribution is a
shareable/social clip rather than an on-page scroll narrative. Both are rich engines; both escalate
past dw-chart static.

## (c) Emitted spec + self-check

Emitted a `ChoroplethConfig` with `producer: "scrolly"` (see `scrolly-config.json`): `regionKey:
iso_a3`, `valueField: year`, 36 `rows` (ISO-A3 + year), `basemap: "world"`, insight `title`,
`description`, `unit`, honest `source`. Ran `validateChoroplethConfig` (the same validator scrolly and
map-native share) → **`ok: true`, zero warnings, zero errors.** The producer is wired and accepts the
config; a full render was intentionally NOT run (rich renders are slow and the DECISION is the test).

## (d) The finding that matters

**Did ② escalate past dw-chart static when the story warranted it? → YES.**

The gates routed correctly: Gate 5 → map (not a bar chart), and Gate 3 → **scrolly** (a rich engine),
with Gate 4 video as a co-valid escalation. The system did **not** get stuck on dw-chart static
despite the geographic + temporal-diffusion triggers. dw-chart is confirmed to be the honest *default*
for simple single-shape trends (as case 3 showed), not a ceiling — when the editorial nature is an
irreducibly sequential spatial diffusion, ② escalates to the richer producer with sound, gate-cited
reasoning.

## (e) One calibration nuance worth flagging (not a failure)

Gate 5's condition 2 literally says "normalised rate (per-capita, %, index — not raw absolute
counts)." A **year-of-adoption** value is neither a rate nor a raw count — it is an ordinal temporal
attribute. It passes on the *spirit* of the rule (no population-map artifact), but a strict literal
reader of the skill could wrongly bounce it to a sorted bar chart. **Suggested tightening:** amend
Gate 5 condition 2 to "a normalised rate **or a per-region categorical/temporal attribute** (year,
class, rank) — the guard is against raw absolute counts that merely redraw the population map." This
makes the gate's intent explicit for temporal-diffusion cases and removes the ambiguity. It is a
wording sharpening, not a routing bug — the honest reading already escalates correctly.
