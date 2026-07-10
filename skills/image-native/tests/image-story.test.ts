import { describe, it, expect } from "bun:test";
import {
  checkImageConformance,
  captionOverlapRatio,
  type ImageStory,
} from "../src/image-story";

// A minimal, fully-valid story reused across tests. Two frames, distinct alt/caption,
// per-frame credit, a sourcePassage that the caption does NOT copy.
function validStory(): ImageStory {
  return {
    title: "The canal that split a village",
    description: "How the new waterway reshaped daily life, 2019–2024.",
    source: { name: "Heidi.news" },
    keyFrame: 0,
    fit: "canvas-frame",
    imageDir: "/tmp/frames",
    frames: [
      {
        id: "f0",
        frameRef: "before.jpg",
        caption: "The eastern bank before the works began.",
        alt: "A grassy riverbank with a footpath and two benches.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage:
          "Residents recall a quiet towpath where families once walked on Sundays.",
      },
      {
        id: "f1",
        frameRef: "after.jpg",
        caption: "The same bank, now a concrete embankment.",
        alt: "A concrete embankment with construction fencing and a crane.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage:
          "By 2024 the towpath had become a hard embankment lined with steel piles.",
      },
    ],
  };
}

describe("checkImageConformance", () => {
  it("should return no violations for a fully valid story", () => {
    expect(checkImageConformance(validStory())).toEqual([]);
  });

  it("should flag a missing title", () => {
    const s = validStory();
    s.title = "  ";
    expect(checkImageConformance(s)).toContain("missing story title");
  });

  it("should flag a missing description", () => {
    const s = validStory();
    s.description = "";
    expect(checkImageConformance(s)).toContain(
      "missing description — a module must state what/when/where",
    );
  });

  it("should flag a missing source name", () => {
    const s = validStory();
    s.source = { name: "" };
    expect(checkImageConformance(s)).toContain(
      "missing source name — an embedded module must carry its own source",
    );
  });

  it("should flag fewer than 2 frames (no crossfade possible)", () => {
    const s = validStory();
    s.frames = [s.frames[0]!];
    s.keyFrame = 0;
    expect(checkImageConformance(s)).toContain(
      "only 1 frame — an image sequence needs at least 2",
    );
  });

  it("should flag more than 6 frames (too long for an embedded module)", () => {
    const s = validStory();
    const base = s.frames[0]!;
    s.frames = Array.from({ length: 7 }, (_, i) => ({ ...base, id: `f${i}` }));
    expect(checkImageConformance(s)).toContain(
      "7 frames — an embedded image scrolly is capped at 6; cull upstream",
    );
  });

  it("should flag a keyFrame index out of range", () => {
    const s = validStory();
    s.keyFrame = 5;
    expect(checkImageConformance(s)).toContain("keyFrame 5 out of range [0,2)");
  });

  it("should flag a frame with empty alt (WCAG 1.1.1)", () => {
    const s = validStory();
    s.frames[1]!.alt = "   ";
    expect(checkImageConformance(s)).toContain(
      'frame "f1" has empty alt — a photo needs a text alternative describing what is visible',
    );
  });

  it("should flag alt identical to caption (they answer different questions)", () => {
    const s = validStory();
    s.frames[0]!.alt = s.frames[0]!.caption;
    expect(checkImageConformance(s)).toContain(
      'frame "f0" alt duplicates its caption — alt describes what is visible, caption states significance',
    );
  });

  it("should flag a frame missing a photo credit", () => {
    const s = validStory();
    s.frames[0]!.credit = { name: "" };
    expect(checkImageConformance(s)).toContain(
      'frame "f0" has no photo credit — each image carries its own attribution',
    );
  });

  it("should flag an empty caption", () => {
    const s = validStory();
    s.frames[1]!.caption = "";
    expect(checkImageConformance(s)).toContain('frame "f1" has empty caption');
  });

  it("should flag a duplicate frame id", () => {
    const s = validStory();
    s.frames[1]!.id = "f0";
    expect(checkImageConformance(s)).toContain('duplicate frame id "f0"');
  });
});

describe("captionOverlapRatio", () => {
  it("should score a self-contained rephrase low even when it shares a place name and year", () => {
    // Shared tokens are the proper noun "Annemasse" and the number "2019" — both excluded.
    const caption = "The frontier town swelled as workers arrived.";
    const passage =
      "Annemasse grew fast after 2019 as cross-border workers poured in.";
    expect(captionOverlapRatio(caption, passage)).toBeLessThan(0.3);
  });

  it("should score a near-verbatim copy high", () => {
    const passage =
      "Residents recall a quiet towpath where families once walked on Sundays.";
    const caption =
      "residents recall a quiet towpath where families once walked";
    expect(captionOverlapRatio(caption, passage)).toBeGreaterThan(0.6);
  });

  it("should be symmetric and return 0 for disjoint content", () => {
    expect(captionOverlapRatio("alpha beta gamma", "delta epsilon zeta")).toBe(
      0,
    );
  });
});
