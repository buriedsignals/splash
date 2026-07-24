import { nextActions, type RunManifest } from "./manifest";
import { orient } from "./orient";
import { propose } from "./propose";
import { produce } from "./produce";

// State-driven: never a hard-coded forward chain. Read the manifest, ask nextActions()
// what is valid, run the matching deterministic step. Human decisions (confirm-angle,
// choose-form, revise) are supplied by the caller between advances — the instrument is
// played, not delegated.
export function advance(m: RunManifest, outDir: string): RunManifest {
  const [next] = nextActions(m);
  switch (next) {
    case "orient":
      return { ...m, orient: orient(m.input.dataCsv) };
    case "propose":
      return { ...m, proposal: { options: propose(m) } };
    case "produce":
      return produce(m, outDir);
    default:
      return m; // confirm-angle / choose-form / show / [] are human turns
  }
}
