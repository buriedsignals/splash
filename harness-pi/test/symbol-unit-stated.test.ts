import { describe, expect, it } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error untyped kit module
import { assertSymbolUnitStated } from "../craft/_shared/guards.mjs";

// gx-proportional-symbol web (Qwen3.5-9B, 2026-11-13, 1794596634993): the symbols summed data.json's 8 900 plants into
// one circle per country, but limits and alt said "Un cercle par centrale" — copied from the storyboard's limits.

const KIT = join(import.meta.dirname, "..", "craft", "web", "proportional-symbol-symbol-bubble-map");
const countries = ["France", "Germany", "Spain", "Italy"];

function beat() {
  const root = mkdtempSync(join(tmpdir(), "symbol-unit-"));
  const here = join(root, "beats", "1");
  mkdirSync(here, { recursive: true });
  writeFileSync(join(root, "STORYBOARD.md"), '---\nsubject: "Les centrales"\nlanguage: fr\n---\n');
  copyFileSync(join(KIT, "shapes.geojson"), join(here, "shapes.geojson"));
  const rows = countries.flatMap((c) => [1, 2, 3].map((n) => [c, `${c} plant ${n}`, 100 * n]));
  writeFileSync(
    join(here, "data.json"),
    JSON.stringify({
      columns: [
        { name: "country", type: "text" },
        { name: "plant", type: "text" },
        { name: "capacity_mw", type: "number" },
      ],
      rows,
    }),
  );
  return here;
}

const perCountry = () => countries.map((name) => ({ name, value: 600 }));
const perPlant = () => countries.flatMap((c) => [1, 2, 3].map((n) => ({ name: `${c} plant ${n}`, value: 100 * n })));

describe("assertSymbolUnitStated", () => {
  it("should refuse a plate that says one circle per plant when the symbols draw one per country", () => {
    expect(() => assertSymbolUnitStated(perCountry(), beat(), "Un cercle par centrale, sa surface est sa puissance.")).toThrow(
      /a value that works: "un cercle par pays"/,
    );
  });

  it("should pass a plate that says one circle per country when the symbols draw one per country", () => {
    expect(() => assertSymbolUnitStated(perCountry(), beat(), "Un cercle par pays, sa surface est sa puissance.")).not.toThrow();
  });

  it("should pass a plate that says one circle per plant when the symbols draw one per plant", () => {
    expect(() => assertSymbolUnitStated(perPlant(), beat(), "Un cercle par centrale, à ses coordonnées.")).not.toThrow();
  });
});
