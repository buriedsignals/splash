/**
 * A HARVESTED RECORD SAYS WHICH ROUTE ANSWERED, AND WHICH DID NOT.
 *
 * The two routes are not alternatives. The style route reaches type everywhere and marks wherever
 * they are SVG; the pixel route reaches everything else — posters, canvas, video frames. Measured
 * on 2026-09-07, four informationisbeautiful.net pieces returned 17-23 type tuples and ZERO mark
 * colours: a record carrying only the style route would have looked complete and described a
 * colourless artifact.
 *
 * So the record states both, always, and a route that failed says so rather than being absent. An
 * absent key and a failed route look identical to a reader, and only one of them is honest.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const REFS = join(ROOT, "docs", "design-base", "references");

const ROUTES = ["pixel", "style"] as const;
const ROUTE_STATES = ["ok", "failed", "not-applicable"];
const ARCHIVES = [
  "url-list",
  "informationisbeautiful",
  "datavizproject",
  "buried-signals",
];

/** Every `<family>/<id>` directory under the corpus, or none if the corpus does not exist yet. */
function records(): Array<{ family: string; id: string; dir: string }> {
  if (!existsSync(REFS)) return [];
  const out = [];
  for (const family of readdirSync(REFS)) {
    const familyDir = join(REFS, family);
    if (!statSync(familyDir).isDirectory()) continue;
    for (const id of readdirSync(familyDir)) {
      const dir = join(familyDir, id);
      if (statSync(dir).isDirectory()) out.push({ family, id, dir });
    }
  }
  return out;
}

describe("every harvested record", () => {
  it("should name both routes and what each of them returned", () => {
    for (const { family, id, dir } of records()) {
      const where = `${family}/${id}`;
      const path = join(dir, "measured.json");
      expect(existsSync(path), `${where} has no measured.json`).toBe(true);
      const record = JSON.parse(readFileSync(path, "utf8"));

      expect(record.routes, `${where} names no routes`).toBeDefined();
      expect(
        Object.keys(record.routes).sort(),
        `${where} does not name both routes`,
      ).toEqual([...ROUTES]);
      for (const route of ROUTES)
        expect(
          ROUTE_STATES,
          `${where} ${route} is "${record.routes[route]?.state}"`,
        ).toContain(record.routes[route]?.state);
    }
  });

  it("should carry the facts of any route it says returned ok", () => {
    for (const { family, id, dir } of records()) {
      const where = `${family}/${id}`;
      const record = JSON.parse(
        readFileSync(join(dir, "measured.json"), "utf8"),
      );
      // A route reported "ok" with nothing behind it is the failure this catches: the record reads
      // as measured and carries no measurement.
      if (record.routes.style?.state === "ok") {
        expect(
          Array.isArray(record.style?.type),
          `${where} style ok but no type`,
        ).toBe(true);
        expect(
          record.style.type.length,
          `${where} style ok but zero type tuples`,
        ).toBeGreaterThan(0);
      }
      if (record.routes.pixel?.state === "ok") {
        expect(
          record.pixel?.ground?.hex,
          `${where} pixel ok but no ground`,
        ).toMatch(/^#[0-9A-F]{6}$/);
        expect(
          ["diverging", "sequential", "categorical", "monochrome"],
          `${where} pixel shape`,
        ).toContain(record.pixel.shape);
      }
      // And a route that failed must say why, or the next reader re-harvests blind.
      for (const route of ROUTES)
        if (record.routes[route]?.state === "failed")
          expect(
            record.routes[route].why,
            `${where} ${route} failed with no reason`,
          ).toBeTruthy();
    }
  });

  it("should say which archive it was drawn from, and carry a visual trace", () => {
    for (const { family, id, dir } of records()) {
      const where = `${family}/${id}`;
      const record = JSON.parse(
        readFileSync(join(dir, "measured.json"), "utf8"),
      );
      expect(ARCHIVES, `${where} archive is "${record.archive}"`).toContain(
        record.archive,
      );
      expect(
        record.family,
        `${where} record disagrees with its own directory`,
      ).toBe(family);
      expect(
        record.id,
        `${where} record disagrees with its own directory`,
      ).toBe(id);
      expect(
        existsSync(join(dir, "screenshot.png")),
        `${where} has no visual trace`,
      ).toBe(true);
    }
  });
});
