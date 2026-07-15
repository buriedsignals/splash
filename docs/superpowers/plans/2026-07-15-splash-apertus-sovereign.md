# Splash on Apertus — Sovereign Editorial Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Splash's editorial orchestration run 100% locally on Apertus (Swiss open model), driving the existing native chart pipeline end-to-end for one article → one simple native chart, gates enforced.

**Architecture:** Adopt Flue (Tom's TS agent harness on Pi) as Splash's runtime. A single orchestrator agent runs on a local Apertus 8B GGUF served by llama.cpp; Splash's 9 skills are discovered by name and loaded on-invoke; the skills' abstract verbs map to Flue's native tools via a verb-adapter; the existing deterministic guardrails (fail-hard) run unchanged as the correctness net; a Claude-taught, LoRA procedure-tuned Apertus holds the editorial gate discipline. The `splash-harness` QA rig is made model-pluggable to benchmark base vs tuned vs 70B vs Claude.

**Tech Stack:** Bun · TypeScript · `@flue/runtime` (beta) + `@flue/cli` · llama.cpp (Apertus 8B GGUF Q4_K_M) · LoRA SFT (rented GPU) · existing `chart-native` engine + `splash-harness`.

## Global Constraints

- Runtime **Bun** (never npm/node). Tests **bun:test**, TDD.
- Code, comments, identifiers, commits, branches: **English** (non-negotiable). Prose docs may be French.
- **No Claude/Anthropic mention** in published artifacts (commits, PRs, docs).
- **"100% local" = the MODEL only.** Remotion/Datawrapper/MapTiler stay as rendering tools. Sovereignty is a slider, not an absolute.
- **Model is env-swappable** via `SPLASH_FLUE_MODEL` — start on Apertus v1.0-Instruct 8B, swap v1.5 without harness changes. Never hardcode the model id.
- **The teacher (Claude) never ships.** It authors training data offline only; the delivered product runs 100% Apertus.
- **Success bar is semantic, not mechanical:** the benchmark measures whether *editorial judgment stays good* (judged at render), not whether the run passes (guardrails already guarantee that).
- Slice-1 scope only: `chart-native`, `article-web` channel, simple chart (bar/line). No map/video/scrolly/dw-chart, no RLM, no subagents, no SQLite tool index, no web-sovereignty swaps.
- All Flue code grounded in the real Spotlight source: `defineAgent`/`defineAgentProfile` from `@flue/runtime`, `local`/`sqlite` from `@flue/runtime/node`, `defineConfig` from `@flue/cli/config`, launcher via `flue run splash`.
- Deterministic scripts must run **cwd-independent** — always resolve `HARNESS_ROOT` absolutely (Tom's lesson: relative paths nest / fall back to `curl`).

---

## Phase A — Runnable harness (Apertus drives Splash, "functional but dumb")

### Task 0: Prerequisites & serving smoke test

Fold discovery + environment bring-up into one gated task. No production code — the deliverable is a confirmed environment and two recorded facts the later tasks depend on.

**Files:**
- Create: `harness/flue/NOTES-prereqs.md` (records the confirmed facts + exact versions/paths)
- Create: `harness/flue/scripts/serve-apertus.sh`

**Interfaces:**
- Produces: a running llama.cpp OpenAI-compatible endpoint at `http://127.0.0.1:8080`; the confirmed `APERTUS_GGUF` path; the confirmed Apertus chat/tool-call template name; a yes/no on Flue MIT + runtime-agnostic.

- [ ] **Step 1: Confirm Flue is MIT + runtime-agnostic (spec-locked prerequisite)**

Run:
```bash
bun x @flue/cli@latest --version 2>&1 | head -5
# inspect license of the installed runtime
cat node_modules/@flue/runtime/package.json 2>/dev/null | grep -i '"license"' || echo "not installed yet"
```
Expected: a version prints; license resolves to `MIT` (or a permissive OSI license). Record the exact license string + version in `NOTES-prereqs.md`. If NOT permissive, STOP and report — this contradicts a spec-locked decision (Flue must stay MIT/runtime-agnostic) and needs a human call with Tom.

- [ ] **Step 2: Fetch an Apertus 8B GGUF and confirm a tool-parser exists for llama.cpp**

Run:
```bash
# Locate an instruct GGUF (Q4_K_M). Prefer swiss-ai/* or a community GGUF mirror.
huggingface-cli download --help >/dev/null 2>&1 || echo "install: pipx install huggingface_hub[cli]"
# Record the resolved repo + file in NOTES; download to a stable path:
#   models/apertus-8b-instruct-Q4_K_M.gguf
```
Expected: a `~5 GB` GGUF file on disk. Record the exact HF repo id + filename + sha in `NOTES-prereqs.md`. Also record whether llama.cpp ships an Apertus tool-call parser (check `llama-server --help | grep -i tool`, and the HF "Apertus tool parser" discussion). If no parser exists yet, note it — Task 2's verb-adapter must then rely on plain-text tool protocol, not native function-calling.

- [ ] **Step 3: Write the serving launcher (Tom's flags, single resident slot)**

`harness/flue/scripts/serve-apertus.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

# Apertus 8B local serving for the Splash orchestrator (slice 1).
# Single resident slot — slice 1 has no delegation (no --parallel 2 needed).
# Model path & ctx are env-overridable so v1.0 -> v1.5 swaps need no code change.
MODEL="${APERTUS_GGUF:-models/apertus-8b-instruct-Q4_K_M.gguf}"
CTX="${SPLASH_LOCAL_CTX:-32768}"
PORT="${SPLASH_LLAMA_PORT:-8080}"
REASONING_BUDGET="${SPLASH_REASONING_BUDGET:-400}"

exec llama-server \
  --model "$MODEL" \
  --port "$PORT" \
  --ctx-size "$CTX" \
  --cache-type-k q8_0 --cache-type-v q8_0 \
  --flash-attn on \
  --reasoning-budget "$REASONING_BUDGET" \
  --no-cache-idle-slots \
  --jinja
```

- [ ] **Step 4: Boot it and verify a bounded completion (no empty-reply pathology)**

Run:
```bash
chmod +x harness/flue/scripts/serve-apertus.sh
APERTUS_GGUF=models/apertus-8b-instruct-Q4_K_M.gguf ./harness/flue/scripts/serve-apertus.sh &
sleep 20
curl -s http://127.0.0.1:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"local/apertus-8b","messages":[{"role":"user","content":"Reply with the single word: ready"}],"max_tokens":16}' \
  | tee /tmp/apertus-smoke.json
```
Expected: JSON with a non-empty `choices[0].message.content` (contains "ready"). A non-empty reply confirms `--reasoning-budget` is bounding thinking correctly. Record latency-to-first-token in `NOTES-prereqs.md` (baseline for the write-up).

- [ ] **Step 5: Commit**

```bash
git add harness/flue/scripts/serve-apertus.sh harness/flue/NOTES-prereqs.md
git commit -m "chore(harness): apertus serving launcher + confirmed prereqs (flue license, gguf, tool-parser)"
```

---

### Task 1: Flue scaffold — single Splash orchestrator agent

**Files:**
- Create: `harness/flue/package.json`
- Create: `harness/flue/flue.config.ts`
- Create: `harness/flue/src/db.ts`
- Create: `harness/flue/src/agents/splash.ts`
- Create: `harness/flue/tsconfig.json`
- Test: `harness/flue/tests/boot.test.ts`

**Interfaces:**
- Consumes: the running endpoint from Task 0 (`http://127.0.0.1:8080`).
- Produces: a bootable agent runnable as `flue run splash`; env contract `SPLASH_FLUE_MODEL` (default `local/apertus-8b`), `SPLASH_MODEL_TIER` (default `8b`); `default export` agent from `splash.ts`.

- [ ] **Step 1: Write the failing boot test**

`harness/flue/tests/boot.test.ts`:
```ts
import { test, expect } from 'bun:test';

test('splash agent module exports a default agent definition', async () => {
  const mod = await import('../src/agents/splash.ts');
  expect(mod.default).toBeDefined();
  expect(typeof mod.default).toBe('function'); // defineAgent returns a factory
});

test('model id comes from SPLASH_FLUE_MODEL and is never hardcoded', async () => {
  const src = await Bun.file(new URL('../src/agents/splash.ts', import.meta.url)).text();
  expect(src).toContain('SPLASH_FLUE_MODEL');
  expect(src).not.toMatch(/['"]local\/apertus-8b['"]\s*;/); // must be a default via ??, not a literal assignment
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd harness/flue && bun test tests/boot.test.ts`
Expected: FAIL — `Cannot find module '../src/agents/splash.ts'`.

- [ ] **Step 3: Write package.json + config + db + tsconfig**

`harness/flue/package.json`:
```json
{
  "name": "splash-flue-harness",
  "private": true,
  "type": "module",
  "dependencies": {
    "@flue/runtime": "latest",
    "@flue/cli": "latest"
  }
}
```

`harness/flue/flue.config.ts`:
```ts
import { defineConfig } from '@flue/cli/config';
export default defineConfig({ target: 'node' });
```

`harness/flue/src/db.ts`:
```ts
import { sqlite } from '@flue/runtime/node';
// Durable session stream: a run interrupted on a slow local model resumes from
// durable deltas rather than restarting. FLUE_DB isolates parallel sampling runs.
export default sqlite(process.env.FLUE_DB ?? './data/flue.db');
```

`harness/flue/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["bun"]
  }
}
```

- [ ] **Step 4: Write the single-orchestrator agent (modeled on Spotlight's spotlight.ts)**

`harness/flue/src/agents/splash.ts`:
```ts
import { defineAgent } from '@flue/runtime';
import { FLUE_VERB_ADAPTER } from '../lib/roles.ts'; // Task 2 provides this

// Local/cloud tier model. llama-server serves the Apertus GGUF as `local/…`.
// Swap to 70B or v1.5 via env — never hardcode (Global Constraints).
const MODEL = process.env.SPLASH_FLUE_MODEL ?? 'local/apertus-8b';
const TIER = process.env.SPLASH_MODEL_TIER ?? '8b';

// Slice 1 is a short linear pipeline (analyse → cadrage → proposition → produce →
// export). It rarely hits the context threshold, so no aggressive compaction and NO
// delegation subagents (single orchestrator). Both are deliberate simplifications
// vs Spotlight — see the design spec's "simpler than Spotlight" table.
export default defineAgent(() => ({
  name: 'splash',
  model: MODEL,
  instructions: FLUE_VERB_ADAPTER, // Task 2 fills the full body
}));

export { MODEL, TIER };
```

Add `harness/flue/src/lib/roles.ts` with a minimal placeholder export so the module resolves (Task 2 replaces the body):
```ts
export const FLUE_VERB_ADAPTER = '## Runtime adapter (Flue) — placeholder, filled in Task 2';
```

- [ ] **Step 5: Run the boot test, verify it passes**

Run: `cd harness/flue && bun install && bun test tests/boot.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: End-to-end boot against Apertus**

Run (serving from Task 0 still up):
```bash
cd harness/flue && SPLASH_FLUE_MODEL=local/apertus-8b bun x flue run splash --input "Say hello in one word." 2>&1 | tail -20
```
Expected: the agent boots on Flue, calls the local endpoint, prints a one-word reply. Record any adapter/tool errors — they scope Task 2.

- [ ] **Step 7: Commit**

```bash
git add harness/flue/
git commit -m "feat(harness): flue scaffold with single splash orchestrator agent (env-swappable model)"
```

---

### Task 2: Verb-adapter — map Splash skills' abstract verbs to Flue tools

**Files:**
- Modify: `harness/flue/src/lib/roles.ts` (replace placeholder)
- Test: `harness/flue/tests/roles.test.ts`

**Interfaces:**
- Consumes: nothing (pure string/path logic).
- Produces: `FLUE_VERB_ADAPTER: string` (consumed by `splash.ts`), `HARNESS_ROOT: string` (absolute repo root), `roleBody(name: string): string`.

- [ ] **Step 1: Write the failing test**

`harness/flue/tests/roles.test.ts`:
```ts
import { test, expect } from 'bun:test';
import { isAbsolute } from 'node:path';
import { FLUE_VERB_ADAPTER, HARNESS_ROOT } from '../src/lib/roles.ts';

test('HARNESS_ROOT is absolute (cwd-independent script execution)', () => {
  expect(isAbsolute(HARNESS_ROOT)).toBe(true);
});

test('adapter maps every abstract verb the splash skills use', () => {
  for (const verb of ['execute-shell', 'read-file', 'write-file', 'invoke-skill']) {
    expect(FLUE_VERB_ADAPTER).toContain(verb);
  }
});

test('adapter injects the absolute harness root so produce.mjs runs cwd-independent', () => {
  expect(FLUE_VERB_ADAPTER).toContain(HARNESS_ROOT);
  expect(FLUE_VERB_ADAPTER).toContain('produce.mjs');
});

test('slice 1 has no delegation — adapter must NOT expose spawn-agent/task', () => {
  expect(FLUE_VERB_ADAPTER).not.toContain('spawn-agent');
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd harness/flue && bun test tests/roles.test.ts`
Expected: FAIL — `HARNESS_ROOT` not exported / placeholder lacks the verbs.

- [ ] **Step 3: Implement roles.ts (modeled on Spotlight's roles.ts, trimmed to slice 1)**

`harness/flue/src/lib/roles.ts`:
```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// harness/flue/src/lib -> repo root is four up. Resolved from the source file
// (absolute) so it holds regardless of `flue run` cwd, in dev and installed.
const SELF_DIR = dirname(fileURLToPath(import.meta.url));
export const HARNESS_ROOT = resolve(SELF_DIR, '../../../..');
const SKILLS_DIR = resolve(HARNESS_ROOT, 'skills');

/** Load a skill/role body (frontmatter stripped) as agent instructions. */
export function roleBody(name: string): string {
  const raw = readFileSync(resolve(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

// Maps the skills' abstract verbs to Flue's native tools so the SAME skills run
// here without rewriting. NO spawn-agent: slice 1 is single-orchestrator, and an
// undisciplined 8B that self-delegates would recurse task->task and hard-fail.
export const FLUE_VERB_ADAPTER = `## Runtime adapter (Flue) — abstract verbs → your tools

Your **harness root** is \`${HARNESS_ROOT}\` — the \`skills/\` engines, \`exports/\`, and
case files all live there. One hard rule (breaking it silently fails the run):
- **Use ABSOLUTE paths for every artifact.** Wherever a skill references a script or
  output dir, substitute the absolute path under \`${HARNESS_ROOT}\`. Never use a bare
  relative path — your cwd may differ from the repo root and relative paths break.

Execute the skills' verbs as:
- **execute-shell(cmd)** → your \`bash\` tool. Run the native producer as
  \`cd ${HARNESS_ROOT} && bun skills/chart-native/scripts/produce.mjs <type> <config> <outDir> <format>\`.
- **read-file / write-file / edit-file / list-files / grep-files** → your \`read\` / \`write\` / \`edit\` / \`glob\` / \`grep\` tools.
- **invoke-skill(id)** → the skill of that name is already discoverable from \`skills/\`; follow its instructions (body loads on invoke).

You are a SINGLE orchestrator. You have **no subagents** — never "spawn-agent", never delegate.
You own the human gates (cadrage, format veto, a/b/c export choice): pause for the journalist at each.`;
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd harness/flue && bun test tests/roles.test.ts`
Expected: PASS (all four).

- [ ] **Step 5: Integration check — produce.mjs runs cwd-independent through the adapter**

Run (from an unrelated cwd, proving absolute-path resolution):
```bash
cd /tmp && bun "$OLDPWD/harness/flue/scripts/echo-harness-root.ts" 2>/dev/null || true
cd "$OLDPWD/harness/flue" && bun -e "import {HARNESS_ROOT} from './src/lib/roles.ts'; console.log(require('fs').existsSync(HARNESS_ROOT+'/skills/chart-native/scripts/produce.mjs'))"
```
Expected: prints `true` — the adapter resolves the real producer path regardless of cwd.

- [ ] **Step 6: Commit**

```bash
git add harness/flue/src/lib/roles.ts harness/flue/tests/roles.test.ts
git commit -m "feat(harness): verb-adapter mapping splash skills to flue tools (cwd-independent, no delegation)"
```

---

### Task 3: Dynamic skill loading — discover by name, load body on-invoke

**Files:**
- Create: `harness/flue/.agents/skills/` (symlink or copy strategy documented)
- Create: `harness/flue/scripts/link-skills.sh`
- Test: `harness/flue/tests/skill-loading.test.ts`

**Interfaces:**
- Consumes: `HARNESS_ROOT` (Task 2), the 9 skill dirs under `skills/`.
- Produces: a `.agents/skills/splash` store Flue discovers; a measured "context floor" assertion (skill bodies NOT preloaded).

- [ ] **Step 1: Write the skill-linking script**

`harness/flue/scripts/link-skills.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
# Expose Splash's skills to Flue's workspace store. Discovered by name+description;
# bodies load on invoke (Flue D1/D2). Symlink keeps a single source of truth.
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STORE="$ROOT/harness/flue/.agents/skills/splash"
mkdir -p "$STORE"
for skill in chart-native dw-chart image-native map-dw map-native scrolly splash suggest-article suggest-chart; do
  ln -sfn "$ROOT/skills/$skill" "$STORE/$skill"
done
echo "linked $(ls "$STORE" | wc -l | tr -d ' ') skills into $STORE"
```

- [ ] **Step 2: Write the failing test**

`harness/flue/tests/skill-loading.test.ts`:
```ts
import { test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const STORE = resolve(import.meta.dir, '../.agents/skills/splash');

test('all 9 splash skills are discoverable in the workspace store', () => {
  for (const s of ['chart-native','dw-chart','image-native','map-dw','map-native','scrolly','splash','suggest-article','suggest-chart']) {
    expect(existsSync(resolve(STORE, s, 'SKILL.md'))).toBe(true);
  }
});

test('context floor: skill BODIES are not concatenated into the agent instructions', async () => {
  // The agent instructions carry the verb-adapter only, not skill bodies.
  const { FLUE_VERB_ADAPTER } = await import('../src/lib/roles.ts');
  // A skill body sentinel (a heading only present inside a SKILL.md) must be absent.
  expect(FLUE_VERB_ADAPTER).not.toContain('## When to use');
  expect(FLUE_VERB_ADAPTER.length).toBeLessThan(4000); // ~<1k tokens, not 55k
});
```

- [ ] **Step 3: Run link script + test, verify skill store present and floor small**

Run:
```bash
chmod +x harness/flue/scripts/link-skills.sh && ./harness/flue/scripts/link-skills.sh
cd harness/flue && bun test tests/skill-loading.test.ts
```
Expected: PASS — 9 skills discoverable; adapter stays small (context floor low, bodies on-invoke).

- [ ] **Step 4: Live check — agent names a skill without its body preloaded**

Run:
```bash
cd harness/flue && ./scripts/link-skills.sh && \
  bun x flue run splash --input "List the names of the skills available to you. Do not load their bodies." 2>&1 | tail -20
```
Expected: names appear (chart-native, suggest-chart, …); the run does not blow context at startup.

- [ ] **Step 5: Commit**

```bash
git add harness/flue/scripts/link-skills.sh harness/flue/tests/skill-loading.test.ts
git commit -m "feat(harness): dynamic skill discovery (9 skills, bodies on-invoke, small context floor)"
```

---

## Phase B — Measure the base (before any tuning)

### Task 4: Make splash-harness model-pluggable + baseline the Apertus base

**Files:**
- Modify: `../splash-harness` driver (the module that spawns `claude`) — exact path resolved in-repo
- Create: `../splash-harness/runners/apertus-flue.mjs`
- Test: `../splash-harness/tests/runner-selection.test.mjs`

**Interfaces:**
- Consumes: the bootable `flue run splash` (Tasks 1-3), the existing harness rubric.
- Produces: a `--runner apertus-flue` option; a scored slice-1 result object `{ delivered, gatesHeld, editorialScore, transcriptPath }`.

- [ ] **Step 1: Locate the current runner and write the failing selection test**

Run first: `grep -rn "spawn" ../splash-harness --include='*.mjs' | grep -i claude | head`
Then `../splash-harness/tests/runner-selection.test.mjs`:
```js
import { test, expect } from 'bun:test';
import { selectRunner } from '../src/runner.mjs';

test('apertus-flue runner is selectable and drives flue run splash', () => {
  const r = selectRunner('apertus-flue');
  expect(r.name).toBe('apertus-flue');
  expect(r.command).toContain('flue');
  expect(r.command).toContain('splash');
});

test('claude remains the default runner (ceiling benchmark)', () => {
  expect(selectRunner(undefined).name).toBe('claude');
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd ../splash-harness && bun test tests/runner-selection.test.mjs`
Expected: FAIL — `selectRunner` / `apertus-flue` runner missing.

- [ ] **Step 3: Implement the runner + selector**

`../splash-harness/runners/apertus-flue.mjs`:
```js
// Drives the Splash orchestrator on Flue+Apertus instead of spawning `claude`.
// The harness treats it identically: feed the article, capture the transcript,
// score the delivered artifact with the SAME rubric used for Claude.
export const apertusFlueRunner = {
  name: 'apertus-flue',
  command: ['bun', 'x', 'flue', 'run', 'splash'],
  env: {
    SPLASH_FLUE_MODEL: process.env.SPLASH_FLUE_MODEL ?? 'local/apertus-8b',
    SPLASH_MODEL_TIER: process.env.SPLASH_MODEL_TIER ?? '8b',
  },
};
```
Wire `selectRunner(name)` in `../splash-harness/src/runner.mjs` to return `apertusFlueRunner` for `'apertus-flue'` and the existing claude runner otherwise (default `'claude'`).

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd ../splash-harness && bun test tests/runner-selection.test.mjs`
Expected: PASS (both).

- [ ] **Step 5: Baseline run — Apertus BASE on one slice-1 case**

Run (serving up, harness pointed at a simple bar/line article-web case):
```bash
cd ../splash-harness && bun run harness --runner apertus-flue --case slice1-native-bar --concurrency 1 2>&1 | tee /tmp/apertus-base.log
```
Expected: a scored result. **The point is to observe WHERE it breaks** — gate skipped, format improvised, loop/stall. Record every failure class in `harness/flue/NOTES-prereqs.md` under "base failures" — these become Task 6's correction continuations.

- [ ] **Step 6: Commit**

```bash
cd ../splash-harness && git add runners/apertus-flue.mjs src/runner.mjs tests/runner-selection.test.mjs
git commit -m "feat(harness): model-pluggable runner + apertus-flue baseline driver"
```

---

### Task 5: Prove the deterministic guardrails still fire under Apertus (integration, zero new product code)

**Files:**
- Test: `harness/flue/tests/guardrails-under-apertus.test.ts`

**Interfaces:**
- Consumes: the base run transcript from Task 4; the existing validators (`isFormatAllowed`, `assertDelivered`).
- Produces: proof that safe-degradation holds — a bad model decision is caught by fail-hard code, never delivered.

- [ ] **Step 1: Write the failing test (inject a bad format decision, expect fail-hard)**

`harness/flue/tests/guardrails-under-apertus.test.ts`:
```ts
import { test, expect } from 'bun:test';
import { resolve } from 'node:path';
import { HARNESS_ROOT } from '../src/lib/roles.ts';

// Import the REAL existing validator the producers already run.
const { isFormatAllowed } = await import(resolve(HARNESS_ROOT, 'skills/splash/src/channel.ts'));

test('a disallowed channel×format decision is rejected fail-hard regardless of which model proposed it', () => {
  // social-vertical must never be interactive (existing rule). If Apertus proposes it, the code stops it.
  expect(isFormatAllowed('social-vertical', 'interactive')).toBe(false);
  expect(isFormatAllowed('article-web', 'static')).toBe(true);
});
```
(Confirm the exact exported symbol/name with `grep -n "isFormatAllowed" skills/splash/src/channel.ts` first; adjust the import to the real signature.)

- [ ] **Step 2: Run it, verify it passes against the real validator**

Run: `cd harness/flue && bun test tests/guardrails-under-apertus.test.ts`
Expected: PASS — proves the model-agnostic net is reachable from the harness. If the import path/symbol differs, fix to the real one (this is the "confirm, don't guess" step).

- [ ] **Step 3: Commit**

```bash
git add harness/flue/tests/guardrails-under-apertus.test.ts
git commit -m "test(harness): prove deterministic guardrails gate apertus-driven decisions (safe degradation)"
```

---

## Phase C — Procedure-tuning (the risk-bearing unit)

### Task 6: Gold-trajectory capture + Apertus-format reformatter + LoRA tune

This is ML-ops, not unit-TDD. The one pure-code unit — the transcript reformatter — is TDD'd; the capture and training are action steps with observable eval gates.

**Files:**
- Create: `harness/flue/tuning/capture-gold.md` (protocol: how to run a clean slice-1 and export the transcript)
- Create: `harness/flue/tuning/reformat-to-apertus.ts` (Claude transcript → Apertus chat/tool template)
- Create: `harness/flue/tuning/train-lora.md` (the rented-GPU recipe, assistant-masked)
- Test: `harness/flue/tuning/reformat-to-apertus.test.ts`

**Interfaces:**
- Consumes: the Claude-Splash pipeline (existing), the base-failure classes from Task 4, the confirmed Apertus template name from Task 0.
- Produces: a training set `tuning/data/splash-slice1.jsonl` (assistant-masked); a LoRA adapter `apertus-8b-splash-orchestrator-v1`.

- [ ] **Step 1: Capture gold trajectories (Claude teacher, hybrid human gates)**

Follow `capture-gold.md`: run the CURRENT Claude-Splash on ~14 slice-1 articles, all gates played *well*. **4-5 authentic** (Rémy plays the journalist through cadrage/veto/export) + the rest teacher-simulated then hand-corrected. Export each full transcript (tool calls + gate handling) to `tuning/data/raw/gold-NN.json`.
Expected: ~14 clean transcripts on disk. Record which are authentic vs simulated.

- [ ] **Step 2: Write the failing reformatter test**

`harness/flue/tuning/reformat-to-apertus.test.ts`:
```ts
import { test, expect } from 'bun:test';
import { toApertusChat } from './reformat-to-apertus.ts';

test('a claude tool-call turn is re-expressed in apertus chat/tool format', () => {
  const claudeTurn = {
    role: 'assistant',
    content: [{ type: 'tool_use', name: 'execute-shell', input: { cmd: 'bun produce.mjs bar cfg out static' } }],
  };
  const out = toApertusChat([claudeTurn]);
  expect(out[0].role).toBe('assistant');
  // Apertus expects its own tool-call convention (confirmed in Task 0), not Anthropic blocks.
  expect(JSON.stringify(out)).not.toContain('tool_use');
  expect(JSON.stringify(out)).toContain('execute-shell');
});

test('tool OUTPUT turns are marked for loss-masking (assistant-masked SFT)', () => {
  const out = toApertusChat([{ role: 'tool', content: 'noisy 5000-line output' }]);
  expect(out[0].mask).toBe(true); // trainer masks these tokens
});
```

- [ ] **Step 3: Run it, verify it fails**

Run: `cd harness/flue && bun test tuning/reformat-to-apertus.test.ts`
Expected: FAIL — `toApertusChat` not defined.

- [ ] **Step 4: Implement the reformatter**

`harness/flue/tuning/reformat-to-apertus.ts`:
```ts
// Content/decisions come from the Claude teacher; the FORMAT is Apertus's own
// chat + tool-call template (name confirmed in Task 0). Tool-output turns are
// flagged mask:true so assistant-masked SFT ignores their token noise.
type Turn = { role: string; content: unknown };
type ApertusTurn = { role: string; content: string; mask?: boolean };

export function toApertusChat(turns: Turn[]): ApertusTurn[] {
  return turns.map((t) => {
    if (t.role === 'tool') {
      return { role: 'tool', content: String(t.content), mask: true };
    }
    if (Array.isArray(t.content)) {
      // Flatten Anthropic content blocks into Apertus's tool-call text convention.
      const text = t.content
        .map((b: any) =>
          b.type === 'tool_use'
            ? `<tool_call>${b.name}(${JSON.stringify(b.input)})</tool_call>`
            : b.text ?? '')
        .join('\n');
      return { role: t.role, content: text };
    }
    return { role: t.role, content: String(t.content) };
  });
}
```
(Adjust the `<tool_call>…` wrapper to the exact Apertus template confirmed in Task 0 Step 2.)

- [ ] **Step 5: Run the test, verify it passes**

Run: `cd harness/flue && bun test tuning/reformat-to-apertus.test.ts`
Expected: PASS (both).

- [ ] **Step 6: Build the training set (gold + correction continuations)**

Run:
```bash
cd harness/flue && bun run tuning/build-dataset.ts \
  --gold tuning/data/raw \
  --corrections tuning/data/corrections \
  --out tuning/data/splash-slice1.jsonl
```
Add ~12 correction continuations targeting the base-failure classes recorded in Task 4 (format improvised → gate skipped → takeaway divergence). Expected: a `.jsonl` with ~26 assistant-masked examples.

- [ ] **Step 7: Train the LoRA (rented GPU, ~$10)**

Follow `train-lora.md`: assistant-masked LoRA on Apertus 8B, iterate v1. Expected: adapter `apertus-8b-splash-orchestrator-v1` + a train/val loss curve recorded. Merge/quantise to a GGUF the launcher can serve, or serve the adapter alongside the base.

- [ ] **Step 8: Commit (data excluded if large — commit protocol + code, not weights)**

```bash
git add harness/flue/tuning/*.ts harness/flue/tuning/*.md harness/flue/tuning/reformat-to-apertus.test.ts
git commit -m "feat(tuning): claude-taught gold capture, apertus-format reformatter, lora recipe (v1)"
```

---

## Phase D — Prove editorial judgment holds

### Task 7: Four-way benchmark + success gate

**Files:**
- Create: `harness/flue/benchmark/run-4way.sh`
- Create: `harness/flue/benchmark/RESULTS.md`

**Interfaces:**
- Consumes: the pluggable harness (Task 4), the tuned adapter (Task 6), the running 8B/70B servers.
- Produces: a scored comparison table; a pass/fail against the slice-1 success criterion.

- [ ] **Step 1: Write the 4-way runner**

`harness/flue/benchmark/run-4way.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
CASE="${1:-slice1-native-bar}"
cd ../splash-harness
run() { bun run harness --runner "$2" --case "$CASE" --concurrency 1 --tag "$1" 2>&1 | tee "/tmp/bench-$1.log"; }

SPLASH_FLUE_MODEL=local/apertus-8b-base    run apertus-base  apertus-flue
SPLASH_FLUE_MODEL=local/apertus-8b-v1      run apertus-tuned apertus-flue
SPLASH_FLUE_MODEL=local/apertus-70b        run apertus-70b   apertus-flue
                                           run claude-ceiling claude
```

- [ ] **Step 2: Run the benchmark**

Run:
```bash
chmod +x harness/flue/benchmark/run-4way.sh && ./harness/flue/benchmark/run-4way.sh slice1-native-bar
```
Expected: four scored transcripts. Extract per-run: delivered? gates held? **editorial score (judged at render)** — title↔takeaway coherence, format-fit — using the existing harness rubric.

- [ ] **Step 3: Record results + evaluate the success gate**

Fill `harness/flue/benchmark/RESULTS.md` with the table (base / tuned / 70B / claude × delivered / gatesHeld / editorialScore / wall-time). **Success criterion:** tuned 8B delivers a native chart whose editorial judgment is rated **≥ acceptable at render**, gates held, 100% local.
- If PASS → the slice is proven; note the gap-to-Claude for the FJM write-up.
- If FAIL on editorial score → loop back to Task 6 (more/better corrections, v2), NOT to the guardrails. Record which axis failed.

- [ ] **Step 4: Commit**

```bash
git add harness/flue/benchmark/
git commit -m "feat(benchmark): 4-way apertus vs claude editorial-judgment eval + slice-1 success gate"
```

---

## Self-review notes (author pass)

- **Spec coverage:** goal/model-sovereign (Constraints + Task 0-1) · adopt Flue (Task 1, license-gated in Task 0) · Apertus 8B env-swappable (Task 0-1) · slice-1 native chart (Task 4-7) · verb-adapter (Task 2) · dynamic skill loading (Task 3) · serving/KV/reasoning-budget (Task 0) · reused guardrails (Task 5) · Claude teacher + reformat + LoRA (Task 6) · benchmark base/tuned/70B/Claude (Task 7) · **semantic-not-mechanical success bar** (Task 7 Step 3). All spec sections map to a task.
- **Known non-TDD tasks** (infra/ML): Task 0 (serving), Task 6 Steps 1/6/7 (capture/train), Task 7 (benchmark) — each carries an explicit observable verification gate instead of a unit assertion, which is the honest shape for these units.
- **Confirm-don't-guess seams flagged inline:** exact Apertus GGUF + tool template (Task 0), exact `isFormatAllowed` symbol/path (Task 5), current splash-harness runner path (Task 4), `@flue/runtime` beta API surface (grounded in real Spotlight source, re-confirmed at install).
- **External dependencies that can hard-block:** Flue non-permissive license (Task 0 Step 1 → STOP), no Apertus tool-parser in llama.cpp (Task 0 Step 2 → plain-text tool protocol fallback), Apertus 1.5 availability (start on v1.0, env-swap later).
