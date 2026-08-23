/**
 * A REAL, PRESENT MAPTILER KEY, AND A DELIVERY THAT SHIPPED THE PLACEHOLDER ANYWAY.
 *
 * Measured on this machine on 2026-08-23, not argued: the root `.env` holds
 * `REMOTION_MAPTILER_KEY` and `VITE_MAPTILER_KEY` — the sibling engine's own names — and neither
 * `MAPTILER_KEY` nor `MAPTILER_DELIVERY_KEY`. `substituteKeys` read those two canonical names off
 * the environment with a hand-written `||` fallback, not a declared alias list, so it substituted
 * nothing, `mapKeyState` answered `"unkeyed"`, and the hand-over told the newsroom their delivered
 * map carried no key while a working key sat in the file beside it. The delivered page renders its
 * fallback layer and no tiles.
 *
 * That is the defect `credential-alias-reconciled` was earned by, arriving in the phase that hands
 * work to a newsroom — the fourth sighting of one shape in a week, and the reason the rule was
 * widened past the eight skills that DRAW.
 *
 * WHAT EACH ASSERTION HOLDS, and the mutation that reddens it:
 *
 *   1. the two key decisions honour an alias. MUTATION: put `env.MAPTILER_DELIVERY_KEY ||
 *      env.MAPTILER_KEY` back into `substituteKeys` — both of the first two tests go red, which is
 *      how they were watched failing before the fix landed.
 *   2. the canonical name still wins when both are set, and the RESTRICTED key still wins over the
 *      development one (ruling R1b). A resolver that reordered either would be a silent policy
 *      change.
 *   3. nothing this skill ships reads a credential off the environment by its canonical name any
 *      more, and the command that says so exits non-zero when one does.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapKeyState, substituteKeys } from "../scripts/deliver.mjs";
import { resolveCloudflareCredentials } from "../scripts/deploy-embed.mjs";
import { resolveEnvKey } from "../scripts/env-keys.mjs";
import { credentialReadings } from "../scripts/verify-credentials.mjs";

const SKILL = join(import.meta.dirname, "..");
const COMMAND = join(SKILL, "scripts", "check-credentials.mjs");

// Assembled the same way `deliver.mjs` assembles its own placeholder, so this file is not itself a
// hit for the value-independent scan in `splash/test/no-key-in-the-repository.test.ts`.
const PLACEHOLDER = "__MAPTILER" + "_KEY__";
const MAP_PAGE = `<html><body><script>const style="…?key=${PLACEHOLDER}";</script></body></html>`;

const scratches: string[] = [];
afterEach(() => {
  for (const dir of scratches.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function scratchSkill(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "deliver-credential-sweep-"));
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts", "some-step.mjs"), source);
  scratches.push(dir);
  return dir;
}

describe("a delivered map takes the key the root actually holds", () => {
  it("substitutes a key the root holds only under the engine's own name", () => {
    const env = { REMOTION_MAPTILER_KEY: "an-engine-key" };
    expect(mapKeyState(MAP_PAGE, env)).toBe("development");
    expect(substituteKeys(MAP_PAGE, env)).toContain("an-engine-key");
    expect(substituteKeys(MAP_PAGE, env)).not.toContain(PLACEHOLDER);
  });

  it("reads every alias the engine uses, not just the first one", () => {
    for (const alias of [
      "MAPTILER_API_KEY",
      "REMOTION_MAPTILER_KEY",
      "VITE_MAPTILER_KEY",
    ]) {
      const env = { [alias]: `key-under-${alias}` };
      expect(`${alias}: ${mapKeyState(MAP_PAGE, env)}`).toBe(
        `${alias}: development`,
      );
      expect(substituteKeys(MAP_PAGE, env)).toContain(`key-under-${alias}`);
    }
  });

  it("still prefers the canonical name over an alias, and the restricted key over both", () => {
    expect(
      substituteKeys(MAP_PAGE, {
        MAPTILER_KEY: "canonical",
        REMOTION_MAPTILER_KEY: "alias",
      }),
    ).toContain("canonical");
    const both = {
      MAPTILER_DELIVERY_KEY: "restricted",
      REMOTION_MAPTILER_KEY: "alias",
    };
    expect(mapKeyState(MAP_PAGE, both)).toBe("restricted");
    expect(substituteKeys(MAP_PAGE, both)).toContain("restricted");
  });

  it("still says unkeyed when the root holds no MapTiler name at all", () => {
    expect(mapKeyState(MAP_PAGE, {})).toBe("unkeyed");
    expect(substituteKeys(MAP_PAGE, {})).toContain(PLACEHOLDER);
  });

  it("leaves a beat with no key slot alone whatever the environment holds", () => {
    const notAMap = "<html><body><p>a bar chart</p></body></html>";
    expect(mapKeyState(notAMap, { REMOTION_MAPTILER_KEY: "k" })).toBe("none");
    expect(substituteKeys(notAMap, { REMOTION_MAPTILER_KEY: "k" })).toBe(
      notAMap,
    );
  });
});

describe("the hosted-embed credentials", () => {
  it("still resolve when both are present, and refuse when either is missing", () => {
    expect(
      resolveCloudflareCredentials({
        CLOUDFLARE_ACCOUNT_ID: "acc",
        CLOUDFLARE_API_TOKEN: "tok",
      }),
    ).toEqual({ accountId: "acc", apiToken: "tok" });
    expect(
      resolveCloudflareCredentials({ CLOUDFLARE_ACCOUNT_ID: "acc" }),
    ).toBeNull();
    expect(
      resolveCloudflareCredentials({ CLOUDFLARE_API_TOKEN: "tok" }),
    ).toBeNull();
    expect(resolveCloudflareCredentials({})).toBeNull();
  });
});

describe("nothing this skill ships names a credential off the environment", () => {
  it("finds nothing left in its own source", () => {
    expect(credentialReadings(SKILL)).toEqual({
      refused: [],
      outsideTheResolver: [],
    });
  });

  it("refuses the two-name fallback that was here until 2026-08-23", () => {
    const dir = scratchSkill(
      "export const key = env.MAPTILER_DELIVERY_KEY || env.MAPTILER_KEY;\n",
    );
    expect(credentialReadings(dir)).toEqual({
      refused: ["MAPTILER_DELIVERY_KEY", "MAPTILER_KEY"],
      outsideTheResolver: ["MAPTILER_DELIVERY_KEY", "MAPTILER_KEY"],
    });
  });

  it("reads a credential named in prose as prose, never as a read", () => {
    const dir = scratchSkill(
      "// env.MAPTILER_KEY used to be read here, before the resolver existed.\n" +
        'export const key = resolveEnvKey(env, "MAPTILER_KEY");\n',
    );
    expect(credentialReadings(dir)).toEqual({
      refused: [],
      outsideTheResolver: [],
    });
  });

  it("exits 0 on this skill and 1 on a skill that reads one bare", () => {
    const clean = Bun.spawnSync(["bun", COMMAND], { cwd: SKILL });
    expect(`${clean.exitCode}: ${clean.stdout.toString()}`).toBe(
      `0: ${clean.stdout.toString()}`,
    );
    const dirty = Bun.spawnSync([
      "bun",
      COMMAND,
      scratchSkill('const token = process.env.CLOUDFLARE_API_TOKEN ?? "";\n'),
    ]);
    expect(dirty.exitCode).toBe(1);
    expect(dirty.stdout.toString()).toContain("CLOUDFLARE_API_TOKEN");
  });
});

// THE WIRING, CHECKED RATHER THAN ASSERTED. `declarationsWithoutACaller` is the decision that
// refuses a guard a skill DECLARES and nothing it ships ever calls — round six's finding AC1, where
// a rule was distributed to eight skills and called by none four hours after the fix was reported.
// It never asks this skill, because it iterates the eight that DRAW; asking it here is what turns
// "the command calls it" from a sentence in a commit message into something a test reads off the
// files. An import is not a call there and a comment is not a call either, which is the whole point.
describe("the guard this skill declares is reachable from something a person runs", () => {
  it("is not one of this skill's declarations without a caller", async () => {
    const wiring = await import("../../map-web/scripts/detect-guard-wiring.mjs");
    expect(wiring.declarationsWithoutACaller(SKILL)).not.toContain(
      "credentialReadsWithoutAlias",
    );
    const declared = wiring
      .declaredDecisions(SKILL)
      .find(
        (decision: { name: string }) =>
          decision.name === "credentialReadsWithoutAlias",
      );
    expect(declared?.callers).toEqual(["scripts/check-credentials.mjs"]);
  });
});

describe("the resolver this skill carries", () => {
  it("is the same decision splash's is, and answers the same way", () => {
    expect(
      resolveEnvKey(
        { MAPTILER_KEY: "canonical", VITE_MAPTILER_KEY: "alias" },
        "MAPTILER_KEY",
      ),
    ).toBe("canonical");
    expect(resolveEnvKey({ VITE_MAPTILER_KEY: "alias" }, "MAPTILER_KEY")).toBe(
      "alias",
    );
    expect(resolveEnvKey({}, "CLOUDFLARE_API_TOKEN")).toBe("");
  });
});
