// WHAT CAPTURE IS SENT LOOKING FOR when the unit is already in the journalist's own words.
//
// These two facts are one fact and used to be two. `introWithUnit` decides whether the
// printed subtitle gets a "(unit)" appended; `furnitureFor` decides which string capture
// hunts for on the published page to prove the unit reached the reader. Before this file,
// the second always named the unit LITERALLY — which was true only because the first always
// appended it. Teaching the composer that "54 percent recycled" already states "%" without
// teaching the expectation the same thing would file a blocking `furniture-missing` finding
// on a chart that is correct, on the one engine (dw-chart) whose spec has no unit field and
// therefore has nowhere else to paint it.
//
// The always-on half of lib/loop/dw-chart-e2e.test.ts is the mechanical guard that the two
// agree; this file is where each side is stated on its own.
import { expect, test } from "bun:test";
import { furnitureFor } from "./verify";
import { introWithUnit } from "./assemble/dw-chart";
import type { RunElement } from "./manifest";

function el(altInsight: string, unit: string): RunElement {
  return {
    id: "e1",
    angle: {
      confirmedTakeaway: "Basel recycles more of its waste than any other city",
      altInsight,
      unit,
    },
  } as RunElement;
}

function unitRow(altInsight: string, unit: string) {
  return furnitureFor(el(altInsight, unit), "Federal Statistical Office").find(
    (f) => f.role === "unit",
  )!;
}

test("the unit expectation is the unit itself when the subtitle does not state it", () => {
  const row = unitRow("A ranking of four Swiss cities, Basel highest", "%");
  expect(row.text).toBe("%");
  expect(row.alternates ?? []).toEqual([]);
});

// The measured case, off live chart saWby (2026-08-08).
test("a subtitle that spells the unit out offers the spelled-out form as the evidence", () => {
  const row = unitRow(
    "A ranking of four Swiss cities, Basel highest at 54 percent recycled",
    "%",
  );
  expect(row.text).toBe("%");
  expect(row.alternates).toEqual(["percent"]);
});

test("the alternate follows the journalist's language, not English", () => {
  expect(
    unitRow("Bâle en tête à 54 pour cent recyclés", "%").alternates,
  ).toEqual(["pour cent"]);
  expect(unitRow("Basel recycelt 54 Prozent", "%").alternates).toEqual([
    "Prozent",
  ]);
  expect(unitRow("Basilea ricicla il 54 per cento", "%").alternates).toEqual([
    "per cento",
  ]);
});

// The symbol already on the page is its own evidence — no alternate is needed or offered.
test("a subtitle carrying the symbol itself needs no alternate", () => {
  expect(unitRow("Recycling reaches 54%", "%").alternates ?? []).toEqual([]);
});

// THE INVARIANT, stated directly rather than inferred: whatever the composer leaves in the
// subtitle, some string the expectation names is in it. This is the sentence that goes red
// if either side is changed alone.
test("every string combination the composer can produce still carries an expected string", () => {
  for (const [alt, unit] of [
    [
      "A ranking of four Swiss cities, Basel highest at 54 percent recycled",
      "%",
    ],
    ["Bâle en tête à 54 pour cent recyclés", "%"],
    ["Basel recycelt 54 Prozent", "%"],
    ["Basilea ricicla il 54 per cento", "%"],
    ["Recycling reaches 54%", "%"],
    ["A ranking of four Swiss cities, Basel highest", "%"],
    ["Recycling rose by 4 percentage points", "%"],
    ["Genève affiche 583 francs, Fribourg 468.", "CHF"],
    ["Surface exprimée en m", "m"],
    ["Loyer moyen des logements", "m"],
  ] as const) {
    const intro = introWithUnit(alt, unit);
    const row = unitRow(alt, unit);
    const needles = [row.text, ...(row.alternates ?? [])];
    expect([alt, needles.some((n) => intro.includes(n))]).toEqual([alt, true]);
  }
});
