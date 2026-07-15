import { test, expect } from "bun:test";
import {
  installCommand,
  launcherContents,
  launcherFilename,
  bootstrapUrl,
} from "./commands.js";

test("mac install command is a key-free curl|bash of the sh bootstrap", () => {
  const c = installCommand("mac");
  expect(c).toBe(`curl -fsSL ${bootstrapUrl("mac")} | bash`);
  expect(c).toContain("/install/bootstrap.sh");
  expect(c).not.toMatch(/ANTHROPIC|MAPTILER|DATAWRAPPER|export |\$env:/);
});

test("windows install command is a key-free irm|iex of the ps1 bootstrap", () => {
  const c = installCommand("windows");
  expect(c).toBe(`irm ${bootstrapUrl("windows")} | iex`);
  expect(c).toContain("/install/bootstrap.ps1");
});

test("launchers are key-free, self-heal on mac, never a .ps1", () => {
  const mac = launcherContents("mac");
  const win = launcherContents("windows");
  expect(launcherFilename("mac")).toBe("splash-setup.command");
  expect(launcherFilename("windows")).toBe("splash-setup.cmd");
  expect(mac.startsWith("#!/usr/bin/env bash")).toBe(true);
  expect(mac).toContain("xattr -d com.apple.quarantine");
  expect(mac).toContain("curl -fsSL");
  expect(win).toContain("powershell -ExecutionPolicy Bypass");
  expect(win).toContain("| iex");
  expect(mac + win).not.toMatch(/ANTHROPIC|MAPTILER|DATAWRAPPER/);
  expect(launcherFilename("windows").endsWith(".ps1")).toBe(false);
});

test("bootstrapUrl points at the hosted bootstrap per OS", () => {
  expect(bootstrapUrl("mac")).toMatch(
    /raw\.githubusercontent\.com\/.+\/install\/bootstrap\.sh$/,
  );
  expect(bootstrapUrl("windows")).toMatch(/\/install\/bootstrap\.ps1$/);
});
