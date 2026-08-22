/**
 * ROUND SIX, FINDING AC1 — the rule that was distributed to eight skills and called by none.
 *
 * `fills-its-frame` was re-declared in the morning from `ships-standalone-html` to
 * `materialises-a-beat`, its detector was copied into all eight producing skills, and four hours
 * later the controller measured `graphicFillsItsFrame`: **zero callers in all eight**. The rule is
 * not inert — `stress-ab` measured 16.6% and 14.8% against its 17.9% floor and caught a real defect
 * on a real page — but only because that beat's author wrote a runner by hand. A distributed guard
 * that nothing calls has not landed.
 *
 * `guard-wired-to-run` was the DISCIPLINE that was supposed to prevent exactly this, and it did not,
 * because a discipline is prose and prose cannot observe its own violation. This is the observation.
 *
 * The decision lives in each skill's own `scripts/detect-guard-wiring.mjs` (one decision, eight
 * byte-identical copies, held by `splash/test/guard-copies-parity.test.ts`); each copy records the
 * names its own format still does not call, BY NAME, in `RECORDED_UNWIRED`. This file is the
 * ratchet: a name that turns up unwired and unrecorded is a red naming the skill and the guard —
 * one step before somebody would have had to remember.
 *
 * 2026-08-23, THE RATCHET CHANGES SHAPE. That one list was telling three different facts in one
 * voice, and the two that were not debt were being believed rather than checked:
 *
 *   1. DEBT (`RECORDED_UNWIRED_DEBT`) — nobody has wired it yet and somebody could. This array may
 *      only ever SHRINK; a name may leave it and may never join it. That is the whole ratchet, and
 *      it is unchanged for these names.
 *   2. BEAT-SUBSTRATE (`RECORDED_BEAT_SUBSTRATE`) — only a beat can call it, because the decision
 *      needs material a skill's own seed does not have and must not invent. This array MAY GROW,
 *      which is exactly why every entry names a committed beat that really calls the decision, and
 *      why the test below goes and looks. A name here with no real caller anywhere is worse than
 *      debt: it is debt wearing an excuse.
 *   3. DRIVEN-BY-ITS-OWN-SUITE (`RECORDED_DRIVEN_BY_ITS_OWN_SUITE`) — driven by this format's own
 *      test rather than by a `scripts/` file, on purpose, because the decision's subject is the
 *      skill's own committed files and there is no delivered artefact to point a command at. It may
 *      grow under the same demand: name the test, and the test below goes and looks.
 *
 * `RECORDED_UNWIRED` is DERIVED from the three, so what may only shrink and what may grow is said
 * in the shape of the file rather than in a sentence somebody has to remember.
 */
import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PRODUCING_SKILLS } from "../../../scripts/guards.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

async function wiringOf(skill: string) {
  const dir = join(TWIN, "skills", skill);
  const module = await import(join(dir, "scripts", "detect-guard-wiring.mjs"));
  return {
    dir,
    decisions: module.declaredDecisions(dir) as { name: string; home: string | null; callers: string[] }[],
    unwired: module.declarationsWithoutACaller(dir) as string[],
    recorded: module.RECORDED_UNWIRED as string[],
    debt: module.RECORDED_UNWIRED_DEBT as string[],
    beatSubstrate: module.RECORDED_BEAT_SUBSTRATE as Claim[],
    ownSuite: module.RECORDED_DRIVEN_BY_ITS_OWN_SUITE as Claim[],
    unbackedBeatSubstrate: module.beatSubstrateWithoutACaller(dir, module.RECORDED_BEAT_SUBSTRATE) as string[],
    unbackedOwnSuite: module.ownSuiteWithoutACaller(dir, module.RECORDED_DRIVEN_BY_ITS_OWN_SUITE) as string[],
  };
}

type Claim = { name: string; calledBy: string };

describe("every guard a producing skill declares is reachable from something a journalist runs", () => {
  it("finds a real population in every skill, so no cell can go vacuously green", async () => {
    for (const skill of PRODUCING_SKILLS) {
      const { decisions } = await wiringOf(skill);
      expect(`${skill}: ${decisions.length} declared`).not.toBe(`${skill}: 0 declared`);
    }
  });

  it("names no decision a GUARDS array declares and no file the skill ships exports", async () => {
    const broken: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { decisions } = await wiringOf(skill);
      for (const decision of decisions)
        if (decision.home === null) broken.push(`${skill} declares ${decision.name} and exports it nowhere`);
    }
    expect(broken).toEqual([]);
  });

  it("leaves no guard unwired that its own format has not recorded as debt", async () => {
    const unrecorded: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { unwired, recorded } = await wiringOf(skill);
      for (const name of unwired)
        if (!recorded.includes(name))
          unrecorded.push(
            `${skill} declares ${name} and no file it ships outside that decision's own home calls it`,
          );
    }
    expect(unrecorded).toEqual([]);
  });

  // The other half of a ratchet, and the half that rots quietest: a debt list nobody shrinks stops
  // describing anything and starts excusing everything. A name that is recorded and no longer
  // unwired is a red too — the fix is to delete the line.
  it("records no debt that has already been paid", async () => {
    const stale: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { unwired, recorded } = await wiringOf(skill);
      for (const name of recorded)
        if (!unwired.includes(name))
          stale.push(`${skill} records ${name} as unwired debt and something now calls it`);
    }
    expect(stale).toEqual([]);
  });

  // THE FINDING ITSELF, pinned by name rather than left to the general rule above. This is the one
  // assertion that would have gone red on the morning the detector was distributed, and it names
  // the guard so a reader of a failure knows which fix did not land.
  it("wires fills-its-frame in every one of the eight it was distributed to", async () => {
    const missing: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { decisions } = await wiringOf(skill);
      const found = decisions.find((decision) => decision.name === "graphicFillsItsFrame");
      expect(`${skill} declares graphicFillsItsFrame`).toBe(
        found ? `${skill} declares graphicFillsItsFrame` : `${skill} does NOT declare graphicFillsItsFrame`,
      );
      if (found && found.callers.length === 0) missing.push(`${skill}: present, callers outside the detector: 0`);
    }
    expect(missing).toEqual([]);
  });
});

// THE RULING OF 2026-08-23, AND THE HALF OF IT THAT IS NOT PROSE. Categories 2 and 3 exist because
// "nobody has wired it yet" was being said about names nobody ever could wire — but an excuse that
// is asserted and never looked at is how a debt list becomes a permission slip. So every claim in
// either category names a caller, and these assertions go and read that file.
describe("a name recorded as something other than debt carries a reason, and the reason is checked", () => {
  it("records every unwired name in exactly one of the three reasons", async () => {
    const wrong: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { debt, beatSubstrate, ownSuite, recorded } = await wiringOf(skill);
      const all = [...debt, ...beatSubstrate.map((claim) => claim.name), ...ownSuite.map((claim) => claim.name)];
      for (const name of new Set(all))
        if (all.filter((other) => other === name).length > 1)
          wrong.push(`${skill} records ${name} under more than one reason`);
      // `RECORDED_UNWIRED` is derived, and this is what says so out loud: a copy that went back to
      // typing it beside the three arrays would drift from them silently.
      expect(`${skill}: ${recorded.join(" ")}`).toBe(`${skill}: ${[...all].sort().join(" ")}`);
    }
    expect(wrong).toEqual([]);
  });

  it("backs every beat-substrate claim with a committed beat that really calls the decision", async () => {
    const unbacked: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { unbackedBeatSubstrate } = await wiringOf(skill);
      for (const problem of unbackedBeatSubstrate) unbacked.push(`${skill}: ${problem}`);
    }
    expect(unbacked).toEqual([]);
  });

  it("backs every driven-by-its-own-suite claim with a test in that format's own suite that really calls it", async () => {
    const unbacked: string[] = [];
    for (const skill of PRODUCING_SKILLS) {
      const { unbackedOwnSuite } = await wiringOf(skill);
      for (const problem of unbackedOwnSuite) unbacked.push(`${skill}: ${problem}`);
    }
    expect(unbacked).toEqual([]);
  });

  // A CHECK THAT ONLY EVER SEES REAL CLAIMS IS A CHECK NOBODY HAS WATCHED WORK — the same argument
  // `example-runners-run.test.ts` makes for building its own failure cases by hand. These four are
  // the ways a claim can be unbacked, each built in a scratch tree, so the mechanism is seen
  // refusing rather than assumed to.
  describe("the check refuses an unbacked claim", () => {
    const scratch = mkdtempSync(join(tmpdir(), "splash-wiring-claims-"));
    const skillDir = join(scratch, "skills", "a-format");
    mkdirSync(join(skillDir, "test"), { recursive: true });
    mkdirSync(join(scratch, "stories", "a-story", "beats", "1-a-beat"), { recursive: true });
    const beat = join("stories", "a-story", "beats", "1-a-beat", "render-web.mjs");
    afterAll(() => rmSync(scratch, { recursive: true, force: true }));

    const write = (path: string, source: string) => writeFileSync(join(scratch, path), source);
    const checkBeat = async (claims: Claim[]) =>
      (await import(join(TWIN, "skills", "chart-beat", "scripts", "detect-guard-wiring.mjs"))).beatSubstrateWithoutACaller(
        skillDir,
        claims,
      ) as string[];
    const checkSuite = async (claims: Claim[]) =>
      (await import(join(TWIN, "skills", "chart-beat", "scripts", "detect-guard-wiring.mjs"))).ownSuiteWithoutACaller(
        skillDir,
        claims,
      ) as string[];

    it("accepts a beat that calls the decision, and refuses the same beat once the call is removed", async () => {
      write(beat, 'import { theDecision } from "./geo.ts";\nconst stray = theDecision(STUDY, values);\n');
      expect(await checkBeat([{ name: "theDecision", calledBy: beat }])).toEqual([]);
      // THE MUTATION, in the suite rather than in my shell: the call goes, the import stays.
      write(beat, 'import { theDecision } from "./geo.ts";\nconst stray = [];\n');
      expect(await checkBeat([{ name: "theDecision", calledBy: beat }])).toHaveLength(1);
    });

    it("refuses a beat that only mentions the decision in a comment", async () => {
      write(beat, "// theDecision is what would judge this join, one day.\nconst stray = [];\n");
      expect(await checkBeat([{ name: "theDecision", calledBy: beat }])).toHaveLength(1);
    });

    it("refuses a claim that names no caller at all, and one whose caller is not a beat", async () => {
      expect(await checkBeat([{ name: "theDecision", calledBy: "" }])).toHaveLength(1);
      expect(await checkBeat([{ name: "theDecision", calledBy: "skills/a-format/scripts/anything.mjs" }])).toHaveLength(1);
      expect(await checkBeat([{ name: "theDecision", calledBy: "stories/a-story/beats/1-a-beat/absent.mjs" }])).toHaveLength(1);
    });

    it("accepts a test in this format's own suite that calls the decision, and refuses a neighbour's", async () => {
      write(join("skills", "a-format", "test", "sweep.test.ts"), "expect(theDecision(results)).toEqual([]);\n");
      expect(await checkSuite([{ name: "theDecision", calledBy: "test/sweep.test.ts" }])).toEqual([]);
      write(join("skills", "a-format", "test", "sweep.test.ts"), "expect(results).toEqual([]);\n");
      expect(await checkSuite([{ name: "theDecision", calledBy: "test/sweep.test.ts" }])).toHaveLength(1);
      expect(await checkSuite([{ name: "theDecision", calledBy: "skills/b-format/test/sweep.test.ts" }])).toHaveLength(1);
    });
  });
});
