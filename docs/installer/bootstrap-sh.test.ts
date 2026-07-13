import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sh = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.sh"),
  "utf8",
);
const claudeModule = readFileSync(
  join(import.meta.dir, "../../install/runtimes/claude.sh"),
  "utf8",
);

test("bootstrap.sh is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode,
  ).toBe(0);
});

test("claude runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(claudeModule) })
      .exitCode,
  ).toBe(0);
});

test("installs Bun via its own installer, no Homebrew, no git", () => {
  expect(sh).toContain("https://bun.sh/install");
  expect(sh).not.toContain("brew");
  expect(sh).not.toContain("git clone");
});

test("dispatches runtime install + launch to a per-runtime module, never a hardcoded runtime", () => {
  // The runtime-specific install command and launch line live in install/runtimes/<name>.sh,
  // sourced by name — so adding a runtime is a new module file, not an edit to bootstrap.sh.
  expect(sh).toContain('. "$runtime_module"');
  expect(sh).toContain("runtime_install");
  expect(sh).toContain("$(runtime_launch_cmd)");
  // no hardcoded runtime binary/installer leaked back into the shared script
  expect(sh).not.toContain("claude.ai/install.sh");
  expect(sh).not.toContain("claude --plugin-dir");
});

test("claude module installs Claude via its own installer and launches with --plugin-dir", () => {
  expect(claudeModule).toContain("https://claude.ai/install.sh");
  expect(claudeModule).toContain("claude --plugin-dir .");
  expect(claudeModule).not.toContain("brew");
});

test("shares an ~/.agents/skills symlink helper that globs every skill (Codex/Gemini discovery)", () => {
  expect(sh).toContain("link_agents_skills");
  expect(sh).toContain(".agents/skills");
  expect(sh).toMatch(/for skill_dir in "\$DEST"\/skills\/\*\//); // globs, so a new skill is covered
});

test("runs the local configurator and does NOT write .env from caller env vars", () => {
  expect(sh).toContain("install/configurator.ts");
  expect(sh).not.toContain("ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY"); // no baked-key .env write
  expect(sh).toContain("Configuration was not completed"); // aborts if the configurator was closed
  // the configurator call must be guarded by the `if`, not a bare statement — otherwise
  // `set -euo pipefail` kills the script AT that line on a non-zero exit, and the
  // "re-run this installer" abort message below never runs (dead code under errexit).
  expect(sh).toMatch(
    /if ! \(\s*cd "\$DEST" && bun install\/configurator\.ts\s*\)/,
  );
});

test("acquires the repo by zip, installs the render engine, and makes a local launcher", () => {
  expect(sh).toContain("/archive/");
  expect(sh).toContain("playwright install chromium");
  expect(sh).toContain("Launch Atelier.command");
});

test("keeps stderr on dependency install and guards each step (no silent dead-stop)", () => {
  // The old `bun install >/dev/null 2>&1` swallowed the cause of a failed dep install under
  // `set -e`, leaving a half-finished install with no launcher and no diagnostic.
  expect(sh).not.toContain("bun install >/dev/null 2>&1");
  expect(sh).toContain("Dependency install failed");
  expect(sh).toContain("Playwright Chromium download failed");
});

test("skips the configurator on a re-run that already has a verified .env", () => {
  expect(sh).toMatch(
    /if \[ ! -f "\$DEST\/\.env" \] \|\| \[ "\$\{ATELIER_RECONFIGURE:-0\}" = "1" \]; then/,
  );
});
