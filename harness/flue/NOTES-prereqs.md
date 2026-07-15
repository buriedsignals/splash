# Splash-on-Apertus — confirmed prerequisites (2026-07-15)

Facts confirmed during pre-flight, so later tasks don't re-guess them.

## Flue (the harness) — CONFIRMED public + permissive
- `@flue/runtime@1.0.0-beta.9`, `@flue/cli@1.0.0-beta.9` — published on npm.
- License: **Apache-2.0** (permissive → satisfies the spec-locked "MIT/runtime-agnostic" prerequisite).
- Maintainer: fredkschott (Fred K. Schott). Flue is a real public framework, not a private Buried Signals package.
- **Real API surface (verified against shipped `.d.mts`, not assumed):**
  - `defineAgent(fn)` returns an opaque `AgentDefinition` object (`{ __flueAgentDefinition: true, initialize(...) }`), NOT a callable factory.
  - Skill discovery: `discoverLocalSkills` scans **one level** under `<cwd>/.agents/skills/` for `<name>/SKILL.md`.
    → the store layout MUST be flat (`.agents/skills/<skill>/`), never nested under a project name.

## Apertus model — CONFIRMED available, v1.0 (start here, swap v1.5 later)
- Ollama (primary, slice 1): `MichelRosselli/apertus:8b-instruct-2509-q4_k_m`.
- GGUF (escape hatch): `bartowski/swiss-ai_Apertus-8B-Instruct-2509-GGUF`, Q4_K_M ≈ 5.06 GB, llama.cpp-compatible.
- `2509` = Sept 2025 = **v1.0** (not 1.5). Decision holds: develop on v1.0 now, env-swap v1.5 when it ships.
- Known weak spot (v1.0): instruction-following (IFEval 70B ≈ 44%) + limited tool-calling → procedure-tuning (T6) is central, not optional. v1.5 roadmap prioritizes tool-calling/agentic/reasoning.

## Serving decision (slice 1)
- **Ollama**, single resident slot (no delegation) → Tom's KV-cache unlock not needed yet.
- Raw llama.cpp kept as escape hatch (see `scripts/serve-apertus.sh`) for later slices needing serving control.

## OPEN — confirm at first live boot (the one unknown)
- How Flue's `local/...` provider resolves to the Ollama endpoint (`http://localhost:11434/v1`).
  Expected: an OpenAI-base-URL env (Spotlight uses `SPOTLIGHT_RLM_OPENAI_BASE_URL` for its RLM).
  Confirm the exact env var from `@flue/runtime` at boot; set `SPLASH_FLUE_MODEL=local/<apertus-tag>`.

## Repo layout
- `../splash-harness` present (QA rig, made model-pluggable in T4).
- Skills discovered: 8 (chart-native, dw-chart, map-dw, map-native, scrolly, splash, suggest-article, suggest-chart).
  `image-native` is an internal conformance library (no SKILL.md) — not a discoverable skill.
