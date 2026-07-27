import { test, expect } from "bun:test";
import { validateSourcePolicy } from "./policy";
import type { SourceDeclaration } from "./kinds";

function refusal(
  decl: SourceDeclaration | undefined,
  ctx?: Parameters<typeof validateSourcePolicy>[1],
): string {
  const r = validateSourcePolicy(decl, ctx);
  if (r.ok) throw new Error(`expected a refusal, got ${JSON.stringify(r)}`);
  return r.code;
}

function accepted(
  decl: SourceDeclaration,
  ctx?: Parameters<typeof validateSourcePolicy>[1],
) {
  const r = validateSourcePolicy(decl, ctx);
  if (!r.ok)
    throw new Error(`expected acceptance, got ${r.code}: ${r.message}`);
  return r.value;
}

test("should refuse an undeclared source rather than assuming one", () => {
  expect(refusal(undefined)).toBe("source-undeclared");
});

test("should refuse a public source without a url", () => {
  expect(refusal({ kind: "public", label: "OFS" })).toBe("missing-url");
});

test("should refuse a public source pointing at a homepage", () => {
  expect(
    refusal({ kind: "public", label: "OFS", url: "https://www.bfs.admin.ch" }),
  ).toBe("url-not-specific");
});

test("should refuse a url that is not a url at all", () => {
  expect(
    refusal({ kind: "public", label: "OFS", url: "the statistics office" }),
  ).toBe("url-not-specific");
});

test("should accept a public source with a dataset url", () => {
  const v = accepted({
    kind: "public",
    label: "OFS",
    url: "https://www.bfs.admin.ch/asset/fr/32229771",
  });
  expect(v.published.url).toBe("https://www.bfs.admin.ch/asset/fr/32229771");
  expect(v.published.credit).toContain("OFS");
});

test("should refuse any source without a display label", () => {
  expect(refusal({ kind: "local" })).toBe("missing-label");
  expect(refusal({ kind: "private", label: "   " })).toBe("missing-label");
});

test("should accept a local source with no url at all", () => {
  // The exact case issue #7 opens with: no URL exists, and that is not an omission.
  const v = accepted({ kind: "local", label: "Relevés communaux 2024" });
  expect(v.published.url).toBeUndefined();
  expect(v.requirements.url).toBe("optional");
});

test("should refuse a local url that is only a portal homepage", () => {
  expect(
    refusal({
      kind: "local",
      label: "Relevés",
      url: "https://data.geneve.ch/",
    }),
  ).toBe("url-not-specific");
});

test("should accept a private source and publish only its display label", () => {
  const v = accepted({
    kind: "private",
    label: "Données internes",
    internalRef: "//nas/salaires.csv",
  });
  expect(JSON.stringify(v.published)).not.toContain("nas");
});

test("should refuse a private source carrying a publishable url", () => {
  expect(
    refusal({
      kind: "private",
      label: "Interne",
      url: "https://intranet.newsroom.ch/data/1",
    }),
  ).toBe("url-not-allowed");
});

test("should refuse an internal ref on a kind that keeps none", () => {
  expect(
    refusal({ kind: "local", label: "Relevés", internalRef: "/nas/x.csv" }),
  ).toBe("internal-ref-not-allowed");
});

test("should refuse synthetic in a real run", () => {
  expect(refusal({ kind: "synthetic", label: "Démo" })).toBe(
    "synthetic-in-real-run",
  );
  expect(refusal({ kind: "synthetic", label: "Démo" }, { mode: "real" })).toBe(
    "synthetic-in-real-run",
  );
});

test("should accept synthetic in a test run and mark it visibly", () => {
  const v = accepted({ kind: "synthetic", label: "Démo" }, { mode: "test" });
  expect(v.published.notice).toBeTruthy();
  expect(v.published.credit).toContain(v.published.notice!);
});

test("should accept prose and mark its figures as verbatim only", () => {
  const v = accepted({ kind: "prose", label: "Heidi.news" });
  expect(v.requirements.figures).toBe("verbatim");
  expect(v.published.credit).toContain("figures quoted in the article");
});

test("should not let an article url upgrade a prose source to public", () => {
  const v = accepted({
    kind: "prose",
    label: "Heidi.news",
    url: "https://www.heidi.news/articles/annemasse",
  });
  expect(v.kind).toBe("prose");
  expect(v.requirements.figures).toBe("verbatim");
});

test("should refuse none when the visual carries factual data", () => {
  expect(refusal({ kind: "none" })).toBe("source-required");
  expect(refusal({ kind: "none" }, { carriesFactualData: true })).toBe(
    "source-required",
  );
});

test("should accept none for a visual with no factual data", () => {
  const v = accepted({ kind: "none" }, { carriesFactualData: false });
  expect(v.published.credit).toBe("");
});

test("should refuse a label on a none source", () => {
  expect(
    refusal(
      { kind: "none", label: "Rédaction" },
      { carriesFactualData: false },
    ),
  ).toBe("label-not-allowed");
});

test("should report the missing field before the run mode", () => {
  // Deterministic refusal order: a malformed declaration is named for what is malformed,
  // not for the mode it happens to sit in.
  expect(refusal({ kind: "synthetic" }, { mode: "real" })).toBe(
    "missing-label",
  );
});
