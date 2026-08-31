#!/usr/bin/env bun
// THE SHARED SKILL STORE. Goose, Codex and Gemini all discover flat skill directories under
// `~/.agents/skills/`, so Splash projects exactly one symlink per shipped skill there:
//
//   `~/.agents/skills/<id> → <root>/skills/<id>`
//
// The repository's host survey preserves the wider discovery measurements, including Claude's
// separate route. The installed Splash contract intentionally uses only the shared agents store:
// there is no product-level `~/.claude/skills/splash` link and no separate Goose link. This keeps
// the local installation to one source of truth while making every Splash skill visible to Goose
// and Codex.
//
// A private parent installer may pass `--namespace splash` to place the same
// discovered skills below `~/.agents/skills/splash/`. The public Splash path
// passes no namespace and keeps the flat layout below.
//
// Placement is by symlink. `skillIds` discovers directories containing `SKILL.md`; the installer
// never maintains a second hard-coded inventory. The canonical development install performs the
// mutation inside Engine's apply/uninstall transaction. This module remains the setup page's dry-run
// reporter and a compatibility CLI for older unmanaged checkouts.
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
// It is also a module so dry-run compatibility callers can use the exact same host/door model as
// the CLI without copying the inventory. Engine owns production skill projection; this module does
// not create a second managed lifecycle.

import { existsSync, lstatSync, readlinkSync, symlinkSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The one host-discovery door, as data. `dir(home)` is the single place the path is written down
 * in this installer.
 */
export const DOORS = [
  {
    id: "agents-store",
    name: "one flat link per skill",
    dir: (home) => join(home, ".agents", "skills"),
    why: "measured: one link at depth 2 discovers nothing here, fifteen flat links discover all fifteen",
  },
];

/**
 * The hosts this store serves, and the marker each host leaves on a machine it is installed on.
 *
 * A marker is EVIDENCE, not proof, and the page that renders this says so: a configuration
 * directory left behind by an uninstall reads exactly like an installed host. It is the honest
 * limit of looking at a filesystem, and it is worth much more than nothing — the question a
 * journalist actually has is "did this reach the assistant I use", and a host with no marker at
 * all is a host that has never run here.
 */
export const HOSTS = [
  {
    id: "goose",
    name: "Goose",
    doorIds: ["agents-store"],
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
    record(doorId, "refused", linkPath, `points at ${existing}, which is not this checkout — not removed`);
    return;
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
 * store and never places links.
 */
export function planPlacement({ root, home, namespace = "", dryRun = false }) {
  if (namespace && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(namespace))
    throw new Error(`invalid skill namespace: ${namespace}`);
  const results = [];
  const record = (doorId, status, where, detail) => results.push({ doorId, status, where, detail });
  const ids = skillIds(root);

  // The canonical agents store: Goose, Gemini and Codex all read this flat shape.
  const agentsDoor = DOORS[0];
  const agentsBase = openDoor({ dir: agentsDoor.dir(home), doorId: agentsDoor.id, record, dryRun });
  let agents = agentsBase;
  if (agentsBase && namespace) {
    const namespaceDir = join(agentsBase, namespace);
    if (dryRun && !existsSync(namespaceDir)) {
      // The parent door may itself be a dry-run path that does not exist. Report
      // the namespace plan without asking lstat to traverse that absent parent.
      record(agentsDoor.id, "would-create", namespaceDir, "skill namespace does not exist yet");
      agents = namespaceDir;
    } else {
      agents = openDoor({ dir: namespaceDir, doorId: agentsDoor.id, record, dryRun });
    }
  }
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
  const NAMESPACE = flag("--namespace", "");

  const { ids, results } = planPlacement({ root: ROOT, home: HOME, namespace: NAMESPACE, dryRun: DRY_RUN });

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
