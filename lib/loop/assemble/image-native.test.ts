import { test, expect } from "bun:test";
import { assembleImageNative } from "./image-native";
import {
  checkImageConformance,
  type ImageStory,
} from "../../../skills/image-native/src/image-story";
import type { ProductionBrief } from "../../core/production-brief";

// Three photographs, three authored beats forming a real arc (establish/turn/payoff) — the
// journalist's own words and images, nothing derived.
const IMAGE_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "image-scrolly",
  format: "scrolly",
  angle: {
    confirmedTakeaway: "The canal split the village in two",
    altInsight:
      "Three photographs tracing the waterway from field to concrete channel",
  },
  dataCsv: "",
  attribution: "M. Rossi",
  beats: [
    { role: "establish", text: "The eastern bank before the works began." },
    { role: "turn", text: "Machinery moves in as the embankment takes shape." },
    { role: "payoff", text: "The same bank, now a concrete embankment." },
  ],
  images: {
    dir: "/tmp/annemasse-canal",
    frames: [
      {
        frameRef: "before.jpg",
        alt: "A grassy riverbank with a footpath and two benches.",
        credit: { name: "M. Rossi" },
      },
      {
        frameRef: "during.jpg",
        alt: "An excavator on bare earth beside steel piling.",
        credit: { name: "M. Rossi" },
      },
      {
        frameRef: "after.jpg",
        alt: "A concrete embankment with construction fencing and a crane.",
        credit: { name: "M. Rossi" },
      },
    ],
  },
};

test("captions are the authored beats, alt and credit are the journalist's, verbatim", () => {
  const r = assembleImageNative(IMAGE_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(
    checkImageConformance(r.value as ImageStory, { format: "scrolly" }),
  ).toEqual([]);
  const story = r.value as ImageStory;
  expect(story.frames.map((f) => f.caption)).toEqual(
    IMAGE_BRIEF.beats!.map((b) => b.text),
  );
  expect(story.frames[0]!.alt).toBe(IMAGE_BRIEF.images!.frames[0]!.alt);
  expect(story.frames[0]!.credit.name).toBe("M. Rossi");
});

test("more photographs than authored beats — refused, naming the count on each side", () => {
  const r = assembleImageNative({
    ...IMAGE_BRIEF,
    beats: IMAGE_BRIEF.beats!.slice(0, 1),
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("3");
  expect(r.message).toContain("1");
});

test("no photographs declared — the refusal says what to bring", () => {
  const r = assembleImageNative({ ...IMAGE_BRIEF, images: undefined });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("photograph");
});

test("fewer than three frames — the engine's own floor, refused before any render", () => {
  // checkImageConformance(scrolly) requires 3-6 frames. 2 photographs + 2 matching beats: the
  // count agrees on both sides, so only the engine's own frame-count floor can refuse this —
  // and the refusal must be its exact sentence, not a second wording of the same rule.
  const r = assembleImageNative({
    ...IMAGE_BRIEF,
    beats: IMAGE_BRIEF.beats!.slice(0, 2),
    images: {
      ...IMAGE_BRIEF.images!,
      frames: IMAGE_BRIEF.images!.frames.slice(0, 2),
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("only 2 frames — a scrolly needs at least 3");
});

test("more than six frames — the engine's own cap, refused with its own sentence", () => {
  const frame = IMAGE_BRIEF.images!.frames[0]!;
  const beat = IMAGE_BRIEF.beats![0]!;
  const r = assembleImageNative({
    ...IMAGE_BRIEF,
    beats: Array.from({ length: 7 }, () => ({ ...beat })),
    images: {
      ...IMAGE_BRIEF.images!,
      frames: Array.from({ length: 7 }, () => ({ ...frame })),
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain(
    "7 frames — an embedded image scrolly is capped at 6",
  );
});

test("keyFrame targets the beat marked as the arc's turn, not frame 0", () => {
  const r = assembleImageNative(IMAGE_BRIEF); // beats[1] carries role "turn"
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as ImageStory).keyFrame).toBe(1);
});

test("keyFrame falls back to 0 when no beat is marked as the arc's turn", () => {
  const r = assembleImageNative({
    ...IMAGE_BRIEF,
    beats: IMAGE_BRIEF.beats!.map((b) => ({ ...b, role: "build" as const })),
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as ImageStory).keyFrame).toBe(0);
});

test("imageDir passes through absolute, verbatim — the spine writes specs to a tmp config", () => {
  const r = assembleImageNative(IMAGE_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as ImageStory).imageDir).toBe("/tmp/annemasse-canal");
});

test("sourcePassage stays absent — the loop has no vision matching to invent one from", () => {
  const r = assembleImageNative(IMAGE_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  for (const f of (r.value as ImageStory).frames)
    expect(f.sourcePassage).toBeUndefined();
});
