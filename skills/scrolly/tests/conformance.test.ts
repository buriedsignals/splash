import { describe, it, expect } from "bun:test";
import { checkScrollyConformance } from "../src/conformance";
import type { ScrollyStory } from "../src/chapters";

const ok: ScrollyStory = {
  title: "Renewables across Europe",
  visual: "map",
  steps: [
    { id: "a", visual: "map", action: "flyTo", ref: 0, prose: "Intro" },
    { id: "b", visual: "map", action: "flyTo", ref: 1, prose: "Norway" },
    { id: "c", visual: "map", action: "flyTo", ref: 2, prose: "Poland" },
  ],
};

describe("checkScrollyConformance", () => {
  it("passes a well-formed story", () => {
    expect(checkScrollyConformance(ok, 3)).toEqual([]);
  });
  it("flags fewer than 3 steps", () => {
    const r = checkScrollyConformance(
      { ...ok, steps: ok.steps.slice(0, 2) },
      3,
    );
    expect(r.some((v) => /step/i.test(v))).toBe(true);
  });
  it("flags an empty-prose step", () => {
    const bad = {
      ...ok,
      steps: [
        ...ok.steps,
        {
          id: "d",
          visual: "map",
          action: "flyTo",
          ref: 3,
          prose: "  ",
        } as const,
      ],
    };
    expect(checkScrollyConformance(bad, 4).some((v) => /prose/i.test(v))).toBe(
      true,
    );
  });
  it("flags a map step whose beat ref is out of range", () => {
    const bad = {
      ...ok,
      steps: [
        ...ok.steps,
        {
          id: "d",
          visual: "map",
          action: "flyTo",
          ref: 9,
          prose: "x",
        } as const,
      ],
    };
    expect(
      checkScrollyConformance(bad, 4).some((v) => /ref|range/i.test(v)),
    ).toBe(true);
  });
});
