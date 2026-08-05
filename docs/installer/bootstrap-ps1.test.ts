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

// WINDOWS PAYLOAD PARITY (registry E10/B6, closed POSIX-only on 2026-08-04).
//
// The POSIX installer packages what a host receives, installs its dependencies ABOVE the skill
// directories, and junctions the PACKAGED tree. The PowerShell one did none of that: it linked
// `$Dest\skills` — the engine itself, 20 640 files for map-native alone — so a Windows newsroom
// got exactly the payload that makes `load_skill` overflow and `SKILL.md` never reach the model.
// The two halves of E10 were one measurement and one installer apart.
//
// Asserted at the STRING level, as every other Windows test here is: there is no PowerShell on
// the machine that runs this suite, so what can be proven is that the shipped script says the
// right thing — the same standard the rest of this file already holds itself to.
test("packages the payload before anything links it, exactly as the POSIX installer does", () => {
  expect(ps).toContain("bun run pack-skills");
  // Ordering is the whole point: Link-AgentsSkills globs the packaged tree, so packaging must
  // happen BEFORE the runtime module runs. A correct pair of steps in the wrong order ships the
  // engine anyway, and nothing would say so.
  // Matched on the CALL — a line that is nothing but `Runtime-Install` — not on the name, which
  // also appears in the comment explaining why the order matters. The first version of this
  // assertion found that comment and failed on correct code, which is how an ordering guard turns
  // into noise nobody trusts.
  const callIndex = ps.search(/^Runtime-Install\s*$/m);
  expect(callIndex).toBeGreaterThan(0);
  expect(ps.indexOf("bun run pack-skills")).toBeLessThan(callIndex);
});

test("junctions the PACKAGED skills, never the engine tree", () => {
  expect(ps).toContain(".dist\\skills");
  // The pre-packaging glob is gone: linking `$Dest\skills` is what shipped the engine.
  expect(ps).not.toMatch(
    /Get-ChildItem \(Join-Path \$Dest "skills"\) -Directory/,
  );
});

test("installs the packaged tree's dependencies ONCE, above the skills, not per engine", () => {
  // Above the skill directories is where Bun resolves them and no host walks — that placement is
  // the reason the payload stays small, not an optimisation.
  expect(ps).toMatch(/Join-Path \$Dest "\.dist"/);
  expect(ps).not.toContain(
    '$NativeSkills = @("skills\\chart-native", "skills\\map-native")',
  );
});

test("downloads Chromium from the packaged chart-native, so the browser lands for the delivered tree", () => {
  expect(ps).toContain(".dist\\skills\\chart-native");
});

// The page measures the tree; the tree must therefore exist. Packaging and installing after the
// page is what made it report four healthy engines as missing on every real install. The browser
// download is part of that same tree — chart-native/map-native's readiness probe is a filesystem
// stat for the extracted Playwright browser — so it must land before the page too, not just
// pack-skills; a script that moved only the packaging call back after the page would still fail
// this test via the chromium leg.
test("packages and installs BEFORE opening the setup page", () => {
  const pack = ps.indexOf("bun run pack-skills");
  const chromium = ps.indexOf("playwright install chromium");
  const page = ps.indexOf("bun install/configurator.ts");
  const runtime = ps.indexOf("bun install/read-runtime.ts");
  expect(pack).toBeGreaterThan(0);
  expect(chromium).toBeGreaterThan(pack);
  expect(page).toBeGreaterThan(chromium);
  // The runtime module is chosen BY the page, so it still comes after it.
  expect(runtime).toBeGreaterThan(page);
});
