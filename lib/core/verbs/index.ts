import { isVerb, VERBS } from "../vocabulary";
import { render } from "./render";
import { fail, type RenderPayload, type VerbResult } from "./types";

export * from "./types";
export { render } from "./render";

const FORMATS = ["static", "interactive", "video", "scrolly"];
const CHANNELS = ["social-vertical", "social-feed", "article-web"];

// Shape gate for the neutral payload. Explicit rather than schema-driven: the contract
// has one payload today, and every field must be checked before anything touches the
// filesystem. `spec` is deliberately unchecked — it is OPAQUE (invariant I3).
export function isRenderPayload(p: unknown): p is RenderPayload {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.engine === "string" &&
    typeof r.outDir === "string" &&
    typeof r.id === "string" &&
    typeof r.format === "string" &&
    FORMATS.includes(r.format) &&
    typeof r.channel === "string" &&
    CHANNELS.includes(r.channel) &&
    "spec" in r
  );
}

// The single entry point of the execution contract. The verb name is checked against the
// CLOSED vocabulary: an operation outside it is refused mechanically, which is what
// "bounded verbs" means. Never throws (invariant I1).
export async function runVerb(
  verb: string,
  payload: unknown,
): Promise<VerbResult<unknown>> {
  if (!isVerb(verb))
    return fail(
      "invalid-request",
      `unknown verb "${verb}" — the contract declares ${VERBS.join(", ")}`,
    );
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
  return render(payload);
}
