// One call, one pinned format, one real chart — the producer a beat actually invokes. No mock, no
// fallback rendering: a missing token is reported and this stops right there (splash-twin's own
// never-list, "a missing prerequisite is reported and never designed around", applies here too).

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateChartSpec } from "./validate-spec.mjs";
import { buildChartPayload } from "./map-spec.mjs";
import { toCsv } from "./csv.mjs";
import { createChart, setChartData, patchMetadata, publishChart, exportChartPng } from "./dw-client.mjs";

export async function produce(spec, { outDir, name = "chart", token, fetchFn = fetch } = {}) {
  validateChartSpec(spec);
  if (!token) {
    throw new Error(
      "DATAWRAPPER_TOKEN is not set — no mock, no fallback: a real token is required to produce a Datawrapper beat.",
    );
  }

  const payload = buildChartPayload(spec);
  const chart = await createChart({ title: payload.title, type: payload.type, language: payload.language }, token, fetchFn);
  await setChartData(chart.id, toCsv(spec.data), token, fetchFn);
  await patchMetadata(chart.id, payload.metadata, token, fetchFn);
  const published = await publishChart(chart.id, token, fetchFn);
  const publicUrl = published.publicUrl ?? published.data?.publicUrl;

  if (spec.format === "interactive") {
    return { format: "interactive", chartId: chart.id, publicUrl };
  }

  const png = await exportChartPng(chart.id, token, fetchFn);
  await mkdir(outDir, { recursive: true });
  const pngPath = join(outDir, `${name}.png`);
  await writeFile(pngPath, png);
  return { format: "static", chartId: chart.id, pngPath, publicUrl };
}

if (import.meta.main) {
  const [specPath, outDir, formatArg] = process.argv.slice(2);
  if (!specPath || !outDir) {
    console.error("usage: bun run scripts/produce.mjs <spec.json> <outDir> [static|interactive]");
    process.exit(1);
  }
  const spec = JSON.parse(await Bun.file(specPath).text());
  if (formatArg) spec.format = formatArg;
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  const result = await produce(spec, { outDir, token, fetchFn: fetch });
  console.log(JSON.stringify(result, null, 2));
}
