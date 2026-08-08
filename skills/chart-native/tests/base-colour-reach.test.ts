import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FURNITURE_ONLY_TYPES,
  honoursBaseColor,
} from "../src/base-colour-reach";

test("the fourteen furniture-only types are named, not guessed", () => {
  expect([...FURNITURE_ONLY_TYPES].sort()).toEqual(
    [
      "bullet",
      "diverging",
      "diverging-stacked",
      "dumbbell",
      "grouped",
      "pie",
      "pyramid",
      "slope",
      "stacked",
      "stacked-area",
      "waterfall",
      "combo",
      "gantt",
      "candlestick",
    ].sort(),
  );
});

test("a type that paints its marks with the house hue honours it", () => {
  expect(honoursBaseColor("bar")).toBe(true);
  expect(honoursBaseColor("heatmap")).toBe(true);
  expect(honoursBaseColor("waterfall")).toBe(false);
  expect(honoursBaseColor(undefined)).toBe(true);
});

test("DRIFT: the list and the in-code comments cannot diverge", () => {
  // The fact was written eleven times, in prose, and never once interrogable
  // (spec-to-config.ts:937-939 and its ten twins). If a further type becomes furniture-only,
  // this fails until the list says so.
  // PROVEN NON-VACUOUS: `combo` shipped its mapper carrying the twelfth "FURNITURE only"
  // comment while the list still held eleven, and this test — alone in the suite — is what
  // said so.
  const src = readFileSync(
    join(import.meta.dir, "..", "src", "spec-to-config.ts"),
    "utf8",
  );
  const marked = src
    .split("\n")
    .filter((l) => l.includes("FURNITURE only")).length;
  expect(marked).toBe(FURNITURE_ONLY_TYPES.length);
});
