import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProducer } from "../registry";
import { isSafeId, unsafeIdMessage } from "../id-safety";
import { assertDeliveredContract, type DeliveredArtifact } from "../contract";
import { fail, ok, type RenderPayload, type VerbResult } from "./types";
import {
  channelEnvForEngine,
  collectOutputs,
  freshOutDir,
  runProducerScript,
} from "./exec";

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

  if (manifest.execution === "subprocess") {
    const sub = manifest.subprocess!;

    // `spec` is opaque (`unknown`) by contract — a caller can hand us anything, including
    // a value JSON.stringify cannot serialize (e.g. a cyclic object). That is a malformed
    // request, not an engine failure, so it is checked BEFORE any filesystem write: an
    // invalid-request never wipes outDir and never creates a temp spec dir to begin with.
    let specJson: string;
    try {
      specJson = JSON.stringify(p.spec, null, 2);
    } catch (e) {
      return fail(
        "invalid-request",
        `spec is not JSON-serializable: ${(e as Error).message}`,
      );
    }

    // Everything below touches the filesystem or spawns a process. A verb never throws
    // (I1): any unguarded fs failure (outDir cannot be cleared/created, temp dir cannot be
    // written) is caught here and reported as engine-failed rather than escaping. The temp
    // spec dir — written outside outDir, which must hold deliverables only — is removed on
    // every path out of this block, including a throw, via the finally below.
    let specDir: string | undefined;
    try {
      const absOutDir = freshOutDir(p.outDir);
      specDir = mkdtempSync(join(tmpdir(), "splash-verb-spec-"));
      const specPath = join(specDir, "config.json");
      writeFileSync(specPath, specJson);

      const outcome = runProducerScript(
        "bun",
        [sub.scriptPath, specPath, absOutDir, p.format],
        sub.skillDir,
        channelEnvForEngine(p.engine, p.channel),
      );
      // The engine DECLINED this spec (chart-native's exit 2 + FALLBACK_TO_DW). Reported,
      // never acted on: routing to another engine is the caller's policy, not the verb's.
      if (outcome.status === "needs-fallback")
        return fail("engine-declined", outcome.reason);
      if (outcome.status === "failed")
        return fail("engine-failed", outcome.error);

      const artifact: DeliveredArtifact = {
        format: p.format,
        form: "file",
        files: collectOutputs(absOutDir),
        report: {},
      };
      // A native produce writes byproducts beside the deliverable; the produce-stage
      // contract is lenient about those and asserts only the single-format media shape.
      // It THROWS on a violation — converted here, because a verb never throws (I1).
      try {
        assertDeliveredContract(artifact);
      } catch (e) {
        return fail("engine-failed", (e as Error).message);
      }
      return ok(artifact);
    } catch (e) {
      return fail("engine-failed", (e as Error).message);
    } finally {
      if (specDir) rmSync(specDir, { recursive: true, force: true });
    }
  }

  return fail(
    "not-implemented",
    `render: transport "${manifest.execution}" is not wired yet`,
  );
}
