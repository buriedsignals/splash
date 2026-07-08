# Tier 0 — quality gates design (floor + ceiling) — FOR SIGN-OFF

## Objective
A journalist gives an article → gets a correct, accessible, honest, publication-quality visual,
**reliably — regardless of how much the LLM host improvises.** Root finding (A1): the host bypasses ②'s
discipline in 4/5 sessions, so ②'s validators / provenance / guardrails never fire. We do **not** try to
force the host to invoke sub-skills (prose can't force an LLM). We enforce the discipline where the host
**cannot skip it** (code), and catch the semantic failures code can't with an automated render review
that **advises** the journalist (never dead-ends).

## Design principle (learned from E2)
The prose × `source.url` deadlock proved a rigid conformance gate can **block the honest path**. So every
gate here **GUIDES** — it surfaces a precise, fixable message or an auto-correction — and **never dead-ends**.
The render-review is *advisory*; the journalist is the editor.

## Layer 1 — Floor: deterministic spine gates (code the host cannot skip)
Extend the existing spine (`produce-all` / `gate-render` / `export-guard`). `produce-all` refuses a
proposal whose spec has not passed, each gate emitting a clear fix message:

1. **Validation gate (kills A2).** `produce-all` runs the producer's validator itself
   (`validateChartSpec` / `validateMapSpec` / `validateChoroplethConfig`) on every accepted spec — it does
   NOT trust the host to have run it. Fail → the proposal is blocked with the warnings surfaced.
2. **Provenance & source-honesty gate (kills A3 — the trust killer — and D3).** `source` must be consistent
   with `provenance`:
   - `table` → data came from a cited newsroom CSV; `source` may name it, but **no dataset attribution/URL
     that the input never provided** (blocks the fabricated "AIE …" case).
   - `prose` → `source` is the honest "Chiffres tels que rapportés dans cet article" (or the outlet the
     journalist supplies) AND Gate 2b actually fired (`confirmedTable` set). A prose proposal without a
     confirmed table → blocked.
   - **Graceful (fixes E2):** a URL-less honest prose source is ACCEPTED name-only — never require a URL for
     prose provenance.
3. **Language / number-format gate (kills D1).** Furniture language + number format match the detected
   article language; a FR deliverable with Anglo separators is flagged / auto-corrected.
4. **Proposal ↔ spec fidelity (kills C2).** The emphasis/highlight the journalist accepted at Gate 2 must be
   present in the produced spec.

## Layer 2 — Ceiling: automated render review (advises at Gate 3)
Before Gate 3, an LLM-judge reads the ACTUAL rendered visual (PNG / video frame) + the `(claim, data)` and
flags what code cannot see, then surfaces the concerns to the journalist:
- title matches the metric? (rate vs count/volume) — **C1**
- honest encoding? (mixed denominators, missing threshold line) — **C3**
- does a 2-value "chart" beat a sentence? — **C4**
- legible / accessible at a glance?
This also fixes **Gate 3 blind in the terminal (E3/E4)** — it forces the render to be surfaced and assessed.
**Advisory, never a hard block.**

## Governance (E1)
A journalist run **never edits `skills/` source.** The "feedback→système" convention is for DEV sessions
only. Hard rule in `atelier/SKILL.md` + (ideally) a guard.

## Rollout (prioritized for the objective — MIT release + Heidi pilot)
1. Provenance / source-honesty gate (A3) + graceful prose (E2) — the trust killer, first.
2. Validation gate (A2).
3. Render-review gate (C1/C3/C4 + E3).
4. Language/format (D1) + fidelity (C2).
5. Governance rule (E1) + Gate 2b ordering (A4).

Each: **failing test first → spine-level implementation → `bun run check` green → verified by re-running the
exact T-session that exposed the defect (now caught).**

## One open question for sign-off
Render-review gate: **mandatory** (always runs, ~1 judge call per production, advisory output) or opt-in for
higher-stakes pieces? **Reco: mandatory but lightweight** — the trust gain (catching a false title before a
newsroom ships it) outweighs one LLM call.
