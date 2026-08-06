import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MODEL_SCRIPT_ID, pageCopy, PAGE_SECTIONS } from "./copy.ts";

const HTML = readFileSync(join(import.meta.dir, "page.html"), "utf8");
const CSS = readFileSync(join(import.meta.dir, "page.css"), "utf8");

describe("the page is a real file, not a template literal", () => {
  it("holds no application logic inline — the only scripts are the model payload and the module", () => {
    const scripts = [...HTML.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]!);
    expect(scripts.length).toBeGreaterThan(0);
    for (const attrs of scripts) {
      const isPayload = attrs.includes('type="application/json"');
      const isModule =
        attrs.includes('type="module"') && attrs.includes("src=");
      expect(isPayload || isModule).toBe(true);
    }
    // The tells of the old inline handler style.
    expect(HTML).not.toContain("onclick=");
    expect(HTML).not.toContain("onsubmit=");
  });

  it("loads NOTHING from a remote host — the installer runs before the network is trusted", () => {
    for (const m of HTML.matchAll(/(?:src|href)="([^"]+)"/g))
      expect(m[1]!.startsWith("http")).toBe(false);
    expect(CSS).not.toContain("@import");
    expect(CSS).not.toContain("url(http");
  });

  it("carries the anchors the client renders into", () => {
    expect(HTML).toContain(`id="${MODEL_SCRIPT_ID}"`);
    for (const section of PAGE_SECTIONS)
      expect(HTML).toContain(`id="section-${section}"`);
  });

  it("styles both a light and a dark ground", () => {
    expect(CSS).toContain("prefers-color-scheme: dark");
  });

  it("gives the four status tones a distinct colour AND is never colour-only in the markup", () => {
    for (const tone of ["ready", "missing", "degraded", "off"])
      expect(CSS).toContain(`.pill-${tone}`);
  });

  // The read-only view of an existing profile needs a style of its own; without it the values fall
  // back to the form's field spacing and read as editable, which they are not.
  it("styles the profile read-out", () => {
    expect(CSS).toContain(".profile-readout");
  });

  // Fix round 1, Finding 2: engine rows now sit inside a .want block behind their heading, so the
  // first row there is never plain :first-child (the h3 is) — .capability:first-child alone went
  // dead for them, leaving a stray border under every heading. This is the rule that reaches it.
  it("removes the row border directly under a want heading, not only at the very top of a list", () => {
    const block = CSS.match(/\.want-title \+ \.capability\s*{([^}]*)}/);
    expect(block).not.toBeNull();
    expect(block![1]).toContain("border-top: 0");
  });
});

describe("the newsroom section is editable, and offers a measurement", () => {
  // The newsroom section's fields are built at runtime by client.ts (this suite has no DOM
  // harness to render them into), so "the served page" here means the source that IS served
  // byte-for-byte as /client.js — the same idiom the rest of this file uses on page.html/page.css.
  const CLIENT = readFileSync(join(import.meta.dir, "client.ts"), "utf8");

  it("offers the site address as the way to fill the profile", () => {
    expect(CLIENT).toContain('"newsroom-url"');
    expect(CSS).toContain(".charter-receipt");
  });
});

describe("the page's own copy", () => {
  it("leads in English and falls back to English for a language it does not speak", () => {
    expect(pageCopy("en").title).toBe(pageCopy("rm-CH").title);
    expect(pageCopy("fr").title).not.toBe(pageCopy("en").title);
    expect(pageCopy("fr-CH").title).toBe(pageCopy("fr").title);
  });

  it("translates every string it declares — a half-translated page is worse than an English one", () => {
    expect(Object.keys(pageCopy("fr")).sort()).toEqual(
      Object.keys(pageCopy("en")).sort(),
    );
  });
});
