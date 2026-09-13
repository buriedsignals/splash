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

function directedPages(): Page[] {
  if (!existsSync(PROOF)) return [];
  const out: Page[] = [];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(PROOF, entry.name);
    const direction = declaredDirection(dir);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
      const html = readFileSync(join(dir, file), "utf8");
      if (!html.includes("--title-family")) continue;
      out.push({ beat: entry.name, file, html, direction: direction ?? "" });
    }
  }
  return out;
}

/** What a custom property is set to, read out of the page's own stylesheet. */
function customProperty(html: string, name: string): string | null {
  const hit = new RegExp(`${name}\\s*:\\s*([^;{}]+)`).exec(html);
  return hit ? hit[1].trim() : null;
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
      expect(page.html).toMatch(/font-family:\s*var\(--title-family\)/);
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
