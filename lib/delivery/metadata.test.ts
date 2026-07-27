import { describe, it, expect } from "bun:test";
import { deliveryMetadata } from "./metadata";
import type { RunElement } from "../loop/manifest";

const EL: RunElement = {
  id: "e1",
  angle: {
    confirmedTakeaway: "Les primes montent partout",
    altInsight: "Toutes les courbes cantonales montent depuis 2010",
    unit: "CHF",
  },
};

describe("deliveryMetadata", () => {
  it("should take the title from the confirmed takeaway and the alt text from the alt insight", () => {
    const r = deliveryMetadata(EL, { source: "OFSP", lang: "fr" }, {});
    expect(r).toMatchObject({
      ok: true,
      value: {
        title: "Les primes montent partout",
        altText: "Toutes les courbes cantonales montent depuis 2010",
        source: "OFSP",
        lang: "fr",
      },
    });
  });

  it("should refuse an element with no angle rather than invent one", () => {
    const r = deliveryMetadata({ id: "e1" }, {}, {});
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should refuse a blank alt text, so the engines' WCAG refusal survives packaging", () => {
    const r = deliveryMetadata(
      { ...EL, angle: { ...EL.angle!, altInsight: "   " } },
      {},
      {},
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("alt");
  });

  it("should refuse a blank confirmed takeaway rather than publish an empty title", () => {
    const r = deliveryMetadata(
      { ...EL, angle: { ...EL.angle!, confirmedTakeaway: "   " } },
      {},
      {},
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("takeaway");
  });

  it("should fall back to neutral source, credit and English when the profile says nothing", () => {
    const r = deliveryMetadata(EL, {}, {});
    expect(r).toMatchObject({
      ok: true,
      value: { source: "Provided by the newsroom", credit: "", lang: "en" },
    });
  });

  it("should carry the newsroom's sizing rules through unchanged", () => {
    const r = deliveryMetadata(EL, {}, { width: 640, height: "responsive" });
    expect(r).toMatchObject({
      ok: true,
      value: { width: 640, height: "responsive" },
    });
  });
});

// --- the declared source ledger wins over the newsroom profile ---------------------------
//
// `profile.source` was the SECOND fabricated attribution in the codebase (the first was
// produce.ts's hard-coded placeholder): the newsroom's own name, read off NEWSROOM-PROFILE.md,
// standing in as the source of the DATA. A newsroom is the author of a visual, not the origin
// of the figures — that is `credit`. Once the run declares its sources (lib/source), the ledger
// is the only thing allowed to answer "where did this come from".
describe("deliveryMetadata × the source ledger", () => {
  it("should credit the declared source, not the newsroom profile's own name", () => {
    const r = deliveryMetadata(
      EL,
      { source: "Heidi.news", lang: "fr" },
      {},
      {
        mode: "real",
        data: {
          kind: "public",
          label: "Office fédéral de la santé publique",
          url: "https://www.bag.admin.ch/dam/bag/fr/dokumente/praemien-2024.csv",
        },
      },
    );
    expect(r).toMatchObject({
      ok: true,
      value: { source: "Office fédéral de la santé publique" },
    });
  });

  it("should localize the declared credit with the delivery's own language", () => {
    // The qualifier is part of WHAT IS SAID, so it follows the deliverable's language — unlike
    // produce, which has no language axis to read from yet.
    const decl = {
      mode: "real" as const,
      data: { kind: "prose" as const, label: "Heidi.news" },
    };
    expect(deliveryMetadata(EL, { lang: "fr" }, {}, decl)).toMatchObject({
      ok: true,
      value: { source: "Heidi.news (chiffres cités dans l'article)" },
    });
    expect(deliveryMetadata(EL, { lang: "de" }, {}, decl)).toMatchObject({
      ok: true,
      value: { source: "Heidi.news (im Artikel genannte Zahlen)" },
    });
  });

  it("should carry the demonstration notice into the delivered metadata", () => {
    const r = deliveryMetadata(
      EL,
      { lang: "fr" },
      {},
      {
        mode: "test",
        data: { kind: "synthetic", label: "Jeu de démo" },
      },
    );
    expect(r).toMatchObject({ ok: true });
    expect((r as { value: { source: string } }).value.source).toContain(
      "DONNÉES DE DÉMONSTRATION",
    );
  });

  it("should refuse a ledger whose declaration is not policy-valid, rather than redact it silently", () => {
    const r = deliveryMetadata(
      EL,
      { source: "Heidi.news" },
      {},
      {
        mode: "real",
        // `public` with a site root instead of the dataset page: the half-truth the policy refuses.
        data: { kind: "public", label: "OFS", url: "https://www.bfs.admin.ch" },
      },
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("url-not-specific");
  });

  it("should refuse a ledger that declares no data source rather than fall back to the profile", () => {
    const r = deliveryMetadata(
      EL,
      { source: "Heidi.news" },
      {},
      {
        mode: "real",
        article: { kind: "prose", label: "Heidi.news" },
      },
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("source-undeclared");
  });

  it("should never let a private internal reference reach the delivered metadata", () => {
    const r = deliveryMetadata(
      EL,
      {},
      {},
      {
        mode: "real",
        data: {
          kind: "private",
          label: "Données internes de la rédaction",
          internalRef: "//nas-redaction/salaires-internes-2024.csv",
        },
      },
    );
    expect(r).toMatchObject({ ok: true });
    expect(JSON.stringify(r)).not.toContain("nas-redaction");
  });
});
