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

// 3. Installer REPO_URL confirmed — keyed on the TODO marker, so it passes the moment the
//    real public URL is set and the `confirm before public release` note is removed (the
//    org name may legitimately be the real one, so we do NOT match on the URL value).
const gen = existsSync("docs/installer/generate.js")
  ? readFileSync("docs/installer/generate.js", "utf8")
  : "";
check(
  "installer REPO_URL confirmed",
  gen !== "" && !gen.includes("confirm before public release"),
  "set the real public repo URL in docs/installer/generate.js and remove the `confirm before public release` note",
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
