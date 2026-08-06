// Phase 0. Nothing here is worked around: a gap is reported, never designed around.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseNewsroom, validateNewsroom } from "./newsroom.mjs";
import { probeMapTiler } from "./keys.mjs";

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

export async function runPreflight({ root, env, fetchFn }) {
  const checks = [];

  checks.push(await exists(join(root, "node_modules"))
    ? { id: "dependencies", status: "pass", detail: "root dependencies are installed" }
    : { id: "dependencies", status: "missing", detail: "run bun install in the Splash root" });

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
