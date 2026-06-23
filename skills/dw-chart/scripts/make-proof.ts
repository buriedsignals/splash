import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { produceChart } from "../src/produce";
import type { ChartSpec } from "../src/chart-spec";

const dir = join(import.meta.dir, "..", "output-proof");
mkdirSync(dir, { recursive: true });
const spec = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", "assets", "sample-data", "sample.spec.json"),
    "utf8",
  ),
) as ChartSpec;
const res = await produceChart(spec, join(dir, "chart.png"));
writeFileSync(join(dir, "embed.html"), res.embed + "\n");
writeFileSync(
  join(dir, "result.json"),
  JSON.stringify({ chartId: res.chartId, publicUrl: res.publicUrl }, null, 2) +
    "\n",
);
console.log("proof written:", res.publicUrl);
