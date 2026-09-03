import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  whereIs,
  REQUIRED_SCALARS as WHERE_SCALARS,
  REQUIRED_SLOT_FIELDS as WHERE_SLOT_FIELDS,
} from "../scripts/where.mjs";
import { invokeResolvedOwner } from "../scripts/orchestration.mjs";
// A test-only cross-skill import, permitted specifically for this purpose: asserting that two
// independent implementations of the same rule agree. Runtime code in this branch never imports
// across a skill boundary (see the gotcha in ../SKILL.md); this file does, once, to prove
// where.mjs's reimplementation of Gate 2 has not drifted from storyboard's own gate.
import {
  checkStoryboard,
  parseStoryboard,
  surveyGap,
  REQUIRED_SCALARS as STORYBOARD_SCALARS,
  REQUIRED_SLOT_FIELDS as STORYBOARD_SLOT_FIELDS,
} from "../../storyboard/scripts/storyboard.mjs";
import { approveCurrentOutput } from "../../deliver/test/output-review-fixture";
import type { BoundReviewFixture } from "../../deliver/test/output-review-fixture";
import {
  publishStagedDelivery,
  replacementArtifacts,
} from "../../deliver/scripts/delivery-replacement.mjs";

// GATE 2 CLOSES INTO TWO FILES. `STORYBOARD.md` records what will be DRAWN; SUBJECTS.md records
// what the survey found and did NOT draw, written at movement 10 while the angles still exist.
// Every fixture below that means "this story's gate 2 is closed" writes BOTH, because a fixture
// that wrote only the storyboard is what let `surveyGap` go unasked: it existed, it was good, and
// `whereIs` reported ready straight through to delivery without it. The dedicated gate test lower
// down is the one that deliberately omits it.
const SURVEYED = [
  "---",
  "subjects:",
  "  - id: rainfall-by-station",
  '    learns: "which stations fell fastest"',
  "    medium: chart",
  "    format: static",
  "---",
  "",
].join("\n");

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  for (const child of ["source", "beats", "export"])
    await mkdir(join(dir, child), { recursive: true });
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
  language: "en",
};

// `id` first: it is the line the slot list item opens on.
const SLOT: Record<string, string> = {
  id: "1",
  proves: '"Rainfall fell by a third in ten years."',
  medium: "chart",
  format: "static",
  size: "landscape",
  reachable: "yes",
  // The record of the house's own ranking having been walked (#48). Before these existed, the
  // treatment was the one major decision in the exchange with no recorded justification, and a
  // slot whose form was picked by vibes closed Gate 2 as long as `reference:` carried a string.
  intent: '"show a trend over time"',
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


// A completed delivery is the published form plus a manifest bound to the current approved review.
// Build it through the production manifest writer so fixtures carry the same artifact digests as
// real deliveries instead of treating a bare hand-over file as sufficient.
async function deliver(
  storyDir: string,
  beat: string,
  fileName: string,
  review: BoundReviewFixture,
) {
  const exportDir = join(storyDir, "export", beat);
  const operationId = `delivery-${review.id}`;
  const { stagingDir } = replacementArtifacts(exportDir, operationId);
  await mkdir(stagingDir, { recursive: true });
  await writeFile(join(stagingDir, fileName), "x");
  await writeFile(
    join(stagingDir, "HANDOVER.md"),
    "# What you have, and where it goes",
  );
  await publishStagedDelivery({
    stagingDir,
    exportDir,
    manifest: {
      operationId,
      reviewId: review.id,
      planVersion: review.planVersion,
      draftDigest: review.draftDigest,
      findingIds: review.findingIds,
      feedbackDigest: review.feedbackDigest,
      form: "owned-file",
      format: "static",
    },
  });
}


// What a STALE artifact looks like on disk: data.json whose recorded meta.hashes name inputs
// that no longer match the frozen files. The analyst records sha256 of STORYBOARD.md,
// source/profile.json and source/data.csv; fixtures write real hashes over real files so drift
// is produced by moving an input, not by faking a malformed record.
function sha256(bytes: Buffer | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function analyseBound(storyDir: string, beat: string) {
  const hashes = {
    storyboard: sha256(await readFile(join(storyDir, "STORYBOARD.md"))),
    profile: sha256(await readFile(join(storyDir, "source", "profile.json"))),
    sourceData: sha256(await readFile(join(storyDir, "source", "data.csv"))),
  };
  await mkdir(join(storyDir, "beats", beat), { recursive: true });
  await writeFile(
    join(storyDir, "beats", beat, "data.json"),
    JSON.stringify({ schemaVersion: 1, meta: { hashes } }),
  );
}

// A second slot, for the two-beat fixtures. Beat directories must answer to the storyboard —
// orphan detection walks dirs→slots (S6) — so a fixture that creates `beats/2-snowpack` writes
// a real slot 2 and analyses it, rather than leaving a directory no slot claims.
function secondSlot(): string {
  return (
    "  - id: 2\n" +
    '    proves: "Snowpack persisted longer than rain."\n' +
    "    medium: chart\n" +
    "    format: static\n" +
    "    size: landscape\n" +
    "    reachable: yes\n" +
    '    intent: "show the gap between exactly two values"\n' +
    "    chosen: comparison\n" +
    "    candidates: [comparison, dumbbell]"
  );
}

function twoSlotStoryboard(): string {
  return build().replace(/\n---\n$/, `\n${secondSlot()}\n---\n`);
}

describe("whereIs", () => {
  it("should report intake when the source is empty", async () => {
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    // S5 parity: intake freezes THREE files, so all three are named when none exist.
    expect(state.missing).toEqual([
      "source/article.md",
      "source/data.csv",
      "source/profile.json",
    ]);
  });

  it("should report intake with only article.md and data.csv missing", async () => {
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).toContain("source/data.csv");
    expect(state.missing).not.toContain("source/profile.json");
  });

  it("should report intake with only data.csv missing — article plus profile is not frozen", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toEqual(["source/data.csv"]);
  });

  it("should report framing once the source is frozen but no storyboard exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    const state = await whereIs(dir);
    expect(state.phase).toBe("framing");
    expect(state.missing).toEqual(["a confirmed takeaway"]);
    expect(state.resume).toBe(
      "Stop at G1; the journalist must provide a confirmed takeaway.",
    );
  });

  it("should report production once every Gate-2 scalar and every slot field is resolved", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    // The analyst pre-step is the first gap production carries: no craft skill runs before
    expect(state.missing).toContain("beat 1: run analyst (data.json)");
  });

  // An image beat carries no data contract, so the analyst pre-step never holds it.
  it("should not demand data.json from an image slot", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build(SCALARS, { ...without(SLOT, "size"), medium: "image" }),
    );
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([]);
  });

  // The analyst precondition must not erase the later gate's explicit diagnosis. Once the
  // analyst artifact exists, an unapproved render selects independent design review, and that
  // bounded review cannot supply the journalist's approval.
  // Issue #46. State here is derived from the directory, and nothing on the directory changes when
  // a persona dies to an HTTP 529 — so this branch re-issued the same instruction that had just
  // failed, indefinitely. `REVIEW-ATTEMPTS.json` is what makes "could not run" visible and distinct
  // from "not yet run".
  it("should stop re-issuing a review that already failed twice, and disclose instead", async () => {
    const { recordFailedReview } = await import("../scripts/review-attempts.mjs");
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    const beat = join(dir, "beats", "1-rainfall");
    await mkdir(join(beat, "renders"), { recursive: true });
    await writeFile(join(beat, "renders", "still.png"), "x");

    expect((await whereIs(dir)).owner).toEqual({ kind: "persona", id: "designer" });

    await recordFailedReview(beat, { persona: "designer", error: "API Error: 500 Internal server error" });
    // One failure is not a reason to give up on an independent read.
    expect((await whereIs(dir)).status).toBe("ready");

    await recordFailedReview(beat, { persona: "designer", error: "API Error: 529 Overloaded" });
    const after = await whereIs(dir);
    expect(after.status).toBe("blocked");
    expect(after.missing.join(" ")).toContain("could not be obtained");
    // And it does not pretend the beat is defective: the render is still there and still unapproved.
    expect(after.missing.join(" ")).toContain("rendered but not currently approved");
  });

  it("should select designer for an unapproved render without closing the human gate", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), { recursive: true });
    await writeFile(join(dir, "beats", "1-rainfall", "renders", "still.png"), "x");
    const before = await whereIs(dir);
    expect(before).toMatchObject({
      phase: "production",
      status: "ready",
      owner: { kind: "persona", id: "designer" },
      missing: ["beat 1-rainfall: rendered but not currently approved"],
    });

    const calls: string[] = [];
    const outcome = await invokeResolvedOwner(dir, {
      persona: async (id: string) => {
        calls.push(id);
        return "review returned to journalist";
      },
    });

    expect({
      calls,
      outcome,
      after: await whereIs(dir),
    }).toEqual({
      calls: ["designer"],
      outcome: "review returned to journalist",
      after: before,
    });
  });

  it("should stay in storyboard when the takeaway and hand fields are confirmed but no slot exists — the resumed-session case", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, null));
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("no slot: nothing would be produced");
  });

  it("should stay in storyboard when a slot has nothing chosen", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build({ ...SCALARS, grounding: "contradicted" }),
    );
    expect((await whereIs(dir)).phase).toBe("storyboard");
  });

  it("should accept an override that carries a reason, and refuse one that does not", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);

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

  // INSPIRATION IS OPT-IN — issue #40. The reference loop used to be a compulsory movement between
  // the size gate and the palette, ending in a scalar Gate 2 could not close without. Its intent
  // was always about inspiration rather than validation, and its own answer vocabulary gave it
  // away: the documented recording for "neither appealed" was `none — both rejected`, which the
  // doctrine then had to argue was "a fact, not a loss". A movement that must defend its own null
  // answer should not be mandatory.
  it("should close gate 2 with no reference at all", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build(without(SCALARS, "reference")),
    );
    const state = await whereIs(dir);
    expect(state.phase).not.toBe("storyboard");
    expect(state.missing).not.toContain("the reference loop's answer");
  });

  it("should still carry a reference the journalist did take", async () => {
    // Opt-in, not removed: a journalist who reached for inspiration has it recorded as before.
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS));
    expect((await whereIs(dir)).phase).not.toBe("storyboard");
  });

  it("should treat 'none — both rejected' as a real answer to the reference loop", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(
      join(dir, "STORYBOARD.md"),
      build({ ...SCALARS, reference: '"none — both rejected"' }),
    );
    expect((await whereIs(dir)).phase).toBe("production");
  });

  it("should stay in storyboard when a slot never recorded its medium, format or size", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
      await writeFile(join(dir, "source", "data.csv"), "col\n1");
      await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
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
      "beat 1-rainfall: rendered but not currently approved",
    );
  });

  it("should report delivery once a rendered beat has been approved", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    await approveCurrentOutput(join(dir, "beats", "1-rainfall"));
    expect((await whereIs(dir)).phase).toBe("delivery");
  });

  it("should name every rendered beat still waiting, not only the first", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await writeFile(join(dir, "STORYBOARD.md"), twoSlotStoryboard());
    await analyseBound(dir, "1-rainfall");
    await analyseBound(dir, "2-snowpack");
    for (const beat of ["1-rainfall", "2-snowpack"]) {
      await mkdir(join(dir, "beats", beat, "renders"), { recursive: true });
      await writeFile(join(dir, "beats", beat, "renders", "still.png"), "x");
    }
    await approveCurrentOutput(join(dir, "beats", "1-rainfall"));
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([
      "beat 2-snowpack: rendered but not currently approved",
    ]);
  });

  it("should report done once the beat has been delivered into its own export directory", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    const review = await approveCurrentOutput(join(dir, "beats", "1-rainfall"));
    await deliver(dir, "1-rainfall", "rainfall.png", review);
    expect((await whereIs(dir)).phase).toBe("done");
  });

  it("should reopen production and delivery from a durable editor-feedback receipt", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    const beatDir = join(dir, "beats", "1-rainfall");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    await writeFile(join(beatDir, "renders", "still.png"), "old render");
    const oldReview = await approveCurrentOutput(beatDir, {
      reviewId: "review-old",
    });
    await deliver(dir, "1-rainfall", "rainfall.png", oldReview);
    const feedbackPath = join(beatDir, "FEEDBACK.md");
    await writeFile(feedbackPath, "Move the annotation above the line.");

    expect(await whereIs(dir)).toEqual({
      phase: "production",
      status: "ready",
      owner: { kind: "skill", id: "chart-beat" },
      missing: [],
      attempts: 0,
      resume: "Revise editor feedback for beats 1-rainfall.",
    });

    await writeFile(join(beatDir, "renders", "still.png"), "revised render");
    const review = await approveCurrentOutput(beatDir, { reviewId: "review-new" });
    expect(await whereIs(dir)).toEqual({
      phase: "delivery",
      status: "ready",
      owner: { kind: "skill", id: "deliver" },
      missing: [],
      attempts: 0,
      resume: "Revise editor feedback for beats 1-rainfall.",
    });

    await deliver(dir, "1-rainfall", "rainfall.png", review);
    expect(await whereIs(dir)).toEqual({
      phase: "done",
      status: "done",
      owner: null,
      missing: [],
      attempts: 0,
      resume: "Story is complete; stop.",
    });

    await writeFile(feedbackPath, "Move the annotation below the line instead.");
    expect(await whereIs(dir)).toEqual({
      phase: "production",
      status: "ready",
      owner: { kind: "skill", id: "chart-beat" },
      missing: [],
      attempts: 0,
      resume: "Revise editor feedback for beats 1-rainfall.",
    });
  });

  it("should fail closed on malformed review state during feedback recovery", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    const beatDir = join(dir, "beats", "1-rainfall");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    await writeFile(join(beatDir, "renders", "still.png"), "render");
    const review = await approveCurrentOutput(beatDir);
    await deliver(dir, "1-rainfall", "rainfall.png", review);
    await writeFile(join(beatDir, "FEEDBACK.md"), "Change the label.");
    await writeFile(join(beatDir, "OUTPUT-REVIEW.json"), JSON.stringify({ decision: "approve" }));
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), twoSlotStoryboard());
    await analyseBound(dir, "1-rainfall");
    await analyseBound(dir, "2-snowpack");
    for (const beat of ["1-rainfall", "2-snowpack"]) {
      await mkdir(join(dir, "beats", beat, "renders"), { recursive: true });
      await writeFile(join(dir, "beats", beat, "renders", "still.png"), "x");
    }
    // Beat 1 was shown, approved and delivered. Beat 2 has rendered and nobody has seen it.
    const review = await approveCurrentOutput(join(dir, "beats", "1-rainfall"));
    await deliver(dir, "1-rainfall", "rainfall.png", review);

    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([
      "beat 2-snowpack: rendered but not currently approved",
    ]);
  });

  // The same short-circuit's other half: `done` meant "a file exists somewhere under export/", so
  // one delivered beat closed the story for every beat. Delivery is per beat now, like approval.
  it("should not call a story done while an approved beat has not been delivered", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), twoSlotStoryboard());
    await analyseBound(dir, "1-rainfall");
    await analyseBound(dir, "2-snowpack");
    for (const beat of ["1-rainfall", "2-snowpack"]) {
      await mkdir(join(dir, "beats", beat, "renders"), { recursive: true });
      await writeFile(join(dir, "beats", beat, "renders", "still.png"), "x");
    }
    const reviewOne = await approveCurrentOutput(join(dir, "beats", "1-rainfall"));
    const reviewTwo = await approveCurrentOutput(join(dir, "beats", "2-snowpack"));
    await deliver(dir, "1-rainfall", "rainfall.png", reviewOne);

    expect((await whereIs(dir)).phase).toBe("delivery");

    await deliver(dir, "2-snowpack", "snowpack.png", reviewTwo);
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
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), { recursive: true });
    await writeFile(join(dir, "beats", "1-rainfall", "renders", "still.png"), "x");
    const review = await approveCurrentOutput(join(dir, "beats", "1-rainfall"));

    await mkdir(join(dir, "export", "1-rainfall"), { recursive: true });
    await writeFile(join(dir, "export", "1-rainfall", "still.png"), "x");
    await writeFile(join(dir, "export", "1-rainfall", "still.svg"), "<svg/>");
    expect((await whereIs(dir)).phase).toBe("delivery");

    await deliver(dir, "1-rainfall", "still.png", review);
    expect((await whereIs(dir)).phase).toBe("done");
  });

  it("should report inconsistency when export holds a file but no render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    const state = await whereIs(dir);
    expect(state.missing).toContain("no renders exist in any beat");
    expect(state.phase).toBe("production");
  });

  // S4: an unterminated frontmatter block is ONE diagnosable fact about the file, not nine
  // missing decisions — the resumed-session reader is sent to fix the file, not to re-take
  // every gate.
  it("should name an unterminated frontmatter block instead of every scalar missing", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), '---\ntakeaway: "Rainfall fell."\n');
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toEqual(["STORYBOARD.md frontmatter unterminated"]);
  });

  // S1: after data.json exists nothing downstream used to re-validate meta.hashes, so a source
  // edited under a rendered chart left whereIs at production/missing:[]. The recorded hashes are
  // now checked against the CURRENT frozen inputs, and drift is named as a rebuild.
  it("should report a stale analyst artifact once a frozen input moved under it", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await writeFile(join(dir, "source", "data.csv"), "col\n2");

    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toContain("beat 1-rainfall: analyst data stale — rebuild");

    // and the entry tracks the drift, not the artifact: restoring the frozen bytes closes it
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    expect((await whereIs(dir)).missing).not.toContain(
      "beat 1-rainfall: analyst data stale — rebuild",
    );
  });

  it("should reopen at stale analyst data before evaluating render approval", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await writeFile(join(dir, "STORYBOARD.md"), build({ ...SCALARS, credit: '"Data: MeteoSwiss, revised"' }));
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), { recursive: true });
    await writeFile(join(dir, "beats", "1-rainfall", "renders", "still.png"), "x");

    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([
      "beat 1-rainfall: analyst data stale — rebuild",
    ]);
  });

  // S6: the walk that demanded data.json ran slots→dirs; its inverse now walks dirs→slots so a
  // beat directory whose slot left the storyboard is named rather than silently ignored.
  it("should report an orphaned beat directory whose slot no longer exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await analyseBound(dir, "1-rainfall");
    await mkdir(join(dir, "beats", "9-ghost"), { recursive: true });
    await writeFile(join(dir, "beats", "9-ghost", "data.json"), "{}");

    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toEqual([
      "beat 9-ghost: orphaned — slot removed from storyboard",
    ]);
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
];

const GATE2_FIXTURES: Array<{
  name: string;
  text: string;
  expectedResolverDiagnostic?: RegExp;
}> = [
  { name: "complete: every scalar, every slot field", text: build() },
  { name: "no slots", text: build(SCALARS, null) },
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
      expectedResolverDiagnostic:
        field === "medium" ? /no Splash craft owner for "hologram"\/"static"/ : undefined,
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

  for (const { name, text, expectedResolverDiagnostic } of GATE2_FIXTURES) {
    it(`should agree on: ${name}`, async () => {
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "data.csv"), "col\n1");
      await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
      await writeFile(join(dir, "STORYBOARD.md"), text);

      const state = await whereIs(dir);
      const { meta } = parseStoryboard(text);
      if (expectedResolverDiagnostic) {
        expect(checkStoryboard(meta)).toEqual([]);
        expect(state).toEqual({
          phase: "production",
          status: "blocked",
          owner: null,
          missing: [expect.stringMatching(expectedResolverDiagnostic)],
          attempts: 0,
          resume: "Stop and return control to the journalist.",
        });
        return;
      }

      const whereIsClosed = state.phase !== "storyboard";
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
    gaps.filter((g) => /\bsize\b/.test(g)).sort();

  for (const { name, slot } of SIZE_FIXTURES) {
    it(`should agree, verbatim, on: ${name}`, async () => {
      const text = build(SCALARS, slot);
      await writeFile(join(dir, "source", "article.md"), "text");
      await writeFile(join(dir, "source", "data.csv"), "col\n1");
      await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
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
      await writeFile(join(dir, "source", "data.csv"), "col\n1");
      await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
      await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, slot));
      return (await whereIs(dir)).phase !== "storyboard";
    };
    expect(await closes(without(SLOT, "size", { format: "web" }))).toBe(true);
    expect(await closes({ ...SLOT, format: "web", size: "landscape" })).toBe(
      false,
    );
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

// THE HOUSE'S OWN KNOWLEDGE, RECORDED — issue #48.
//
// Treatment selection was the one major decision in this exchange with no recorded justification.
// The two knowledge sources were enforced with wildly different force: `chart-choice.md` sat at
// movement 4 with no gate, no field and nothing able to tell whether it had been walked, while the
// external reference lookup sat at movement 8 with its own gate and a `reference:` scalar Gate 2
// could not close without. An agent optimises for the thing that is checked, and on a real run one
// did — proposing a Scatter the ranking's own move-down column removes ("most points need labels",
// on eight named communes where the finding is about two of them by name), overriding a Dumbbell
// the editor persona had independently offered. Gate 2 closed, because `reference:` held a string.
// The only thing that caught it was the journalist looking at the published graphic.
describe("gate 2: the chooser was consulted, and the intent is written down", () => {
  const frozen = async (slot: Record<string, string> | null) => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, slot));
    return whereIs(dir);
  };

  it("should refuse a slot whose narrow intent was never named", async () => {
    const state = await frozen(without(SLOT, "intent"));
    expect(state.phase).toBe("storyboard");
    expect(state.resume).toContain("G2-intent");
  });

  it("should agree with storyboard's own gate", async () => {
    // The two readers carry the contract separately and must not drift.
    const text = build(SCALARS, without(SLOT, "intent"));
    const { meta } = parseStoryboard(text);
    expect(checkStoryboard(meta).length).toBeGreaterThan(0);
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    await writeFile(join(dir, "STORYBOARD.md"), text);
    expect((await whereIs(dir)).phase).toBe("storyboard");
  });

  it("should close gate 2 once the intent is named", async () => {
    expect((await frozen(SLOT)).phase).not.toBe("storyboard");
  });
});

// GATE 2's SECOND HALF — issue #49. `surveyGap` was written, works, words its refusal well, and
// nothing ever called it. `where.mjs` had no mention of it, of `G2-subjects`, or of `SUBJECTS.md`.
//
// The cost of that lands at the very END of a run, which is what made it survivable for six
// rounds: at delivery, `otherSubjectsFor` has nothing to offer, so the closing offer can only be
// answered `none` — and `none` is a legitimate recorded answer meaning "this article yielded
// nothing else". It is indistinguishable on disk from "the survey was never written down", and
// `deliveryClosed` then reports `{"closed":true,"missing":[],"subjects":"none"}`, which is a true
// statement about the receipts and a false impression about the story.
//
// So this block asserts the two things the wiring must do, and does not settle for one: that a
// complete storyboard with no survey is HELD in the storyboard phase, and that the refusal it is
// held with is the one `surveyGap` actually wrote — a refusal that does not name the file, the
// movement and the call is how six runs each had to rediscover the same call.
describe("gate 2's second half: the survey is asked for where the angles still exist", () => {
  const frozenWithStoryboard = async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), build(SCALARS, SLOT));
  };

  it("should hold a gate-2-complete storyboard in the storyboard phase with no SUBJECTS.md", async () => {
    await frozenWithStoryboard();
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    // `gate` is internal to the resolver — `projectResolverResult` projects it into the resume
    // line, which is what a resumed session actually reads.
    expect(state.resume).toContain("G2-subjects");
    expect(state.resume).toContain("subjects");
  });

  it("should refuse in surveyGap's own words, naming the file, the movement and the call", async () => {
    await frozenWithStoryboard();
    const [gap] = (await whereIs(dir)).missing;
    expect(gap).toBe(await surveyGap(dir));
    expect(gap).toContain("SUBJECTS.md");
    expect(gap).toContain("movement 10");
    expect(gap).toContain("recordSurveyedSubjects({ storyDir, subjects })");
  });

  it("should accept the EMPTY survey — nothing else found is an answer, not an absence", async () => {
    await frozenWithStoryboard();
    await writeFile(join(dir, "SUBJECTS.md"), "---\nsubjects:\n---\n");
    expect((await whereIs(dir)).phase).not.toBe("storyboard");
  });

  it("should let the story move on once the survey is recorded", async () => {
    await frozenWithStoryboard();
    await writeFile(join(dir, "SUBJECTS.md"), SURVEYED);
    expect((await whereIs(dir)).phase).not.toBe("storyboard");
  });
});
