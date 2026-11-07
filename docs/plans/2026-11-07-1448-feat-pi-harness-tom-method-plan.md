---
title: Pi Harness on Tom's Method - Plan
type: feat
date: 2026-11-07
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
supersedes: docs/plans/2026-10-27-2327-feat-pi-harness-tom-tuning-loop-plan.md
---

# Pi Harness on Tom's Method - Plan

## Goal Capsule

- **Objective:** Splash runs a story to a faithful delivery on the smallest local model the harness can carry, ambitiously Gemma 4 12B, through a harness Tom can launch from Engine and Osaurus.
- **Method (authority):** Tom's debrief `~/Downloads/REMI.md` (2026-11-05) and his voice message. Push OpenRouter as far as it goes, put as much as is smart into the harness, descend the model size step by step, and tune only what the harness provably cannot fix — narrow decisions first. Where this plan and Tom disagree, Tom wins; ask him rather than improvise.
- **Supersedes** the 2026-10-27 tuning-loop plan. Its done work stays: spend ledger (`eval/spend.ts`), gold tooling (`eval/teacher.ts`), held-out set (`training/heldout.json`), free harness fixes, G0 numbers. Its RunPod-first units (U5–U10, U12, U13) are dropped; the fixed LFM3-VL-2B student is dropped (the student is the ladder's result, T4).
- **Budget:** Tom's $75, mostly OpenRouter, one USD ledger. RunPod only for training (T6) and final small-model checks. Report at $37. A further ~500 € is to be discussed by Tom and Rémy; nothing above $75 without Rémy.
- **Stop conditions:** report at each gate in five lines; stop when a step would cross the budget; stop before any RunPod spend (T6) for Rémy's go; never push to `main` (`git push origin refs/heads/feat-pi-harness:refs/heads/feat-pi-harness`); never touch `skills/` or `shared/`; never act on the buriedsignals org.
- **Who finishes:** the session on `feat-pi-harness`. Rémy is ill: short reports, decisions pre-made where Tom's doc settles them.

## Key Technical Decisions (from Tom's doc)

- **K1 Runner = launch.** Measure in the conditions Tom will launch in: window 65,536; fold = window − output cap − one 30,000-character read − 4,096 (32,012 at 65,536); thinking off; no `tool_choice: required` without an `auto` fallback; tool lists stable within a session (Osaurus prefix cache). Every result is labelled by route (`openrouter`, `llama-server`, `osaurus`). (REMI §1, §6, §7 row 1, §9)
- **K2 Triage before code.** Every miss gets one owner — Harness, Helper or Tune — after replaying its exact state. Tune misses go to `harness-pi/TUNE.md`, helper misses to `harness-pi/HELPER.md`, with evidence; only Harness misses change code. (REMI §3)
- **K3 Harness fix procedure.** Read the failure's exact text; fail-first test on the live path (where Pi actually runs it, e.g. before schema validation); assert continuity to the next gate or an honest stop; smallest change, prefer removal; second-model read-only review, claims verified; run only the targeted tests. Full suite once before a merge. (REMI §3)
- **K4 Paperwork in code.** Ids, hashes, paths, counts, receipts and any field code can know are filled by code, never retyped by the model; every takeover keeps its feedback loop and rewrites every instruction describing the old step. (REMI §4)
- **K5 Bounds that end honestly.** A session stops after 16 turns with no first accepted record, 12 with no next record, or 6 refusals in a row; every cap ends in a state the journalist can act on; every failure form (refusal, tool error, child stderr, dropped input) is counted and reaches the model or the journalist. (REMI §2, §4, §7)
- **K6 Teacher = Gemma 4 26B-A4B on OpenRouter** (`google/gemma-4-26b-a4b-it`, free arm first, paid ~$0.10–0.15 per gold run, fp4 providers excluded); 31B only where the 26B fails a gate. (REMI §2, §8)
- **K7 Ladder, not a fixed student.** 26B (OpenRouter) → 12B (local llama-server, free; not on OpenRouter) → smaller only if the 12B passes. Screen each rung on short seeded legs of the hardest leg: writing the component and repairing a failed render. (REMI §2, §9)
- **K8 Helpers and decision models only on a measured miss.** Chart-type selection is the first candidate for a decision model (LFM3, `liquid/lfm-3-1.7b` on OpenRouter), only if the ladder shows the selection failing. (REMI §8, §9; voice message)
- **K9 Tune narrow, late.** Train only when `TUNE.md` holds misses the harness cannot fix; a narrow decision with clean labels before whole-agent behaviour; sealed test set from the start; bf16 LoRA via Unsloth r16/α16 on the model's real layers; prove the adapter is active; rescore after quantizing (MLX OptiQ). (REMI §8)

## Implementation Units

### T1. Runner aligned with the launch (free)

- **Goal:** our measurements describe what Tom's launch will do (K1, K5).
- **Files:** `harness-pi/src/budget.ts`, `harness-pi/src/sessions.ts`, `harness-pi/serve/models.json`, `harness-pi/serve/models.teacher.json`, `harness-pi/src/conversation.ts`, `harness-pi/eval/run-eval.ts`, tests beside them.
- **Approach:** window 65,536 and Tom's fold formula; stop bounds 16/12/6 with an honest stop message; every failure form counted, child stderr kept in a local log; route label written into each run report; check `.gitignore` covers a `node_modules` symlink (`node_modules` without the slash). Pi stays at the pinned 1.3.0 unless Tom says the launch pins 1.4.0 (ask).
- **Tests:** fold fires at 32,012 on a 65,536 window; a session with 6 refusals in a row ends with an actionable stop; a dropped child stderr is counted.
- **Gate G1a:** re-run the lean static matrix on the local 12B under the new window; report against G0 (10/14 static).

### T2. Replay scan and triage files (free)

- **Goal:** harvest the harness problems already recorded, at no cost (REMI §2 row 1, K2).
- **Files:** `harness-pi/eval/replay-scan.ts` (new), `harness-pi/TUNE.md`, `harness-pi/HELPER.md`, `harness-pi/eval/RESULTS.md`.
- **Approach:** scan every recorded call log under the eval run roots (phase 2, G0, U11): refusals repeated, loops nothing counted, schema refusals, dropped inputs, text contradicting code. Assign each an owner. Fix Harness items under K3, one commit each. Scripted-server tests for the launcher pattern (real Pi sessions against a scripted local server) are added where a fix needs one.
- **Gate G1:** five lines — problems found, owners, fixes landed, lean matrix after fixes.

### T3. One story through a static chart beat on the teacher (paid, ~$0.15)

- **Goal:** prove the harness end to end on a capable model and get the first gold run (REMI §9 step 3, K6).
- **Precondition:** Rémy confirms OpenRouter credits.
- **Files:** `harness-pi/serve/models.teacher.json` (26B entry), `harness-pi/eval/teacher.ts` (default model 26B), `harness-pi/eval/SPEND.md`.
- **Approach:** Lisboa static on the 26B, free arm first; gold gates (done, headline faithful, last render exit 0, no repair, no fallback). Every miss triaged (K2); paperwork the teacher retypes moves to code (K4, REMI §9 step 4). Then the five held-out stories and the lean matrix on the 26B, k=1, budget permitting.
- **Gate G2:** five lines — gold runs, cost, misses by owner, harness fixes.

### T4. Model ladder (free for the 12B)

- **Goal:** find the smallest model the harness carries (K7).
- **Approach:** seeded short legs on the hardest leg (component writing + render repair) and the held-out stories, k=3, local 12B on llama-server; every miss triaged; harness fixes re-measured on both 26B and 12B so a fix that over-constrains the bigger model is caught (REMI voice message: too much harness blocks the model). Smaller rungs (Gemma 4 E4B, LFM3) only if the 12B passes the held-out stories at least as often as the 26B's gold rate allows.
- **Gate G3:** five lines — pass rate per rung, where each fails, the proposed student.

### T5. Decision model for a measured narrow miss (only if T4 shows one)

- **Goal:** move a narrow judgment the student keeps missing (first candidate: chart-type selection) to a decision model (K8).
- **Approach:** labels from the teacher's gold choices; screen `liquid/lfm-3-1.7b` untuned on the sealed set; record in `HELPER.md`.

### T6. Tune (only if `TUNE.md` justifies it; RunPod, Rémy's go)

- **Goal:** fix by training what the harness and helpers cannot (K9).
- **Approach:** reuse `training/` (dataset, mask, pod guard) retargeted to the chosen student; gold runs + targeted synthesis rows validated with the real tools; narrow decision first; step eval only if tuning looks worthwhile; rescore after MLX OptiQ quantization.

### T7. Hand-off to Tom

- **Goal:** Tom can launch and test on Mac/Osaurus (REMI §9 last table).
- **Deliver:** full commit SHA, variables and key names, model repo + revision + hashes, memory by phase, native dependencies (`@resvg/resvg-js`, Chromium/Remotion under signed Bun), one command reproducing the result.

## Questions for Tom (sent by Rémy, not blocking T1–T2)

1. Windows: Osaurus is unproven there and Splash must run on Windows — which local runtime for Windows?
2. Launch: our harness runs Pi 1.3.0 in-process under Bun (measured, it works) — keep that behind your Node launcher, or one `pi --mode rpc` process per owner like Spotlight?
3. Pi pin: 1.4.0 like Spotlight?
4. He read `main`; the harness lives on `feat-pi-harness` (`harness-pi/`).

## Verification Contract

Each unit: targeted tests green, a fail-first test that goes red when its fix is removed, the gate report in `eval/RESULTS.md` labelled by route, the spend recorded in `eval/SPEND.md` before the next paid step.

## Definition of Done

T1–T4 gated and reported; T5/T6 either done or recorded as not needed with evidence; T7 handed to Tom.
