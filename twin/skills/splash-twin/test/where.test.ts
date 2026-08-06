import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whereIs } from "../scripts/where.mjs";
// A test-only cross-skill import, permitted specifically for this purpose: asserting that two
// independent implementations of the same rule agree. Runtime code in this branch never imports
// across a skill boundary (see the gotcha in ../SKILL.md); this file does, once, to prove
// where.mjs's reimplementation of Gate 2 has not drifted from twin-storyboard's own gate.
import {
  checkStoryboard,
  parseStoryboard,
} from "../../twin-storyboard/scripts/storyboard.mjs";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  for (const child of ["source", "beats", "export"])
    await mkdir(join(dir, child), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Gate-2-complete: a confirmed takeaway, all six hand-of-the-journalist fields, and one slot
// whose `chosen` is drawn from its own listed `candidates` — everything `missingForGate2` in
// `where.mjs` requires before a story may leave the `storyboard` phase.
const storyboard = `---
takeaway: "Rainfall fell by a third in ten years."
subject: "Rainfall trends in the Rhône basin"
comparison: "the last decade against the one before it"
limits: "single weather station, not basin-wide"
placement: "above the fold, article-web"
credit: "Data: MeteoSwiss"
effectiveDate: "2026-08-01"
slots:
  - id: 1
    chosen: trajectory
    candidates: [trajectory, comparison]
---
`;

describe("whereIs", () => {
  it("should report intake when the source is empty", async () => {
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).toContain("source/profile.json");
  });

  it("should report intake with only article.md missing", async () => {
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).not.toContain("source/profile.json");
  });

  it("should report intake with only profile.json missing", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/profile.json");
    expect(state.missing).not.toContain("source/article.md");
  });

  it("should report framing once the source is frozen but no storyboard exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const state = await whereIs(dir);
    expect(state.phase).toBe("framing");
    expect(state.missing).toContain("STORYBOARD.md");
  });

  it("should report production once the storyboard's takeaway, hand fields, and every slot are all resolved", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
  });

  it("should stay in storyboard when the takeaway and hand fields are confirmed but no slot exists — the resumed-session case", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: "Rainfall fell by a third in ten years."\nsubject: "Rainfall trends in the Rhône basin"\ncomparison: "the last decade against the one before it"\nlimits: "single weather station, not basin-wide"\nplacement: "above the fold, article-web"\ncredit: "Data: MeteoSwiss"\neffectiveDate: "2026-08-01"\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("no slot: nothing would be produced");
  });

  it("should stay in storyboard when a slot has nothing chosen", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: "Rainfall fell by a third in ten years."\nsubject: "Rainfall trends in the Rhône basin"\ncomparison: "the last decade against the one before it"\nlimits: "single weather station, not basin-wide"\nplacement: "above the fold, article-web"\ncredit: "Data: MeteoSwiss"\neffectiveDate: "2026-08-01"\nslots:\n  - id: 1\n    candidates: [trajectory, comparison]\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("slot 1: nothing chosen");
  });

  it("should stay in storyboard when a slot's chosen has no candidates key at all", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: "Rainfall fell by a third in ten years."\nsubject: "Rainfall trends in the Rhône basin"\ncomparison: "the last decade against the one before it"\nlimits: "single weather station, not basin-wide"\nplacement: "above the fold, article-web"\ncredit: "Data: MeteoSwiss"\neffectiveDate: "2026-08-01"\nslots:\n  - id: 1\n    chosen: trajectory\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain(
      "slot 1: chosen but no candidates were ever listed",
    );
  });

  it("should stay in storyboard when a slot's chosen is not among its candidates", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: "Rainfall fell by a third in ten years."\nsubject: "Rainfall trends in the Rhône basin"\ncomparison: "the last decade against the one before it"\nlimits: "single weather station, not basin-wide"\nplacement: "above the fold, article-web"\ncredit: "Data: MeteoSwiss"\neffectiveDate: "2026-08-01"\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [comparison, dumbbell]\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain(
      "slot 1: chosen is not among its candidates",
    );
  });

  it("should stay in storyboard when a hand-of-the-journalist field is missing — the resumed-session case", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: "Rainfall fell by a third in ten years."\nsubject: "Rainfall trends in the Rhône basin"\ncomparison: "the last decade against the one before it"\nlimits: "single weather station, not basin-wide"\nplacement: "above the fold, article-web"\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [trajectory, comparison]\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain(
      'the hand-of-the-journalist field "credit"',
    );
    expect(state.missing).toContain(
      'the hand-of-the-journalist field "effectiveDate"',
    );
  });

  it("should stay in storyboard when STORYBOARD.md exists but has no takeaway", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), "---\nslots: []\n---\n");
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is an empty string", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: ""\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is YAML null", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: null\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is YAML tilde null", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway: ~\nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is only whitespace", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\ntakeaway:   \nslots: []\n---\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway: appears in prose below frontmatter", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      `---\nslots: []\n---\nThis takeaway: is in prose, not frontmatter.\n`,
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should report delivery once a beat has a render", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    expect((await whereIs(dir)).phase).toBe("delivery");
  });

  it("should report done once the export holds a file and a render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  it("should report inconsistency when export holds a file but no render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toContain("no renders exist in any beat");
  });
});

// A hand-of-the-journalist block that is complete on its own, reused verbatim by every fixture
// below except the one that deliberately drops a field from it.
const COMPLETE_HAND = `subject: "Rainfall trends in the Rhône basin"
comparison: "the last decade against the one before it"
limits: "single weather station, not basin-wide"
placement: "above the fold, article-web"
credit: "Data: MeteoSwiss"
effectiveDate: "2026-08-01"`;

// Nine STORYBOARD.md texts, each otherwise Gate-2-complete except for the one thing its name
// says it deviates on. Fed to BOTH gates below — where.mjs's missingForGate2 (via whereIs) and
// twin-storyboard's own checkStoryboard (via parseStoryboard) — asserting they always agree on
// whether Gate 2 has closed.
const GATE2_FIXTURES: Array<{ name: string; text: string }> = [
  {
    name: "complete: takeaway, all hand fields, one resolved slot",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [trajectory, comparison]\n---\n`,
  },
  {
    name: "missing a hand field (credit)",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\nsubject: "Rainfall trends in the Rhône basin"\ncomparison: "the last decade against the one before it"\nlimits: "single weather station, not basin-wide"\nplacement: "above the fold, article-web"\neffectiveDate: "2026-08-01"\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [trajectory, comparison]\n---\n`,
  },
  {
    name: "no slots",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\n${COMPLETE_HAND}\nslots: []\n---\n`,
  },
  {
    name: "slot with no chosen",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    candidates: [trajectory, comparison]\n---\n`,
  },
  {
    name: "slot with chosen absent from its candidates",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [comparison, dumbbell]\n---\n`,
  },
  {
    name: "slot with chosen and no candidates key at all",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    chosen: trajectory\n---\n`,
  },
  {
    name: "bare null takeaway",
    text: `---\ntakeaway: null\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [trajectory, comparison]\n---\n`,
  },
  {
    name: 'quoted "null" takeaway (control — a literal string, not the sentinel)',
    text: `---\ntakeaway: "null"\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    chosen: trajectory\n    candidates: [trajectory, comparison]\n---\n`,
  },
  {
    name: "quoted comma inside an inline candidates array",
    text: `---\ntakeaway: "Rainfall fell by a third in ten years."\n${COMPLETE_HAND}\nslots:\n  - id: 1\n    chosen: "a, b"\n    candidates: ["a, b", "c"]\n---\n`,
  },
];

describe("gate 2: where.mjs and twin-storyboard's own checkStoryboard agree on every fixture", () => {
  for (const { name, text } of GATE2_FIXTURES) {
    it(`should agree on: ${name}`, async () => {
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "profile.json"), "{}");
      await writeFile(join(dir, "STORYBOARD.md"), text);

      const whereIsClosed = (await whereIs(dir)).phase !== "storyboard";

      const { meta } = parseStoryboard(text);
      const checkStoryboardClosed = checkStoryboard(meta).length === 0;

      expect(whereIsClosed).toBe(checkStoryboardClosed);
    });
  }
});
