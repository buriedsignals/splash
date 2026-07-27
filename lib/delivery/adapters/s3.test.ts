// Offline tests: refusals and URL/key construction, which need no server. The network path
// (F1-F7, all measured against a real MinIO server — spec §5.1) is proven live in Task 4.
import { describe, it, expect, afterEach } from "bun:test";
import { s3Publisher, publicUrlFor, parseS3ErrorCode } from "./s3";
import type { PublishRequest } from "../../core/publishers";

const META = {
  title: "Primes cantonales",
  altText: "Les primes montent",
  source: "OFSP",
  credit: "Heidi.news",
  lang: "fr",
};

function request(over: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: import.meta.path,
    id: "primes",
    format: "interactive",
    metadata: META,
    settings: {
      publisherId: "embed-s3",
      endpoint: "https://s3.eu-west-1.amazonaws.com",
      region: "eu-west-1",
      bucket: "newsroom-embeds",
      publicBaseUrl: "https://embeds.example.org",
    },
    credentials: {
      SPLASH_S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
      SPLASH_S3_SECRET_ACCESS_KEY: "SECRET",
    },
    outDir: "/nonexistent",
    ...over,
  };
}

describe("publicUrlFor", () => {
  it("should build the link from the configured public base, never from the endpoint", () => {
    expect(
      publicUrlFor(
        {
          publicBaseUrl: "https://embeds.example.org",
          endpoint: "https://s3.eu-west-1.amazonaws.com",
        },
        "primes.html",
      ),
    ).toBe("https://embeds.example.org/primes.html");
  });

  it("should tolerate a trailing slash on the configured base", () => {
    expect(
      publicUrlFor(
        { publicBaseUrl: "https://embeds.example.org/" },
        "primes.html",
      ),
    ).toBe("https://embeds.example.org/primes.html");
  });

  it("should place the object under the configured prefix when there is one", () => {
    expect(
      publicUrlFor(
        { publicBaseUrl: "https://e.org", prefix: "splash" },
        "primes.html",
      ),
    ).toBe("https://e.org/splash/primes.html");
  });

  it("should tolerate a prefix with leading/trailing slashes, without a doubled separator", () => {
    expect(
      publicUrlFor(
        { publicBaseUrl: "https://e.org/", prefix: "/splash/" },
        "primes.html",
      ),
    ).toBe("https://e.org/splash/primes.html");
  });
});

// F6: a non-2xx PUT answers with an XML <Code>, and that code is the only thing that tells a
// newsroom a bad key from a clock skew from a permissions problem. Its DOCUMENTED degradation
// ("empty, truncated, or not XML at all → Unknown") is a claim about a pure string function, so
// it belongs in an offline test rather than being reachable only over the network.
describe("parseS3ErrorCode", () => {
  it("should read the code out of a well-formed S3 error body", () => {
    expect(
      parseS3ErrorCode(
        '<?xml version="1.0" encoding="UTF-8"?><Error><Code>SignatureDoesNotMatch</Code>' +
          "<Message>The request signature we calculated does not match</Message></Error>",
      ),
    ).toBe("SignatureDoesNotMatch");
  });

  it("should degrade to Unknown on an empty body rather than throwing", () => {
    expect(parseS3ErrorCode("")).toBe("Unknown");
  });

  it("should degrade to Unknown when a proxy answers with HTML instead of XML", () => {
    expect(
      parseS3ErrorCode(
        "<html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>",
      ),
    ).toBe("Unknown");
  });
});

describe("the s3 publisher, before it reaches the network", () => {
  it("should refuse a missing bucket by naming the setting, not its value", async () => {
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, bucket: "" },
    });
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain("bucket");
  });

  it("should refuse a missing publicBaseUrl, because the link cannot be constructed from the endpoint", async () => {
    const s = { ...request().settings };
    delete s.publicBaseUrl;
    const r = await s3Publisher.publish({ ...request(), settings: s });
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain("publicBaseUrl");
  });

  it("should say WHERE a missing setting belongs, not only that it is missing", async () => {
    // A newsroom that put the two S3 keys in .env gets an enabled destination whose every
    // delivery refuses on settings. The refusal has to name the file and the key path the way
    // envHelp names where a credential is obtained, or the journalist has nowhere to go.
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, endpoint: "" },
    });
    expect(r).toMatchObject({ ok: false });
    const m = (r as { message: string }).message;
    expect(m).toContain("newsroom.json");
    expect(m).toContain('capabilities["embed-s3"].settings');
  });

  it("should refuse a prefix that climbs out of its own path, before any upload", async () => {
    // `..` in a prefix is signed literally but normalised away on the wire, so the server
    // recomputes a different canonical request and answers a cryptic SignatureDoesNotMatch 403
    // that says nothing about the prefix — and without that normalisation it would address an
    // object outside the bucket. Refuse it here, naming the setting.
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, prefix: "../evil" },
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("prefix");
  });

  it("should refuse a prefix with an empty segment, which would double a separator in the key", async () => {
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, prefix: "splash//embeds" },
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("prefix");
  });

  it("should still accept an ordinary prefix, slashes and all", async () => {
    // The guard must not refuse what F5's own URL tests already accept: the refusal below is
    // the CREDENTIAL one, i.e. execution went past the settings block.
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, prefix: "/splash/embeds/" },
      credentials: {},
    });
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain(
      "SPLASH_S3_ACCESS_KEY_ID",
    );
  });

  it("should refuse a malformed publicBaseUrl before any I/O, as it does for the endpoint", async () => {
    // Presence alone was checked, so a malformed base only surfaced AFTER the upload, as
    // "verifying … failed" — a config problem reported as a runtime one, past the point of no
    // return.
    const r = await s3Publisher.publish({
      ...request(),
      settings: { ...request().settings, publicBaseUrl: "embeds.example.org" },
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("publicBaseUrl");
  });

  it("should refuse missing credentials by naming the variable, never a value", async () => {
    const r = await s3Publisher.publish({ ...request(), credentials: {} });
    expect(r).toMatchObject({ ok: false });
    const m = (r as { message: string }).message;
    expect(m).toContain("SPLASH_S3_ACCESS_KEY_ID");
    expect(m).not.toContain("SECRET");
  });

  it("should refuse an unreadable artifact without attempting an upload", async () => {
    const r = await s3Publisher.publish({
      ...request(),
      artifactPath: "/definitely/not/here.html",
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
  });

  it("should honour the newsroom snippet template, like every other publisher", async () => {
    // Regression guard for L1's C3: settings is a shared bag, and a publisher that silently
    // ignores a field the caller filled ships the wrong snippet.
    //
    // Strengthened per the brief's own note: the original version paired a broken template
    // with an unreadable artifact, so it would have failed identically whether or not the
    // template ever reached the renderer — a test that passes either way proves nothing. This
    // version instead uses the DEFAULT (real, readable) artifactPath from request() and an
    // UNFILLABLE placeholder. That forces template validation to run — and refuse — BEFORE the
    // artifact is ever read or a byte touches the network, which is only possible if template
    // validation precedes the artifact read (Step 3 before Step 4). The refusal message must
    // name the exact placeholder, which only a publisher that actually threads
    // settings.snippetTemplate into renderSnippet() can produce.
    const r = await s3Publisher.publish({
      ...request(),
      settings: {
        ...request().settings,
        snippetTemplate: '<div data-splash="{utm_source}"></div>',
      },
    });
    expect(r).toMatchObject({ ok: false });
    expect((r as { message: string }).message).toContain("{utm_source}");
  });

  it("should declare itself as a hosted, implemented publisher", () => {
    expect(s3Publisher).toMatchObject({
      id: "embed-s3",
      kind: "hosted",
      implemented: true,
    });
  });
});

// Regression: before PublishRequest carried `format`, the adapter always PUT the artifact as
// "<id>.html" with a text/html content-type — a static PNG or an mp4 uploaded (and served) as
// if it were the interactive HTML build. global.fetch is mocked here (no real network, per the
// file's own offline-tests discipline) purely to observe the PUT the adapter would make — the
// live protocol itself (F1-F7) stays proven in Task 4.
describe("the s3 publisher's served filename and content-type (fetch mocked)", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  // Captures the PUT the adapter makes, and echoes the exact bytes it uploaded back on the
  // follow-up anonymous GET (F3) so the adapter's own byte-equality check passes.
  function mockFetch(): { url: string; contentType: string | undefined }[] {
    const puts: { url: string; contentType: string | undefined }[] = [];
    let uploaded: Uint8Array | undefined;
    globalThis.fetch = (async (
      url: string | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      if (init?.method === "PUT") {
        const headers = init.headers as Record<string, string>;
        uploaded = init.body as Uint8Array;
        puts.push({ url: String(url), contentType: headers["content-type"] });
        return new Response(null, { status: 200 });
      }
      return new Response(uploaded, { status: 200 });
    }) as typeof fetch;
    return puts;
  }

  it("serves a static artifact as .png with an image/png content-type", async () => {
    const puts = mockFetch();
    const r = await s3Publisher.publish({ ...request(), format: "static" });
    expect(r).toMatchObject({ ok: true });
    expect(puts).toHaveLength(1);
    expect(puts[0]!.url).toMatch(/\.png$/);
    expect(puts[0]!.contentType).toBe("image/png");
  });

  it("still serves an interactive artifact as .html with a text/html content-type", async () => {
    const puts = mockFetch();
    const r = await s3Publisher.publish({
      ...request(),
      format: "interactive",
    });
    expect(r).toMatchObject({ ok: true });
    expect(puts[0]!.url).toMatch(/\.html$/);
    expect(puts[0]!.contentType).toBe("text/html");
  });
});

// Bounded time — docs/superpowers/specs/2026-07-26-bounded-time-design.md. REAL servers, not a
// mocked clock: each one accepts the connection and then goes silent forever, which is exactly
// the failure mode neither the PUT nor the anonymous verification GET had any defence against
// before this. settings.timeoutMs/uploadTimeoutMs keep the proof fast (a few hundred ms) instead
// of waiting out the real 20s/120s defaults.
describe("the s3 publisher against a real hung endpoint", () => {
  function hungServer() {
    return Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Promise<Response>(() => {}), // accepts, never answers
    });
  }

  it("refuses instead of hanging when the PUT never gets a response", async () => {
    const server = hungServer();
    try {
      const start = Date.now();
      const r = await s3Publisher.publish(
        request({
          settings: {
            ...request().settings,
            endpoint: `http://127.0.0.1:${server.port}`,
            uploadTimeoutMs: "150",
          },
        }),
      );
      expect(Date.now() - start).toBeLessThan(2_000);
      expect(r).toMatchObject({ ok: false, code: "engine-failed" });
      expect((r as { message: string }).message).toContain(
        `http://127.0.0.1:${server.port}`,
      );
      expect((r as { message: string }).message).toContain("150");
    } finally {
      server.stop(true);
    }
  }, 3_000);

  it("refuses instead of hanging when the post-upload verification GET never gets a response", async () => {
    // The PUT itself succeeds against a normal, well-behaved endpoint — only the anonymous
    // verification GET (a DIFFERENT server, addressed by publicBaseUrl) hangs. This is the
    // realistic split: a newsroom's own S3-compatible endpoint answers uploads fine but the
    // public read path (a CDN, a reverse proxy) is what goes dark.
    const putOk = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Response(null, { status: 200 }),
    });
    const hungPublic = hungServer();
    try {
      const start = Date.now();
      const r = await s3Publisher.publish(
        request({
          settings: {
            ...request().settings,
            endpoint: `http://127.0.0.1:${putOk.port}`,
            publicBaseUrl: `http://127.0.0.1:${hungPublic.port}`,
            timeoutMs: "150",
          },
        }),
      );
      expect(Date.now() - start).toBeLessThan(2_000);
      expect(r).toMatchObject({ ok: false, code: "engine-failed" });
      expect((r as { message: string }).message).toContain(
        `http://127.0.0.1:${hungPublic.port}`,
      );
      expect((r as { message: string }).message).toContain("150");
    } finally {
      putOk.stop(true);
      hungPublic.stop(true);
    }
  }, 3_000);
});
