/**
 * DATA2STORY IS A CREDITED REFERENCE, NEVER A RUNTIME. AGENTS.md, "Product boundary": Splash may
 * adapt Data2Story's ideas, but it must never install, invoke, or depend on Data2Story skills.
 *
 * This replaces a check that README.md still CONTAINED the sentence promising that. A sentence can
 * stay while the promise breaks. What can break it is concrete, so this checks the concrete things,
 * over what a runtime actually receives — the directories `install-set.txt` names, plus the root
 * manifest and lockfile:
 *
 *   1. INSTALL — no manifest declares a Data2Story package, and the lockfile resolves none;
 *   2. PROJECT — Engine projects every directory under `skills/` that holds a SKILL.md, so no such
 *      directory, and no front matter `name:`, may be a Data2Story skill;
 *   3. INVOKE / DEPEND — no shipped file carries a Data2Story IDENTIFIER: the upstream skills are
 *      `data2story` and `data2story-pro`, invoked as `/data2story`, installed from
 *      `QinghongLin/data2story-skill` (upstream README, read 2026-09-29). An import specifier, a
 *      spawned path, a slash command, a clone URL and a skill path all spell it lowercase.
 *      Credit prose spells it `Data2Story` — `storyboard/references/chart-choice.md` does, on
 *      purpose — so rule 3 is case-sensitive, and the credit stays legal.
 *
 * Test directories are not runtime, and this file must name what it forbids, so they are skipped.
 *
 * MUTATIONS RUN (2026-09-29): each reddened this file and was reverted —
 *   - `"data2story-skill": "github:QinghongLin/data2story-skill"` added to root-template/package.json;
 *   - `skills/data2story-pro/SKILL.md` created with `name: data2story-pro`;
 *   - a line `Run /data2story data/<slug> for the draft.` added to storyboard/SKILL.md.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const IDENTIFIER = /data2story/;
const PACKAGE = /data2story/i;

/** The directories a runtime receives, read from the product-boundary file rather than listed. */
const INSTALL_SET = readFileSync(join(ROOT, "install-set.txt"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const SKIP = new Set(["node_modules", ".git", "test"]);
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mov|mp3|wav|pdf|zip|gz|pbf|mbtiles)$/i;

function* shipped(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* shipped(p);
    else if (e.isFile() && !BINARY.test(e.name) && !/\.test\.[cm]?[jt]sx?$/.test(e.name)) yield p;
  }
}

const manifests = (): string[] => [
  join(ROOT, "package.json"),
  ...INSTALL_SET.flatMap((top) => [...shipped(join(ROOT, top))]).filter((p) =>
    p.endsWith("package.json"),
  ),
];

describe("Data2Story stays a reference, never a runtime", () => {
  it("should walk the install set it guards", () => {
    expect(INSTALL_SET).toContain("skills");
    expect(manifests().length).toBeGreaterThanOrEqual(2); // root + root-template
  });

  it("should install no Data2Story package", () => {
    const declared: string[] = [];
    for (const path of manifests()) {
      const pkg = JSON.parse(readFileSync(path, "utf8"));
      for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"])
        for (const [name, spec] of Object.entries<string>(pkg[field] ?? {}))
          if (PACKAGE.test(name) || PACKAGE.test(String(spec)))
            declared.push(`${relative(ROOT, path)} ${field}: ${name}@${spec}`);
    }
    expect(declared).toEqual([]);
    const lock = join(ROOT, "bun.lock");
    if (existsSync(lock)) expect(PACKAGE.test(readFileSync(lock, "utf8"))).toBe(false);
  });

  it("should project no Data2Story skill", () => {
    const projected = readdirSync(join(ROOT, "skills"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(ROOT, "skills", e.name, "SKILL.md")))
      .map((e) => {
        const text = readFileSync(join(ROOT, "skills", e.name, "SKILL.md"), "utf8");
        const name = /^---\r?\n[\s\S]*?^name:\s*(\S+)/m.exec(text)?.[1] ?? "";
        return { dir: e.name, name };
      });
    expect(projected.length).toBeGreaterThan(10);
    expect(projected.filter((s) => PACKAGE.test(s.dir) || PACKAGE.test(s.name))).toEqual([]);
  });

  it("should ship no file that imports, spawns, invokes or paths to Data2Story", () => {
    const reaching: string[] = [];
    for (const top of INSTALL_SET)
      for (const path of shipped(join(ROOT, top))) {
        const lines = readFileSync(path, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (IDENTIFIER.test(line)) reaching.push(`${relative(ROOT, path)}:${i + 1}: ${line.trim()}`);
        });
      }
    expect(reaching).toEqual([]);
  });
});
