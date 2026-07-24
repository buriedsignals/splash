// The LEGACY orchestrator's TRANSLATOR onto the verb contract.
//
// Dispatch mechanics no longer live here. The subprocess mechanism (runProducerScript's
// bounded stdout/stderr capture, freshOutDir, collectOutputs, the exit-2 "the engine
// declines this spec" signal) is lib/core/verbs/exec.ts; the dispatch itself — registry
// lookup, transport branch, format gate, spec validation, delivered-contract assertion —
// is lib/core/verbs/render.ts. Both are runtime-neutral and shared with the editorial
// loop (lib/loop), which is the point: ONE execution path to an engine, for two callers.
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md.
//
// What is still THIS file's job:
//   TRANSLATION — AcceptedProposal (produce-all's payload) → the contract's neutral
//   RenderPayload, then VerbResult → DispatchResult.
//
//   LEGACY POLICY, deliberately NOT hoisted into the contract (mechanism was hoisted,
//   policy was not):
//     · an absent proposal channel defaults to article-web (legacy proposals carry none);
//     · the proposal's channel is injected INTO the spec for the hosted-DW engines, which
//       size their export off spec.channel (withProposalChannel);
//     · engine-declined → needs-fallback: the native→Datawrapper re-routing. The verb only
//       REPORTS what the engine said; deciding to route elsewhere is this caller's policy.
//
//   The per-producer seams the legacy flow still exposes: formatFlag (the orchestrator's
//   VisualFormat → a producer's own CLI vocabulary) and channelEnvFor (the legacy
//   defaulting in front of the contract's channelEnvForEngine).
//
// Routing note (decided UPSTREAM, not here): a scrolly-format element is proposed with
// producer "scrolly" itself — suggest-chart/suggest-article never pair chart-native or
// map-native with format "scrolly", and both of those engines' produce.mjs fail hard on it.
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
