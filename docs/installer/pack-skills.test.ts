import { test, expect } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { measureSkillPayload } from "../../lib/host/skill-payload";

const PACKER = join(import.meta.dir, "../../scripts/pack-skills.mjs");
const REPO = join(import.meta.dir, "../..");

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
    JSON.stringify({
      name: "alpha",
      dependencies: { d3: "7.0.0", typescript: "5.0.0" },
      // Mirrors the real repo: the build tooling a producer shells out to at render time
      // (vite, its plugins, playwright) is filed under devDependencies upstream, not
      // dependencies — see scripts/verify-dist-produce.mjs's finding.
      //
      // typescript ALSO appears in dependencies above at a different version — an INTRA-skill
      // collision fixture (one package.json naming the same package in both maps), distinct
      // from the cross-skill collision the other tests cover.
      devDependencies: { vite: "9.0.0", typescript: "6.0.3" },
    }),
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
  return Bun.spawnSync(["bun", PACKER, src, out], {
    stderr: "pipe",
    stdout: "pipe",
  });
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
    expect(existsSync(join(out, "lib", "core", "registry.test.ts"))).toBe(
      false,
    );
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

test("merges devDependencies too — a produce that shells out to `bunx vite build` needs them resolvable", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    const merged = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    // scripts/verify-dist-produce.mjs proved this the hard way: chart-native's produce.mjs
    // shells out to `bunx vite build`, and vite.config.ts imports @vitejs/plugin-react /
    // vite-plugin-singlefile — all filed as devDependencies upstream. Dropping them at the
    // merge left the delivered tree's `bun install` without vite at all: ERR_MODULE_NOT_FOUND
    // ('vite') on the very first produce. There is no separate "dev install" step for a
    // delivered tree, so the dev/prod distinction cannot survive the merge.
    expect(merged.dependencies.vite).toBe("9.0.0");
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("reports an INTRA-skill version collision the same way it reports a cross-skill one", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    // alpha's own package.json names "typescript" in both dependencies (5.0.0) AND
    // devDependencies (6.0.3) — the merge loop's `{...deps, ...devDeps}` spread resolves this
    // by spread order (devDeps wins) BEFORE the cross-skill dedupe two lines below ever sees
    // it, so the cross-skill note alone can't catch it. Both the chosen version and the
    // report are asserted here.
    const r = pack(src, out);
    const merged = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    expect(merged.dependencies.typescript).toBe("6.0.3");

    const stderr = r.stderr.toString();
    expect(stderr).toContain("typescript");
    expect(stderr).toContain("pinned twice within alpha's package.json");
    expect(stderr).toContain("5.0.0");
    expect(stderr).toContain("6.0.3");
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

test(".dist is gitignored — a delivery that can be committed stops being derived", () => {
  const gitignore = readFileSync(
    join(import.meta.dir, "../../.gitignore"),
    "utf8",
  );
  const ignoresDist = gitignore
    .split("\n")
    .some((line) => line.trim() === ".dist" || line.trim() === ".dist/");
  expect(ignoresDist).toBe(true);
});

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
      for (const banned of [
        "node_modules",
        "dist",
        "tests",
        "output-proof",
        "coverage",
      ]) {
        expect({ skill: name, has: existsSync(join(dir, banned)) }).toEqual({
          skill: name,
          has: false,
        });
      }
      // And the budgets hold on the DELIVERED tree, not only on the source-with-exclusions.
      const p = measureSkillPayload(dir);
      if (p.files > 400 || p.chars > 160_000)
        throw new Error(
          `${name}: delivered ${p.files} files / ${p.chars} chars — over budget`,
        );
    }

    // The merged manifest is above the skills, where no host walks.
    expect(existsSync(join(out, "package.json"))).toBe(true);
    expect(statSync(join(out, "lib")).isDirectory()).toBe(true);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
