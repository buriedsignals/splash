import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appendEvent, nextActions, type RunManifest } from "./manifest";
import { orient } from "./orient";
import { propose } from "./propose";
import { produce } from "./produce";

// State-driven: read the manifest, ask nextActions() what is valid, run the matching
// deterministic step on the live element (elements[0]). Human decisions (confirm-angle,
// choose-form, revise) are supplied by the caller between advances.
export function advance(
  run: RunManifest,
  runDir: string,
  outDir: string,
): RunManifest {
  const [next] = nextActions(run);
  switch (next) {
    case "orient":
      return { ...run, orient: orient(readData(run, runDir)) };
    case "propose": {
      const el = run.elements[0];
      const options = propose(run);
      return {
        ...run,
        elements: [{ ...el, proposal: { options } }, ...run.elements.slice(1)],
      };
    }
    case "produce": {
      try {
        const el = produce(run, run.elements[0], runDir, outDir);
        return { ...run, elements: [el, ...run.elements.slice(1)] };
      } catch (e) {
        return appendEvent(run, {
          at: new Date().toISOString(),
          kind: "failure",
          elementId: run.elements[0].id,
          action: "produce",
          message: (e as Error).message.slice(0, 200),
        });
      }
    }
    default:
      return run; // confirm-angle / choose-form / show / [] are human turns
  }
}

function readData(run: RunManifest, runDir: string): string {
  if (!run.input.data)
    throw new Error("advance: no frozen data input to orient");
  return readFileSync(join(runDir, run.input.data.path), "utf8");
}
