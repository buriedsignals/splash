import { afterEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OUTSIDE_THE_CATALOGUE,
  TRAITS,
  allSkills,
  cataloguedSkills,
  exclusionProblems,
  provenTraits,
  traitsOf,
} from "../../../scripts/traits.mjs";

const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "splash-traits-"));
  scratch.push(root);
  return root;
}

function writeSkill(root: string, name: string, traits: string[] = []) {
  const dir = join(root, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
  writeFileSync(join(dir, "TRAITS.json"), `${JSON.stringify({ traits }, null, 2)}\n`);
  return dir;
}

describe("the catalogue inventory is derived from shipped skills", () => {
  it("accounts for every SKILL.md directory and ignores directories that do not ship a skill", () => {
    const root = fixtureRoot();
    writeSkill(root, "alpha");
    writeSkill(root, "beta");
    writeSkill(root, "doctrine");
    mkdirSync(join(root, "skills", "scratch"), { recursive: true });

    expect(allSkills({ root })).toEqual(["alpha", "beta", "doctrine"]);
    expect(
      [...cataloguedSkills({ root }), ...Object.keys(OUTSIDE_THE_CATALOGUE)].sort(),
    ).toEqual(allSkills({ root }));
  });

  it("has one explicit exclusion and invalidates it when that skill grows a witnessed mechanism", () => {
    const root = fixtureRoot();
    const doctrine = writeSkill(root, "doctrine");

    expect(Object.keys(OUTSIDE_THE_CATALOGUE)).toEqual(["doctrine"]);
    expect(exclusionProblems({ root })).toEqual([]);

    mkdirSync(join(doctrine, "scripts"));
    writeFileSync(join(doctrine, "scripts", "render-still.mjs"), "export function renderStill() {}\n");

    expect(exclusionProblems({ root })).toEqual([
      { skill: "doctrine", traits: ["materialises-a-beat"] },
    ]);
  });
});

describe("traits are witnessed mechanisms", () => {
  it("does not let guard, detector or verification code satisfy its own trait", () => {
    const root = fixtureRoot();
    const skill = writeSkill(root, "alpha");
    mkdirSync(join(skill, "scripts"));
    writeFileSync(
      join(skill, "scripts", "verify-guards.mjs"),
      'export const GUARDS = ["duplicatedPayload"];\nexport const sample = "data:image/png;base64,guard-only";\n',
    );

    expect(provenTraits("alpha", { root })).not.toContain("inlines-its-assets");

    writeFileSync(
      join(skill, "scripts", "render-web.mjs"),
      'export const image = "data:image/png;base64,delivered";\n',
    );
    expect(provenTraits("alpha", { root })).toContain("inlines-its-assets");
  });

  it("keeps every real declaration equal to the mechanisms its own files prove", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const skill of cataloguedSkills()) {
      expect(existsSync(join(import.meta.dirname, "..", "..", skill, "TRAITS.json"))).toBe(true);
      expect(traitsOf(skill).every((trait) => known.has(trait))).toBe(true);
      expect([...traitsOf(skill)].sort()).toEqual([...provenTraits(skill)].sort());
    }
  });
});
