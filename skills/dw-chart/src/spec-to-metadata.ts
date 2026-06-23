import type { ChartSpec } from "./chart-spec";

export interface DwPatch {
  title: string;
  type: string;
  metadata: {
    describe: Record<string, unknown>;
    visualize: Record<string, unknown>;
  };
}

export function specToMetadata(spec: ChartSpec): DwPatch {
  const describe: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": spec.source?.name ?? "",
    "source-url": spec.source?.url ?? "",
    "aria-description": spec.altInsight,
  };
  if (spec.numberFormat) describe["number-format"] = spec.numberFormat;

  const visualize: Record<string, unknown> = {};
  if (spec.baseColor) visualize["base-color"] = spec.baseColor;
  if (spec.valueLabels !== undefined)
    visualize["value-labels"] = { show: spec.valueLabels };

  return {
    title: spec.title,
    type: spec.type,
    metadata: { describe, visualize },
  };
}
