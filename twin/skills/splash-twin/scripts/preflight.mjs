// Phase 0. Nothing here is worked around: a gap is reported, never designed around.

import { readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNewsroom, validateNewsroom } from "./newsroom.mjs";
import { probeMapTiler } from "./keys.mjs";

const ROOT_TEMPLATE_PACKAGE_JSON = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "assets", "root-template", "package.json",
);

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function declaredDependencyNames() {
  const pkg = JSON.parse(await readFile(ROOT_TEMPLATE_PACKAGE_JSON, "utf8"));
  return Object.keys(pkg.dependencies ?? {});
}

// A present node_modules is not a working install, the same discipline the
// MapTiler check applies to a present key: resolve every dependency the root
// template declares, from the root — not merely confirm a directory exists.
async function checkDependencies(root) {
  if (!(await exists(join(root, "node_modules")))) {
    return { id: "dependencies", status: "missing", detail: "run bun install in the Splash root" };
  }
  const declared = await declaredDependencyNames();
  const unresolved = declared.filter((name) => {
    try {
      Bun.resolveSync(name, root);
      return false;
    } catch {
      return true;
    }
  });
  return unresolved.length === 0
    ? { id: "dependencies", status: "pass", detail: "root dependencies are installed" }
    : {
        id: "dependencies",
        status: "fail",
        detail: `cannot resolve ${unresolved.join(", ")} — run bun install in the Splash root`,
      };
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
