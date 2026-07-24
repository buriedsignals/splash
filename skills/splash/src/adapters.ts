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
// Populate the producer registry (each engine's manifest self-registers on import) BEFORE
// any getProducer call below. This one side-effect import is the wiring that makes dispatch
// data-driven — without it the registry is empty at dispatch time. Module caching runs it once.
import "./register-producers";
import { getProducer } from "../../../lib/core/registry";
import { render } from "../../../lib/core/verbs";
import type { Channel } from "./channel";
import type { Dispatch } from "./produce-all";
import type { AcceptedProposal, Producer, VisualFormat } from "./producer-spec";
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

const DEFAULT_CHANNEL: Channel = "article-web";

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

type DispatchResult = Awaited<ReturnType<Dispatch>>;

// A TRANSLATOR, not a dispatcher: AcceptedProposal → the contract's neutral RenderPayload
// → DispatchResult. Everything mechanical lives in lib/core/verbs/render.ts and is shared
// with the editorial loop. What stays HERE is legacy policy: the absent-channel default,
// the spec-level channel injection, and the native→Datawrapper fallback routing.
export const realDispatch: Dispatch = async (
  p: AcceptedProposal,
  outDir: string,
): Promise<DispatchResult> => {
  const manifest = getProducer(p.producer);
  // Spec-level channel injection applies to the hosted-DW engines ONLY (they size their
  // export off spec.channel). Native engines receive the channel as SPLASH_CHANNEL and
  // must keep the spec they were given — injecting a field would change their input.
  const spec =
    manifest?.execution === "in-process"
      ? withProposalChannel(p.spec as { channel?: string }, p.channel)
      : p.spec;

  const result = await render({
    engine: p.producer,
    spec,
    format: p.format,
    channel: p.channel ?? DEFAULT_CHANNEL,
    outDir,
    id: p.id,
  });

  if (result.ok)
    return {
      status: "produced",
      outputs: result.value.files,
      publicUrl: result.value.publicUrl,
      actualProducer: p.producer,
    };
  // The engine declined THIS spec — the legacy flow's answer is the Datawrapper fallback.
  // That decision lives here, not in the contract.
  if (result.code === "engine-declined")
    return { status: "needs-fallback", reason: result.message };
  return { status: "failed", error: result.message };
};
