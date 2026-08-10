import { describe, expect, it } from "bun:test";
import { fetchWithTimeout } from "../scripts/fetch-document.mjs";

describe("fetchWithTimeout", () => {
  it("should return the body text when the response is ok", async () => {
    const fetchFn = async () =>
      new Response("<html>hi</html>", { status: 200 });
    const result = await fetchWithTimeout("https://example.test", { fetchFn });
    expect(result).toEqual({
      ok: true,
      status: 200,
      text: "<html>hi</html>",
      error: null,
    });
  });

  it("should report not ok with the status, and no body, on a non-2xx response", async () => {
    const fetchFn = async () => new Response("nope", { status: 404 });
    const result = await fetchWithTimeout("https://example.test/missing", {
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.text).toBe(null);
    expect(result.error).toContain("404");
  });

  it("should report not ok, never throw, when the network itself throws", async () => {
    const fetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND example.test");
    };
    const result = await fetchWithTimeout("https://example.test", { fetchFn });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(null);
    expect(result.error).toContain("ENOTFOUND");
  });

  // The one gotcha this file exists to guard: a fetchFn that never settles, and never even
  // honours the abort signal, must still make this function return — within roughly the bound,
  // not eventually. A slow real network is one failure mode; a fetch that plain hangs is another,
  // and only a race against a timer (not reliance on the callee's own good behaviour) closes it.
  it("should not hang past its timeout even when fetchFn never resolves and ignores the abort signal", async () => {
    const neverResolves = () => new Promise(() => {});
    const start = Date.now();
    const result = await fetchWithTimeout(
      "https://example.test/hangs-forever",
      {
        timeoutMs: 40,
        fetchFn: neverResolves,
      },
    );
    const elapsed = Date.now() - start;
    expect(result.ok).toBe(false);
    expect(result.error).toContain("timed out after 40ms");
    expect(elapsed).toBeLessThan(500); // generous ceiling; a real hang would run for seconds
  });

  it("should abort a well-behaved fetchFn's signal when the timeout fires", async () => {
    let sawAbort = false;
    const fetchFn = (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          sawAbort = true;
          reject(new Error("aborted"));
        });
      });
    const result = await fetchWithTimeout("https://example.test/slow", {
      timeoutMs: 30,
      fetchFn,
    });
    expect(sawAbort).toBe(true);
    expect(result.ok).toBe(false);
  });

  it("should send a descriptive user-agent, not an empty one a newsroom's ops team can't identify", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchFn = async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      capturedHeaders = init.headers;
      return new Response("ok", { status: 200 });
    };
    await fetchWithTimeout("https://example.test", { fetchFn });
    expect(capturedHeaders["user-agent"]).toContain("newsroom-charter");
  });

  it("should let a caller-supplied header pass through alongside the user-agent", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchFn = async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      capturedHeaders = init.headers;
      return new Response("ok", { status: 200 });
    };
    await fetchWithTimeout("https://example.test", {
      fetchFn,
      headers: { accept: "text/css" },
    });
    expect(capturedHeaders.accept).toBe("text/css");
    expect(capturedHeaders["user-agent"]).toBeDefined();
  });
});

describe("fetchWithTimeout against the real network", () => {
  // No API key, no secret — a bare GET is the whole contract, so this runs unconditionally,
  // the same way this repository's other live-network tests run when nothing needs skipping
  // (splash/test/keys.test.ts). It is written to be a useful assertion whether or not THIS
  // machine can currently reach the internet: a real page comes back ok with real HTML, or the
  // real network failure comes back as a structured, bounded verdict — never a hang, never a
  // thrown exception. Either outcome is the contract holding.
  it("should return a concrete, bounded verdict for a real URL", async () => {
    const start = Date.now();
    const result = await fetchWithTimeout("https://www.heidi.news/", {
      timeoutMs: 10000,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(11000);
    expect(typeof result.ok).toBe("boolean");
    if (result.ok) {
      expect(result.text).toContain("<html");
    } else {
      expect(typeof result.error).toBe("string");
    }
    console.log(
      `heidi.news fetch: ok=${result.ok} status=${result.status} elapsed=${elapsed}ms`,
    );
  }, 15000);
});
