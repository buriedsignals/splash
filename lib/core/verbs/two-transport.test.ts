import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../../skills/splash/src/register-producers";
import { runVerb } from "./index";
import type { DeliveredArtifact } from "../contract";

// ONE call site. The engine key is data; the transport (subprocess vs in-process) is the
// registry's business and never the caller's.
async function renderVia(engine: string, spec: unknown, format: string) {
  return runVerb("render", {
    engine,
    spec,
    format,
    channel: "article-web",
    outDir: join(
      mkdtempSync(join(tmpdir(), `two-transport-${engine}-`)),
      "el1",
    ),
    id: "el1",
  });
}

const CSV = "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n";

describe("one verb, two transports — the abstraction is not a one-off", () => {
  it("renders through the SUBPROCESS transport (chart-native, network-free)", async () => {
    const r = await renderVia(
      "chart-native",
      {
        nativeType: "bar",
        title: "Rents rose fastest in Geneva",
        altInsight: "Geneva leads the three cantons on rent growth.",
        unit: "%",
        source: { name: "Provided by the newsroom" },
        format: "static",
        data: CSV,
      },
      "static",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.message);
    const a = r.value as DeliveredArtifact;
    expect(a.form).toBe("file");
    expect(
      readFileSync(a.files.find((f) => f.endsWith("static.png"))!).length,
    ).toBeGreaterThan(1000);
    // The success path is the half of the JSON round-trip invariant that matters: a
    // future CLI façade over this verb contract carries a real DeliveredArtifact across
    // the process boundary, not a plain-string failure. Proving it here — on a success
    // result produced by the subprocess transport — is what makes that façade buildable.
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  }, 300_000);
});

// Live: the IN-PROCESS transport hits the real Datawrapper API. One chart only.
const d = process.env.DATAWRAPPER_API_TOKEN ? describe : describe.skip;

d("one verb, two transports — the in-process leg (live)", () => {
  it("renders through the IN-PROCESS transport (dw-chart) via the same call", async () => {
    const r = await renderVia(
      "dw-chart",
      {
        // The real ChartSpec shape — see skills/dw-chart/tests/highlight.test.ts:31-43.
        type: "d3-bars",
        title: "Rents rose fastest in Geneva",
        data: CSV,
        source: { name: "Provided by the newsroom" },
        altInsight: "Geneva leads the three cantons on rent growth.",
      },
      "static",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.message);
    const a = r.value as DeliveredArtifact;
    expect(a.format).toBe("static");
    expect(a.files.length).toBeGreaterThan(0);
  }, 180_000);
});
