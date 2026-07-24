import { getProducer } from "../registry";
import { isSafeId, unsafeIdMessage } from "../id-safety";
import type { DeliveredArtifact } from "../contract";
import { fail, type RenderPayload, type VerbResult } from "./types";

// The ONE craft verb of B1. Callers hand it a neutral payload; it resolves the engine
// from the registry and dispatches on the DECLARED transport. It reports what the engine
// said and never routes: the native→Datawrapper fallback is the CALLER's policy.
export async function render(
  p: RenderPayload,
): Promise<VerbResult<DeliveredArtifact>> {
  // Path-safety BEFORE any resolve/mkdir/rmSync — `id` becomes a directory name and
  // freshOutDir recursively deletes what it resolves.
  if (!isSafeId(p.id)) return fail("invalid-request", unsafeIdMessage(p.id));

  const manifest = getProducer(p.engine);
  if (!manifest)
    return fail("unknown-engine", `unknown producer "${p.engine}"`);

  return fail(
    "not-implemented",
    `render: transport "${manifest.execution}" is not wired yet`,
  );
}
