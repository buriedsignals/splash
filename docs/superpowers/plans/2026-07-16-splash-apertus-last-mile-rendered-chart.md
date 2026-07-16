# Splash-on-Apertus — Last-Mile: a rendered chart through the Flue chain

> Coordinated plan for the final gap. Everything else is proven (see ledger + spec).
> Goal: `flue run splash` → Apertus (local, tuned) → a REAL `static.png` rendered by
> chart-native, end-to-end, no hand-holding of the mechanical flow.

## The core decision (why this differs from rounds 1–7)

7 rounds proved: fine-tuning an 8B for *reliable 4-phase agentic chaining* is delicate —
v6 (1× phase-3) under-fires produce; v7 (3×) over-fires and loops. Chasing the exact phase
balance is diminishing-returns.

**Reframe: split editorial-judgment (needs the model) from mechanical sequencing (make it
deterministic in the shim).** This aligns with Splash's whole "code guards, model only where
judgment is needed" philosophy.

- **Model does** (proven robust at v5/v6 level): phase-1 cadrage (understand article, ask a
  good question) + phase-2 emit ONE `write-file` tool call whose content is a config.
- **Shim does deterministically** (a state machine, no model-precision dependence): after the
  config is written → run produce.mjs → after produce → deliver. Paths pinned, config repaired.

This removes reliance on the fragile phase-3/phase-4 transitions entirely.

## Architecture

```
Flue ⇄ shim (OpenAI endpoint, state machine) ⇄ Apertus (mlx generate)

Turn A  user: article           → model: cadrage question            (state: ASKED)
Turn B  user: confirm           → model: write-file{config}          → shim emits `write` to Flue
        Flue writes config (real fs, sandbox: local)
        Flue re-calls shim      → shim IGNORES model, emits `bash` produce.mjs (state: PRODUCING)
        Flue runs produce.mjs (real chart-native) → real PRODUCE_RESULT / error
        Flue re-calls shim      → shim returns delivery citing static.png (state: DONE)
```

The shim keys its state off the conversation it receives (last tool result / tool-call history),
so it works within Flue's one-completion-at-a-time loop.

## Global Constraints
- Runtime Bun for produce; Python venv for the shim/mlx. English identifiers/commits. No vendor mention.
- Paths PINNED by the shim: `RUN_DIR=/tmp/splash-run`, `CFG=$RUN_DIR/config.json`. Real fs (sandbox: local()).
- The deterministic producer's REAL output is authoritative — the shim never fabricates a PRODUCE_RESULT.
- Model = v6 (balanced, cadrage+config solid) — NOT v7 (over-eager). Re-fuse v6 if needed.

---

### Task 1: Shim state machine — deterministic produce/deliver after config

**Files:** Modify `harness/flue/tuning/splash-shim.py`

**Steps:**
- [ ] Add a `flow_state(raw)` helper: inspect the incoming messages and return one of
  `ASK | WRITE | PRODUCE | DELIVER`:
  - no assistant tool_call yet, ≤1 user turn → `ASK` (let model cadrage)
  - user confirmed, no write done → `WRITE` (let model emit config)
  - last tool result is a write result (a `write`/`write-file` executed) → `PRODUCE` (shim emits produce, ignore model)
  - last tool result contains `PRODUCE_RESULT` or is a produce result → `DELIVER` (shim delivers, ignore model)
- [ ] In `do_POST`: compute state.
  - `ASK`/`WRITE`: call the model (generate), parse tool_calls / clean prose as today.
  - `PRODUCE`: do NOT call the model. Extract the chart `<type>` from the model's earlier
    write intent (or default `bar`); return a single `bash` tool_call:
    `cd $REPO && mkdir -p $RUN_DIR && bun skills/chart-native/scripts/produce.mjs <type> $CFG $RUN_DIR static`.
  - `DELIVER`: do NOT call the model. If the last tool result has a real `PRODUCE_RESULT`, return
    a delivery message citing `$RUN_DIR/static.png`. If it's a produce ERROR, return the error text
    (honest — no fake success) and stop.
- [ ] Keep: path pinning in `to_flue`, `sandbox: local()`, prose truncation, structure-preserving
  `prepare_messages` (system override + tool-name translation).
- [ ] **Test (unit):** feed `flow_state` synthetic message lists for each of the 4 states → asserts
  the right state. Run: `python -c "..."` prints PASS for all 4.

### Task 2: Config repair — guarantee produce.mjs accepts the model's config

**Files:** Modify `harness/flue/tuning/splash-shim.py` (in the `WRITE` path, before returning the write)

**Steps:**
- [ ] Add `repair_config(raw_content, chart_type)`: parse the model's JSON config; coerce it to the
  EXACT chart-native schema for the type. For `bar`: ensure top-level `title`, `source{name,url}`,
  `altInsight`, `unit`, `catField`, `valField`, `rows:[{<catField>,<valField>}]`. If the model used
  different row keys (e.g. `title`/`value`) or a nested structure, remap to `catField`/`valField`.
  Fall back to a minimal valid config built from any {label,number} pairs found.
- [ ] In the `WRITE` path: run `repair_config` on the model's write-file content before returning
  the `write` tool call, so the config on disk always satisfies produce.mjs.
- [ ] **Test:** feed 3 malformed configs (the real v6/v7 shapes seen in logs) → `repair_config`
  returns a config that `produce.mjs bar <cfg> /tmp/t static` renders without error (assert PRODUCE_RESULT).

### Task 3: Re-fuse v6 (balanced model) + serve via shim

**Files:** `harness/flue/tuning/` (adapters/fuse), no code

**Steps:**
- [ ] Confirm v6 adapters exist (or re-train v6 config: 820 ex, mask-prompt, lr 1e-4, 600 iters — the
  BALANCED one, NOT v7's 3× phase-3). Fuse → `apertus-8b-splash-v6`.
- [ ] `python splash-shim.py --model ./apertus-8b-splash-v6 --port 8090`.
- [ ] **Smoke:** direct probe — cadrage on a novel article emits a question; phase-2 emits write-file
  with a config. (Both already proven for v6.)

### Task 4: Full Flue e2e — a rendered chart

**Files:** none (verification)

**Steps:**
- [ ] `sandbox: local()` in `splash.ts` (done). Serve shim (Task 3).
- [ ] Turn 1: `flue run splash --input "{article + make chart}"` → expect cadrage question.
- [ ] Turn 2: `flue run splash --id <id> --input "{confirm}"` → shim state machine drives
  write → produce → deliver.
- [ ] **DoD:** `find /tmp/splash-run -name static.png -newermt "-2 minutes"` returns a real PNG,
  AND the Flue log shows `tool done write` + `tool done bash` + a delivery message, AND no loop
  (bash runs ONCE). Open the PNG to confirm it's the coffee bar chart.
- [ ] If produce errors: read the real error, fix `repair_config` (Task 2), re-run. Do NOT fake success.

## Self-review notes
- Removes the fragile phase-3/4 fine-tuning dependency (the root of rounds 6–7 pain) by making the
  mechanical flow deterministic in the shim — model only does cadrage + config.
- Honest: the real produce.mjs output is authoritative; a produce error surfaces, never faked.
- Uses v6 (balanced), not v7 (over-eager). If v6's cadrage/config aren't solid enough, that's the only
  place a small retrain is warranted — but both are already proven.
