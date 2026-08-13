/**
 * RULING B5.2 (2026-08-10, the owner): *"Pour toutes les cartes on n'affiche pas le tableau de
 * valeurs qui se trouve en dessous, ou alors cache-les dans un accordéon, et pour tous."*
 *
 * The value table is COLLAPSED on every map page, without exception. This file is the "and for all"
 * half — the part a per-beat review cannot hold, because the ruling is about a set that grows.
 *
 * WHY IT WALKS RATHER THAN LISTS. This project has been burned by list-based guards that stopped
 * covering what was added after them: `the-live-layer-is-in-the-artifact.test.ts`'s own header
 * records a sweep that found 2 of 5 pages because it matched a class name three beats did not
 * carry. So the page set here is DISCOVERED — `git ls-files`, filtered by path, widened by the
 * format's own root class — and then asserted by name, so a beat that stops committing its rendered
 * file reddens here instead of quietly leaving the check.
 *
 * WHAT IT ASSERTS, and what it deliberately does not. "Collapsed" is a fact about the bytes a
 * reader downloads: every `<table>` on a map page sits inside a `<details>` element that carries no
 * `open` attribute, and that `<details>` has a `<summary>`. It does NOT assert a computed style —
 * `<details>` collapses natively, so a browser check would be testing the browser. It DOES refuse
 * `display: none` and `hidden` as the mechanism, because the ruling's whole point is that the table
 * stays reachable: it is the map's only accessible alternative for a reader with no spatial access
 * to the canvas (`references/map-web-discipline.md`, "The table is collapsed, and why it is not
 * deleted").
 *
 * THE MUTATIONS THAT REDDEN IT, run in an rsync copy outside the tree
 * (`/tmp/mut-collapsed-table/twin`), never in `twin/`:
 *
 * 1. `discloseTable` in all six `render-web.mjs` copies given `return tableHtml;` as its first line
 *    — the "somebody put it back the way it was" mutation. It reaches the RENDERER half only,
 *    because the committed pages are already-rendered bytes: 8 pass / 3 fail —
 *
 *      (fail) the renderer collapses the table it renders > should wrap the table in a native, closed <details>
 *      (fail) … > should name what the disclosure holds and how many rows
 *      (fail) … > should refuse to label a disclosure with a word or a count nobody supplied
 *
 * 2. `<details class="mw-table-disclosure">` → `… open>` in the six renderers AND the five committed
 *    pages — the "collapsed in the markup, expanded on the screen" mutation a class-name check would
 *    miss. 5 pass / 6 fail: every committed page by name, plus the renderer's own closed-ness check.
 *
 * 3. The committed half needed no mutation at all on the day it landed: read against a tree where
 *    two of the five beats had not yet been re-rendered, it reported
 *    *"1 value table(s) render expanded on this page"* for `mapgen-symbol-web` and `mapgen-dot-web`
 *    and passed on the three that had. The count was the measurement.
 */
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveFurniture } from "../scripts/render-still.mjs";
import { MapWebSeed, RegionTable } from "../assets/MapWebSeed.tsx";
import {
  discloseTable,
  livePlan,
  renderMapWeb,
} from "../scripts/render-web.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/**
 * The page's own MARKUP, with every `<style>` and `<script>` block taken out first.
 *
 * This is not tidying. A self-contained map page inlines 803 KB of maplibre-gl and its whole
 * stylesheet COMMENTS AND ALL, so any tag name written inside a comment is a string in the file —
 * and the first version of this guard duly found a `<details>` inside the stylesheet comment that
 * explains the disclosure, paired it with the real `</details>` at the bottom of the page, and
 * stripped the map, the table and everything between them. It went green over exactly the defect it
 * exists to catch. The comment was reworded too, but a guard that depends on nobody ever writing a
 * tag name in prose is not a guard.
 */
function markup(html: string): string {
  return html
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

/**
 * Every `<details>…</details>` block removed, so what is LEFT is what a reader sees without opening
 * anything. Nested disclosures are not a thing this format writes, and a `<details>` with no closing
 * tag would leave its own opener behind — both of which the assertions below would report rather
 * than swallow.
 */
function withoutDisclosures(html: string): string {
  return markup(html).replace(/<details\b[\s\S]*?<\/details>/gi, "");
}

function openDisclosures(html: string): string[] {
  return markup(html).match(/<details\b[^>]*\bopen\b[^>]*>/gi) ?? [];
}

function disclosuresWithoutSummary(html: string): number {
  const blocks = markup(html).match(/<details\b[\s\S]*?<\/details>/gi) ?? [];
  return blocks.filter((block) => !/<summary\b/i.test(block)).length;
}

/** Tables in the MARKUP, never a `<table` written inside the inlined library or a comment. */
function tableCount(html: string): number {
  return (markup(html).match(/<table\b/gi) ?? []).length;
}

/**
 * A page is a map-web beat if it is the rendered HTML of the seed or of a `mapgen-*-web` beat —
 * decided by PATH, with the format's own root class kept as a widener so a beat living somewhere
 * else is still caught. Copied deliberately from `the-live-layer-is-in-the-artifact.test.ts`: the
 * two guards must sweep the same set, or one of them silently covers less than the other.
 */
function committedMapWebPages(): { rel: string; html: string }[] {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter((rel) => rel.endsWith(".html"));
  const pages = [];
  for (const rel of tracked) {
    const path = join(TWIN, rel);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const html = readFileSync(path, "utf8");
    if (isMapWebPath(rel) || html.includes('class="map-web-page"'))
      pages.push({ rel, html });
  }
  return pages;
}

function isMapWebPath(rel: string): boolean {
  return (
    /^proof\/mapgen-[a-z]+-web\//.test(rel) ||
    rel.startsWith("skills/map-web/output-proof/")
  );
}

describe("every committed map page keeps its value table collapsed", () => {
  const pages = committedMapWebPages();

  it("should find the pages it is supposed to be checking", () => {
    // Anti-vacuity, and the reason this is not a bare `for` loop: a sweep that finds no work to do
    // passes, which is exactly how a guard stops covering what was added after it.
    expect(pages.map((page) => page.rel).sort()).toEqual([
      "proof/mapgen-choropleth-web/render/choropleth.html",
      "proof/mapgen-dot-web/dot-population.html",
      "proof/mapgen-hexgrid-web/hex-grid.html",
      "proof/mapgen-locator-web/locator.html",
      "proof/mapgen-symbol-web/quake-symbol.html",
      "skills/map-web/output-proof/population.html",
    ]);
  });

  it("should be looking at pages that actually have a table to collapse", () => {
    // The second anti-vacuity clause, and the one that matters most here: "no page renders an
    // expanded table" is trivially true of a tree with no tables in it. The seed ships
    // `regionTable: false` and has none, so the floor is the five beats that opt in.
    const withTables = pages.filter((page) => tableCount(page.html) > 0);
    expect(withTables.map((page) => page.rel).sort()).toEqual([
      "proof/mapgen-choropleth-web/render/choropleth.html",
      "proof/mapgen-dot-web/dot-population.html",
      "proof/mapgen-hexgrid-web/hex-grid.html",
      "proof/mapgen-locator-web/locator.html",
      "proof/mapgen-symbol-web/quake-symbol.html",
    ]);
  });

  for (const page of pages)
    it(`${page.rel} has no expanded value table`, () => {
      const outside = withoutDisclosures(page.html);
      const stranded = (outside.match(/<table\b/gi) ?? []).length;
      if (stranded > 0)
        throw new Error(
          `${stranded} value table(s) render expanded on this page: the ruling is that every map ` +
            `page collapses its table into a native <details>, and a reader opening this file ` +
            `meets the rows before they ask for them.`,
        );

      const open = openDisclosures(page.html);
      if (open.length > 0)
        throw new Error(
          `${open.length} disclosure(s) carry \`open\`, so they are collapsed in the markup and ` +
            `expanded on the screen: ${open.join(", ")}`,
        );

      // The disclosure must be a real one. A <details> with no <summary> gets the browser's own
      // "Details" label, which says nothing about what opening it costs.
      expect(disclosuresWithoutSummary(page.html)).toBe(0);

      // And it must be a DISCLOSURE, not a hiding. `display:none` / `hidden` on the table would
      // satisfy "the page is shorter" while removing the one channel a screen-reader user has.
      expect(page.html).not.toMatch(/<table\b[^>]*\bhidden\b/i);
      expect(page.html).not.toMatch(/<table\b[^>]*display\s*:\s*none/i);
    });
});

// A plate's worth of camera facts in the shape `geometry.json` records them, so the renderer can be
// exercised with no bake and no network — the same fixture `the-live-layer-is-in-the-artifact` uses.
const BAKE_ZOOM = 3.879;
const POINTS = [
  {
    key: "paris",
    name: "Alpha City",
    lon: 2,
    lat: 48,
    value: 11,
    px: 100,
    py: 100,
    group: "West",
  },
  {
    key: "b",
    name: "Beta Town",
    lon: 3,
    lat: 49,
    value: 5.6,
    px: 200,
    py: 150,
    group: "East",
  },
  {
    key: "c",
    name: "Gamma",
    lon: 4,
    lat: 50,
    value: 1.4,
    px: 300,
    py: 200,
    group: "East",
  },
];
const GEOMETRY = {
  frame: { width: 420, height: 420 },
  points: POINTS,
  style: "dataviz",
  zoom: BAKE_ZOOM,
  frameCorners: { west: -11, east: 31, north: 66, south: 35 },
  degreesPerPixel: 360 / (512 * 2 ** BAKE_ZOOM),
  metresPerPixel: 4000,
};
const BASE = {
  geometry: GEOMETRY,
  plate: "data:image/png;base64,AAAA",
  title: "A fixture map",
  source: "Fixture source",
  basemapCredit: "basemap © Fixture",
  legendCaption: "Value, millions",
  caveat: "Fixture caveat text.",
  alt: "Three circles on a fixture map.",
  ground: "#FFFFFF",
  accent: "#0B7A75",
};

async function buildWithTable(): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), "map-web-table-"));
  try {
    await renderMapWeb({
      component: MapWebSeed,
      table: RegionTable,
      props: BASE as never,
      outDir,
      name: "beat.html",
      regionTable: true,
      tableRowNoun: "metro areas",
      live: true,
      plan: livePlan({
        geometry: GEOMETRY,
        subjectKey: "paris",
        accent: BASE.accent,
        muted: deriveFurniture(BASE.ground).muted,
        waterFill: "#aac9e0",
      }),
    });
    return readFileSync(join(outDir, "beat.html"), "utf8");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describe("the renderer collapses the table it renders", () => {
  it("should wrap the table in a native, closed <details>", async () => {
    const html = await buildWithTable();
    expect(html).toContain('<details class="mw-table-disclosure">');
    expect(openDisclosures(html)).toEqual([]);
    // The table is INSIDE it: with every disclosure block removed, no table is left on the page.
    expect(withoutDisclosures(html)).not.toMatch(/<table\b/i);
    // Native, not scripted: a `<summary>` is the control, and nothing in this format's inline script
    // is needed to open it.
    expect(html).toMatch(/<summary>/);
  });

  it("should name what the disclosure holds and how many rows", async () => {
    const html = await buildWithTable();
    // Three points in the fixture, so three rows, counted off the rendered table rather than
    // asserted from the fixture's own length twice.
    expect(html).toContain(
      "<summary>Table of values — 3 metro areas</summary>",
    );
  });

  it("should refuse to label a disclosure with a word or a count nobody supplied", () => {
    const table = "<table><tbody><tr><th>A</th><td>1</td></tr></tbody></table>";
    expect(() => discloseTable(table, "")).toThrow(/tableRowNoun/);
    expect(() => discloseTable(table, null as never)).toThrow(/tableRowNoun/);
    expect(() =>
      discloseTable("<table><tbody></tbody></table>", "rows"),
    ).toThrow(/no <tbody> rows/);
    // An absent table is absent, not an empty disclosure with a summary promising nothing.
    expect(discloseTable("", "rows")).toBe("");
  });
});
