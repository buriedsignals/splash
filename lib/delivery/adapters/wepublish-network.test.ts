// The network path, against a REAL HTTP server that replays the response shapes measured
// against the live instance (spec §3) — including the pathological ones. Not a mock of the
// protocol: a server that answers what We.Publish answered.
//
// The live proof against the real CMS is wepublish-e2e.test.ts; this file is what keeps the
// branch coverage (the ownership refusal, the update-vs-create decision, a lying verification)
// runnable without standing a CMS up.
import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { wepublishPublisher } from "./wepublish";
import { ownershipMarker } from "./wepublish-block";
import type { PublishRequest } from "../../core/publishers";

const DOC = "<!doctype html><html><body><p>visual</p></body></html>";

type Call = {
  operation: string;
  query: string;
  variables: Record<string, unknown>;
  auth?: string;
};

type Fake = {
  url: string;
  calls: Call[];
  stop: () => void;
  /** The html the fake will serve back as the published revision. Defaults to what was written. */
  serveInstead?: string;
};

type FakeOptions = {
  /** An article already sitting at the carrier slug. */
  existing?: { id: string; url: string; html?: string };
  /** Serve something else back at verification time, to prove the check has teeth. */
  serveInstead?: string;
  /** Make the verification read report no published revision at all. */
  serveNothing?: boolean;
};

function operationOf(query: string): string {
  return (
    /mutation\s+(\w+)|query\s+(\w+)/.exec(query)?.slice(1).find(Boolean) ?? "?"
  );
}

function fakeWePublish(opts: FakeOptions = {}): Fake {
  const calls: Call[] = [];
  let stored: string | undefined = opts.existing?.html;
  const id = opts.existing?.id ?? "art-created";
  const url = opts.existing?.url ?? "https://cms.example.org/a/splash-primes";
  let exists = !!opts.existing;

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const body = (await req.json()) as {
        query: string;
        variables?: Record<string, unknown>;
      };
      const op = operationOf(body.query);
      calls.push({
        operation: op,
        query: body.query,
        variables: body.variables ?? {},
        auth: req.headers.get("authorization") ?? undefined,
      });
      const json = (payload: unknown) =>
        new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" },
        });

      if (op === "SplashLogin")
        return json({ data: { createSession: { token: "session-token" } } });

      if (op === "SplashFind") {
        if (!exists)
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
              id,
              url,
              draft: { blocks: [{ __typename: "HTMLBlock", html: stored }] },
              published: null,
            },
          },
        });
      }

      if (op === "SplashCreate") {
        stored = (body.variables?.blocks as { html: { html: string } }[])[0]!
          .html.html;
        exists = true;
        return json({
          data: { createArticle: { id, slug: body.variables?.slug, url } },
        });
      }

      if (op === "SplashUpdate") {
        stored = (body.variables?.blocks as { html: { html: string } }[])[0]!
          .html.html;
        return json({
          data: { updateArticle: { id, slug: body.variables?.slug, url } },
        });
      }

      if (op === "SplashPublish")
        return json({
          data: {
            publishArticle: { id, url, publishedAt: body.variables?.at },
          },
        });

      if (op === "SplashVerify")
        return json({
          data: {
            article: {
              id,
              url,
              publishedAt: new Date().toISOString(),
              published: opts.serveNothing
                ? { blocks: [] }
                : {
                    blocks: [
                      {
                        __typename: "HTMLBlock",
                        html: opts.serveInstead ?? stored,
                      },
                    ],
                  },
            },
          },
        });

      return json({ errors: [{ message: `unexpected operation ${op}` }] });
    },
  });

  const fake: Fake = {
    url: `http://127.0.0.1:${server.port}/v1`,
    get calls() {
      return calls;
    },
    stop: () => server.stop(true),
  };
  fakes.push(fake);
  return fake;
}

const fakes: Fake[] = [];
afterEach(() => {
  for (const f of fakes.splice(0)) f.stop();
});

function request(
  endpoint: string,
  over: Partial<PublishRequest> = {},
): PublishRequest {
  const dir = mkdtempSync(join(tmpdir(), "wp-net-"));
  const p = join(dir, "interactive.html");
  writeFileSync(p, DOC);
  return {
    artifactPath: p,
    id: "primes",
    format: "interactive",
    metadata: {
      title: "Les primes montent",
      altText: "Les primes montent de 2015 à 2024",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
    },
    settings: { publisherId: "embed-cms", endpoint },
    credentials: {
      SPLASH_WEPUBLISH_EMAIL: "splash@newsroom.example",
      SPLASH_WEPUBLISH_PASSWORD: "hunter2",
    },
    outDir: dir,
    ...over,
  };
}

describe("wepublish network path", () => {
  it("should create a carrier article when none exists, then publish it", async () => {
    const fake = fakeWePublish();
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(true);
    const ops = fake.calls.map((c) => c.operation);
    expect(ops).toEqual([
      "SplashLogin",
      "SplashFind",
      "SplashCreate",
      "SplashPublish",
      "SplashVerify",
    ]);
  });

  // W10 + W12: duplicate slugs are accepted by the server, so the adapter must never create a
  // second article at a slug it already owns — that is what keeps the URL stable across a
  // revision instead of forking it.
  it("should UPDATE, not create, when its own carrier already sits at the slug", async () => {
    const fake = fakeWePublish({
      existing: {
        id: "art-1",
        url: "https://cms.example.org/a/splash-primes",
        html: `${ownershipMarker("primes")}\n<iframe></iframe>`,
      },
    });
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(true);
    const ops = fake.calls.map((c) => c.operation);
    expect(ops).toContain("SplashUpdate");
    expect(ops).not.toContain("SplashCreate");
  });

  // The refusal of spec §4.2 — the analogue of the S3 adapter declining to rewrite a bucket
  // policy. The important half is that NOTHING is written.
  it("should REFUSE to overwrite an article it does not own, without writing anything", async () => {
    const fake = fakeWePublish({
      existing: {
        id: "art-newsroom",
        url: "https://cms.example.org/a/splash-primes",
        html: "<p>Un papier de la rédaction.</p>",
      },
    });
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(
      /does not own|not created by Splash/i,
    );
    const ops = fake.calls.map((c) => c.operation);
    expect(ops).not.toContain("SplashCreate");
    expect(ops).not.toContain("SplashUpdate");
    expect(ops).not.toContain("SplashPublish");
  });

  it("should refuse a carrier belonging to a DIFFERENT Splash element", async () => {
    const fake = fakeWePublish({
      existing: {
        id: "art-other",
        url: "https://cms.example.org/a/splash-primes",
        html: `${ownershipMarker("autre-element")}\n<iframe></iframe>`,
      },
    });
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(false);
    expect(fake.calls.map((c) => c.operation)).not.toContain("SplashUpdate");
  });

  // W7 — the crash that returns `data: null` while the write already happened (W8) is avoided
  // by never asking for blocks on a mutation in the first place.
  it("should never select blocks in a write mutation", async () => {
    const fake = fakeWePublish();
    await wepublishPublisher.publish(request(fake.url));
    for (const c of fake.calls) {
      if (c.operation === "SplashCreate" || c.operation === "SplashUpdate")
        expect(c.query).not.toContain("blocks {");
    }
  });

  // W13 — the verification must see what the PUBLIC sees.
  it("should read back anonymously, with no authorization header", async () => {
    const fake = fakeWePublish();
    await wepublishPublisher.publish(request(fake.url));
    const verify = fake.calls.find((c) => c.operation === "SplashVerify")!;
    expect(verify.auth).toBeUndefined();
    // ...while the writes did carry the session.
    expect(fake.calls.find((c) => c.operation === "SplashCreate")!.auth).toBe(
      "Bearer session-token",
    );
  });

  it("should refuse when the CMS serves different content than was sent", async () => {
    const fake = fakeWePublish({
      serveInstead: "<p>something else entirely</p>",
    });
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/different content/i);
  });

  it("should refuse when the published revision serves no HTML block at all", async () => {
    const fake = fakeWePublish({ serveNothing: true });
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/serves no HTML block/i);
  });

  // W9 — never construct the URL.
  it("should report the URL the server returned, not one it built", async () => {
    const fake = fakeWePublish({
      existing: {
        id: "art-1",
        // Deliberately unlike anything the adapter could derive from the slug.
        url: "https://journal.example.net/histoires/2026/quelque-chose",
        html: `${ownershipMarker("primes")}\n<iframe></iframe>`,
      },
    });
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(true);
    expect((r as { value: { url: string } }).value.url).toBe(
      "https://journal.example.net/histoires/2026/quelque-chose",
    );
  });

  it("should carry the artifact into the block, wrapped and marked", async () => {
    const fake = fakeWePublish();
    await wepublishPublisher.publish(request(fake.url));
    const create = fake.calls.find((c) => c.operation === "SplashCreate")!;
    const html = (create.variables.blocks as { html: { html: string } }[])[0]!
      .html.html;
    expect(html).toContain(ownershipMarker("primes"));
    // The whole document travelled inside the srcdoc attribute. `<` and `>` are legal in an
    // attribute value and are deliberately NOT escaped (it keeps the payload smaller against
    // the 1 MiB ceiling), so the document appears verbatim here.
    expect(html).toContain(`srcdoc="${DOC}"`);
  });

  it("should hand back no snippet — the visual is already placed in the CMS", async () => {
    const fake = fakeWePublish();
    const r = await wepublishPublisher.publish(request(fake.url));
    expect(r.ok).toBe(true);
    expect(
      (r as { value: { snippet?: string } }).value.snippet,
    ).toBeUndefined();
  });

  it("should honour a configured slugPrefix", async () => {
    const fake = fakeWePublish();
    await wepublishPublisher.publish(
      request(fake.url, {
        settings: {
          publisherId: "embed-cms",
          endpoint: fake.url,
          slugPrefix: "viz-",
        },
      }),
    );
    expect(
      fake.calls.find((c) => c.operation === "SplashFind")!.variables.slug,
    ).toBe("viz-primes");
  });

  // W4 — a sign-in failure comes back as HTTP 200 with errors, and must not be read as success.
  it("should refuse when sign-in fails, naming what to check", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: "Forbidden resource",
                extensions: { code: "FORBIDDEN" },
              },
            ],
            data: null,
          }),
          { headers: { "content-type": "application/json" } },
        ),
    });
    try {
      const r = await wepublishPublisher.publish(
        request(`http://127.0.0.1:${server.port}/v1`),
      );
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toContain(
        "SPLASH_WEPUBLISH_EMAIL",
      );
    } finally {
      server.stop(true);
    }
  });
});
