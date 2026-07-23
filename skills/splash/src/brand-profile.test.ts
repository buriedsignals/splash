import { describe, it, expect } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { parseBrandProfile, parseNewsroomMarkdown } from "./brand-profile";

function pub(): string {
  return generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "der" })
    .toString("base64");
}

describe("brand-profile", () => {
  it("parseBrandProfile reads signers + requiredSigners; drops a malformed key", () => {
    const yvan = pub();
    const p = parseBrandProfile(
      JSON.stringify({
        signers: [
          { id: "yvan", publicKey: yvan },
          { id: "bad", publicKey: "not-a-key" },
        ],
        requiredSigners: ["yvan"],
      }),
    );
    expect(p?.signers).toEqual([{ id: "yvan", publicKey: yvan }]); // malformed dropped
    expect(p?.requiredSigners).toEqual(["yvan"]);
  });

  it("a signers-only profile (no palette) is still a profile", () => {
    const p = parseBrandProfile(
      JSON.stringify({ signers: [{ id: "yvan", publicKey: pub() }] }),
    );
    expect(p).not.toBeNull();
    expect(p?.palette).toEqual([]);
  });

  it("a requiredSigner not present in signers is a profile error", () => {
    expect(() =>
      parseBrandProfile(
        JSON.stringify({
          signers: [{ id: "yvan", publicKey: pub() }],
          requiredSigners: ["rinny"],
        }),
      ),
    ).toThrow(/requiredSigner .*rinny.* not registered/i);
  });

  it("a requiredSigner whose key was malformed-and-dropped is a profile error", () => {
    expect(() =>
      parseBrandProfile(
        JSON.stringify({
          signers: [{ id: "bad", publicKey: "not-a-key" }],
          requiredSigners: ["bad"],
        }),
      ),
    ).toThrow(/requiredSigner .*bad.* not registered/i);
  });

  it("parseNewsroomMarkdown reads the flattened signers list + requiredSigners", () => {
    const yvan = pub();
    const rinny = pub();
    const md = [
      "---",
      "signers:",
      `  - yvan:${yvan}`,
      `  - rinny:${rinny}`,
      "requiredSigners:",
      "  - yvan",
      "  - rinny",
      "---",
      "# Newsroom",
    ].join("\n");
    const p = parseNewsroomMarkdown(md);
    expect(p?.signers).toEqual([
      { id: "yvan", publicKey: yvan },
      { id: "rinny", publicKey: rinny },
    ]);
    expect(p?.requiredSigners).toEqual(["yvan", "rinny"]);
  });
});
