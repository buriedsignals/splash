// charter-render.test.ts — the CONTRACT of the rendered second attempt, with no browser: every
// test here injects `opts.launch`, so `bun test` never opens Chromium. The in-page function
// itself (`readAppliedStyles`, reading `document.styleSheets` and computed styles) cannot be
// exercised from this process — there is no DOM in `bun:test` — and is proven by hand in the
// next task, opening a real page against the real fixtures this chantier already captured
// (lib/newsroom/fixtures/sites/README.md).
import { describe, expect, test } from "bun:test";
import { proposeCharter } from "./charter.ts";
import {
  renderSiteSources,
  type RenderBrowser,
  type RenderPage,
} from "./charter-render.ts";

/** A minimal fake `RenderPage`, with every method overridable per test. */
function fakePage(overrides: Partial<RenderPage> = {}): RenderPage {
  return {
    goto: async () => ({ ok: () => true, status: () => 200 }),
    waitForTimeout: async () => {},
    evaluate: async () =>
      ({ sheets: [], blockedHrefs: [], computedCss: null }) as never,
    content: async () => "<html></html>",
    url: () => "https://x.news/",
    close: async () => {},
    ...overrides,
  };
}

function fakeBrowser(page: RenderPage): RenderBrowser {
  return {
    newPage: async () => page,
    close: async () => {},
  };
}

// The one test the task brief specifies verbatim — the contract this module exists to satisfy.
test("a browser that cannot start is an error value, not a throw", async () => {
  const out = await renderSiteSources("https://x.news", {
    launch: async () => {
      throw new Error("no browser here");
    },
  });
  expect("error" in out).toBe(true);
});

describe("renderSiteSources — the entry address is vetted before anything opens", () => {
  test("should refuse a non-usable address without ever calling launch", async () => {
    let called = false;
    const out = await renderSiteSources("file:///etc/passwd", {
      launch: async () => {
        called = true;
        return fakeBrowser(fakePage());
      },
    });
    expect(called).toBe(false);
    expect("error" in out).toBe(true);
  });

  test("should refuse the loopback and the cloud metadata address, same as the static path", async () => {
    let called = false;
    const launch = async () => {
      called = true;
      return fakeBrowser(fakePage());
    };
    const a = await renderSiteSources("http://127.0.0.1/", { launch });
    const b = await renderSiteSources("http://169.254.169.254/", { launch });
    expect("error" in a).toBe(true);
    expect("error" in b).toBe(true);
    expect(called).toBe(false);
  });
});

// Vetting the address the journalist TYPED is not vetting the address the browser ENDED UP on.
// A pasted redirector that 302s to `http://169.254.169.254/latest/meta-data/` answers 200, and
// the rendered page is then the cloud's own credentials document, returned as the newsroom's.
// The static path has refused exactly this since its own SSRF fix (charter-fetch.ts's landing
// check); this path did not, while its module comment claimed parity.
describe("renderSiteSources — the address the browser LANDED on is vetted too", () => {
  test("should refuse a redirect onto the cloud metadata address, before reading a byte of the page", async () => {
    let evaluated = false;
    let contentRead = false;
    const page = fakePage({
      url: () => "http://169.254.169.254/latest/meta-data/",
      evaluate: async () => {
        evaluated = true;
        return { sheets: [], blockedHrefs: [], computedCss: null } as never;
      },
      content: async () => {
        contentRead = true;
        return "<html>AccessKeyId</html>";
      },
    });
    const out = await renderSiteSources("https://redirector.example", {
      launch: async () => fakeBrowser(page),
    });
    expect("error" in out).toBe(true);
    if ("error" in out) expect(out.error).toContain("non-public");
    // Not merely discarded — never read. A refusal that happens after the body was pulled out of
    // the page is not a refusal.
    expect(evaluated).toBe(false);
    expect(contentRead).toBe(false);
  });

  test("should refuse a redirect onto a private (RFC1918) address", async () => {
    const page = fakePage({ url: () => "http://192.168.1.1/router" });
    const out = await renderSiteSources("https://redirector.example", {
      launch: async () => fakeBrowser(page),
    });
    expect("error" in out).toBe(true);
  });

  test("should still accept an ordinary apex to www redirect", async () => {
    const page = fakePage({ url: () => "https://www.x.news/" });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    expect(out.url).toBe("https://www.x.news/");
  });
});

describe("renderSiteSources — total, never throws", () => {
  test("should return an error when the page will not open a new tab", async () => {
    const out = await renderSiteSources("https://x.news", {
      launch: async () => ({
        newPage: async () => {
          throw new Error("no target page");
        },
        close: async () => {},
      }),
    });
    expect("error" in out).toBe(true);
  });

  test("should return an error when navigation itself fails", async () => {
    const page = fakePage({
      goto: async () => {
        throw new Error("net::ERR_NAME_NOT_RESOLVED");
      },
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    expect("error" in out).toBe(true);
    if ("error" in out) expect(out.error).toContain("x.news");
  });

  test("should return an error when the site answers with a non-ok status", async () => {
    const page = fakePage({
      goto: async () => ({ ok: () => false, status: () => 503 }),
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    expect("error" in out).toBe(true);
    if ("error" in out) expect(out.error).toContain("503");
  });

  test("should return an error, not throw, when the in-page read itself fails", async () => {
    const page = fakePage({
      evaluate: async () => {
        throw new Error("execution context was destroyed");
      },
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    expect("error" in out).toBe(true);
  });

  test("should close the page and the browser even when a step fails", async () => {
    let pageClosed = false;
    let browserClosed = false;
    const page = fakePage({
      goto: async () => {
        throw new Error("boom");
      },
      close: async () => {
        pageClosed = true;
      },
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => ({
        newPage: async () => page,
        close: async () => {
          browserClosed = true;
        },
      }),
    });
    expect("error" in out).toBe(true);
    expect(pageClosed).toBe(true);
    expect(browserClosed).toBe(true);
  });
});

describe("renderSiteSources — the returned shape", () => {
  test("should carry the same shape collectSiteSources returns, with a note saying it came from a render", async () => {
    const page = fakePage({
      evaluate: async () =>
        ({
          sheets: [{ href: "https://x.news/a.css", css: "a{color:#c8102e}" }],
          blockedHrefs: [],
          computedCss: null,
        }) as never,
      content: async () => "<html><body>hi</body></html>",
      url: () => "https://x.news/",
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    expect(out.url).toBe("https://x.news/");
    expect(out.html).toContain("hi");
    expect(out.sheets).toEqual([
      { href: "https://x.news/a.css", css: "a{color:#c8102e}" },
    ]);
    expect(out.notes.length).toBeGreaterThan(0);
    expect(out.notes.join(" ").toLowerCase()).toMatch(/render|browser/);

    // proposeCharter cannot tell a rendered reading from a static one — same shape, same pipeline.
    const proposal = proposeCharter(out);
    expect(proposal.candidates[0]?.value).toBe("#c8102e");
  });

  test("should name the blocked stylesheets and say a computed style stood in", async () => {
    const page = fakePage({
      evaluate: async () =>
        ({
          sheets: [],
          blockedHrefs: ["https://fonts.example.net/webfont.css"],
          computedCss: "a { color: rgb(200, 16, 30) }",
        }) as never,
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    const notes = out.notes.join(" ");
    expect(notes).toContain("fonts.example.net/webfont.css");
    expect(notes).toContain("computed style");
    expect(out.sheets).toEqual([
      {
        href: "computed styles of the rendered page",
        css: "a { color: rgb(200, 16, 30) }",
      },
    ]);

    const proposal = proposeCharter(out);
    expect(proposal.candidates[0]?.value).toBe("#c8101e");
  });

  test("should say plainly when a blocked stylesheet left nothing to stand in for it", async () => {
    const page = fakePage({
      evaluate: async () =>
        ({
          sheets: [],
          blockedHrefs: ["https://fonts.example.net/webfont.css"],
          computedCss: null,
        }) as never,
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    const notes = out.notes.join(" ");
    expect(notes).toContain("fonts.example.net/webfont.css");
    expect(notes.toLowerCase()).toContain("absent from this reading");
    expect(out.sheets).toEqual([]);
  });

  test("should cap how many applied stylesheets it keeps, and say it did", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      href: `https://x.news/s${i}.css`,
      css: `a{color:#00000${i}}`,
    }));
    const page = fakePage({
      evaluate: async () =>
        ({ sheets: many, blockedHrefs: [], computedCss: null }) as never,
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    expect(out.sheets.length).toBe(8);
    expect(out.notes.join(" ")).toContain("first 8");
  });

  test("should say plainly when nothing could be read at all, even after rendering", async () => {
    const page = fakePage({
      evaluate: async () =>
        ({ sheets: [], blockedHrefs: [], computedCss: null }) as never,
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    expect(out.sheets).toEqual([]);
    expect(out.notes.join(" ").toLowerCase()).toContain("no css could be read");
  });

  test("should fall back to the vetted URL when the page cannot report where it landed", async () => {
    const page = fakePage({
      url: () => {
        throw new Error("no such method on this fake");
      },
    });
    const out = await renderSiteSources("https://x.news", {
      launch: async () => fakeBrowser(page),
    });
    if ("error" in out) throw new Error(out.error);
    expect(out.url).toBe("https://x.news/");
  });
});
