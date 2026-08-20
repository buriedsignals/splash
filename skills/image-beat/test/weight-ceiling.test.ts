/**
 * THE DELIVERED FILE'S OWN WEIGHT — NO LONGER AGAINST A PLACEHOLDER SEED'S OWN RENDER.
 *
 * There is NO image beat under `proof/` yet — `test/verify-image.test.ts`'s own doc comment states
 * this for `duplicatedPayload`, and it is still true here: the two `image` beats on disk are
 * `image / scrolly` and belong to the vehicle. `CEILING_BYTES`
 * (`../scripts/detect-weight-has-a-ceiling.mjs`) used to be set at this skill's own seed render's
 * byte length — three PLACEHOLDER thumbnails, not a real beat's own photographs. Ruled 2026-08-20:
 * taken instead from this skill's own EXISTING weight discipline, `checkWeight`
 * (`../scripts/render-still.mjs`)'s `WEIGHT_LIMIT_BYTES`, scaled by the base64 inflation
 * `references/image-discipline.md`, "Weight", already documents.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  weightAgainstCeiling,
  CEILING_BYTES,
  RAW_PHOTOGRAPH_LIMIT_BYTES,
  BASE64_INFLATION,
} from "../scripts/detect-weight-has-a-ceiling.mjs";
import { readImageMeta, readPalette, toDataUri, WEIGHT_LIMIT_BYTES } from "../scripts/render-still.mjs";
import { ImageBeatSeed } from "../assets/ImageBeatSeed.tsx";

const SKILL = resolve(import.meta.dirname, "..");
const SAMPLE = join(SKILL, "assets", "sample-data");

// The seed renders through resvg with the system fonts on a cold cache, the same reason
// `verify-image.test.ts` raises its own budget.
setDefaultTimeout(60000);

describe("weightAgainstCeiling", () => {
  it("says a file under the ceiling is not over", () => {
    expect(weightAgainstCeiling(100, 200)).toEqual({
      bytes: 100,
      ceiling: 200,
      over: false,
    });
  });

  it("says a file over the ceiling is over", () => {
    expect(weightAgainstCeiling(300, 200)).toEqual({
      bytes: 300,
      ceiling: 200,
      over: true,
    });
  });

  it("does not count a file sitting exactly on the ceiling as over", () => {
    expect(weightAgainstCeiling(200, 200).over).toBe(false);
  });
});

describe("this format's ceiling is derived from its own weight discipline, not a placeholder seed", () => {
  it("mirrors checkWeight's own raw photograph limit", () => {
    expect(RAW_PHOTOGRAPH_LIMIT_BYTES).toBe(WEIGHT_LIMIT_BYTES);
  });

  // RULED 2026-08-20: the ceiling used to be 38 682 bytes, this skill's own seed render from three
  // placeholder thumbnails — a real beat's own photographs were always going to weigh more than
  // that, and a ceiling standing in for a real measurement it never was is worse than no ceiling.
  it("is the raw limit inflated by base64, not the seed's placeholder render", () => {
    expect(CEILING_BYTES).toBe(Math.ceil(RAW_PHOTOGRAPH_LIMIT_BYTES * BASE64_INFLATION));
    expect(CEILING_BYTES).toBeGreaterThan(38682);
  });
});

describe("the seed's own artifact", () => {
  it("weighs at or under this format's own measured ceiling", () => {
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
    const bytes = Buffer.byteLength(svg, "utf8");
    const found = weightAgainstCeiling(bytes, CEILING_BYTES);
    expect(found.over).toBe(false);
  });
});
