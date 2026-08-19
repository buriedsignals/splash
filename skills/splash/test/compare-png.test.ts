/**
 * THE COMPARATOR THIS SUITE NEEDED, AND WHY IT IS A COPY.
 *
 * `seed-renders-standalone.test.ts` asserted `rendered.equals(committed)` — raw bytes — and went red
 * on 2026-08-19 for `chart-video` with 20 differing pixels out of 1 166 400 (0,002 %), none of them
 * further apart than 8/255, on a seed no commit had touched. That is anti-aliasing jitter between two
 * headless-Chrome launches, not a drift: byte equality was answering a stricter, wrong question.
 *
 * `skills/map-web/scripts/compare-png.mjs` had already met the same wall and written the answer down.
 * Rather than import across a skill boundary — which this project forbids, because a skill has to stay
 * copy-pasteable on its own — the decision function is COPIED into `skills/splash/scripts/`, and the
 * copies are held together by the parity block at the bottom of this file, the same treatment
 * `helper-parity.test.ts` gives every other deliberate duplicate in the tree.
 *
 * The test PNGs are drawn in the page that is already open to do the comparing: no new dependency,
 * and the pictures are real encoded PNGs decoded by the same decoder the comparator uses.
 */
import { describe, it, expect, beforeAll, afterAll, setDefaultTimeout } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { comparePngBuffers } from "../scripts/compare-png.mjs";

const TWIN = resolve(import.meta.dirname, "../../..");

setDefaultTimeout(120000);

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason `map-web/test/standalone.test.ts`'s own copy states. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

/** A real PNG, encoded by Chrome. `shift` is added to every channel of every pixel, which is exactly
 *  the shape of the jitter this comparator exists to tolerate; `blockShift` is added only inside a
 *  square covering `blockShare` of the picture, which is the shape of a real change. */
async function png(
  size: number,
  { shift = 0, blockShift = 0, blockShare = 0 }: { shift?: number; blockShift?: number; blockShare?: number } = {},
): Promise<Buffer> {
  const base64 = await page.evaluate(
    (size, shift, blockShift, blockShare) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const image = ctx.createImageData(size, size);
      const side = Math.round(Math.sqrt(blockShare * size * size));
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const inBlock = x < side && y < side;
          const value = 100 + shift + (inBlock ? blockShift : 0);
          image.data[i] = value;
          image.data[i + 1] = value;
          image.data[i + 2] = value;
          image.data[i + 3] = 255;
        }
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    size,
    shift,
    blockShift,
    blockShare,
  );
  return Buffer.from(base64, "base64");
}

beforeAll(async () => {
  browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
  page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
});

afterAll(async () => {
  await browser?.close();
});

describe("comparePngBuffers decides whether the picture changed, not whether the bytes did", () => {
  it("should call two identical pictures the same, with no differing pixel", async () => {
    const a = await png(32);
    const verdict = await comparePngBuffers(page, a, a);
    expect(verdict.same).toBe(true);
    expect(verdict.diffPixels).toBe(0);
    expect(verdict.totalPixels).toBe(32 * 32);
  });

  it("should call a sub-tolerance shift across every pixel the same picture", async () => {
    // 20 pixels out of 1 166 400 at 6/255 was the real reading; this is the whole picture at 4/255,
    // which is strictly harder and still has to pass.
    const verdict = await comparePngBuffers(page, await png(32), await png(32, { shift: 4 }));
    expect(verdict.same).toBe(true);
    expect(verdict.diffPixels).toBe(0);
  });

  it("should refuse two pictures of different sizes without comparing a pixel", async () => {
    const verdict = await comparePngBuffers(page, await png(16), await png(32));
    expect(verdict.same).toBe(false);
    expect(verdict.reason).toContain("size mismatch");
    expect(verdict.reason).toContain("16x16");
    expect(verdict.reason).toContain("32x32");
  });

  it("should call a picture that really changed different, and say by how much", async () => {
    const verdict = await comparePngBuffers(page, await png(32), await png(32, { blockShift: 90, blockShare: 0.25 }));
    expect(verdict.same).toBe(false);
    expect(verdict.diffPixels).toBeGreaterThan(200);
    expect(verdict.fraction).toBeGreaterThan(0.002);
    expect(verdict.reason).toContain("exceed tolerance");
  });

  it("should count a change that stays under the allowed fraction as the same picture", async () => {
    // One pixel in 1024 is 0.098 %, under the 0.2 % this comparator allows.
    const verdict = await comparePngBuffers(page, await png(32), await png(32, { blockShift: 90, blockShare: 1 / 1024 }));
    expect(verdict.diffPixels).toBe(1);
    expect(verdict.same).toBe(true);
  });

  it("should let the caller tighten the tolerance until the jitter counts", async () => {
    const jittered = await png(32, { shift: 4 });
    expect((await comparePngBuffers(page, await png(32), jittered, { tolerance: 1 })).same).toBe(false);
  });

  it("should let the caller tighten the allowed fraction until one pixel counts", async () => {
    const oneOff = await png(32, { blockShift: 90, blockShare: 1 / 1024 });
    expect((await comparePngBuffers(page, await png(32), oneOff, { maxDiffFraction: 0 })).same).toBe(false);
  });
});

describe("the two copies of comparePngBuffers agree", () => {
  /** The code, without the header comment each copy carries to say why IT exists. Compared as source
   *  rather than as behaviour because there is exactly one function and it is pure once the page is
   *  handed to it — a behavioural comparison here would run the same decoder twice and prove less. */
  const codeOf = (path: string) => {
    const src = readFileSync(path, "utf8");
    const at = src.indexOf("/**");
    expect(at).toBeGreaterThan(0);
    return src.slice(at);
  };

  it("should carry the same decision in skills/splash and skills/map-web", () => {
    expect(codeOf(join(TWIN, "skills/splash/scripts/compare-png.mjs"))).toBe(
      codeOf(join(TWIN, "skills/map-web/scripts/compare-png.mjs")),
    );
  });
});
