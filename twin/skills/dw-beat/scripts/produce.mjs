// One call, one pinned format, one real chart — the producer a beat actually invokes. No mock, no
// fallback rendering: a missing token is reported and this stops right there (splash's own
// never-list, "a missing prerequisite is reported and never designed around", applies here too).

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateChartSpec } from "./validate-spec.mjs";
import { buildChartPayload, resolveSeriesLabel, renameValueColumn } from "./map-spec.mjs";
import { toCsv } from "./csv.mjs";
import { createChart, setChartData, patchMetadata, publishChart, exportChartPng } from "./dw-client.mjs";
import { sizeFor } from "./sizes.mjs";

/**
 * The exported PNG's own IHDR, against the row that was asked for. THROWS when they disagree.
 *
 * This is the twin's `assertRenderedSize`, and it is written as a check rather than as a pinned
 * constant on purpose. Datawrapper lays the chart out server-side and this skill has never verified
 * that it HONOURS the `height` it is handed — a short chart may well come back shorter than the
 * frame. The spec's instruction was "measure once and pin what it returns"; this branch has no
 * `DATAWRAPPER_TOKEN` to measure with, and pinning a number nobody has seen is precisely the
 * reasoning-from-source this chantier exists to stop. So the FIRST REAL RUN is the measurement, and
 * it cannot come back wrong quietly: either the export is the size that was chosen, or this says so
 * and names both.
 *
 * It holds for ALL THREE sizes. The original Splash exempts its landscape case from its own size
 * assertion (`skills/chart-native/scripts/produce.mjs:352-368`), so its contract holds for two of
 * three and the DEFAULT is the unenforced one. That is the mistake being avoided, not the model.
 *
 * PNG only: the IHDR chunk sits at a fixed offset in every conformant PNG (8-byte signature,
 * 4-byte length, 4-byte "IHDR", then width and height, big-endian) — nothing to search for.
 * `image-beat/scripts/render-still.mjs`'s `readImageMeta` reads the same bytes the same way.
 */
export function assertExportedSize(bytes, size, row) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50)
    throw new Error(`Datawrapper returned ${bytes.length} bytes that are not a PNG`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const got = { width: view.getUint32(16), height: view.getUint32(20) };
  if (got.width !== row.width || got.height !== row.height)
    throw new Error(
      `asked Datawrapper for ${size} (${row.width}x${row.height}) and it returned ` +
        `${got.width}x${got.height}. Datawrapper lays out server-side and may not honour the ` +
        `height it is given; this is the first run that measures it. Record what it actually does ` +
        `in this skill's SKILL.md before changing anything here — do not widen the check to make ` +
        `it pass.`,
    );
  return got;
}

export async function produce(spec, { outDir, name = "chart", size, token, fetchFn = fetch } = {}) {
  validateChartSpec(spec);
  if (!token) {
    throw new Error(
      "DATAWRAPPER_TOKEN is not set — no mock, no fallback: a real token is required to produce a Datawrapper beat.",
    );
  }

  const payload = buildChartPayload(spec);
  const chart = await createChart({ title: payload.title, type: payload.type, language: payload.language }, token, fetchFn);
  // The CSV column name IS the direct-label Datawrapper prints on the line — rename it to the same
  // resolved series label buildChartPayload used for custom-colors, so a raw field name never
  // reaches the render on either side.
  const csvRows = renameValueColumn(spec.data, resolveSeriesLabel(spec));
  await setChartData(chart.id, toCsv(csvRows), token, fetchFn);
  await patchMetadata(chart.id, payload.metadata, token, fetchFn);
  const published = await publishChart(chart.id, token, fetchFn);
  const publicUrl = published.publicUrl ?? published.data?.publicUrl;

  if (spec.format === "interactive") {
    return { format: "interactive", chartId: chart.id, publicUrl };
  }

  // `sizeFor` THROWS on an unknown or missing name rather than defaulting — a chart exported at a
  // size nobody chose looks every bit as deliberate as one in a colour nobody chose. `zoom: 1`,
  // because the row IS the delivered pixel size: the frame and the file are one number, which is
  // the same decision the static path takes when it retires its own 2x rasteriser.
  const row = sizeFor(size);
  const png = await exportChartPng(chart.id, token, fetchFn, {
    width: row.width,
    height: row.height,
    zoom: 1,
  });
  assertExportedSize(png, size, row);
  await mkdir(outDir, { recursive: true });
  const pngPath = join(outDir, `${name}.png`);
  await writeFile(pngPath, png);
  return { format: "static", chartId: chart.id, pngPath, publicUrl, size };
}

if (import.meta.main) {
  const [specPath, outDir, formatArg, sizeArg] = process.argv.slice(2);
  if (!specPath || !outDir) {
    console.error(
      "usage: bun run scripts/produce.mjs <spec.json> <outDir> [static|interactive] [landscape|square|portrait]",
    );
    process.exit(1);
  }
  const spec = JSON.parse(await Bun.file(specPath).text());
  if (formatArg) spec.format = formatArg;
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  const result = await produce(spec, { outDir, size: sizeArg, token, fetchFn: fetch });
  console.log(JSON.stringify(result, null, 2));
}
