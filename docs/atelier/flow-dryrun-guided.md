# Atelier flow dry-run — GUIDED path

**Case:** case33 — global unemployment rates (bar chart)  
**Config used:** `docs/atelier/workflow-tests/case33/config.json`  
**Article:** `docs/atelier/workflow-tests/case33/article.md`  
**Date:** 2026-07-04

---

## Phase 1: INPUT

Journalist provides:
- Article: `docs/atelier/workflow-tests/case33/article.md` (Wikipedia-sourced unemployment comparison, 16 countries)
- Data: embedded in the article text; a pre-existing `config.json` already contains the extracted CSV

Normalised input: `{ article: "article.md", data: "unemployment.csv (embedded in config)" }`

---

## Phase 2: ANALYSE (silent)

`suggest-article` runs silently.

It segments the article into paragraphs, identifies the quantified claim:
> "South Africa posts the highest unemployment rate in this selection at 33.2%, followed by Angola (14.5%) and Afghanistan (13.3%). Most Western economies cluster between 3% and 8%..."

It binds this to the CSV data in the config (16 countries × rate). It proposes ONE opportunity:
- **Claim:** South Africa leads with 33.2%, Gulf states approach zero — a strong ranking spread across 16 countries.
- **Intent:** "How do unemployment rates compare across countries, from highest to lowest?"
- **Provenance:** `table` (CSV is the newsroom's source — Wikipedia-cited figures)
- **Confidence:** high

NO output to the journalist at this stage. CADRAGE is primed.

---

## Phase 3: CADRAGE — GATE 1

Questions asked one at a time, in the journalist's language:

**Q1:** "Do you already have a visual in mind, or should I guide you?"  
**A:** "Guide me." → GUIDED branch selected.

**Q2:** "What is the one thing a reader should leave with?"  
**A:** "That South Africa's unemployment is in a different league — and that most rich countries stay below 7%."

**Q3:** "Where does this publish — article embed, social, print?"  
**A:** "Article embed on the web."  
→ Format signal: web / static → feeds suggest-chart Gate 1 (static default).

**Q4:** Not asked — no relevant constraint surfaced (no mobile-first deadline, no house palette mentioned).

Gate 1 complete. Proceeding to PROPOSITION.

---

## Phase 4: PROPOSITION — GATE 2

`suggest-chart` is invoked with `(data: unemployment CSV, intent: "How do unemployment rates compare across countries, from highest to lowest?")`.

`suggest-chart` routing:
- No geographic structure → chart path.
- Format: static (Gate 1) → `chart-native` for rich interactivity / motion (intent is a ranked bar with hover) OR `dw-chart` for plain static. The article's intent line ("Hover each bar to read the exact figure") implies interactivity → `chart-native` chosen.
- Chart family: ranking intent, 16 categories → sorted horizontal bar chart (`d3-bars`, `sort:"desc"`).
- Spec emitted: `NativeSpec` with `nativeType:"bar"`, `sort:"desc"`, `orientation:"horizontal"`, subject-fit colour.

Presented to the journalist:

> **Opportunity 1 — Unemployment ranking (16 countries)**  
> What it shows: countries ranked by unemployment rate, highest to lowest.  
> Visual: horizontal sorted bar chart (interactive, hover to read exact rate).  
> Why: the claim is a ranking spread; the bar chart is the honest default for "which country is highest"; South Africa's 33.2% stands clearly apart.

**Journalist:** "Yes, that works. Ship it."  
→ Proposal accepted; `provenance:"table"` → no Gate 2b provenance confirmation needed.

Gate 2 complete. Proceeding to PRODUCTION.

---

## Phase 5: PRODUCTION

Producer: `chart-native`  
Produce command (run from repo root):

```bash
export VITE_MAPTILER_KEY=$(grep '^VITE_MAPTILER_KEY=' .env | cut -d= -f2-)
export MAPTILER_API_KEY=$VITE_MAPTILER_KEY
bun skills/chart-native/scripts/produce-from-spec.mjs \
  docs/atelier/workflow-tests/case33/config.json \
  /tmp/flow-guided \
  static
```

**Actual output (run executed):**

```
[produce bar] building static + interactive…
✓ built in 108ms  (static/index.html)
✓ built in 106ms  (interactive/index.html)
[produce bar] snapping static + interactive…
wrote static.png
tooltip text: 33.2 Unemployment rate (%)South Africa
wrote interactive.png
PRODUCE_RESULT {"static":"/tmp/flow-guided/static.png","interactive":"/tmp/flow-guided/interactive.png"}
```

**Artifacts produced:**
- `/tmp/flow-guided/static.png` — static PNG render
- `/tmp/flow-guided/interactive.png` — interactive HTML render screenshot

The chart renders correctly: South Africa's bar (33.2%) stands clearly apart; Gulf states (Qatar 0.2%) anchor the bottom; the tooltip fires on the lead bar showing "33.2 Unemployment rate (%) South Africa".

### GATE 3 (render)

Render shown to the journalist (static.png + interactive.png).  
**Journalist:** "Ship it."  

Gate 3 complete. Proceeding to EXPORT.

---

## Phase 6: EXPORT — GATE 4

Question to journalist: "How do you want the visual delivered — (a) code bundle + embed snippet, or (b) an iframe-ready embed link?"

**Journalist:** "Code bundle."

```bash
bun skills/atelier/scripts/export-code.mjs /tmp/flow-guided /tmp/flow-guided-export
```

(The `export-code.mjs` script is pending implementation — in the interim, the `/tmp/flow-guided/` folder contains the self-contained artifacts: `static.png`, `interactive.png`. The journalist receives the folder path and can embed the interactive HTML directly.)

Gate 4 complete. Flow finished.

---

## Conformance checklist

| Check | Result |
|-------|--------|
| ANALYSE is silent (no user output) | ✓ |
| CADRAGE ≤4 questions, one at a time | ✓ (3 asked) |
| GUIDED branch selected | ✓ |
| PROPOSITION waits for accept/edit/reject | ✓ |
| Gate 2b not needed (table provenance) | ✓ |
| PRODUCTION ran the real producer | ✓ (real artifact at `/tmp/flow-guided/static.png`) |
| GATE 3 stopped for "ship it" | ✓ |
| EXPORT offered code vs embed link | ✓ |
| Dialogue in journalist's language throughout | ✓ |
| No phase auto-progressed | ✓ |
