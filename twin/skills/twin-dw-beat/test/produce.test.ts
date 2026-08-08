import { describe, it, expect } from "bun:test";
import { rm, readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "../scripts/produce.mjs";

function baseSpec(overrides = {}) {
  return {
    takeaway: "Emissions fell",
    limits: "Territorial emissions only.",
    credit: "Global Carbon Budget",
    effectiveDate: "2024 data",
    language: "fr-FR",
    color: "#0B7A75",
    chartType: "d3-lines",
    format: "static",
    data: [
      { year: 1950, co2Mt: 10.25 },
      { year: 2024, co2Mt: 32.07 },
    ],
    ...overrides,
  };
}

// A fake sequence of the five real calls `produce` makes, in order, so the orchestration itself is
// pinned without touching the network — the same request/response contract dw-client.test.ts pins
// per-call, exercised here end to end.
function fakeDatawrapper({ pngBytes = new Uint8Array([1, 2, 3]) } = {}) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, method: init.method ?? "GET", body: init.body });
    if (
      u === "https://api.datawrapper.de/v3/charts" &&
      init.method === "POST"
    ) {
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    }
    if (u === "https://api.datawrapper.de/v3/charts/aBcDe/data") {
      return new Response(null, { status: 204 });
    }
    if (
      u === "https://api.datawrapper.de/v3/charts/aBcDe" &&
      init.method === "PATCH"
    ) {
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    }
    if (u === "https://api.datawrapper.de/v3/charts/aBcDe/publish") {
      return new Response(
        JSON.stringify({ publicUrl: "//datawrapper.dwcdn.net/aBcDe/1/" }),
        { status: 200 },
      );
    }
    if (u.startsWith("https://api.datawrapper.de/v3/charts/aBcDe/export/png")) {
      return new Response(pngBytes, { status: 200 });
    }
    throw new Error(`fakeDatawrapper: unexpected call to ${u}`);
  };
  return { fetchFn, calls };
}

describe("produce", () => {
  it("should throw a validation error before ever touching the network", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await expect(
      produce({ takeaway: "x" }, { outDir: "/tmp", token: "t", fetchFn }),
    ).rejects.toThrow(/ChartSpec is invalid/);
    expect(calls).toHaveLength(0);
  });

  it("should refuse to run without a token, no mock and no fallback", async () => {
    const { fetchFn } = fakeDatawrapper();
    await expect(
      produce(baseSpec(), { outDir: "/tmp", token: "", fetchFn }),
    ).rejects.toThrow(/DATAWRAPPER_TOKEN is not set/);
  });

  it("should call create, set data, patch metadata, publish and export in that order for format static", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    const outDir = await mkdtemp(join(tmpdir(), "twin-dw-beat-"));
    try {
      const result = await produce(baseSpec(), {
        outDir,
        name: "co2",
        token: "secret",
        fetchFn,
      });
      const shapes = calls.map((c) => `${c.method} ${c.url.split("?")[0]}`);
      expect(shapes).toEqual([
        "POST https://api.datawrapper.de/v3/charts",
        "PUT https://api.datawrapper.de/v3/charts/aBcDe/data",
        "PATCH https://api.datawrapper.de/v3/charts/aBcDe",
        "POST https://api.datawrapper.de/v3/charts/aBcDe/publish",
        "GET https://api.datawrapper.de/v3/charts/aBcDe/export/png",
      ]);
      expect(result.format).toBe("static");
      expect(result.pngPath).toBe(join(outDir, "co2.png"));
      const bytes = await readFile(result.pngPath);
      expect(Array.from(bytes)).toEqual([1, 2, 3]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("should not export a PNG for format interactive, and should return the published URL instead", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    const result = await produce(baseSpec({ format: "interactive" }), {
      outDir: "/tmp",
      token: "secret",
      fetchFn,
    });
    expect(result.format).toBe("interactive");
    expect(result.publicUrl).toBe("//datawrapper.dwcdn.net/aBcDe/1/");
    expect(calls.some((c) => c.url.includes("/export/png"))).toBe(false);
  });

  it("should send the mapped payload's title, type and language on chart creation", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(
      baseSpec({ takeaway: "Custom title", chartType: "d3-bars" }),
      {
        outDir: "/tmp",
        token: "secret",
        fetchFn,
      },
    );
    const createCall = calls.find(
      (c) =>
        c.method === "POST" && c.url === "https://api.datawrapper.de/v3/charts",
    );
    const body = JSON.parse(createCall.body);
    expect(body).toEqual({
      title: "Custom title",
      type: "d3-bars",
      language: "fr-FR",
    });
  });

  it("should send the CSV-serialised data on the data call", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec(), { outDir: "/tmp", token: "secret", fetchFn });
    const dataCall = calls.find((c) => c.url.endsWith("/data"));
    expect(dataCall.body).toBe("year,co2Mt\n1950,10.25\n2024,32.07");
  });
});

describe("produce against the real Datawrapper API", () => {
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  if (!token) {
    console.log(
      "Skipping real produce() round-trip: DATAWRAPPER_TOKEN is not set in the environment.",
    );
  }

  it.skipIf(!token)(
    "should produce a real static PNG for a small spec with a range annotation",
    async () => {
      const outDir = await mkdtemp(join(tmpdir(), "twin-dw-beat-real-"));
      try {
        const result = await produce(
          baseSpec({ rangeAnnotations: [{ value: 20, label: "reference" }] }),
          { outDir, name: "real", token, fetchFn: fetch },
        );
        expect(result.format).toBe("static");
        const bytes = await readFile(result.pngPath);
        expect(bytes.length).toBeGreaterThan(0);
      } finally {
        await rm(outDir, { recursive: true, force: true });
      }
    },
    30000,
  );
});
