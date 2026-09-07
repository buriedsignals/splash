/**
 * THE JOURNALIST IS TOLD WHAT WAS AVAILABLE, NOT ONLY WHAT WAS DRAWN.
 *
 * Every other gate in this system is a human one: a design review presents each criterion's verdict
 * and ends the turn; a delivery is approved, never assumed. The composer is the same shape — it
 * assembles what holds up and hands the choice over. A report that listed only the winner would
 * make it a decision rather than a proposal.
 *
 * And it must speak to a journalist. A previous export guard handed the technical cause to the
 * person least able to arbitrate it; the report says what happened to the graphic, never what the
 * code concluded.
 */
import { describe, it, expect } from "bun:test";
import { report } from "../../../scripts/design-base/compose.mjs";

const OFFERED = [
  {
    id: "nocturne+creme",
    ground: "#FFFFFF",
    accent: "#0B7A75",
    header: "stack",
    separation: { count: 6, worstPairAxes: 3 },
    provenance: {
      ground: "the newsroom's recorded palette",
      accent: "the newsroom's recorded palette",
      registers: "nocturne, measured on pudding-cool-2022-06-streaming",
      space: "creme, measured on abc-net-au-news-2024-05-23",
    },
  },
];
const REFUSED = [
  { id: "rapport", problems: ["two of its registers differ on only 1 axis"] },
];

describe("the composer's report", () => {
  it("should name what was refused and why, not only what holds up", () => {
    const text = report({ offered: OFFERED, refused: REFUSED }, { beat: { evidenceLevels: 4 } });
    expect(text).toContain("nocturne+creme");
    expect(text).toContain("rapport");
    expect(text).toContain("differ on only 1 axis");
  });

  it("should say plainly that it has not chosen", () => {
    // The whole point. A short list read as a recommendation is a decision taken silently.
    const text = report({ offered: OFFERED, refused: [] }, {});
    expect(text).toMatch(/none is chosen/i);
  });

  it("should carry the provenance of every part it proposes", () => {
    const text = report({ offered: OFFERED, refused: [] }, {});
    expect(text).toContain("the newsroom's recorded palette");
    expect(text).toContain("measured on pudding-cool-2022-06-streaming");
    expect(text).toContain("measured on abc-net-au-news-2024-05-23");
  });

  it("should speak to a journalist rather than print a diagnostic", () => {
    const text = report({ offered: [], refused: REFUSED }, {});
    expect(text).not.toMatch(/undefined|null|\[object|Error:|at \w+ \(/);
  });

  it("should still be readable when nothing holds up", () => {
    // A beat whose every candidate fails is a real outcome and the journalist must be told, not
    // handed an empty string.
    const text = report({ offered: [], refused: REFUSED }, {});
    expect(text.length).toBeGreaterThan(20);
    expect(text).toMatch(/0 art direction/);
  });
});
