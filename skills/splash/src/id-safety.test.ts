import { test, expect } from "bun:test";
import { assertSafeId, isSafeId } from "./id-safety.ts";

test("accepts a normal slug id unchanged", () => {
  expect(() => assertSafeId("rents-2026")).not.toThrow();
  expect(() => assertSafeId("chart_1")).not.toThrow();
  expect(() => assertSafeId("A")).not.toThrow();
  expect(isSafeId("rents-2026")).toBe(true);
});

test("rejects a parent-traversal id", () => {
  expect(() => assertSafeId("../../evil")).toThrow(/not a safe slug/i);
  expect(isSafeId("../../evil")).toBe(false);
});

test("rejects an absolute path id", () => {
  expect(() => assertSafeId("/etc")).toThrow(/not a safe slug/i);
});

test("rejects an id with a path separator", () => {
  expect(() => assertSafeId("a/b")).toThrow(/not a safe slug/i);
  expect(() => assertSafeId("a\\b")).toThrow(/not a safe slug/i);
});

test("rejects a bare '..' segment", () => {
  expect(() => assertSafeId("..")).toThrow(/not a safe slug/i);
});

test("rejects an empty or whitespace id", () => {
  expect(() => assertSafeId("")).toThrow(/not a safe slug/i);
  expect(() => assertSafeId("   ")).toThrow(/not a safe slug/i);
});

test("rejects a non-string id", () => {
  expect(() => assertSafeId(undefined as unknown as string)).toThrow(
    /not a safe slug/i,
  );
  expect(() => assertSafeId(42 as unknown as string)).toThrow(
    /not a safe slug/i,
  );
});

test("rejects an over-long id", () => {
  expect(() => assertSafeId("a".repeat(129))).toThrow(/not a safe slug/i);
  expect(() => assertSafeId("a".repeat(128))).not.toThrow();
});

test("rejects a dot-only or dot-leading traversal-adjacent id with separators", () => {
  expect(() => assertSafeId("./x")).toThrow(/not a safe slug/i);
  expect(() => assertSafeId("x/../y")).toThrow(/not a safe slug/i);
});

test("the error names the offending id so a journalist can fix it", () => {
  expect(() => assertSafeId("../../evil")).toThrow(/\.\.\/\.\.\/evil/);
});
