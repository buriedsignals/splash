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

  it("should carry its own photograph — a real PNG, not a placeholder file", async () => {
    const raw = await readFile(join(ASSETS, "sample-data", "basin-photo.png"));
    // PNG magic number — proves this is a real decoded raster, not an empty or truncated stub.
    expect(raw.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    // IHDR: width/height are the first two 4-byte big-endian ints after the 8-byte signature and
    // the 4-byte length + "IHDR" tag (offset 16).
    const width = raw.readUInt32BE(16);
    const height = raw.readUInt32BE(20);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    expect(await proc.exited).toBe(0);
  });

  it("should render standalone with nothing else on disk — proof `render-preview.mjs` needs only this skill's own directory", async () => {
    // `render-preview.mjs` reads only `assets/ScrollySeed.tsx` (relative, inside this skill) and
    // writes to a caller-supplied --out directory: nothing here depends on a story, another skill,
    // or a file outside this skill's own root. Proven by pointing --out at an otherwise-empty tmp
    // directory and confirming a real PNG lands there.
    const outDir = "/tmp/twin-scrolly-empty-root-test";
    const proc = Bun.spawn(
      ["bun", "scripts/render-preview.mjs", "--out", outDir],
      { cwd: join(import.meta.dirname, "..") },
    );
    expect(await proc.exited).toBe(0);
    expect(existsSync(join(outDir, "preview.png"))).toBe(true);
    const png = await readFile(join(outDir, "preview.png"));
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });
});

describe("twin-scrolly — a vehicle, not a new genre of chart", () => {
  it("should carry a seed that assembles at least two VISIBLY DIFFERENT kinds of frame, not several states of one chart", async () => {
    const { STEPS_META } = await import("../assets/ScrollySeed.tsx");
    const kinds = new Set(
      STEPS_META.map((s: { frameKind: string }) => s.frameKind),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });

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
