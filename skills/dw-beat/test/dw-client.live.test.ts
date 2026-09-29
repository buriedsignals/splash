import { describe, it, expect } from "bun:test";
import {
  createChart,
  setChartData,
  patchMetadata,
  publishChart,
  exportChartPng,
} from "../scripts/dw-client.mjs";

// LIVE LANE. This creates and PUBLISHES a real Datawrapper chart the moment DATAWRAPPER_TOKEN is in
// the environment, so it lives in a `*.live.test.ts` (scripts/test-lanes.mjs) and never runs with
// the fast lane. The offline request/response contract stays in dw-client.test.ts.
describe("against the real Datawrapper API", () => {
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  if (!token) {
    console.log(
      "Skipping real Datawrapper round-trip: DATAWRAPPER_TOKEN is not set in the environment.",
    );
  }

  it.skipIf(!token)(
    "should create, set data on, patch, publish and export a real chart",
    async () => {
      const chart = await createChart(
        {
          title: "dw-beat client test",
          type: "d3-lines",
          language: "en-US",
        },
        token,
        fetch,
      );
      expect(chart.id).toBeTruthy();
      await setChartData(chart.id, "year,value\n2000,1\n2010,9", token, fetch);
      await patchMetadata(
        chart.id,
        { describe: { intro: "test" } },
        token,
        fetch,
      );
      const published = await publishChart(chart.id, token, fetch);
      expect(published.publicUrl ?? published.data?.publicUrl).toBeTruthy();
      const png = await exportChartPng(chart.id, token, fetch, {
        width: 400,
        height: 300,
      });
      expect(png.length).toBeGreaterThan(0);
    },
    30000,
  );
});
