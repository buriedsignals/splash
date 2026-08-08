import { describe, it, expect } from "bun:test";
import { checkScrollyConformance } from "../src/conformance";
import type { ScrollyStory } from "../../scrolly/src/chapters";

const good: ScrollyStory = {
  title: "A river's path from Tibet to the sea",
  description: "The route crosses several territories.",
  source: { name: "Natural Earth", url: "https://naturalearthdata.com" },
  visual: "map",
  steps: [
    {
      id: "s0",
      visual: "map",
      action: "flyTo",
      ref: 0,
      prose: "Intro caption here.",
    },
    { id: "s1", visual: "map", action: "drawTo", ref: 0, prose: "China" },
    { id: "s2", visual: "map", action: "drawTo", ref: 1, prose: "India" },
  ],
};

describe("checkScrollyConformance", () => {
  it("accepts a well-formed story", () => {
    expect(
      checkScrollyConformance({ story: good, territoryCount: 2 }).violations,
    ).toEqual([]);
  });

  it("rejects fewer than 2 steps", () => {
    const s = { ...good, steps: [good.steps[0]] };
    expect(
      checkScrollyConformance({ story: s }).violations.join(" "),
    ).toContain("at least 2 steps");
  });

  it("rejects empty prose", () => {
    const s = {
      ...good,
      steps: [good.steps[0], { ...good.steps[1], prose: "  " }],
    };
    expect(
      checkScrollyConformance({ story: s }).violations.join(" "),
    ).toContain("empty prose");
  });

  it("rejects a drawTo ref beyond the territory count", () => {
    expect(
      checkScrollyConformance({
        story: good,
        territoryCount: 1,
      }).violations.join(" "),
    ).toContain("out of range");
  });

  it("rejects a missing source", () => {
    const s = { ...good, source: undefined };
    expect(
      checkScrollyConformance({ story: s }).violations.join(" "),
    ).toContain("cite a source");
  });
});

// ---------------------------------------------------------------------------
// A CAPTION WITH A HOLE IN IT IS NOT A CAPTION.
//
// The locator defect shipped "Pont d'Austerlitz — , the highest of the 5 shown" and
// "Notre-Dame de Paris —" onto a delivered page: a "<name> — <value>" template rendered
// against a value that never existed. The composer was fixed (chapters.ts's `nameAndValue`
// only joins parts that exist), and this is the net UNDER that fix — every caption path
// this contract validates, present and future, is checked for the same shape rather than
// trusted not to reintroduce it.
// ---------------------------------------------------------------------------
describe("checkScrollyConformance — an empty slot in a composed caption", () => {
  const withProse = (prose: string): ScrollyStory => ({
    ...good,
    steps: [good.steps[0]!, { ...good.steps[1]!, prose }],
  });

  it("rejects a caption left hanging on its separator", () => {
    for (const prose of [
      "Notre-Dame de Paris —",
      "Rue du Stand 26 — ",
      "Pont Alexandre III –",
    ]) {
      const v = checkScrollyConformance({ story: withProse(prose) }).violations;
      expect(v.join(" ")).toMatch(/empty slot|dangling/i);
    }
  });

  it("rejects a caption that OPENS on the separator — the mirror, name slot empty", () => {
    // Measured on a delivered symbol scrolly whose CSV had no label column.
    for (const prose of ["— 220 MW, le plus élevé des 4", " — 90 MW"]) {
      const v = checkScrollyConformance({ story: withProse(prose) }).violations;
      expect(v.join(" ")).toMatch(/empty slot|dangling/i);
    }
  });

  it("rejects a caption whose value slot rendered empty mid-sentence", () => {
    const v = checkScrollyConformance({
      story: withProse("Pont d'Austerlitz — , the highest of the 5 shown"),
    }).violations;
    expect(v.join(" ")).toMatch(/empty slot|dangling/i);
  });

  it("leaves a legitimate em-dash caption alone", () => {
    for (const prose of [
      "Norway — 99%, the highest of the 8 shown",
      "Écoles — 3 sites",
      "Ligne de départ où la parade est entrée — un dimanche de juillet.",
      "Genève",
    ]) {
      expect(
        checkScrollyConformance({ story: withProse(prose) }).violations,
      ).toEqual([]);
    }
  });
});
