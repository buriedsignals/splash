import { defineAgent } from "@flue/runtime";
import { FLUE_VERB_ADAPTER } from "../lib/roles.ts"; // Task 2 provides this

// Local/cloud tier model. llama-server serves the Apertus GGUF as `local/…`.
// Swap to 70B or v1.5 via env — never hardcode (Global Constraints).
const MODEL = process.env.SPLASH_FLUE_MODEL ?? "local/apertus-8b";
const TIER = process.env.SPLASH_MODEL_TIER ?? "8b";

// Slice 1 is a short linear pipeline (analyse → cadrage → proposition → produce →
// export). It rarely hits the context threshold, so no aggressive compaction and NO
// delegation subagents (single orchestrator). Both are deliberate simplifications
// vs Spotlight — see the design spec's "simpler than Spotlight" table.
export default defineAgent(() => ({
  name: "splash",
  model: MODEL,
  instructions: FLUE_VERB_ADAPTER, // Task 2 fills the full body
}));

export { MODEL, TIER };
