import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { assertNoEmptySplice } from "../craft/_shared/guards.mjs";

// gx-proportional-symbol web (12B, 2026-11-14, i17): after a label refusal the beat's own filter emptied `labelled`,
// and alt printed "Le plus grand, France, fait 97 GW ; viennent ensuite . Ces cercles…" — a list spliced in empty.

describe("assertNoEmptySplice", () => {
  it("should refuse a sentence whose spliced list came out empty", () => {
    expect(() =>
      assertNoEmptySplice({
        alt: "Le plus grand, France, fait 97 GW ; viennent ensuite . Ces cercles couvrent tout.",
      }),
    ).toThrow(/alt prints "ensuite \."/);
  });

  it("should refuse a value spliced in as undefined", () => {
    expect(() =>
      assertNoEmptySplice({ limits: "Hors carte : undefined." }),
    ).toThrow(/limits/);
  });

  it("should refuse a list with an empty item", () => {
    expect(() =>
      assertNoEmptySplice({ reading: "La France, , l'Espagne." }),
    ).toThrow(/reading/);
  });

  it("should pass French typography, decimals and an ellipsis", () => {
    expect(() =>
      assertNoEmptySplice({
        alt: "Le plus grand : France, 97,5 GW ; puis l'Allemagne… et « la Suède » ! Soit 1,3 %.",
        limits: "Hors carte : Algérie, Irak.",
      }),
    ).not.toThrow();
  });
});

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll } from "bun:test";

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const I17 = join(homedir(), ".splash-harness", "kept-runs", "gx-proportional-symbol-symbol-bubble-map-web-seeded-osaurus-1794664130521");
const story = join(BENCH, "stories", `zz-empty-splice-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(I17))("the bubble-map web kit", () => {
  it("should refuse i17's beat, whose alt splices an empty list", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(I17, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "web", "proportional-symbol-symbol-bubble-map")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    for (const f of ["data.json", "beat.mjs"]) cpSync(join(I17, "beats", "1", f), join(at, f));
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    expect(`${run.stdout}${run.stderr}`).toMatch(/alt prints "ensuite \."/);
  }, 120_000);
});
