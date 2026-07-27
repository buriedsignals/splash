// The preview step — issue #3: "Gate 3 must automatically present the actual preview before
// approval", mechanically rather than as prose asking someone to look.
//
// What the issue describes happened because the instruction lived in a skill document: Splash
// reached the approval gate having linked a review still, and opened the real interactive only
// once the journalist asked how to see the result. A sentence in a document is skippable. What
// is not skippable is a RECORD the approval step requires and can type-check — and that record
// can only be written here, by the one step that resolves the deliverable from the manifest.
//
// Four things this step guarantees, each of them a refusal when it fails:
//   1. the file shown is the artifact the RUN produced (never a path an argument named);
//   2. its bytes are still the bytes the manifest recorded;
//   3. it is the pinned format's OWN deliverable — a png cannot preview an interactive;
//   4. the presentation actually happened, and how it happened is recorded truthfully.
//
// What it cannot guarantee is that human eyes hit the pixels. Nothing can. So the record says
// exactly what the machine did and no more.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, type VerbResult } from "../core/verbs";
import { isDeliverableOf } from "../verify/preview";
import type { PreviewRecord, ReviewRecord } from "../verify/types";
import { chosenOption, type RunElement, type RunManifest } from "./manifest";

/** Set when the HOST presents the deliverable itself — an agent embedding the image in its
 *  transcript — or when the machine has no display at all. The spine then prints the path
 *  instead of launching anything, and says so in the record. */
export const NO_VIEWER_VAR = "SPLASH_NO_VIEWER";
/** A viewer command to use instead of the platform's own. A remote box, a newsroom's own
 *  script. It receives the absolute path of the deliverable as its single argument. */
export const OPENER_VAR = "SPLASH_PREVIEW_OPENER";

export type PreviewOpts = {
  /** The environment the presentation is resolved against. Defaults to the process's own —
   *  this module is in lib/loop, the layer that already reads the environment (deliver.ts),
   *  never in lib/verify or in a verb, where invariant I5 forbids it. */
  env?: Record<string, string | undefined>;
};

type Presentation =
  | { presentedAs: "opened" }
  | { presentedAs: "path-printed"; fallbackReason: string };

// The platform's own opener. `null` when this platform has none we can name — better an
// honest fallback than a command that does not exist.
function platformOpener(): string[] | null {
  if (process.platform === "darwin") return ["open"];
  if (process.platform === "win32") return ["cmd", "/c", "start", ""];
  return ["xdg-open"];
}

/**
 * Show the file, and report what actually happened.
 *
 * Never throws and never fails the step: a machine with no viewer is an ordinary machine, not
 * a broken run. What it must never do is claim `opened` when nothing opened — the fallback
 * reason is written HERE, from the signal that caused it, and is never supplied by a caller.
 */
export function present(
  absolutePath: string,
  env: Record<string, string | undefined>,
): Presentation {
  const suppressed = (env[NO_VIEWER_VAR] ?? "").trim();
  if (suppressed && suppressed !== "0")
    return {
      presentedAs: "path-printed",
      fallbackReason: `${NO_VIEWER_VAR} is set: the host presents the deliverable itself, or this machine has no viewer — the absolute path is the presentation`,
    };
  // A Linux session with no display server cannot open anything, and xdg-open would hang or
  // fail obscurely. Deduced rather than configured, because it is a fact about the machine.
  if (
    process.platform !== "darwin" &&
    process.platform !== "win32" &&
    !env.DISPLAY &&
    !env.WAYLAND_DISPLAY
  )
    return {
      presentedAs: "path-printed",
      fallbackReason:
        "no display server on this machine (neither DISPLAY nor WAYLAND_DISPLAY is set) — the absolute path is the presentation",
    };

  const configured = (env[OPENER_VAR] ?? "").trim();
  const command = configured ? [configured] : platformOpener();
  if (!command)
    return {
      presentedAs: "path-printed",
      fallbackReason: `no viewer command is known for platform "${process.platform}" — set ${OPENER_VAR} to one, or read the absolute path`,
    };

  try {
    const spawned = Bun.spawnSync([...command, absolutePath], {
      stdout: "ignore",
      stderr: "pipe",
    });
    if (spawned.exitCode === 0) return { presentedAs: "opened" };
    return {
      presentedAs: "path-printed",
      fallbackReason: `the viewer ${command.join(" ")} exited ${spawned.exitCode} — the absolute path is the presentation`,
    };
  } catch (e) {
    return {
      presentedAs: "path-printed",
      fallbackReason: `the viewer ${command.join(" ")} could not be run (${(e as Error).message}) — the absolute path is the presentation`,
    };
  }
}

/**
 * Present the produced deliverable, and record that it was presented.
 *
 * The record lands inside `el.review.preview`, which is where approvalDecision reads it — so
 * the order of the chain (capture → review → preview → approve) is a precondition this step
 * enforces rather than hopes for.
 */
export function previewStep(
  run: RunManifest,
  el: RunElement,
  runDir: string,
  opts: PreviewOpts = {},
): VerbResult<RunElement> {
  if (!el.artifact)
    return fail("invalid-request", "preview: nothing produced to present yet");
  const review = el.review as ReviewRecord | undefined;
  if (!review)
    return fail(
      "invalid-request",
      "preview: this artifact has not been reviewed yet — the preview is recorded on the review of the artifact it presents",
    );

  const format = chosenOption(el)?.format ?? "static";
  const absolutePath = resolve(join(runDir, el.artifact.path));

  // The genre gate, applied BEFORE anything is shown: a png standing in for an interactive is
  // the substitution issue #3 names, and presenting it would produce a record that passes the
  // eye test and fails the contract.
  if (!isDeliverableOf(format, absolutePath))
    return fail(
      "invalid-request",
      `preview: ${el.artifact.path} is not the deliverable of a "${format}" element — presenting it would show something other than what would be published`,
    );

  let digest: string;
  try {
    digest = Buffer.from(sha256(readFileSync(absolutePath))).toString("hex");
  } catch (e) {
    return fail(
      "engine-failed",
      `preview: cannot read the deliverable at ${el.artifact.path}: ${(e as Error).message}`,
    );
  }
  // Re-hashed rather than trusted: a preview whose bytes are not the recorded artifact's is
  // exactly the "stale bytes" case the gate refuses, and the manifest's own invariant would
  // reject the record anyway. Refusing here says WHY.
  if (digest !== el.artifact.sha256)
    return fail(
      "engine-failed",
      `preview: the file at ${el.artifact.path} is no longer the artifact this run recorded (it has changed on disk) — produce it again before presenting it`,
    );

  const presentation = present(absolutePath, opts.env ?? process.env);
  const preview: PreviewRecord = {
    deliverablePath: absolutePath,
    deliverableSha256: digest,
    presentedAt: new Date().toISOString(),
    ...presentation,
  };
  return ok({ ...el, review: { ...review, preview } });
}
