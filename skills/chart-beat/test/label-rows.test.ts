/**
 * A ROW NAMES ONE THING, and the corpus is walked to prove it.
 *
 * `scripts/detect-label-rows.mjs` carries the reasoning. What this file adds is the population: the
 * decision is exercised on hand-built stacks whose crossings are known, and then on every SVG and
 * every standalone page in the tree, so a de-collided stack that starts crossing is a red here
 * rather than a sentence in a delivered graphic.
 *
 * THE POPULATION, measured 2026-08-21: 120 artefacts under `stories/`, `proof/`, `skills/` and
 * `exports/`; 5 of them draw a de-collided label stack at all — the Greek-schools slope, its own
 * delivered copy, one small-multiples frame and two portrait probes. The count of artefacts is NOT
 * asserted (beats come and go), but the count of artefacts CARRYING A STACK is a floor: a reader
 * that stopped finding leaders would report an empty sweep as a clean one, which is the exact shape
 * of failure this rule exists to close.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { labelStacksFrom, mislabelledRows } from "../scripts/detect-label-rows.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

const stack = (id: string, labels: [string, number, number][]) => ({
  id,
  labels: labels.map(([text, y, anchorY]) => ({ id: text, x: 0, y, fontSize: 16, anchorY })),
});

describe("a de-collided stack keeps the order of the values it names", () => {
  it("accepts a stack that moved every label and reordered none", () => {
    const left = stack("left", [
      ["1802", 10, 12],
      ["1104", 30, 40],
      ["522", 50, 41],
    ]);
    expect(mislabelledRows([left], [])).toEqual([]);
  });

  it("refuses the inversion the beat's first version drew — 1104 above 1802", () => {
    const left = stack("left", [
      ["1104", 10, 40],
      ["1802", 30, 12],
    ]);
    expect(mislabelledRows([left], [])).toEqual([
      "left: 1104 is drawn 1 down its own stack and its mark is 2 down that stack's own marks, with no stack in the picture reading its own marks in order",
    ]);
  });

  it("refuses it in every gutter at once — a de-collision that reorders reorders both", () => {
    const left = stack("left", [
      ["1104", 10, 40],
      ["1802", 30, 12],
    ]);
    const right = stack("right", [
      ["1021", 10, 44],
      ["1744", 30, 16],
    ]);
    expect(
      mislabelledRows(
        [left, right],
        [
          { id: "a", aY: 40, bY: 44 },
          { id: "b", aY: 12, bY: 16 },
        ],
      ).length,
    ).toBe(2);
  });

  it("accepts a second stack crossing itself when the marks say the lines cross — Epirus 244 to 219 against the South Aegean 241 to 238", () => {
    // Ranked by the left period, so the right values are not in their own order. Refusing that
    // would be refusing the data.
    const left = stack("left", [
      ["Epirus — 244", 10, 100],
      ["South Aegean — 241", 30, 101],
    ]);
    const right = stack("right", [
      ["219", 10, 121],
      ["238", 30, 113],
    ]);
    expect(
      mislabelledRows(
        [left, right],
        [
          { id: "a", aY: 100, bY: 121 },
          { id: "b", aY: 101, bY: 113 },
        ],
      ),
    ).toEqual([]);
  });

  it("refuses a crossing stack the picture joins to nothing", () => {
    const left = stack("left", [
      ["Epirus", 10, 100],
      ["South Aegean", 30, 101],
    ]);
    const right = stack("right", [
      ["219", 10, 121],
      ["238", 30, 113],
    ]);
    expect(mislabelledRows([left, right], []).length).toBe(1);
  });
});

describe("a row's label and its value name the same row", () => {
  const left = stack("left", [
    ["Peloponnese", 100, 200],
    ["Thrace", 140, 210],
  ]);
  const right = stack("right", [
    ["unavailable", 100, 210],
    ["392", 140, 220],
  ]);

  it("accepts a row whose two anchors are joined by a drawn mark", () => {
    const paired = stack("right", [
      ["441", 100, 205],
      ["392", 140, 215],
    ]);
    expect(
      mislabelledRows(
        [left, paired],
        [
          { id: "a", aY: 200, bY: 205 },
          { id: "b", aY: 210, bY: 215 },
        ],
      ),
    ).toEqual([]);
  });

  it("refuses a row whose left anchor is joined to somebody else's value", () => {
    expect(mislabelledRows([left, right], [{ id: "a", aY: 200, bY: 220 }])).toEqual([
      'row y=100.0: Peloponnese and unavailable are drawn on one line, and the marks they name are joined to something else',
      'row y=140.0: Thrace and 392 are drawn on one line, and the marks they name are joined to something else',
    ]);
  });

  it("says nothing about a row the artefact joins to nothing — a declared-missing value has no mark to join", () => {
    expect(mislabelledRows([left, right], [])).toEqual([]);
  });
});

/** Every `.svg` and `.html` a reader could be handed, discovered rather than listed. */
function artefacts(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) artefacts(path, out);
    else if (/\.(svg|html)$/.test(entry.name) && statSync(path).size < 8_000_000)
      out.push(path);
  }
  return out;
}

describe("every delivered artefact in this tree", () => {
  const found = ["stories", "proof", "skills", "exports"].flatMap((root) =>
    artefacts(join(TWIN, root)),
  );
  const read = found.map((path) => ({
    path,
    ...labelStacksFrom(readFileSync(path, "utf8")),
  }));
  const decollided = read.filter((one) => one.stacks.length > 0);

  it("finds the de-collided stacks it is written to walk", () => {
    expect(found.length).toBeGreaterThan(50);
    expect(decollided.length).toBeGreaterThanOrEqual(3);
    // The stack the rule was earned on: thirteen regions, two gutters, twelve of each moved.
    const slope = decollided.find((one) =>
      one.path.endsWith("beats/1-attica-vs-the-rest/renders/attica-vs-the-rest-still.svg"),
    );
    expect(slope?.stacks.map((one) => one.labels.length)).toEqual([12, 12]);
    expect(slope?.links.length).toBe(12);
  });

  for (const one of decollided) {
    const label = relative(TWIN, one.path);
    it(`${label} should put each label on its own row`, () => {
      expect([label, mislabelledRows(one.stacks, one.links)]).toEqual([label, []]);
    });
  }
});
