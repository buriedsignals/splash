import { afterEach, describe, expect, test } from "bun:test";
import { CREDENTIAL_IDS, ENGINE_SPLASH_CONTRACT_MIN } from "../../apps/goose/contract.mjs";
import { randomUUID } from "node:crypto";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { chmod, mkdir, mkdtemp, open, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { readNewsroom, updateNewsroom } from "../setup/newsroom-store.mjs";
import { acquireTargetLock } from "../setup/target-lock.mjs";
import { createEngineBridge } from "../setup/engine-bridge.mjs";
import { startSetupController } from "../setup/controller.mjs";
import { createOutboundFetchPolicy, isPublicAddress } from "../setup/outbound-fetch.mjs";

const roots: string[] = [];
const controllers: Array<Awaited<ReturnType<typeof startSetupController>>> = [];

afterEach(async () => {
  for (const controller of controllers.splice(0)) controller.close("test-cleanup");
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const DECLINED_NEWSROOM = `---
decision: declined
---

A recorded decline, not a missing default.
`;


async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "splash-setup-store-")));
  roots.push(root);
  return { root, path: join(root, "NEWSROOM.md") };
}

const PROFILE = `---
name: Existing News
url: https://example.test
languages: en
brandColor: "#112233"
ground: "#ffffff"
typefaces: "Example Serif"
unownedField: keep-me
---

Unowned explanatory prose stays byte-for-byte.
`;

describe("adjacent setup target lock", () => {
  test("refuses a live owner and permits the next writer only after release", async () => {
    const { path } = await fixture();
    const first = await acquireTargetLock(path);
    await expect(acquireTargetLock(path, { timeoutMs: 0 })).rejects.toMatchObject({ code: "LOCKED" });
    await first.release();
    const second = await acquireTargetLock(path, { timeoutMs: 0 });
    await second.release();
  });

  test("reclaims only an unchanged same-host owner whose PID is proved absent", async () => {
    const { path } = await fixture();
    const lockPath = `${path}.lock`;
    await mkdir(lockPath, { mode: 0o700 });
    await writeFile(join(lockPath, "owner.json"), `${JSON.stringify({
      schemaVersion: "splash-target-lock/v1",
      token: randomUUID(),
      host: hostname(),
      pid: 987654321,
      createdAt: Date.now(),
    })}\n`, { mode: 0o600 });
    const lock = await acquireTargetLock(path, {
      timeoutMs: 0,
      kill(pid: number) {
        expect(pid).toBe(987654321);
        const error = Object.assign(new Error("gone"), { code: "ESRCH" });
        throw error;
      },
    });
    await lock.release();
  });
});

describe("revision-checked newsroom store", () => {
  test("preloads, validates, and atomically updates owned fields without reserializing unowned content", async () => {
    const { path } = await fixture();
    await writeFile(path, PROFILE);
    const before = await readNewsroom(path);
    expect(before.profile?.name).toBe("Existing News");
    const after = await updateNewsroom(path, {
      expectedRevision: before.revision,
      changes: {
        name: "Updated News",
        cloudflareAccountId: "0123456789abcdef0123456789abcdef",
        cmsKind: "livingdocs",
        cmsEndpoint: "https://cms.example.test/api",
      },
    });
    expect(after.profile?.name).toBe("Updated News");
    expect(after.profile?.cloudflareAccountId).toBe("0123456789abcdef0123456789abcdef");
    const written = await readFile(path, "utf8");
    expect(written).toContain("unownedField: keep-me");
    expect(written).toContain("Unowned explanatory prose stays byte-for-byte.");
  });

  test("two writers from one revision yield one winner and one no-write conflict", async () => {
    const { path } = await fixture();
    await writeFile(path, PROFILE);
    const before = await readNewsroom(path);
    const results = await Promise.allSettled([
      updateNewsroom(path, { expectedRevision: before.revision, changes: { credit: "First" } }),
      updateNewsroom(path, { expectedRevision: before.revision, changes: { credit: "Second" } }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "REVISION_CONFLICT" });
    const current = await readNewsroom(path);
    expect(["First", "Second"]).toContain(current.profile?.credit);
  });

  test("barrier-driven writers in separate processes also yield one winner and one conflict", async () => {
    const { root, path } = await fixture();
    await writeFile(path, PROFILE);
    const before = await readNewsroom(path);
    const barrier = join(root, "start");
    const storeURL = new URL("../setup/newsroom-store.mjs", import.meta.url).href;
    const program = `import {existsSync} from "node:fs";import {updateNewsroom} from ${JSON.stringify(storeURL)};const [path,revision,credit,barrier]=process.argv.slice(1);while(!existsSync(barrier))await Bun.sleep(2);try{await updateNewsroom(path,{expectedRevision:revision,changes:{credit}});console.log("winner")}catch(error){if(error?.code==="REVISION_CONFLICT")console.log("conflict");else throw error}`;
    const children = ["Process One", "Process Two"].map((credit) => Bun.spawn([
      process.execPath, "--no-env-file", "-e", program, path, before.revision, credit, barrier,
    ], { stdout: "pipe", stderr: "pipe" }));
    await writeFile(barrier, "go\n");
    const outcomes = await Promise.all(children.map(async (child) => {
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      if (code !== 0) throw new Error(stderr);
      return stdout.trim();
    }));
    expect(outcomes.sort()).toEqual(["conflict", "winner"]);
    const current = await readNewsroom(path);
    expect(["Process One", "Process Two"]).toContain(current.profile?.credit);
  });

  test("a recorded decline and its replacement each require their own explicit confirmation", async () => {
    const { path } = await fixture();
    const missing = await readNewsroom(path);
    await expect(updateNewsroom(path, {
      expectedRevision: missing.revision,
      decline: true,
    })).rejects.toThrow("separate confirmation");
    const declined = await updateNewsroom(path, {
      expectedRevision: missing.revision,
      decline: true,
      confirmDecline: true,
    });
    expect(declined.declined).toBe(true);
    await expect(updateNewsroom(path, {
      expectedRevision: declined.revision,
      changes: {
        name: "New News",
        url: "https://example.test",
        languages: "en",
        brandColor: "#112233",
        ground: "#ffffff",
        typefaces: "Example Serif",
      },
    })).rejects.toThrow("replacing a recorded newsroom decline");
  });

  test("stale revisions and symlink targets never write", async () => {
    const { root, path } = await fixture();
    await writeFile(path, PROFILE);
    const before = await readNewsroom(path);
    await writeFile(path, PROFILE.replace("Existing News", "Changed Elsewhere"));
    await expect(updateNewsroom(path, {
      expectedRevision: before.revision,
      changes: { credit: "Must not land" },
    })).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(await readFile(path, "utf8")).not.toContain("Must not land");

    const real = join(root, "real.md");
    const linked = join(root, "linked", "NEWSROOM.md");
    await writeFile(real, PROFILE);
    await mkdir(join(root, "linked"));
    await symlink(real, linked);
    await expect(readNewsroom(linked)).rejects.toThrow("real file");
  });
});

describe("credential-only Engine bridge", () => {
  test("puts the candidate only in bounded stdin and returns typed public status", async () => {
    const calls: Array<{ args: string[]; input: string }> = [];
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke(_executable: string, args: string[], input: string) {
        calls.push({ args, input });
        return {
          exitCode: 0,
          stderr: "",
          events: [{
            event: "result",
            data: {
              id: "DATAWRAPPER_TOKEN",
              status: "stored",
              stored: true,
              generation: 2,
              metadata: { id: "DATAWRAPPER_TOKEN", name: "Datawrapper" },
              validation: { status: "verified", dimensions: [] },
              broker: { status: "available" },
              credentialIndependentPathsAvailable: true,
            },
          }],
        };
      },
    });
    const result = await bridge.replace("DATAWRAPPER_TOKEN", {
      candidate: "bridge-secret-canary-12345",
      expectedGeneration: 1,
      validationContext: {},
    });
    expect(result).toMatchObject({ ok: true, stored: true, generation: 2 });
    expect(calls[0].args).toEqual(["keys", "replace", "DATAWRAPPER_TOKEN"]);
    expect(calls[0].args.join(" ")).not.toContain("bridge-secret-canary");
    expect(JSON.parse(calls[0].input).candidate).toBe("bridge-secret-canary-12345");
    expect(JSON.stringify(result)).not.toContain("bridge-secret-canary");
  });

  test("maps typed rejection data without relaying the raw Engine message", async () => {
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke() {
        return {
          exitCode: 1,
          stderr: "",
          events: [{
            event: "error",
            message: "raw implementation detail must stay local",
            data: {
              id: "MAPTILER_KEY",
              status: "rejected",
              outcome: "invalid",
              reason: "provider rejected the candidate",
              expectedGeneration: 4,
              previousRecord: "unchanged",
              written: false,
            },
          }],
        };
      },
    });
    const result = await bridge.replace("MAPTILER_KEY", {
      candidate: "rejected-secret-canary-12345",
      expectedGeneration: 4,
      validationContext: {},
    });
    expect(result).toEqual({
      ok: false,
      id: "MAPTILER_KEY",
      status: "rejected",
      outcome: "invalid",
      reason: "provider rejected the candidate",
      expectedGeneration: 4,
      observedGeneration: null,
      previousRecord: "unchanged",
      written: false,
    });
    expect(JSON.stringify(result)).not.toContain("raw implementation detail");
  });

  test("fails closed if Engine ever reflects the candidate", async () => {
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke() {
        return {
          exitCode: 1,
          stderr: "reflected-secret-canary-12345",
          events: [{ event: "error", data: { status: "rejected" } }],
        };
      },
    });
    await expect(bridge.replace("MAPTILER_KEY", {
      candidate: "reflected-secret-canary-12345",
      expectedGeneration: 0,
      validationContext: {},
    })).rejects.toThrow("redaction boundary");
  });
});

function outboundResponse(status: number, contentType = "text/html", body = "ok", location = "") {
  return {
    status,
    headers: { "content-type": contentType, ...(location ? { location } : {}) },
    body: (async function* () { yield Buffer.from(body); })(),
    abort() {},
  };
}

describe("newsroom outbound fetch boundary", () => {
  test("accepts global addresses and rejects private, mapped, documentation, and local ranges", () => {
    expect(isPublicAddress("93.184.216.34")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "203.0.113.8", "::1", "::ffff:127.0.0.1", "2001:db8::1", "fc00::1", "fe80::1"]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  test("pins the checked public address into the request and enforces content and aggregate bounds", async () => {
    const observed: any[] = [];
    const policy = createOutboundFetchPolicy({
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async (url: URL, options: any) => {
        observed.push({ url: url.href, address: options.address, family: options.family });
        return outboundResponse(200, "text/html", "<html></html>");
      },
    });
    const response = await policy.fetch("https://example.com", { kind: "page" });
    expect(await response.text()).toBe("<html></html>");
    expect(observed).toEqual([{ url: "https://example.com/", address: "93.184.216.34", family: 4 }]);

    const bounded = createOutboundFetchPolicy({
      aggregateLimit: 3,
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async () => outboundResponse(200, "text/css", "four"),
    });
    await expect(bounded.fetch("https://example.com/style.css", { kind: "stylesheet" })).rejects.toThrow("bounded download limit");
  });

  test("checks every redirect resolution and never connects after a private or mixed answer", async () => {
    let lookups = 0;
    let requests = 0;
    const policy = createOutboundFetchPolicy({
      lookup: async () => {
        lookups += 1;
        return lookups === 1
          ? [{ address: "93.184.216.34", family: 4 }]
          : [{ address: "127.0.0.1", family: 4 }];
      },
      request: async () => {
        requests += 1;
        return outboundResponse(302, "text/html", "", "https://example.com/next");
      },
    });
    await expect(policy.fetch("https://example.com", { kind: "page" })).rejects.toThrow("private, local, or reserved");
    expect(lookups).toBe(2);
    expect(requests).toBe(1);

    const mixed = createOutboundFetchPolicy({
      lookup: async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.8", family: 4 }],
      request: async () => { throw new Error("must not connect"); },
    });
    await expect(mixed.fetch("https://example.com", { kind: "page" })).rejects.toThrow("private, local, or reserved");
  });

  test("rejects local names, non-default ports, and the wrong response content type", async () => {
    const policy = createOutboundFetchPolicy({
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async () => outboundResponse(200, "application/octet-stream", "binary"),
    });
    await expect(policy.fetch("http://localhost", { kind: "page" })).rejects.toThrow("manual branding");
    await expect(policy.fetch("https://example.com:8443", { kind: "page" })).rejects.toThrow("disallowed port");
    await expect(policy.fetch("https://example.com", { kind: "page" })).rejects.toThrow("unsupported content type");
  });
});

async function controllerFixture(engineBridge: any, onLifecycle = (_event: unknown) => {}) {
  const { root, path } = await fixture();
  const controller = await startSetupController({
    engineBridge,
    newsroomPath: path,
    legacyEnvPath: join(root, ".env"),
    idleMs: 10_000,
    overallMs: 20_000,
    onLifecycle,
  });
  controllers.push(controller);
  return controller;
}

async function openSession(controller: Awaited<ReturnType<typeof startSetupController>>) {
  const response = await fetch(`${controller.origin}/session`, {
    method: "POST",
    headers: { origin: controller.origin, "content-type": "application/json" },
    body: JSON.stringify({ capability: controller.capability }),
  });
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
  return { response, cookie };
}

const CREDENTIAL_POLICIES = {
  MAPTILER_KEY: ["provider-request-required", "validate-before-atomic-replacement"],
  MAPTILER_DELIVERY_KEY: ["saved-unverified-origin-attestation", "attest-before-atomic-replacement"],
  DATAWRAPPER_TOKEN: ["authenticated-account-request", "validate-before-atomic-replacement"],
  CLOUDFLARE_API_TOKEN: ["token-and-account-verified-pages-scope-attested", "validate-before-atomic-replacement"],
} as const;
type CredentialListFixture = {
  contractVersion: number;
  broker: { status: string; reasonCode?: string; message?: string };
  credentialIndependentPathsAvailable: boolean;
  keys: Array<{
    id: string;
    name: string;
    validatable: boolean;
    storageKind: string;
    stored: boolean;
    generation: number | null;
    validation: null;
    metadata: {
      contractVersion: number;
      id: string;
      name: string;
      purpose: string;
      acquisitionUrl: string;
      storageKind: string;
      validatorPolicy: string;
      replacementBehavior: string;
      validatorAvailable: boolean;
      candidateMaxBytes: number;
    };
  }>;
};


function compatibleCredentialList(): CredentialListFixture {
  return {
    contractVersion: ENGINE_SPLASH_CONTRACT_MIN,
    broker: { status: "available" },
    credentialIndependentPathsAvailable: true,
    keys: CREDENTIAL_IDS.map((id) => {
      const [validatorPolicy, replacementBehavior] = CREDENTIAL_POLICIES[id as keyof typeof CREDENTIAL_POLICIES];
      return {
        id,
        name: id,
        validatable: true,
        storageKind: "record",
        stored: false,
        generation: null,
        validation: null,
        metadata: {
          contractVersion: ENGINE_SPLASH_CONTRACT_MIN,
          id,
          name: id,
          purpose: `${id} fixture`,
          acquisitionUrl: `https://credentials.example.test/${id}`,
          storageKind: "record",
          validatorPolicy,
          replacementBehavior,
          validatorAvailable: true,
          candidateMaxBytes: 1024,
        },
      };
    }),
  };
}

function engineResult(data: unknown) {
  return { exitCode: 0, stderr: "", events: [{ event: "result", data }] };
}

function operationResult(
  listData: CredentialListFixture,
  id: string,
  {
    status,
    stored,
    generation,
    ...overrides
  }: {
    status: string;
    stored: boolean;
    generation: number;
    [key: string]: unknown;
  },
) {
  const metadata = listData.keys.find((row) => row.id === id)?.metadata;
  return {
    id,
    status,
    contractVersion: listData.contractVersion,
    stored,
    generation,
    metadata,
    validation: stored ? { status: "verified", dimensions: [] } : null,
    broker: { status: "available" },
    credentialIndependentPathsAvailable: true,
    ...overrides,
  };
}


function contractBridge(listData: CredentialListFixture, calls: Array<{ args: string[]; input: string }>) {
  return createEngineBridge({
    executable: "/fixture/bsig",
    async invoke(_executable: string, args: string[], input: string) {
      calls.push({ args, input });
      if (args[1] === "list") return engineResult(listData);
      const id = args[2];
      if (args[1] === "remove") {
        return engineResult(operationResult(listData, id, {
          status: "removed",
          stored: false,
          generation: 2,
        }));
      }
      if (args[1] === "replace") {
        return engineResult(operationResult(listData, id, {
          status: "stored",
          stored: true,
          generation: 1,
        }));
      }
      return engineResult(operationResult(listData, id, {
        status: "not-stored",
        stored: false,
        generation: 0,
      }));
    },
  });
}

function stubBridge(overrides: Record<string, unknown> = {}) {
  return {
    async list() {
      return { ok: true, ...compatibleCredentialList() };
    },
    async status(id: string) {
      const metadata = compatibleCredentialList().keys.find((row) => row.id === id)?.metadata;
      return { ok: true, id, stored: false, generation: 0, metadata };
    },
    async replace(id: string) {
      return { ok: true, id, stored: true, generation: 1, metadata: { id, name: id } };
    },
    async remove(id: string) {
      return { ok: true, id, stored: false, generation: 2, metadata: { id, name: id } };
    },
    ...overrides,
  };
}

describe("protected setup Engine credential contract", () => {
  test("opens a compatible session after one handshake and reuses its contract for mutations", async () => {
    const listData = compatibleCredentialList();
    listData.contractVersion = ENGINE_SPLASH_CONTRACT_MIN + 1;
    for (const row of listData.keys) row.metadata.contractVersion = ENGINE_SPLASH_CONTRACT_MIN + 1;
    const calls: Array<{ args: string[]; input: string }> = [];
    const controller = await controllerFixture(contractBridge(listData, calls));
    const { response, cookie } = await openSession(controller);

    expect(response.status).toBe(200);
    expect(calls.filter(({ args }) => args[1] === "list")).toHaveLength(1);

    const replaced = await fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "DATAWRAPPER_TOKEN", candidate: "compatible-candidate", expectedGeneration: 0, validationContext: {} }),
    });
    const removed = await fetch(`${controller.origin}/api/credential/remove`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "DATAWRAPPER_TOKEN", expectedGeneration: 1 }),
    });

    expect(replaced.status).toBe(410);
    expect(removed.status).toBe(410);
    expect(await replaced.json()).toMatchObject({ code: "credential-input-disabled" });
    expect(calls.filter(({ args }) => args[1] === "list")).toHaveLength(1);
    expect(calls.some(({ args }) => args[1] === "replace" || args[1] === "remove")).toBe(false);
  });

  const incompatibleContracts: Array<{
    name: string;
    change: (data: CredentialListFixture) => void;
  }> = [
    { name: "missing record", change: (data) => { data.keys.pop(); } },
    { name: "duplicate record", change: (data) => { data.keys.push(structuredClone(data.keys[0])); } },
    { name: "lower envelope version", change: (data) => { data.contractVersion = ENGINE_SPLASH_CONTRACT_MIN - 1; } },
    { name: "lower record version", change: (data) => { data.keys[3].metadata.contractVersion = ENGINE_SPLASH_CONTRACT_MIN - 1; } },
    { name: "wrong row storage", change: (data) => { data.keys[1].storageKind = "raw"; } },
    { name: "wrong metadata storage", change: (data) => { data.keys[2].metadata.storageKind = "raw"; } },
    {
      name: "missing validator",
      change: (data) => {
        data.keys[3].validatable = false;
        data.keys[3].metadata.validatorAvailable = false;
      },
    },
    { name: "wrong validator policy", change: (data) => { data.keys[0].metadata.validatorPolicy = "weaker-policy"; } },
    { name: "wrong replacement policy", change: (data) => { data.keys[3].metadata.replacementBehavior = "replace-without-validation"; } },
    { name: "mismatched metadata identity", change: (data) => { data.keys[2].metadata.id = "MAPTILER_KEY"; } },
    { name: "malformed candidate bound", change: (data) => { data.keys[1].metadata.candidateMaxBytes = 0; } },
  ];

  for (const { name, change } of incompatibleContracts) {
    test(`${name} publishes bounded repair status and disables replacement`, async () => {
      const listData = compatibleCredentialList();
      change(listData);
      const calls: Array<{ args: string[]; input: string }> = [];
      const controller = await controllerFixture(contractBridge(listData, calls));
      const { response, cookie } = await openSession(controller);
      const statusResponse = await fetch(`${controller.origin}/api/status`, {
        method: "POST",
        headers: { origin: controller.origin, cookie, "content-type": "application/json" },
        body: "{}",
      });
      const replacement = await fetch(`${controller.origin}/api/credential/replace`, {
        method: "POST",
        headers: { origin: controller.origin, cookie, "content-type": "application/json" },
        body: JSON.stringify({ id: "MAPTILER_KEY", candidate: "refused-candidate", expectedGeneration: 0, validationContext: {} }),
      });
      const status = await statusResponse.json();

      expect(response.status).toBe(200);
      expect(statusResponse.status).toBe(200);
      expect(status).toMatchObject({
        contractVersion: ENGINE_SPLASH_CONTRACT_MIN,
        broker: { status: "unavailable", reasonCode: "engine-outdated" },
        credentialIndependentPathsAvailable: true,
        newsroom: { exists: false },
      });
      expect(typeof status.broker.message).toBe("string");
      expect(status.broker.message.length).toBeLessThanOrEqual(2048);
      expect(replacement.status).toBe(410);
    });
  }

  test("broker refusal keeps newsroom work available and reaches no Engine mutation boundary", async () => {
    const candidate = "refused-secret-canary-12345";
    const listData = compatibleCredentialList();
    listData.broker = {
      status: "unavailable",
      reasonCode: "secure-store-unavailable",
      message: `raw /private/tmp/bsig diagnostic ${candidate}`,
    };
    const calls: Array<{ args: string[]; input: string }> = [];
    const controller = await controllerFixture(contractBridge(listData, calls));
    const { response, cookie } = await openSession(controller);
    const statusResponse = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    const status = await statusResponse.json();
    const newsroom = await fetch(`${controller.origin}/api/newsroom`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        expectedRevision: status.newsroom.revision,
        changes: {},
        decline: true,
        confirmDecline: true,
        confirmReplaceDecline: false,
      }),
    });
    const replacement = await fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "MAPTILER_KEY", candidate, expectedGeneration: 0, validationContext: {} }),
    });
    const removal = await fetch(`${controller.origin}/api/credential/remove`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "MAPTILER_KEY", expectedGeneration: 1 }),
    });
    const migration = await fetch(`${controller.origin}/api/legacy/migrate-credential`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        credentialId: "MAPTILER_KEY",
        expectedEnvRevision: "unused",
        assignmentId: "unused",
        expectedGeneration: 0,
        validationContext: {},
        confirmRemoval: false,
      }),
    });
    const refusal = await replacement.json();

    expect(response.status).toBe(200);
    expect(status).toMatchObject({
      contractVersion: ENGINE_SPLASH_CONTRACT_MIN,
      broker: { status: "unavailable", reasonCode: "secure-store-unavailable" },
      credentialIndependentPathsAvailable: true,
    });
    expect(newsroom.status).toBe(200);
    expect([replacement.status, removal.status, migration.status]).toEqual([410, 410, 410]);
    expect(refusal).toEqual({
      code: "credential-input-disabled",
      message: "This Splash page reports credential status only. Indicator Labs users save keys in the desktop app; open-source users use Engine's protected bsig stdin/keychain flow outside Splash.",
    });
    expect(calls.some(({ args }) => args[1] === "replace" || args[1] === "remove")).toBe(false);
    expect(calls.some(({ input }) => input.includes(candidate))).toBe(false);
    const publicOutput = JSON.stringify({ status, refusal });
    expect(publicOutput).not.toContain(candidate);
    expect(publicOutput).not.toContain("/private/tmp");
    expect(publicOutput).not.toContain("/fixture/bsig");
  });

  test("keeps status and newsroom access available when one post-handshake status read fails", async () => {
    const listData = compatibleCredentialList();
    const diagnostic = "post-handshake-secret-canary-24680 at /private/tmp/swapped-bsig";
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke(_executable: string, args: string[]) {
        if (args[1] === "list") return engineResult(listData);
        if (args[1] === "status" && args[2] === "DATAWRAPPER_TOKEN") throw new Error(diagnostic);
        return engineResult(operationResult(listData, args[2], {
          status: "not-stored",
          stored: false,
          generation: 0,
        }));
      },
    });
    const controller = await controllerFixture(bridge);
    const { cookie } = await openSession(controller);
    const statusResponse = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    const status = await statusResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(status.credentials).toHaveLength(CREDENTIAL_IDS.length);
    expect(status.credentials.find(({ id }: { id: string }) => id === "DATAWRAPPER_TOKEN")?.ok).toBe(false);
    expect(status.newsroom).toMatchObject({ exists: false });
    const publicOutput = JSON.stringify(status);
    expect(publicOutput.length).toBeLessThanOrEqual(16_384);
    expect(publicOutput).not.toContain("post-handshake-secret-canary");
    expect(publicOutput).not.toContain("/private/tmp");

    const newsroom = await fetch(`${controller.origin}/api/newsroom`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        expectedRevision: status.newsroom.revision,
        changes: {},
        decline: true,
        confirmDecline: true,
        confirmReplaceDecline: false,
      }),
    });
    expect(newsroom.status).toBe(200);
  });

  test("closes and bounds list, status, replacement, and removal diagnostics", async () => {
    const listData = compatibleCredentialList();
    const diagnostic = "untrusted-engine-secret-canary-13579";
    const executablePath = "/private/tmp/untrusted-bsig";
    const longDiagnostic = `${diagnostic} ${executablePath} ${"x".repeat(5_000)}`;
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke(_executable: string, args: string[]) {
        if (args[1] === "list") return engineResult(listData);
        if (args[1] === "status") {
          return engineResult(operationResult(listData, args[2], {
            status: "stored",
            stored: true,
            generation: 1,
            validation: {
              status: "verified",
              dimensions: [{ id: "provider", status: "verified", reason: longDiagnostic }],
              raw: longDiagnostic,
            },
          }));
        }
        return {
          exitCode: 1,
          stderr: "",
          events: [{
            event: "error",
            data: {
              id: args[2],
              status: "rejected",
              outcome: longDiagnostic,
              reason: longDiagnostic,
              expectedGeneration: 1,
              previousRecord: "unchanged",
              written: false,
            },
          }],
        };
      },
    });
    await bridge.list();
    const status = await bridge.status("MAPTILER_KEY");
    const replacement = await bridge.replace("MAPTILER_KEY", {
      candidate: "safe-replacement-candidate",
      expectedGeneration: 0,
      validationContext: {},
    });
    const removal = await bridge.remove("MAPTILER_KEY", { expectedGeneration: 1 });

    const unavailableList = compatibleCredentialList();
    unavailableList.broker = {
      status: "unavailable",
      reasonCode: "secure-store-unavailable",
      message: longDiagnostic,
    };
    const listFailure = await createEngineBridge({
      executable: "/fixture/bsig",
      async invoke() {
        return engineResult(unavailableList);
      },
    }).list();

    for (const output of [listFailure, status, replacement, removal]) {
      const serialized = JSON.stringify(output);
      expect(serialized.length).toBeLessThanOrEqual(4_096);
      expect(serialized).not.toContain(diagnostic);
      expect(serialized).not.toContain(executablePath);
    }
  });

  const invalidOperationSuccesses: Array<{
    name: string;
    operation: "status" | "replace" | "remove";
    expectedGeneration: number;
    response: {
      status: string;
      stored: boolean;
      generation: number;
      [key: string]: unknown;
    };
  }> = [
    {
      name: "status reports a removal",
      operation: "status",
      expectedGeneration: 0,
      response: { status: "removed", stored: false, generation: 1 },
    },
    {
      name: "replacement reports not stored",
      operation: "replace",
      expectedGeneration: 0,
      response: { status: "not-stored", stored: false, generation: 1 },
    },
    {
      name: "replacement does not advance generation",
      operation: "replace",
      expectedGeneration: 0,
      response: { status: "stored", stored: true, generation: 0 },
    },
    {
      name: "replacement reports a lower contract",
      operation: "replace",
      expectedGeneration: 0,
      response: {
        status: "stored",
        stored: true,
        generation: 1,
        contractVersion: ENGINE_SPLASH_CONTRACT_MIN - 1,
      },
    },
    {
      name: "replacement omits the operation contract version",
      operation: "replace",
      expectedGeneration: 0,
      response: {
        status: "stored",
        stored: true,
        generation: 1,
        contractVersion: undefined,
      },
    },
    {
      name: "replacement reports a non-numeric operation contract version",
      operation: "replace",
      expectedGeneration: 0,
      response: {
        status: "stored",
        stored: true,
        generation: 1,
        contractVersion: "2",
      },
    },
    {
      name: "replacement reports an unavailable broker",
      operation: "replace",
      expectedGeneration: 0,
      response: {
        status: "stored",
        stored: true,
        generation: 1,
        broker: { status: "unavailable", reasonCode: "secure-store-unavailable" },
      },
    },
    {
      name: "removal reports the credential still stored",
      operation: "remove",
      expectedGeneration: 1,
      response: { status: "stored", stored: true, generation: 2 },
    },
    {
      name: "removal does not advance generation",
      operation: "remove",
      expectedGeneration: 1,
      response: { status: "removed", stored: false, generation: 1 },
    },
  ];

  for (const { name, operation, expectedGeneration, response } of invalidOperationSuccesses) {
    test(`${name} cannot become a public success`, async () => {
      const listData = compatibleCredentialList();
      const bridge = createEngineBridge({
        executable: "/fixture/bsig",
        async invoke(_executable: string, args: string[]) {
          if (args[1] === "list") return engineResult(listData);
          return engineResult(operationResult(listData, "MAPTILER_KEY", response));
        },
      });
      await bridge.list();
      let result: { ok?: unknown } | null = null;
      try {
        result = operation === "status"
          ? await bridge.status("MAPTILER_KEY")
          : operation === "replace"
            ? await bridge.replace("MAPTILER_KEY", {
                candidate: "operation-invariant-candidate",
                expectedGeneration,
                validationContext: {},
              })
            : await bridge.remove("MAPTILER_KEY", { expectedGeneration });
      } catch {
        // A closed rejection and a normalized failure both satisfy the no-success contract.
      }
      expect(result?.ok).not.toBe(true);
    });
  }

  test("keeps legacy plaintext when Engine does not prove the replacement was stored", async () => {
    const { root, path } = await fixture();
    const envPath = join(root, ".env");
    const candidate = "legacy-preservation-canary-86420";
    await writeFile(path, PROFILE);
    await writeFile(envPath, `MAPTILER_API_KEY=${candidate}\nUNRELATED=keep\n`, { mode: 0o600 });
    const listData = compatibleCredentialList();
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke(_executable: string, args: string[]) {
        if (args[1] === "list") return engineResult(listData);
        if (args[1] === "status") {
          return engineResult(operationResult(listData, args[2], {
            status: "not-stored",
            stored: false,
            generation: 0,
          }));
        }
        return engineResult(operationResult(listData, args[2], {
          status: "not-stored",
          stored: false,
          generation: 1,
        }));
      },
    });
    const controller = await startSetupController({
      engineBridge: bridge,
      newsroomPath: path,
      legacyEnvPath: envPath,
      idleMs: 10_000,
      overallMs: 20_000,
    });
    controllers.push(controller);
    const { cookie } = await openSession(controller);
    const statusResponse = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    const status = await statusResponse.json();
    const legacy = status.legacy.credentials[0];
    const migration = await fetch(`${controller.origin}/api/legacy/migrate-credential`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        credentialId: legacy.id,
        expectedEnvRevision: status.legacy.revision,
        assignmentId: legacy.assignmentId,
        expectedGeneration: 0,
        validationContext: {},
        confirmRemoval: true,
      }),
    });

    expect(migration.status).toBe(410);
    expect(await readFile(envPath, "utf8")).toBe(`MAPTILER_API_KEY=${candidate}\nUNRELATED=keep\n`);
    expect(JSON.stringify(await migration.json())).not.toContain(candidate);
  });

  test("sends zero candidate bytes when the executable target changes after the handshake", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "splash-engine-identity-")));
    roots.push(root);
    const compatibleTarget = join(root, "bsig-compatible");
    const swappedTarget = join(root, "bsig-swapped");
    const executable = join(root, "bsig");
    const capturedInput = join(root, "captured-input");
    const listData = compatibleCredentialList();
    const compatibleEvent = JSON.stringify({ event: "result", data: listData });
    const swappedEvent = JSON.stringify({
      event: "result",
      data: operationResult(listData, "MAPTILER_KEY", {
        status: "stored",
        stored: true,
        generation: 1,
      }),
    });
    await writeFile(
      compatibleTarget,
      `#!/usr/bin/env bun\nconsole.log(${JSON.stringify(compatibleEvent)});\n`,
      { mode: 0o700 },
    );
    await writeFile(
      swappedTarget,
      `#!/usr/bin/env bun\nconst input = await new Response(Bun.stdin.stream()).text();\nawait Bun.write(${JSON.stringify(capturedInput)}, input);\nconsole.log(${JSON.stringify(swappedEvent)});\n`,
      { mode: 0o700 },
    );
    await chmod(compatibleTarget, 0o700);
    await chmod(swappedTarget, 0o700);
    await symlink(compatibleTarget, executable);
    const bridge = createEngineBridge({ executable });
    await bridge.list();
    await rm(executable);
    await symlink(swappedTarget, executable);
    let result: { ok?: unknown } | null = null;
    try {
      result = await bridge.replace("MAPTILER_KEY", {
        candidate: "identity-swap-candidate-canary",
        expectedGeneration: 0,
        validationContext: {},
      });
    } catch {
      // Refusal before transmission is the required outcome.
    }

    let transmitted = "";
    try {
      transmitted = await readFile(capturedInput, "utf8");
    } catch {
      // A target rejected before spawn leaves no capture file.
    }
    expect(transmitted).toBe("");
    expect(result?.ok).not.toBe(true);
  });


  test("sends zero candidate bytes when the executable is rewritten in place after the handshake", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "splash-engine-content-")));
    roots.push(root);
    const executable = join(root, "bsig");
    const capturedInput = join(root, "captured-input");
    const listData = compatibleCredentialList();
    const listEvent = JSON.stringify({ event: "result", data: listData });
    const storedEvent = JSON.stringify({
      event: "result",
      data: operationResult(listData, "MAPTILER_KEY", {
        status: "stored",
        stored: true,
        generation: 1,
      }),
    });
    const captureAndStore = `cat > ${JSON.stringify(capturedInput)}\nprintf '%s\\n' '${storedEvent}'\n`;
    await writeFile(
      executable,
      `#!/bin/sh\nif [ "$2" = "keys" ] && [ "$3" = "list" ]; then\n  printf '%s\\n' '${listEvent}'\nelif [ "$2" = "keys" ] && [ "$3" = "replace" ]; then\n  ${captureAndStore}else\n  printf '%s\\n' '{"event":"error","data":{"status":"unsupported"}}'\n  exit 1\nfi\n`,
      { mode: 0o700 },
    );
    const bridge = createEngineBridge({ executable });
    expect((await bridge.list()).ok).toBe(true);

    // Rewrite the SAME inode in place with hostile bytes that capture stdin. A path/device/inode
    // comparison alone would pass here; the content digest must refuse before any spawn.
    const handle = await open(executable, "r+");
    try {
      await handle.truncate(0);
      await handle.write(Buffer.from(`#!/bin/sh\n${captureAndStore}`), 0);
    } finally {
      await handle.close();
    }

    let result: { ok?: unknown } | null = null;
    try {
      result = await bridge.replace("MAPTILER_KEY", {
        candidate: "content-swap-candidate-canary",
        expectedGeneration: 0,
        validationContext: {},
      });
    } catch {
      // Refusal before transmission is the required outcome.
    }
    let transmitted = "";
    try {
      transmitted = await readFile(capturedInput, "utf8");
    } catch {
      // Refusal before spawn leaves no capture file.
    }
    expect(transmitted).toBe("");
    expect(result?.ok).not.toBe(true);
  });

  test("a compatible session accepts the declared candidate byte boundary and refuses one byte over it", async () => {
    const listData = compatibleCredentialList();
    const candidateMaxBytes = listData.keys[2].metadata.candidateMaxBytes;
    const calls: Array<{ args: string[]; input: string }> = [];
    const controller = await controllerFixture(contractBridge(listData, calls));
    const { cookie } = await openSession(controller);
    const accepted = await fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        id: "DATAWRAPPER_TOKEN",
        candidate: "x".repeat(candidateMaxBytes),
        expectedGeneration: 0,
        validationContext: {},
      }),
    });
    const oversized = await fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        id: "DATAWRAPPER_TOKEN",
        candidate: `oversized-canary-${"x".repeat(candidateMaxBytes)}`,
        expectedGeneration: 1,
        validationContext: {},
      }),
    });

    expect(accepted.status).toBe(410);
    expect(oversized.status).toBe(410);
    expect(await oversized.json()).toEqual({
      code: "credential-input-disabled",
      message: "This Splash page reports credential status only. Indicator Labs users save keys in the desktop app; open-source users use Engine's protected bsig stdin/keychain flow outside Splash.",
    });
    expect(calls.some(({ input }) => input.includes("oversized-canary"))).toBe(false);
  });
});

describe("token-bound loopback setup controller", () => {
  test("serves no-store CSP HTML and rejects wrong origin, cookie, and capability", async () => {
    const controller = await controllerFixture(stubBridge());
    const page = await fetch(controller.origin);
    expect(page.headers.get("cache-control")).toContain("no-store");
    expect(page.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    const html = await page.text();
    expect(html).not.toContain(controller.capability);
    expect(html).toContain("Indicator Labs");
    expect(html).toContain("Open-source users");
    expect(html).toContain("Credential ID:");
    expect(html).toContain("bsig stdin/keychain flow");
    expect(html).not.toContain("Paste a new value");
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("type='password'");

    const wrongOrigin = await fetch(`${controller.origin}/session`, {
      method: "POST",
      headers: { origin: "http://attacker.invalid", "content-type": "application/json" },
      body: JSON.stringify({ capability: controller.capability }),
    });
    expect(wrongOrigin.status).toBe(403);

    const { response, cookie } = await openSession(controller);
    expect(response.status).toBe(200);
    expect(cookie).toStartWith("splash_setup=");
    const reused = await fetch(`${controller.origin}/session`, {
      method: "POST",
      headers: { origin: controller.origin, "content-type": "application/json" },
      body: JSON.stringify({ capability: controller.capability }),
    });
    expect(reused.status).toBe(403);
    const noCookie = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, "content-type": "application/json" },
      body: "{}",
    });
    expect(noCookie.status).toBe(403);
    const wrongType = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "text/plain" },
      body: "{}",
    });
    expect(wrongType.status).toBe(415);
    const oversized = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(40_000) }),
    });
    expect(oversized.status).toBe(413);
  });

  test("keeps candidate bodies out of lifecycle control events and invalidates on Done", async () => {
    const lifecycle: unknown[] = [];
    let observed = "";
    const { root, path } = await fixture();
    // Done requires an answered newsroom identity; a decline is an answer.
    await writeFile(path, DECLINED_NEWSROOM);
    const controller = await startSetupController({
      engineBridge: stubBridge({
        async replace(_id: string, request: unknown) {
          let candidate: unknown;
          if (typeof request === "object" && request !== null && "candidate" in request) {
            candidate = request.candidate; // `in` narrows to unknown; validated below
          }
          observed = typeof candidate === "string" ? candidate : "";
          return { ok: true, id: "MAPTILER_KEY", stored: true, generation: 1, metadata: { id: "MAPTILER_KEY" } };
        },
      }),
      newsroomPath: path,
      legacyEnvPath: join(root, ".env"),
      idleMs: 10_000,
      overallMs: 20_000,
    });
    controllers.push(controller);
    const { cookie } = await openSession(controller);
    const saved = await fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "MAPTILER_KEY", candidate: "controller-secret-canary-12345", expectedGeneration: 0, validationContext: {} }),
    });
    expect(saved.status).toBe(410);
    expect(observed).toBe("");
    expect(JSON.stringify(lifecycle)).not.toContain("controller-secret-canary");

    const done = await fetch(`${controller.origin}/api/done`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(done.status).toBe(200);
    expect(await controller.closed).toEqual({ reason: "done" });
  });

  test("refuses Close setup while a newsroom mutation is in flight", async () => {
    let begin!: () => void;
    let finish!: () => void;
    const began = new Promise<void>((settle) => { begin = settle; });
    const finished = new Promise<void>((settle) => { finish = settle; });
    const { root, path } = await fixture();
    const controller = await startSetupController({
      engineBridge: stubBridge(),
      newsroomPath: path,
      legacyEnvPath: join(root, ".env"),
      idleMs: 10_000,
      overallMs: 20_000,
      deriveProposal: async () => {
        begin();
        await finished;
        return { ok: true, fields: {} };
      },
    });
    controllers.push(controller);
    const { cookie } = await openSession(controller);
    const deriving = fetch(`${controller.origin}/api/derive`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.test/" }),
    });
    await began;
    const earlyClose = await fetch(`${controller.origin}/api/close`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(earlyClose.status).toBe(409);
    finish();
    expect((await deriving).status).toBe(200);
    const closed = await fetch(`${controller.origin}/api/close`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(closed.status).toBe(200);
    expect(await controller.closed).toEqual({ reason: "closed" });
  });

  test("Done refuses an unanswered newsroom and Close stays honestly incomplete", async () => {
    const lifecycle: unknown[] = [];
    const controller = await controllerFixture(stubBridge(), (event) => lifecycle.push(event));
    const { cookie } = await openSession(controller);

    const refused = await fetch(`${controller.origin}/api/done`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ code: "newsroom-required" });

    // Close remains available: installation succeeds with onboarding incomplete.
    const closed = await fetch(`${controller.origin}/api/close`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(closed.status).toBe(200);
    expect((await closed.json()).state).toBe("closed");
    expect(await controller.closed).toEqual({ reason: "closed" });
  });

  test("Done accepts a complete profile or a recorded decline as the answered identity", async () => {
    for (const answer of [PROFILE, DECLINED_NEWSROOM]) {
      const { root, path } = await fixture();
      await writeFile(path, answer);
      const controller = await startSetupController({
        engineBridge: stubBridge(),
        newsroomPath: path,
        legacyEnvPath: join(root, ".env"),
        idleMs: 10_000,
        overallMs: 20_000,
      });
      controllers.push(controller);
      const { cookie } = await openSession(controller);
      const done = await fetch(`${controller.origin}/api/done`, {
        method: "POST",
        headers: { origin: controller.origin, cookie, "content-type": "application/json" },
        body: "{}",
      });
      expect(done.status).toBe(200);
      expect(await controller.closed).toEqual({ reason: "done" });
    }
  });

  test("refuses to move an inspected legacy credential from setup", async () => {
    const { root, path } = await fixture();
    const envPath = join(root, ".env");
    await writeFile(path, PROFILE);
    await writeFile(envPath, "MAPTILER_API_KEY=legacy-controller-secret-12345\nUNRELATED=keep\n", { mode: 0o600 });
    await chmod(envPath, 0o600);
    let candidate = "";
    const lifecycle: unknown[] = [];
    const controller = await startSetupController({
      engineBridge: stubBridge({
        async replace(id: string, request: any) {
          candidate = request.candidate;
          return { ok: true, id, stored: true, generation: 1, metadata: { id } };
        },
      }),
      newsroomPath: path,
      legacyEnvPath: envPath,
      idleMs: 10_000,
      overallMs: 20_000,
      onLifecycle: (event) => lifecycle.push(event),
    });
    controllers.push(controller);
    const { cookie } = await openSession(controller);
    const statusResponse = await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    const status = await statusResponse.json();
    const legacy = status.legacy.credentials[0];
    const movedResponse = await fetch(`${controller.origin}/api/legacy/migrate-credential`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        credentialId: legacy.id,
        expectedEnvRevision: status.legacy.revision,
        assignmentId: legacy.assignmentId,
        expectedGeneration: 0,
        validationContext: {},
        confirmRemoval: true,
      }),
    });
    expect(movedResponse.status).toBe(410);
    expect(await movedResponse.json()).toMatchObject({ code: "credential-input-disabled" });
    expect(candidate).toBe("");
    expect(JSON.stringify(lifecycle)).not.toContain("legacy-controller-secret");
    const remaining = await readFile(envPath, "utf8");
    expect(remaining).toBe("MAPTILER_API_KEY=legacy-controller-secret-12345\nUNRELATED=keep\n");
  });

  test("a stale newsroom blocks non-secret legacy import before either authority changes", async () => {
    const { root, path } = await fixture();
    const envPath = join(root, ".env");
    await writeFile(path, PROFILE);
    await writeFile(envPath, "CLOUDFLARE_ACCOUNT_ID=0123456789abcdef0123456789abcdef\n", { mode: 0o600 });
    await chmod(envPath, 0o600);
    const controller = await startSetupController({
      engineBridge: stubBridge(), newsroomPath: path, legacyEnvPath: envPath,
      idleMs: 10_000, overallMs: 20_000,
    });
    controllers.push(controller);
    const { cookie } = await openSession(controller);
    const status = await (await fetch(`${controller.origin}/api/status`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    })).json();
    const external = PROFILE.replace("Existing News", "Changed Elsewhere");
    await writeFile(path, external);
    const imported = await fetch(`${controller.origin}/api/legacy/import-integrations`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({
        expectedEnvRevision: status.legacy.revision,
        assignments: status.legacy.integrations.map(({ field, assignmentId }: any) => ({ field, assignmentId })),
        expectedNewsroomRevision: status.newsroom.revision,
        confirmImport: true,
        confirmReplaceDecline: false,
        confirmRemoval: true,
      }),
    });
    expect(imported.status).toBe(409);
    expect(await readFile(path, "utf8")).toBe(external);
    expect(await readFile(envPath, "utf8")).toContain("CLOUDFLARE_ACCOUNT_ID=");
  });

  test("derivation returns a proposal without creating or changing NEWSROOM.md", async () => {
    const { root, path } = await fixture();
    const controller = await startSetupController({
      engineBridge: stubBridge(),
      newsroomPath: path,
      legacyEnvPath: join(root, ".env"),
      idleMs: 10_000,
      overallMs: 20_000,
      async deriveProposal(url: string) {
        return {
          ok: true,
          url,
          fields: { name: { value: "Measured News", source: "title", evidence: "<title>Measured News</title>" } },
          unresolved: ["brandColor"],
          nothingFurther: [],
          stylesheetsRead: [],
          bytesRead: 100,
        };
      },
    });
    controllers.push(controller);
    const { cookie } = await openSession(controller);
    const response = await fetch(`${controller.origin}/api/derive`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ url: "https://news.example.test" }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).fields.name.value).toBe("Measured News");
    await expect(readFile(path, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("configure.mjs Engine-default entrypoint", () => {
  test("starts the broker-backed controller by default and never creates a plaintext .env", async () => {
    const { root } = await fixture();
    const home = join(root, "home");
    const installRoot = join(root, "install");
    const newsroomRoot = join(home, ".config", "splash");
    await mkdir(installRoot, { recursive: true });
    await mkdir(newsroomRoot, { recursive: true });
    // Done requires an answered identity; the decline stub is the smallest answer here.
    await writeFile(join(newsroomRoot, "NEWSROOM.md"), DECLINED_NEWSROOM);
    const bsig = join(root, "bsig-fixture");
    await writeFile(bsig, `#!/bin/sh
if [ "$2" = "keys" ] && [ "$3" = "list" ]; then
  printf '%s\\n' '{"event":"result","data":{"broker":{"status":"available"},"credentialIndependentPathsAvailable":true,"keys":[]}}'
  exit 0
fi
printf '%s\\n' '{"event":"error","data":{"status":"unsupported"}}'
exit 1
`, { mode: 0o755 });
    await chmod(bsig, 0o755);
    const child = Bun.spawn([
      process.execPath,
      join(import.meta.dirname, "..", "configure.mjs"),
      "--root", installRoot,
      "--home", home,
      "--newsroom-path", join(newsroomRoot, "NEWSROOM.md"),
      "--bsig", bsig,
      "--headless",
      "--idle-ms", "10000",
    ], { stdout: "pipe", stderr: "pipe" });
    const reader = child.stdout.getReader();
    let output = "";
    let setupURL = "";
    while (!setupURL) {
      const next = await reader.read();
      if (next.done) break;
      output += new TextDecoder().decode(next.value);
      setupURL = /SPLASH_CONFIGURE_URL=(\S+)/.exec(output)?.[1] ?? "";
    }
    reader.releaseLock();
    expect(setupURL).not.toBe("");
    const parsed = new URL(setupURL);
    const capability = parsed.hash.slice(1);
    const origin = parsed.origin;
    const opened = await fetch(`${origin}/session`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ capability }),
    });
    const cookie = opened.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    expect(opened.status).toBe(200);
    const status = await fetch(`${origin}/api/status`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(status.status).toBe(200);
    const done = await fetch(`${origin}/api/done`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(done.status).toBe(200);
    expect(await child.exited).toBe(0);
    await expect(readFile(join(installRoot, ".env"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("controller child stdout carries lifecycle only, never credential HTTP bodies", async () => {
    const { root } = await fixture();
    const newsroomRoot = join(root, "newsroom");
    await mkdir(newsroomRoot);
    // Done requires an answered identity; the decline stub is the smallest answer here.
    await writeFile(join(newsroomRoot, "NEWSROOM.md"), DECLINED_NEWSROOM);
    const bsig = join(root, "bsig-child-fixture");
    const listEvent = JSON.stringify({ event: "result", data: compatibleCredentialList() });
    await writeFile(bsig, `#!/bin/sh
if [ "$2" = "keys" ] && [ "$3" = "list" ]; then
  printf '%s\\n' '${listEvent}'
elif [ "$2" = "keys" ] && [ "$3" = "status" ]; then
  printf '%s\\n' '{"event":"result","data":{"id":"MAPTILER_KEY","status":"not-stored","stored":false,"generation":0,"contractVersion":${ENGINE_SPLASH_CONTRACT_MIN},"metadata":{"id":"MAPTILER_KEY","name":"MapTiler"},"broker":{"status":"available"},"credentialIndependentPathsAvailable":true}}'
elif [ "$2" = "keys" ] && [ "$3" = "replace" ]; then
  IFS= read -r request_body
  printf '%s\\n' '{"event":"result","data":{"id":"MAPTILER_KEY","status":"stored","stored":true,"generation":1,"contractVersion":${ENGINE_SPLASH_CONTRACT_MIN},"metadata":{"id":"MAPTILER_KEY","name":"MapTiler"},"validation":{"status":"verified","dimensions":[]},"broker":{"status":"available"},"credentialIndependentPathsAvailable":true}}'
else
  printf '%s\\n' '{"event":"error","data":{"status":"unsupported"}}'
  exit 1
fi
`, { mode: 0o755 });
    await chmod(bsig, 0o755);
    const child = Bun.spawn([
      process.execPath,
      join(import.meta.dirname, "..", "setup", "controller-child.mjs"),
      "--bsig", bsig,
      "--newsroom-path", join(newsroomRoot, "NEWSROOM.md"),
      "--legacy-env-path", join(root, ".env"),
      "--idle-ms", "10000",
      "--overall-ms", "20000",
    ], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    const reader = child.stdout.getReader();
    let captured = "";
    let ready: any = null;
    while (!ready) {
      const next = await reader.read();
      if (next.done) break;
      captured += new TextDecoder().decode(next.value);
      const line = captured.split("\n")[0];
      if (line) ready = JSON.parse(line);
    }
    expect(ready?.event).toBe("ready");
    const parsed = new URL(ready.url);
    const origin = parsed.origin;
    const session = await fetch(`${origin}/session`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ capability: parsed.hash.slice(1) }),
    });
    const cookie = session.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    await fetch(`${origin}/api/status`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    const candidate = "child-control-secret-canary-12345";
    expect((await fetch(`${origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "MAPTILER_KEY", candidate, expectedGeneration: 0, validationContext: {} }),
    })).status).toBe(410);
    child.stdin.write(`${JSON.stringify({ command: "close" })}\n`);
    child.stdin.end();
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      captured += new TextDecoder().decode(next.value);
    }
    reader.releaseLock();
    expect(await child.exited).toBe(0);
    expect(captured).not.toContain(candidate);
    for (const line of captured.trim().split("\n")) expect(() => JSON.parse(line)).not.toThrow();
  });
});
