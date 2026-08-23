// Every figure this beat says out loud, recomputed from the frozen file a second time — and the
// three refusals the reading layer owes, driven rather than described.
//
// Run: bun test stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/test
//
// The mutations that redden it, each checked by making them:
//   - `sideOf` returning "uncontrolled" for a mixed list          → the split totals go red
//   - `headerIndex` returning 0 instead of finding `avalanche.id` → the parse goes red
//   - `cantonName` falling back to the code instead of throwing   → the lexicon test goes red
//   - `parseAccidents` dropping `.toUpperCase()` on the canton    → the two-spellings test goes red
//   - `WINDOW_WINTERS` raised past half the record                → the overlap refusal goes red

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  cantonName,
  deriveFacts,
  group,
  headerIndex,
  parseAccidents,
  sideOf,
  splitRow,
  WINDOW_WINTERS,
} from "../avalanche-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BEAT = join(HERE, "..");
const STORY = join(BEAT, "../..");
const ROOT = join(STORY, "../..");

const csv = readFileSync(join(STORY, "source", "data.csv"), "utf8");
const accidents = parseAccidents(csv);
const facts = deriveFacts(accidents);
const html = readFileSync(join(BEAT, "renders", "the-deaths-moved.html"), "utf8");
const plate = JSON.parse(readFileSync(join(BEAT, "swiss-plate.json"), "utf8"));

describe("the frozen file is read the way the publisher wrote it", () => {
  it("should find the header under the publisher's three banner lines", () => {
    expect(headerIndex(csv.split(/\r?\n/))).toBe(3);
  });

  it("should refuse a file whose header row it cannot find", () => {
    expect(() => headerIndex(["a,b,c", "1,2,3"])).toThrow(/no header row/);
  });

  it("should keep a quoted field carrying its own separator in one piece", () => {
    expect(splitRow('"1f09",1936-11-15,16,"Schattdorf / Erstfeld",1')).toEqual([
      "1f09",
      "1936-11-15",
      "16",
      "Schattdorf / Erstfeld",
      "1",
    ]);
  });

  it("should leave no municipality cell carrying its own whitespace", () => {
    for (const accident of accidents) expect(accident.municipality).toBe(accident.municipality.trim());
    const raw = csv.split(/\r?\n/).slice(4).filter(Boolean).map((line) => splitRow(line)[5]);
    expect(raw.filter((cell) => cell !== cell.trim())).toEqual(["\tPontresina"]);
  });

  it("should record that the publisher spells Pontresina three ways, and merge only the tab", () => {
    // Trimming settles `"\tPontresina"` against `Pontresina`. It does NOT settle
    // `Pontresina/Puntraschigna`, the municipality's own bilingual German/Romansh name, which is a
    // third form of the same place and a real editorial decision rather than a whitespace bug.
    // This beat groups by canton and by winter, never by municipality, so nothing it says depends
    // on it — and that is recorded here rather than quietly normalised away.
    const spellings = [
      ...new Set(accidents.filter((a) => a.municipality.includes("Pontresina")).map((a) => a.municipality)),
    ].sort();
    expect(spellings).toEqual(["Pontresina", "Pontresina/Puntraschigna"]);
  });

  it("should read one Glarus, not two", () => {
    const codes = new Set(accidents.map((a) => a.canton));
    expect(codes.has("Gl")).toBe(false);
    expect(codes.has("GL")).toBe(true);
  });
});

describe("the SLF's own terrain split", () => {
  it("should put an activity list spanning both terrains on neither side", () => {
    expect(sideOf(["tour", "transportation.corridor"])).toBe("mixed");
    expect(sideOf([])).toBe("unattributed");
    expect(sideOf(["tour", "offpiste"])).toBe("uncontrolled");
    expect(sideOf(["building", "transportation.corridor"])).toBe("controlled");
  });

  it("should account for every death exactly once", () => {
    expect(facts.controlled + facts.uncontrolled + facts.mixed + facts.unattributed).toBe(facts.dead);
    expect(facts.perWinter.reduce((sum, row) => sum + row.total, 0)).toBe(facts.dead);
  });

  it("should refuse two comparison windows that would overlap", () => {
    const short = accidents.filter((a) => a.winter < "1970");
    expect(new Set(short.map((a) => a.winter)).size).toBeLessThan(WINDOW_WINTERS * 2);
    expect(() => deriveFacts(short)).toThrow(/would overlap/);
  });
});

describe("the canton lexicon refuses rather than prints a code", () => {
  it("should name every canton code the frozen file carries", () => {
    const codes = [...new Set(accidents.map((a) => a.canton))].filter((c) => !c.includes("/"));
    for (const code of codes) expect(cantonName(code)).not.toBe(code);
  });

  it("should throw on a code it does not hold", () => {
    expect(() => cantonName("XX")).toThrow(/no name recorded for canton code/);
  });

  it("should name LI as Liechtenstein, which is not a Swiss canton", () => {
    expect(cantonName("LI")).toBe("Liechtenstein");
    const li = accidents.filter((a) => a.canton === "LI");
    expect(li.length).toBe(5);
    expect(li.reduce((sum, a) => sum + a.dead, 0)).toBe(6);
  });
});

describe("every figure the delivered page says out loud", () => {
  const says = (value: string) => expect(html).toContain(value);

  it("should carry the record's own size", () => {
    says(group(facts.accidents));
    says(group(facts.dead));
    says(facts.meanPerWinter);
    says(facts.firstWinter);
  });

  it("should carry the two terrain totals", () => {
    says(`${group(facts.controlled)} deaths`);
    says(`${group(facts.uncontrolled)} deaths`);
    says(`${group(facts.mixed + facts.unattributed)} of ${group(facts.dead)} deaths sit on neither side`);
  });

  it("should carry both comparison windows", () => {
    says(`${group(facts.first20.controlled)} of ${group(facts.first20.total)}`);
    says(`${group(facts.last20.controlled)} of ${group(facts.last20.total)}`);
    says(`first ${facts.first20.winters} winters`);
    says(`last ${facts.last20.winters} winters`);
  });

  it("should carry the worst winter and how much of it was indoors", () => {
    says(`${facts.worstWinter.winter}: ${group(facts.worstWinter.total)} dead`);
    expect(facts.worstWinter.controlled / facts.worstWinter.total).toBeGreaterThan(0.9);
  });

  it("should carry the forecast population and every level in it", () => {
    says(`${group(facts.danger.withLevel)} of ${group(facts.danger.accidents)} fatal avalanches`);
    for (const level of facts.danger.levels)
      says(`${group(level.accidents)} avalanches · ${group(level.dead)} dead`);
  });

  it("should name the two cantons it credits, in words", () => {
    says(cantonName(facts.cantons.top[0].canton));
    says(cantonName(facts.cantons.top[1].canton));
    says(`${facts.cantons.topShare} per cent`);
  });

  it("should never print any kind of space inside a number, because every kind wraps", () => {
    // WRITTEN TOO NARROW THE FIRST TIME, and the mutation run is what caught it: the assertion
    // named ONE separator (U+2009), so restoring the ORDINARY-space form of the same defect left
    // it green. A test that stays green when the mechanism is broken is a defect, not a test.
    // It names the CLASS now.
    // Measured on the TEXT A READER SEES, never on the whole file: `\\s` between two digits also
    // matches every pair of SVG path coordinates (`M5 4L0 5`), which found 219 of them.
    const readable = html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]*>/g, "\n");
    const inside = readable.match(/\d[ \u00a0\u2007\u2009\u202f]\d/g) ?? [];
    expect(inside).toEqual([]);
  });
});

describe("the plate and the page are on the same side", () => {
  const palette = readPalette(BEAT, { stopAt: ROOT });

  it("should have been baked against the ground the story recorded", () => {
    expect(plate.ground).toBe(palette.ground);
    expect(plate.style).toBe("dataviz-dark");
  });

  it("should hold every accident inside its own frame", () => {
    expect(plate.points.length).toBe(accidents.length);
    for (const [x, y] of plate.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(plate.frame.width);
      expect(y).toBeLessThanOrEqual(plate.frame.height);
    }
  });

  it("should draw two series in two accents a reader can see against the ground", () => {
    expect(palette.accents.length).toBeGreaterThanOrEqual(2);
    for (const accent of palette.accents.slice(0, 2))
      expect(contrast(accent, palette.ground)).toBeGreaterThanOrEqual(3);
  });

  it("should name the pair this toolchain never measures — the two accents against EACH OTHER", () => {
    // NOT a passing assertion dressed up: 1.75:1 is BELOW the 3:1 non-text floor. `palette`
    // measures every accent against the GROUND and nothing measures one accent against another,
    // so the two series are told apart by line style and by a direct label as well as by hue.
    expect(contrast(palette.accents[0], palette.accents[1])).toBeLessThan(3);
    expect(html).toContain('stroke-dasharray="7 5"');
  });
});
