/**
 * THE LABEL TABLE IS MEASURED, VENDORED, AND REACHES EVERY COPY — round six, task LANG.
 *
 * Three lexicons in this toolchain decide by matching a WORD against a list, and each was written
 * in the languages its first story happened to be in. The round's own theme is what that costs:
 * one table, one sentence, only the denominator column's NAME changing language, and `ludność`
 * came back `supported` where `population` came back `unverifiable`. A missing word did not
 * withhold a prompt — it RAISED the verdict above the one an unreadable claim gets.
 *
 * `lettersNotRead` closed the half of that a character test can see. The other half is a language
 * spelled in the declared repertoire — Dutch `bevolking`, Italian `popolazione`, Indonesian
 * `penduduk` — and no character test can ever see it. That half is closed by DATA:
 * `references/concept-labels.json` is Wikidata's own labels and aliases for the concepts these
 * lists name, measured once, filtered by rules `scripts/concept-labels.mjs` states and counts, and
 * VENDORED. This file is what keeps it honest.
 *
 * FOUR THINGS ARE ASSERTED, and each of them has already been the defect somewhere in this tree:
 *
 *   1. THE TABLE REACHES ALL ELEVEN REGIONS. The denominator tokens alone live in ten files. A
 *      table that landed in one of them is the drift `guard-copies-parity` exists for, one level
 *      out: the same word would be a denominator in `intake` and nothing at all in `map-web`.
 *   2. THE TWO MECHANISMS DO NOT OVERLAP AND LEAVE NO GAP. A vendored token whose letters
 *      `lettersNotRead` can already flag would be reported twice, and a token outside the
 *      repertoire that is NOT vendored is the hole. Every vendored token is inside the repertoire,
 *      by construction and by this assertion.
 *   3. NOTHING NEW FIRES ON REAL MATERIAL. Every column name in every frozen story under
 *      `stories/` is tokenised and matched. The measured answer is zero — the hand-written floor
 *      already carried `population` and `residents`, and no vendored token fires on anything else.
 *   4. NOTHING FETCHES IT AT RUNTIME. A lexicon that needs a network fails in a newsroom without
 *      one. Only the maintainer's own generator may name Wikidata at all.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  REGIONS,
  regionsIn,
  renderRegion,
  vendoredTable,
  insideTheRepertoire,
  columnNameHits,
} from "../../../scripts/concept-labels.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SKILLS = join(ROOT, "skills");
const table = vendoredTable();

describe("the vendored table reaches every file that decides with it", () => {
  for (const region of REGIONS) {
    it(`${region.file} carries the vendored "${region.mark}" tokens`, () => {
      const text = readFileSync(join(SKILLS, region.file), "utf8");
      const found = regionsIn(text).find((r) => r.mark === region.mark);
      expect(`${region.file} has a "${region.mark}" region`).toBe(
        found ? `${region.file} has a "${region.mark}" region` : `${region.file} has NO "${region.mark}" region`,
      );
      expect(found!.body).toBe(`${renderRegion(table.concepts[region.group].tokens, region.style, found!.indent)}\n`);
    });
  }

  it("puts the denominator tokens in all ten files that read a column name", () => {
    expect(REGIONS.filter((r) => r.group === "population").map((r) => r.file).sort()).toEqual([
      "chart-beat/scripts/detect-denominator-reading.mjs",
      "chart-video/scripts/detect-denominator-reading.mjs",
      "chart-web/scripts/detect-denominator-reading.mjs",
      "dw-beat/scripts/detect-denominator-reading.mjs",
      "image-beat/scripts/detect-denominator-reading.mjs",
      "intake/scripts/profile.mjs",
      "map-beat/scripts/detect-denominator-reading.mjs",
      "map-web/scripts/detect-denominator-reading.mjs",
      "scrolly/scripts/detect-denominator-reading.mjs",
      "storyboard/scripts/ground-claim.mjs",
    ]);
  });
});

describe("the table and the character nets partition the problem", () => {
  for (const [concept, spec] of Object.entries(table.concepts) as [string, any][]) {
    it(`every "${concept}" token is one no character test in this tree can flag`, () => {
      const outside = spec.tokens.filter((t: string) => !insideTheRepertoire(t));
      expect(outside).toEqual([]);
    });

    it(`no "${concept}" token is shorter than four letters, or refused, or already in the floor`, () => {
      const floor = new Set(spec.floor ?? []);
      const refused = new Set(Object.keys(spec.refuse ?? {}));
      expect(spec.tokens.filter((t: string) => t.split(" ").some((w: string) => [...w].length < 4))).toEqual([]);
      expect(spec.tokens.filter((t: string) => refused.has(t))).toEqual([]);
      expect(spec.tokens.filter((t: string) => floor.has(t))).toEqual([]);
    });
  }

  it("gives no token to two concepts at once", () => {
    const claimed = new Map<string, string[]>();
    for (const [concept, spec] of Object.entries(table.concepts) as [string, any][])
      for (const token of spec.tokens) claimed.set(token, [...(claimed.get(token) ?? []), concept]);
    expect([...claimed].filter(([, concepts]) => concepts.length > 1)).toEqual([]);
  });

  // THE ACCEPTANCE, named in the task: the word no character test can see.
  it("reads bevolking, popolazione and mieszkaniec as population words", () => {
    for (const word of ["bevolking", "popolazione", "mieszkaniec"])
      expect(`${word}: ${table.concepts.population.tokens.includes(word)}`).toBe(`${word}: true`);
  });

  // THE LANGUAGE LIST IS A STATED REACH, NOT A CLAIM TO COVER EVERY LANGUAGE, and it is stated by
  // failing rather than by a comment. `languages` is the EU's own official languages plus the
  // European and Mediterranean neighbours — the same argument `NAMED_SCRIPTS` already makes about
  // the writing systems a newsroom in this tree's reach could file in. Indonesian `penduduk` is
  // outside it and is NOT vendored, so it is exactly what `bevolking` used to be: an ASCII word for
  // population that no net here can see. That is the residue, it is real, and this is where it is
  // written down.
  it("does not pretend to cover a language outside its own declared reach", () => {
    expect(table.languages).not.toContain("id");
    expect(table.concepts.population.tokens).not.toContain("penduduk");
  });

  // …and does NOT read the word the letter net already names, so a gap is reported once.
  it("leaves ludność to lettersNotRead", () => {
    expect(table.concepts.population.tokens).not.toContain("ludność");
  });
});

describe("measured against the material this tree actually froze", () => {
  it("fires no vendored token on any frozen column name", () => {
    expect(columnNameHits(table, join(ROOT, "stories"))).toEqual([]);
  });

  it("read at least one column name from at least twenty frozen stories", () => {
    const withData = readdirSync(join(ROOT, "stories")).filter((s) =>
      existsSync(join(ROOT, "stories", s, "source")) &&
      readdirSync(join(ROOT, "stories", s, "source")).some((f) => f.endsWith(".csv")),
    );
    // A sweep over nothing reports zero hits too. This is what makes the assertion above mean
    // something — the same argument `exampleRunnersFor` is walked for one file over.
    expect(withData.length).toBeGreaterThanOrEqual(20);
  });
});

describe("nothing reaches a network for a word", () => {
  it("names Wikidata in the maintainer's generator and nowhere a journalist runs", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "test") continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(mjs|ts|tsx|js)$/.test(entry.name) && readFileSync(path, "utf8").includes("wikidata.org"))
          offenders.push(path.slice(ROOT.length + 1));
      }
    };
    walk(SKILLS);
    expect(offenders).toEqual([]);
  });
});
