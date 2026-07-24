import { test, expect } from "bun:test";
import { canonicalStringify, canonicalHash } from "./canonical-hash";

test("canonicalStringify is insensitive to key order", () => {
  const a = { b: 1, a: 2, nested: { y: 1, x: 2 } };
  const b = { a: 2, b: 1, nested: { x: 2, y: 1 } };
  expect(canonicalStringify(a)).toBe(canonicalStringify(b));
});

test("canonicalStringify preserves array order", () => {
  expect(canonicalStringify([3, 1, 2])).not.toBe(canonicalStringify([1, 2, 3]));
});

test("canonicalHash is a 32-char hex string", () => {
  expect(canonicalHash({ a: 1 })).toMatch(/^[0-9a-f]{32}$/);
});

test("canonicalHash equals for key-permuted equivalents", () => {
  expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
});
