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
    /SPLASH_REF:-[^"']*main/.test(s) || // bootstrap.sh: "${SPLASH_REF:-${ATELIER_REF:-main}}" (aliased)
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
