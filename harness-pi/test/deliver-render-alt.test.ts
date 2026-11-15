import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderAlt } from "../src/tools/deliver.ts";

function beatWith(file: string, body: string) {
  const beat = mkdtempSync(join(tmpdir(), "beat-"));
  mkdirSync(join(beat, "renders"));
  writeFileSync(join(beat, "renders", file), body);
  return beat;
}

// gx-area web delivery (12B, 2026-11-15): the page's first aria-label was a gesture step's ("Le stock entier"), and
// HANDOVER.md told the journalist to paste it as the alt text; the beat's own alt was in the chart's <desc>.
describe("renderAlt", () => {
  it("should read the root svg's aria-label in a static render", () => {
    const beat = beatWith("a.svg", '<svg role="img" aria-label="The whole finding."><g aria-label="a step"/></svg>');
    expect(renderAlt(beat)).toBe("The whole finding.");
  });

  it("should read the chart's desc in a web page, not a mark's or a step's aria-label", () => {
    const beat = beatWith("a.html", '<div aria-label="Le stock entier"></div><svg><desc>Aire des émissions : 49,9 % du stock.</desc><circle role="img" aria-label="CO₂ · 1858"/></svg>');
    expect(renderAlt(beat)).toBe("Aire des émissions : 49,9 % du stock.");
  });
});
