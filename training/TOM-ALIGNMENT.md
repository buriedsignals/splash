# Aligning Splash's 12B harness with Tom's method

Research date: 2026-10-27. Read-only. Sources:

- `buriedsignals/fine-tuning` @ HEAD, last push **2026-07-10** (sparse clone in `scratchpad/tom-ref/ft/`).
- `buriedsignals/kit` `skills/fine-tuning*` (last push 2026-10-25; copies in `scratchpad/tom-ref/kit/`).
- `buriedsignals/spotlight` @ `6480d184` (2026-10-27) (sparse clone in `scratchpad/tom-ref/sp/`).
- Splash `feat-pi-harness`: `harness-pi/` and `training/`.

Notation: **[F]** means verified, with a citation. **[I]** means my inference. `ft:` is the fine-tuning repo, `sp:` the spotlight repo, `kit:` the kit repo, and `splash:` the `feat-pi-harness` worktree.

---

## 0. Headline findings

1. **[F] Tom's whole pipeline runs on Flue, but Spotlight has since moved to Pi.** The gold sampler drives `npx flue run spotlight` (`ft:scripts/sample_gold.py:132`). The dataset builder reads Flue's sqlite stream (`ft:scripts/build_dataset.py:101-113`). Spotlight's local harness is now Pi (`sp:harness/pi/README.md:1-19`, `sp:README.md:449-456`), and it has no shell. **[I]** So Tom's `build_dataset.py` cannot ingest a Pi session. Splash's `training/dataset/build_from_pi.py` is the closer match to what Spotlight runs today, and it should be kept. This is the biggest stale point in Tom's docs.
2. **[F] Splash has never done Tom's step 1.** The 31B gold runs are spend-gated and have never been run (`splash:harness-pi/eval/RESULTS.md:61-65`). Every Splash measurement so far is on the stock 12B, so the harness has not yet been proven against the teacher. That is the first thing to do.
3. **[F] Tom's v5 recipe is small and cheap.** It used 26 examples: 14 real gold trajectories, 6 v4 corrections and 6 v5 corrections. It ran Unsloth with response-only masking, LoRA r16, 3 epochs and seq 40,960, reached a masked loss of 0.751, and trained in 29 minutes on an A100-80GB (`ft:model-cards/tomvaillant/gemma4-12b-spotlight-orchestrator-v5.md`, "Training").
4. **[F] Tom's most effective fix was code, not more tuning.** v5 still could not land a large HTML edit. He did not train a v6: report construction became deterministic. The model writes structured JSON, and code validates and renders it (`ft:docs/tuning-12b.md:231-249`; `sp:scripts/finalize-report.py`, `sp:scripts/validate-report-draft.py:1-38`). This maps directly onto Splash's craft failures.
5. **[I] Possible masking bug on Tom's side.** Rémy's fixture shows that the Gemma 4 template renders a tool response inside the model turn (`splash:training/tests/fixtures/gemma4-rendered.txt`, line 7). Tom masks per turn, with `response_part="<|turn>model\n"` (`ft:scripts/gemma4-12b/train.py:63`). If that holds for the HF template too, Tom's mask supervises tool outputs. Splash's `mask.py` handles this case. Ask Tom.

---

## 1. Tom's pipeline, step by step, as implemented

### 1.1 The loop (the design layer)

**[F]** The loop in `ft:docs/README.md:31-41` has five steps:

1. Design the workflow as skills.
2. Host it in a runtime.
3. Generate procedural data by rejection-sampling the teacher through the full gated pipeline, playing the human at each gate.
4. Train, export and ship.
5. Validate the tuned model on the real harness, then iterate.

**[F]** The non-negotiable principles are in `ft:docs/README.md:43-54`:

- Discipline lives in the skill and the role definitions, never in the prompt.
- Gates are real on every path.
- Only real tools count. A mocked run is worthless as data.
- The teacher should be close, not maximal: a same-family model 2–3× the student's size. Frontier models are reserved for scoring.

### 1.2 Gold runs: how they are generated

**[F]** The script is `ft:scripts/sample_gold.py`. The teacher is `openrouter/google/gemma-4-31b-it`, sent through a local reasoning inject-proxy (lines 32-34).

- **Case bank.** `ft:spotlight-casebank.jsonl` is one JSON object per case, with fields `id`, `kind`, `browse_required`, `must_refuse`, `brief` and `expect` (anchors, for example `{"leader":[...],"domicile":[...]}`). It holds 5 investigations, 3 browse cases and 2 ethics cases (`ft:docs/procedural-training.md` §3).
- **Sampling.** The script runs k samples per case (default 4), 2 at a time (lines 266-273). Each run gets its own `FLUE_DB` (line 57).
- **Playing the human.** The first turn is the plain brief. After that the script resumes the same session with a fixed `GATE_APPROVAL` message until `pipeline_done()` holds: findings, fact-check, report-draft and a report all exist. The cap is `MAX_TURNS=10` and `TURN_TIMEOUT=3000s` (lines 39-43, 79-86, 183-202).
- **Validator bounce.** Before approving, the script runs `validate-fact-check.py` and `finalize-report.py`. On a failure it sends the failure text back as the next user turn, so it never approves past a failing validator (lines 89-126). In the code's own words, this is "exactly like a vigilant human at the gate would".
- **Infra retries.** "Connection error" and "Request was aborted" are retried up to 5 times by resuming the durable session. `DelegationDepth` is fatal (lines 45-51, 137-150).

### 1.3 Gold runs: how they are judged

**[F]** The gates are cheap and objective (`gates()`, `sample_gold.py:215-258`). A run passes only if all of these hold:

- the case is complete: findings and fact-check exist;
- `leader_ok` and `domicile_ok` hold, by substring match against the `expect` anchors;
- `has_sources`: the findings contain "http";
- `browse_escalated`, for browse cases;
- `validators_ok`;
- `synthesis_ok`: the report text states the answer.

An ethics case passes on a refusal string. **[F]** A run that "completes" with an empty synthesis is rejected, "otherwise the tune learns empty synthesis" (`ft:docs/procedural-training.md` §3).

### 1.4 Gold runs: how they are stored

**[F]** Passing runs are appended to `gold-manifest.jsonl` as `{case, sample, case_dir, reasons}` (`ft:gold-manifest.jsonl`, 5 lines; `sample_gold.py:292-297`). The trajectory itself stays in `harness/flue/data/gold-<slug>.db`.

### 1.5 Dataset format

**[F]** `ft:scripts/build_dataset.py` writes one row per gold run, covering the orchestrator conversation only: "subagents are in-process, not persisted" (lines 8-14). The row shape is `{"messages":[...], "tools":[...], "meta":{conv, role, n_assistant, n_tool}}` (lines 163-173):

- **system:** the real composed system prompt, pulled live from the harness. Absolute paths become `$SPOTLIGHT_ROOT` (lines 72-85).
- **assistant:** `{role, content, reasoning_content (capped at 400 chars), tool_calls:[{id, type:"function", function:{name, arguments: JSON string}}]}` (lines 130-148).
- **tool:** `{role:"tool", tool_call_id, name, content}`, with content capped per tool: activate_skill 120, write 120, read 400, grep 400, glob 250, bash 450, task 1200, edit 200. Content the model writes is capped at 800 (lines 55-59).
- **tools:** a fixed list of 8 function schemas (lines 32-44).
- **Size.** Real examples run 26–46k tokens, even with these caps (`ft:docs/tuning-12b.md:71-75, 142-143`).

**[F] Correction rows (v4 and v5).** `ft:scripts/author_v4.py` and `author_v5.py` extract the real failing 12B trajectory and cut context windows that end at each failure point (`window(e, start, end, final_turn)`). They scrub empty assistant turns and infra errors from the context (`clean()`), then append a corrected final turn authored by hand. A few windows keep the model's own good recovery as positives (`author_v5.py:1-30, 439-461, 494-515`).

**[F]** In the shipped file `training-data/spotlight-orchestrator-v5-additions.jsonl`, the rows have 3–34 messages. `meta.v5_window` names the lesson (for example `honest-status-not-false-completion` or `confidence-downgrade-edit-not-sed`), and every final assistant turn carries `reasoning_content`.

### 1.6 Training recipe

**[F]** From `ft:scripts/gemma4-12b/train.py`:

- **Base:** `unsloth/gemma-4-12b-it` (`Gemma4UnifiedForConditionalGeneration`).
- **Tooling:** Unsloth `FastModel`, `load_in_4bit=True` (QLoRA), TRL `SFTTrainer`. A uv `override-dependencies = ["transformers==5.13.0"]` forces a version newer than Unsloth's `<=5.5.0` pin (lines 1-6, 40-47; `ft:docs/tuning-12b.md:100-103`).
- **LoRA:** r=16, alpha=16, dropout 0, vision layers frozen, language, attention and MLP layers trained, `random_state=3407`.
- **SFT:** batch 1, gradient accumulation 4, 3 epochs, lr 2e-4, warmup_ratio 0.05, bf16, `max_seq_length=40960`, no saves during training (lines 56-61).
- **Masking:** `train_on_responses_only(instruction_part="<|turn>user\n", response_part="<|turn>model\n")` (line 63). TRL's `assistant_only_loss` fails because the Gemma 4 template has no `{% generation %}` tags (`ft:docs/tuning-12b.md:86-89, 140-141`).
- **Save:** save locally, check with `safe_open`, then upload separately to HF private with 3 retries (lines 68-87). This follows the rule against `push_to_hub` racing the save (`kit:skills/fine-tuning-train/SKILL.md` §5).

**[F] Loss history.** v1 used `full_text` loss and reached 3.00. v2 added masking and reached 0.79. v5 reached 0.751 (`ft:docs/tuning-12b.md:15-19`; v5 card).

### 1.7 Merge, GGUF and smoke gates

- **[F] Merge** (`ft:scripts/gemma4-12b/merge.py`). The merge method must match the training method: Unsloth `save_pretrained_merged(merged_16bit)`. Merging an Unsloth adapter with transformers+peft produced `<unused>` garbage (`tuning-12b.md:110-117`). A coherence generation runs before the merge and exits with code 2 if it finds `<unused>` (merge.py:44-57). **[F]** That check is not fatal if it throws an error (line 56-57). Splash's version is stricter.
- **[F] GGUF** (`ft:scripts/gemma4-12b/gguf.py`). It builds llama.cpp's `llama-quantize` CPU-only, runs `convert_hf_to_gguf.py` to f16, then quantizes to **Q4_K_M** only. It keeps the text weights only, with no mmproj and no imatrix (lines 7-11, 27-39, 66-74). The Q4_K_M output is 7,381,381,632 bytes (`tuning-12b.md:263-264`).
- **[F] Mandatory gates** (`kit:skills/fine-tuning/SKILL.md`, "Mandatory gates"):
  - `pod.py check`: local static checks, free.
  - `pod.py preflight`: a tiny-model pod, about $0.50.
  - `validate_gguf_pipeline.py preflight / postflight / card-check`.
- **[F] More lessons**:
  - Instantiate `SFTConfig` and `SFTTrainer` locally before paying for a pod.
  - A smoke run must cross every save path.
  - Heavy writes go to `/root`, never `/workspace` (`ft:LEARNINGS.md` §12; `tuning-12b.md:150-156`).

### 1.8 RunPod

- **[F] Training pods** (`ft:scripts/gemma4-12b/pod.py`). One fresh pod per job, image `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04`. GPU fallback order: A100-SXM4-80GB → A100 PCIe → H100 PCIe → H100 HBM3 → L40S → RTX 6000 Ada → A6000 (lines 48-57). The inner script ships as base64 over SSH. The pod is terminated in `finally` (lines 405-408).
- **[F] Cost data in the docs:**
  - A100 runs at about $1.89/h (`ft:LEARNINGS.md:418`; `kit:references/runpod.md:3`).
  - The 26B full pipeline cost about $7 (`LEARNINGS.md:445-455`).
  - The 12B iterations v1 → v2-fixed spent about $9.5 of a $10 cap, across 3 train/merge/gguf cycles and 4 preflights (`tuning-12b.md:30-31`).
  - The v5 training step took 29 minutes, about **$0.9** **[I]** at $1.89/h.
- **[F] Serving a model to evaluate it** (`ft:scripts/serve_pod.py`, `serve_setup.sh`). "12B Q4 + 64K KV fits easily in 24GB → cheap GPUs": RTX 4090, A5000, L4, A40, A6000. The setup builds llama.cpp with CUDA and serves with `--parallel 4 --ctx-size 131072 --no-cache-idle-slots --flash-attn on --cache-type-k/v q8_0 --reasoning-budget 400`. The harness tools stay local; only inference is remote (`ft:docs/prd-open-tier-harness.md`, Phase C). No price is documented for these GPUs.

### 1.9 Eval and release gates

- **[F] System gate.** "Invariant-9 E2E": one full real-harness run with real tools and real gates, ending with the deterministic validators passing. v5 passed it as "20.9 minutes active / 35.5 minutes wall … guarded recovery … a system-level pass, not a claim that the 12B runs without guardrails" (`ft:docs/tuning-12b.md:251-258`).
- **[F] Validation** (`ft:docs/procedural-training.md` §7). Validate on held-out cases and check tokens, TTFT and tok/s as well as artifact quality, not just "completed". A single good first turn proves nothing: v1's turn 1 looked 2.8× faster, then stalled (`tuning-12b.md:92-97`).
- **[F] Older bench, for knowledge and style tunes.** Blind A/B, with the tuned model winning at least 60% of non-tie prompts (`ft:eval/scoring.md`; `docs/gemma4-12b.md:240`). Tom did not use it for the orchestrator release.

### 1.10 Publishing

**[F]**

- Models go under `tomvaillant/`; datasets go under `buriedsignals/` (`ft:docs/tuning-12b.md:223-229`).
- v5 shipped as an adapter repo plus a GGUF repo. Merged intermediates and v1–v4 were deleted after postflight (`tuning-12b.md:260-268`).
- Model card template: `ft:docs/gemma4-12b.md:176-206`. Run `card-check` after upload.
- Never delete a repo that has external downloads without explicit per-repo approval (`ft:LEARNINGS.md` §10).

---

## 2. Lessons from LEARNINGS.md and docs that apply to Splash

| # | Lesson (verified) | Source | Splash status / relevance |
|---|---|---|---|
| L1 | **Turn 1 is not the test.** A good first turn hid a full-run stall. | `tuning-12b.md:92-97` | Splash already scores whole runs (`score.ts`). Keep that. |
| L2 | **Serving bugs look like model failures.** The "12B stalls at methodology" verdict came from llama-server's `--cache-idle-slots` save/restore on delegation. Fix: `--no-cache-idle-slots --parallel 2 --ctx-size 81920`. | `prd-open-tier-harness.md:325`; `local-serving-efficiency.md:22-33` | Splash serves `--parallel 1` with no concurrent workers (`serve/llama-server.sh`), so it is probably not affected **[I]**. Re-check before blaming the 12B. |
| L3 | **Unbounded reasoning eats `max_tokens`**, which returns empty content and leads to retry crawls. Use `--reasoning-budget 400`, matched to the 400-char reasoning cap in training data. | `local-serving-efficiency.md:48-67` | Splash serves budget 400 but runs sessions with `thinkingLevel:"off"` (`src/sessions.ts:60`). Gold data, student inference and the train-time cap must all use the same thinking setting. |
| L4 | **"Depth kills discipline, compaction restores it."** At ~40k context the 12B looped and replied empty; after compaction at ~13k it delegated correctly. | `tuning-12b.md:206-216` | **Splash folds far later.** Spotlight folds the 12B at **20,480** tokens and keeps 4,000 (`sp:harness/pi/README.md:67-72`). Splash compacts near 98,304 − 8,192 ≈ 90k and keeps 8,000 (`src/budget.ts:9`, `src/profiles.ts`). Strong candidate for the storyboard stalls. |
| L5 | **Empty-assistant mirroring.** Empty turns in context lead to more empty turns. Never train on empty turns; consider dropping them from the projection. | `tuning-12b.md:217-221` | `validate.py` already refuses empty turns. The harness projection does not drop them yet. |
| L6 | Never put discipline in the prompt; never strip gates for gold-gen; play the human. | `procedural-training.md` §4 | Splash's scripted journalist plays the human. Check that the teacher-run prompts carry no gold-only nudges. |
| L7 | **Validator bounce during gold-gen**, with the same failure text the 12B will see at inference. | `sample_gold.py:89-126` | Splash's craft loop already hands render refusals back in the same session (`driver.ts:406-432`). Keep the wording identical between teacher and student runs. |
| L8 | **Large structured edits are not trainable away; make them deterministic.** | `tuning-12b.md:231-249` | Applies to `beat.mjs` (see §3). |
| L9 | **Correction windows**: take the real failing context, add an authored corrected turn, and keep good recoveries as positives. | `author_v4.py`, `author_v5.py` | This is the "loop failures back" step. Splash has no tool for it yet. |
| L10 | Simulation scales data but needs masking, "else you train the model to hallucinate the simulated tool results". Real gold grounds; simulation drills continuation. | `tuning-12b.md:59-64, 198-200` | Splash's mask excludes tool responses, so simulated tool results would not be learned. |
| L11 | The merge method must match training; run a coherence gate before GGUF. | `tuning-12b.md:110-117, 135-136` | Already done (`training/train/merge.py`). |
| L12 | Gemma 4 markers are `<\|turn>user` / `<\|turn>model`; ollama 0.20.3 cannot load Gemma 4, so use llama-server. | `tuning-12b.md:131-139` | Splash measured the markers itself (`mask.py`). |
| L13 | RunPod hardening: SECURE cloud, balance preflight, `/root` for writes, persistent log, no auto-terminate on error, local `SFTConfig` instantiation, smoke crosses save paths. | `LEARNINGS.md` §12; `kit:references/runpod.md` | Splash's `pod.py` implements all of these. **Tom's own `gemma4-12b/pod.py` does not**: it uses `cloud_type="ALL"` and terminates in `finally` (lines 287, 405-408). |
| L14 | The teacher can drive what the student cannot. The 26B-A4B base drove the full pipeline zero-shot (`prd…:323`). A 12B with heavy guards became a "system-level pass" only with guarded recovery. | `tuning-12b.md:251-258` | Splash's bar is the same: a pass with code guards counts. |
| L15 | A skill description over the roster cap (1024 chars) silently drops the skill. Bodies stay thin; references load on demand. | `skill-orchestration…md:67-90` | Splash injects bodies and required reads per profile (`src/profiles.ts`). Check the craft prompt floor (`budget.ts`). |
| L16 | Fine-tuning teaches style, not recall, so URLs get hallucinated. Use retrieval at inference, not more data. | `LEARNINGS.md:116-128` | Same root as "invented row names": pass names in as data, do not expect the model to remember them. |

---

## 3. How Spotlight splits work across models, gates and checks, and what maps to Splash's craft step

### 3.1 What Spotlight does

- **[F] Second, smaller model: the RLM, Gemma 4 E4B.** This is the "4B" Tom means.
  - **Lead distillation.** Every `fetch` stores the raw page as `.raw`, sends it to the RLM, and returns only a short bullet list of leads (`rlm-leads.json`: max input 24k chars, `max_tokens 900`, temp 0). "The page itself never comes back to the agent" (`sp:harness/pi/README.md:110`). The measured effect is about 99%: 43k tokens down to 617 (`ft:local-serving-efficiency.md:41`).
  - **Compaction checkpoints.** The RLM writes the fold checkpoint, in five sections: Goal, Progress, Decisions, Next, Open gate (`sp:harness/pi/README.md:75`).
  - **Hybrid prefilter.** In `run_rlm`, deterministic extraction comes first and only the candidate lines go to the E4B. Recall rose from 0.75 to 1.0, decoy hits fell from 4 to 0, and it took 5.7s against 33s for the full corpus (`sp:docs/rlm-benchmark-audit.md`).
- **[F] Tier-dependent instruction density.** On the 12B tier, a skill loads the root plus exactly one `*-compact.md` reference of under 300 tokens (`sp:docs/technical-investigation.md:55-70`). On the 12B tier the agent also reads only the leads, and opens a `.raw` file only for a bounded passage found with `grep_files` (`harness/pi/README.md:110`).
- **[F] No shell; typed tools.** A tool refuses anything outside its schema (`README.md:80`).
- **[F] The model sends judgment calls; code fills the rest.**
  - `record_lead`: the model gives the source id, excerpt and summary; code fills ids, hashes and provenance. The D3 check requires the excerpt to be verbatim in a stored source with a matching sha256. A fact is kept only when its value is verbatim in the excerpt. A failing lead goes back once, then stays `unverifiable` (`README.md:58`).
  - `record_indicator_framework`: the model sends its judgments, and the harness fills ratings, quadrants and order (`README.md:118`).
  - `record_method_input`: the model names the table and columns; code accepts only an approved method on a verified lead (`README.md:59`).
- **[F] Checks at fixed points, run by code, never by the model.** After each worker, the launcher runs the validators for what that worker wrote and appends the result to its answer. `open_review` refuses to open a gate page while its validator fails (`README.md:122`).
- **[F] No gate decisions from the model.** The transition tool accepts only a short list of transitions; approvals come from the review page (`README.md:17`).
- **[F] Output cap and write safety.**
  - Output per request is a quarter of the context window, never below 8,192: "a fixed 8192 cut off whole-file rewrites" (`sp:harness/pi/src/config.ts:440-444`).
  - `write_file` refuses empty content over an existing non-empty file, "so a call cut off at the output cap cannot erase it" (`README.md:112`).
- **[F] Last-turn narrowing for stalls.** Near its budget, a lane gets one last turn that offers only `record_lead` and `record_absence` (`sp:harness/pi/src/lanes.ts:51-59, 428, 968`).
- **[F] Deterministic report.** The model writes `report-draft.json`, a bounded editorial plan whose `MAX_TEXT` limits and finding-id coverage are checked by `validate-report-draft.py`. Code renders the HTML (`finalize-report.py`).

### 3.2 Mapping to Splash's craft failures

| Splash failure (source) | Spotlight pattern | Concrete move for Splash |
|---|---|---|
| **Output-token limit on `write_file`.** The stock arm has `maxTokens: 3072` (`serve/models.json`; the teacher has 8192). The model also degenerated on `path` (`RESULTS.md:73-74`). | Output cap of max(8192, ctx/4); refuse an empty overwrite; shrink what the model writes. | **[I]** Raise the stock `maxTokens` to at least 8192 (Spotlight's rule gives about 24k on a 98k window). Keep the reasoning budget at 400. Refuse truncated or empty writes over `beat.mjs`. Better still, see the next row. |
| **The 12B cycles editing a 4 KB `beat.mjs`** (web choropleth, `RESULTS.md:101-117`). | v5 → `report-draft.json` plus a deterministic renderer. | **[I]** Make the craft output a **JSON spec**: gestures plus the few fields only the model can decide, emitted through a typed tool (`record_beat_spec`). Code writes `beat.mjs` from it, as `finalize-report.py` does. Rémy's own probe already shows the 12B composes an admissible gesture list in 1–3 attempts (`RESULTS.md:134-165`). |
| **Invented row names** (`RESULTS.md:181-184`, aggregates; "Belgiumm"). | `record_lead` D3 verbatim check, once-back-then-mark, `record_method_input`. | **[I]** Pass row and column names as **enums in the tool schema**, built from `data.json`. Refuse any name not in the data, with the closest real names in the refusal. After one failed retry, the code drops that gesture. Optional: llama.cpp JSON-schema or grammar-constrained decoding for the spec tool. Not in Tom's material; it is an extra idea. |
| **Inverted `check()` logic** (`RESULTS.md:322-324`). | Validators are code, run at fixed points; the model never writes a check. | **[I]** Remove `check()` from model-authored code. Code derives the check from the recorded claim and the gestures (the gesture core already validates notes, superlatives and gaps). |
| **Storyboard stalls**: "twelve turns of talk, `record_slot` never called" and menu loops (`RESULTS.md:237, 244, 295`). | Last turn offers only the record tools; fold the 12B at 20k; RLM checkpoint; typed transitions. | **[I]** (1) After N silent turns, narrow the tool list to `record_slot` and its siblings. Splash already nudges field by field (`52e59e8d2`); narrowing the tools is stronger. (2) Lower Splash's fold point toward 20k, keeping 4k, as Spotlight does for 12B. (3) Keep the gate decision in code. |
| **"Extra gate where the model does one thing"** (Tom's suggestion). | Spotlight's narrow roles: the analyst, with a narrowed read/write scope; a fact-checker isolated from research. | **[F]** Splash already has a separate designer review (`driver.ts` `reviewPhase`, `persona:designer` plus `review_facts`). **[I]** Split craft into: (a) a gesture gate (spec only); (b) a code render; (c) a design gate (look only, verdict plus one named fix). Each step is small enough to train separately. |
| **Small model for sub-tasks** (Tom's 4B suggestion). | E4B for distillation and checkpoints. | **[I]** In Splash, candidate E4B jobs are: writing compaction checkpoints; summarising `data.json` columns and value lists for the craft prompt; the scripted or real journalist classifier, which already runs on the local server. Ask Tom whether a second resident model is allowed in the product catalogue, given the one-tuned-model-per-product rule (memory `pi-harness-12b-constraint`). |

---

## 4. Splash `training/` compared with Tom's: keep, replace, delete

| Splash file | Tom's counterpart | Verdict |
|---|---|---|
| `dataset/build_from_pi.py` | `scripts/build_dataset.py` (Flue sqlite) | **Keep.** Tom's reads Flue, which Spotlight no longer runs. Splash's splits at compaction (one row per segment), which matches what the model actually saw after folding. Add, to match Tom: (a) per-tool result caps, (b) a reasoning cap of 400 if thinking gets enabled, (c) the composed system prompt as sent. |
| `dataset/mask.py` + `train/labels.py` | `train_on_responses_only` | **Keep yours.** It is more correct, if the fixture holds for the HF template. Your `train.py` checks the markers at runtime and refuses rows where a tool response leaks into supervised text (`train.py:35-36, 123-126`). Tell Tom. |
| `dataset/validate.py` | (none; Tom says "validate the JSONL shape") | Keep. Replace the 3-chars-per-token estimate with the real tokenizer count once the smoke run reports it (Tom counted tokens locally with `uv run --with transformers`, `tuning-12b.md:73-75`). |
| `train/train.py` | `gemma4-12b/train.py` | **Keep.** Same hyperparameters (r16/α16/dropout 0, 3 epochs, lr 2e-4, GA 4, seed 3407, 4-bit). Yours uses the TRL v5 names (`max_length`, `processing_class`) that the kit requires. Tom's still passes `max_seq_length`/`tokenizer=` (`ft:…/train.py:57-61`; `kit:fine-tuning-train` §"TRL v5 rename"). Difference: you use `FastVisionModel`, because rows carry renders. The kit warns that `FastVisionModel` with Unsloth's vision collator is broken for **text-only** data (`LEARNINGS.md:404`). You use your own collator and have image rows, but only the smoke run proves it. |
| `train/merge.py` | `gemma4-12b/merge.py` | Keep. Same method, and a stricter, fatal coherence check. |
| `train/export_gguf.sh` | `gemma4-12b/gguf.py` + 26B mmproj reuse | Keep. Tom's 12B GGUF is text-only. Splash needs the upstream `mmproj-BF16.gguf` for `look`, and that is valid because the vision tower stays frozen (`LEARNINGS.md:412`). |
| `pod/pod.py` | `gemma4-12b/pod.py` | **Keep yours.** It carries Tom's later hardening from `qwen3.6-27b/pod.py`, which his 12B launcher lacks. Consider adding H100 to `GPU_CANDIDATES` as a fallback (Tom's chain), still under the price ceiling. |
| `eval/teacher.ts` | `sample_gold.py` | Keep and extend. Add **k samples per story**. Add **objective gold gates** beyond `completed`: headline faithful, KTD11-style automatic checks, no repair, no fallback. Add the **validator bounce** with the student's exact wording. Fix the cost guard: `models.teacher.json` prices `cacheRead` at 0, and stock runs show about 1.0–1.7M cache-read tokens per run, so `sessionCost` may undercount if the provider bills them as input **[I]**. Price `cacheRead` at the input rate to be safe. |
| *(missing)* | `author_v4.py` / `author_v5.py` | **Add.** A window builder that takes a failing 12B session plus an index, cleans it, and appends a corrected final turn. The turn can come from the teacher re-run on that exact context (OpenRouter), or from Codex/Claude as Tom suggests. Rows are tagged `meta.correction`. |
| `heldout.json` | (Tom held out cases implicitly) | Keep. |
| *(missing)* | `serve_pod.py` / `serve_setup.sh` | **Add, or reuse Tom's**, to serve the tuned GGUF on a 24 GB RunPod GPU for the in-harness eval. Point `SPLASH_PORT` / `models.json` `baseUrl` at the pod. |

**Delete:** nothing is clearly dead. **[I]** `teacher-free` (`pi.ts:27`) was rate-limited with 429 all day (memory). Keep it only as a probe.

**Format mismatches to settle before any spend:**

1. **One row per run vs one row per compaction segment.** Tom's examples are 26–46k tokens with seq 40,960. Splash's segments depend on the fold point. If you fold at 20k as Spotlight does, rows become shorter and cheaper to train.
2. **Reasoning.** Tom trains `reasoning_content`, capped at 400. Splash drops thinking, and sessions run `thinkingLevel:"off"`. Pick one setting for teacher runs, student serving and data.
3. **Tool-result caps.** Tom caps per tool; Splash keeps results in full (masked). That is fine for the loss, but costs sequence length.
4. **Multimodal rows.** Splash only. Tom's v5 GGUF has no mmproj.
5. **Path token.** Tom uses `$SPOTLIGHT_ROOT`; Splash uses `/splash`. Both work. Keep yours consistent between training and the inference prompt.
6. **Publishing.** Tom uploads to HF under `tomvaillant/`; Splash uploads nothing. Ask where Splash's adapter and GGUF should live.

---

## 5. Recommended order, with about 50 € of RunPod and an OpenRouter budget

All costs are estimates. Gemma 4 31B on OpenRouter is **$0.20/M input, $0.40/M output**, checked live on 2026-10-27 via `GET /api/v1/models`. Measured stock 12B runs used 46–59k input, 6–17k output and 1.0–1.7M cache-read tokens. Priced at the 31B rate, a full run costs **$0.21–0.35** (computed from `~/.splash-harness/kept-runs`). Craft-only seeded runs cost $0.02–0.26. A100 runs at about $1.89/h per Tom's docs; Splash's price ceiling is $2.50/h.

1. **Free, before any spend.**
   - (a) Raise the stock `maxTokens` and lower the fold point toward 20k/4k. Re-measure the seeded set.
   - (b) Move `check()` into code and turn the gesture list into a typed spec tool with enums of row names.
   - (c) Fix the `cacheRead` price in `models.teacher.json`.

   Tom's rule is that harness fixes come before the teacher. These are the harness changes his patterns point to.
2. **Gold validation with the 31B on OpenRouter (Tom's step 1). About $3–6.**
   - Run each training story (not held out) with k=2. That is roughly 10–20 full runs at about $0.3 each.
   - Any 31B failure is a **harness bug**: fix it and re-run, as Tom says.
   - Stop when 7–10 runs pass the gold gates.
3. **Build and validate the dataset. Free.** Run `build_from_pi.py`, then `validate.py`, then a local `train.py --dry-run`-style survey. This needs the tokenizer locally, not a GPU. Also instantiate `SFTConfig` and `SFTTrainer` locally (Tom's §12 rule).
4. **RunPod smoke.** Worst case $4.9 under Splash's guard (1.5 h × $2.50 × 1.3); **[I]** a realistic $1.5–3. It exercises train, merge, coherence and GGUF, and sets `--seq-cap`.
5. **RunPod full train, merge and GGUF.** Worst case $19.5 under the guard (6 h); **[I]** realistic $2–4. Tom's v5 trained in 29 minutes, and a 12B merge plus GGUF took about 1 h more.
6. **Evaluate the tuned 12B in the harness on RunPod (Tom's step).** Serve the GGUF plus mmproj on a 24 GB pod (Tom's `serve_pod.py` list: 4090, A5000, L4, A40). Run the eval matrix locally against it, including the held-out stories, with `releaseDecision` (`score.ts`). **[I]** Budget about $1–3 for a few hours; the GPU price is not documented by Tom.
7. **Loop the failures back.** For each failure, build correction windows. The corrected turn comes from the 31B re-run on that context (cents) or from Codex/Claude. Retrain: about $3–5 per cycle. **[I]** 50 € is about $55, which covers the smoke, the first full run and 2–3 correction cycles, with margin for a pod lost to an error.
8. **Run three sessions, as Tom asks:** harness (steps 1–2, 7a), orchestrator (eval and scoring, steps 2, 6), tuning (steps 3–5, 7b). Each works on its own worktree.

---

## 6. Stale or missing in Tom's repos: questions for Tom

**Stale or contradictory (verified):**

- The fine-tuning repo was last pushed 2026-07-10, and its docs describe **Flue** (`docs/flue.md`, `sample_gold.py`, `build_dataset.py`). Spotlight runs on **Pi** now.
- `scripts/gemma4-12b/README.md` and `commands.md` are byte-identical copies of the 26B ones (both 3,806 / 4,579 bytes; they talk about the 26B, mmproj and Q6).
- `gemma4-12b/pod.py` lacks the SECURE-cloud, balance and keep-alive-on-error hardening that `kit:references/runpod.md` mandates.
- `docs/gemma4-12b.md` describes the older journalist knowledge-tune plan (687 examples, `buriedsignals/` names) and conflicts with `tuning-12b.md` (orchestrator, `tomvaillant/`).
- Which model ships where is inconsistent across documents:
  - kit `fine-tuning/SKILL.md` "Models currently in production" does not list the 12B v5;
  - `sp:docs/runtimes.md:354` says the operator model is the base 26B-A4B ("we evaluated a journalism fine-tune but the base outperformed it");
  - `sp:AGENTS.md:92-93` lists the Qwen fine-tunes;
  - `ft:tuning-12b.md:247-248` says "the installer points to v5".
- `tuning-12b.md` §TL;DR still says the 12B "doesn't drive the full gated pipeline". The PRD later says that verdict was confounded by a serving bug (`prd…:325`).
- `docs/README.md` points to `kit/fine-tuning` for "dataset tooling to format and validate", but the kit skill holds no such tool for agentic `{messages, tools}` rows.

**Questions to ask Tom:**

1. Is there a **Pi-session to SFT** converter on your side? If not, will you adopt Splash's `build_from_pi.py`, which splits at compaction segments?
2. **Masking.** On the HF Gemma 4 template, are tool responses rendered inside `<|turn>model`? If so, does `train_on_responses_only` supervise them in v5? Splash's measured fixture says they sit inside the model turn.
3. **Gold gates for Splash.** What counts as a "correct 31B pass" for your 7–10 threshold: any `done`, or `done` with no repair, no fallback and a faithful headline? Should the k samples per story be distinct?
4. **Thinking.** Should teacher runs, data and student serving use reasoning on (capped at 400, as in v5) or off (as Splash runs now)?
5. **Correction data.** For "OpenRouter or Codex" synthesis: do you want the teacher re-run on the failing context, or hand-authored turns as in `author_v4/v5`? And what share of correction rows to real gold rows (v5 was 12 to 14)?
6. **Second model.** Is a resident E4B helper (checkpoints, data summaries) allowed in Splash's product footprint, or only the 12B?
7. **Fold point.** Does the Spotlight 12B fold at 20,480/4,000 tokens carry over to Splash's craft sessions, which hold images?
8. **Publishing.** Should the adapter and GGUF go to `tomvaillant/` and the dataset to `buriedsignals/`, privately? Who owns the HF upload? (Splash's launcher uploads nothing by design.)
9. **Release gate.** Is Splash's `releaseDecision` (completions with a faithful headline, then gate refusals, a tie shipping stock) acceptable, or do you want an invariant-9-style single E2E?
10. **Base checkpoint.** Is it `unsloth/gemma-4-12b-it`, as in your `train.py`? And is the HF dataset for Splash expected to be multimodal, given your v5 GGUF ships without mmproj?
