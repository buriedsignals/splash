import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPreflight } from "../scripts/preflight.mjs";

const okFetch = async () => new Response("{}", { status: 200 });
let root: string;

// Source of truth for "what a real Splash root needs": the same file preflight.mjs reads.
const ROOT_TEMPLATE_PACKAGE_JSON = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "package.json",
);

async function declaredDependencyNames(): Promise<string[]> {
  const pkg = JSON.parse(await readFile(ROOT_TEMPLATE_PACKAGE_JSON, "utf8"));
  return Object.keys(pkg.dependencies ?? {});
}

// A stub module that Bun.resolveSync can actually resolve — a present
// node_modules with unresolvable packages inside it is exactly the bug this
// suite pins, so "installed" here means "resolvable", not "directory exists".
async function installResolvableDependency(name: string): Promise<void> {
  const dir = join(root, "node_modules", name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.js"), "export default {};\n");
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "splash-root-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const complete = `---
name: Heidi.news
url: https://www.heidi.news
language: fr
brandColor: "#0B7A75"
ground: "#FFFFFF"
typefaces: "Source Serif"
---
`;

describe("runPreflight", () => {
  it("should report the newsroom profile missing when NEWSROOM.md is absent", async () => {
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    const check = verdict.checks.find((c) => c.id === "newsroom-profile");
    expect(check.status).toBe("missing");
    expect(verdict.ok).toBe(false);
  });

  it("should report a key as failed when the probe is rejected, not merely absent", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const rejecting = async () => new Response("Invalid key", { status: 403 });
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "present-but-stale" },
      fetchFn: rejecting,
    });
    const check = verdict.checks.find((c) => c.id === "maptiler-key");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("403");
    expect(verdict.ok).toBe(false);
  });

  it("should pass when the root is installed, the profile is valid and the key probes green", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    for (const name of await declaredDependencyNames()) {
      await installResolvableDependency(name);
    }
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("should report dependencies as fail, naming the package, when node_modules exists but a declared dependency does not resolve", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const declared = await declaredDependencyNames();
    // node_modules exists — the old bug's trigger — but one declared package
    // was never actually installed into it (the @resvg/resvg-js shape from
    // the proof run: present directory, absent resolution).
    const [unresolved, ...rest] = declared;
    for (const name of rest) {
      await installResolvableDependency(name);
    }
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    const check = verdict.checks.find((c) => c.id === "dependencies");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain(unresolved);
    expect(verdict.ok).toBe(false);
  });

  it("should report dependencies missing when node_modules is absent", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    expect(verdict.checks.find((c) => c.id === "dependencies").status).toBe(
      "missing",
    );
  });

  it("should report the maptiler key as missing, not failed, when MAPTILER_KEY is absent from env", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = verdict.checks.find((c) => c.id === "maptiler-key");
    expect(check.status).toBe("missing");
    expect(verdict.ok).toBe(false);
  });

  it("should report the newsroom profile as failed, not missing, when the file exists but cannot be parsed", async () => {
    // A leading blank line breaks the front-matter regex without ever making the file unreadable.
    await writeFile(join(root, "NEWSROOM.md"), `\n${complete}`);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    const check = verdict.checks.find((c) => c.id === "newsroom-profile");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("front matter");
  });

  it("should report the newsroom profile as failed when NEWSROOM.md is present but incomplete", async () => {
    await writeFile(join(root, "NEWSROOM.md"), "---\nname: X\n---\n");
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({
      root,
      env: { MAPTILER_KEY: "k" },
      fetchFn: okFetch,
    });
    const check = verdict.checks.find((c) => c.id === "newsroom-profile");
    expect(check.status).toBe("fail");
    expect(verdict.ok).toBe(false);
  });
});
