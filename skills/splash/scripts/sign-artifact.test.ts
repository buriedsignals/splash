import { test, expect } from "bun:test";
import { generateEditorKeypair, signArtifact } from "./sign-artifact.mjs";
import {
  editorialPayload,
  verifyEditorialSignature,
} from "../src/editorial-signoff.ts";

test("generateEditorKeypair → signArtifact → verify round-trips (the real editor flow)", () => {
  const { privatePem, publicBase64, signersLine } =
    generateEditorKeypair("yvan");
  expect(signersLine).toContain("yvan:");
  const bytes = new TextEncoder().encode("the rendered chart bytes");
  const { sha256, signature } = signArtifact(bytes, "p1", privatePem);
  // the signature the editor produces verifies against their registered public key
  expect(
    verifyEditorialSignature({
      proposalId: "p1",
      sha256hex: sha256,
      signature,
      signer: { id: "yvan", publicKey: publicBase64 },
    }),
  ).toBe(true);
  // and NOT for a different proposal (payload binds proposalId)
  expect(
    verifyEditorialSignature({
      proposalId: "p2",
      sha256hex: sha256,
      signature,
      signer: { id: "yvan", publicKey: publicBase64 },
    }),
  ).toBe(false);
});

test("signArtifact hashes the FILE bytes itself (so no typed hash can be substituted)", () => {
  const { privatePem, publicBase64 } = generateEditorKeypair("rinny");
  const a = signArtifact(new TextEncoder().encode("A"), "p1", privatePem);
  const b = signArtifact(new TextEncoder().encode("B"), "p1", privatePem);
  expect(a.sha256).not.toBe(b.sha256);
  expect(a.signature).not.toBe(b.signature);
});
