import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * A WORKED EXAMPLE'S OWN LOCAL ISO A2 TABLE IS NEVER COPIED FORWARD SILENTLY.
 *
 * The hex-grid, cartogram and contour worked examples each carry their own `const ISO2 = {...}` — a table
 * covering only their OWN subject's countries — copied verbatim by a naive scaffold. A fresh beat with even
 * one country outside that borrowed table failed one missing code at a time (cold run 6, 2026-09-16: GBR,
 * then ALB, discovered serially, never in one message). This proves the scaffold replaces that local table
 * with the shared canonical one (`shared/map-beat/iso-codes.mjs`) and marks the region SCAFFOLD, so it is
 * discoverable rather than silently inherited.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const MAP_SCRIPT = join(
  ROOT,
  "skills",
  "scrolly",
  "scripts",
  "scaffold-scrolly-map-beat.mjs",
);
const STAMP = `${process.pid}-${Date.now().toString(36)}`;
const NAME = `.scaffold-test-scrolly-iso2-${STAMP}`;
const BEAT = join(PROOF, NAME);

const run = (args: string[]) =>
  spawnSync("bun", [MAP_SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });

function removeProbe() {
  if (
    dirname(BEAT) === PROOF &&
    basename(BEAT).startsWith(".scaffold-test-") &&
    existsSync(BEAT)
  )
    rmSync(BEAT, { recursive: true });
}

describe("scaffold-scrolly-map-beat — a copied ISO A2 table is replaced, not silently inherited", () => {
  beforeAll(() => {
    removeProbe();
    mkdirSync(BEAT, { recursive: true });
    writeFileSync(
      join(BEAT, "PALETTE.md"),
      '---\nground: "#16191B"\naccent: "#D4A853"\naccents: "#5B8A8A"\norigin: "newsroom"\n---\n',
    );
    writeFileSync(join(BEAT, "data.csv"), "entity\nFRA\n");
  });
  afterAll(removeProbe);

  it("should swap the worked example's own local ISO2 table for the shared canonical one, marked SCAFFOLD", () => {
    const result = run([
      "--type",
      "hex-grid",
      "--beat",
      `proof/${NAME}`,
      "--component",
      "Iso2Probe",
    ]);
    expect(result.status).toBe(0);

    const plan = readFileSync(join(BEAT, "plan.mjs"), "utf8");
    expect(plan).not.toContain("const ISO2 = {");
    expect(plan).toContain(
      'import { iso2CodesFor, iso2Of } from "#shared/map-beat/iso-codes.mjs"',
    );
    expect(plan).toContain("SCAFFOLD: ISO A2 table");
  });
});
