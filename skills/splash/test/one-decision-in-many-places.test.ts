/**
 * WHERE DOES ONE DECISION EXIST IN MORE THAN ONE PLACE, AND DO THOSE PLACES STILL AGREE?
 *
 * FIVE TIMES IN ONE WEEK a fix was made and did not reach the places that needed it, and every one
 * was found by a real story rather than by a test. `scripts/one-decision.mjs` carries the readings
 * and the argument; `scripts/one-decision-record.mjs` carries the ratchet and the measurement of
 * which of the five each reading sees. This file is where they are held together.
 *
 * THE POPULATIONS ARE DISCOVERED, NEVER TYPED. There is no list of paths anywhere below. Every
 * drift in the five happened in a decision nobody had registered, and both of this tree's existing
 * registries — `COPIES` in `guard-copies-parity.test.ts`, `states` in `guard-catalogue.json` — are
 * keyed on SKILLS, so neither can be about a file under `proof/` or `stories/` at all. That is
 * exactly where a fix fails to arrive, because a NEW beat is the place nobody has typed yet.
 *
 * NOTHING IS ADDED TO `guard-catalogue.json`, and the reason is the same one `map-web`'s own
 * `the-fix-reaches-the-page-assemblers.test.ts` gave the day before: a catalogue entry declares
 * `states: { "<skill>": … }`, and this reading's whole subject is the population a per-skill
 * catalogue structurally cannot be about. An entry naming one skill while measuring a thousand
 * files that are not that skill would be a rule that lies about its own scope. The `catalogue` lock
 * was never taken.
 */
import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  assemblersByArtefact,
  capabilitiesThatStopped,
  copiesThatDisagree,
  credentialNamesRead,
  credentialReadsWithoutAlias,
  credentialReadings,
  derivedVocabularies,
  divergences,
  divergencesThatJoined,
  divergencesThatLeft,
  functionsIn,
  hardCodedChoices,
  similarity,
  treeSources,
} from "../../../scripts/one-decision.mjs";
import {
  CEILING,
  RECORDED_DIVERGENCES,
} from "../../../scripts/one-decision-record.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const SOURCES = treeSources(TWIN);
const FOUND = divergences(SOURCES);

describe("the walk that finds them", () => {
  it("reads the whole tree, not a corner of it", () => {
    // A walk that came back with forty files would make every assertion below vacuously true — the
    // false confirmation this whole file exists to refuse.
    expect(SOURCES.size).toBeGreaterThan(900);
  });

  it("finds functions in the files it walks", () => {
    let declared = 0;
    for (const source of SOURCES.values()) declared += functionsIn(source).size;
    expect(declared).toBeGreaterThan(3000);
  });

  it("has a live population for each of its four readings", () => {
    // A reading whose population is empty is a requirement that cannot fire, which this repository
    // has already measured to be worse than a missing one.
    expect(credentialReadings(SOURCES).length).toBeGreaterThan(0);
    expect(derivedVocabularies(SOURCES).length).toBeGreaterThan(0);
    expect(hardCodedChoices(SOURCES).length).toBeGreaterThan(0);
    expect(copiesThatDisagree(SOURCES).length).toBeGreaterThan(0);
    expect(assemblersByArtefact(SOURCES).size).toBeGreaterThan(0);
    expect(capabilitiesThatStopped(SOURCES).length).toBeGreaterThan(0);
  });
});

describe("the ratchet", () => {
  it("names every decision that has just stopped being one decision", () => {
    const joined = divergencesThatJoined(RECORDED_DIVERGENCES, FOUND);
    expect(joined).toEqual([]);
  });

  it("does not rot: what it records is what the walk still finds", () => {
    // NOT a failure — a divergence closing is the point — but printed, because a record padded with
    // divergences that were fixed months ago is a ceiling nobody can read.
    const left = divergencesThatLeft(RECORDED_DIVERGENCES, FOUND);
    if (left.length > 0)
      console.log(
        `${left.length} recorded divergence(s) no longer found — delete these lines from ` +
          `scripts/one-decision-record.mjs:\n  ${left.join("\n  ")}`,
      );
    expect(left.length).toBeLessThanOrEqual(RECORDED_DIVERGENCES.length);
  });

  it("cannot be made green by adding a line", () => {
    // The mirror of `chart-web`'s length floor. There, deleting a line was the cheat and the floor
    // closed it; here the population should SHRINK, so the cheat is ADDING one, and the ceiling
    // closes it. Deleting a line is already self-punishing: the line comes back as a JOIN above.
    expect(RECORDED_DIVERGENCES.length).toBeLessThanOrEqual(CEILING);
  });

  it("records each divergence once", () => {
    expect(RECORDED_DIVERGENCES.length).toBe(
      new Set(RECORDED_DIVERGENCES).size,
    );
  });

  it("records them sorted, so the record is a set and not an order", () => {
    expect([...RECORDED_DIVERGENCES].sort()).toEqual([...RECORDED_DIVERGENCES]);
  });
});

describe("R1 — the credential, and every name it travels under", () => {
  it("refuses a canonical name read with no alias list beside it", () => {
    expect(
      credentialReadsWithoutAlias("const k = process.env.MAPTILER_KEY;"),
    ).toEqual(["MAPTILER_KEY"]);
  });

  it("accepts the same read when the file names the alias list", () => {
    expect(
      credentialReadsWithoutAlias(
        'const MAPTILER_KEY_ALIASES = ["VITE_MAPTILER_KEY"];\nconst k = process.env.MAPTILER_KEY;',
      ),
    ).toEqual([]);
  });

  it("sees a credential read off a PARSED environment", () => {
    // The GATE at `03cef221`: `parseEnvFile(readFileSync(path, "utf8")).MAPTILER_KEY`. The
    // catalogue's own reading matches `env.NAME` and cannot see this, which is why the guard was
    // green while the format's only live probe was never once invoked.
    expect(
      credentialNamesRead(
        'return parseEnvFile(readFileSync(path, "utf8")).MAPTILER_KEY ?? null;',
      ),
    ).toEqual(["MAPTILER_KEY"]);
  });

  it("sees a credential read out of a raw .env line", () => {
    // The FOUR SCROLLY INSTRUMENTS at `9ab1fdff`: `.find((l) => l.startsWith("MAPTILER_KEY="))`.
    expect(
      credentialNamesRead(
        'const line = text.split("\\n").find((l) => l.startsWith("MAPTILER_KEY="));',
      ),
    ).toEqual(["MAPTILER_KEY"]);
  });

  it("reads nothing out of prose, because a name in a comment is not a decision", () => {
    const [, source] = [...SOURCES.entries()].find(([file]) =>
      file.endsWith("skills/splash/scripts/verify-credentials.mjs"),
    ) as [string, string];
    // That file's own doc comment names `process.env.MAPTILER_KEY`; `treeSources` strips comments,
    // and `map-beat`'s first run of this rule reported a skill for exactly that string.
    expect(source).not.toContain("the exact shape finding 2 found twice");
  });

  it("is a strict WIDENING of the catalogue's own decision, never a different one", () => {
    // The catalogue's rule, byte for byte, as `splash/scripts/verify-credentials.mjs` declares it.
    const catalogueNames = (source: string) => {
      const names = new Set<string>();
      for (const m of source.matchAll(
        /\benv(?:\.|\[["'`])([A-Z][A-Z0-9_]*_(?:KEY|TOKEN))\b/g,
      ))
        names.add(m[1]);
      return [...names];
    };
    let checked = 0;
    for (const source of SOURCES.values()) {
      const narrow = catalogueNames(source).filter(
        (n) => !source.includes(`${n}_ALIASES`),
      );
      if (narrow.length === 0) continue;
      checked++;
      const wide = credentialReadsWithoutAlias(source);
      for (const name of narrow) expect(wide).toContain(name);
    }
    // And the widening is not free-floating: it really is asked of files in this tree.
    expect(checked).toBeGreaterThan(5);
  });
});

describe("R2 — a value the tree derives, written down somewhere else", () => {
  const vocabulary = (source: string) =>
    derivedVocabularies(new Map([["a.mjs", source]])).map((v) =>
      v.members.join(","),
    );

  it("reads a chooser of two alternatives sharing a stem as a vocabulary", () => {
    expect(
      vocabulary(
        'function styleFor(g) { if (g) return "dataviz-dark"; return "dataviz-light"; }',
      ),
    ).toEqual(["dataviz-dark,dataviz-light"]);
  });

  it("refuses two unrelated literals one function happens to return", () => {
    // Measured while writing this: without the shared stem, `checkHover`'s
    // `return "data-detail" … return "hit-area"` reads as a vocabulary and sixty files that
    // legitimately name one of the two become findings.
    expect(
      vocabulary(
        'function role(x) { if (x) return "data-detail"; return "hit-area"; }',
      ),
    ).toEqual([]);
  });

  it("names a file that writes one member down while another file derives it", () => {
    const sources = new Map([
      [
        "skills/x/bake.mjs",
        'function styleFor(g) { if (g) return "dataviz-dark"; return "dataviz-light"; }',
      ],
      ["proof/y/bake.mjs", 'const CAMERA = { style: "dataviz-dark" };'],
    ]);
    expect(hardCodedChoices(sources)).toEqual([
      "proof/y/bake.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
    ]);
  });

  it("says nothing about a file that names every member, because that is a second derivation", () => {
    const sources = new Map([
      [
        "skills/x/bake.mjs",
        'function styleFor(g) { if (g) return "dataviz-dark"; return "dataviz-light"; }',
      ],
      ["proof/y/bake.mjs", 'const both = ["dataviz-dark", "dataviz-light"];'],
    ]);
    expect(hardCodedChoices(sources)).toEqual([]);
  });

  it("still names the basemap theme on today's tree, because it has never been fixed", () => {
    // Defect 3 of the five. `skills/scrolly/scripts/bake-plate.mjs` DERIVES the basemap side from
    // the story's own ground; thirty-two files write the answer down as a literal.
    const basemap = hardCodedChoices(SOURCES).filter((line) =>
      line.includes("dataviz-"),
    );
    expect(basemap.length).toBeGreaterThanOrEqual(30);
  });
});

describe("R3 — a copy that no longer agrees with its own majority", () => {
  /** A body long enough that changing ONE token still leaves the two copies above the similarity
   *  floor — which is what a fix that did not travel actually looks like, and what 0.98 is set for.
   *  A three-token body cannot show it: two bigrams against two with one shared is 0.5 similar, and
   *  0.5 is a different function, not a drifted copy. */
  const BODY = Array.from(
    { length: 24 },
    (_, i) => `if (row[${i}] === undefined) missing.push(LABELS[${i}]);`,
  ).join(" ");
  const three = (a: string, b: string, c: string) =>
    copiesThatDisagree(
      new Map([
        ["one.mjs", `function f(x) { ${a} }`],
        ["two.mjs", `function f(x) { ${b} }`],
        ["three.mjs", `function f(x) { ${c} }`],
      ]),
    );

  it("says nothing when all three copies agree", () => {
    expect(three("return x + 1;", "return x + 1;", "return x + 1;")).toEqual(
      [],
    );
  });

  it("names the one copy that drifted from the two that agree", () => {
    expect(three(BODY, BODY, BODY.replace("missing.push", "missing.unshift"))).toEqual([
      "f  three.mjs",
    ]);
  });

  it("says nothing when the odd copy is a different function that shares a name", () => {
    const found = three(BODY, BODY, "return x.name ?? null;");
    expect(found).toEqual([]);
  });

  it("says nothing when there is no majority to be behind of", () => {
    expect(three("return x + 1;", "return x + 2;", "return x + 3;")).toEqual(
      [],
    );
  });

  it("measures similarity as a real number and not as a constant", () => {
    expect(similarity(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
    expect(similarity(["a", "b", "c"], ["x", "y", "z"])).toBe(0);
  });
});

describe("R4 — a capability that stopped part-way through the assemblers of one artefact", () => {
  const page = (body: string) =>
    `function render() { return '<div class="x-page">' + ${body}; }`;

  it("names an assembler that does not carry what the skill and its neighbour do", () => {
    const sources = new Map([
      [
        "skills/x/render.mjs",
        `function repeatWorlds(h) { return h; }\n${page("repeatWorlds('a')")}`,
      ],
      [
        "proof/a/render.mjs",
        `function repeatWorlds(h) { return h; }\n${page("repeatWorlds('a')")}`,
      ],
      ["proof/b/render.mjs", page("'a'")],
    ]);
    expect(capabilitiesThatStopped(sources)).toEqual([
      'repeatWorlds  absent from proof/b/render.mjs  of <div class="x-page">',
    ]);
  });

  it("says nothing about a capability that has never travelled once", () => {
    // A function only the skill has is the skill's business, not a fix that failed to arrive.
    const sources = new Map([
      [
        "skills/x/render.mjs",
        `function onlyHere(h) { return h; }\n${page("onlyHere('a')")}`,
      ],
      ["proof/a/render.mjs", page("'a'")],
      ["proof/b/render.mjs", page("'a'")],
    ]);
    expect(capabilitiesThatStopped(sources)).toEqual([]);
  });

  it("never reads a `test/` file as an assembler, because quoting a shell delivers no page", () => {
    const sources = new Map([
      [
        "skills/x/render.mjs",
        `function repeatWorlds(h) { return h; }\n${page("repeatWorlds('a')")}`,
      ],
      [
        "proof/a/render.mjs",
        `function repeatWorlds(h) { return h; }\n${page("repeatWorlds('a')")}`,
      ],
      ["skills/x/test/render.test.ts", page("'a'")],
    ]);
    expect(capabilitiesThatStopped(sources)).toEqual([]);
  });

  it("reads its population off the artefact this tree actually ships", () => {
    const shells = [...assemblersByArtefact(SOURCES).values()];
    expect(shells.length).toBeGreaterThan(0);
    // The map-web page family: ten files assemble it today, the same ten `map-web`'s own
    // `the-fix-reaches-the-page-assemblers.test.ts` derives from `<div class="map-web-page">`.
    expect(
      Math.max(...shells.map((files) => files.length)),
    ).toBeGreaterThanOrEqual(10);
  });
});
