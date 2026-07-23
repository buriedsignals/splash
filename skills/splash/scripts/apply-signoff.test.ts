import { test, expect } from "bun:test";
import { recordSignoff } from "./apply-signoff.mjs";
import { generateEditorKeypair, signArtifact } from "./sign-artifact.mjs";
import { sha256Hex } from "../src/editorial-signoff.ts";

const BYTES = new TextEncoder().encode("the approved artifact");
const H = sha256Hex(BYTES);

function reportWith() {
  return {
    results: [
      {
        id: "p1",
        status: "produced",
        reviewed: true,
        renderApproved: true,
        approvedHash: H,
      },
    ],
  };
}

test("recordSignoff verifies + records an editor's signature (round-trip with the profile's key)", () => {
  const { privatePem, signersLine } = generateEditorKeypair("yvan");
  const { signature } = signArtifact(BYTES, "p1", privatePem);
  const profileMd = `---\nsigners:\n${signersLine}\n---\n# Newsroom`;
  const out = recordSignoff(reportWith(), "p1", "yvan", signature, profileMd);
  expect(out.results[0].editorialSignoffs).toEqual([
    { signerId: "yvan", signedHash: H, signature },
  ]);
});

test("recordSignoff throws when the signer is not registered in the profile", () => {
  const { privatePem } = generateEditorKeypair("yvan");
  const { signature } = signArtifact(BYTES, "p1", privatePem);
  const profileMd = `---\nlang: fr\n---\n# Newsroom`; // no signers
  expect(() =>
    recordSignoff(reportWith(), "p1", "yvan", signature, profileMd),
  ).toThrow(/unknown signer/i);
});
