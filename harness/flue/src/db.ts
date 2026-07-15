import { sqlite } from "@flue/runtime/node";

// Durable session stream: a run interrupted on a slow local model resumes from
// durable deltas rather than restarting. FLUE_DB isolates parallel sampling runs.
export default sqlite(process.env.FLUE_DB ?? "./data/flue.db");
