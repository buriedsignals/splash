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
  const id = await createChart(spec.title, patch.type);
  // Locator maps carry no data table; markers live in metadata.visualize.markers.
  if (spec.mapType !== "locator") await setData(id, spec.data);
  // `language` localizes DW's own legend + tooltip number formatting (fr-FR → "17 600");
  // include it only when the spec set a language, else DW keeps its default (en-US).
  await patchChart(id, {
    type: patch.type,
    metadata: patch.metadata,
    ...(patch.language ? { language: patch.language } : {}),
  });
  const publicUrl = await publishChart(id);
  await exportPng(id, pngPath);

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
