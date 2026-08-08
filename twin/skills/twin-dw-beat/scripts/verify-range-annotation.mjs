// The live round-trip `map-spec.mjs`'s range-annotation shape is pinned by: create a small real
// chart, PATCH one candidate `visualize["range-annotations"]` entry, GET the chart back to see
// exactly what Datawrapper kept, export the PNG, and write it to disk so a human looks at it —
// because a key existing in a schema is not the same claim as a rule actually rendering where it
// was asked to. Run it with a real token:
//
//   DATAWRAPPER_TOKEN=... bun run scripts/verify-range-annotation.mjs /tmp/dw-beat/probe.png
//
// This does not run in `bun test` against the real network — bun:test's copy
// (test/verify-range-annotation.test.ts) is `it.skipIf(!token)`, the same convention
// `splash-twin/test/keys.test.ts` already uses for its real-endpoint probe.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createChart, setChartData, patchMetadata, publishChart, exportChartPng, getChart } from "./dw-client.mjs";
import { toCsv } from "./csv.mjs";

// The candidate shape: `references/range-annotation-shape.md` §2 documents where each field comes
// from. `x0`/`x1` span the probe data's own domain rather than relying on an unconfirmed
// `"-Infinity"`/`"Infinity"` sentinel some third-party notes claim works.
export const CANDIDATE_SHAPE = {
  id: "probe-1",
  type: "y",
  display: "line",
  color: "#0B7A75",
  opacity: 100,
  strokeWidth: 2,
  strokeType: "solid",
  position: { x0: 2000, x1: 2010, y0: 5, y1: 5 },
};

export async function verifyRangeAnnotation({ token, fetchFn = fetch, outPath }) {
  if (!token) {
    throw new Error("DATAWRAPPER_TOKEN is not set — cannot run a live round-trip without it.");
  }

  const chart = await createChart({ title: "range-annotation probe", type: "d3-lines", language: "en-US" }, token, fetchFn);
  await setChartData(
    chart.id,
    toCsv([{ year: 2000, value: 1 }, { year: 2010, value: 9 }]),
    token,
    fetchFn,
  );
  await patchMetadata(chart.id, { visualize: { "range-annotations": [CANDIDATE_SHAPE] } }, token, fetchFn);

  const roundTripped = await getChart(chart.id, token, fetchFn);
  await publishChart(chart.id, token, fetchFn);
  const png = await exportChartPng(chart.id, token, fetchFn, { width: 600, height: 400 });

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, png);

  return {
    chartId: chart.id,
    sentShape: CANDIDATE_SHAPE,
    roundTrippedRangeAnnotations: roundTripped?.metadata?.visualize?.["range-annotations"],
    pngPath: outPath,
  };
}

if (import.meta.main) {
  const outPath = process.argv[2] ?? "/tmp/dw-beat/probe.png";
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  const result = await verifyRangeAnnotation({ token, outPath });
  console.log(JSON.stringify(result, null, 2));
  console.log(`Now open ${outPath} and look at it — did the rule actually draw at y=5?`);
}
