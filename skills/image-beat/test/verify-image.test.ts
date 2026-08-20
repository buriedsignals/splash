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
import { readdirSync, readFileSync } from "node:fs";
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

/**
 * SCREEN-SPACE-DASH, MEASURED HERE RATHER THAN CARRIED.
 *
 * `revealDashInScreenSpace` refuses a dash that measures its own path while `vector-effect:
 * non-scaling-stroke` computes it in screen space — a defect that needs an element with a `stroke`
 * in the first place. `map-web` reached zero dashed marks across its own five-beat corpus and still
 * CARRIES the guard, because its marks — points, lines, symbols — are drawn BY the format on
 * purpose and a future beat legitimately might dash one; the guard is a ratchet over a population
 * that could grow (`map-web/test/verify-guards.test.ts`, "a pure ratchet here, and the reader that
 * feeds it is proved live in chart-web's own walk").
 *
 * This format is not that. `references/image-discipline.md`: "a photograph is not a chart: nothing
 * here is computed from the data, because there is no data." The seed's own SVG vocabulary,
 * measured directly below rather than assumed, is exactly three elements — `<rect>` for the ground
 * and the letterbox bar, `<image>` for the photograph, `<text>` for title, caption and credit — and
 * none of the three CAN carry a `stroke`, let alone a dash. There is no population here for the
 * guard to ratchet over, and copying the decision in would be exactly the invented floor this whole
 * chantier refuses: a guard permanently proving a negative about geometry this format is
 * constitutionally incapable of drawing.
 *
 * So `screen-space-dash` is recorded in the catalogue as an EXCEPTION for `image-beat`, not
 * `carried` — argued here, with the measurement it rests on, rather than assumed in advance.
 */
describe("screen-space-dash: the population this format has to measure", () => {
  it("the seed's rendered artifact carries no element a dash could ever be authored on", () => {
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
    const svg = renderToStaticMarkup(
      createElement(ImageBeatSeed, { photos, title: manifest.title, ground }),
    );
    const elementTags = [...svg.matchAll(/<([a-zA-Z]+)[\s/>]/g)].map((m) => m[1]);
    expect(new Set(elementTags)).toEqual(new Set(["svg", "rect", "text", "g", "desc", "image"]));
    const strokeBearing = [...svg.matchAll(/<[a-zA-Z]+\s[^<>]*\bstroke[-a-zA-Z]*\s*=/g)];
    expect(strokeBearing).toEqual([]);
  });

  it("this format has drawn exactly one component on disk — its own seed, and no proof beat", () => {
    const TWIN = resolve(SKILL, "..", "..");
    const PROOF = join(TWIN, "proof");
    const authored: string[] = [];
    const walk = (at: string) =>
      readdirSync(at, { withFileTypes: true }).forEach((entry) => {
        const path = join(at, entry.name);
        if (entry.isDirectory()) return walk(path);
        if (!entry.name.endsWith(".tsx")) return;
        if (readFileSync(path, "utf8").includes("ImageBeatSeed")) authored.push(path.slice(TWIN.length + 1));
      });
    walk(PROOF);
    // Zero — the two `image / scrolly` beats on disk draw their photograph frame with a component
    // of their own (`proof/scrolly-image-grinnell-glacier/ImageFrame.tsx`), never this skill's seed:
    // that vehicle assembles its own tracks and never imports another skill's. No story has yet
    // asked for a standalone static image beat, which is the whole reason the walking half of this
    // guard has nothing to walk.
    expect(authored).toEqual([]);
  });
});
