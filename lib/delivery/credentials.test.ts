import { describe, it, expect } from "bun:test";
import { declaredCredentials } from "./credentials";

const CLOUDFLARE = [
  ["CLOUDFLARE_API_TOKEN"],
  ["CLOUDFLARE_ACCOUNT_ID"],
  ["SPLASH_EMBED_PROJECT"],
];

describe("declaredCredentials", () => {
  it("should copy every variable the capability declares", () => {
    expect(
      declaredCredentials(CLOUDFLARE, {
        CLOUDFLARE_API_TOKEN: "t",
        CLOUDFLARE_ACCOUNT_ID: "a",
        SPLASH_EMBED_PROJECT: "heidi-news-splash",
      }),
    ).toEqual({
      CLOUDFLARE_API_TOKEN: "t",
      CLOUDFLARE_ACCOUNT_ID: "a",
      SPLASH_EMBED_PROJECT: "heidi-news-splash",
    });
  });

  // The whole point of A8: a blanket copy of the environment hands an adapter the journalist's
  // AWS keys, their shell history settings and every other secret on the machine, for a deploy
  // that reads three variables.
  it("should carry nothing the capability did not declare", () => {
    expect(
      declaredCredentials(CLOUDFLARE, {
        CLOUDFLARE_API_TOKEN: "t",
        SPLASH_S3_SECRET_ACCESS_KEY: "someone-elses-secret",
        DATAWRAPPER_API_TOKEN: "also-not-cloudflare's-business",
        PATH: "/usr/bin",
      }),
    ).toEqual({ CLOUDFLARE_API_TOKEN: "t" });
  });

  // Absent, not blank: an adapter's own "needs CLOUDFLARE_API_TOKEN" refusal names the missing
  // variable, and a key present with an empty value would answer a different question.
  it("should omit a declared variable that the environment does not set", () => {
    expect(declaredCredentials(CLOUDFLARE, {})).toEqual({});
  });

  it("should keep a declared variable that is set to the empty string, and let the adapter judge it", () => {
    expect(
      declaredCredentials(CLOUDFLARE, { SPLASH_EMBED_PROJECT: "" }),
    ).toEqual({ SPLASH_EMBED_PROJECT: "" });
  });

  it("should accept an alternative group, the shape the capability catalogue uses for aliases", () => {
    const alias = [["SPLASH_S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"]];
    expect(declaredCredentials(alias, { AWS_ACCESS_KEY_ID: "k" })).toEqual({
      AWS_ACCESS_KEY_ID: "k",
    });
  });
});
