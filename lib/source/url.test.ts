import { test, expect } from "bun:test";
import { isSpecificSourceUrl, sourceUrlVerdict } from "./url";

test("should accept a dataset page url", () => {
  expect(sourceUrlVerdict("https://www.bfs.admin.ch/asset/fr/32229771")).toBe(
    "specific",
  );
  expect(
    isSpecificSourceUrl("https://www.bfs.admin.ch/asset/fr/32229771"),
  ).toBe(true);
});

test("should reject a bare homepage as not specific", () => {
  expect(sourceUrlVerdict("https://www.bfs.admin.ch")).toBe("not-specific");
});

test("should reject a trailing-slash root as not specific", () => {
  expect(sourceUrlVerdict("https://www.bfs.admin.ch/")).toBe("not-specific");
});

test("should accept a query-only url as specific", () => {
  // A portal that addresses its datasets by query string still points at ONE dataset.
  expect(
    sourceUrlVerdict("https://data.geneve.ch/?dataset=salaires-2024"),
  ).toBe("specific");
});

test("should reject http, file and placeholder hosts as not a url", () => {
  for (const u of [
    "http://www.bfs.admin.ch/asset/1",
    "file:///Users/newsroom/salaires.csv",
    "https://localhost/dataset/1",
    "https://example.com/dataset/1",
    "https://placeholder.org/x",
    "not a url at all",
    "",
  ])
    expect(sourceUrlVerdict(u)).toBe("not-a-url");
});

test("should ignore surrounding whitespace", () => {
  expect(sourceUrlVerdict("  https://ourworldindata.org/energy  ")).toBe(
    "specific",
  );
});

test("should treat a fragment-only url as not specific", () => {
  // "the site, somewhere near this anchor" is exactly the half-truth the rule exists for.
  expect(sourceUrlVerdict("https://www.bfs.admin.ch/#data")).toBe(
    "not-specific",
  );
});
