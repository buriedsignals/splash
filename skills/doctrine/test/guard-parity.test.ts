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
  disciplineIsWritten,
  owedRows,
  readCatalogue,
  unreachableRows,
  walkedByExists,
  cataloguedSkills,
  PRODUCING_SKILLS,
} from "../../../scripts/guards.mjs";

describe("the guard catalogue", () => {
  it("names, for every guard, what it refuses and the defect that earned it", () => {
    const rules = readCatalogue().rules;
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      // A guard REFUSES a defect; a capability OFFERS something a reader gains — one field or the
      // other, never both, and every rule has one of them.
      expect((rule.refuses ?? rule.offers).length).toBeGreaterThan(20);
      expect(rule.earnedBy.length).toBeGreaterThan(20);
      // decidedBy names a guard's own decision function; detectedBy names a capability's own — the
      // same DECLARED-NOT-INFERRED contract `carriedBy` reads, under whichever name its kind uses.
      // A discipline has neither: it names no function at all, only the document it is WRITTEN in.
      if (rule.kind === "discipline") expect(rule.writtenIn).toMatch(/\.md$/);
      else expect(rule.decidedBy ?? rule.detectedBy).toMatch(/^[a-zA-Z]+$/);
    }
  });

  it("declares a state for every skill it names, and names only real skills", () => {
    for (const rule of readCatalogue().rules)
      for (const [skill, state] of Object.entries(rule.states)) {
        expect(cataloguedSkills()).toContain(skill);
        expect(["carried", "owed"]).toContain(state);
      }
  });

  it("carries every guard it claims to carry", () => {
    for (const rule of readCatalogue().rules)
      for (const [skill, state] of Object.entries(rule.states))
        if (state === "carried") {
          // A discipline is PROSE a skill has to have WRITTEN, never a decision function it
          // exports — `disciplineIsWritten` reads for the rule's own id, exactly the way
          // `carriedBy` reads a guard's or a capability's name out of a `GUARDS` array.
          if (rule.kind === "discipline")
            expect(disciplineIsWritten(skill, rule.id)).toBe(true);
          else expect(carriedBy(skill)).toContain(rule.decidedBy ?? rule.detectedBy);
        }
  });

  // A capability declaring its name in `states` proves nothing about a SWEEP existing to measure
  // it against a delivered page — `carriedBy` only reads that a `GUARDS`/detector array names the
  // function, and a detector can go on existing after the walking test that called it against real
  // artefacts is deleted. `walkedBy` closes that: every capability names the test file that walks
  // it, and every skill claiming `carried` must have that file, mentioning the detector by name.
  it("names, for every carried capability, the test file that walks it", () => {
    for (const rule of readCatalogue().rules) {
      if (rule.kind !== "capability") continue;
      expect(`${rule.id} names a walkedBy`).toBe(
        rule.walkedBy ? `${rule.id} names a walkedBy` : `${rule.id} names no walkedBy`,
      );
      for (const [skill, state] of Object.entries(rule.states))
        if (state === "carried")
          expect(
            `${rule.id} × ${skill}: ${rule.walkedBy} exists and mentions ${rule.detectedBy}`,
          ).toBe(
            walkedByExists(skill, rule)
              ? `${rule.id} × ${skill}: ${rule.walkedBy} exists and mentions ${rule.detectedBy}`
              : `${rule.id} × ${skill}: ${rule.walkedBy} missing, or silent about ${rule.detectedBy}`,
          );
    }
  });

  it("declares every guard any skill already carries", () => {
    const declared = new Set(
      readCatalogue().rules.map((rule) => rule.decidedBy ?? rule.detectedBy),
    );
    for (const skill of cataloguedSkills())
      for (const name of carriedBy(skill))
        expect([...declared]).toContain(name);
  });

  // THE THIRD STATE, and the one that rots quietest — now reserved for a skill the derivation
  // REACHES and which is still argued not to carry the guard, since a skill outside the derived set
  // needs no entry at all: the missing trait already proves the blankness, structurally, with no
  // prose required. A cell here is a claim with a reason attached, not a restatement of a trait.
  it("gives a real reason for every cell whose blankness was argued", () => {
    for (const row of unreachableRows(readCatalogue())) {
      expect(cataloguedSkills()).toContain(row.skill);
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
      expect(cataloguedSkills()).toContain(row.skill);
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
  // AND WHAT WIDENING THE POPULATION DID TO IT, on 2026-08-23. Until that day the catalogue could
  // only ask the eight skills that DRAW, and their debt had been paid to zero, so one `toEqual([])`
  // said everything there was to say. Asking the whole tree made four cells visible that had never
  // been asked of anybody — `csv-split-by-hand` on the two skills that read the frozen table,
  // `credential-alias-reconciled` on the two that read a live credential — and each one is real,
  // measured debt rather than an exception: `splash/scripts/run-operation.mjs` and
  // `deliver/scripts/deploy-embed.mjs` both read `env.CLOUDFLARE_API_TOKEN` with no alias list
  // declared anywhere in the skill, which is precisely the shape that rule refuses, and the defect
  // that EARNED it names `splash` by name.
  //
  // Blanking those cells is the one move this whole mechanism exists to forbid. Letting the single
  // assertion go red instead would teach a reader to ignore red — the reason `owed` was allowed to
  // pass at all while the first debt was being paid. So it splits, and the second half is STRICTER
  // than the one thing it replaced rather than weaker: the skills that draw still owe NOTHING, and
  // the debt the widening exposed is pinned to an exact list. A fifth owed cell anywhere in the
  // tree — a new skill, a new trait, a rule reaching one more place — is red on the day it appears.
  it("owes nothing among the skills that DRAW: no creation process is weaker than its neighbour", () => {
    expect(
      owedRows(readCatalogue()).filter((row) => PRODUCING_SKILLS.includes(row.skill)),
    ).toEqual([]);
  });

  // AND THE LIST IS EMPTY AGAIN, on 2026-08-23, a few hours after it was written. The four cells
  // widening the population exposed were an exact, pinned list so that a fifth could not appear
  // unnoticed while they were being paid; all four are paid, so the list is what it was written to
  // become. ONE of them was a live defect rather than missing paperwork, and it is worth naming
  // because the other three were not: `deliver` shipped every delivered map with a dead tile layer,
  // measured, because the root's `.env` held the MapTiler key under the engine's own names and its
  // hand-written two-name fallback read that back as no key at all. `splash`'s own
  // `run-operation.mjs` read `CLOUDFLARE_API_TOKEN` by its canonical name between two lines that
  // resolved aliases — the same shape, with nothing behind it today, since that credential has no
  // alias; the two csv cells were clean when the rule arrived and the debt there was the missing
  // sweep. Running the storyboard reader anyway found a real defect the guard cannot see.
  //
  // IT MAY ONLY EVER GET SHORTER, and it cannot get shorter than this. This assertion is now the
  // whole tree's version of the one above it: a rule reaching one more skill, a skill growing one
  // more trait, a new skill appearing — any of them lands here as a red naming the cell, on the day
  // it appears. The way out is never to blank the cell; it is to carry the guard, or to argue in
  // `exceptions` that the defect cannot happen there.
  it("owes nothing anywhere in the tree, not only among the skills that draw", () => {
    expect(owedRows(readCatalogue())).toEqual([]);
  });
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
    expect(
      start,
      'the "## What each skill is" section is missing from the document',
    ).toBeGreaterThan(-1);
    const afterHeading = doc.slice(start + heading.length);
    const nextHeading = afterHeading.indexOf("\n## ");
    const section =
      nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);

    for (const skill of cataloguedSkills()) {
      const row = section
        .split("\n")
        .find((line) => line.startsWith(`| ${skill} |`));
      expect(row, `${skill} has no row in the traits table`).toBeDefined();
      const cells = (row ?? "").split("|").map((cell) => cell.trim());
      const named = TRAITS.filter(
        (trait, index) => cells[index + 2] === "\u2713",
      ).map((trait) => trait.id);
      expect(
        named.sort(),
        `${skill}'s row disagrees with its TRAITS.json`,
      ).toEqual([...traitsOf(skill)].sort());
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
    refuses:
      "a fixture defect used only to prove the renderer handles three kinds at once",
  });
  const capabilityRule = fixtureRule("capability", {
    detectedBy: "fixtureCapabilityDetected",
    offers:
      "a fixture capability used only to prove the renderer handles three kinds at once",
  });
  const disciplineRule = fixtureRule("discipline", {
    writtenIn: "fixtureDisciplineWritten",
  });

  it("prints three matrices in order guard, capability, discipline, with the discipline note right after", () => {
    const doc = renderGuardsDoc({
      rules: [guardRule, capabilityRule, disciplineRule],
    });
    const guardAt = doc.indexOf("## guard");
    const capabilityAt = doc.indexOf("## capability");
    const disciplineAt = doc.indexOf("## discipline");
    const disciplineRowAt = doc.indexOf("| fixture-discipline |");
    const sentenceAt = doc.indexOf("not mechanically verified");
    const nextHeadingAt = doc.indexOf("\n## ", disciplineRowAt);

    expect(guardAt, "no ## guard heading").toBeGreaterThan(-1);
    expect(
      capabilityAt,
      "## capability must come after ## guard",
    ).toBeGreaterThan(guardAt);
    expect(
      disciplineAt,
      "## discipline must come after ## capability",
    ).toBeGreaterThan(capabilityAt);
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

// TASK 7: a discipline is prose a skill has to have WRITTEN where an author reads it — checked
// for PRESENCE, never mechanically. `disciplineIsWritten` is that check, tested directly here
// before anything in the catalogue depends on it.
describe("disciplineIsWritten reads a skill's own docs for a rule's id", () => {
  it("finds an id already written into a skill's own SKILL.md", () => {
    // `chart-beat/SKILL.md` names `static-discipline.md` — the doctrine file, not the id below —
    // repeatedly on its own; this is presence of a SUBSTRING, proven against real files on disk,
    // not a fixture standing in for them.
    expect(disciplineIsWritten("chart-beat", "static-discipline")).toBe(true);
  });

  it("finds an id written into a skill's own references/, not just its SKILL.md", () => {
    expect(disciplineIsWritten("image-beat", "static-discipline")).toBe(true);
  });

  it("returns false for an id that appears nowhere in the skill's own docs", () => {
    expect(disciplineIsWritten("chart-beat", "an-id-no-file-here-has-ever-named")).toBe(false);
  });

  it("returns false for a skill with no docs at all", () => {
    expect(disciplineIsWritten("not-a-real-skill", "static-discipline")).toBe(false);
  });
});
