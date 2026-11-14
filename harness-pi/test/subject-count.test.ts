import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { assertSubjectCountWhole } from "../craft/_shared/guards.mjs";

// gx-proportional-symbol static (Qwen3.5-9B, 2026-11-14): the key's accent line printed "69 sites nucléaires" —
// cut.drawnSubject — while data.json holds 72 nuclear sites, three of them under the 500 MW cut.

describe("assertSubjectCountWhole", () => {
  it("should refuse a subject line that counts only the drawn subject circles", () => {
    expect(() => assertSubjectCountWhole("69 sites nucléaires", { drawnSubject: 69, totalSubject: 72 })).toThrow(
      /subjectNote\(cut\) prints 69.*72 rows are subject rows.*cut\.totalSubject/,
    );
  });

  it("should pass the whole group's count", () => {
    expect(() => assertSubjectCountWhole("72 sites nucléaires", { drawnSubject: 69, totalSubject: 72 })).not.toThrow();
  });

  it("should pass the drawn count when the line also gives the whole", () => {
    expect(() => assertSubjectCountWhole("72 sites nucléaires, dont 69 dessinés", { drawnSubject: 69, totalSubject: 72 })).not.toThrow();
  });

  it("should pass the drawn count when every subject circle is drawn", () => {
    expect(() => assertSubjectCountWhole("72 sites nucléaires", { drawnSubject: 72, totalSubject: 72 })).not.toThrow();
  });

  it("should read a count with a thousands group", () => {
    expect(() => assertSubjectCountWhole("1 204 écoles", { drawnSubject: 1204, totalSubject: 1310 })).toThrow(/prints 1204/);
  });
});

import { afterAll } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const KEPT = join(homedir(), ".splash-harness", "kept-runs", "gx-proportional-symbol-symbol-bubble-map-seeded-osaurus-qwen-1794690957651");
const KIT = join(HARNESS, "craft", "static", "proportional-symbol-symbol-bubble-map.gestures");
const dir = join(BENCH, "stories", `zz-subject-count-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function render(beat: string) {
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(KEPT, f), join(dir, f));
  for (const src of [join(HARNESS, "craft", "_shared"), KIT]) for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
  cpSync(join(KEPT, "beats", "1", "data.json"), join(at, "data.json"));
  writeFileSync(join(at, "beat.mjs"), beat);
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
  return `${run.stdout}${run.stderr}`;
}

describe.skipIf(!process.env.MAPTILER_KEY || !existsSync(join(BENCH, "package.json")) || !existsSync(KEPT))("the static bubble-map gesture kit", () => {
  it("should refuse Qwen's beat, whose key says 69 nuclear sites of 72", () => {
    expect(render(readFileSync(join(KEPT, "beats", "1", "beat.mjs"), "utf8"))).toMatch(/subjectNote\(cut\) prints 69/);
  }, 180_000);

  it("should not refuse its own worked example on that line", () => {
    const out = render(readFileSync(join(KIT, "beat.example.mjs"), "utf8"));
    expect(out).toMatch(/threshold \d+ · \d+ of \d+ drawn/);
    expect(out).not.toMatch(/subjectNote\(cut\) prints/);
  }, 180_000);
});
