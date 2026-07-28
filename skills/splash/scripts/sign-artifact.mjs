import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { sha256Hex, signEditorialSubject } from "../src/editorial-signoff.ts";

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
  return signSubject(sha256Hex(fileBytes), proposalId, privatePem);
}

/** Sign a SUBJECT that is already a sha256 — the shape a HOSTED delivery has.
 *
 *  A Datawrapper interactive is published on Datawrapper's own CDN and the newsroom owns no file
 *  of it, so there are no bytes for an editor to hash. What the run binds an approval to instead
 *  is the HOSTED BINDING (lib/verify/hosted.ts): the published address hashed together with the
 *  still the loop captured at it. The editor cannot re-derive that — a screenshot is not
 *  reproducible byte-for-byte — so the gate PRINTS it and this signs it.
 *
 *  That looks like the substitution `signArtifact` above exists to prevent, and it is not: the
 *  signature is verified against the run's OWN subject (lib/loop/approve.ts hands the verifier
 *  `approvalSubjectOf(el)`, never the operator's string), so a digest that is not the one the run
 *  recorded simply fails to verify. What the operator can choose is which digest they sign, not
 *  which digest they are checked against. */
export function signSubject(sha256hex, proposalId, privatePem) {
  return signEditorialSubject(String(sha256hex), proposalId, privatePem);
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
  const digestIdx = argv.indexOf("--digest");
  const proposalId = proposalIdx !== -1 ? argv[proposalIdx + 1] : undefined;
  const keyPath = keyIdx !== -1 ? argv[keyIdx + 1] : undefined;
  // A HOSTED delivery has no file to point at — the approval gate prints the binding to sign.
  const digest = digestIdx !== -1 ? argv[digestIdx + 1] : undefined;
  if (!digest && (!file || file.startsWith("--")))
    fail("usage: sign-artifact.mjs <artifactFile> --proposal <id> --key <privKeyPem>\n   or: sign-artifact.mjs --digest <sha256> --proposal <id> --key <privKeyPem>   (a published embed, which has no file)");
  if (!proposalId) fail("missing --proposal <id>");
  if (!keyPath) fail("missing --key <privKeyPem>");
  let privatePem;
  try {
    privatePem = readFileSync(keyPath, "utf8");
  } catch {
    return fail(`cannot read key ${keyPath}`);
  }
  let signed;
  if (digest) {
    try {
      signed = signSubject(digest, proposalId, privatePem);
    } catch (e) {
      return fail(`${e.message} — --digest takes the hosted binding the approval gate printed`);
    }
  } else {
    let fileBytes;
    try {
      fileBytes = readFileSync(file);
    } catch {
      return fail(`cannot read artifact file ${file}`);
    }
    signed = signArtifact(fileBytes, proposalId, privatePem);
  }
  console.log(`artifact sha256: ${signed.sha256}`);
  console.log(`signature (base64): ${signed.signature}`);
}

if (import.meta.main) main();
