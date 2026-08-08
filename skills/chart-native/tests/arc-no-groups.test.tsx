import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArcChart, type ArcConfig } from "../src/ArcChart";
import { specToNativeConfig } from "../src/spec-to-config";
import sample from "../assets/sample-data/arc.json";

// ---------------------------------------------------------------------------
// AN ARC WITHOUT GROUPS — which is EVERY arc a journalist can reach.
//
// `ArcConfig.group` is optional and always was, but until the flow family landed nothing
// produced a config without it: the only arc in the repo was the hand-built sample, whose
// nodes carry blocs. The `source,target,value` contract names LINKS, never a node's bloc, so
// the mapper emits none — and the group-less path had two defects nobody had ever seen,
// because nobody had ever rendered it.
//
// Both were found by rendering, not by review, and both are locked here on the rendered SVG
// rather than on the intent:
//   1. a legend with ONE entry reading "—" — the placeholder key leaking onto the graphic as
//      if it were a category the reader should know;
//   2. every arc drawn in the "within-group" muted grey at 0.28 opacity, because the emphasis
//      this type is built on is CROSS-group and there were no groups to cross. The whole
//      picture faded to context with nothing in front of it.
// …plus a third the layout showed: `legendRowCount([])` answers 1, so a strip of frame was
// reserved under the baseline for a legend that does not exist.
//
// MUTATION-VERIFIED, one at a time:
//   · `hasGroups` forced true → four of the five red, led by the "—" legend (the placeholder is
//     back on screen, and every downstream consequence of it with it).
//   · `isCross` reverted to the group comparison alone → the ink test red (every arc muted).
//   · `legendRows` reverted to the unconditional `legendRowCount(groups, …)` → the reclaimed-
//     band test red (baseline 20 px higher, the reserve back).
// ---------------------------------------------------------------------------

const GROUPED = sample as unknown as ArcConfig;
const UNGROUPED: ArcConfig = {
  ...GROUPED,
  nodes: GROUPED.nodes.map(({ id, label }) => ({ id, label })),
};

const html = (c: ArcConfig) =>
  renderToStaticMarkup(createElement(ArcChart, { config: c }));

// the arc paths' stroke + opacity, in render order
const arcs = (markup: string) =>
  [
    ...markup.matchAll(
      /class="arc-link"[^>]*?stroke="([^"]+)"[^>]*?opacity="([^"]+)"/g,
    ),
  ].map((m) => ({ stroke: m[1], opacity: Number(m[2]) }));

describe("an arc with no declared groups", () => {
  it("is what the flow contract produces — the mapper declares no group at all", () => {
    const cfg = specToNativeConfig({
      nativeType: "arc",
      title:
        "Le centre signe presque tous les textes qui franchissent le clivage",
      unit: "textes déposés conjointement",
      source: { name: "Mémorial du Grand Conseil" },
      data: "source,target,value\nPS,PLR,18\nPLR,UDC,8\nPS,UDC,4",
    } as never).config as unknown as ArcConfig;
    expect(cfg.nodes.every((n) => n.group === undefined)).toBe(true);
  });

  it("draws NO legend — the '—' placeholder never reaches the graphic", () => {
    const markup = html(UNGROUPED);
    expect(markup).not.toContain("—");
    // and the grouped sample still gets its legend, so this is not a legend regression
    expect(html(GROUPED)).toContain("Left bloc");
  });

  it("draws every arc in INK, not in the muted 'context' grey", () => {
    const ungrouped = arcs(html(UNGROUPED));
    expect(ungrouped.length).toBe(GROUPED.links.length);
    // one stroke, and it is the ink the cross-group arcs would have taken
    expect(new Set(ungrouped.map((a) => a.stroke)).size).toBe(1);
    for (const a of ungrouped) expect(a.opacity).toBeGreaterThan(0.28);
    // the grouped sample keeps BOTH bands — that distinction is the type's own subject
    expect(new Set(arcs(html(GROUPED)).map((a) => a.stroke)).size).toBe(2);
  });

  it("gives the arcs back the band the absent legend was reserving", () => {
    const baselineY = (markup: string) =>
      Number(/<line x1="0" x2="[\d.]+" y1="([\d.]+)"/.exec(markup)![1]);
    expect(baselineY(html(UNGROUPED))).toBeGreaterThan(
      baselineY(html(GROUPED)),
    );
  });

  it("keeps the group out of the node's accessible name too", () => {
    // `${label} (${group}): …` would read "PS (—): 27" to a screen reader.
    const markup = renderToStaticMarkup(
      createElement(ArcChart, { config: UNGROUPED, interactive: true }),
    );
    expect(markup).not.toMatch(/aria-label="[^"]*\(—\)/);
  });
});
