# Hand-off — Splash on the Pi harness, local model (T7)

What Tom needs to launch and test it on a Mac. Every figure below was measured on the machine named; what was not
measured is said so.

## Version

- Branch `feat-pi-harness`, commit `94dd28683fcb7b634fa67b5ef2867356b0985bcb` or later (the harness lives in `harness-pi/`, not on `main`).
- Pi `@earendil-works/pi-coding-agent` and `@earendil-works/pi-ai` **1.3.0**, in-process under Bun **1.3.5**
  (`harness-pi/package.json`; `typebox` 1.3.27).
- Measured on Apple M2 Max, 32 GB, macOS 26.3.

## Model

| | |
|---|---|
| Repo | `unsloth/gemma-4-12b-it-GGUF` |
| Revision | `fc034cfff751157913579611efad8462ac1be606` |
| `gemma-4-12b-it-Q4_K_M.gguf` | 7,121,861,440 B, sha256 `0a270ec9fe6b34f4a0d33992b6135117b484ebc4766ab76b51d4ae8c457e4c42` |
| `mmproj-BF16.gguf` (vision, to look at renders) | 175,115,840 B, sha256 `2e269f906eb15169ee9ce880ea649bd6d42d4964c21f8ede10d0d0efc738bcbb` |

`bun harness-pi/serve/fetch-model.ts` downloads both at that revision and refuses a file whose sha256 differs.

Serving (`harness-pi/serve/llama-server.sh`): llama.cpp `llama-server` (measured with build 11669, `620d2225c`),
one 64k slot (`-c 65536 --parallel 1`), q8_0 KV cache, flash attention, `--reasoning-budget 400`, `--jinja`,
mmap+mlock, all layers on the GPU. Output cap 16,384 tokens, temperature 1, top_p 0.95 (`harness-pi/serve/models.json`).

**Route:** every result here is route `llama-server`. **Osaurus/MLX was not run.** `SPLASH_ROUTE=osaurus` only labels
results; the provider is OpenAI-compatible on `http://127.0.0.1:$SPLASH_PORT/v1`, so an Osaurus server on that port
with the same model id should drop in, but that is untested and the MLX quantization is not the GGUF above.

## Variables

| Name | Needed for | Default |
|---|---|---|
| `SPLASH_PORT` | the local server's port | 8090 |
| `MAPTILER_KEY` (aliases `MAPTILER_API_KEY`, `REMOTION_MAPTILER_KEY`, `VITE_MAPTILER_KEY`) | map beats only | — |
| `OPENROUTER_API_KEY` | teacher arms only (paid / free OpenRouter); not needed for the local model | — |
| `SPLASH_MODELS_DIR` | where the GGUF files live | `~/.splash-harness/models` |
| `SPLASH_ROUTE` | the route label written on results | `llama-server` |
| `SPLASH_GESTURE_FALLBACK=0` | measurement: judge the gesture kit alone, no per-type fallback | fallback on |
| `SPLASH_RUN_CAP_MIN` | measurement: minutes before a run counts as failed | none |
| `SPLASH_STOP_AFTER_CRAFT=1` | measurement: stop after the craft step | off |
| `SPLASH_GESTURES_STATIC=0`, `SPLASH_GESTURES_ALL=1` | switch the gesture kits off / force them on for the families measured off | on / off |
| `SPLASH_HARNESS_AGENT_DIR`, `SPLASH_SPEND_LEDGER` | Pi agent dir, spend ledger path | harness defaults |

## Native dependencies

- `llama-server` (Homebrew `llama.cpp`) on PATH.
- `@resvg/resvg-js` ^2.6.2 (root `package.json`): static renders, a native binary per platform.
- Web, video and scrolly formats: Remotion 4.0.507 and Chromium. `bun run chrome:install` installs the pinned
  Chrome for Testing; Remotion's compositor and Chromium run as children of a signed Bun.
- `bun install` at the checkout root and in `harness-pi/`.

## Memory by phase

Peak resident memory, sampled every 5 s over one 30-minute real-gwis run (12B, static), 2026-11-08:

| Phase | `llama-server` | the run's Bun | its child processes |
|---|---|---|---|
| intake, editor, storyboard | 18.3 GB | 38 MB | 127 MB |
| craft | 14.6 GB | 59 MB | 134 MB |

The model server is the whole cost: 7.1 GB of weights, mlocked, plus the 64k q8_0 cache and compute buffers;
the harness itself stays under 200 MB. Not measured: the render step (that run never wrote a beat that rendered),
and Chromium/Remotion for web, video and scrolly, which run only at render time. On a 32 GB Mac this leaves about
13 GB for the renderer and the rest of the machine.

## One command

```bash
# once
bun install && (cd harness-pi && bun install) && bun harness-pi/serve/fetch-model.ts
# terminal 1: the model
SPLASH_PORT=8091 bash harness-pi/serve/llama-server.sh
# terminal 2: one held-out story, scripted journalist, 12B, fallback off, 30 min cap (the G3 setting)
cd harness-pi && SPLASH_PORT=8091 SPLASH_GESTURE_FALLBACK=0 SPLASH_RUN_CAP_MIN=30 \
  bun eval/run-eval.ts --stories real-gwis-wildfire-counts --arm stock
```

A journalist at the keyboard instead: `bun harness-pi/src/cli.ts run --slug <story> --journalist human`. The run
root, logs and renders land in `~/.splash-harness/` (kept runs under `kept-runs/`).

## Where it stands

- G3 (`eval/RESULTS.md`): the 12B passed 4/15 held-out runs gold, 2/5 stories; the 26B 2/5 stories at k=1.
- Replaying every refusal since then, the misses were the harness's, not the model's: r8 now delivers (one
  refusal was wrong), real-gwis delivers gold after seven harness fix commits (`08ca68140` onward), each with a test that fails without it.
  None of this is re-measured at k=3 yet.
- `TUNE.md` holds no miss proved untunable by the harness; nothing was trained. $0 spent.

## Open questions for Tom

1. **Shortened headline.** The gate counts a headline as faithful only when the plate opens with the takeaway word
   for word. On long takeaways both sizes draw the storyboard's shorter form (r8: 204 characters → "Pedelec
   fatalities vs. non-motorized bicycles"; the 26B did the same in French). Does a shortened form, written in the
   storyboard, count as faithful?
2. Windows: Osaurus is unproven there and Splash must run on Windows. Which local runtime?
3. Launch: Pi 1.3.0 in-process under Bun (measured, works) behind your launcher, or one `pi --mode rpc` per owner
   like Spotlight?
4. Pi pin: move to 1.4.0 like Spotlight?
