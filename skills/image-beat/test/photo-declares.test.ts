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

// Finding 8 (round-two stress): `imageBeatLayout` throws before drawing an EMPTY alt or credit,
// so the detector's own failure mode was unreachable through the normal write path — a beat
// could only ever reach this measurement carrying fields that are already non-empty. The stress
// story `stories/stress-h-site-photographs` shipped anyway, by naming the gap in the text itself
// (`"[alt text not supplied by the newsroom]"`) rather than leaving the field blank — a real,
// frozen, delivered beat the write-time refusal never sees, because the string it is checking is
// not empty. A capability that reports this artefact clean has not measured anything: this is
// the decision that it does not, by treating a bracket-wrapped placeholder the same as absence.
describe("photosDeclareAltAndCredit reads a placeholder as absence, not as an answer", () => {
  it("counts a bracket-wrapped alt placeholder as missing, not present", () => {
    const html = `<g role="img" aria-label="[alt text not supplied by the newsroom]" data-credit="Jane Doe"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 1,
      missingCredit: 0,
    });
  });

  it("counts a bracket-wrapped credit placeholder as missing, not present", () => {
    const html = `<g role="img" aria-label="A glacier front" data-credit="[credit not supplied by the newsroom]"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 0,
      missingCredit: 1,
    });
  });

  it("does not flag ordinary prose that merely contains a bracket", () => {
    const html = `<g role="img" aria-label="A sign reading [closed] hangs on the gate" data-credit="Jane Doe"></g>`;
    expect(photosDeclareAltAndCredit(html)).toEqual({
      photos: 1,
      missingAlt: 0,
      missingCredit: 0,
    });
  });
});

describe("the delivered stress-h beat — the failure mode made reachable", () => {
  it("reports the placeholder alt and the placeholder credit it actually shipped, not clean", () => {
    const STORIES = resolve(SKILL, "..", "..", "stories");
    const svg = readFileSync(
      join(
        STORIES,
        "stress-h-site-photographs",
        "beats",
        "stress-h-site-photographs",
        "renders",
        "still.svg",
      ),
      "utf8",
    );
    const found = photosDeclareAltAndCredit(svg);
    expect(found.photos).toBe(3);
    expect(found.missingAlt).toBe(1);
    expect(found.missingCredit).toBe(1);
  });
});
