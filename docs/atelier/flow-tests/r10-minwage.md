# Flow test — r10-minwage

Article: https://en.wikipedia.org/wiki/List_of_countries_by_minimum_wage  
Date: 2026-07-05  
Branch: GUIDED  
Takeaway: "which countries have the highest and lowest minimum wages"  
Channel: interactive embed on news website

---

## Phase 1 — INPUT

URL handed to the flow. WebFetch extracted country names and USD figures (hourly or monthly as stated).  
Data normalised to USD/month using 173 h/month for hourly figures.  
14 countries selected: Netherlands through Bangladesh, covering the full range from $3,010 to $13/month.

**Friction:** Wikipedia's table mixes hourly/monthly/daily units and local-currency columns. No single "USD/month" column to read directly — the agent had to apply a conversion rule. The SKILL says "use stated figures only" but the article states hourly for most high-wage countries. A stricter reading would exclude converted figures, leaving only monthly-stated rows (Belgium, Brazil, Nigeria, Bangladesh), which is too thin for a ranking chart. Resolved by applying the standard 173 h/month conversion and marking provenance as "prose".

---

## Phase 2 — ANALYSE (silent)

`suggest-article` logic applied:

- Article is a pure data table, no narrative spine. Only one opportunity type: the ranking claim the article title states.
- **Proposal emitted:** "How do minimum wages compare across countries, from highest to lowest?" — magnitude ranking, 14 rows, single numeric column.
- Provenance: `"prose"` (data reconstructed from stated figures). `needsConfirmation: true` → Gate 2b fires.
- Claims left as prose: historical trends (no time series in scope), PPP-adjusted figures (marked unreliable in the article), sectoral variations.

---

## Phase 3 — CADRAGE (Gate 1)

| Q | Answer |
|---|--------|
| Branch | GUIDED |
| Takeaway | "which countries have the highest and lowest minimum wages" |
| Channel | interactive embed on news website → interactive format, landscape |
| Constraints | none |

Gate 1 passed. Format signal: **interactive**.

---

## Phase 4 — PROPOSITION (Gates 2 + 2b)

**suggest-chart routing:**

- Gate 5 (geographic?): country column present. Intent is ranking-framing ("highest and lowest") → Gate 5 explicitly routes this to a **sorted bar chart**, not a map. Cited: "Ranking-framing prose — a leaders-vs-laggards spread — is a BAR signal, not a licence for a map."
- Chart family: magnitude ranking → horizontal sorted bar, descending.
- Format ladder: journalist asked for per-country hover → "rich interactivity" condition → escalate to **chart-native** (not dw-chart).
- Producer: `chart-native`, `nativeType: "bar"`, `orientation: "horizontal"`, `sort: "desc"`.

**Proposal shown:**

> Horizontal sorted bar: "Minimum wages vary 200× between countries" — 14 countries, USD/month, descending. Interactive hover per bar. Producer: chart-native.

**Gate 2b:** data table reconstructed from stated Wikipedia figures shown for confirmation. Journalist accepted.

**Gate 2:** journalist accepted first proposal. ✓

**NativeSpec written to:** `/tmp/r10-minwage-spec.json`

---

## Phase 5 — PRODUCTION (Gate 3)

Command run:
```sh
cd /Users/rmdms/Sites/Professional/atelier
bun skills/chart-native/scripts/produce-from-spec.mjs /tmp/r10-minwage-spec.json /tmp/r10-minwage static
```

Result:
- Vite build succeeded (303 modules, ~110 ms).
- `[assert-selfcontained] OK` — interactive.html is fully self-contained.
- Tooltip confirmed in produce log: "3k USD per month — Netherlands".
- Country names verified in HTML bundle: Netherlands, Belgium, Bangladesh, Nigeria.

Artifacts:
- `/tmp/r10-minwage/interactive.html` — 465 KB self-contained interactive chart
- `/tmp/r10-minwage/static.png` — 82 KB static render
- `/tmp/r10-minwage/interactive.png` — 92 KB screenshot

**Gate 3:** "ship it." ✓

---

## Phase 6 — EXPORT (Code Source)

Command run:
```sh
bun skills/atelier/scripts/export-code.mjs /tmp/r10-minwage /tmp/r10-minwage-export
```

Export folder: `/tmp/r10-minwage-export/`

Contents:
- `interactive.html` — 465 KB self-contained interactive
- `interactive.png` — 92 KB screenshot
- `static.png` — 82 KB static render
- `static.html` — 110 KB (static.png inlined as base64 data URI)
- `EMBED.md` — three delivery forms documented
- `README.txt` — artifact index

Iframe snippet (Code Source form):
```html
<iframe src="interactive.html" style="width:100%;border:0;aspect-ratio:16/10" loading="lazy" title="visual"></iframe>
```

---

## Routing summary

| Decision point | Gate | Outcome |
|----------------|------|---------|
| Branch | Gate 1 | GUIDED → PROPOSITION |
| Geographic? | Gate 5 | Ranking intent → bar chart (not map) |
| Format | Gate 2 | Interactive (hover) → chart-native |
| Chart type | chart-selection KB | horizontal bar, descending |
| Producer | suggest-chart | chart-native |
| Render OK | Gate 3 | "ship it" |
| Export form | Gate 4 | Code source |

---

## Friction report (flow test findings)

1. **Unit normalisation not specified.** The SKILL says "use stated figures only" but Wikipedia states hourly figures for most OECD countries. The honest path requires a conversion (173 h/month) that the SKILL does not mention. A note in suggest-article about the prose-extraction rule for mixed-unit tables would remove ambiguity.

2. **Gate 2b and Gate 2 ordering.** The SKILL says Gate 2b fires only if an accepted proposal has `provenance:"prose"`. But the journalist accepts at Gate 2 first, then Gate 2b confirms the data table. In practice these happened together (journalist accepted the proposal that already showed the data table). No ordering conflict, but the SKILL's prose suggests they are sequential and the journalist would accept before seeing the data — which is backward. Gate 2b should precede Gate 2 acceptance for prose proposals.

3. **"Static" flag behaviour.** `produce-from-spec.mjs` with `static` flag produces both static.png AND interactive.html (despite the flag name). The produce log says "building static + interactive". This is correct behaviour (the script always builds both for chart-native), but the flag name is misleading — it suppresses only the mp4 renders, not the interactive build. The SKILL's produce command documentation does not clarify this.

4. **No `baseColor` / `subject` in NativeSpec.** The NativeSpec schema for chart-native does not include `baseColor` or `subject` (those are ChartSpec fields for dw-chart). The bar rendered in the default blue. For a "minimum wage" / economic/social subject, the palette-freedom principle would suggest reddish-purple (`#CC79A7`) or a green. The chart-native `NativeSpec` spec should document a `highlightColor` or `baseColor` field if palette-freedom is intended here.

5. **No colour applied to the bar.** The rendered bar uses default blue. The suggest-chart spec says pick a subject-fit Okabe-Ito hue, but chart-native's `NativeSpec` has no `baseColor` field. This is a gap between the spec routing and the producer's config shape.
