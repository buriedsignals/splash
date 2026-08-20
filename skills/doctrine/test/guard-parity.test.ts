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

  // THE THIRD STATE, and the one that rots quietest. A blank cell says "this defect cannot happen
  // here", and two of them in this catalogue were RETIRED after measurement rather than being
  // obvious — `projection-pairing` for `map-beat` and for `map-web`, each after a count of how many
  // files in the tree carry an `object-fit` at all. A retirement with no reason beside it is
  // indistinguishable from a cell nobody ever thought about, and the next reader either re-measures
  // it or, worse, reads the blank as an oversight and adds debt that was never owed.
  it("gives a real reason for every cell whose blankness was argued", () => {
    for (const row of unreachableRows(readCatalogue())) {
      expect(PRODUCING_SKILLS).toContain(row.skill);
      expect(row.reason.length).toBeGreaterThan(20);
    }
  });

  it("never says a cell is both unreachable and a state", () => {
    for (const guard of readCatalogue().guards)
      for (const skill of Object.keys(guard.unreachable ?? {}))
        expect(`${guard.id} × ${skill}: ${guard.formats[skill] ?? "blank"}`).toBe(
          `${guard.id} × ${skill}: blank`,
        );
  });

  // Kept as the shape check for a row, now that there are no rows: it is what a future `owed` cell
  // will be checked by on the day one is added.
  it("can enumerate what every format still owes", () => {
    for (const row of owedRows(readCatalogue())) {
      expect(PRODUCING_SKILLS).toContain(row.skill);
      expect(row.guard.length).toBeGreaterThan(0);
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
  // `unreachable` — in prose the next reader can disagree with — that the defect cannot happen
  // there, which is a claim with a name attached and a measurement behind it.
  it("owes nothing: every reachable format carries every guard it can reach", () => {
    expect(owedRows(readCatalogue())).toEqual([]);
  });
});
