import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sh = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.sh"),
  "utf8",
);

test("bootstrap.sh is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode,
  ).toBe(0);
});

test("installs Bun and Claude via their own installers, no Homebrew, no git", () => {
  expect(sh).toContain("https://bun.sh/install");
  expect(sh).toContain("https://claude.ai/install.sh");
  expect(sh).not.toContain("brew");
  expect(sh).not.toContain("git clone");
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
