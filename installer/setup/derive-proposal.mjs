import { createOutboundFetchPolicy } from "./outbound-fetch.mjs";
import { deriveCharter } from "../../skills/newsroom-charter/scripts/derive-charter.mjs";

function boundedText(value, limit = 2048) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

export async function deriveNewsroomProposal(url) {
  const policy = createOutboundFetchPolicy();
  let pageRequest = true;
  const fetchFn = async (target, options = {}) => {
    const kind = pageRequest ? "page" : "stylesheet";
    pageRequest = false;
    return policy.fetch(target, { kind, signal: options.signal });
  };
  try {
    const result = await deriveCharter({ url, fetchFn, timeoutMs: 12_000, maxStylesheets: 4 });
    if (!result.ok) {
      const privateAddress = /private|local|reserved|disallowed port/i.test(result.error ?? "");
      return {
        ok: false,
        code: privateAddress ? "manual-entry-required" : "derivation-failed",
        message: privateAddress
          ? "Private and intranet newsroom sites use manual branding entry in this release."
          : "The public newsroom site could not be read safely.",
        askInstead: result.askInstead?.slice(0, 6).map((value) => boundedText(value)) ?? [],
      };
    }
    const fields = {};
    for (const field of ["name", "languages", "brandColor", "accents", "ground", "typefaces"]) {
      const value = result.fields?.[field];
      fields[field] = value ? {
        value: boundedText(value.value, 4096),
        source: boundedText(value.source),
        evidence: boundedText(value.evidence, 4096),
      } : null;
    }
    return {
      ok: true,
      url: boundedText(result.url, 4096),
      fields,
      unresolved: result.unresolved?.filter((field) => Object.hasOwn(fields, field)) ?? [],
      nothingFurther: result.nothingFurther?.filter((field) => Object.hasOwn(fields, field)) ?? [],
      legibility: result.legibility ?? null,
      stylesheetsRead: result.stylesheetsRead?.slice(0, 4).map((value) => boundedText(value, 4096)) ?? [],
      bytesRead: policy.bytesRead,
    };
  } catch (error) {
    const privateAddress = /private|local|reserved|disallowed port/i.test(error?.message ?? "");
    return {
      ok: false,
      code: privateAddress ? "manual-entry-required" : "derivation-failed",
      message: privateAddress
        ? "Private and intranet newsroom sites use manual branding entry in this release."
        : "The public newsroom site could not be read safely.",
      askInstead: ["Enter the newsroom name, colours, languages, and typefaces manually."],
    };
  }
}
