// Every test here runs against a REAL HTTP server (Bun.serve), never a stubbed fetch. The
// network seam is real, so it gets a real server — one that replays the response shapes
// MEASURED against the live We.Publish instance (spec §3): a 200 carrying `errors`, a bare 413,
// a non-JSON body, a server that never answers.
import { describe, it, expect, afterEach } from "bun:test";
import { gqlCall, MAX_REQUEST_BODY_BYTES } from "./wepublish-gql";

type Served = {
  url: string;
  hits: number;
  bodies: string[];
  headers: Record<string, string>[];
  stop: () => void;
};

const servers: Served[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.stop();
});

function serve(
  handler: (req: Request, body: string) => Response | Promise<Response>,
): Served {
  const state = {
    hits: 0,
    bodies: [] as string[],
    headers: [] as Record<string, string>[],
  };
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const body = await req.text();
      state.hits += 1;
      state.bodies.push(body);
      state.headers.push(Object.fromEntries(req.headers.entries()));
      return handler(req, body);
    },
  });
  const served: Served = {
    url: `http://127.0.0.1:${server.port}/v1`,
    get hits() {
      return state.hits;
    },
    get bodies() {
      return state.bodies;
    },
    get headers() {
      return state.headers;
    },
    stop: () => server.stop(true),
  };
  servers.push(served);
  return served;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("gqlCall", () => {
  it("should return the data of a well-formed answer", async () => {
    const s = serve(() => json({ data: { article: { id: "a1" } } }));
    const r = await gqlCall({ endpoint: s.url, query: "{ article { id } }" });
    expect(r.ok).toBe(true);
    expect((r as { value: { data: unknown } }).value.data).toEqual({
      article: { id: "a1" },
    });
  });

  // W4 — the fact that shapes this whole module. A 2xx is not a success.
  it("should treat a 200 that carries errors as a FAILURE, naming the GraphQL message", async () => {
    const s = serve(() =>
      json({
        errors: [
          { message: "Forbidden resource", extensions: { code: "FORBIDDEN" } },
        ],
        data: null,
      }),
    );
    const r = await gqlCall({
      endpoint: s.url,
      query: "mutation { createArticle { id } }",
    });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("Forbidden resource");
  });

  it("should surface the GraphQL error message verbatim, so a caller can recognise 'not found' (W11)", async () => {
    const s = serve(() =>
      json({
        errors: [{ message: "Article with slug x was not found." }],
        data: null,
      }),
    );
    const r = await gqlCall({ endpoint: s.url, query: "{ article { id } }" });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain(
      "Article with slug x was not found.",
    );
  });

  // W14 — the ceiling is enforced BEFORE the socket, not discovered as an opaque 413.
  it("should refuse an oversized body without sending a single request", async () => {
    const s = serve(() => json({ data: {} }));
    const r = await gqlCall({
      endpoint: s.url,
      query: "mutation { x }",
      variables: { blob: "x".repeat(MAX_REQUEST_BODY_BYTES + 1) },
    });
    expect(r.ok).toBe(false);
    expect(s.hits).toBe(0);
    const m = (r as { message: string }).message;
    // The refusal has to be actionable: it names the size AND the limit.
    expect(m).toContain(String(MAX_REQUEST_BODY_BYTES));
    expect(m).toMatch(/too large|exceeds/i);
  });

  it("should translate a bare 413 into a refusal that explains the ceiling", async () => {
    const s = serve(() => new Response("", { status: 413 }));
    const r = await gqlCall({ endpoint: s.url, query: "mutation { x }" });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("413");
  });

  it("should refuse a non-JSON body instead of throwing", async () => {
    const s = serve(
      () => new Response("<html>502 upstream</html>", { status: 502 }),
    );
    const r = await gqlCall({ endpoint: s.url, query: "{ x }" });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("502");
  });

  it("should refuse a 200 whose body is not JSON", async () => {
    const s = serve(() => new Response("not json at all", { status: 200 }));
    const r = await gqlCall({ endpoint: s.url, query: "{ x }" });
    expect(r.ok).toBe(false);
  });

  // Bounded time: every outbound call in this substrate goes through fetchBounded.
  it("should bound a server that never answers, and say how long it waited", async () => {
    const s = serve(async () => {
      await new Promise((r) => setTimeout(r, 5_000));
      return json({ data: {} });
    });
    const r = await gqlCall({
      endpoint: s.url,
      query: "{ x }",
      timeoutMs: 120,
    });
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toContain("120");
  }, 10_000);

  it("should refuse an unreachable endpoint rather than throwing", async () => {
    const r = await gqlCall({
      // Port 1 on loopback: nothing listens, connection refused immediately.
      endpoint: "http://127.0.0.1:1/v1",
      query: "{ x }",
      timeoutMs: 2_000,
    });
    expect(r.ok).toBe(false);
  });

  it("should send the bearer token when given one", async () => {
    const s = serve(() => json({ data: { ok: true } }));
    await gqlCall({ endpoint: s.url, query: "{ x }", token: "tok-123" });
    expect(s.headers[0]!.authorization).toBe("Bearer tok-123");
  });

  // W13 — the verification read is anonymous. A client that always attached the token could
  // "verify" content that only an editor can see.
  it("should send NO authorization header when no token is given", async () => {
    const s = serve(() => json({ data: { ok: true } }));
    await gqlCall({ endpoint: s.url, query: "{ x }" });
    expect(s.headers[0]!.authorization).toBeUndefined();
  });

  it("should post the query and variables as the GraphQL JSON envelope", async () => {
    const s = serve(() => json({ data: {} }));
    await gqlCall({ endpoint: s.url, query: "{ x }", variables: { a: 1 } });
    expect(JSON.parse(s.bodies[0]!)).toEqual({
      query: "{ x }",
      variables: { a: 1 },
    });
  });
});
