import { validateMapSpec, type MapSpec } from "./map-spec";
import { specToMapMetadata } from "./spec-to-map-metadata";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "../../dw-chart/src/datawrapper";

export interface ProduceMapResult {
  chartId: string;
  embed: string;
  pngPath: string;
  publicUrl: string;
}

export async function produceMap(
  spec: MapSpec,
  pngPath: string,
): Promise<ProduceMapResult> {
  const v = validateMapSpec(spec);
  if (!v.ok) throw new Error(`invalid map spec: ${v.errors.join("; ")}`);

  const patch = specToMapMetadata(spec);
  const id = await createChart(spec.title, "d3-maps-choropleth");
  await setData(id, spec.data);
  await patchChart(id, { type: patch.type, metadata: patch.metadata });
  const publicUrl = await publishChart(id);
  await exportPng(id, pngPath);

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
