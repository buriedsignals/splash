import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readImageMeta } from "../scripts/render-still.mjs";

const ASSETS = join(import.meta.dirname, "..", "assets");
const SAMPLE = join(ASSETS, "sample-data");

describe("image-beat — the canon's assets", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "ImageBeatSeed.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should not add a layout/variant prop to the seed", async () => {
    const seed = await readFile(join(ASSETS, "ImageBeatSeed.tsx"), "utf8");
    // The exact failure the seed's own doc-comment (and SKILL.md's "When to use") names: a
    // parameter that turns this from a written beat into a configured component.
    expect(seed).not.toMatch(/\blayout\s*[:?]/);
    expect(seed).not.toMatch(/\bvariant\s*[:?]/);
  });

  it("should carry sample data the seed can render on its own, at least two photos, each with alt and credit", async () => {
    const manifest = JSON.parse(
      await readFile(join(SAMPLE, "manifest.json"), "utf8"),
    );
    expect(typeof manifest.title).toBe("string");
    expect(manifest.title.length).toBeGreaterThan(0);
    expect(Array.isArray(manifest.photos)).toBe(true);
    expect(manifest.photos.length).toBeGreaterThanOrEqual(2);
    for (const photo of manifest.photos) {
      expect(typeof photo.file).toBe("string");
      expect(typeof photo.alt).toBe("string");
      expect(photo.alt.trim().length).toBeGreaterThan(0);
      expect(typeof photo.credit).toBe("string");
      expect(photo.credit.trim().length).toBeGreaterThan(0);
    }
  });

  it("should ship at least one sample photo whose aspect ratio does not match the others — the case that exposes a tidy-inputs-only layout", async () => {
    const manifest = JSON.parse(
      await readFile(join(SAMPLE, "manifest.json"), "utf8"),
    );
    const ratios = await Promise.all(
      manifest.photos.map(async (photo: { file: string }) => {
        const bytes = await readFile(join(SAMPLE, photo.file));
        const meta = readImageMeta(bytes);
        return meta.width / meta.height;
      }),
    );
    const landscape = ratios.filter((r) => r > 1).length;
    const portrait = ratios.filter((r) => r < 1).length;
    expect(landscape).toBeGreaterThan(0);
    expect(portrait).toBeGreaterThan(0);
  });

  it("should not carry another story's own copy", async () => {
    const seed = await readFile(join(ASSETS, "ImageBeatSeed.tsx"), "utf8");
    // Distinctive phrases from other genres' own seeds — a copy-paste leak, not this seed's words.
    for (const leak of [
      "Annemasse",
      "MeteoSwiss",
      "gauge station",
      "sample basin",
    ]) {
      expect(seed).not.toContain(leak);
    }
  });

  it("should credit its own sample images as generated, not as real photographs with unstated provenance", async () => {
    const manifest = JSON.parse(
      await readFile(join(SAMPLE, "manifest.json"), "utf8"),
    );
    for (const photo of manifest.photos) {
      expect(photo.credit.toLowerCase()).toContain("not a real photograph");
    }
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    // A longer timeout than the default 5000ms: this beat measures many more distinct
    // strings (title + three captions + three credits) than a single-series chart does, and
    // each unique `measureText` call re-scans system fonts (`Resvg#getBBox` with
    // `loadSystemFonts: true`) — measured at ~7-8s on this machine, comfortably under 20s.
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    expect(await proc.exited).toBe(0);
  }, 20000);
});
