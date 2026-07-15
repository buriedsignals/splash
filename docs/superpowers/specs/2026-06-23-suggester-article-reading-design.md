# ② Suggester — Article Reading (ANALYSE + PROPOSITION) — design spec

> Sub-chantier ② of the umbrella spec, **second cut**. The prior cut (`2026-06-23-suggester-runtime-design.md`)
> goes `data + intent → 1 ChartSpec → dw-chart`. **This cut is the step before it**: given an *article (text)
> + its data*, ② reads the narrative and proposes **where** a visual serves the story, **which** kind, and
> **what data** feeds it — emitting one or more `(intent + data subset)` proposals that flow into the prior cut.
>
> Output is **editorial and vetoable** — no hard gate (per the architecture: validation lives on the produced
> visual, not on an abstract plan). ② = the host agent (Mycroft/local-first). No tiers. No backend.
>
> Date: 2026-06-23 · Status: **design proposal — awaiting human sign-off before any build**

## 1. Why this cut

The architecture flow per article is `INPUT → ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT`. The
first cut implemented **PRODUCTION** (and the tail of PROPOSITION): it assumes someone already handed ② a
clean `data + intent` pair. In reality the journalist hands ② **an article and a data file**, not a
pre-distilled intent. This cut implements **ANALYSE + PROPOSITION**: read the text, find the visual
opportunities, and produce the `(intent + data)` pairs the prior cut consumes.

This is the genuinely new product risk. Choosing a chart from `data + intent` is comparatively bounded
(the prior eval already scores it 8/8 / 0.93 / 0.96). Deciding **where a visual belongs in a narrative**,
**which claim it should carry**, and **whether to propose one at all** is judgment-heavy and the part a
non-equipped newsroom cannot do alone — so it is exactly where ② must earn its keep, and where the eval is hard.

## 2. Frame — input, task, output, plug-in

### 2.1 Input shape

② receives two artefacts the journalist already owns:

- **`article`** — the text, as Markdown or plain text. We assume paragraphs are separable (blank-line or
  heading delimited). No CMS coupling in this cut.
- **`data`** — one or more named CSV tables (the same CSV shape the prior cut profiles). Supplied as a
  small set `{ "<name>.csv": "<csv text>", ... }`. The article references this data implicitly (a paragraph
  says "unemployment fell to 3.7%"; the `unemployment.csv` table holds the series behind it).

Both are **owned files** the newsroom already has — no fetching, no generation. ② never invents data or text.

### 2.2 ②'s task (ANALYSE + PROPOSITION)

1. **ANALYSE** — read the article silently and extract its **claims** (the factual, quantified assertions:
   "cross-border workers nearly doubled since 2015", "the budget overran by 40%"), each tied to the
   paragraph/anchor that makes it and, where possible, to the data table + columns that substantiate it.
2. **PROPOSITION** — for the claims that a visual would *serve* (not every claim earns a chart), emit a
   **visual proposal**: an editorial suggestion of *a visual of kind X belongs here, drawn from this data*.
   Apply the suggester guardrails (don't over-propose; the strongest 1–3 claims, not every number).

### 2.3 Output shape — the visual proposal

The unit of output is a `VisualProposal`. It is deliberately the **bridge** into the prior cut: it carries an
`intent` string and a `data` CSV subset, which are exactly the two inputs `suggest-chart` already consumes.

```jsonc
{
  "anchor": {                      // WHERE in the narrative (advisory)
    "paragraphIndex": 3,           // 0-based index into the article's paragraphs
    "quote": "cross-border workers nearly doubled since 2015"  // the claim text, verbatim, for human placement
  },
  "claim": "Cross-border workers grew from ~40k to ~73k since 2015",  // the finding the visual carries
  "intent": "How did cross-border worker numbers grow since 2015?",   // → feeds prior cut verbatim
  "data": "year,France,Switzerland\n2015,18,22\n...",  // the CSV SUBSET that feeds this visual → feeds prior cut
  "dataSource": { "table": "cross-border.csv", "columns": ["year","France","Switzerland"] },  // provenance
  "confidence": "high",            // high | medium | low — editorial strength of the opportunity
  "rationale": "A two-side growth claim over a continuous period is the article's spine and deserves a visual."
}
```

A run produces a **`ProposalSet`**: `{ proposals: VisualProposal[], notes: string }`. `notes` records claims
deliberately **not** proposed (and why) — this is what lets the eval check **under**-proposing, not just over.

Key shape decisions:

- **No `family` / no chart type.** The proposal carries **`claim` + `data` + `intent` only**. Choosing the
  chart family/type is entirely the prior cut's job (it owns `FAMILY_TYPES` + `chart-selection.md`). Opportunity-
  finding (here) and chart-choice (prior cut) stay **cleanly separated** — this cut never pre-empts the type
  decision, and a wrong final chart can be attributed to exactly one stage.
- **② binds the data to the claim itself.** ② is *not* handed pre-paired claim↔data; it reads the article,
  finds the claim, and extracts the supporting CSV subset from the supplied tables. **This matching is ②'s
  core value** — it is the work a non-equipped newsroom cannot do — and it is what `provenanceOk` keeps honest.
- **`anchor` is location, not a hard insertion point.** The journalist places the visual; the anchor is a
  suggestion ("near this sentence"). No layout commitment — fidelity to "validation on the produced visual".
- **`data` is a real CSV subset, not a pointer.** ② extracts the actual rows/columns (a self-contained CSV)
  so the proposal is immediately producible — and so the eval can run a **deterministic** check that the
  subset passes downstream validation. `dataSource` keeps provenance back to the owned table.

### 2.4 How it plugs into the existing runtime

```
article + data
   │
   ▼  [ ② ANALYSE + PROPOSITION  — THIS CUT ]
ProposalSet { VisualProposal[] }
   │   (journalist vetoes / edits — no hard gate)
   ▼  for each accepted proposal: (proposal.data, proposal.intent)
[ ② suggest-chart  — PRIOR CUT ]  →  ChartSpec  →  validateChartSpec  →  dw-chart  →  owned PNG/embed
```

Each accepted proposal is `(data, intent)` — byte-for-byte the prior cut's input. **No change to the prior
cut.** This cut is purely upstream: it manufactures the pairs the prior cut already knows how to turn into
charts. The seam `proposal → suggest-chart → dw-chart` reuses the proven `Spec → mapper → client → produce`
template end-to-end.

## 3. Approaches considered

### (a) **Editorial proposals the journalist vetoes, then each runs the prior cut** — RECOMMENDED

② emits a `ProposalSet` of opportunities (the shape above). The journalist accepts/edits/rejects (vetoable,
no gate). Each accepted proposal's `(data, intent)` runs the **unchanged** prior cut.

- **+** Faithful to the locked architecture: PROPOSITION is vetoable, validation lives on the produced visual.
- **+** Clean reuse — zero change to `suggest-chart`/`dw-chart`; this cut is a pure upstream stage.
- **+** Separable eval: ②'s *opportunity-finding* is judged here; *chart-choice* is already judged by the
  prior harness. We don't re-litigate type selection — the proposal carries no chart type at all.
- **+** Matches the non-tech journalist: a list of "here's where a visual would help, and why" is reviewable
  editorial language, not an abstract plan.
- **−** Two-stage at runtime (propose, then produce per accepted item) — but that *is* the locked flow.

### (b) ② directly emits N ChartSpecs

② reads article+data and emits a batch of finished `ChartSpec`s in one pass, skipping the proposal layer.

- **+** Fewer hops; one artefact.
- **−** Collapses ANALYSE+PROPOSITION+PRODUCTION into one opaque step — **violates** the vetoable-PROPOSITION
  decision (the journalist would be vetoing finished charts, not opportunities).
- **−** Duplicates the prior cut's type-selection logic instead of reusing it; two places to keep in sync.
- **−** Harder to eval: a wrong chart could be a bad *opportunity* or a bad *type choice* — the two failures
  blur. Rejected.

### (c) Two-pass: extract claims+data first, then map claims → opportunities

A formalised version of (a)'s internals: pass 1 = `ClaimSet` (every quantified claim + its data binding);
pass 2 = select which claims become `VisualProposal`s.

- **+** The `ClaimSet` is independently checkable (did ② find the claims? bind the right data?) — a cleaner
  deterministic eval surface.
- **+** Separates *recall* (found the claims) from *editorial judgment* (chose the right few to visualise).
- **−** More machinery and a second artefact to spec, store, and judge — heavier than a narrow first cut wants.

**Recommendation: (a)**, but **borrow (c)'s instinct** by keeping `notes` (claims-not-proposed) in the output
so the eval can measure under-proposing. If the first-cut eval shows ② can't reliably *find* claims (a recall
problem distinct from judgment), promote to the explicit two-pass (c) in a later cut. We flag this as a
deliberate deferral, not an oversight.

## 4. The eval — did ② find the RIGHT opportunities and the right data?

Reuse the prior harness philosophy verbatim: **deterministic gate where code can judge + LLM-judge where only
editorial sense can**, agent-orchestrated runner (no separate backend), one baseline run, an improvement loop
that changes the *skill* not the *cases*. Lives at `skills/suggest-article/eval/` (measures THIS cut; the prior
eval under `suggest-chart/eval/` stays green and untouched).

### 4.1 Case shape

A case is **a generic small-newsroom sample article + its data + an authored gold standard** of the visual
opportunities it contains:

```jsonc
// eval/cases/<id>.json
{
  "id": "cross-border-growth",
  "article": "## A town under pressure\n\nThe population ...\n\nCross-border worker numbers nearly doubled since 2015 ...\n\nThe mayor declined to comment ...",
  "data": {
    "cross-border.csv": "year,France,Switzerland\n2015,18,22\n2017,21,25\n...",
    "rents.csv": "district,rent\nNorth,1450\n..."
  },
  "expect": {
    "opportunities": [
      { "claimMatches": ["cross-border", "doubled", "2015"],   // keywords the proposal's claim/quote must hit
        "dataTable": "cross-border.csv",
        "dataColumns": ["year", "France", "Switzerland"] },
      { "claimMatches": ["rent", "district"],
        "dataTable": "rents.csv",
        "dataColumns": ["district", "rent"] }
    ],
    "minProposals": 2,
    "maxProposals": 3,         // catches over-proposing (don't chart the mayor quote)
    "noChartClaims": ["mayor declined to comment"]   // claims that MUST NOT be proposed
  }
}
```

**Gold-standard authorship (resolved).** We author both the sample articles **and** their gold marks
ourselves, on **generic small-newsroom stories** (a typical local story + its data — not pilot-specific).
Splash is built for *all* small newsrooms; the grant's Annemasse pilot is a deliverable, not a design or
validation dependency, so the eval corpus must not couple to it. Each gold mark — "a visual belongs here,
drawn from this table/columns" — is **grounded in documented journalism best-practice** (the KB references:
`chart-selection.md` for what claims warrant a visual, `design-conformance.md`), **not personal taste**.
`claimMatches` is a keyword set, not an exact string, so a correctly-found opportunity phrased differently
still matches — we test *did it find this opportunity*, not *did it phrase it our way*. The gold marks carry
**no chart family/type** (that is the prior cut's call) — only *where* a visual belongs and *which data* backs it.

### 4.2 Deterministic gate (`score.ts`, pure, unit-tested)

What code **can** check, without judging editorial taste:

```ts
export interface ProposalScore {
  countOk: boolean;        // minProposals ≤ N ≤ maxProposals  (over/under-proposing)
  dataValid: boolean;      // every proposal.data parses as CSV AND the (data,intent) is producible downstream
  provenanceOk: boolean;   // every proposal.data subset's columns ⊆ the named source table's columns (no invented data)
  noChartRespected: boolean; // no proposal anchors onto a gold "noChartClaims" entry
  recall: number;          // fraction of gold opportunities matched by some proposal (keyword + dataTable)
  precision: number;       // fraction of proposals that match a gold opportunity (not spurious)
  pass: boolean;           // countOk ∧ dataValid ∧ provenanceOk ∧ noChartRespected ∧ recall ≥ τr ∧ precision ≥ τp
  notes: string[];
}
```

Deterministic checks, each grounded in something code owns:

- **`dataValid`** — the strongest reused gate. For each proposal, parse `proposal.data` as CSV and confirm it
  is downstream-producible: it must be non-empty, rectangular, have a header, and ≥1 numeric column (the
  minimum any chart needs). As a stronger reuse, build a minimal candidate spec by wrapping the CSV in the
  *simplest valid type* (`column-chart`) plus a placeholder title/altInsight and run **`validateChartSpec`**
  (the prior cut's validator) on it — a pure data-shape probe, **not** a chart-type choice (that stays the
  prior cut's job). If the extracted subset can't pass this, the proposal is mechanically broken regardless of
  editorial merit. This directly answers "the right data for them" with code.
- **`provenanceOk`** — every column in `proposal.data` must exist in the cited `dataSource.table`; row values
  must be a subset of that table's. Catches invented/hallucinated data deterministically.
- **`countOk`** + **`noChartRespected`** — catch over-proposing and the mayor-quote trap with code.
- **`recall` / `precision`** — matched against the gold set by `claimMatches` keywords ∧ `dataTable`. These
  are the **honest soft spot**: they reward finding the *marked* opportunities. A genuinely good proposal the
  expert didn't mark would dent precision unfairly — which is why precision is judged leniently (threshold
  `τp` modest) and the **LLM-judge** has the final word on whether an "extra" proposal is actually good.

Thresholds `τr`, `τp` are **tuning knobs (each a single number)**. Default: **start lenient** (`τr = 0.7`,
`τp = 0.5`) so the tiny first corpus does not fail ② on a single missed/extra mark, then **tighten as the
corpus grows** and the gold set stabilises. The knobs are the dial; the LLM-judge carries the editorial verdict.

### 4.3 LLM-judge (`judge.md`, editorial soundness)

Given `(article, data, ProposalSet, gold)`, an experienced data-journalism editor scores what code cannot:

```jsonc
{
  "rightPlace": 0.0,        // are the anchors near where the visual actually serves the narrative?
  "rightKind": 0.0,        // would a visual genuinely serve this claim (vs. it being better left as prose)?
  "rightDose": 0.0,        // not over/under-proposing — the strongest claims chosen, the noise left alone
  "dataFit": 0.0,          // does each data subset genuinely back its claim?
  "rationale": "string"
}
```

- `rightPlace` / `rightKind` map to "right place? worth a visual at all?" — `rightKind` judges whether the
  claim *deserves* a visual, not which chart (the prior cut owns that).
- `rightDose` is the over/under-proposing judgment the case's `min/maxProposals` can only coarsely gate —
  the editor judges whether *these specific* claims were the right ones to lift.
- `dataFit` lets the judge catch a subset that validates (passes the deterministic gate) but doesn't actually
  substantiate the claim (right shape, wrong cut of the data).

### 4.4 Runner + improvement loop (`run.md`)

Identical orchestration to the prior cut: for each case, **act as ②** (read `suggest-article/SKILL.md` + KB,
given `article + data`, emit a `ProposalSet`, never peeking at `expect`) → **`scoreSpec`-equivalent gate**
(`scoreProposalSet`) → **act as the judge** (`judge.md`) → record the row. Aggregate: deterministic pass rate
(X/N), mean recall/precision, and means of the four judge axes → `baseline-report.md`. Improvement loop:
weak metric → ONE targeted edit to `suggest-article/SKILL.md` → re-run → record the delta. **Change the skill,
not the cases.**

### 4.5 Honest limits of the eval

- "Right opportunities" is irreducibly **judgment-heavy**. We author the gold marks ourselves, so the harness
  is **self-referential** — we set the yardstick and grade ② against it. We accept this explicitly. Mitigation:
  (1) the marks are **derived from documented best-practice** (the KB references), not personal taste, so the
  yardstick is defensible and reproducible, not idiosyncratic; (2) the harness is a **relative-improvement
  instrument** — it tells us whether a change to `suggest-article` made ② *better against a fixed bar*, not
  whether ② is *absolutely* right; (3) keyword-not-exact matching, lenient thresholds, and the LLM-judge's
  final say on defensible extras. The corpus is a *yardstick*, not ground truth. This must be stated in the
  baseline report.
- Recall/precision against our authored marks rewards conformity to those marks. Small corpus = high variance.
  Treat the first baseline as directional; grow and diversify the generic corpus, and re-validate on cases ②
  was **not** written to pass (same caveat the prior cut flagged honestly).
- The deterministic gate is strong on *data validity/provenance* (real reuse of `validateChartSpec`) and
  *count/no-chart* (mechanical), and weak on *opportunity correctness* (delegated to keywords + judge). We
  claim only what code can actually prove.

## 5. First cut — the narrowest slice that proves the loop

Vertical-slice discipline, mirroring slice-1. The smallest thing that proves the **whole new loop** runs:

**Scope IN:**

1. `skills/suggest-article/SKILL.md` — the ANALYSE + PROPOSITION runtime procedure (read article → extract
   claims → bind data → emit `VisualProposal[]` with guardrails), in the 8-section skill-autonome canon.
   Grounds on the existing KB (`knowledge/references/chart-selection.md` + `design-conformance.md`) for *which
   claims warrant a visual* — **not** for picking a chart type (the prior cut owns that).
2. **One short generic small-newsroom sample article + its data** (we author it — typical local story, 2–3
   paragraphs, 1–2 CSV tables; NOT a real Annemasse article) → ② proposes **1–3** visual opportunities → each
   accepted proposal's `(data, intent)` runs the **unchanged** `suggest-chart` → `dw-chart` produces a real
   chart. **One end-to-end proof** (`e2e-proof.md`), like the prior cut's live e2e.
3. `eval/` — `scoreProposalSet` (pure, `bun:test`, reusing `validateChartSpec` for the data-shape probe) +
   **≥4 authored generic cases** (incl. one with a no-chart claim like the declined-comment quote, and one
   multi-table article) + `judge.md` + `run.md` + a `baseline-report.md` from one run.

**Scope OUT (deferred, explicitly):**

- **CADRAGE** — the intent questionnaire (guided vs direct mode). This cut hands `intent` straight to the
  prior cut; the CADRAGE refinement loop is a later cut.
- **Multi-article / scale** — one article, a handful of cases. No corpus-at-scale, no cross-article dedup.
- **The explicit two-pass `ClaimSet` artefact (approach c)** — only if the first baseline shows a *recall*
  problem distinct from judgment.
- **Maps / video proposals** — proposals are chart-only for now (the prior cut only produces charts). Map/video
  opportunities are out until those producer skills exist.
- **Layout / insertion** — `anchor` is advisory; no positioning in the article body.

**Success criteria:**

1. `suggest-article/SKILL.md` exists with the ANALYSE+PROPOSITION procedure; an agent following it turns one
   authored generic sample article+data into a valid `ProposalSet`.
2. `scoreProposalSet` is pure and unit-tested; reuses `validateChartSpec` for the data-shape probe (no chart-
   type / family logic — that stays in the prior cut).
3. ≥4 cases (incl. a no-chart claim + a multi-table article); `judge.md` with the four-axis schema.
4. One live e2e: an accepted proposal → `suggest-chart` → `dw-chart` → a real produced chart (`e2e-proof.md`).
5. One baseline run → `baseline-report.md` (deterministic pass rate + recall/precision + judge means), with
   the honesty caveat written in.
6. The prior cut's 8/8 eval and the 32 dw-chart tests stay green (this cut is purely additive upstream).
7. No tiers; credited; English; no Claude/Anthropic mention in artefacts.

## 6. Resolved decisions (folded into the design) + remaining open questions

### Resolved (this review)

- **R1 — Gold-standard ownership: WE author it, on generic samples.** Splash targets *all* small newsrooms;
  the grant's Annemasse pilot is a deliverable, **not** a design or validation dependency. We author both the
  sample articles and their gold marks ourselves, on **generic small-newsroom stories** (not Annemasse). Marks
  are **grounded in documented journalism best-practice** (the KB references), not personal taste. The
  self-referential nature (we mark, ② is judged vs our marks) is **explicitly accepted**; mitigation is in §4.5
  — best-practice-derived marks + the harness as a **relative-improvement instrument**, not absolute truth.
- **R2 — ② binds data↔claim itself** (not pre-paired). This matching is ②'s core value; `provenanceOk` keeps
  it honest. Folded into §2.2/§2.3.
- **R3 — No `family` / no chart type in the proposal.** Proposals carry `claim + data + intent` only; the prior
  cut decides everything chart-shaped. Removed from the proposal shape (§2.3) and the deterministic gate (§4.2).
- **R4 — Batch triage.** ② emits a `ProposalSet` the journalist reviews at once (better for "right dose").
- **R5 — Lenient thresholds first, tighten as the corpus grows** (`τr = 0.7`, `τp = 0.5` to start; §4.2).
- **R6 — `anchor` = `paragraphIndex` + verbatim `quote`, advisory** (the journalist places the visual; §2.3).
- **R7 — Soft ceiling on proposal count: the LLM-judge penalises over-proposing (`rightDose`)**, not a hard cap.
  `min/maxProposals` stay only as coarse deterministic guardrails.

### Still open (not blocking the first cut)

1. **CADRAGE coupling (later cut).** This cut hands `intent` straight to the prior cut with no refinement loop.
   When CADRAGE lands, does it sit between this cut and the prior cut (refine each proposal's intent before
   production), and does that change the proposal shape? Deferred, but the seam should be kept clean for it.
2. **Promotion to the explicit two-pass `ClaimSet` (approach c)** — only if the first baseline shows ② has a
   *recall* problem (misses claims) distinct from a *judgment* problem (finds them, chooses badly). Decide
   after reading the baseline, not before.

## 7. Self-review

- **Placeholders:** none — shapes are concrete, thresholds named as knobs with starting values, deferred
  items listed explicitly.
- **Contradictions:** checked against the architecture (vetoable PROPOSITION, no hard gate, validation on the
  produced visual, ② = host agent, no backend, no tiers) and the prior cut (reuses `validateChartSpec` for the
  data-shape probe, the agent-orchestrated runner, the `scoreSpec`+judge split, the change-the-skill-not-the-
  cases loop). The proposal deliberately carries **no** chart family/type — type-selection stays solely in the
  prior cut, so the two cuts don't overlap. No conflicts found.
- **Scope:** first cut is one authored generic sample article + ≥4 eval cases + one live e2e — proves the new
  loop without building CADRAGE, scale, maps/video, or layout. Consistent with slice-1 discipline. No
  Annemasse/pilot coupling in the design or the corpus.
- **Honesty:** the eval is **self-referential** (we author the marks); this is accepted explicitly in §4.5 with
  its mitigation (best-practice-grounded marks + relative-improvement instrument), not hidden.

## 8. Out of scope (this spec)

- Implementation (this is design only — human reviews before any code).
- CADRAGE intent questionnaire; multi-article scale; map/video proposals; in-body layout.
- Any change to the prior cut (`suggest-chart`) or `dw-chart` — this cut is purely additive upstream.
