import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OUTSIDE_THE_CATALOGUE,
  allSkills,
  cataloguedSkills,
  exclusionProblems,
  provenTraits,
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

function writeSkill(root: string, name: string) {
  const dir = join(root, "skills", name);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
  return dir;
}

function writeInertWitness(skill: string) {
  writeFileSync(
    join(skill, "scripts", "trait-witness.mjs"),
    "export function witnessInlinedAssets() { return []; }\n",
  );
}

function writeConsumedInlineWitness(skill: string) {
  writeFileSync(
    join(skill, "scripts", "render-web.mjs"),
    [
      "export function renderInlineAsset(bytes) {",
      '  return `<img src="data:image/png;base64,${Buffer.from(bytes).toString("base64")}">`;',
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(skill, "scripts", "trait-witness.mjs"),
    [
      'import { renderInlineAsset } from "./render-web.mjs";',
      "export function witnessInlinedAssets() {",
      "  return [renderInlineAsset(Uint8Array.of(1, 2, 3))];",
      "}",
      "",
    ].join("\n"),
  );
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

  it("has one explicit exclusion and invalidates it when that skill gains a witnessed mechanism", async () => {
    const root = fixtureRoot();
    const doctrine = writeSkill(root, "doctrine");

    expect(Object.keys(OUTSIDE_THE_CATALOGUE)).toEqual(["doctrine"]);
    expect(await exclusionProblems({ root })).toEqual([]);

    writeConsumedInlineWitness(doctrine);

    expect(await exclusionProblems({ root })).toEqual([
      { skill: "doctrine", traits: ["inlines-its-assets"] },
    ]);
  });
});

describe("traits are witnessed mechanisms", () => {
  it("ignores data-URI text in comments and dead literals", async () => {
    const root = fixtureRoot();
    const skill = writeSkill(root, "alpha");
    writeFileSync(
      join(skill, "scripts", "render-web.mjs"),
      [
        "// data:image/png;base64,comment-only",
        'const unused = "data:image/png;base64,dead-literal";',
        "export function render() { return '<p>no inline asset</p>'; }",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(skill, "scripts", "trait-witness.mjs"),
      [
        "/* data:image/png;base64,witness-comment */",
        'const unused = "data:image/png;base64,witness-dead-literal";',
        "export function witnessInlinedAssets() { return []; }",
        "",
      ].join("\n"),
    );

    expect(await provenTraits("alpha", { root })).not.toContain(
      "inlines-its-assets",
    );
  });

  it("ignores verify, detect, guard and check-guard role sources independently", async () => {
    const root = fixtureRoot();
    const skill = writeSkill(root, "alpha");
    writeInertWitness(skill);

    for (const filename of [
      "verify-policy.mjs",
      "detect-inline.mjs",
      "guard-policy.mjs",
      "check-delivered-guards.mjs",
    ]) {
      const path = join(skill, "scripts", filename);
      writeFileSync(
        path,
        'export const sample = "data:image/png;base64,guard-only";\n',
      );
      expect(await provenTraits("alpha", { root })).not.toContain(
        "inlines-its-assets",
      );
      rmSync(path);
    }
  });

  it("ignores guard code hidden under an ordinary production filename", async () => {
    const root = fixtureRoot();
    const skill = writeSkill(root, "alpha");
    writeInertWitness(skill);
    writeFileSync(
      join(skill, "scripts", "render-web.mjs"),
      [
        'export const GUARDS = ["duplicatedPayload"];',
        "export function duplicatedPayload(source) {",
        "  return /data:image\\/png;base64,/.test(source);",
        "}",
        "",
      ].join("\n"),
    );

    expect(await provenTraits("alpha", { root })).not.toContain(
      "inlines-its-assets",
    );
  });

  it("accepts evidence consumed through the executable production witness", async () => {
    const root = fixtureRoot();
    const skill = writeSkill(root, "alpha");
    writeConsumedInlineWitness(skill);

    expect(await provenTraits("alpha", { root })).toContain(
      "inlines-its-assets",
    );
  });
});
