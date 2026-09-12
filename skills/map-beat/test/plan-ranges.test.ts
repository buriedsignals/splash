import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  rangesNeededBy,
  assertRangesServed,
  serveGlyphs,
} from "#shared/map-beat/bake.mjs";

describe("the glyph range guard", () => {
  it("should need only the Latin block for plain ASCII", () => {
    expect(rangesNeededBy(["Mer du Nord", "ISLANDE"])).toEqual(["0-255"]);
  });

  it("should need the punctuation block for a typographic apostrophe", () => {
    expect(rangesNeededBy(["Mer d’Azov"])).toEqual(["0-255", "8192-8447"]);
  });

  it("should refuse a beat whose words need a range nobody serves", () => {
    expect(() => assertRangesServed(["Mer d’Azov"], ["0-255"])).toThrow(
      /8192-8447/,
    );
  });
});

/** The beat's own faces are files on disk and MapLibre reads glyphs over HTTP, so something has to
 *  put the one in front of the other. What it must never do is answer 200 with nothing. */
describe("the glyph server", () => {
  const dir = mkdtempSync(join(tmpdir(), "map-beat-glyphs-"));
  const stack = "Avenir Next Regular";
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const served = serveGlyphs(dir);
  afterAll(() => served.stop());

  it("should hand MapLibre a template with its own placeholders intact", () => {
    expect(served.url).toMatch(/^http:\/\/localhost:\d+\/\{fontstack\}\/\{range\}\.pbf$/);
  });

  it("should return the bytes of a range that was baked", async () => {
    await Bun.write(join(dir, stack, "0-255.pbf"), bytes);
    const at = served.url
      .replace("{fontstack}", encodeURIComponent(stack))
      .replace("{range}", "0-255");
    const response = await fetch(at);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  /** AN EMPTY 200 IS THE FAILURE, NOT THE FALLBACK. MapLibre reads one as a range with no glyphs in
   *  it and draws the word with those characters absent, silently. */
  it("should 404 a range nobody baked rather than answer with nothing", async () => {
    const at = served.url
      .replace("{fontstack}", encodeURIComponent("Zzz Fictive Regular"))
      .replace("{range}", "0-255");
    const response = await fetch(at);
    expect(response.status).toBe(404);
  });

  /** ONE PATH SEGMENT IS NOT ONE NAME. `%2E%2E%2Fsomewhere` matches the glyph shape and decodes
   *  into a climb out of the directory, so the file it reaches really exists here: the check has to
   *  be on what the decoding produced, and this test fails if it is made on the shape instead. */
  it("should refuse a stack name that climbs out of the glyph directory", async () => {
    const outside = mkdtempSync(join(tmpdir(), "map-beat-outside-"));
    await Bun.write(join(outside, "0-255.pbf"), bytes);
    const at = served.url
      .replace("{fontstack}", encodeURIComponent(`../${basename(outside)}`))
      .replace("{range}", "0-255");
    const response = await fetch(at);
    expect(response.status).toBe(404);
  });
});
