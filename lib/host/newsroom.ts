// The decor, as a host sees it. A host outside JavaScript cannot read newsroom.json and
// recompute readiness — and should not have to: it asks, and gets one JSON document holding
// what this newsroom can do, what language it works in, and what stands in the way.
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { loadDecor, type LoadDecorOpts } from "../newsroom/decor";
import { readinessBlockers } from "../newsroom/readiness";
import type { HostResponse } from "./state";

// The same rule the setup page follows (install/preflight/model.ts's `blockers`): only a
// DELIVERY capability's missing readiness is a blocker. An engine is asked for outright now
// (Task 5, 2026-08-06 removed its tick) and reports "missing" as freely as "ready" — that is
// what `producible`/the engine row is FOR, never what README.md's `blockers` promises ("the
// subset of those that are ENABLED but not currently usable"). Filtering `decor.readiness`
// (which carries every capability, both kinds) down to delivery ids before handing it to
// `readinessBlockers` is what keeps that promise true here too; without it, a fresh install
// reported every unconfigured engine as a blocker (four, where only a chosen-but-unkeyed
// delivery destination should ever be one).
const DELIVERY_IDS = new Set(
  Object.values(NEWSROOM_CAPABILITIES)
    .filter((cap) => cap.kind === "delivery")
    .map((cap) => cap.id),
);

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
        blockers: readinessBlockers(
          decor.readiness.filter((r) => DELIVERY_IDS.has(r.id)),
        ),
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
