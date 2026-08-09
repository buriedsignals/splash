import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-scrolly — the canon's assets", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "ScrollySeed.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry sample data the seed can render on its own", async () => {
    const raw = await readFile(
      join(ASSETS, "sample-data", "rainfall.json"),
      "utf8",
    );
    const rows = JSON.parse(raw);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const r of rows) {
      expect(typeof r.year).toBe("number");
      expect(typeof r.value).toBe("number");
    }
  });

  it("should not carry any other beat's own copy of the sample data", async () => {
    const raw = await readFile(
      join(ASSETS, "sample-data", "rainfall.json"),
      "utf8",
    );
    // This skill's own data is distinct in value from twin-chart-beat's and twin-chart-web's own
    // rainfall.json — comparable only in shape, per this project's own convention (see
    // twin-chart-web/SKILL.md, "Files"). 2016 is this seed's own reference year; the other two
    // genres' files start at 2015.
    expect(raw).toContain("2016");
    expect(raw).not.toContain('"year": 2015');
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    expect(await proc.exited).toBe(0);
  });
});

describe("twin-scrolly — a vehicle, not a new genre of chart", () => {
  it("should not carry a registry or dispatcher file", async () => {
    // The brief this skill was built from: "A scrolly is a vehicle: it carries beats, it is not a
    // new kind of beat. Do not build a registry or a dispatcher." Structural check: no source file
    // under this skill matches either name.
    const glob = new Bun.Glob("**/*.{ts,tsx,mjs,js}");
    const SKILL_ROOT = join(import.meta.dirname, "..");
    const offenders: string[] = [];
    for await (const file of glob.scan({ cwd: SKILL_ROOT })) {
      if (file.startsWith("test/")) continue;
      if (/registry|dispatcher/i.test(file)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("should have no import leaving the skill directory outside test/", async () => {
    // The whole boundary is covered by splash-twin/test/no-cross-skill-imports.test.ts, which scans
    // every skill directory automatically. This is a narrower, named check kept here so a reader of
    // THIS skill's own red build sees the failure without having to know that other file exists —
    // the same reasoning twin-chart-web/SKILL.md gives for its own equivalent guard.
    const glob = new Bun.Glob("**/*.{ts,tsx,mjs,js}");
    const SKILL_ROOT = join(import.meta.dirname, "..");
    const offenders: string[] = [];
    for await (const file of glob.scan({ cwd: SKILL_ROOT })) {
      if (file.startsWith("test/")) continue;
      const src = await readFile(join(SKILL_ROOT, file), "utf8");
      // A cheap, narrow probe (not the full literal/escape-aware scan the shared guard runs): any
      // relative specifier that climbs above this skill's own root.
      const climbs = src.match(/["'`]\.\.\/\.\.\//g);
      if (climbs) offenders.push(`${file}: ${climbs.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });
});
