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
  type ExecOutcome,
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
    const absOutDir = freshOutDir(p.outDir);
    // The engine reads its spec from a file on argv. Written to a temp dir (never into
    // outDir, which must hold deliverables only) and removed whatever happens — the
    // cleanup lib/loop/produce.ts already did and the legacy dispatcher did not.
    const specDir = mkdtempSync(join(tmpdir(), "splash-verb-spec-"));
    const specPath = join(specDir, "config.json");
    writeFileSync(specPath, JSON.stringify(p.spec, null, 2));
    // An IIFE rather than a `let` assigned inside try/finally: an unannotated `let` would
    // infer `any`, which the project forbids, and annotating it would then trip TS's
    // "used before assigned".
    const outcome = ((): ExecOutcome => {
      try {
        return runProducerScript(
          "bun",
          [sub.scriptPath, specPath, absOutDir, p.format],
          sub.skillDir,
          channelEnvForEngine(p.engine, p.channel),
        );
      } finally {
        rmSync(specDir, { recursive: true, force: true });
      }
    })();
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
  }

  return fail(
    "not-implemented",
    `render: transport "${manifest.execution}" is not wired yet`,
  );
}
