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
    const beat = beatWith("a.html", '<div aria-label="Le stock entier"></div><svg aria-label="Le titre"><desc>Aire des émissions : 49,9 % du stock.</desc><circle role="img" aria-label="CO₂ · 1858"/></svg>');
    expect(renderAlt(beat)).toBe("Aire des émissions : 49,9 % du stock.");
  });

  // gx-area scrolly delivery (12B, 2026-11-15): the scrolly page carries its alt on the figure's <div role="img">; with
  // no alt read, the 12B passed its own ("growth of various demographics", in English) into HANDOVER.md.
  it("should read the figure's role=img label in a scrolly page", () => {
    const beat = beatWith("a.html", '<svg><title>Titre</title></svg><div role="img" aria-label="Aire des émissions : 49,9 % du stock."></div>');
    expect(renderAlt(beat)).toBe("Aire des émissions : 49,9 % du stock.");
  });

  // gx-area video delivery (12B, 2026-11-15): the frames sheet carries only its title; that is the best alt there is.
  it("should fall back to an svg's label when the render carries no alt of its own", () => {
    const beat = beatWith("a-frames.svg", '<svg aria-label="La moitié du CO₂ suisse depuis 1858 a été émise après 1986"></svg>');
    expect(renderAlt(beat)).toBe("La moitié du CO₂ suisse depuis 1858 a été émise après 1986");
  });
});
