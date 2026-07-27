import { test, expect } from "bun:test";
import { publishedSourceFor, SYNTHETIC_NOTICE } from "./furniture";

test("should compose a localized credit line for a public source", () => {
  const decl = {
    kind: "public" as const,
    label: "Office fédéral de la statistique",
    url: "https://www.bfs.admin.ch/asset/fr/32229771",
  };
  expect(publishedSourceFor(decl, "fr")).toEqual({
    credit: "Source : Office fédéral de la statistique",
    url: "https://www.bfs.admin.ch/asset/fr/32229771",
  });
  expect(publishedSourceFor(decl, "de").credit).toBe(
    "Quelle: Office fédéral de la statistique",
  );
  expect(publishedSourceFor(decl, "it").credit).toBe(
    "Fonte: Office fédéral de la statistique",
  );
  expect(publishedSourceFor(decl, undefined).credit).toBe(
    "Source: Office fédéral de la statistique",
  );
});

test("should credit a local source like any other named source", () => {
  expect(
    publishedSourceFor(
      { kind: "local", label: "Relevés communaux 2024" },
      "fr",
    ),
  ).toEqual({ credit: "Source : Relevés communaux 2024" });
});

test("should qualify a prose credit as figures quoted in the article", () => {
  const decl = { kind: "prose" as const, label: "Heidi.news" };
  expect(publishedSourceFor(decl, "fr").credit).toBe(
    "Source : Heidi.news (chiffres cités dans l'article)",
  );
  expect(publishedSourceFor(decl, "de").credit).toBe(
    "Quelle: Heidi.news (im Artikel genannte Zahlen)",
  );
  expect(publishedSourceFor(decl, "it").credit).toBe(
    "Fonte: Heidi.news (cifre citate nell'articolo)",
  );
  expect(publishedSourceFor(decl, "en").credit).toBe(
    "Source: Heidi.news (figures quoted in the article)",
  );
});

test("should put the demonstration notice inside the credit of a synthetic source", () => {
  // Belt AND braces: a renderer that only prints `credit` still prints the warning, so the
  // notice does not depend on anyone remembering to read an optional field.
  const published = publishedSourceFor(
    { kind: "synthetic", label: "Jeu de démonstration" },
    "fr",
  );
  expect(published.notice).toBe(SYNTHETIC_NOTICE.fr);
  expect(published.credit).toBe(
    `Source : Jeu de démonstration — ${SYNTHETIC_NOTICE.fr}`,
  );
});

test("should return an empty credit for a none source", () => {
  expect(publishedSourceFor({ kind: "none" }, "fr")).toEqual({ credit: "" });
});

test("should never carry an internal ref into the published source", () => {
  const published = publishedSourceFor(
    {
      kind: "private",
      label: "Données internes de la rédaction",
      internalRef: "//nas-redaction/salaires-internes-2024.csv",
    },
    "fr",
  );
  expect(published).toEqual({
    credit: "Source : Données internes de la rédaction",
  });
  expect(JSON.stringify(published)).not.toContain("nas-redaction");
});

test("should drop a url the kind does not publish", () => {
  // Defence in depth: the policy refuses this declaration outright, but furniture is also
  // called on already-validated data and must not become the way a forbidden field ships.
  const published = publishedSourceFor(
    {
      kind: "private",
      label: "Interne",
      url: "https://intranet.newsroom.local/x",
    },
    "fr",
  );
  expect(published.url).toBeUndefined();
});
