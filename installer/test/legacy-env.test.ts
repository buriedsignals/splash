import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inspectLegacyEnv,
  readLegacyCandidate,
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

    const map = report.credentials.find((row) => row.id === "MAPTILER_KEY")!;
    const candidate = await readLegacyCandidate(path, {
      credentialId: map.id,
      expectedRevision: report.revision,
      assignmentId: map.assignmentId,
    });
    expect(candidate.candidate).toBe("map-secret-canary-12345");

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

  test("marks aliases, duplicates, and shell-like syntax unsafe instead of choosing a value", async () => {
    const { path } = await fixture(`MAPTILER_KEY=first-secret
VITE_MAPTILER_KEY=second-secret
DATAWRAPPER_TOKEN=$(read-something)
`);
    const report = await inspectLegacyEnv(path);
    expect(report.safe).toBe(false);
    expect(report.issues).toContainEqual({ code: "ambiguous-credential", credentialId: "MAPTILER_KEY" });
    expect(report.issues).toContainEqual({ code: "unsupported-value", line: 3 });
    const map = report.credentials.find((row) => row.id === "MAPTILER_KEY")!;
    await expect(readLegacyCandidate(path, {
      credentialId: "MAPTILER_KEY",
      expectedRevision: report.revision,
      assignmentId: map.assignmentId,
    })).rejects.toMatchObject({ code: "UNSAFE_LEGACY_ENV" });
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

describe("revision-checked legacy removal", () => {
  test("removes only the confirmed exact assignment and preserves comments and unrelated lines", async () => {
    const { path } = await fixture(`# keep this
MAPTILER_KEY=map-secret
DATAWRAPPER_TOKEN=dw-secret
UNRELATED=keep-me
`);
    const report = await inspectLegacyEnv(path);
    const map = report.credentials.find((row) => row.id === "MAPTILER_KEY")!;
    await expect(removeLegacyAssignments(path, {
      expectedRevision: report.revision,
      assignments: [{ credentialId: map.id, assignmentId: map.assignmentId }],
    })).rejects.toThrow("separate confirmation");
    const after = await removeLegacyAssignments(path, {
      expectedRevision: report.revision,
      assignments: [{ credentialId: map.id, assignmentId: map.assignmentId }],
      confirmRemoval: true,
    });
    expect(after.credentials.map((row) => row.id)).toEqual(["DATAWRAPPER_TOKEN"]);
    const text = await readFile(path, "utf8");
    expect(text).toContain("# keep this");
    expect(text).toContain("UNRELATED=keep-me");
    expect(text).toContain("DATAWRAPPER_TOKEN=dw-secret");
    expect(text).not.toContain("MAPTILER_KEY=");
  });

  test("a changed preimage yields a no-write conflict", async () => {
    const { path } = await fixture("MAPTILER_KEY=first-secret\n");
    const report = await inspectLegacyEnv(path);
    const map = report.credentials[0];
    await writeFile(path, "MAPTILER_KEY=replacement-secret\n", { mode: 0o600 });
    await chmod(path, 0o600);
    await expect(removeLegacyAssignments(path, {
      expectedRevision: report.revision,
      assignments: [{ credentialId: map.id, assignmentId: map.assignmentId }],
      confirmRemoval: true,
    })).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(await readFile(path, "utf8")).toBe("MAPTILER_KEY=replacement-secret\n");
  });
});
