import { test, expect } from "bun:test";
import { assertSourceLedger, sourceQuestion } from "./policy";
import { SourceLedgerSchema } from "./kinds";

const FROZEN = { data: true, article: true };
const ledger = (raw: unknown) => SourceLedgerSchema.parse(raw);

test("should ask for the source kind first when nothing is declared", () => {
  expect(sourceQuestion(undefined)).toContain("Where does this data come from");
  expect(sourceQuestion({})).toContain("Where does this data come from");
});

test("should ask only for the missing required field once the kind is known", () => {
  expect(sourceQuestion({ kind: "public" })).toMatch(/credited/);
  expect(sourceQuestion({ kind: "public", label: "OFS" })).toMatch(/URL/);
});

test("should ask nothing when the declaration is complete", () => {
  expect(sourceQuestion({ kind: "local", label: "Relevés" })).toBeNull();
  expect(
    sourceQuestion({
      kind: "public",
      label: "OFS",
      url: "https://www.bfs.admin.ch/asset/fr/1",
    }),
  ).toBeNull();
});

test("should ask about a url that points at a site rather than a document", () => {
  expect(
    sourceQuestion({
      kind: "local",
      label: "Relevés",
      url: "https://data.geneve.ch",
    }),
  ).toMatch(/points at a site/);
});

test("should fall back to the kind question when the kind is not one we know", () => {
  // A partial declaration reaches this from a half-parsed answer; TypeScript does not guard a
  // value that arrived as JSON. Asking again beats reading a requirements row that is not there.
  expect(
    sourceQuestion({ kind: "scraped" as never, label: "x" }),
  ).toContain("Where does this data come from");
});

test("should accept a ledger with no declaration at all", () => {
  // Nothing declared yet is not the same as something invalid: a run declares its sources when
  // it knows them, and the manifest must stay writable before that.
  expect(() => assertSourceLedger(ledger({}), FROZEN)).not.toThrow();
});

test("should accept a fully declared ledger", () => {
  expect(() =>
    assertSourceLedger(
      ledger({
        data: { kind: "local", label: "Relevés communaux 2024" },
        article: { kind: "prose", label: "Heidi.news" },
      }),
      FROZEN,
    ),
  ).not.toThrow();
});

test("should refuse a ledger whose local input was never frozen", () => {
  expect(() =>
    assertSourceLedger(ledger({ data: { kind: "local", label: "Relevés" } }), {
      data: false,
      article: false,
    }),
  ).toThrow(/no data input is frozen/);
});

test("should refuse a ledger that classes a frozen data input as none", () => {
  expect(() =>
    assertSourceLedger(ledger({ data: { kind: "none" } }), FROZEN),
  ).toThrow(/factual data/);
});

test("should accept none on the article slot", () => {
  expect(() =>
    assertSourceLedger(ledger({ article: { kind: "none" } }), FROZEN),
  ).not.toThrow();
});

test("should refuse a synthetic ledger in a real run", () => {
  expect(() =>
    assertSourceLedger(
      ledger({ mode: "real", data: { kind: "synthetic", label: "Démo" } }),
      FROZEN,
    ),
  ).toThrow(/synthetic-in-real-run/);
});

test("should accept a synthetic ledger in a test run", () => {
  expect(() =>
    assertSourceLedger(
      ledger({ mode: "test", data: { kind: "synthetic", label: "Démo" } }),
      FROZEN,
    ),
  ).not.toThrow();
});

test("should name the slot and the policy code it refused on", () => {
  expect(() =>
    assertSourceLedger(
      ledger({ data: { kind: "public", label: "OFS" } }),
      FROZEN,
    ),
  ).toThrow(/data source is invalid \(missing-url\)/);
});
