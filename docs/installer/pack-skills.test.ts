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
  symlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { measureSkillPayload } from "../../lib/host/skill-payload";
import {
  migratedDecorState,
  needsDecorMigration,
} from "../../lib/newsroom/migrate-decor";

const PACKER = join(import.meta.dir, "../../scripts/pack-skills.mjs");
const REPO = join(import.meta.dir, "../..");

/** A miniature repo: two skills, one library directory, one non-skill directory. */
function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "splash-packsrc-"));
  mkdirSync(join(root, "lib", "core"), { recursive: true });
  // lib/ imports packages NO skill declares — zod (lib/newsroom/state.ts + 17 modules), fflate
  // (lib/delivery/adapters/zip.ts), @noble/hashes (lib/loop/deliver.ts) — and they are declared
  // only in the ROOT package.json.
  writeFileSync(
    join(root, "lib", "core", "registry.ts"),
    'import { z } from "zod";\nexport { z };\n',
  );
  writeFileSync(join(root, "lib", "core", "registry.test.ts"), "// test");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "splash",
      dependencies: { zod: "4.4.3" },
      // playwright is ALSO pinned by a skill below, at a different version: the skill's pin wins,
      // because the renderers are what native-browser.test.ts keeps in step.
      devDependencies: { playwright: "1.0.0", "@types/node": "26.1.1" },
    }),
  );

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
      devDependencies: {
        vite: "9.0.0",
        typescript: "6.0.3",
        playwright: "1.61.1",
      },
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

test("merges the ROOT manifest too — lib/ is delivered and its packages are declared nowhere else", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    const merged = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    // lib/ ships in the delivery and imports zod / fflate / @noble/hashes, all declared ONLY in
    // the root package.json — which the packer did not read. It worked in the shipped layout only
    // because .dist sits inside $DEST and inherits $DEST/node_modules: an accident of nesting, not
    // a property of the delivery. Merging the root manifest is what makes the tree relocatable.
    expect(merged.dependencies.zod).toBe("4.4.3");
    expect(merged.dependencies["@types/node"]).toBe("26.1.1");
    // A skill's pin still wins over the root's — the renderers own the version that has to agree.
    expect(merged.dependencies.playwright).toBe("1.61.1");
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

test("the legacy migration still fires from inside the delivery", () => {
  // The narrow path of the same defect. lib/newsroom/migrate-decor.ts reads `.splash-runtime` and
  // `.splash-preflight.json` at installRoot() — which the delivery re-points at .dist, where they
  // never exist. A pre-newsroom.json install that re-runs the installer with an existing .env
  // SKIPS the configurator (install/bootstrap.sh:70), so newsroom.json is never written and the
  // migration is the only thing that recovers its runtime, its interface language and its green
  // preflight stamps. Asserted through the production functions, from the delivered tree's own
  // installRoot(), not through a re-implementation of the path.
  const src = repo();
  const out = join(src, ".dist");
  try {
    writeFileSync(join(src, ".splash-runtime"), "goose\n");
    writeFileSync(
      join(src, ".splash-preflight.json"),
      JSON.stringify({
        engines: {
          "chart-native": {
            status: "green",
            checkedAt: "2026-07-01T00:00:00Z",
          },
        },
      }),
    );
    writeFileSync(join(src, "NEWSROOM-PROFILE.md"), "---\nlang: fr\n---\n");
    expect(pack(src, out).exitCode).toBe(0);

    // decor.ts's installRoot() is `lib/../..` — inside the delivery, this is the delivery.
    const installRoot = resolve(join(out, "lib", "newsroom"), "../..");
    expect(needsDecorMigration(installRoot)).toBe(true);
    const state = migratedDecorState(installRoot, {});
    expect(state.runtime).toBe("goose"); // not the default
    expect(state.uiLang).toBe("fr"); // not the English fallback
    expect(state.capabilities["chart-native"]?.lastVerified?.at).toBe(
      "2026-07-01T00:00:00Z",
    ); // the green stamp survived
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

// ── A failed re-run must not destroy a working install ──
//
// bootstrap.sh runs the packer on EVERY re-run, and the packer used to delete .dist before
// rebuilding it. A pack that then failed — flaky wifi, full disk, exactly what the surrounding
// guards exist for — left ~/.agents/skills/* pointing at an empty directory and the host
// discovering nothing. Before this step existed, a failed re-run left the install working.

/** A source tree the packer CANNOT pack: skills but no lib/ to copy. */
function brokenRepo(): string {
  const root = repo();
  rmSync(join(root, "lib"), { recursive: true, force: true });
  return root;
}

test("a pack that fails leaves the previous delivery untouched", () => {
  const good = repo();
  const bad = brokenRepo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    expect(pack(good, out).exitCode).toBe(0);
    const before = readdirSync(join(out, "skills")).sort();

    expect(pack(bad, out).exitCode).not.toBe(0);

    // Still the previous delivery, complete — not an empty directory a host discovers nothing in.
    expect(readdirSync(join(out, "skills")).sort()).toEqual(before);
    expect(existsSync(join(out, "skills", "alpha", "SKILL.md"))).toBe(true);
    expect(existsSync(join(out, "lib", "core", "registry.ts"))).toBe(true);
    expect(existsSync(join(out, "package.json"))).toBe(true);
  } finally {
    for (const d of [good, bad, out])
      rmSync(d, { recursive: true, force: true });
  }
});

test("a pack leaves no staging or retired sibling behind, on success or on failure", () => {
  const good = repo();
  const bad = brokenRepo();
  const work = mkdtempSync(join(tmpdir(), "splash-packwork-"));
  const out = join(work, ".dist");
  try {
    expect(pack(good, out).exitCode).toBe(0);
    expect(readdirSync(work)).toEqual([".dist"]);
    expect(pack(bad, out).exitCode).not.toBe(0);
    expect(readdirSync(work)).toEqual([".dist"]);
  } finally {
    for (const d of [good, bad, work])
      rmSync(d, { recursive: true, force: true });
  }
});

test("carries the previous delivery's node_modules across the re-pack", () => {
  // The other half of the same failure: bootstrap.sh runs `bun install` at .dist AFTER the pack,
  // and a failure THERE would otherwise leave a freshly packed tree with no dependencies at all —
  // which cannot render. Keeping the previous install means a failed re-run degrades to "the old
  // dependencies" rather than to "none".
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    mkdirSync(join(out, "node_modules", "d3"), { recursive: true });
    writeFileSync(join(out, "node_modules", "d3", "index.js"), "//");
    pack(src, out);
    expect(existsSync(join(out, "node_modules", "d3", "index.js"))).toBe(true);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("carries each packaged skill's own Remotion browser cache across the re-pack", () => {
  // `bunx remotion browser ensure` (install/bootstrap.sh, once per video engine, AFTER pack-skills
  // runs) writes ~93 MB into <skill>/node_modules/.remotion — NOT the hoisted node_modules the
  // test above covers, because Remotion's own cache algorithm walks up from ITS cwd to the nearest
  // package.json, which is the skill directory itself (docs/installer/
  // remotion-cache-measurement.md). copyTree never carries node_modules forward (it is an
  // excluded name), so without this fix every re-pack silently discarded a browser bootstrap.sh
  // had just spent a real download filling, and the installer's own recovery guidance
  // ("re-run this installer to resume") paid for it again on the very next run.
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    pack(src, out);
    const cache = join(out, "skills", "alpha", "node_modules", ".remotion");
    mkdirSync(join(cache, "chrome-headless-shell"), { recursive: true });
    writeFileSync(
      join(cache, "chrome-headless-shell", "marker"),
      "stand-in for the real ~93 MB binary",
    );
    pack(src, out);
    expect(existsSync(join(cache, "chrome-headless-shell", "marker"))).toBe(
      true,
    );
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

// ── The packer must decide exactly what the simulator decides ──
//
// The budgets are measured by lib/host/skill-payload.ts and the tree is written by the packer. Any
// rule one applies and the other does not is a delivery the budgets never measured. Two such
// divergences existed: the simulator keys a `seen` set on realpathSync and the packer had no cycle
// guard at all, and the simulator stops at a subtree carrying its own SKILL.md while the packer
// copied straight through it.

/** Every regular file under `dir`, counted without following links (the packed tree has none). */
function countFilesOnDisk(dir: string): number {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countFilesOnDisk(join(dir, e.name));
    else n += 1;
  }
  return n;
}

test("a symlink cycle is bounded, not materialised until the filesystem gives up", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    // alpha/src/loop -> alpha/src. statSync follows it, so an unguarded walk copies src into
    // itself over and over until ELOOP — and the packer then swallowed the stat failure at the
    // bottom and reported success on a delivery it had wrecked. The simulator has always keyed on
    // realpathSync and stopped. The link points at src, NOT at alpha: a cycle back to the skill
    // root carries a SKILL.md and would be cut by the nested-skill rule instead, which would leave
    // this guard untested.
    symlinkSync(
      join(src, "skills", "alpha", "src"),
      join(src, "skills", "alpha", "src", "loop"),
    );
    const r = pack(src, out);
    expect(r.stderr.toString()).not.toContain("ELOOP");
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(out, "skills", "alpha", "SKILL.md"))).toBe(true);
    expect(
      existsSync(join(out, "skills", "alpha", "src", "loop", "loop")),
    ).toBe(false);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("a subtree carrying its own SKILL.md is left out, exactly as the host leaves it out", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    const nested = join(src, "skills", "alpha", "vendor");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "SKILL.md"), "# vendored\n");
    writeFileSync(join(nested, "heavy.ts"), "export {};");
    pack(src, out);
    // A host loading alpha never offers vendor/'s files, so the budgets never counted them; the
    // delivery must not carry weight nothing measures.
    expect(existsSync(join(out, "skills", "alpha", "vendor"))).toBe(false);
  } finally {
    rmSync(src, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("what the packer writes is exactly what the simulator measures", () => {
  const src = repo();
  const out = mkdtempSync(join(tmpdir(), "splash-packout-"));
  try {
    const nested = join(src, "skills", "alpha", "vendor");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "SKILL.md"), "# vendored\n");
    writeFileSync(join(nested, "heavy.ts"), "export {};");
    symlinkSync(
      join(src, "skills", "alpha", "src"),
      join(src, "skills", "alpha", "src", "loop"),
    );
    expect(pack(src, out).exitCode).toBe(0);
    // Counted on DISK, not re-measured through the simulator — which would be blind here, because
    // a materialised cycle copies alpha's own SKILL.md into the junk and the simulator then skips
    // it as "another skill". What the packer WROTE is the thing under test.
    expect(countFilesOnDisk(join(out, "skills", "alpha"))).toBe(
      measureSkillPayload(join(src, "skills", "alpha"), {
        applyExclusions: true,
      }).files,
    );
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

// ── Does the merged manifest actually cover what the delivered tree imports? ──
//
// Two dependency holes were found by hand rather than by a guard: `vite` (a devDependency the
// merge dropped, so the first produce died on ERR_MODULE_NOT_FOUND) and `zod`/`fflate`/
// `@noble/hashes` (declared only in the ROOT manifest, which the packer never read). Both were
// invisible because .dist sits inside $DEST and inherits $DEST/node_modules — the delivery
// resolved packages it does not declare. This test asks the question directly, on the packed
// tree, so the third hole is caught by the repository instead of by a journalist.

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
]);

/** Node builtins reachable WITHOUT the `node:` prefix. Not dependencies. */
const BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

/** Strip comments, so English prose ("derived from \"the first value column\"") is not read as an
 *  import. Crude but sufficient here: this file's job is to find specifiers, not to parse JS. */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** Every bare specifier a module in `dir` imports, mapped to its package name. */
function bareImports(dir: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  // Anchored on the STATEMENT, never on a bare `from`: the specifier list of an import carries no
  // quote and no semicolon, so `[^;'"]*` spans a multi-line one and stops at anything else.
  // `import type` / `export type` are ERASED before anything runs — a missing type package fails
  // the typecheck, never the delivery (map-native's `import type { Topology } from
  // "topojson-specification"` resolves through @types/topojson-specification, a devDependency
  // whose module name is not a runtime package at all). Only runtime specifiers are in scope here.
  const patterns = [
    /(?:^|[\n;}])\s*import\s+(?!type\s)(?:[^;'"]*\sfrom\s*)?["']([^"']+)["']/g,
    /(?:^|[\n;}])\s*export\s+(?!type\s)[^;'"]*\sfrom\s*["']([^"']+)["']/g,
    // Dynamic import("p") — but not TypeScript's import-TYPE query `import("p").Topology`, which
    // is erased like any other type. Discriminated on the member being capitalised: a real dynamic
    // import is consumed through `.then`/`.default`/`await`, never through a PascalCase member.
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)(?!\s*\.\s*[A-Z])/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = e.name.slice(e.name.lastIndexOf("."));
      if (!CODE_EXT.has(ext)) continue;
      const text = stripComments(readFileSync(full, "utf8"));
      for (const re of patterns) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const spec = m[1]!;
          if (spec.startsWith(".") || spec.startsWith("/")) continue;
          if (spec.startsWith("node:") || spec.startsWith("bun:")) continue;
          if (BUILTINS.has(spec)) continue;
          const pkg = spec.startsWith("@")
            ? spec.split("/").slice(0, 2).join("/")
            : spec.split("/")[0]!;
          if (!pkg || pkg.startsWith("#")) continue; // subpath imports resolve in-package
          const where = found.get(pkg) ?? [];
          if (where.length < 3) where.push(full.slice(dir.length + 1));
          found.set(pkg, where);
        }
      }
    }
  };
  walk(dir);
  return found;
}

test("every package the delivered tree imports is declared by the merged manifest", () => {
  const out = mkdtempSync(join(tmpdir(), "splash-realpack-deps-"));
  try {
    expect(pack(REPO, out).exitCode).toBe(0);
    const merged = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    const declared = new Set(Object.keys(merged.dependencies ?? {}));

    const missing: string[] = [];
    for (const [pkg, where] of bareImports(out)) {
      if (!declared.has(pkg))
        missing.push(`${pkg} (imported by ${where.join(", ")})`);
    }
    if (missing.length)
      throw new Error(
        `the delivered tree imports packages the merged manifest does not declare, so a relocated ` +
          `delivery cannot install them:\n  ${missing.join("\n  ")}\n` +
          `Declare each in the package.json the packer merges (a skill's, or the root's).`,
      );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
