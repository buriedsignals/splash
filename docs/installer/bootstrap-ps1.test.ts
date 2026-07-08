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

test("guards native-command failures (no silent Done on a failed install)", () => {
  expect(ps).toContain("$LASTEXITCODE");
  expect(ps).toMatch(/throw ".*Node\.js/);
});

test("matches the extracted archive dir by glob (survives a v-prefixed / slashed release tag)", () => {
  // GitHub strips a leading "v" and rewrites "/" in a tag's archive top-dir, so interpolating
  // "atelier-$Ref" would point at a nonexistent path once REF is pinned to a tag. Mirror the
  // bootstrap.sh glob instead.
  expect(ps).toMatch(/Get-ChildItem .*-Filter "atelier-\*"/);
  expect(ps).not.toContain('"atelier-$Ref"');
});
