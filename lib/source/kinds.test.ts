import { test, expect } from "bun:test";
import {
  SOURCE_KINDS,
  RUN_MODES,
  SourceDeclarationSchema,
  SourceLedgerSchema,
} from "./kinds";

test("should list exactly the six source kinds of issue #7", () => {
  expect([...SOURCE_KINDS]).toEqual([
    "public",
    "local",
    "private",
    "synthetic",
    "prose",
    "none",
  ]);
  expect([...RUN_MODES]).toEqual(["real", "test"]);
});

test("should parse a minimal declaration", () => {
  expect(
    SourceDeclarationSchema.parse({ kind: "local", label: "Relevés" }),
  ).toEqual({ kind: "local", label: "Relevés" });
});

test("should reject an unknown field on a declaration", () => {
  expect(() =>
    SourceDeclarationSchema.parse({ kind: "public", name: "OFS" }),
  ).toThrow();
});

test("should reject a kind outside the vocabulary", () => {
  expect(() => SourceDeclarationSchema.parse({ kind: "scraped" })).toThrow();
});

test("should default a ledger mode to real", () => {
  expect(SourceLedgerSchema.parse({}).mode).toBe("real");
});

test("should reject an unknown run mode", () => {
  expect(() => SourceLedgerSchema.parse({ mode: "demo" })).toThrow();
});

test("should reject an unknown input slot on a ledger", () => {
  expect(() =>
    SourceLedgerSchema.parse({ notes: { kind: "prose", label: "x" } }),
  ).toThrow();
});
