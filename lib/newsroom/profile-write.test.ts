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

  // Fix round 1: an edit through the setup page only ever supplies name/url/color — never
  // `theme`, and never a multi-entry `palette`. A known key `facts` says nothing about must be
  // preserved exactly like a key this function has never heard of, not dropped because it
  // happens to be one of the four this function CAN author.
  it("keeps a theme and a palette the edit did not mention", () => {
    const existing = [
      "---",
      "palette:",
      '  - "#0a5c36"   # your house colour',
      '  - "#f2c14e"',
      'lang: "en"',
      'theme: "dark"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    // Only a name is supplied — the setup page's real payload always carries a `color` too, but
    // this proves the general rule: absent from `facts` means untouched, for every known key.
    const out = updateProfileMarkdown(existing, { name: "Heidi.news" });
    expect(out).toContain('theme: "dark"');
    expect(out).toContain('"#0a5c36"');
    expect(out).toContain('"#f2c14e"');
    expect(out).toContain('name: "Heidi.news"');
  });

  it("keeps an untouched theme, and grafts the new colour onto the primary while keeping the series colour", () => {
    // Fix round 2: the scenario named in review — a profile with a dark theme and a two-colour
    // palette, edited with only a name and a colour (the real setup-page payload shape,
    // client.ts's `{name, url, color}`). The theme is not in that payload and must survive. The
    // colour IS in it — but per NEWSROOM-PROFILE.example.md, palette[0] is the primary and
    // palette[1+] are distinct series colours, two roles, not one list — and a single hex field
    // can only ever express the primary. So it replaces index 0 and grafts index 1+ back on; it
    // does not delete a series colour the journalist never touched.
    const existing = [
      "---",
      "palette:",
      '  - "#0a5c36"   # your house colour',
      '  - "#f2c14e"',
      "source:",
      '  name: "Heidi.news"',
      'lang: "en"',
      'theme: "dark"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, {
      name: "Someone else",
      color: "#d5121e",
    });
    expect(out).toContain('theme: "dark"');
    expect(out).toContain('"#d5121e"'); // the new primary
    expect(out).not.toContain('"#0a5c36"'); // the old primary, replaced
    expect(out).toContain('"#f2c14e"'); // the series colour, grafted back on
    expect(out).toContain('name: "Someone else"');
  });

  it("still replaces the whole palette when facts supplies a real palette array", () => {
    // The charter flow's shape (a whole site measured) genuinely means "here is the new list" —
    // grafting a single index onto it would be wrong in the other direction.
    const existing = [
      "---",
      "palette:",
      '  - "#0a5c36"',
      '  - "#f2c14e"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, {
      palette: ["#111111", "#222222", "#333333"],
    });
    expect(out).toContain('"#111111"');
    expect(out).toContain('"#222222"');
    expect(out).toContain('"#333333"');
    expect(out).not.toContain('"#0a5c36"');
    expect(out).not.toContain('"#f2c14e"');
  });

  it("grafts a new name onto the existing url when only a name is supplied", () => {
    const existing = [
      "---",
      "source:",
      '  name: "Heidi.news"',
      '  url: "https://heidi.news"',
      'lang: "en"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, { name: "Someone else" });
    expect(out).toContain('name: "Someone else"');
    expect(out).toContain('url: "https://heidi.news"');
  });

  it("grafts a new url onto the existing name when only a url is supplied", () => {
    const existing = [
      "---",
      "source:",
      '  name: "Heidi.news"',
      '  url: "https://heidi.news"',
      'lang: "en"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, { url: "https://new.example" });
    expect(out).toContain('name: "Heidi.news"');
    expect(out).toContain('url: "https://new.example"');
    expect(out).not.toContain("https://heidi.news");
  });

  // Fix round 1, finding 2: `parseNewsroomMarkdown`'s palette reader stops at the first line
  // that is not a `  - item`, even while still indented, so a stray indented non-dash line is
  // never attributed to the palette it sits under. This writer must use the same boundary when
  // it drops and regenerates that block — deleting a line the reader itself does not consume
  // would be silent data loss of exactly the kind this function exists to prevent.
  it("does not delete a stray indented line under palette the reader itself never consumed", () => {
    const existing = [
      "---",
      "palette:",
      '  - "#000000"',
      "  a hand-typed note, not a list item",
      'lang: "en"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, { color: "#d5121e" });
    expect(out).toContain("a hand-typed note, not a list item");
    expect(out).toContain('"#d5121e"');
    expect(out).not.toContain('"#000000"');
  });

  // Minors: the input shapes the review asked to see committed, not just checked by hand.
  it("gives a file with no frontmatter a fresh one and keeps its whole body", () => {
    const existing = "Just a body, no fence at all.\n";
    const out = updateProfileMarkdown(existing, {
      lang: "fr",
      palette: ["#111111"],
    });
    expect(out).toContain('"#111111"');
    expect(out).toContain('lang: "fr"');
    expect(out).toContain("Just a body, no fence at all.");
  });

  it("keeps a standalone comment line inside the frontmatter", () => {
    const existing = [
      "---",
      "# a note from the newsroom, not attached to any field",
      'lang: "en"',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, { lang: "fr" });
    expect(out).toContain(
      "# a note from the newsroom, not attached to any field",
    );
    expect(out).toContain('lang: "fr"');
  });

  it("treats a fence with no closing marker as one whole body, rather than losing data", () => {
    const existing = '---\npalette:\n  - "#000"\nHalf a file, never closed.\n';
    const out = updateProfileMarkdown(existing, { lang: "fr" });
    expect(out).toContain('lang: "fr"');
    // Total: nothing thrown, and every original byte is still present somewhere in the output —
    // it just lands in the body instead of being parsed as frontmatter, since there was no
    // closing fence for `NEWSROOM_FRONTMATTER_RE` to find.
    expect(out).toContain("Half a file, never closed.");
    expect(out).toContain('- "#000"');
  });

  // A comment on the SAME line as a field being replaced is a conscious trade-off, not an
  // accident: the whole line is regenerated, so a trailing comment attached to the OLD value
  // does not survive onto the new one. A standalone comment line (above) does survive; this does
  // not, because there is no old value left for it to still describe.
  it("drops a same-line comment attached to a field it replaces", () => {
    const existing = [
      "---",
      'lang: "en"  # confirmed by Yvan',
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const out = updateProfileMarkdown(existing, { lang: "fr" });
    expect(out).toContain('lang: "fr"');
    expect(out).not.toContain("confirmed by Yvan");
  });
});
