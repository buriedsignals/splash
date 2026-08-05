#!/usr/bin/env bun
// Pre-release readiness gate for the public MIT push. This is NOT part of `bun run
// check` — it is EXPECTED to fail until the release prep is done. Run it before pushing
// the repo public:
//   bun run release:check
// Every check must be green (and `bun run check` too) before the repo goes public.
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

// 1. LICENSE present (the manifest declares MIT — shipping no license text grants nothing).
check("LICENSE present", existsSync("LICENSE"), "add an MIT LICENSE at the repo root");

// 2. Root README present (the public landing page).
check("README present", existsSync("README.md"), "add a root README");

// 3. Installer REPO_URL confirmed across ALL THREE files that hardcode it — the public page
//    generator AND both bootstraps. Keyed on the TODO marker, so it passes the moment the real
//    URL is set and every note is removed. Gating only commands.js let a green check ship
//    bootstraps still pointed at the placeholder repo, so every install 404s at download time.
const INSTALLER_SRC = [
  "docs/installer/commands.js",
  "install/bootstrap.sh",
  "install/bootstrap.ps1",
];
const marked = INSTALLER_SRC.filter(
  (f) =>
    existsSync(f) &&
    readFileSync(f, "utf8").includes("confirm before public release"),
);
check(
  "installer REPO_URL confirmed (page + both bootstraps)",
  marked.length === 0,
  `remove the \`confirm before public release\` note (and set the real public repo URL) in: ${marked.join(", ") || "(files missing)"}`,
);

// 3b. REF pinned to a released tag, not the moving `main`, in all three files — a public
//     install must reproduce a fixed release, not whatever `main` happens to be that day.
const refUnpinned = INSTALLER_SRC.filter((f) => {
  if (!existsSync(f)) return false;
  const s = readFileSync(f, "utf8");
  return (
    /REF\s*=\s*["']main["']/.test(s) || // commands.js: const REF = "main"
    /SPLASH_REF:-[^"']*main/.test(s) || // bootstrap.sh: "${SPLASH_REF:-main}"
    /\{\s*"main"\s*\}/.test(s) // bootstrap.ps1: else { "main" }
  );
});
check(
  "installer REF pinned to a release tag (not main)",
  refUnpinned.length === 0,
  `pin REF to a released tag (not \`main\`) in: ${refUnpinned.join(", ")}`,
);

// 4. No AI-session URL trailers in commit history (publication rule: no vendor attribution).
let trailerCount = -1;
try {
  trailerCount = Number(
    execSync("git log --format=%B | grep -cE '^[A-Za-z]+-Session:' || true", {
      encoding: "utf8",
      shell: "/bin/bash",
    }).trim(),
  );
} catch {
  trailerCount = -1;
}
check(
  "no session-URL commit trailers",
  trailerCount === 0,
  `${trailerCount} commit(s) carry a '<name>-Session:' trailer — run scripts/scrub-trailers.sh --yes on the release branch`,
);

// 4b. No assistant attribution in TRACKED FILES — the commit-trailer check above only reads
// commit messages, and the same leak lives in the tree. Measured 2026-08-04: one real session URL
// (https://claude.ai/code/session_…) sat in five plan files, and 91 files under docs/superpowers/
// state the no-attribution rule by quoting the very thing it forbids.
//
// WHY THIS IS A RELEASE CHECK AND NOT A ONE-OFF SWEEP: a sweep is true on the day it runs. The
// rule ("no vendor attribution in published artifacts") is absolute and permanent, so the only
// honest form is one that runs before every release.
//
// The pattern is deliberately narrow — ATTRIBUTION, not mention. "Claude Code" is a supported
// runtime with its own module, label and documentation; forbidding its name would forbid saying
// what the tool runs on. What is forbidden is a claim about WHO WROTE THIS: a session URL, a
// Co-Authored-By, a "generated with" badge.
//
// The checker EXCLUDES ITSELF, narrowly and by name: its own regex necessarily contains the
// patterns it hunts, so without this it reports itself forever and the check gets ignored — which
// is how a guard dies. (Second time in one day that prose written to explain a rule tripped the
// rule: an ordering test in bootstrap-ps1.test.ts matched its own comment. Match the ACT, and
// exclude the file whose job is to describe it.)
let attributionHits = [];
try {
  const out = execSync(
    "git grep -lE 'claude\\.ai/code/session_|Co-Authored-By: *(Claude|Anthropic)|Generated with \\[Claude|🤖 Generated' -- ':!node_modules' ':!scripts/preflight-release.mjs' || true",
    { encoding: "utf8", shell: "/bin/bash" },
  ).trim();
  attributionHits = out ? out.split("\n") : [];
} catch {
  attributionHits = ["<scan failed>"];
}
check(
  "no assistant attribution in tracked files",
  attributionHits.length === 0,
  `${attributionHits.length} file(s) carry a session URL or an authorship trailer: ${attributionHits.slice(0, 5).join(", ")}${attributionHits.length > 5 ? ", …" : ""}`,
);

// 5. .env is not tracked (never commit the secrets file).
let envTracked = true;
try {
  envTracked = execSync("git ls-files .env", { encoding: "utf8" }).trim().length > 0;
} catch {
  envTracked = false;
}
check(".env not committed", !envTracked, ".env is tracked — untrack it (it holds secrets)");

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.ok ? "" : `  — ${c.detail}`}`);
  if (!c.ok) failed++;
}
console.log(
  `\n${checks.length - failed}/${checks.length} release checks passed.` +
    (failed
      ? " NOT ready for the public MIT push."
      : " Release blockers clear — also confirm `bun run check` is green."),
);
process.exit(failed ? 1 : 0);
