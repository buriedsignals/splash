import { test, expect } from "bun:test";
import { isAbsolute } from "node:path";
import { FLUE_VERB_ADAPTER, HARNESS_ROOT } from "../src/lib/roles.ts";

test("HARNESS_ROOT is absolute (cwd-independent script execution)", () => {
  expect(isAbsolute(HARNESS_ROOT)).toBe(true);
});

test("adapter maps every abstract verb the splash skills use", () => {
  for (const verb of [
    "execute-shell",
    "read-file",
    "write-file",
    "invoke-skill",
  ]) {
    expect(FLUE_VERB_ADAPTER).toContain(verb);
  }
});

test("adapter injects the absolute harness root so produce.mjs runs cwd-independent", () => {
  expect(FLUE_VERB_ADAPTER).toContain(HARNESS_ROOT);
  expect(FLUE_VERB_ADAPTER).toContain("produce.mjs");
});

test("slice 1 has no delegation — adapter must NOT expose spawn-agent/task", () => {
  expect(FLUE_VERB_ADAPTER).not.toContain("spawn-agent");
});
