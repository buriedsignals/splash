import { test, expect } from "bun:test";
import {
  generateCopyPaste,
  generateLauncher,
  launcherFilename,
  bootstrapUrl,
} from "./generate.js";

const base = {
  runtime: "claude",
  keys: { ai: "sk-ant-TEST", maptiler: "MT-TEST", datawrapper: "DW-TEST" },
  embed: {},
};

test("throws on an unverified runtime", () => {
  expect(() =>
    generateCopyPaste({ ...base, os: "mac", runtime: "goose" }),
  ).toThrow(/not yet available/);
});
test("throws on an unknown runtime", () => {
  expect(() =>
    generateCopyPaste({ ...base, os: "mac", runtime: "nope" }),
  ).toThrow(/unknown runtime/);
});

test("mac copy-paste exports every key then curl|bash the sh bootstrap", () => {
  const s = generateCopyPaste({ ...base, os: "mac" });
  expect(s).toContain("export ANTHROPIC_API_KEY='sk-ant-TEST'");
  expect(s).toContain("export VITE_MAPTILER_KEY='MT-TEST'");
  expect(s).toContain("export REMOTION_MAPTILER_KEY='MT-TEST'");
  expect(s).toContain("export DATAWRAPPER_API_TOKEN='DW-TEST'");
  expect(s).toContain("curl -fsSL");
  expect(s).toContain("/install/bootstrap.sh");
  expect(s.trimEnd().endsWith("| bash")).toBe(true);
});

test("windows copy-paste sets every key then irm|iex the ps1 bootstrap", () => {
  const s = generateCopyPaste({ ...base, os: "windows" });
  expect(s).toContain("$env:ANTHROPIC_API_KEY='sk-ant-TEST'");
  expect(s).toContain("$env:DATAWRAPPER_API_TOKEN='DW-TEST'");
  expect(s).toContain("/install/bootstrap.ps1");
  expect(s.trimEnd().endsWith("| iex")).toBe(true);
});

test("copy-paste NEVER inlines install logic — only keys + a fetch", () => {
  const s = generateCopyPaste({ ...base, os: "mac" });
  expect(s).not.toContain("bun install");
  expect(s).not.toContain("playwright");
  expect(s).not.toContain("git clone");
});

test("mac launcher .command self-heals quarantine and is valid bash", () => {
  const { filename, contents } = generateLauncher({ ...base, os: "mac" });
  expect(filename).toBe("atelier-setup.command");
  expect(contents).toContain("xattr -d com.apple.quarantine");
  expect(contents.startsWith("#!/usr/bin/env bash")).toBe(true);
  const proc = Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(contents) });
  expect(proc.exitCode).toBe(0);
});

test("windows launcher .cmd wraps PowerShell with ExecutionPolicy Bypass, never a .ps1", () => {
  const { filename, contents } = generateLauncher({ ...base, os: "windows" });
  expect(filename).toBe("atelier-setup.cmd");
  expect(contents).toContain('set "ANTHROPIC_API_KEY=sk-ant-TEST"');
  expect(contents).toContain("powershell -ExecutionPolicy Bypass -Command");
  expect(contents).toContain("| iex");
  expect(filename.endsWith(".ps1")).toBe(false);
});

test("bootstrapUrl points at the raw hosted bootstrap per OS", () => {
  expect(bootstrapUrl("mac")).toMatch(
    /raw\.githubusercontent\.com\/.+\/install\/bootstrap\.sh$/,
  );
  expect(bootstrapUrl("windows")).toMatch(
    /raw\.githubusercontent\.com\/.+\/install\/bootstrap\.ps1$/,
  );
});

test("optional embed keys are carried when provided", () => {
  const s = generateCopyPaste({
    ...base,
    os: "mac",
    embed: { app: "myroom-embeds", flyToken: "FLY-TEST" },
  });
  expect(s).toContain("export ATELIER_EMBED_APP='myroom-embeds'");
  expect(s).toContain("export FLY_API_TOKEN='FLY-TEST'");
});
