import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ps = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.ps1"),
  "utf8",
);

test("installs Bun, Node (for Playwright), and Claude via native installers; no git", () => {
  expect(ps).toContain("bun.sh/install.ps1");
  expect(ps).toContain("OpenJS.NodeJS"); // Node for the Bun+Playwright hang workaround
  expect(ps).toContain("https://claude.ai/install.ps1");
  expect(ps).not.toContain("git clone");
});

test("acquires the repo by zip (Invoke-WebRequest + Expand-Archive)", () => {
  expect(ps).toContain("Invoke-WebRequest");
  expect(ps).toContain("Expand-Archive");
  expect(ps).toContain("/archive/");
});

test("writes .env from env vars, a .cmd launcher (never a .ps1), then scrubs secrets", () => {
  expect(ps).toContain("$($env:ANTHROPIC_API_KEY)");
  expect(ps).toContain("Launch Atelier.cmd");
  expect(ps).toContain("Remove-Item Env:");
});
