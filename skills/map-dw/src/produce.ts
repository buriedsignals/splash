import { readFileSync } from "node:fs";
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
import {
  assertRenderedSize,
  normalizeChannel,
  renderSize,
} from "../../atelier/src/channel";

// The single-format-produce-export vocabulary, restricted to the two values map-dw
// actually builds (mirrors dw-chart's DwChartFormat) — it has no video/scrolly
// renderer (animated maps are map-native's). Kept as a plain string union so the
// orchestrator-level VisualFormat gate (skills/atelier/src/adapters.ts) stays the one
// place that knows the wider vocabulary.
export type DwMapFormat = "static" | "interactive";

// Datawrapper's PNG export rasterizes at 2x (its default zoom, "retina") — the
// returned PNG is exactly TWICE the requested pixel box (probed live 2026-07-11:
// width=1200&height=675 → a 2400x1350 PNG). This is DW's export default, not a knob
// we tuned; it is named so the halving below reads as what it is.
export const DW_EXPORT_PIXEL_RATIO = 2;

// The pixel box map-dw REQUESTS from the DW export API for a channel, derived from
// the shared channel model (single source of truth: skills/atelier/src/channel.ts,
// the established cross-skill import). Request HALF the channel's mediaSize so DW's
// 2x rasterization doubles it back onto the channel size — the same halving
// chart-native's static path applies (deviceScaleFactor:2, CSS canvas =
// round(mediaSize/2)). article-web's odd height (675) rounds to 338 → a 676px PNG,
// 1px off, inside assertRenderedSize's ±2px tolerance. Maps are always FIXED-ASPECT
// (DW scales the geography into the box — no row-count cropping concern, unlike
// dw-chart's ROW_DRIVEN_TYPES), so the height is always pinned. Fail-closed: a
// garbled channel throws (normalizeChannel); absent defaults to article-web. Pure;
// exported for unit tests.
export function mapExportSize(channel?: string): {
  width: number;
  height: number;
} {
  const box = renderSize(normalizeChannel(channel));
  return {
    width: Math.round(box.width / DW_EXPORT_PIXEL_RATIO),
    height: Math.round(box.height / DW_EXPORT_PIXEL_RATIO),
  };
}

// Render-size readback — the same render-free IHDR probe the native producers use
// (skills/chart-native/scripts/produce.mjs readPngSize): PNG signature 8 bytes +
// 4-byte chunk length + 4-byte "IHDR" tag, then width/height as big-endian uint32 at
// bytes 16-19/20-23. Read from the delivered file itself, never trusted from the
// request.
function readPngSize(pngPath: string): { width: number; height: number } {
  const buf = readFileSync(pngPath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export interface ProduceMapResult {
  chartId: string;
  embed: string;
  // Present only when format "static" was built (the owned media export). Absent for
  // "interactive" — the deliverable there is the hosted embed (`embed`/`publicUrl`),
  // no local PNG is produced (mirrors dw-chart's ProduceResult).
  pngPath?: string;
  publicUrl: string;
}

export async function produceMap(
  spec: MapSpec,
  pngPath: string,
  opts: { format?: DwMapFormat } = {},
): Promise<ProduceMapResult> {
  // Defaults to "static" — every pre-single-format caller (the e2e suite, the
  // output-proof runs) calls produceMap with no format at all and expects the PNG on
  // disk, so an absent format must keep producing it (back-compat, mirrors
  // produceChart's default).
  const format = opts.format ?? "static";
  // Fail hard FIRST on a format map-dw cannot build. A runtime guard, not just the
  // DwMapFormat type: the orchestrator's VisualFormat is wider, and the dispatch-level
  // gate (skills/atelier/src/adapters.ts) must not be the only line of defense — a
  // direct caller gets the same refusal, BEFORE any API call, so nothing is ever
  // created/published for a pin map-dw cannot honor.
  if (format !== "static" && format !== "interactive")
    throw new Error(
      `map-dw cannot build format "${String(format)}" — it supports "static" or ` +
        `"interactive" only (video/scrolly require map-native)`,
    );
  const v = validateMapSpec(spec);
  if (!v.ok) throw new Error(`invalid map spec: ${v.errors.join("; ")}`);

  // EXPORT SIZE, resolved BEFORE any API call (the dw-chart orphaned-published-chart
  // lesson, mirrored): normalizeChannel is fail-closed on a garbled spec.channel, and
  // resolving it only after createChart/publishChart would leave an ORPHANED live
  // Datawrapper map behind when it throws. Its inputs are read-only from here on, so
  // hoisting is behavior-preserving for every valid channel; a garbled one now fails
  // with zero API side effects.
  const channel = normalizeChannel(spec.channel);
  const requestBox = mapExportSize(spec.channel);

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

  // Build ONLY what the format needs (single-format-produce-export): "static" exports
  // the owned media file at the channel's box; "interactive" delivers the hosted embed
  // alone — no PNG is exported/written for it. The publish above is unconditional
  // either way: map-dw is HOSTED, so even the "static" PNG can only be exported FROM a
  // published map — unavoidable infrastructure, not a produced deliverable of its own.
  const builtPngPath = format === "static" ? pngPath : undefined;
  if (builtPngPath) {
    await exportPng(id, builtPngPath, requestBox.width, requestBox.height);
    // RENDER-SIZE FLOOR (fail-hard): the delivered PNG's real pixel dims must equal
    // the channel's mediaSize ±2px — the same produce-time conformance chart-native/
    // map-native enforce on their static renders (Slice 2), read back from the file's
    // own IHDR.
    const dims = readPngSize(builtPngPath);
    assertRenderedSize(dims.width, dims.height, channel);
    // KNOWN LIMITATION — no raster contrast check on this PNG: the native producers
    // run a rendered snap-contrast guard on their own renders, but map-dw delegates
    // rendering to Datawrapper, so contrast is enforced upstream at the spec level
    // only (CVD-safe colorScale stops, validateMapSpec). A rendered-contrast check on
    // the DW-exported raster is a known gap, deliberately out of scope here.
  }

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath: builtPngPath, publicUrl };
}
