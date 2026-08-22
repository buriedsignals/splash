/**
 * THE COMMAND HAS TO SAY WHAT IT DID NOT ASK.
 *
 * `verify-web.mjs` is the one command `SKILL.md` tells a producer to run. On the real 7 585-row
 * Ember story it printed 63 green checks having asked two of this skill's eighteen declared
 * decisions, and printed nothing at all about the other sixteen. That is a false confirmation, and
 * it is worse than a red: a producer reads sixty-three greens and ships.
 *
 * What is asserted here is the MECHANISM that makes it impossible to go quiet again: the population
 * is derived from the `GUARDS` arrays this skill actually ships, so a decision added tomorrow and
 * wired to nothing turns up by name — and a name with no argument recorded for it is a failure, not
 * a line of prose.
 */
import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { declaredDecisions } from "../scripts/detect-guard-wiring.mjs";
import {
  NOT_ABOUT_ONE_PAGE,
  decisionsNotAsked,
} from "../scripts/verify-coverage.mjs";

const SKILL = resolve(import.meta.dirname, "..");

describe("decisionsNotAsked", () => {
  it("should derive its population from the GUARDS arrays this skill ships, not from a typed list", () => {
    const declared = declaredDecisions(SKILL).map((decision) => decision.name);
    expect(declared.length).toBeGreaterThan(10);
    expect(decisionsNotAsked(SKILL, []).map((one) => one.name)).toEqual(
      [...declared].sort(),
    );
  });

  it("should report nothing when the run asked every declaration", () => {
    const declared = declaredDecisions(SKILL).map((decision) => decision.name);
    expect(decisionsNotAsked(SKILL, declared)).toEqual([]);
  });

  it("should name a declaration the run skipped, with the reason it could not be asked", () => {
    const declared = declaredDecisions(SKILL).map((decision) => decision.name);
    const asked = declared.filter((name) => name !== "framingMeasurement");
    expect(decisionsNotAsked(SKILL, asked)).toEqual([
      {
        name: "framingMeasurement",
        reason: NOT_ABOUT_ONE_PAGE.framingMeasurement,
      },
    ]);
  });

  it("should hand back a null reason — never a silence — for a declaration nobody argued", () => {
    const asked = declaredDecisions(SKILL)
      .map((decision) => decision.name)
      .filter((name) => name !== "tableCarriesTheMarks");
    // `tableCarriesTheMarks` IS asked by the real run, so it has no recorded reason. Skipping it
    // here is the stand-in for a decision somebody adds tomorrow and wires to nothing: the caller
    // turns a null reason into a FAILURE, which is the whole point.
    expect(decisionsNotAsked(SKILL, asked)).toEqual([
      { name: "tableCarriesTheMarks", reason: null },
    ]);
  });

  it("should carry a reason only for decisions this skill really declares", () => {
    const declared = new Set(
      declaredDecisions(SKILL).map((decision) => decision.name),
    );
    for (const name of Object.keys(NOT_ABOUT_ONE_PAGE))
      expect([...declared]).toContain(name);
  });

  it("should record an argument for every declaration the real run leaves unasked", () => {
    // The run's own list, kept honest by `verify-web-drives-its-capabilities.test.ts`, which reads
    // the numbers off the command's own output. Here it is only the SHAPE that matters: whatever
    // the command cannot ask, an argument exists for.
    const unarguable = decisionsNotAsked(SKILL, []).filter(
      (one) => one.reason === null,
    );
    const wired = new Set(
      declaredDecisions(SKILL)
        .filter((decision) =>
          decision.callers.some((caller) => caller.includes("verify-web.mjs")),
        )
        .map((decision) => decision.name),
    );
    expect(
      unarguable.filter((one) => !wired.has(one.name)).map((one) => one.name),
    ).toEqual([]);
  });
});
