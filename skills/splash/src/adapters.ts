// realDispatch: the Dispatch (Task 3) injects to actually produce ONE accepted
// proposal. The 5 producers split into two execution models, each with its own
// I/O shape — read from the real entry points, not assumed:
//
//   FILE-BASED (shell out, execFileSync, own build/render pipeline):
//     chart-native  scripts/produce-from-spec.mjs <nativeSpec.json> <outDir> <format>
//                   format is the SINGLE VisualFormat to build — static|interactive|
//                   video|scrolly — passed straight through (single-format-produce-
//                   export, Tasks 2-3: no more "all"/style translation). "scrolly"
//                   fails hard (see SCROLLY ROUTING below). exit 2 + "FALLBACK_TO_DW: ..."
//                   on stderr when the native type isn't mapped (specToNativeConfig
//                   throws UnsupportedNativeType) — the ONLY producer that emits this
//                   fallback signal.
//     map-native    scripts/produce.mjs <config.json> <outDir> <format>
//                   same single-format vocabulary as chart-native, passed straight
//                   through — builds EXACTLY that one format's artifacts, nothing else.
//                   "scrolly" fails hard too. Never emits FALLBACK_TO_DW.
//     scrolly       scripts/produce.mjs <config.json> <outDir> — takes NO format flag
//                   (always builds one scrolly.html); a 4th argv is simply unread.
//
//   SCROLLY ROUTING: a scrolly-format element is proposed with producer "scrolly"
//   ITSELF (suggest-chart/suggest-article never emit chart-native/map-native paired
//   with format:"scrolly" — both of those producers' own produce.mjs now fail hard on
//   "scrolly", see their file-header comments). isFileBased/SCRIPT dispatch a "scrolly"
//   producer straight to skills/scrolly, which hosts the moteur's renderer for the
//   scroll-driven format — unchanged by Task 4, confirmed still correct here.
//
//   CHANNEL THREADING (Slice 2, producer rendering — 2026-07-08): the proposal's
//   confirmed CADRAGE Q3 channel (skills/splash/src/channel.ts) is forwarded to the
//   two NATIVE producers (chart-native, map-native) ONLY, as an env var
//   `SPLASH_CHANNEL` on the spawned process — NOT a 6th positional argv. Chosen
//   because both entry scripts already read a sibling env fallback this way,
//   and because an env var survives produce-from-spec.mjs's own inner
//   execFileSync("bun", [...]) re-spawn of produce.mjs for free (inherited process.env)
//   with no extra plumbing in that forwarding script. Absent channel (legacy
//   proposals) defaults to "article-web", matching normalizeChannel's default.
//   dw-chart / map-dw / scrolly dispatch is UNCHANGED — no channel is threaded to them.
//
//   CLOUD-PUBLISHING (import + await, hits the Datawrapper API):
//     dw-chart  produceChart(spec: ChartSpec, pngPath, opts?) → { chartId, embed, pngPath?, publicUrl }
//               opts.format ("static" default | "interactive") — single-format-produce-
//               export (Task 3): "static" exports the media (pngPath present);
//               "interactive" delivers the hosted embed alone (pngPath undefined).
//               Task 4 threads `p.format` here; a format outside {static, interactive}
//               (video/scrolly — dw-chart has no such renderer) fails hard before any
//               API call rather than silently building "static".
//     map-dw    produceMap(spec: MapSpec, pngPath, opts?) → { chartId, embed, pngPath?, publicUrl }
//               opts.format ("static" default | "interactive") — the same single-format
//               contract as dw-chart (map-dw floor): "static" exports the owned PNG at
//               the channel's box (render-size fail-hard, IHDR readback); "interactive"
//               delivers the hosted embed alone (pngPath undefined). A format outside
//               {static, interactive} (video/scrolly — animated maps are map-native's)
//               fails hard here BEFORE any API call, mirroring the dw-chart gate below.
//   Both ChartSpec.data and MapSpec.data are already CSV text set by the upstream
//   suggester — no toCsv (Task 2) conversion is needed here.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Populate the producer registry (each engine's manifest self-registers on import) BEFORE
// any getProducer call below. This one side-effect import is the wiring that makes dispatch
// data-driven — without it the registry is empty at dispatch time. Module caching runs it once.
import "./register-producers";
import { getProducer } from "../../../lib/core/registry";
import {
  assertDeliveredContract,
  type ProduceContext,
} from "../../../lib/core/contract";
import type { Channel } from "./channel";
import { assertSafeId } from "./id-safety";
import type { Dispatch } from "./produce-all";
import type { AcceptedProposal, Producer, VisualFormat } from "./producer-spec";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";
import {
  channelEnvForEngine,
  collectOutputs,
  freshOutDir,
  runProducerScript,
  type ExecOutcome,
} from "../../../lib/core/verbs/exec";

// The subprocess mechanism now lives in lib/core/verbs/exec.ts (runtime-neutral). These
// re-exports keep every existing importer and test working unchanged — including
// tests/adapters.test.ts, which dynamically imports THIS module's URL in a spawned
// process to exercise runProducerScript's env forwarding.
export { runProducerScript, freshOutDir, collectOutputs, type ExecOutcome };

type FileBasedProducer =
  "chart-native" | "map-native" | "scrolly" | "image-native";

// The subprocess dispatch data (entry script + skill cwd + channel threading) for a
// file-based producer, read from its registered manifest. Throws if a file-based producer
// somehow carries no subprocess config — a manifest bug, surfaced loud rather than at spawn.
function subprocessConfigFor(producer: FileBasedProducer): {
  scriptPath: string;
  skillDir: string;
  threadsChannel: boolean;
} {
  const sub = getProducer(producer)?.subprocess;
  if (!sub)
    throw new Error(
      `no subprocess config registered for producer "${producer}"`,
    );
  return sub;
}

const DEFAULT_CHANNEL: Channel = "article-web";

// The native engine that DOES own video/scrolly for each in-process (hosted-DW) producer —
// used only to keep the format-gate refusal string byte-identical to the old per-producer
// messages (dw-chart → chart-native's D3 core; map-dw → map-native's animated maps).
const IN_PROCESS_NATIVE_FALLBACK: Record<string, string> = {
  "dw-chart": "chart-native",
  "map-dw": "map-native",
};

// Legacy shape: an AcceptedProposal's channel is optional, and an absent one defaults to
// article-web (back-compat — legacy proposals without a channel still dispatch fine).
// The mechanism itself takes a RESOLVED channel; the defaulting is this caller's policy.
export function channelEnvFor(
  producer: FileBasedProducer,
  channel: Channel | undefined,
): Record<string, string> {
  return channelEnvForEngine(producer, channel ?? DEFAULT_CHANNEL);
}

// CHANNEL INJECTION (cloud producers) — the spine's truth flows in MECHANICALLY.
// dw-chart and map-dw size (and render-size-verify) their DW export against their own
// spec.channel, but on the routed path the canonical channel lives on the PROPOSAL
// (CADRAGE Q3, normalized fail-closed by produce-all's gate before dispatch): a spec
// whose emitter forgot the field (suggest-chart's MapSpec template historically had
// none) would silently size against the article-web default and PASS its own floor
// against the wrong channel. So the dispatch injects the proposal's channel into the
// spec handed to the producer. Precedence: the PROPOSAL value WINS over any spec-level
// value — the same proposal-first order resolveGuardChannel (guardrail-parity.ts)
// already applies at the validate gate — chosen over a mismatch-throw because the spec
// field is legacy free text (aliases like "feed") while the proposal is canonical:
// throwing on a raw-string mismatch would reject specs that AGREE after normalization.
// An absent proposal channel leaves the spec untouched (legacy/hand-authored specs and
// their spec-level channel keep working; producers still default absent → article-web).
// Pure — returns a new object, never mutates the accepted proposal's spec. Exported
// for unit testing.
export function withProposalChannel<T extends { channel?: string }>(
  spec: T,
  channel: Channel | undefined,
): T {
  if (channel === undefined) return spec;
  return { ...spec, channel };
}

// The orchestrator's generic VisualFormat now maps 1:1 onto every file-based
// producer's own CLI vocabulary — chart-native, map-native, and scrolly all read the
// exact same static|interactive|video|scrolly set directly off argv (see each script's
// own header comment), since the single-format-produce-export redesign (Tasks 2-3)
// removed the old "all"/style translation this used to need. Kept as a named seam
// (not an inline pass-through at the call site) so a future producer with a genuinely
// different CLI vocabulary has exactly one place to diverge. Cloud producers have no
// CLI flag; the value is never consumed for them.
export function formatFlag(producer: Producer, format: VisualFormat): string {
  return format;
}

interface FileDispatchOutcome {
  status: "produced" | "failed" | "needs-fallback";
  outputs?: string[];
  reason?: string;
  error?: string;
  actualProducer?: Producer; // GUARD 1: the producer this dispatch actually ran
}

function dispatchFileBased(
  producer: FileBasedProducer,
  spec: NativeSpec | Record<string, unknown>,
  outDir: string,
  format: VisualFormat,
  channel: Channel | undefined,
): FileDispatchOutcome {
  const absOutDir = freshOutDir(outDir);

  const tmpDir = mkdtempSync(join(tmpdir(), "splash-dispatch-"));
  const configPath = join(tmpDir, "config.json");
  writeFileSync(configPath, JSON.stringify(spec, null, 2));

  // Entry script + skill cwd come from the producer's registered manifest (colocated with
  // the engine), not a hard-coded map here. scriptPath is absolute, so cwd never matters for
  // resolution — but we still set cwd to the skill dir to match each script's call shape.
  const sub = subprocessConfigFor(producer);
  const outcome = runProducerScript(
    "bun",
    [sub.scriptPath, configPath, absOutDir, formatFlag(producer, format)],
    sub.skillDir,
    channelEnvFor(producer, channel),
  );
  if (outcome.status !== "produced") return outcome;

  // Record the producer this dispatch actually ran (GUARD 1) — it IS `producer` here (the
  // file-based branch dispatches strictly by the declared key), which is exactly what
  // makes the report an honest witness: produce-all asserts it against the accepted one.
  return {
    status: "produced",
    outputs: collectOutputs(absOutDir),
    actualProducer: producer,
  };
}

type DispatchResult = Awaited<ReturnType<Dispatch>>;

export const realDispatch: Dispatch = async (
  p: AcceptedProposal,
  outDir: string,
): Promise<DispatchResult> => {
  // Path-safety, belt-and-suspenders (audit gap #1). produce-all gates p.id at the spine
  // BEFORE building this outDir, but realDispatch is an exported entry point and p.id is
  // joined into a filesystem path directly (the in-process `${p.id}.png`, and freshOutDir
  // resolve+rmSyncs). Re-assert the slug so no direct caller can drive a traversal id into a
  // delete/write outside outDir. Thrown here, it is caught by produce-all's dispatch
  // try/catch and recorded as a failed result — never a silent delete (id-safety.ts).
  assertSafeId(p.id);

  // ONE registry-driven path (Task 8) — no more per-producer switch. Look up the manifest;
  // an unknown producer is a RECORDED failed result, NEVER a throw (a throw would break
  // produce-all's drop-proof invariant on a hand-authored batch — see the Task-6 regressions;
  // this is also why the OLD switch's map-dw fall-through could run produceMap on a garbage
  // producer, now a clean fail). Then branch on the declared transport ONLY.
  const manifest = getProducer(p.producer);
  if (!manifest)
    return {
      status: "failed",
      error: `unknown producer "${String(p.producer)}"`,
    };

  // SUBPROCESS producers (chart-native, map-native, scrolly, image-native) validate + own
  // their error reporting IN-SCRIPT, format-scoped and canonical (image-native's v1/conformance
  // messages, chart-native's exit-2 FALLBACK_TO_DW). A boundary manifest.validate here would
  // PREEMPT those with the errors-only projection (weaker: image-native's validate is
  // format-blind), so it is NOT run for subprocess — validation stays exactly where it was
  // (the spine's validate-gate remains the upstream floor for the routed path). Behaviour
  // unchanged: dispatch straight through, then contract-check a produced artifact.
  if (manifest.execution === "subprocess") {
    const outcome = dispatchFileBased(
      p.producer as FileBasedProducer,
      p.spec as NativeSpec | Record<string, unknown>,
      outDir,
      p.format,
      p.channel,
    );
    // needs-fallback / failed pass straight through (unchanged) — only a produced outcome has
    // an artifact to contract-check.
    if (outcome.status !== "produced") return outcome;
    // A native produce writes byproducts (config.json / native-source.json / ephemeral review
    // stills) beside the deliverable; the produce-stage contract is lenient about those and
    // asserts only the single-format media shape. A violation throws → caught by produce-all's
    // dispatch try/catch → recorded failed (like assertSafeId). Valid produces satisfy it.
    assertDeliveredContract({
      format: p.format,
      form: "file",
      files: outcome.outputs ?? [],
      report: {},
    });
    return {
      status: "produced",
      outputs: outcome.outputs,
      actualProducer: outcome.actualProducer,
    };
  }

  // IN-PROCESS (hosted-DW: dw-chart / map-dw). FORMAT GATE FIRST — exactly the old order (the
  // per-producer branches checked p.format BEFORE calling produceChart/produceMap): these
  // producers build "static" or "interactive" only (their manifest.formats); video/scrolly
  // require the native engines. Reject a format they cannot honor BEFORE any API call. The two
  // hard-coded per-producer gates collapse into this ONE data-driven check off manifest.formats;
  // the error STRING stays byte-identical to the old per-producer messages (it named the native
  // engine that DOES own video/scrolly — chart-native / map-native).
  if (!manifest.formats.includes(p.format))
    return {
      status: "failed",
      error:
        `${p.producer} cannot build format "${p.format}" — it supports "static" or ` +
        `"interactive" only (video/scrolly require ${IN_PROCESS_NATIVE_FALLBACK[p.producer] ?? "the native engine"})`,
    };
  // Spec-in validation at the boundary. For these two producers the manifest validator IS the
  // exact validator produceChart/produceMap run internally (validateChartSpec / validateMapSpec),
  // so this is behaviour-equivalent — it just fails a bad spec cleanly (recorded failed) BEFORE
  // the API call instead of letting the engine throw it (caught by produce-all). A NON-EMPTY
  // error list → failed, NEVER a throw (the drop-proof invariant realDispatch must honor).
  const validationErrors = manifest.validate(p.spec);
  if (validationErrors.length)
    return { status: "failed", error: validationErrors.join("; ") };

  // The SPINE owns the outDir lifecycle (freshOutDir) + canonical-channel injection
  // (withProposalChannel — the proposal's CADRAGE-Q3 channel WINS over any spec-level value, and
  // an absent proposal channel leaves the spec untouched so a legacy spec-level channel
  // survives). The manifest's inProcess owns ONLY the engine call (produceChart / produceMap),
  // returning the DeliveredArtifact — no orchestrator logic leaks into the engine. The
  // ProduceContext threads the same truth both transports get.
  const absOutDir = freshOutDir(outDir);
  const preparedSpec = withProposalChannel(
    p.spec as { channel?: string },
    p.channel,
  );
  const ctx: ProduceContext = {
    channel: p.channel ?? DEFAULT_CHANNEL,
    format: p.format,
    outDir: absOutDir,
    id: p.id,
    themeBg: (p.spec as { themeBg?: string } | null)?.themeBg,
    locale: (p.spec as { lang?: string } | null)?.lang,
  };
  const artifact = await manifest.inProcess!(preparedSpec, ctx);
  assertDeliveredContract(artifact);
  return {
    status: "produced",
    outputs: artifact.files,
    publicUrl: artifact.publicUrl,
    actualProducer: p.producer,
  };
};
