import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

// A cold-cache plate bake (headless Chrome + a real MapTiler capture, at this skill's own
// generously-sized 1000px plate) plus the preview's own headless-Chrome screenshot can together
// take well over bun's 5s default the first time this runs on a machine.
setDefaultTimeout(120000);

describe("map-web assets — the canon's shape, not a story's", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "MapWebSeed.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry sample data the seed can render on its own", async () => {
    const raw = await readFile(
      join(ASSETS, "sample-data", "regions.json"),
      "utf8",
    );
    const rows = JSON.parse(raw);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      expect(typeof r.key).toBe("string");
      expect(typeof r.name).toBe("string");
      expect(typeof r.lon).toBe("number");
      expect(typeof r.lat).toBe("number");
      expect(typeof r.value).toBe("number");
    }
  });

  it("should not carry the CO2 choropleth beat's own copy — this format's own seed is a symbol map", async () => {
    const seed = await readFile(join(ASSETS, "MapWebSeed.tsx"), "utf8");
    for (const leak of [
      "CO₂",
      "Suisse",
      "CHE",
      "Global Carbon Budget",
      "choropleth",
    ]) {
      expect(seed).not.toContain(leak);
    }
  });

  /**
   * The behaviour half of this format's verification, run rather than merely shipped. It drives a
   * real browser with real pointer events, real clicks and real key presses — see the script's own
   * header for why nothing cheaper can catch the defect class it exists for (an overlay that
   * swallows hovers passes every dispatched-event and `.focus()` check ever written). It costs a
   * Chrome launch, which this file already pays for `--check` directly below.
   */
  it("should pass every real-browser interaction check the format claims", async () => {
    const proc = Bun.spawn(["bun", "scripts/verify-interaction.mjs"], {
      cwd: join(import.meta.dirname, ".."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    if (code !== 0) {
      const out = await new Response(proc.stdout).text();
      const err = await new Response(proc.stderr).text();
      throw new Error(
        `verify-interaction.mjs failed:\n${out.slice(-3000)}\n${err.slice(-2000)}`,
      );
    }
    expect(code).toBe(0);
  });

  it("should have a preview.png that is a current render of the seed", async () => {
    const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
      cwd: join(import.meta.dirname, ".."),
    });
    const code = await proc.exited;
    if (code !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`render-preview.mjs --check failed:\n${stderr}`);
    }
    expect(code).toBe(0);
  });
});
