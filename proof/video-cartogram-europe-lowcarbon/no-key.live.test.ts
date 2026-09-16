import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { DEFAULT_CACHE_DIR } from "../../skills/map-beat/scripts/maptiler-proxy.mjs";

/** After a render: the MapTiler key is in no file the render or the measurement wrote. Needs the worktree's .env. */
const key = mapTilerKeyIn(process.env);
const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) =>
        statSync(join(dir, f)).isDirectory()
          ? files(join(dir, f))
          : [join(dir, f)],
      )
    : [];

describe("the cartogram video's outputs", () => {
  it("should carry the MapTiler key in no render, props file, measurement or cached tile", () => {
    if (!key)
      throw new Error(
        "no MapTiler key in the environment: run with the worktree's .env loaded",
      );
    const written = [
      ...files(join(import.meta.dir, "renders")),
      ...files(DEFAULT_CACHE_DIR),
      join(import.meta.dir, "measured.json"),
    ];
    expect(written.length).toBeGreaterThan(3);
    expect(
      written.filter((f) => readFileSync(f).includes(Buffer.from(key))),
    ).toEqual([]);
  });
});
