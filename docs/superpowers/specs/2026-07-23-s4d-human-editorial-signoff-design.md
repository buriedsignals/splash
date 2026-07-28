# S4d — Human editorial sign-off gate (Ed25519, re-verified at export)

> AUDIT #2 capstone, sub-project 4 (final) of S4. Lives in the splash TOOL (`skills/splash`).
> Closes the audit item `gate.ts:4-10` — the human render-approval is LLM-attested and its
> `approvedHash` is "NOT enforcement — nothing re-reads or compares it later."

## Problem

The splash tool's Gate 3 (`applyRenderGate`, `skills/splash/src/gate.ts`) records
`renderApproved: true` + `approvedHash` (sha256 of the approved artifact) when the journalist says
"ship it". But **the flag is written by the LLM orchestrator, and `approvedHash` is never re-read**
— so a real human editorial sign-off is unforgeable-in-principle-only: an LLM running the flow can
set the approval itself, and nothing at export verifies a human ever approved the exact shipped
bytes. For the grant deliverable (a Heidi.news investigation published under Yvan Pandelé's editorial
lead + Rinny Gremaud's narrative sign-off), "editorially approved" must mean a **real editor
cryptographically attested to the exact artifact**, and the tool must **re-verify that at export**.

## Goals

1. Let a newsroom register **editor public keys** (Ed25519) in its profile — a trust anchor outside
   the LLM's generated-artifact surface.
2. Capture a human sign-off as an **Ed25519 signature over the exact artifact**, produced by the
   editor on their own machine (private key the LLM never holds).
3. **Re-verify the signature at export** against the *current* artifact bytes — a re-produce
   (new hash) invalidates it. Closes the "`approvedHash` never re-read" gap.
4. **Fail loud** on any forgery vector (wrong key, tampered hash, tampered signature, unknown
   signer, cross-proposal replay).
5. Stay **local-first / zero-backend / CMS-agnostic** — `node:crypto` only, no service, works
   offline; and **honest** — an export never claims human approval it cannot cryptographically prove.
6. Never break autonomous/harness runs — the requirement is **opt-in per newsroom**; its absence is
   recorded truthfully as "unsigned", not silently as approved.

## Non-goals

- **Not** a PKI / key-distribution / revocation system — keys are registered manually in the profile.
- **Not** replacing the LLM render-approval (`renderApproved`) — editorial sign-off is an **additive**
  layer on top of it.
- **Not** multi-sig thresholds beyond "every declared `requiredSigner`".
- **Not** a signing UI — the editor runs a CLI helper on their machine.
- **Not** touching the harness — this is the TOOL's export gate (Yvan/Rinny never use the harness).

## Architecture

Four units in `skills/splash`, plus the export re-verify hook. The LLM render-approval spine
(`applyRenderGate`, the fresh-report-per-produce reset) is unchanged; editorial sign-off sits above it.

```
NEWSROOM-PROFILE.md  (checked in, OUTSIDE the LLM's generated surface)
  signers: [{id, publicKey(base64 SPKI DER)}]   requiredSigners: [id,...]
        │  parsed by brand-profile.ts → BrandProfile.signers / .requiredSigners
        ▼
 gate.ts applyRenderGate → renderApproved:true + approvedHash   (UNCHANGED, LLM-level)
        │
        ▼   editor reviews the RENDERED file out of band, runs:
 scripts/sign-artifact.mjs <file> --proposal <id> --key <privkey>
        │        → signature over payload  "splash-editorial-signoff:v1:<id>:<sha256(file)>"
        ▼
 editorial-signoff.ts applyEditorialSignoff(report, id, {signerId, signature}, profile)
        │        verifies sig vs registered pubkey → records result.editorialSignoffs[]
        ▼
 export-guard.ts  assertEditoriallyCleared(report, id, profile, currentArtifactBytes)
        │        requiredSigners present → RE-verify each vs sha256(currentBytes) or THROW
        │        none → proceed, record "unsigned (LLM render-approval only)"
        ▼
 export-code.mjs / deploy-embed.mjs
```

### Payload (canonical, versioned)

The editor signs, and the gate verifies, exactly this UTF-8 string:

```
splash-editorial-signoff:v1:<proposalId>:<sha256hex-of-artifact-bytes>
```

Binding the `proposalId` prevents replaying a signature onto a different proposal; binding the
sha256 binds it to the exact bytes. `v1` allows a future format change without ambiguity.

### Unit 1 — `brand-profile.ts` (extend `BrandProfile`)

```ts
export interface EditorSigner {
  id: string;        // stable editor id, e.g. "yvan", "rinny"
  publicKey: string; // base64-encoded DER SPKI Ed25519 public key (single line, profile-friendly)
}
// added to BrandProfile:
signers?: EditorSigner[];        // registered editor keys
requiredSigners?: string[];      // signer ids whose sign-off the export path REQUIRES (subset of signers' ids)
```

Parsed from `NEWSROOM-PROFILE.md` frontmatter. A `signers` entry with a malformed / non-importable
public key is **dropped with a warning** (mirrors the existing non-hex-palette drop). A
`requiredSigners` id not present in `signers` is a **profile error** surfaced at parse (a newsroom
cannot require a signer it hasn't registered a key for). `buildProfile` returns a profile when
`signers` is present even if the colour fields are empty (signers alone is a usable field).

### Unit 2 — `editorial-signoff.ts` (crypto core)

```ts
export function editorialPayload(proposalId: string, sha256hex: string): string; // the canonical string
export function verifyEditorialSignature(args: {
  proposalId: string;
  sha256hex: string;
  signature: string;   // base64
  signer: EditorSigner;
}): boolean;            // node:crypto Ed25519 crypto.verify(null, payloadBytes, pubKey, sig)

export interface EditorialSignoff { signerId: string; signedHash: string; signature: string }

export function applyEditorialSignoff(
  report: ProduceReport,
  id: string,
  attestation: { signerId: string; signature: string },
  profile: BrandProfile,
): ProduceReport;
```

`applyEditorialSignoff` (pure, like `applyRenderGate`):
- throws `unknown proposal ${id}` if no result with that id;
- throws if `!result.renderApproved` or `!result.approvedHash` — you cannot editorially sign an
  artifact that has not been render-approved (nothing pinned to sign);
- throws `unknown signer ${signerId}` if the id is not in `profile.signers`;
- verifies the signature over `editorialPayload(id, result.approvedHash)` with that signer's
  registered public key; throws `invalid editorial signature` on failure;
- on success, appends `{signerId, signedHash: approvedHash, signature}` to
  `result.editorialSignoffs` (dedup by signerId — a re-sign by the same editor replaces the prior
  entry), returns the updated report.

### Unit 3 — `scripts/sign-artifact.mjs` (the editor's out-of-band signer + keygen)

- `bun scripts/sign-artifact.mjs --keygen <editorId>` → generates an Ed25519 keypair; writes the
  **private key** (PKCS8 PEM) to `./<editorId>.splash-key.pem` (0600), prints the **public key**
  (base64 SPKI DER) + the exact `signers:` YAML line to paste into `NEWSROOM-PROFILE.md`. One-time
  setup, run by (or for) each editor.
- `bun scripts/sign-artifact.mjs <artifactFile> --proposal <id> --key <privKeyPem>` → reads the
  artifact FILE, computes `sha256(bytes)` **itself** (so no operator can substitute a hash), builds
  `editorialPayload(id, sha256)`, signs with the private key, prints the base64 signature (and, for
  convenience, the signerId if embedded). The editor runs this on their own machine against the file
  they actually reviewed.
- Fails loud on: missing/unreadable file, missing `--proposal`, missing/unreadable key.

### Unit 4 — export re-verify (`export-guard.ts`)

```ts
export function assertEditoriallyCleared(
  report: ProduceReport,
  id: string,
  profile: BrandProfile,
  currentArtifactBytes: Uint8Array,
): { signedBy: string[]; unsigned: boolean };
```

- Compute `hash = sha256(currentArtifactBytes)`.
- If `profile.requiredSigners` is non-empty: for EACH required signer id, find a recorded
  `editorialSignoff` on the result with that `signerId` whose `signedHash === hash`, and
  **re-verify** its signature over `editorialPayload(id, hash)` against the registered public key.
  Any missing required signer, hash mismatch (artifact re-produced since sign-off), or failed
  re-verification → **throw** a clear error naming the failing signer + reason. Returns
  `{signedBy: [...required ids...], unsigned: false}`.
- If `requiredSigners` is empty/absent: do **not** block. Return `{signedBy: <ids of any valid
  recorded sign-offs>, unsigned: signedBy.length === 0}` so the caller records the truthful state.
- `assertShippable` is unchanged; the export entrypoints (`export-code.mjs`, `deploy-embed.mjs`)
  call `assertEditoriallyCleared` after `assertShippable` and surface `{signedBy, unsigned}` in the
  export manifest / stdout (e.g. `EDITORIAL: signed by yvan, rinny` or
  `EDITORIAL: unsigned — LLM render-approval only`).

### Re-produce reset (mirror the existing `approvedHash` strip)

`produce-all.ts` already strips `reviewed`/`renderApproved`/`approvedHash` on every produce so a
re-produce cannot ship on a stale approval. **Add `editorialSignoffs: undefined` to that strip** —
a re-produced artifact starts with no editorial sign-off, forcing a fresh human attestation. The
export re-verify (Unit 4) is the defense-in-depth backstop even if that strip were bypassed.

## Threat model (what makes it non-forgeable)

- The signature is verified against a **public key registered in the checked-in profile**, outside
  the LLM's generated-artifact surface; the LLM never holds the private key, so it cannot produce a
  valid signature over any payload.
- The gate **re-verifies at export against the current bytes**, so an LLM that re-produces or edits
  the artifact after a sign-off breaks the hash match and the export fails (closes the audit gap).
- The payload binds `proposalId` + `sha256`, so a captured signature cannot be replayed onto a
  different proposal or a different artifact.
- Honest fallback: with no `requiredSigners` the export still runs (local-first files are the
  journalist's own) but is **recorded unsigned** — the tool never asserts an editorial approval it
  cannot prove.

**Operational precondition — the profile itself must be a trusted channel.** All of the above rests
on `NEWSROOM-PROFILE.md` (the registered public keys under `signers:` / `requiredSigners:`) being
**checked into version control and its diffs human-reviewed**, the same way any other change to the
repo is. The gate only proves "the holder of the private key registered under id `X` in *this*
profile signed these exact bytes" — it has no way to verify that id `X` really is the editor it
claims to be. An actor with filesystem write access to the profile (the LLM orchestrator included, if
ever given that access, or anyone else who can write to the working tree) could register their own
freshly-generated key under a real editor's id (e.g. `yvan`) and then self-sign any artifact — the
gate would verify that signature as genuine, because it only checks the signature against whatever
key the profile currently lists, never against the *real* Yvan's actual key out-of-band. This is
**not detectable in code** — there is no mechanism here that can distinguish a legitimately
newsroom-registered key from a forged substitution written straight to disk. The non-forgeability
claim above therefore holds only under the operational precondition that `NEWSROOM-PROFILE.md` lives
in version control, is never written to by the automated flow, and every change to its `signers:` /
`requiredSigners:` block goes through the same human review as any other commit (i.e. a newsroom that
lets an agent edit `NEWSROOM-PROFILE.md` directly, or accepts profile changes without review, has
opted out of the guarantee this gate is meant to provide).

## Testing (deterministic, zero real-human dependency)

`editorial-signoff.test.ts`:
- Generate an Ed25519 test keypair in-test (`crypto.generateKeyPairSync("ed25519")`); sign the
  canonical payload; `verifyEditorialSignature` returns true.
- verify returns **false** on: wrong public key, tampered `sha256hex`, tampered signature, wrong
  `proposalId` (cross-proposal replay).
- `applyEditorialSignoff`: records a valid sign-off; throws on unknown signer, on a bad signature,
  on a result with `renderApproved:false`/no `approvedHash`, and on an unknown proposal id; a re-sign
  by the same signer replaces (no duplicate) their entry.

`brand-profile.test.ts` (extend):
- `signers` parsed from frontmatter; a malformed public key entry dropped with a warning; a
  `requiredSigners` id absent from `signers` surfaced as a profile error; `signers`-only profile
  (no palette) still returns a profile.

`export-guard.test.ts` (extend):
- `assertEditoriallyCleared` with `requiredSigners: [yvan]`: passes when a valid `yvan` sign-off
  matches the current bytes; **throws** when the artifact bytes differ from `signedHash` (re-produced);
  **throws** when the required signer's sign-off is absent.
- with no `requiredSigners`: returns `{unsigned:true}` when there are no sign-offs, `{unsigned:false,
  signedBy:[...]}` when a valid sign-off is present — never throws.

`produce-all.test.ts` (extend): a re-produce strips `editorialSignoffs` (mirrors the existing
`approvedHash` strip test).

## Follow-ups (out of scope)

> Registre consolidé : `docs/splash/residuals.md` — statut vérifié contre le code, pile A/B/C.

- Wire the export-manifest `{signedBy, unsigned}` line into the export-code/deploy-embed stdout the
  journalist sees (thin plumbing; the guard returns the data).
- Real keypair generation + profile registration for Yvan/Rinny (operational, on the real Heidi.news
  run — needs their input, S4c/S4d human step).
- Optional: bind the same signature discipline to the harness cert layer (the "shared primitive"
  option deferred in brainstorming) if autonomous certification ever needs a human anchor.
