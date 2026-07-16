import { defineAgent } from "@flue/runtime";
import { local } from "@flue/runtime/node";
import { FLUE_VERB_ADAPTER } from "../lib/roles.ts"; // Task 2 provides this
import { registerLocalProvider } from "../lib/provider.ts";

// Local/cloud tier model. Ollama serves Apertus under the `local/…` namespace.
// Swap to 70B or v1.5 via env — never hardcode (Global Constraints).
const MODEL = process.env.SPLASH_FLUE_MODEL ?? "local/apertus-8b";
const TIER = process.env.SPLASH_MODEL_TIER ?? "8b";

// A `local/*` model needs the local provider wired to Ollama's OpenAI-compatible
// endpoint before the session resolves the model.
if (MODEL.startsWith("local/")) registerLocalProvider();

// Slice 1 is a short linear pipeline (analyse → cadrage → proposition → produce →
// export). It rarely hits the context threshold, so no aggressive compaction and NO
// delegation subagents (single orchestrator). Both are deliberate simplifications
// vs Spotlight — see the design spec's "simpler than Spotlight" table.
// The agent NAME comes from the module (`flue run splash`), not the runtime config —
// AgentRuntimeConfig has no `name` field (verified against @flue/runtime types).
// `local` sandbox = the REAL filesystem, so the write-file/execute-shell tools operate
// on the real repo (chart-native producer) + /tmp — otherwise Flue's default isolated
// sandbox hides the written config from `produce.mjs`, which then can't render the chart.
export default defineAgent(() => ({
  model: MODEL,
  instructions: FLUE_VERB_ADAPTER,
  sandbox: local(),
}));

export { MODEL, TIER };
