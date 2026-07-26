// The adapter's CONFIG-only refusals — everything it can answer without a network, and
// therefore everything it must answer BEFORE it uploads anything. The protocol itself is
// proven live (docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md);
// no request is mocked here, none is made.
import { describe, it, expect } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  cloudflarePublisher,
  contentTypeFor,
  stageArtifact,
} from "./cloudflare-pages";
import type { PublishRequest } from "../../core/publishers";

function request(overrides: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: import.meta.path,
    id: "primes",
    format: "interactive",
    metadata: {
      title: "Primes cantonales",
      altText: "Les primes montent",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
      width: 700,
      height: 420,
    },
    settings: { publisherId: "embed-cloudflare" },
    credentials: {},
    outDir: "/nonexistent",
    ...overrides,
  };
}

describe("the cloudflare adapter's pre-flight", () => {
  // The snippet used to be rendered AFTER deployDirectory + verifyServed, yet its refusals
  // (an unfillable placeholder; a responsive sizing rule colliding with a template that still
  // demands {height}) depend only on decor config — knowable before a single byte moves. A
  // misconfigured template therefore deployed for real, verified the served bytes, and THEN
  // answered invalid-request: nothing recorded, nextActions saying "deliver" again, the same
  // irreversible deploy repeating forever. Validated up front now, exactly as zip.ts does.
  it("refuses a template carrying a placeholder it cannot fill, before any I/O", async () => {
    const r = await cloudflarePublisher.publish(
      request({
        settings: {
          publisherId: "embed-cloudflare",
          snippetTemplate: '<iframe src="{url}" data-campaign="{utm_source}">',
        },
      }),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("{utm_source}");
  });

  it("refuses a responsive sizing rule colliding with a fixed-height template, before any I/O", async () => {
    const r = await cloudflarePublisher.publish(
      request({
        metadata: { ...request().metadata, height: "responsive" },
        settings: {
          publisherId: "embed-cloudflare",
          snippetTemplate: '<iframe src="{url}" height="{height}"></iframe>',
        },
      }),
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("responsive");
  });

  it("still refuses missing credentials when the template is fine", async () => {
    const r = await cloudflarePublisher.publish(request());
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain(
      "CLOUDFLARE_API_TOKEN",
    );
  });
});

// Pure, offline, no network — same discipline as the rest of this file: stageArtifact is the
// one function that decides what filename the artifact is staged under before a directory is
// deployed. Regression: before it took a `format`, every artifact was staged as "index.html" —
// a static PNG or an mp4 staged (and thus served, since Cloudflare derives content-type from
// the extension of the file it finds) as if it were the interactive HTML build.
describe("stageArtifact", () => {
  it("stages a static artifact as index.png, not index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-cf-stage-"));
    try {
      const artifact = join(dir, "chart.png");
      writeFileSync(artifact, "not-real-png-bytes");
      const stageDir = join(dir, "site");
      const staged = stageArtifact(artifact, stageDir, "static");
      expect(staged).toBe("index.png");
      expect(existsSync(join(stageDir, "index.png"))).toBe(true);
      expect(existsSync(join(stageDir, "index.html"))).toBe(false);
      expect(readFileSync(join(stageDir, staged))).toEqual(
        readFileSync(artifact),
      );
      expect(contentTypeFor(staged)).toBe("image/png");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still stages an interactive artifact as index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-cf-stage-"));
    try {
      const artifact = join(dir, "chart.html");
      writeFileSync(artifact, "<html><body>chart</body></html>");
      const stageDir = join(dir, "site");
      const staged = stageArtifact(artifact, stageDir, "interactive");
      expect(staged).toBe("index.html");
      expect(contentTypeFor(staged)).toBe("text/html");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
