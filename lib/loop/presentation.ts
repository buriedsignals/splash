// ② SHARED-AND-OPENED, AS A PRECONDITION OF ASKING FOR A VERDICT.
//
// Decision (b) of the spec: not "prove the journalist looked" — he looks, that is his job. Splash
// opens, that is Splash's. A medium is displayed or played; an HTML is LAUNCHED. Reading the
// source of an HTML shows nothing, which is the trap the first version of this rule contained.
//
// So what is recorded is an ACTION and its subject: something was opened, these were its bytes.
// The second half is what makes it worth anything — approval binds to the same digest, so
// "shown" and "approved" name the same bytes. Show one image and approve another, and the gate
// says so.
//
// THE OPENING ITSELF IS NOT REIMPLEMENTED: lib/loop/preview.ts's `present` already resolves the
// platform's viewer, honours SPLASH_NO_VIEWER and SPLASH_PREVIEW_OPENER, deduces a headless Linux
// session, and writes its own fallback reason — never one supplied by a caller (:67-70). What
// this module adds is the receipt, and a directory the prose chain can reach without a manifest.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, type VerbResult } from "../core/verbs";
import { routed, type RoutedRefusal } from "../core/routed-refusal";
import { present } from "./preview";

/** Where the receipts live: beside the artifact, in a directory whose name says what it holds. */
export const SHOWN_DIR = "_shown";

export type ShownReceipt = {
  /** The absolute path that was opened. */
  path: string;
  /** The bytes that were opened — re-read and re-hashed here, never taken from an argument. */
  sha256: string;
  presentedAs: "opened" | "path-printed";
  fallbackReason?: string;
  presentedAt: string;
};

function receiptPath(absolutePath: string): string {
  return join(
    dirname(absolutePath),
    SHOWN_DIR,
    `${basename(absolutePath)}.json`,
  );
}

/**
 * OPEN THE ARTIFACT, AND RECORD THAT IT WAS OPENED.
 *
 * The digest is computed from the file on disk at the moment of showing, so the receipt cannot
 * describe bytes other than the ones a viewer was pointed at. Never throws (invariant I1): an
 * unreadable file, an unwritable directory and a viewer that exits non-zero are three different
 * values, not three exceptions.
 */
export function presentArtifact(
  absolutePath: string,
  env: Record<string, string | undefined> = process.env,
): VerbResult<ShownReceipt> {
  const path = resolve(absolutePath);
  let digest: string;
  try {
    digest = Buffer.from(sha256(readFileSync(path))).toString("hex");
  } catch (e) {
    return fail(
      "engine-failed",
      `present: cannot read ${path}: ${(e as Error)?.message ?? String(e)}`,
    );
  }
  const presentation = present(path, env);
  const receipt: ShownReceipt = {
    path,
    sha256: digest,
    presentedAt: new Date().toISOString(),
    ...presentation,
  };
  try {
    mkdirSync(dirname(receiptPath(path)), { recursive: true });
    writeFileSync(receiptPath(path), JSON.stringify(receipt, null, 2) + "\n");
  } catch (e) {
    return fail(
      "engine-failed",
      `present: the artifact was opened but the record could not be written beside it: ${(e as Error)?.message ?? String(e)}`,
    );
  }
  return ok(receipt);
}

/** The receipt for this artifact, or null when nothing has been shown. */
export function shownReceipt(absolutePath: string): ShownReceipt | null {
  const p = receiptPath(resolve(absolutePath));
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ShownReceipt;
  } catch {
    // An unreadable receipt is not a presentation. Treated as absent rather than repaired:
    // the way out is to show the artifact again, which costs one command.
    return null;
  }
}

/**
 * WAS THIS EXACT SUBJECT SHOWN — the same bytes a verdict is about to be recorded over?
 *
 * Two different refusals, because they are two different situations for a journalist: nothing was
 * ever shown, and something else was. The second is the one worth a distinct sentence — the
 * visual moved under a verdict somebody already gave.
 */
export function shownCovers(
  absolutePath: string,
  sha256hex: string,
): RoutedRefusal | null {
  const receipt = shownReceipt(absolutePath);
  if (!receipt)
    return routed(
      "render-not-shown",
      "nobody has been shown this visual yet, so there is nothing to have an opinion about",
    );
  if (receipt.sha256 !== sha256hex)
    return routed(
      "approval-subject-mismatch",
      `the visual has changed since it was last shown (what was shown was ${receipt.sha256.slice(0, 12)}…, what is here now is ${sha256hex.slice(0, 12)}…)`,
    );
  return null;
}
