import { isChannel, isVerb, isVisualFormat, VERBS } from "../vocabulary";
import { isPublishPayload, publish } from "./publish";
import { render } from "./render";
import { fail, type RenderPayload, type VerbResult } from "./types";

export * from "./types";
export { render } from "./render";
export { isPublishPayload, publish } from "./publish";

// Shape gate for the neutral payload. Explicit rather than schema-driven: the contract
// has one payload today, and every field must be checked before anything touches the
// filesystem. `spec` is deliberately unchecked — it is OPAQUE (invariant I3).
// The format/channel membership tests come from lib/core/vocabulary.ts, never from a
// local copy of the list: a hand-duplicated vocabulary here would drift from the union
// the payload type is built on, and this gate would start refusing valid payloads.
export function isRenderPayload(p: unknown): p is RenderPayload {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.engine === "string" &&
    typeof r.outDir === "string" &&
    typeof r.id === "string" &&
    isVisualFormat(r.format) &&
    isChannel(r.channel) &&
    "spec" in r
  );
}

// The single entry point of the execution contract. The verb name is checked against the
// CLOSED vocabulary: an operation outside it is refused mechanically, which is what
// "bounded verbs" means. Never throws (invariant I1).
//
// The whole body sits inside one try/catch. Each verb already guards its own paths, but
// this is the ONE function a host calls, and a host outside JavaScript has no `catch`: the
// invariant has to be STRUCTURAL at the boundary rather than an audit of everything below
// it. A residual throw (a broken registered manifest, a future verb body) becomes an
// engine-failed result here instead of escaping the contract.
export async function runVerb(
  verb: string,
  payload: unknown,
): Promise<VerbResult<unknown>> {
  try {
    if (!isVerb(verb))
      return fail(
        "invalid-request",
        `unknown verb "${verb}" — the contract declares ${VERBS.join(", ")}`,
      );
    if (verb === "publish") {
      if (!isPublishPayload(payload))
        return fail(
          "invalid-request",
          "publish: payload must carry artifactPath, id, metadata, settings, credentials and outDir",
        );
      return await publish(payload);
    }
    if (verb !== "render")
      return fail(
        "not-implemented",
        `verb "${verb}" is declared but has no implementation yet`,
      );
    if (!isRenderPayload(payload))
      return fail(
        "invalid-request",
        "render: payload must carry engine, spec, format, channel, outDir and id",
      );
    return await render(payload);
  } catch (e) {
    return fail("engine-failed", (e as Error)?.message ?? String(e));
  }
}
