import { test, expect } from "bun:test";
import { assertNoPrivateLeak, publicSourceView } from "./redact";
import { SourceLedgerSchema } from "./kinds";

const LEDGER = SourceLedgerSchema.parse({
  mode: "real",
  data: {
    kind: "private",
    label: "Données internes de la rédaction",
    internalRef: "/Volumes/nas-redaction/enquetes/salaires-internes-2024.csv",
  },
  article: { kind: "prose", label: "Heidi.news" },
});

test("should build a public view that omits every internal reference", () => {
  const view = publicSourceView(LEDGER, "fr");
  if (!view.ok) throw new Error(view.message);
  expect(view.value.data?.credit).toBe(
    "Source : Données internes de la rédaction",
  );
  expect(view.value.article?.credit).toContain("Heidi.news");
  expect(JSON.stringify(view.value)).not.toContain("nas-redaction");
  expect(JSON.stringify(view.value)).not.toContain("salaires-internes-2024");
});

test("should refuse to build a public view of an invalid declaration", () => {
  const bad = SourceLedgerSchema.parse({
    data: { kind: "public", label: "OFS" },
  });
  const view = publicSourceView(bad, "fr");
  expect(view.ok).toBe(false);
  if (view.ok) throw new Error("unreachable");
  expect(view.code).toBe("missing-url");
});

test("should build an empty view when nothing is declared", () => {
  const view = publicSourceView(SourceLedgerSchema.parse({}), "fr");
  if (!view.ok) throw new Error(view.message);
  expect(view.value).toEqual({});
});

test("should throw when an export payload contains the internal reference", () => {
  expect(() =>
    assertNoPrivateLeak(
      {
        credit: "Source : Données internes",
        provenance:
          "/Volumes/nas-redaction/enquetes/salaires-internes-2024.csv",
      },
      LEDGER,
    ),
  ).toThrow(/private/i);
});

test("should throw when only the file name of an internal path survives", () => {
  // An export that copies just the basename leaks exactly as much.
  expect(() =>
    assertNoPrivateLeak("source: salaires-internes-2024.csv", LEDGER),
  ).toThrow(/salaires-internes-2024\.csv/);
});

test("should throw on a file url in the payload", () => {
  expect(() =>
    assertNoPrivateLeak({ href: "file:///Users/x/data.csv" }, LEDGER),
  ).toThrow(/file:\/\//);
});

test("should pass a payload that carries only the published credit", () => {
  expect(() =>
    assertNoPrivateLeak(
      { credit: "Source : Données internes de la rédaction" },
      LEDGER,
    ),
  ).not.toThrow();
});

test("should also redact the extra strings the caller declares private", () => {
  expect(() =>
    assertNoPrivateLeak({ path: "input/data-9f2c.csv" }, LEDGER, {
      alsoRedact: ["input/data-9f2c.csv"],
    }),
  ).toThrow(/input\/data-9f2c\.csv/);
});

test("should ignore a short path segment that would false-positive", () => {
  const ledger = SourceLedgerSchema.parse({
    data: { kind: "private", label: "Interne", internalRef: "/nas/q1.csv" },
  });
  // "q1.csv" is 6 characters, but the guard must not start flagging every payload that
  // happens to contain a common word — the full reference is still caught.
  expect(() => assertNoPrivateLeak({ quarter: "q1" }, ledger)).not.toThrow();
  expect(() => assertNoPrivateLeak({ p: "/nas/q1.csv" }, ledger)).toThrow();
});

test("should say verification was impossible rather than imply a leak", () => {
  // A payload that cannot be serialized cannot be checked. The guard must not answer that
  // silently (a caller would read "no throw" as "clean"), and must not answer it with a leak
  // message either (a caller would report a leak that is not there).
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  expect(() => assertNoPrivateLeak(circular, LEDGER)).toThrow(
    /cannot be inspected/,
  );
});
