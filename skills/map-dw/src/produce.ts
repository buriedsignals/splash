import { validateMapSpec, type MapSpec } from "./map-spec";
import { specToMapMetadata } from "./spec-to-map-metadata";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "../../dw-chart/src/datawrapper";
import {
  assessJoinMatch,
  datalessJoinError,
  MIN_JOIN_MATCH_RATE,
} from "./join-match";

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

  // DATALESS-JOIN GUARD (the general net behind validateMapSpec's key check). Before touching
  // the API, confirm the choropleth's data rows actually join to the live basemap geometry. A
  // failed join ships a fully grey, dataless map that Datawrapper still publishes — so fail hard
  // HERE (never create/publish the chart) rather than let the orchestrator mark it "produced".
  // Covers any basemap, including those absent from the static key registry.
  if (spec.mapType === "choropleth") {
    const j = await assessJoinMatch(
      spec.basemap,
      spec.mapKeyAttr,
      spec.data,
      spec.regionKey,
    );
    if (j.rate < MIN_JOIN_MATCH_RATE) throw new Error(datalessJoinError(j));
  }

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
