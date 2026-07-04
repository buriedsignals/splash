import { describe, it, expect } from "bun:test";
import { embedUrl, slugify } from "./deploy-embed.mjs";

describe("embedUrl / slugify", () => {
  it("builds the host URL from app + slug", () => {
    expect(embedUrl("atelier-embeds", "eu-rents-2025")).toBe(
      "https://atelier-embeds.fly.dev/eu-rents-2025/",
    );
  });
  it("slugify lowercases, strips, and dashes", () => {
    expect(slugify("EU Rents (2025)!")).toBe("eu-rents-2025");
  });
});
