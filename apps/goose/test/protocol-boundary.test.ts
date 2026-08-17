import { afterEach, describe, expect, it } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPublicStatus } from "../contract.mjs";
import { createSetupSessionManager } from "../setup-session.mjs";
import { createStoryBinding } from "../story-binding.mjs";

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
    expect(started).toMatchObject({
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
    await expect(started.completion).resolves.toEqual({ reason: "parent-close" });
  });

  it("returns bounded setup completion outcomes from the controller close reason", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-app-setup-completion-"));
    roots.push(root);
    const engine = join(root, "bsig");
    const opener = join(root, "open");
    await writeFile(engine, "#!/bin/sh\nexit 0\n");
    await writeFile(opener, "#!/bin/sh\nexit 0\n");
    await chmod(engine, 0o755);
    await chmod(opener, 0o755);
    for (const outcome of ["done", "closed"]) {
      const child = join(root, `controller-${outcome}.mjs`);
      await writeFile(child, `process.stdout.write(JSON.stringify({event:"ready",url:"http://127.0.0.1:45678/#cap"})+"\\n");process.stdout.write(JSON.stringify({event:"closed",reason:"${outcome}"})+"\\n");`);
      const manager = createSetupSessionManager({ controllerPath: child, bsigPath: engine, newsroomPath: join(root, "NEWSROOM.md"), legacyEnvPath: join(root, ".env"), platform: "darwin", which: () => opener });
      const started = await manager.start();
      await expect(started.completion).resolves.toEqual({ reason: outcome });
    }
    const hanging = join(root, "controller-hanging.mjs");
    await writeFile(hanging, `process.stdout.write(JSON.stringify({event:"ready",url:"http://127.0.0.1:45678/#cap"})+"\\n");await new Promise(()=>{});`);
    const manager = createSetupSessionManager({ controllerPath: hanging, bsigPath: engine, newsroomPath: join(root, "NEWSROOM.md"), legacyEnvPath: join(root, ".env"), platform: "darwin", which: () => opener, completionMs: 20 });
    const started = await manager.start();
    await expect(started.completion).resolves.toEqual({ reason: "expired" });
  });

  it("reserves setup startup and opens one capability only once", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-app-setup-reservation-"));
    roots.push(root);
    const child = join(root, "controller.mjs");
    const engine = join(root, "bsig");
    const opener = join(root, "open");
    await writeFile(child, `await new Promise(resolve=>setTimeout(resolve,20));process.stdout.write(JSON.stringify({event:"ready",url:"http://127.0.0.1:45678/#cap"})+"\\n");for await(const chunk of Bun.stdin.stream()){process.stdout.write(JSON.stringify({event:"closed",reason:"parent-close"})+"\\n");break}`);
    await writeFile(engine, "#!/bin/sh\nexit 0\n");
    await writeFile(opener, "#!/bin/sh\nexit 0\n");
    await chmod(engine, 0o755);
    await chmod(opener, 0o755);
    let spawnCount = 0;
    const manager = createSetupSessionManager({
      controllerPath: child,
      bsigPath: engine,
      newsroomPath: join(root, "NEWSROOM.md"),
      legacyEnvPath: join(root, ".env"),
      platform: "darwin",
      which: () => opener,
      spawn(args: string[], options: any) { spawnCount += 1; return Bun.spawn(args, options); },
    });
    const [first, second] = await Promise.all([manager.start(), manager.start()]);
    expect(spawnCount).toBe(1);
    expect(first.status).toBe("ready");
    expect(second.status).toBe("already-open");
    expect(await manager.openLocally()).toEqual({ ok: true, status: "opened" });
    expect(await manager.openLocally()).toEqual({ ok: false, status: "already-open" });
    manager.close();
    await first.completion;
  });
});
