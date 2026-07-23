import { describe, it, expect } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { embedSlug, servedMatcher, stageArtifact } from "./deploy-embed.mjs";
import { generateEditorKeypair } from "./sign-artifact.mjs";
import { sha256Hex } from "../src/editorial-signoff.ts";

// Deliberately NOT the real credentials: this suite must never be able to deploy anything.
// The repo-root .env holds live Cloudflare keys, so every spawn below overrides them.
const FAKE_ENV = {
  CLOUDFLARE_API_TOKEN: "test-token-not-real",
  CLOUDFLARE_ACCOUNT_ID: "0000000000000000000000000000test",
  SPLASH_EMBED_PROJECT: "test-newsroom-splash",
};

describe("stageArtifact — Cloudflare serves a directory, not a file", () => {
  it("should stage a single self-contained artifact as index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-stage-"));
    try {
      const html = join(dir, "interactive.html");
      writeFileSync(html, "<html>chart</html>");
      const stage = join(dir, "site");
      stageArtifact(html, stage);
      expect(readFileSync(join(stage, "index.html"), "utf8")).toBe(
        "<html>chart</html>",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("should copy a directory as-is, preserving nested assets", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-stage-"));
    try {
      const src = join(dir, "out");
      mkdirSync(join(src, "assets"), { recursive: true });
      writeFileSync(join(src, "index.html"), "<html>scrolly</html>");
      writeFileSync(join(src, "assets", "app.js"), "console.log(1)");
      const stage = join(dir, "site");
      stageArtifact(src, stage);
      expect(existsSync(join(stage, "index.html"))).toBe(true);
      expect(existsSync(join(stage, "assets", "app.js"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("servedMatcher — the delivery proof on an undocumented protocol", () => {
  it("should accept the artifact's own bytes", () => {
    const html = "<html><body><h1>Loyers europeens</h1></body></html>";
    expect(servedMatcher(html)(html)).toBe(true);
  });

  it("should reject a page that is not the artifact", () => {
    const html = "<html><body><h1>Loyers europeens</h1></body></html>";
    expect(servedMatcher(html)("<html>404 not found</html>")).toBe(false);
  });

  it("should tolerate whitespace reflow by the edge", () => {
    const html = "<html>\n  <h1>Loyers</h1>\n</html>";
    expect(servedMatcher(html)("<html> <h1>Loyers</h1> </html>")).toBe(true);
  });
});

describe("deploy-embed CLI — export-completeness gate", () => {
  const scriptPath = join(import.meta.dir, "deploy-embed.mjs");

  function setup(over: Record<string, unknown> = {}) {
    const dir = mkdtempSync(join(tmpdir(), "splash-deploy-embed-"));
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

  function run(
    htmlFile: string,
    resultsPath: string,
    env: Record<string, string>,
  ) {
    return Bun.spawnSync(
      [
        "bun",
        scriptPath,
        htmlFile,
        "some-slug",
        "--results",
        resultsPath,
        "--id",
        "p1",
      ],
      { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } },
    );
  }

  it("refuses (non-zero exit) to deploy a proposal that is not produced + render-approved", () => {
    const { dir, htmlFile, resultsPath } = setup({ renderApproved: false });
    try {
      const proc = run(htmlFile, resultsPath, FAKE_ENV);
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(
        /not render-approved|refusing to export|not produced/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The bug this guards (QA Wave 11): with the credential unset the deploy STALLED, yet the run
  // was later marked "delivered", handing over only the pre-export production output. The CLI
  // must REFUSE up front — non-zero with an actionable message BEFORE any network call, so
  // nothing can partially deploy or fake a URL.
  it("fail-fasts with an actionable message when the credentials are missing, before any upload", () => {
    const { dir, htmlFile, resultsPath } = setup();
    try {
      const proc = run(htmlFile, resultsPath, {
        CLOUDFLARE_API_TOKEN: "",
        CLOUDFLARE_ACCOUNT_ID: "",
        SPLASH_EMBED_PROJECT: "",
      });
      expect(proc.exitCode).not.toBe(0);
      const stderr = proc.stderr.toString();
      expect(stderr).toContain("CLOUDFLARE_API_TOKEN");
      // The message has to tell the journalist what to do, not just what is missing.
      expect(stderr).toMatch(/dash\.cloudflare\.com|standalone HTML/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a generic project name that would collide across newsrooms", () => {
    const { dir, htmlFile, resultsPath } = setup();
    try {
      const proc = run(htmlFile, resultsPath, {
        ...FAKE_ENV,
        SPLASH_EMBED_PROJECT: "splash-embeds",
      });
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/too generic/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("gets past the gate for a produced + render-approved proposal — failing only at the real API", () => {
    // The credentials are fake, so the deploy must fail at Cloudflare, NOT at either guard.
    // This proves neither the shippability gate nor the credential check is what stops a
    // legitimate export.
    const { dir, htmlFile, resultsPath } = setup();
    try {
      const proc = run(htmlFile, resultsPath, FAKE_ENV);
      const stderr = proc.stderr.toString();
      expect(proc.exitCode).not.toBe(0);
      expect(stderr).not.toMatch(
        /not produced|not render-approved|refusing to export/,
      );
      expect(stderr).not.toMatch(/too generic/);
      expect(stderr).toContain("cloudflare pages deploy failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("never prints an EMBED_URL when the deploy did not succeed", () => {
    // The contract export-code parses (export-code.mjs:358). A printed URL means "delivered",
    // so it must never appear on a failed path or a dead link is recorded as a real embed.
    const { dir, htmlFile, resultsPath } = setup();
    try {
      const proc = run(htmlFile, resultsPath, FAKE_ENV);
      expect(proc.stdout.toString()).not.toContain("EMBED_URL");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("embedSlug re-export", () => {
  it("should expose the URL-label normaliser through the CLI module", () => {
    expect(embedSlug("Élections municipales")).toStartWith(
      "elections-municipales",
    );
  });
});

describe("deploy-embed — editorial sign-off gate (S4d)", () => {
  const scriptPath = join(import.meta.dir, "deploy-embed.mjs");

  it("refuses (non-zero exit) when a requiredSigner has not signed the staged artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "s4d-dep-"));
    try {
      const html = Buffer.from("<html>interactive</html>");
      const artifactPath = join(dir, "interactive.html");
      writeFileSync(artifactPath, html);
      // A REAL Ed25519 keypair, so the profile parses cleanly — the point of this test is the
      // ENFORCEMENT path (missing sign-off), not a profile-parse failure (an invalid key like
      // "AAAA" would be dropped by parseNewsroomMarkdown and throw "not registered" instead).
      const { publicBase64 } = generateEditorKeypair("yvan");
      const report = {
        results: [
          {
            id: "p1",
            producer: "chart-native",
            format: "interactive",
            status: "produced",
            reviewed: true,
            renderApproved: true,
            approvedHash: sha256Hex(html),
            // deliberately NO editorialSignoffs — the required sign-off is missing.
          },
        ],
      };
      const reportPath = join(dir, "report.json");
      writeFileSync(reportPath, JSON.stringify(report));
      const profilePath = join(dir, "NEWSROOM-PROFILE.md");
      writeFileSync(
        profilePath,
        `---\nsigners:\n  - yvan:${publicBase64}\nrequiredSigners:\n  - yvan\n---`,
      );
      const proc = Bun.spawnSync(
        [
          "bun",
          scriptPath,
          artifactPath,
          "slug",
          "--results",
          reportPath,
          "--id",
          "p1",
          "--profile",
          profilePath,
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, ...FAKE_ENV },
        },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toContain(
        "required editorial sign-off missing from yvan",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("with no --profile, proceeds unsigned (opt-in default) — prints EDITORIAL: unsigned before the network step", () => {
    const dir = mkdtempSync(join(tmpdir(), "s4d-dep-"));
    try {
      const html = Buffer.from("<html>interactive</html>");
      const artifactPath = join(dir, "interactive.html");
      writeFileSync(artifactPath, html);
      const report = {
        results: [
          {
            id: "p1",
            producer: "chart-native",
            format: "interactive",
            status: "produced",
            reviewed: true,
            renderApproved: true,
            approvedHash: sha256Hex(html),
          },
        ],
      };
      const reportPath = join(dir, "report.json");
      writeFileSync(reportPath, JSON.stringify(report));
      // No --profile flag at all.
      const proc = Bun.spawnSync(
        [
          "bun",
          scriptPath,
          artifactPath,
          "slug",
          "--results",
          reportPath,
          "--id",
          "p1",
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, ...FAKE_ENV },
        },
      );
      // The fake Cloudflare credentials mean the deploy still fails downstream — but only AFTER
      // the editorial gate has run and printed the honest unsigned state, proving the gate sits
      // before the network step rather than being skipped.
      expect(proc.stdout.toString()).toContain(
        "EDITORIAL: unsigned — LLM render-approval only",
      );
      expect(proc.stderr.toString()).toContain(
        "cloudflare pages deploy failed",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
