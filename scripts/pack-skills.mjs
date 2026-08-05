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
  symlinkSync, realpathSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { isExcludedEntry } from "../lib/host/skill-payload.ts";

/** The install root's own files, which the delivered tree is NOT the root of.
 *
 *  A dozen shipped scripts resolve the install root as "N levels above my own directory" —
 *  skills/splash/scripts/save-key.mjs reads `../../../.env`, skills/map-native/scripts/produce.mjs
 *  reads `<skill>/../../.env`, lib/newsroom/decor.ts's `installRoot()` is `lib/../..`. Packing the
 *  skills one level down re-points every one of them at <outDir>, where the configurator has
 *  written nothing: a Dock-launched session (no .env in its environment — the very case that file
 *  fallback exists for) fails with "VITE_MAPTILER_KEY missing", save-key.mjs writes the
 *  journalist's secret into a directory the next pack deletes, and readDecorState finds no
 *  newsroom.json so uiLang silently falls back to English.
 *
 *  Linking them back fixes all of it in ONE place instead of teaching a dozen resolvers about a
 *  delivery layout they must not know. The links sit ABOVE skills/, and a host only ever DESCENDS
 *  from .dist/skills/<name>/ — so nothing enumerates them (measured, not assumed: see
 *  docs/installer/pack-skills.test.ts, which compares a host's payload with and without them).
 *  They are RELATIVE, so moving the install moves them with it, and a dangling one behaves exactly
 *  like an absent file for every reader — except that writing through it creates the target at the
 *  install root, which is precisely what save-key.mjs needs. */
const INSTALL_ROOT_FILES = [".env", "newsroom.json", "NEWSROOM-PROFILE.md"];

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

/** Fold one manifest's dependencies AND devDependencies into the merged one.
 *
 *  Both maps, because the delivered tree has no separate build step that installs "dev" packages
 *  only for CI and strips them after — `bun install` at the dist root is the ONLY install that
 *  ever happens, and produce.mjs shells out to `bunx vite build` with a vite.config.ts that
 *  imports @vitejs/plugin-react / vite-plugin-singlefile, all filed under devDependencies
 *  upstream. Dropping that distinction here is what makes the delivered tree able to render at
 *  all (proven by scripts/verify-dist-produce.mjs: static failed with ERR_MODULE_NOT_FOUND
 *  ('vite') until this merged devDependencies too). */
function foldManifest(pkgPath, label) {
  if (!existsSync(pkgPath)) return;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};
  // INTRA-manifest collision: the same package named in both maps of ONE package.json, at
  // different versions. The spread below (deps then devDeps) resolves it by spread order —
  // devDeps wins — and unlike the cross-manifest collision two lines down, it was resolved
  // silently. Surfaced the same way, before the merge picks a winner.
  for (const dep of Object.keys(devDeps)) {
    if (dep in deps && deps[dep] !== devDeps[dep]) {
      console.error(
        `note: ${dep} pinned twice within ${label}'s package.json (dependencies ${deps[dep]} vs devDependencies ${devDeps[dep]}); keeping ${devDeps[dep]}`,
      );
    }
  }
  for (const [dep, version] of Object.entries({ ...deps, ...devDeps })) {
    if (merged[dep] && merged[dep] !== version)
      console.error(`note: ${dep} pinned twice (${merged[dep]} vs ${version}); keeping ${merged[dep]}`);
    merged[dep] ??= version;
  }
}

for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const src = join(skillsRoot, entry.name);
  // E9's rule, applied here too: a directory with no SKILL.md is not a skill.
  if (!existsSync(join(src, "SKILL.md"))) continue;
  copyTree(src, join(outDir, "skills", entry.name));
  packed++;
  foldManifest(join(src, "package.json"), entry.name);
}

// The ROOT manifest, LAST. `lib/` ships in the delivery and imports zod (lib/newsroom/state.ts +
// 17 modules), fflate (lib/delivery/adapters/zip.ts) and @noble/hashes (lib/loop/deliver.ts) —
// declared in NO skill's package.json, only in the root's. Without this the delivery resolves
// packages it does not declare, and only because .dist sits inside $DEST and inherits
// $DEST/node_modules: an accident of nesting, not a property of the delivery. Last, so a skill's
// pin still wins on a shared package — the renderers own the version that has to agree
// (install/native-browser.test.ts keeps Playwright in step across them).
foldManifest(join(repoRoot, "package.json"), "the repository root");

// Link the install root's own files back into the delivery (see INSTALL_ROOT_FILES). Created
// unconditionally: NEWSROOM-PROFILE.md is usually written AFTER the install, and a link made only
// when the target already exists would miss it forever.
for (const name of INSTALL_ROOT_FILES) {
  const target = relative(resolve(outDir), resolve(repoRoot, name));
  symlinkSync(target, join(outDir, name));
}

writeFileSync(
  join(outDir, "package.json"),
  `${JSON.stringify({ name: "splash-delivered", private: true, dependencies: merged }, null, 2)}\n`,
);

console.log(`packed ${packed} skills into ${outDir}`);
