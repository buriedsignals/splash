import { beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// gx-contour-isoline web (Qwen3.5-9B, mvq63): the per-type web kit measured the claim on its own 7 km raster
// (median 132.50 → "133", deepest 681.41 → "681") while every other contour kit measures it on the 6 km LAEA
// grid (131.73 → "132", 681.81 → "682"), the figures the takeaway carries. The title had to say 132 and the
// field said 133: no beat could pass. One story, one figure in every format.

const HARNESS = resolve(import.meta.dirname, "..");
const WEB = join(HARNESS, "craft", "web", "contour-isoline");
const STATIC = join(HARNESS, "craft", "static", "contour-isoline");
const table = JSON.parse(
  readFileSync(
    join(
      HARNESS,
      "eval",
      "seeds",
      "gx-contour-isoline",
      "beats",
      "1",
      "data.json",
    ),
    "utf8",
  ),
);
const CODE = table.columns.findIndex(
  (c: { name: string }) => c.name === "code",
);
const study = table.rows
  .map((r: string[]) => r[CODE])
  .filter((c: string) => c !== "RUS");

describe("the web contour kit's claim figures", () => {
  let web: { median: number; deepest: number };
  let fixed: { median: number; deepest: number };
  beforeAll(async () => {
    web = (await import(join(WEB, "field.mjs"))).measureSeaDistance(WEB, {
      study,
    });
    fixed = (await import(join(STATIC, "field.mjs"))).measureSeaDistance(
      STATIC,
      { study },
    );
  }, 60000);

  it("should measure the median the static kit measures", () => {
    expect(web.median).toBe(fixed.median);
  });

  it("should measure the deepest point the static kit measures", () => {
    expect(web.deepest).toBe(fixed.deepest);
  });

  it("should carry the static kit's measurement byte for byte", () => {
    expect(readFileSync(join(WEB, "sea-distance.mjs"), "utf8")).toBe(
      readFileSync(join(STATIC, "field.mjs"), "utf8"),
    );
  });
});
