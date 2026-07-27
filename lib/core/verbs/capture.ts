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
  if (
    typeof r.artifactPath !== "string" ||
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
  if (r.destination !== undefined) {
    const d = r.destination as Record<string, unknown>;
    if (typeof d !== "object" || d === null || typeof d.id !== "string")
      return false;
  }
  return true;
}

export const CAPTURE_PAYLOAD_MESSAGE =
  "capture: payload must carry artifactPath, format, channel, outDir and id " +
  `(optional: destination, furniture[{role,text}] with role in ${FURNITURE_ROLES.join("|")}, settleMs)`;

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
