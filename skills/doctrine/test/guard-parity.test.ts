// THE TEST THAT STOPS ONE CREATION PATH BEING WEAKER THAN ITS NEIGHBOUR.
//
// Eight skills produce visuals. On the day this was written, `scrolly` carried 42 verification
// assertions and four of the eight carried none at all — while every guard `scrolly` had earned was
// reachable from at least one of the unarmed paths. A rule that lives in the skill it was found in
// is three quarters of a fix; this file is the last quarter.
//
// The catalogue is the single written list of guards this project has earned. Each row names what it
// refuses, the DEFECT that earned it, the pure function that decides it, and — per producing skill —
// whether that skill `carries` the guard or `owes` it.
//
// Two invariants are enforced here, and a third is deliberately NOT:
//   · a cell claiming `carried` must really carry it — a catalogue that lies is worse than none;
//   · a guard written into a skill and never declared fails, because a rule nobody declared is a
//     rule no other format will ever inherit;
//   · an `owed` cell does NOT fail. It is debt, enumerated in `GUARDS.md`. A permanently red suite
//     teaches a reader to ignore red, which is the opposite of the point. Task 7 of the plan flips
//     this once the debt is paid.

import { describe, expect, it } from "bun:test";
import {
  carriedBy,
  owedRows,
  readCatalogue,
  unreachableRows,
  PRODUCING_SKILLS,
} from "../../../scripts/guards.mjs";

describe("the guard catalogue", () => {
  it("names, for every guard, what it refuses and the defect that earned it", () => {
    const rules = readCatalogue().rules;
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.refuses.length).toBeGreaterThan(20);
      expect(rule.earnedBy.length).toBeGreaterThan(20);
      expect(rule.decidedBy).toMatch(/^[a-zA-Z]+$/);
    }
  });

  it("declares a state for every skill it names, and names only real skills", () => {
    for (const rule of readCatalogue().rules)
      for (const [skill, state] of Object.entries(rule.states)) {
        expect(PRODUCING_SKILLS).toContain(skill);
        expect(["carried", "owed"]).toContain(state);
      }
  });

  it("carries every guard it claims to carry", () => {
    for (const rule of readCatalogue().rules)
      for (const [skill, state] of Object.entries(rule.states))
        if (state === "carried")
          expect(carriedBy(skill)).toContain(rule.decidedBy);
  });

  it("declares every guard any skill already carries", () => {
    const declared = new Set(
      readCatalogue().rules.map((rule) => rule.decidedBy),
    );
    for (const skill of PRODUCING_SKILLS)
      for (const name of carriedBy(skill))
        expect([...declared]).toContain(name);
  });

  // THE THIRD STATE, and the one that rots quietest — now reserved for a skill the derivation
  // REACHES and which is still argued not to carry the guard, since a skill outside the derived set
  // needs no entry at all: the missing trait already proves the blankness, structurally, with no
  // prose required. A cell here is a claim with a reason attached, not a restatement of a trait.
  it("gives a real reason for every cell whose blankness was argued", () => {
    for (const row of unreachableRows(readCatalogue())) {
      expect(PRODUCING_SKILLS).toContain(row.skill);
      expect(row.reason.length).toBeGreaterThan(20);
    }
  });

  it("never says a cell is both an exception and a state", () => {
    for (const rule of readCatalogue().rules)
      for (const skill of Object.keys(rule.exceptions ?? {}))
        expect(`${rule.id} × ${skill}: ${rule.states[skill] ?? "blank"}`).toBe(
          `${rule.id} × ${skill}: blank`,
        );
  });

  // Kept as the shape check for a row, now that there are no rows: it is what a future `owed` cell
  // will be checked by on the day one is added.
  it("can enumerate what every format still owes", () => {
    for (const row of owedRows(readCatalogue())) {
      expect(PRODUCING_SKILLS).toContain(row.skill);
      expect(row.rule.length).toBeGreaterThan(0);
    }
  });

  // THE ASSERTION THIS WHOLE PLAN EXISTS FOR, and the last one written on purpose.
  //
  // Until now an `owed` cell failed nothing: it was debt, enumerated in `GUARDS.md`, because a
  // permanently red suite teaches a reader to ignore red. That was the right state while 15 cells
  // were owed and every task was paying some of them off. It is the wrong state now: with the debt
  // at zero, "no creation process is weaker than its neighbour" stops being a claim someone has to
  // re-check by reading and becomes a thing the suite refuses to let go of. A guard reaching a new
  // format lands as a RED here, naming the format and the guard, on the day the catalogue says it
  // is reachable — which is exactly one step before someone would have had to remember.
  //
  // The way OUT of a red here is never to blank the cell: it is to carry the guard, or to argue in
  // `exceptions` — in prose the next reader can disagree with — that the defect cannot happen
  // there, which is a claim with a name attached and a measurement behind it.
  //
  // TASK 2 (2026-08-20): moving `requires` from hand-typed skill lists to a trait derivation surfaced
  // four cells nobody had typed — `duplicated-payload`×`map-beat`, `plate-geometry-pairing`×`scrolly`,
  // `screen-space-dash`×`image-beat`, `reveal-completes`×`map-beat` — each marked `owed`, on purpose,
  // per Step 6 of that task's plan. That is correct and it is the point: a set nobody derives is a
  // set nobody notices. Task 4 pays this debt down and un-todos this assertion.
  it.todo(
    "owes nothing: every reachable format carries every guard it can reach",
    () => {
      expect(owedRows(readCatalogue())).toEqual([]);
    },
  );
});

// appended to skills/doctrine/test/guard-parity.test.ts
import {
  reachable,
  renderGuardsDoc,
  strayRows,
  unstatedRows,
} from "../../../scripts/guards.mjs";
import { TRAITS, traitsOf } from "../../../scripts/traits.mjs";

describe("a rule reaches skills through what they are", () => {
  it("requires at least one trait, and only traits the vocabulary knows", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const rule of readCatalogue().rules) {
      expect(rule.requires.length).toBeGreaterThan(0);
      for (const id of rule.requires) expect([...known]).toContain(id);
    }
  });

  it("derives the reachable set rather than reading a list of skills", () => {
    for (const rule of readCatalogue().rules)
      for (const skill of reachable(rule))
        for (const id of rule.requires) expect(traitsOf(skill)).toContain(id);
  });

  it("names no skill outside the set its traits derive", () => {
    expect(strayRows(readCatalogue())).toEqual([]);
  });

  it("leaves no derived skill without a state or an exception", () => {
    expect(unstatedRows(readCatalogue())).toEqual([]);
  });

  it("declares a kind the mechanism knows how to confirm", () => {
    for (const rule of readCatalogue().rules)
      expect(["guard", "capability", "discipline"]).toContain(rule.kind);
  });
});

describe("the generated state says what a reader needs", () => {
  const doc = renderGuardsDoc(readCatalogue());

  it("prints one matrix per kind that has rules", () => {
    for (const kind of new Set(readCatalogue().rules.map((rule) => rule.kind)))
      expect(doc).toContain(`## ${kind}`);
  });

  it("prints the traits table, so a reader sees WHY a rule reaches a skill", () => {
    const heading = "## What each skill is";
    const start = doc.indexOf(heading);
    expect(start, "the \"## What each skill is\" section is missing from the document").toBeGreaterThan(-1);
    const afterHeading = doc.slice(start + heading.length);
    const nextHeading = afterHeading.indexOf("\n## ");
    const section = nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);

    for (const skill of PRODUCING_SKILLS) {
      const row = section.split("\n").find((line) => line.startsWith(`| ${skill} |`));
      expect(row, `${skill} has no row in the traits table`).toBeDefined();
      const cells = (row ?? "").split("|").map((cell) => cell.trim());
      const named = TRAITS.filter((trait, index) => cells[index + 2] === "\u2713").map(
        (trait) => trait.id,
      );
      expect(named.sort(), `${skill}'s row disagrees with its TRAITS.json`).toEqual(
        [...traitsOf(skill)].sort(),
      );
    }
  });

  it("says out loud that a discipline is not mechanically verified", () => {
    expect(doc).toContain("not mechanically verified");
  });
});

// FINDING 2 (fix round 1, coordinator review of Task 3): the "one matrix per kind" behaviour above
// only ever exercised `kind: "guard"`, because that is the only kind the real catalogue carries
// today — it could not, by construction, prove the multi-kind ordering or the discipline note's
// placement until Task 5/7 add capability/discipline rules for real. This fixture catalogue is
// never merged into `guard-catalogue.json`; it exists only to give `renderGuardsDoc` all three
// kinds at once, on demand, before those tasks land.
describe("renderGuardsDoc handles every kind at once, on a synthetic catalogue", () => {
  const fixtureRule = (kind, extra) => ({
    id: `fixture-${kind}`,
    kind,
    requires: ["draws-own-geometry"],
    earnedBy: "written for this test only, not a real defect or capability",
    states: {},
    exceptions: {},
    ...extra,
  });
  const guardRule = fixtureRule("guard", {
    decidedBy: "fixtureGuardDecided",
    refuses: "a fixture defect used only to prove the renderer handles three kinds at once",
  });
  const capabilityRule = fixtureRule("capability", {
    detectedBy: "fixtureCapabilityDetected",
    offers: "a fixture capability used only to prove the renderer handles three kinds at once",
  });
  const disciplineRule = fixtureRule("discipline", {
    writtenIn: "fixtureDisciplineWritten",
  });

  it("prints three matrices in order guard, capability, discipline, with the discipline note right after", () => {
    const doc = renderGuardsDoc({ rules: [guardRule, capabilityRule, disciplineRule] });
    const guardAt = doc.indexOf("## guard");
    const capabilityAt = doc.indexOf("## capability");
    const disciplineAt = doc.indexOf("## discipline");
    const disciplineRowAt = doc.indexOf("| fixture-discipline |");
    const sentenceAt = doc.indexOf("not mechanically verified");
    const nextHeadingAt = doc.indexOf("\n## ", disciplineRowAt);

    expect(guardAt, "no ## guard heading").toBeGreaterThan(-1);
    expect(capabilityAt, "## capability must come after ## guard").toBeGreaterThan(guardAt);
    expect(disciplineAt, "## discipline must come after ## capability").toBeGreaterThan(
      capabilityAt,
    );
    expect(
      disciplineRowAt,
      "the discipline matrix never printed its own rule's row",
    ).toBeGreaterThan(disciplineAt);
    expect(
      sentenceAt,
      "the disciplines-are-not-mechanically-verified sentence is missing",
    ).toBeGreaterThan(disciplineRowAt);
    expect(
      sentenceAt,
      "the sentence must sit right after the discipline matrix, before the next section",
    ).toBeLessThan(nextHeadingAt === -1 ? Infinity : nextHeadingAt);
  });

  it("prints no discipline heading at all when no discipline rule exists", () => {
    const doc = renderGuardsDoc({ rules: [guardRule, capabilityRule] });
    expect(doc).not.toContain("## discipline");
  });
});
