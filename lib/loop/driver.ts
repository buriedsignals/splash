import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendEvent,
  nextActions,
  type RunElement,
  type RunManifest,
} from "./manifest";
import { tryLoadDecor, type Decor } from "../newsroom/decor";
import { deliver } from "./deliver";
import { orient } from "./orient";
import { propose } from "./propose";
import { produce } from "./produce";

// State-driven: read the manifest, ask nextActions() what is valid, run the matching
// deterministic step on the live element (elements[0]). Human decisions (confirm-angle,
// choose-form, revise) are supplied by the caller between advances.
// The decor defaults to this install's own (production ergonomics: no caller has to thread
// it), through the never-throwing resolver — a default parameter is evaluated before the
// body, so a decor that threw here would escape `advance` ahead of every bounded-failure
// path it owns, against the loop's never-throw discipline.
export async function advance(
  run: RunManifest,
  runDir: string,
  decor: Decor = tryLoadDecor(),
): Promise<RunManifest> {
  const [next] = nextActions(run);
  // `elements: []` is valid per RunManifestSchema, so the live element is OPTIONAL here.
  // Every branch below reads it defensively: `orient` runs at run level and only needs the
  // element to attribute a failure event (RunEvent.elementId is itself optional), while the
  // element-driven branches have nothing to act on without one.
  const live: RunElement | undefined = run.elements[0];
  switch (next) {
    case "orient": {
      let data: string;
      try {
        data = readData(run, runDir);
      } catch (e) {
        return appendEvent(run, {
          at: new Date().toISOString(),
          kind: "failure",
          ...(live ? { elementId: live.id } : {}),
          action: "orient",
          message: (e as Error).message.slice(0, 200),
        });
      }
      return { ...run, orient: orient(data) };
    }
    case "propose": {
      if (!live) return run;
      const options = propose(run, decor);
      return {
        ...run,
        elements: [
          { ...live, proposal: { options, excluded: [] } },
          ...run.elements.slice(1),
        ],
      };
    }
    case "produce": {
      if (!live) return run;
      const result = await produce(run, live, runDir);
      if (result.ok)
        return { ...run, elements: [result.value, ...run.elements.slice(1)] };
      // A refusal is DATA now, not an exception: the verb never throws, so the driver
      // records the bounded failure event directly.
      return appendEvent(run, {
        at: new Date().toISOString(),
        kind: "failure",
        elementId: live.id,
        action: "produce",
        message: result.message.slice(0, 200),
      });
    }
    case "deliver": {
      if (!live) return run;
      const result = await deliver(run, live, runDir, decor);
      if (result.ok)
        return { ...run, elements: [result.value, ...run.elements.slice(1)] };
      return appendEvent(run, {
        at: new Date().toISOString(),
        kind: "failure",
        elementId: live.id,
        action: "deliver",
        message: result.message.slice(0, 200),
      });
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
