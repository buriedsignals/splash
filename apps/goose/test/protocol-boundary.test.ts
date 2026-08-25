import { afterEach, describe, expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPublicStatus, CREDENTIAL_IDS, ENGINE_SPLASH_CONTRACT_MIN } from "../contract.mjs";
import { createSetupSessionManager } from "../setup-session.mjs";
import { createStoryBinding } from "../story-binding.mjs";
import { createEngineBridge } from "../../../installer/setup/engine-bridge.mjs";

const roots: string[] = [];
afterEach(async () => {
  while (roots.length) await rm(roots.pop()!, { recursive: true, force: true });
});

describe("Splash app protocol boundary", () => {
  it("normalizes broker outage separately from runtime and never relays unknown objects", () => {
    const candidate = "candidate-secret-protocol-98765";
    const status = buildPublicStatus({
      preflight: {
        ready: true,
        checks: [{ id: "dependencies", status: "pass", detail: "installed" }],
        blockers: [],
      },
      keyList: {
        ok: false,
        broker: {
          status: "unavailable",
          reasonCode: "secure-store-unavailable",
          message: "Secure storage is unavailable",
          raw: candidate,
        },
        credentialIndependentPathsAvailable: true,
        keys: [
          {
            id: "MAPTILER_KEY",
            raw: candidate,
            metadata: {
              name: "Maps",
              purpose: "Map production",
              extra: candidate,
            },
          },
        ],
      },
    });
    expect(status.runtime.status).toBe("ready");
    expect(status.broker).toEqual({
      status: "unavailable",
      reasonCode: "secure-store-unavailable",
      message: "Secure storage is unavailable",
    });
    expect(status.credentialIndependentPathsAvailable).toBe(true);
    expect(JSON.stringify(status)).not.toContain(candidate);
  });

  it("separates runtime health from the newsroom decision and carries a bounded profile", () => {
    const completeProfile = {
      name: "Heidi.news",
      url: "https://heidi.news",
      languages: ["de", "fr"],
      brandColor: "#0B7A75",
      ground: "#FFFFFF",
      accents: ["#C1440E"],
      typefaces: "Source Serif 4",
      credit: "Source: Heidi.news",
      cloudflareAccountId: "0123456789ABCDEF0123456789abcdef",
    };
    const ready = buildPublicStatus({
      preflight: {
        ready: true,
        checks: [
          { id: "dependencies", status: "pass", detail: "installed" },
          { id: "newsroom-profile", status: "pass", detail: "complete", profile: completeProfile },
        ],
        blockers: [],
      },
      keyList: { ok: true, broker: { status: "available" }, credentialIndependentPathsAvailable: true, keys: [] },
    });
    expect(ready.schemaVersion).toBe("splash-app/v2");
    expect(ready.runtime.status).toBe("ready");
    expect(ready.readiness.ready).toBe(true);
    expect(ready.newsroom).toMatchObject({
      decision: "complete",
      name: "Heidi.news",
      languages: ["de", "fr"],
      brandColor: "#0B7A75",
      accents: ["#C1440E"],
      cloudflareAccountId: "0123456789abcdef0123456789abcdef",
    });

    const missing = buildPublicStatus({
      preflight: {
        ready: false,
        checks: [
          { id: "dependencies", status: "pass", detail: "installed" },
          { id: "newsroom-profile", status: "missing", detail: "absent" },
        ],
        blockers: [{ id: "newsroom-profile", status: "missing", detail: "absent" }],
      },
      keyList: { ok: false, broker: { status: "unavailable" }, credentialIndependentPathsAvailable: true, keys: [] },
    });
    // Runnable checkout, unanswered editorial question: never a runtime repair.
    expect(missing.runtime.status).toBe("ready");
    expect(missing.readiness.ready).toBe(false);
    expect(missing.newsroom.decision).toBe("missing");
    expect(missing.newsroom.name).toBeNull();
    expect(missing.newsroom.cloudflareAccountId).toBeNull();

    const declined = buildPublicStatus({
      preflight: {
        ready: true,
        checks: [
          { id: "dependencies", status: "pass", detail: "installed" },
          { id: "newsroom-profile", status: "declined", detail: "recorded decline" },
        ],
        blockers: [],
      },
      keyList: { ok: true, broker: { status: "available" }, credentialIndependentPathsAvailable: true, keys: [] },
    });
    expect(declined.readiness.ready).toBe(true);
    expect(declined.newsroom.decision).toBe("declined");

    const brokenRuntime = buildPublicStatus({
      preflight: {
        ready: false,
        checks: [
          { id: "dependencies", status: "fail", detail: "missing" },
          { id: "newsroom-profile", status: "pass", detail: "complete", profile: completeProfile },
        ],
        blockers: [{ id: "dependencies", status: "fail", detail: "missing" }],
      },
      keyList: { ok: true, broker: { status: "available" }, credentialIndependentPathsAvailable: true, keys: [] },
    });
    expect(brokenRuntime.runtime.status).toBe("repair-required");
  });

  it("keeps a compatible real bridge list available through public MCP status", async () => {
    const policies = {
      MAPTILER_KEY: ["provider-request-required", "validate-before-atomic-replacement"],
      MAPTILER_DELIVERY_KEY: ["saved-unverified-origin-attestation", "attest-before-atomic-replacement"],
      DATAWRAPPER_TOKEN: ["authenticated-account-request", "validate-before-atomic-replacement"],
      CLOUDFLARE_API_TOKEN: ["token-and-account-verified-pages-scope-attested", "validate-before-atomic-replacement"],
    } as const;
    const bridge = createEngineBridge({
      executable: "/fixture/bsig",
      async invoke() {
        return {
          exitCode: 0,
          stderr: "",
          events: [{
            event: "result",
            data: {
              contractVersion: ENGINE_SPLASH_CONTRACT_MIN,
              broker: { status: "available" },
              credentialIndependentPathsAvailable: true,
              keys: CREDENTIAL_IDS.map((id) => ({
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
                  validatorPolicy: policies[id][0],
                  replacementBehavior: policies[id][1],
                  validatorAvailable: true,
                  candidateMaxBytes: 1_024,
                },
              })),
            },
          }],
        };
      },
    });

    const status = buildPublicStatus({
      preflight: { ready: true, checks: [], blockers: [] },
      keyList: await bridge.list(),
    });

    expect(status.broker).toEqual({ status: "available", reasonCode: null, message: null });
    expect(status.credentials).toHaveLength(CREDENTIAL_IDS.length);
    expect(status.credentials.every((credential) => credential.state !== "broker-unavailable")).toBe(true);
  });

  it("requires a per-session app challenge and revalidates the bound canonical story", async () => {
    let canonical = "/stories/one";
    const binding = createStoryBinding({
      sessionId: "fixed-app-session-123456789",
      random: () => "fixed-app-challenge-123456789",
      async inspect() {
        return {
          storyId: "one",
          canonicalPath: canonical,
          articlePath: `${canonical}/source/article.md`,
          hasStoryboard: false,
        };
      },
    });
    await binding.nominate("/stories/one");
    expect(() => binding.confirm("wrong-app-challenge-123456")).toThrow();
    expect(binding.current()).toBeNull();
    binding.confirm("fixed-app-challenge-123456789");
    const context = binding.context();
    expect((await binding.revalidate(context)).storyId).toBe("one");
    canonical = "/stories/two";
    expect(binding.revalidate(context)).rejects.toThrow("changed");
    expect(binding.current()).toBeNull();
  });

  it("keeps the controller capability in the app-only manager and uses a platform fallback without returning it", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-app-setup-manager-"));
    roots.push(root);
    const child = join(root, "controller-child.mjs");
    const engine = join(root, "bsig");
    const opener = join(root, "open");
    await writeFile(
      child,
      `
      process.stdout.write(JSON.stringify({event:"ready",url:"http://127.0.0.1:45678/#manager-capability"})+"\\n");
      for await (const chunk of Bun.stdin.stream()) {
        const value = JSON.parse(Buffer.from(chunk).toString("utf8"));
        if (value.command === "close") process.stdout.write(JSON.stringify({event:"closed",reason:"parent-close"})+"\\n");
        break;
      }
    `,
    );
    await writeFile(engine, "#!/bin/sh\nexit 0\n");
    await writeFile(opener, "#!/bin/sh\nexit 0\n");
    await chmod(engine, 0o755);
    await chmod(opener, 0o755);
    const manager = createSetupSessionManager({
      controllerPath: child,
      bsigPath: engine,
      newsroomPath: join(root, "NEWSROOM.md"),
      legacyEnvPath: join(root, ".env"),
      platform: "darwin",
      which: () => opener,
      env: { PATH: root, MAPTILER_KEY: "candidate-never-in-control-state" },
    });
    const started = await manager.start();
    expect(started).toEqual({
      status: "ready",
      setupUrl: "http://127.0.0.1:45678/#manager-capability",
    });
    expect(await manager.openLocally()).toEqual({ ok: true, status: "opened" });
    expect(JSON.stringify(manager.status())).not.toContain(
      "manager-capability",
    );
    expect(JSON.stringify(manager.status())).not.toContain(
      "candidate-never-in-control-state",
    );
    manager.close();
  });
});
