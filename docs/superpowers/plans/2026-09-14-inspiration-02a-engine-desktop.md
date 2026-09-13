# Inspiration 02a — Engine desktop: Connect for email-flow credentials — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Indicator Labs connects the `INFOVIZ_TOKEN` record credential from Splash "Connected services" with an email field and a **Connect** / **Reconnect** button (email → press Connect in the email), polling at the server interval and on window focus, without the renderer ever seeing a server flow id or a token, and without ever offering the paste prompt for it.

**Architecture:** Two new typed operations, `keys-connect-start` (built by `buildEngineArgs` from `keyId` + validated email) and `keys-connect-poll` (resolved only in the main process). The main process keeps one flow slot per credential ID (`Map<keyId, CredentialConnectFlow>`, separate from the Navigator `navigatorAuth` slot), rewrites the bsig start result into an opaque UUID flow token + expiry + interval, refuses unknown/foreign/expired tokens, and forgets a flow on `connected`, `expired`, cancel (a trusted `keys:connect-cancel` IPC channel) and shutdown. The renderer reads `metadata.acquisition` from `keys list`; `CredentialControl` renders the email-flow variant; `renderer.tsx` schedules polls from the exit transition and polls on `window:focus`.

**Tech Stack:** Electron 7.11 Forge app, TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 19, Vitest (node + jsdom for mounted tests), Node 22.22 / npm (the Engine repo's toolchain — not Bun).

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` (in the Splash repo, worktree /Users/rmdms/Sites/Professional/splash/feat-inspiration) — Part 2a, desktop bullet.

**Depends on:** `docs/superpowers/plans/2026-09-14-inspiration-02a-engine-bsig.md` (the bsig contract below).

## Global Constraints

- Repo: the Engine checkout named by the bsig plan's Global Constraints (default `/Users/rmdms/Sites/Professional/engine`); below it is `$ENGINE`. All paths in this plan are relative to `$ENGINE` unless absolute. Shell state does not persist between agent tool calls: prefix each command with `ENGINE=<that path>;` or substitute the literal path.
- Branch: `feat/infoviz-email-flow-credential`, the same branch as the bsig plan, **after** all of its tasks. Never checkout another branch, reset, rebase or pull in `$ENGINE`.
- **Never push.** Pushing to `buriedsignals/engine` requires Rémy's explicit go (spec Part 2a, Delivery). No PR, no `jj git push`, no workflow dispatch, no release step.
- English only in code, comments, tests, commit messages. No mention of Claude/Anthropic anywhere; no co-author or session trailer in commits.
- Commit with an explicit pathspec so nothing else in the index is swept in: `git -C "$ENGINE" commit -m "<message>" -- <paths>`.
- The renderer never sees a raw server flow id or any token value: only `flow_token` (a main-generated UUID v4), `expires_in_seconds`, `poll_interval_seconds`, `status`, `email_hint`.
- bsig contract (verbatim, from the bsig plan — treat as fixed; if the implementation on the branch differs, STOP and report, do not adapt silently):
  - `bsig --json keys connect <ID> start <email>` → result data `{ "flowId": string (opaque), "expiresInSeconds": int, "pollIntervalSeconds": int }`
  - `bsig --json keys connect <ID> poll <flowId>` → result data `{ "status": "pending" | "connected" | "expired", "emailHint"?: string }` (on `connected` the credential is already stored and validated by Engine; the token never appears)
  - `keys list` metadata gains an acquisition field for each record entry: `"acquisition": "email-flow" | "paste"` (INFOVIZ_TOKEN is email-flow)
  - errors surface like other `bsig` failures (non-zero exit / error event).
- Desktop-side bounds applied to that contract (same as the Navigator flow): `flowId` matches `^[A-Za-z0-9_-]{1,512}$`; `expiresInSeconds` integer 1–1800; `pollIntervalSeconds` integer 1–60; `emailHint` ≤ 320 chars; any other poll `status` is an invalid event stream. `keys connect` is spawned without `--control-stdin=v1` and without stdin content.
- Binding rules quoted from `origin/main:AGENTS.md`:
  - "The engine is the product authority; every GUI mutation is a typed `bsig` operation. No daemon, ever."
  - "Model memory, familiarity, and plausibility are not evidence." / "Never claim completion from intention or code inspection alone."
  - "Never use the full production workflow to diagnose a failure." / "QA intent does not authorize production release work."
  - Release gate (Tom's flow, listed only): "`npm --prefix desktop test`, `npm --prefix desktop run test:release-dry-run`, `npm --prefix desktop run test:macos-ci-gate`, `npm --prefix desktop audit --audit-level=low`", plus `test:parity` (`desktop/scripts/ci-parity.sh <sha>`).
  - "jj colocated, commit straight to `main`." — overridden for this work by the spec's Delivery line: a branch → a PR reviewed by Tom, pushed only on Rémy's go.
- From `origin/main:desktop/AGENTS.md`: "Product decisions remain in `../bsig`."
- Test commands (run from `$ENGINE/desktop`; Node must be v22.x ≥ 22.22.0 per `.nvmrc`):
  - one file: `npx vitest run <path>`
  - full suite: `npm test` (unit + integration + boundaries + release). **`src/preload.test.ts` is not in `test:unit`'s file list** — run it explicitly.
  - types: `npm run typecheck`

---

### Task 0: Branch, environment, baseline

**Files:** none modified.

**Interfaces:** consumes the bsig plan's commits on `feat/infoviz-email-flow-credential`.

- [ ] **Step 1: Confirm the branch and the bsig work**

```bash
git -C "$ENGINE" rev-parse --abbrev-ref HEAD
git -C "$ENGINE" status --porcelain
git -C "$ENGINE" log --oneline origin/main..HEAD
git -C "$ENGINE" grep -n 'INFOVIZ_TOKEN' -- bsig/internal/keys/registry.go
git -C "$ENGINE" grep -n 'splash.buriedsignals.com/inspiration.html' -- bsig/internal/keys/registry.go
git -C "$ENGINE" grep -n '"acquisition' -- bsig/internal/keys
git -C "$ENGINE" grep -n 'flowId\|expiresInSeconds\|pollIntervalSeconds\|emailHint' -- bsig/cmd/bsig bsig/internal
```

Expected: branch `feat/infoviz-email-flow-credential`; clean status; the bsig plan's commits listed; every grep returns at least one line, and the JSON names match the contract exactly (`acquisition`, `flowId`, `expiresInSeconds`, `pollIntervalSeconds`, `emailHint`). If any is missing or spelled differently → STOP and report which.

- [ ] **Step 2: Node and install**

```bash
cd "$ENGINE/desktop" && node --version
cd "$ENGINE/desktop" && npm ci
cd "$ENGINE/desktop" && npm run prepare:test-runtime
```

Expected: `v22.x` with x ≥ 22; `npm ci` completes; `prepare:test-runtime` exits 0. If Node is not 22.x, switch to the `.nvmrc` version with the installed version manager; if none is available, STOP and report.

- [ ] **Step 3: Baseline**

```bash
cd "$ENGINE/desktop" && npm test 2>&1 | tee /tmp/desktop-baseline.txt; echo "exit=${PIPESTATUS[0]}"
cd "$ENGINE/desktop" && npx vitest run src/preload.test.ts
cd "$ENGINE/desktop" && npm run typecheck
```

Expected: typecheck passes; preload test passes. `npm test` is green except, most likely, one red in `src/shared/contracts.test.ts` → "accepts the exact acquisition destinations authored by the Engine" failing on `https://splash.buriedsignals.com/inspiration.html` (that test reads every `AcquisitionURL: "…"` literal in `bsig/internal/keys/registry.go`, which the bsig plan now authors; Task 1 allowlists it). Any other failure is a pre-existing baseline failure: record its test name in the task log; the gate is **no new failure against this baseline**.

---

### Task 1: Contracts — record + email-flow IDs, connect operations, setKey refusal

**Files:**
- Modify: `desktop/src/shared/contracts.ts`
- Test: `desktop/src/shared/contracts.test.ts`

**Interfaces (produced):**
```ts
// operationNames gains (after 'keys-status'):
'keys-connect-start', 'keys-connect-poll'
export const RECORD_KEY_IDS: readonly ['MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN', 'INFOVIZ_TOKEN'];
export const EMAIL_FLOW_KEY_IDS: readonly ['INFOVIZ_TOKEN'];
export function isEmailFlowKeyID(id: string): boolean;
export interface CredentialConnectReference { readonly keyId: string; readonly flowToken: string }
export function parseCredentialConnectReference(input: unknown): CredentialConnectReference;
export function isValidAuthEmail(value: unknown): boolean;
// buildEngineArgs({ operation: 'keys-connect-start', keyId, email })
//   → { args: ['keys', 'connect', keyId, 'start', email], cancellable: false, controlStdin: false }
// buildEngineArgs({ operation: 'keys-connect-poll', ... }) → throws /main-process bridge/
// validateSetKeyRequest({ id: 'INFOVIZ_TOKEN' }) → throws /connected by email/
```

- [ ] **Step 1: Write the failing tests**

In `desktop/src/shared/contracts.test.ts`, replace the import block (lines 4–16):

```ts
import {
  buildEngineArgs,
  classifyEngineExit,
  isAllowedDocumentationURL,
  UnknownEngineEventError,
  parseEngineEvent,
  parseOperationEnvelope,
  parseOperationReference,
  parseFeedbackRequest,
  parseLaunchProductRequest,
  validateOperationID,
  validateSetKeyRequest,
} from './contracts';
```

with:

```ts
import {
  buildEngineArgs,
  classifyEngineExit,
  EMAIL_FLOW_KEY_IDS,
  isAllowedDocumentationURL,
  isEmailFlowKeyID,
  isRecordKeyID,
  isValidAuthEmail,
  RECORD_KEY_IDS,
  UnknownEngineEventError,
  parseCredentialConnectReference,
  parseEngineEvent,
  parseOperationEnvelope,
  parseOperationReference,
  parseFeedbackRequest,
  parseLaunchProductRequest,
  validateOperationID,
  validateSetKeyRequest,
} from './contracts';
```

Append at the end of the file:

```ts
describe('email-flow credentials', () => {
  const flowToken = '11111111-1111-4111-8111-111111111111';

  it('pins the record and email-flow credential lists', () => {
    expect([...RECORD_KEY_IDS]).toEqual(['MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN', 'INFOVIZ_TOKEN']);
    expect([...EMAIL_FLOW_KEY_IDS]).toEqual(['INFOVIZ_TOKEN']);
    expect(isRecordKeyID('INFOVIZ_TOKEN')).toBe(true);
    expect(isEmailFlowKeyID('INFOVIZ_TOKEN')).toBe(true);
    expect(isEmailFlowKeyID('DATAWRAPPER_TOKEN')).toBe(false);
  });

  it('starts a connection with the credential and a validated email, without a control stream', () => {
    expect(buildEngineArgs({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com' })).toEqual({
      args: ['keys', 'connect', 'INFOVIZ_TOKEN', 'start', 'editor@example.com'], cancellable: false, controlStdin: false,
    });
  });

  it('refuses a paste credential, a bad email, extra fields, a flow token on start, and a renderer-built poll', () => {
    expect(() => buildEngineArgs({ operation: 'keys-connect-start', keyId: 'DATAWRAPPER_TOKEN', email: 'editor@example.com' }))
      .toThrow(/does not connect by email/);
    expect(() => buildEngineArgs({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'not-an-email' }))
      .toThrow(/invalid email/);
    expect(() => buildEngineArgs({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'bad\nline@example.com' }))
      .toThrow(/invalid email/);
    expect(() => buildEngineArgs({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com', product: 'splash' }))
      .toThrow(/product is not allowed/);
    expect(() => buildEngineArgs({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com', flowToken }))
      .toThrow(/flow token is not allowed/);
    expect(() => buildEngineArgs({ operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken }))
      .toThrow(/main-process bridge/);
    expect(() => buildEngineArgs({ operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowId: 'server-flow-secret' }))
      .toThrow(/unknown request field flowId/);
  });

  it('never opens the paste prompt for an email-flow credential', () => {
    expect(() => validateSetKeyRequest({ id: 'INFOVIZ_TOKEN' })).toThrow(/connected by email/);
    expect(validateSetKeyRequest({ id: 'DATAWRAPPER_TOKEN' })).toEqual({ id: 'DATAWRAPPER_TOKEN' });
  });

  it('accepts only a canonical flow token for an email-flow credential as a connection reference', () => {
    expect(parseCredentialConnectReference({ keyId: 'INFOVIZ_TOKEN', flowToken })).toEqual({ keyId: 'INFOVIZ_TOKEN', flowToken });
    expect(() => parseCredentialConnectReference({ keyId: 'INFOVIZ_TOKEN', flowToken: 'server-flow-secret' })).toThrow(/operation id/);
    expect(() => parseCredentialConnectReference({ keyId: 'MAPTILER_KEY', flowToken })).toThrow(/does not connect by email/);
    expect(() => parseCredentialConnectReference({ keyId: 'INFOVIZ_TOKEN', flowToken, flowId: 'x' })).toThrow(/unknown request field/);
    expect(() => parseCredentialConnectReference('INFOVIZ_TOKEN')).toThrow(/must be an object/);
  });

  it('validates the connect email like the Navigator email', () => {
    expect(isValidAuthEmail('editor@example.com')).toBe(true);
    expect(isValidAuthEmail('editor')).toBe(false);
    expect(isValidAuthEmail('a@\nb')).toBe(false);
    expect(isValidAuthEmail(undefined)).toBe(false);
  });

  it('allows the Infoviz account page as a documentation destination', () => {
    expect(isAllowedDocumentationURL('https://splash.buriedsignals.com/inspiration.html')).toBe(true);
    expect(isAllowedDocumentationURL('https://splash.buriedsignals.com/inspiration.html?next=evil')).toBe(false);
  });
});
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/shared/contracts.test.ts
```

Expected: FAIL — `email-flow credentials` tests fail (`EMAIL_FLOW_KEY_IDS is not iterable`, `isEmailFlowKeyID is not a function`, `unsupported operation` for `keys-connect-start`), and the Task 0 baseline red "accepts the exact acquisition destinations authored by the Engine" still fails.

- [ ] **Step 3: Implement**

In `desktop/src/shared/contracts.ts`:

(a) In `operationNames`, replace:

```ts
  'keys-status',
  'compute-probe',
```

with:

```ts
  'keys-status',
  'keys-connect-start',
  'keys-connect-poll',
  'compute-probe',
```

(b) Replace:

```ts
export const RECORD_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
] as const;

export function isRecordKeyID(id: string): boolean {
  return (RECORD_KEY_IDS as readonly string[]).includes(id);
}
```

with:

```ts
export const RECORD_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'INFOVIZ_TOKEN',
] as const;

export function isRecordKeyID(id: string): boolean {
  return (RECORD_KEY_IDS as readonly string[]).includes(id);
}

/**
 * Record credentials connected by email (the Engine's email-flow acquisition).
 * Labs never opens the paste prompt for them.
 */
export const EMAIL_FLOW_KEY_IDS = ['INFOVIZ_TOKEN'] as const;

export function isEmailFlowKeyID(id: string): boolean {
  return (EMAIL_FLOW_KEY_IDS as readonly string[]).includes(id);
}

/** The renderer's handle on a main-owned email-flow connection. */
export interface CredentialConnectReference {
  readonly keyId: string;
  readonly flowToken: string;
}
```

(c) After `parseOperationReference` (the function ending `return { operationId: validateOperationID(reference.operationId) };\n}`), insert:

```ts

export function parseCredentialConnectReference(input: unknown): CredentialConnectReference {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('credential connect reference must be an object');
  }
  const reference = input as Record<string, unknown>;
  exactKeys(reference, ['keyId', 'flowToken']);
  if (typeof reference.keyId !== 'string' || !isEmailFlowKeyID(reference.keyId)) {
    throw new Error('this credential does not connect by email');
  }
  return { keyId: reference.keyId, flowToken: validateOperationID(reference.flowToken) };
}
```

(d) In `buildEngineArgs`, replace:

```ts
  if (request.flowToken !== undefined && request.operation !== 'auth-poll' && request.operation !== 'auth-cancel') {
```

with:

```ts
  if (request.flowToken !== undefined && request.operation !== 'auth-poll' && request.operation !== 'auth-cancel'
    && request.operation !== 'keys-connect-poll') {
```

(e) In the `switch`, replace:

```ts
    case 'compute-probe':
      requireAbsent(request, ['product', 'planToken', 'options', 'configuration', 'keyId', 'email']);
      return { args: ['compute-probe'], cancellable: false, controlStdin: false };
```

with:

```ts
    case 'keys-connect-start':
      requireAbsent(request, ['product', 'planToken', 'options', 'configuration']);
      if (typeof request.keyId !== 'string' || !keyID.test(request.keyId) || !isEmailFlowKeyID(request.keyId)) {
        throw new Error('this credential does not connect by email');
      }
      return {
        args: ['keys', 'connect', request.keyId, 'start', validateAuthEmail(request.email)],
        cancellable: false,
        controlStdin: false,
      };
    case 'keys-connect-poll':
      throw new Error('Credential connect flow operations require the protected main-process bridge');
    case 'compute-probe':
      requireAbsent(request, ['product', 'planToken', 'options', 'configuration', 'keyId', 'email']);
      return { args: ['compute-probe'], cancellable: false, controlStdin: false };
```

(f) In `validateSetKeyRequest`, replace:

```ts
  if (typeof request.id !== 'string' || !keyID.test(request.id)) throw new Error('invalid key id');
  const validationContext = parseKeyValidationContext(request.validationContext);
```

with:

```ts
  if (typeof request.id !== 'string' || !keyID.test(request.id)) throw new Error('invalid key id');
  if (isEmailFlowKeyID(request.id)) throw new Error(`${request.id} is connected by email, not pasted`);
  const validationContext = parseKeyValidationContext(request.validationContext);
```

(g) In `documentationExact`, replace:

```ts
  'https://unpaywall.org/products/api': true,
};
```

with:

```ts
  'https://unpaywall.org/products/api': true,
  'https://splash.buriedsignals.com/inspiration.html': true,
};
```

(h) After `validateAuthEmail`, insert:

```ts

export function isValidAuthEmail(value: unknown): boolean {
  try {
    validateAuthEmail(value);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/shared/contracts.test.ts && npm run typecheck
```

Expected: PASS (including "accepts the exact acquisition destinations authored by the Engine"); typecheck clean.

- [ ] **Step 5: Mutation check**

Remove the line `if (isEmailFlowKeyID(request.id)) throw new Error(...)` from `validateSetKeyRequest`, run `npx vitest run src/shared/contracts.test.ts` → "never opens the paste prompt for an email-flow credential" is RED. Restore the line, re-run → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: INFOVIZ_TOKEN is a record credential connected by email, never pasted" -- desktop/src/shared/contracts.ts desktop/src/shared/contracts.test.ts
```

---

### Task 2: Main process — per-credential flow slot, start/poll commands, refusal, forget, shutdown

**Files:**
- Modify: `desktop/src/main/engine.ts`
- Test: `desktop/src/main/engine-framing.integration.test.ts`

**Interfaces:**
- Consumes (Task 1): `isEmailFlowKeyID`, `parseCredentialConnectReference`, `validateOperationID`, operations `keys-connect-start` / `keys-connect-poll`.
- Produces:
```ts
class EngineBridge {
  forgetCredentialConnect(input: unknown): boolean; // true when a matching flow was forgotten
}
// engine:event rewrite for keys-connect-start result:
//   { event: 'result', message: 'Check your email and press Connect.',
//     data: { check: 'credential-connect-flow', id, status: 'pending', flow_token, expires_in_seconds, poll_interval_seconds } }
// engine:event rewrite for keys-connect-poll result:
//   { event: 'result', data: { check: 'credential-connect-flow', id, status, email_hint?, flow_token? (pending only), poll_interval_seconds? (pending only) } }
// renderer request for a poll: { operation: 'keys-connect-poll', keyId, flowToken }
```

- [ ] **Step 1: Write the failing tests**

In `desktop/src/main/engine-framing.integration.test.ts`, replace:

```ts
const sixthOperationID = '66666666-6666-4666-8666-666666666666';
const fifthOperationID = '55555555-5555-4555-8555-555555555555';
```

with:

```ts
const sixthOperationID = '66666666-6666-4666-8666-666666666666';
const fifthOperationID = '55555555-5555-4555-8555-555555555555';
const seventhOperationID = '77777777-7777-4777-8777-777777777777';
const eighthOperationID = '88888888-8888-4888-8888-888888888888';
const ninthOperationID = '99999999-9999-4999-8999-999999999999';
const forgedFlowToken = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

// A stand-in bsig for `keys connect`: the first argument after `--` is the poll
// status the test wants; the rest is exactly what the bridge spawned.
const credentialConnectFixture = [
  "const dash = process.argv.indexOf('--');",
  "const [status, ...args] = dash >= 0 ? process.argv.slice(dash + 1) : process.argv.slice(1);",
  "const line = args.join(' ');",
  "if (line === '--json keys connect INFOVIZ_TOKEN start editor@example.com') process.stdout.write(JSON.stringify({event:'result',message:'started',data:{flowId:'server-flow-secret',expiresInSeconds:900,pollIntervalSeconds:3}})+'\\n');",
  "else if (line === '--json keys connect INFOVIZ_TOKEN poll server-flow-secret') process.stdout.write(JSON.stringify({event:'result',data:{status,emailHint:'e***@example.com',token:'must-not-cross'}})+'\\n');",
  "else process.exit(7);",
].join('');

function engineEventData(messages: Array<{ channel: string; value: unknown }>, operationId: string): Record<string, unknown> {
  const message = messages.find(({ channel, value }) => channel === 'engine:event'
    && Boolean(value) && typeof value === 'object' && (value as { operationId?: unknown }).operationId === operationId);
  const data = (message?.value as { data?: unknown } | undefined)?.data;
  if (!data || typeof data !== 'object') throw new Error(`missing event data for ${operationId}`);
  return data as Record<string, unknown>;
}
```

Inside `describe('EngineBridge child-process integration', ...)`, before its closing `});`, append:

```ts
  it('keeps an email-flow credential connection in main and polls it with an opaque token', async () => {
    const messages: Array<{ channel: string; value: unknown }> = [];
    const spawned: string[][] = [];
    let pollStatus = 'pending';
    let resolveExit: (() => void) | undefined;
    const nextExit = () => new Promise<void>((resolve) => { resolveExit = resolve; });
    const bridge = new EngineBridge(
      () => ({
        send(channel: string, value: unknown) {
          messages.push({ channel, value });
          if (channel === 'engine:exit') resolveExit?.();
        },
      }) as never,
      async () => { throw new Error('the paste prompt must not open'); },
      async () => process.execPath,
      (_path, args, options) => {
        spawned.push([...args]);
        return spawn(process.execPath, ['-e', credentialConnectFixture, '--', pollStatus, ...args], options) as never;
      },
    );

    let exited = nextExit();
    await bridge.start({ operationId: operationID, request: { operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com' } });
    await exited;
    const start = engineEventData(messages, operationID);
    expect(start).toMatchObject({
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending', expires_in_seconds: 900, poll_interval_seconds: 3,
    });
    expect(JSON.stringify(messages)).not.toContain('server-flow-secret');
    const flowToken = start.flow_token;
    if (typeof flowToken !== 'string') throw new Error('missing opaque flow token');

    exited = nextExit();
    await bridge.start({ operationId: secondOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken } });
    await exited;
    expect(engineEventData(messages, secondOperationID)).toEqual({
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending', email_hint: 'e***@example.com',
      flow_token: flowToken, poll_interval_seconds: 3,
    });

    pollStatus = 'connected';
    exited = nextExit();
    await bridge.start({ operationId: thirdOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken } });
    await exited;
    expect(engineEventData(messages, thirdOperationID)).toEqual({
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'connected', email_hint: 'e***@example.com',
    });
    expect(JSON.stringify(messages)).not.toContain('must-not-cross');
    expect(JSON.stringify(messages)).not.toContain('server-flow-secret');

    // `connected` forgot the flow: its token is refused before any spawn.
    await expect(bridge.start({ operationId: fourthOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken } }))
      .rejects.toThrow(/absent or expired/);
    expect(spawned).toHaveLength(3);
    expect(spawned.every((args) => !args.includes('--control-stdin=v1'))).toBe(true);
  });

  it('refuses a raw flow id, a foreign or expired token, and forgets flows on cancel and shutdown without a server call', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(100);
    const messages: Array<{ channel: string; value: unknown }> = [];
    const spawned: string[][] = [];
    let resolveExit: (() => void) | undefined;
    const nextExit = () => new Promise<void>((resolve) => { resolveExit = resolve; });
    const bridge = new EngineBridge(
      () => ({
        send(channel: string, value: unknown) {
          messages.push({ channel, value });
          if (channel === 'engine:exit') resolveExit?.();
        },
      }) as never,
      async () => Buffer.from('unused'),
      async () => process.execPath,
      (_path, args, options) => {
        spawned.push([...args]);
        return spawn(process.execPath, ['-e', credentialConnectFixture, '--', 'pending', ...args], options) as never;
      },
    );
    const connect = async (operationId: string): Promise<string> => {
      const exited = nextExit();
      await bridge.start({ operationId, request: { operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com' } });
      await exited;
      const token = engineEventData(messages, operationId).flow_token;
      if (typeof token !== 'string') throw new Error('missing opaque flow token');
      return token;
    };
    try {
      const flowToken = await connect(operationID);
      await expect(bridge.start({ operationId: secondOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowId: 'server-flow-secret' } }))
        .rejects.toThrow(/unknown request field flowId/);
      await expect(bridge.start({ operationId: thirdOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken: forgedFlowToken } }))
        .rejects.toThrow(/absent or expired/);
      await expect(bridge.start({ operationId: fourthOperationID, request: { operation: 'keys-connect-poll', keyId: 'DATAWRAPPER_TOKEN', flowToken } }))
        .rejects.toThrow(/does not connect by email/);
      // The Navigator slot is a different slot: the credential token opens nothing there.
      await expect(bridge.start({ operationId: fifthOperationID, request: { operation: 'auth-poll', flowToken } }))
        .rejects.toThrow(/Navigator authentication flow is absent or expired/);

      now.mockReturnValue(100 + 900_000);
      await expect(bridge.start({ operationId: sixthOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken } }))
        .rejects.toThrow(/absent or expired/);
      expect(bridge.forgetCredentialConnect({ keyId: 'INFOVIZ_TOKEN', flowToken })).toBe(false);
      expect(spawned).toHaveLength(1);

      now.mockReturnValue(1_000_000);
      const second = await connect(seventhOperationID);
      expect(bridge.forgetCredentialConnect({ keyId: 'INFOVIZ_TOKEN', flowToken: forgedFlowToken })).toBe(false);
      expect(bridge.forgetCredentialConnect({ keyId: 'INFOVIZ_TOKEN', flowToken: second })).toBe(true);
      await expect(bridge.start({ operationId: eighthOperationID, request: { operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken: second } }))
        .rejects.toThrow(/absent or expired/);

      const third = await connect(ninthOperationID);
      const spawnedBeforeShutdown = spawned.length;
      await expect(bridge.shutdown()).resolves.toBe('idle');
      expect(spawned).toHaveLength(spawnedBeforeShutdown);
      expect(bridge.forgetCredentialConnect({ keyId: 'INFOVIZ_TOKEN', flowToken: third })).toBe(false);
    } finally {
      now.mockRestore();
    }
  });

  it('refuses the paste prompt for an email-flow credential before it opens', async () => {
    let prompts = 0;
    const bridge = new EngineBridge(
      () => undefined,
      async () => {
        prompts += 1;
        return Buffer.from('must-not-open');
      },
      async () => process.execPath,
      () => { throw new Error('must not spawn'); },
    );
    await expect(bridge.setKey({ operationId: operationID, request: { id: 'INFOVIZ_TOKEN' } })).rejects.toThrow(/connected by email/);
    expect(prompts).toBe(0);
    expect(bridge.isBusy()).toBe(false);
  });
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/main/engine-framing.integration.test.ts
```

Expected: FAIL — the first new test fails on `toMatchObject` (the raw `{ flowId, expiresInSeconds, pollIntervalSeconds }` crosses unchanged); the second fails with `missing opaque flow token`. The third new test PASSES already (the refusal landed in Task 1; it is kept as a bridge-level guard).

- [ ] **Step 3: Implement**

In `desktop/src/main/engine.ts`:

(a) Replace the contracts import block:

```ts
import {
  buildEngineArgs,
  classifyEngineExit,
  isRecordKeyID,
  parseEngineEvent,
```

with:

```ts
import {
  buildEngineArgs,
  classifyEngineExit,
  isEmailFlowKeyID,
  isRecordKeyID,
  parseCredentialConnectReference,
  parseEngineEvent,
```

(b) After `interface NavigatorAuthFlow { ... }`, insert:

```ts

/** One email-flow credential connection. The server flow id never leaves the main process. */
interface CredentialConnectFlow {
  keyID: string;
  flowID: string;
  flowToken: OperationID;
  pollIntervalSeconds: number;
  expiresAt: number;
}
```

(c) Replace:

```ts
  private navigatorAuth: NavigatorAuthFlow | undefined;
  private closing = false;
```

with:

```ts
  private navigatorAuth: NavigatorAuthFlow | undefined;
  // Keyed per credential ID, apart from the Navigator slot, so the flows cannot collide.
  private readonly credentialConnects = new Map<string, CredentialConnectFlow>();
  private closing = false;
```

(d) In `start()`, replace:

```ts
          const event = this.captureNavigatorAuth(operationName, request, this.capturePlan(parsed));
```

with:

```ts
          const event = this.captureCredentialConnect(
            operationName,
            request,
            this.captureNavigatorAuth(operationName, request, this.capturePlan(parsed)),
          );
```

(e) After the `navigatorAuthURL(input: unknown): string { ... }` method, insert:

```ts

  /** Forgets a main-owned email-flow connection. No server-side cancel exists, so nothing is spawned. */
  forgetCredentialConnect(input: unknown): boolean {
    const { keyId, flowToken } = parseCredentialConnectReference(input);
    const flow = this.credentialConnects.get(keyId);
    if (!flow || flow.flowToken !== flowToken) return false;
    this.credentialConnects.delete(keyId);
    return true;
  }
```

(f) In `shutdown()`, replace:

```ts
  async shutdown(): Promise<'idle' | 'graceful' | 'forced'> {
    const idleFlow = !this.busy ? this.navigatorAuth : undefined;
```

with:

```ts
  async shutdown(): Promise<'idle' | 'graceful' | 'forced'> {
    // Email-flow connections have no server-side cancel: shutdown only forgets them.
    this.credentialConnects.clear();
    const idleFlow = !this.busy ? this.navigatorAuth : undefined;
```

(g) In `resolveOperation`, replace:

```ts
    const record = request as Record<string, unknown>;
    if (record.operation !== 'auth-poll' && record.operation !== 'auth-cancel') {
      return buildEngineArgs(request, resolvePlan);
    }
```

with:

```ts
    const record = request as Record<string, unknown>;
    if (record.operation === 'keys-connect-poll') return this.resolveCredentialConnectPoll(record);
    if (record.operation !== 'auth-poll' && record.operation !== 'auth-cancel') {
      return buildEngineArgs(request, resolvePlan);
    }
```

(h) After the `resolveOperation` method, insert:

```ts

  private resolveCredentialConnectPoll(record: Record<string, unknown>): EngineOperation {
    for (const key of Object.keys(record)) {
      if (key !== 'operation' && key !== 'keyId' && key !== 'flowToken') throw new Error(`unknown request field ${key}`);
    }
    const { keyId, flowToken } = parseCredentialConnectReference({ keyId: record.keyId, flowToken: record.flowToken });
    const flow = this.credentialConnects.get(keyId);
    if (!flow || flow.flowToken !== flowToken) throw new Error('Credential connect flow is absent or expired');
    if (performance.now() >= flow.expiresAt) {
      this.credentialConnects.delete(keyId);
      throw new Error('Credential connect flow is absent or expired');
    }
    return { args: ['keys', 'connect', flow.keyID, 'poll', flow.flowID], cancellable: false, controlStdin: false };
  }

  private captureCredentialConnect(operation: string, request: unknown, event: EngineEventPayload): EngineEventPayload {
    if ((operation !== 'keys-connect-start' && operation !== 'keys-connect-poll') || event.event !== 'result') return event;
    const keyID = request && typeof request === 'object' && !Array.isArray(request)
      ? (request as Record<string, unknown>).keyId
      : undefined;
    if (typeof keyID !== 'string' || !isEmailFlowKeyID(keyID)) throw new Error('Credential connect result has no credential');
    const data = event.data;
    if (operation === 'keys-connect-start') {
      const flowID = data?.flowId;
      const expires = data?.expiresInSeconds;
      const interval = data?.pollIntervalSeconds;
      if (typeof flowID !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(flowID)
        || typeof expires !== 'number' || !Number.isInteger(expires) || expires < 1 || expires > 1_800
        || typeof interval !== 'number' || !Number.isInteger(interval) || interval < 1 || interval > 60) {
        throw new Error('Credential connect start returned invalid flow metadata');
      }
      const flowToken = randomUUID();
      this.credentialConnects.set(keyID, {
        keyID,
        flowID,
        flowToken,
        pollIntervalSeconds: interval,
        expiresAt: performance.now() + expires * 1_000,
      });
      return {
        event: 'result',
        message: 'Check your email and press Connect.',
        data: {
          check: 'credential-connect-flow',
          id: keyID,
          status: 'pending',
          flow_token: flowToken,
          expires_in_seconds: expires,
          poll_interval_seconds: interval,
        },
      };
    }
    const status = data?.status;
    if (status !== 'pending' && status !== 'connected' && status !== 'expired') {
      throw new Error('Credential connect poll returned an unknown status');
    }
    const safe: Record<string, unknown> = { check: 'credential-connect-flow', id: keyID, status };
    const emailHint = data?.emailHint;
    if (typeof emailHint === 'string' && emailHint.length > 0 && emailHint.length <= 320) safe.email_hint = emailHint;
    const flow = this.credentialConnects.get(keyID);
    if (status === 'pending' && flow) {
      safe.flow_token = flow.flowToken;
      safe.poll_interval_seconds = flow.pollIntervalSeconds;
    } else {
      this.credentialConnects.delete(keyID);
    }
    return { event: 'result', data: safe };
  }
```

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/main/engine-framing.integration.test.ts src/main/engine.test.ts && npm run typecheck
```

Expected: PASS; typecheck clean.

- [ ] **Step 5: Mutation checks**

1. In `resolveCredentialConnectPoll`, delete the `if (performance.now() >= flow.expiresAt) { ... }` block → "refuses a raw flow id, a foreign or expired token…" is RED (the expired poll spawns instead of rejecting). Restore → PASS.
2. In `shutdown()`, delete `this.credentialConnects.clear();` → the same test is RED at `forgetCredentialConnect(... third ...)` returning `true`. Restore → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: main process owns email-flow credential connections behind an opaque token" -- desktop/src/main/engine.ts desktop/src/main/engine-framing.integration.test.ts
```

---

### Task 3: IPC and preload — forget a connection through a trusted channel

**Files:**
- Modify: `desktop/src/shared/contracts.ts`, `desktop/src/main.ts`, `desktop/src/preload.ts`
- Test: `desktop/src/preload.test.ts`, `desktop/src/security.boundaries.test.ts`

**Interfaces:**
- Consumes (Task 2): `EngineBridge.forgetCredentialConnect(input: unknown): boolean`.
- Produces: IPC channel `keys:connect-cancel` (invoke, trusted sender only); `IndicatorLabsAPI.cancelCredentialConnect(request: CredentialConnectReference): Promise<boolean>`. Start and poll keep using `engine:start` (`startOperation`).

- [ ] **Step 1: Write the failing tests**

In `desktop/src/preload.test.ts`, before the final `});` of `describe('context-isolated remote MCP bridge', ...)`, append:

```ts

  it('forgets an email-flow connection only through the main-owned flow token channel', async () => {
    const api = exposedAPI();
    const request = { keyId: 'INFOVIZ_TOKEN', flowToken: '11111111-1111-4111-8111-111111111111' };
    electronMock.invoke.mockResolvedValueOnce(true);
    await expect(api.cancelCredentialConnect!(request as never)).resolves.toBe(true);
    expect(electronMock.invoke).toHaveBeenCalledWith('keys:connect-cancel', request);
  });
```

In `desktop/src/security.boundaries.test.ts`, replace:

```ts
  it('does not register a state-bearing website-to-desktop protocol', () => {
```

with:

```ts
  it('forgets email-flow connections only from the trusted window', () => {
    expect(read('src/main.ts')).toContain("ipcMain.handle('keys:connect-cancel', (event, request: unknown) => {\n      requireTrustedSender(event);\n      return engine.forgetCredentialConnect(request);");
    expect(read('src/preload.ts')).toContain("cancelCredentialConnect: (request: CredentialConnectReference) => ipcRenderer.invoke('keys:connect-cancel', request)");
  });

  it('does not register a state-bearing website-to-desktop protocol', () => {
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/preload.test.ts src/security.boundaries.test.ts
```

Expected: FAIL — `api.cancelCredentialConnect is not a function`; the boundaries test does not find the handler or the preload line.

- [ ] **Step 3: Implement**

`desktop/src/shared/contracts.ts` — in `IndicatorLabsAPI`, replace:

```ts
  setKey(request: SetKeyEnvelope): Promise<OperationSettlement>;
```

with:

```ts
  setKey(request: SetKeyEnvelope): Promise<OperationSettlement>;
  /** Forgets a main-owned email-flow connection; true when a matching flow was forgotten. */
  cancelCredentialConnect(request: CredentialConnectReference): Promise<boolean>;
```

`desktop/src/main.ts` — replace:

```ts
    ipcMain.handle('keys:set', async (event, request: unknown) => {
      requireTrustedSender(event);
      return engine.setKey(request);
    });
```

with:

```ts
    ipcMain.handle('keys:set', async (event, request: unknown) => {
      requireTrustedSender(event);
      return engine.setKey(request);
    });
    ipcMain.handle('keys:connect-cancel', (event, request: unknown) => {
      requireTrustedSender(event);
      return engine.forgetCredentialConnect(request);
    });
```

`desktop/src/preload.ts` — replace the type import block:

```ts
import type {
  EngineEvent,
  EngineExit,
```

with:

```ts
import type {
  CredentialConnectReference,
  EngineEvent,
  EngineExit,
```

and replace:

```ts
  setKey: (request: SetKeyEnvelope) => ipcRenderer.invoke('keys:set', request),
```

with:

```ts
  setKey: (request: SetKeyEnvelope) => ipcRenderer.invoke('keys:set', request),
  cancelCredentialConnect: (request: CredentialConnectReference) => ipcRenderer.invoke('keys:connect-cancel', request),
```

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/preload.test.ts src/security.boundaries.test.ts && npm run typecheck
```

Expected: PASS; typecheck clean.

- [ ] **Step 5: Mutation check**

In `preload.ts` change the channel string to `'keys:connect-forget'` → `preload.test.ts` "forgets an email-flow connection…" and the boundaries test are RED. Restore → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: forget an email-flow connection through a trusted IPC channel" -- desktop/src/shared/contracts.ts desktop/src/main.ts desktop/src/preload.ts desktop/src/preload.test.ts desktop/src/security.boundaries.test.ts
```

---

### Task 4: Renderer workflow — acquisition, flow state, copy, exit transitions

**Files:**
- Modify: `desktop/src/renderer-workflow.ts`
- Test: `desktop/src/renderer-workflow.test.ts`

**Interfaces (produced):**
```ts
interface KeyStatus { /* existing */ acquisition?: 'email-flow' | 'paste' }
export interface CredentialConnectFlowState {
  keyId: string; status: 'pending' | 'connected' | 'expired';
  flowToken?: string; pollIntervalSeconds?: number; expiresInSeconds?: number; emailHint?: string; expiresAt?: number;
}
export const CREDENTIAL_CONNECT_PENDING_MESSAGE = 'Check your email and press Connect.';
export const CREDENTIAL_CONNECT_EXPIRED_MESSAGE = 'The link expired. Connect again.';
export const CREDENTIAL_CONNECT_FAILED_MESSAGE = 'Could not connect. Try again.';
export function credentialConnectFlowFromEvent(event: EngineEventPayload): CredentialConnectFlowState | null;
export function nextCredentialConnectFlow(previous: CredentialConnectFlowState | undefined, next: CredentialConnectFlowState, now: number): CredentialConnectFlowState;
export function credentialConnectMessage(flow: CredentialConnectFlowState): string;
export function credentialConnectFailureMessage(flow: CredentialConnectFlowState | null | undefined, now: number): string;
export function shouldPollCredentialConnect(flow: CredentialConnectFlowState | null | undefined): boolean;
type ExitOperationKind = /* existing */ | 'connect';
interface ExitActiveOperation { /* existing */ keyId?: string; connectAction?: 'start' | 'poll' }
interface ExitTransitionState { /* existing */ connectFlow?: CredentialConnectFlowState | null | undefined }
type ExitAction = /* existing */
  | { type: 'schedule-connect-poll'; keyId: string; flowToken: string; intervalSeconds: number }
  | { type: 'set-key-message'; keyId: string; message: string }
  | { type: 'forget-connect-flow'; keyId: string };
```

- [ ] **Step 1: Write the failing tests**

In `desktop/src/renderer-workflow.test.ts`, replace the first import lines:

```ts
import {
  authStatusFromEvent,
  configureDescriptorFromEvent,
```

with:

```ts
import {
  authStatusFromEvent,
  credentialConnectFailureMessage,
  credentialConnectFlowFromEvent,
  credentialConnectMessage,
  nextCredentialConnectFlow,
  shouldPollCredentialConnect,
  configureDescriptorFromEvent,
```

Append at the end of the file:

```ts
describe('email-flow credential connection', () => {
  const flowToken = '11111111-1111-4111-8111-111111111111';

  it('reads the acquisition from key metadata and drops values it does not know', () => {
    const listed = (acquisition: unknown) => keyStatusesFromEvent({ event: 'result', data: {
      status: 'listed',
      keys: [{ id: 'INFOVIZ_TOKEN', name: 'Infoviz account', stored: false, validatable: true, storageKind: 'record', metadata: { acquisition } }],
    } });
    expect(listed('email-flow')?.[0]?.acquisition).toBe('email-flow');
    expect(listed('paste')?.[0]?.acquisition).toBe('paste');
    expect(listed('carrier-pigeon')?.[0]).not.toHaveProperty('acquisition');
    expect(listed(undefined)?.[0]).not.toHaveProperty('acquisition');
  });

  it('accepts only a bounded main-owned flow and never a raw server flow id', () => {
    expect(credentialConnectFlowFromEvent({ event: 'result', message: 'Check your email and press Connect.', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending',
      flow_token: flowToken, expires_in_seconds: 900, poll_interval_seconds: 3,
    } })).toEqual({ keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, expiresInSeconds: 900, pollIntervalSeconds: 3 });
    expect(credentialConnectFlowFromEvent({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'connected', email_hint: 'e***@example.com',
    } })).toEqual({ keyId: 'INFOVIZ_TOKEN', status: 'connected', emailHint: 'e***@example.com' });
    expect(credentialConnectFlowFromEvent({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending', flow_token: 'server-flow-secret',
    } })).toBeNull();
    expect(credentialConnectFlowFromEvent({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'ready',
    } })).toBeNull();
    expect(credentialConnectFlowFromEvent({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending', flow_token: flowToken, poll_interval_seconds: 0,
    } })).toBeNull();
    expect(credentialConnectFlowFromEvent({ event: 'result', data: {
      check: 'navigator-auth-flow', status: 'pending', flow_token: flowToken,
    } })).toBeNull();
    expect(navigatorAuthFlowFromEvent({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending', flow_token: flowToken,
    } })).toBeNull();
  });

  it('keeps the start deadline across polls of the same token', () => {
    const started = nextCredentialConnectFlow(undefined, {
      keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, expiresInSeconds: 900, pollIntervalSeconds: 3,
    }, 1_000);
    expect(started.expiresAt).toBe(901_000);
    const polled = nextCredentialConnectFlow(started, { keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, pollIntervalSeconds: 3 }, 5_000);
    expect(polled.expiresAt).toBe(901_000);
    expect(nextCredentialConnectFlow(started, { keyId: 'INFOVIZ_TOKEN', status: 'connected', emailHint: 'e***@example.com' }, 6_000).expiresAt)
      .toBeUndefined();
  });

  it("says what to do next in the journalist's words", () => {
    expect(credentialConnectMessage({ keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken })).toBe('Check your email and press Connect.');
    expect(credentialConnectMessage({ keyId: 'INFOVIZ_TOKEN', status: 'connected', emailHint: 'e***@example.com' })).toBe('Connected as e***@example.com');
    expect(credentialConnectMessage({ keyId: 'INFOVIZ_TOKEN', status: 'expired' })).toBe('The link expired. Connect again.');
    expect(credentialConnectFailureMessage({ keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, expiresAt: 10 }, 11)).toBe('The link expired. Connect again.');
    expect(credentialConnectFailureMessage({ keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, expiresAt: 10 }, 9)).toBe('Could not connect. Try again.');
    expect(credentialConnectFailureMessage(null, 0)).toBe('Could not connect. Try again.');
  });

  it('polls a pending flow on focus, never a settled one', () => {
    expect(shouldPollCredentialConnect({ keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken })).toBe(true);
    expect(shouldPollCredentialConnect({ keyId: 'INFOVIZ_TOKEN', status: 'pending' })).toBe(false);
    expect(shouldPollCredentialConnect({ keyId: 'INFOVIZ_TOKEN', status: 'connected' })).toBe(false);
    expect(shouldPollCredentialConnect({ keyId: 'INFOVIZ_TOKEN', status: 'expired' })).toBe(false);
    expect(shouldPollCredentialConnect(undefined)).toBe(false);
  });

  it('schedules the next poll at the server interval, stops when settled, and forgets a failed flow', () => {
    const active = { product: 'splash', kind: 'connect', keyId: 'INFOVIZ_TOKEN', connectAction: 'start', verb: 'install' } as const;
    expect(transitionAfterExit(exitState({
      active, connectFlow: { keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, pollIntervalSeconds: 3 },
    }), { operationId: 'op', state: 'succeeded' })).toEqual([
      { type: 'set-operation-state', state: 'succeeded' },
      { type: 'clear-active-operation' },
      { type: 'schedule-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken, intervalSeconds: 3 },
    ]);
    expect(transitionAfterExit(exitState({
      active: { ...active, connectAction: 'poll' },
      connectFlow: { keyId: 'INFOVIZ_TOKEN', status: 'connected', emailHint: 'e***@example.com' },
    }), { operationId: 'op', state: 'succeeded' })).toEqual([
      { type: 'set-operation-state', state: 'succeeded' },
      { type: 'clear-active-operation' },
    ]);
    expect(transitionAfterExit(exitState({
      active: { ...active, connectAction: 'poll' },
      connectFlow: { keyId: 'INFOVIZ_TOKEN', status: 'pending', flowToken, pollIntervalSeconds: 3 },
    }), { operationId: 'op', state: 'failed_retryable' })).toEqual([
      { type: 'set-operation-state', state: 'failed_retryable' },
      { type: 'clear-active-operation' },
      { type: 'set-key-message', keyId: 'INFOVIZ_TOKEN', message: 'Could not connect. Try again.' },
      { type: 'forget-connect-flow', keyId: 'INFOVIZ_TOKEN' },
    ]);
    expect(transitionAfterExit(exitState({ active, connectFlow: null }), { operationId: 'op', state: 'succeeded' }))
      .toContainEqual({ type: 'set-key-message', keyId: 'INFOVIZ_TOKEN', message: 'Could not connect. Try again.' });
  });
});
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-workflow.test.ts
```

Expected: FAIL — `credentialConnectFlowFromEvent is not a function` (and siblings); the acquisition test fails because `acquisition` is absent; the transition test gets `set-product-progress` actions instead.

- [ ] **Step 3: Implement**

In `desktop/src/renderer-workflow.ts`:

(a) In `interface KeyStatus`, replace:

```ts
  acquisitionURL?: string;
  requiredPermissions?: string[];
}
```

with:

```ts
  acquisitionURL?: string;
  /** How the journalist provides the credential: pasted into the protected prompt, or connected by email. */
  acquisition?: 'email-flow' | 'paste';
  requiredPermissions?: string[];
}
```

(b) In `keyStatusesFromEvent`, replace:

```ts
    const rawPermissions = metadata.requiredPermissions;
```

with:

```ts
    const acquisition = metadata.acquisition === 'email-flow' || metadata.acquisition === 'paste'
      ? metadata.acquisition
      : undefined;
    const rawPermissions = metadata.requiredPermissions;
```

and replace:

```ts
      ...(acquisitionURL ? { acquisitionURL } : {}),
      ...(requiredPermissions && requiredPermissions.length > 0 ? { requiredPermissions } : {}),
```

with:

```ts
      ...(acquisitionURL ? { acquisitionURL } : {}),
      ...(acquisition ? { acquisition } : {}),
      ...(requiredPermissions && requiredPermissions.length > 0 ? { requiredPermissions } : {}),
```

(c) After `export function shouldPollNavigatorAuth(...) { ... }`, insert:

```ts

/** One email-flow credential connection as the renderer knows it. The server flow id is never here. */
export interface CredentialConnectFlowState {
  keyId: string;
  status: 'pending' | 'connected' | 'expired';
  flowToken?: string;
  pollIntervalSeconds?: number;
  expiresInSeconds?: number;
  emailHint?: string;
  /** Renderer clock (ms) after which the main process refuses the flow token. */
  expiresAt?: number;
}

export const CREDENTIAL_CONNECT_PENDING_MESSAGE = 'Check your email and press Connect.';
export const CREDENTIAL_CONNECT_EXPIRED_MESSAGE = 'The link expired. Connect again.';
export const CREDENTIAL_CONNECT_FAILED_MESSAGE = 'Could not connect. Try again.';

export function credentialConnectFlowFromEvent(event: EngineEventPayload): CredentialConnectFlowState | null {
  if (event.event !== 'result' || event.data?.check !== 'credential-connect-flow') return null;
  const id = event.data.id;
  const status = event.data.status;
  if (typeof id !== 'string' || !/^[A-Z][A-Z0-9_]{0,127}$/.test(id)) return null;
  if (status !== 'pending' && status !== 'connected' && status !== 'expired') return null;
  const flowToken = event.data.flow_token;
  if (flowToken !== undefined && (typeof flowToken !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(flowToken))) return null;
  const interval = event.data.poll_interval_seconds;
  const expires = event.data.expires_in_seconds;
  const emailHint = event.data.email_hint;
  if (interval !== undefined && (typeof interval !== 'number' || !Number.isInteger(interval) || interval < 1 || interval > 60)) return null;
  if (expires !== undefined && (typeof expires !== 'number' || !Number.isInteger(expires) || expires < 1 || expires > 1_800)) return null;
  if (emailHint !== undefined && (typeof emailHint !== 'string' || emailHint.length > 320)) return null;
  return {
    keyId: id,
    status,
    ...(typeof flowToken === 'string' ? { flowToken } : {}),
    ...(typeof interval === 'number' ? { pollIntervalSeconds: interval } : {}),
    ...(typeof expires === 'number' ? { expiresInSeconds: expires } : {}),
    ...(typeof emailHint === 'string' && emailHint.length > 0 ? { emailHint } : {}),
  };
}

/** A start carries the lifetime; a poll of the same token keeps the start's deadline. */
export function nextCredentialConnectFlow(
  previous: CredentialConnectFlowState | undefined,
  next: CredentialConnectFlowState,
  now: number,
): CredentialConnectFlowState {
  if (next.expiresInSeconds !== undefined) return { ...next, expiresAt: now + next.expiresInSeconds * 1_000 };
  if (previous?.expiresAt !== undefined && previous.flowToken !== undefined && previous.flowToken === next.flowToken) {
    return { ...next, expiresAt: previous.expiresAt };
  }
  return next;
}

export function credentialConnectMessage(flow: CredentialConnectFlowState): string {
  if (flow.status === 'pending') return CREDENTIAL_CONNECT_PENDING_MESSAGE;
  if (flow.status === 'expired') return CREDENTIAL_CONNECT_EXPIRED_MESSAGE;
  return flow.emailHint ? `Connected as ${flow.emailHint}` : 'Connected.';
}

/** A refused or failed action: past the deadline the link expired; otherwise a generic retry. */
export function credentialConnectFailureMessage(flow: CredentialConnectFlowState | null | undefined, now: number): string {
  return flow?.expiresAt !== undefined && now >= flow.expiresAt
    ? CREDENTIAL_CONNECT_EXPIRED_MESSAGE
    : CREDENTIAL_CONNECT_FAILED_MESSAGE;
}

/** Worth re-checking whenever the journalist could have pressed Connect in the email: on window focus. */
export function shouldPollCredentialConnect(flow: CredentialConnectFlowState | null | undefined): boolean {
  return flow?.status === 'pending' && Boolean(flow.flowToken);
}
```

(d) Replace:

```ts
export type ExitOperationKind = 'describe' | 'readiness' | 'plan' | 'apply' | 'catalog' | 'auth' | 'compute';

export interface ExitActiveOperation {
  product: Product;
  kind: ExitOperationKind;
  authAction?: 'start' | 'poll' | 'cancel' | 'refresh' | 'logout';
```

with:

```ts
export type ExitOperationKind = 'describe' | 'readiness' | 'plan' | 'apply' | 'catalog' | 'auth' | 'compute' | 'connect';

export interface ExitActiveOperation {
  product: Product;
  kind: ExitOperationKind;
  authAction?: 'start' | 'poll' | 'cancel' | 'refresh' | 'logout';
  keyId?: string;
  connectAction?: 'start' | 'poll';
```

(e) In `ExitTransitionState`, replace:

```ts
  authFlow: NavigatorAuthFlowState | null;
  productProgress: Partial<Record<Product, ProductProgress>>;
```

with:

```ts
  authFlow: NavigatorAuthFlowState | null;
  /** The last flow the Engine reported for the active connect operation's credential. */
  connectFlow?: CredentialConnectFlowState | null | undefined;
  productProgress: Partial<Record<Product, ProductProgress>>;
```

(f) In `ExitAction`, replace:

```ts
  | { type: 'schedule-auth-poll'; flowToken: string; intervalSeconds: number }
```

with:

```ts
  | { type: 'schedule-auth-poll'; flowToken: string; intervalSeconds: number }
  | { type: 'schedule-connect-poll'; keyId: string; flowToken: string; intervalSeconds: number }
  | { type: 'set-key-message'; keyId: string; message: string }
  | { type: 'forget-connect-flow'; keyId: string }
```

(g) In `transitionAfterExit`, replace:

```ts
    actions.push({ type: 'clear-active-operation' });
    actions.push({ type: 'pump-queue' });
    return actions;
  }

  const continueInstall = state.foreground && active.kind === 'describe'
```

with:

```ts
    actions.push({ type: 'clear-active-operation' });
    actions.push({ type: 'pump-queue' });
    return actions;
  }

  if (active.kind === 'connect') {
    actions.push({ type: 'clear-active-operation' });
    const keyId = active.keyId;
    if (!keyId) return actions;
    const flow = state.connectFlow;
    if (exit.state === 'succeeded' && flow?.keyId === keyId) {
      if (flow.status === 'pending' && flow.flowToken && flow.pollIntervalSeconds) {
        actions.push({ type: 'schedule-connect-poll', keyId, flowToken: flow.flowToken, intervalSeconds: flow.pollIntervalSeconds });
      }
      return actions;
    }
    actions.push({ type: 'set-key-message', keyId, message: CREDENTIAL_CONNECT_FAILED_MESSAGE });
    actions.push({ type: 'forget-connect-flow', keyId });
    return actions;
  }

  const continueInstall = state.foreground && active.kind === 'describe'
```

(The replaced `clear-active-operation` + `pump-queue` pair is the tail of the `if (active.kind === 'compute') { ... }` branch; confirm it is that branch before editing.)

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-workflow.test.ts && npm run typecheck
```

Expected: PASS; typecheck clean.

- [ ] **Step 5: Mutation check**

In the `connect` branch change `intervalSeconds: flow.pollIntervalSeconds` to `intervalSeconds: 5` → "schedules the next poll at the server interval…" is RED. Restore → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: renderer workflow for email-flow credential connections" -- desktop/src/renderer-workflow.ts desktop/src/renderer-workflow.test.ts
```

---

### Task 5: UI control — email field and Connect / Reconnect for email-flow credentials

**Files:**
- Modify: `desktop/src/renderer-product-controls.tsx`, `desktop/src/renderer-product-page.tsx`
- Test: `desktop/src/renderer-pages.test.tsx`

**Interfaces:**
- Consumes: `isValidAuthEmail` (Task 1), `KeyStatus.acquisition` (Task 4).
- Produces:
```ts
// CredentialControl new optional props
connectPending?: boolean | undefined;
onConnect?: ((key: KeyStatus, email: string) => void) | undefined;
onCancelConnect?: ((key: KeyStatus) => void) | undefined;
// ProductPage new optional props
connectPendingKeyIDs?: readonly string[] | undefined;
onConnectKey?: ((key: KeyStatus, email: string) => void) | undefined;
onCancelConnectKey?: ((key: KeyStatus) => void) | undefined;
```

- [ ] **Step 1: Write the failing tests**

In `desktop/src/renderer-pages.test.tsx`, replace:

```ts
import type { ConfigureDescriptor } from './renderer-workflow';
```

with:

```ts
import type { ConfigureDescriptor, KeyStatus } from './renderer-workflow';
```

Replace:

```ts
describe('in-agent products', () => {
```

with:

```tsx
describe('email-flow credential in Connected services', () => {
  const infoviz: KeyStatus = {
    id: 'INFOVIZ_TOKEN',
    name: 'Infoviz account',
    stored: false,
    validatable: true,
    storageKind: 'record',
    acquisition: 'email-flow',
    purpose: 'Raises Splash inspiration searches from 5 to 10 a day.',
    acquisitionURL: 'https://splash.buriedsignals.com/inspiration.html',
  };
  const maptiler: KeyStatus = { id: 'MAPTILER_KEY', name: 'MapTiler', stored: false, validatable: true, storageKind: 'record', acquisition: 'paste' };

  const page = (keys: KeyStatus[], extra: Record<string, unknown> = {}) => renderToStaticMarkup(
    <ProductPage
      product="splash"
      installed={false}
      retainedData={false}
      version=""
      descriptor={undefined}
      values={{}}
      keys={keys}
      working={false}
      onBack={noop}
      onChange={noop}
      onRuntime={noop}
      onBrowse={async () => null}
      onInstall={noop}
      onUninstall={noop}
      onRemoveData={noop}
      onLaunch={noop}
      onSaveKey={noop}
      onValidateKey={noop}
      {...pageExtras}
      {...extra}
    />,
  );

  it('offers an email and Connect instead of the paste prompt', () => {
    const html = page([infoviz, maptiler]);
    expect(html).toContain('Connected services');
    expect(html).toContain('Account email');
    expect(html).toMatch(/<button type="button" class="secondary" disabled="">Connect<\/button>/);
    expect(html).not.toContain('Enter token');
    expect(html).not.toContain('Check saved token');
    expect(html).toContain('Enter API key');
    expect(html.match(/protected operating-system prompt/g)).toHaveLength(1);
  });

  it('reconnects a stored account and keeps the saved-token check', () => {
    const html = page([{ ...infoviz, stored: true }], { keyMessages: { INFOVIZ_TOKEN: 'Connected as e***@example.com' } });
    expect(html).toContain('>Reconnect</button>');
    expect(html).toContain('>Check saved token</button>');
    expect(html).toContain('Connected as e***@example.com');
    expect(html).not.toContain('Replace token');
  });

  it('offers Cancel only while this credential waits for the email', () => {
    const pending = page([infoviz], {
      connectPendingKeyIDs: ['INFOVIZ_TOKEN'],
      onConnectKey: noop,
      onCancelConnectKey: noop,
      keyMessages: { INFOVIZ_TOKEN: 'Check your email and press Connect.' },
    });
    expect(pending).toContain('Check your email and press Connect.');
    expect(pending).toContain('>Cancel</button>');
    expect(page([infoviz], { onConnectKey: noop, onCancelConnectKey: noop })).not.toContain('>Cancel</button>');
  });
});

describe('in-agent products', () => {
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-pages.test.tsx
```

Expected: FAIL — "offers an email and Connect…" (no `Account email`, `Enter token…` present); "reconnects…" (`Replace token…` instead of `Reconnect`); "offers Cancel…" (no Cancel).

- [ ] **Step 3: Implement**

`desktop/src/renderer-product-controls.tsx`:

(a) Replace:

```ts
import type { KeyValidationContext, Product } from './shared/contracts';
```

with:

```ts
import { isValidAuthEmail, type KeyValidationContext, type Product } from './shared/contracts';
```

(b) Replace the `CredentialControl` signature and its first lines:

```tsx
export function CredentialControl({
  credential, message, busy, pendingKeyID, onSave, onValidate, onOpenDocs, onCancelKey,
}: {
  credential: KeyStatus;
  message: string;
  busy: boolean;
  pendingKeyID?: string | null | undefined;
  onSave: (key: KeyStatus, context?: KeyValidationContext) => void;
  onValidate: (key: KeyStatus) => void;
  onOpenDocs: (url: string) => void;
  onCancelKey?: (() => void) | undefined;
}) {
  const [pagesAttested, setPagesAttested] = useState(false);
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
```

with:

```tsx
export function CredentialControl({
  credential, message, busy, pendingKeyID, onSave, onValidate, onOpenDocs, onCancelKey,
  connectPending = false, onConnect, onCancelConnect,
}: {
  credential: KeyStatus;
  message: string;
  busy: boolean;
  pendingKeyID?: string | null | undefined;
  onSave: (key: KeyStatus, context?: KeyValidationContext) => void;
  onValidate: (key: KeyStatus) => void;
  onOpenDocs: (url: string) => void;
  onCancelKey?: (() => void) | undefined;
  /** An email-flow connection for this credential is waiting for the journalist to press Connect in the email. */
  connectPending?: boolean | undefined;
  onConnect?: ((key: KeyStatus, email: string) => void) | undefined;
  onCancelConnect?: ((key: KeyStatus) => void) | undefined;
}) {
  const [pagesAttested, setPagesAttested] = useState(false);
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [connectEmail, setConnectEmail] = useState('');
```

(c) Replace:

```tsx
  const save = () => {
    if (credential.id === 'CLOUDFLARE_API_TOKEN') {
```

with:

```tsx
  if (credential.acquisition === 'email-flow') {
    const connectDisabled = busy
      || Boolean(pendingKeyID)
      || storageUnavailable
      || connectPending
      || !onConnect
      || !isValidAuthEmail(connectEmail);
    return (
      <div className={`credential-control${credential.stored === true ? ' saved' : ''}`}>
        <div className="credential-heading">
          <span className="copy">
            <strong>{credential.name}</strong>
            {purpose && <small>{purpose}</small>}
          </span>
          <span className={`chip ${credential.stored === true ? 'chip-ok' : 'chip-neutral'}`}>
            {credential.stored === true ? 'Connected' : storageUnavailable ? 'Storage unavailable' : 'Not connected'}
          </span>
        </div>
        <label className="field">
          <span>Account email</span>
          <input
            type="email"
            value={connectEmail}
            disabled={busy || connectPending}
            spellCheck={false}
            autoComplete="email"
            onChange={(event) => setConnectEmail(event.target.value.trim())}
          />
        </label>
        <div className="credential-actions">
          <button type="button" className="secondary" disabled={connectDisabled} onClick={() => onConnect?.(credential, connectEmail)}>
            {storageUnavailable ? 'Unavailable' : credential.stored === true ? 'Reconnect' : 'Connect'}
          </button>
          {connectPending && onCancelConnect && (
            <button type="button" className="key-help" disabled={busy} onClick={() => onCancelConnect(credential)}>Cancel</button>
          )}
          {acquisitionURL && (
            <button type="button" className="key-help" disabled={busy} onClick={() => onOpenDocs(acquisitionURL)}>
              About {credential.name} ↗
            </button>
          )}
          {credential.stored === true && credential.validatable && (
            <button type="button" className="key-help" disabled={busy} onClick={() => onValidate(credential)}>Check saved token</button>
          )}
        </div>
        <p className="credential-privacy">A link is emailed to this address. Press Connect in that email; no token is pasted or shown here.</p>
        {message && <p className="credential-message" role="status">{message}</p>}
      </div>
    );
  }

  const save = () => {
    if (credential.id === 'CLOUDFLARE_API_TOKEN') {
```

`desktop/src/renderer-product-page.tsx`:

(d) Replace:

```tsx
  workspace, casesRoot, engineExecutable = null, launching = false,
}: {
```

with:

```tsx
  workspace, casesRoot, engineExecutable = null, launching = false,
  connectPendingKeyIDs = [], onConnectKey, onCancelConnectKey,
}: {
```

(e) Replace:

```tsx
  onSaveKey: (key: KeyStatus, context?: KeyValidationContext) => void;
  onValidateKey: (key: KeyStatus) => void;
  onCancelKey?: (() => void) | undefined;
  onOpenDocs: (url: string) => void;
```

with:

```tsx
  onSaveKey: (key: KeyStatus, context?: KeyValidationContext) => void;
  onValidateKey: (key: KeyStatus) => void;
  onCancelKey?: (() => void) | undefined;
  /** Email-flow credentials waiting for the journalist to press Connect in the email. */
  connectPendingKeyIDs?: readonly string[] | undefined;
  onConnectKey?: ((key: KeyStatus, email: string) => void) | undefined;
  onCancelConnectKey?: ((key: KeyStatus) => void) | undefined;
  onOpenDocs: (url: string) => void;
```

(f) In the Connected services block, replace:

```tsx
            {fixedCredentials.map((credential) => (
              <CredentialControl
                key={credential.id}
                credential={credential}
                message={keyMessages[credential.id] ?? ''}
                busy={working}
                pendingKeyID={pendingKeyID}
                onSave={onSaveKey}
                onValidate={onValidateKey}
                onOpenDocs={onOpenDocs}
                onCancelKey={onCancelKey}
              />
            ))}
```

with:

```tsx
            {fixedCredentials.map((credential) => (
              <CredentialControl
                key={credential.id}
                credential={credential}
                message={keyMessages[credential.id] ?? ''}
                busy={working}
                pendingKeyID={pendingKeyID}
                onSave={onSaveKey}
                onValidate={onValidateKey}
                onOpenDocs={onOpenDocs}
                onCancelKey={onCancelKey}
                connectPending={connectPendingKeyIDs.includes(credential.id)}
                onConnect={onConnectKey}
                onCancelConnect={onCancelConnectKey}
              />
            ))}
```

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-pages.test.tsx && npm run typecheck
```

Expected: PASS; typecheck clean.

- [ ] **Step 5: Mutation check**

Change the branch condition to `if (credential.acquisition === 'paste')` → "offers an email and Connect instead of the paste prompt" is RED. Restore → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: Connect and Reconnect for email-flow credentials" -- desktop/src/renderer-product-controls.tsx desktop/src/renderer-product-page.tsx desktop/src/renderer-pages.test.tsx
```

---

### Task 6: Journalist key lists — Infoviz account in Splash

**Files:**
- Modify: `desktop/src/renderer-journalist.ts`
- Test: `desktop/src/renderer-journalist.test.ts`

**Interfaces (produced):** `SPLASH_KEY_IDS = ['MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN', 'INFOVIZ_TOKEN']`; `journalistKeyIDs('splash', {})` returns the same list.

- [ ] **Step 1: Write the failing test**

In `desktop/src/renderer-journalist.test.ts`, replace:

```ts
    expect(journalistKeyIDs('splash', {})).toEqual([
      'MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN',
    ]);
```

with:

```ts
    expect(journalistKeyIDs('splash', {})).toEqual([
      'MAPTILER_KEY', 'DATAWRAPPER_TOKEN', 'CLOUDFLARE_API_TOKEN', 'INFOVIZ_TOKEN',
    ]);
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-journalist.test.ts
```

Expected: FAIL — the received list lacks `'INFOVIZ_TOKEN'`.

- [ ] **Step 3: Implement**

In `desktop/src/renderer-journalist.ts`, replace:

```ts
export const SPLASH_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
] as const;
```

with:

```ts
export const SPLASH_KEY_IDS = [
  'MAPTILER_KEY',
  'DATAWRAPPER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'INFOVIZ_TOKEN',
] as const;
```

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-journalist.test.ts && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Mutation check**

Remove `'INFOVIZ_TOKEN',` from `SPLASH_KEY_IDS` → RED. Restore → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: Infoviz account in Splash Connected services" -- desktop/src/renderer-journalist.ts desktop/src/renderer-journalist.test.ts
```

---

### Task 7: Renderer wiring + mounted integration test — connect, focus-poll, interval poll, expiry, reconnect, failure

**Files:**
- Modify: `desktop/src/renderer.tsx`
- Test: `desktop/src/renderer-mounted.test.tsx`

**Interfaces:**
- Consumes: `IndicatorLabsAPI.startOperation` with `{ operation: 'keys-connect-start', keyId, email }` and `{ operation: 'keys-connect-poll', keyId, flowToken }`; `IndicatorLabsAPI.cancelCredentialConnect` (Task 3); `onWindowFocus`; Task 4 workflow exports; Task 5 `ProductPage` props; Task 6 `SPLASH_KEY_IDS`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Append to `desktop/src/renderer-mounted.test.tsx`:

```tsx
it('connects an email-flow credential from Splash, polls on focus and at the server interval, expires, reconnects, and retries after a failure', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  document.body.innerHTML = '<div id="root"></div>';
  let onEvent: (event: EngineEvent) => void = () => {};
  let onExit: (exit: EngineExit) => void = () => {};
  let onFocus: () => void = () => {};
  const requests: StartOperationEnvelope[] = [];
  const api = {
    startOperation: vi.fn(async (request: StartOperationEnvelope) => { requests.push(request); }),
    cancelCredentialConnect: vi.fn(async () => true),
    onEngineEvent: (listener: typeof onEvent) => { onEvent = listener; return () => {}; },
    onEngineExit: (listener: typeof onExit) => { onExit = listener; return () => {}; },
    onWindowFocus: (listener: () => void) => { onFocus = listener; return () => {}; },
    getRemoteMcpRuntimes: vi.fn(async () => ({ agents: [], productCLIs: [] })),
    launchProduct: vi.fn(async () => {}),
  };
  vi.stubGlobal('indicatorLabs', api as unknown as IndicatorLabsAPI);
  // Polls scheduled at the server interval (3 s) are captured and fired by hand.
  const realSetTimeout = window.setTimeout.bind(window);
  const scheduledPolls: Array<() => void> = [];
  const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((callback: () => void, ms?: number) => {
    if (ms === 3_000) {
      scheduledPolls.push(callback);
      return 0;
    }
    return realSetTimeout(callback, ms);
  }) as never);
  try {
    await act(async () => { await import('./renderer'); });
    const current = () => requests.at(-1)!;
    const finish = async (payload?: EngineEventPayload, state: EngineExit['state'] = 'succeeded') => {
      const { operationId } = current();
      await act(async () => {
        if (payload) onEvent({ ...payload, operationId });
        onExit({ operationId, code: state === 'succeeded' ? 0 : 1, state });
      });
    };
    const button = (label: string) => [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === label);
    const nothingInstalled: EngineEventPayload = {
      event: 'result', data: { check: 'products', products: ['mycroft', 'spotlight', 'splash', 'navigator', 'scoutpost'].map((product) => ({
        product, installed: false, configured: false, retained_data: false,
      })) },
    };
    const keys: EngineEventPayload = { event: 'result', data: { status: 'listed', keys: [{
      id: 'INFOVIZ_TOKEN', name: 'Infoviz account', stored: false, validatable: true, storageKind: 'record',
      metadata: { purpose: 'Raises Splash inspiration searches from 5 to 10 a day.', acquisition: 'email-flow' },
    }] } };
    const pending = (flowToken: string, start: boolean): EngineEventPayload => ({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'pending', flow_token: flowToken, poll_interval_seconds: 3,
      ...(start ? { expires_in_seconds: 900 } : {}),
    } });
    const firstToken = '11111111-1111-4111-8111-111111111111';
    const secondToken = '22222222-2222-4222-8222-222222222222';
    const thirdToken = '33333333-3333-4333-8333-333333333333';

    for (const operation of ['products-list', 'catalog-sync', 'catalog-list', 'keys-list', 'auth-status', 'runtimes-detect']) {
      expect(current().request.operation).toBe(operation);
      await finish(operation === 'products-list' ? nothingInstalled : operation === 'keys-list' ? keys : undefined);
    }
    const splash = [...document.querySelectorAll('button')].find((item) => item.textContent?.startsWith('Splash'))!;
    await act(async () => splash.click());
    expect(current().request.operation).toBe('configure-describe');
    await finish();

    expect(document.body.textContent).toContain('Connected services');
    expect(document.body.textContent).not.toContain('Enter token');
    expect(button('Connect')?.disabled).toBe(true);
    const email = document.querySelector<HTMLInputElement>('input[type="email"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(email, 'editor@example.com');
      email.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(button('Connect')?.disabled).toBe(false);

    // Connect.
    await act(async () => button('Connect')!.click());
    expect(current().request).toEqual({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com' });
    await finish(pending(firstToken, true));
    expect(document.body.textContent).toContain('Check your email and press Connect.');
    expect(button('Connect')?.disabled).toBe(true);
    expect(button('Cancel')).toBeDefined();
    expect(scheduledPolls).toHaveLength(1);

    // Coming back to the window polls at once.
    await act(async () => onFocus());
    expect(current().request).toEqual({ operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken: firstToken });
    await finish(pending(firstToken, false));
    expect(scheduledPolls).toHaveLength(2);

    // The server interval polls too.
    const beforeInterval = requests.length;
    await act(async () => scheduledPolls.at(-1)!());
    expect(requests).toHaveLength(beforeInterval + 1);
    expect(current().request).toEqual({ operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken: firstToken });
    await finish({ event: 'result', data: {
      check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'connected', email_hint: 'e***@example.com',
    } });
    expect(document.body.textContent).toContain('Connected as e***@example.com');
    expect(button('Reconnect')?.disabled).toBe(false);
    expect(button('Check saved token')).toBeDefined();
    expect(scheduledPolls).toHaveLength(2);
    const afterConnected = requests.length;
    await act(async () => onFocus());
    expect(requests).toHaveLength(afterConnected);

    // Reconnect, then the link expires.
    await act(async () => button('Reconnect')!.click());
    expect(current().request).toEqual({ operation: 'keys-connect-start', keyId: 'INFOVIZ_TOKEN', email: 'editor@example.com' });
    await finish(pending(secondToken, true));
    await act(async () => onFocus());
    expect(current().request).toEqual({ operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken: secondToken });
    await finish({ event: 'result', data: { check: 'credential-connect-flow', id: 'INFOVIZ_TOKEN', status: 'expired' } });
    expect(document.body.textContent).toContain('The link expired. Connect again.');
    expect(button('Reconnect')?.disabled).toBe(false);
    const afterExpired = requests.length;
    await act(async () => onFocus());
    expect(requests).toHaveLength(afterExpired);

    // A failed poll shows a generic retry and forgets the flow in main.
    await act(async () => button('Reconnect')!.click());
    await finish(pending(thirdToken, true));
    await act(async () => onFocus());
    expect(current().request).toEqual({ operation: 'keys-connect-poll', keyId: 'INFOVIZ_TOKEN', flowToken: thirdToken });
    await finish({ event: 'error', message: 'keys connect poll failed' }, 'failed_retryable');
    expect(document.body.textContent).toContain('Could not connect. Try again.');
    expect(api.cancelCredentialConnect).toHaveBeenCalledWith({ keyId: 'INFOVIZ_TOKEN', flowToken: thirdToken });
    const afterFailure = requests.length;
    await act(async () => onFocus());
    expect(requests).toHaveLength(afterFailure);
    expect(JSON.stringify(requests)).not.toMatch(/flowId|server-flow/);
  } finally {
    setTimeoutSpy.mockRestore();
  }
});
```

- [ ] **Step 2: Run and see it fail**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-mounted.test.tsx
```

Expected: FAIL at `expect(button('Connect')?.disabled).toBe(false)` after typing (the page offers no `onConnectKey`, so Connect stays disabled) — the existing four tests still PASS.

- [ ] **Step 3: Implement**

In `desktop/src/renderer.tsx`:

(a) In the `./renderer-workflow` import list, replace:

```ts
  computeProbeFromEvent,
  isActiveOperation,
```

with:

```ts
  computeProbeFromEvent,
  credentialConnectFailureMessage,
  credentialConnectFlowFromEvent,
  credentialConnectMessage,
  nextCredentialConnectFlow,
  shouldPollCredentialConnect,
  isActiveOperation,
```

and replace:

```ts
  type ComputeProbe,
  type ConfigureDescriptor,
```

with:

```ts
  type ComputeProbe,
  type ConfigureDescriptor,
  type CredentialConnectFlowState,
```

(b) Replace:

```ts
type ActiveOperation = {
  product: Product;
  kind: 'describe' | 'readiness' | 'plan' | 'apply' | 'catalog' | 'auth' | 'compute';
  authAction?: 'start' | 'poll' | 'cancel' | 'refresh' | 'logout';
```

with:

```ts
type ActiveOperation = {
  product: Product;
  kind: 'describe' | 'readiness' | 'plan' | 'apply' | 'catalog' | 'auth' | 'compute' | 'connect';
  authAction?: 'start' | 'poll' | 'cancel' | 'refresh' | 'logout';
  keyId?: string;
  connectAction?: 'start' | 'poll';
```

(c) Replace:

```ts
  const navigatorAuthTimer = useRef<number | undefined>(undefined);
```

with:

```ts
  const navigatorAuthTimer = useRef<number | undefined>(undefined);
  // Email-flow connections, one per credential ID. Only main-owned flow tokens live here.
  const credentialConnects = useRef<Record<string, CredentialConnectFlowState>>({});
  const credentialConnectTimers = useRef<Record<string, number>>({});
  const startCredentialConnectRef = useRef<(keyId: string, action: 'start' | 'poll', payload: string) => void>(() => {});
  const forgetCredentialConnectRef = useRef<(keyId: string) => void>(() => {});
  const pollCredentialConnectsRef = useRef<() => void>(() => {});
```

(d) In the `onEngineEvent` listener, replace:

```ts
      const summary = doctorSummaryFromEvent(event);
      if (summary) {
        seenDoctor.current = true;
```

with:

```ts
      const connectFlow = credentialConnectFlowFromEvent(event);
      if (connectFlow) {
        const flow = nextCredentialConnectFlow(credentialConnects.current[connectFlow.keyId], connectFlow, Date.now());
        credentialConnects.current = { ...credentialConnects.current, [flow.keyId]: flow };
        if (flow.status !== 'pending') clearTimeout(credentialConnectTimers.current[flow.keyId]);
        if (flow.status === 'connected') {
          setKeyStatuses((current) => current.map((status) => (
            status.id === flow.keyId ? { ...status, stored: true } : status
          )));
        }
        setKeyMessages((current) => ({ ...current, [flow.keyId]: credentialConnectMessage(flow) }));
      }
      const summary = doctorSummaryFromEvent(event);
      if (summary) {
        seenDoctor.current = true;
```

(e) In `applyExitAction`, replace:

```ts
        case 'queue-operation': {
          const { request, pumpOnFailure } = action;
```

with:

```ts
        case 'schedule-connect-poll': {
          const { keyId, flowToken, intervalSeconds } = action;
          clearTimeout(credentialConnectTimers.current[keyId]);
          credentialConnectTimers.current[keyId] = window.setTimeout(() => {
            startCredentialConnectRef.current(keyId, 'poll', flowToken);
          }, intervalSeconds * 1_000);
          return;
        }
        case 'set-key-message':
          setKeyMessages((current) => ({ ...current, [action.keyId]: action.message }));
          return;
        case 'forget-connect-flow':
          forgetCredentialConnectRef.current(action.keyId);
          return;
        case 'queue-operation': {
          const { request, pumpOnFailure } = action;
```

(f) In the `onEngineExit` listener's `transitionAfterExit({ ... })` argument, replace:

```ts
        authFlow: navigatorAuthFlow.current,
        productProgress: productProgressRef.current,
```

with:

```ts
        authFlow: navigatorAuthFlow.current,
        connectFlow: active?.keyId ? credentialConnects.current[active.keyId] ?? null : null,
        productProgress: productProgressRef.current,
```

(g) Replace:

```ts
    const offFocus = window.indicatorLabs.onWindowFocus(() => pollNavigatorAuthRef.current());
    startBootOperation();
    return () => {
      clearTimeout(navigatorAuthTimer.current);
```

with:

```ts
    // Returning from the browser or the email client is the only signal that a
    // confirmation may have happened: check both kinds of flow at once.
    const offFocus = window.indicatorLabs.onWindowFocus(() => {
      pollNavigatorAuthRef.current();
      pollCredentialConnectsRef.current();
    });
    startBootOperation();
    return () => {
      clearTimeout(navigatorAuthTimer.current);
      for (const timer of Object.values(credentialConnectTimers.current)) clearTimeout(timer);
```

(h) Replace:

```ts
  const busy = activeOperationID.current !== null || planProduct !== null || activeOperation.current?.kind === 'auth' || activeOperation.current?.kind === 'compute';
```

with:

```ts
  const busy = activeOperationID.current !== null || planProduct !== null || activeOperation.current?.kind === 'auth'
    || activeOperation.current?.kind === 'compute' || activeOperation.current?.kind === 'connect';
```

(i) Replace:

```ts
  pollNavigatorAuthRef.current = pollNavigatorAuth;
```

with:

```ts
  pollNavigatorAuthRef.current = pollNavigatorAuth;

  const forgetCredentialConnect = (keyId: string) => {
    clearTimeout(credentialConnectTimers.current[keyId]);
    const flow = credentialConnects.current[keyId];
    const { [keyId]: _forgotten, ...rest } = credentialConnects.current;
    credentialConnects.current = rest;
    if (flow?.flowToken) {
      void window.indicatorLabs.cancelCredentialConnect({ keyId, flowToken: flow.flowToken }).catch(() => undefined);
    }
  };
  forgetCredentialConnectRef.current = forgetCredentialConnect;

  /** The payload is the email for a start and the main-owned flow token for a poll. */
  const startCredentialConnect = (keyId: string, action: 'start' | 'poll', payload: string) => {
    clearTimeout(credentialConnectTimers.current[keyId]);
    if (action === 'start') {
      const { [keyId]: _previous, ...rest } = credentialConnects.current;
      credentialConnects.current = rest;
      setKeyMessages((current) => ({ ...current, [keyId]: '' }));
    }
    queueJournalistJob(() => {
      // A poll queued behind other work is dropped if its flow was forgotten or replaced meanwhile.
      if (action === 'poll' && credentialConnects.current[keyId]?.flowToken !== payload) {
        pumpEngineQueue();
        return;
      }
      setEvents([]);
      activeOperation.current = {
        product: selectedProductRef.current ?? 'splash', kind: 'connect', keyId, connectAction: action, verb: 'install',
      };
      setState('running');
      void startOperation(action === 'start'
        ? { operation: 'keys-connect-start', keyId, email: payload }
        : { operation: 'keys-connect-poll', keyId, flowToken: payload })
        .catch(() => {
          activeOperation.current = null;
          setState('failed_terminal');
          const message = credentialConnectFailureMessage(credentialConnects.current[keyId], Date.now());
          setKeyMessages((current) => ({ ...current, [keyId]: message }));
          forgetCredentialConnect(keyId);
          pumpEngineQueue();
        });
    });
    pumpEngineQueue();
  };
  startCredentialConnectRef.current = startCredentialConnect;

  const pollCredentialConnects = () => {
    for (const flow of Object.values(credentialConnects.current)) {
      if (shouldPollCredentialConnect(flow) && flow.flowToken) startCredentialConnect(flow.keyId, 'poll', flow.flowToken);
    }
  };
  pollCredentialConnectsRef.current = pollCredentialConnects;

  const cancelCredentialConnect = (key: KeyStatus) => {
    forgetCredentialConnect(key.id);
    setKeyMessages((current) => ({ ...current, [key.id]: '' }));
  };
```

(j) In the `<ProductPage ... />` props, replace:

```tsx
            authPending={navigatorAuthFlow.current?.status === 'pending'}
```

with:

```tsx
            authPending={navigatorAuthFlow.current?.status === 'pending'}
            connectPendingKeyIDs={Object.values(credentialConnects.current)
              .filter((flow) => flow.status === 'pending')
              .map((flow) => flow.keyId)}
            onConnectKey={(key, email) => startCredentialConnect(key.id, 'start', email)}
            onCancelConnectKey={(key) => cancelCredentialConnect(key)}
```

- [ ] **Step 4: Run and see it pass**

```bash
cd "$ENGINE/desktop" && npx vitest run src/renderer-mounted.test.tsx && npm run typecheck
```

Expected: all five mounted tests PASS; typecheck clean.

- [ ] **Step 5: Mutation checks**

1. In (g), delete `pollCredentialConnectsRef.current();` → the new mounted test is RED at the first focus-poll expectation. Restore → PASS.
2. In (e), change `intervalSeconds * 1_000` to `intervalSeconds * 2_000` → RED at `expect(scheduledPolls).toHaveLength(1)`. Restore → PASS.

- [ ] **Step 6: Commit**

```bash
git -C "$ENGINE" commit -m "Labs: connect an email-flow credential from Splash, polling on focus and at the server interval" -- desktop/src/renderer.tsx desktop/src/renderer-mounted.test.tsx
```

---

### Task 8: Release runbook — Infoviz Connect manual check

**Files:**
- Modify: `docs/desktop/release-runbook.md`

**Interfaces:** none.

- [ ] **Step 1: Check the line is absent**

```bash
grep -n 'Infoviz Connect' "$ENGINE/docs/desktop/release-runbook.md"; echo "exit=$?"
```

Expected: no output, `exit=1`.

- [ ] **Step 2: Add the line**

In `docs/desktop/release-runbook.md` (section "QA iteration (default for testers)"), replace:

```text
The retest must cover: native Save/Cancel, Navigator email confirmation and
cancel, required-versus-optional readiness, visible long-operation
cancel/terminal states, and redacted diagnostic export.
```

with:

```text
The retest must cover: native Save/Cancel, Navigator email confirmation and
cancel, required-versus-optional readiness, visible long-operation
cancel/terminal states, and redacted diagnostic export.

Manual check — Infoviz Connect: connect, focus-poll, expiry, reconnect. In
Splash → Connected services → Infoviz account, enter an email and press
Connect; press Connect in the email, return to the window, and see "Connected
as …" without waiting for the next poll; press Reconnect, leave that link
unconfirmed past its lifetime, focus the window, and see "The link expired.
Connect again."; press Reconnect once more and confirm.
```

- [ ] **Step 3: Verify**

```bash
grep -n 'Manual check — Infoviz Connect: connect, focus-poll, expiry, reconnect.' "$ENGINE/docs/desktop/release-runbook.md"
```

Expected: one line.

- [ ] **Step 4: Mutation check**

Not applicable (documentation). The Step 3 grep is the check.

- [ ] **Step 5: Commit**

```bash
git -C "$ENGINE" commit -m "runbook: Infoviz Connect manual check" -- docs/desktop/release-runbook.md
```

---

### Task 9: Gate — then STOP

**Files:** none modified.

- [ ] **Step 1: Full desktop suite, preload test, types**

```bash
cd "$ENGINE/desktop" && npm test 2>&1 | tee /tmp/desktop-gate.txt; echo "exit=${PIPESTATUS[0]}"
cd "$ENGINE/desktop" && npx vitest run src/preload.test.ts
cd "$ENGINE/desktop" && npm run typecheck
git -C "$ENGINE" diff --check origin/main..HEAD -- desktop docs/desktop
git -C "$ENGINE" status --porcelain
```

Expected: `npm test` exit 0 — or, if Task 0 recorded pre-existing failures, exactly those and nothing new (the Task 0 acquisition-URL red is now green); preload test PASS; typecheck clean; no whitespace errors; clean status.

- [ ] **Step 2: Secret and flow-id scan of the renderer surface**

```bash
git -C "$ENGINE" grep -n 'flowId\|flow_id' -- desktop/src/renderer.tsx desktop/src/renderer-workflow.ts desktop/src/renderer-product-controls.tsx desktop/src/renderer-product-page.tsx desktop/src/preload.ts
```

Expected: no output (only `engine.ts` reads the server `flowId`).

- [ ] **Step 3: Report and STOP**

Report: the commit list (`git -C "$ENGINE" log --oneline origin/main..HEAD`), the gate output summary, and any Task 0 baseline failures. Then STOP. Do **not** push, open a PR, dispatch a workflow, or run any release step.

Gate notes (not run here — Tom's release flow, only after Rémy's go to push and Tom's review):
- `npm --prefix desktop run test:parity` (`desktop/scripts/ci-parity.sh <sha>`: committed-tree parity, needs pwsh, actionlint, docker, go and the published catalog sibling).
- `npm --prefix desktop run test:release-dry-run`, `npm --prefix desktop run test:macos-ci-gate`, `npm --prefix desktop audit --audit-level=low` (no dependency changed in this plan).
- Manual QA line added in Task 8 ("Infoviz Connect") on a `make:review` build.

---

## Self-review

**Spec coverage (Part 2a, desktop bullet + binding items):**

| Requirement | Task |
|---|---|
| `INFOVIZ_TOKEN` in `RECORD_KEY_IDS` (+ pinned test) | 1 |
| `INFOVIZ_TOKEN` in `SPLASH_KEY_IDS` (+ pinned test) | 6 |
| email-flow row: email field + Connect (not stored) / Reconnect (stored) instead of "Enter token…" | 5 |
| "Check saved token" stays, validates as other records (`keys-status`, unchanged path via `isRecordKeyID`) | 5, 1 |
| paste prompt never offered (UI branch + `validateSetKeyRequest` refusal before the prompt) | 5, 1, 2 |
| acquisition read from `keys list` metadata | 4 |
| main runs `keys connect <ID> start <email>` / `poll <flowId>`, holds the flowId | 1, 2 |
| renderer gets only opaque flow token + expiry + interval; cannot supply a raw flowId | 2, 4, 9 |
| slot keyed per credential ID, cannot collide with Navigator | 2 |
| expired / unknown / foreign flow tokens refused | 2 |
| flow forgotten on connected / expired / cancel / shutdown; no server cancel | 2, 3, 7 |
| polls at the server interval and on window focus | 4, 7 |
| copy: "Check your email and press Connect.", "Connected as {emailHint}", "The link expired. Connect again." | 4, 7 |
| failed action → generic retry message | 4, 7 |
| email validated like the Navigator email (`validateAuthEmail` via `isValidAuthEmail`) | 1, 5 |
| runbook manual check "Infoviz Connect: connect, focus-poll, expiry, reconnect" | 8 |
| gate, then STOP before push/PR | 9 |

**Placeholder scan:** no TBD/TODO; every step has exact code or an exact command. `$ENGINE` is defined in Global Constraints (the bsig plan's checkout, default `/Users/rmdms/Sites/Professional/engine`).

**Naming consistency:** operations `keys-connect-start` / `keys-connect-poll`; IPC `keys:connect-cancel`; API `cancelCredentialConnect`; bridge `forgetCredentialConnect`, `resolveCredentialConnectPoll`, `captureCredentialConnect`, `credentialConnects`; event `check: 'credential-connect-flow'` with `id`, `status`, `flow_token`, `expires_in_seconds`, `poll_interval_seconds`, `email_hint`; renderer `CredentialConnectFlowState`, `credentialConnects`, `credentialConnectTimers`, `startCredentialConnect`, `pollCredentialConnects`, `forgetCredentialConnect`, `cancelCredentialConnect`; ExitActions `schedule-connect-poll`, `set-key-message`, `forget-connect-flow`; ProductPage props `connectPendingKeyIDs`, `onConnectKey`, `onCancelConnectKey`; CredentialControl props `connectPending`, `onConnect`, `onCancelConnect`. Every symbol exists on `origin/main` or is introduced in an earlier task.
