# Delivery Publishers — L2 (S3-compatible) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `embed-s3`, a third publisher that uploads a produced visual to any S3-compatible object store (AWS, Cloudflare R2, Scaleway, MinIO) with hand-written SigV4 over pure `fetch`, and returns the newsroom's own public URL.

**Architecture:** One new signer module (pure, no I/O) plus one new adapter behind the existing `Publisher` interface, registered in the existing composition root. Nothing else changes shape — L1 proved the interface holds a hosted and a local family without a circumstantial field, and this tranche is the test of that claim on a third family.

**Tech Stack:** Bun · TypeScript · `node:crypto` (HMAC/SHA-256, already a dependency of the tree) · `bun:test`. **No aws-sdk, no CLI** — same discipline that disqualified wrangler in the Cloudflare spike.

**Spec:** `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md` §5 (L2), whose seven facts (F1-F7) were MEASURED against a real S3 server on 2026-07-25 and are binding. §4.6 records what L1 revealed; two of its lessons are requirements here.

## Global Constraints

- Runtime **Bun**. Never npm, never node. Tests are `bun:test` (`describe` / `it` / `expect`).
- **TDD**: the failing test is written and run RED before the implementation, every task.
- Code, comments, identifiers, file names, commit messages: **English**.
- **No vendor mention** (Claude/Anthropic) in any committed artifact. No `Co-Authored-By`. No "Generated with" line.
- **No new `any`.** **No mocking of external APIs** — the live proof runs against a real S3 server.
- **A publisher NEVER throws** — every I/O, network and parse call is a bounded failure returning `VerbResult`.
- **The contract never reads `process.env`** (I5). Credentials arrive in `PublishRequest.credentials`, resolved by `lib/loop/deliver.ts`.
- **No credential value** may reach a manifest, event, artifact, archive, log or error message. Messages name the VARIABLE, never its value.
- `lib/tsconfig.json` covers `core`, `loop`, `host`, `delivery`, `newsroom`. Run `bunx tsc --noEmit` from `lib/`.
- Gate `bun run check` green before each commit. Known baseline: **21/22** — the single acceptable failure is `skills/image-native`, a pre-existing Playwright timeout.
- **Both test orderings must pass**: `bun test lib/` from the repo root AND `cd lib && bun test`. L1 shipped a defect that was invisible from one cwd and produced 13 failures from the other.

### Two lessons from L1 that are requirements here (spec §4.6)

1. **`settings` is a shared bag the caller fills for every publisher.** `lib/loop/deliver.ts` puts `snippetTemplate` in it for ALL destinations, and L1 shipped a defect where `zip` silently ignored it. This adapter must **explicitly consume** every field `deliver` can set, or **explicitly document** why it ignores one. A field left unread must be a written decision.
2. **Adding an adapter is two files plus a line**, not one: the adapter itself AND its `NEWSROOM_CAPABILITIES` entry (`lib/loop/deliver.ts` refuses a destination the decor does not know), plus `lib/delivery/index.ts`'s registration — and `lib/delivery/index.test.ts` pins the exact publisher set, so it must be updated in the same commit.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/delivery/adapters/s3-sign.ts` | SigV4 for S3: canonical request, string-to-sign, signing key, `Authorization` header. **Pure** — takes a clock instant as an argument, reads nothing ambient | 1 |
| `lib/delivery/adapters/s3.ts` | The `Publisher`: PUT with an explicit `Content-Type`, verify anonymous serving, parse XML errors, build the outcome | 2 |
| `lib/delivery/index.ts` | Registers `s3Publisher` | 3 |
| `lib/delivery/index.test.ts` | The pinned publisher set gains `embed-s3` | 3 |
| `lib/newsroom/capabilities.ts` | `embed-s3` gains `env`, `envHelp`, `settingsFields`, `implemented: true` | 3 |
| `skills/splash/scripts/verify-s3-delivery.mjs` | Opt-in live proof against a real S3 server, OUT of the gate | 4 |

---

### Task 1: The SigV4 signer

**Files:**
- Create: `lib/delivery/adapters/s3-sign.ts`
- Test: `lib/delivery/adapters/s3-sign.test.ts`

**Interfaces:**
- Consumes: `node:crypto` only.
- Produces:
  ```ts
  export type SignInput = {
    method: string;                       // "PUT" | "GET"
    path: string;                         // "/bucket/key", already the literal object path
    query?: string;                       // "" when absent; "policy=" style otherwise
    body: Uint8Array | string;
    headers: Record<string, string>;      // caller-supplied, e.g. content-type
    host: string;                         // "s3.eu-west-1.amazonaws.com"
    region: string;
    service?: string;                     // defaults to "s3"
    accessKeyId: string;
    secretAccessKey: string;
    now: Date;                            // INJECTED — the module reads no clock
  };
  export type SignedRequest = { headers: Record<string, string> };
  export function signS3Request(input: SignInput): SignedRequest;
  // Exported for the golden tests — these are the two artifacts a reviewer can check by hand
  // against the AWS SigV4 specification.
  export function canonicalRequest(input: SignInput): string;
  export function stringToSign(input: SignInput): string;
  ```

- [ ] **Step 1: Write the failing tests**

Create `lib/delivery/adapters/s3-sign.test.ts`. Pin the two intermediate artifacts as goldens for a fixed input, and pin the properties that make the signature valid. **You compute the golden strings yourself from your implementation and then VERIFY THEM BY HAND against the AWS SigV4 specification** — a golden nobody checked is a tautology. Write in the test file a comment stating which spec rules each line of the canonical request satisfies.

The test must cover, at minimum:

```ts
import { describe, it, expect } from "bun:test";
import { signS3Request, canonicalRequest, stringToSign } from "./s3-sign";

const BASE = {
  method: "PUT",
  path: "/newsroom-bucket/embeds/primes.html",
  body: "<html></html>",
  headers: { "content-type": "text/html; charset=utf-8" },
  host: "s3.eu-west-1.amazonaws.com",
  region: "eu-west-1",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  now: new Date("2026-07-25T12:00:00Z"),
};

describe("signS3Request", () => {
  it("should put the payload hash, the amz date and the host in the canonical request", () => {
    const c = canonicalRequest(BASE);
    const lines = c.split("\n");
    expect(lines[0]).toBe("PUT");
    expect(lines[1]).toBe("/newsroom-bucket/embeds/primes.html");
    expect(c).toContain("host:s3.eu-west-1.amazonaws.com");
    expect(c).toContain("x-amz-date:20260725T120000Z");
  });

  it("should list signed headers lowercased and sorted", () => {
    const c = canonicalRequest(BASE);
    const signed = c.split("\n").at(-2);
    expect(signed).toBe("content-type;host;x-amz-content-sha256;x-amz-date");
  });

  it("should scope the string to sign to the region, the s3 service and the request date", () => {
    expect(stringToSign(BASE).split("\n")[2]).toBe(
      "20260725/eu-west-1/s3/aws4_request",
    );
  });

  it("should produce the same signature for the same input, and a different one for a changed body", () => {
    const a = signS3Request(BASE).headers.authorization;
    const b = signS3Request(BASE).headers.authorization;
    const c = signS3Request({ ...BASE, body: "<html>x</html>" }).headers.authorization;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it("should change the signature when only the instant changes, so a stale date cannot be reused", () => {
    const later = signS3Request({ ...BASE, now: new Date("2026-07-26T12:00:00Z") });
    expect(later.headers.authorization).not.toBe(signS3Request(BASE).headers.authorization);
    expect(later.headers["x-amz-date"]).toBe("20260726T120000Z");
  });

  it("should never place the secret key in any produced header", () => {
    const h = signS3Request(BASE).headers;
    expect(JSON.stringify(h)).not.toContain(BASE.secretAccessKey);
    expect(h.authorization).toContain("AKIDEXAMPLE");
  });

  it("should percent-encode a key segment containing a space or a plus", () => {
    const c = canonicalRequest({ ...BASE, path: "/b/a key+1.html" });
    expect(c.split("\n")[1]).toBe("/b/a%20key%2B1.html");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-delivery-s3 && bun test lib/delivery/adapters/s3-sign.test.ts`
Expected: FAIL — `Cannot find module './s3-sign'`.

- [ ] **Step 3: Implement the signer**

Write `lib/delivery/adapters/s3-sign.ts`. It is **pure**: no `process.env`, no `Date.now()`, no I/O — the instant is the `now` argument, which is what makes every test above deterministic. Header comment must state that, and state that the module exists so a reviewer can check the canonical request against the spec rather than trusting a signature blob.

Requirements the tests above encode, plus these:
- `x-amz-content-sha256` carries the hex SHA-256 of the payload; it is always signed.
- `x-amz-date` is `YYYYMMDDTHHMMSSZ` derived from `now`.
- Canonical URI: each path segment percent-encoded, slashes preserved.
- Canonical headers: names lowercased, values trimmed, sorted by name, one per line, trailing newline.
- Signing key chain: `HMAC(HMAC(HMAC(HMAC("AWS4"+secret, date), region), service), "aws4_request")`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/delivery/adapters/s3-sign.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/adapters/s3-sign.ts lib/delivery/adapters/s3-sign.test.ts
git commit -m "feat(delivery): sigv4 for s3, pure and with an injected clock"
```

---

### Task 2: The S3 publisher

**Files:**
- Create: `lib/delivery/adapters/s3.ts`
- Test: `lib/delivery/adapters/s3.test.ts`

**Interfaces:**
- Consumes: `signS3Request` (Task 1); `Publisher`, `PublishRequest`, `PublishOutcome` from `lib/core/publishers.ts`; `renderSnippet` from `lib/delivery/snippet.ts`; `contentTypeFor` from `lib/delivery/adapters/cloudflare-pages.ts`.
- Produces: `export const s3Publisher: Publisher` (id `"embed-s3"`, kind `"hosted"`, `implemented: true`), and `export function publicUrlFor(settings, key): string`.

**The measured facts that drive this file** (spec §5.1, all binding):
- **F1/F2** — a PUT without `Content-Type` is served as `binary/octet-stream`, which makes a browser DOWNLOAD the embed instead of rendering it. The `Content-Type` is mandatory. Reuse `contentTypeFor()`.
- **F3** — a freshly uploaded object answers **403 to an anonymous GET**. "Upload succeeded" is NOT "the embed works". Verify anonymous serving before returning success, exactly as the Cloudflare adapter verifies served bytes.
- **F4** — a bucket policy would make it public, and **this adapter must NOT set one**. Granting public access rewrites the newsroom's own infrastructure policy with a scope wider than the object being delivered. Refuse with an actionable message instead.
- **F5** — the public URL is NOT constructible from the endpoint (path-style, virtual-host and attached-domain all differ). It comes from the configured `publicBaseUrl`.
- **F6** — errors are XML with a `<Code>`. A refusal carries that code.
- **F7** — overwriting the same key serves the new content at the same URL, so idempotence is free.

- [ ] **Step 1: Write the failing tests**

Create `lib/delivery/adapters/s3.test.ts`. These are offline tests: they cover refusals and URL/key construction, which need no server. The network path is proven live in Task 4.

```ts
import { describe, it, expect } from "bun:test";
import { s3Publisher, publicUrlFor } from "./s3";
import type { PublishRequest } from "../../core/publishers";

const META = {
  title: "Primes cantonales",
  altText: "Les primes montent",
  source: "OFSP",
  credit: "Heidi.news",
  lang: "fr",
};

function request(over: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: import.meta.path,
    id: "primes",
    metadata: META,
    settings: {
      publisherId: "embed-s3",
      endpoint: "https://s3.eu-west-1.amazonaws.com",
      region: "eu-west-1",
      bucket: "newsroom-embeds",
      publicBaseUrl: "https://embeds.example.org",
    },
    credentials: {
      SPLASH_S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
      SPLASH_S3_SECRET_ACCESS_KEY: "SECRET",
    },
    outDir: "/nonexistent",
    ...over,
  };
}

describe("publicUrlFor", () => {
  it("should build the link from the configured public base, never from the endpoint", () => {
    expect(
      publicUrlFor(
        { publicBaseUrl: "https://embeds.example.org", endpoint: "https://s3.eu-west-1.amazonaws.com" },
        "primes.html",
      ),
    ).toBe("https://embeds.example.org/primes.html");
  });

  it("should tolerate a trailing slash on the configured base", () => {
    expect(
      publicUrlFor({ publicBaseUrl: "https://embeds.example.org/" }, "primes.html"),
    ).toBe("https://embeds.example.org/primes.html");
  });

  it("should place the object under the configured prefix when there is one", () => {
    expect(
      publicUrlFor({ publicBaseUrl: "https://e.org", prefix: "splash" }, "primes.html"),
    ).toBe("https://e.org/splash/primes.html");
  });
});

describe("the s3 publisher, before it reaches the network", () => {
  it("should refuse a missing bucket by naming the setting, not its value", async () => {
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, bucket: "" },
    });
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain("bucket");
  });

  it("should refuse a missing publicBaseUrl, because the link cannot be constructed from the endpoint", async () => {
    const s = { ...request().settings };
    delete s.publicBaseUrl;
    const r = await s3Publisher.publish({ ...request(), settings: s });
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain("publicBaseUrl");
  });

  it("should refuse missing credentials by naming the variable, never a value", async () => {
    const r = await s3Publisher.publish({ ...request(), credentials: {} });
    expect(r).toMatchObject({ ok: false });
    const m = (r as { message: string }).message;
    expect(m).toContain("SPLASH_S3_ACCESS_KEY_ID");
    expect(m).not.toContain("SECRET");
  });

  it("should refuse an unreadable artifact without attempting an upload", async () => {
    const r = await s3Publisher.publish({
      ...request(),
      artifactPath: "/definitely/not/here.html",
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
  });

  it("should honour the newsroom snippet template, like every other publisher", async () => {
    // Regression guard for L1's C3: settings is a shared bag, and a publisher that
    // silently ignores a field the caller filled ships the wrong snippet.
    const r = await s3Publisher.publish({
      ...request(),
      artifactPath: "/definitely/not/here.html",
      settings: {
        ...request().settings,
        snippetTemplate: '<div data-splash="{url}"></div>',
      },
    });
    // The artifact read fails first, so this asserts the template REACHED the renderer:
    // a publisher that dropped the field would fail identically, so assert on the code
    // path instead — see Step 3, where template validation precedes the artifact read.
    expect(r).toMatchObject({ ok: false });
  });

  it("should declare itself as a hosted, implemented publisher", () => {
    expect(s3Publisher).toMatchObject({
      id: "embed-s3",
      kind: "hosted",
      implemented: true,
    });
  });
});
```

**Note on the snippet test:** the assertion above is weak as written. Strengthen it — make template validation happen BEFORE the artifact read (as `zip.ts` does), then assert that a template with an unfillable placeholder refuses with a message naming that placeholder, which proves the template was consumed. Write the test that way.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/delivery/adapters/s3.test.ts`
Expected: FAIL — `Cannot find module './s3'`.

- [ ] **Step 3: Implement the publisher**

Write `lib/delivery/adapters/s3.ts`. Order of operations, and each step's reason, must be in the code:

1. **Validate settings** — `endpoint`, `region`, `bucket`, `publicBaseUrl` present; refuse naming the missing one.
2. **Validate credentials** — refuse naming the missing VARIABLE, never a value.
3. **Pre-flight the snippet** against a sentinel URL, before any I/O — the L1 I5 lesson: a config-only refusal must not land after an irreversible upload.
4. **Read the artifact** — bounded failure.
5. **PUT** with `contentTypeFor(key)` (F1/F2), signed by `signS3Request` with `new Date()` supplied by this module (the signer stays pure).
6. **On non-2xx**, parse the XML `<Code>` (F6) and refuse with it.
7. **Verify anonymous serving** (F3): an unauthenticated `GET` of the public URL must return 2xx AND the served bytes must match the artifact. On 403, refuse with a message that says the object is not publicly readable and that Splash will not change the bucket's access policy on the newsroom's behalf (F4).
8. **Render the real snippet** and return the outcome with `url` = the public URL.

`publicUrlFor` joins `publicBaseUrl` + optional `prefix` + key, tolerating a trailing slash.

The object key is `{prefix/}{id}.html`, and `id` is already slug-checked at the verb (`lib/core/verbs/publish.ts`). Keep a local `isSafeId` guard anyway — defence in depth, as `zip.ts` does.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/delivery/adapters/s3.test.ts && bunx tsc --noEmit` (the second from `lib/`)
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/adapters/s3.ts lib/delivery/adapters/s3.test.ts
git commit -m "feat(delivery): an s3-compatible publisher that verifies what it published"
```

---

### Task 3: Register it and declare it in the decor

**Files:**
- Modify: `lib/delivery/index.ts` (register `s3Publisher`)
- Modify: `lib/delivery/index.test.ts` (the pinned publisher set)
- Modify: `lib/newsroom/capabilities.ts` (the `embed-s3` entry)
- Test: `lib/newsroom/capabilities.test.ts`

**Interfaces:**
- Consumes: `s3Publisher` (Task 2).
- Produces: `NEWSROOM_CAPABILITIES["embed-s3"]` with `implemented: true`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/newsroom/capabilities.test.ts`:

```ts
it("should declare embed-s3 as an implemented delivery capability with its own settings", () => {
  const s3 = NEWSROOM_CAPABILITIES["embed-s3"]!;
  expect(s3).toMatchObject({ kind: "delivery", implemented: true });
  // Both secrets must be declared, or deliver() cannot forward them: it only forwards
  // variables the capability itself declares (lib/loop/deliver.ts).
  expect(s3.env.flat()).toEqual(
    expect.arrayContaining([
      "SPLASH_S3_ACCESS_KEY_ID",
      "SPLASH_S3_SECRET_ACCESS_KEY",
    ]),
  );
  const secretFields = (s3.settingsFields ?? []).filter((f) => f.secret).map((f) => f.name);
  expect(secretFields).toEqual(
    expect.arrayContaining(["SPLASH_S3_ACCESS_KEY_ID", "SPLASH_S3_SECRET_ACCESS_KEY"]),
  );
  // And the non-secret settings the adapter needs must be askable.
  const allFields = (s3.settingsFields ?? []).map((f) => f.name);
  for (const n of ["endpoint", "region", "bucket", "publicBaseUrl"])
    expect(allFields).toContain(n);
});

it("should give every declared env var a help string, so a missing key is actionable", () => {
  const s3 = NEWSROOM_CAPABILITIES["embed-s3"]!;
  for (const name of s3.env.flat()) expect(s3.envHelp[name]).toBeTruthy();
});
```

Update `lib/delivery/index.test.ts`'s pinned set to `["embed-cloudflare", "embed-s3", "zip"]`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/newsroom/capabilities.test.ts lib/delivery/index.test.ts`
Expected: FAIL — `embed-s3` is still `implemented: false` with empty `env`, and the pinned set has two entries.

- [ ] **Step 3: Fill the capability and register the publisher**

In `lib/newsroom/capabilities.ts`, replace the placeholder `embed-s3` entry: `implemented: true`, `env: [["SPLASH_S3_ACCESS_KEY_ID"], ["SPLASH_S3_SECRET_ACCESS_KEY"]]` (two single-member groups — S3 needs BOTH, not one of several, the same shape `embed-cloudflare` uses for its three), `envHelp` naming where each is obtained, and `settingsFields` carrying the two secrets plus `endpoint`, `region`, `bucket`, `prefix`, `publicBaseUrl` as non-secrets. Label it in newsroom language, never an env var name.

In `lib/delivery/index.ts`, add `registerPublisher(s3Publisher)` inside `registerAllPublishers()`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test lib/newsroom/ lib/delivery/ && bunx tsc --noEmit` (the second from `lib/`)
Expected: PASS. Other suites may pin capability counts — update the number, never loosen the assertion.

- [ ] **Step 5: Verify BOTH test orderings**

Run: `bun test lib/` from the repo root, then `cd lib && bun test`.
Expected: 0 fail both times. L1 shipped a registry defect invisible from one cwd; a new registry id is exactly the change that could reintroduce it.

- [ ] **Step 6: Commit**

```bash
git add lib/delivery/index.ts lib/delivery/index.test.ts lib/newsroom/capabilities.ts lib/newsroom/capabilities.test.ts
git commit -m "feat(newsroom): declare the s3 publisher and register it"
```

---

### Task 4: The live proof

**Files:**
- Create: `skills/splash/scripts/verify-s3-delivery.mjs`

**Interfaces:**
- Consumes: `lookupPublisher` (`lib/core/publishers.ts`), the composition root (`lib/delivery/index.ts`).
- Produces: nothing importable. Run by hand.

- [ ] **Step 1: Write the script**

Model it on `skills/splash/scripts/verify-embed-delivery.mjs`, which is the established opt-in shape. It must:
- read its configuration from the environment (`SPLASH_S3_ENDPOINT`, `SPLASH_S3_REGION`, `SPLASH_S3_BUCKET`, `SPLASH_S3_PREFIX`, `SPLASH_S3_PUBLIC_BASE_URL`, `SPLASH_S3_ACCESS_KEY_ID`, `SPLASH_S3_SECRET_ACCESS_KEY`) and exit 1 naming any that is missing — never a value;
- write a distinctive artifact to a temp dir, publish it through `lookupPublisher("embed-s3")`, and print `DELIVERED <url>` on success;
- exit non-zero with the refusal's code and message on failure.

The adapter's own anonymous-serving verification is the proof, so the script must NOT re-implement verification — a printed URL means the bytes were confirmed served.

Header comment must state why it is out of the gate: it needs a real S3 endpoint and real credentials.

- [ ] **Step 2: Prove it against a real S3 server**

A local MinIO container is a real S3 server and is the zero-account way to run this:

```bash
docker run -d --name splash-minio -p 9000:9000 \
  -e MINIO_ROOT_USER=splashspike -e MINIO_ROOT_PASSWORD=splashspike123 \
  quay.io/minio/minio:latest server /data
```

The bucket must exist and must serve anonymously — the adapter deliberately does NOT create either (spec §5.1 F4). Create the bucket and attach an anonymous read policy out-of-band, then run:

```bash
SPLASH_S3_ENDPOINT=http://127.0.0.1:9000 \
SPLASH_S3_REGION=us-east-1 \
SPLASH_S3_BUCKET=splash-embeds \
SPLASH_S3_PUBLIC_BASE_URL=http://127.0.0.1:9000/splash-embeds \
SPLASH_S3_ACCESS_KEY_ID=splashspike \
SPLASH_S3_SECRET_ACCESS_KEY=splashspike123 \
bun skills/splash/scripts/verify-s3-delivery.mjs
```

Expected: `DELIVERED http://127.0.0.1:9000/splash-embeds/...`, and an independent `curl` of that URL returns the artifact's bytes.

**Report the outcome verbatim, whatever it is.** If it fails, that is a finding about the adapter, not a reason to weaken the script.

- [ ] **Step 3: Confirm it is genuinely out of the gate**

Check `scripts/check.mjs` — `.mjs` files are not picked up by `bun test`, and `skills/splash/tsconfig.json` has no `allowJs`. Confirm nothing imports or invokes the script.

- [ ] **Step 4: Run the full gate**

Run: `bun run check`
Expected: 21/22, the single failure being `skills/image-native`. Name every failure seen.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/verify-s3-delivery.mjs
git commit -m "test(delivery): an opt-in live proof for the s3 publisher"
```

---

## Self-Review

**Spec coverage (§5):** F1/F2 → Task 2 step 3.5 (`contentTypeFor`). F3 → Task 2 step 3.7 (anonymous verification). F4 → Task 2 step 3.7 (refuse, never grant). F5 → Task 2 `publicUrlFor` + the refusal when `publicBaseUrl` is absent. F6 → Task 2 step 3.6 (XML `<Code>`). F7 → free, no code (same key, same URL); no task needed. §5.3 settings/secrets → Task 3. §5.3 proof regime → Task 1 (offline goldens) + Task 4 (live).

**§4.6 lessons:** "explicitly consume every settings field" → Task 2's snippet-template test, strengthened per the note. "Two files plus a line" → Task 3 covers the adapter registration, the pinned set AND the capability entry in one commit.

**Not covered here, by design:** We.Publish and Fly (L3). The unmeasured provider quirks of §5.2 (AWS/R2 public-access defaults, URL style, default Content-Type) — they change what a newsroom configures, not the adapter's shape, and `publicBaseUrl` already makes the URL explicit.

**Type consistency:** `SignInput`/`signS3Request`/`canonicalRequest`/`stringToSign` are defined in Task 1 and used with that arity in Task 2. `s3Publisher` is defined in Task 2 and registered in Task 3 under the same id `"embed-s3"` the capability declares and `lib/loop/deliver.ts` looks up. `publicUrlFor(settings, key)` takes a settings-shaped object, not the whole `PublishRequest`.

**One live-code dependency to flag:** `lib/loop/deliver.ts` forwards only the variables a capability DECLARES in its `env`. If Task 3's `env` omits either secret, the adapter will refuse at runtime with a missing-credential message even though the newsroom set it — Task 3's first test exists precisely to pin that.
