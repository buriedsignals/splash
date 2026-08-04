// Offline tests: the refusals that must land before a single byte moves, and the `serves`
// decision. The network path is exercised in wepublish-network.test.ts against a real server,
// and proven live in wepublish-e2e.test.ts.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { wepublishPublisher } from "./wepublish";
import { MAX_REQUEST_BODY_BYTES } from "./wepublish-gql";
import type { PublishRequest } from "../../core/publishers";

const META = {
  title: "Primes cantonales",
  altText: "Les primes montent",
  source: "OFSP",
  credit: "Heidi.news",
  lang: "fr",
};

function artifactFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "wp-adapter-"));
  const p = join(dir, "interactive.html");
  writeFileSync(p, contents);
  return p;
}

function request(over: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: artifactFile("<!doctype html><html><body>x</body></html>"),
    id: "primes",
    format: "interactive",
    metadata: META,
    settings: {
      publisherId: "embed-cms",
      // Port 1 on loopback: nothing listens. Any test that reaches the network here would
      // fail loudly rather than quietly pass — which is what makes "refused before any I/O"
      // a claim these tests can actually make.
      endpoint: "http://127.0.0.1:1/v1",
    },
    credentials: {
      SPLASH_WEPUBLISH_EMAIL: "splash@newsroom.example",
      SPLASH_WEPUBLISH_PASSWORD: "hunter2",
    },
    outDir: "/nonexistent",
    ...over,
  };
}

describe("wepublishPublisher shape", () => {
  it("should be a hosted, implemented publisher under the decor's capability id", () => {
    expect(wepublishPublisher.id).toBe("embed-cms");
    expect(wepublishPublisher.kind).toBe("hosted");
    expect(wepublishPublisher.implemented).toBe(true);
  });

  // The `serves` decision, locked as a test because it is the one thing about this adapter a
  // future reader is most likely to "fix" without re-reading the measurement.
  //
  // It has been WRONG TWICE, in the same direction — too narrow — and both corrections are worth
  // keeping, because each was a measurement of a BLOCK mistaken for a measurement of the CMS:
  //
  //   "a CMS block carries markup, not binary assets" → true of the block, but the CMS has a
  //   MEDIA SERVER, and the image block takes the id it issues. `static` was reachable all along.
  //
  //   "nothing in the CMS renders an mp4" → true of every VIDEO block (each takes an id from an
  //   external platform), but the HTML block renders arbitrary markup, and `<video src>` is
  //   markup. A video is reachable too — pointing at a file the newsroom already serves.
  it("should serve all four formats", () => {
    expect([...wepublishPublisher.serves].sort()).toEqual([
      "interactive",
      "scrolly",
      "static",
      "video",
    ]);
  });

  it("should take an ADDRESS as well as a file, because a video has no bytes here", () => {
    // The three others ship their own bytes. A video cannot: there is no self-hosted mp4 block,
    // so the file lives where the newsroom publishes its files and the article points at it.
    expect([...wepublishPublisher.sources].sort()).toEqual(["file", "hosted"]);
  });

  it("should REFUSE a video with no hosted address, rather than insert a broken player", async () => {
    const r = await wepublishPublisher.publish(
      request({ format: "video", artifactPath: undefined, artifactUrl: "" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("hosted");
  });

});

describe("wepublishPublisher settings refusals", () => {
  it("should refuse a missing endpoint, naming where it is configured", async () => {
    const r = await wepublishPublisher.publish(
      request({ settings: { publisherId: "embed-cms" } }),
    );
    expect(r.ok).toBe(false);
    const m = (r as { message: string }).message;
    expect(m).toContain("endpoint");
    expect(m).toContain("newsroom.json");
  });

  it("should refuse a malformed endpoint as a config problem", async () => {
    const r = await wepublishPublisher.publish(
      request({
        settings: { publisherId: "embed-cms", endpoint: "not a url" },
      }),
    );
    expect(r.ok).toBe(false);
    expect((r as { code: string }).code).toBe("invalid-request");
    expect((r as { message: string }).message).toContain("endpoint");
  });
});

describe("wepublishPublisher credential refusals", () => {
  it("should refuse a missing email by name", async () => {
    const r = await wepublishPublisher.publish(
      request({ credentials: { SPLASH_WEPUBLISH_PASSWORD: "hunter2" } }),
    );
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain(
      "SPLASH_WEPUBLISH_EMAIL",
    );
  });

  it("should never mention the password variable in the refusal about the email", async () => {
    // The same discipline s3.ts keeps: the secret's name contains the word PASSWORD, and a
    // refusal about the other variable has no business carrying it.
    const r = await wepublishPublisher.publish(request({ credentials: {} }));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).not.toContain("PASSWORD");
  });

  it("should refuse a missing password by name", async () => {
    const r = await wepublishPublisher.publish(
      request({
        credentials: { SPLASH_WEPUBLISH_EMAIL: "splash@newsroom.example" },
      }),
    );
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain(
      "SPLASH_WEPUBLISH_PASSWORD",
    );
  });
});

describe("wepublishPublisher artifact refusals", () => {
  it("should refuse an unsafe id before it becomes a slug", async () => {
    const r = await wepublishPublisher.publish(request({ id: "../escape" }));
    expect(r.ok).toBe(false);
    expect((r as { code: string }).code).toBe("invalid-request");
  });

  it("should refuse an unreadable artifact with a bounded failure", async () => {
    const r = await wepublishPublisher.publish(
      request({ artifactPath: "/nonexistent/interactive.html" }),
    );
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("cannot read");
  });

  // W14/W16 — the ceiling has under 2x of headroom on a real artifact, so it is guarded.
  it("should refuse an artifact whose block would exceed the request-body ceiling", async () => {
    const r = await wepublishPublisher.publish(
      request({
        artifactPath: artifactFile("x".repeat(MAX_REQUEST_BODY_BYTES + 1)),
      }),
    );
    expect(r.ok).toBe(false);
    const m = (r as { message: string }).message;
    expect(m).toContain(String(MAX_REQUEST_BODY_BYTES));
    // Actionable: it must say what to do, not merely that a number was exceeded.
    expect(m).toMatch(/object storage|lighter/i);
  });

  it("should count the ESCAPED size, not the raw file size", async () => {
    // A document just under the ceiling made of quotes inflates 6x when escaped. Measuring the
    // raw file would let it through and earn an opaque 413 from the server.
    const raw = '"'.repeat(Math.floor(MAX_REQUEST_BODY_BYTES * 0.9));
    const r = await wepublishPublisher.publish(
      request({ artifactPath: artifactFile(raw) }),
    );
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/too large|exceeds/i);
  });
});
