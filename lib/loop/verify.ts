// The two deterministic verification steps of the loop: `capture` and `review`.
//
// lib/verify built both mechanisms and lib/core/verbs gave each a body — and nothing in
// production ever called either one. This module is the caller. It is deliberately thin: it
// translates a manifest element into the NEUTRAL payload each verb takes (invariant I2 — the
// contract knows nothing of RunManifest), runs it, and records the answer on the element. Every
// judgement about viewports, furniture, severity and provenance stays in lib/verify, where it
// is tested without a loop around it.
//
// A step never throws: it answers a VerbResult, the same shape produce() and deliver() answer,
// so the driver records a bounded failure event instead of catching an exception.
import { join } from "node:path";
import { fail, ok, runVerb, type VerbResult } from "../core/verbs";
import { toVerbResult, validateSourcePolicy } from "../source";
import { unitStatedIn } from "../core/locale";
import { destinationIdFor } from "../verify/viewport";
import { DEFAULT_REVIEW_RUBRIC } from "../verify/review";
import { heightPolicyFor } from "./assemble";
// The EFFECTIVE producer, resolved the one way every other reader resolves it — buildable.ts's
// header states the rule ("they must never disagree") and this was the reader that did not.
import { resolveBuilder } from "./buildable";
import type {
  CaptureResult,
  FurnitureExpectation,
  ReviewRecord,
} from "../verify/types";
import {
  channelForElement,
  chosenOption,
  fileArtifact,
  isHostedArtifact,
  provenanceHash,
  type RunElement,
  type RunManifest,
} from "./manifest";

/** Where review images live: a SIBLING of elements/ and deliveries/, never inside either.
 *  freshOutDir wipes elements/<id> before every re-produce — a review still written there
 *  would vanish under the very artifact it documents (the collision deliveries/ already paid
 *  for once, recorded in produce.ts). */
export function elementVerifyDir(runDir: string): string {
  return join(runDir, "verify");
}

/** The credit the artifact was RENDERED with — resolved exactly the way produce.ts resolves
 *  it, from the run's declared ledger. A furniture check that looked for a different string
 *  than the one painted would measure the wrong thing, and a review that invented a source
 *  name would report on a visual nobody built. */
function renderedSourceName(run: RunManifest): VerbResult<string> {
  const verdict = validateSourcePolicy(run.sources?.data, {
    mode: run.sources?.mode,
    carriesFactualData: true,
  });
  if (!verdict.ok) return toVerbResult(verdict);
  return ok(verdict.value.published.attribution);
}

// Furniture is declared as expected TEXT (lib/verify/types.ts): the only description that is
// true of all six engines at once and asks none of them to annotate its DOM. The loop knows
// all four strings because it commissioned them.
//
// EXPORTED so a proof can assert, without a browser, that the spec an engine is handed carries
// the very strings capture will go looking for. A proof that restated the four strings itself
// would drift from this function the day a fifth role is added, and drift is exactly how the
// dw-chart chain proof came to pin a defect the repo had already fixed.
export function furnitureFor(
  el: RunElement,
  sourceName: string,
): FurnitureExpectation[] {
  const angle = el.angle!;
  // THE UNIT HAS TWO TRUE SPELLINGS on a page, and which one is printed is not this
  // function's decision — it is the composer's. dw-chart's `introWithUnit` appends "(%)" to
  // the subtitle ONLY when the journalist's own sentence does not already state the unit, and
  // "…at 54 percent recycled" states it (lib/core/locale.ts's `unitStatedIn`, the one place
  // that fact lives). Naming only the symbol here would send capture hunting for a "%" that
  // chart correctly never prints, and file a blocking `furniture-missing` on a good chart —
  // the exact finding this repo spent eight days pinning for the opposite reason.
  const statedInWords = unitStatedIn(angle.altInsight, angle.unit);
  const unitAlternates: readonly string[] =
    statedInWords && statedInWords !== angle.unit.trim() ? [statedInWords] : [];
  const rows: FurnitureExpectation[] = [
    { role: "title", text: angle.confirmedTakeaway },
    {
      role: "unit",
      text: angle.unit,
      ...(unitAlternates.length ? { alternates: unitAlternates } : {}),
    },
    { role: "source", text: sourceName },
    { role: "alt-text", text: angle.altInsight },
  ];
  return rows.filter((f) => f.text.trim().length > 0);
}

/**
 * Put the produced deliverable in front of the container it publishes into, and measure it.
 *
 * The artifact comes from the MANIFEST, never from an argument: issue #3's first requirement
 * is that the preview and the review resolve "the current produced artifact … rather than
 * accepting an arbitrary path", and that property is worth exactly as much as the number of
 * places able to bypass it.
 */
export async function captureStep(
  run: RunManifest,
  el: RunElement,
  runDir: string,
): Promise<VerbResult<RunElement>> {
  if (!el.artifact)
    return fail("invalid-request", "capture: nothing produced to capture yet");
  if (!el.angle)
    return fail("invalid-request", "capture: the element carries no angle");
  const source = renderedSourceName(run);
  if (!source.ok) return source;

  const chosen = chosenOption(el);
  const format = chosen?.format ?? "static";
  const capturedProvenanceHash = provenanceHash(run, el);

  // A HOSTED DELIVERY OWNS NO FILE — so capture opens its ADDRESS instead of a path. That is the
  // whole difference: the browser lands on the published embed, the same measurement runs on the
  // same live DOM (furniture, root box, rendered title, the destination's own viewports), and
  // everything downstream of capture has something real to measure for the first time.
  //
  // It used to RECORD A GAP here, the third answer captureStep still gives a format lib/verify
  // cannot cover at all (video, below). That was honest while nothing could travel to a URL, and
  // it cost the loop ten clean interactive rows: review emitted its blocking `no-capture` finding
  // and the only way past it was a written override on every single embed. A recorded gap is for
  // a measurement this layer cannot make, and this one it can.
  //
  // An address that does not answer is therefore a REAL failure — the element stays on `capture`
  // (see lib/verify/capture.ts's response check) — never a gap, and never a silent pass.
  const artifact = el.artifact;
  const result = await runVerb("capture", {
    ...(isHostedArtifact(artifact)
      ? { artifactUrl: artifact.url }
      : { artifactPath: join(runDir, fileArtifact(artifact)!.path) }),
    format,
    channel: channelForElement(run, el),
    outDir: elementVerifyDir(runDir),
    id: el.id,
    furniture: furnitureFor(el, source.value),
    // WHAT SHAPE this deliverable has against its box — declared by the loop, which knows the
    // engine and the type it commissioned, and read by capture as neutral vocabulary. Without it
    // a Datawrapper bar chart's deliberately content-driven height reads as a `size-mismatch` on
    // a correct artifact, which is what kept nine of Datawrapper's chart types out of the offer.
    // Through resolveBuilder, never off `chosen.engine`: a chart-native option in the scrolly
    // format is built by skills/scrolly, and asking the table about the engine the option NAMES
    // rather than the one that BUILT it is how the five readers of buildable.ts come to disagree.
    heightPolicy: heightPolicyFor(
      chosen ? resolveBuilder(chosen) : undefined,
      chosen?.nativeType,
    ),
  });

  if (!result.ok) {
    // A format lib/verify cannot cover at all (today: video — frame extraction lives in the
    // engines' snap scripts). Routing back to `capture` forever would strand the element, and
    // skipping the chain would publish it unverified: the honest third answer is to RECORD the
    // gap. review then emits its blocking `no-capture` finding, and the only way past it is a
    // journalist's explicit override with a written reason (#11's ceremony, used for what it
    // was designed for).
    if (result.code === "not-implemented")
      return ok({
        ...el,
        capture: {
          images: [],
          checks: [],
          capturedProvenanceHash,
          unsupported: result.message,
        },
      });
    // Anything else — no browser, an unreadable deliverable, a page that answered an error —
    // is a real failure to fix, not a gap to record. The run stays on `capture`.
    return result;
  }

  const measured = result.value as CaptureResult;
  return ok({ ...el, capture: { ...measured, capturedProvenanceHash } });
}

/**
 * Turn the measured facts into a structured, attributed, severity-bearing record.
 *
 * `acceptedDestinationId` is derived from THIS deliverable's channel — the same value capture
 * stamped on every image. That is issue #10's second, independent catch: a still taken for
 * another destination is refused as non-probative even when every piece of furniture happens
 * to fit inside it.
 *
 * No adapter is passed, and that is a decision rather than an omission: an independent
 * semantic reviewer that sent unpublished reporting to a third-party service is refused (the
 * retention risk for a newsroom is real, and it contradicts this tool's local-first identity).
 * The record therefore reports `independentSemanticReview: "unavailable"` — never a pass.
 */
export async function reviewStep(
  run: RunManifest,
  el: RunElement,
  runDir: string,
): Promise<VerbResult<RunElement>> {
  if (!el.artifact)
    return fail("invalid-request", "review: nothing produced to review yet");
  if (!el.capture)
    return fail(
      "invalid-request",
      "review: nothing has been captured for this artifact yet — there is no rendered evidence to review",
    );
  if (!el.angle)
    return fail("invalid-request", "review: the element carries no angle");
  const source = renderedSourceName(run);
  if (!source.ok) return source;

  const channel = channelForElement(run, el);
  const result = await runVerb("review", {
    source: {
      format: chosenOption(el)?.format ?? "static",
      channel,
      confirmedTakeaway: el.angle.confirmedTakeaway,
      unit: el.angle.unit,
      altText: el.angle.altInsight,
      sourceName: source.value,
      // Bounded evidence extracts and interaction results are the two inputs this slice does
      // not have: the loop holds no article extracts, and the engines' interaction scripts are
      // not rehosted here. Empty, rather than falsely filled.
      evidenceExtracts: [],
      captures: el.capture.images,
      interactionResults: [],
      rubric: [...DEFAULT_REVIEW_RUBRIC],
    },
    checks: el.capture.checks,
    reviewedProvenanceHash: provenanceHash(run, el),
    acceptedDestinationId: destinationIdFor(channel),
    ...(el.capture.unsupported
      ? { captureUnavailable: el.capture.unsupported }
      : {}),
  });
  if (!result.ok) return result;
  return ok({ ...el, review: result.value as ReviewRecord });
}
