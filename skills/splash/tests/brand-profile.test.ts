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
import { computeChoropleth } from "../../map-native/src/choropleth-geo";
import { houseRamp } from "../../map-native/src/theme/house-ramp";

function tmpProject(brandJson?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "splash-brand-"));
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
palette:                    # the 1st is primary
  - "#0A5C36"               # house green
  - "#C8102E"
accent: "#C8102E"
source:
  name: "Heidi.news"
  url: "https://heidi.news"
lang: "fr"
credit: "Source : {name}"   # template
---

# How to fill in
- palette: ...
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
    const dir = mkdtempSync(join(tmpdir(), "splash-nr-"));
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

  it("source/lang: the per-element spec value ALWAYS wins over the profile", () => {
    const out = mergeProfileDefaults(
      { baseColor: "#123456", source: { name: "AP" }, lang: "en" },
      profile,
    );
    expect(out.source).toEqual({ name: "AP" });
    expect(out.lang).toBe("en");
  });

  it("colour: the house palette OVERRIDES an AUTO subject-fit baseColor (not an editorial choice)", () => {
    const out = mergeProfileDefaults({ baseColor: "#D55E00" }, profile);
    expect(out.baseColor).toBe("#0A5C36"); // house palette wins over the suggester's auto pick
    expect(out.brandExplicit).toBe(true);
  });

  it("colour: an EXPLICIT per-element colour (baseColorExplicit) is kept over the house palette", () => {
    const out = mergeProfileDefaults(
      { baseColor: "#D55E00", baseColorExplicit: true },
      profile,
    );
    expect(out.baseColor).toBe("#D55E00"); // the journalist named it — kept
    expect(out.brandExplicit).toBe(false); // not a house hue → a11y stays strict on it
  });

  it("colour: an explicit colour that IS a house hue is kept and marked brandExplicit", () => {
    const out = mergeProfileDefaults(
      { baseColor: "#0A5C36", baseColorExplicit: true },
      profile,
    );
    expect(out.baseColor).toBe("#0A5C36");
    expect(out.brandExplicit).toBe(true);
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

  it("seeds baseColor for charts, brandHue/brandPalette for maps (source/lang universal)", () => {
    // A map carries the house hue + palette (NOT baseColor) — its colour paths derive a ramp/fill.
    const map = mergeProfileDefaults({ title: "t" }, profile, {
      producer: "map-native",
    });
    expect(map.baseColor).toBeUndefined();
    expect((map as { brandHue?: string }).brandHue).toBe("#0A5C36");
    expect((map as { brandPalette?: string[] }).brandPalette).toEqual([
      "#0A5C36",
    ]);
    expect(map.brandExplicit).toBe(true);
    expect(map.source).toEqual({ name: "Heidi.news" });
    expect(map.lang).toBe("fr");
    // A chart takes palette[0] → baseColor.
    const chart = mergeProfileDefaults({ title: "t" }, profile, {
      producer: "chart-native",
    });
    expect(chart.baseColor).toBe("#0A5C36");
    expect((chart as { brandHue?: string }).brandHue).toBeUndefined();
    expect(chart.brandExplicit).toBe(true);
  });

  it("a chart-scrolly colours like a chart, a map-scrolly like a map", () => {
    const chartScrolly = mergeProfileDefaults({ nativeType: "bar" }, profile, {
      producer: "scrolly",
    });
    expect(chartScrolly.baseColor).toBe("#0A5C36");
    const mapScrolly = mergeProfileDefaults({ type: "choropleth" }, profile, {
      producer: "scrolly",
    });
    expect((mapScrolly as { brandHue?: string }).brandHue).toBe("#0A5C36");
    expect(mapScrolly.baseColor).toBeUndefined();
  });

  // The bug a live harness run caught: the real suggester ALWAYS emits a subject-fit `palette`
  // for a map (e.g. "purples" for a social subject). Since the map colour paths prefer an explicit
  // palette over brandHue, the house ramp silently never fired. The house colour must WIN over the
  // suggester's AUTO palette — mirror the chart branch overriding the auto baseColor — by clearing
  // that auto palette so brandHue drives the ramp.
  it("map: the house ramp OVERRIDES the suggester's AUTO subject palette (clears it so houseRamp fires)", () => {
    const out = mergeProfileDefaults(
      { title: "t", palette: "purples", scaleType: "sequential" } as never,
      profile,
      { producer: "map-native" },
    );
    expect((out as { palette?: unknown }).palette).toBeUndefined(); // auto palette cleared
    expect((out as { brandHue?: string }).brandHue).toBe("#0A5C36");
    expect(out.brandExplicit).toBe(true);
  });

  it("map: a DIVERGING registry palette is KEPT (a sequential house ramp can't encode a signed midpoint)", () => {
    const out = mergeProfileDefaults(
      { title: "t", palette: "rdbu", scaleType: "diverging" } as never,
      profile,
      { producer: "map-native" },
    );
    expect((out as { palette?: unknown }).palette).toBe("rdbu"); // registry diverging palette kept
    expect((out as { brandHue?: string }).brandHue).toBeUndefined(); // house sequential ramp not applied
  });

  it("map: a journalist's EXPLICIT palette (baseColorExplicit) is kept, house not applied", () => {
    const out = mergeProfileDefaults(
      { title: "t", palette: "oranges", baseColorExplicit: true } as never,
      profile,
      { producer: "map-native" },
    );
    expect((out as { palette?: unknown }).palette).toBe("oranges"); // the journalist named it — kept
    expect((out as { brandHue?: string }).brandHue).toBeUndefined();
  });

  it("map: a single-hue type (no palette) still gets brandHue, and clearing is a safe no-op", () => {
    const out = mergeProfileDefaults(
      { title: "t", type: "symbol" } as never,
      profile,
      {
        producer: "map-native",
      },
    );
    expect((out as { brandHue?: string }).brandHue).toBe("#0A5C36");
    expect((out as { palette?: unknown }).palette).toBeUndefined();
  });

  // END-TO-END regression for the live-harness bug: the suggester's auto `palette: "purples"`
  // merged with a green house profile must produce the GREEN house ramp in the real geometry core,
  // not the purple registry ramp. Wires the merge to computeChoropleth exactly as the map producer
  // does — the chain that shipped purple before the fix.
  it("map END-TO-END: an auto subject palette + house profile yields the HOUSE ramp from computeChoropleth", () => {
    const merged = mergeProfileDefaults(
      { title: "t", palette: "purples", scaleType: "sequential" } as never,
      profile,
      { producer: "map-native" },
    );
    const features: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso3: "CHE" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [6, 46],
                [7, 46],
                [7, 47],
                [6, 47],
                [6, 46],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { iso3: "FRA" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [1, 44],
                [3, 44],
                [3, 46],
                [1, 46],
                [1, 44],
              ],
            ],
          },
        },
      ],
    };
    const layout = computeChoropleth(
      {
        regionKey: "iso3",
        valueField: "v",
        rows: [
          { iso3: "CHE", v: 97 },
          { iso3: "FRA", v: 60 },
        ],
        brandHue: (merged as { brandHue?: string }).brandHue,
      },
      features,
      "iso3",
      {
        palette: (merged as { palette?: string }).palette,
        scaleType: "sequential",
      },
    );
    expect(layout.bins.map((b) => b.color)).toEqual(houseRamp("#0A5C36", 5));
  });
});

describe("newsroom theme (house dark basemap)", () => {
  it("parses `theme: dark` from the markdown frontmatter", () => {
    const p = parseNewsroomMarkdown(
      `---\npalette:\n  - "#E8A33D"\ntheme: dark\n---\n`,
    );
    expect(p?.theme).toBe("dark");
  });

  it("parses theme from brand.json and drops an unknown theme value", () => {
    expect(
      parseBrandProfile('{"palette":["#E8A33D"],"theme":"dark"}')?.theme,
    ).toBe("dark");
    expect(
      parseBrandProfile('{"palette":["#E8A33D"],"theme":"midnight"}')?.theme,
    ).toBeUndefined();
  });

  it("theme alone (no palette) is still a valid profile", () => {
    expect(parseBrandProfile('{"theme":"dark"}')).toEqual({
      palette: [],
      theme: "dark",
    });
  });

  it("trims a padded theme value (like the other scalars)", () => {
    expect(
      parseBrandProfile('{"palette":["#E8A33D"],"theme":"dark "}')?.theme,
    ).toBe("dark");
  });

  const darkProfile: BrandProfile = { palette: ["#E8A33D"], theme: "dark" };

  it("map-native map: theme dark → mapStyle dataviz-dark", () => {
    const out = mergeProfileDefaults({ type: "symbol" } as never, darkProfile, {
      producer: "map-native",
    });
    expect((out as { mapStyle?: string }).mapStyle).toBe("dataviz-dark");
  });

  it("map-scrolly: theme dark → mapStyle dataviz-dark", () => {
    const out = mergeProfileDefaults(
      { type: "choropleth" } as never,
      darkProfile,
      { producer: "scrolly" },
    );
    expect((out as { mapStyle?: string }).mapStyle).toBe("dataviz-dark");
  });

  it("a per-element mapStyle always wins over the house theme", () => {
    const out = mergeProfileDefaults(
      { type: "symbol", mapStyle: "dataviz-light" } as never,
      darkProfile,
      { producer: "map-native" },
    );
    expect((out as { mapStyle?: string }).mapStyle).toBe("dataviz-light");
  });

  it("map-dw is EXCLUDED (its dark basemap is a Datawrapper-side mechanism)", () => {
    const out = mergeProfileDefaults(
      { type: "choropleth" } as never,
      darkProfile,
      { producer: "map-dw" },
    );
    expect((out as { mapStyle?: string }).mapStyle).toBeUndefined();
  });

  it("a chart never gets a mapStyle", () => {
    const out = mergeProfileDefaults({ title: "t" }, darkProfile, {
      producer: "chart-native",
    });
    expect((out as { mapStyle?: string }).mapStyle).toBeUndefined();
  });

  it("theme light → explicit dataviz-light; no theme → no mapStyle", () => {
    const light = mergeProfileDefaults(
      { type: "symbol" } as never,
      {
        palette: ["#E8A33D"],
        theme: "light",
      },
      { producer: "map-native" },
    );
    expect((light as { mapStyle?: string }).mapStyle).toBe("dataviz-light");
    const none = mergeProfileDefaults(
      { type: "symbol" } as never,
      {
        palette: ["#E8A33D"],
      },
      { producer: "map-native" },
    );
    expect((none as { mapStyle?: string }).mapStyle).toBeUndefined();
  });
});

describe("newsroom theme → chart/map themeBg (arbitrary ground)", () => {
  it("chart-native: theme dark → config themeBg = the dark preset ground", () => {
    const out = mergeProfileDefaults(
      { title: "t" },
      { palette: [], theme: "dark" },
      {
        producer: "chart-native",
      },
    );
    expect((out as { themeBg?: string }).themeBg).toBe("#18181B");
  });

  it("chart-native: theme light → NO themeBg (byte-identical light default)", () => {
    const out = mergeProfileDefaults(
      { title: "t" },
      { palette: [], theme: "light" },
      {
        producer: "chart-native",
      },
    );
    expect((out as { themeBg?: string }).themeBg).toBeUndefined();
  });

  it("parses + accepts an arbitrary #rrggbb theme ground (markdown + json)", () => {
    expect(parseNewsroomMarkdown(`---\ntheme: "#0A2540"\n---\n`)?.theme).toBe(
      "#0A2540",
    );
    expect(parseBrandProfile('{"theme":"#0A2540"}')?.theme).toBe("#0A2540");
  });

  it("chart-native: a #rrggbb theme → config themeBg = that exact ground (uppercased)", () => {
    const out = mergeProfileDefaults(
      { title: "t" },
      { palette: [], theme: "#0a2540" },
      {
        producer: "chart-native",
      },
    );
    expect((out as { themeBg?: string }).themeBg).toBe("#0A2540");
  });

  it("map-native: a dark #rrggbb ground → dataviz-dark basemap AND themeBg carried", () => {
    const out = mergeProfileDefaults(
      { type: "symbol" } as never,
      { palette: [], theme: "#0A2540" },
      {
        producer: "map-native",
      },
    );
    expect((out as { mapStyle?: string }).mapStyle).toBe("dataviz-dark");
    expect((out as { themeBg?: string }).themeBg).toBe("#0A2540");
  });

  it("map-native: a light #rrggbb ground → dataviz-light basemap", () => {
    const out = mergeProfileDefaults(
      { type: "symbol" } as never,
      { palette: [], theme: "#F5F5F0" },
      {
        producer: "map-native",
      },
    );
    expect((out as { mapStyle?: string }).mapStyle).toBe("dataviz-light");
  });

  it("a per-element themeBg always wins over the house theme (chart)", () => {
    const out = mergeProfileDefaults(
      { title: "t", themeBg: "#101010" },
      { palette: [], theme: "dark" },
      { producer: "chart-native" },
    );
    expect((out as { themeBg?: string }).themeBg).toBe("#101010");
  });

  it("dw-chart is EXCLUDED from the chart theme (its own theming — follow-up)", () => {
    const out = mergeProfileDefaults(
      { title: "t" },
      { palette: [], theme: "dark" },
      {
        producer: "dw-chart",
      },
    );
    expect((out as { themeBg?: string }).themeBg).toBeUndefined();
  });
});

describe("mergeProfileDefaults seeds the story accent", () => {
  const profileWithAccent = { palette: ["#0072B2"], accent: "#7A1FA2" } as any;
  const profileNoAccent = { palette: ["#0072B2"] } as any;
  it("sets spec.accent from profile.accent for a chart", () => {
    const out = mergeProfileDefaults(
      { nativeType: "slope" } as any,
      profileWithAccent,
      { producer: "chart-native" },
    );
    expect((out as any).accent).toBe("#7A1FA2");
  });
  it("leaves spec.accent absent when the profile has no accent (byte-identity)", () => {
    const out = mergeProfileDefaults(
      { nativeType: "slope" } as any,
      profileNoAccent,
      { producer: "chart-native" },
    );
    expect((out as any).accent).toBeUndefined();
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

// Review F4 — image-native inherits the newsroom ground (same class as the chart/map threading).
import {
  describe as describeF4,
  expect as expectF4,
  it as itF4,
} from "bun:test";
import { mergeProfileDefaults as mergeF4 } from "../src/brand-profile";

describeF4("image-native theme threading (review F4)", () => {
  const profile = {
    palette: ["#009E73"],
    theme: "#101820",
    source: undefined,
    lang: undefined,
  } as any;

  itF4("should thread themeBg onto an image-native spec", () => {
    const out = mergeF4({ title: "t" } as any, profile, {
      producer: "image-native",
    });
    expectF4((out as any).themeBg).toBe("#101820");
  });

  itF4("should let a per-element themeBg win", () => {
    const out = mergeF4({ title: "t", themeBg: "#FFFFFF" } as any, profile, {
      producer: "image-native",
    });
    expectF4((out as any).themeBg).toBe("#FFFFFF");
  });
});
