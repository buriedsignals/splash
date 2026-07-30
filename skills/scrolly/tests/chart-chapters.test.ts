import { describe, it, expect } from "bun:test";
import { chartStoryToChapters } from "../src/chart-chapters";
import { auditDistinctBookends } from "../src/conformance";
import type { ChartBeat } from "../../chart-native/src/chart-story";

const beats: ChartBeat[] = [
  { kind: "title", callout: null, copy: "Arctic sea ice has shrunk" },
  { kind: "establish", callout: null, copy: "" },
  {
    kind: "reveal",
    progress: 0,
    callout: {
      name: "1979",
      value: "7 million km²",
      text: "1979 — 7 million km²",
    },
    copy: "1979 — 7 million km²",
  },
  {
    kind: "reveal",
    progress: 1,
    callout: {
      name: "2025",
      value: "4.3 million km²",
      text: "2025 — 4.3 million km²",
    },
    copy: "2025 — 4.3 million km²",
  },
  { kind: "takeaway", callout: null, copy: "The ice keeps thinning" },
];
const meta = {
  title: "Arctic sea ice has shrunk",
  description: "September minimum, 1979–2025",
  source: { name: "NSIDC", url: "https://nsidc.org" },
};

describe("chartStoryToChapters", () => {
  const story = chartStoryToChapters(beats, meta);
  it("every step is visual:'chart' and ref = beat index", () => {
    expect(story.visual).toBe("chart");
    expect(story.steps.every((s) => s.visual === "chart")).toBe(true);
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3, 4]);
  });
  it("title + establish carry the description; the title is never a caption", () => {
    expect(story.steps[0].prose).toBe(meta.description);
    expect(story.steps[1].prose).toBe(meta.description);
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });
  it("reveal steps carry the beat copy; takeaway carries its copy", () => {
    expect(story.steps[2].prose).toBe("1979 — 7 million km²");
    expect(story.steps[4].prose).toBe("The ice keeps thinning");
  });
  it("line reveal steps use the drawTo action", () => {
    expect(story.steps[2].action).toBe("drawTo");
  });
});

// D09 — a scrolly that opens on its chute. The mechanism is three modules deep and ends HERE:
// `desc` used to fall back to meta.title, so (a) the opening card printed the title, which is the
// confirmed takeaway on every loop-assembled chart (lib/loop/assemble/chart-native.ts:20), and
// (b) an empty takeaway copy — which is what chart-story.ts:524 emits when no distinct insight was
// given — landed on that same string. Intro and takeaway became one sentence, by construction.
//
// The invariant was already written down in three places and enforced in none: this file's own
// test title ("the title is never a caption"), Scrolly.tsx:538 ("Shown once here; never repeated
// as a step caption") and skills/scrolly/SKILL.md's furniture rule.
describe("chartStoryToChapters — the opening is its own field", () => {
  const noDistinctInsight: ChartBeat[] = [
    { kind: "title", callout: null, copy: "Arctic sea ice has shrunk" },
    { kind: "establish", callout: null, copy: "" },
    {
      kind: "reveal",
      progress: 0,
      callout: {
        name: "1979",
        value: "7 million km²",
        text: "1979 — 7 million km²",
      },
      copy: "1979 — 7 million km²",
    },
    {
      kind: "reveal",
      progress: 1,
      callout: {
        name: "2025",
        value: "4.3 million km²",
        text: "2025 — 4.3 million km²",
      },
      copy: "2025 — 4.3 million km²",
    },
    // chart-story.ts:524 empties the takeaway when no insight distinct from the title was given.
    { kind: "takeaway", callout: null, copy: "" },
  ];

  it("does NOT open and close on the same sentence in the default composition", () => {
    const story = chartStoryToChapters(noDistinctInsight, meta);
    // The repo's own comparator, rather than a second one written here.
    expect(auditDistinctBookends(story)).toEqual([]);
  });

  it("never captions a step with the title, even with no description at all", () => {
    const story = chartStoryToChapters(beats, {
      title: meta.title,
      source: meta.source,
    });
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });

  it("opens on `opening` when the journalist wrote one, in preference to the description", () => {
    const story = chartStoryToChapters(beats, {
      ...meta,
      opening: "Every September, the ice is measured at its smallest.",
    });
    expect(story.steps[0].prose).toBe(
      "Every September, the ice is measured at its smallest.",
    );
    expect(story.steps[1].prose).toBe(
      "Every September, the ice is measured at its smallest.",
    );
  });

  it("drops a step with no prose rather than rendering an empty card, keeping ref = beat index", () => {
    const story = chartStoryToChapters(noDistinctInsight, {
      title: meta.title,
      source: meta.source,
    });
    // No opening material and no takeaway copy: only the two reveals remain — and they still
    // point at beats 2 and 3, so the sticky graphic advances to the right beat.
    expect(story.steps.map((s) => s.ref)).toEqual([2, 3]);
    expect(story.steps.every((s) => s.prose.trim() !== "")).toBe(true);
  });

  it("equality is not refused — a journalist may write the same sentence at both ends", () => {
    const sameBothEnds: ChartBeat[] = [
      ...noDistinctInsight.slice(0, 4),
      { kind: "takeaway", callout: null, copy: "September minimum, 1979–2025" },
    ];
    const story = chartStoryToChapters(sameBothEnds, meta);
    expect(story.steps[0].prose).toBe("September minimum, 1979–2025");
    expect(story.steps[story.steps.length - 1].prose).toBe(
      "September minimum, 1979–2025",
    );
  });
});
