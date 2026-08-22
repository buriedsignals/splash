/**
 * A DEFAULT THAT IS NOT THERE IS WORSE THAN NO DEFAULT.
 *
 * `scripts/bake-plate.mjs` defaulted `--shapes` to `/tmp/map-twin/ne50.geojson` — a path NO script
 * in this tree writes, and nothing in this toolchain acquires country geography at all. The bake
 * therefore failed at the wrong moment (after resolving the Splash root, reading the journalist's
 * MapTiler key and, on a machine with a key, after launching Chrome) with the wrong message: a bare
 * `ENOENT: no such file or directory, open '/tmp/map-twin/ne50.geojson'`, which reads like a broken
 * install rather than like "you have not acquired the geography yet, here is how".
 *
 * Natural Earth is ~20 MB of public-domain GeoJSON and has no business being committed to a skill,
 * so the acquisition is NOT made real here. What is made real is the refusal: the bake states what
 * is missing, what to run to get it, and which flag to point at the result — and it states it BEFORE
 * it spends a key or a browser on a run that cannot finish.
 *
 * Driven as a SUBPROCESS on purpose: importing the bake runs it.
 */
import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SKILL = resolve(import.meta.dirname, "..");
const BAKE = join(SKILL, "scripts/bake-plate.mjs");
const ABSENT = "/tmp/map-twin/a-geography-nobody-acquired.geojson";

const run = (args: string[]) =>
  spawnSync("bun", [BAKE, ...args], {
    cwd: resolve(SKILL, "..", ".."),
    encoding: "utf8",
    timeout: 60000,
  });

describe("the bake's own geography", () => {
  it("no longer offers a default path no script in this tree writes", () => {
    const source = readFileSync(BAKE, "utf8");
    // The dead default, as it stood: `flag("--shapes", "/tmp/map-twin/ne50.geojson")`.
    expect(/flag\("--shapes",\s*"\/tmp\//.test(source)).toBe(false);
  });

  it("refuses a --shapes file that is not there, naming the file, the acquisition and the flag", () => {
    expect(existsSync(ABSENT)).toBe(false);
    const { status, stderr } = run(["--shapes", ABSENT]);
    expect(status).not.toBe(0);
    const said = String(stderr);
    expect(said).toContain(ABSENT);
    // What to run — the acquisition the skill documents, in the message itself.
    expect(said).toContain("ne_50m_admin_0_countries.geojson");
    expect(said).toContain("curl");
    // …and where to point it once it is on disk.
    expect(said).toContain("--shapes");
    // NOT an ENOENT from `readFile`: that is the wrong message at the wrong moment.
    expect(said).not.toContain("ENOENT");
  });

  it("refuses with no --shapes at all, rather than reaching for a path nobody wrote", () => {
    const { status, stderr } = run([]);
    expect(status).not.toBe(0);
    expect(String(stderr)).toContain("--shapes");
  });

  it("refuses BEFORE it reads a key or launches a browser", () => {
    // ORDERING, MEASURED RATHER THAN ASSUMED. Point the bake at an `.env` that is not there TOO:
    // whichever refusal comes first is the one that speaks. If the geography check ran after the
    // key read — where the `readFile(shapesPath)` that used to carry this failure sat — the message
    // would be about the missing `.env`, and the journalist would go hunting for a key they do have.
    const noEnv = "/tmp/map-twin/no-env-here";
    expect(existsSync(noEnv)).toBe(false);
    const { status, stderr } = run(["--shapes", ABSENT, "--env", noEnv]);
    expect(status).not.toBe(0);
    const said = String(stderr);
    expect(said).toContain(ABSENT);
    expect(said).not.toContain(noEnv);
    expect(said).not.toContain("MAPTILER_KEY");
    expect(said).not.toContain("Chrome");
  });
});
