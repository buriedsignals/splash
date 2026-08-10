#!/usr/bin/env bun
// THE DOORS. Where the fifteen skills have to appear for each AI host to see them, and nothing else.
//
// Placement is by SYMLINK, which is what dissolves the depth problem: the twin's skills sit at
// `<root>/skills/<id>`, one level deeper than a host expects, but a host only ever sees the depth
// inside its OWN skills directory. Measured (`twin/survey/ai-hosts.md` §3), on the five hosts
// installed on the machine this was written on:
//
//   | route                                            | Goose 1.45 | Claude Code | Gemini 0.50 |
//   | one link `~/.claude/skills/splash-twin → <root>` |   15 ✔     |    15 ✔     |    0 ✘      |
//   | 15 flat links in `~/.agents/skills/`             |   15 ✔     |     n/a     |   15 ✔      |
//
// So TWO doors cover every host, and neither is redundant:
//
//   1. `~/.claude/skills/splash-twin → <root>` — ONE link. Claude Code and Claude Desktop read this
//      directory, and Goose scans it too (it is among Goose's own discovery roots). The link points
//      at the ROOT, not at `skills/`, because on this door Claude requires the plugin manifest:
//      measured, a directory holding `skills/*` with no `.claude-plugin/plugin.json` loads NOTHING
//      here, and the same tree with the manifest loads all fifteen. (Under `--plugin-dir` the
//      manifest is optional; on this door it is required. Two different rules, both measured.)
//
//   2. `~/.agents/skills/<id> → <root>/skills/<id>` — FIFTEEN links, flat. Gemini discovers only
//      this shape: measured, one link at depth 2 gives "No skills discovered", fifteen flat links
//      give all fifteen. Codex uses the same directory. Goose reads it as well.
//
// FLAT, NOT NAMESPACED, and that is a correction to the contract this otherwise follows. The
// engine's placement contract prescribes a product namespace for the Claude family
// (`~/.claude/skills/<product>/<id>`). The original ran the probe: Claude Code reads
// `~/.claude/skills/<name>/SKILL.md` exactly ONE level deep, so a product namespace there
// discovers nothing, silently. Spotlight's own installer already carries the fallback
// (`link_spotlight_skills` places flat when the adapter directory cannot be collapsed); this takes
// the fallback as the default for that family.
//
// TWO DEFENSIVE RULES STOLEN OUTRIGHT FROM SPOTLIGHT'S INSTALLER, both of which exist because it
// learned them the hard way:
//
//   - A skills directory that is ITSELF a symlink is treated as user-managed. Placing links through
//     it would mutate whatever repository it points into. Refused, and said out loud.
//   - Nothing that is not our own symlink is ever removed. If a real file or directory is sitting
//     on a name we want, we report the collision and place nothing, rather than "cleaning up" a
//     journalist's work.
//
// This script MUTATES the machine (it creates symlinks), so `--dry-run` prints the exact plan and
// touches nothing. It is idempotent: a correct link already in place is left alone and reported as
// `ok`.

import { existsSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const has = (name) => argv.includes(name);

const DRY_RUN = has("--dry-run");
const ROOT = resolve(flag("--root", resolve(HERE, "..")));
const HOME = resolve(flag("--home", homedir()));

/** The skill ids this root actually ships — read off the filesystem, never a list kept by hand. */
function skillIds(root) {
  const dir = join(root, "skills");
  if (!existsSync(dir)) throw new Error(`no skills/ directory in ${root} — is this a Splash root?`);
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && existsSync(join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

const results = [];
function record(status, where, detail) {
  results.push({ status, where, detail });
}

/**
 * Ensure `linkPath` is a symlink to `target`. Returns without touching anything when it already is.
 * Never removes anything that is not a symlink.
 */
function placeLink(linkPath, target) {
  if (existsSync(join(linkPath, ".."))) {
    // parent exists — fine
  }
  let current = null;
  try {
    current = lstatSync(linkPath);
  } catch {
    current = null;
  }

  if (current && !current.isSymbolicLink()) {
    record("refused", linkPath, `a real ${current.isDirectory() ? "directory" : "file"} is already there — not removed`);
    return;
  }

  if (current && current.isSymbolicLink()) {
    const existing = readlinkSync(linkPath);
    if (resolve(dirname(linkPath), existing) === target) {
      record("ok", linkPath, "already points here");
      return;
    }
    if (DRY_RUN) {
      record("would-relink", linkPath, `${existing} → ${target}`);
      return;
    }
    unlinkSync(linkPath);
  }

  if (DRY_RUN) {
    record("would-link", linkPath, `→ ${target}`);
    return;
  }
  symlinkSync(target, linkPath);
  record("linked", linkPath, `→ ${target}`);
}

/**
 * A door's directory. Returns `null` — and says why — when it must not be written through: it is
 * itself a symlink (user-managed, and placing through it would mutate the target repository).
 */
function openDoor(dir) {
  let stats = null;
  try {
    stats = lstatSync(dir);
  } catch {
    stats = null;
  }
  if (stats?.isSymbolicLink()) {
    record("refused", dir, "this skills directory is a symlink, so it is user-managed — nothing placed through it");
    return null;
  }
  if (!stats) {
    if (DRY_RUN) {
      record("would-create", dir, "skills directory does not exist yet");
      return dir;
    }
    mkdirSync(dir, { recursive: true });
    record("created", dir, "skills directory");
  }
  return dir;
}

const ids = skillIds(ROOT);

// Door 1 — the Claude family, and Goose reads it too. ONE link, pointing at the ROOT so that the
// plugin manifest travels with it.
if (!existsSync(join(ROOT, ".claude-plugin", "plugin.json"))) {
  record(
    "refused",
    join(ROOT, ".claude-plugin", "plugin.json"),
    "absent — measured: without it this door loads NOTHING, so the link would be silently useless",
  );
} else {
  const door = openDoor(join(HOME, ".claude", "skills"));
  if (door) placeLink(join(door, "splash-twin"), ROOT);
}

// Door 2 — the canonical agents store: Gemini and Codex read only this shape, Goose reads it too.
const agents = openDoor(join(HOME, ".agents", "skills"));
if (agents) for (const id of ids) placeLink(join(agents, id), join(ROOT, "skills", id));

const width = Math.max(...results.map((r) => r.status.length));
for (const r of results) {
  console.log(`${r.status.padEnd(width)}  ${r.where.replace(HOME, "~")}  ${r.detail}`);
}
console.log(`\n${ids.length} skills in ${ROOT.replace(HOME, "~")}${DRY_RUN ? "  (dry run — nothing was changed)" : ""}`);

const refused = results.filter((r) => r.status === "refused");
if (refused.length > 0) {
  console.error(`\n${refused.length} placement(s) refused — reported, never worked around.`);
  process.exit(1);
}
