// Offline tests: refusals and URL/key construction, which need no server. The network path
// (F1-F7, all measured against a real MinIO server — spec §5.1) is proven live in Task 4.
import { describe, it, expect } from "bun:test";
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
