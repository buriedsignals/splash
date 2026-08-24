import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { decisionImplementation } from "../../../scripts/guard-runtime.mjs";
import { readCatalogue } from "../../../scripts/guards.mjs";
import { allSkills } from "../../../scripts/traits.mjs";
import { verifyDeliveredArtifacts } from "../../image-beat/scripts/check-delivered-guards.mjs";

const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixtureDir(label: string) {
  const root = mkdtempSync(join(tmpdir(), `splash-${label}-`));
  scratch.push(root);
  return root;
}

function writeMarker(path: string) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, '<img src="data:image/png;base64,AQID">');
}

function reportedProblems(result: unknown) {
  expect(result && typeof result === "object" && "problems" in result).toBe(true);
  if (!result || typeof result !== "object" || !("problems" in result))
    return [];
  expect(Array.isArray(result.problems)).toBe(true);
  return Array.isArray(result.problems)
    ? result.problems.filter((problem) => typeof problem === "string")
    : [];
}

describe("guard roots stay inside the canonical project", () => {
  it("rejects a symlinked skills discovery root", () => {
    const root = fixtureDir("project");
    const outside = fixtureDir("outside-skills");
    mkdirSync(join(outside, "alpha"), { recursive: true });
    writeFileSync(join(outside, "alpha", "SKILL.md"), "# alpha\n");
    symlinkSync(outside, join(root, "skills"));

    expect(() => allSkills({ root })).toThrow();
  });

  it("rejects an external SKILL.md read target", () => {
    const root = fixtureDir("skill-read-target");
    const outside = fixtureDir("outside-skill-target");
    const alpha = join(root, "skills", "alpha");
    mkdirSync(alpha, { recursive: true });
    writeFileSync(join(outside, "SKILL.md"), "# external\n");
    symlinkSync(join(outside, "SKILL.md"), join(alpha, "SKILL.md"));

    expect(() => allSkills({ root })).toThrow();
  });

  it("rejects an external scripts import target", async () => {
    const root = fixtureDir("script-target");
    const outside = fixtureDir("outside-script-target");
    const alpha = join(root, "skills", "alpha");
    mkdirSync(alpha, { recursive: true });
    writeFileSync(join(alpha, "SKILL.md"), "# alpha\n");
    mkdirSync(join(outside, "scripts"), { recursive: true });
    writeFileSync(
      join(outside, "scripts", "verify.mjs"),
      'export const GUARDS = ["fixtureDecision"];\nexport function fixtureDecision() { return true; }\n',
    );
    symlinkSync(join(outside, "scripts"), join(alpha, "scripts"));

    expect(
      (await decisionImplementation("alpha", "fixtureDecision", { root })).problem,
    ).toBeDefined();
  });

  it("rejects an external catalogue read target", () => {
    const root = fixtureDir("catalogue-target");
    const outside = fixtureDir("outside-catalogue-target");
    const references = join(root, "skills", "doctrine", "references");
    mkdirSync(references, { recursive: true });
    writeFileSync(join(outside, "catalogue.json"), '{"rules":[]}\n');
    symlinkSync(
      join(outside, "catalogue.json"),
      join(references, "guard-catalogue.json"),
    );

    expect(() => readCatalogue({ root })).toThrow();
  });

  it("rejects a symlinked delivered-artifact starting root", () => {
    const root = fixtureDir("artifact-project");
    const outside = fixtureDir("outside-artifacts");
    writeMarker(join(outside, "external.html"));
    symlinkSync(outside, join(root, "proof"));

    expect(
      reportedProblems(verifyDeliveredArtifacts(root)).some((problem) =>
        /symlink|outside|contained/i.test(problem),
      ),
    ).toBe(true);
  });
});

