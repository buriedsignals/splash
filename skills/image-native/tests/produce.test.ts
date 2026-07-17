// produce.mjs — the engine's single-format entry (same CLI contract as the other
// engines: <config> <outDir> <format>). v1 builds "scrolly" ONLY:
//   conformance fail-hard → prep → skills/scrolly build (visual:"image" config) →
//   scrolly.html asserted non-empty.
import { describe, it, expect, beforeAll } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { ImageStory } from "../src/image-story";

const SCRIPT = join(import.meta.dir, "..", "scripts", "produce.mjs");
const SKILL_DIR = join(import.meta.dir, "..");

function story(imageDir: string): ImageStory {
  return {
    title: "The canal that split a village",
    description: "How the new waterway reshaped daily life, 2019–2024.",
    source: { name: "Heidi.news" },
    keyFrame: 0,
    fit: "canvas-frame",
    imageDir,
    frames: ["f0", "f1", "f2"].map((id, i) => ({
      id,
      frameRef: `${id}.png`,
      caption: `Scene ${i + 1} of the transformation along the eastern bank.`,
      alt: `Distinct fixture scene number ${i + 1}.`,
      credit: { name: "Jane Doe / Agence Photo" },
      sourcePassage: `Original article passage number ${i + 1}, telling this moment differently.`,
    })),
  };
}

function run(args: string[]) {
  return execFileSync("bun", [SCRIPT, ...args], {
    cwd: SKILL_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runExpectFail(args: string[]): {
  status: number | null;
  stderr: string;
} {
  try {
    run(args);
  } catch (e) {
    const err = e as { status?: number | null; stderr?: Buffer | string };
    return {
      status: err.status ?? null,
      stderr:
        typeof err.stderr === "string"
          ? err.stderr
          : (err.stderr?.toString("utf8") ?? ""),
    };
  }
  throw new Error("expected the produce CLI to exit non-zero");
}

let imageDir: string;

beforeAll(async () => {
  imageDir = mkdtempSync(join(tmpdir(), "image-native-produce-fixtures-"));
  const hues: [number, number, number][] = [
    [180, 60, 60],
    [60, 180, 60],
    [60, 60, 180],
  ];
  for (let i = 0; i < 3; i++) {
    await sharp({
      create: {
        width: 64,
        height: 36,
        channels: 3,
        background: { r: hues[i][0], g: hues[i][1], b: hues[i][2] },
      },
    })
      .png()
      .toFile(join(imageDir, `f${i}.png`));
  }
});

describe("image-native produce.mjs — single-format CLI (scrolly v1)", () => {
  it('rejects any format other than "scrolly" with the v1 message', () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-produce-fmt-"));
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(story(imageDir)));
    const { status, stderr } = runExpectFail([
      storyPath,
      join(workDir, "out"),
      "static",
    ]);
    expect(status).toBe(1);
    expect(stderr).toContain(
      'image-native builds "scrolly" only in v1 — static/video are follow-ups',
    );
  });

  it("fails hard on a conformance violation, with the violation on stderr", () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-produce-conf-"));
    const bad = story(imageDir);
    bad.frames[1].alt = ""; // WCAG floor: every frame needs a text alternative
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(bad));
    const { status, stderr } = runExpectFail([
      storyPath,
      join(workDir, "out"),
      "scrolly",
    ]);
    expect(status).not.toBe(0);
    expect(stderr).toContain("empty alt");
  });

  it("builds a non-empty scrolly.html from a valid story (prep → scrolly build)", () => {
    const workDir = mkdtempSync(join(tmpdir(), "image-native-produce-ok-"));
    const storyPath = join(workDir, "image-story.json");
    writeFileSync(storyPath, JSON.stringify(story(imageDir)));
    const outDir = join(workDir, "out");
    const stdout = run([storyPath, outDir, "scrolly"]).toString("utf8");

    const html = join(outDir, "scrolly.html");
    expect(existsSync(html)).toBe(true);
    expect(statSync(html).size).toBeGreaterThan(10_000);
    // prepped frames + prep report land beside it (the self-contained work dir)
    expect(existsSync(join(outDir, "frames", "f0.jpg"))).toBe(true);
    expect(existsSync(join(outDir, "prep-report.json"))).toBe(true);
    expect(stdout).toContain("PRODUCE_RESULT");
  }, 120_000);
});
