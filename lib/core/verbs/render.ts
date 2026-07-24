import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProducer } from "../registry";
import { isSafeId, unsafeIdMessage } from "../id-safety";
import {
  assertDeliveredContract,
  type DeliveredArtifact,
  type ProduceContext,
} from "../contract";
import { fail, ok, type RenderPayload, type VerbResult } from "./types";
import {
  channelEnvForEngine,
  collectOutputs,
  freshOutDir,
  runProducerScript,
} from "./exec";

// The native engine that DOES own video/scrolly for each in-process (hosted-DW) engine —
// used only to keep the format-refusal string byte-identical to the legacy messages that
// two existing test suites assert character for character (skills/splash/src/
// adapters.test.ts, skills/splash/scripts/produce-all-format.test.ts).
const IN_PROCESS_NATIVE_FALLBACK: Record<string, string> = {
  "dw-chart": "chart-native",
  "map-dw": "map-native",
};

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

  // FORMAT GATE — runs BEFORE the transport branch, from registry data alone, so no
  // process is spawned and no API is called for a format the engine cannot honor. It
  // covers BOTH transports: a host driving this contract directly (the CLI façade) has
  // none of the upstream gates the legacy orchestrator sits behind, so this is the only
  // place an undeclared format is caught.
  // `formats` is read defensively: a malformed manifest (no formats array) must not throw
  // a TypeError out of a verb (I1) — it declares nothing, so it supports nothing.
  // An engine may declare its own refusal wording (unsupportedFormatMessage); the contract
  // uses it rather than replacing words a journalist may already know from that engine's
  // own CLI. The in-process default message is byte-frozen by two legacy suites.
  const declared: readonly string[] = Array.isArray(manifest.formats)
    ? manifest.formats
    : [];
  if (!declared.includes(p.format))
    return fail(
      "unsupported-format",
      manifest.unsupportedFormatMessage ??
        (manifest.execution === "in-process"
          ? `${p.engine} cannot build format "${p.format}" — it supports "static" or ` +
            `"interactive" only (video/scrolly require ${IN_PROCESS_NATIVE_FALLBACK[p.engine] ?? "the native engine"})`
          : `${p.engine} cannot build format "${p.format}" — it declares ${declared.length ? declared.map((f) => `"${f}"`).join(", ") : "no formats"}`),
    );

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
      // A `finally` is OUTSIDE the reach of its own `catch`: a throw here (a read-only
      // TMPDIR, a racing cleaner) would escape the verb past every guard above. Cleanup is
      // best-effort by nature — the temp dir is outside outDir and holds only the spec —
      // so a failure to remove it is swallowed rather than allowed to break I1.
      try {
        if (specDir) rmSync(specDir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup: never turn a delivered render into a throw */
      }
    }
  }

  // in-process: the hosted-Datawrapper engines (dw-chart, map-dw) — imported and awaited
  // rather than shelled out to. The format gate already ran above, for both transports.

  // Spec-in validation at the boundary: for these engines the manifest validator IS the
  // one produceChart/produceMap run internally, so this fails a bad spec cleanly before
  // the network instead of letting the engine throw it. A verb never throws (I1): the
  // validator is the engine's OWN hand-written code and can itself throw on a malformed
  // spec — caught here as invalid-spec (the spec is what broke it), never engine-failed.
  let validationErrors: string[];
  try {
    validationErrors = manifest.validate(p.spec);
  } catch (e) {
    return fail("invalid-spec", (e as Error).message);
  }
  // The validator's RETURN is untrusted too: a malformed manifest whose validate() answers
  // something other than an array of strings would throw a TypeError on `.length` — outside
  // the try above, so past every guard (I1). That is a broken engine declaration, not a bad
  // spec, hence engine-failed.
  if (!Array.isArray(validationErrors))
    return fail(
      "engine-failed",
      `${p.engine}: manifest validate() must return an array of error strings, got ${typeof validationErrors}`,
    );
  if (validationErrors.length)
    return fail("invalid-spec", validationErrors.join("; "));

  // freshOutDir touches the filesystem before any engine call. A verb never throws (I1):
  // an unguarded fs failure (outDir cannot be cleared/created) is reported as
  // engine-failed — mirroring the subprocess branch above — rather than escaping.
  let absOutDir: string;
  try {
    absOutDir = freshOutDir(p.outDir);
  } catch (e) {
    return fail("engine-failed", (e as Error).message);
  }

  // themeBg / locale are best-effort context read off the spec — unchanged from the
  // legacy dispatcher, the one place the contract peeks at an otherwise opaque spec.
  const ctx: ProduceContext = {
    channel: p.channel,
    format: p.format,
    outDir: absOutDir,
    id: p.id,
    themeBg: (p.spec as { themeBg?: string } | null)?.themeBg,
    locale: (p.spec as { lang?: string } | null)?.lang,
  };
  try {
    const artifact = await manifest.inProcess!(p.spec, ctx);
    assertDeliveredContract(artifact);
    return ok(artifact);
  } catch (e) {
    return fail("engine-failed", (e as Error).message);
  }
}
