import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { catalogueProblems } from "../../../scripts/guards.mjs";

const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "splash-walker-contract-"));
  scratch.push(root);
  const doctrine = join(root, "skills", "doctrine");
  mkdirSync(doctrine, { recursive: true });
  writeFileSync(join(doctrine, "SKILL.md"), "# doctrine\n");
  return root;
}

function writeCarryingSkill(root: string, name: string) {
  const skill = join(root, "skills", name);
  mkdirSync(join(skill, "scripts"), { recursive: true });
  mkdirSync(join(skill, "output-proof"), { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), `# ${name}\n`);
  writeFileSync(
    join(skill, "scripts", "trait-witness.mjs"),
    'export function witnessInlinedAssets() { return ["data:image/png;base64,AQID"]; }\n',
  );
  writeFileSync(
    join(skill, "scripts", "verify.mjs"),
    [
      'export const GUARDS = ["weightAgainstCeiling"];',
      "export const CEILING_BYTES = 4;",
      "export function weightAgainstCeiling(bytes, ceiling) {",
      "  return { bytes, ceiling, over: bytes > ceiling };",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(join(skill, "output-proof", "artifact.png"), "12345");
  return skill;
}

function capabilityCatalogue(skills: string[]) {
  return {
    rules: [
      {
        id: "weight-has-a-ceiling",
        kind: "capability",
        requires: ["inlines-its-assets"],
        detectedBy: "weightAgainstCeiling",
        walkedBy: "scripts/check-delivered-guards.mjs",
        offers: "bounded fixture artifacts",
        earnedBy: "an overweight fixture artifact",
        states: Object.fromEntries(skills.map((skill) => [skill, "carried"])),
        exceptions: {},
      },
    ],
  };
}

describe("the walker result binds evidence to its declared detector", () => {
  it("rejects byte-identical walkers that report an inert empty success", async () => {
    const root = fixtureRoot();
    const inertWalker =
      "export function verifyDeliveredArtifacts() { return []; }\n";
    for (const name of ["alpha", "beta"]) {
      const skill = writeCarryingSkill(root, name);
      writeFileSync(
        join(skill, "scripts", "check-delivered-guards.mjs"),
        inertWalker,
      );
    }

    const problems = await catalogueProblems(
      capabilityCatalogue(["alpha", "beta"]),
      { root },
    );
    expect(problems.map((problem: { skill?: string }) => problem.skill)).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("rejects inspected-artifact evidence disconnected from the declared detector", async () => {
    const root = fixtureRoot();
    const skill = writeCarryingSkill(root, "alpha");
    writeFileSync(
      join(skill, "scripts", "check-delivered-guards.mjs"),
      [
        'import { readFileSync } from "node:fs";',
        'import { join } from "node:path";',
        "export function verifyDeliveredArtifacts(root) {",
        "  const path = join(root, 'skills', 'alpha', 'output-proof', 'artifact.png');",
        "  readFileSync(path);",
        "  return { inspectedArtifacts: [path], problems: [] };",
        "}",
        "",
      ].join("\n"),
    );

    const problems = await catalogueProblems(capabilityCatalogue(["alpha"]), {
      root,
    });
    expect(
      problems.some(
        (problem: { problem?: string }) =>
          problem.problem?.includes("weightAgainstCeiling") === true,
      ),
    ).toBe(true);
  });

  it("propagates a connected walker's reported problem", async () => {
    const root = fixtureRoot();
    const skill = writeCarryingSkill(root, "alpha");
    writeFileSync(
      join(skill, "scripts", "check-delivered-guards.mjs"),
      [
        'import { statSync } from "node:fs";',
        'import { join } from "node:path";',
        "export function verifyDeliveredArtifacts(root, detector) {",
        "  const path = join(root, 'skills', 'alpha', 'output-proof', 'artifact.png');",
        "  detector(statSync(path).size, 4);",
        "  return {",
        "    inspectedArtifacts: [path],",
        "    problems: ['fixture detector problem'],",
        "  };",
        "}",
        "",
      ].join("\n"),
    );

    const problems = await catalogueProblems(capabilityCatalogue(["alpha"]), {
      root,
    });
    expect(
      problems.some(
        (problem: { problem?: string }) =>
          problem.problem === "fixture detector problem",
      ),
    ).toBe(true);
  });
});
