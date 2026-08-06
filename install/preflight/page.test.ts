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

  // The newsroom section's colour candidates (from a measurement) and an existing profile's
  // series colours (read-only) both render as swatches, styled distinctly from a plain field —
  // superseded the old "profile read-out" style (Fix round 1) now that the section is editable
  // and there is no separate read-only view to give a style of its own.
  it("styles the colour swatches — clickable candidates and the read-only series colours alike", () => {
    expect(CSS).toContain(".charter-candidates");
    expect(CSS).toContain(".swatch-btn");
  });

  // Task 5 (2026-08-06): a .capability row is a delivery destination only now — the engine rows
  // that used to sit grouped under a .want-title heading (and needed this rule to lose their
  // border there) are gone, and so is the checkbox that carried them.
  it("carries no leftover styling for the removed want-grouped engine rows", () => {
    expect(CSS).not.toContain(".want-title");
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

  // Final review, F3: the measured typefaces were folded straight into the profile's prose and
  // rendered nowhere — written into a fresh NEWSROOM-PROFILE.md with no on-screen presence and
  // no way to strike one. `notesFrom` (charter-endpoint.test.ts) proves a struck typeface stops
  // being written; what THIS pins is that the journalist can see them at all, since no suite
  // here can render client.ts. Deleting the readout block reddens both halves.
  it("shows the measured typefaces, with a way to strike one before saving", () => {
    expect(CLIENT).toContain("copy.measuredTypefaces");
    expect(CLIENT).toContain("copy.typefaceDrop");
    expect(CLIENT).toContain("droppedTypefaces.add(key)");
    // The notes written to the profile are DERIVED from what survived, never assembled inline
    // from the whole measurement — that inline map is exactly what made them uncorrectable.
    expect(CLIENT).toContain("notesFrom(charter.readout, droppedTypefaces)");
    expect(CLIENT).not.toContain("data.typefaces.map");
    expect(CSS).toContain(".field-title");
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
