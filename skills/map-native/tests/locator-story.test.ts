import { describe, it, expect } from "bun:test";
import { deriveLocatorStory } from "../src/locator-story";

const few = [
  {
    lon: 2.35,
    lat: 48.85,
    label: "Eiffel Tower",
    note: "Opening ceremony start",
  },
  { lon: 2.34, lat: 48.86, label: "Louvre", note: "Riverfront stage" },
];
const many = [
  { lon: 2.35, lat: 48.85, label: "A", category: "port" },
  { lon: 9.19, lat: 45.46, label: "B", category: "port" },
  { lon: 12.5, lat: 41.9, label: "C", category: "cultural" },
];

describe("deriveLocatorStory", () => {
  it("few-regime: title + establish + one reveal per place + takeaway", () => {
    const beats = deriveLocatorStory(few, {
      title: "Where the ceremony unfolded",
    });
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(2);
    expect(beats[beats.length - 1].kind).toBe("takeaway");
  });

  it("few-regime reveal copy uses the marker note (falls back to label)", () => {
    const beats = deriveLocatorStory(few, {
      title: "Where the ceremony unfolded",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].copy).toBe("Opening ceremony start");
    expect(reveals[0].highlight).toEqual(["Eiffel Tower"]);
  });

  it("categorized-regime: one reveal per category (not per marker)", () => {
    const beats = deriveLocatorStory(many, {
      title: "Landmark sites across Europe",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(2); // "cultural" + "port", NOT 3 markers
    // categories are sorted; each reveal highlights all its markers and states the count
    expect(reveals[0].copy).toContain("cultural");
    const portReveal = reveals.find((r) => r.copy.includes("port"));
    expect(portReveal?.highlight.sort()).toEqual(["A", "B"]);
  });

  it("caps the reveals at maxReveals", () => {
    const beats = deriveLocatorStory(
      few,
      { title: "Where the ceremony unfolded" },
      { maxReveals: 1 },
    );
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(1);
  });
});
