import type { ChartSpec } from "./chart-spec";
import { renameColumns, sortCsv, valueAt } from "./csv";

export interface DwPatch {
  title: string;
  type: string;
  metadata: {
    describe: Record<string, unknown>;
    visualize: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
}

// The single source of truth for the CSV that reaches Datawrapper: apply the
// human column labels first, then the ranking sort. Both the data upload and
// the metadata mapping (annotation y-derivation) must see the SAME CSV, so
// resolve it once here.
export function resolveData(spec: ChartSpec): string {
  let csv = spec.data;
  if (spec.seriesLabels) csv = renameColumns(csv, spec.seriesLabels);
  if (spec.sort) csv = sortCsv(csv, spec.sort);
  return csv;
}

export function specToMetadata(spec: ChartSpec): DwPatch {
  const csv = resolveData(spec);

  const describe: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": spec.source?.name ?? "",
    "source-url": spec.source?.url ?? "",
    "aria-description": spec.altInsight,
  };
  describe["number-format"] = spec.numberFormat ?? "0,0.[00]";

  const visualize: Record<string, unknown> = {};
  // bar/column value labels honour `value-label-format`, NOT describe.number-format
  if (spec.numberFormat) visualize["value-label-format"] = spec.numberFormat;
  // The numeric axis honours `y-grid-format` (numeral.js token). Prefer an
  // explicit valueFormat (e.g. '$0,0a' currency, or '00:00:00' → h:mm:ss for a
  // seconds axis), else fall back to the number format so the axis and the
  // value labels stay in sync.
  const axisFormat = spec.valueFormat ?? spec.numberFormat;
  if (axisFormat) visualize["y-grid-format"] = axisFormat;
  if (spec.baseColor) visualize["base-color"] = spec.baseColor;
  if (spec.valueLabels !== undefined)
    visualize["value-labels"] = { show: spec.valueLabels };
  if (spec.seriesColors) visualize["custom-colors"] = spec.seriesColors;
  if (spec.annotations && spec.annotations.length) {
    visualize["text-annotations"] = spec.annotations.map((a) => {
      // Resolve the series column name AFTER renaming, so an annotation pinned
      // to a machine-named column still finds its (renamed) series.
      const column =
        a.column && spec.seriesLabels?.[a.column]
          ? spec.seriesLabels[a.column]
          : a.column;
      // Datawrapper DROPS a line-chart annotation with no numeric y. Derive it
      // from the data at x when the spec pins only an x.
      const y =
        a.y !== undefined
          ? a.y
          : a.x !== undefined
            ? valueAt(csv, a.x, column)
            : undefined;
      return {
        text: a.text,
        x: a.x !== undefined ? String(a.x) : "",
        y: y !== undefined ? String(y) : "",
        bold: true,
        color: "#333333",
        align: a.align ?? "bl",
        dx: a.dx ?? 0,
        dy: a.dy ?? 0,
        // Give a near-edge callout a connector so, once nudged inward, it still
        // points at its data point.
        connectorLine:
          a.dx !== undefined || a.dy !== undefined
            ? { enabled: true, type: "straight", arrowHead: "none" }
            : { enabled: false },
        showMobile: true,
        showDesktop: true,
      };
    });
  }

  const patch: DwPatch = {
    title: spec.title,
    type: spec.type,
    metadata: { describe, visualize },
  };
  if (spec.transpose !== undefined)
    patch.metadata.data = { transpose: spec.transpose };
  return patch;
}
