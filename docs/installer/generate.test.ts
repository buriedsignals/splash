import { test, expect } from "bun:test";
import { generateScript, scriptFilename } from "./generate.js";

const base = {
  runtime: "claude",
  keys: { ai: "sk-ant-TEST", maptiler: "MT-TEST", datawrapper: "DW-TEST" },
  embed: {},
};

test("filename is the macOS double-click command file", () => {
  expect(scriptFilename()).toBe("atelier-setup.command");
});

test("throws on an unverified runtime", () => {
  expect(() => generateScript({ ...base, runtime: "goose" })).toThrow(
    /not yet available/,
  );
});

test("throws on an unknown runtime", () => {
  expect(() => generateScript({ ...base, runtime: "nope" })).toThrow(
    /unknown runtime/,
  );
});

test("bakes every key into the script", () => {
  const s = generateScript(base);
  expect(s).toContain("ANTHROPIC_API_KEY=sk-ant-TEST");
  expect(s).toContain("VITE_MAPTILER_KEY=MT-TEST");
  expect(s).toContain("REMOTION_MAPTILER_KEY=MT-TEST");
  expect(s).toContain("DATAWRAPPER_API_TOKEN=DW-TEST");
});

test("includes install steps and the launch instruction", () => {
  const s = generateScript(base);
  expect(s).toContain("curl -fsSL https://claude.ai/install.sh | bash");
  expect(s).toContain("git clone");
  expect(s).toContain("cd ~/Atelier && claude --plugin-dir .");
  expect(s.startsWith("#!/bin/bash")).toBe(true);
  expect(s).toContain("Delete this file"); // security self-warning
});

test("the generated script is valid bash", () => {
  const s = generateScript(base);
  const proc = Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(s) });
  expect(proc.exitCode).toBe(0);
});
