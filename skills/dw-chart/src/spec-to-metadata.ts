import type { ChartSpec } from "./chart-spec";

export interface DwPatch {
  title: string;
  type: string;
  metadata: {
    describe: Record<string, unknown>;
    visualize: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
}

export function specToMetadata(spec: ChartSpec): DwPatch {
  const describe: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": spec.source?.name ?? "",
    "source-url": spec.source?.url ?? "",
    "aria-description": spec.altInsight,
  };
  describe["number-format"] = spec.numberFormat ?? "0,0.[00]";

  const visualize: Record<string, unknown> = {};
  if (spec.baseColor) visualize["base-color"] = spec.baseColor;
  if (spec.valueLabels !== undefined)
    visualize["value-labels"] = { show: spec.valueLabels };
  if (spec.seriesColors) visualize["custom-colors"] = spec.seriesColors;
  if (spec.annotations && spec.annotations.length) {
    visualize["text-annotations"] = spec.annotations.map((a) => ({
      text: a.text,
      x: a.x !== undefined ? String(a.x) : "",
      y: a.y !== undefined ? String(a.y) : "",
      bold: true,
      color: "#333333",
      align: "bl",
    }));
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
