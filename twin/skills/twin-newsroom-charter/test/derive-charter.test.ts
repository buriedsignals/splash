import { describe, expect, it } from "bun:test";
import { deriveCharter } from "../scripts/derive-charter.mjs";

function fakeFetch(pages: Record<string, { status?: number; text: string }>) {
  return async (url: string) => {
    const page = pages[url];
    if (!page) return new Response("not found", { status: 404 });
    return new Response(page.text, { status: page.status ?? 200 });
  };
}

describe("deriveCharter — the honest-fallback path (rule 3)", () => {
  it("should report ok:false with an ask-instead list when the page itself can't be read", async () => {
    const fetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    };
    const proposal = await deriveCharter({
      url: "https://unreachable.test",
      fetchFn,
    });
    expect(proposal.ok).toBe(false);
    expect(proposal.error).toContain("ENOTFOUND");
    expect(proposal.askInstead.length).toBeGreaterThan(1);
    expect(
      proposal.askInstead.some((q: string) => /accent colour/.test(q)),
    ).toBe(true);
  });

  it("should not hang past its timeout when the page fetch never resolves", async () => {
    const start = Date.now();
    const proposal = await deriveCharter({
      url: "https://hangs.test",
      timeoutMs: 40,
      fetchFn: () => new Promise(() => {}),
    });
    expect(Date.now() - start).toBeLessThan(500);
    expect(proposal.ok).toBe(false);
  });

  it("should list every field as unresolved, never a guessed one, when the page declares nothing (nzz.ch's real colour shape)", async () => {
    const html = `<html lang="de"><head>
      <meta property="og:site_name" content="Neue Zürcher Zeitung"/>
      <link rel="stylesheet" href="/site.css">
    </head></html>`;
    const css = `:root{--swiper-theme-color: #007aff}`; // a real vendor widget variable, not the brand
    const fetchFn = fakeFetch({
      "https://www.nzz.ch/": { text: html },
      "https://www.nzz.ch/site.css": { text: css },
    });
    const proposal = await deriveCharter({
      url: "https://www.nzz.ch/",
      fetchFn,
    });
    expect(proposal.ok).toBe(true);
    expect(proposal.fields.brandColor).toBe(null);
    expect(proposal.fields.ground).toBe(null);
    expect(proposal.unresolved).toEqual(
      expect.arrayContaining(["brandColor", "ground"]),
    );
    // still resolves what IS genuinely declared — a null field never drags a real one down with it
    expect(proposal.fields.name.value).toBe("Neue Zürcher Zeitung");
    expect(proposal.fields.language.value).toBe("de");
  });
});

describe("deriveCharter — fields resolve with their evidence attached", () => {
  it("should prefer the theme-color meta over a same-page custom property (theguardian.com's real shape)", async () => {
    const html = `<html lang="en"><head>
      <title>The Guardian</title>
      <meta name="theme-color" content="#052962" />
      <link rel="stylesheet" href="/style.css">
    </head></html>`;
    const css = `body { background: #FFFFFF } .byline{font-family:'GH Guardian Headline',Georgia,serif}`;
    const fetchFn = fakeFetch({
      "https://www.theguardian.com/": { text: html },
      "https://www.theguardian.com/style.css": { text: css },
    });
    const proposal = await deriveCharter({
      url: "https://www.theguardian.com/",
      fetchFn,
    });
    expect(proposal.fields.brandColor).toEqual({
      value: "#052962",
      source: "meta[name=theme-color]",
      evidence: '<meta name="theme-color" content="#052962" />',
    });
    expect(proposal.fields.ground.value).toBe("#ffffff");
    expect(proposal.fields.typefaces.value).toBe("GH Guardian Headline");
    expect(proposal.unresolved).toEqual([]);
  });

  it("should skip a qualified background rule when nothing plainer exists, and leave ground unresolved (lemonde.fr's real shape)", async () => {
    const html = `<html lang="fr"><head>
      <meta property="og:site_name" content="Le Monde.fr">
      <meta name="theme-color" content="#ffffff">
      <link rel="stylesheet" href="/style.css">
    </head></html>`;
    const css = `html.short-video,html.short-video body { background: #000 }`;
    const fetchFn = fakeFetch({
      "https://www.lemonde.fr/": { text: html },
      "https://www.lemonde.fr/style.css": { text: css },
    });
    const proposal = await deriveCharter({
      url: "https://www.lemonde.fr/",
      fetchFn,
    });
    expect(proposal.fields.ground).toBe(null);
    expect(proposal.unresolved).toContain("ground");
    // the qualified rule is still on record as a candidate, not thrown away
    expect(proposal.candidates.backgroundDecls[0].selector).toContain(
      "short-video",
    );
  });

  it("should name every stylesheet it read and every one it couldn't", async () => {
    const html = `<html lang="en"><head>
      <link rel="stylesheet" href="/ok.css">
      <link rel="stylesheet" href="/missing.css">
    </head></html>`;
    const fetchFn = fakeFetch({
      "https://example.test/": { text: html },
      "https://example.test/ok.css": { text: "body{background:#fff}" },
      // /missing.css intentionally absent from the fixture map -> fakeFetch answers 404
    });
    const proposal = await deriveCharter({
      url: "https://example.test/",
      fetchFn,
    });
    expect(proposal.stylesheetsRead).toEqual(["https://example.test/ok.css"]);
    expect(proposal.stylesheetsFailed).toEqual([
      {
        href: "https://example.test/missing.css",
        error: "https://example.test/missing.css answered 404",
      },
    ]);
  });

  it("should read no more than maxStylesheets, in document order", async () => {
    const html = `<html><head>
      <link rel="stylesheet" href="/a.css">
      <link rel="stylesheet" href="/b.css">
      <link rel="stylesheet" href="/c.css">
    </head></html>`;
    let fetchCount = 0;
    const fetchFn = async (url: string) => {
      fetchCount += 1;
      if (url === "https://example.test/")
        return new Response(html, { status: 200 });
      return new Response("body{background:#fff}", { status: 200 });
    };
    await deriveCharter({
      url: "https://example.test/",
      fetchFn,
      maxStylesheets: 1,
    });
    expect(fetchCount).toBe(2); // the page itself, plus exactly one stylesheet
  });
});

describe("deriveCharter — never writes anything", () => {
  it("should export no function whose name suggests a write path", async () => {
    const module = await import("../scripts/derive-charter.mjs");
    const names = Object.keys(module);
    expect(names).toEqual(["deriveCharter"]);
    for (const name of names) {
      expect(name.toLowerCase()).not.toContain("write");
      expect(name.toLowerCase()).not.toContain("save");
    }
  });
});
