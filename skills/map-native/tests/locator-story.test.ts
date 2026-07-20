import { describe, it, expect } from "bun:test";
import {
  deriveLocatorStory,
  revealTriggersByLabel,
  markTriggerFrames,
} from "../src/locator-story";
import type { Beat } from "../src/map-story";
import type { Phase } from "../src/story-timeline";

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

  it("few-regime: every reveal stays framed on the whole zone (all places bbox), not a tight per-place box", () => {
    const beats = deriveLocatorStory(few, {
      title: "Where the ceremony unfolded",
    });
    const establish = beats.find((b) => b.kind === "establish")!;
    for (const r of beats.filter((b) => b.kind === "reveal")) {
      expect(r.camera).toEqual(establish.camera); // same zone as the establishing shot
    }
  });

  it("gives a single-marker category a non-degenerate camera (no over-zoom)", () => {
    // "cultural" has one marker (C); its camera bbox must not collapse to zero extent.
    const beats = deriveLocatorStory(many, {
      title: "Landmark sites across Europe",
    });
    const cultural = beats
      .filter((b) => b.kind === "reveal")
      .find((r) => r.copy.includes("cultural"))!;
    const [w, s, e, n] = cultural.camera;
    expect(e - w).toBeGreaterThan(0);
    expect(n - s).toBeGreaterThan(0);
  });
});

describe("revealTriggersByLabel", () => {
  const beat = (kind: Beat["kind"], highlight: string[] = []): Beat => ({
    kind,
    camera: [0, 0, 1, 1],
    highlight,
    dim: kind === "reveal",
    callout: null,
    copy: "",
  });
  const phase = (startFrame: number): Phase => ({
    startFrame,
    moveFrames: 39,
    holdFrames: 90,
  });

  it("maps EVERY label in a reveal beat's highlight[] (not just [0]) to that beat's start frame — the categorized-regime case", () => {
    const beats = [
      beat("title"),
      beat("establish"),
      beat("reveal", ["A", "B"]), // one category beat highlighting two markers
      beat("reveal", ["C"]),
      beat("takeaway"),
    ];
    const phases = [phase(0), phase(30), phase(150), phase(300), phase(450)];
    const m = revealTriggersByLabel(beats, phases);
    expect(m.get("A")).toBe(150);
    expect(m.get("B")).toBe(150);
    expect(m.get("C")).toBe(300);
  });

  it("ignores non-reveal beats and keeps the FIRST trigger for a repeated label", () => {
    const beats = [beat("title"), beat("reveal", ["A"]), beat("reveal", ["A"])];
    const phases = [phase(0), phase(30), phase(200)];
    const m = revealTriggersByLabel(beats, phases);
    expect(m.get("A")).toBe(30);
  });
});

describe("markTriggerFrames (locator)", () => {
  const markers = [{ label: "A" }, { label: "B" }, { label: "C" }];

  it("context: every marker shares the establish beat's own start frame", () => {
    const m = markTriggerFrames(markers, "context", 75, new Map());
    expect(m.get("A")).toBe(75);
    expect(m.get("B")).toBe(75);
    expect(m.get("C")).toBe(75);
  });

  it("sequential: a marker with its own reveal-beat trigger (possibly shared with a category-mate) triggers at that beat's start frame", () => {
    const revealTriggers = new Map([
      ["A", 150],
      ["B", 150], // A and B share ONE category reveal beat
    ]);
    const m = markTriggerFrames(markers, "sequential", 75, revealTriggers);
    expect(m.get("A")).toBe(150);
    expect(m.get("B")).toBe(150);
  });

  it("sequential: a marker with no reveal beat (beyond maxReveals) never triggers", () => {
    const revealTriggers = new Map([["A", 150]]);
    const m = markTriggerFrames(markers, "sequential", 75, revealTriggers);
    expect(m.get("C")).toBe(Number.POSITIVE_INFINITY);
  });
});
