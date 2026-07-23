import { test, expect } from "bun:test";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import {
  editorialPayload,
  sha256Hex,
  verifyEditorialSignature,
  applyEditorialSignoff,
  type EditorSigner,
} from "./editorial-signoff.ts";
import type { ProduceReport } from "./producer-spec.ts";

// Helper: a deterministic-in-test Ed25519 keypair + a raw signer over the canonical payload.
function makeSigner(id: string) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pub = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  const signer: EditorSigner = { id, publicKey: pub };
  const signPayload = (payload: string) =>
    cryptoSign(null, Buffer.from(payload, "utf8"), privateKey).toString(
      "base64",
    );
  return { signer, privateKey, signPayload };
}

const HASH = sha256Hex(new TextEncoder().encode("artifact-bytes"));

test("editorialPayload is the exact canonical v1 string", () => {
  expect(editorialPayload("p1", HASH)).toBe(
    `splash-editorial-signoff:v1:p1:${HASH}`,
  );
});

test("verifyEditorialSignature accepts a genuine signature", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  expect(
    verifyEditorialSignature({
      proposalId: "p1",
      sha256hex: HASH,
      signature,
      signer,
    }),
  ).toBe(true);
});

test("verifyEditorialSignature rejects wrong key, tampered hash, tampered sig, cross-proposal replay", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const other = makeSigner("mallory");
  const sig = signPayload(editorialPayload("p1", HASH));
  // wrong key
  expect(
    verifyEditorialSignature({
      proposalId: "p1",
      sha256hex: HASH,
      signature: sig,
      signer: other.signer,
    }),
  ).toBe(false);
  // tampered hash
  const otherHash = sha256Hex(new TextEncoder().encode("different"));
  expect(
    verifyEditorialSignature({
      proposalId: "p1",
      sha256hex: otherHash,
      signature: sig,
      signer,
    }),
  ).toBe(false);
  // tampered signature
  expect(
    verifyEditorialSignature({
      proposalId: "p1",
      sha256hex: HASH,
      signature: "AA" + sig.slice(2),
      signer,
    }),
  ).toBe(false);
  // cross-proposal replay (sig made for p1, presented as p2)
  expect(
    verifyEditorialSignature({
      proposalId: "p2",
      sha256hex: HASH,
      signature: sig,
      signer,
    }),
  ).toBe(false);
});

function reportWith(
  overrides: Partial<ProduceReport["results"][number]>,
): ProduceReport {
  return {
    results: [
      {
        id: "p1",
        producer: "chart-native",
        type: "bar",
        format: "static",
        outDir: "/tmp/p1",
        status: "produced",
        reviewed: true,
        renderApproved: true,
        approvedHash: HASH,
        ...overrides,
      } as any,
    ],
  } as any;
}

test("applyEditorialSignoff records a verified sign-off", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  const out = applyEditorialSignoff(
    reportWith({}),
    "p1",
    { signerId: "yvan", signature },
    [signer],
  );
  expect(out.results[0].editorialSignoffs).toEqual([
    { signerId: "yvan", signedHash: HASH, signature },
  ]);
});

test("applyEditorialSignoff throws on unknown signer / bad signature / not-approved / no approvedHash / unknown id", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  // unknown signer
  expect(() =>
    applyEditorialSignoff(
      reportWith({}),
      "p1",
      { signerId: "ghost", signature },
      [signer],
    ),
  ).toThrow(/unknown signer/i);
  // bad signature
  expect(() =>
    applyEditorialSignoff(
      reportWith({}),
      "p1",
      { signerId: "yvan", signature: "AA" + signature.slice(2) },
      [signer],
    ),
  ).toThrow(/invalid editorial signature/i);
  // not render-approved
  expect(() =>
    applyEditorialSignoff(
      reportWith({ renderApproved: false }),
      "p1",
      { signerId: "yvan", signature },
      [signer],
    ),
  ).toThrow(/not render-approved/i);
  // no approvedHash
  expect(() =>
    applyEditorialSignoff(
      reportWith({ approvedHash: undefined }),
      "p1",
      { signerId: "yvan", signature },
      [signer],
    ),
  ).toThrow(/no approved artifact/i);
  // unknown proposal id
  expect(() =>
    applyEditorialSignoff(
      reportWith({}),
      "nope",
      { signerId: "yvan", signature },
      [signer],
    ),
  ).toThrow(/unknown proposal/i);
});

test("applyEditorialSignoff replaces (dedups) a re-sign by the same signer", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  const once = applyEditorialSignoff(
    reportWith({}),
    "p1",
    { signerId: "yvan", signature },
    [signer],
  );
  const twice = applyEditorialSignoff(
    once,
    "p1",
    { signerId: "yvan", signature },
    [signer],
  );
  expect(twice.results[0].editorialSignoffs).toHaveLength(1);
});
