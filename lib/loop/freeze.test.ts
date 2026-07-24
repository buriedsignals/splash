import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";

function runDir(): string {
  return mkdtempSync(join(tmpdir(), "loop-freeze-"));
}

test("freezeInput copies the file under <runDir>/input and returns a relative path", () => {
  const dir = runDir();
  const src = join(dir, "external.csv");
  writeFileSync(src, "a,b\n1,2");
  const ref = freezeInput(dir, src, "data");
  expect(ref.path.startsWith("input/")).toBe(true);
  expect(existsSync(join(dir, ref.path))).toBe(true);
  expect(readFileSync(join(dir, ref.path), "utf8")).toBe("a,b\n1,2");
});

test("freezeInput returns a 64-char sha256 of the content", () => {
  const dir = runDir();
  const src = join(dir, "e.csv");
  writeFileSync(src, "a,b\n1,2");
  expect(freezeInput(dir, src, "data").sha256).toMatch(/^[0-9a-f]{64}$/);
});

test("freezeInput is idempotent by content (same bytes → same frozen path)", () => {
  const dir = runDir();
  const src = join(dir, "e.csv");
  writeFileSync(src, "a,b\n1,2");
  const first = freezeInput(dir, src, "data");
  const second = freezeInput(dir, src, "data");
  expect(second.path).toBe(first.path);
  expect(second.sha256).toBe(first.sha256);
});

test("freezeInput throws when the source file is missing", () => {
  const dir = runDir();
  expect(() => freezeInput(dir, join(dir, "nope.csv"), "data")).toThrow();
});
