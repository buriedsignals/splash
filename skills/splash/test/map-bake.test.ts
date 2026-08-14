import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  bakeMapContract,
  captureMap,
  validateMapBakeContract,
} from "../scripts/sealed-map-bake.mjs";

const roots: string[] = [];
const liveBrowser = process.env.SPLASH_LIVE_BROWSER;

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function digest(body: string | Buffer) {
  return `sha256:${createHash("sha256").update(body).digest("hex")}`;
}

async function fixture() {
  const story = await realpath(await mkdtemp(join(tmpdir(), "splash-map-bake-")));
  roots.push(story);
  const beat = join(story, "beats", "map-one");
  await mkdir(join(story, "source"), { recursive: true });
  await mkdir(beat, { recursive: true });
  const geography = `${JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "paris", name: "Paris" },
        geometry: { type: "Point", coordinates: [2.35, 48.86] },
      },
      {
        type: "Feature",
        properties: { id: "london", name: "London" },
        geometry: { type: "Point", coordinates: [-0.13, 51.51] },
      },
    ],
  })}\n`;
  const data = `${JSON.stringify([
    { id: "paris", value: 11 },
    { id: "london", value: 9.5 },
  ])}\n`;
  await writeFile(join(story, "source", "places.geojson"), geography);
  await writeFile(join(story, "source", "values.json"), data);
  const contract = {
    schemaVersion: 1,
    treatment: "map.proportional-symbol",
    format: "web",
    camera: {
      bounds: [
        [-8, 44],
        [8, 56],
      ],
      width: 1000,
      height: 640,
      settleMs: 5000,
    },
    basemap: { style: "dataviz-light", labels: "hide-all" },
    geography: {
      path: "source/places.geojson",
      digest: digest(geography),
      idProperty: "id",
      nameProperty: "name",
      studyIds: ["paris", "london"],
    },
    data: {
      path: "source/values.json",
      digest: digest(data),
      format: "json",
      joinProperty: "id",
    },
    anchors: [{ id: "subject", coordinates: [2.35, 48.86] }],
    outputs: { plate: "plate.png", geometry: "geometry.json" },
  };
  const body = `${JSON.stringify(contract, null, 2)}\n`;
  await writeFile(join(beat, "MAP-BAKE.json"), body);
  return { story, beat, contract, contractDigest: digest(body) };
}

function fakeCapture(counter: { count: number }) {
  return async ({ contract, features, platePath }: any) => {
    counter.count += 1;
    expect(contract.treatment).toBe("map.proportional-symbol");
    expect(features.map((row: any) => row.id)).toEqual(["paris", "london"]);
    await writeFile(platePath, Buffer.from("deterministic-png-fixture"));
    return {
      schemaVersion: "splash-map-geometry/v1",
      frame: { width: 1000, height: 640 },
      features: features.map((row: any, index: number) => ({
        id: row.id,
        name: row.name,
        geometry: { type: "Point", coordinates: [100 + index, 200 + index] },
      })),
    };
  };
}

describe("managed declarative map bake", () => {
  test("materialises one immutable digest-addressed bake and reuses it idempotently", async () => {
    const value = await fixture();
    const counter = { count: 0 };
    const input = {
      story: value.story,
      outputId: "map-one",
      contractDigest: value.contractDigest,
      browserPath: "/managed/browser",
      mapTilerKey: "map-secret-must-not-be-persisted",
    };
    const first = await bakeMapContract(input, {
      captureFn: fakeCapture(counter),
    });
    const second = await bakeMapContract(input, {
      captureFn: fakeCapture(counter),
    });
    expect(counter.count).toBe(1);
    expect(second).toEqual(first);
    expect(first.outputs).toHaveLength(3);
    const receipt = await readFile(join(value.story, first.outputs[2]), "utf8");
    expect(receipt).toContain(value.contractDigest);
    expect(receipt).not.toContain("map-secret-must-not-be-persisted");
    const geometry = await readFile(join(value.story, first.outputs[1]), "utf8");
    expect(geometry).toContain("splash-map-geometry/v1");
    expect(geometry).not.toContain("map-secret-must-not-be-persisted");
  });

  test("rejects changed inputs and contract drift before capture", async () => {
    const value = await fixture();
    const counter = { count: 0 };
    await writeFile(
      join(value.story, "source", "values.json"),
      '[{"id":"paris","value":99}]\n',
    );
    await expect(
      bakeMapContract(
        {
          story: value.story,
          outputId: "map-one",
          contractDigest: value.contractDigest,
          browserPath: "/managed/browser",
          mapTilerKey: "secret",
        },
        { captureFn: fakeCapture(counter) },
      ),
    ).rejects.toThrow("declared digest");
    expect(counter.count).toBe(0);

    await writeFile(
      join(value.beat, "MAP-BAKE.json"),
      `${JSON.stringify({ ...value.contract, format: "static" }, null, 2)}\n`,
    );
    await expect(
      bakeMapContract(
        {
          story: value.story,
          outputId: "map-one",
          contractDigest: value.contractDigest,
          browserPath: "/managed/browser",
          mapTilerKey: "secret",
        },
        { captureFn: fakeCapture(counter) },
      ),
    ).rejects.toThrow("declared digest");
    expect(counter.count).toBe(0);
  });

  test("rejects symlinked story inputs", async () => {
    const value = await fixture();
    const outside = join(value.story, "outside.geojson");
    await writeFile(outside, '{"type":"FeatureCollection","features":[]}\n');
    await rm(join(value.story, "source", "places.geojson"));
    try {
      await symlink(outside, join(value.story, "source", "places.geojson"));
    } catch {
      return;
    }
    await expect(
      bakeMapContract(
        {
          story: value.story,
          outputId: "map-one",
          contractDigest: value.contractDigest,
          browserPath: "/managed/browser",
          mapTilerKey: "secret",
        },
        { captureFn: fakeCapture({ count: 0 }) },
      ),
    ).rejects.toThrow("symlink");
  });

  test("keeps proof-only treatments and arbitrary output names outside the contract", () => {
    const contract: any = {
      schemaVersion: 1,
      treatment: "map.contour-isoline",
      format: "web",
      camera: {
        bounds: [
          [-8, 44],
          [8, 56],
        ],
        width: 1000,
        height: 640,
        settleMs: 5000,
      },
      basemap: { style: "dataviz-light", labels: "hide-all" },
      geography: {
        path: "source/places.geojson",
        digest: `sha256:${"a".repeat(64)}`,
        idProperty: "id",
        nameProperty: "name",
        studyIds: ["paris"],
      },
      data: {
        path: "source/values.json",
        digest: `sha256:${"b".repeat(64)}`,
        format: "json",
        joinProperty: "id",
      },
      anchors: [],
      outputs: { plate: "caller.png", geometry: "geometry.json" },
    };
    expect(() => validateMapBakeContract(contract, "map-one")).toThrow(
      "shipped map treatment",
    );
    contract.treatment = "map.locator";
    expect(() => validateMapBakeContract(contract, "map-one")).toThrow(
      "plate.png",
    );
  });

  test.skipIf(!liveBrowser)(
    "renders the generic contract through real Puppeteer and local MapLibre",
    async () => {
      const value = await fixture();
      const styleDefinition = JSON.parse(
        await readFile(
          join(
            import.meta.dirname,
            "../../../apps/goose/compatibility/fixtures/map-style.json",
          ),
          "utf8",
        ),
      );
      const result = await bakeMapContract(
        {
          story: value.story,
          outputId: "map-one",
          contractDigest: value.contractDigest,
          browserPath: await realpath(liveBrowser!),
          mapTilerKey: "synthetic-local-style-only",
        },
        {
          captureFn: (input) => captureMap({ ...input, styleDefinition }),
        },
      );
      expect(
        (await readFile(join(value.story, result.outputs[0]))).byteLength,
      ).toBeGreaterThan(1000);
      const geometry = JSON.parse(
        await readFile(join(value.story, result.outputs[1]), "utf8"),
      );
      expect(geometry.features.map((row: any) => row.id)).toEqual([
        "paris",
        "london",
      ]);
      expect(geometry.gatedBy).toMatch(/idle|settle/);
    },
    60_000,
  );
});
