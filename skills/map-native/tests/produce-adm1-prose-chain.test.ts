// THE PROOF THE ADM1 DEFECT ASKED FOR — taken through the PROSE chain's own shape.
//
// A real run (Heidi.news, « Pourquoi les prisons genevoises sont-elles pleines à craquer ? »)
// offered a Swiss cantonal choropleth, validated it, and then failed at produce: an admin-1 join
// needs `config.featureIdsByValue`, which only the loop chain's orient/assemble steps ever wrote.
// The existing ADM1 render proof went through the loop, which is exactly why this stayed
// invisible for the chain a journalist actually walks.
//
// So this fixture is the SPEC as `lib/core/verbs/render.ts` writes it — verbatim, no assembler,
// no geography descriptor, no ids — and the assertion is that produce resolves real cantonal
// geometry out of it anyway.
//
// KEYLESS and fast, by the same trick `produce-geometry.test.ts` documents: geometry resolution
// runs before any Vite/Remotion step, so the written `outDir/config.json` carries the answer
// whatever produce does afterwards. Exit code is deliberately not asserted.
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

// The run's own spec, trimmed to the fields that matter here. Note what it does NOT carry:
// `geography`, `featureIdsByValue`, `type` — a spec, not an assembled config.
const PRISONS_SPEC = {
  regionKey: "canton_code",
  valueField: "detenus_pour_100000_hab",
  labelField: "canton",
  rows: [
    { canton_code: "CH-GE", canton: "Genève", detenus_pour_100000_hab: 157 },
    { canton_code: "CH-VD", canton: "Vaud", detenus_pour_100000_hab: 110 },
    { canton_code: "CH-ZH", canton: "Zurich", detenus_pour_100000_hab: 72 },
    { canton_code: "CH-JU", canton: "Jura", detenus_pour_100000_hab: 43 },
  ],
  basemap: "natural-earth-admin-1",
  title:
    "Genève enferme plus du double de Zurich et près de quatre fois le Jura",
  description:
    "Personnes détenues pour 100 000 habitants, dans les quatre cantons chiffrés par l'article.",
  unit: "Détenus pour 100 000 habitants",
  valueUnit: "détenus / 100 000 hab.",
  lang: "fr",
  source: { name: "Heidi.news" },
};

describe("an admin-1 choropleth produces from a spec that never went through the loop", () => {
  it("resolves cantonal geometry from the spec the prose chain writes", () => {
    const runDir = mkdtempSync(join(tmpdir(), "adm1-prose-"));
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(PRISONS_SPEC));
    const outDir = join(runDir, "out");
    mkdirSync(outDir, { recursive: true });

    spawnSync("bun", [PRODUCE, configPath, outDir, "static"], {
      cwd: root,
      encoding: "utf8",
    }); // exit code deliberately not asserted — see the file header

    const writtenPath = join(outDir, "config.json");
    expect(existsSync(writtenPath)).toBe(true);
    const written = JSON.parse(readFileSync(writtenPath, "utf8"));

    // Real bytes, not a descriptor: this is what the throw used to prevent.
    expect(written.geometry.type).toBe("Topology");
    const objName = Object.keys(written.geometry.objects)[0]!;
    expect(written.geometry.objects[objName].geometries).toHaveLength(4);

    // The join was re-pointed at the column that actually names admin-1 regions, exactly as the
    // loop's assembler does — `canton_code` ("CH-GE") resolves to nothing in the index.
    expect(written.regionKey).toBe("canton");

    // And the produce-time-only field is gone from the artifact.
    expect(written.featureIdsByValue).toBeUndefined();
  }, 120_000);
});
