import { describe, it, expect, afterAll } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { produceChart } from "../src/produce";
import { deleteChart } from "../src/datawrapper";
import type { ChartSpec } from "../src/chart-spec";

const spec = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", "assets", "sample-data", "sample.spec.json"),
    "utf8",
  ),
) as ChartSpec;
let id = "";

describe("produceChart (real API)", () => {
  it("produces a published chart, an embed, and an owned PNG with conformance applied", async () => {
    expect(!!process.env.DATAWRAPPER_API_TOKEN).toBe(true);
    const out = join(tmpdir(), "atelier-produce.png");
    const res = await produceChart(spec, out);
    id = res.chartId;
    expect(res.publicUrl).toContain("datawrapper");
    expect(res.embed).toContain(res.publicUrl);
    expect(existsSync(out)).toBe(true);
    // conformance applied: fetch the chart, assert aria-description == altInsight + base-color set
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${id}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = await r.json();
    expect(chart.metadata.describe["aria-description"]).toBe(spec.altInsight);
    expect(chart.metadata.visualize["base-color"]).toBe("#0072B2");
    rmSync(out, { force: true });
  }, 60000);
});

afterAll(async () => {
  if (id) await deleteChart(id);
});
