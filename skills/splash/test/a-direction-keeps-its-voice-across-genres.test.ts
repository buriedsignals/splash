/**
 * A DIRECTION KEEPS ITS VOICE WHEN THE GENRE CHANGES.
 *
 * THE DEFECT THIS EXISTS FOR, found by Rémy's eye on the delivered locator page and invisible to
 * everything else in this tree.
 *
 * `rapport` sets its DISPLAY register in a serif and its BODY in an italic serif. The static
 * choropleth on the same ground renders its title in Merriweather, exactly as filed. The web page
 * on that same ground named Merriweather nowhere at all: every word on it — title included — was
 * set in Open Sans.
 *
 * The cause was structural rather than local. Every web stylesheet in this tree sets `font-family`
 * exactly ONCE, on `body`, from `dominantFontStack` — the family that appears most often in the
 * markup the components drew — and `figureVars` carried a register's SIZE and WEIGHT into the page
 * as custom properties but never its FAMILY. So the display register's family had no route to the
 * page in any web genre: on a beat with an axis the body stack is the furniture sans and the title
 * silently took it, and on `proof/mapgen-locator-web`, whose markup names no family whatsoever,
 * `dominantFontStack` returned its own `HOUSE_SANS_STACK` fallback and the whole page was set in a
 * helper's default.
 *
 * Nothing was red. The page loaded, the faces it named were embedded, `assertFontsEmbedded` passed,
 * and every guard about typefaces in this tree is about whether a named family ARRIVES — not about
 * whether it is the family the direction filed.
 *
 * SO THIS ONE ASKS THE OTHER QUESTION, and answers it from the direction's own record rather than
 * from the page: it reads the beat's declared direction, resolves its display register's ROLE down
 * the same ladder `resolve-families.mjs` walks, against the page's own title text, and requires the
 * delivered page to name that family and to use it on its title.
 *
 * THE POPULATION IS THE BEATS THAT HAVE MIGRATED — a delivered page that defines `--title-family`.
 * That is deliberate: a beat still setting its type from the format's own scale is not yet claiming
 * to carry a direction, and reddening the ninety web pages that predate this mechanism would say
 * nothing anyone could act on. A beat joins this guard by declaring a direction, which is the
 * moment the claim becomes checkable.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readDirection } from "../../../shared/design-base/read-direction.mjs";
import { resolveFamily } from "../../../shared/design-base/resolve-families.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");
// Archived 2026-09-17: the flat-root legacy web pages this guard's population is drawn from
// (`mapgen-*-web`, `webx-*`/`weby-*`/`webz-*`) moved to `archive/`, keeping their names — walked
// alongside `proof/` so this guard's population does not silently empty.
const ARCHIVE = join(TWIN, "archive");
const DIRECTIONS = join(TWIN, "shared", "design-base", "directions");

type Page = { beat: string; file: string; html: string; direction: string };

/** The direction a beat DECLARES, read off whichever of its own scripts names one. */
function declaredDirection(dir: string): string | null {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
    const hit = /^\s*direction:\s*"([A-Za-z0-9_-]+)",/m.exec(
      readFileSync(join(dir, file), "utf8"),
    );
    if (hit) return hit[1];
  }
  return null;
}

/** Every direction on file, by id. */
const FILED = existsSync(DIRECTIONS)
  ? readdirSync(DIRECTIONS)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
  : [];

/**
 * A BEAT THAT RENDERS EVERY FILED DIRECTION NAMES NONE OF THEM IN ITS SOURCE, and that is correct.
 * `declaredDirection` above was written for a beat that renders ONE — the three `mapgen-*-web`
 * pages, whose runner carries a literal `direction: "creme",`. A directed beat loops over
 * `docs/design-base/directions` and writes `renders/<id>.html`, so its script names no direction and
 * cannot: whichever literal such a scan found would be right for one of its three files and wrong
 * for the other two. Measured the day this was widened: the guard's whole population was nine pages,
 * and the three that carry a per-direction render loop — `web-line-swiss-co2`'s — were failing all
 * four of its assertions on a premise that could never hold for them.
 *
 * A render written as `renders/creme.html` states its direction in its own name, which is the record
 * this reads. The source literal stays the fallback, so nothing that passed before changes.
 */
function directionOf(dir: string, file: string): string {
  const base = file.slice(file.lastIndexOf("/") + 1).replace(/\.html$/, "");
  if (file.includes("/") && FILED.includes(base)) return base;
  return declaredDirection(dir) ?? "";
}

function directedPagesUnder(root: string): Page[] {
  if (!existsSync(root)) return [];
  const out: Page[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    /** A BEAT'S PAGE IS NOT ALWAYS AT ITS OWN ROOT. This walk read the beat directory only, and
     *  `proof/mapgen-choropleth-web` delivers into `render/` — so the second map type to be set in
     *  its direction's own face joined a population of one level and was measured by nothing. One
     *  level down as well, which covers `render/` and `renders/` without naming either: a page joins
     *  by DECLARING `--title-family`, so widening the walk cannot pull an un-migrated beat in. */
    /** NOT THE KEYED COPY. A live map beat writes `<direction>.local.html` beside its page — the
     *  same bytes with the MapTiler key substituted, git-ignored, and present only after a render
     *  has been run with a key in the environment. It is the same page measured twice, and its name
     *  is not a filed direction's, so `directionOf` came back empty and every one of them failed
     *  this guard for existing. Twenty-four files, forty-eight reds, none of them about a page. */
    const keyed = /\.local\.html$/;
    const files: string[] = [];
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (
        file.isFile() &&
        file.name.endsWith(".html") &&
        !keyed.test(file.name)
      )
        files.push(file.name);
      if (!file.isDirectory()) continue;
      for (const nested of readdirSync(join(dir, file.name)))
        if (nested.endsWith(".html") && !keyed.test(nested))
          files.push(join(file.name, nested));
    }
    for (const file of files) {
      const html = readFileSync(join(dir, file), "utf8");
      if (!html.includes("--title-family")) continue;
      out.push({
        beat: entry.name,
        file,
        html,
        direction: directionOf(dir, file),
      });
    }
  }
  return out;
}

function directedPages(): Page[] {
  return [...directedPagesUnder(PROOF), ...directedPagesUnder(ARCHIVE)];
}

/** What a custom property is set to, read out of the page's own stylesheet — OR out of the inline
 *  `style` attribute a component writes it on, where the quotes around a family name arrive HTML
 *  ESCAPED. Without the unescaping this returned the literal string `&quot` for every `chart-web`
 *  page, whose `figureVars` are written on the figure's own inline style rather than into a
 *  stylesheet rule: the family was named, embedded and drawn, and this guard read six characters of
 *  an entity and called it the wrong face. */
function customProperty(html: string, name: string): string | null {
  const hit = new RegExp(`${name}\\s*:\\s*([^;{}]+)`).exec(unescapeHtml(html));
  return hit ? hit[1].trim() : null;
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** The first family of a CSS stack, unquoted. */
const head = (stack: string) =>
  stack
    .split(",")[0]
    .replace(/^["']|["']$/g, "")
    .trim();

const pages = directedPages();

describe("a page that declares a filed direction", () => {
  it("should exist at all (premise — this guard's population is the migrated beats)", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const page of pages) {
    const where = `${page.beat}/${page.file}`;

    it(`should name the direction it is rendered in — ${where}`, () => {
      expect(page.direction).not.toBe("");
      expect(existsSync(join(DIRECTIONS, `${page.direction}.md`))).toBe(true);
    });

    it(`should set its title in the DISPLAY register's own family — ${where}`, () => {
      const filed = readDirection(join(DIRECTIONS, `${page.direction}.md`));
      const role = filed.registers.display.family;
      // The title's own words, which is what the ladder's coverage question is asked about — the
      // same question `resolveDirectionFamilies` asks at render time, asked here from the delivered
      // file by different code.
      const title = /<title>([\s\S]*?)<\/title>/.exec(page.html)?.[1] ?? "";
      expect(title.length).toBeGreaterThan(0);
      const expected = resolveFamily(role, title).family;
      const declared = customProperty(page.html, "--title-family");
      expect(declared).not.toBeNull();
      expect(head(declared!)).toBe(expected);
    });

    it(`should actually draw its title with it — ${where}`, () => {
      // A custom property nothing reads is a direction that reached the file and not the reader.
      // TWO ROUTES, because the two genres deliver one differently and both reach the reader. A map
      // page's stylesheet reads the property (`font-family: var(--title-family)`); a `chart-web`
      // page's component writes the display register's whole declaration block onto the title's own
      // inline style, so the family is ON the element rather than referenced from a rule. Requiring
      // only the first reddened every directed chart × web page in the tree for setting its title in
      // exactly the face the direction filed.
      const family = head(customProperty(page.html, "--title-family")!);
      const titleStyle =
        /class="chart-title"[^>]*style="([^"]*)"/.exec(page.html)?.[1] ?? "";
      const drawnInline = new RegExp(`font-family:[^;]*${family}`).test(
        unescapeHtml(titleStyle),
      );
      expect(
        /font-family:\s*var\(--title-family\)/.test(page.html) || drawnInline,
        `${where} names ${family} and neither reads --title-family in a rule nor sets it on the ` +
          `title itself`,
      ).toBe(true);
    });

    it(`should carry the face it names, as bytes — ${where}`, () => {
      const family = head(customProperty(page.html, "--title-family")!);
      const faces = [...page.html.matchAll(/@font-face\s*\{([^{}]*)\}/g)].map(
        (m) => m[1],
      );
      const carried = faces.some((face) =>
        new RegExp(`font-family:\\s*["']?${family}["']?\\s*;`).test(face),
      );
      expect(carried).toBe(true);
    });

    it(`should not fall back to a generic keyword for any register it declares — ${where}`, () => {
      const generic = new Set([
        "serif",
        "sans-serif",
        "monospace",
        "cursive",
        "fantasy",
        "system-ui",
      ]);
      const bad: string[] = [];
      for (const m of page.html.matchAll(/(--[a-z-]*family)\s*:\s*([^;{}]+)/g))
        if (generic.has(head(m[2]).toLowerCase()))
          bad.push(`${m[1]} is ${m[2].trim()}`);
      expect(bad).toEqual([]);
    });
  }
});

/*
 * THE MUTATIONS THAT REDDEN IT, each run against this tree and then reverted.
 *
 *   1. `figureVars` emits `"--title-family": family(regs.axis)` instead of `regs.display`
 *      -> "should set its title in the DISPLAY register's own family — mapgen-locator-web/locator.html"
 *         expect("Open Sans").toBe("Merriweather")
 *
 *   2. `.mw-title`'s rule reads `font-family: ${fontStack}` (the body stack) instead of
 *      `var(--title-family)`
 *      -> "should actually draw its title with it — mapgen-locator-web/locator.html"
 *         expected /font-family:\s*var\(--title-family\)/ to match
 */
