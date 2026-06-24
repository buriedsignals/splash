import { validateChartSpec, type ChartSpec } from "./chart-spec";
import { specToMetadata } from "./spec-to-metadata";
import { sortCsv } from "./csv";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "./datawrapper";

export interface ProduceResult {
  chartId: string;
  embed: string;
  pngPath: string;
  publicUrl: string;
}

export async function produceChart(
  spec: ChartSpec,
  pngPath: string,
): Promise<ProduceResult> {
  const v = validateChartSpec(spec);
  if (!v.ok) throw new Error(`invalid chart spec: ${v.errors.join("; ")}`);

  const patch = specToMetadata(spec);
  const id = await createChart(spec.title, spec.type);
  const csv = spec.sort ? sortCsv(spec.data, spec.sort) : spec.data;
  await setData(id, csv);
  await patchChart(id, { type: patch.type, metadata: patch.metadata });
  const publicUrl = await publishChart(id);
  await exportPng(id, pngPath);

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
