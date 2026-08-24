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
  copiedDecisionDrift,
  exceptedRows,
  owedRows,
  readCatalogue,
  reachable,
  strayRows,
  unstatedRows,
  walkedByProblems,
} from "../../../scripts/guards.mjs";
import { TRAITS, cataloguedSkills } from "../../../scripts/traits.mjs";

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

function writeSkill(root: string, name: string, traits: string[]) {
  const dir = join(root, "skills", name);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `# ${name}\n`);
  writeFileSync(join(dir, "TRAITS.json"), `${JSON.stringify({ traits }, null, 2)}\n`);
  return dir;
}

function rule(id: string, requires: string[], states: Record<string, string> = {}) {
  return {
    id,
    kind: "guard",
    requires,
    decidedBy: `${id.replaceAll("-", "")}Decision`,
    refuses: "a deterministic fixture defect that a consumer would observe",
    earnedBy: "a deterministic fixture regression that established this rule",
    states,
    exceptions: {},
  };
}

describe("rule reachability fails closed", () => {
  it("derives reachability from traits and reports stray, unstated, owed and excepted cells", () => {
    const root = fixtureRoot();
    writeSkill(root, "alpha", ["materialises-a-beat"]);
    writeSkill(root, "beta", ["materialises-a-beat"]);
    writeSkill(root, "gamma", []);

    const stray = rule("stray", ["materialises-a-beat"], {
      alpha: "carried",
      beta: "carried",
      gamma: "carried",
    });
    const unstated = rule("unstated", ["materialises-a-beat"], {
      alpha: "carried",
    });
    const owed = rule("owed", ["materialises-a-beat"], {
      alpha: "carried",
      beta: "owed",
    });
    const excepted = {
      ...rule("excepted", ["materialises-a-beat"], { alpha: "carried" }),
      exceptions: { beta: "fixture exception" },
    };
    const catalogue = { rules: [stray, unstated, owed, excepted] };

    expect(reachable(stray, { root })).toEqual(["alpha", "beta"]);
    expect(strayRows(catalogue, { root })).toEqual([
      { rule: "stray", skill: "gamma" },
    ]);
    expect(unstatedRows(catalogue, { root })).toEqual([
      { rule: "unstated", skill: "beta" },
    ]);
    expect(owedRows(catalogue)).toEqual([{ rule: "owed", skill: "beta" }]);
    expect(exceptedRows(catalogue)).toEqual([
      { rule: "excepted", skill: "beta", reason: "fixture exception" },
    ]);
  });

  it("leaves no unresolved cell in the shipped catalogue", () => {
    const catalogue = readCatalogue();
    const knownTraits = new Set(TRAITS.map((trait) => trait.id));

    expect(catalogue.rules.length).toBeGreaterThan(0);
    for (const entry of catalogue.rules) {
      expect(entry.requires.length).toBeGreaterThan(0);
      expect(entry.requires.every((trait: string) => knownTraits.has(trait))).toBe(true);
    }
    expect(strayRows(catalogue)).toEqual([]);
    expect(unstatedRows(catalogue)).toEqual([]);
    expect(owedRows(catalogue)).toEqual([]);
    expect(exceptedRows(catalogue)).toEqual([]);
  });

  it("makes every reachable craft skill carry the rule's declared decision", () => {
    const catalogue = readCatalogue();
    for (const entry of catalogue.rules)
      for (const skill of reachable(entry)) {
        expect(entry.states[skill]).toBe("carried");
        expect(carriedBy(skill)).toContain(entry.decidedBy ?? entry.detectedBy);
      }
  });
});

describe("shared decisions are deliberate parity copies", () => {
  it("reports drift only for a catalogue decision carried by more than one skill", () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha", ["materialises-a-beat"]);
    const beta = writeSkill(root, "beta", ["materialises-a-beat"]);
    const source =
      'const FLOOR = 2;\nexport const GUARDS = ["sharedDecision"];\nexport function sharedDecision(value) { return value >= FLOOR; }\nexport function unrelatedHelper() { return "local"; }\n';
    writeFileSync(join(alpha, "scripts", "verify.mjs"), source);
    writeFileSync(join(beta, "scripts", "verify.mjs"), source.replace('return "local"', 'return "different"'));
    const catalogue = {
      rules: [
        {
          ...rule("shared", ["materialises-a-beat"], {
            alpha: "carried",
            beta: "carried",
          }),
          decidedBy: "sharedDecision",
        },
      ],
    };

    expect(copiedDecisionDrift(catalogue, { root })).toEqual([]);

    writeFileSync(
      join(beta, "scripts", "verify.mjs"),
      source.replace("const FLOOR = 2", "const FLOOR = 3"),
    );
    expect(copiedDecisionDrift(catalogue, { root })).toEqual([
      { rule: "shared", skill: "beta", canonicalSkill: "alpha" },
    ]);
  });

  it("has no drift among the shipped catalogue's deliberate copies", () => {
    expect(copiedDecisionDrift(readCatalogue())).toEqual([]);
  });
});

describe("carried capabilities are walked over delivered artifacts", () => {
  it("rejects a detector that is only named in GUARDS and accepts a delivered-artifact walk", () => {
    const root = fixtureRoot();
    const alpha = writeSkill(root, "alpha", ["ships-standalone-html"]);
    writeFileSync(
      join(alpha, "scripts", "verify.mjs"),
      'export const GUARDS = ["tableCarriesMarks"];\nexport function tableCarriesMarks(html) { return html.includes("<table"); }\n',
    );
    const capability = {
      id: "same-facts",
      kind: "capability",
      requires: ["ships-standalone-html"],
      detectedBy: "tableCarriesMarks",
      walkedBy: "test/delivered-pages.test.ts",
      offers: "the same facts to a reader who cannot see the graphic",
      earnedBy: "a delivered page whose graphic had no equivalent text",
      states: { alpha: "carried" },
      exceptions: {},
    };
    const catalogue = { rules: [capability] };

    expect(walkedByProblems(catalogue, { root })).toEqual([
      { rule: "same-facts", skill: "alpha" },
    ]);

    mkdirSync(join(alpha, "test"));
    writeFileSync(
      join(alpha, "test", "delivered-pages.test.ts"),
      'import { readFileSync } from "node:fs";\nimport { deliveredArtifacts } from "../scripts/delivered-artifacts.mjs";\nimport { tableCarriesMarks } from "../scripts/verify.mjs";\nfor (const artifact of deliveredArtifacts(ROOT)) tableCarriesMarks(readFileSync(artifact, "utf8"));\n',
    );
    expect(walkedByProblems(catalogue, { root })).toEqual([]);
  });

  it("walks every shipped capability it declares", () => {
    expect(walkedByProblems(readCatalogue())).toEqual([]);
  });
});

describe("the generated guard view", () => {
  it("matches the authoritative catalogue and trait inventory", () => {
    const root = resolve(import.meta.dirname, "..", "..", "..");
    const run = Bun.spawnSync(["bun", "scripts/guards.mjs", "--check"], {
      cwd: root,
    });
    const output = new TextDecoder().decode(run.exitCode === 0 ? run.stdout : run.stderr).trim();

    expect(`${run.exitCode}: ${output}`).toBe("0: GUARDS.md matches the catalogue");
    expect(cataloguedSkills().length).toBeGreaterThan(0);
  });
});
