import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  whereIs,
  REQUIRED_SCALARS as WHERE_SCALARS,
  REQUIRED_SLOT_FIELDS as WHERE_SLOT_FIELDS,
} from "../scripts/where.mjs";
// A test-only cross-skill import, permitted specifically for this purpose: asserting that two
// independent implementations of the same rule agree. Runtime code in this branch never imports
// across a skill boundary (see the gotcha in ../SKILL.md); this file does, once, to prove
// where.mjs's reimplementation of Gate 2 has not drifted from storyboard's own gate.
import {
  checkStoryboard,
  parseStoryboard,
  surveyGap as storyboardSurveyGap,
  REQUIRED_SCALARS as STORYBOARD_SCALARS,
  REQUIRED_SLOT_FIELDS as STORYBOARD_SLOT_FIELDS,
} from "../../storyboard/scripts/storyboard.mjs";
import { surveyGap as whereSurveyGap } from "../scripts/where.mjs";
import { approveCurrentOutput } from "../../deliver/test/output-review-fixture";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  for (const child of ["source", "beats", "export"])
    await mkdir(join(dir, child), { recursive: true });
  // GATE 2'S SECOND FILE, neutralised here for the same reason `beats/` and `export/` are left
  // empty: every fixture below varies ONE thing, and for almost all of them that thing is the
  // frontmatter. `surveyGap` is a DIRECTORY rule — the survey of the article's other angles, which
  // `recordSurveyedSubjects` writes at movement ⑩ — so a story that has not recorded it never
  // leaves the storyboard phase, and a fixture that meant to vary the takeaway would be varying
  // this instead. The rule itself is exercised by its own describe block at the foot of this file,
  // which removes the file again.
  await writeFile(join(dir, "SUBJECTS.md"), "---\nsubjects:\n---\n");
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// ONE Gate-2-complete template, in two halves. Every fixture below is this template with exactly
// one thing changed — nothing is typed out twice, so a rule added to either gate cannot be guarded
// by a fixture list somebody forgot to extend.
const SCALARS: Record<string, string> = {
  takeaway: '"Rainfall fell by a third in ten years."',
  subject: '"Rainfall trends in the Rhône basin"',
  comparison: '"the last decade against the one before it"',
  limits: '"single weather station, not basin-wide"',
  placement: '"above the fold, article-web"',
  credit: '"Data: MeteoSwiss"',
  effectiveDate: '"2026-08-01"',
  grounding: "supported",
  reference: '"The Pudding, redraft — mid-table deviation"',
  language: '"fr"',
};

// `id` first: it is the line the slot list item opens on.
const SLOT: Record<string, string> = {
  id: "1",
  proves: '"Rainfall fell by a third in ten years."',
  medium: "chart",
  format: "static",
  size: "landscape",
  reachable: "yes",
  chosen: "trajectory",
  candidates: "[trajectory, comparison]",
};

function build(
  scalars: Record<string, string> = SCALARS,
  slot: Record<string, string> | null = SLOT,
): string {
  const head = Object.entries(scalars)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  if (!slot) return `---\n${head}\nslots: []\n---\n`;
  const [[firstKey, firstValue], ...rest] = Object.entries(slot);
  const body = [
    `  - ${firstKey}: ${firstValue}`,
    ...rest.map(([k, v]) => `    ${k}: ${v}`),
  ].join("\n");
  return `---\n${head}\nslots:\n${body}\n---\n`;
}

function without<T extends Record<string, string>>(
  source: T,
  key: string,
  also: Partial<T> = {},
): T {
  const copy = { ...source, ...also };
  delete copy[key];
  return copy;
}

const storyboard = build();

// What a DELIVERED beat looks like on disk: its own directory under `export/`, holding the chosen
// form's files AND the hand-over. G4 closes into `export/<beat>/HANDOVER.md` the way G3 closes into
// `APPROVED.md` one phase earlier — a delivery of files nobody was told what to do with is the run
// that produced A11, and it is not a closed gate.
async function deliver(storyDir: string, beat: string, fileName: string) {
  await mkdir(join(storyDir, "export", beat), { recursive: true });
  await writeFile(join(storyDir, "export", beat, fileName), "x");
  await writeFile(
    join(storyDir, "export", beat, "HANDOVER.md"),
    "# What you have, and where it goes",
  );
  // A REAL delivery does not stop at the hand-over. `materialise` writes both closing-offer
  // receipts as `pending` the moment the files land, and the delivery turn ends by putting both
  // questions to the journalist and recording what they said. This helper stands for a delivery
  // that ran to the end, so it records both answers — round-four finding 8 is the story that
  // stopped at the hand-over and was called `done` with neither question ever asked.
  await writeFile(
    join(storyDir, "export", beat, ".another-format"),
    "declined\n",
  );
  await writeFile(
    join(storyDir, "export", beat, ".other-subjects"),
    "declined\n",
  );
  // AND IT RECORDS WHICH APPROVAL IT WAS BUILT FROM. `materialise` writes
  // `.delivery-manifest.json` as the last act of every delivery it publishes, naming the render
  // digest the delivered bytes came from. Nothing else in `export/` can answer "are these still the
  // bytes the journalist approved?", which is the question `done` is an assertion about — so a
  // helper standing for a delivery that ran to the end writes it, exactly as one does.
  await recordDelivery(storyDir, beat);
}

/**
 * The receipt a real delivery leaves, bound to whatever review the beat carries at the time. Beats
 * that have not closed G3 yet get no manifest, which is what a beat nothing has delivered looks
 * like on disk.
 */
async function recordDelivery(storyDir: string, beat: string) {
  const reviewPath = join(storyDir, "beats", beat, "OUTPUT-REVIEW.json");
  const review = await readFile(reviewPath, "utf8").catch(() => null);
  if (review === null) return;
  const bound = JSON.parse(review);
  await writeFile(
    join(storyDir, "export", beat, ".delivery-manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      state: "complete",
      operationId: `delivery-${beat}`,
      outputId: beat,
      reviewId: bound.id,
      planVersion: bound.planVersion,
      draftDigest: bound.draftDigest,
      findingIds: bound.findingIds,
      ...(bound.feedbackDigest ? { feedbackDigest: bound.feedbackDigest } : {}),
    }),
  );
}

// G3 closes into TWO files: `APPROVED.md` (the journalist said yes) and `OUTPUT-REVIEW.json` (what
// binds that yes to the exact render they were shown). `deliver` has always refused a delivery
// without the second; `whereIs` only learned to require it after round-four finding 7, so every
// fixture that expects a beat to LEAVE production writes both, the way a real G3 close does.
async function approve(storyDir: string, beat: string) {
  const beatDir = join(storyDir, "beats", beat);
  await writeFile(join(beatDir, "APPROVED.md"), "seen");
  await approveCurrentOutput(beatDir);
}

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

  it("should report production once every Gate-2 scalar and every slot field is resolved", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
  });

  it("should stay in storyboard when the takeaway and hand fields are confirmed but no slot exists — the resumed-session case", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, null));
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("no slot: nothing would be produced");
  });

  it("should stay in storyboard when a slot has nothing chosen", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build(SCALARS, without(SLOT, "chosen")),
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
      build(SCALARS, without(SLOT, "candidates")),
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
      build(SCALARS, { ...SLOT, candidates: "[comparison, dumbbell]" }),
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
      build(without(without(SCALARS, "credit"), "effectiveDate")),
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

  // The two scalars the recorded-verdict contract added, each named in the journalist's terms
  // rather than as a field name — this gate's `missing` list is read aloud to somebody resuming.
  it("should stay in storyboard when the takeaway was never grounded at G1", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build(without(SCALARS, "grounding")),
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("the G1 grounding verdict");
  });

  it("should refuse a grounding verdict of 'contradicted' — a refuted takeaway is corrected or overridden, never left standing", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build({ ...SCALARS, grounding: "contradicted" }),
    );
    expect((await whereIs(dir)).phase).toBe("storyboard");
  });

  it("should accept an override that carries a reason, and refuse one that does not", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");

    await writeFile(
      join(dir, "STORYBOARD.md"),
      build({
        ...SCALARS,
        grounding: `'overridden — "34 is the sum of glace_fondue_mt (14 + 11 + 9)"'`,
      }),
    );
    expect((await whereIs(dir)).phase).toBe("production");

    await writeFile(
      join(dir, "STORYBOARD.md"),
      build({ ...SCALARS, grounding: "'overridden — '" }),
    );
    expect((await whereIs(dir)).phase).toBe("storyboard");
  });

  it("should stay in storyboard when the reference loop never closed into a field", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build(without(SCALARS, "reference")),
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("the reference loop's answer");
  });

  it("should treat 'none — both rejected' as a real answer to the reference loop", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build({ ...SCALARS, reference: '"none — both rejected"' }),
    );
    expect((await whereIs(dir)).phase).toBe("production");
  });

  it("should stay in storyboard when a slot never recorded its medium, format or size", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    // `size` refuses in storyboard's OWN words rather than this file's generic ones, because
    // W4 Task 9 makes it the one slot field the two gates word identically on purpose — a
    // journalist reading one gate's reason while the other holds is the A7/A14 defect with better
    // manners. See "gate 2c: both readings of R2's format × size rule, string for string" below.
    const expected: Record<string, string> = {
      medium: "slot 1: no medium was ever chosen",
      format: "slot 1: no format was ever chosen",
      size: "slot 1: size is missing — gate 2c never closed",
    };
    for (const [field, message] of Object.entries(expected)) {
      await writeFile(
        join(dir, "STORYBOARD.md"),
        build(SCALARS, without(SLOT, field)),
      );
      const state = await whereIs(dir);
      expect(state.phase).toBe("storyboard");
      expect(state.missing).toContain(message);
    }
  });

  it("should stay in storyboard when the medium and format were never confirmed reachable", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build(SCALARS, { ...SLOT, reachable: "no" }),
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain(
      "slot 1: this medium and format were never confirmed reachable",
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

  for (const [name, value] of [
    ["an empty string", '""'],
    ["YAML null", "null"],
    ["YAML tilde null", "~"],
    ["only whitespace", "  "],
  ]) {
    it(`should stay in storyboard when takeaway is ${name}`, async () => {
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "profile.json"), "{}");
      await writeFile(
        join(dir, "STORYBOARD.md"),
        build({ ...SCALARS, takeaway: value }, null),
      );
      const state = await whereIs(dir);
      expect(state.phase).toBe("storyboard");
      expect(state.missing).toContain("a confirmed takeaway");
    });
  }

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

  // G3 closes into a file, like every other gate. A render existing is not the journalist having
  // seen it: the run read the renders into the model's context, gave the journalist prose, and
  // asked "the beat, as you see it. Do you validate?" in a turn where nothing had been put in
  // front of anyone to open.
  it("should stay in production when a beat has rendered but nobody has approved it", async () => {
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
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toContain(
      "beat 1-rainfall: rendered but not approved — gate 3 closes into beats/1-rainfall/APPROVED.md, written after the journalist has been shown this render and has said yes",
    );
  });

  it("should report delivery once a rendered beat has been approved", async () => {
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
    await approve(dir, "1-rainfall");
    expect((await whereIs(dir)).phase).toBe("delivery");
  });

  it("should name every rendered beat still waiting, not only the first", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    for (const beat of ["1-rainfall", "2-snowpack"]) {
      await mkdir(join(dir, "beats", beat, "renders"), { recursive: true });
      await writeFile(join(dir, "beats", beat, "renders", "still.png"), "x");
    }
    await writeFile(join(dir, "beats", "1-rainfall", "APPROVED.md"), "seen");
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([
      "beat 2-snowpack: rendered but not approved — gate 3 closes into beats/2-snowpack/APPROVED.md, written after the journalist has been shown this render and has said yes",
    ]);
  });

  it("should report done once the beat has been delivered into its own export directory", async () => {
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
    await approve(dir, "1-rainfall");
    await deliver(dir, "1-rainfall", "rainfall.png");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  it("should reopen production and delivery from a durable editor-feedback receipt", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const beatDir = join(dir, "beats", "1-rainfall");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    await writeFile(join(beatDir, "renders", "still.png"), "old render");
    await writeFile(join(beatDir, "APPROVED.md"), "seen");
    await deliver(dir, "1-rainfall", "rainfall.png");
    const feedbackPath = join(beatDir, "FEEDBACK.md");
    const manifestPath = join(
      dir,
      "export",
      "1-rainfall",
      ".delivery-manifest.json",
    );
    await approveCurrentOutput(beatDir, { reviewId: "review-old" });
    await writeFile(feedbackPath, "Move the annotation above the line.");

    expect(await whereIs(dir)).toMatchObject({
      phase: "production",
      revision: { reason: "editor-feedback", beats: ["1-rainfall"] },
      missing: [],
    });

    await writeFile(join(beatDir, "renders", "still.png"), "revised render");
    const review = await approveCurrentOutput(beatDir, {
      reviewId: "review-new",
    });
    expect(await whereIs(dir)).toMatchObject({
      phase: "delivery",
      revision: { reason: "editor-feedback", beats: ["1-rainfall"] },
      missing: [],
    });

    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        state: "complete",
        operationId: "delivery-review-new",
        outputId: "1-rainfall",
        reviewId: review.id,
        planVersion: review.planVersion,
        draftDigest: review.draftDigest,
        findingIds: review.findingIds,
        feedbackDigest: review.feedbackDigest,
      }),
    );
    expect(await whereIs(dir)).toMatchObject({ phase: "done", missing: [] });

    await writeFile(
      feedbackPath,
      "Move the annotation below the line instead.",
    );
    expect(await whereIs(dir)).toMatchObject({
      phase: "production",
      revision: { reason: "editor-feedback", beats: ["1-rainfall"] },
    });
  });

  it("should fail closed on malformed review state during feedback recovery", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const beatDir = join(dir, "beats", "1-rainfall");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    await writeFile(join(beatDir, "renders", "still.png"), "render");
    await writeFile(join(beatDir, "APPROVED.md"), "seen");
    await deliver(dir, "1-rainfall", "rainfall.png");
    await writeFile(join(beatDir, "FEEDBACK.md"), "Change the label.");
    await writeFile(
      join(beatDir, "OUTPUT-REVIEW.json"),
      JSON.stringify({ decision: "approve" }),
    );
    await expect(whereIs(dir)).rejects.toThrow(/unsupported schemaVersion/);
  });

  // TWO BEATS, AND THE FIRST ONE DELIVERED. This is the fixture that did not exist, and its absence
  // is the whole reason the defect below survived a suite that tests the approval gate directly:
  // every approval case above runs with `export/` EMPTY, and every export case runs with ONE beat.
  // Put both halves in one story and the story-level `if (exported.length > 0) return done`
  // short-circuit -- which sat ABOVE the approval check -- announced a finished story over a beat
  // nobody had been shown.
  //
  // RED, in a copy of the tree under /tmp, with that short-circuit restored to where it was:
  //
  //   expect(state.phase).toBe("production");
  //                       ^
  //   error: expect(received).toBe(expected)
  //   Expected: "production"
  //   Received: "done"
  //   (fail) should stay in production when one beat is delivered and another is not approved
  //   (fail) should not call a story done while an approved beat has not been delivered
  it("should stay in production when one beat is delivered and another is not approved", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    for (const beat of ["1-rainfall", "2-snowpack"]) {
      await mkdir(join(dir, "beats", beat, "renders"), { recursive: true });
      await writeFile(join(dir, "beats", beat, "renders", "still.png"), "x");
    }
    // Beat 1 was shown, approved and delivered. Beat 2 has rendered and nobody has seen it.
    await writeFile(join(dir, "beats", "1-rainfall", "APPROVED.md"), "seen");
    await deliver(dir, "1-rainfall", "rainfall.png");

    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([
      "beat 2-snowpack: rendered but not approved — gate 3 closes into beats/2-snowpack/APPROVED.md, written after the journalist has been shown this render and has said yes",
    ]);
  });

  // The same short-circuit's other half: `done` meant "a file exists somewhere under export/", so
  // one delivered beat closed the story for every beat. Delivery is per beat now, like approval.
  it("should not call a story done while an approved beat has not been delivered", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    for (const beat of ["1-rainfall", "2-snowpack"]) {
      await mkdir(join(dir, "beats", beat, "renders"), { recursive: true });
      await writeFile(join(dir, "beats", beat, "renders", "still.png"), "x");
      await approve(dir, beat);
    }
    await deliver(dir, "1-rainfall", "rainfall.png");

    expect((await whereIs(dir)).phase).toBe("delivery");

    await deliver(dir, "2-snowpack", "snowpack.png");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  // G4 CLOSES INTO A FILE, like G3 one phase earlier. A directory of delivered files with nothing
  // saying which one goes where in the article, what the alt text is or what the credit line reads
  // is the delivery the run actually made — two filenames and two sizes (A11). It is not a closed
  // gate, and `materialise` refuses to make one.
  //
  // RED, in a copy of the tree under /tmp, with `beatsAwaitingDelivery` back to "any file in
  // export/<beat>/":
  //   error: expect(received).toBe(expected)   Expected: "delivery"   Received: "done"
  //   (fail) should stay in delivery when the files are there and nothing hands them over
  it("should stay in delivery when the files are there and nothing hands them over", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    await approve(dir, "1-rainfall");

    await mkdir(join(dir, "export", "1-rainfall"), { recursive: true });
    await writeFile(join(dir, "export", "1-rainfall", "still.png"), "x");
    await writeFile(join(dir, "export", "1-rainfall", "still.svg"), "<svg/>");
    expect((await whereIs(dir)).phase).toBe("delivery");

    await deliver(dir, "1-rainfall", "still.png");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  // A RE-RENDER PLUS A RE-APPROVAL DOES NOT REOPEN DELIVERY — the D6 finding, reproduced.
  //
  // Measured on a real story (`stories/real-gwis-wildfire-counts`, run report §D6): the beat was
  // delivered; the producer found a wrong sentence in its own alt text and re-rendered; `whereIs`
  // correctly reopened PRODUCTION, because the review no longer bound the current render; a new
  // OUTPUT-REVIEW.json was written against the new render — and `whereIs` answered
  // `{"phase":"done","missing":[]}` while `export/` still held the previous SVG and
  // `.delivery-manifest.json` still named `draftDigest: sha256:7352f896…` against the review's
  // `sha256:5742f0b8…`.
  //
  // The check that would have caught it lives inside `feedbackRevisionState`, behind a `FEEDBACK.md`
  // that cannot exist when the PRODUCER corrects its own beat before anyone has given feedback. So
  // the whole mechanism was unreachable on the one path a producer takes most often.
  //
  // RED, with `beatsAwaitingDelivery` back to "HANDOVER.md exists":
  //   expect(received).toBe(expected)   Expected: "delivery"   Received: "done"
  it("should reopen delivery when the render changed and the approval was renewed over it", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const beatDir = join(dir, "beats", "1-rainfall");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    await writeFile(
      join(beatDir, "renders", "still.svg"),
      "<svg><desc>the wrong sentence</desc></svg>",
    );
    await approve(dir, "1-rainfall");
    await deliver(dir, "1-rainfall", "still.svg");
    expect((await whereIs(dir)).phase).toBe("done");

    // The producer corrects its own beat. No FEEDBACK.md: nobody has given feedback yet.
    await writeFile(
      join(beatDir, "renders", "still.svg"),
      "<svg><desc>the corrected sentence</desc></svg>",
    );
    expect((await whereIs(dir)).phase).toBe("production");

    // And re-approves it against the render they were actually shown.
    await approveCurrentOutput(beatDir, { reviewId: "review-1-rainfall-2" });

    const state = await whereIs(dir);
    expect(state.phase).toBe("delivery");
    expect(state).toMatchObject({
      revision: { reason: "stale-delivery", beats: ["1-rainfall"] },
    });
    expect(state.missing).toEqual([]);

    // Delivering again over the approved render is what closes it, and nothing else.
    await deliver(dir, "1-rainfall", "still.svg");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  // The other half of the same claim: a hand-over with nothing recording which approval it was
  // built from cannot support `done` either. `materialise` has written the manifest since it
  // existed; a hand-over beside no manifest is a delivery this toolchain did not make, and the
  // only honest answer about its bytes is that nothing knows.
  it("should not call a story done when nothing records which approval the delivery was built from", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    await approve(dir, "1-rainfall");
    await deliver(dir, "1-rainfall", "still.png");
    await rm(join(dir, "export", "1-rainfall", ".delivery-manifest.json"));

    const state = await whereIs(dir);
    expect(state.phase).toBe("delivery");
    expect(state).toMatchObject({
      revision: { reason: "stale-delivery", beats: ["1-rainfall"] },
    });
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

// ---------------------------------------------------------------------------------------------
// The parity guard, and why it is GENERATED rather than listed.
//
// The nine hand-written fixtures this replaced were the second half of the false green
// (twin/FEEDBACK-2026-08-10.md, A14). The first half was `checkStoryboard(meta)` called with one
// argument inside the test that exists to prove the two gates agree, which switched off the checks
// only the second and third arguments enabled. `checkStoryboard` now genuinely takes one argument,
// so that call is correct — but a hand-typed fixture list still cannot know about a rule added
// after it was written, which is exactly how three rules (grounding, format, capability) landed and
// this suite stayed green.
//
// So the field list is read from BOTH GATES' OWN EXPORTED CONSTANTS and unioned. Remove a field
// from one side only and its fixture still exists, generated from the other side's copy — and the
// two gates then disagree on it, loudly. This is the property `render-still-parity.test.ts` has and
// `helper-parity.test.ts` lacks.
// ---------------------------------------------------------------------------------------------

const SCALAR_FIELDS = [...new Set([...WHERE_SCALARS, ...STORYBOARD_SCALARS])];
const SLOT_FIELDS = [
  ...new Set([...WHERE_SLOT_FIELDS, ...STORYBOARD_SLOT_FIELDS]),
];

// One value per field that is present and well-formed as YAML but outside what the gates accept.
// A field with no vocabulary of its own (medium, format — the gates require them, they do not judge
// them) still gets a fixture: that the two gates AGREE to tolerate the value is a parity fact worth
// pinning, and it is the fixture that would redden if one side grew a vocabulary alone.
//
// `size` used to be in that no-vocabulary group. It is not any more (W4 Task 9, ruling R2): both
// gates now know the three names this toolchain exports, and both know that a `web` slot takes no
// size at all. This entry therefore moved from "both tolerate it" to "both refuse it" — and the
// fixture below is what proved the move happened on BOTH sides at once rather than on one.
const OUT_OF_VOCABULARY: Record<string, string> = {
  takeaway: "~",
  grounding: "contradicted",
  // The language's NAME rather than its code — the mistake the field invites, refused by both
  // gates and, one phase later, by `resolveScaffoldLanguage` in the same words.
  language: '"Français"',
  reference: '""',
  medium: "hologram",
  format: "print",
  size: "billboard",
  reachable: "no",
  chosen: "dumbbell",
};

// Ruling R2 as fixtures. The format×size triple is the one rule where a gate can be wrong in two
// opposite directions — refusing a correct storyboard and closing on a wrong one — so both are
// pinned, and so is the case the old shape got wrong: a `web` slot could not close gate 2 at all
// without naming a size that would never be used.
const SIZE_FIXTURES: Array<{ name: string; slot: Record<string, string> }> = [
  { name: "static + landscape (control)", slot: { ...SLOT } },
  { name: "static + square", slot: { ...SLOT, size: "square" } },
  { name: "static + portrait", slot: { ...SLOT, size: "portrait" } },
  {
    name: "video + portrait",
    slot: { ...SLOT, format: "video", size: "portrait" },
  },
  {
    name: "static with a size nobody exports",
    slot: { ...SLOT, size: "billboard" },
  },
  { name: "static with no size at all", slot: without(SLOT, "size") },
  {
    name: "web WITH a size — R2 says web is a range, not a fourth size",
    slot: { ...SLOT, format: "web", size: "landscape" },
  },
  {
    name: "web with NO size — the correct shape, which the old flat requirement refused",
    slot: without(SLOT, "size", { format: "web" }),
  },
  {
    name: "scrolly with no size — a scroll has no single exported frame",
    slot: without(SLOT, "size", { format: "scrolly" }),
  },
  // ONE SLOT, SEVERAL FRAMES — round six, beat V. Its journalist asked for portrait for stories
  // AND square for the feed: one argument, two frames. The only shape the contract offered was two
  // slots, which is two beats, two briefs, two approvals and two deliveries for one visual, so the
  // producer pinned one size on the slot and registered two compositions inside the beat — the
  // record saying one thing and the delivery doing another.
  {
    name: "static + [portrait, square] — one argument, two frames",
    slot: { ...SLOT, size: "[portrait, square]" },
  },
  {
    name: "video + [landscape, portrait, square] — all three",
    slot: { ...SLOT, format: "video", size: "[landscape, portrait, square]" },
  },
  {
    name: "the same size twice",
    slot: { ...SLOT, size: "[portrait, portrait]" },
  },
  {
    name: "a list with one size nobody exports in it",
    slot: { ...SLOT, size: "[portrait, billboard]" },
  },
  {
    name: "an EMPTY size list — the truthy-[] hole",
    slot: { ...SLOT, size: "[]" },
  },
  {
    name: "web with a size LIST — still not a fourth size",
    slot: { ...SLOT, format: "web", size: "[landscape, portrait]" },
  },
];

// ── The other half of the same decision: one slot carrying several MEDIA ──────────────────────
//
// Round six, beat AC: a scrolly that is a chart, then two photographs, then a locator map. Its
// storyboard recorded `medium: chart` and said so in its own prose — *"that is a compromise, not a
// reading"* — because a slot carried exactly one medium and the contract could not say what the
// beat IS. `assembles` is that sentence, machine-checked: the order the reader meets the media,
// opening on the one the slot dispatches on, and only on a format that carries several behind one
// narrative.
const ASSEMBLY_FIXTURES: Array<{ name: string; slot: Record<string, string> }> =
  [
    {
      name: "a scrolly that assembles chart, photographs and a map — beat AC's real shape",
      slot: without(SLOT, "size", {
        format: "scrolly",
        assembles: "[chart, image, map]",
      }),
    },
    {
      name: "a scrolly with no assembles at all — still legal, it draws one medium",
      slot: without(SLOT, "size", { format: "scrolly" }),
    },
    {
      name: "assembles on a STATIC slot — a static beat draws one medium",
      slot: { ...SLOT, assembles: "[chart, image]" },
    },
    {
      name: "assembles listing one medium — says nothing the medium field does not",
      slot: without(SLOT, "size", {
        format: "scrolly",
        assembles: "[chart]",
      }),
    },
    {
      name: "assembles repeating a medium",
      slot: without(SLOT, "size", {
        format: "scrolly",
        assembles: "[chart, map, chart]",
      }),
    },
    {
      name: "assembles opening on a medium that is not the slot's own",
      slot: without(SLOT, "size", {
        format: "scrolly",
        assembles: "[image, chart, map]",
      }),
    },
    {
      name: "an EMPTY assembles list",
      slot: without(SLOT, "size", { format: "scrolly", assembles: "[]" }),
    },
    {
      name: "medium recorded as a LIST — the shape this contract does NOT take",
      slot: { ...SLOT, medium: "[chart, image, map]" },
    },
    {
      name: "an EMPTY medium list — the truthy-[] hole, one field over",
      slot: { ...SLOT, medium: "[]" },
    },
  ];

const GATE2_FIXTURES: Array<{ name: string; text: string }> = [
  { name: "complete: every scalar, every slot field", text: build() },
  { name: "no slots", text: build(SCALARS, null) },
  // The two list-carrying shapes, as CLOSED-OR-NOT as well as word for word. The verbatim block
  // below compares the size and assembles lines; this compares the verdict a journalist actually
  // experiences, which is the phase.
  ...[...SIZE_FIXTURES, ...ASSEMBLY_FIXTURES].map(({ name, slot }) => ({
    name: `slot shape: ${name}`,
    text: build(SCALARS, slot),
  })),
];

for (const field of SCALAR_FIELDS) {
  GATE2_FIXTURES.push({
    name: `scalar "${field}" absent`,
    text: build(without(SCALARS, field)),
  });
  GATE2_FIXTURES.push({
    name: `scalar "${field}" bare null`,
    text: build({ ...SCALARS, [field]: "null" }),
  });
  if (OUT_OF_VOCABULARY[field] !== undefined) {
    GATE2_FIXTURES.push({
      name: `scalar "${field}" set to ${OUT_OF_VOCABULARY[field]}`,
      text: build({ ...SCALARS, [field]: OUT_OF_VOCABULARY[field] }),
    });
  }
}

for (const field of SLOT_FIELDS) {
  GATE2_FIXTURES.push({
    name: `slot field "${field}" absent`,
    text: build(SCALARS, without(SLOT, field)),
  });
  GATE2_FIXTURES.push({
    name: `slot field "${field}" bare null`,
    text: build(SCALARS, { ...SLOT, [field]: "null" }),
  });
  if (OUT_OF_VOCABULARY[field] !== undefined) {
    GATE2_FIXTURES.push({
      name: `slot field "${field}" set to ${OUT_OF_VOCABULARY[field]}`,
      text: build(SCALARS, { ...SLOT, [field]: OUT_OF_VOCABULARY[field] }),
    });
  }
}

// The two shape regressions no constant implies, kept explicitly. Both are about how the two
// parsers read a LINE, not about which fields a gate requires, so no field list can generate them:
// a quoted "null" must stay a literal string on both sides, and a comma inside a quoted array
// element must not split it on either.
GATE2_FIXTURES.push(
  {
    name: 'quoted "null" takeaway (control — a literal string, not the sentinel)',
    text: build({ ...SCALARS, takeaway: '"null"' }),
  },
  {
    name: "quoted comma inside an inline candidates array",
    text: build(SCALARS, {
      ...SLOT,
      chosen: '"a, b"',
      candidates: '["a, b", "c"]',
    }),
  },
  {
    name: "an override verdict carrying its reason",
    text: build({
      ...SCALARS,
      grounding: `'overridden — "34 is the sum of glace_fondue_mt"'`,
    }),
  },
  {
    name: "an override verdict with no reason",
    text: build({ ...SCALARS, grounding: "'overridden — '" }),
  },
);

describe("gate 2: where.mjs and storyboard's own checkStoryboard agree on every fixture", () => {
  it("should generate a fixture for every required field on both sides", () => {
    // Guards the guard, and it reads the two gates' constants DIRECTLY rather than the local
    // unions above — so replacing the generation with a hand-typed list reddens here, by name, the
    // moment either gate grows a field the list has never heard of. That is the whole failure this
    // file was rebuilt to end.
    for (const field of [
      ...WHERE_SCALARS,
      ...STORYBOARD_SCALARS,
      ...WHERE_SLOT_FIELDS,
      ...STORYBOARD_SLOT_FIELDS,
    ]) {
      expect(GATE2_FIXTURES.some((f) => f.name.includes(`"${field}"`))).toBe(
        true,
      );
    }
  });

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

// ── R2's format × size rule, held by BOTH gates, word for word ─────────────────────────────────
//
// The fixtures above compare a BOOLEAN: closed or not closed. That was enough while every slot rule
// was a presence check, and it is not enough for this one. Two gates can agree that a storyboard is
// refused and disagree about WHY — one refusing "size is missing", the other "a web beat takes no
// size" — and a journalist reading the second while the first is what actually holds is back in
// A7/A14 with better manners. So this block compares the refusal STRING.
//
// It compares only the size lines, deliberately and not out of laziness: the two gates word their
// other gaps differently on purpose (`no medium was ever chosen` against `medium is missing — gate
// 2a never closed`), each shaped for where it is read, and a blanket message comparison would go
// red on all of that at once and be turned off. Widening it is a real follow-up; narrowing it to
// nothing is what this replaces.
//
// THE MUTATIONS THAT REDDEN IT, run in a copy of the tree under /tmp, 2026-08-10:
//
//   where.mjs learns a fourth size the other gate does not         RED ×2
//   storyboard.mjs starts treating `web` as a sized format          RED ×2
//   where.mjs REWORDS one refusal, same verdict, other sentence    RED ×2  ← the boolean form missed this
//   storyboard.mjs stops naming the three it accepts               RED ×2
//   both gates drop the size rule together                         RED ×10
//
// The third row is the whole reason this block exists: the fixtures above, comparing closed-or-not,
// stay GREEN for it. Two gates refusing the same storyboard for two different-sounding reasons is
// A7/A14 with better manners, and only a string comparison sees it.
describe("gate 2c: both readings of R2's format × size rule, string for string", () => {
  const sizeLines = (gaps: string[]) =>
    gaps.filter((g) => /\bsize\b|\bassembles\b|records a list/.test(g)).sort();

  for (const { name, slot } of [...SIZE_FIXTURES, ...ASSEMBLY_FIXTURES]) {
    it(`should agree, verbatim, on: ${name}`, async () => {
      const text = build(SCALARS, slot);
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "profile.json"), "{}");
      await writeFile(join(dir, "STORYBOARD.md"), text);

      const state = await whereIs(dir);
      const { meta } = parseStoryboard(text);
      expect(sizeLines(state.missing)).toEqual(
        sizeLines(checkStoryboard(meta)),
      );
    });
  }

  it("should let a web slot close gate 2 with no size, and refuse one that names a size", async () => {
    // The pair the old flat requirement got wrong in BOTH directions, asserted as a phase rather
    // than as a message — this is the fact a journalist actually experiences.
    const closes = async (slot: Record<string, string>) => {
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "profile.json"), "{}");
      await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, slot));
      return (await whereIs(dir)).phase !== "storyboard";
    };
    expect(await closes(without(SLOT, "size", { format: "web" }))).toBe(true);
    expect(await closes({ ...SLOT, format: "web", size: "landscape" })).toBe(
      false,
    );
  });

  it("should let ONE slot carry several frames of one argument, and refuse a repeat", async () => {
    // Beat V, as a phase rather than as a message: portrait for stories AND square for the feed is
    // one claim, one beat, one brief, one approval, one delivery — several exported frames.
    const closes = async (slot: Record<string, string>) => {
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "profile.json"), "{}");
      await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, slot));
      return (await whereIs(dir)).phase !== "storyboard";
    };
    expect(await closes({ ...SLOT, size: "[portrait, square]" })).toBe(true);
    expect(await closes({ ...SLOT, size: "[portrait, portrait]" })).toBe(false);
    expect(await closes({ ...SLOT, size: "[]" })).toBe(false);
  });

  it("should let ONE scrolly slot say which media it assembles, in the order the reader meets them", async () => {
    const closes = async (slot: Record<string, string>) => {
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "profile.json"), "{}");
      await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, slot));
      return (await whereIs(dir)).phase !== "storyboard";
    };
    const scrolly = (assembles: string) =>
      without(SLOT, "size", { format: "scrolly", assembles });
    expect(await closes(scrolly("[chart, image, map]"))).toBe(true);
    expect(await closes(scrolly("[image, chart, map]"))).toBe(false);
    expect(await closes({ ...SLOT, assembles: "[chart, image]" })).toBe(false);
  });

  it("should name all three sizes when refusing one it does not export", () => {
    const { meta } = parseStoryboard(
      build(SCALARS, { ...SLOT, size: "billboard" }),
    );
    const [gap] = checkStoryboard(meta).filter((g) => g.includes("billboard"));
    // Naming what IS accepted, not only what is not — the `sizeFor`/`readPalette` discipline, at
    // the gate rather than at the renderer.
    expect(gap).toContain("landscape, square, portrait");
  });
});

// ---------------------------------------------------------------------------------------------
// GATE 2 CLOSES INTO TWO FILES, and the second one was required by nothing until round six.
//
// `SUBJECTS.md` is required at G4 — `readSurveyedSubjects` throws without it — produced at G2 by
// `recordSurveyedSubjects`, and was required by no gate in between. Six formats reported it
// independently across two rounds (U, V, W, Y, AC, AD), which makes it the most-reported defect in
// this project's history, and the sentence every one of them wrote is the same: `whereIs` answered
// `production, missing: []` on a story that could not close.
//
// The rule now lives in `surveyGap`, carried BYTE-IDENTICALLY by `storyboard/scripts/storyboard.mjs`
// and walked by `test/guard-copies-parity.test.ts`, because a gate that only one of the two readers
// can run is the divergence class `splash/SKILL.md`'s own gotcha section exists to close.
// ---------------------------------------------------------------------------------------------
describe("gate 2's second file: the survey of the article's other angles", () => {
  it("should keep a story in storyboard when its frontmatter is complete and no SUBJECTS.md exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await rm(join(dir, "SUBJECTS.md"), { force: true });
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.gate).toBe("G2-subjects");
    expect(state.missing.join("\n")).toContain("SUBJECTS.md");
    expect(state.missing.join("\n")).toContain("recordSurveyedSubjects");
  });

  it("should leave storyboard once the survey has been recorded", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    expect((await whereIs(dir)).phase).toBe("production");
  });

  // THEME 3: a distributed guard that nothing calls has not landed. `guard-copies-parity.test.ts`
  // proves the two copies are the same TEXT; this proves the storyboard phase's own copy is
  // reachable, callable and gives the same answer on the same directory — including on a REAL
  // story in this tree that has no survey recorded.
  it("should give the same answer from both gates' copies, on a real story and on a recorded one", async () => {
    const real = join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "stories",
      "stress-r-greek-schools",
    );
    expect(await storyboardSurveyGap(real)).toBe(await whereSurveyGap(real));
    expect(await storyboardSurveyGap(real)).toContain("SUBJECTS.md");
    expect(await storyboardSurveyGap(dir)).toBe(await whereSurveyGap(dir));
    expect(await storyboardSurveyGap(dir)).toBeNull();
  });

  it("should accept the EMPTY survey, because there was nothing else is an answer", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await writeFile(join(dir, "SUBJECTS.md"), "---\nsubjects:\n---\n");
    expect((await whereIs(dir)).phase).toBe("production");
  });
});
