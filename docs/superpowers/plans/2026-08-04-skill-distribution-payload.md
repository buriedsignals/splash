# Skill Distribution Payload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop handing a host a 3 GB engine checkout — ship it a packaged skill tree small enough that `SKILL.md` actually enters the model's context.

**Architecture:** A packer writes `$DEST/.dist/` at install time (never committed): `lib/` and `skills/*/` at the same layout, minus `node_modules/`, `dist/`, `tests/`, `*.test.ts`, `output-proof/`, `coverage/`, plus one merged `bun install` at `.dist/node_modules` — one level ABOVE the linked skill directories, so Bun resolves it and the host never enumerates it. `link_agents_skills` is pointed at `.dist/skills/*/`. Two mechanical budgets and one real-render proof keep it honest.

**Tech Stack:** Bun, `bun:test`, plain `node:fs`, bash (`install/bootstrap.sh`).

**Spec:** `docs/superpowers/specs/2026-08-04-skill-distribution-payload-design.md`
**Measurements it rests on:** `docs/splash/skill-payload-2026-08-04.md`

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first.
- Code, comments, identifiers, commit messages: **English**. No vendor attribution anywhere.
- **Every guard must be mutation-verified**: break the code, watch the test redden, restore. Confirm by checksum that the mutation LANDED before believing its result.
- **`git checkout -- <file>` restores to HEAD, not to your pre-mutation state.** On a file carrying uncommitted work it erases that work; on an untracked file it fails and leaves the mutation in place. Use `cp` backups, and commit before mutating.
- **Never stage `output-proof/*.png`.** Running a producer rewrites them; `git checkout -- skills/<engine>/output-proof/` before committing.
- A fresh worktree has no `.env` and no `node_modules`: `ln -s ../splash-merge/.env .env`, and symlink `node_modules` from `splash-merge` rather than reinstalling.
- The exclusion set is defined **once**, in `lib/host/skill-payload.ts`, and imported by both the packer and the budgets. Two copies would drift.

---

### Task 1: The payload simulator

The instrument every later task measures with. The one used for the E10 numbers was throwaway and never committed.

**Files:**
- Create: `lib/host/skill-payload.ts`
- Test: `lib/host/skill-payload.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `EXCLUDED_NAMES: ReadonlySet<string>` — `node_modules`, `dist`, `tests`, `output-proof`, `coverage`
  - `isExcludedEntry(name: string, isDirectory: boolean): boolean`
  - `type SkillPayload = { files: number; chars: number }`
  - `measureSkillPayload(skillDir: string, opts?: { applyExclusions?: boolean }): SkillPayload`

- [ ] **Step 1: Write the failing test**

Create `lib/host/skill-payload.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  measureSkillPayload,
  isExcludedEntry,
  EXCLUDED_NAMES,
} from "./skill-payload";

/** A throwaway skill tree. Returns its root. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "splash-payload-"));
  const skill = join(root, "alpha");
  mkdirSync(join(skill, "src"), { recursive: true });
  mkdirSync(join(skill, "tests"), { recursive: true });
  mkdirSync(join(skill, "node_modules", "leftpad"), { recursive: true });
  mkdirSync(join(skill, "output-proof"), { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), "---\nname: alpha\n---\n0123456789");
  writeFileSync(join(skill, "src", "a.ts"), "export {};");
  writeFileSync(join(skill, "src", "a.test.ts"), "// a test");
  writeFileSync(join(skill, "tests", "big.ts"), "// a test");
  writeFileSync(join(skill, "node_modules", "leftpad", "index.js"), "//");
  writeFileSync(join(skill, "output-proof", "shot.png"), "PNG");
  return root;
}

describe("measureSkillPayload — what a host is actually handed", () => {
  it("counts every file when nothing is excluded, the way the host walks", () => {
    const root = fixture();
    try {
      const p = measureSkillPayload(join(root, "alpha"));
      // SKILL.md, src/a.ts, src/a.test.ts, tests/big.ts,
      // node_modules/leftpad/index.js, output-proof/shot.png
      expect(p.files).toBe(6);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("drops the excluded subtrees when asked, which is what the packer will ship", () => {
    const root = fixture();
    try {
      const p = measureSkillPayload(join(root, "alpha"), { applyExclusions: true });
      // Only SKILL.md and src/a.ts survive: tests/, node_modules/, output-proof/
      // are excluded directories, and a.test.ts is an excluded file.
      expect(p.files).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("counts the prose AND the offer lines — the enumeration is the half nobody counted", () => {
    const root = fixture();
    try {
      const p = measureSkillPayload(join(root, "alpha"), { applyExclusions: true });
      // SKILL.md body is 32 chars; the two offer lines are "SKILL.md\n" (9) and
      // "src/a.ts\n" (9). Prose alone would be 32.
      expect(p.chars).toBe(32 + 9 + 9);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("FOLLOWS symlinks, because the host does and `find` does not", () => {
    const root = fixture();
    try {
      const outside = join(root, "outside");
      mkdirSync(outside, { recursive: true });
      writeFileSync(join(outside, "smuggled.js"), "//");
      symlinkSync(outside, join(root, "alpha", "linked"));
      const p = measureSkillPayload(join(root, "alpha"));
      expect(p.files).toBe(7); // the six above plus the smuggled one
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stops at a subtree that carries its own SKILL.md — the host treats it as another skill", () => {
    const root = fixture();
    try {
      const nested = join(root, "alpha", "nested");
      mkdirSync(nested, { recursive: true });
      writeFileSync(join(nested, "SKILL.md"), "---\nname: nested\n---\n");
      writeFileSync(join(nested, "extra.ts"), "export {};");
      const p = measureSkillPayload(join(root, "alpha"));
      expect(p.files).toBe(6); // unchanged: the nested subtree is not ours to offer
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("names the excluded entries once, so the packer and the budgets cannot drift", () => {
    expect([...EXCLUDED_NAMES].sort()).toEqual([
      "coverage",
      "dist",
      "node_modules",
      "output-proof",
      "tests",
    ]);
    expect(isExcludedEntry("node_modules", true)).toBe(true);
    expect(isExcludedEntry("chart.test.ts", false)).toBe(true);
    expect(isExcludedEntry("chart.ts", false)).toBe(false);
    // A FILE named like an excluded directory is not excluded — the rule is about trees.
    expect(isExcludedEntry("dist", false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test host/skill-payload.test.ts`
Expected: FAIL — `Cannot find module './skill-payload'`.

- [ ] **Step 3: Write the simulator**

Create `lib/host/skill-payload.ts`:

```ts
// What a host is actually handed when it loads a skill.
//
// Measured on Goose 1.45 (crates/goose/src/skills/mod.rs:456-466) and validated against three
// payloads a model really received (docs/splash/skill-payload-2026-08-04.md §1.4: offer counts
// exact, sizes within 1.5%). The upstream rule has NO filter — not extension, not size, not
// depth. It skips only VCS directories and any subtree carrying its own SKILL.md, and it
// FOLLOWS symlinks, which is precisely how node_modules entered a tree `find` reported as clean.
import { readdirSync, readFileSync, statSync, existsSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";

/** Directory names the packaged skill must not carry. Defined ONCE — the packer copies by the
 *  same rule the budgets measure by, so the delivered tree and the guarded tree cannot diverge. */
export const EXCLUDED_NAMES: ReadonlySet<string> = new Set([
  "node_modules",
  "dist",
  "tests",
  "output-proof",
  "coverage",
]);

const VCS = new Set([".git", ".hg", ".svn"]);

/** The exclusion rule. Directories are matched by name; files only by the `.test.ts` suffix —
 *  a FILE called `dist` is a file, not a build tree. */
export function isExcludedEntry(name: string, isDirectory: boolean): boolean {
  if (isDirectory) return EXCLUDED_NAMES.has(name);
  return name.endsWith(".test.ts");
}

export type SkillPayload = { files: number; chars: number };

/**
 * `files` — how many paths the host would offer.
 * `chars` — the prose plus one offer line per path, which is the shape of the response that
 * overflows the host's 200 000-character spill threshold.
 */
export function measureSkillPayload(
  skillDir: string,
  opts: { applyExclusions?: boolean } = {},
): SkillPayload {
  const apply = opts.applyExclusions === true;
  const offers: string[] = [];
  const seen = new Set<string>();

  const walk = (dir: string): void => {
    // Symlinks are followed, so a cycle is reachable. Key on the real path.
    let real: string;
    try {
      real = realpathSync(dir);
    } catch {
      return;
    }
    if (seen.has(real)) return;
    seen.add(real);

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = entry.name;
      const full = join(dir, name);
      let isDir: boolean;
      try {
        isDir = statSync(full).isDirectory(); // stat, not lstat: follow the link
      } catch {
        continue; // a dead link offers nothing
      }
      if (isDir) {
        if (VCS.has(name)) continue;
        if (apply && isExcludedEntry(name, true)) continue;
        // A subtree with its own SKILL.md is another skill, not part of this offer.
        if (existsSync(join(full, "SKILL.md"))) continue;
        walk(full);
      } else {
        if (apply && isExcludedEntry(name, false)) continue;
        offers.push(relative(skillDir, full));
      }
    }
  };

  walk(skillDir);

  const skillMd = join(skillDir, "SKILL.md");
  const prose = existsSync(skillMd) ? readFileSync(skillMd, "utf8").length : 0;
  const enumeration = offers.reduce((n, p) => n + p.length + 1, 0);
  return { files: offers.length, chars: prose + enumeration };
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `cd lib && bun test host/skill-payload.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Calibrate against the real measurement, and pin it**

The simulator is only worth trusting if it reproduces the numbers the E10 document validated
against payloads a model really received. Append to `lib/host/skill-payload.test.ts`:

```ts
import { existsSync as fileExists } from "node:fs";

describe("calibration — the simulator against the measured payloads", () => {
  const splash = join(import.meta.dir, "../../skills/splash");

  it("reproduces the packaged size of splash, the skill that sets the budget", () => {
    if (!fileExists(splash)) return; // not a source checkout; nothing to calibrate against
    const p = measureSkillPayload(splash, { applyExclusions: true });
    // 144 757 characters measured on 2026-08-04 (skill-payload-2026-08-04.md §5.3). A 25%
    // band absorbs prose edits without letting a rewrite of the walker pass unnoticed.
    expect(p.chars).toBeGreaterThan(144_757 * 0.75);
    expect(p.chars).toBeLessThan(144_757 * 1.25);
  });
});
```

Run: `cd lib && bun test host/skill-payload.test.ts`
Expected: PASS, 7 tests. **If the calibration fails, the walker is wrong — fix the walker, never the band.**

- [ ] **Step 6: Commit**

```bash
git add lib/host/skill-payload.ts lib/host/skill-payload.test.ts
git commit -m "feat(host): measure what a host is actually handed when it loads a skill"
```

- [ ] **Step 7: Mutation-verify**

```bash
cp lib/host/skill-payload.ts /tmp/sp.bak
before=$(shasum lib/host/skill-payload.ts | cut -d' ' -f1)
# M1: stop following symlinks
sed -i '' 's/statSync(full).isDirectory()/entry.isDirectory()/' lib/host/skill-payload.ts
[ "$(shasum lib/host/skill-payload.ts | cut -d' ' -f1)" != "$before" ] || echo "MUTATION DID NOT LAND"
(cd lib && bun test host/skill-payload.test.ts)   # expect the symlink test to redden
cp /tmp/sp.bak lib/host/skill-payload.ts
[ "$(shasum lib/host/skill-payload.ts | cut -d' ' -f1)" = "$before" ] || echo "RESTORE FAILED"
```

Repeat with **M2** (drop the nested-`SKILL.md` skip) and **M3** (count only prose, dropping
`enumeration` from the return). Each must redden a named test. Restore and re-run: 7 pass.

---

### Task 2: The two budgets, in the gate

**Files:**
- Create: `lib/host/skill-payload-budget.test.ts`

**Interfaces:**
- Consumes: `measureSkillPayload` from Task 1.
- Produces: nothing importable — this is a guard.

- [ ] **Step 1: Write the test**

Create `lib/host/skill-payload-budget.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { measureSkillPayload } from "./skill-payload";

// Two ceilings, guarding two different things on purpose.
//
// FILE_BUDGET is what the packer controls. After packaging the worst skill is chart-native at
// 275 files, so 400 leaves 45% of room in an engine that grows a directory per chart type.
//
// CHAR_BUDGET is the guard against the failure itself: Goose spills a tool response over
// 200 000 characters into a temp file, and SKILL.md then never enters the model's context
// (measured, and observed happening — skill-payload-2026-08-04.md §3). 160 000 is 80% of it.
//
// splash sits at 144 757 and passes with only 10% of room. That is deliberate and must NOT be
// exempted: its weight is no longer enumeration (1 905 tokens) but PROSE (33 693 tokens), so
// this ceiling is the only sensor the repo has on SKILL.md growth. When it reddens, the answer
// is to split SKILL.md by phase — not to raise the number.
const FILE_BUDGET = 400;
const CHAR_BUDGET = 160_000;

const SKILLS = join(import.meta.dir, "../../skills");

const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SKILLS, e.name, "SKILL.md")))
  .map((e) => e.name)
  .sort();

describe("what we would deliver stays inside its budget", () => {
  it("has skills to measure at all", () => {
    expect(skillDirs.length).toBeGreaterThan(5);
  });

  for (const name of skillDirs) {
    it(`${name} stays under ${FILE_BUDGET} files and ${CHAR_BUDGET} characters`, () => {
      const p = measureSkillPayload(join(SKILLS, name), { applyExclusions: true });
      // A skill that offers nothing has not been measured — it has been mislocated.
      expect(p.files).toBeGreaterThan(0);
      if (p.files > FILE_BUDGET)
        throw new Error(
          `${name}: ${p.files} files offered, budget ${FILE_BUDGET}. Something heavy joined the skill — exclude it in EXCLUDED_NAMES or move it out of the skill directory.`,
        );
      if (p.chars > CHAR_BUDGET)
        throw new Error(
          `${name}: ${p.chars} characters, budget ${CHAR_BUDGET} (80% of the host's 200 000 spill threshold). If the excess is prose, split SKILL.md by phase; raising this number re-opens the failure it exists to catch.`,
        );
    });
  }
});
```

- [ ] **Step 2: Run and read the result**

Run: `cd lib && bun test host/skill-payload-budget.test.ts`
Expected: PASS for every skill. **If `splash` fails here, stop and report the number** — that
means prose has grown past the ceiling and the decision belongs to Rémy, not to this plan.

- [ ] **Step 3: Commit**

```bash
git add lib/host/skill-payload-budget.test.ts
git commit -m "test(host): a skill that would overflow a host's context fails the gate"
```

- [ ] **Step 4: Mutation-verify**

Temporarily set `CHAR_BUDGET = 100_000` (checksum before/after to confirm it landed): `splash`
must redden and name its number. Restore, confirm green.

---

### Task 3: The packer

**Files:**
- Create: `scripts/pack-skills.mjs`
- Modify: `package.json` (add the `pack-skills` script)
- Test: `docs/installer/pack-skills.test.ts`

**Interfaces:**
- Consumes: `EXCLUDED_NAMES` / `isExcludedEntry` from Task 1.
- Produces: a CLI — `bun scripts/pack-skills.mjs <repoRoot> <outDir>` — and the on-disk contract
  `<outDir>/{package.json, lib/, skills/<name>/}`.

- [ ] **Step 1: Write the failing test**

Create `docs/installer/pack-skills.test.ts`:

```ts
import { test, expect } from "bun:test";
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PACKER = join(import.meta.dir, "../../scripts/pack-skills.mjs");

/** A miniature repo: two skills, one library directory, one non-skill directory. */
function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "splash-packsrc-"));
  mkdirSync(join(root, "lib", "core"), { recursive: true });
  writeFileSync(join(root, "lib", "core", "registry.ts"), "export {};");
  writeFileSync(join(root, "lib", "core", "registry.test.ts"), "// test");

  const alpha = join(root, "skills", "alpha");
  mkdirSync(join(alpha, "src"), { recursive: true });
  mkdirSync(join(alpha, "tests"), { recursive: true });
  mkdirSync(join(alpha, "node_modules", "dep"), { recursive: true });
  mkdirSync(join(alpha, "output-proof"), { recursive: true });
  writeFileSync(join(alpha, "SKILL.md"), "---\nname: alpha\n---\n");
  writeFileSync(join(alpha, "src", "a.ts"), "export {};");
  writeFileSync(join(alpha, "src", "a.test.ts"), "// test");
  writeFileSync(join(alpha, "tests", "t.ts"), "// test");
  writeFileSync(join(alpha, "node_modules", "dep", "i.js"), "//");
  writeFileSync(join(alpha, "output-proof", "p.png"), "PNG");
  writeFileSync(
    join(alpha, "package.json"),
    JSON.stringify({ name: "alpha", dependencies: { d3: "7.0.0" } }),
  );

  // A directory under skills/ that is NOT a skill: no SKILL.md. E9's rule.
  const libOnly = join(root, "skills", "library-only");
  mkdirSync(libOnly, { recursive: true });
  writeFileSync(join(libOnly, "index.ts"), "export {};");

  const beta = join(root, "skills", "beta");
  mkdirSync(beta, { recursive: true });
  writeFileSync(join(beta, "SKILL.md"), "---\nname: beta\n---\n");
  writeFileSync(
    join(beta, "package.json"),
    JSON.stringify({ name: "beta", dependencies: { remotion: "4.0.0" } }),
  );
  return root;
}

function pack(src: string, out: string) {
  return Bun.spawnSync(["bun", PACKER, src, out], { stderr: "pipe", stdout: "pipe" });
}

test("packs only directories that carry a SKILL.md", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    expect(pack(src, out).exitCode).toBe(0);
    expect(existsSync(join(out, "skills", "alpha", "SKILL.md"))).toBe(true);
    expect(existsSync(join(out, "skills", "beta", "SKILL.md"))).toBe(true);
    expect(existsSync(join(out, "skills", "library-only"))).toBe(false);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("leaves out every excluded tree — that is the whole point of the step", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    const a = join(out, "skills", "alpha");
    expect(existsSync(join(a, "src", "a.ts"))).toBe(true);
    expect(existsSync(join(a, "node_modules"))).toBe(false);
    expect(existsSync(join(a, "tests"))).toBe(false);
    expect(existsSync(join(a, "output-proof"))).toBe(false);
    expect(existsSync(join(a, "src", "a.test.ts"))).toBe(false);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("copies lib/ so the engines' cross-imports still resolve", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    // skills/*/src imports ../../../lib/core/registry — without lib/ the delivered tree is dead.
    expect(existsSync(join(out, "lib", "core", "registry.ts"))).toBe(true);
    expect(existsSync(join(out, "lib", "core", "registry.test.ts"))).toBe(false);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("writes ONE merged package.json at the root, above the skills", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    const merged = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    // Above skills/, so `bun install` here is resolvable from every engine and enumerated by
    // no host: the host only ever walks .dist/skills/<name>/.
    expect(merged.dependencies.d3).toBe("7.0.0");
    expect(merged.dependencies.remotion).toBe("4.0.0");
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("is idempotent — a file deleted from the source disappears from the delivery", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    const stale = join(out, "skills", "alpha", "src", "gone.ts");
    writeFileSync(stale, "// left over from a previous pack");
    pack(src, out);
    // Merging over a previous run makes the delivery an accumulation rather than a derivation.
    expect(existsSync(stale)).toBe(false);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun test docs/installer/pack-skills.test.ts`
Expected: FAIL — the packer does not exist, every test non-zero exit.

- [ ] **Step 3: Write the packer**

Create `scripts/pack-skills.mjs`:

```js
#!/usr/bin/env bun
// Materialise what a host receives, which is NOT what we develop.
//
// The repo is the engine: 20 640 files for map-native, 12 191 for chart-native, and a host
// enumerates every one of them (it filters nothing and follows symlinks). load_skill(splash)
// then returns 292 487 characters, over the host's 200 000 spill threshold, and SKILL.md never
// enters the model's context — measured, and observed happening (docs/splash/skill-payload-2026-08-04.md).
//
// This writes <outDir>: lib/ and skills/<name>/ at the SAME layout (the engines import each
// other — ../../../lib/core/registry, ../../dw-chart/src/chart-spec — so the layout is what
// makes them resolve), minus the excluded trees, plus ONE merged package.json at the root.
// Dependencies then install to <outDir>/node_modules, one level ABOVE the linked skill
// directories: resolvable by Bun, invisible to a host that only walks .dist/skills/<name>/.
import {
  readdirSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync, statSync,
} from "node:fs";
import { join } from "node:path";
import { EXCLUDED_NAMES, isExcludedEntry } from "../lib/host/skill-payload.ts";

const [repoRoot, outDir] = process.argv.slice(2);
if (!repoRoot || !outDir) {
  console.error("usage: pack-skills.mjs <repoRoot> <outDir>");
  process.exit(1);
}

/** Copy a tree, dropping the excluded entries. Symlinks are RESOLVED into real files: a link
 *  is exactly how node_modules smuggled itself into a tree that looked clean. */
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const name = entry.name;
    if (name === ".git" || name === ".hg" || name === ".svn") continue;
    const src = join(from, name);
    const dst = join(to, name);
    let isDir;
    try {
      // stat, not the dirent: a symlinked directory must be walked and copied as real files,
      // exactly as the simulator decides it (lib/host/skill-payload.ts).
      isDir = statSync(src).isDirectory();
    } catch {
      continue; // a dead link copies nothing
    }
    if (isDir) {
      if (isExcludedEntry(name, true)) continue;
      copyTree(src, dst);
    } else {
      if (isExcludedEntry(name, false)) continue;
      copyFileSync(src, dst);
    }
  }
}

// Idempotent: a stale delivery is worse than none, because it stops being derived.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

copyTree(join(repoRoot, "lib"), join(outDir, "lib"));

const skillsRoot = join(repoRoot, "skills");
const merged = {};
let packed = 0;
for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const src = join(skillsRoot, entry.name);
  // E9's rule, applied here too: a directory with no SKILL.md is not a skill.
  if (!existsSync(join(src, "SKILL.md"))) continue;
  copyTree(src, join(outDir, "skills", entry.name));
  packed++;
  const pkgPath = join(src, "package.json");
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  for (const [dep, version] of Object.entries(pkg.dependencies ?? {})) {
    if (merged[dep] && merged[dep] !== version)
      console.error(`note: ${dep} pinned twice (${merged[dep]} vs ${version}); keeping ${merged[dep]}`);
    merged[dep] ??= version;
  }
}

writeFileSync(
  join(outDir, "package.json"),
  `${JSON.stringify({ name: "splash-delivered", private: true, dependencies: merged }, null, 2)}\n`,
);

console.log(`packed ${packed} skills into ${outDir}`);
```

**Note for the implementer:** the `isDir` line above is deliberately conservative about symlinked
directories and is the one piece here written without a measurement behind it. Replace it with the
simplest thing that passes the tests — `statSync(src).isDirectory()` inside a `try` is likely right,
and matches how the simulator in Task 1 decides. Keep the behaviour (follow the link, copy real
files); do not keep this expression if a simpler one works.

- [ ] **Step 4: Add the script entry**

In `package.json`, inside `"scripts"`, after `"check"`:

```json
    "pack-skills": "bun scripts/pack-skills.mjs . .dist",
```

- [ ] **Step 5: Run and watch it pass**

Run: `bun test docs/installer/pack-skills.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/pack-skills.mjs docs/installer/pack-skills.test.ts package.json
git commit -m "feat(install): pack what a host receives, separately from the engine"
```

- [ ] **Step 7: Mutation-verify**

Three mutations, each with a checksum check that it landed, each restored from a `cp` backup:
**M1** drop the `SKILL.md` guard (the library-only test reddens) · **M2** drop the `rmSync` of the
out dir (the idempotence test reddens) · **M3** skip copying `lib/` (the cross-import test reddens).

---

### Task 4: Hygiene on a real pack

The tests above run on a fixture. This one runs on the actual repository, which is the only place
the excluded trees are big enough to matter.

**Files:**
- Modify: `docs/installer/pack-skills.test.ts` (append)

**Interfaces:**
- Consumes: the packer CLI from Task 3, `measureSkillPayload` from Task 1.

- [ ] **Step 1: Write the test**

Append to `docs/installer/pack-skills.test.ts`:

```ts
import { readdirSync, statSync } from "node:fs";
import { measureSkillPayload } from "../../lib/host/skill-payload";

const REPO = join(import.meta.dir, "../..");

test("packing the real repository carries no excluded tree and no engine dependency", () => {
  const out = mkdtempSync(join(tmpdir(), "splash-realpack-"));
  try {
    const r = pack(REPO, out);
    expect(r.stderr.toString()).not.toContain("Error");
    expect(r.exitCode).toBe(0);

    const skills = readdirSync(join(out, "skills"));
    expect(skills.length).toBeGreaterThan(5);

    for (const name of skills) {
      const dir = join(out, "skills", name);
      for (const banned of ["node_modules", "dist", "tests", "output-proof", "coverage"]) {
        expect({ skill: name, has: existsSync(join(dir, banned)) }).toEqual({
          skill: name,
          has: false,
        });
      }
      // And the budgets hold on the DELIVERED tree, not only on the source-with-exclusions.
      const p = measureSkillPayload(dir);
      if (p.files > 400 || p.chars > 160_000)
        throw new Error(`${name}: delivered ${p.files} files / ${p.chars} chars — over budget`);
    }

    // The merged manifest is above the skills, where no host walks.
    expect(existsSync(join(out, "package.json"))).toBe(true);
    expect(statSync(join(out, "lib")).isDirectory()).toBe(true);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run it**

Run: `bun test docs/installer/pack-skills.test.ts`
Expected: PASS, 6 tests. If it is slow (it copies the source tree), that is acceptable — it runs
once per gate. If it exceeds 60 s, report the number rather than silently narrowing the test.

- [ ] **Step 3: Commit**

```bash
git add docs/installer/pack-skills.test.ts
git commit -m "test(install): the delivered tree carries none of the engine's weight"
```

---

### Task 5: Wire the installer

**Files:**
- Modify: `install/bootstrap.sh` (the `link_agents_skills` root, and step 6)
- Modify: `docs/installer/bootstrap-sh.test.ts` (append)

**Interfaces:**
- Consumes: `bun run pack-skills` from Task 3.
- Produces: `$DEST/.dist/` at install time; `~/.agents/skills/<skill>` → `$DEST/.dist/skills/<skill>`.

- [ ] **Step 1: Write the failing test**

Append to `docs/installer/bootstrap-sh.test.ts`:

```ts
test("the installer links the DELIVERED tree, not the engine checkout", () => {
  // Pointing the helper at $DEST/skills would ship a host the whole engine — the failure this
  // whole chantier exists to close. Asserted on the shipped text because the surrounding steps
  // (download, bun install) cannot run in a test.
  expect(sh).toContain(".dist/skills");
  expect(sh).toContain("pack-skills");
  // The merged install replaces the per-engine one: a journalist must not install twice.
  expect(sh).not.toMatch(/for skill in "\$\{NATIVE_SKILLS\[@\]\}"/);
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun test docs/installer/bootstrap-sh.test.ts`
Expected: FAIL — three assertions, none satisfied yet.

- [ ] **Step 3: Change the helper's root**

In `install/bootstrap.sh`, in `link_agents_skills`, replace the source glob:

```bash
  for skill_dir in "$DEST"/.dist/skills/*/; do
```

(The `[ -f "$skill_dir/SKILL.md" ] || continue` line stays: the packer already applies that rule,
and a helper that trusts its input is a helper that stops guarding.)

- [ ] **Step 4: Replace step 6 with the packaging step**

In `install/bootstrap.sh`, replace the whole `# 6. Producer deps…` block — the
`for skill in "${NATIVE_SKILLS[@]}"` loop — with:

```bash
# 6. Package what a host receives, then install its dependencies ONCE.
# The repo is the engine (20 640 files for map-native alone) and a host enumerates all of it,
# filters nothing and follows symlinks — load_skill then overflows and SKILL.md never reaches
# the model. The delivered tree drops node_modules/dist/tests/output-proof, and its dependencies
# install ABOVE the skill directories, where Bun resolves them and no host walks.
echo "-> Packaging the skills…"
if ! ( cd "$DEST" && bun run pack-skills ); then
  echo "Packaging failed (see the error above) — re-run this installer." >&2
  exit 1
fi
echo "-> Installing render dependencies…"
if ! ( cd "$DEST/.dist" && bun install >/dev/null ); then
  echo "Dependency install failed in the packaged skills (see the error above) — check your connection, then re-run this installer." >&2
  exit 1
fi
```

Keep the Playwright block that follows, but point it at the delivered tree:

```bash
if ! ( cd "$DEST/.dist/skills/chart-native" && bunx playwright install chromium ); then
```

**Ordering note:** `runtime_install` (step 5) calls `link_agents_skills`, so packaging must happen
**before** step 5. Move the new step 6 block above the `. "$runtime_module"` line and renumber the
comments so the file still reads in order.

- [ ] **Step 5: Run and watch it pass**

Run: `bun test docs/installer/`
Expected: PASS. `NATIVE_SKILLS` may now be unused — if nothing references it, delete the array and
say so in the commit; a constant no one reads is a claim no one checks.

- [ ] **Step 6: Commit**

```bash
git add install/bootstrap.sh docs/installer/bootstrap-sh.test.ts
git commit -m "feat(install): link the packaged skills, and install their deps once above them"
```

- [ ] **Step 7: Mutation-verify**

Point the glob back at `"$DEST"/skills/*/` (checksum before/after), confirm the new test reddens,
restore, confirm green.

---

### Task 6: The proof — a real visual out of the delivered tree

Opt-in, like `skills/splash/scripts/verify-source-bundle.mjs`: it renders for real and needs
network, so it is deliberately **not** in `bun run check`.

**Files:**
- Create: `scripts/verify-dist-produce.mjs`
- Modify: `docs/installer/claude-desktop-findings.md` (append a section recording the run)

- [ ] **Step 1: Write the verifier**

Create `scripts/verify-dist-produce.mjs`:

```js
#!/usr/bin/env bun
// Does the DELIVERED tree actually produce? Packaging is only correct if a visual comes out of
// .dist/ — on this project only the delivered artifact settles anything.
//
// Not in the gate: it packs, installs and renders for real. Run it by hand when the packer,
// the exclusion list or an engine's dependencies change.
//
//   bun scripts/verify-dist-produce.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const repo = process.cwd();
const dist = mkdtempSync(join(tmpdir(), "splash-dist-"));
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: process.env });

console.log("-> packing");
run("bun", [join(repo, "scripts/pack-skills.mjs"), repo, dist], repo);

console.log("-> installing the merged dependencies");
run("bun", ["install"], dist);

// The cheapest engine that renders a real file: a chart-native static PNG needs no network key.
// The CLI takes <type> <config> <outDir> <format> — the type comes FIRST (produce.mjs:68-73).
const out = mkdtempSync(join(tmpdir(), "splash-distout-"));
const config = join(dist, "skills/chart-native/assets/sample-data/bars.json");
console.log("-> producing from the delivered tree");
run(
  "bun",
  [join(dist, "skills/chart-native/scripts/produce.mjs"), "bars", config, out, "static"],
  dist,
);

const png = join(out, "static.png");
if (!existsSync(png) || statSync(png).size < 5_000)
  throw new Error(`no usable PNG at ${png} — the delivered tree cannot produce`);
console.log(`OK — ${png} (${statSync(png).size} bytes) produced from ${dist}`);
```

- [ ] **Step 2: Run it, and let it answer the two open questions**

Run: `bun scripts/verify-dist-produce.mjs`

The spec leaves two questions to this run rather than to reasoning:
1. does the per-engine `package.json` left in `.dist/skills/<engine>/` disturb resolution from
   `.dist/node_modules`? If it does, make the packer drop or rewrite it — and add a test.
2. is `map-native/remotion/` enough to render video from the delivered tree? If the static path
   passes but video does not, extend this script with a `video` produce and fix the packer.

Both the config (`bars.json`) and the four-argument CLI shape were checked against the shipped
engine while writing this plan; if a produce fails, read the error rather than swapping the fixture.

- [ ] **Step 3: Record what the run showed**

Append a short section to `docs/installer/claude-desktop-findings.md` — what was produced, from
which tree, and the answers to the two questions. State plainly whatever failed.

- [ ] **Step 4: Commit**

```bash
git checkout -- skills/*/output-proof/ 2>/dev/null || true
git add scripts/verify-dist-produce.mjs docs/installer/claude-desktop-findings.md
git commit -m "test(install): prove a visual comes out of the delivered tree"
```

---

### Task 7: Non-regression on discovery, and close the backlog

**Files:**
- Modify: `docs/splash/backlog-2026-08-03.md` (E10, B6, and § 0)
- Modify: `CLAUDE.md` (a line in the state section)

- [ ] **Step 1: Measure discovery against the delivered tree**

With an isolated `HOME`, so the machine's real `~/.agents/skills` is never rewritten:

```bash
H=$(mktemp -d); DEST=$(pwd)
bun run pack-skills
bash -c "set -euo pipefail; HOME='$H'; DEST='$DEST'
$(sed -n '/^link_agents_skills() {/,/^}/p' install/bootstrap.sh)
link_agents_skills"
echo "linked: $(ls "$H/.agents/skills" | wc -l)"
HOME="$H" ~/.local/bin/goose skills list
```

Expected: **12 linked, 12 discovered**, and — this is the new part — **no `playwright-cli` and no
`playwright-trace`**, because they entered through `dw-chart/node_modules` and that tree is no
longer delivered. That closes B6.

If the count is not 12/12, stop: something in the packer drops a skill, and the budgets cannot
see that.

- [ ] **Step 2: Write the numbers into the backlog**

In `docs/splash/backlog-2026-08-03.md`: mark **E10** closed with the before/after payload figures
and the two budgets that now guard it; mark **B6** closed with the parasite count measured in
step 1; update the § 0 bullet that still describes the parasites as present.

- [ ] **Step 3: Add one line to `CLAUDE.md`**

Say what changed for anyone resuming: a host now receives `.dist/`, built at install, and the
budgets in `lib/host/skill-payload-budget.test.ts` are what keep it that way.

- [ ] **Step 4: Run the full gate on a calm machine**

Run: `bun run check`

**Check first that no other session is running a gate** (`pgrep -f "bun scripts/check.mjs"`): two
concurrent gates invalidate each other, and the failures they produce are Playwright and live-API
timeouts that look like regressions. Attribute any failure by re-running that suite in isolation
before believing it.

- [ ] **Step 5: Commit**

```bash
git add docs/splash/backlog-2026-08-03.md CLAUDE.md
git commit -m "docs: E10 and B6 closed — a host receives the delivery, not the engine"
```
