import { describe, it, expect } from "bun:test";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { assertDelivered, assertEditoriallyCleared } from "./export-guard";
import {
  editorialPayload,
  sha256Hex,
  type EditorSigner,
} from "./editorial-signoff";
import type { BrandProfile } from "./brand-profile";
import type { ProduceReport } from "./producer-spec";

const BYTES = new TextEncoder().encode("the-approved-artifact");
const H = sha256Hex(BYTES);

function signerFor(id: string) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const signer: EditorSigner = {
    id,
    publicKey: publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
  };
  const signature = cryptoSign(
    null,
    Buffer.from(editorialPayload("p1", H), "utf8"),
    privateKey,
  ).toString("base64");
  return { signer, signature };
}

function report(
  signoffs: { signerId: string; signedHash: string; signature: string }[],
): ProduceReport {
  return {
    results: [
      {
        id: "p1",
        status: "produced",
        reviewed: true,
        renderApproved: true,
        approvedHash: H,
        editorialSignoffs: signoffs,
      } as any,
    ],
  } as any;
}

describe("assertEditoriallyCleared — verify editorial sign-offs against current artifact", () => {
  it("passes when a required signer's sign-off matches the current bytes", () => {
    const { signer, signature } = signerFor("yvan");
    const profile: BrandProfile = {
      palette: [],
      signers: [signer],
      requiredSigners: ["yvan"],
    };
    const r = report([{ signerId: "yvan", signedHash: H, signature }]);
    expect(assertEditoriallyCleared(r, "p1", profile, BYTES)).toEqual({
      signedBy: ["yvan"],
      unsigned: false,
    });
  });

  it("throws when the artifact was re-produced (hash mismatch) since sign-off", () => {
    const { signer, signature } = signerFor("yvan");
    const profile: BrandProfile = {
      palette: [],
      signers: [signer],
      requiredSigners: ["yvan"],
    };
    const r = report([{ signerId: "yvan", signedHash: H, signature }]);
    const differentBytes = new TextEncoder().encode("re-produced-artifact");
    expect(() =>
      assertEditoriallyCleared(r, "p1", profile, differentBytes),
    ).toThrow(/different artifact|re-produced|re-sign/i);
  });

  it("throws when a required signer's sign-off is absent", () => {
    const { signer } = signerFor("yvan");
    const profile: BrandProfile = {
      palette: [],
      signers: [signer],
      requiredSigners: ["yvan"],
    };
    expect(() =>
      assertEditoriallyCleared(report([]), "p1", profile, BYTES),
    ).toThrow(/missing.*yvan|yvan.*missing/i);
  });

  it("with no requiredSigners never throws — records unsigned honestly", () => {
    const profile: BrandProfile = { palette: [] };
    expect(assertEditoriallyCleared(report([]), "p1", profile, BYTES)).toEqual({
      signedBy: [],
      unsigned: true,
    });
  });

  it("with no requiredSigners reports a valid optional sign-off", () => {
    const { signer, signature } = signerFor("yvan");
    const profile: BrandProfile = { palette: [], signers: [signer] }; // registered, but not required
    const r = report([{ signerId: "yvan", signedHash: H, signature }]);
    expect(assertEditoriallyCleared(r, "p1", profile, BYTES)).toEqual({
      signedBy: ["yvan"],
      unsigned: false,
    });
  });

  it("throws when signedHash matches current bytes but the signature fails re-verification", () => {
    const { signer } = signerFor("yvan");
    const profile: BrandProfile = {
      palette: [],
      signers: [signer],
      requiredSigners: ["yvan"],
    };
    // signedHash forged to equal the current-bytes hash, but the signature is not a valid sig over the payload
    const r = report([{ signerId: "yvan", signedHash: H, signature: "AAAA" }]);
    expect(() => assertEditoriallyCleared(r, "p1", profile, BYTES)).toThrow(
      /re-verification|failed/i,
    );
  });

  it("with no requiredSigners excludes a stale (hash-mismatch) optional sign-off from signedBy", () => {
    const { signer, signature } = signerFor("yvan");
    const profile: BrandProfile = {
      palette: [],
      signers: [signer],
    }; // registered, not required
    const staleHash = sha256Hex(new TextEncoder().encode("old-artifact"));
    const r = report([{ signerId: "yvan", signedHash: staleHash, signature }]);
    expect(assertEditoriallyCleared(r, "p1", profile, BYTES)).toEqual({
      signedBy: [],
      unsigned: true,
    });
  });
});

describe("assertDelivered — code-source now requires a runnable bundle", () => {
  it("accepts a real bundle (package.json + vite.config.ts present)", () => {
    expect(() =>
      assertDelivered(
        [
          "package.json",
          "vite.config.ts",
          "index.html",
          "config.json",
          "skills",
        ],
        {
          format: "interactive",
          form: "code-source",
        },
      ),
    ).not.toThrow();
  });
  it("rejects a lone-html copy masquerading as code-source", () => {
    expect(() =>
      assertDelivered(["interactive.html"], {
        format: "interactive",
        form: "code-source",
      }),
    ).toThrow(/runnable source bundle/);
  });
  it("still rejects an empty dir", () => {
    expect(() =>
      assertDelivered([], { format: "scrolly", form: "code-source" }),
    ).toThrow();
  });
});
