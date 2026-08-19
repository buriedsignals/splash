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
import { carriedBy, owedRows, readCatalogue, PRODUCING_SKILLS } from "../../../scripts/guards.mjs";

describe("the guard catalogue", () => {
  it("names, for every guard, what it refuses and the defect that earned it", () => {
    const guards = readCatalogue().guards;
    expect(guards.length).toBeGreaterThan(0);
    for (const guard of guards) {
      expect(guard.refuses.length).toBeGreaterThan(20);
      expect(guard.earnedBy.length).toBeGreaterThan(20);
      expect(guard.decidedBy).toMatch(/^[a-zA-Z]+$/);
    }
  });

  it("declares a state for every skill it names, and names only real skills", () => {
    for (const guard of readCatalogue().guards)
      for (const [skill, state] of Object.entries(guard.formats)) {
        expect(PRODUCING_SKILLS).toContain(skill);
        expect(["carried", "owed"]).toContain(state);
      }
  });

  it("carries every guard it claims to carry", () => {
    for (const guard of readCatalogue().guards)
      for (const [skill, state] of Object.entries(guard.formats))
        if (state === "carried") expect(carriedBy(skill)).toContain(guard.decidedBy);
  });

  it("declares every guard any skill already carries", () => {
    const declared = new Set(readCatalogue().guards.map((guard) => guard.decidedBy));
    for (const skill of PRODUCING_SKILLS)
      for (const name of carriedBy(skill)) expect([...declared]).toContain(name);
  });

  // Not an assertion about the debt's SIZE — that is the plan's job — but about it being readable.
  // A gap nobody can enumerate is a gap nobody will close.
  it("can enumerate what every format still owes", () => {
    for (const row of owedRows(readCatalogue())) {
      expect(PRODUCING_SKILLS).toContain(row.skill);
      expect(row.guard.length).toBeGreaterThan(0);
    }
  });
});
