/**
 * A DIRECTION IS MEASURED ON THE GRAPHIC, NEVER ON THE PAGE AROUND IT.
 *
 * THE DEFECT, MEASURED. `harvest.mjs` photographs the largest painted `svg | canvas | figure img`
 * and calls it the piece's graphic. On `100.datavizproject.com` the largest such element is
 * `logo-100.svg`, 280 x 80 at (80, 0) — the site's own wordmark. Too small to photograph, so the
 * pixel route fell back to the whole page, and the dominant chromatic colour it then reported —
 * `#3274DA` at 10.5% on `viz1`, 9.0% on `viz57` — is **Ferdio's fixed navigation bar** (1440 x 80,
 * 8.9% of a 1440 x 900 shot). It happens to be the same blue the charts are drawn in, which is why
 * nobody noticed: the number was plausible, the route reported `ok`, and it was wrong.
 *
 * A ground, an accent and a palette shape are the whole substance of a direction. Read off a page
 * they are the SITE's chrome, not the piece's design. So a direction may only cite a reference the
 * pixel route measured on the graphic itself.
 *
 * This does not condemn the records — a page measurement is still a true fact about the page, and
 * the type the style route read is untouched. It condemns using one to found a direction.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const BASE = join(ROOT, "docs", "design-base");
const DIRECTIONS = join(BASE, "directions");
const REFS = join(BASE, "references");

const dirsIn = (p: string) =>
  existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : [];

/** Every reference's pixel provenance, keyed by id. */
function measuredOn(): Map<string, string> {
  const out = new Map<string, string>();
  for (const family of dirsIn(REFS))
    for (const id of dirsIn(join(REFS, family))) {
      const path = join(REFS, family, id, "measured.json");
      if (!existsSync(path)) continue;
      const record = JSON.parse(readFileSync(path, "utf8"));
      out.set(id, record.routes?.pixel?.measuredFrom ?? "none");
    }
  return out;
}

describe("a filed direction", () => {
  it("should be measured on a reference's own graphic, not on the page around it", () => {
    if (!existsSync(DIRECTIONS)) return;
    const provenance = measuredOn();
    for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
      const from = readFileSync(join(DIRECTIONS, file), "utf8").match(/^- measuredFrom:\s*(\S+)/m)?.[1];
      expect(from, `${file} names no reference`).toBeTruthy();
      expect(
        provenance.get(from),
        `${file} is measured from ${from}, whose pixel route read "${provenance.get(from)}" — a ` +
          `page shot carries the site's chrome, and a ground taken from one is the site's, not the piece's`,
      ).toBe("graphic.png");
    }
  });

  it("should say, in every record measured on a page, that it was", () => {
    // Not every reference founds a direction, and a page measurement is still a true fact about the
    // page. What it may never do is look like a reading of the graphic.
    const provenance = measuredOn();
    for (const family of dirsIn(REFS))
      for (const id of dirsIn(join(REFS, family))) {
        if (provenance.get(id) !== "screenshot.png") continue;
        const notes = join(REFS, family, id, "NOTES.md");
        if (!existsSync(notes)) continue;
        const text = readFileSync(notes, "utf8");
        expect(
          /screenshot\.png|whole page|page shot|the page around|site's own chrome|page rather than the graphic/i.test(text),
          `${family}/${id} was measured on the page and its note does not say so`,
        ).toBe(true);
      }
  });
});
