import { describe, it, expect } from "bun:test";
import {
  searchInspiration,
  normaliseItems,
  INFOVIZ_API,
  MAX_QUERY_LENGTH,
} from "../scripts/search.mjs";

const RESET = "2026-09-14T00:00:00+00:00";

const ITEM = {
  title: "Mapping the floods that swallowed Pakistan",
  source: "Reuters Graphics",
  date: "2022-09-01T00:00:00+00:00",
  url: "https://example.org/floods-pakistan",
  image: "https://example.org/1.jpg",
};

function answer(items, { limit = "5", remaining = "4" } = {}) {
  return async () =>
    new Response(JSON.stringify({ query: "floods", items }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": limit,
        "x-ratelimit-remaining": remaining,
        "x-ratelimit-reset": RESET,
      },
    });
}

describe("searchInspiration", () => {
  it("should return the items and the quota the gallery reports", async () => {
    const result = await searchInspiration({
      query: "floods",
      fetchFn: answer([ITEM]),
    });
    expect(result).toEqual({
      ok: true,
      query: "floods",
      items: [ITEM],
      quota: { limit: 5, remaining: 4, resetsAt: RESET },
    });
  });

  it("should send one POST with the trimmed subject and its own user agent", async () => {
    const calls: { url: string; init: any }[] = [];
    const fetchFn = async (url, init) => {
      calls.push({ url: String(url), init });
      return answer([])();
    };
    await searchInspiration({ query: "  floods  ", fetchFn });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${INFOVIZ_API}/api/graphics/examples`);
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body)).toEqual({ query: "floods" });
    expect(calls[0].init.headers["user-agent"]).toStartWith(
      "splash-inspiration/",
    );
  });

  it("should refuse an empty subject without calling the gallery", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return answer([])();
    };
    expect(await searchInspiration({ query: "   ", fetchFn })).toEqual({
      ok: false,
      reason: "empty-query",
    });
    expect(called).toBe(false);
  });

  it("should refuse a subject longer than the gallery accepts without calling it", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return answer([])();
    };
    const result = await searchInspiration({
      query: "x".repeat(MAX_QUERY_LENGTH + 1),
      fetchFn,
    });
    expect(result).toEqual({
      ok: false,
      reason: "query-too-long",
      limit: MAX_QUERY_LENGTH,
    });
    expect(called).toBe(false);
  });

  it("should report the daily limit and its reset time on 429", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          error: "Daily query limit reached",
          limit: 5,
          resets_at: RESET,
          authenticated: false,
        }),
        {
          status: 429,
          headers: { "x-ratelimit-limit": "5", "x-ratelimit-remaining": "0" },
        },
      );
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "limit-reached",
      query: "floods",
      quota: { limit: 5, remaining: 0, resetsAt: RESET },
    });
  });

  it("should report an unexpected status as such", async () => {
    const fetchFn = async () => new Response("boom", { status: 500 });
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "unexpected-response",
      status: 500,
    });
  });

  it("should report a 200 that is not JSON as unexpected", async () => {
    const fetchFn = async () =>
      new Response("<html>challenge</html>", { status: 200 });
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "unexpected-response",
      status: 200,
    });
  });

  it("should report a fetch that throws as unreachable", async () => {
    const fetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND infoviz.design");
    };
    const result = await searchInspiration({ query: "floods", fetchFn });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unreachable");
    expect(result.detail).toContain("ENOTFOUND");
  });

  it("should give up on a request that never answers", async () => {
    const started = Date.now();
    const result = await searchInspiration({
      query: "floods",
      fetchFn: () => new Promise(() => {}),
      timeoutMs: 40,
    });
    expect(Date.now() - started).toBeLessThan(500);
    expect(result.reason).toBe("unreachable");
    expect(result.detail).toMatch(/timed out/);
  });

  it("should give up on a body that never finishes", async () => {
    const started = Date.now();
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => new Promise(() => {}),
    });
    const result = await searchInspiration({
      query: "floods",
      fetchFn,
      timeoutMs: 40,
    });
    expect(Date.now() - started).toBeLessThan(500);
    expect(result.reason).toBe("unreachable");
  });
});

describe("normaliseItems", () => {
  it("should keep only items with a title and an http(s) link", () => {
    const items = normaliseItems([
      ITEM,
      { ...ITEM, title: "" },
      { ...ITEM, url: "javascript:alert(1)" },
      { ...ITEM, url: undefined },
      null,
    ]);
    expect(items).toEqual([ITEM]);
  });

  it("should blank an image that is not an http(s) URL", () => {
    expect(
      normaliseItems([{ ...ITEM, image: "data:image/png;base64,AAAA" }])[0]
        .image,
    ).toBeNull();
  });

  it("should turn a missing newsroom and date into null", () => {
    const [item] = normaliseItems([
      { title: "A", url: "https://example.org/a" },
    ]);
    expect(item).toEqual({
      title: "A",
      source: null,
      date: null,
      url: "https://example.org/a",
      image: null,
    });
  });

  it("should answer an empty list for anything that is not an array", () => {
    expect(normaliseItems(undefined)).toEqual([]);
    expect(normaliseItems({ items: [] })).toEqual([]);
  });
});
