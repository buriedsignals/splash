// The owned package speaks the newsroom's language.
//
// The delivery-publishers spec §4.4 declared this test required ("le README est dans la langue
// de contenu") and it was never written; zip.test.ts instead published with `lang: "fr"` and
// asserted English strings, which recorded the gap as the expected behaviour (registry A25).
//
// `metadata.lang` is the CONTENT language — the newsroom's own, from NEWSROOM-PROFILE.md. The
// README is read by that newsroom, on their disk, about their visual, so it follows it. The
// table is {en, fr} with an English fallback, the same shape and the same limit as every other
// copy table in this repo (lib/newsroom/ui-copy.ts, lib/host/intent-copy.ts): de and it wait
// on a speaker, and that wait is a registry pile-C entry, not an oversight here.
import { describe, it, expect } from "bun:test";
import { zipReadme, filePackageReadme } from "./zip";
import type { DeliveryMetadata } from "../../core/publishers";

function meta(lang: string): DeliveryMetadata {
  return {
    title: "Primes cantonales",
    altText: "Les primes montent",
    source: "OFSP",
    credit: "Heidi.news",
    lang,
    width: 700,
    height: 420,
  };
}

describe("the embed genre's README", () => {
  it("should be written in French for a French newsroom", () => {
    const readme = zipReadme(
      meta("fr"),
      "primes",
      "<iframe></iframe>",
      "index.html",
    );
    expect(readme).toContain("## Comment l'intégrer");
    expect(readme).toContain("Déposez `index.html`");
    expect(readme).toContain("Collez");
    expect(readme).not.toContain("How to integrate");
    expect(readme).not.toContain("Upload");
  });

  it("should keep French typography on the furniture lines", () => {
    const readme = zipReadme(
      meta("fr"),
      "primes",
      "<iframe></iframe>",
      "index.html",
    );
    expect(readme).toContain("Source : OFSP");
    expect(readme).toContain("Crédit : Heidi.news");
    expect(readme).toContain("Identifiant : primes");
  });

  it("should be written in English for an English newsroom", () => {
    const readme = zipReadme(
      meta("en"),
      "primes",
      "<iframe></iframe>",
      "index.html",
    );
    expect(readme).toContain("## How to integrate");
    expect(readme).toContain("Upload `index.html`");
    expect(readme).toContain("Source: OFSP");
    expect(readme).toContain("Credit: Heidi.news");
    expect(readme).toContain("Identifier: primes");
  });

  it("should resolve a regional tag to its base language", () => {
    expect(
      zipReadme(meta("fr-CH"), "primes", "<iframe></iframe>", "index.html"),
    ).toContain("## Comment l'intégrer");
  });

  // Falling back is the documented behaviour for a language with no table entry — never a
  // half-translated README, and never a refusal: the package is the universal fallback.
  it("should fall back to English for a language the table does not carry", () => {
    const readme = zipReadme(
      meta("de"),
      "primes",
      "<iframe></iframe>",
      "index.html",
    );
    expect(readme).toContain("## How to integrate");
    // Whole-README, not per-line: lib/core/locale.ts DOES know "Quelle:", and taking it here
    // while the prose around it stayed English would ship a package speaking two languages.
    // The fallback is a language, not a set of independently-resolved labels.
    expect(readme).toContain("Source: OFSP");
    expect(readme).not.toContain("Quelle");
  });

  it("should carry the title, the alt text and the snippet whatever the language", () => {
    for (const lang of ["fr", "en"]) {
      const readme = zipReadme(
        meta(lang),
        "primes",
        "<iframe></iframe>",
        "index.html",
      );
      expect(readme).toContain("# Primes cantonales");
      expect(readme).toContain("Les primes montent");
      expect(readme).toContain("<iframe></iframe>");
    }
  });
});

describe("the file genre's README", () => {
  it("should name the CMS image field in French", () => {
    const readme = filePackageReadme(
      meta("fr"),
      "primes",
      "index.png",
      "static",
    );
    expect(readme).toContain("## Comment l'intégrer");
    expect(readme).toContain("champ image");
    expect(readme).toContain("ALT.txt");
    expect(readme).toContain("Source : OFSP");
    expect(readme).not.toContain("image field");
  });

  it("should name the CMS video field in French for a video", () => {
    const readme = filePackageReadme(
      meta("fr"),
      "primes",
      "index.mp4",
      "video",
    );
    expect(readme).toContain("champ vidéo");
    expect(readme).not.toContain("champ image");
  });

  it("should still name the English fields for an English newsroom", () => {
    expect(
      filePackageReadme(meta("en"), "primes", "index.png", "static"),
    ).toContain("image field");
    expect(
      filePackageReadme(meta("en"), "primes", "index.mp4", "video"),
    ).toContain("video field");
  });

  // The file genre has no embed code at all (spec §3.8) — a translation must not smuggle one in.
  it("should mention no embed code in either language", () => {
    for (const lang of ["fr", "en"]) {
      const readme = filePackageReadme(
        meta(lang),
        "primes",
        "index.png",
        "static",
      );
      expect(readme).not.toContain("<iframe");
    }
  });
});
