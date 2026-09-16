import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, symlink, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEnvironmentStatusProvider, inspectLocalStory, selfManagedDependencies } from "../self-managed.mjs";
import { productionDependencies } from "../server.mjs";

const roots: string[] = [];
const sessions: any[] = [];
afterEach(async () => {
  for (const session of sessions.splice(0)) { const closed = session.wait(); session.close(); await closed; }
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "splash-self-test-")));
  roots.push(root);
  const newsroomPath = join(root, "NEWSROOM.md");
  await writeFile(newsroomPath, "---\ndecision: declined\n---\n");
  return { root, newsroomPath, checkoutRoot: join(import.meta.dirname, "..", "..", "..") };
}
async function authenticate(url: string) {
  const target = new URL(url);
  const response = await fetch(`${target.origin}/session`, { method: "POST", headers: { origin: target.origin, "content-type": "application/json" }, body: JSON.stringify({ capability: target.hash.slice(1) }) });
  expect(response.status).toBe(200);
  return { origin: target.origin, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
async function post(session: { origin: string; cookie: string }, route: string, body = {}) {
  return fetch(`${session.origin}${route}`, { method: "POST", headers: { origin: session.origin, cookie: session.cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("self-install reads injected values, probes providers, and never returns secrets", async () => {
  const options = await fixture();
  const env = { MAPTILER_KEY: "fake-map-secret", DATAWRAPPER_TOKEN: "fake-data-secret", CLOUDFLARE_API_TOKEN: "fake-cloud-secret", CLOUDFLARE_ACCOUNT_ID: "a".repeat(32) };
  const requests: string[] = [];
  const provider = createEnvironmentStatusProvider({ ...options, env, fetchFn: async (url: string) => { requests.push(url); return new Response("{}", { status: 200 }); } });
  const status = await provider.read();
  expect(status.installation).toBe("self-managed");
  expect(status.credentials.map((row: any) => row.state)).toEqual(["ready", "ready", "ready"]);
  expect(requests).toHaveLength(3);
  for (const secret of Object.values(env).slice(0, 3)) expect(JSON.stringify(status)).not.toContain(secret);
  const failing = createEnvironmentStatusProvider({ ...options, env, fetchFn: async () => { throw new Error(env.MAPTILER_KEY); } });
  expect(JSON.stringify(await failing.read())).not.toContain(env.MAPTILER_KEY);
});

test("source studio and newsroom setup work without an Engine binary", async () => {
  const options = await fixture();
  const dependencies = selfManagedDependencies({ ...options, env: {}, profileProvider: async () => ({}), openUrl: async () => ({ ok: true }) });
  sessions.push(dependencies.studio);
  const started = await dependencies.studio.start();
  const session = await authenticate(started.studioUrl);
  const status = await (await post(session, "/api/status")).json();
  expect(status.installation).toBe("self-managed");
  expect(status.credentials.every((row: any) => row.state === "not-set")).toBe(true);
  const setup = await (await post(session, "/api/setup/start")).json();
  const html = await (await fetch(new URL(setup.setupUrl).origin)).text();
  expect(html).toContain("Splash reads keys from its process environment");
  expect(html).not.toContain("border-left: 4px");
  const setupSession = await authenticate(setup.setupUrl);
  const setupStatus = await (await post(setupSession, "/api/status")).json();
  expect(setupStatus.installation).toBe("self-managed");
  expect(setupStatus.newsroom.declined).toBe(true);
  const refresh = await post(setupSession, "/api/status");
  expect(refresh.status).toBe(200);
  expect((await post(setupSession, "/api/credential/replace", { candidate: "never-store-this" })).status).toBe(410);
});

test("no explicit Engine path selects self-managed production dependencies", async () => {
  const options = await fixture();
  const dependencies = await productionDependencies({ ...options, bsigPath: null });
  expect((await dependencies.statusProvider.read()).installation).toBe("self-managed");
});

test("self-managed status uses the account saved in Credentials when the launcher supplies only the token", async () => {
  const options = await fixture();
  const { createSettingsService } = await import("../../../installer/setup/settings-service.mjs");
  const settings = createSettingsService(options);
  const before = await settings.request("/api/settings/read", {});
  await settings.request("/api/settings/cloudflare", { expectedRevision: before.revision, cloudflareAccountId: "b".repeat(32) });
  const provider = createEnvironmentStatusProvider({ ...options, env: { CLOUDFLARE_API_TOKEN: "fixture-token" }, fetchFn: async () => new Response("{}", { status: 200 }) });
  const status = await provider.read();
  expect(status.newsroom.cloudflareAccountId).toBe("b".repeat(32));
  expect(status.credentials.find(row => row.id === "CLOUDFLARE_API_TOKEN").state).toBe("ready");
  expect(status.credentials.find(row => row.id === "CLOUDFLARE_API_TOKEN").validation.evidence.cloudflareAccountId).toBe("b".repeat(32));
});

test("local story binding requires real canonical markers", async () => {
  const { root } = await fixture();
  const story = join(root, "example");
  await mkdir(join(story, "source"), { recursive: true });
  await writeFile(join(story, "AGENTS.md"), "Story guidance");
  await writeFile(join(story, "source", "article.md"), "Article");
  expect((await inspectLocalStory(story)).storyId).toBe("example");
  const linked = join(root, "linked");
  await mkdir(linked);
  await writeFile(join(linked, "AGENTS.md"), "Story guidance");
  await symlink(join(story, "source"), join(linked, "source"));
  await expect(inspectLocalStory(linked)).rejects.toThrow("canonical markers");
});
