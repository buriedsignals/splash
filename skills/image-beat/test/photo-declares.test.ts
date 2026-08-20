/**
 * WHAT `imageBeatLayout` ALREADY REFUSES TO RENDER WITHOUT, MADE MECHANICALLY CHECKABLE.
 *
 * A photo missing alt text or a credit never reaches the page at all — `imageBeatLayout`
 * (`../assets/ImageBeatSeed.tsx`) throws before drawing it. `photosDeclareAltAndCredit` is the
 * measurement that guarantee earns: reading the two fields straight off the delivered markup's own
 * `aria-label` and `data-credit`, rather than trusting that a write-time refusal always ran.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { photosDeclareAltAndCredit } from "../scripts/detect-every-photo-says-what-it-shows.mjs";
import { readImageMeta, readPalette, toDataUri } from "../scripts/render-still.mjs";
import { ImageBeatSeed } from "../assets/ImageBeatSeed.tsx";

const SKILL = resolve(import.meta.dirname, "..");
const SAMPLE = join(SKILL, "assets", "sample-data");

// The seed renders through resvg with the system fonts on a cold cache, the same reason
// `verify-image.test.ts` raises its own budget.
setDefaultTimeout(60000);

describe("photosDeclareAltAndCredit", () => {
  it("counts a photo carrying both an alt and a credit", () => {
    const html = `<g role="img" aria-label="A glacier front" data-credit="Jane Doe / Agency"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 0,
      missingCredit: 0,
    });
  });

  it("names a photo with no aria-label at all", () => {
    const html = `<g role="img" data-credit="Jane Doe"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 1,
      missingCredit: 0,
    });
  });

  it("names a photo whose aria-label is empty", () => {
    const html = `<g role="img" aria-label="" data-credit="Jane Doe"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 1,
      missingCredit: 0,
    });
  });

  it("names a photo with no data-credit at all", () => {
    const html = `<g role="img" aria-label="A glacier front"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 0,
      missingCredit: 1,
    });
  });

  it("names a photo whose data-credit is empty", () => {
    const html = `<g role="img" aria-label="A glacier front" data-credit="  "></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 0,
      missingCredit: 1,
    });
  });

  it("says nothing about a group that is not role=img", () => {
    const html = `<g aria-label="not a photo"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 0,
      missingAlt: 0,
      missingCredit: 0,
    });
  });

  it("counts every photo independently, worst offenders included", () => {
    const html =
      `<g role="img" aria-label="First" data-credit="Credit"></g>` +
      `<g role="img" data-credit="Credit"></g>` +
      `<g role="img" aria-label="Third"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 3,
      missingAlt: 1,
      missingCredit: 1,
    });
  });
});

describe("the seed's own artifact", () => {
  it("declares alt and credit for every photo it draws", () => {
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
    const found = photosDeclareAltAndCredit(svg);
    expect(found.photos).toBe(photos.length);
    expect(found.missingAlt).toBe(0);
    expect(found.missingCredit).toBe(0);
  });
});
