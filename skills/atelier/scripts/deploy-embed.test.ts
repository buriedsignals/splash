import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { embedUrl, slugify, resolveApp } from "./deploy-embed.mjs";

describe("embedUrl / slugify", () => {
  it("builds the host URL from app + slug", () => {
    expect(embedUrl("my-newsroom-embeds", "eu-rents-2025")).toBe(
      "https://my-newsroom-embeds.fly.dev/eu-rents-2025/",
    );
  });
  it("slugify lowercases, strips, and dashes", () => {
    expect(slugify("EU Rents (2025)!")).toBe("eu-rents-2025");
  });
});

describe("resolveApp — the host is the journalist's own fly.io app", () => {
  it("uses the explicit CLI arg over the env", () => {
    expect(resolveApp("cli-app", { ATELIER_EMBED_APP: "env-app" })).toBe(
      "cli-app",
    );
  });
  it("falls back to $ATELIER_EMBED_APP when no arg is given", () => {
    expect(resolveApp(undefined, { ATELIER_EMBED_APP: "env-app" })).toBe(
      "env-app",
    );
  });
  it("throws when neither is set — there is NO shared default app", () => {
    expect(() => resolveApp(undefined, {})).toThrow(/no fly\.io app/i);
    // guardrail: the old shared default must never come back
    expect(() => resolveApp(undefined, {})).not.toThrow(/atelier-embeds/);
  });
});

describe("deploy-embed CLI — export-completeness gate", () => {
  const scriptPath = join(import.meta.dir, "deploy-embed.mjs");

  function setup(over: Record<string, unknown> = {}) {
    const dir = mkdtempSync(join(tmpdir(), "atelier-deploy-embed-"));
    const htmlFile = join(dir, "interactive.html");
    writeFileSync(htmlFile, "<html>chart</html>");
    const resultsPath = join(dir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify({
        results: [
          {
            id: "p1",
            producer: "chart-native",
            format: "interactive",
            status: "produced",
            reviewed: true,
            renderApproved: true,
            ...over,
          },
        ],
      }),
    );
    return { dir, htmlFile, resultsPath };
  }

  // flyctl is not installed in this environment (and no real fly.io app is configured for
  // tests), so a produced + render-approved proposal cannot upload end-to-end here. A dummy
  // FLY_API_TOKEN gets it past the new token fail-fast (see below) so it reaches the REAL
  // upload step — proving neither the shippability gate NOR the token guard is what stops it:
  // it must fail later, at the real upload, with those guards' error text absent from stderr.
  // (The token value is a placeholder, not a real fly credential — it only satisfies the
  // "is a token configured?" check; the upload still fails because flyctl is unavailable.)
  it("gets past the gate for a produced + render-approved proposal (happy path) — fails only at the real fly upload, not the guard", () => {
    const { dir, htmlFile, resultsPath } = setup();
    try {
      const proc = Bun.spawnSync(
        [
          "bun",
          scriptPath,
          htmlFile,
          "some-slug",
          "--results",
          resultsPath,
          "--id",
          "p1",
          "test-app-not-real",
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, FLY_API_TOKEN: "test-token-not-real" },
        },
      );
      const stderr = proc.stderr.toString();
      expect(proc.exitCode).not.toBe(0); // no real flyctl/host in this environment
      expect(stderr).not.toMatch(
        /not produced|not render-approved|refusing to export/,
      );
      expect(stderr).toContain("fly upload failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses (non-zero exit) to deploy a proposal that is not produced + render-approved", () => {
    const { dir, htmlFile, resultsPath } = setup({ renderApproved: false });
    try {
      const proc = Bun.spawnSync(
        [
          "bun",
          scriptPath,
          htmlFile,
          "some-slug",
          "--results",
          resultsPath,
          "--id",
          "p1",
          "test-app-not-real",
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/not render-approved/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("deploy-embed CLI — FLY_API_TOKEN fail-fast (no faked delivery)", () => {
  const scriptPath = join(import.meta.dir, "deploy-embed.mjs");

  function setup(over: Record<string, unknown> = {}) {
    const dir = mkdtempSync(join(tmpdir(), "atelier-deploy-embed-notoken-"));
    const htmlFile = join(dir, "interactive.html");
    writeFileSync(htmlFile, "<html>chart</html>");
    const resultsPath = join(dir, "report.json");
    writeFileSync(
      resultsPath,
      JSON.stringify({
        results: [
          {
            id: "p1",
            producer: "map-native",
            format: "scrolly",
            status: "produced",
            reviewed: true,
            renderApproved: true,
            ...over,
          },
        ],
      }),
    );
    return { dir, htmlFile, resultsPath };
  }

  // The bug (QA Wave 11): a self-hosted embed needs FLY_API_TOKEN to deploy to fly.io. With the
  // token unset the deploy STALLED, yet the run was later marked "delivered" handing over only
  // the pre-export production output. deploy-embed must now REFUSE up front — exit non-zero with
  // an actionable message BEFORE any flyctl call, so nothing can partially deploy or fake a URL.
  it("exits non-zero with an actionable message when FLY_API_TOKEN is unset (no hosted publicUrl to fall back to)", () => {
    const { dir, htmlFile, resultsPath } = setup();
    try {
      const env = { ...process.env };
      delete env.FLY_API_TOKEN;
      const proc = Bun.spawnSync(
        [
          "bun",
          scriptPath,
          htmlFile,
          "some-slug",
          "--results",
          resultsPath,
          "--id",
          "p1",
          "test-app-not-real",
        ],
        { stdout: "pipe", stderr: "pipe", env },
      );
      const stderr = proc.stderr.toString();
      expect(proc.exitCode).not.toBe(0);
      expect(stderr).toMatch(/FLY_API_TOKEN/);
      // steers the journalist to the deliverable standalone-HTML form (b)
      expect(stderr).toMatch(/standalone HTML form \(b\)/i);
      // it must NOT have reached the real fly upload (no partial deploy / placeholder)
      expect(stderr).not.toContain("fly upload failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
