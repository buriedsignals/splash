import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inspectLegacyEnv,
  readLegacyIntegrations,
  removeLegacyAssignments,
} from "../setup/legacy-env.mjs";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(text: string) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "splash-legacy-env-")));
  roots.push(root);
  const path = join(root, ".env");
  await writeFile(path, text, { mode: 0o600 });
  await chmod(path, 0o600);
  return { root, path };
}

describe("legacy environment inspection", () => {
  test("reports supported identities without returning any value", async () => {
    const { path } = await fixture(`# retained comment
MAPTILER_API_KEY=map-secret-canary-12345
DATAWRAPPER_TOKEN="dw-secret-canary-67890"
CLOUDFLARE_ACCOUNT_ID=0123456789abcdef0123456789abcdef
CMS_KIND=livingdocs
CMS_ENDPOINT=https://cms.example.test/api
UNRELATED=keep-me
`);
    const report = await inspectLegacyEnv(path);
    expect(report.safe).toBe(true);
    expect(report.credentials.map((row) => row.id).sort()).toEqual(["DATAWRAPPER_TOKEN", "MAPTILER_KEY"]);
    expect(report.integrations.map((row) => row.field).sort()).toEqual(["cloudflareAccountId", "cmsEndpoint", "cmsKind"]);
    expect(JSON.stringify(report)).not.toContain("map-secret-canary");
    expect(JSON.stringify(report)).not.toContain("dw-secret-canary");

    const integrations = await readLegacyIntegrations(path, {
      expectedRevision: report.revision,
      assignments: report.integrations.map(({ field, assignmentId }) => ({ field, assignmentId })),
    });
    expect(integrations).toEqual({
      cloudflareAccountId: "0123456789abcdef0123456789abcdef",
      cmsKind: "livingdocs",
      cmsEndpoint: "https://cms.example.test/api",
    });
  });

  test("marks aliases and unsupported non-secret syntax unsafe without decoding credential values", async () => {
    const { path } = await fixture(`MAPTILER_KEY=first secret with shell-like $syntax
VITE_MAPTILER_KEY=second-secret
CMS_ENDPOINT=$(read-something)
`);
    const report = await inspectLegacyEnv(path);
    expect(report.safe).toBe(false);
    expect(report.issues).toContainEqual({ code: "ambiguous-credential", credentialId: "MAPTILER_KEY" });
    expect(report.issues).toContainEqual({ code: "unsupported-value", line: 3 });
    expect(JSON.stringify(report)).not.toContain("first secret");
    expect(JSON.stringify(report)).not.toContain("second-secret");
  });

  test("unsafe permissions and symlinks are reported without exposing supported entries", async () => {
    const { root, path } = await fixture("MAPTILER_KEY=permission-secret\n");
    await chmod(path, 0o644);
    const permissions = await inspectLegacyEnv(path);
    expect(permissions).toMatchObject({ safe: false, credentials: [] });
    expect(JSON.stringify(permissions)).not.toContain("permission-secret");

    const target = join(root, "target");
    const linked = join(root, "linked", ".env");
    await writeFile(target, "MAPTILER_KEY=symlink-secret\n", { mode: 0o600 });
    await mkdir(join(root, "linked"));
    await symlink(target, linked);
    const symlinked = await inspectLegacyEnv(linked);
    expect(symlinked).toMatchObject({ safe: false, credentials: [] });
  });
});

describe("revision-checked legacy integration removal", () => {
  test("removes only the confirmed non-secret assignment and preserves credentials and unrelated lines", async () => {
    const { path } = await fixture(`# keep this
CLOUDFLARE_ACCOUNT_ID=0123456789abcdef0123456789abcdef
CMS_KIND=livingdocs
MAPTILER_KEY=map-secret
UNRELATED=keep-me
`);
    const report = await inspectLegacyEnv(path);
    const account = report.integrations.find((row) => row.field === "cloudflareAccountId")!;
    await expect(removeLegacyAssignments(path, {
      expectedRevision: report.revision,
      assignments: [{ field: account.field, assignmentId: account.assignmentId }],
    })).rejects.toThrow("separate confirmation");
    const after = await removeLegacyAssignments(path, {
      expectedRevision: report.revision,
      assignments: [{ field: account.field, assignmentId: account.assignmentId }],
      confirmRemoval: true,
    });
    expect(after.integrations.map((row) => row.field)).toEqual(["cmsKind"]);
    expect(after.credentials.map((row) => row.id)).toEqual(["MAPTILER_KEY"]);
    const text = await readFile(path, "utf8");
    expect(text).toContain("# keep this");
    expect(text).toContain("UNRELATED=keep-me");
    expect(text).toContain("CMS_KIND=livingdocs");
    expect(text).toContain("MAPTILER_KEY=map-secret");
    expect(text).not.toContain("CLOUDFLARE_ACCOUNT_ID=");
  });

  test("a changed preimage yields a no-write conflict", async () => {
    const { path } = await fixture("CMS_KIND=livingdocs\n");
    const report = await inspectLegacyEnv(path);
    const cms = report.integrations[0];
    await writeFile(path, "CMS_KIND=we-publish\n", { mode: 0o600 });
    await chmod(path, 0o600);
    await expect(removeLegacyAssignments(path, {
      expectedRevision: report.revision,
      assignments: [{ field: cms.field, assignmentId: cms.assignmentId }],
      confirmRemoval: true,
    })).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(await readFile(path, "utf8")).toBe("CMS_KIND=we-publish\n");
  });
});
