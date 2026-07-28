// The `capture` verb — the contract's thin face over lib/verify/capture.ts.
//
// It owns exactly two things: the shape gate on the neutral payload, and the guarantee that
// nothing escapes as a throw (I1). Everything it knows about viewports, browsers and
// furniture lives in lib/verify, where it can be tested without a contract around it.
//
// The payload is NEUTRAL (I2): no RunManifest, no AcceptedProposal. It names a file, a
// format, a channel and where to write — a host outside JavaScript can build it from JSON.
import { isChannel, isVisualFormat } from "../vocabulary";
import {
  capture as runCapture,
  type CapturePayload,
} from "../../verify/capture";
import {
  FURNITURE_ROLES,
  HEIGHT_POLICIES,
  type CaptureResult,
  type FurnitureExpectation,
} from "../../verify/types";
import { fail, type VerbResult } from "./types";

// Explicit rather than schema-driven, the same way isRenderPayload is: every field is
// checked before anything touches the filesystem, and the vocabulary membership tests come
// from lib/core/vocabulary.ts rather than a local copy of the lists.
export function isCapturePayload(p: unknown): p is CapturePayload {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  // EXACTLY ONE deliverable is named: a file this run owns, or an address it does not. Both would
  // leave the record's subject ambiguous, neither leaves anything to open — and a host outside
  // JavaScript building this payload from JSON gets the same answer either way.
  const hasPath = typeof r.artifactPath === "string" && r.artifactPath !== "";
  const hasUrl = typeof r.artifactUrl === "string" && r.artifactUrl !== "";
  if (hasPath === hasUrl) return false;
  if (
    typeof r.outDir !== "string" ||
    typeof r.id !== "string" ||
    !isVisualFormat(r.format) ||
    !isChannel(r.channel)
  )
    return false;
  if (r.furniture !== undefined) {
    if (!Array.isArray(r.furniture)) return false;
    for (const f of r.furniture as FurnitureExpectation[])
      if (
        typeof f !== "object" ||
        f === null ||
        typeof f.text !== "string" ||
        !(FURNITURE_ROLES as readonly string[]).includes(f.role)
      )
        return false;
  }
  if (r.settleMs !== undefined && typeof r.settleMs !== "number") return false;
  // Membership, not `typeof string`: a payload declaring "contentDriven" or "row-driven" would
  // otherwise be accepted and then silently read as the default "pinned" — a guard relaxed by a
  // typo is exactly the failure this whole check exists to make impossible.
  if (
    r.heightPolicy !== undefined &&
    !(HEIGHT_POLICIES as readonly unknown[]).includes(r.heightPolicy)
  )
    return false;
  if (r.destination !== undefined) {
    const d = r.destination as Record<string, unknown>;
    if (typeof d !== "object" || d === null || typeof d.id !== "string")
      return false;
  }
  return true;
}

export const CAPTURE_PAYLOAD_MESSAGE =
  "capture: payload must carry EITHER artifactPath (a file this run owns) OR artifactUrl " +
  "(a published embed it does not), plus format, channel, outDir and id " +
  `(optional: destination, furniture[{role,text}] with role in ${FURNITURE_ROLES.join("|")}, settleMs, ` +
  `heightPolicy in ${HEIGHT_POLICIES.join("|")})`;

export async function capture(
  p: CapturePayload,
): Promise<VerbResult<CaptureResult>> {
  try {
    return await runCapture(p);
  } catch (e) {
    return fail("engine-failed", (e as Error)?.message ?? String(e));
  }
}

export type { CapturePayload, CaptureResult };
