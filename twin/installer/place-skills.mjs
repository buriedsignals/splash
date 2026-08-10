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
//
// IT IS ALSO A MODULE, and that is deliberate rather than incidental. The setup page
// (`configure.mjs`) has to REPORT the doors — the owner expected a per-host question, there is
// correctly none, and a page that then says nothing at all leaves him unable to tell a wired
// install from an unwired one. Reporting it needs three facts: which hosts exist, which door each
// one reads, and what the placement would do. All three live HERE, next to the code that acts on
// them, and `configure.mjs` imports them rather than keeping a second copy that would drift on its
// first day. (The no-cross-skill-imports rule bans an import leaving a SKILL; both of these files
// are the installer's own, outside `skills/`, so the rule does not reach them — see that guard's
// own header for what it walks.)

import { existsSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The two doors, as data. `dir(home)` is the directory each one is placed in — the single place
 * either path is written down in this installer.
 */
export const DOORS = [
  {
    id: "claude-family",
    name: "one link, pointing at the whole root",
    dir: (home) => join(home, ".claude", "skills"),
    why: "on this door the plugin manifest has to travel with the link, so it points at the root and not at skills/",
  },
  {
    id: "agents-store",
    name: "one flat link per skill",
    dir: (home) => join(home, ".agents", "skills"),
    why: "measured: one link at depth 2 discovers nothing here, fifteen flat links discover all fifteen",
  },
];

/**
 * The hosts those doors serve, and the marker each host leaves on a machine it is installed on.
 *
 * A marker is EVIDENCE, not proof, and the page that renders this says so: a configuration
 * directory left behind by an uninstall reads exactly like an installed host. It is the honest
 * limit of looking at a filesystem, and it is worth much more than nothing — the question a
 * journalist actually has is "did this reach the assistant I use", and a host with no marker at
 * all is a host that has never run here.
 */
export const HOSTS = [
  {
    id: "claude-code",
    name: "Claude Code",
    doorIds: ["claude-family"],
    markers: (home) => [join(home, ".claude")],
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    doorIds: ["claude-family"],
    markers: (home) => [join(home, "Library", "Application Support", "Claude"), "/Applications/Claude.app"],
  },
  {
    id: "goose",
    name: "Goose",
    // Goose reads BOTH doors — it is among the few hosts that scan `~/.claude/skills` as well as
    // its own store, and it descends nested directories fine.
    doorIds: ["claude-family", "agents-store"],
    markers: (home) => [join(home, ".config", "goose"), "/Applications/Goose.app"],
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    doorIds: ["agents-store"],
    markers: (home) => [join(home, ".gemini")],
  },
  {
    id: "codex",
    name: "Codex",
    doorIds: ["agents-store"],
    markers: (home) => [join(home, ".codex")],
  },
];

/**
 * Which hosts have left a marker under `home` (or in `/Applications`). `exists` is injectable so a
 * test can describe a machine it is not running on — the app-bundle markers are absolute paths, and
 * a fake HOME cannot make `/Applications/Goose.app` go away.
 */
export function detectHosts({ home, exists = existsSync }) {
  return HOSTS.map((host) => {
    const looked = host.markers(home);
    const evidence = looked.filter((path) => exists(path));
    return { id: host.id, name: host.name, doorIds: host.doorIds, detected: evidence.length > 0, looked, evidence };
  });
}

/** The skill ids this root actually ships — read off the filesystem, never a list kept by hand. */
export function skillIds(root) {
  const dir = join(root, "skills");
  if (!existsSync(dir)) throw new Error(`no skills/ directory in ${root} — is this a Splash root?`);
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && existsSync(join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

/**
 * Ensure `linkPath` is a symlink to `target`. Returns without touching anything when it already is.
 * Never removes anything that is not a symlink.
 */
function placeLink({ linkPath, target, doorId, record, dryRun }) {
  let current = null;
  try {
    current = lstatSync(linkPath);
  } catch {
    current = null;
  }

  if (current && !current.isSymbolicLink()) {
    record(doorId, "refused", linkPath, `a real ${current.isDirectory() ? "directory" : "file"} is already there — not removed`);
    return;
  }

  if (current && current.isSymbolicLink()) {
    const existing = readlinkSync(linkPath);
    if (resolve(dirname(linkPath), existing) === target) {
      record(doorId, "ok", linkPath, "already points here");
      return;
    }
    if (dryRun) {
      record(doorId, "would-relink", linkPath, `${existing} → ${target}`);
      return;
    }
    unlinkSync(linkPath);
  }

  if (dryRun) {
    record(doorId, "would-link", linkPath, `→ ${target}`);
    return;
  }
  symlinkSync(target, linkPath);
  record(doorId, "linked", linkPath, `→ ${target}`);
}

/**
 * A door's directory. Returns `null` — and says why — when it must not be written through: it is
 * itself a symlink (user-managed, and placing through it would mutate the target repository).
 */
function openDoor({ dir, doorId, record, dryRun }) {
  let stats = null;
  try {
    stats = lstatSync(dir);
  } catch {
    stats = null;
  }
  if (stats?.isSymbolicLink()) {
    record(doorId, "refused", dir, "this skills directory is a symlink, so it is user-managed — nothing placed through it");
    return null;
  }
  if (!stats) {
    if (dryRun) {
      record(doorId, "would-create", dir, "skills directory does not exist yet");
      return dir;
    }
    mkdirSync(dir, { recursive: true });
    record(doorId, "created", dir, "skills directory");
  }
  return dir;
}

/**
 * The whole placement, as one call. With `dryRun: true` it touches nothing and every result reads
 * `would-…` — which is what makes it safe for the setup page to ask, since that page reports the
 * doors and never places them.
 */
export function planPlacement({ root, home, dryRun = false }) {
  const results = [];
  const record = (doorId, status, where, detail) => results.push({ doorId, status, where, detail });
  const ids = skillIds(root);

  // Door 1 — the Claude family, and Goose reads it too. ONE link, pointing at the ROOT so that the
  // plugin manifest travels with it.
  const claudeDoor = DOORS[0];
  if (!existsSync(join(root, ".claude-plugin", "plugin.json"))) {
    record(
      claudeDoor.id,
      "refused",
      join(root, ".claude-plugin", "plugin.json"),
      "absent — measured: without it this door loads NOTHING, so the link would be silently useless",
    );
  } else {
    const dir = openDoor({ dir: claudeDoor.dir(home), doorId: claudeDoor.id, record, dryRun });
    if (dir) placeLink({ linkPath: join(dir, "splash-twin"), target: root, doorId: claudeDoor.id, record, dryRun });
  }

  // Door 2 — the canonical agents store: Gemini and Codex read only this shape, Goose reads it too.
  const agentsDoor = DOORS[1];
  const agents = openDoor({ dir: agentsDoor.dir(home), doorId: agentsDoor.id, record, dryRun });
  if (agents)
    for (const id of ids)
      placeLink({ linkPath: join(agents, id), target: join(root, "skills", id), doorId: agentsDoor.id, record, dryRun });

  return { ids, results };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const DRY_RUN = argv.includes("--dry-run");
  const ROOT = resolve(flag("--root", resolve(HERE, "..")));
  const HOME = resolve(flag("--home", homedir()));

  const { ids, results } = planPlacement({ root: ROOT, home: HOME, dryRun: DRY_RUN });

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
}
