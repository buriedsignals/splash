/**
 * WHEN THE GRAPHIC IS IN ANOTHER DOCUMENT, THE TYPE MUST COME FROM THAT DOCUMENT.
 *
 * THE DEFECT, MEASURED ON 2026-09-08. Every informationisbeautiful.net piece embeds its
 * visualisation from `vizsweet.com` in a 1380 x 806 frame. The host page holds the article, the
 * byline and a promo banner — and not one label of the graphic. Twenty records were filed carrying
 * 17-23 type tuples from that host page: IBM Plex Sans and Quicksand, which is the publisher's
 * article furniture. The graphic's own voice, re-measured, is Inter Tight — 45.2 for the title,
 * uppercase at 14 for the film names — and it had never been read.
 *
 * Nothing was red. Both routes reported `ok`, the tuples were real, and they described the wrong
 * document. So: a record whose graphic is a frame carries that frame's reading beside the host's,
 * and if it could not be read it says why. A missing key and an unreadable frame look identical to
 * the next reader, and only one of them is honest.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const REFS = join(ROOT, "docs", "design-base", "references");

const dirsIn = (p: string) =>
  existsSync(p)
    ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory())
    : [];

function records() {
  const out: Array<{ where: string; record: any }> = [];
  for (const family of dirsIn(REFS))
    for (const id of dirsIn(join(REFS, family))) {
      const path = join(REFS, family, id, "measured.json");
      if (!existsSync(path)) continue;
      out.push({
        where: `${family}/${id}`,
        record: JSON.parse(readFileSync(path, "utf8")),
      });
    }
  return out;
}

describe("a reference whose graphic is a frame", () => {
  it("should carry the frame's own reading, or say why it has none", () => {
    for (const { where, record } of records()) {
      if (record.style?.graphic?.tag !== "iframe") continue;
      const frame = record.style.graphicFrame;
      expect(
        frame,
        `${where} measured an iframe and read nothing inside it`,
      ).toBeDefined();
      expect(frame.url, `${where} names no frame url`).toBeTruthy();
      // Either it was read, or the record says what stopped it. Never neither.
      if (!frame.why)
        expect(
          frame.type?.length,
          `${where} claims to have read its frame and carries no type`,
        ).toBeGreaterThan(0);
    }
  });

  it("should not be the host page's reading under another name", () => {
    // The precise failure this catches: a harvester that reports a frame it never entered, by
    // handing back the document it already had. Two documents can share a family — the same
    // designer often sets both — but the full tuple list, six axes and counts and samples, is a
    // fingerprint. Identical means one reading was filed twice.
    for (const { where, record } of records()) {
      const frame = record.style?.graphicFrame;
      if (!frame?.type?.length || !record.style?.type?.length) continue;
      expect(
        JSON.stringify(frame.type),
        `${where}: the frame's type is byte-identical to the host page's`,
      ).not.toBe(JSON.stringify(record.style.type));
    }
  });
});
