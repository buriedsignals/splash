# T6 — Procedure-tuning Apertus for Splash (mlx-lm, 100% local) — START HERE

> Fresh-session startup memo. Everything verified live on 2026-07-15 (M2 Max, 32GB).
> Read the ledger `.superpowers/sdd/progress.md` + design spec `docs/superpowers/specs/2026-07-15-splash-apertus-sovereign-design.md` for full context.

## Where we are (proven live)

- **Foundation works**: `flue run splash` drives Splash on local Apertus 8B (Ollama), 100% local, $0.
  Wiring in `harness/flue/src/lib/provider.ts` + `src/agents/splash.ts`. Run the CLI under node 24
  (`~/.n/bin/node node_modules/@flue/cli/bin/flue.mjs run splash --input '{"message":"..."}'`), NOT bun
  (bun lacks `node:sqlite`) and NOT the system node v20 (Flue needs ≥22.18).
- **Turn 1 (cadrage) holds**: Apertus asks a good journalist gate question before producing.
- **Turn 2 is the gap to fix** (`output-proof-turn2-toolcall-gap.log`): Apertus does NOT tool-call — it
  NARRATES a fake shell run and HAND-WRITES a CDN Chart.js instead of invoking `execute-shell` to run the
  real `chart-native/scripts/produce.mjs`. THIS is what T6 must fix.

## Feasibility (confirmed — no rented GPU)

- mlx-lm 0.31.3 supports Apertus natively (`mlx_lm/models/apertus.py`, xielu handled).
- Ready 4-bit weights: `mlx-community/Apertus-8B-Instruct-2509-4bit` (~4.5GB, no convert).
- Assistant-masked loss = the native `--mask-prompt` flag.
- mlx-lm data loader recognizes `messages` + `tools` (ChatDataset) → it applies the Apertus tokenizer's
  chat template itself, so NO manual Apertus-template reformatting (simplifies the plan's T6 reformatter).

## Two tuning targets (from the captured base-failure)

1. **Emit real tool calls**, not prose narration ("I will now run…"). The gold assistant turns must contain
   actual `execute-shell` tool calls (in `messages`+`tools` form), and the successful producer output as a
   tool result.
2. **Never hand-author the visual** — only the real deterministic producer's output counts.

## Step 1 — Environment (already set up; recreate if gone)

```bash
cd <scratchpad-or-repo>/harness/flue/tuning
uv venv --python 3.12 mlxenv && source mlxenv/bin/activate
uv pip install mlx-lm      # 0.31.3+
```

## Step 2 — Capture gold trajectories (Claude teacher)

Teacher = the CURRENT Claude-Splash pipeline (it already runs well). Target ~14 clean slice-1 runs
(one article → one simple native chart, article-web), all gates played WELL. Hybrid:
- 4-5 authentic (Rémy plays journalist through cadrage/veto/a-b-c export).
- rest teacher-simulated, hand-corrected.

For EACH run, record the full turn sequence and convert to one JSONL line in mlx-lm **chat+tools** form:

```json
{"messages":[
  {"role":"system","content":"<the Splash verb-adapter / role instructions>"},
  {"role":"user","content":"<article + channel + ask>"},
  {"role":"assistant","content":"<cadrage gate question>"},
  {"role":"user","content":"<journalist gate answer>"},
  {"role":"assistant","content":"","tool_calls":[{"type":"function","function":{"name":"execute-shell","arguments":"{\"cmd\":\"cd /…/splash && bun skills/chart-native/scripts/produce.mjs bar <cfg> <outDir> static\"}"}}]},
  {"role":"tool","content":"<real producer stdout: wrote exports/…/static.png etc.>"},
  {"role":"assistant","content":"<delivery message referencing the REAL artifact>"}
],
 "tools":[{"type":"function","function":{"name":"execute-shell","description":"Run a shell command","parameters":{"type":"object","properties":{"cmd":{"type":"string"}},"required":["cmd"]}}}]}
```

Add ~12 **correction continuations** that specifically fix the base-failure: take a transcript where the
model narrated instead of calling, and replace that turn with the correct `tool_calls` turn.

Write to `harness/flue/tuning/data/train.jsonl` and `.../valid.jsonl` (≈90/10 split; mlx-lm reads a `--data`
DIR containing `train.jsonl` + `valid.jsonl`).

## Step 3 — Train the LoRA (local, M2 Max)

```bash
python -m mlx_lm lora \
  --model mlx-community/Apertus-8B-Instruct-2509-4bit \
  --train --data harness/flue/tuning/data \
  --fine-tune-type lora --mask-prompt \
  --num-layers 16 --batch-size 1 --iters 300 \
  --adapter-path harness/flue/tuning/adapters
```
(Start small: `--num-layers 8 --iters 100` for a first smoke run to prove the loop end-to-end before scaling.)

## Step 4 — Fuse + serve (unify on MLX; Ollama was only bootstrap)

```bash
python -m mlx_lm fuse \
  --model mlx-community/Apertus-8B-Instruct-2509-4bit \
  --adapter-path harness/flue/tuning/adapters \
  --save-path harness/flue/tuning/apertus-8b-splash-v1
python -m mlx_lm server --model harness/flue/tuning/apertus-8b-splash-v1 --port 8081
```

## Step 5 — Point Flue at the tuned server (one env swap)

```bash
export SPLASH_LOCAL_BASE_URL="http://127.0.0.1:8081/v1"
export SPLASH_FLUE_MODEL="local/apertus-8b-splash-v1"   # the served model id
~/.n/bin/node node_modules/@flue/cli/bin/flue.mjs run splash --input '{"message":"<same coffee test>"}'
```
`provider.ts` already reads `SPLASH_LOCAL_BASE_URL`; nothing else changes.

## Step 6 — Verify the gap is closed

Re-run the 2-turn coffee test. SUCCESS = turn 2 emits a REAL `execute-shell` tool call that runs
`produce.mjs`, and the delivery references the REAL produced artifact (no hand-written CDN chart).
If still narrating → add more correction continuations, retrain (v2). Loss curve + eval in
`harness/flue/tuning/adapters`.

## Notes / open

- MLX LoRA adapter is MLX-format; fuse → MLX model served by `mlx_lm.server` (OpenAI-compatible). Alt path:
  `mlx_lm fuse` then GGUF-convert for Ollama, but mlx_lm.server keeps one toolchain.
- Later: this same capture+train loop is what the model-pluggable harness (T4) + protocol adapter (T4b) will
  automate for the 4-way benchmark (T7). T4b is best designed against a real `flue run splash` transcript
  (which we now have — see the output-proof logs).
- Machine cleanup if abandoning: `rm -rf ~/.n` (node24), `ollama rm MichelRosselli/apertus:8b-instruct-2509-q4_k_m`, delete the venv.
