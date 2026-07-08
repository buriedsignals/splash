import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sh = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.sh"),
  "utf8",
);

test("bootstrap.sh is valid bash", () => {
  const proc = Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) });
  expect(proc.exitCode).toBe(0);
});

test("installs Bun and Claude via their own installers, no Homebrew, no git", () => {
  expect(sh).toContain("https://bun.sh/install");
  expect(sh).toContain("https://claude.ai/install.sh");
  expect(sh).not.toContain("brew");
  expect(sh).not.toContain("git clone");
});

test("acquires the repo by zip and installs the render engine", () => {
  expect(sh).toContain("/archive/");
  expect(sh).toContain("playwright install chromium");
});

test("writes .env from env vars and a local double-click launcher, then scrubs secrets", () => {
  expect(sh).toContain("ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}");
  expect(sh).toContain("Launch Atelier.command");
  expect(sh).toContain("unset ANTHROPIC_API_KEY");
});
