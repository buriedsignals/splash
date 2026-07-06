import { describe, it, expect } from "bun:test";
import { embedUrl, slugify, resolveApp } from "./deploy-embed.mjs";

describe("embedUrl / slugify", () => {
  it("builds the host URL from app + slug", () => {
    expect(embedUrl("my-newsroom-embeds", "eu-rents-2025")).toBe(
      "https://my-newsroom-embeds.fly.dev/eu-rents-2025/",
    );
  });
  it("slugify lowercases, strips, and dashes", () => {
    expect(slugify("EU Rents (2025)!")).toBe("eu-rents-2025");
  });
});

describe("resolveApp — the host is the journalist's own fly.io app", () => {
  it("uses the explicit CLI arg over the env", () => {
    expect(resolveApp("cli-app", { ATELIER_EMBED_APP: "env-app" })).toBe(
      "cli-app",
    );
  });
  it("falls back to $ATELIER_EMBED_APP when no arg is given", () => {
    expect(resolveApp(undefined, { ATELIER_EMBED_APP: "env-app" })).toBe(
      "env-app",
    );
  });
  it("throws when neither is set — there is NO shared default app", () => {
    expect(() => resolveApp(undefined, {})).toThrow(/no fly\.io app/i);
    // guardrail: the old shared default must never come back
    expect(() => resolveApp(undefined, {})).not.toThrow(/atelier-embeds/);
  });
});
