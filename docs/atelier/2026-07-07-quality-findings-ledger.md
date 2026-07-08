# Atelier — quality findings ledger (2026-07-07)

Consolidated from the end-to-end test campaign: inline de-risk runs, the 11-scenario routing/producer
workflow, the 5 manual journalist sessions (T1–T5), and the adversarial session audit. Each finding is
first-hand or independently verified. Grouped by ROOT CAUSE because the root dictates the fix order.

Severity: **H** blocks/ships-wrong-or-inaccessible · **M** real quality/correctness gap · **L** polish.
Status: `open` unless noted. Base = `main` @ 176d66d (tooltip-a11y + installer already merged; none of
these were fixed by that work — re-baselined).

---

## GROUP A — Orchestration: ② is bypassed at runtime (THE ROOT)

Almost every A/C/D finding below is a *symptom* of A1: the host improvises ②'s job instead of running it,
so ②'s validators, provenance discipline, and guardrails never fire.

| ID | Sev | Finding | Evidence | Fix direction | Verify |
|----|-----|---------|----------|---------------|--------|
| A1 | H | Host never invokes (nor reads) `suggest-article`/`suggest-chart` in 4/5 sessions; re-implements ANALYSE + routing + spec inline | 0 Skill calls T1/T2/T3/T5; only T4 invoked them (and only *after* Gate 2) | Move ②'s DETERMINISTIC discipline into the spine as code gates the host cannot skip (see design decision) | A source-less/invalid spec cannot reach produce |
| A2 | H | Phase 5a spec-validator skipped when the host hand-rolls | no `validateChartSpec` run before produce T1/T5 | Spine refuses an unvalidated spec (`validated` stamp) | produce fails on unvalidated spec |
| A3 | M | Source FABRICATED: invented "AIE — Émissions de CO₂ par habitant" + URL, tagged `table` so Gate 2b never fired | T1 slope-spec.json; article only *quotes* an IEA researcher | Provenance gate: no dataset attribution absent from the source; unattributed ⇒ prose + Gate 2b | source-less article can't ship an attribution |
| A4 | M | Gate 2b + Gate 2 collapsed into one question (order violated) | T5 #17 single AskUserQuestion | Enforce table-confirm as a discrete step | prose path shows a separate 2b confirmation |
| A5 | M | Gate-2 proposal shown before suggest-chart routing (host's guess) | T4 #21 vs suggest-chart @ #26 | Same as A1 | proposal reflects real routing |

## GROUP B — Producer engine bugs

| ID | Sev | Finding | Location | Fix direction | Verify |
|----|-----|---------|----------|---------------|--------|
| B1 | H | Highlighted bar's value label inherits the mark colour → 2.25:1 → hard produce fail | `BarChart.tsx:320` `fill={fill}` | → `COLORS.ink` (label carries value, mark carries hue) | produce a highlighted bar: snap-contrast passes, render-verify |
| B2 | H | `line` mapper collapses a wide multi-series CSV to the LAST column (silent data loss; title can contradict render) | `spec-to-config.ts` `line()` | Fail LOUD (throw → FALLBACK_TO_DW) on >1 numeric series, OR support multi-series line — **design sub-decision** | multi-series line spec → all series OR loud fallback, never silent |
| B3 | M | dw-chart has NO render-time contrast guard → ships sub-WCAG white value labels (3.87 on #D55E00, 3.42 on #009E73) | dw-chart produce path | Add a contrast guard (or force contrast-safe label colour) | subject-hue chart labels clear 4.5:1 or guard fails |
| B4 | M | dw-chart column/grouped print no on-mark value labels | T4 render | Enable value labels where the numbers ARE the story | render shows values on bars |

## GROUP C — Editorial / result correctness

| ID | Sev | Finding | Evidence | Fix direction | Verify |
|----|-----|---------|----------|---------------|--------|
| C1 | M | Title misrepresents the metric: rate-as-volume ("deux fois plus d'emballages"), rate-as-count ("cinq fois plus de jeunes au chômage") | T2, T3 renders | suggest-chart title-honesty guardrail: a rate title must not assert count/volume | title guard / KB rule + re-render |
| C2 | M | Delivered chart drops the highlight the accepted proposal promised (monochrome vs "extrêmes surlignés") | T3 #14 vs render | Proposal↔spec fidelity: accepted emphasis must reach the spec | highlighted extremes render |
| C3 | M | Misleading slope: two differently-denominated %s on one axis, meaningless crossover, no 50% threshold line | T5 render | Guard/guidance for mixed denominators; majority reference line | KB rule + render |
| C4 | M | no-chart discipline soft: a 2-value case that "reads as a sentence" was produced with a caveat | T4 | Tighten no-chart threshold | night-bus case returns no-chart (or a callout) |
| C5 | L | Slope drew a non-monotonic series (US peak 2000) as monotonic | T1 (disclosed) | Don't recommend a 2-pt slope when the middle reverses | guidance |

## GROUP D — i18n / conventions

| ID | Sev | Finding | Fix | Verify |
|----|-----|---------|-----|--------|
| D1 | M | Numbers not localized (FR shows "19.3", "1,900" not "19,3", "1 900") | Thread locale → DW chart locale + native `formatNumber` | FR chart shows FR separators |
| D2 | L | "Source:" not "Source :" (FR typography) hardcoded | Locale-aware furniture labels | FR shows "Source :" |
| D3 | L | Source label = CSV filename ("youth_unemployment.csv") | Never use filename as public source | honest source or prose label |

## GROUP E — Governance / DX

| ID | Sev | Finding | Fix | Verify |
|----|-----|---------|-----|--------|
| E1 | M | Atelier self-modifies ENGINE SOURCE during a journalist run (BarChart, SlopeChart); can go out-of-scope untested (T5 formatNumber-for-all-slopes) | A journalist run must NOT edit `skills/`; report/route instead. "feedback→système" belongs to DEV sessions | a journalist run never edits source |
| E2 | M | Prose provenance × chart-native `source.url` conformance = DEADLOCK | Allow a URL-less honest prose source (name-only) for prose provenance | prose path produces with "Chiffres cités dans l'article" |
| E3 | M | Gate 3 blind in a terminal — journalist can't see the render | Auto-open / emit a viewable path at Gate 3 | image surfaced at the gate |
| E4 | L | Gate 3 quality claimed from a mid-animation still, not the terminal frame | Render-verify the terminal frame | discipline |
| E5 | L | Failure surfaced as a raw Node stack trace (partly mitigated by the spine's error field) | Cleaner error surfacing | actionable message |

---

## Execution tiers

- **Tier 0 (design first — the root):** A1/A2/A3/A4/A5 + E1/E2 → one design: **push ②'s discipline into the deterministic spine as un-skippable code gates** (validator, provenance/source-honesty, language). Highest leverage; needs a decision then a plan.
- **Tier 1 (start now, independent, clear bugs):** B1, B2, B3, B4 — TDD + render-verify, parallel (disjoint files).
- **Tier 2 (needs Tier-0 shape):** C1, C2, D1, E2 — enforced by the spine gates.
- **Tier 3 (polish):** C3, C4, C5, D2, D3, E3, E4, E5.

Every fix: failing test first → fix → `bun run check` green → **render-verify the actual output** → per-fix review. Whole-branch adversarial review before merge. No vendor mention. English code/commits.
