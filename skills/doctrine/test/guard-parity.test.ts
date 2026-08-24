import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  carriedBy,
  catalogueProblems,
  copiedDecisionDrift,
  exceptedRows,
  owedRows,
  readCatalogue,
  reachable,
  strayRows,
  unstatedRows,
} from "../../../scripts/guards.mjs";
import { TRAITS } from "../../../scripts/traits.mjs";

const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "splash-guards-"));
  scratch.push(root);
  return root;
}

function writeSkill(root: string, name: string) {
  const dir = join(root, "skills", name);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
  return dir;
}

function writeLegacyDeclaration(skill: string, traits: string[]) {
  writeFileSync(
    join(skill, "TRAITS.json"),
    `${JSON.stringify({ traits }, null, 2)}\n`,
  );
}

function writeInlineWitness(skill: string) {
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

function writeDecision(skill: string, name: string, implementation = "") {
  writeFileSync(
    join(skill, "scripts", "verify.mjs"),
    `export const GUARDS = ["${name}"];\n${implementation}`,
  );
}

function rule(id: string, states: Record<string, string> = {}) {
  return {
    id,
    kind: "guard",
    requires: ["inlines-its-assets"],
    decidedBy: `${id.replaceAll("-", "")}Decision`,
    refuses: "a deterministic fixture defect that a consumer would observe",
    earnedBy: "a deterministic fixture regression that established this rule",
    states,
    exceptions: {},
  };
}

describe("rule reachability fails closed", () => {
  it("uses executable mechanism witnesses rather than TRAITS.json declarations", async () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha");
    const beta = writeSkill(root, "beta");
    writeSkill(root, "doctrine");
    writeInlineWitness(alpha);
    writeLegacyDeclaration(beta, ["inlines-its-assets"]);
    const entry = rule("authority", { alpha: "carried" });

    expect(await reachable(entry, { root })).toEqual(["alpha"]);
  });

  it("reports stray, unstated, owed and excepted witnessed cells", async () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha");
    const beta = writeSkill(root, "beta");
    writeSkill(root, "gamma");
    writeSkill(root, "doctrine");
    writeInlineWitness(alpha);
    writeInlineWitness(beta);
    writeLegacyDeclaration(alpha, ["inlines-its-assets"]);
    writeLegacyDeclaration(beta, ["inlines-its-assets"]);

    const stray = rule("stray", {
      alpha: "carried",
      beta: "carried",
      gamma: "carried",
    });
    const unstated = rule("unstated", { alpha: "carried" });
    const owed = rule("owed", { alpha: "carried", beta: "owed" });
    const excepted = {
      ...rule("excepted", { alpha: "carried" }),
      exceptions: { beta: "fixture exception" },
    };
    const catalogue = { rules: [stray, unstated, owed, excepted] };

    expect(await strayRows(catalogue, { root })).toEqual([
      { rule: "stray", skill: "gamma" },
    ]);
    expect(await unstatedRows(catalogue, { root })).toEqual([
      { rule: "unstated", skill: "beta" },
    ]);
    expect(owedRows(catalogue)).toEqual([{ rule: "owed", skill: "beta" }]);
    expect(exceptedRows(catalogue)).toEqual([
      { rule: "excepted", skill: "beta", reason: "fixture exception" },
    ]);
  });

  it("keeps only trait vocabulary required by the bounded catalogue", () => {
    const catalogue = readCatalogue();
    const required = new Set(
      catalogue.rules.flatMap((entry: { requires: string[] }) => entry.requires),
    );

    expect(
      TRAITS.map((trait) => trait.id).filter((trait) => !required.has(trait)),
    ).toEqual([]);
  });

  it("keeps only rules exercised through the maintained artifact-walker entrypoint", () => {
    const catalogue = readCatalogue();

    expect(
      catalogue.rules
        .filter((entry: { walkedBy?: string }) => !entry.walkedBy)
        .map((entry: { id: string }) => entry.id),
    ).toEqual([]);
  });

  it("leaves no unresolved cell in the shipped catalogue", async () => {
    const catalogue = readCatalogue();
    const knownTraits = new Set(TRAITS.map((trait) => trait.id));

    expect(catalogue.rules.length).toBeGreaterThan(0);
    for (const entry of catalogue.rules) {
      expect(entry.requires.length).toBeGreaterThan(0);
      expect(
        entry.requires.every((trait: string) => knownTraits.has(trait)),
      ).toBe(true);
    }
    expect(await strayRows(catalogue)).toEqual([]);
    expect(await unstatedRows(catalogue)).toEqual([]);
    expect(owedRows(catalogue)).toEqual([]);
    expect(exceptedRows(catalogue)).toEqual([]);
  });

  it("makes every reachable craft skill carry the rule's declared decision", async () => {
    const catalogue = readCatalogue();
    for (const entry of catalogue.rules)
      for (const skill of await reachable(entry)) {
        expect(entry.states[skill]).toBe("carried");
        expect(carriedBy(skill)).toContain(entry.decidedBy ?? entry.detectedBy);
      }
  });
});

describe("shared implementations fail closed", () => {
  it("reports a declared decision whose exported implementation is missing", async () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha");
    const beta = writeSkill(root, "beta");
    writeSkill(root, "doctrine");
    for (const skill of [alpha, beta]) {
      writeInlineWitness(skill);
      writeLegacyDeclaration(skill, ["inlines-its-assets"]);
      writeDecision(skill, "sharedDecision");
    }
    const catalogue = {
      rules: [
        {
          ...rule("shared", { alpha: "carried", beta: "carried" }),
          decidedBy: "sharedDecision",
        },
      ],
    };

    const problems = await catalogueProblems(catalogue, { root });
    expect(problems.some((problem: { skill?: string }) => problem.skill === "alpha")).toBe(
      true,
    );
    expect(problems.some((problem: { skill?: string }) => problem.skill === "beta")).toBe(
      true,
    );
  });

  it("reports drift only for a catalogue decision carried by more than one skill", async () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha");
    const beta = writeSkill(root, "beta");
    writeSkill(root, "doctrine");
    writeInlineWitness(alpha);
    writeInlineWitness(beta);
    writeLegacyDeclaration(alpha, ["inlines-its-assets"]);
    writeLegacyDeclaration(beta, ["inlines-its-assets"]);
    const source =
      'const FLOOR = 2;\nexport const GUARDS = ["sharedDecision"];\nexport function sharedDecision(value) { return value >= FLOOR; }\nexport function unrelatedHelper() { return "local"; }\n';
    writeFileSync(join(alpha, "scripts", "verify.mjs"), source);
    writeFileSync(
      join(beta, "scripts", "verify.mjs"),
      source.replace('return "local"', 'return "different"'),
    );
    const catalogue = {
      rules: [
        {
          ...rule("shared", { alpha: "carried", beta: "carried" }),
          decidedBy: "sharedDecision",
        },
      ],
    };

    expect(await copiedDecisionDrift(catalogue, { root })).toEqual([]);

    writeFileSync(
      join(beta, "scripts", "verify.mjs"),
      source.replace("const FLOOR = 2", "const FLOOR = 3"),
    );
    expect(await copiedDecisionDrift(catalogue, { root })).toEqual([
      { rule: "shared", skill: "beta", canonicalSkill: "alpha" },
    ]);
  });

  it("reports drift in effective exported detector tuning", async () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha");
    const beta = writeSkill(root, "beta");
    writeSkill(root, "doctrine");
    writeInlineWitness(alpha);
    writeInlineWitness(beta);
    const detector = (rawLimit: number) =>
      [
        'export const GUARDS = ["weightAgainstCeiling"];',
        "export function weightAgainstCeiling(bytes, ceiling) {",
        "  return { bytes, ceiling, over: bytes > ceiling };",
        "}",
        `export const RAW_LIMIT_BYTES = ${rawLimit};`,
        "export const BASE64_INFLATION = 4 / 3;",
        "export const CEILING_BYTES = Math.ceil(",
        "  RAW_LIMIT_BYTES * BASE64_INFLATION,",
        ");",
        "",
      ].join("\n");
    writeFileSync(join(alpha, "scripts", "verify.mjs"), detector(20));
    writeFileSync(join(beta, "scripts", "verify.mjs"), detector(19));
    const catalogue = {
      rules: [
        {
          ...rule("weight", { alpha: "carried", beta: "carried" }),
          decidedBy: "weightAgainstCeiling",
        },
      ],
    };

    expect(await copiedDecisionDrift(catalogue, { root })).toEqual([
      { rule: "weight", skill: "beta", canonicalSkill: "alpha" },
    ]);
  });

  it("has no drift among the shipped catalogue's deliberate copies", async () => {
    expect(await copiedDecisionDrift(readCatalogue())).toEqual([]);
  });
});

describe("carried capabilities execute over delivered artifacts", () => {
  it("reports a failing artifact and an inert divergent walker", async () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha");
    const beta = writeSkill(root, "beta");
    writeSkill(root, "doctrine");
    for (const skill of [alpha, beta]) {
      writeInlineWitness(skill);
      writeLegacyDeclaration(skill, ["inlines-its-assets"]);
      writeDecision(
        skill,
        "weightAgainstCeiling",
        [
          "export const CEILING_BYTES = 4;",
          "export function weightAgainstCeiling(bytes, ceiling) {",
          "  return { over: bytes > ceiling };",
          "}",
          "",
        ].join("\n"),
      );
      mkdirSync(join(skill, "output-proof"), { recursive: true });
      writeFileSync(join(skill, "output-proof", "failing.png"), "12345");
    }
    const sharedWalker = [
      'import { readFileSync, statSync } from "node:fs";',
      'import { basename, dirname, join, resolve } from "node:path";',
      'import { fileURLToPath } from "node:url";',
      'import { CEILING_BYTES, weightAgainstCeiling } from "./verify.mjs";',
      "const SKILL = basename(resolve(dirname(fileURLToPath(import.meta.url)), '..'));",
      "export function deliveredArtifacts(root) {",
      "  return [join(root, 'skills', SKILL, 'output-proof', 'failing.png')];",
      "}",
      "export function verifyDeliveredArtifacts(root) {",
      "  return deliveredArtifacts(root).flatMap((path) => {",
      "    readFileSync(path);",
      "    return weightAgainstCeiling(statSync(path).size, CEILING_BYTES).over",
      "      ? [`${path}: too large`]",
      "      : [];",
      "  });",
      "}",
      "",
    ].join("\n");
    writeFileSync(
      join(alpha, "scripts", "check-delivered-guards.mjs"),
      sharedWalker,
    );
    writeFileSync(
      join(beta, "scripts", "check-delivered-guards.mjs"),
      sharedWalker.replace(
        /export function verifyDeliveredArtifacts[\s\S]*\n}\n$/,
        [
          "export function verifyDeliveredArtifacts(root) {",
          "  for (const path of deliveredArtifacts(root)) {",
          "    readFileSync(path);",
          "    weightAgainstCeiling(statSync(path).size, CEILING_BYTES);",
          "  }",
          "  return [];",
          "}",
          "",
        ].join("\n"),
      ),
    );
    const catalogue = {
      rules: [
        {
          id: "weight",
          kind: "capability",
          requires: ["inlines-its-assets"],
          detectedBy: "weightAgainstCeiling",
          walkedBy: "scripts/check-delivered-guards.mjs",
          offers: "a bounded delivered artifact",
          earnedBy: "an overweight delivered artifact",
          states: { alpha: "carried", beta: "carried" },
          exceptions: {},
        },
      ],
    };

    const problems = await catalogueProblems(catalogue, { root });
    expect(problems.some((problem: { skill?: string }) => problem.skill === "alpha")).toBe(
      true,
    );
    expect(problems.some((problem: { skill?: string }) => problem.skill === "beta")).toBe(
      true,
    );
  });

  it("executes every shipped capability through the maintained guard check", async () => {
    expect(await catalogueProblems(readCatalogue())).toEqual([]);

    const root = resolve(import.meta.dirname, "..", "..", "..");
    const run = Bun.spawnSync(
      ["bun", "--no-env-file", "run", "guards:check"],
      { cwd: root },
    );
    expect(run.exitCode).toBe(0);
  });
});
