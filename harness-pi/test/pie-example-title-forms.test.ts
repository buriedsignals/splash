import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStoryboard } from "../craft/_shared/guards.mjs";

// gx-pie-and-donut web and video, Qwen3.5-9B (mvq45, mvq46): both cells' first render was refused for the short title
// form "China: a third of the world's CO2, ..." copied from the kit's own example, which dropped the takeaway's numbers.
// An example must pass the guard it teaches.
const takeaway = JSON.parse(readFileSync(join(import.meta.dir, "../eval/sheets/gx-pie-and-donut.web.json"), "utf8")).takeaway;

function titleOf(format: string): string[] {
  const src = readFileSync(join(import.meta.dir, `../craft/${format}/pie-and-donut.gestures/beat.example.mjs`), "utf8");
  const block = /\btitle:\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? "";
  return [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
}

describe("the pie-and-donut examples' title forms", () => {
  for (const format of ["static", "web", "video", "scrolly"]) {
    it(`should pass the shorter-form guard in the ${format} example`, () => {
      const root = mkdtempSync(join(tmpdir(), "splash-pie-title-"));
      const dir = join(root, "beats", "1");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(root, "STORYBOARD.md"), `---\ntakeaway: "${takeaway}"\n---\n`);
      const title = titleOf(format);
      expect(title.length).toBeGreaterThan(1);
      expect(() => applyStoryboard({ title }, dir)).not.toThrow();
    });
  }
});
