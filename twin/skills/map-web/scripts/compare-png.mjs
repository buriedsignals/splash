// twin/skills/map-web/scripts/compare-png.mjs
//
// A tolerant PNG comparison, decoded through a real Chrome `<canvas>` rather than a byte-equality
// check. Discovered necessary while wiring `render-preview.mjs`'s own `--check`: two headless-Chrome
// screenshots of the IDENTICAL self-contained HTML, launched back-to-back on the same machine, were
// NOT always byte-identical — a handful of anti-aliased text-edge pixels differ between launches
// even with `--font-render-hinting=none`/`--disable-lcd-text` set. The rendered PICTURE is what
// this genre's own verification rule cares about (`references/map-web-discipline.md`,
// "Verification": prove it by screenshotting, not by measuring a value that contradicts the
// screenshot) — a handful of sub-perceptible pixels differing between two runs of the SAME input is
// not "the seed changed and the preview did not"; `committed.equals(png)` was answering a stricter,
// wrong question. This compares by DECODED PIXELS with a small per-channel tolerance and a tiny
// allowed fraction of differing pixels, not by raw bytes.
//
// No new dependency: decodes both PNGs on a real `<canvas>` inside an already-open puppeteer page
// (Chrome already has to be on this machine for `render-preview.mjs`/`bake-plate.mjs` — this reuses
// that requirement rather than adding an image-decoding npm package for one comparison).

/**
 * @param {import('puppeteer').Page} page an already-open, otherwise-idle puppeteer page
 * @param {Buffer} a
 * @param {Buffer} b
 * @param {{ tolerance?: number, maxDiffFraction?: number }} [options]
 *   `tolerance`: the largest per-channel (R/G/B) difference still considered "the same pixel".
 *   `maxDiffFraction`: the largest share of pixels allowed to exceed that tolerance before the two
 *   images are considered genuinely different, not launch-to-launch anti-aliasing jitter.
 */
export async function comparePngBuffers(page, a, b, options = {}) {
  const { tolerance = 6, maxDiffFraction = 0.002 } = options;
  // `page.screenshot()` returns a plain `Uint8Array` under Bun, not a Node `Buffer` — its own
  // `.toString("base64")` silently IGNORES the encoding argument and prints a comma-joined decimal
  // array instead (caught here the hard way: every screenshot "failed to decode" as an image
  // because what was actually sent as the data URI was never valid base64 in the first place).
  // `Buffer.from` on an already-real Buffer is a no-op view, so this is safe for file-read buffers
  // too.
  const toBase64 = (buf) => Buffer.from(buf).toString("base64");
  const aUrl = `data:image/png;base64,${toBase64(a)}`;
  const bUrl = `data:image/png;base64,${toBase64(b)}`;

  const result = await page.evaluate(
    async (aUrl, bUrl, tolerance) => {
      function load(url) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("image failed to decode"));
          img.src = url;
        });
      }
      const [imgA, imgB] = await Promise.all([load(aUrl), load(bUrl)]);
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        return {
          sameSize: false,
          widthA: imgA.width,
          heightA: imgA.height,
          widthB: imgB.width,
          heightB: imgB.height,
        };
      }
      const canvas = document.createElement("canvas");
      canvas.width = imgA.width;
      canvas.height = imgA.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgA, 0, 0);
      const dataA = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgB, 0, 0);
      const dataB = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let diffPixels = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        const dr = Math.abs(dataA[i] - dataB[i]);
        const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
        const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
        if (dr > tolerance || dg > tolerance || db > tolerance) diffPixels++;
      }
      return { sameSize: true, diffPixels, totalPixels: dataA.length / 4 };
    },
    aUrl,
    bUrl,
    tolerance,
  );

  if (!result.sameSize) {
    return {
      same: false,
      reason: `size mismatch: ${result.widthA}x${result.heightA} vs ${result.widthB}x${result.heightB}`,
    };
  }
  const fraction = result.diffPixels / result.totalPixels;
  return {
    same: fraction <= maxDiffFraction,
    diffPixels: result.diffPixels,
    totalPixels: result.totalPixels,
    fraction,
    reason:
      fraction > maxDiffFraction
        ? `${result.diffPixels}/${result.totalPixels} pixels (${(fraction * 100).toFixed(3)}%) exceed tolerance ${tolerance}, over the allowed ${(maxDiffFraction * 100).toFixed(3)}%`
        : undefined,
  };
}
