import { validateChartSpec, type ChartSpec } from "./chart-spec";
import { specToMetadata, resolveData } from "./spec-to-metadata";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "./datawrapper";
import { checkPublishedChart } from "./label-safety";

export interface ProduceResult {
  chartId: string;
  embed: string;
  pngPath: string;
  publicUrl: string;
}

export async function produceChart(
  spec: ChartSpec,
  pngPath: string,
  opts: { skipLabelSafety?: boolean } = {},
): Promise<ProduceResult> {
  const v = validateChartSpec(spec);
  if (!v.ok) throw new Error(`invalid chart spec: ${v.errors.join("; ")}`);

  const patch = specToMetadata(spec);
  const id = await createChart(spec.title, spec.type);
  // Same resolved CSV (renamed headers + sort) that the metadata mapping saw.
  const csv = resolveData(spec);
  await setData(id, csv);
  await patchChart(id, { type: patch.type, metadata: patch.metadata });
  const publicUrl = await publishChart(id);
  await exportPng(id, pngPath);

  // GUARDRAIL: a clipped or overlapping label is a publishable-blocker. Load the
  // published chart, enumerate every text rect, and fail loud if any is clipped by
  // the content box or intersects another. This is what stops the defect recurring.
  if (!opts.skipLabelSafety) {
    const safety = await checkPublishedChart(publicUrl);
    if (!safety.ok)
      throw new Error(
        `label-safety guardrail failed for ${publicUrl}:\n  - ${safety.violations.join("\n  - ")}`,
      );
  }

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
