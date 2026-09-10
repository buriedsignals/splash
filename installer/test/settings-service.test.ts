import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSettingsService } from "../setup/settings-service.mjs";

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const design = { name: "Example News", url: "https://example.com", languages: "en, fr", credit: "", brandColor: "#112233", ground: "#ffffff", accents: "", typefaces: "Helvetica" };
async function fixture(text = "", options = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "splash-settings-")));
  roots.push(root);
  const newsroomPath = join(root, "NEWSROOM.md");
  if (text) await writeFile(newsroomPath, text);
  const service = createSettingsService({ newsroomPath, ...options });
  return { service, newsroomPath, read: () => service.request("/api/settings/read", {}) };
}

test("an account ID saves before Design is configured and survives later design saves", async () => {
  const { service, read } = await fixture();
  const initial = await read();
  const account = await service.request("/api/settings/cloudflare", { expectedRevision: initial.revision, cloudflareAccountId: "a".repeat(32) });
  expect(account.profile).toEqual({ cloudflareAccountId: "a".repeat(32) });
  const saved = await service.request("/api/settings/design", { expectedRevision: account.revision, changes: design, confirmReplaceDecline: false });
  expect(saved.profile).toMatchObject({ ...Object.fromEntries(Object.entries(design).filter(([, value]) => value)), cloudflareAccountId: "a".repeat(32), language: "en" });
});

test("editing credentials preserves a recorded design decision and unrelated content", async () => {
  const { service, read, newsroomPath } = await fixture('---\ndecision: declined\ncustom: keep\ncmsKind: livingdocs\ncmsEndpoint: https://cms.example.com\n---\nHouse notes stay.\n');
  const saved = await service.request("/api/settings/cloudflare", { expectedRevision: (await read()).revision, cloudflareAccountId: "b".repeat(32) });
  expect(saved.declined).toBe(true);
  expect(saved.profile).toEqual({ cloudflareAccountId: "b".repeat(32) });
  const file = await readFile(newsroomPath, "utf8");
  expect(file).toContain("custom: keep");
  expect(file).toContain("cmsKind:");
  expect(file).toContain("House notes stay.");
});

test("invalid IDs, cross-section fields and stale revisions cannot overwrite settings", async () => {
  const { service, read, newsroomPath } = await fixture();
  const initial = await read();
  await expect(service.request("/api/settings/cloudflare", { expectedRevision: initial.revision, cloudflareAccountId: "invalid" })).rejects.toThrow("32 hexadecimal");
  await expect(service.request("/api/settings/design", { expectedRevision: initial.revision, changes: { ...design, cmsEndpoint: "https://example.com" }, confirmReplaceDecline: false })).rejects.toThrow("wrong fields");
  await service.request("/api/settings/cloudflare", { expectedRevision: initial.revision, cloudflareAccountId: "c".repeat(32) });
  const saved = await readFile(newsroomPath, "utf8");
  await expect(service.request("/api/settings/design", { expectedRevision: initial.revision, changes: design, confirmReplaceDecline: false })).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  expect(await readFile(newsroomPath, "utf8")).toBe(saved);
});

test("website lookup produces a proposal without writing and launcher-provided account IDs remain explicit", async () => {
  const { service, read } = await fixture("", { accountIdFromEnvironment: "d".repeat(32), deriveProposal: async () => ({ ok: true, fields: { brandColor: { value: "#112233", source: "website" } } }) });
  const initial = await read();
  const proposal = await service.request("/api/settings/derive", { url: "https://example.com" });
  expect(proposal.fields.brandColor.value).toBe("#112233");
  expect(await read()).toEqual(initial);
  await expect(service.request("/api/settings/cloudflare", { expectedRevision: initial.revision, cloudflareAccountId: "e".repeat(32) })).rejects.toThrow("launching environment");
});
