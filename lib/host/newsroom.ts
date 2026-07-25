// The decor, as a host sees it. A host outside JavaScript cannot read newsroom.json and
// recompute readiness — and should not have to: it asks, and gets one JSON document holding
// what this newsroom can do, what language it works in, and what stands in the way.
import { loadDecor } from "../newsroom/decor";
import { readinessBlockers } from "../newsroom/readiness";
import type { HostResponse } from "./state";

export function describeNewsroom(dir?: string): HostResponse {
  try {
    const decor = loadDecor(dir);
    return {
      ok: true,
      value: {
        root: decor.root,
        runtime: decor.state.runtime,
        language: decor.language,
        publisher: decor.state.publisher ?? null,
        capabilities: decor.readiness,
        blockers: readinessBlockers(decor.readiness),
      },
    };
  } catch (e) {
    // loadDecor is written not to throw; this is the boundary that makes it true anyway.
    return {
      ok: false,
      code: "internal",
      message: `the newsroom decor could not be read: ${(e as Error)?.message ?? String(e)}`,
    };
  }
}
