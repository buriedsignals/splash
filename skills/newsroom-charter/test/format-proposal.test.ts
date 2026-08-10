import { describe, expect, it } from "bun:test";
import { formatProposal } from "../scripts/format-proposal.mjs";
import { measureLegibility } from "../scripts/derive-charter.mjs";

describe("formatProposal — the unreachable-site path", () => {
  it("should render the ask-instead questions, never a guessed value, when the site could not be read", () => {
    const output = formatProposal({
      ok: false,
      url: "https://unreachable.test",
      error: "https://unreachable.test threw: ENOTFOUND",
      askInstead: [
        "https://unreachable.test could not be read (…).",
        "What is your house accent colour, as a hex code?",
        "What is your house background colour, as a hex code?",
        "What typeface(s) does your newsroom use, in order of prominence?",
      ],
    });
    expect(output).toContain(
      "Could not be read: https://unreachable.test threw: ENOTFOUND",
    );
    expect(output).toContain(
      "What is your house accent colour, as a hex code?",
    );
    expect(output).not.toContain("brandColor:"); // no front matter block at all on this path
  });
});

describe("formatProposal — a fully resolved proposal", () => {
  const proposal = {
    ok: true,
    url: "https://www.theguardian.com/",
    fields: {
      name: {
        value: "The Guardian",
        source: "<title>",
        evidence: "<title>The Guardian</title>",
      },
      language: {
        value: "en",
        source: "<html lang>",
        evidence: '<html lang="en">',
      },
      brandColor: {
        value: "#052962",
        source: "meta[name=theme-color]",
        evidence: '<meta name="theme-color" content="#052962" />',
      },
      ground: {
        value: "#ffffff",
        source: "body background",
        evidence: "body { background: #FFFFFF }",
      },
      typefaces: {
        value: "GH Guardian Headline",
        source: "font-family declarations",
        evidence: "font-family: 'GH Guardian Headline'",
      },
    },
    unresolved: [],
    stylesheetsRead: ["https://assets.guim.co.uk/style.css"],
    stylesheetsFailed: [],
  };

  it("should render every field's value beside its declaration", () => {
    const output = formatProposal(proposal);
    expect(output).toContain('brandColor: "#052962"');
    expect(output).toContain("meta[name=theme-color]");
    expect(output).toContain('<meta name="theme-color" content="#052962" />');
  });

  it("should say PROPOSED, not written — this function never claims to have saved anything", () => {
    const output = formatProposal(proposal);
    expect(output).toContain("PROPOSED, not written");
  });

  it("should list every stylesheet actually read", () => {
    expect(formatProposal(proposal)).toContain(
      "https://assets.guim.co.uk/style.css",
    );
  });

  it("should carry no 'Ask the journalist' section when nothing is unresolved", () => {
    expect(formatProposal(proposal)).not.toContain("## Ask the journalist");
  });
});

describe("formatProposal — a partially resolved proposal", () => {
  it("should render an unresolved field as a labelled placeholder, never a blank or a guess", () => {
    const proposal = {
      ok: true,
      url: "https://www.nzz.ch/",
      fields: {
        name: {
          value: "Neue Zürcher Zeitung",
          source: "meta[property=og:site_name]",
          evidence: "…",
        },
        language: { value: "de", source: "<html lang>", evidence: "…" },
        brandColor: null,
        ground: null,
        typefaces: {
          value: "Arial",
          source: "font-family declarations",
          evidence: "…",
        },
      },
      unresolved: ["brandColor", "ground"],
      stylesheetsRead: [],
      stylesheetsFailed: [],
    };
    const output = formatProposal(proposal);
    expect(output).toContain("brandColor: # UNRESOLVED — ask the journalist");
    expect(output).toContain("ground: # UNRESOLVED — ask the journalist");
    expect(output).toContain(
      "- **brandColor** — not declared anywhere this skill reads. Ask the journalist directly.",
    );
    expect(output).toContain("## Ask the journalist");
    expect(output).toContain(
      "2 field(s) had no declaration this skill could find: brandColor, ground.",
    );
  });

  it("should list a stylesheet that failed to fetch, separately from the ones that succeeded", () => {
    const proposal = {
      ok: true,
      url: "https://example.test/",
      fields: {
        name: null,
        language: null,
        brandColor: null,
        ground: null,
        typefaces: null,
      },
      unresolved: ["name", "language", "brandColor", "ground", "typefaces"],
      stylesheetsRead: ["https://example.test/ok.css"],
      stylesheetsFailed: [
        {
          href: "https://example.test/missing.css",
          error: "https://example.test/missing.css answered 404",
        },
      ],
    };
    const output = formatProposal(proposal);
    expect(output).toContain("## Stylesheets read");
    expect(output).toContain("https://example.test/ok.css");
    expect(output).toContain("## Stylesheets that could not be read");
    expect(output).toContain("https://example.test/missing.css answered 404");
  });
});

/**
 * THE MEASUREMENT THIS SKILL DID NOT MAKE UNTIL 2026-08-10.
 *
 * A journalist with no `NEWSROOM.md` is sent HERE, and `grep -rn "contrast\|luminance"` over the
 * whole skill returned nothing: it read a newsroom's site, proposed a `brandColor` and a `ground`,
 * and never asked whether the pair could be read together. The colours are collected in order to
 * be PROPOSED — so a pair that cannot come out as it is has to fail here, where the journalist is
 * still choosing, with the reason and the measurement attached.
 */
describe("formatProposal — whether the colours can be read together", () => {
  const withColours = (brandColor: string, accents?: string) => ({
    ok: true,
    url: "https://example.test/",
    fields: {
      name: { value: "Example", source: "<title>", evidence: "<title>Example</title>" },
      languages: { value: "fr", source: "<html lang>", evidence: '<html lang="fr">' },
      brandColor: { value: brandColor, source: "--brand", evidence: `--brand: ${brandColor}` },
      ...(accents
        ? { accents: { value: accents, source: "--brand-2", evidence: `--brand-2: ${accents}` } }
        : {}),
      ground: { value: "#FFFFFF", source: "body background", evidence: "body { background: #FFFFFF }" },
      typefaces: { value: "Inter", source: "font-family", evidence: "font-family: Inter" },
    },
    unresolved: [],
    nothingFurther: accents ? [] : ["accents"],
    legibility: measureLegibility({
      brandColor: { value: brandColor },
      ground: { value: "#FFFFFF" },
      ...(accents ? { accents: { value: accents } } : {}),
    }),
    candidates: {},
    stylesheetsRead: [],
    stylesheetsFailed: [],
  });

  it("should say YES, measured, when the pair clears the mark floor", () => {
    const output = formatProposal(withColours("#0B7A75"));
    expect(output).toContain("Can these colours be read together");
    expect(output).toContain("Yes — measured");
    expect(output).toContain("**5.18:1**");
    expect(output).toContain("SC 1.4.11");
  });

  it("should REFUSE a brand colour a reader cannot see, and offer the nearest one that clears", () => {
    const output = formatProposal(withColours("#FFFF00"));
    expect(output).toContain("**No — not all of them.**");
    expect(output).toContain("1.07:1, FAILS the 3:1 floor");
    expect(output).toMatch(/Nearest variant that clears it: `#[0-9a-f]{6}`/);
    // Offered, never applied: the front matter above still carries what the site declared.
    expect(output).toContain('brandColor: "#FFFF00"');
  });

  it("should measure EVERY further accent, so a longer palette is not a way past the floor", () => {
    const output = formatProposal(withColours("#0B7A75", "#FFFF00"));
    expect(output).toContain("**No — not all of them.**");
    expect(output).toContain("`#0B7A75` (brandColor)");
    expect(output).toContain("`#FFFF00` (accents)");
  });

  it("should keep the section silent when there is nothing to measure", () => {
    const proposal = withColours("#0B7A75");
    const output = formatProposal({ ...proposal, legibility: null });
    expect(output).not.toContain("Can these colours be read together");
  });
});
