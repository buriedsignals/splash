import { describe, it, expect } from "bun:test";
import {
  collectSiteSources,
  MAX_REDIRECTS,
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

  it("should ignore a link that is not a stylesheet", () => {
    const html = '<link rel="icon" href="/favicon.ico">';
    expect(stylesheetHrefs(html, "https://example.org/")).toEqual([]);
  });

  // A newsroom serves its assets from a CDN; that is the normal shape, not a third party. A
  // <link rel="stylesheet"> in the newsroom's OWN document is the design system it chose to serve,
  // whatever hostname carries the bytes. Measured 2026-08-06: heidi.news links
  // heidi-17455.kxcdn.com, and the same-host rule dropped its entire stylesheet.
  it("should keep a stylesheet the document links from another host", () => {
    const html =
      '<link rel="stylesheet" href="https://cdn.example.net/app.css">';
    expect(stylesheetHrefs(html, "https://www.example.news/")).toEqual([
      "https://cdn.example.net/app.css",
    ]);
  });

  // The note must say what happened, not guess why. Blaming JavaScript for a stylesheet that was
  // never fetched sent a real investigation down the wrong path.
  it("should say no sheet was linked, without blaming JavaScript", () => {
    expect(stylesheetHrefs("<p>no link here</p>", "https://x.news/")).toEqual(
      [],
    );
  });
});

describe("collectSiteSources", () => {
  // The three shapes `notes` must tell apart: nothing linked at all, something linked that did
  // not answer, and sheets actually read. Only the first carries the JavaScript hypothesis.
  it("should read sheets cleanly and add no failure note", async () => {
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
    expect(got.notes).toEqual([]);
  });

  it("should keep the page when a linked stylesheet fails, and say which one — not blame JavaScript", async () => {
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: fakeFetch({
        "https://example.org/": '<link rel="stylesheet" href="/gone.css">',
      }),
    });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets).toEqual([]);
    expect(got.notes.join(" ")).toContain("gone.css");
    expect(got.notes.join(" ")).not.toContain("JavaScript");
  });

  // Measured 2026-08-06: heidi.news's stylesheet used to be silently dropped by the same-host
  // filter, and this note blamed JavaScript for a sheet that was never even attempted. A page
  // that truly links no stylesheet is a different, weaker claim — a guess, stated as one.
  it("should say no stylesheet was linked, as a guess, when the page links none", async () => {
    const got = await collectSiteSources("https://example.org/", {
      fetchImpl: fakeFetch({ "https://example.org/": "<p>no link here</p>" }),
    });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets).toEqual([]);
    expect(got.notes).toHaveLength(1);
    expect(got.notes[0]).toContain("JavaScript");
    expect(got.notes[0]!.toLowerCase()).toMatch(/guess|may|might|hypothes/);
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

describe("collectSiteSources — a linked stylesheet's href is also an SSRF surface", () => {
  // Lifting the same-host filter (task 2) means an href no longer has to equal the already-vetted
  // top-level host — a page's own markup now names an arbitrary open-web address, and until this
  // guard, `getText` fired the real outbound GET before ever inspecting where it landed. The
  // fetchImpl call log is the only way to prove a request did NOT happen: a body-shaped assertion
  // can't distinguish "never dialled" from "dialled, then discarded".
  it("should refuse a linked stylesheet at the cloud metadata address, without ever fetching it", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL) => {
      const u = String(input);
      calls.push(u);
      if (u === "https://example.org/")
        return new Response(
          '<link rel="stylesheet" href="http://169.254.169.254/latest/meta-data/">',
          { status: 200 },
        );
      return new Response("unexpected fetch", { status: 200 });
    }) as unknown as typeof fetch;
    const got = await collectSiteSources("https://example.org/", { fetchImpl });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets).toEqual([]);
    expect(calls).toEqual(["https://example.org/"]);
    expect(got.notes.join(" ")).toContain("169.254.169.254");
  });

  it("should refuse a linked stylesheet on a private (RFC1918) or loopback host, without fetching it", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL) => {
      const u = String(input);
      calls.push(u);
      if (u === "https://example.org/")
        return new Response(
          '<link rel="stylesheet" href="http://192.168.1.1/router.css">' +
            '<link rel="stylesheet" href="http://127.0.0.1/admin.css">' +
            '<link rel="stylesheet" href="/ok.css">',
          { status: 200 },
        );
      if (u === "https://example.org/ok.css")
        return new Response("a{color:#c8102e}", { status: 200 });
      return new Response("unexpected fetch", { status: 200 });
    }) as unknown as typeof fetch;
    const got = await collectSiteSources("https://example.org/", { fetchImpl });
    if ("error" in got) throw new Error(got.error);
    // Only the page and the one legitimate sheet were ever dialled — never the two forbidden ones.
    expect(calls).toEqual([
      "https://example.org/",
      "https://example.org/ok.css",
    ]);
    expect(got.sheets).toEqual([
      { href: "https://example.org/ok.css", css: "a{color:#c8102e}" },
    ]);
    expect(got.notes.join(" ")).toContain("192.168.1.1");
    expect(got.notes.join(" ")).toContain("127.0.0.1");
  });
});

// Vetting an href's SHAPE before dialling it stops a link that NAMES a private address. It does
// not stop a link that names a public address which REDIRECTS to one — and a redirect is chosen
// by whoever answers, not by the page. Before the same-host filter was lifted an href could only
// ever be the already-vetted host, so this was unreachable; now a page's markup names arbitrary
// hosts, and the GET that lands on `http://192.168.1.1/reboot?confirm=1` is a blind write on the
// operator's own network, not a read whose body can simply be discarded.
describe("collectSiteSources — a redirect is an address nobody vetted", () => {
  /**
   * A fetch that HONOURS the `redirect` option the way a real one does — which is the whole
   * point: the defect is a choice of that option, and with "follow" the round trip to the
   * destination has already happened by the time any code inspects where it landed. A fake that
   * ignored the option could not tell the fixed code from the broken code.
   */
  function redirectingFetch(
    hops: Record<string, string>,
    bodies: Record<string, string>,
    calls: string[],
  ): typeof fetch {
    const impl = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      calls.push(url);
      const to = hops[url];
      if (to) {
        if (init?.redirect === "manual")
          return new Response(null, { status: 302, headers: { location: to } });
        // "follow": the runtime itself dials the destination. The request HAS happened.
        const res = await impl(to, init);
        Object.defineProperty(res, "url", { value: to, configurable: true });
        return res;
      }
      const body = bodies[url];
      if (body === undefined) return new Response("", { status: 404 });
      const res = new Response(body, { status: 200 });
      Object.defineProperty(res, "url", { value: url, configurable: true });
      return res;
    };
    return impl as unknown as typeof fetch;
  }

  it("should refuse a stylesheet whose href redirects into the private network, without ever dialling it", async () => {
    const calls: string[] = [];
    const fetchImpl = redirectingFetch(
      { "https://attacker.example/a.css": "http://192.168.1.1/reboot?confirm=1" },
      {
        "https://example.org/":
          '<link rel="stylesheet" href="https://attacker.example/a.css">',
        "http://192.168.1.1/reboot?confirm=1": "pwned",
      },
      calls,
    );
    const got = await collectSiteSources("https://example.org/", { fetchImpl });
    if ("error" in got) throw new Error(got.error);
    expect(calls).not.toContain("http://192.168.1.1/reboot?confirm=1");
    expect(got.sheets).toEqual([]);
    expect(got.notes.join(" ")).toContain("non-public");
  });

  it("should refuse a PAGE that redirects onto the cloud metadata address", async () => {
    const calls: string[] = [];
    const fetchImpl = redirectingFetch(
      { "https://redirector.example/": "http://169.254.169.254/latest/meta-data/" },
      { "http://169.254.169.254/latest/meta-data/": "AccessKeyId" },
      calls,
    );
    const got = await collectSiteSources("https://redirector.example/", {
      fetchImpl,
    });
    expect("error" in got).toBe(true);
    expect(calls).not.toContain("http://169.254.169.254/latest/meta-data/");
  });

  it("should still follow an ordinary public redirect and read what it lands on", async () => {
    const calls: string[] = [];
    const fetchImpl = redirectingFetch(
      { "https://example.org/a.css": "https://cdn.example.net/a.v2.css" },
      {
        "https://example.org/":
          '<link rel="stylesheet" href="https://example.org/a.css">',
        "https://cdn.example.net/a.v2.css": "a{color:#c8102e}",
      },
      calls,
    );
    const got = await collectSiteSources("https://example.org/", { fetchImpl });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets.length).toBe(1);
    expect(got.sheets[0]!.css).toContain("#c8102e");
  });

  it("should give up after a bounded number of hops rather than chase a chain", async () => {
    const calls: string[] = [];
    const hops: Record<string, string> = {};
    const n = MAX_REDIRECTS + 3;
    for (let i = 0; i < n; i++)
      hops[`https://example.org/h${i}`] = `https://example.org/h${i + 1}`;
    const fetchImpl = redirectingFetch(
      hops,
      {
        "https://example.org/":
          '<link rel="stylesheet" href="https://example.org/h0">',
        [`https://example.org/h${n}`]: "a{color:#c8102e}",
      },
      calls,
    );
    const got = await collectSiteSources("https://example.org/", { fetchImpl });
    if ("error" in got) throw new Error(got.error);
    expect(got.sheets).toEqual([]);
    expect(got.notes.join(" ")).toContain("redirect");
    // The page, plus the capped chain — never the whole chain to its end.
    expect(calls.length).toBeLessThanOrEqual(MAX_REDIRECTS + 2);
  });
});
