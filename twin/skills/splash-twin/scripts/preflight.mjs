// Phase 0. Nothing here is worked around: a gap is reported, never designed around.

import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNewsroom, validateNewsroom } from "./newsroom.mjs";
import { probeMapTiler } from "./keys.mjs";

const ROOT_TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "root-template");
const ROOT_TEMPLATE_PACKAGE_JSON = join(ROOT_TEMPLATE_DIR, "package.json");

// Craft skills vendor their mechanism (never their seed — see twin-chart-beat/SKILL.md) into the
// root template's own shared/ directory, checked in, so `cp -r root-template/` carries it along.
// This is that vendored tree's location — the manifest of what a real root must also have.
const ROOT_TEMPLATE_SHARED_DIR = join(ROOT_TEMPLATE_DIR, "shared");

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function declaredDependencyNames() {
  const pkg = JSON.parse(await readFile(ROOT_TEMPLATE_PACKAGE_JSON, "utf8"));
  return Object.keys(pkg.dependencies ?? {});
}

// Every vendored craft file the template ships, relative to its own shared/ directory — derived
// by walking the template rather than a hand-kept list, so a new craft skill that vendors its
// mechanism is covered the moment its files land in the template, with no change here.
async function declaredSharedFiles() {
  let entries;
  try {
    entries = await readdir(ROOT_TEMPLATE_SHARED_DIR, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT_TEMPLATE_SHARED_DIR, join(entry.parentPath ?? entry.path, entry.name)));
}

// A present node_modules is not a working install, the same discipline the MapTiler check
// applies to a present key: resolve every dependency the root template declares, from the root —
// not merely confirm a directory exists. The same discipline extends to the vendored craft
// mechanism: a beat's component resolves it as a real file under the root's own shared/
// directory (`#shared/<skill>/...`, mapped by the root's package.json `imports` field), so a
// root missing it can build packages fine and still fail the only render it ships — exactly what
// PROOF.md §1 caught this check reporting "pass" on.
async function checkDependencies(root) {
  if (!(await exists(join(root, "node_modules")))) {
    return { id: "dependencies", status: "missing", detail: "run bun install in the Splash root" };
  }

  const declared = await declaredDependencyNames();
  const unresolvedPackages = declared.filter((name) => {
    try {
      Bun.resolveSync(name, root);
      return false;
    } catch {
      return true;
    }
  });

  const declaredShared = await declaredSharedFiles();
  const missingShared = [];
  for (const relPath of declaredShared) {
    if (!(await exists(join(root, "shared", relPath)))) {
      missingShared.push(join("shared", relPath));
    }
  }

  if (unresolvedPackages.length === 0 && missingShared.length === 0) {
    return { id: "dependencies", status: "pass", detail: "root dependencies are installed" };
  }

  const details = [];
  if (unresolvedPackages.length > 0) {
    details.push(`cannot resolve ${unresolvedPackages.join(", ")} — run bun install in the Splash root`);
  }
  if (missingShared.length > 0) {
    details.push(`missing vendored craft files: ${missingShared.join(", ")} — re-copy the root template's shared/ directory`);
  }
  return { id: "dependencies", status: "fail", detail: details.join("; ") };
}

export async function runPreflight({ root, env, fetchFn }) {
  const checks = [];

  checks.push(await checkDependencies(root));

  let newsroomText;
  try {
    newsroomText = await readFile(join(root, "NEWSROOM.md"), "utf8");
  } catch {
    // The file could not be read at all: missing, or inaccessible. Not a parse question.
    checks.push({ id: "newsroom-profile", status: "missing", detail: "NEWSROOM.md is absent" });
  }

  if (newsroomText !== undefined) {
    try {
      const errors = validateNewsroom(parseNewsroom(newsroomText));
      checks.push(errors.length === 0
        ? { id: "newsroom-profile", status: "pass", detail: "NEWSROOM.md is complete" }
        : { id: "newsroom-profile", status: "fail", detail: errors.join("; ") });
    } catch (error) {
      // The file exists but is not what we expect: a real failure, distinct from absent.
      checks.push({ id: "newsroom-profile", status: "fail", detail: `NEWSROOM.md could not be parsed: ${error.message}` });
    }
  }

  const maptiler = await probeMapTiler(env.MAPTILER_KEY ?? "", fetchFn);
  checks.push({
    id: "maptiler-key",
    status: maptiler.ok ? "pass" : (env.MAPTILER_KEY ? "fail" : "missing"),
    detail: maptiler.detail,
  });

  return { ok: checks.every((c) => c.status === "pass"), checks };
}
