import { describe, it, expect, beforeEach } from "bun:test";
import {
  registerPublisher,
  lookupPublisher,
  allPublishers,
  resetPublishersForTest,
  deliveryGenreFor,
  fetchBounded,
  NetworkTimeoutError,
  type Publisher,
} from "./publishers";
import { ok } from "./verbs/types";
import { VISUAL_FORMATS } from "./vocabulary";

function stub(id: string, implemented = true): Publisher {
  return {
    id,
    kind: "package",
    serves: [...VISUAL_FORMATS],
    implemented,
    publish: async () =>
      ok({
        publisherId: id,
        kind: "package" as const,
        path: "/tmp/x.zip",
        snippet: "",
        publishedAt: "1980-01-01T00:00:00.000Z",
      }),
  };
}

describe("publisher registry", () => {
  beforeEach(() => resetPublishersForTest());

  it("should return the publisher that was registered under its id", () => {
    const p = stub("zip");
    registerPublisher(p);
    expect(lookupPublisher("zip")).toBe(p);
  });

  it("should return undefined for an id nobody registered", () => {
    expect(lookupPublisher("embed-nowhere")).toBeUndefined();
  });

  it("should throw on a duplicate id rather than shadow the first registration", () => {
    registerPublisher(stub("zip"));
    expect(() => registerPublisher(stub("zip"))).toThrow(
      "publisher already registered: zip",
    );
  });

  it("should list every registered publisher, declared-but-unimplemented ones included", () => {
    registerPublisher(stub("zip"));
    registerPublisher(stub("embed-fly", false));
    expect(
      allPublishers()
        .map((p) => p.id)
        .sort(),
    ).toEqual(["embed-fly", "zip"]);
  });
});

describe("deliveryGenreFor", () => {
  it("should deliver a static image and a video as a file", () => {
    expect(deliveryGenreFor("static")).toBe("file");
    expect(deliveryGenreFor("video")).toBe("file");
  });

  it("should deliver an interactive and a scrolly as an embed", () => {
    expect(deliveryGenreFor("interactive")).toBe("embed");
    expect(deliveryGenreFor("scrolly")).toBe("embed");
  });

  it("should answer for every format in the vocabulary", () => {
    for (const f of VISUAL_FORMATS)
      expect(["file", "embed"]).toContain(deliveryGenreFor(f));
  });
});

describe("fetchBounded", () => {
  // A REAL server that accepts the connection and then goes silent forever — not a mocked
  // clock. If fetchBounded had no bound, this test itself would hang until the runner's own
  // timeout, which is exactly the failure mode this mechanism exists to close.
  function hungServer() {
    return Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Promise<Response>(() => {}), // never resolves, never rejects
    });
  }

  it("should refuse with a NetworkTimeoutError instead of hanging when the endpoint never responds", async () => {
    const server = hungServer();
    try {
      const start = Date.now();
      let caught: unknown;
      try {
        await fetchBounded(`http://127.0.0.1:${server.port}/`, {}, 200);
      } catch (e) {
        caught = e;
      }
      const elapsed = Date.now() - start;
      expect(caught).toBeInstanceOf(NetworkTimeoutError);
      // Fires at the bound, not "eventually" — proves the abort actually happened rather than
      // some unrelated rejection racing it.
      expect(elapsed).toBeLessThan(2_000);
    } finally {
      server.stop(true);
    }
  });

  it("should name the endpoint and the bound in the refusal message", async () => {
    const server = hungServer();
    try {
      const url = `http://127.0.0.1:${server.port}/`;
      let message = "";
      try {
        await fetchBounded(url, {}, 150);
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toContain(url);
      expect(message).toContain("150");
    } finally {
      server.stop(true);
    }
  });

  it("should resolve normally when the endpoint answers well inside the bound", async () => {
    const server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: () => new Response("ok"),
    });
    try {
      const res = await fetchBounded(
        `http://127.0.0.1:${server.port}/`,
        {},
        5_000,
      );
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("ok");
    } finally {
      server.stop(true);
    }
  });
});
