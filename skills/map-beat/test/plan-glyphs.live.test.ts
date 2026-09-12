// LANE: heavy
import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import {
  servedFaces,
  assertNotFallback,
  maptilerGlyphs,
} from "#shared/map-beat/glyphs.mjs";

/** MEASURED, NOT ASSUMED: MapTiler answers 200 to ANY font name and serves Noto Sans. */
describe("the glyph guard", () => {
  it("should list the families MapTiler actually serves", async () => {
    const real = await servedFaces();
    expect(real).toContain("Metropolis");
    expect(real).not.toContain("Futura");
  }, 30_000);

  it("should refuse a face whose glyphs are byte-identical to the fallback", async () => {
    const noto = await maptilerGlyphs("Noto Sans Regular", "0-255");
    const futura = await maptilerGlyphs("Futura Medium", "0-255");
    // MapTiler answered 200 for a family it does not have. Same bytes, no error, no warning.
    expect(createHash("sha256").update(futura).digest("hex")).toBe(
      createHash("sha256").update(noto).digest("hex"),
    );
    expect(() => assertNotFallback(futura, noto, "Futura Medium")).toThrow(
      /substituted/,
    );
  });
});
