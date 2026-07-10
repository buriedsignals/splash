import { describe, it, expect } from "bun:test";
import { checkImageConformance, type ImageStory } from "../src/image-story";

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
});
