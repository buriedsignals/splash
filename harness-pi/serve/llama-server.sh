#!/usr/bin/env bash
# Serve the local Splash model: one 96k slot (the driver sends one request at a time), q8_0 KV
# cache, a bounded reasoning budget, and the vision projector so renders can be looked at.
set -euo pipefail

MODELS_DIR="${SPLASH_MODELS_DIR:-$HOME/.splash-harness/models}"
MODEL="${SPLASH_MODEL:-$MODELS_DIR/gemma-4-12b-it/gemma-4-12b-it-Q4_K_M.gguf}"
MMPROJ="${SPLASH_MMPROJ:-$MODELS_DIR/gemma-4-12b-it/mmproj-BF16.gguf}"
CTX="${SPLASH_CTX:-98304}"
PORT="${SPLASH_PORT:-8090}"

for f in "$MODEL" "$MMPROJ"; do
  [[ -f "$f" ]] || { echo "missing model file: $f (run: bun harness-pi/serve/fetch-model.ts)" >&2; exit 1; }
done

exec llama-server \
  -m "$MODEL" \
  --mmproj "$MMPROJ" \
  -c "$CTX" \
  --parallel 1 \
  -ngl 999 \
  --load-mode mmap+mlock \
  -fa on \
  -ctk q8_0 -ctv q8_0 \
  --reasoning-budget "${SPLASH_REASONING_BUDGET:-400}" \
  --jinja \
  --host 127.0.0.1 \
  --port "$PORT"
