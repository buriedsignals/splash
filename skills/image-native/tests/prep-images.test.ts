// prep-images.mjs — the deterministic image-prep CLI (spec §8, v1 scrolly slice).
// Contract under test:
//   bun scripts/prep-images.mjs <image-story.json> <outDir>
//     → <outDir>/frames/<id>.jpg per frame (sRGB JPEG, EXIF-stripped, fitted to the
//       article-web 1200×675 box: "canvas-frame" = contain on a themed canvas,
//       "crop" = cover; per-frame `fit` override wins over story.fit)
//     → <outDir>/prep-report.json ({ frames: [{ id, src, width, height, bytes }] },
//       in STORY order)
//   A frameRef that resolves to a missing file exits non-zero with the filename on
//   stderr (an editorial prompt, never a stack trace requirement — but the name must
//   be there so the journalist knows WHICH image is missing).
import { describe, it, expect, beforeAll } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { ImageStory } from "../src/image-story";

const SCRIPT = join(import.meta.dir, "..", "scripts", "prep-images.mjs");
const SKILL_DIR = join(import.meta.dir, "..");

// article-web media box (skills/splash/src/channel.ts) — the v1 scrolly target.
const BOX = { width: 1200, height: 675 };

function story(
  imageDir: string,
  overrides: Partial<ImageStory> = {},
): ImageStory {
  return {
    title: "The canal that split a village",
    description: "How the new waterway reshaped daily life, 2019–2024.",
    source: { name: "Heidi.news" },
    keyFrame: 0,
    fit: "canvas-frame",
    imageDir,
    frames: [
      {
        id: "before",
        frameRef: "before.png",
        caption: "The eastern bank before the works began.",
        alt: "A grassy riverbank with a footpath and two benches.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage:
          "Residents recall a quiet towpath where families once walked on Sundays.",
      },
      {
        id: "after",
        frameRef: "after.png",
        caption: "The same bank, now a concrete embankment.",
        alt: "A concrete wall along the water with a metal railing.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage: "By 2024 the eastern bank had been rebuilt in concrete.",
        fit: "crop",
      },
    ],
    ...overrides,
  };
}

function runPrep(storyPath: string, outDir: string) {
  return execFileSync("bun", [SCRIPT, storyPath, outDir], {
    cwd: SKILL_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

let imageDir: string;

beforeAll(async () => {
  imageDir = mkdtempSync(join(tmpdir(), "image-native-fixtures-"));
  // Two tiny distinct PNGs: a portrait one (canvas-frame must letterbox it into the
  // landscape box) and a wide one (crop must cover the box).
  await sharp({
    create: {
      width: 40,
      height: 80,
      channels: 3,
      background: { r: 200, g: 30, b: 30 },
    },
  })
    .png()
    .toFile(join(imageDir, "before.png"));
  await sharp({
    create: {
      width: 160,
      height: 40,
      channels: 3,
      background: { r: 30, g: 30, b: 200 },
    },
  })
    .png()
    .toFile(join(imageDir, "after.png"));
});

describe("prep-images.mjs — deterministic frame prep", () => {
  it("writes one fitted JPEG per frame at the target box, plus a story-ordered prep-report.json", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-prep-"));
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(story(imageDir), null, 2));
    const outDir = join(workDir, "out");

    runPrep(storyPath, outDir);

    // Both frames exist and are real JPEGs at exactly the target box.
    for (const id of ["before", "after"]) {
      const framePath = join(outDir, "frames", `${id}.jpg`);
      expect(existsSync(framePath)).toBe(true);
      const meta = await sharp(framePath).metadata();
      expect(meta.format).toBe("jpeg");
      expect(meta.width).toBe(BOX.width);
      expect(meta.height).toBe(BOX.height);
    }

    // prep-report.json lists the frames in STORY order with the real file facts.
    const report = JSON.parse(
      readFileSync(join(outDir, "prep-report.json"), "utf8"),
    ) as {
      frames: {
        id: string;
        src: string;
        width: number;
        height: number;
        bytes: number;
      }[];
    };
    expect(report.frames.map((f) => f.id)).toEqual(["before", "after"]);
    for (const f of report.frames) {
      expect(f.width).toBe(BOX.width);
      expect(f.height).toBe(BOX.height);
      expect(f.bytes).toBeGreaterThan(0);
      expect(existsSync(join(outDir, f.src))).toBe(true);
    }
  });

  it("canvas-frame letterboxes (content contained), crop covers — the per-frame override wins", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-prep-fit-"));
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(story(imageDir), null, 2));
    const outDir = join(workDir, "out");
    runPrep(storyPath, outDir);

    // "before" (story default canvas-frame): a portrait red image contained in the
    // landscape box → the left edge is the matte (near-white), not the red content.
    const beforeRaw = await sharp(join(outDir, "frames", "before.jpg"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * beforeRaw.info.width + x) * beforeRaw.info.channels;
      return [beforeRaw.data[i], beforeRaw.data[i + 1], beforeRaw.data[i + 2]];
    };
    const [mr, mg, mb] = px(2, Math.floor(BOX.height / 2)); // far-left: matte
    expect(mr).toBeGreaterThan(200);
    expect(mg).toBeGreaterThan(200);
    expect(mb).toBeGreaterThan(200);
    const [cr2, cg2] = px(
      Math.floor(BOX.width / 2),
      Math.floor(BOX.height / 2),
    ); // centre: content
    expect(cr2).toBeGreaterThan(150);
    expect(cg2).toBeLessThan(100);

    // "after" (frame override crop): a blue image covers the box → the far-left pixel
    // is CONTENT (blue), no matte anywhere.
    const afterRaw = await sharp(join(outDir, "frames", "after.jpg"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const j =
      (Math.floor(BOX.height / 2) * afterRaw.info.width + 2) *
      afterRaw.info.channels;
    expect(afterRaw.data[j + 2]).toBeGreaterThan(150); // blue channel
    expect(afterRaw.data[j]).toBeLessThan(100); // red channel
  });

  it("is deterministic — two runs produce byte-identical frames", () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-prep-det-"));
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(story(imageDir), null, 2));
    const outA = join(workDir, "a");
    const outB = join(workDir, "b");
    runPrep(storyPath, outA);
    runPrep(storyPath, outB);
    for (const id of ["before", "after"]) {
      const a = readFileSync(join(outA, "frames", `${id}.jpg`));
      const b = readFileSync(join(outB, "frames", `${id}.jpg`));
      expect(a.equals(b)).toBe(true);
    }
  });

  it("exits non-zero with the missing filename on stderr when a frameRef does not resolve", () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-prep-missing-"));
    const s = story(imageDir);
    s.frames[1].frameRef = "nowhere-to-be-found.png";
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(s, null, 2));
    const outDir = join(workDir, "out");

    let failed = false;
    try {
      runPrep(storyPath, outDir);
    } catch (e) {
      failed = true;
      const err = e as { status?: number | null; stderr?: Buffer | string };
      expect(err.status).not.toBe(0);
      const stderr =
        typeof err.stderr === "string"
          ? err.stderr
          : (err.stderr?.toString("utf8") ?? "");
      expect(stderr).toContain("nowhere-to-be-found.png");
    }
    expect(failed).toBe(true);
  });
});
