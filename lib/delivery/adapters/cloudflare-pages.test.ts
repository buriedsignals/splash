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
  cf,
  cloudflarePublisher,
  contentTypeFor,
  stageArtifact,
  verifyServed,
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

// Bounded time — docs/superpowers/specs/2026-07-26-bounded-time-design.md. REAL servers, not a
// mocked clock, each accepting the connection and then going silent forever: exactly the case
// the parked residual named ("cf() is identical" to the unbounded S3 fetch).
describe("cf against a real hung endpoint", () => {
  function hungServer() {
    return Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Promise<Response>(() => {}), // accepts, never answers
    });
  }

  it("refuses instead of hanging when the Cloudflare API never responds", async () => {
    const server = hungServer();
    try {
      const start = Date.now();
      let caught: unknown;
      try {
        await cf(
          "/accounts/x/pages/projects/y",
          {},
          "token",
          150,
          `http://127.0.0.1:${server.port}`,
        );
      } catch (e) {
        caught = e;
      }
      expect(Date.now() - start).toBeLessThan(2_000);
      expect((caught as Error).message).toContain(
        `http://127.0.0.1:${server.port}`,
      );
      expect((caught as Error).message).toContain("150");
    } finally {
      server.stop(true);
    }
  }, 3_000);
});

// verifyServed already had its OWN overall deadline (COLD_START_WINDOW_MS by default) — the gap
// was that a single stuck attempt inside the loop never let that deadline get re-checked, since
// the raw fetch it awaited had no bound of its own. A small overall timeoutMs against a real hung
// server reproduces exactly that: before the fix this call hangs well past its own 300ms budget
// (the loop never gets back to `while (Date.now() < deadline)`); after, a bounded per-attempt
// fetch lets the loop's own promise hold.
describe("verifyServed against a real hung endpoint", () => {
  it("refuses within its own overall deadline instead of hanging on a single stuck attempt", async () => {
    const server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Promise<Response>(() => {}),
    });
    try {
      const start = Date.now();
      let caught: unknown;
      try {
        await verifyServed(`http://127.0.0.1:${server.port}/`, () => true, 300);
      } catch (e) {
        caught = e;
      }
      const elapsed = Date.now() - start;
      expect(caught).toBeInstanceOf(Error);
      // Generous margin over the 300ms deadline for the poll-interval sleep after the one
      // attempt, but nowhere near COLD_START_WINDOW_MS (200s) — the old, unbounded behaviour.
      expect(elapsed).toBeLessThan(5_000);
    } finally {
      server.stop(true);
    }
  }, 8_000);
});
