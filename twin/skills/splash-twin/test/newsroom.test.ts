import { describe, it, expect } from "bun:test";
import {
  parseNewsroom,
  validateNewsroom,
  isDeclinedProfile,
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
    expect(errors).toContain("language is missing");
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
