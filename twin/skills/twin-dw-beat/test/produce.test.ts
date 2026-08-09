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
// A conformant PNG header carrying a declared size, because `produce` now READS the returned
// bytes' IHDR and refuses an export that is not the size it asked for. Three arbitrary bytes were
// enough while nothing looked at them; they are not any more, and a fake that cannot satisfy the
// check is a fake that would have hidden it.
export function fakePng(width, height, tail = [1, 2, 3]) {
  const bytes = new Uint8Array(24 + tail.length);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); // signature
  new DataView(bytes.buffer).setUint32(8, 13); // IHDR length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  bytes.set(tail, 24);
  return bytes;
}

function fakeDatawrapper({ pngBytes = fakePng(1920, 1080) } = {}) {
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
      produce(
        { takeaway: "x" },
        { outDir: "/tmp", size: "landscape", token: "t", fetchFn },
      ),
    ).rejects.toThrow(/ChartSpec is invalid/);
    expect(calls).toHaveLength(0);
  });

  it("should refuse to run without a token, no mock and no fallback", async () => {
    const { fetchFn } = fakeDatawrapper();
    await expect(
      produce(baseSpec(), {
        outDir: "/tmp",
        size: "landscape",
        token: "",
        fetchFn,
      }),
    ).rejects.toThrow(/DATAWRAPPER_TOKEN is not set/);
  });

  it("should call create, set data, patch metadata, publish and export in that order for format static", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    const outDir = await mkdtemp(join(tmpdir(), "twin-dw-beat-"));
    try {
      const result = await produce(baseSpec(), {
        outDir,
        name: "co2",
        size: "landscape",
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
      expect(Array.from(bytes.slice(24))).toEqual([1, 2, 3]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("should not export a PNG for format interactive, and should return the published URL instead", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    const result = await produce(baseSpec({ format: "interactive" }), {
      size: "landscape",
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
        size: "landscape",
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

  it("should send the CSV-serialised data on the data call, with the value column renamed to its resolved series label", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec(), {
      outDir: "/tmp",
      size: "landscape",
      token: "secret",
      fetchFn,
    });
    const dataCall = calls.find((c) => c.url.endsWith("/data"));
    expect(dataCall.body).toBe("year,Co2 Mt\n1950,10.25\n2024,32.07");
  });

  it("should never let the raw column name reach the CSV header or the custom-colors key sent to Datawrapper", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec(), {
      outDir: "/tmp",
      size: "landscape",
      token: "secret",
      fetchFn,
    });
    const dataCall = calls.find((c) => c.url.endsWith("/data"));
    const patchCall = calls.find((c) => c.method === "PATCH");
    expect(dataCall.body).not.toContain("co2Mt");
    expect(patchCall.body).not.toContain("co2Mt");
  });

  it("should send an explicit seriesLabel through to both the CSV header and custom-colors", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec({ seriesLabel: "CO₂ (Mt)" }), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn,
    });
    const dataCall = calls.find((c) => c.url.endsWith("/data"));
    const patchCall = calls.find((c) => c.method === "PATCH");
    expect(dataCall.body.startsWith("year,CO₂ (Mt)")).toBe(true);
    expect(
      JSON.parse(patchCall.body).metadata.visualize["custom-colors"],
    ).toEqual({
      "CO₂ (Mt)": "#0B7A75",
    });
  });

  it("should disable forced attribution on every chart it creates", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec(), {
      outDir: "/tmp",
      size: "landscape",
      token: "secret",
      fetchFn,
    });
    const patchCall = calls.find((c) => c.method === "PATCH");
    expect(JSON.parse(patchCall.body).metadata.publish).toEqual({
      "force-attribution": false,
    });
  });

  it("should fit the y-range for a line chart but not for a bar chart", async () => {
    const { fetchFn: lineFetch, calls: lineCalls } = fakeDatawrapper();
    await produce(baseSpec(), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn: lineFetch,
    });
    const linePatch = JSON.parse(
      lineCalls.find((c) => c.method === "PATCH").body,
    );
    expect(linePatch.metadata.visualize["custom-range-y"]).toBeDefined();

    const { fetchFn: barFetch, calls: barCalls } = fakeDatawrapper();
    await produce(baseSpec({ chartType: "d3-bars" }), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn: barFetch,
    });
    const barPatch = JSON.parse(
      barCalls.find((c) => c.method === "PATCH").body,
    );
    expect(barPatch.metadata.visualize["custom-range-y"]).toBeUndefined();
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
          { outDir, name: "real", size: "landscape", token, fetchFn: fetch },
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

// ── W4 Task 4: one pinned export size, and the export is checked against it ────────────────────
//
// WHY THIS IS A CHECK AND NOT A PINNED CONSTANT. The spec asked for "measure once what Datawrapper
// actually returns for each size and pin the returned IHDR against it; do not assume it honours
// `height`". This branch has no `DATAWRAPPER_TOKEN`, so there is nothing to measure with — and
// pinning a number nobody has seen is the reasoning-from-source this whole chantier exists to stop.
// So the first real run against the API IS the measurement, and `assertExportedSize` makes it loud:
// either the export is the size that was chosen, or produce throws naming both. What is genuinely
// left undone is recording what Datawrapper does; the test below marks that with a live case that
// skips without a token, exactly like the other live cases in this file.
//
// THE MUTATIONS THAT REDDEN THESE, run in a copy under /tmp, 2026-08-10:
//   drop `assertExportedSize(png, size, row)` from produce.mjs   RED — the wrong-size case
//   replace `sizeFor(size)` with `SIZES.landscape`               RED — the missing-size case
//   `zoom: 1` -> `zoom: 2` in the export call                    RED — the params case
describe("produce at one pinned export size", () => {
  it("should refuse to export at all when no size was chosen, naming the three it knows", async () => {
    const { fetchFn } = fakeDatawrapper();
    // The `sizeFor`/`readPalette` failure mode: a chart exported at a size nobody chose looks every
    // bit as deliberate as one in a colour nobody chose, so there is no default to fall back to.
    await expect(
      produce(baseSpec(), { outDir: "/tmp", token: "secret", fetchFn }),
    ).rejects.toThrow(/landscape, square, portrait/);
  });

  it("should ask Datawrapper for the row's own pixels at zoom 1 — the frame IS the file", async () => {
    const { fetchFn, calls } = fakeDatawrapper({ pngBytes: fakePng(1080, 1920) });
    const outDir = await mkdtemp(join(tmpdir(), "twin-dw-beat-"));
    try {
      await produce(baseSpec(), {
        outDir,
        size: "portrait",
        token: "secret",
        fetchFn,
      });
      const exportCall = calls.find((c) => c.url.includes("/export/png"));
      const params = new URL(exportCall.url).searchParams;
      expect(params.get("width")).toBe("1080");
      expect(params.get("height")).toBe("1920");
      // zoom 1, because the row is the DELIVERED pixel size — the same decision the static path
      // takes when it retires its own 2x rasteriser. A multiplier here would mean the table says
      // one thing and the file is another.
      expect(params.get("zoom")).toBe("1");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("should throw, naming both sizes, when Datawrapper returns something other than the row", async () => {
    // The case the spec warns about in as many words: Datawrapper lays out server-side and may not
    // honour the height it is handed. This is what makes that discoverable instead of silent.
    const { fetchFn } = fakeDatawrapper({ pngBytes: fakePng(1080, 743) });
    await expect(
      produce(baseSpec(), {
        outDir: "/tmp",
        size: "portrait",
        token: "secret",
        fetchFn,
      }),
    ).rejects.toThrow(/1080x1920.*returned 1080x743/s);
  });

  it("should record the size it was produced at on the result", async () => {
    const { fetchFn } = fakeDatawrapper({ pngBytes: fakePng(1080, 1080) });
    const outDir = await mkdtemp(join(tmpdir(), "twin-dw-beat-"));
    try {
      const result = await produce(baseSpec(), {
        outDir,
        size: "square",
        token: "secret",
        fetchFn,
      });
      expect(result.size).toBe("square");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
