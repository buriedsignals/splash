import { describe, it, expect } from "bun:test";
import {
  parseNewsroom,
  validateNewsroom,
  isDeclinedProfile,
  newsroomLanguages,
  newsroomAccents,
} from "../scripts/newsroom.mjs";

const DECLINED = `---
decision: declined
---

The newsroom was asked and said no. Recorded, not defaulted.
`;

const COMPLETE = `---
name: Heidi.news
url: https://www.heidi.news
language: fr
brandColor: "#0B7A75"
ground: "#FFFFFF"
typefaces: "Source Serif, Source Sans"
---

Anything below the front matter is prose for the journalist, ignored by the tools.
`;

describe("parseNewsroom", () => {
  it("should read every declared field from the front matter", () => {
    const profile = parseNewsroom(COMPLETE);
    expect(profile.name).toBe("Heidi.news");
    expect(profile.language).toBe("fr");
    expect(profile.brandColor).toBe("#0B7A75");
  });

  it("should throw when there is no front matter at all", () => {
    expect(() => parseNewsroom("just prose")).toThrow("no front matter");
  });
});

describe("validateNewsroom", () => {
  it("should return no error for a complete profile", () => {
    expect(validateNewsroom(parseNewsroom(COMPLETE))).toEqual([]);
  });

  it("should name every missing field rather than the first one", () => {
    const errors = validateNewsroom({ name: "X" });
    expect(errors).toContain("url is missing");
    // The language error carries its own remedy since `languages` arrived — a newsroom that
    // publishes in several has to be told the plural exists, at the moment it is missing.
    expect(errors.some((e) => e.startsWith("language is missing"))).toBe(true);
    expect(errors).toContain("brandColor is missing");
  });

  it("should reject a brandColor that is not a hex triplet", () => {
    const errors = validateNewsroom({
      ...parseNewsroom(COMPLETE),
      brandColor: "teal",
    });
    expect(errors).toContain('brandColor must be #rrggbb, got "teal"');
  });
});

/**
 * SEVERAL LANGUAGES, AND MORE THAN ONE ACCENT — and the two things that must not break while the
 * model grows, each with the mutation that reddens it (run in a copy under /tmp, never here):
 *
 *   1. A profile written before either field existed stays valid, and means exactly what it always
 *      meant: one language, one accent.
 *      MUTATION: add "languages" to the required FIELDS list. Run in /tmp/twin-mut:
 *        (fail) a newsroom with several languages > should keep a single-language, single-accent
 *               profile valid
 *        error: expect(received).toEqual(expected)
 *        - []
 *        + [ "languages is missing", ]
 *
 *   2. A singular that contradicts the plural is REFUSED rather than silently resolved. This is the
 *      one place the two fields can disagree, and picking either would publish in a language the
 *      newsroom may not have chosen.
 *      MUTATION: `if (false)` in place of the contradiction check. Run in /tmp/twin-mut:
 *        (fail) a newsroom with several languages > should refuse a language that the languages
 *               list does not hold
 *        error: expect(received).toBe(expected) · Expected: true · Received: false
 */
describe("a newsroom with several languages", () => {
  it("should keep a single-language, single-accent profile valid", () => {
    expect(validateNewsroom(parseNewsroom(COMPLETE))).toEqual([]);
    expect(newsroomLanguages(parseNewsroom(COMPLETE))).toEqual(["fr"]);
    expect(newsroomAccents(parseNewsroom(COMPLETE))).toEqual(["#0B7A75"]);
  });

  it("should read every language a newsroom records, primary first", () => {
    const profile = parseNewsroom(
      COMPLETE.replace("language: fr", "languages: fr, de, it"),
    );
    expect(validateNewsroom(profile)).toEqual([]);
    expect(newsroomLanguages(profile)).toEqual(["fr", "de", "it"]);
  });

  it("should let the singular name which of the list is primary", () => {
    const profile = {
      ...parseNewsroom(COMPLETE),
      languages: "fr, de, it",
      language: "de",
    };
    expect(validateNewsroom(profile)).toEqual([]);
    expect(newsroomLanguages(profile)).toEqual(["de", "fr", "it"]);
  });

  it("should refuse a language that the languages list does not hold", () => {
    const profile = {
      ...parseNewsroom(COMPLETE),
      languages: "de, it",
      language: "fr",
    };
    expect(
      validateNewsroom(profile).some((e) =>
        e.includes("one of the two is stale"),
      ),
    ).toBe(true);
  });

  it("should refuse something that is not a language code", () => {
    const profile = {
      ...parseNewsroom(COMPLETE),
      language: "",
      languages: "français",
    };
    expect(
      validateNewsroom(profile).some((e) =>
        e.includes("is not a language code"),
      ),
    ).toBe(true);
  });

  it("should refuse a profile that records no language under either name", () => {
    const profile = { ...parseNewsroom(COMPLETE), language: "" };
    expect(
      validateNewsroom(profile).some((e) =>
        e.startsWith("language is missing"),
      ),
    ).toBe(true);
  });
});

describe("a newsroom with a richer palette", () => {
  it("should read every accent, the primary first", () => {
    const profile = { ...parseNewsroom(COMPLETE), accents: "#C1440E, #1F6FB2" };
    expect(validateNewsroom(profile)).toEqual([]);
    expect(newsroomAccents(profile)).toEqual(["#0B7A75", "#C1440E", "#1F6FB2"]);
  });

  it("should not repeat the primary when the list names it again", () => {
    const profile = { ...parseNewsroom(COMPLETE), accents: "#0B7A75, #C1440E" };
    expect(newsroomAccents(profile)).toEqual(["#0B7A75", "#C1440E"]);
  });

  it("should refuse an accent that is not a hex triplet", () => {
    const profile = { ...parseNewsroom(COMPLETE), accents: "#C1440E, rouge" };
    expect(validateNewsroom(profile)).toContain(
      'accents must each be #rrggbb, got "rouge"',
    );
  });
});

describe("isDeclinedProfile", () => {
  it("should recognise a profile whose front matter carries decision: declined", () => {
    expect(isDeclinedProfile(parseNewsroom(DECLINED))).toBe(true);
  });

  it("should not treat a complete profile as declined", () => {
    expect(isDeclinedProfile(parseNewsroom(COMPLETE))).toBe(false);
  });

  it("should not treat an incomplete profile with no decision field as declined", () => {
    expect(isDeclinedProfile({ name: "X" })).toBe(false);
  });
});
