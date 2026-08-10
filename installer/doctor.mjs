#!/usr/bin/env bun
// THE DOCTOR — and the division of labour that makes it worth having.
//
// `runPreflight` answers "can this ROOT run a session" — dependencies, the newsroom's identity, and
// which capabilities the keys open. It runs INSIDE the root and it is very good at that. What it
// structurally cannot see is everything OUTSIDE the root: whether the host can find the skills at
// all, whether the shell the host spawns has `bun` on its PATH, whether a browser exists for the
// three genres that need one. A journalist whose install is perfect inside the root and invisible
// to their AI host has an install that does not work, and preflight would say `ready: true`.
//
// So this checks the wiring preflight cannot see, and then DELEGATES THE LAST WORD to preflight
// rather than duplicating its judgement — the shape `spotlight-doctor` uses, for the same reason.
// It never re-implements a check preflight owns; two implementations of one rule is the divergence
// class this project has already been bitten by once (`FEEDBACK-2026-08-10.md`, A14).
//
// Exit codes are for scripts: 0 everything is well, 1 something is broken. A capability that is
// merely closed is NOT broken — it is a recorded answer, and it never fails this command, exactly
// as it never blocks `ready`.

import { existsSync, lstatSync, readlinkSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const ROOT = resolve(flag("--root", resolve(HERE, "..")));
const HOME = resolve(flag("--home", homedir()));

const rows = [];
const ok = (what, detail) => rows.push({ level: "ok", what, detail });
const bad = (what, detail) => rows.push({ level: "bad", what, detail });
const note = (what, detail) => rows.push({ level: "note", what, detail });

// ── 1. The root is a root ────────────────────────────────────────────────────────────────────
const manifest = join(ROOT, "package.json");
let ids = [];
if (!existsSync(manifest)) {
  bad("Splash root", `no package.json at ${ROOT}`);
} else {
  const pkg = JSON.parse(await Bun.file(manifest).text());
  if (pkg?.imports?.["#shared/*"]) ok("Splash root", ROOT.replace(HOME, "~"));
  else bad("Splash root", `${manifest} does not declare the "#shared/*" import, so no beat can load the craft mechanism`);
}
if (existsSync(join(ROOT, "skills"))) {
  ids = readdirSync(join(ROOT, "skills"), { withFileTypes: true })
    .filter((e) => existsSync(join(ROOT, "skills", e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
  ok("skills present", `${ids.length} in ${join(ROOT, "skills").replace(HOME, "~")}`);
} else {
  bad("skills present", `no skills/ directory in ${ROOT} — the hosts would have nothing to link to`);
}

// ── 2. The doors ─────────────────────────────────────────────────────────────────────────────
// Checked by RESOLVING each link, not by its existence: a symlink to a moved checkout still
// exists, and is exactly as broken as no symlink at all.
function linkResolvesTo(linkPath, expected) {
  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return "not a symlink";
    readlinkSync(linkPath);
    return realpathSync(linkPath) === realpathSync(expected) ? true : `points elsewhere (${realpathSync(linkPath)})`;
  } catch {
    return "missing or dangling";
  }
}

const claudeDoor = join(HOME, ".claude", "skills", "splash");
const claudeVerdict = linkResolvesTo(claudeDoor, ROOT);
if (claudeVerdict === true) ok("door: Claude family + Goose", claudeDoor.replace(HOME, "~"));
else bad("door: Claude family + Goose", `${claudeDoor.replace(HOME, "~")} — ${claudeVerdict}. Run: bun installer/place-skills.mjs`);
if (claudeVerdict === true && !existsSync(join(ROOT, ".claude-plugin", "plugin.json")))
  bad("plugin manifest", "the link is there but .claude-plugin/plugin.json is not — measured: this door then loads NOTHING, silently");

const agentsDir = join(HOME, ".agents", "skills");
const missingAgentLinks = ids.filter((id) => linkResolvesTo(join(agentsDir, id), join(ROOT, "skills", id)) !== true);
if (ids.length > 0 && missingAgentLinks.length === 0) ok("door: Gemini / Codex / Goose", `${ids.length} links in ${agentsDir.replace(HOME, "~")}`);
else if (ids.length > 0)
  bad("door: Gemini / Codex / Goose", `${missingAgentLinks.length} of ${ids.length} missing or dangling in ${agentsDir.replace(HOME, "~")}: ${missingAgentLinks.join(", ")}. Run: bun installer/place-skills.mjs`);

// ── 3. Every SKILL.md still parses ───────────────────────────────────────────────────────────
// An unquoted `: ` inside a frontmatter `description` makes a host DROP the skill without a word —
// measured on the original, 12 linked and 11 discovered with every file present. A regex like
// /^description:\s*\S/ sails straight past it; it has to actually parse.
const unparsable = [];
for (const id of ids) {
  const text = await Bun.file(join(ROOT, "skills", id, "SKILL.md")).text();
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!front) {
    unparsable.push(`${id} (no front matter)`);
    continue;
  }
  try {
    const meta = Bun.YAML.parse(front[1]);
    if (!meta?.name || !meta?.description) unparsable.push(`${id} (missing name or description)`);
  } catch (error) {
    unparsable.push(`${id} (${error.message})`);
  }
}
if (ids.length > 0 && unparsable.length === 0) ok("skill front matter", `${ids.length} parse, each with a name and a description`);
else if (unparsable.length > 0) bad("skill front matter", `${unparsable.join("; ")} — a host drops these silently`);

// ── 4. The command line the hosts will actually spawn ────────────────────────────────────────
// Every render, probe and gate write in this toolchain goes through a `bun` command. A host that
// launches from the Dock does not inherit a login shell's PATH the way a terminal does.
async function which(cmd) {
  const proc = Bun.spawn(["/bin/sh", "-lc", `command -v ${cmd} || true`], { stdout: "pipe", stderr: "ignore" });
  const out = (await new Response(proc.stdout).text()).trim();
  await proc.exited;
  return out;
}
const bunPath = await which("bun");
if (bunPath) ok("bun on a login shell's PATH", bunPath);
else bad("bun on a login shell's PATH", "not found — every producer in this toolchain is a `bun` command, and a Dock-launched host would fail with `command not found: bun`");

// ── 5. A browser, for the three genres that need one ─────────────────────────────────────────
// Not a blocker, and deliberately so: a static chart never opens one. But web, video and every map
// bake do, and today nothing installs it and preflight does not look for it — so the failure lands
// mid-beat with a puppeteer stack trace instead of here, in one line, before anything is promised.
function findChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = process.env.PUPPETEER_CACHE_DIR ?? join(HOME, ".cache", "puppeteer", "chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  return candidates.find((p) => existsSync(p));
}
const chrome = findChrome();
if (chrome) ok("a browser to capture with", chrome);
else
  note(
    "a browser to capture with",
    "none found. Static chart beats are unaffected; web, video and every map beat need one. Run: bunx puppeteer browsers install chrome — or set CHROME_PATH",
  );

// ── 6. The last word belongs to preflight — asked about THIS ROOT's environment ──────────────
//
// `env: process.env` was the obvious thing to pass and it is wrong, measured here during this
// install: the doctor reported `capability: map — MapTiler answered 200` for a root that had NO
// `.env` FILE AT ALL. Bun populates `process.env` from the CURRENT DIRECTORY's `.env`, and the
// current directory happened to be an unrelated project that holds a MapTiler key. A journalist
// running this from inside any other checkout would be told their capabilities were open on
// somebody else's key.
//
// It matters more than a cosmetic mis-report, because it puts the doctor and the PRODUCERS into
// disagreement: `bake-plate.mjs` reads the key out of `<root>/.env` as a FILE (see
// `splash-root.mjs`), so it would fail with "no MAPTILER_KEY in <root>/.env" one phase after this
// said the capability was open. Same shape as the "one key, two homes" defect, seen from the other
// side. So the root's own file is the authority here, exactly as it is for a producer.
//
// Ambient values are still honoured — a CI run legitimately exports them — but never silently: a
// key that is only in the environment is reported as such, because a producer will not see it.
//
// SINCE 2026-08-10 THIS IS NO LONGER THE ONLY CALLER THAT KNOWS. `runPreflight` reads the root's
// `.env` itself and layers it over whatever `env` it is handed, because the rule living HERE, in a
// comment, is precisely how a model calling preflight from prose got it wrong on a real run and told
// a journalist a capability was closed that was open (`survey/codex-and-gemini-2026-08-10.md` §3.2).
// The merge below is now belt AND braces — it is kept because it is the truthful expression of what
// this command asks, not because preflight needs it.
//
// `parseEnvFile` and `resolveEnvKey` are both imported from the product's own `keys.mjs` rather than
// re-implemented here, for the reason this file's header already gives: two implementations of one
// rule is the divergence class this project has been bitten by.
const { resolveEnvKey, parseEnvFile } = await import(join(ROOT, "skills", "splash", "scripts", "keys.mjs"));
const envPath = join(ROOT, ".env");
const rootEnv = existsSync(envPath) ? parseEnvFile(await Bun.file(envPath).text()) : {};
if (existsSync(envPath)) ok("the root's .env", `${Object.keys(rootEnv).length} name(s) in ${envPath.replace(HOME, "~")}`);
else note("the root's .env", `absent — no key has been recorded in ${ROOT.replace(HOME, "~")} yet`);

const CANONICAL_KEYS = [
  "MAPTILER_KEY",
  "MAPTILER_DELIVERY_KEY",
  "DATAWRAPPER_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];
// Asked through `resolveEnvKey`, not by comparing the canonical names directly. A first pass did
// the latter and missed both MapTiler and Datawrapper: what was actually set in the environment was
// `VITE_MAPTILER_KEY`, an ALIAS the toolchain accepts. Re-implementing the alias table here would
// be a second copy of a rule that already exists, and it would have drifted on its first day.
for (const name of CANONICAL_KEYS) {
  if (resolveEnvKey(process.env, name) && !resolveEnvKey(rootEnv, name))
    note(
      `${name}: ambient only`,
      `resolvable from this shell's environment but NOT from ${envPath.replace(HOME, "~")}. The producers read the file, so they will not see it — record it with the configurator instead of exporting it.`,
    );
}

let preflightFailed = false;
try {
  const { runPreflight } = await import(join(ROOT, "skills", "splash", "scripts", "preflight.mjs"));
  const report = await runPreflight({ root: ROOT, env: { ...process.env, ...rootEnv }, fetchFn: fetch });
  for (const check of report.checks) {
    if (check.status === "pass" || check.status === "declined") ok(`preflight: ${check.id}`, check.detail);
    else bad(`preflight: ${check.id}`, check.detail);
  }
  for (const [id, cap] of Object.entries(report.capabilities)) {
    if (cap.available) ok(`capability: ${id}`, cap.reason);
    else note(`capability: ${id}`, `${cap.reason} — ${cap.opens} stay closed. ${cap.fill}`);
  }
  preflightFailed = !report.ready;
} catch (error) {
  bad("preflight", `could not run: ${error.message}`);
  preflightFailed = true;
}

const MARK = { ok: "  ok  ", bad: " FAIL ", note: " note " };
const width = Math.max(...rows.map((r) => r.what.length));
for (const r of rows) console.log(`${MARK[r.level]} ${r.what.padEnd(width)}  ${r.detail}`);

const failures = rows.filter((r) => r.level === "bad");
console.log(
  failures.length === 0
    ? `\nAll well. ${ids.length} skills wired, and preflight is ready.`
    : `\n${failures.length} problem(s). Reported, never worked around.`,
);
process.exit(failures.length > 0 || preflightFailed ? 1 : 0);
