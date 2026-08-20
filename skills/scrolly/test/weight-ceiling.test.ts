/**
 * THE DELIVERED FILE'S OWN WEIGHT, AGAINST WHAT THIS FORMAT'S BEATS ACTUALLY WEIGH TODAY.
 *
 * `weightAgainstCeiling` is generic; `CEILING_BYTES` (`../scripts/detect-weight-has-a-ceiling.mjs`)
 * is this format's own — set at the heaviest of the 8 delivered scrolly pages measured 2026-08-20,
 * the same 8 `proof/` directories `same-facts-without-the-picture`'s own `scrolly` exception in
 * `doctrine/references/guard-catalogue.json` measured.
 */
import { describe, expect, it } from "bun:test";
import { statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
  MEASURED_MAX_BYTES,
  MARGIN_BYTES,
} from "../scripts/detect-weight-has-a-ceiling.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("weightAgainstCeiling", () => {
  it("says a file under the ceiling is not over", () => {
    expect(weightAgainstCeiling(100, 200)).toEqual({
      bytes: 100,
      ceiling: 200,
      over: false,
    });
  });

  it("says a file over the ceiling is over", () => {
    expect(weightAgainstCeiling(300, 200)).toEqual({
      bytes: 300,
      ceiling: 200,
      over: true,
    });
  });

  it("does not count a file sitting exactly on the ceiling as over", () => {
    expect(weightAgainstCeiling(200, 200).over).toBe(false);
  });
});

describe("this format's ceiling carries a margin above today's measured maximum", () => {
  it("states both numbers, and the ceiling is exactly their sum", () => {
    expect(MARGIN_BYTES).toBeGreaterThan(0);
    expect(CEILING_BYTES).toBe(MEASURED_MAX_BYTES + MARGIN_BYTES);
  });

  // RULED 2026-08-20: a ceiling set at EXACTLY today's champion has no margin — the next delivered
  // beat one byte heavier than `MEASURED_MAX_BYTES` used to trip this guard on ordinary growth.
  it("does not trip on a file one byte heavier than today's measured maximum", () => {
    expect(weightAgainstCeiling(MEASURED_MAX_BYTES + 1, CEILING_BYTES).over).toBe(false);
  });
});

/** The 8 delivered scrolly beats on disk — the same population `same-facts-without-the-picture`'s
 *  own `scrolly` exception measured, named here rather than walked, since this format's own
 *  delivered file does not carry a marker as reliable as `chart-web`'s or `map-web`'s render
 *  import. */
function scrollyArtifacts(): { name: string; file: string }[] {
  return [
    { name: "scrolly-one-chart-swiss-life-expectancy", file: join(PROOF, "scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html") },
    { name: "scrolly-chart-eu-carbon", file: join(PROOF, "scrolly-chart-eu-carbon/render/eu-carbon-four-charts.html") },
    { name: "mapmore-scrolly-danube", file: join(PROOF, "mapmore-scrolly-danube/render/danube-scrolly.html") },
    { name: "mapscrolly-quakes-three-ways", file: join(PROOF, "mapscrolly-quakes-three-ways/render/quakes-four-maps.html") },
    { name: "mapmore-scrolly-route-access", file: join(PROOF, "mapmore-scrolly-route-access/render/route-access.html") },
    { name: "scrolly-image-grinnell-glacier", file: join(PROOF, "scrolly-image-grinnell-glacier/render/grinnell-glacier.html") },
    { name: "mapscrolly-one-map-europe-carbon", file: join(PROOF, "mapscrolly-one-map-europe-carbon/render/one-map-four-readings.html") },
    { name: "scrolly-mixed-grinnell-ice", file: join(PROOF, "scrolly-mixed-grinnell-ice/render/three-media-one-glacier.html") },
  ];
}

describe("every scrolly page on disk", () => {
  it("weighs at or under this format's own measured ceiling", () => {
    const beats = scrollyArtifacts();
    const offenders: string[] = [];
    for (const { name, file } of beats) {
      const bytes = statSync(file).size;
      const found = weightAgainstCeiling(bytes, CEILING_BYTES);
      if (found.over) offenders.push(`${name}: ${JSON.stringify(found)}`);
    }
    expect(offenders).toEqual([]);
  });
});
