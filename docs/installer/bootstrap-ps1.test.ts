import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ps = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.ps1"),
  "utf8",
);
const claudeModule = readFileSync(
  join(import.meta.dir, "../../install/runtimes/claude.ps1"),
  "utf8",
);

test("installs Bun and Node (for Playwright) via native installers; no git", () => {
  expect(ps).toContain("bun.sh/install.ps1");
  expect(ps).toContain("OpenJS.NodeJS");
  expect(ps).not.toContain("git clone");
});

test("dispatches runtime install + launch to a per-runtime module, never a hardcoded runtime", () => {
  expect(ps).toContain(". $runtimeModule");
  expect(ps).toContain("Runtime-Install");
  expect(ps).toContain("Runtime-LaunchCmd");
  expect(ps).not.toContain("claude.ai/install.ps1");
  expect(ps).not.toContain("claude --plugin-dir");
});

test("claude module installs Claude, guards the install, and launches with --plugin-dir", () => {
  expect(claudeModule).toContain("https://claude.ai/install.ps1");
  // Existence-throw guard: a failed native Claude installer must not fall through silently.
  expect(claudeModule).toContain("Claude Code could not be installed");
  expect(claudeModule).toContain("claude --plugin-dir .");
  // claude.ai/install.ps1 updates only the PERSISTENT PATH; without this the very next
  // Get-Command claude fails in-session and the script throws before creating the launcher.
  expect(claudeModule).toContain('$env:PATH = "$HOME\\.local\\bin;$env:PATH"');
});

test("shares an ~\\.agents\\skills junction helper for Codex/Gemini discovery", () => {
  expect(ps).toContain("Link-AgentsSkills");
  expect(ps).toContain(".agents\\skills");
  expect(ps).toContain("mklink /J");
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
  expect(ps).toMatch(/Get-ChildItem .*-Filter "splash-\*"/);
  expect(ps).toContain("Launch Splash.cmd");
});

test("guards winget so an absent winget falls through to the friendly Node guidance", () => {
  expect(ps).toContain("Get-Command winget");
});

test("launcher strips the quotes the configurator now writes around .env values", () => {
  expect(ps).toContain('set "%%a=%%~b"');
});

test("Link-AgentsSkills junctions only directories that carry a SKILL.md", () => {
  // Mirror of the bash guard in bootstrap.sh's link_agents_skills — no pwsh on this platform, so
  // parity is asserted at the string level. A host silently ignores a directory without a
  // SKILL.md, so junctioning one inflates the link count while the host discovers one fewer skill
  // (measured on Goose Desktop: 12 linked, 11 discovered). Skip it and the two counts agree.
  expect(ps).toMatch(
    /if \(-not \(Test-Path \(Join-Path \$skillDir\.FullName "SKILL\.md"\)\)\) \{ continue \}/,
  );
});

test("Link-AgentsSkills removes a dead junction before linking (a rename must not leave a host blind)", () => {
  // A renamed or moved source tree leaves a junction that EXISTS but resolves to nothing —
  // mirrors the bash sweep in bootstrap.sh's link_agents_skills. Test-Path follows the reparse
  // point and reports false for a dead one, same distinction as bash's `[ ! -e ]`.
  expect(ps).toContain("ReparsePoint");
  expect(ps).toMatch(
    /if \(\$isReparse -and -not \(Test-Path \$existing\.FullName\)\) \{\s*\n\s*Remove-Item \$existing\.FullName -Recurse -Force/,
  );
});
