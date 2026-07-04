// The PURE filter core (no React, no map). Declares the filter kinds, derives concrete control
// options from the data rows, and turns a filter STATE into a MapLibre filter expression.
// category/range → a setFilter expression; time is applied by the component via the frame model.

export type MapFilter =
  | { kind: "category"; field: string; label?: string }
  | {
      kind: "range";
      field: string;
      label?: string;
      mode?: "atLeast" | "atMost" | "between";
    }
  | { kind: "time"; field: string; label?: string };

export type FilterOption =
  | { kind: "category"; field: string; label: string; values: string[] }
  | {
      kind: "range";
      field: string;
      label: string;
      min: number;
      max: number;
      step: number;
      mode: "atLeast" | "atMost" | "between";
    }
  | { kind: "time"; field: string; label: string; steps: number[] };

// field → value(s): category = the visible values; range = threshold (atLeast/atMost) or [lo,hi]
// (between); time = the selected step.
export type FilterState = Record<string, unknown>;

const humanise = (f: string) =>
  f.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const distinct = <T>(xs: T[]) => [...new Set(xs)];

function niceStep(min: number, max: number): number {
  const span = Math.max(1e-9, max - min);
  const raw = span / 20; // ~20 stops
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

export function deriveFilterOptions(
  filters: MapFilter[],
  rows: Record<string, unknown>[],
): FilterOption[] {
  return filters.map((f): FilterOption => {
    if (f.kind === "category") {
      const values = distinct(rows.map((r) => String(r[f.field]))).sort();
      return {
        kind: "category",
        field: f.field,
        label: f.label ?? humanise(f.field),
        values,
      };
    }
    if (f.kind === "range") {
      const nums = rows
        .map((r) => Number(r[f.field]))
        .filter((n) => Number.isFinite(n));
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return {
        kind: "range",
        field: f.field,
        label: f.label ?? humanise(f.field),
        min,
        max,
        step: niceStep(min, max),
        mode: f.mode ?? "atLeast",
      };
    }
    const steps = distinct(rows.map((r) => Number(r[f.field])))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return {
      kind: "time",
      field: f.field,
      label: f.label ?? humanise(f.field),
      steps,
    };
  });
}

// A MapLibre FilterSpecification; typed loosely to avoid a hard SDK dependency in the core.
export type FilterExpression = unknown[];

export function filterStateToExpression(
  state: FilterState,
  options: FilterOption[],
): FilterExpression {
  const clauses: unknown[] = [];
  for (const o of options) {
    if (o.kind === "category") {
      const visible = (state[o.field] as string[] | undefined) ?? o.values;
      // constrain ONLY when something is hidden (fewer visible than the full set)
      if (visible.length < o.values.length)
        clauses.push(["in", ["get", o.field], ["literal", [...visible]]]);
    } else if (o.kind === "range") {
      if (o.mode === "between") {
        const [lo, hi] = (state[o.field] as [number, number] | undefined) ?? [
          o.min,
          o.max,
        ];
        if (lo > o.min) clauses.push([">=", ["get", o.field], lo]);
        if (hi < o.max) clauses.push(["<=", ["get", o.field], hi]);
      } else {
        const t =
          (state[o.field] as number | undefined) ??
          (o.mode === "atMost" ? o.max : o.min);
        if (o.mode === "atMost") {
          if (t < o.max) clauses.push(["<=", ["get", o.field], t]);
        } else if (t > o.min) clauses.push([">=", ["get", o.field], t]);
      }
    }
    // time is NOT a setFilter clause — the component applies it via the frame model.
  }
  return ["all", ...clauses];
}

export function activeTimeStep(
  state: FilterState,
  options: FilterOption[],
): number | null {
  const t = options.find((o) => o.kind === "time");
  if (!t || t.kind !== "time" || !t.steps.length) return null;
  const sel = state[t.field] as number | undefined;
  return sel != null ? sel : t.steps[t.steps.length - 1]; // default = latest
}

export function validateMapFilters(
  filters: MapFilter[] | undefined,
  rows: Record<string, unknown>[],
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!filters || filters.length === 0) return { ok: true };
  if (filters.length > 2) errors.push("at most 2 filters per map");
  const cols = new Set(rows.length ? Object.keys(rows[0]) : []);
  for (const f of filters) {
    if (!cols.has(f.field)) {
      errors.push(`filter field "${f.field}" is not a data column`);
      continue;
    }
    if (f.kind === "category") {
      const n = new Set(rows.map((r) => String(r[f.field]))).size;
      if (n < 2 || n > 8)
        errors.push(
          `category "${f.field}" needs 2–8 distinct values (has ${n})`,
        );
    } else if (f.kind === "range") {
      if (!rows.every((r) => Number.isFinite(Number(r[f.field]))))
        errors.push(`range "${f.field}" must be numeric`);
    } else {
      const steps = new Set(rows.map((r) => Number(r[f.field]))).size;
      if (steps < 2) errors.push(`time "${f.field}" needs ≥2 steps`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
