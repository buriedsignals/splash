// The scrolly producer resolves geometry through the SAME resolver map-native's does, so it
// carried the SAME missing bridge: a map-track scrolly written straight from a spec (the prose
// chain writes it verbatim) never went through the loop's orient step, so an admin-1 join
// arrived with no resolved region ids and the resolver refused.
//
// The hook that closes it (`scripts/produce.mjs`) had no test of its own — an adversarial review
// found that deleting the line left every suite green. This is that test: it asserts on the
// config the producer writes, so it needs no MapTiler key and no browser.
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

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const PRODUCE = join(root, "scripts", "produce.mjs");

const CANTON_ROWS = [
  { canton: "Genève", rate: 157 },
  { canton: "Vaud", rate: 110 },
  { canton: "Zurich", rate: 72 },
  { canton: "Jura", rate: 43 },
];

describe("a map-track scrolly on admin-1 resolves from a spec the loop never touched", () => {
  it("writes cantonal geometry into the produced config", () => {
    const runDir = mkdtempSync(join(tmpdir(), "scrolly-adm1-"));
    const configPath = join(runDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        type: "choropleth",
        regionKey: "canton",
        valueField: "rate",
        rows: CANTON_ROWS,
        basemap: "natural-earth-admin-1",
        title: "Genève enferme plus du double de Zurich",
        description: "Détenus pour 100 000 habitants, quatre cantons.",
        lang: "fr",
        source: { name: "Heidi.news" },
        chapters: [
          {
            id: "c1",
            prose: "Genève enferme plus du double de Zurich.",
            step: { region: "Genève" },
          },
        ],
      }),
    );
    const outDir = join(runDir, "out");
    mkdirSync(outDir, { recursive: true });

    spawnSync("bun", [PRODUCE, configPath, outDir], {
      cwd: root,
      encoding: "utf8",
    }); // exit code deliberately not asserted — the build may fail later, for other reasons

    const writtenPath = join(outDir, "config.json");
    expect(existsSync(writtenPath)).toBe(true);
    const written = JSON.parse(readFileSync(writtenPath, "utf8"));
    expect(written.geometry.type).toBe("Topology");
    const objName = Object.keys(written.geometry.objects)[0]!;
    expect(written.geometry.objects[objName].geometries).toHaveLength(4);
  }, 120_000);
});
