import { describe, it, expect } from "bun:test";
import { profileMarkdown, updateProfileMarkdown } from "./profile-write";
import { parseNewsroomMarkdown } from "../../skills/splash/src/brand-profile";

describe("profileMarkdown — the setup page's shape is unchanged", () => {
  it("should emit exactly what the one-colour form emitted before the move", () => {
    expect(
      profileMarkdown({
        name: "Heidi.news",
        url: "https://heidi.news",
        color: "#0A5C36",
        lang: "fr",
      }),
    ).toBe(
      `---
palette:
  - "#0A5C36"   # your house colour
source:
  name: "Heidi.news"
  url: "https://heidi.news"
lang: "fr"
---

# Newsroom profile

Splash reuses this house style on every visual. Edit it whenever you like — this file is
yours; Splash only created it. See NEWSROOM-PROFILE.example.md for every supported field.
`,
    );
  });

  it("should default the language when none is given", () => {
    expect(profileMarkdown({ lang: "" })).toContain('lang: "en"');
  });

  it("should strip a quote or newline that would forge a frontmatter field", () => {
    const md = profileMarkdown({
      name: 'X"\nrequiredSigners:\n  - boss',
      lang: "en",
    });
    // The characters that would BREAK OUT of the scalar are gone, so the injected text stays
    // inside the source name and the reader never sees a second key.
    expect(md).not.toMatch(/^requiredSigners:/m);
    expect(parseNewsroomMarkdown(md)?.requiredSigners).toBeUndefined();
  });
});

describe("profileMarkdown — what the charter path adds", () => {
  it("should write a whole palette and a theme", () => {
    const md = profileMarkdown({
      palette: ["#d5121e", "#0a5c36"],
      theme: "#12161c",
      lang: "fr",
    });
    expect(md).toContain('  - "#d5121e"   # your house colour');
    expect(md).toContain('  - "#0a5c36"');
    expect(md).toContain('theme: "#12161c"');
  });

  it("should never write an accent line, even when one is handed in", () => {
    // The charter stopped asking for an accent (no engine renders one). A caller that still
    // passes the key must not get it back into the frontmatter — a NEWSROOM-PROFILE.md carrying
    // `accent:` is a newsroom asked for a colour Splash never shows.
    const md = profileMarkdown({
      palette: ["#0072B2", "#D55E00"],
      theme: "dark",
      accent: "#C8102E",
    } as unknown as Parameters<typeof profileMarkdown>[0]);
    expect(md).toContain('  - "#0072B2"   # your house colour');
    expect(md).toContain('  - "#D55E00"');
    expect(md).toContain('theme: "dark"');
    expect(md).not.toContain("accent");
  });

  it("should prefer an explicit palette over the single-colour field", () => {
    const md = profileMarkdown({ palette: ["#d5121e"], color: "#000000" });
    expect(md).toContain("#d5121e");
    expect(md).not.toContain("#000000");
  });

  it("should keep a measured typeface in the BODY, never as a frontmatter field", () => {
    const md = profileMarkdown({
      palette: ["#d5121e"],
      lang: "fr",
      notes: ["_Typefaces you confirmed: Publico Text._"],
    });
    const frontmatter = md.split("---")[1]!;
    expect(frontmatter).not.toContain("Publico");
    expect(md).toContain("Publico Text");
  });
});

describe("profileMarkdown — the reader must accept what the writer produces", () => {
  it("should round-trip every field through parseNewsroomMarkdown", () => {
    const md = profileMarkdown({
      palette: ["#d5121e", "#0a5c36"],
      name: "Heidi.news",
      url: "https://www.heidi.news",
      lang: "fr",
      theme: "#12161c",
      notes: ["_Typefaces you confirmed: Publico Text._"],
    });
    expect(parseNewsroomMarkdown(md)).toEqual({
      palette: ["#d5121e", "#0a5c36"],
      source: { name: "Heidi.news", url: "https://www.heidi.news" },
      lang: "fr",
      theme: "#12161c",
    });
  });

  it("should round-trip a profile with no colour at all — a valid outcome when the site answers nothing", () => {
    const md = profileMarkdown({ name: "Le Petit Journal", lang: "fr" });
    expect(parseNewsroomMarkdown(md)).toEqual({
      palette: [],
      source: { name: "Le Petit Journal" },
      lang: "fr",
    });
  });

  it("should round-trip the dark preset", () => {
    const md = profileMarkdown({ palette: ["#e8b100"], theme: "dark" });
    expect(parseNewsroomMarkdown(md)?.theme).toBe("dark");
  });
});

describe("updateProfileMarkdown — an edit rewrites what it knows, keeps the rest", () => {
  // The file belongs to the newsroom: Splash created it, the journalist owns it. An edit from the
  // setup page rewrites the fields the page knows and touches nothing else — the comments they
  // wrote, and any key a later version (or a human) added.
  it("keeps the body and the keys it does not know", () => {
    const existing = [
      "---",
      "palette:",
      '  - "#000000"',
      'lang: "en"',
      'requiredSigners: ["yvan"]',
      "---",
      "",
      "# Newsroom profile",
      "",
      "Ne pas toucher : notre rouge vient de la charte 2019.",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, {
      palette: ["#d5121e"],
      lang: "fr",
    });
    expect(out).toContain('"#d5121e"');
    expect(out).not.toContain('"#000000"');
    expect(out).toContain('lang: "fr"');
    expect(out).toContain('requiredSigners: ["yvan"]');
    expect(out).toContain(
      "Ne pas toucher : notre rouge vient de la charte 2019.",
    );
  });
});
