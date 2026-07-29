import { describe, it, expect } from "bun:test";
import {
  collectSiteSources,
  normalizeSiteUrl,
  stylesheetHrefs,
} from "./charter-fetch";

/** A fetch that serves a fixed map of URLs and refuses everything else. */
function fakeFetch(pages: Record<string, string>): typeof fetch {
  return (async (input: string | URL) => {
    const url = String(input);
    const body = pages[url];
    if (body === undefined)
      return new Response("nope", { status: 404, statusText: "Not Found" });
    return new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
}

describe("normalizeSiteUrl", () => {
  it("should add https to a bare host", () => {
    expect(normalizeSiteUrl("heidi.news")).toBe("https://heidi.news/");
  });

  it("should refuse a non-http scheme", () => {
    expect(normalizeSiteUrl("file:///etc/passwd")).toBeNull();
    expect(normalizeSiteUrl("data:text/html,<b>")).toBeNull();
  });

  it("should refuse something that is not a host", () => {
    expect(normalizeSiteUrl("localhost")).toBeNull();
    expect(normalizeSiteUrl("   ")).toBeNull();
  });
});

describe("normalizeSiteUrl — server-side request forgery", () => {
  it("should refuse the loopback and the cloud metadata address", () => {
    expect(normalizeSiteUrl("http://127.0.0.1/")).toBeNull();
    expect(normalizeSiteUrl("http://169.254.169.254/")).toBeNull();
  });

  it("should refuse the private ranges", () => {
    expect(normalizeSiteUrl("http://192.168.1.1/")).toBeNull();
    expect(normalizeSiteUrl("http://10.0.0.5/")).toBeNull();
    expect(normalizeSiteUrl("http://172.16.4.4/")).toBeNull();
  });

  it("should refuse a rebinding host that embeds a private quad", () => {
    expect(normalizeSiteUrl("http://10.0.0.5.nip.io/")).toBeNull();
    expect(normalizeSiteUrl("http://127-0-0-1.nip.io/")).toBeNull();
  });

  it("should refuse an IPv6 literal and a .internal name", () => {
    expect(normalizeSiteUrl("http://[::1]/")).toBeNull();
    expect(normalizeSiteUrl("http://metadata.internal/")).toBeNull();
  });

  it("should still accept an ordinary newsroom host", () => {
    expect(normalizeSiteUrl("https://www.heidi.news")).toBe(
      "https://www.heidi.news/",
    );
  });
});

describe("collectSiteSources — redirects", () => {
  it("should refuse a public host that bounces to the loopback", async () => {
    const fetchImpl = (async () => {
      const res = new Response("<html>secrets</html>", { status: 200 });
      Object.defineProperty(res, "url", { value: "http://127.0.0.1/admin" });
      return res;
    }) as unknown as typeof fetch;
    const got = await collectSiteSources("https://example.org/", { fetchImpl });
    expect("error" in got).toBe(true);
    if ("error" in got) expect(got.error).toContain("non-public");
  });

  it("should keep the site's own stylesheets across an apex to www redirect", async () => {
    const fetchImpl = (async (input: string | URL) => {
      const u = String(input);
      if (u === "https://heidi.news/") {
        const res = new Response('<link rel="stylesheet" href="/a.css">', {
          status: 200,
        });
        Object.defineProperty(res, "url", { value: "https://www.heidi.news/" });
        return res;
      }
      if (u === "https://www.heidi.news/a.css")
        return new Response("a{color:#d5121e}", { status: 200 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const got = await collectSiteSources("https://heidi.news/", { fetchImpl });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets.length).toBe(1);
    expect(got.url).toBe("https://www.heidi.news/");
  });
});

describe("stylesheetHrefs", () => {
  it("should resolve a relative href against the page", () => {
    const html = '<link rel="stylesheet" href="/css/site.css">';
    expect(stylesheetHrefs(html, "https://example.org/")).toEqual([
      "https://example.org/css/site.css",
    ]);
  });

  it("should drop a third-party stylesheet", () => {
    const html =
      '<link rel="stylesheet" href="https://cdn.ads.example/consent.css">';
    expect(stylesheetHrefs(html, "https://example.org/")).toEqual([]);
  });

  it("should ignore a link that is not a stylesheet", () => {
    const html = '<link rel="icon" href="/favicon.ico">';
    expect(stylesheetHrefs(html, "https://example.org/")).toEqual([]);
  });
});

describe("collectSiteSources", () => {
  it("should return the page and its same-host stylesheets", async () => {
    const html = '<link rel="stylesheet" href="/a.css">';
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: fakeFetch({
        "https://example.org/": html,
        "https://example.org/a.css": "a{color:#c8102e}",
      }),
    });
    expect("error" in got).toBe(false);
    if ("error" in got) return;
    expect(got.sheets.length).toBe(1);
    expect(got.sheets[0]!.css).toContain("#c8102e");
  });

  it("should keep the page when a stylesheet fails, and say which one", async () => {
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: fakeFetch({
        "https://example.org/": '<link rel="stylesheet" href="/gone.css">',
      }),
    });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets).toEqual([]);
    expect(got.notes.join(" ")).toContain("gone.css");
  });

  it("should return an error instead of throwing when the site is unreachable", async () => {
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: (() => {
        throw new Error("ENOTFOUND");
      }) as unknown as typeof fetch,
    });
    expect("error" in got).toBe(true);
  });

  it("should refuse a URL that is not a site before touching the network", async () => {
    let called = false;
    const got = await collectSiteSources("file:///etc/passwd", {
      fetchImpl: (async () => {
        called = true;
        return new Response("");
      }) as unknown as typeof fetch,
    });
    expect(called).toBe(false);
    expect("error" in got).toBe(true);
  });

  it("should cap how many stylesheets it reads and say it did", async () => {
    const links = Array.from(
      { length: 4 },
      (_, i) => `<link rel="stylesheet" href="/s${i}.css">`,
    ).join("");
    const pages: Record<string, string> = { "https://example.org/": links };
    for (let i = 0; i < 4; i++)
      pages[`https://example.org/s${i}.css`] = `a{color:#00000${i}}`;
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: fakeFetch(pages),
      maxSheets: 2,
    });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets.length).toBe(2);
    expect(got.notes.join(" ")).toContain("first 2");
  });

  it("should truncate a response past the byte cap rather than hold it all", async () => {
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: fakeFetch({ "https://example.org/": "x".repeat(5000) }),
      maxBytes: 100,
    });
    if ("error" in got) throw new Error(got.error);
    expect(got.html.length).toBe(100);
  });
});
