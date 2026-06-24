import { describe, it, expect } from "bun:test";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";
import { deleteChart } from "../../../dw-chart/src/datawrapper";

// Live e2e against the real Datawrapper API. Requires DATAWRAPPER_API_TOKEN.
// Run with: `set -a; source /atelier/.env; set +a; bun test src/tests/e2e.test.ts`
// A passing assertion does NOT prove the map looks right — see output-proof/eu-renewables.png
// (the human gate: data bound, light→blue gradient, not black).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

d("produceMap (live)", () => {
  it("publishes a real choropleth and exports a non-empty PNG", async () => {
    const spec: MapSpec = {
      mapType: "choropleth",
      basemap: "world-2019",
      mapKeyAttr: "DW_STATE_CODE",
      regionKey: "code",
      valueColumn: "value",
      data: "code,value\nFRA,25\nDEU,46\nESP,42\nSWE,66",
      title: "Sweden leads this group on renewable share",
      altInsight: "Renewable share ranges from 25% in France to 66% in Sweden",
      source: { name: "Eurostat" },
    };
    const png = `/tmp/map-dw-e2e-${Date.now()}.png`;
    const r = await produceMap(spec, png);
    expect(r.publicUrl).toMatch(/datawrapper/);
    expect((await Bun.file(png).arrayBuffer()).byteLength).toBeGreaterThan(0);
    // throwaway: this test chart is deleted; the kept proof is the eu-renewables chart in output-proof/
    await deleteChart(r.chartId);
  }, 60000);
});
