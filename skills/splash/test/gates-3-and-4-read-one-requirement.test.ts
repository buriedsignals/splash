/**
 * TWO GATES, ONE REQUIREMENT — round-four findings 7 (Q3/R7) and 8 (P9).
 *
 * `splash/SKILL.md`'s "one gotcha" records this class as closed for G2: `whereIs` and
 * `checkStoryboard` cannot refuse for reasons the other cannot see, because neither runs a check
 * the other cannot. It was NOT closed for G3 -> G4, and two independent stress runs found the two
 * ends of it on real stories:
 *
 *   - `whereIs` returned `{"phase":"delivery","missing":[]}` on a beat whose delivery `deliver`
 *     refuses outright — `requireApprovedOutput` throws "this output has no bound review". The
 *     review was read in exactly one place in `where.mjs`, inside `feedbackRevisionState`, behind a
 *     `FEEDBACK.md` that cannot exist before a first delivery ever happened.
 *   - `whereIs` returned `done` while every one of a three-beat story's exports still carried
 *     `.another-format: pending` and `.other-subjects: pending`. `deliver/SKILL.md` named that gap
 *     in its own parenthesis.
 *
 * REAL MATERIAL, NOT A FIXTURE BUILT TO FAIL. Every case below runs on a copy of
 * `stories/stress-r-greek-schools` — the story the finding was written from — taken whole, with one
 * thing changed per case. A branch nothing in the tree can reach is the defect, not the evidence.
 *
 * MUTATION-CHECKED (each of these was applied, watched red, and reverted):
 *   - delete `beatsAwaitingBoundReview`'s call in `whereIs`
 *       > expected "production" to be "delivery"  (the review-less beat reports itself deliverable)
 *   - make `deliveryClosed` in `where.mjs` return `{closed: true, missing: []}` whatever it read
 *       > expected [] to have length 2  (a pending closing offer stops being named)
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whereIs } from "../scripts/where.mjs";
// A test-only cross-skill import, for the one purpose `test/` is excluded from
// `no-cross-skill-imports.test.ts` for: asserting two independent implementations of one rule
// agree. `where.mjs` never imports `deliver` at runtime and must not start.
import { requireApprovedOutput } from "../../deliver/scripts/output-review.mjs";
import { deliveryClosed } from "../../deliver/scripts/another-format.mjs";

const SOURCE_STORY = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "stories",
  "stress-r-greek-schools",
);
const BEAT = "1-attica-vs-the-rest";

let dir: string;
let storyDir: string;
let beatDir: string;
let exportDir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "gates-3-4-"));
  storyDir = join(dir, "stress-r-greek-schools");
  await cp(SOURCE_STORY, storyDir, { recursive: true });
  beatDir = join(storyDir, "beats", BEAT);
  exportDir = join(storyDir, "export", BEAT);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function review(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(beatDir, "OUTPUT-REVIEW.json"), "utf8"));
}

async function writeReview(record: unknown): Promise<void> {
  await writeFile(
    join(beatDir, "OUTPUT-REVIEW.json"),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

/** What `deliver` says, in the one word this test compares: does the delivery open, or not? */
async function deliverOpensDelivery(): Promise<boolean> {
  const record = await review().catch(() => null);
  try {
    requireApprovedOutput({
      beatDir,
      // The plan version and finding IDs are the caller's, not the record's — read back off the
      // record on disk so the case is about the BINDING, never about a stale argument in a test.
      planVersion: (record?.planVersion as number) ?? 1,
      findingIds: (record?.findingIds as string[]) ?? ["unknown-finding"],
    });
    return true;
  } catch {
    return false;
  }
}

/** What `whereIs` says, in the same word: has this beat left production for delivery? */
async function whereIsOpensDelivery(): Promise<boolean> {
  const { phase } = await whereIs(storyDir);
  return phase === "delivery" || phase === "done";
}

describe("gate 3: the bound review is one requirement, read by both gates", () => {
  it("should agree with deliver on the story exactly as it was run", async () => {
    expect(await deliverOpensDelivery()).toBe(true);
    expect(await whereIsOpensDelivery()).toBe(true);
  });

  it("should hold a beat in production when the record deliver requires is not there at all", async () => {
    await rm(join(beatDir, "OUTPUT-REVIEW.json"));

    expect(await deliverOpensDelivery()).toBe(false);

    const state = await whereIs(storyDir);
    expect(state.phase).toBe("production");
    expect(state.missing.join("\n")).toContain("OUTPUT-REVIEW.json");
    expect(state.missing.join("\n")).toContain(BEAT);
  });

  const MUTATIONS: Array<{
    name: string;
    apply: (record: Record<string, any>) => Record<string, any>;
  }> = [
    {
      name: "the decision is not an approval",
      apply: (record) => ({ ...record, decision: "changes-requested" }),
    },
    {
      name: "the review binds a render that is not the one on disk",
      apply: (record) => ({
        ...record,
        draftDigest: `sha256:${"0".repeat(64)}`,
      }),
    },
    {
      name: "the review belongs to another output",
      apply: (record) => ({ ...record, outputId: "9-somewhere-else" }),
    },
    {
      name: "its only QA run failed",
      apply: (record) => ({
        ...record,
        qaRuns: record.qaRuns.map((run: Record<string, unknown>) => ({
          ...run,
          status: "failed",
        })),
      }),
    },
    {
      name: "its QA run is bound to a different render than the review",
      apply: (record) => ({
        ...record,
        qaRuns: record.qaRuns.map((run: Record<string, unknown>) => ({
          ...run,
          draftDigest: `sha256:${"1".repeat(64)}`,
        })),
      }),
    },
    {
      name: "the schema version is one this toolchain does not know",
      apply: (record) => ({ ...record, schemaVersion: 99 }),
    },
  ];

  for (const { name, apply } of MUTATIONS) {
    it(`should refuse the delivery, exactly as deliver does, when ${name}`, async () => {
      await writeReview(apply(await review()));

      expect(await deliverOpensDelivery()).toBe(false);
      expect(await whereIsOpensDelivery()).toBe(false);
    });
  }

  it("should refuse the delivery, exactly as deliver does, when the render changed after the review", async () => {
    await writeFile(join(beatDir, "renders", "late-addition.svg"), "<svg/>\n");

    expect(await deliverOpensDelivery()).toBe(false);
    expect(await whereIsOpensDelivery()).toBe(false);
  });
});

describe("gate 4: the closing offer is part of what done means", () => {
  it("should reproduce the finding: pending receipts, and both gates asked", async () => {
    // The story as the stress run left it: delivered, handed over, neither half of the closing
    // offer ever put to the journalist.
    expect(await readFile(join(exportDir, ".another-format"), "utf8")).toBe(
      "pending\n",
    );
    expect(await readFile(join(exportDir, ".other-subjects"), "utf8")).toBe(
      "pending\n",
    );
    expect((await deliveryClosed(exportDir)).closed).toBe(false);
  });

  it("should not call a story done while a delivered beat's closing offer is still pending", async () => {
    const state = await whereIs(storyDir);

    expect(state.phase).toBe("delivery");
    expect(state.missing).toHaveLength(2);
    expect(state.missing.join("\n")).toContain(BEAT);
    for (const line of (await deliveryClosed(exportDir)).missing) {
      expect(state.missing.join("\n")).toContain(line);
    }
  });

  it("should call it done once both halves have an answer on disk", async () => {
    await writeFile(join(exportDir, ".another-format"), "declined\n");
    await writeFile(join(exportDir, ".other-subjects"), "declined\n");

    expect((await deliveryClosed(exportDir)).closed).toBe(true);
    expect((await whereIs(storyDir)).phase).toBe("done");
  });

  it("should stay in delivery when only one of the two halves was answered", async () => {
    await writeFile(join(exportDir, ".another-format"), "taken video\n");

    const state = await whereIs(storyDir);
    expect(state.phase).toBe("delivery");
    expect(state.missing).toHaveLength(1);
    expect(state.missing.join("\n")).toContain("other subjects");
  });

  it("should read a legacy .another-genre receipt as the answer it is", async () => {
    await rm(join(exportDir, ".another-format"));
    await writeFile(join(exportDir, ".another-genre"), "declined\n");
    await writeFile(join(exportDir, ".other-subjects"), "declined\n");

    expect((await whereIs(storyDir)).phase).toBe("done");
  });

  it("should refuse two receipts that disagree, exactly as deliver does", async () => {
    await writeFile(join(exportDir, ".another-format"), "taken video\n");
    await writeFile(join(exportDir, ".another-genre"), "declined\n");

    await expect(deliveryClosed(exportDir)).rejects.toThrow(
      "conflicting another-format receipts",
    );
    await expect(whereIs(storyDir)).rejects.toThrow(
      "conflicting another-format receipts",
    );
  });
});
