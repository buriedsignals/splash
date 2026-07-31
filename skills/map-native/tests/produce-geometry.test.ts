// produce.mjs resolves a config's geometry DESCRIPTOR (config.geography) into actual bytes
// (config.geometry, a TopoJSON Topology) before anything is built, and refuses a missing OSM
// credit for a DECLARED geometry (D5, D7). This suite shells the REAL produce.mjs (no mock,
// per repo convention) against a real `bunx mapshaper` subsetGeometry call — the only thing it
// does NOT need is a full render: the geometry-resolution step this task adds runs before the
// conformance gate and before any Vite/Remotion build step, so a deliberately minimal config
// (too-short title, no altInsight, etc.) makes produce.mjs fail LATER, at the conformance gate
// — by which point config.json has already been written to outDir with its resolved geometry.
// Both tests assert on that written config.json, not on produce.mjs's exit code.
import { describe, it, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, ".."); // skills/map-native
const PRODUCE = join(root, "scripts", "produce.mjs");
const ASSETS = join(root, "assets", "geo");

function runProduceRaw(configPath: string, outDir: string, format = "static") {
  return spawnSync("bun", [PRODUCE, configPath, outDir, format], {
    cwd: root,
    encoding: "utf8",
  });
}

describe("produce.mjs resolves a declared geography's subset into config.geometry", () => {
  it("writes a Topology into config.json for a choropleth against a declared file — the fixture: 2 Swiss cantons out of a 3-canton source", () => {
    const runDir = mkdtempSync(join(tmpdir(), "produce-geo-test-"));
    const sourcePath = join(runDir, "cantons.geojson");
    writeFileSync(
      sourcePath,
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Genève" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [6, 46],
                  [6, 47],
                  [7, 47],
                  [7, 46],
                  [6, 46],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: { name: "Vaud" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [6.5, 46.5],
                  [6.5, 47.5],
                  [7.5, 47.5],
                  [7.5, 46.5],
                  [6.5, 46.5],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: { name: "Zurich" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [8, 47],
                  [8, 48],
                  [9, 48],
                  [9, 47],
                  [8, 47],
                ],
              ],
            },
          },
        ],
      }),
    );
    const config = {
      type: "choropleth",
      regionKey: "canton",
      valueField: "v",
      rows: [
        { canton: "Genève", v: 1 },
        { canton: "Vaud", v: 2 },
      ], // Zurich NOT drawn
      geography: {
        origin: "declared",
        set: "declared",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
        sourcePath, // produce-time-only — where to read the frozen file from, never shipped
      },
      geoCredit: { name: "swisstopo" },
      title: "t",
      description: "d",
      source: { name: "s" },
    };
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(config));
    const outDir = join(runDir, "out");
    mkdirSync(outDir, { recursive: true });

    runProduceRaw(configPath, outDir); // deliberately not asserted on exit code — see file header

    const writtenPath = join(outDir, "config.json");
    expect(existsSync(writtenPath)).toBe(true);
    const written = JSON.parse(readFileSync(writtenPath, "utf8"));
    expect(written.geometry.type).toBe("Topology");
    const objName = Object.keys(written.geometry.objects)[0];
    expect(written.geometry.objects[objName].geometries).toHaveLength(2); // Zurich excluded

    // sourcePath is produce-time-only — must never survive into the artifact.
    expect(written.geography.sourcePath).toBeUndefined();
    expect(written.geography.joinKey).toBe("name");
  }, 60_000);

  it("keeps EVERY feature of the source for a route config — there is no pre-known per-row id list to filter against (D5 gap this task closes for route)", () => {
    const runDir = mkdtempSync(join(tmpdir(), "produce-geo-route-test-"));
    const sourcePath = join(runDir, "territories.geojson");
    writeFileSync(
      sourcePath,
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Alpha" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [0, 1],
                  [1, 1],
                  [1, 0],
                  [0, 0],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: { name: "Beta" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [2, 2],
                  [2, 3],
                  [3, 3],
                  [3, 2],
                  [2, 2],
                ],
              ],
            },
          },
        ],
      }),
    );
    const config = {
      type: "route",
      geography: {
        origin: "declared",
        set: "declared",
        level: "territory",
        joinKey: "name",
        joinKeyFamily: "name",
        sourcePath,
      },
      geoCredit: { name: "swisstopo" },
      title: "t",
      description: "d",
      source: { name: "s" },
    };
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(config));
    const outDir = join(runDir, "out");
    mkdirSync(outDir, { recursive: true });

    runProduceRaw(configPath, outDir);

    const written = JSON.parse(
      readFileSync(join(outDir, "config.json"), "utf8"),
    );
    expect(written.geometry.type).toBe("Topology");
    const objName = Object.keys(written.geometry.objects)[0];
    expect(written.geometry.objects[objName].geometries).toHaveLength(2); // BOTH kept
  }, 60_000);

  it("refuses (throws) when config.geography is a DECLARED geometry and config.geoCredit is missing — D7", () => {
    const runDir = mkdtempSync(join(tmpdir(), "produce-geo-credit-test-"));
    const config = {
      type: "choropleth",
      geography: {
        origin: "declared",
        set: "declared",
        level: "canton",
        joinKey: "name",
        joinKeyFamily: "name",
        sourcePath: "/does/not/matter/for/this/assertion",
      },
      // geoCredit deliberately omitted
    };
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(config));
    const outDir = join(runDir, "out");

    const result = runProduceRaw(configPath, outDir);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/credit/i);
    // The refusal must fire BEFORE the config.json side-effect — no partial artifact.
    expect(existsSync(join(outDir, "config.json"))).toBe(false);
  }, 30_000);

  it('does NOT require a credit for a SHIPPED basemap (legacy `basemap: "world"` config, no `geography` at all) — public-domain geometry, no attribution owed', () => {
    const runDir = mkdtempSync(join(tmpdir(), "produce-geo-shipped-test-"));
    const config = {
      type: "choropleth",
      regionKey: "code",
      valueField: "v",
      basemap: "world",
      rows: [
        { code: "FRA", v: 1 },
        { code: "DEU", v: 2 },
      ],
      // no `geography`, no `geoCredit` — the legacy shape every real sample-data fixture uses
      title: "t",
      description: "d",
      source: { name: "s" },
    };
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(config));
    const outDir = join(runDir, "out");
    mkdirSync(outDir, { recursive: true });

    const result = runProduceRaw(configPath, outDir);

    // Must NOT fail on a missing credit — assert the credit message never appears, whatever
    // else this deliberately-minimal config later fails conformance on.
    expect(result.stderr).not.toMatch(/credit is missing or blank/i);
    const written = JSON.parse(
      readFileSync(join(outDir, "config.json"), "utf8"),
    );
    expect(written.geometry.type).toBe("Topology");
    expect(written.geography.origin).toBe("shipped");
  }, 60_000);

  it("should keep the human label when the join key is not the label", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      basemap: "world",
      regionKey: "code",
      rows: [
        { code: "FRA", value: 1 },
        { code: "DEU", value: 2 },
      ],
    };
    await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    const topo = config.geometry as {
      objects: Record<
        string,
        { geometries: { properties?: Record<string, unknown> }[] }
      >;
    };
    const props = Object.values(topo.objects).flatMap((o) => o.geometries)[0]!
      .properties!;
    expect(props.iso_a3).toBeDefined();
    expect(props.name).toBeDefined(); // the popup, the callout and the route label all read this
  }, 30_000);
});
