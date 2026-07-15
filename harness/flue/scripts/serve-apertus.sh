#!/usr/bin/env bash
set -euo pipefail

# Serve Apertus 8B locally for the Splash orchestrator (slice 1).
#
# DECISION (2026-07-15): Ollama is the primary path for slice 1 — single resident
# slot, no delegation, so Tom's KV-cache-on-delegation unlock is not needed yet.
# Raw llama.cpp is kept as an escape hatch (below) for when fine serving control
# (reasoning-budget, --no-cache-idle-slots) becomes necessary in later slices.
#
# The model is env-swappable so v1.0 -> v1.5 needs no code change (Global Constraint).

MODEL_TAG="${APERTUS_OLLAMA_TAG:-MichelRosselli/apertus:8b-instruct-2509-q4_k_m}"

# --- Primary: Ollama (OpenAI-compatible endpoint at http://localhost:11434/v1) ---
#
#   ollama pull "$MODEL_TAG"
#   ollama serve            # exposes /v1/chat/completions
#
# FLUE WIRING — TO CONFIRM AT FIRST LIVE BOOT (the one open integration detail):
#   Flue's `local/...` provider must point at Ollama's endpoint. Spotlight's harness
#   reads an OpenAI base URL from env (cf. SPOTLIGHT_RLM_OPENAI_BASE_URL in its roles.ts).
#   The Splash equivalent is expected to be an OpenAI-base-URL env — confirm the exact
#   var name from `@flue/runtime` at boot, then:
#       export OPENAI_BASE_URL="http://localhost:11434/v1"   # (name to verify)
#       export SPLASH_FLUE_MODEL="local/${MODEL_TAG##*/}"     # e.g. local/apertus:8b-...
#   Do NOT hardcode the model — SPLASH_FLUE_MODEL is the single swap point.

echo "Apertus serving for Splash (slice 1)"
echo "  1) ollama pull $MODEL_TAG"
echo "  2) ollama serve   # http://localhost:11434/v1"
echo "  3) confirm Flue local-provider base-URL env at first boot, then: flue run splash"
echo
echo "Escape hatch (raw llama.cpp, later slices needing serving control):"
echo "  GGUF: bartowski/swiss-ai_Apertus-8B-Instruct-2509-GGUF (Q4_K_M, ~5GB)"
echo "  llama-server --model <gguf> --port 8080 --ctx-size 32768 \\"
echo "    --cache-type-k q8_0 --cache-type-v q8_0 --flash-attn on \\"
echo "    --reasoning-budget 400 --no-cache-idle-slots --jinja"
