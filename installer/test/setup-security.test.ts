import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
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

function stubBridge(overrides: Record<string, unknown> = {}) {
  return {
    async list() {
      return {
        ok: true,
        broker: { status: "available" },
        keys: [{ id: "MAPTILER_KEY", stored: false, metadata: { id: "MAPTILER_KEY", name: "MapTiler", acquisitionUrl: "https://cloud.maptiler.com/account/keys/" } }],
      };
    },
    async status(id: string) {
      return { ok: true, id, stored: false, generation: 0, metadata: { id, name: "MapTiler", acquisitionUrl: "https://cloud.maptiler.com/account/keys/" } };
    },
    async replace(id: string) {
      return { ok: true, id, stored: true, generation: 1, metadata: { id, name: "MapTiler" } };
    },
    async remove(id: string) {
      return { ok: true, id, stored: false, generation: 2, metadata: { id, name: "MapTiler" } };
    },
    ...overrides,
  };
}

describe("token-bound loopback setup controller", () => {
  test("serves no-store CSP HTML and rejects wrong origin, cookie, and capability", async () => {
    const controller = await controllerFixture(stubBridge());
    const page = await fetch(controller.origin);
    expect(page.headers.get("cache-control")).toContain("no-store");
    expect(page.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await page.text()).not.toContain(controller.capability);

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
    const controller = await controllerFixture(stubBridge({
      async replace(_id: string, request: any) {
        observed = request.candidate;
        return { ok: true, id: "MAPTILER_KEY", stored: true, generation: 1, metadata: { id: "MAPTILER_KEY" } };
      },
    }), (event) => lifecycle.push(event));
    const { cookie } = await openSession(controller);
    const saved = await fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "MAPTILER_KEY", candidate: "controller-secret-canary-12345", expectedGeneration: 0, validationContext: {} }),
    });
    expect(saved.status).toBe(200);
    expect(observed).toBe("controller-secret-canary-12345");
    expect(JSON.stringify(lifecycle)).not.toContain("controller-secret-canary");

    const done = await fetch(`${controller.origin}/api/done`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(done.status).toBe(200);
    expect(await controller.closed).toEqual({ reason: "done" });
  });

  test("refuses Close setup while a credential mutation is in flight", async () => {
    let begin!: () => void;
    let finish!: () => void;
    const began = new Promise<void>((settle) => { begin = settle; });
    const finished = new Promise<void>((settle) => { finish = settle; });
    const controller = await controllerFixture(stubBridge({
      async replace(id: string) {
        begin();
        await finished;
        return { ok: true, id, stored: true, generation: 1, metadata: { id } };
      },
    }));
    const { cookie } = await openSession(controller);
    const saving = fetch(`${controller.origin}/api/credential/replace`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ id: "MAPTILER_KEY", candidate: "in-flight-secret-canary", expectedGeneration: 0, validationContext: {} }),
    });
    await began;
    const earlyClose = await fetch(`${controller.origin}/api/close`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(earlyClose.status).toBe(409);
    finish();
    expect((await saving).status).toBe(200);
    const closed = await fetch(`${controller.origin}/api/close`, {
      method: "POST",
      headers: { origin: controller.origin, cookie, "content-type": "application/json" },
      body: "{}",
    });
    expect(closed.status).toBe(200);
    expect(await controller.closed).toEqual({ reason: "closed" });
  });

  test("moves an inspected legacy credential through Engine before exact confirmed removal", async () => {
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
    expect(movedResponse.status).toBe(200);
    const moved = await movedResponse.json();
    expect(moved.legacyRemoval.status).toBe("removed");
    expect(candidate).toBe("legacy-controller-secret-12345");
    expect(JSON.stringify(moved)).not.toContain("legacy-controller-secret");
    expect(JSON.stringify(lifecycle)).not.toContain("legacy-controller-secret");
    const remaining = await readFile(envPath, "utf8");
    expect(remaining).toBe("UNRELATED=keep\n");
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
    const bsig = join(root, "bsig-child-fixture");
    await writeFile(bsig, `#!/bin/sh
if [ "$2" = "keys" ] && [ "$3" = "list" ]; then
  printf '%s\\n' '{"event":"result","data":{"broker":{"status":"available"},"credentialIndependentPathsAvailable":true,"keys":[{"id":"MAPTILER_KEY","stored":false,"generation":null,"metadata":{"id":"MAPTILER_KEY","name":"MapTiler"}}]}}'
elif [ "$2" = "keys" ] && [ "$3" = "status" ]; then
  printf '%s\\n' '{"event":"result","data":{"id":"MAPTILER_KEY","status":"not-stored","stored":false,"generation":0,"metadata":{"id":"MAPTILER_KEY","name":"MapTiler"},"broker":{"status":"available"},"credentialIndependentPathsAvailable":true}}'
elif [ "$2" = "keys" ] && [ "$3" = "replace" ]; then
  IFS= read -r request_body
  printf '%s\\n' '{"event":"result","data":{"id":"MAPTILER_KEY","status":"stored","stored":true,"generation":1,"metadata":{"id":"MAPTILER_KEY","name":"MapTiler"},"validation":{"status":"verified","dimensions":[]},"broker":{"status":"available"},"credentialIndependentPathsAvailable":true}}'
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
    })).status).toBe(200);
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
