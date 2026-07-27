import { describe, it, expect } from "bun:test";
import { renderSnippet } from "./snippet";
import type { DeliveryMetadata } from "../core/publishers";

const META: DeliveryMetadata = {
  title: "Primes cantonales",
  altText: "Les primes montent partout",
  source: "OFSP",
  credit: "Heidi.news",
  lang: "fr",
  width: 700,
  height: 420,
};

describe("renderSnippet", () => {
  it("should substitute every placeholder the newsroom template declares", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "interactive",
      template:
        '<iframe src="{url}" title="{title}" id="{id}" width="{width}" height="{height}"></iframe>',
    });
    expect(r).toEqual({
      ok: true,
      value:
        '<iframe src="https://a.example.pages.dev" title="Primes cantonales" id="primes" width="700" height="420"></iframe>',
    });
  });

  it("should refuse a template carrying a placeholder it cannot fill", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "interactive",
      template: '<iframe src="{url}" data-x="{campaign}"></iframe>',
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("{campaign}");
  });

  it("should render a working default iframe when the newsroom configured no template", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "interactive",
    });
    expect(r.ok).toBe(true);
    expect((r as { value: string }).value).toContain(
      'src="https://a.example.pages.dev"',
    );
    expect((r as { value: string }).value).toContain('height="420"');
  });

  it("should emit a responsive height as a percentage-driven style rather than a number", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: { ...META, height: "responsive" },
      format: "interactive",
    });
    expect(r.ok).toBe(true);
    expect((r as { value: string }).value).toContain("aspect-ratio");
    expect((r as { value: string }).value).not.toContain('height="responsive"');
  });

  it("should refuse a placeholder name carrying underscores or digits, not just letters", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "interactive",
      template: '<iframe src="{url}" data-x="{utm_source}"></iframe>',
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("{utm_source}");
  });

  it("should HTML-escape substituted metadata so quotes and markup cannot break the attribute", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: { ...META, title: 'Primes "cantonales" <b>en hausse</b>' },
      format: "interactive",
    });
    expect(r.ok).toBe(true);
    const value = (r as { value: string }).value;
    expect(value).toContain(
      'title="Primes &quot;cantonales&quot; &lt;b&gt;en hausse&lt;/b&gt;"',
    );
    expect(value).not.toContain('cantonales"');
    expect(value).not.toContain("<b>");
  });

  it("should refuse a custom template that still demands a fixed {height} under a responsive sizing rule", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: { ...META, height: "responsive" },
      format: "interactive",
      template:
        '<iframe src="{url}" title="{title}" height="{height}"></iframe>',
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("responsive");
    expect((r as { message: string }).message).toContain("{height}");
  });

  it("should render a custom template without {height} under a responsive sizing rule", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: { ...META, height: "responsive" },
      format: "interactive",
      template: '<iframe src="{url}" title="{title}"></iframe>',
    });
    expect(r).toEqual({
      ok: true,
      value:
        '<iframe src="https://a.example.pages.dev" title="Primes cantonales"></iframe>',
    });
  });
});

describe("renderSnippet by genre", () => {
  it("should carry the alt text on an image, where the CMS reads it", () => {
    const r = renderSnippet({
      url: "https://assets.example/primes.png",
      id: "primes",
      metadata: META,
      format: "static",
    });
    expect(r.ok).toBe(true);
    const html = (r as { value: string }).value;
    expect(html.startsWith("<img ")).toBe(true);
    expect(html).toContain('alt="Les primes montent partout"');
    expect(html).not.toContain("<iframe");
  });

  it("should give a video a spoken name and a fallback text", () => {
    const r = renderSnippet({
      url: "https://assets.example/primes.mp4",
      id: "primes",
      metadata: META,
      format: "video",
    });
    expect(r.ok).toBe(true);
    const html = (r as { value: string }).value;
    expect(html.startsWith("<video ")).toBe(true);
    expect(html).toContain('aria-label="Les primes montent partout"');
    expect(html).toContain(">Les primes montent partout</video>");
  });

  it("should leave the embed genre byte-identical", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "interactive",
    });
    // Literal, not derived from DEFAULT_SNIPPET_TEMPLATE: deriving the expectation from the
    // same constant renderSnippet consumes internally means editing that constant moves both
    // sides of the assertion together, so the test could never fail — it would prove genre
    // routing reaches the constant without protecting the constant's own content.
    expect(r).toEqual({
      ok: true,
      value:
        '<iframe src="https://a.example.pages.dev" title="Primes cantonales" width="700" height="420" style="border:0;max-width:100%" loading="lazy"></iframe>',
    });
  });

  // A house template is iframe-shaped by definition. Applied to a PNG it would produce an
  // iframe pointing at an image — so it is not applied to the file genre at all.
  it("should ignore the newsroom's own template for the file genre", () => {
    const r = renderSnippet({
      url: "https://assets.example/primes.png",
      id: "primes",
      metadata: META,
      format: "static",
      template: '<iframe src="{url}" title="{title}"></iframe>',
    });
    expect(r.ok).toBe(true);
    expect((r as { value: string }).value.startsWith("<img ")).toBe(true);
  });

  it("should still apply the newsroom's own template for the embed genre", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      format: "scrolly",
      template: '<iframe src="{url}" data-house="1"></iframe>',
    });
    expect(r).toEqual({
      ok: true,
      value:
        '<iframe src="https://a.example.pages.dev" data-house="1"></iframe>',
    });
  });
});
