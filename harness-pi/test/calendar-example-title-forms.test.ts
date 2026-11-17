import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStoryboard } from "../craft/_shared/guards.mjs";

// gx-calendar-heatmap web, Qwen3.5-9B (mvq51): the first render was refused for the short title form
// "31 jours d'affilée au-dessus de 20 °C à Genève", copied from the kit's own example, which drops the year.
// An example must pass the guard it teaches.
const takeaway = JSON.parse(readFileSync(join(import.meta.dir, "../eval/sheets/gx-calendar-heatmap.web.json"), "utf8")).takeaway;
// The values the example's template literals take on the sheet's data.
const VALUES: Record<string, string> = { "best.length": "31", THRESHOLD: "20", UNIT: "°C", year: "2024" };

function titleOf(format: string): string[] {
  const src = readFileSync(join(import.meta.dir, `../craft/${format}/calendar-heatmap.gestures/beat.example.mjs`), "utf8");
  const block = /\btitle:\s*\[([\s\S]*?)\],/.exec(src)?.[1] ?? "";
  return [...block.matchAll(/`([^`]*)`/g)].map((m) =>
    m[1].replace(/\$\{([^}]+)\}/g, (_, name: string) => {
      if (!(name in VALUES)) throw new Error(`no value for \${${name}}`);
      return VALUES[name];
    }),
  );
}

describe("the calendar-heatmap examples' title forms", () => {
  for (const format of ["static", "web", "video", "scrolly"]) {
    it(`should pass the shorter-form guard in the ${format} example`, () => {
      const root = mkdtempSync(join(tmpdir(), "splash-calendar-title-"));
      const dir = join(root, "beats", "1");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(root, "STORYBOARD.md"), `---\ntakeaway: "${takeaway}"\n---\n`);
      const title = titleOf(format);
      expect(title.length).toBeGreaterThan(1);
      expect(() => applyStoryboard({ title }, dir)).not.toThrow();
    });
  }
});
