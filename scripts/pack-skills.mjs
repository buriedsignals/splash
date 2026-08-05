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
  symlinkSync, realpathSync, renameSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isExcludedEntry } from "../lib/host/skill-payload.ts";
// The install root's own files, which the delivered tree is NOT the root of. Declared in
// lib/newsroom because the fact is the decor's, and guarded there against the modules that join
// those names to an install root — see lib/newsroom/install-root-files.test.ts.
import { INSTALL_ROOT_FILES } from "../lib/newsroom/install-root-files.ts";


const [repoRoot, outDir] = process.argv.slice(2);
if (!repoRoot || !outDir) {
  console.error("usage: pack-skills.mjs <repoRoot> <outDir>");
  process.exit(1);
}

/** Copy a tree, dropping the excluded entries. Symlinks are RESOLVED into real files: a link
 *  is exactly how node_modules smuggled itself into a tree that looked clean.
 *
 *  Every rule here must be a rule the simulator (lib/host/skill-payload.ts) also applies —
 *  otherwise the delivery carries weight the budgets never measured. Two of them exist for that
 *  reason alone: the realpath `seen` set, and `stopAtNestedSkill`.
 *
 *  @param seen  realpaths already copied. Symlinks are FOLLOWED, so a cycle is reachable; without
 *               this the packer materialises nested copies until ELOOP, swallows the stat failure
 *               at the bottom and reports success on a delivery it has wrecked.
 *  @param stopAtNestedSkill  skip a subtree carrying its own SKILL.md. A host loading <name> never
 *               offers such a subtree, so the budgets never counted it. Applied under skills/ only:
 *               lib/ is an internal dependency, not an offer, and no host walks it. */
function copyTree(from, to, { seen = new Set(), stopAtNestedSkill = false } = {}) {
  let real;
  try {
    real = realpathSync(from);
  } catch {
    return;
  }
  if (seen.has(real)) return;
  seen.add(real);

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
      if (stopAtNestedSkill && existsSync(join(src, "SKILL.md"))) continue;
      copyTree(src, dst, { seen, stopAtNestedSkill });
    } else {
      if (isExcludedEntry(name, false)) continue;
      copyFileSync(src, dst);
    }
  }
}

// Build into a SIBLING, and only replace the live delivery once the whole tree stands.
//
// bootstrap.sh runs this on every re-run, and this step used to delete the delivery before
// rebuilding it. A pack that then failed — flaky wifi, full disk, exactly what the surrounding
// guards exist for — left ~/.agents/skills/* pointing at an empty directory and the host
// discovering nothing at all. Before this step existed, a failed re-run left the install working;
// staging restores that. Idempotence is unaffected: the staging tree is always fresh, so a file
// deleted from the source still disappears from the delivery.
const parent = dirname(resolve(outDir));
const stem = basename(resolve(outDir));
const stage = join(parent, `${stem}.staging-${process.pid}`);
const retired = join(parent, `${stem}.retired-${process.pid}`);

mkdirSync(parent, { recursive: true });
// Sweep any leftover from a run that was killed outright (a signal runs no cleanup).
for (const name of readdirSync(parent)) {
  if (name.startsWith(`${stem}.staging-`) || name.startsWith(`${stem}.retired-`))
    rmSync(join(parent, name), { recursive: true, force: true });
}
mkdirSync(stage, { recursive: true });

process.on("exit", (code) => {
  // A failed build leaves nothing behind and, above all, leaves the live delivery alone.
  if (code !== 0) rmSync(stage, { recursive: true, force: true });
});

// Explicit, because copyTree tolerates an unresolvable source (a dead link copies nothing) and
// that tolerance must not extend to the roots: a delivery with no lib/ resolves not one engine
// import, and one with no skills/ carries nothing at all. Fail loudly rather than promote it.
for (const required of ["lib", "skills"]) {
  if (!existsSync(join(repoRoot, required))) {
    console.error(`no ${join(repoRoot, required)} — nothing to pack from there`);
    process.exit(1);
  }
}

copyTree(join(repoRoot, "lib"), join(stage, "lib"));

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
  copyTree(src, join(stage, "skills", entry.name), { stopAtNestedSkill: true });
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

// Link the install root's own files back into the delivery.
//
// A dozen shipped scripts resolve the install root as "N levels above my own directory" —
// skills/splash/scripts/save-key.mjs reads `../../../.env`, skills/map-native/scripts/produce.mjs
// reads `<skill>/../../.env`, lib/newsroom/decor.ts's `installRoot()` is `lib/../..`. Packing the
// skills one level down re-points every one of them at <outDir>, where the configurator has
// written nothing: a Dock-launched session (no .env in its environment — the very case that file
// fallback exists for) fails with "VITE_MAPTILER_KEY missing", save-key.mjs writes the
// journalist's secret into a directory the next pack deletes, and readDecorState finds no
// newsroom.json so uiLang silently falls back to English.
//
// Linking them back fixes all of it in ONE place instead of teaching a dozen resolvers about a
// delivery layout they must not know. The links sit ABOVE skills/, and a host only ever DESCENDS
// from .dist/skills/<name>/ — so nothing enumerates them (measured, not assumed: see
// docs/installer/pack-skills.test.ts, which compares a host's payload with and without them).
// They are RELATIVE, so moving the install moves them with it, and a dangling one behaves exactly
// like an absent file for every reader — except that writing through it creates the target at the
// install root, which is precisely what save-key.mjs needs.
//
// Created unconditionally: NEWSROOM-PROFILE.md is usually written AFTER the install, and a link
// made only when the target already exists would miss it forever.
for (const name of INSTALL_ROOT_FILES) {
  // Relative to the FINAL location, not the staging one — the link travels with the rename.
  const target = relative(resolve(outDir), resolve(repoRoot, name));
  symlinkSync(target, join(stage, name));
}

writeFileSync(
  join(stage, "package.json"),
  `${JSON.stringify({ name: "splash-delivered", private: true, dependencies: merged }, null, 2)}\n`,
);

// ── Promote. The tree stands; swap it in.
const hadPrevious = existsSync(outDir);
if (hadPrevious) renameSync(outDir, retired);
try {
  renameSync(stage, outDir);
} catch (err) {
  if (hadPrevious) renameSync(retired, outDir); // put the working delivery back
  throw err;
}
// Carry the previous install's node_modules over. bootstrap.sh runs `bun install` at the delivery
// AFTER this step, and a failure there (flaky wifi, full disk) would otherwise leave a freshly
// packed tree with NO dependencies, which cannot render. This degrades a failed re-run to "the
// previous dependencies" instead of "none"; the install that follows reconciles them.
if (hadPrevious && existsSync(join(retired, "node_modules")))
  renameSync(join(retired, "node_modules"), join(outDir, "node_modules"));
rmSync(retired, { recursive: true, force: true });

console.log(`packed ${packed} skills into ${outDir}`);
