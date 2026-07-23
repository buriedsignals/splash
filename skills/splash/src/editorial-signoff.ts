import {
  createHash,
  createPublicKey,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";
import type { ProduceReport } from "./producer-spec";

export interface EditorSigner {
  id: string;
  publicKey: string; // base64-encoded DER SPKI Ed25519 public key
}

export interface EditorialSignoff {
  signerId: string;
  signedHash: string;
  signature: string; // base64
}

/** The exact UTF-8 string an editor signs and the gate verifies. Binds proposal + artifact hash. */
export function editorialPayload(
  proposalId: string,
  sha256hex: string,
): string {
  return `splash-editorial-signoff:v1:${proposalId}:${sha256hex}`;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Import a base64 SPKI DER Ed25519 public key, or null if it is not a valid importable key. */
export function importSignerPublicKey(base64Spki: string): KeyObject | null {
  try {
    const key = createPublicKey({
      key: Buffer.from(base64Spki, "base64"),
      format: "der",
      type: "spki",
    });
    return key.asymmetricKeyType === "ed25519" ? key : null;
  } catch {
    return null;
  }
}

export function verifyEditorialSignature(args: {
  proposalId: string;
  sha256hex: string;
  signature: string;
  signer: EditorSigner;
}): boolean {
  const key = importSignerPublicKey(args.signer.publicKey);
  if (!key) return false;
  const payload = Buffer.from(
    editorialPayload(args.proposalId, args.sha256hex),
    "utf8",
  );
  let sig: Buffer;
  try {
    sig = Buffer.from(args.signature, "base64");
  } catch {
    return false;
  }
  try {
    return cryptoVerify(null, payload, key, sig);
  } catch {
    return false;
  }
}

/** Record a verified human editorial sign-off on a produced+render-approved result. Pure. */
export function applyEditorialSignoff(
  report: ProduceReport,
  id: string,
  attestation: { signerId: string; signature: string },
  signers: EditorSigner[],
): ProduceReport {
  const target = report.results.find((r) => r.id === id);
  if (!target) throw new Error(`unknown proposal ${id}`);
  if (!target.renderApproved)
    throw new Error(
      `cannot editorially sign ${id}: not render-approved (run gate-render first)`,
    );
  if (!target.approvedHash)
    throw new Error(
      `cannot editorially sign ${id}: no approved artifact hash on the result`,
    );
  const signer = signers.find((s) => s.id === attestation.signerId);
  if (!signer) throw new Error(`unknown signer ${attestation.signerId}`);
  const ok = verifyEditorialSignature({
    proposalId: id,
    sha256hex: target.approvedHash,
    signature: attestation.signature,
    signer,
  });
  if (!ok)
    throw new Error(
      `invalid editorial signature from ${attestation.signerId} for ${id}`,
    );
  const entry: EditorialSignoff = {
    signerId: attestation.signerId,
    signedHash: target.approvedHash,
    signature: attestation.signature,
  };
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    const prior = (r.editorialSignoffs ?? []).filter(
      (s) => s.signerId !== attestation.signerId,
    );
    return { ...r, editorialSignoffs: [...prior, entry] };
  });
  return { ...report, results };
}
