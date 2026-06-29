import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { validateMapSpec } from "../../map-dw/src/map-spec";
import { FAMILY_TYPES } from "./family-types";

export interface Score {
  validates: boolean;
  familyMatch: boolean;
  guardrailsOk: boolean;
  pass: boolean;
  notes: string[];
}

export interface Expectation {
  family: string;
  maxWarnings?: number;
  element?: "chart" | "map";
}

// Deterministic gate for a ②-emitted spec. The no-chart case (expect.family === "none")
// is scored apart: pass iff ② emitted { decision: "no-chart" }.
export function scoreSpec(spec: unknown, expect: Expectation): Score {
  const notes: string[] = [];

  if (expect.family === "none") {
    const isNoChart =
      !!spec &&
      typeof spec === "object" &&
      (spec as Record<string, unknown>).decision === "no-chart";
    if (!isNoChart)
      notes.push("expected a no-chart decision, got a chart spec");
    return {
      validates: isNoChart,
      familyMatch: isNoChart,
      guardrailsOk: isNoChart,
      pass: isNoChart,
      notes,
    };
  }

  const producer = (spec as Record<string, unknown> | null)?.["producer"];
  const isMap =
    producer === "map-dw" ||
    (!!spec && typeof spec === "object" && "basemap" in (spec as object));
  const wantMap = expect.element === "map";

  if (wantMap !== isMap) {
    notes.push(
      wantMap
        ? "expected a map, got a chart — the spatial pattern is the story (Gate 5)"
        : "expected a chart, got a map — ranking/magnitude should stay bars (Gate 5)",
    );
    return {
      validates: false,
      familyMatch: false,
      guardrailsOk: false,
      pass: false,
      notes,
    };
  }

  if (isMap) {
    const v = validateMapSpec(spec);
    if (!v.ok) notes.push(...v.errors);
    const warns = v.ok ? v.warnings.length : Infinity;
    const guardrailsOk = warns <= (expect.maxWarnings ?? 0);
    if (!guardrailsOk)
      notes.push(`map: ${warns} warnings > ${expect.maxWarnings ?? 0}`);
    return {
      validates: v.ok,
      familyMatch: true, // a map is its own element; family is geographic by construction
      guardrailsOk,
      pass: v.ok && guardrailsOk,
      notes,
    };
  }

  const v = validateChartSpec(spec);
  const validates = v.ok;
  if (!v.ok) notes.push("invalid: " + v.errors.join("; "));

  const type =
    spec && typeof spec === "object"
      ? (spec as Record<string, unknown>).type
      : undefined;
  const allowed = FAMILY_TYPES[expect.family] ?? [];
  const familyMatch = typeof type === "string" && allowed.includes(type);
  if (!familyMatch)
    notes.push(
      `type ${type} not in family ${expect.family} [${allowed.join(",")}]`,
    );

  const guardrailsOk = v.ok && v.warnings.length <= (expect.maxWarnings ?? 0);
  if (v.ok && !guardrailsOk) notes.push("warnings: " + v.warnings.join("; "));

  return {
    validates,
    familyMatch,
    guardrailsOk,
    pass: validates && familyMatch && guardrailsOk,
    notes,
  };
}
