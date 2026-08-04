// The DIRECT INSERTION branch, against a real HTTP server replaying We.Publish's measured
// response shapes — the same discipline as wepublish-network.test.ts, which covers the carrier.
//
// What this file exists to hold still is the difference between the two paths. The carrier
// article belongs to Splash: it may be hidden, rewritten and PUBLISHED. The target article
// belongs to the newsroom, and the tests below are the guarantees that Splash treats it that
// way — it never creates one, never publishes one, never writes a partial one.
import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { wepublishPublisher } from "./wepublish";
import { ownershipMarker } from "./wepublish-block";
import type { PublishRequest } from "../../core/publishers";

const DOC = "<!doctype html><html><body><p>visual</p></body></html>";

type Call = { operation: string; variables: Record<string, unknown> };

function operationOf(query: string): string {
  return (
    /mutation\s+(\w+)|query\s+(\w+)/.exec(query)?.slice(1).find(Boolean) ?? "?"
  );
}

/** A CMS holding ONE editorial article, with whatever blocks the test gives it. */
function fakeCms(
  opts: { blocks?: unknown[]; missing?: boolean; swallowWrite?: boolean } = {},
) {
  const calls: Call[] = [];
  let blocks = opts.blocks ?? [
    { __typename: "TitleBlock", title: "Annemasse" },
    { __typename: "RichTextBlock", richText: [{ type: "paragraph" }] },
  ];
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const body = (await req.json()) as {
        query: string;
        variables?: Record<string, unknown>;
      };
      const op = operationOf(body.query);
      calls.push({ operation: op, variables: body.variables ?? {} });
      const json = (p: unknown) =>
        new Response(JSON.stringify(p), {
          headers: { "content-type": "application/json" },
        });

      if (op === "SplashLogin")
        return json({ data: { createSession: { token: "session-token" } } });

      if (op === "SplashFindTarget") {
        if (opts.missing)
          // W11: a missing slug is HTTP 200 plus this exact GraphQL error.
          return json({
            errors: [
              {
                message: `Article with slug ${body.variables?.slug} was not found.`,
              },
            ],
            data: null,
          });
        return json({
          data: {
            article: {
              id: "art-1",
              url: "https://cms.example.org/a/annemasse",
              slug: "annemasse",
              likes: 3,
              shared: false,
              hidden: false,
              disableComments: true,
              tags: [{ id: "t-1" }],
              draft: {
                title: "Annemasse",
                hideAuthor: false,
                breaking: false,
                authors: [{ id: "a-1" }],
                socialMediaAuthors: [],
                properties: [],
                blocks,
              },
              published: null,
            },
          },
        });
      }

      if (op === "SplashInsert") {
        // A server that answers "written" and stores nothing — the shape a sanitising layer
        // or a silently-dropped field produces. Measured behaviour W8 is the same family:
        // the response is not evidence that the write landed.
        if (opts.swallowWrite)
          return json({
            data: {
              updateArticle: {
                id: "art-1",
                slug: "annemasse",
                url: "https://cms.example.org/a/annemasse",
              },
            },
          });
        blocks = (body.variables?.blocks as { html?: { html: string } }[]).map(
          (b) =>
            b.html
              ? { __typename: "HTMLBlock", html: b.html.html }
              : { __typename: "TitleBlock", title: "Annemasse" },
        );
        return json({
          data: {
            updateArticle: {
              id: "art-1",
              slug: "annemasse",
              url: "https://cms.example.org/a/annemasse",
            },
          },
        });
      }
      return json({ errors: [{ message: `unexpected operation ${op}` }] });
    },
  });
  return {
    url: `http://localhost:${server.port}`,
    calls,
    stop: () => server.stop(true),
  };
}

let running: { stop: () => void } | undefined;
afterEach(() => {
  running?.stop();
  running = undefined;
});

function request(endpoint: string, overrides = {}): PublishRequest {
  const dir = mkdtempSync(join(tmpdir(), "splash-insert-"));
  const artifact = join(dir, "interactive.html");
  writeFileSync(artifact, DOC);
  return {
    artifactPath: artifact,
    id: "primes",
    format: "interactive",
    metadata: {
      title: "Les primes",
      altText: "A",
      source: "S",
      credit: "C",
      lang: "fr",
    },
    settings: {
      endpoint,
      targetArticleSlug: "annemasse",
      ...overrides,
    },
    credentials: {
      SPLASH_WEPUBLISH_EMAIL: "splash@example.org",
      SPLASH_WEPUBLISH_PASSWORD: "pw",
    },
    outDir: dir,
  } as PublishRequest;
}

describe("wepublish direct insertion", () => {
  it("should append the visual to the journalist's article and return ITS url", async () => {
    const cms = fakeCms();
    running = cms;
    const r = await wepublishPublisher.publish(request(cms.url));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.url).toBe("https://cms.example.org/a/annemasse");
    const insert = cms.calls.find((c) => c.operation === "SplashInsert")!;
    const written = insert.variables.blocks as Record<string, unknown>[];
    expect(written).toHaveLength(3);
    expect(Object.keys(written[0]!)).toEqual(["title"]);
    expect(Object.keys(written[1]!)).toEqual(["richText"]);
    expect(Object.keys(written[2]!)).toEqual(["html"]);
  });

  it("should NEVER publish the journalist's article", async () => {
    // The carrier path publishes as its final step. Doing that here would push an editorial
    // document live because someone added a chart to it.
    const cms = fakeCms();
    running = cms;
    await wepublishPublisher.publish(request(cms.url));
    expect(cms.calls.map((c) => c.operation)).not.toContain("SplashPublish");
  });

  it("should carry the article's own flags and lists back, not defaults", async () => {
    const cms = fakeCms();
    running = cms;
    await wepublishPublisher.publish(request(cms.url));
    const v = cms.calls.find((c) => c.operation === "SplashInsert")!.variables;
    expect(v.hidden).toBe(false);
    expect(v.disableComments).toBe(true);
    expect(v.tagIds).toEqual(["t-1"]);
    expect(v.authorIds).toEqual(["a-1"]);
    expect(v.likes).toBe(3);
    expect(v.title).toBe("Annemasse");
  });

  it("should REFUSE a slug that names no article, and create nothing", async () => {
    const cms = fakeCms({ missing: true });
    running = cms;
    const r = await wepublishPublisher.publish(request(cms.url));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid-request");
    expect(r.message).toContain("annemasse");
    expect(cms.calls.map((c) => c.operation)).not.toContain("SplashCreate");
    expect(cms.calls.map((c) => c.operation)).not.toContain("SplashInsert");
  });

  it("should REFUSE, without writing, an article holding a block it cannot echo", async () => {
    const cms = fakeCms({
      blocks: [
        { __typename: "TitleBlock", title: "Annemasse" },
        { __typename: "ListicleBlock", items: [] },
      ],
    });
    running = cms;
    const r = await wepublishPublisher.publish(request(cms.url));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("ListicleBlock");
    // The refusal is worth nothing if the write already went out.
    expect(cms.calls.map((c) => c.operation)).not.toContain("SplashInsert");
  });

  it("should replace its own earlier block in place on a second delivery", async () => {
    const cms = fakeCms({
      blocks: [
        { __typename: "TitleBlock", title: "Annemasse" },
        {
          __typename: "HTMLBlock",
          html: `<div ${ownershipMarker("primes")}>old</div>`,
        },
        { __typename: "RichTextBlock", richText: [] },
      ],
    });
    running = cms;
    const r = await wepublishPublisher.publish(request(cms.url));
    expect(r.ok).toBe(true);
    const written = cms.calls.find((c) => c.operation === "SplashInsert")!
      .variables.blocks as Record<string, Record<string, string>>[];
    // Still three blocks, and ours is still the SECOND — the journalist put it there.
    expect(written).toHaveLength(3);
    expect(Object.keys(written[1]!)).toEqual(["html"]);
    expect(written[1]!.html!.html).not.toContain("old");
  });

  it("should REFUSE when the write reports success but the draft does not carry the visual", async () => {
    const cms = fakeCms({ swallowWrite: true });
    running = cms;
    const r = await wepublishPublisher.publish(request(cms.url));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("nothing was inserted");
  });

  it("should leave the carrier path untouched when no target is named", async () => {
    // The two modes are exclusive: without targetArticleSlug this is the carrier flow, which
    // looks up its own deterministic slug. Proven by the operation it reaches for.
    const cms = fakeCms();
    running = cms;
    const req = request(cms.url);
    delete (req.settings as Record<string, string>).targetArticleSlug;
    await wepublishPublisher.publish(req);
    expect(cms.calls.map((c) => c.operation)).toContain("SplashFind");
    expect(cms.calls.map((c) => c.operation)).not.toContain("SplashFindTarget");
  });
});
