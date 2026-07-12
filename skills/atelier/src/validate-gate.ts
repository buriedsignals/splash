// Tier-0 floor gate #1 — VALIDATION. The spine runs the producer's own validator on
// every accepted spec ITSELF, so a host that hand-rolled a spec and skipped the
// suggest-chart self-check (observed in 4/5 manual sessions) cannot ship an invalid or
// weak spec. This lives in CODE, at the spine, precisely because prose in a SKILL.md
// cannot force an LLM host to validate.
import type { AcceptedProposal } from "./producer-spec";
import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { validateMapSpec } from "../../map-dw/src/map-spec";
import {
  validateChoroplethConfig,
  validateSymbolConfig,
  validateLocatorConfig,
  validateRouteConfig,
  validateDotDensityConfig,
  validateHexGridConfig,
  validateCartogramConfig,
} from "../../map-native/src/validate-config";
import {
  specToNativeConfig,
  UnsupportedNativeType,
  type NativeSpec,
} from "../../chart-native/src/spec-to-config";
import { placeholderSourceReason } from "./source-guard";
import { guardrailParityViolations } from "./guardrail-parity";

export type ValidationOutcome =
  { ok: true; warnings: string[] } | { ok: false; errors: string[] };

// Every producer validator returns this shape (ok+spec+warnings | errors); we keep only
// ok/warnings/errors — the re-parsed spec is not needed here.
type RawResult =
  | { ok: true; warnings: string[]; spec?: unknown }
  | { ok: false; errors: string[] };

function strip(r: RawResult): ValidationOutcome {
  return r.ok
    ? { ok: true, warnings: r.warnings }
    : { ok: false, errors: r.errors };
}

// map-native is a discriminated family; pick the validator by the config's `type`
// (absent ⇒ choropleth, the mount default).
function validateMapNative(spec: unknown): ValidationOutcome {
  const type = (spec as { type?: string } | null)?.type;
  switch (type) {
    case "symbol":
      return strip(validateSymbolConfig(spec));
    case "locator":
      return strip(validateLocatorConfig(spec));
    case "route":
      return strip(validateRouteConfig(spec));
    case "dot-density":
      return strip(validateDotDensityConfig(spec));
    case "hex-grid":
      return strip(validateHexGridConfig(spec));
    case "cartogram":
      return strip(validateCartogramConfig(spec));
    default:
      return strip(validateChoroplethConfig(spec));
  }
}

// chart-native validates by construction: specToNativeConfig runs validateShape and
// throws UnsupportedNativeType for a type it cannot map. An unmapped type is NOT a
// validation failure — it is the FALLBACK_TO_DW path the dispatch already handles — so it
// passes here; only a genuinely malformed spec (bad shape) is rejected.
function validateNative(spec: unknown): ValidationOutcome {
  try {
    specToNativeConfig(spec as NativeSpec);
    return { ok: true, warnings: [] };
  } catch (e) {
    if (e instanceof UnsupportedNativeType) return { ok: true, warnings: [] };
    return { ok: false, errors: [e instanceof Error ? e.message : String(e)] };
  }
}

// scrolly mirrors Scrolly.tsx's own dispatch: a chart-track config carries `nativeType`
// and IS a chart-native NativeSpec (validate by construction, NOT as a DW ChartSpec); a
// map-track config is one of the map-native family (dispatch by `type`, choropleth
// default). Anything else here silently blocked valid symbol/hex-grid/dot-density/
// locator/cartogram and chart scrollies.
function validateScrolly(spec: unknown): ValidationOutcome {
  const hasNativeType =
    typeof (spec as { nativeType?: unknown } | null)?.nativeType === "string";
  return hasNativeType ? validateNative(spec) : validateMapNative(spec);
}

// GUARD 2 — placeholder source URL. Every producer spec carries `source: { name, url? }`
// (dw-chart, chart-native, map-dw, map-native, and both scrolly track kinds). A source
// URL whose host is an RFC 2606/6761 reserved placeholder domain (…example.com, .test,
// localhost, …) is a fabricated citation — reject it hard at the spine, for EVERY
// producer, before any producer runs. Only a PRESENT placeholder is caught; a missing URL
// is left to the producers' own leniency / Gate 2c (so the honest name-only prose
// fallback still passes).
function placeholderSourceError(spec: unknown): string | null {
  const url = (spec as { source?: { url?: unknown } } | null)?.source?.url;
  if (typeof url !== "string") return null;
  return placeholderSourceReason(url);
}

// GUARD 3 — Gate 1b presence lever. Every accepted proposal must carry the takeaway the
// journalist EXPLICITLY confirmed at CADRAGE Gate 1b, VERBATIM, as `confirmedTakeaway`.
// Whether the title semantically MATCHES that takeaway is not mechanizable (render-review's
// job, Gate 3a) — but its PRESENCE is: a proposal without one cannot prove Gate 1b ever
// fired, and the render-review has nothing authoritative to quote the title against.
// Required on ALL proposals (no guided/direct flag exists on the contract, and Gate 1b is
// un-skippable on both branches anyway). `confirmedTakeaway` is typed `string` but arrives
// via untyped JSON.parse at the CLI seam, so non-string/empty are both checked here.
function missingConfirmedTakeawayError(p: AcceptedProposal): string | null {
  const takeaway: unknown = p.confirmedTakeaway;
  if (typeof takeaway === "string" && takeaway.trim() !== "") return null;
  return (
    "missing confirmedTakeaway — every accepted proposal must record, VERBATIM, the " +
    "takeaway the journalist explicitly confirmed at CADRAGE Gate 1b (un-skippable on " +
    "both branches); confirm the takeaway with the journalist and set it before producing"
  );
}

// Run the producer-appropriate validator on an accepted proposal's spec, then the
// cross-producer source-URL guard (GUARD 2), then the deterministic guardrail-parity gate
// (ENFORCEMENT SLICE 2 — the deterministic guardrails that lived only in suggest-chart's
// eval, re-applied here so a hand-authored bypass must clear the same bar). A spec is
// accepted only when it clears the producer validator AND every re-applied deterministic
// guardrail; any violation fails validation before the producer ever runs.
export function validateAccepted(p: AcceptedProposal): ValidationOutcome {
  const outcome = validateByProducer(p);
  const extraErrors: string[] = [];
  const missingTakeaway = missingConfirmedTakeawayError(p);
  if (missingTakeaway) extraErrors.push(missingTakeaway);
  const placeholder = placeholderSourceError(p.spec);
  if (placeholder) extraErrors.push(placeholder);
  extraErrors.push(...guardrailParityViolations(p));
  if (extraErrors.length) {
    return {
      ok: false,
      errors: [...(outcome.ok ? [] : outcome.errors), ...extraErrors],
    };
  }
  return outcome;
}

function validateByProducer(p: AcceptedProposal): ValidationOutcome {
  switch (p.producer) {
    case "dw-chart":
      return strip(validateChartSpec(p.spec));
    case "map-dw":
      return strip(validateMapSpec(p.spec));
    case "map-native":
      return validateMapNative(p.spec);
    case "scrolly":
      return validateScrolly(p.spec);
    case "chart-native":
      return validateNative(p.spec);
    default: {
      // produce-all.mjs builds `accepted` from an untyped JSON.parse, so a hand-authored
      // report can carry a producer outside the union. Handle it as a validation FAILURE,
      // never a crash: produceAll reads `.ok` before its try/catch, so an undefined return
      // here would kill the whole batch and break the drop-proof invariant. The `never`
      // assignment keeps compile-time exhaustiveness — a new Producer member added above
      // fails to compile here until it is handled.
      const _exhaustive: never = p.producer;
      void _exhaustive;
      return {
        ok: false,
        errors: [
          `unknown producer "${String((p as { producer?: unknown }).producer)}"`,
        ],
      };
    }
  }
}
