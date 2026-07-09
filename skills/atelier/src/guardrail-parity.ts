// ENFORCEMENT SLICE 2 — re-apply suggest-chart's DETERMINISTIC guardrails at the produce
// boundary. There is NO trust boundary between the orchestrator and suggest-chart: they
// are the same LLM, so a spec's provenance is unforgeable — "did suggest-chart really
// produce this?" cannot be proven. The tractable defense is to re-run, in CODE at the
// spine, every DETERMINISTIC guardrail suggest-chart's eval (scoreSpec) applies, so a
// HAND-AUTHORED spec that skipped suggest-chart must clear the identical bar.
//
// The per-producer validators (validateChartSpec / validateMapSpec / validateShape …) and
// the placeholder source guard already run in validate-gate.ts. THIS module adds the
// deterministic checks that lived ONLY in scoreSpec (skills/suggest-chart/eval/score.ts)
// and were therefore bypassable by writing a spec straight into accepted.json:
//   (A) the aspect↔type guard  — a portrait/square channel can't host a row-driven
//       horizontal chart type (DW crops the overflowing rows on PNG export);
//   (B) chart-native furniture  — an insight title + a source name are present;
//   (C) chart-native subject-fit — a declared non-water subject is not painted on a
//       blue-family hue (the "everything is blue" defect, whole blue family).
//
// OUT OF SCOPE (documented, not wired): scoreSpec's GOLD-dependent checks — element match
// (expect.element), producer match (expect.producer), family match (expect.family) — have
// no gold at produce (the producer IS the chosen element, and the spec is already the
// committed producer's), and the `warnings ≤ maxWarnings` quality bar is a suggester
// scorecard, not a produce gate (produce keeps validator warnings advisory, surfaced at
// the render gate by design). Mirrors source-guard.ts's pure+tested style.

import { CHANNELS, normalizeChannel, type Channel } from "./channel";
import type { AcceptedProposal } from "./producer-spec";
import { isRowDriven } from "../../dw-chart/src/export-aspect";
import {
  BLUE_FIT_SUBJECT,
  DEFAULT_BASE_COLOR,
  type ChartType,
} from "../../dw-chart/src/chart-spec";

function asObject(spec: unknown): Record<string, unknown> | null {
  return spec && typeof spec === "object"
    ? (spec as Record<string, unknown>)
    : null;
}

// (A) Aspect↔type guard. A portrait (social-vertical) or square (social-feed) channel
// can never host a row-driven horizontal chart type (`d3-bars`, `d3-dot-plot`,
// `d3-arrow-plot`, `d3-range-plot`, …): those grow with row count and Datawrapper's PNG
// export CROPS the overflow into a vertical/square box (silent data loss). Mirrors the
// deterministic guard in scoreSpec — reads the chart type off `spec.type`. A native spec
// carries `nativeType` (not `type`) and renders to a fixed canvas rather than a cropped
// DW export, so it is intentionally not caught here (same as scoreSpec). Pure.
export function aspectTypeViolation(
  channel: Channel,
  spec: unknown,
): string | null {
  const aspect = CHANNELS[channel].aspect;
  if (aspect !== "portrait" && aspect !== "square") return null;
  const type = asObject(spec)?.["type"];
  if (typeof type === "string" && isRowDriven(type as ChartType)) {
    return `row-driven type '${type}' cannot take a ${aspect} ('${channel}') channel — it grows with row count and Datawrapper crops the overflow; route to a vertical column type instead`;
  }
  return null;
}

// The effective channel for the aspect gate. The CADRAGE channel lives on the proposal
// (AcceptedProposal.channel, §5b), but a hand-authored bypass might carry it ONLY on the
// spec's own free-text `channel` field (ChartSpec.channel) — read that as a fallback so
// the guard is not sidestepped by moving the channel down onto the spec. Unknown / absent
// → article-web (landscape), matching produce-all's own default. Pure.
export function resolveGuardChannel(
  p: Pick<AcceptedProposal, "channel" | "spec">,
): Channel {
  const fromProposal = typeof p.channel === "string" ? p.channel : undefined;
  const fromSpec = asObject(p.spec)?.["channel"];
  const raw =
    fromProposal ?? (typeof fromSpec === "string" ? fromSpec : undefined);
  return normalizeChannel(raw);
}

// (B) chart-native furniture. scoreSpec's native branch requires a non-empty insight
// title AND a source name; validateNative (specToNativeConfig) only checks the DATA
// SHAPE, so a titleless / sourceless native spec passed the spine and only blew up later
// inside produce.mjs conformance. Re-apply the presence check here so it fails cleanly at
// the gate. (url stays optional — the honest name-only prose fallback carries no URL.)
// Pure.
export function nativeFurnitureViolations(spec: unknown): string[] {
  const s = asObject(spec);
  const out: string[] = [];
  const title = typeof s?.["title"] === "string" ? s["title"].trim() : "";
  if (!title) out.push("chart-native spec is missing an insight title");
  const source = asObject(s?.["source"]);
  const name =
    typeof source?.["name"] === "string" ? source["name"].trim() : "";
  if (!name) out.push("chart-native spec is missing a source name");
  return out;
}

// The blue FAMILY — both hexes read as "blue" (water/cold/sky) to a reader. The library
// default #0072B2 AND the lighter sky #56B4E9: swapping one for the other is the SAME
// defect with a different hex (found shipped live on a cross-border-commuting chart).
const BLUE_FAMILY = new Set<string>([DEFAULT_BASE_COLOR, "#56B4E9"]);

// (C) chart-native subject-fit. dw-chart's validateChartSpec hard-fails a declared
// non-water subject left on the default blue; the native path has the same "everything is
// blue" defect but only caught it downstream in produce.mjs conformance (and only for the
// palette-wired types). Re-apply the deterministic core here for EVERY native type: a
// declared, non-blue-fit subject painted on an EXPLICIT blue-family baseColor is rejected.
// Only an explicit blue hex is caught (not an absent baseColor): a native multi-series
// type legitimately omits baseColor and is coloured from a palette — that ambiguous case
// stays with produce.mjs conformance, which knows the type. Reuses BLUE_FIT_SUBJECT from
// chart-spec.ts so the two never drift. Pure.
export function nativeSubjectFitViolation(spec: unknown): string | null {
  const s = asObject(spec);
  const subject = typeof s?.["subject"] === "string" ? s["subject"].trim() : "";
  if (!subject || BLUE_FIT_SUBJECT.test(subject)) return null;
  const baseColor = s?.["baseColor"];
  if (typeof baseColor === "string" && BLUE_FAMILY.has(baseColor)) {
    return `subject "${subject}" is painted on the blue-family hue ${baseColor} — blue reads as water/cold; choose a subject-fit Okabe-Ito hue (housing/cost → amber, labour/flow → vermilion, …)`;
  }
  return null;
}

// Compose the deterministic guardrail-parity violations for one accepted proposal. Called
// by validateAccepted at the spine (validate-gate.ts). Returns [] when the proposal clears
// every re-applied deterministic guardrail. Pure.
export function guardrailParityViolations(p: AcceptedProposal): string[] {
  const out: string[] = [];
  const channel = resolveGuardChannel(p);
  const aspect = aspectTypeViolation(channel, p.spec);
  if (aspect) out.push(aspect);
  if (p.producer === "chart-native") {
    out.push(...nativeFurnitureViolations(p.spec));
    const subjectFit = nativeSubjectFitViolation(p.spec);
    if (subjectFit) out.push(subjectFit);
  }
  return out;
}
