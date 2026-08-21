import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { rm, readFile, mkdir, mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  datawrapperFormatFor,
  missingDatawrapperTokenMessage,
  parseProduceCli,
  produce,
  resolveDatawrapperBeatIdentity,
  resolveDatawrapperToken,
} from "../scripts/produce.mjs";
import { accentPaintsTheMarks } from "../scripts/detect-accent-reaches-the-marks.mjs";

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

async function storyBeat(prefix = "dw-story-") {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const identity = {
    storiesRoot: join(root, "stories"),
    storyId: "emissions-story",
    outputId: "1-emissions",
  };
  const beatDir = join(
    identity.storiesRoot,
    identity.storyId,
    "beats",
    identity.outputId,
  );
  await mkdir(beatDir, { recursive: true });
  return { root, beatDir, identity };
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
    const outDir = await mkdtemp(join(tmpdir(), "dw-beat-"));
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

  it("should map canonical web to Datawrapper interactive without leaking that provider value", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    const result = await produce(baseSpec({ format: "web" }), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn,
    });
    expect(result.format).toBe("web");
    expect(result.provider).toEqual({ format: "interactive" });
    expect(result.publicUrl).toBe("https://datawrapper.dwcdn.net/aBcDe/1/");
    expect(calls.some((c) => c.url.includes("/export/png"))).toBe(false);
  });

  it("should pin both canonical-to-provider format mappings", () => {
    expect(datawrapperFormatFor("web")).toBe("interactive");
    expect(datawrapperFormatFor("static")).toBe("static");
    expect(() => datawrapperFormatFor("interactive")).toThrow(
      /canonical Splash formats/,
    );
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

  it("should upload every series required by a multi-country slope", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(
      baseSpec({
        format: "web",
        seriesLabel: "Norway adoption",
        data: [
          { year: 2021, Norway: 54, Sweden: 52, UK: 5 },
          { year: 2025, Norway: 64, Sweden: 62, UK: 9 },
        ],
      }),
      { outDir: "/tmp", token: "secret", fetchFn },
    );
    const dataCall = calls.find((c) => c.url.endsWith("/data"));
    expect(dataCall.body).toBe(
      "year,Norway adoption,Sweden,UK\n2021,54,52,5\n2025,64,62,9",
    );
    const patch = JSON.parse(calls.find((c) => c.method === "PATCH").body);
    expect(
      patch.metadata.visualize["custom-range-y"].map(Number)[0],
    ).toBeLessThan(5);
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

  // FINDING 6 (round-three stress): base-color is the field a single-series bar/column chart is
  // actually painted from, established live against published chart `1u88u` — reaching it end to
  // end through `produce`, not only inside `buildChartPayload`'s own unit test.
  it("should send base-color through to the real PATCH call for a bar-encoded chart", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec({ chartType: "d3-bars" }), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn,
    });
    const patchCall = calls.find((c) => c.method === "PATCH");
    expect(JSON.parse(patchCall.body).metadata.visualize["base-color"]).toBe(
      "#0B7A75",
    );
  });

  // FINDING Y3 (round-five stress): the round-three fix above stopped at the family it had been
  // measured on. `base-color` is the field EVERY single-series mark is painted from — measured live
  // on chart `cc6eK`, a scatter, where `custom-colors` alone gave 475 px of Datawrapper's own blue
  // and none of the accent, and `base-color` gave 475 px of the accent and none of the blue. Read
  // off the real PATCH body, not the payload builder, because the wire is what the provider sees.
  it("should send base-color through to the real PATCH call for a scatter too", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec({ chartType: "d3-scatter-plot" }), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn,
    });
    const patchCall = calls.find((c) => c.method === "PATCH");
    expect(JSON.parse(patchCall.body).metadata.visualize["base-color"]).toBe(
      "#0B7A75",
    );
  });

  // The other half of the same finding, and of finding 20 of the same round: the decision is
  // CALLED, and called before anything exists on the account. A payload whose accent reaches no
  // painted field must never become a live chart that someone later has to count pixels in.
  it("should check the accent reaches a painted field before it creates anything", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await produce(baseSpec({ chartType: "d3-scatter-plot" }), {
      size: "landscape",
      outDir: "/tmp",
      token: "secret",
      fetchFn,
    });
    const patch = JSON.parse(calls.find((c) => c.method === "PATCH").body);
    expect(
      accentPaintsTheMarks({ metadata: patch.metadata }, "#0B7A75"),
    ).toBe(true);
    expect(calls[0].method).toBe("POST");
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

  it("should persist a canonical Datawrapper beat and update the same chart after feedback", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    const { root, beatDir, identity } = await storyBeat("dw-story-beat-");
    try {
      const first = await produce(baseSpec({ format: "web" }), {
        ...identity,
        name: "co2",
        token: "secret",
        fetchFn,
      });
      expect(first.htmlPath).toBe(
        join(
          resolveDatawrapperBeatIdentity(identity).beatDir,
          "renders",
          "co2.html",
        ),
      );
      expect(await readFile(first.htmlPath, "utf8")).toContain(
        'src="https://datawrapper.dwcdn.net/aBcDe/1/"',
      );
      const receipt = JSON.parse(
        await readFile(join(beatDir, "DATAWRAPPER.json"), "utf8"),
      );
      expect(receipt).toMatchObject({
        schemaVersion: 2,
        provider: "datawrapper",
        state: "local-complete",
        outputId: basename(beatDir),
        chartId: "aBcDe",
        editableSpec: "spec.json",
        renderedArtifact: "renders/co2.html",
      });
      expect(
        JSON.parse(await readFile(join(beatDir, "spec.json"), "utf8")).takeaway,
      ).toBe("Emissions fell");

      await produce(
        baseSpec({ format: "web", takeaway: "Emissions fell further" }),
        {
          ...identity,
          name: "co2",
          token: "secret",
          fetchFn,
        },
      );
      expect(
        calls.filter(
          (call) =>
            call.method === "POST" &&
            call.url === "https://api.datawrapper.de/v3/charts",
        ),
      ).toHaveLength(1);
      expect(
        JSON.parse(await readFile(join(beatDir, "DATAWRAPPER.json"), "utf8"))
          .chartId,
      ).toBe("aBcDe");
      expect(
        JSON.parse(await readFile(join(beatDir, "spec.json"), "utf8")).takeaway,
      ).toBe("Emissions fell further");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // FINDING 1 (stress round two): the delivered iframe page's own `<html lang>` used to fall back
  // to `"en"` the instant `spec.language` sanitised to nothing, silently misdeclaring the page's
  // language rather than refusing. `spec.language` is the story's own recorded answer
  // (`STORYBOARD.md`'s `language:` field); the delivered page now carries it verbatim, and never
  // the silent fallback.
  it("should write the delivered page's own <html lang> from spec.language, verbatim", async () => {
    const { fetchFn } = fakeDatawrapper();
    const { root, identity } = await storyBeat("dw-lang-beat-");
    try {
      const result = await produce(
        baseSpec({ format: "web", language: "fr-FR" }),
        {
          ...identity,
          name: "co2",
          token: "secret",
          fetchFn,
        },
      );
      expect(await readFile(result.htmlPath, "utf8")).toContain(
        '<html lang="fr-FR">',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("should refuse rather than default to English when the language sanitises to nothing", async () => {
    const { fetchFn } = fakeDatawrapper();
    const { root, identity } = await storyBeat("dw-lang-empty-");
    try {
      await expect(
        produce(baseSpec({ format: "web", language: "\u{1F1EB}\u{1F1F7}" }), {
          ...identity,
          name: "co2",
          token: "secret",
          fetchFn,
        }),
      ).rejects.toThrow(/never defaulted to "en"/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // FINDING 7 (round-three stress): `pageLanguageMatchesStory` was exported and unit-tested and
  // nothing in this producer ever called it, so the delivered page's own `<html lang>` was only
  // ever checked by hand. Wired in as a regression guard on the ARTEFACT this call is about to
  // write: `spec.language` carrying a character `iframePage`'s own sanitiser strips (valid under
  // `validateChartSpec`, which only checks the field is non-empty) used to reach the delivered file
  // as a silently different string than what the story recorded — nothing compared the two before.
  it("should refuse to deliver a page whose own <html lang> would not match the recorded language after sanitising", async () => {
    const { fetchFn } = fakeDatawrapper();
    const { root, beatDir, identity } = await storyBeat("dw-lang-mismatch-");
    try {
      await expect(
        produce(baseSpec({ format: "web", language: "fr-FR!" }), {
          ...identity,
          name: "co2",
          token: "secret",
          fetchFn,
        }),
      ).rejects.toThrow(/does not match the story's recorded language/);
      expect(existsSync(join(beatDir, "renders", "co2.html"))).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("should persist a new chart ID before configuration so a failed run retries the same chart", async () => {
    const base = fakeDatawrapper();
    const { root, beatDir, identity } = await storyBeat("dw-prepared-beat-");
    let failDataOnce = true;
    const fetchFn = async (url, init = {}) => {
      if (String(url).endsWith("/charts/aBcDe/data") && failDataOnce) {
        failDataOnce = false;
        base.calls.push({
          url: String(url),
          method: init.method ?? "GET",
          body: init.body,
        });
        return new Response("injected data failure", { status: 500 });
      }
      return base.fetchFn(url, init);
    };
    try {
      await expect(
        produce(baseSpec({ format: "web" }), {
          ...identity,
          token: "secret",
          fetchFn,
        }),
      ).rejects.toThrow(/set chart data failed/);
      expect(
        JSON.parse(await readFile(join(beatDir, "DATAWRAPPER.json"), "utf8")),
      ).toMatchObject({
        state: "prepared",
        chartId: "aBcDe",
      });

      await produce(baseSpec({ format: "web" }), {
        ...identity,
        token: "secret",
        fetchFn,
      });
      expect(
        base.calls.filter(
          (call) =>
            call.method === "POST" &&
            call.url === "https://api.datawrapper.de/v3/charts",
        ),
      ).toHaveLength(1);
      expect(
        JSON.parse(await readFile(join(beatDir, "DATAWRAPPER.json"), "utf8")),
      ).toMatchObject({
        state: "local-complete",
        chartId: "aBcDe",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("should mark a failed revision prepared instead of leaving a stale complete claim", async () => {
    const base = fakeDatawrapper();
    const { root, beatDir, identity } = await storyBeat("dw-failed-revision-");
    try {
      await produce(baseSpec({ format: "web" }), {
        ...identity,
        token: "secret",
        fetchFn: base.fetchFn,
      });
      let failData = true;
      const fetchFn = async (url, init = {}) => {
        if (String(url).endsWith("/charts/aBcDe/data") && failData) {
          failData = false;
          return new Response("revision failed", { status: 500 });
        }
        return base.fetchFn(url, init);
      };
      await expect(
        produce(baseSpec({ format: "web", takeaway: "Revised" }), {
          ...identity,
          token: "secret",
          fetchFn,
        }),
      ).rejects.toThrow(/set chart data failed/);
      const receipt = JSON.parse(
        await readFile(join(beatDir, "DATAWRAPPER.json"), "utf8"),
      );
      expect(receipt).toMatchObject({
        schemaVersion: 2,
        state: "prepared",
        chartId: "aBcDe",
        lastCompleted: { renderedArtifact: "renders/chart.html" },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("should expose a story/output CLI mode that derives the provider receipt path", () => {
    expect(
      parseProduceCli(["stories", "story", "1-chart", "web", "--story-output"]),
    ).toEqual({
      storiesRoot: "stories",
      storyId: "story",
      outputId: "1-chart",
      formatArg: "web",
      sizeArg: undefined,
      storyOutputMode: true,
    });
  });

  it("should refuse a caller-selected tracked beat path", async () => {
    const { fetchFn, calls } = fakeDatawrapper();
    await expect(
      produce(baseSpec({ format: "web" }), {
        beatDir: "/tmp/some-beat",
        token: "secret",
        fetchFn,
      }),
    ).rejects.toThrow(/storiesRoot, storyId, and outputId/);
    expect(calls).toHaveLength(0);
  });

  it("should reject a symlinked story ancestor before using the bearer token", async () => {
    const { root, identity } = await storyBeat("dw-identity-");
    const linkedStory = "linked-story";
    await symlink(
      join(identity.storiesRoot, identity.storyId),
      join(identity.storiesRoot, linkedStory),
      "dir",
    );
    const { fetchFn, calls } = fakeDatawrapper();
    try {
      expect(() =>
        resolveDatawrapperBeatIdentity({ ...identity, storyId: linkedStory }),
      ).toThrow(/real directory/);
      await expect(
        produce(baseSpec({ format: "web" }), {
          ...identity,
          storyId: linkedStory,
          token: "secret",
          fetchFn,
        }),
      ).rejects.toThrow(/real directory/);
      expect(calls).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("should serialize concurrent first production so only one remote chart is created", async () => {
    const { root, identity } = await storyBeat("dw-concurrent-");
    const { fetchFn, calls } = fakeDatawrapper();
    try {
      const [first, second] = await Promise.all([
        produce(baseSpec({ format: "web" }), {
          ...identity,
          token: "secret",
          fetchFn,
        }),
        produce(baseSpec({ format: "web" }), {
          ...identity,
          token: "secret",
          fetchFn,
        }),
      ]);
      expect(first.chartId).toBe("aBcDe");
      expect(second.chartId).toBe("aBcDe");
      expect(
        calls.filter(
          (call) => call.method === "POST" && call.url.endsWith("/charts"),
        ),
      ).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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
      const outDir = await mkdtemp(join(tmpdir(), "dw-beat-real-"));
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
    const { fetchFn, calls } = fakeDatawrapper({
      pngBytes: fakePng(1080, 1920),
    });
    const outDir = await mkdtemp(join(tmpdir(), "dw-beat-"));
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
    const outDir = await mkdtemp(join(tmpdir(), "dw-beat-"));
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

// Finding 2 (round-two stress): the root's `.env` names the Datawrapper credential
// `DATAWRAPPER_API_TOKEN` — the engine's own name — and a naive `process.env.DATAWRAPPER_TOKEN`
// read refuses a valid, present token because it looked under the wrong name. `resolveDatawrapperToken`
// is the same reconciliation `skills/splash/scripts/keys.mjs` already does for its own capability
// rows, duplicated here (no cross-skill runtime import) so the producer that actually throws
// "no token" sees what the root actually holds before it refuses.
describe("resolveDatawrapperToken", () => {
  it("should read the canonical DATAWRAPPER_TOKEN when set", () => {
    expect(resolveDatawrapperToken({ DATAWRAPPER_TOKEN: "canonical" })).toBe(
      "canonical",
    );
  });

  it("should fall back to DATAWRAPPER_API_TOKEN, the root's own name, when DATAWRAPPER_TOKEN is absent", () => {
    expect(
      resolveDatawrapperToken({ DATAWRAPPER_API_TOKEN: "root-name" }),
    ).toBe("root-name");
  });

  it("should prefer the canonical name when both are set", () => {
    expect(
      resolveDatawrapperToken({
        DATAWRAPPER_TOKEN: "canonical",
        DATAWRAPPER_API_TOKEN: "root-name",
      }),
    ).toBe("canonical");
  });

  it("should return empty when neither name is set", () => {
    expect(resolveDatawrapperToken({})).toBe("");
  });
});

describe("missingDatawrapperTokenMessage", () => {
  it("should name both the variable it looked for and that the root holds neither", () => {
    expect(missingDatawrapperTokenMessage({})).toBe(
      "no Datawrapper token — looked for DATAWRAPPER_TOKEN or DATAWRAPPER_API_TOKEN, and the root holds neither — no mock, no fallback: a real token is required to produce a Datawrapper beat.",
    );
  });

  it("should never print a credential's value, even one sitting under an unlisted name", () => {
    const message = missingDatawrapperTokenMessage({
      DATAWRAPPER_API_TOKEN: "",
      SOME_OTHER_SECRET: "should-never-appear-in-a-message",
    });
    expect(message).not.toContain("should-never-appear-in-a-message");
  });
});
