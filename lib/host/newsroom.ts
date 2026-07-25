// The decor, as a host sees it. A host outside JavaScript cannot read newsroom.json and
// recompute readiness — and should not have to: it asks, and gets one JSON document holding
// what this newsroom can do, what language it works in, and what stands in the way.
import { loadDecor, type LoadDecorOpts } from "../newsroom/decor";
import { readinessBlockers } from "../newsroom/readiness";
import type { HostResponse } from "./state";

// `dir` is passed straight through to loadDecor, which treats an explicit one as READ-ONLY:
// a host payload is untrusted, and this command must not be able to create a directory
// wherever it points. `opts` is the readiness environment — the CLI never supplies it (the
// install's own .env plus process.env is the truth there); tests do, so a shell that sourced
// .env cannot change what they assert.
export function describeNewsroom(
  dir?: string,
  opts?: LoadDecorOpts,
): HostResponse {
  try {
    const decor = loadDecor(dir, opts);
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
