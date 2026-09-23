/**
 * A RUN AT ONE SIZE MUST NEVER DELETE ANOTHER SIZE'S DELIVERED RENDER.
 *
 * Every directed runner clears the stale PNG when a direction refuses, so nothing on disk reads as a
 * fresh render of a direction that declined. That cleanup was written before `--size` existed and
 * named the file `${id}.png` — the LANDSCAPE name — while the writer had already moved to
 * `nameAtSize(id, SIZE)`. Measured twice on 2026-09-23: a portrait sweep deleted 124 committed
 * landscape renders the first time, and after a partial fix the same sweep deleted 22 more, because
 * thirty-three runners still carried the old spelling.
 *
 * The rule the fix rests on: the name a runner DELETES is the name that runner WRITES. This file
 * holds every runner to it by reading the source, because the defect is invisible to any test that
 * renders at one size only.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

function videoRunners(): { beat: string; source: string }[] {
  if (!existsSync(PROOF)) return [];
  return readdirSync(PROOF, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ beat: e.name, path: join(PROOF, e.name, "render-directions-video.mjs") }))
    .filter((r) => existsSync(r.path))
    .map(({ beat, path }) => ({ beat, source: readFileSync(path, "utf8") }));
}

function runners(): { beat: string; source: string }[] {
  if (!existsSync(PROOF)) return [];
  return readdirSync(PROOF, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ beat: e.name, path: join(PROOF, e.name, "render-directions.mjs") }))
    .filter((r) => existsSync(r.path))
    .map(({ beat, path }) => ({ beat, source: readFileSync(path, "utf8") }));
}

describe("a directed runner", () => {
  it("is found at all, so this file cannot pass by looking at nothing", () => {
    expect(runners().length).toBeGreaterThanOrEqual(30);
  });

  it("never removes a render by its landscape name", () => {
    const destructive = runners()
      .filter(({ source }) => /rm\(\s*join\(\s*OUT\s*,\s*`\$\{id\}\./.test(source))
      .map(({ beat }) => beat);
    expect(destructive).toEqual([]);
  });

  it("removes the same name it writes, at whatever size the run asked for", () => {
    const wrong = runners()
      .filter(({ source }) => /await rm\(/.test(source))
      .filter(({ source }) => !/rm\(\s*join\(\s*OUT\s*,\s*`\$\{nameAtSize\(id, SIZE\)\}\./.test(source))
      .map(({ beat }) => beat);
    expect(wrong).toEqual([]);
  });

  it("has `nameAtSize` and `SIZE` in scope wherever it spells them", () => {
    const unscoped = runners()
      .filter(({ source }) => /nameAtSize\(id, SIZE\)/.test(source))
      .filter(
        ({ source }) =>
          !/import\s*\{[^}]*\bnameAtSize\b[^}]*\}\s*from\s*"#shared\/chart-beat\/directed-size\.mjs"/s.test(
            source,
          ) || !/const SIZE = exportSizeFromArgv\(\)/.test(source),
      )
      .map(({ beat }) => beat);
    expect(unscoped).toEqual([]);
  });
});

/**
 * A RUN THAT DELIVERS NOTHING MAY REMOVE NOTHING.
 *
 * The video runners take `--check`: build the direction, hold every event's last frame to the type
 * floor, spawn no renderer. It delivers nothing — and it went through the same `catch` that clears a
 * refused direction's stale files. Measured 2026-09-23: a check run while a layout was being edited
 * threw, and `video-waterfall-germany-electricity-bridge` lost its delivered landscape mp4, its final
 * frame and its props. The cleanup is right for a render and wrong for a check, and the difference is
 * whether anything was going to be written at all.
 */
describe("a video runner asked only to check", () => {
  it("is found at all, so this file cannot pass by looking at nothing", () => {
    expect(videoRunners().length).toBeGreaterThanOrEqual(30);
  });

  it("removes nothing, because it writes nothing", () => {
    const destructive = videoRunners()
      .filter(({ source }) => /--check/.test(source))
      .filter(({ source }) => !/if \(!checkOnly\) for \(const path of outputs\)/.test(source))
      .map(({ beat }) => beat);
    expect(destructive).toEqual([]);
  });

  it("names what it deletes at the size the run asked for, never the landscape name", () => {
    const wrong = videoRunners()
      .filter(({ source }) => /const outputs = \[`\$\{id\}/.test(source))
      .map(({ beat }) => beat);
    expect(wrong).toEqual([]);
  });
});
