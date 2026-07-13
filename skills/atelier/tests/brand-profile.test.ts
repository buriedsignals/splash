// F2 — the newsroom brand profile (house style, first cut: colours only). A per-
// project brand.json declares the house `palette` (+ optional `accent`); when present
// the producer spec is SEEDED from it and marked brandExplicit so the a11y guards
// apply policy (b). Absent/invalid → null → today's auto subject-fit behaviour.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseBrandProfile,
  loadBrandProfile,
  seedBrandColor,
  parseNewsroomMarkdown,
  loadNewsroomProfile,
  mergeProfileDefaults,
  type BrandProfile,
} from "../src/brand-profile";
import { existsSync, readFileSync } from "node:fs";

function tmpProject(brandJson?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "atelier-brand-"));
  if (brandJson !== undefined)
    writeFileSync(join(dir, "brand.json"), brandJson);
  return dir;
}

describe("parseBrandProfile", () => {
  it("parses a palette (+ optional accent) of #rrggbb hues", () => {
    const p = parseBrandProfile(
      '{"palette":["#E30613","#1D1D1B"],"accent":"#F5A623"}',
    );
    expect(p).toEqual({
      palette: ["#E30613", "#1D1D1B"],
      accent: "#F5A623",
    });
  });

  it("drops non-hex palette entries, keeps the valid ones", () => {
    const p = parseBrandProfile('{"palette":["#E30613","red","#1D1D1B"]}');
    expect(p?.palette).toEqual(["#E30613", "#1D1D1B"]);
  });

  it("returns null for malformed JSON", () => {
    expect(parseBrandProfile("{not json")).toBeNull();
  });

  it("returns null when there is no usable field (→ auto path)", () => {
    expect(parseBrandProfile('{"palette":[]}')).toBeNull();
    // accent alone (no palette) is not a brand
    expect(parseBrandProfile('{"accent":"#F5A623"}')).toBeNull();
  });

  it("reads the extended fields (source, lang, credit)", () => {
    const p = parseBrandProfile(
      '{"palette":["#0A5C36"],"source":{"name":"Heidi.news","url":"https://heidi.news"},"lang":"fr","credit":"Source : {name}"}',
    );
    expect(p).toEqual({
      palette: ["#0A5C36"],
      source: { name: "Heidi.news", url: "https://heidi.news" },
      lang: "fr",
      credit: "Source : {name}",
    });
  });

  it("is valid with a default source but no house palette", () => {
    const p = parseBrandProfile('{"source":{"name":"Le Temps"}}');
    expect(p).toEqual({ palette: [], source: { name: "Le Temps" } });
  });
});

describe("parseNewsroomMarkdown", () => {
  const md = `---
palette:                    # la 1re = principale
  - "#0A5C36"               # vert maison
  - "#C8102E"
accent: "#C8102E"
source:
  name: "Heidi.news"
  url: "https://heidi.news"
lang: "fr"
credit: "Source : {name}"   # gabarit
---

# Comment remplir
- palette : ...
`;

  it("parses the frontmatter into a BrandProfile, stripping comments but keeping quoted hex", () => {
    expect(parseNewsroomMarkdown(md)).toEqual({
      palette: ["#0A5C36", "#C8102E"],
      accent: "#C8102E",
      source: { name: "Heidi.news", url: "https://heidi.news" },
      lang: "fr",
      credit: "Source : {name}",
    });
  });

  it("returns null when there is no frontmatter", () => {
    expect(
      parseNewsroomMarkdown("# just a heading\n\nno frontmatter here"),
    ).toBeNull();
  });

  it("accepts a partial profile (source only)", () => {
    const p = parseNewsroomMarkdown(`---\nsource:\n  name: "RTS"\n---\n`);
    expect(p).toEqual({ palette: [], source: { name: "RTS" } });
  });

  it("accepts single-quoted values (name and hex) like double-quoted", () => {
    const p = parseNewsroomMarkdown(
      `---\npalette:\n  - '#0A5C36'\naccent: '#C8102E'\nsource:\n  name: 'Le Temps'\n---`,
    );
    expect(p).toEqual({
      palette: ["#0A5C36"],
      accent: "#C8102E",
      source: { name: "Le Temps" },
    });
  });

  it("keeps every palette colour despite a comment or blank line between items", () => {
    const p = parseNewsroomMarkdown(
      `---\npalette:\n  - "#0A5C36"   # principal\n  # une note\n\n  - "#C8102E"\naccent: "#C8102E"\n---`,
    );
    expect(p?.palette).toEqual(["#0A5C36", "#C8102E"]);
  });

  it("keeps a '#' inside an unquoted value (only a whitespace-preceded '#' is a comment)", () => {
    const p = parseNewsroomMarkdown(
      `---\nsource:\n  name: RTS\n  url: https://x.com/a#frag\n---`,
    );
    expect(p?.source).toEqual({ name: "RTS", url: "https://x.com/a#frag" });
  });

  it("keeps an apostrophe in an unquoted French/Italian name + strips its trailing comment", () => {
    // A mid-token quote is a literal, not a scalar delimiter — so "L'Observatoire  # note" keeps
    // the apostrophe and drops the comment (the target audience's names: L'Équipe, Dell'Umbria).
    const p = parseNewsroomMarkdown(
      `---\nsource:\n  name: L'Observatoire  # notre nom\n---`,
    );
    expect(p?.source).toEqual({ name: "L'Observatoire" });
  });
});

describe("loadNewsroomProfile", () => {
  it("prefers NEWSROOM-PROFILE.md and writes the brand.json cache", () => {
    const dir = mkdtempSync(join(tmpdir(), "atelier-nr-"));
    writeFileSync(
      join(dir, "NEWSROOM-PROFILE.md"),
      `---\npalette:\n  - "#0A5C36"\nlang: "fr"\n---\n`,
    );
    try {
      const p = loadNewsroomProfile(dir);
      expect(p).toEqual({ palette: ["#0A5C36"], lang: "fr" });
      // the machine cache is written
      expect(existsSync(join(dir, "brand.json"))).toBe(true);
      expect(JSON.parse(readFileSync(join(dir, "brand.json"), "utf8"))).toEqual(
        {
          palette: ["#0A5C36"],
          lang: "fr",
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to brand.json when no markdown is present", () => {
    const dir = tmpProject('{"palette":["#E30613"]}');
    try {
      expect(loadNewsroomProfile(dir)).toEqual({ palette: ["#E30613"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when neither file is present", () => {
    const dir = tmpProject();
    try {
      expect(loadNewsroomProfile(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("mergeProfileDefaults", () => {
  const profile: BrandProfile = {
    palette: ["#0A5C36"],
    source: { name: "Heidi.news" },
    lang: "fr",
  };

  it("fills the gaps: colour, source, lang from the profile", () => {
    const out = mergeProfileDefaults({ title: "t" }, profile);
    expect(out.baseColor).toBe("#0A5C36");
    expect(out.brandExplicit).toBe(true);
    expect(out.source).toEqual({ name: "Heidi.news" });
    expect(out.lang).toBe("fr");
  });

  it("the per-element spec value ALWAYS wins over the profile", () => {
    const out = mergeProfileDefaults(
      { baseColor: "#123456", source: { name: "AP" }, lang: "en" },
      profile,
    );
    expect(out.baseColor).toBe("#123456");
    expect(out.source).toEqual({ name: "AP" });
    expect(out.lang).toBe("en");
  });

  it("does not seed a colour when the profile has no palette", () => {
    const out = mergeProfileDefaults(
      { title: "t" },
      {
        palette: [],
        source: { name: "RTS" },
      },
    );
    expect(out.baseColor).toBeUndefined();
    expect(out.source).toEqual({ name: "RTS" });
  });

  it("a null profile leaves the spec unchanged", () => {
    const spec = { title: "t" };
    expect(mergeProfileDefaults(spec, null)).toBe(spec);
  });

  it("does not throw on a null / non-object spec (drop-proof: falls through to validation)", () => {
    expect(mergeProfileDefaults(null as never, profile)).toBeNull();
    expect(mergeProfileDefaults(undefined as never, profile)).toBeUndefined();
    expect(mergeProfileDefaults("nope" as never, profile)).toBe("nope");
  });

  it("seeds colour only for colour-consuming producers (source/lang stay universal)", () => {
    // map-native ignores brand colour and validates strictly → never seed baseColor there.
    const map = mergeProfileDefaults({ title: "t" }, profile, {
      producer: "map-native",
    });
    expect(map.baseColor).toBeUndefined();
    expect(map.source).toEqual({ name: "Heidi.news" });
    expect(map.lang).toBe("fr");
    // chart-native consumes it.
    const chart = mergeProfileDefaults({ title: "t" }, profile, {
      producer: "chart-native",
    });
    expect(chart.baseColor).toBe("#0A5C36");
    expect(chart.brandExplicit).toBe(true);
  });
});

describe("loadBrandProfile", () => {
  it("reads brand.json when present", () => {
    const dir = tmpProject('{"palette":["#E30613"]}');
    try {
      expect(loadBrandProfile(dir)).toEqual({ palette: ["#E30613"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when brand.json is missing (auto behaviour, unchanged)", () => {
    const dir = tmpProject(); // no brand.json written
    try {
      expect(loadBrandProfile(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("seedBrandColor", () => {
  const brand: BrandProfile = { palette: ["#E30613", "#1D1D1B"] };

  it("seeds the primary house hue + marks brandExplicit on a spec with no colour", () => {
    const out = seedBrandColor({ title: "t" }, brand);
    expect(out.baseColor).toBe("#E30613");
    expect(out.brandExplicit).toBe(true);
  });

  it("marks brandExplicit when the spec already carries a house-palette colour", () => {
    const out = seedBrandColor({ baseColor: "#1D1D1B" }, brand);
    expect(out.baseColor).toBe("#1D1D1B");
    expect(out.brandExplicit).toBe(true);
  });

  it("does NOT mark brandExplicit for a colour outside the house palette (a11y stays strict)", () => {
    const out = seedBrandColor({ baseColor: "#0072B2" }, brand);
    expect(out.baseColor).toBe("#0072B2");
    expect(out.brandExplicit).toBe(false);
  });
});
