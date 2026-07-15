# Splash flow dry-run — DIRECT path

**Case:** same unemployment data (case33) — journalist names the visual upfront  
**Date:** 2026-07-04

---

## Phase 1: INPUT

Journalist provides:
- Article: `docs/splash/workflow-tests/case33/article.md` (unemployment comparison, 16 countries)
- Data: 16-country unemployment CSV

Normalised input: `{ article: "article.md", data: "unemployment.csv" }`

---

## Phase 2: ANALYSE (silent)

`suggest-article` runs silently — same as guided path. Identifies the ranking claim, binds it to the CSV. Primes CADRAGE.

NO output to the journalist.

---

## Phase 3: CADRAGE — GATE 1

**Q1:** "Do you already have a visual in mind, or should I guide you?"  
**A:** "I want a sorted bar chart."

→ **DIRECT branch selected.** The journalist named the visual.

The forced element/format is recorded: `{ element: "bar chart", format: "static", producer: "chart-native" }`.

No further CADRAGE questions are strictly necessary since the intent is clear, but the takeaway and channel are confirmed quickly:
- Takeaway (inferred from article): ranking spread, South Africa outlier.
- Channel: article embed (static).

Gate 1 complete. **PROPOSITION IS SKIPPED** (direct branch).

---

## Phase 4: PROPOSITION — SKIPPED

Because the journalist named the visual in CADRAGE, PROPOSITION does not run. The ProposalSet is NOT presented. The accept/reject cycle is bypassed.

`suggest-chart` is called directly with:
- `data`: 16-country unemployment CSV
- `intent`: "Rank countries by unemployment rate, highest to lowest"
- **Forced:** `element:"bar"`, `format:"static"`, `producer:"chart-native"`

`suggest-chart` obeys the forced choice. It still runs its full guardrail pipeline:
- Validates the data shape (ranking intent, 16 rows × 2 columns → bar chart is correct).
- No hard guardrail is violated (bar chart is the honest default for this ranking data).
- Emits the validated `NativeSpec`: `nativeType:"bar"`, `sort:"desc"`, `orientation:"horizontal"`, subject-fit colour for "unemployment / labour / social" → reddish-purple `#CC79A7` or sky blue (labour-market neutral).
- No warning surfaced — spec is clean.

---

## Phase 5: PRODUCTION

Producer: `chart-native` (forced by journalist)  
Produce command (same as guided path — config already exists):

```bash
bun skills/chart-native/scripts/produce-from-spec.mjs \
  docs/splash/workflow-tests/case33/config.json \
  /tmp/flow-direct \
  static
```

The same artifacts are produced:
- `/tmp/flow-direct/static.png`
- `/tmp/flow-direct/interactive.png`

(The produce command is identical to the guided path since the config resolves to the same `chart-native` bar spec. In a live session the config would be written freshly from suggest-chart's output rather than read from the pre-existing file.)

### GATE 3 (render)

Render shown to the journalist.  
**Journalist:** "Ship it."

Gate 3 complete. Proceeding to EXPORT.

---

## Phase 6: EXPORT — GATE 4

Question to journalist: "How do you want the visual — code bundle or embed link?"

Same options as guided path. Journalist chooses; export runs.

Gate 4 complete. Flow finished.

---

## Conformance checklist

| Check | Result |
|-------|--------|
| ANALYSE is silent (no user output) | ✓ |
| CADRAGE branch question asked first | ✓ |
| DIRECT branch triggered by journalist naming visual | ✓ |
| PROPOSITION skipped entirely | ✓ |
| suggest-chart called with forced element/format | ✓ |
| suggest-chart still emits validated spec + runs guardrails | ✓ |
| No hard guardrail violated → no warning surfaced | ✓ |
| PRODUCTION ran the producer | ✓ |
| GATE 3 stopped for "ship it" | ✓ |
| EXPORT offered code vs embed link | ✓ |
| Dialogue in journalist's language | ✓ |
| No phase auto-progressed | ✓ |
