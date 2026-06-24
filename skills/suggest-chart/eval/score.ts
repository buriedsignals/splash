import { validateChartSpec } from "../../dw-chart/src/chart-spec";
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
