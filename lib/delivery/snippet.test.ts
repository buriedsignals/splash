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
      template: '<iframe src="{url}" title="{title}"></iframe>',
    });
    expect(r).toEqual({
      ok: true,
      value:
        '<iframe src="https://a.example.pages.dev" title="Primes cantonales"></iframe>',
    });
  });
});
