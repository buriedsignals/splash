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

// Both refusals below land BEFORE any I/O: an unknown or unimplemented destination must not
// create a directory, stage a file, or open a socket. That is the decor's second bite
// (preflight spec §3.4) expressed in the contract.
export async function publish(
  payload: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  const id = payload.settings.publisherId;
  // A missing/empty id also falls through as "unknown-publisher": no id names no adapter,
  // so it is the same refusal as a stale one — there is nothing separately "invalid" about
  // the shape here (that gate already ran in isPublishPayload, before this function saw it).
  const adapter =
    typeof id === "string" && id !== "" ? lookupPublisher(id) : undefined;
  if (!adapter)
    return fail(
      "unknown-publisher",
      `publish: no publisher registered as "${String(id)}"`,
    );
  if (!adapter.implemented)
    return fail(
      "not-implemented",
      `publish: "${id}" is declared but has no adapter yet`,
    );
  return adapter.publish(payload);
}
