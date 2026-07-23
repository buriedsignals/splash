# S4d — Human editorial sign-off gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a human editorial sign-off to the splash tool's export gate — an Ed25519 signature over the exact artifact, verified against editor public keys registered in the newsroom profile, and re-verified at export so an LLM cannot forge or stale-ship it.

**Architecture:** A leaf crypto module `editorial-signoff.ts` (node:crypto Ed25519: payload, verify, `applyEditorialSignoff`) that `brand-profile.ts` extends (registered `signers` + `requiredSigners`) and `export-guard.ts` consumes (`assertEditoriallyCleared`, re-verifying against current bytes). The LLM render-approval spine (`applyRenderGate`, the fresh-report-per-produce reset) is unchanged; editorial sign-off is an additive layer, opt-in per newsroom via `requiredSigners`.

**Tech Stack:** Bun, TypeScript, `bun:test`, `node:crypto` (Ed25519 — no new dependencies).

## Global Constraints

- Runtime **Bun**; tests `bun:test`; TDD (failing test first).
- Commit on branch `main` of the splash-merge repo. **No vendor trailer** — no `Claude`/`Anthropic`/`Co-Authored-By`/`Claude-Session` line in any commit.
- **`node:crypto` only** — no new dependency; local-first, zero-backend, works offline.
- Editorial sign-off is **ADDITIVE**: do NOT change `applyRenderGate`, `renderApproved`, or the LLM-level approval behaviour. Do NOT modify `assertShippable`.
- **Payload is EXACTLY** the UTF-8 string `splash-editorial-signoff:v1:<proposalId>:<sha256hex>` (lowercase hex sha256 of the artifact bytes).
- **Fail loud** on every forge/misconfig vector: wrong key, tampered hash, tampered signature, unknown signer, cross-proposal replay, a `requiredSigner` not registered in `signers`.
- **Honest**: with no `requiredSigners` the export still runs but records `unsigned` — never claim an editorial approval that isn't cryptographically proven.
- **Opt-in**: an empty/absent `requiredSigners` never blocks export (autonomous/harness/solo-newsroom runs must not break).
- Ed25519 key encodings: public = **base64 SPKI DER** (single line, profile-friendly); private = **PKCS8 PEM** (the editor keeps it). Sign/verify use `crypto.sign(null, …)` / `crypto.verify(null, …)` (algorithm is null for Ed25519).

---

### Task 1: `editorial-signoff.ts` — crypto core + `applyEditorialSignoff` + `ProposalResult.editorialSignoffs`

**Files:**
- Create: `skills/splash/src/editorial-signoff.ts`
- Modify: `skills/splash/src/producer-spec.ts` (add the `editorialSignoffs?` field to `ProposalResult`)
- Test: `skills/splash/src/editorial-signoff.test.ts`

**Interfaces:**
- Consumes: `ProduceReport`, `ProposalResult` from `./producer-spec` (types only).
- Produces:
  - `interface EditorSigner { id: string; publicKey: string }` (publicKey = base64 SPKI DER)
  - `interface EditorialSignoff { signerId: string; signedHash: string; signature: string }`
  - `function editorialPayload(proposalId: string, sha256hex: string): string`
  - `function sha256Hex(bytes: Uint8Array): string`
  - `function importSignerPublicKey(base64Spki: string): import("node:crypto").KeyObject | null` (null when not importable)
  - `function verifyEditorialSignature(args: { proposalId: string; sha256hex: string; signature: string; signer: EditorSigner }): boolean`
  - `function applyEditorialSignoff(report: ProduceReport, id: string, attestation: { signerId: string; signature: string }, signers: EditorSigner[]): ProduceReport`

- [ ] **Step 1: Add the `editorialSignoffs` field to `ProposalResult`**

In `skills/splash/src/producer-spec.ts`, inside `interface ProposalResult` (right after the `approvedHash?` line), add:

```ts
  /** verified human editorial sign-offs over approvedHash (S4d); undefined = none */
  editorialSignoffs?: { signerId: string; signedHash: string; signature: string }[];
```

- [ ] **Step 2: Write the failing test**

```ts
// skills/splash/src/editorial-signoff.test.ts
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
  const pub = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const signer: EditorSigner = { id, publicKey: pub };
  const signPayload = (payload: string) =>
    cryptoSign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64");
  return { signer, privateKey, signPayload };
}

const HASH = sha256Hex(new TextEncoder().encode("artifact-bytes"));

test("editorialPayload is the exact canonical v1 string", () => {
  expect(editorialPayload("p1", HASH)).toBe(`splash-editorial-signoff:v1:p1:${HASH}`);
});

test("verifyEditorialSignature accepts a genuine signature", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  expect(verifyEditorialSignature({ proposalId: "p1", sha256hex: HASH, signature, signer })).toBe(true);
});

test("verifyEditorialSignature rejects wrong key, tampered hash, tampered sig, cross-proposal replay", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const other = makeSigner("mallory");
  const sig = signPayload(editorialPayload("p1", HASH));
  // wrong key
  expect(verifyEditorialSignature({ proposalId: "p1", sha256hex: HASH, signature: sig, signer: other.signer })).toBe(false);
  // tampered hash
  const otherHash = sha256Hex(new TextEncoder().encode("different"));
  expect(verifyEditorialSignature({ proposalId: "p1", sha256hex: otherHash, signature: sig, signer })).toBe(false);
  // tampered signature
  expect(verifyEditorialSignature({ proposalId: "p1", sha256hex: HASH, signature: "AA" + sig.slice(2), signer })).toBe(false);
  // cross-proposal replay (sig made for p1, presented as p2)
  expect(verifyEditorialSignature({ proposalId: "p2", sha256hex: HASH, signature: sig, signer })).toBe(false);
});

function reportWith(overrides: Partial<ProduceReport["results"][number]>): ProduceReport {
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
  const out = applyEditorialSignoff(reportWith({}), "p1", { signerId: "yvan", signature }, [signer]);
  expect(out.results[0].editorialSignoffs).toEqual([{ signerId: "yvan", signedHash: HASH, signature }]);
});

test("applyEditorialSignoff throws on unknown signer / bad signature / not-approved / no approvedHash / unknown id", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  // unknown signer
  expect(() => applyEditorialSignoff(reportWith({}), "p1", { signerId: "ghost", signature }, [signer])).toThrow(/unknown signer/i);
  // bad signature
  expect(() => applyEditorialSignoff(reportWith({}), "p1", { signerId: "yvan", signature: "AA" + signature.slice(2) }, [signer])).toThrow(/invalid editorial signature/i);
  // not render-approved
  expect(() => applyEditorialSignoff(reportWith({ renderApproved: false }), "p1", { signerId: "yvan", signature }, [signer])).toThrow(/not render-approved/i);
  // no approvedHash
  expect(() => applyEditorialSignoff(reportWith({ approvedHash: undefined }), "p1", { signerId: "yvan", signature }, [signer])).toThrow(/no approved artifact/i);
  // unknown proposal id
  expect(() => applyEditorialSignoff(reportWith({}), "nope", { signerId: "yvan", signature }, [signer])).toThrow(/unknown proposal/i);
});

test("applyEditorialSignoff replaces (dedups) a re-sign by the same signer", () => {
  const { signer, signPayload } = makeSigner("yvan");
  const signature = signPayload(editorialPayload("p1", HASH));
  const once = applyEditorialSignoff(reportWith({}), "p1", { signerId: "yvan", signature }, [signer]);
  const twice = applyEditorialSignoff(once, "p1", { signerId: "yvan", signature }, [signer]);
  expect(twice.results[0].editorialSignoffs).toHaveLength(1);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/editorial-signoff.test.ts`
Expected: FAIL — module `./editorial-signoff.ts` not found.

- [ ] **Step 4: Write the implementation**

```ts
// skills/splash/src/editorial-signoff.ts
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
export function editorialPayload(proposalId: string, sha256hex: string): string {
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
  const payload = Buffer.from(editorialPayload(args.proposalId, args.sha256hex), "utf8");
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
    throw new Error(`cannot editorially sign ${id}: not render-approved (run gate-render first)`);
  if (!target.approvedHash)
    throw new Error(`cannot editorially sign ${id}: no approved artifact hash on the result`);
  const signer = signers.find((s) => s.id === attestation.signerId);
  if (!signer) throw new Error(`unknown signer ${attestation.signerId}`);
  const ok = verifyEditorialSignature({
    proposalId: id,
    sha256hex: target.approvedHash,
    signature: attestation.signature,
    signer,
  });
  if (!ok) throw new Error(`invalid editorial signature from ${attestation.signerId} for ${id}`);
  const entry: EditorialSignoff = {
    signerId: attestation.signerId,
    signedHash: target.approvedHash,
    signature: attestation.signature,
  };
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    const prior = (r.editorialSignoffs ?? []).filter((s) => s.signerId !== attestation.signerId);
    return { ...r, editorialSignoffs: [...prior, entry] };
  });
  return { ...report, results };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/editorial-signoff.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/editorial-signoff.ts skills/splash/src/editorial-signoff.test.ts skills/splash/src/producer-spec.ts
git commit -m "feat(splash): editorial sign-off crypto core — Ed25519 payload/verify/apply"
```

---

### Task 2: `brand-profile.ts` — register `signers` + `requiredSigners`

**Files:**
- Modify: `skills/splash/src/brand-profile.ts`
- Test: `skills/splash/src/brand-profile.test.ts`

**Interfaces:**
- Consumes: `EditorSigner`, `importSignerPublicKey` from `./editorial-signoff` (Task 1).
- Produces: `BrandProfile.signers?: EditorSigner[]` + `BrandProfile.requiredSigners?: string[]`, parsed by both `parseBrandProfile` (JSON) and `parseNewsroomMarkdown` (frontmatter).

**Frontmatter shape (dependency-free parser):** `signers` is a scalar list of `- id:base64key` entries (base64 SPKI DER has no `:`, so split on the FIRST `:`); `requiredSigners` is a plain scalar list like `palette`:

```yaml
signers:
  - yvan:MCowBQYDK2VwAyEA<base64…>
  - rinny:MCowBQYDK2VwAyEA<base64…>
requiredSigners:
  - yvan
  - rinny
```

- [ ] **Step 1: Write the failing test**

```ts
// append to skills/splash/src/brand-profile.test.ts
import { generateKeyPairSync } from "node:crypto";
import { parseBrandProfile, parseNewsroomMarkdown } from "./brand-profile.ts";

function pub(): string {
  return generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "der" }).toString("base64");
}

test("parseBrandProfile reads signers + requiredSigners; drops a malformed key", () => {
  const yvan = pub();
  const p = parseBrandProfile(JSON.stringify({
    signers: [{ id: "yvan", publicKey: yvan }, { id: "bad", publicKey: "not-a-key" }],
    requiredSigners: ["yvan"],
  }));
  expect(p?.signers).toEqual([{ id: "yvan", publicKey: yvan }]); // malformed dropped
  expect(p?.requiredSigners).toEqual(["yvan"]);
});

test("a signers-only profile (no palette) is still a profile", () => {
  const p = parseBrandProfile(JSON.stringify({ signers: [{ id: "yvan", publicKey: pub() }] }));
  expect(p).not.toBeNull();
  expect(p?.palette).toEqual([]);
});

test("a requiredSigner not present in signers is a profile error", () => {
  expect(() =>
    parseBrandProfile(JSON.stringify({ signers: [{ id: "yvan", publicKey: pub() }], requiredSigners: ["rinny"] })),
  ).toThrow(/requiredSigner .*rinny.* not registered/i);
});

test("parseNewsroomMarkdown reads the flattened signers list + requiredSigners", () => {
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
  expect(p?.signers).toEqual([{ id: "yvan", publicKey: yvan }, { id: "rinny", publicKey: rinny }]);
  expect(p?.requiredSigners).toEqual(["yvan", "rinny"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/brand-profile.test.ts`
Expected: FAIL — `signers`/`requiredSigners` not parsed.

- [ ] **Step 3: Extend `BrandProfile`, `buildProfile`, and both parsers**

In `skills/splash/src/brand-profile.ts`:

3a. Add the import at the top (after the existing imports):

```ts
import { importSignerPublicKey, type EditorSigner } from "./editorial-signoff";
```

3b. Add to the `BrandProfile` interface (after `theme?`):

```ts
  /** registered editor public keys for the editorial sign-off gate (S4d) */
  signers?: EditorSigner[];
  /** signer ids whose editorial sign-off the export path REQUIRES (subset of signers' ids) */
  requiredSigners?: string[];
```

3c. In `buildProfile`, extend the `fields` param type with `signers?: unknown; requiredSigners?: unknown;`, then before the `if (palette.length === 0 && …)` guard, validate signers/required:

```ts
  const signers: EditorSigner[] = Array.isArray(fields.signers)
    ? fields.signers.flatMap((s): EditorSigner[] => {
        if (!s || typeof s !== "object") return [];
        const id = (s as any).id;
        const publicKey = (s as any).publicKey;
        if (typeof id !== "string" || !id.trim() || typeof publicKey !== "string") return [];
        if (!importSignerPublicKey(publicKey)) {
          console.warn(`brand-profile: dropping signer '${id}' — public key is not a valid Ed25519 SPKI key`);
          return [];
        }
        return [{ id: id.trim(), publicKey }];
      })
    : [];
  const requiredSigners: string[] = Array.isArray(fields.requiredSigners)
    ? fields.requiredSigners.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];
  for (const req of requiredSigners) {
    if (!signers.some((s) => s.id === req))
      throw new Error(`brand-profile: requiredSigner '${req}' not registered in signers`);
  }
```

3d. Update the usable-field guard to count signers, and attach the fields:

```ts
  if (palette.length === 0 && !source && !lang && !credit && !theme && signers.length === 0)
    return null;
  const p: BrandProfile = { palette };
  if (accent) p.accent = accent;
  if (source) p.source = source;
  if (lang) p.lang = lang;
  if (credit) p.credit = credit;
  if (theme) p.theme = theme;
  if (signers.length) p.signers = signers;
  if (requiredSigners.length) p.requiredSigners = requiredSigners;
  return p;
```

3e. In `parseBrandProfile`, pass the two new fields into `buildProfile`:

```ts
  return buildProfile({
    palette: o.palette,
    accent: o.accent,
    source: o.source,
    lang: o.lang,
    credit: o.credit,
    theme: o.theme,
    signers: o.signers,
    requiredSigners: o.requiredSigners,
  });
```

3f. In `parseNewsroomMarkdown`, add `signers`/`requiredSigners` to the local `fields` type (`signers?: { id: string; publicKey: string }[]; requiredSigners?: string[];`), and add two list branches inside the `while` loop, alongside the `palette` branch (reuse the same indented-`- item` collection):

```ts
    if (key === "signers" && val === "") {
      const items: { id: string; publicKey: string }[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trim() === "") { i++; continue; }
        const m = lines[i].match(/^[ \t]+-[ \t]*(.*)$/);
        if (!m) break;
        const raw = unquote(m[1]);
        const colon = raw.indexOf(":"); // split on the FIRST colon (base64 has none)
        if (colon > 0) items.push({ id: raw.slice(0, colon).trim(), publicKey: raw.slice(colon + 1).trim() });
        i++;
      }
      fields.signers = items;
      continue;
    }
    if (key === "requiredSigners" && val === "") {
      const items: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trim() === "") { i++; continue; }
        const m = lines[i].match(/^[ \t]+-[ \t]*(.*)$/);
        if (!m) break;
        items.push(unquote(m[1]).trim());
        i++;
      }
      fields.requiredSigners = items;
      continue;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/brand-profile.test.ts`
Expected: PASS (the new tests + the existing brand-profile tests, all green).

- [ ] **Step 5: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/brand-profile.ts skills/splash/src/brand-profile.test.ts
git commit -m "feat(splash): register editor signers + requiredSigners in the newsroom profile"
```

---

### Task 3: `export-guard.ts` `assertEditoriallyCleared` + re-produce strip

**Files:**
- Modify: `skills/splash/src/export-guard.ts`
- Modify: `skills/splash/src/produce-all.ts` (add `editorialSignoffs: undefined` to the existing per-produce strip)
- Test: `skills/splash/src/export-guard.test.ts`
- Test: `skills/splash/tests/produce-all.test.ts` (extend the existing strip test)

**Interfaces:**
- Consumes: `EditorSigner`, `editorialPayload`, `verifyEditorialSignature`, `sha256Hex` from `./editorial-signoff`; `BrandProfile` from `./brand-profile`; `ProduceReport` from `./producer-spec`.
- Produces: `function assertEditoriallyCleared(report: ProduceReport, id: string, profile: BrandProfile, currentArtifactBytes: Uint8Array): { signedBy: string[]; unsigned: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/src/export-guard.test.ts  (append; keep existing imports/tests)
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { assertEditoriallyCleared } from "./export-guard.ts";
import { editorialPayload, sha256Hex, type EditorSigner } from "./editorial-signoff.ts";
import type { BrandProfile } from "./brand-profile.ts";
import type { ProduceReport } from "./producer-spec.ts";

const BYTES = new TextEncoder().encode("the-approved-artifact");
const H = sha256Hex(BYTES);

function signerFor(id: string) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const signer: EditorSigner = { id, publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64") };
  const signature = cryptoSign(null, Buffer.from(editorialPayload("p1", H), "utf8"), privateKey).toString("base64");
  return { signer, signature };
}

function report(signoffs: { signerId: string; signedHash: string; signature: string }[]): ProduceReport {
  return { results: [{ id: "p1", status: "produced", reviewed: true, renderApproved: true, approvedHash: H, editorialSignoffs: signoffs } as any] } as any;
}

test("assertEditoriallyCleared passes when a required signer's sign-off matches the current bytes", () => {
  const { signer, signature } = signerFor("yvan");
  const profile: BrandProfile = { palette: [], signers: [signer], requiredSigners: ["yvan"] };
  const r = report([{ signerId: "yvan", signedHash: H, signature }]);
  expect(assertEditoriallyCleared(r, "p1", profile, BYTES)).toEqual({ signedBy: ["yvan"], unsigned: false });
});

test("assertEditoriallyCleared throws when the artifact was re-produced (hash mismatch) since sign-off", () => {
  const { signer, signature } = signerFor("yvan");
  const profile: BrandProfile = { palette: [], signers: [signer], requiredSigners: ["yvan"] };
  const r = report([{ signerId: "yvan", signedHash: H, signature }]);
  const differentBytes = new TextEncoder().encode("re-produced-artifact");
  expect(() => assertEditoriallyCleared(r, "p1", profile, differentBytes)).toThrow(/different artifact|re-produced|re-sign/i);
});

test("assertEditoriallyCleared throws when a required signer's sign-off is absent", () => {
  const { signer } = signerFor("yvan");
  const profile: BrandProfile = { palette: [], signers: [signer], requiredSigners: ["yvan"] };
  expect(() => assertEditoriallyCleared(report([]), "p1", profile, BYTES)).toThrow(/missing.*yvan|yvan.*missing/i);
});

test("assertEditoriallyCleared with no requiredSigners never throws — records unsigned honestly", () => {
  const profile: BrandProfile = { palette: [] };
  expect(assertEditoriallyCleared(report([]), "p1", profile, BYTES)).toEqual({ signedBy: [], unsigned: true });
});

test("assertEditoriallyCleared with no requiredSigners reports a valid optional sign-off", () => {
  const { signer, signature } = signerFor("yvan");
  const profile: BrandProfile = { palette: [], signers: [signer] }; // registered, but not required
  const r = report([{ signerId: "yvan", signedHash: H, signature }]);
  expect(assertEditoriallyCleared(r, "p1", profile, BYTES)).toEqual({ signedBy: ["yvan"], unsigned: false });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/export-guard.test.ts`
Expected: FAIL — `assertEditoriallyCleared` not exported.

- [ ] **Step 3: Implement `assertEditoriallyCleared`**

Add to `skills/splash/src/export-guard.ts` (imports at top, function anywhere after `assertShippable`):

```ts
import type { BrandProfile } from "./brand-profile";
import { editorialPayload, sha256Hex, verifyEditorialSignature } from "./editorial-signoff";
// note: editorialPayload is imported for symmetry/debug; verification uses proposalId+hash directly.
```

```ts
/**
 * Re-verify editorial sign-offs at export against the CURRENT artifact bytes (S4d). When the
 * profile declares requiredSigners, every one must have a recorded sign-off whose signedHash equals
 * the current hash AND whose signature re-verifies — else throw. With no requiredSigners, never
 * blocks: returns the honest signed/unsigned state so the caller can record it.
 */
export function assertEditoriallyCleared(
  report: ProduceReport,
  id: string,
  profile: BrandProfile,
  currentArtifactBytes: Uint8Array,
): { signedBy: string[]; unsigned: boolean } {
  const r = report.results.find((x) => x.id === id);
  if (!r) throw new Error(`unknown proposal ${id}`);
  const hash = sha256Hex(currentArtifactBytes);
  const signers = profile.signers ?? [];
  const signoffs = r.editorialSignoffs ?? [];
  const validFor = (signerId: string): boolean => {
    const so = signoffs.find((s) => s.signerId === signerId);
    const signer = signers.find((s) => s.id === signerId);
    return (
      !!so &&
      !!signer &&
      so.signedHash === hash &&
      verifyEditorialSignature({ proposalId: id, sha256hex: hash, signature: so.signature, signer })
    );
  };
  const required = profile.requiredSigners ?? [];
  if (required.length > 0) {
    for (const sid of required) {
      const so = signoffs.find((s) => s.signerId === sid);
      if (!so) throw new Error(`refusing to export ${id}: required editorial sign-off missing from ${sid}`);
      if (so.signedHash !== hash)
        throw new Error(`refusing to export ${id}: ${sid}'s sign-off is for a different artifact (re-produced since sign-off) — re-sign required`);
      if (!validFor(sid))
        throw new Error(`refusing to export ${id}: ${sid}'s editorial signature failed re-verification`);
    }
    return { signedBy: [...required], unsigned: false };
  }
  const signedBy = signers.map((s) => s.id).filter(validFor);
  return { signedBy, unsigned: signedBy.length === 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/export-guard.test.ts`
Expected: PASS (5 new tests + existing export-guard tests).

- [ ] **Step 5: Strip `editorialSignoffs` on re-produce**

In `skills/splash/src/produce-all.ts`, find the existing per-produce reset that sets `approvedHash: undefined` (the block that also sets `reviewed`/`renderApproved` fresh — around the "re-produce can never ship on a PRIOR render's sign-off" comment). Add `editorialSignoffs: undefined` to that same object literal so a re-produced result carries no stale human sign-off:

```ts
        approvedHash: undefined,
        editorialSignoffs: undefined,
```

- [ ] **Step 6: Extend the re-produce strip test**

In `skills/splash/tests/produce-all.test.ts`, in the test that asserts a re-produce strips `approvedHash` (the "strips a stale reviewed/renderApproved/approvedHash" test), add a smuggled `editorialSignoffs` to the dispatch's returned object and assert it is stripped:

```ts
        editorialSignoffs: [{ signerId: "yvan", signedHash: "stale", signature: "stale" }],
```
and, alongside the existing `expect(results[0].approvedHash).toBeUndefined();`:
```ts
    expect(results[0].editorialSignoffs).toBeUndefined();
```

- [ ] **Step 7: Run both test files**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/src/export-guard.test.ts skills/splash/tests/produce-all.test.ts`
Expected: PASS (both files green).

- [ ] **Step 8: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/export-guard.ts skills/splash/src/export-guard.test.ts skills/splash/src/produce-all.ts skills/splash/tests/produce-all.test.ts
git commit -m "feat(splash): re-verify editorial sign-offs at export + strip them on re-produce"
```

---

### Task 4: `scripts/sign-artifact.mjs` — the editor's out-of-band signer + keygen

**Files:**
- Create: `skills/splash/scripts/sign-artifact.mjs`
- Test: `skills/splash/scripts/sign-artifact.test.ts`

**Interfaces:**
- Consumes: `editorialPayload`, `sha256Hex`, `verifyEditorialSignature`, `importSignerPublicKey` from `../src/editorial-signoff.ts`.
- Produces (exported for test; `main()` gated on `import.meta.main`):
  - `function generateEditorKeypair(editorId: string): { privatePem: string; publicBase64: string; signersLine: string }`
  - `function signArtifact(fileBytes: Uint8Array, proposalId: string, privatePem: string): { sha256: string; signature: string }`

- [ ] **Step 1: Write the failing test**

```ts
// skills/splash/scripts/sign-artifact.test.ts
import { test, expect } from "bun:test";
import { generateEditorKeypair, signArtifact } from "./sign-artifact.mjs";
import { editorialPayload, verifyEditorialSignature } from "../src/editorial-signoff.ts";

test("generateEditorKeypair → signArtifact → verify round-trips (the real editor flow)", () => {
  const { privatePem, publicBase64, signersLine } = generateEditorKeypair("yvan");
  expect(signersLine).toContain("yvan:");
  const bytes = new TextEncoder().encode("the rendered chart bytes");
  const { sha256, signature } = signArtifact(bytes, "p1", privatePem);
  // the signature the editor produces verifies against their registered public key
  expect(
    verifyEditorialSignature({ proposalId: "p1", sha256hex: sha256, signature, signer: { id: "yvan", publicKey: publicBase64 } }),
  ).toBe(true);
  // and NOT for a different proposal (payload binds proposalId)
  expect(
    verifyEditorialSignature({ proposalId: "p2", sha256hex: sha256, signature, signer: { id: "yvan", publicKey: publicBase64 } }),
  ).toBe(false);
});

test("signArtifact hashes the FILE bytes itself (so no typed hash can be substituted)", () => {
  const { privatePem, publicBase64 } = generateEditorKeypair("rinny");
  const a = signArtifact(new TextEncoder().encode("A"), "p1", privatePem);
  const b = signArtifact(new TextEncoder().encode("B"), "p1", privatePem);
  expect(a.sha256).not.toBe(b.sha256);
  expect(a.signature).not.toBe(b.signature);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/scripts/sign-artifact.test.ts`
Expected: FAIL — module/exports missing.

- [ ] **Step 3: Implement the signer + keygen (with a gated CLI main)**

```js
// skills/splash/scripts/sign-artifact.mjs
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
  try { fileBytes = readFileSync(file); } catch { return fail(`cannot read artifact file ${file}`); }
  try { privatePem = readFileSync(keyPath, "utf8"); } catch { return fail(`cannot read key ${keyPath}`); }
  const { sha256, signature } = signArtifact(fileBytes, proposalId, privatePem);
  console.log(`artifact sha256: ${sha256}`);
  console.log(`signature (base64): ${signature}`);
}

if (import.meta.main) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test skills/splash/scripts/sign-artifact.test.ts`
Expected: PASS (2 tests). Confirm `main()` did not run during the test (no file written).

- [ ] **Step 5: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/scripts/sign-artifact.mjs skills/splash/scripts/sign-artifact.test.ts
git commit -m "feat(splash): sign-artifact.mjs — editor out-of-band Ed25519 signer + keygen"
```

- [ ] **Step 6: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check`
Expected: the project gate passes (all suites green, tsc clean for the splash skill). If a pre-existing unrelated check flakes (e.g. a network-bound map produce), re-run that suite in isolation to confirm it is env, not this change.

---

## Self-Review

**Spec coverage:**
- Register editor public keys in the profile → Task 2 (`signers`/`requiredSigners` in both parsers).
- Ed25519 signature over the exact artifact → Task 1 (`editorialPayload`, `verifyEditorialSignature`) + Task 4 (`signArtifact` hashes the file itself).
- Re-verify at export against current bytes → Task 3 (`assertEditoriallyCleared`).
- Fail loud on every forge/misconfig vector → Task 1 tests (wrong key/tampered hash/tampered sig/cross-proposal/unknown signer/not-approved), Task 2 (requiredSigner-absent throw, malformed-key drop), Task 3 (missing/hash-mismatch/failed-reverify throw).
- Local-first, node:crypto only, no backend → all tasks (no new dependency).
- Honest unsigned recording + opt-in → Task 3 (no-requiredSigners returns `{unsigned}`, never throws).
- Re-produce invalidates sign-off → Task 3 Step 5 (`editorialSignoffs: undefined` strip) + the export re-verify backstop.
- Additive (LLM render-approval unchanged) → no task touches `applyRenderGate`/`assertShippable`.

**Placeholder scan:** none — every code step carries full code; every run step names the command + expected result.

**Type consistency:** `EditorSigner {id, publicKey}` defined in Task 1, imported by Tasks 2/3/4. `EditorialSignoff {signerId, signedHash, signature}` (Task 1) is the shape of `ProposalResult.editorialSignoffs[]` (Task 1 Step 1) used in Tasks 3. `editorialPayload(proposalId, sha256hex)` / `sha256Hex(bytes)` / `verifyEditorialSignature({proposalId, sha256hex, signature, signer})` signatures identical across Tasks 1/3/4. `assertEditoriallyCleared(report, id, profile, currentArtifactBytes)` returns `{signedBy, unsigned}` consumed by the export entrypoints (follow-up plumbing). `BrandProfile.signers/requiredSigners` (Task 2) read by Task 3.

**One deviation from the spec, deliberate:** `applyEditorialSignoff` takes `signers: EditorSigner[]` (not the whole `BrandProfile`) so `editorial-signoff.ts` stays a leaf module and `brand-profile.ts` can import from it without a cycle. `assertEditoriallyCleared` still takes the `BrandProfile` (export-guard legitimately depends on brand-profile). Same data, no functional change.
