import { test, expect } from "bun:test";
import { RUNTIMES } from "./runtimes.js";

test("registry lists all four v1 runtimes", () => {
  expect(Object.keys(RUNTIMES).sort()).toEqual([
    "claude",
    "codex",
    "gemini",
    "goose",
  ]);
});

test("only Claude Code is verified in v1", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(false);
  expect(RUNTIMES.gemini.verified).toBe(false);
  expect(RUNTIMES.goose.verified).toBe(false);
});

test("verified runtime carries every field the generator needs", () => {
  for (const key of [
    "installCmd",
    "bin",
    "keyLabel",
    "keyUrl",
    "keyEnv",
    "launch",
  ]) {
    expect(RUNTIMES.claude[key]).toBeTruthy();
  }
});
