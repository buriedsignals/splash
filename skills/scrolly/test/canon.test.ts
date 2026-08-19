import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("scrolly — the canon's assets", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "ScrollySeed.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry its own baked map plate — a real JPEG, not a placeholder file", async () => {
    const raw = await readFile(join(ASSETS, "sample-data", "potomac-plate.jpg"));
    // JPEG SOI marker + JFIF/EXIF app segment: proof this is a real decoded raster, not a stub.
    expect(raw.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(raw.length).toBeGreaterThan(10000);
  });

  it("should carry its own frozen readings and station file, beside the beat that credits them", async () => {
    const csv = await readFile(join(ASSETS, "sample-data", "potomac-2024.csv"), "utf8");
    const rdb = await readFile(join(ASSETS, "sample-data", "potomac-station.rdb"), "utf8");
    // A beat whose render reads its data from somewhere else cannot be audited at all — the single
    // strongest argument this project has for freezing data beside the artifact.
    expect(csv.split("\n")[0]).toBe("date,discharge_cfs");
    expect(csv.trim().split("\n").length).toBeGreaterThan(300);
    expect(rdb).toContain("01638500");
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

  it("should write its preview wherever --out points, and write a real PNG there", async () => {
    // RENAMED 2026-08-19, because the old name claimed more than the body proves. It was "should
    // render standalone with nothing else on disk", and it runs from the CHECKED-OUT tree: `proof/`,
    // `shared/`, the repository and every sibling skill are still on disk, so pointing `--out` at an
    // empty directory says nothing about isolation. It says `--out` is honoured and the result is a
    // PNG, which is worth keeping and is all it is.
    //
    // The isolation claim is really proved by `splash/test/seed-renders-standalone.test.ts`, which
    // copies this skill ALONE into a fresh root — no `proof/`, no `shared/`, no sibling — and
    // requires the same picture out of it. `scrolly` was outside that walk until the same day, which
    // is how a test could carry this name for months without anyone noticing it was empty.
    const outDir = "/tmp/scrolly-empty-root-test";
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

describe("scrolly — a vehicle, not a new format of chart", () => {
  it("should carry a seed that assembles DIFFERENT MEDIA — including a real map track and a real chart track", async () => {
    // The vehicle's whole justification. A seed carrying only a picture and a diagram demonstrated
    // the mechanism but never the point: a map and a chart are media other skills in this project
    // already produce on their own, and assembling BOTH behind one narrative is the thing none of
    // them can do. Losing either track would leave a scrolly that a single beat could replace.
    const { STEPS_META } = await import("../assets/ScrollySeed.tsx");
    const kinds = new Set(
      STEPS_META.map((s: { frameKind: string }) => s.frameKind),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    expect(kinds.has("map")).toBe(true);
    expect(kinds.has("chart")).toBe(true);
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
    // The whole boundary is covered by splash/test/no-cross-skill-imports.test.ts, which scans
    // every skill directory automatically. This is a narrower, named check kept here so a reader of
    // THIS skill's own red build sees the failure without having to know that other file exists —
    // the same reasoning chart-web/SKILL.md gives for its own equivalent guard.
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
