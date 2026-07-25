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
