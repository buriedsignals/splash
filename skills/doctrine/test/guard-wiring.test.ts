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
 * debt its own format is still carrying, BY NAME, in `RECORDED_UNWIRED`. This file is the ratchet:
 * a name may leave that list, and a name that turns up unwired and unrecorded is a red naming the
 * skill and the guard — one step before somebody would have had to remember.
 */
import { describe, expect, it } from "bun:test";
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
  };
}

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
