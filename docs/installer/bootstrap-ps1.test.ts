import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ps = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.ps1"),
  "utf8",
);

test("installs Bun, Node (for Playwright), and Claude via native installers; no git", () => {
  expect(ps).toContain("bun.sh/install.ps1");
  expect(ps).toContain("OpenJS.NodeJS");
  expect(ps).toContain("https://claude.ai/install.ps1");
  expect(ps).not.toContain("git clone");
  // Existence-throw guard: a failed native Claude installer must not fall through silently.
  expect(ps).toContain("Claude Code could not be installed");
});

test("runs the local configurator and does NOT write .env from caller env vars", () => {
  expect(ps).toContain("install/configurator.ts");
  expect(ps).not.toContain("$($env:ANTHROPIC_API_KEY)"); // no baked-key .env write
  expect(ps).toContain("Configuration was not completed");
  // Robust abort guard: check both the configurator's exit code AND the .env file, so a
  // Ctrl-C out of the configurator (which doesn't necessarily propagate as a thrown error
  // under $ErrorActionPreference for native commands) is still caught.
  expect(ps).toContain("$LASTEXITCODE -ne 0");
});

test("acquires the repo by zip (glob-safe) and makes a .cmd launcher (never a .ps1)", () => {
  expect(ps).toContain("Invoke-WebRequest");
  expect(ps).toMatch(/Get-ChildItem .*-Filter "atelier-\*"/);
  expect(ps).toContain("Launch Atelier.cmd");
});
