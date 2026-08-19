/**
 * THE ONE WAY A SELF-CONTAINED PHOTO ESSAY CAN WASTE A READER'S BANDWIDTH.
 *
 * This format embeds every photograph as a `data:` URI so the artifact references nothing outside
 * itself. `checkWeight` already refuses a beat whose photographs are too heavy in TOTAL. Nothing
 * refused weight that is not carrying anything: the same photograph embedded twice, which a beat
 * showing one image at two sizes — or repeating one in a before/after — gets to by writing exactly
 * what a journalist would expect to write. A scrolly earned this guard the hard way, at 1.33 MB
 * inlined five times into one file.
 *
 * WHAT THE CORPUS SAYS, measured 2026-08-19: this skill has NO beat under `proof/` — the two `image`
 * beats there are `image / scrolly` and belong to the scrolly vehicle. So the walking coverage here
 * is one component, this skill's own seed, and the guard's real value is at render time. That is
 * stated rather than hidden: the wiring assertion below is what makes it bite for a beat that does
 * not exist yet, and the day an image beat is written it is already covered.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { duplicatedPayload } from "../scripts/verify-image.mjs";
import { readImageMeta, readPalette, toDataUri } from "../scripts/render-still.mjs";
import { ImageBeatSeed } from "../assets/ImageBeatSeed.tsx";

const SKILL = resolve(import.meta.dirname, "..");
const SAMPLE = join(SKILL, "assets", "sample-data");

// The seed renders through resvg with the system fonts on a cold cache, the same reason
// `chart-web/test/render-web.test.ts` raises its own budget.
setDefaultTimeout(60000);

describe("an asset embedded more than once", () => {
  it("names it, with the bytes nobody benefits from", () => {
    const blob = "A".repeat(2048);
    const html = `<img src="data:image/png;base64,${blob}"><img src="data:image/png;base64,${blob}">`;
    expect(duplicatedPayload(html)).toEqual([
      { copies: 2, bytes: 2048, wastedBytes: 2048 },
    ]);
  });

  it("says nothing about an asset embedded once", () => {
    const blob = "A".repeat(2048);
    expect(duplicatedPayload(`<img src="data:image/png;base64,${blob}">`)).toEqual([]);
  });

  // A repeated icon or font scrap is not the defect, and reporting it would bury the megabyte one.
  it("ignores a repeated scrap under the floor", () => {
    const scrap = "A".repeat(512);
    const html = `<img src="data:image/png;base64,${scrap}"><img src="data:image/png;base64,${scrap}">`;
    expect(duplicatedPayload(html)).toEqual([]);
  });

  it("sorts by the waste, not by the size", () => {
    const small = "B".repeat(1200);
    const big = "C".repeat(4000);
    const html =
      `<img src="data:image/png;base64,${small}">`.repeat(4) +
      `<img src="data:image/png;base64,${big}">`.repeat(2);
    expect(duplicatedPayload(html).map((b) => b.wastedBytes)).toEqual([4000, 3600]);
  });
});

describe("the seed's own artifact", () => {
  it("embeds each of its photographs exactly once", () => {
    const manifest = JSON.parse(readFileSync(join(SAMPLE, "manifest.json"), "utf8"));
    const { ground } = readPalette(join(SKILL, "assets"), { stopAt: SKILL });
    const photos = manifest.photos.map((entry: { file: string; alt: string; credit: string; caption?: string }) => {
      const bytes = readFileSync(join(SAMPLE, entry.file));
      const meta = readImageMeta(bytes);
      return {
        label: entry.file,
        bytes,
        dataUri: toDataUri(bytes, meta.mime),
        intrinsicWidth: meta.width,
        intrinsicHeight: meta.height,
        alt: entry.alt,
        credit: entry.credit,
        caption: entry.caption,
      };
    });
    expect(photos.length).toBeGreaterThanOrEqual(2);
    const svg = renderToStaticMarkup(
      createElement(ImageBeatSeed, { photos, title: manifest.title, ground }),
    );
    expect(svg).toContain("data:image/");
    expect(duplicatedPayload(svg)).toEqual([]);
  });
});

describe("the guard is actually called", () => {
  // The standing rule in this repository: a decision nothing calls is a decision that does not run.
  // This skill's established shape is that `checkOrientation`/`checkWeight` are called by the RENDER
  // SCRIPT rather than by `renderStill`, and the duplicate check joins them there.
  it("runs inside render-preview.mjs, beside checkWeight", () => {
    const script = readFileSync(join(SKILL, "scripts", "render-preview.mjs"), "utf8");
    expect(script).toContain('from "./verify-image.mjs"');
    expect(script).toContain("duplicatedPayload(svg)");
    expect(script).toContain("checkWeight(photos)");
  });
});
