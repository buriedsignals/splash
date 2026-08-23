/**
 * THE THIRD SIGHTING, AND THE MECHANISM THAT WOULD HAVE SEEN THE FIRST TWO.
 *
 * `credential-alias-reconciled` was earned by a defect this skill is named in by name: a provider
 * credential read by its canonical env name while the root's own `.env` holds it under the engine's
 * name, so preflight reported a capability open on a real, present token and production refused "no
 * token" one phase later. The rule had been in the catalogue since that day and had never once been
 * asked of `splash`, because the catalogue could only ask the eight skills that DRAW.
 *
 * Asked on 2026-08-23, it found `run-operation.mjs`'s third provider case reading
 * `process.env.CLOUDFLARE_API_TOKEN` between two lines that resolve aliases — the same shape found
 * in `verify-live-map.mjs` and then in the gate that decided whether that probe ran at all, three
 * times in one week.
 *
 * WHAT EACH ASSERTION BELOW WOULD HAVE CAUGHT, and the mutation that reddens it (each run in this
 * file rather than in a shell, so the mechanism is watched refusing rather than assumed to):
 *
 *   1. the sweep over this skill's own source is empty. MUTATION: `SCRATCH` skills below carry a
 *      bare read and are refused; and reverting `run-operation.mjs` to `process.env.CLOUD…` puts
 *      the real skill back in that state, measured before the fix landed.
 *   2. the CATALOGUE'S OWN decision and the sharper local one are BOTH read, because the first one
 *      goes blind in exactly a skill that owns a resolver — its own doc comment says it cannot see
 *      whether a read consults the list, only whether the list is declared. Watched: a scratch skill
 *      that declares `CLOUDFLARE_API_TOKEN_ALIASES = []` and reads the token bare passes the
 *      catalogue's decision and is still refused here.
 *   3. the command exits non-zero on a skill with a bare read. A decision nothing runs has not
 *      landed (round six, AC1).
 *   4. the operation really passes the resolved token to the provider — the behaviour, not the
 *      shape of the source.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  credentialReadings,
  credentialReadsWithoutAlias,
} from "../scripts/verify-credentials.mjs";
import { resolveEnvKey } from "../scripts/keys.mjs";
import { runOperation } from "../scripts/run-operation.mjs";

const SKILL = join(import.meta.dirname, "..");
const COMMAND = join(SKILL, "scripts", "check-credentials.mjs");

/** A throwaway skill directory holding one script, so a refusal is watched on real files on disk
 *  rather than on a string handed straight to the decision. */
function scratchSkill(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "splash-credential-sweep-"));
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts", "some-operation.mjs"), source);
  return dir;
}

const scratches: string[] = [];
afterEach(() => {
  for (const dir of scratches.splice(0))
    rmSync(dir, { recursive: true, force: true });
  delete process.env.CLOUDFLARE_API_TOKEN;
});
function scratch(source: string): string {
  const dir = scratchSkill(source);
  scratches.push(dir);
  return dir;
}

describe("every provider credential splash reads goes through its own alias table", () => {
  it("finds nothing left in this skill's own source", () => {
    expect(credentialReadings(SKILL)).toEqual({
      refused: [],
      outsideTheResolver: [],
    });
  });

  it("refuses the exact read that was here until 2026-08-23", () => {
    const dir = scratch(
      'const probe = probeCloudflare(id, process.env.CLOUDFLARE_API_TOKEN ?? "", fetchFn);\n',
    );
    expect(credentialReadings(dir)).toEqual({
      refused: ["CLOUDFLARE_API_TOKEN"],
      outsideTheResolver: ["CLOUDFLARE_API_TOKEN"],
    });
  });

  // THE BLIND SPOT, WATCHED. The catalogue's decision excuses any canonical read whose
  // `<NAME>_ALIASES` string appears anywhere in the skill — so an EMPTY list declared under that
  // name buys a bare read a pass it has not earned. This is why `keys.mjs` declares only the two
  // alias lists that are not empty, and why the sweep asks a second, stricter question.
  it("is not fooled by an empty alias list declared under the name", () => {
    const dir = scratch(
      "const CLOUDFLARE_API_TOKEN_ALIASES = [];\n" +
        'const token = process.env.CLOUDFLARE_API_TOKEN ?? "";\n',
    );
    expect(
      credentialReadsWithoutAlias(
        `const CLOUDFLARE_API_TOKEN_ALIASES = [];\nprocess.env.CLOUDFLARE_API_TOKEN`,
      ),
    ).toEqual([]);
    expect(credentialReadings(dir).refused).toEqual([]);
    expect(credentialReadings(dir).outsideTheResolver).toEqual([
      "CLOUDFLARE_API_TOKEN",
    ]);
  });

  it("reads a credential named in prose as prose, never as a read", () => {
    const dir = scratch(
      "// process.env.MAPTILER_KEY used to be read here, before the resolver existed.\n" +
        "/* env.DATAWRAPPER_TOKEN is named in this block comment and nowhere else. */\n" +
        'export const key = resolveEnvKey(process.env, "MAPTILER_KEY");\n',
    );
    expect(credentialReadings(dir)).toEqual({
      refused: [],
      outsideTheResolver: [],
    });
  });

  it("never counts a test as the skill's own source", () => {
    const dir = scratch(
      'export const key = resolveEnvKey(process.env, "MAPTILER_KEY");\n',
    );
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(
      join(dir, "test", "a.test.ts"),
      'const built = { CLOUDFLARE_API_TOKEN: "x" };\nconst read = process.env.CLOUDFLARE_API_TOKEN;\n',
    );
    expect(credentialReadings(dir).outsideTheResolver).toEqual([]);
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
    const wiring = await import(
      "../../map-web/scripts/detect-guard-wiring.mjs"
    );
    expect(wiring.declarationsWithoutACaller(SKILL)).not.toContain(
      "credentialReadsWithoutAlias",
    );
    const declared = wiring
      .declaredDecisions(SKILL)
      .find((decision: { name: string }) => decision.name === "credentialReadsWithoutAlias");
    expect(declared?.callers).toEqual(["scripts/check-credentials.mjs"]);
  });
});

describe("the command a person runs", () => {
  it("exits 0 on this skill", () => {
    const run = Bun.spawnSync(["bun", COMMAND], { cwd: SKILL });
    expect(`${run.exitCode}: ${run.stdout.toString()}`).toBe(
      `0: ${run.stdout.toString()}`,
    );
  });

  it("exits 1 and names the credential on a skill that reads one bare", () => {
    const dir = scratch(
      'const token = process.env.CLOUDFLARE_API_TOKEN ?? "";\n',
    );
    const run = Bun.spawnSync(["bun", COMMAND, dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stdout.toString()).toContain("CLOUDFLARE_API_TOKEN");
  });
});

describe("the resolver the reads now go through", () => {
  it("prefers the canonical name and falls back to each alias in order", () => {
    expect(
      resolveEnvKey(
        { MAPTILER_KEY: "canonical", REMOTION_MAPTILER_KEY: "alias" },
        "MAPTILER_KEY",
      ),
    ).toBe("canonical");
    expect(
      resolveEnvKey({ REMOTION_MAPTILER_KEY: "alias" }, "MAPTILER_KEY"),
    ).toBe("alias");
    expect(resolveEnvKey({}, "MAPTILER_KEY")).toBe("");
  });

  it("hands the Cloudflare probe the token the resolver returned", async () => {
    process.env.CLOUDFLARE_API_TOKEN = "a-present-token";
    const seen: string[] = [];
    const fetchFn = async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      seen.push(init.headers.Authorization);
      return { ok: true, status: 200 } as Response;
    };
    await runOperation(
      "provider-check-cloudflare",
      { cloudflareAccountId: "an-account", parameters: {} },
      { fetchFn: fetchFn as unknown as typeof fetch },
    );
    expect(seen).toEqual(["Bearer a-present-token"]);
  });
});
