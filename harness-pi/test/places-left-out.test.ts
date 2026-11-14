import { describe, expect, it } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error untyped kit module
import { assertPlacesLeftOutStated } from "../craft/_shared/guards.mjs";

// gx-proportional-symbol web (12B, 2026-11-14, i13): the plate said Algeria, Iraq, Morocco, Syria and Tunisia were
// left out, but beat.mjs filtered "Syrian Republic" where data.json writes "Syrian Arab Republic" — Syria was drawn,
// 42 of 46 countries, and nothing said so.

const KIT = join(
  import.meta.dirname,
  "..",
  "craft",
  "web",
  "proportional-symbol-symbol-bubble-map",
);
const places = [
  "France",
  "Germany",
  "Spain",
  "Algeria",
  "Syrian Arab Republic",
  "Morocco",
];

function beat() {
  const root = mkdtempSync(join(tmpdir(), "places-left-out-"));
  const here = join(root, "beats", "1");
  mkdirSync(here, { recursive: true });
  writeFileSync(
    join(root, "STORYBOARD.md"),
    '---\nsubject: "Les centrales"\n---\n',
  );
  copyFileSync(join(KIT, "shapes.geojson"), join(here, "shapes.geojson"));
  writeFileSync(
    join(here, "data.json"),
    JSON.stringify({
      columns: [
        { name: "country", type: "text" },
        { name: "capacity_mw", type: "number" },
      ],
      rows: places.map((p, i) => [p, 1000 * (i + 1)]),
    }),
  );
  return here;
}

const drawn = (...names: string[]) => names.map((name) => ({ name, value: 1 }));
const SAID =
  "L'Algérie, la Syrie et le Maroc, hors du cadre, sont laissés de côté.";

describe("assertPlacesLeftOutStated", () => {
  it("should refuse a place the plate says is left out but the symbols draw", () => {
    expect(() =>
      assertPlacesLeftOutStated(
        drawn("France", "Germany", "Spain", "Syrian Arab Republic"),
        beat(),
        SAID,
      ),
    ).toThrow(/Syrian Arab Republic/);
  });

  it("should refuse a place of data.json the symbols leave out without a word on the plate", () => {
    expect(() =>
      assertPlacesLeftOutStated(
        drawn("France", "Germany", "Spain"),
        beat(),
        "Les centrales d'Europe.",
      ),
    ).toThrow(/Algeria/);
  });

  it("should pass places the symbols leave out when the plate names each one", () => {
    expect(() =>
      assertPlacesLeftOutStated(
        drawn("France", "Germany", "Spain"),
        beat(),
        SAID,
      ),
    ).not.toThrow();
  });

  it("should pass symbols that draw every place", () => {
    expect(() =>
      assertPlacesLeftOutStated(
        drawn(...places),
        beat(),
        "Les centrales d'Europe.",
      ),
    ).not.toThrow();
  });
});

describe("assertPlacesLeftOutStated's refusal", () => {
  const frBeat = () => {
    const here = beat();
    writeFileSync(join(here, "..", "..", "STORYBOARD.md"), '---\nsubject: "Les centrales"\nlanguage: fr\n---\n');
    return here;
  };
  const refusal = () => {
    try {
      assertPlacesLeftOutStated(drawn("France", "Germany", "Spain"), frBeat(), "Les centrales d'Europe.");
    } catch (e) {
      return (e as Error).message;
    }
    return "";
  };

  it("should give the sentence to add to limits, in the story's language", () => {
    expect(refusal()).toMatch(/a value that works: add to limits "Hors carte : Algérie, Syrie, Maroc\."/);
  });

  it("should pass once that sentence is on the plate", () => {
    const sentence = /add to limits "([^"]+)"/.exec(refusal())?.[1] ?? "";
    expect(() =>
      assertPlacesLeftOutStated(drawn("France", "Germany", "Spain"), frBeat(), `Les centrales d'Europe. ${sentence}`),
    ).not.toThrow();
  });
});
