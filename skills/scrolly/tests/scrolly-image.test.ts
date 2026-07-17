// The image track's PURE seams (no DOM): the ImageStory → chapters derivation
// (imageStoryToChapters, image-native's bridge export — spec §5) and the config
// dispatcher's visual resolution (resolveVisual — the seam Scrolly.tsx routes on).
// The caption is passed through AS-IS (unlike mapStoryToChapters, which derives its
// prose from the data) — the upstream conformance tripwires (§6) own its honesty.
import { describe, it, expect } from "bun:test";
import {
  imageStoryToChapters,
  type ImageStory,
} from "../../image-native/src/image-story";
import { resolveVisual } from "../src/chapters";

function story(): ImageStory {
  return {
    title: "The canal that split a village",
    description: "How the new waterway reshaped daily life, 2019–2024.",
    source: { name: "Heidi.news" },
    keyFrame: 0,
    fit: "canvas-frame",
    imageDir: "/tmp/frames",
    frames: [
      {
        id: "before",
        frameRef: "before.jpg",
        caption: "The eastern bank before the works began.",
        alt: "A grassy riverbank with a footpath and two benches.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage: "Residents recall a quiet towpath.",
      },
      {
        id: "during",
        frameRef: "during.jpg",
        caption: "Machinery moves in as the embankment takes shape.",
        alt: "An excavator on bare earth beside steel piling.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage: "Construction crews arrived in spring 2022.",
        align: "left",
      },
      {
        id: "after",
        frameRef: "after.jpg",
        caption: "The same bank, now a concrete embankment.",
        alt: "A concrete wall along the water with a metal railing.",
        credit: { name: "Marc Roy", url: "https://example-photographe.ch" },
        sourcePassage: "By 2024 the bank had been rebuilt in concrete.",
      },
    ],
  };
}

describe("imageStoryToChapters — ImageStory → ScrollyStory derivation", () => {
  it("derives one intro step plus one step per frame, in story order", () => {
    const s = imageStoryToChapters(story());
    expect(s.visual).toBe("image");
    expect(s.steps.length).toBe(4); // intro + 3 frames
    expect(s.steps.map((st) => st.ref)).toEqual([0, 0, 1, 2]);
  });

  it("passes captions through AS-IS (intro carries the description)", () => {
    const s = imageStoryToChapters(story());
    expect(s.steps[0].prose).toBe(
      "How the new waterway reshaped daily life, 2019–2024.",
    );
    expect(s.steps[1].prose).toBe("The eastern bank before the works began.");
    expect(s.steps[2].prose).toBe(
      "Machinery moves in as the embankment takes shape.",
    );
    expect(s.steps[3].prose).toBe("The same bank, now a concrete embankment.");
  });

  it("every frame step is visual:image / action:crossfade, per-frame align preserved", () => {
    const s = imageStoryToChapters(story());
    for (const st of s.steps) {
      expect(st.visual).toBe("image");
      expect(st.action).toBe("crossfade");
    }
    expect(s.steps[2].align).toBe("left");
    // step ids are unique (conformance relies on it)
    expect(new Set(s.steps.map((st) => st.id)).size).toBe(s.steps.length);
  });

  it("carries the module furniture (title / description / source)", () => {
    const s = imageStoryToChapters(story());
    expect(s.title).toBe("The canal that split a village");
    expect(s.description).toBe(
      "How the new waterway reshaped daily life, 2019–2024.",
    );
    expect(s.source).toEqual({ name: "Heidi.news" });
  });
});

describe("resolveVisual — the dispatcher seam Scrolly.tsx routes on", () => {
  it('routes visual:"image" configs to the image branch', () => {
    expect(resolveVisual({ visual: "image", story: story() })).toBe("image");
  });

  it("routes nativeType configs to the chart branch", () => {
    expect(resolveVisual({ nativeType: "line" })).toBe("chart");
  });

  it("routes everything else (the map family) to the map branch", () => {
    expect(resolveVisual({ type: "symbol" })).toBe("map");
    expect(resolveVisual({ type: "choropleth" })).toBe("map");
    expect(resolveVisual({})).toBe("map");
  });
});
