// The `publish` verb — dispatch to a registered publisher adapter.
//
// The publisher id travels in `settings.publisherId` rather than as a payload field of its
// own: `settings` is the adapter-opaque bag (I3), and the destination IS an adapter concern.
// The shape gate below is explicit rather than schema-driven, exactly like isRenderPayload —
// every field is checked before anything touches the filesystem.
import {
  lookupPublisher,
  type PublishOutcome,
  type PublishRequest,
} from "../publishers";
import { isSafeId, unsafeIdMessage } from "../id-safety";
import { fail, type VerbResult } from "./types";

export function isPublishPayload(p: unknown): p is PublishRequest {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  const m = r.metadata as Record<string, unknown> | undefined;
  return (
    typeof r.artifactPath === "string" &&
    typeof r.id === "string" &&
    typeof r.outDir === "string" &&
    typeof r.settings === "object" &&
    r.settings !== null &&
    typeof r.credentials === "object" &&
    r.credentials !== null &&
    typeof m === "object" &&
    m !== null &&
    typeof m.title === "string" &&
    typeof m.altText === "string" &&
    typeof m.source === "string" &&
    typeof m.credit === "string" &&
    typeof m.lang === "string"
  );
}

// All three refusals below land BEFORE any I/O: a malformed, unknown, or unimplemented
// destination must not create a directory, stage a file, or open a socket. That is the
// decor's second bite (preflight spec §3.4) expressed in the contract.
export async function publish(
  payload: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  // The whole body sits inside one try/catch, mirroring render()'s own guard and for the
  // same reason: publish() is re-exported for direct calling (lib/core/publishers.ts already
  // anticipates it; the future lib/loop/deliver.ts will do it), bypassing runVerb's wrapper.
  // A rejected adapter promise must become engine-failed HERE too, not only at runVerb's
  // boundary, or a direct caller would see it escape with no catch of its own (I1).
  try {
    // Path-safety BEFORE any adapter is even looked up — same shape as render.ts's own guard.
    // A "package" publisher (zip today, more later) builds its output path directly from
    // `payload.id`; PublishRequest's own doc comment claims this is "checked before any path
    // resolution", but nothing upstream of an adapter actually enforced that until now. Zip
    // keeps its own copy of this check too (defence in depth for a direct caller), but the verb
    // is where it must not be optional — every future publisher inherits it for free here.
    if (!isSafeId(payload.id))
      return fail("invalid-request", unsafeIdMessage(payload.id));

    const id = payload.settings.publisherId;
    if (typeof id !== "string" || id === "")
      return fail(
        "invalid-request",
        "publish: settings.publisherId names the destination and was missing",
      );
    const adapter = lookupPublisher(id);
    if (!adapter)
      return fail(
        "unknown-publisher",
        `publish: no publisher registered as "${id}"`,
      );
    if (!adapter.implemented)
      return fail(
        "not-implemented",
        `publish: "${id}" is declared but has no adapter yet`,
      );
    return await adapter.publish(payload);
  } catch (e) {
    return fail("engine-failed", (e as Error)?.message ?? String(e));
  }
}
