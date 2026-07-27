import { test, expect } from "bun:test";
import { suggestBeats } from "./beats";
import {
  lineNotableIndices,
  barRankedReveals,
} from "../../skills/chart-native/src/chart-story";
import { parseCsvRows } from "../loop/profile";

// THE DRIFT GUARD.
//
// suggestBeats re-implements the engine's anchor selection instead of importing it: lib/brain
// may not import skills/<engine>/src/ (umbrella spec §6, "pas d'import cross-moteur de src/"),
// and the right home for a shared picker — lib/core, where claim-arc.ts was moved for exactly
// this reason — would mean editing chart-native, outside this slice's file boundary.
//
// So the duplication is pinned rather than trusted. A TEST may cross the boundary: lib/core/
// conformance-l0.test.ts and lib/core/i18n-furniture.test.ts already import engine internals to
// hold two implementations of one rule together. If chart-native's salience changes, this fails
// and names the drift, instead of the two quietly picking different points of the same series.
const CASES = [
  {
    name: "the scrolly track's own line sample (sea ice, 7 points)",
    csv: "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3",
  },
  {
    name: "a monotone line (no interior jump stands out)",
    csv: "year,value\n2019,10\n2020,12\n2021,14\n2022,16\n2023,18",
  },
  {
    name: "a line with one cliff",
    csv: "year,value\n2018,100\n2019,98\n2020,41\n2021,39\n2022,37",
  },
];

for (const c of CASES) {
  test(`line anchors match chart-native's lineNotableIndices — ${c.name}`, () => {
    const { columns, rows, numericColumns } = parseCsvRows(c.csv);
    const xCol = columns[0]!;
    const yCol = numericColumns[numericColumns.length - 1]!;
    const ys = rows.map((r) => Number(r[yCol]));
    const expected = lineNotableIndices(ys).map((i) => String(rows[i]![xCol]));

    const { beats } = suggestBeats({ nativeType: "line", dataCsv: c.csv });
    expect(beats.map((b) => b.anchor.value)).toEqual(expected);
  });
}

test("bar anchors are chart-native's barRankedReveals SET, walked in rendered order", () => {
  const csv =
    "canton,premium\nGenève,583\nVaud,531\nZurich,478\nBern,412\nUri,357";
  const { columns, rows, numericColumns } = parseCsvRows(csv);
  const catCol = columns[0]!;
  const valCol = numericColumns[numericColumns.length - 1]!;
  const labelled = rows.map((r) => ({
    label: String(r[catCol]),
    value: Number(r[valCol]),
  }));
  // barRankedReveals indexes its OWN value-desc order; resolve back to labels.
  const desc = [...labelled].sort((a, b) => b.value - a.value);
  const engineSet = new Set(
    barRankedReveals(labelled).map((r) => desc[r.sortedIndex]!.label),
  );

  const { beats } = suggestBeats({ nativeType: "bar", dataCsv: csv });
  const mine = beats.map((b) => b.anchor.value);
  // Same SET of salient rows as the engine picks…
  expect(new Set(mine)).toEqual(engineSet);
  // …and the ORDER is the data row order the bars will actually render in, because a spec
  // carrying beats resolves the sort to "none" (resolveBarSort). Walking the rank order instead
  // is what narrativeBeatWarnings flags: "the highlight walk will jump around the chart".
  const dataOrder = labelled
    .map((l) => l.label)
    .filter((l) => engineSet.has(l));
  expect(mine).toEqual(dataOrder);
});

test("a two-point series is short for BOTH — the engine picks 2, and a plan refuses", () => {
  const csv = "year,extent\n2020,3.9\n2025,4.3";
  expect(lineNotableIndices([3.9, 4.3])).toEqual([0, 1]);
  const { beats, refusal } = suggestBeats({ nativeType: "line", dataCsv: csv });
  expect(beats).toEqual([]);
  expect(refusal).toBeDefined();
});
