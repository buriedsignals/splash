// The result shape of the source policy. Mirrors lib/core/verbs/types.ts's VerbResult on
// purpose — same discipline, same reasoning as lib/host/state.ts: a refusal is a VALUE, so a
// caller that cannot catch (a non-JS host, a verb bound by invariant I1) still gets an answer.
//
// The codes are the DOMAIN's own, not VERB_ERROR_CODES. Two reasons, both load-bearing:
// VERB_ERROR_CODES is a closed list in lib/core, which this slice may not widen; and collapsing
// "you gave no url", "you gave a homepage", "you declared nothing at all" and "synthetic cannot
// ship in a real run" onto one `invalid-request` would throw away the very distinction issue #7
// opens with — that the model cannot tell "no URL exists" from "the URL was not collected".
//
// toVerbResult() converts at the boundary for callers bound to the verb contract, keeping the
// domain code inside the message so nothing is actually lost in the conversion.
import { fail, ok, type VerbResult } from "../core/verbs/types";

export const SOURCE_POLICY_CODES = [
  /** Nothing was declared. Not a default, not an assumption — a refusal. */
  "source-undeclared",
  /** The kind requires a display label and none was given. */
  "missing-label",
  /** The kind publishes no label (only `none`), and one was given. */
  "label-not-allowed",
  /** The kind requires a public URL (only `public`) and none was given. */
  "missing-url",
  /** A URL was given but points at a site root, not a dataset/page. */
  "url-not-specific",
  /** The kind carries no publishable URL (`private`, `synthetic`, `none`). */
  "url-not-allowed",
  /** The kind keeps no internal reference (`public`, `local`, `prose`, `none`). */
  "internal-ref-not-allowed",
  /** Demo data in a run that claims to be reporting. */
  "synthetic-in-real-run",
  /** `none` was declared for a visual that asserts facts. */
  "source-required",
  /** A private reference reached something on its way out of the newsroom. */
  "private-leak",
  /** A figure rendered from a prose source is nowhere in the quoted text. */
  "prose-figure-ungrounded",
] as const;

export type SourcePolicyCode = (typeof SOURCE_POLICY_CODES)[number];

export type SourceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: SourcePolicyCode; message: string };

export function sourceOk<T>(value: T): SourceResult<T> {
  return { ok: true, value };
}

export function sourceFail(
  code: SourcePolicyCode,
  message: string,
): SourceResult<never> {
  return { ok: false, code, message };
}

/** Boundary conversion for callers bound by the verb contract. The domain code is preserved in
 *  the message — a verb caller can still tell the refusals apart without a second call. */
export function toVerbResult<T>(r: SourceResult<T>): VerbResult<T> {
  return r.ok
    ? ok(r.value)
    : fail("invalid-request", `${r.code}: ${r.message}`);
}
