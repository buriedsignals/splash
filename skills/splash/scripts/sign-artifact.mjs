import { generateKeyPairSync, createPrivateKey, sign as cryptoSign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { editorialPayload, sha256Hex } from "../src/editorial-signoff.ts";

/** One-time setup: an Ed25519 keypair for an editor. Private PEM stays with the editor; the
 *  public base64 (SPKI DER) + a ready-to-paste `signers:` line go into the newsroom profile. */
export function generateEditorKeypair(editorId) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicBase64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const signersLine = `  - ${editorId}:${publicBase64}`;
  return { privatePem, publicBase64, signersLine };
}

/** Sign the exact artifact FILE bytes for a proposal. Hashes the bytes itself — the operator
 *  cannot substitute a hash. Returns the sha256 + a base64 Ed25519 signature over the payload. */
export function signArtifact(fileBytes, proposalId, privatePem) {
  const sha256 = sha256Hex(fileBytes);
  const key = createPrivateKey({ key: privatePem, format: "pem", type: "pkcs8" });
  const signature = cryptoSign(null, Buffer.from(editorialPayload(proposalId, sha256), "utf8"), key).toString("base64");
  return { sha256, signature };
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);
  const keygenIdx = argv.indexOf("--keygen");
  if (keygenIdx !== -1) {
    const editorId = argv[keygenIdx + 1];
    if (!editorId) fail("usage: sign-artifact.mjs --keygen <editorId>");
    const { privatePem, signersLine } = generateEditorKeypair(editorId);
    const keyPath = `./${editorId}.splash-key.pem`;
    writeFileSync(keyPath, privatePem, { mode: 0o600 });
    console.log(`wrote private key → ${keyPath}  (KEEP THIS SECRET, do not commit)`);
    console.log(`paste this into NEWSROOM-PROFILE.md under 'signers:'\n${signersLine}`);
    return;
  }
  const file = argv[0];
  const proposalIdx = argv.indexOf("--proposal");
  const keyIdx = argv.indexOf("--key");
  const proposalId = proposalIdx !== -1 ? argv[proposalIdx + 1] : undefined;
  const keyPath = keyIdx !== -1 ? argv[keyIdx + 1] : undefined;
  if (!file || file.startsWith("--")) fail("usage: sign-artifact.mjs <artifactFile> --proposal <id> --key <privKeyPem>");
  if (!proposalId) fail("missing --proposal <id>");
  if (!keyPath) fail("missing --key <privKeyPem>");
  let fileBytes, privatePem;
  try {
    fileBytes = readFileSync(file);
  } catch {
    return fail(`cannot read artifact file ${file}`);
  }
  try {
    privatePem = readFileSync(keyPath, "utf8");
  } catch {
    return fail(`cannot read key ${keyPath}`);
  }
  const { sha256, signature } = signArtifact(fileBytes, proposalId, privatePem);
  console.log(`artifact sha256: ${sha256}`);
  console.log(`signature (base64): ${signature}`);
}

if (import.meta.main) main();
