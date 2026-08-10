// Phase 0. Nothing here is worked around: a gap is reported, never designed around.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNewsroom, validateNewsroom, isDeclinedProfile } from "./newsroom.mjs";
import { probeMapTiler, probeDatawrapper, probeCloudflare, resolveEnvKey } from "./keys.mjs";

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
/**
 * Whether `name` is installed in THIS root's own `node_modules` — not whether some resolver,
 * somewhere, can find a copy of it.
 *
 * Do not simplify this back to `Bun.resolveSync(name, root)`. That is what this function replaced,
 * and the reason is measured, on this machine, on Bun 1.3.5, not inherited from a report:
 *
 *   a root whose `node_modules/` was completely EMPTY reported all nine declared dependencies
 *   RESOLVED, because `Bun.resolveSync` implements Node's resolution algorithm faithfully — and
 *   Node's algorithm walks UP the directory chain. Every hit came from the developer's own
 *   `twin/node_modules`, three levels above.
 *
 * Which means `checkDependencies` reported `dependencies: pass` and `runPreflight` reported
 * `ready: true` for a root where nothing whatsoever was installed — the exact false green the whole
 * check exists to prevent, and one only visible when the root sits underneath another JS project.
 * A newsroom that puts its Splash root inside any checkout gets it; so does every test run in this
 * repository, which is why it survived so long.
 *
 * The ORIGINAL Splash hit the same class through a different door (Bun's global install cache) and
 * left the same instruction in its own fix, which is why this comment repeats it verbatim.
 *
 * Ambient resolution is the thing being refused, so this deliberately does NOT walk up: a Splash
 * root is a package root with its own manifest and its own `bun install`. Borrowing a parent's tree
 * is not a root that works, it is a root that happens to be sitting somewhere lucky, and it stops
 * working the moment it is copied to the machine it was meant for.
 */
function resolveDepInTree(name, root) {
  return existsSync(join(root, "node_modules", name, "package.json"));
}

async function checkDependencies(root) {
  if (!(await exists(join(root, "node_modules")))) {
    return { id: "dependencies", status: "missing", detail: "run bun install in the Splash root" };
  }

  const declared = await declaredDependencyNames();
  const unresolvedPackages = declared.filter((name) => !resolveDepInTree(name, root));

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

// The newsroom's identity check has three honest outcomes, not two (see SKILL.md, "The newsroom's
// identity gets three honest outcomes"): `pass` (a complete, valid profile), `missing` (nobody has
// answered the question yet — invoke twin-newsroom-charter to derive one from the newsroom's own
// website, or to record a decline), and `declined` (a recorded decision that the newsroom has no
// house profile — front matter carrying `decision: declined`). `fail` is reserved for a file that
// exists, was meant to answer the question, and does not: unparsable front matter, or a profile
// short of the six required fields. `declined` behaves like `pass` for readiness below — a
// considered "no" is exactly as closed a question as a "yes"; the whole point of recording it is
// that neither one is a silent default a later reader could mistake for a bug and "fix".
async function checkNewsroom(root) {
  let text;
  try {
    text = await readFile(join(root, "NEWSROOM.md"), "utf8");
  } catch {
    // The file could not be read at all: missing, or inaccessible. Not a parse question.
    return {
      id: "newsroom-profile",
      status: "missing",
      detail:
        "NEWSROOM.md is absent — invoke twin-newsroom-charter to derive one from the newsroom's own website, or to record a decline",
    };
  }

  let profile;
  try {
    profile = parseNewsroom(text);
  } catch (error) {
    // The file exists but is not what we expect: a real failure, distinct from absent.
    return { id: "newsroom-profile", status: "fail", detail: `NEWSROOM.md could not be parsed: ${error.message}` };
  }

  if (isDeclinedProfile(profile)) {
    return {
      id: "newsroom-profile",
      status: "declined",
      detail: "the newsroom declined a house profile — a recorded decision, not a missing default",
      profile,
    };
  }

  // The parsed profile is CARRIED, not discarded. It used to be thrown away here — only the status
  // reached `checks` — and `SKILL.md` said preflight runs "silently when ready", so a journalist
  // first heard what their own `NEWSROOM.md` said nine phases later, from twin-palette, long past
  // the point where a wrong value could still have been corrected. In the run, that file recorded
  // in its own prose that four of its six values were assumed rather than measured, and nobody was
  // ever told.
  const errors = validateNewsroom(profile);
  return errors.length === 0
    ? { id: "newsroom-profile", status: "pass", detail: "NEWSROOM.md is complete", profile }
    : { id: "newsroom-profile", status: "fail", detail: errors.join("; "), profile };
}

// One row of `capabilities`: whether a key actually opens the medium it gates, probed for real
// (never merely "is it set") — the same discipline `checkDependencies` applies to `node_modules`.
// Absence and a rejected key both resolve to `available: false`; only `reason` tells them apart,
// because neither one may ever stop the session (spec: "A. Preflight reports capabilities, not a
// verdict" in SKILL.md) — a capability that is not open only narrows what a later phase may offer,
// it is never a verdict on the environment as a whole.
// `fill` is what turns a report into an OFFER. Every reason string already names the exact variable
// ("MAPTILER_KEY is not set"), and yet there was no code path anywhere in this toolchain that
// accepted a key from a journalist — so a closed capability closed for the whole session with no
// moment at which it could be opened. `fill` says the variable, where the key comes from, and the
// file it goes in; `recordKey` (scripts/keys.mjs) is where an answer lands. It is carried on OPEN
// rows too: a row is a description of a capability, not of a failure.
async function checkCapability({ id, opens, canonicalEnv, env, probeFn, fetchFn, fill }) {
  const key = resolveEnvKey(env, canonicalEnv);
  const result = await probeFn(key, fetchFn);
  return { id, opens, available: result.ok, reason: result.detail, fill };
}

export async function runPreflight({ root, env, fetchFn }) {
  const dependencies = await checkDependencies(root);
  const newsroom = await checkNewsroom(root);
  const checks = [dependencies, newsroom];

  const capabilities = {
    map: await checkCapability({
      id: "map",
      opens: "map beats",
      canonicalEnv: "MAPTILER_KEY",
      env,
      probeFn: probeMapTiler,
      fetchFn,
      fill: "MAPTILER_KEY — a free key from maptiler.com/cloud (Account → Keys), written into the .env at the Splash root",
    }),
    datawrapper: await checkCapability({
      id: "datawrapper",
      opens: "Datawrapper beats",
      canonicalEnv: "DATAWRAPPER_TOKEN",
      env,
      probeFn: probeDatawrapper,
      fetchFn,
      fill: "DATAWRAPPER_TOKEN — an API token from app.datawrapper.de/account/api-tokens, written into the .env at the Splash root",
    }),
    // Cloudflare Pages producer exists in twin-deliver (deploy-embed.mjs). Probe both credentials
    // independently so the feedback tells which one, if any, is missing. Both must resolve to
    // report the capability available.
    hostedEmbed: await (async () => {
      const accountId = resolveEnvKey(env, "CLOUDFLARE_ACCOUNT_ID");
      const apiToken = resolveEnvKey(env, "CLOUDFLARE_API_TOKEN");
      const result = await probeCloudflare(accountId, apiToken, fetchFn);
      return {
        id: "hosted-embed",
        opens: "the hosted embed delivery form",
        available: result.ok,
        reason: result.detail,
        fill: "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN — the account id from dash.cloudflare.com and a token with Pages:Edit, both written into the .env at the Splash root",
      };
    })(),
  };

  // Hard stops — the only two questions that block the session outright. Dependencies are a
  // precondition to run anything at all. The newsroom's identity must have been ANSWERED, one way
  // or the other, before continuing: `pass` and `declined` both count as answered, `missing` does
  // not (nobody has said yes or no yet) and `fail` means the answer on file cannot be trusted.
  // Neither capability above ever appears here — a closed capability narrows `capabilities`, it
  // never blocks `ready`. This is the mechanical half of the fix: the old `ok` verdict conflated
  // "the environment cannot run this session at all" with "one key does not work yet", which is
  // exactly what let a chart-only story get told its environment had failed over a map key it
  // would never touch.
  const blockers = checks.filter((c) => c.status !== "pass" && c.status !== "declined");

  return { ready: blockers.length === 0, blockers, checks, capabilities };
}

// The mechanical enforcement SKILL.md describes in prose ("the session stops there") now has a
// real function behind it, not just a report a human has to remember to honour. Call this right
// after `runPreflight`; it throws, naming every blocker, when `ready` is false, and does nothing
// at all otherwise. It never inspects `capabilities` — a closed capability is not a blocker, so it
// can never make this throw.
export function assertPreflightReady(report) {
  if (report.ready) return;
  const reasons = report.blockers.map((b) => `${b.id}: ${b.detail}`).join("; ");
  throw new Error(`preflight is not ready — ${reasons}`);
}

// The seam a later phase (twin-storyboard, when it proposes a slot) reads to keep from offering a
// medium the environment cannot honour. Returns `null` when `medium` is open (or unrecognised —
// this function is declarative, not a gate on mediums it has no opinion about); otherwise the
// exact line to surface to the journalist, phrased as an unavailable CAPABILITY ("map beats are
// unavailable: …"), never as an environment failure — the distinction this rebuild exists to
// preserve. A chart-only story never calls this with "map" at all; a map story that does, with no
// working MapTiler key, is told the truth about what is missing instead of being told its whole
// environment is broken.
export function capabilityGap(capabilities, medium) {
  const row = capabilities[medium];
  if (!row || row.available) return null;
  return `${row.opens} are unavailable: ${row.reason}`;
}
