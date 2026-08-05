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
  lstatSync,
  readlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
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

// ── The delivered tree is a NEW ROOT, and a dozen shipped scripts resolve the install root as
// "N levels above my own directory": skills/splash/scripts/save-key.mjs reads ../../../.env,
// skills/map-native/scripts/produce.mjs reads <skill>/../../.env, lib/newsroom/decor.ts's
// installRoot() is lib/../.. . Packing the skills one level down silently re-pointed every one
// of them at .dist/, where the configurator has written nothing — a Dock-launched session (no
// .env in its environment, which is exactly the case the file fallback exists for) then fails
// with "VITE_MAPTILER_KEY missing", save-key.mjs writes the journalist's secret into a directory
// the next pack deletes, and readDecorState finds no newsroom.json so uiLang falls back to
// English and the CMS endpoint reads empty. The packer links them back.

test("links the install-root files back, so the delivered scripts resolve them unchanged", () => {
  const src = repo();
  const out = join(src, ".dist"); // the shipped layout: $DEST/.dist
  try {
    writeFileSync(join(src, ".env"), 'VITE_MAPTILER_KEY="abc"\n');
    writeFileSync(join(src, "newsroom.json"), '{"uiLang":"fr"}');
    writeFileSync(join(src, "NEWSROOM-PROFILE.md"), "---\nlang: fr\n---\n");
    expect(pack(src, out).exitCode).toBe(0);

    // Each resolution a shipped script really performs, spelled the way it spells it.
    const fromSplashScripts = resolve(
      join(out, "skills", "alpha", "scripts"),
      "../../../.env",
    ); // save-key.mjs:29, preflight.mjs:27, export-code.mjs:77
    const fromSkillRoot = resolve(join(out, "skills", "alpha"), "../../.env"); // map-native/scrolly produce.mjs
    const fromLibNewsroom = resolve(join(out, "lib", "newsroom"), "../.."); // decor.ts installRoot()
    expect(readFileSync(fromSplashScripts, "utf8")).toContain(
      "VITE_MAPTILER_KEY",
    );
    expect(readFileSync(fromSkillRoot, "utf8")).toContain("VITE_MAPTILER_KEY");
    expect(
      JSON.parse(readFileSync(join(fromLibNewsroom, "newsroom.json"), "utf8"))
        .uiLang,
    ).toBe("fr");
    expect(
      readFileSync(join(fromLibNewsroom, "NEWSROOM-PROFILE.md"), "utf8"),
    ).toContain("lang: fr");

    // RELATIVE, so the link survives moving or renaming the whole install directory.
    expect(readlinkSync(join(out, ".env"))).toBe("../.env");
    expect(readlinkSync(join(out, "newsroom.json"))).toBe("../newsroom.json");
  } finally {
    rmSync(src, { recursive: true, force: true });
  }
});

test("the link-backs sit above skills/ — a host's payload is byte-identical with and without them", () => {
  // The claim the whole fix rests on: a host enumerates .dist/skills/<name>/ and only ever
  // DESCENDS from there (lib/host/skill-payload.ts, the measured Goose rule), so a file beside
  // skills/ is unreachable. Proven by measurement, not by reading the walk: pack the same source
  // with and without the install-root files present and compare what a host would be handed.
  const bare = repo();
  const withFiles = repo();
  const outBare = mkdtempSync(join(tmpdir(), "splash-packout-"));
  const outFiles = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    writeFileSync(join(withFiles, ".env"), 'K="v"\n'.repeat(500));
    writeFileSync(join(withFiles, "newsroom.json"), '{"uiLang":"fr"}');
    writeFileSync(join(withFiles, "NEWSROOM-PROFILE.md"), "x".repeat(50_000));
    pack(bare, outBare);
    pack(withFiles, outFiles);

    for (const name of ["alpha", "beta"]) {
      expect(measureSkillPayload(join(outFiles, "skills", name))).toEqual(
        measureSkillPayload(join(outBare, "skills", name)),
      );
    }
  } finally {
    for (const d of [bare, withFiles, outBare, outFiles])
      rmSync(d, { recursive: true, force: true });
  }
});

test("a missing install-root file leaves a link that behaves exactly like an absent file", () => {
  // NEWSROOM-PROFILE.md often does not exist, and a dangling link must not be worse than nothing:
  // every reader tests existsSync or catches ENOENT, and both answer the same for a dangling link
  // as for no link at all. The one asymmetry is deliberate and load-bearing — writeFileSync
  // through a dangling link CREATES the target, which is how save-key.mjs lands the journalist's
  // key in $DEST/.env instead of inside the delivery the next pack deletes.
  const src = repo();
  const out = join(src, ".dist");
  try {
    expect(pack(src, out).exitCode).toBe(0);
    const link = join(out, ".env");
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(existsSync(link)).toBe(false); // follows the link — reads as absent, as it should
    expect(() => readFileSync(link, "utf8")).toThrow();

    writeFileSync(link, 'MAPTILER_KEY="k"\n'); // save-key.mjs's write
    expect(readFileSync(join(src, ".env"), "utf8")).toContain("MAPTILER_KEY");

    // And a re-pack does not follow the link out to destroy what it points at.
    expect(pack(src, out).exitCode).toBe(0);
    expect(existsSync(join(src, ".env"))).toBe(true);
    expect(readFileSync(join(out, ".env"), "utf8")).toContain("MAPTILER_KEY");
  } finally {
    rmSync(src, { recursive: true, force: true });
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
