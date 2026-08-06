import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  registerPublisher,
  resetPublishersForTest,
  type Publisher,
  type PublishRequest,
} from "../publishers";
import { publish, runVerb } from "./index";
import { ok } from "./types";
import { VISUAL_FORMATS } from "../vocabulary";

const NEVER_CREATED = join(tmpdir(), "splash-publish-must-not-exist");

function request(overrides: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: join(import.meta.dir, "publish.test.ts"),
    id: "e1",
    format: "interactive",
    metadata: {
      title: "T",
      altText: "A",
      source: "S",
      credit: "C",
      lang: "en",
    },
    settings: {},
    credentials: {},
    outDir: NEVER_CREATED,
    ...overrides,
  };
}

function publisher(over: Partial<Publisher> & { id: string }): Publisher {
  return {
    kind: "package",
    serves: [...VISUAL_FORMATS],
    implemented: true,
    publish: async () =>
      ok({
        publisherId: over.id,
        kind: "package" as const,
        path: "/tmp/x.zip",
        snippet: "<iframe></iframe>",
        publishedAt: "1980-01-01T00:00:00.000Z",
      }),
    ...over,
  } as Publisher;
}

describe("the publish verb", () => {
  beforeEach(() => resetPublishersForTest());
  // The registry is global and `bun test` shares one process across files: without this, the
  // last test's stub publishers outlive the file and land in whatever runs next. Clean up
  // after yourself — the composition root is idempotent now, but a file that leaves state
  // behind is still a file whose neighbours pass or fail by ordering luck.
  afterAll(() => resetPublishersForTest());

  it("should refuse a path-unsafe id before any adapter is reached", async () => {
    // An adapter that throws if invoked is the clean way to prove "never reached" — if the
    // path-safety check ran AFTER dispatch instead of before, this test would fail with
    // engine-failed/"must not be called", not invalid-request.
    registerPublisher(
      publisher({
        id: "zip",
        publish: async () => {
          throw new Error("adapter must not be called for an unsafe id");
        },
      }),
    );
    const r = await runVerb("publish", {
      ...request({ id: "../../evil" }),
      settings: { publisherId: "zip" },
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("../../evil");
  });

  it("should refuse an id no adapter registered, with unknown-publisher", async () => {
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "embed-nowhere" },
    });
    expect(r).toMatchObject({ ok: false, code: "unknown-publisher" });
    expect((r as { message: string }).message).toContain("embed-nowhere");
    expect(existsSync(NEVER_CREATED)).toBe(false);
  });

  it("should name the omitted field when no destination was given at all", async () => {
    // A missing publisherId is a MALFORMED request, not an unknown destination: answering
    // `no publisher registered as "undefined"` tells a host nothing about what to fix.
    const r = await runVerb("publish", request());
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("publisherId");
  });

  it("should refuse a declared-but-unimplemented publisher without touching the filesystem", async () => {
    registerPublisher(publisher({ id: "embed-nowhere", implemented: false }));
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "embed-nowhere" },
    });
    expect(r).toMatchObject({ ok: false, code: "not-implemented" });
    expect(existsSync(NEVER_CREATED)).toBe(false);
  });

  it("should refuse a payload missing a required field, with invalid-request", async () => {
    const { artifactPath, ...incomplete } = request();
    const r = await runVerb("publish", incomplete);
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should turn an adapter that throws into engine-failed, never a thrown error", async () => {
    registerPublisher(
      publisher({
        id: "zip",
        publish: async () => {
          throw new Error("boom");
        },
      }),
    );
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "zip" },
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain("boom");
  });

  it("should turn a rejecting adapter into engine-failed even called directly, bypassing runVerb (I1)", async () => {
    registerPublisher(
      publisher({
        id: "zip-direct",
        publish: () => Promise.reject(new Error("direct-boom")),
      }),
    );
    const r = await publish({
      ...request(),
      settings: { publisherId: "zip-direct" },
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain("direct-boom");
  });

  it("should return an outcome that survives a JSON round trip (I6)", async () => {
    registerPublisher(publisher({ id: "zip" }));
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "zip" },
    });
    expect(r.ok).toBe(true);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
