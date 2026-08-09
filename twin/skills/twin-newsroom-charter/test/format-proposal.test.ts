import { describe, expect, it } from "bun:test";
import { formatProposal } from "../scripts/format-proposal.mjs";

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
