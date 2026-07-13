import { describe, it, expect } from "bun:test";
import {
  checkImageConformance,
  captionOverlapRatio,
  type ImageStory,
} from "../src/image-story";

// A minimal, fully-valid story reused across tests. Three frames (the scrolly floor),
// distinct alt/caption, per-frame credit, a sourcePassage that the caption does NOT copy.
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
        frameRef: "during.jpg",
        caption: "Machinery moves in as the embankment takes shape.",
        alt: "An excavator on bare earth beside steel piling.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage:
          "Construction crews arrived in spring and worked through the summer of 2022.",
      },
      {
        id: "f2",
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

  // --- Frame-count floor is scoped by format (spec §6.3) ---

  it("should NOT flag a single frame when no format is given (degrades to static, not an error)", () => {
    const s = validStory();
    s.frames = [s.frames[0]!];
    s.keyFrame = 0;
    expect(checkImageConformance(s).some((m) => m.includes("frame"))).toBe(
      false,
    );
  });

  it("should NOT flag a single frame for a static format (static uses the key frame)", () => {
    const s = validStory();
    s.frames = [s.frames[0]!];
    s.keyFrame = 0;
    expect(checkImageConformance(s, { format: "static" })).toEqual([]);
  });

  it("should flag a single frame for a video format (a crossfade needs 2)", () => {
    const s = validStory();
    s.frames = [s.frames[0]!];
    s.keyFrame = 0;
    expect(checkImageConformance(s, { format: "video" })).toContain(
      "only 1 frame — a video needs at least 2",
    );
  });

  it("should flag two frames for a scrolly format (the embedded scrolly floor is 3)", () => {
    const s = validStory();
    s.frames = s.frames.slice(0, 2);
    s.keyFrame = 0;
    expect(checkImageConformance(s, { format: "scrolly" })).toContain(
      "only 2 frames — a scrolly needs at least 3",
    );
  });

  it("should accept exactly 3 frames for a scrolly (boundary)", () => {
    expect(checkImageConformance(validStory(), { format: "scrolly" })).toEqual(
      [],
    );
  });

  it("should flag an empty frames array with no crash", () => {
    const s = validStory();
    s.frames = [];
    s.keyFrame = 0;
    const out = checkImageConformance(s);
    expect(out.some((m) => m.includes("frame"))).toBe(true);
  });

  it("should not throw when frames is missing entirely (no stack trace, spec §7)", () => {
    const s = validStory() as unknown as { frames?: unknown };
    delete s.frames;
    expect(() => checkImageConformance(s as ImageStory)).not.toThrow();
    expect(checkImageConformance(s as ImageStory)).toContain(
      "missing frames — an image story needs a frames array",
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
    expect(checkImageConformance(s)).toContain("keyFrame 5 out of range [0,3)");
  });

  it("should flag a non-integer keyFrame", () => {
    const s = validStory();
    s.keyFrame = 1.5;
    expect(checkImageConformance(s)).toContain(
      "keyFrame 1.5 out of range [0,3)",
    );
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

  it("should flag an empty frame id", () => {
    const s = validStory();
    s.frames[1]!.id = "  ";
    expect(checkImageConformance(s)).toContain(
      "frame at index 1 has an empty id",
    );
  });

  it("should flag an empty frameRef", () => {
    const s = validStory();
    s.frames[0]!.frameRef = "";
    expect(checkImageConformance(s)).toContain(
      'frame "f0" has an empty frameRef — every frame references a raw image',
    );
  });

  it("should flag a duplicate frame id", () => {
    const s = validStory();
    s.frames[1]!.id = "f0";
    expect(checkImageConformance(s)).toContain('duplicate frame id "f0"');
  });

  it("should flag a frame whose caption is missing its sourcePassage", () => {
    const s = validStory();
    s.frames[0]!.sourcePassage = "";
    expect(checkImageConformance(s)).toContain(
      'frame "f0" has no sourcePassage — an article-derived caption must record the passage it came from',
    );
  });

  it("should flag a caption that copies its sourcePassage", () => {
    const s = validStory();
    s.frames[0]!.sourcePassage =
      "Residents recall a quiet towpath where families once walked on Sundays.";
    s.frames[0]!.caption =
      "residents recall a quiet towpath where families once walked";
    const out = checkImageConformance(s);
    expect(
      out.some((m) =>
        m.includes('frame "f0" caption too close to its source passage'),
      ),
    ).toBe(true);
  });

  it("should honour a custom overlapThreshold that FLIPS the outcome", () => {
    // The caption shares 1 of its 2 content bigrams ("old bridge") with the passage → 0.5.
    // It must NOT flag at the 0.6 default, and MUST flag at a 0.4 override — proving the
    // override actually changes the verdict (not merely re-confirming the default).
    const s = validStory();
    s.frames[0]!.sourcePassage = "old bridge still stands";
    s.frames[0]!.caption = "old bridge collapsed";
    const flagged = (out: string[]) =>
      out.some((m) => m.includes("too close to its source passage"));
    expect(flagged(checkImageConformance(s))).toBe(false); // default 0.6
    expect(flagged(checkImageConformance(s, { overlapThreshold: 0.4 }))).toBe(
      true,
    );
  });

  it("should report every violation of a multiply-broken story at once", () => {
    const s = validStory();
    s.title = "";
    s.frames[0]!.alt = "";
    s.frames[1]!.credit = { name: "" };
    const out = checkImageConformance(s);
    expect(out).toContain("missing story title");
    expect(out.some((m) => m.includes('frame "f0" has empty alt'))).toBe(true);
    expect(out.some((m) => m.includes('frame "f1" has no photo credit'))).toBe(
      true,
    );
    expect(out.length).toBeGreaterThanOrEqual(3);
  });
});

describe("captionOverlapRatio", () => {
  it("should score a self-contained rephrase low even when it shares a place name and year", () => {
    // The caption reuses only "as"/"workers" from the passage (2 of its 7 content words);
    // the number "2019" never tokenizes, and "Annemasse" isn't reused by the caption at all.
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

  it("should flag a reorder that keeps verbatim content runs intact", () => {
    // The two lifted runs ("families once walked" and "quiet towpath") are reordered but intact,
    // so most of the caption's content bigrams are shared → 0.67, caught. (A full shuffle that
    // broke every adjacency would not — an accepted tradeoff for not crying wolf on terse captions.)
    const caption = "families once walked the quiet towpath";
    const passage = "the quiet towpath where families once walked on sundays";
    expect(captionOverlapRatio(caption, passage)).toBeGreaterThan(0.6);
  });

  it("should flag a verbatim tail excerpt of a LONGER passage (containment, not Jaccard)", () => {
    // The caption is a verbatim tail of the passage; a shared proper name ("Annemasse") does not
    // distort the bigram score, and the longer passage does not dilute containment the way
    // Jaccard's union would. Both content bigrams are lifted → 1.0.
    const caption = "Annemasse burned through the night.";
    const passage = "Residents fled as Annemasse burned through the night.";
    expect(captionOverlapRatio(caption, passage)).toBeGreaterThan(0.6);
  });

  it("should flag a verbatim copy written in Title Case / ALL CAPS", () => {
    // A word-for-word copy typeset in a caption house style (Title Case) must still flag — the
    // measure is case-insensitive and phrase-based, so casing cannot hide a copy (this was a
    // 0.000 false negative when capitalization was read as a proper-noun signal).
    const caption = "The Machinery Moved In As The Embankment Took Shape";
    const passage =
      "the machinery moved in as the embankment took shape over months";
    expect(captionOverlapRatio(caption, passage)).toBeGreaterThan(0.6);
  });

  it("should NOT flag a terse caption that only reuses the subject's unavoidable topic nouns", () => {
    // A photo of a protest must say "protesters"/"march"/"downtown"; those isolated topic nouns
    // appear scattered in the passage but never as a shared run → 0, not a copy.
    const caption = "Protesters march downtown";
    const passage =
      "Thousands of protesters filled the streets as the march reached downtown.";
    expect(captionOverlapRatio(caption, passage)).toBeLessThan(0.6);
  });

  it("should NOT flag a caption that names the subject with a different word", () => {
    // The caption says "Firefighters" where the passage says "Crews" — it cannot be a copy; only
    // the domain pair "battled blaze" is shared (1 of 2 bigrams) → 0.5, under threshold.
    const caption = "Firefighters battled the blaze";
    const passage = "Crews battled the blaze for hours before dawn.";
    expect(captionOverlapRatio(caption, passage)).toBeLessThan(0.6);
  });

  it("should measure the caption side (directed containment), not a symmetric ratio", () => {
    // A 3-word caption fully contained in a long passage scores 1.0; the reverse (long text
    // vs short) scores much lower — the tripwire asks "is the CAPTION lifted", not vice-versa.
    const caption = "families once walked";
    const passage =
      "families once walked the quiet towpath every single sunday";
    expect(captionOverlapRatio(caption, passage)).toBeGreaterThan(0.9);
    expect(captionOverlapRatio(passage, caption)).toBeLessThan(0.6);
  });

  it("should NOT flag a terse independent caption sharing only stopwords + one common noun", () => {
    // Function words ("over", "the") carry no plagiarism signal. A 2-content-word caption that
    // shares only "harbour" with its topically-matched passage must stay under threshold — this
    // was a 0.75 false positive back when stopwords counted toward the containment denominator.
    const caption = "Dawn over the harbour";
    const passage = "trade over the harbour has collapsed";
    expect(captionOverlapRatio(caption, passage)).toBeLessThan(0.6);
  });

  it("should return 0 for disjoint content", () => {
    expect(captionOverlapRatio("alpha beta gamma", "delta epsilon zeta")).toBe(
      0,
    );
  });
});
