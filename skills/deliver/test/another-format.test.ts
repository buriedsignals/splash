/**
 * THE OFFER NOBODY WAS MAKING — the owner's run, 2026-08-10.
 *
 * *"À la toute fin il ne me propose pas d'exporter sous un autre format si jamais."* He chose an
 * interactive web chart, received it, and the run ended. Nothing asked whether he also wanted the
 * same beat as a still for print or as a video for a feed — which is the whole point of a toolchain
 * that produces four formats from one beat, and the moment a newsroom actually wants it.
 *
 * WHAT THIS FILE ASSERTS, and the mutation that reddens each (all run in a copy outside the tree):
 *
 *   1. The offer names the formats this beat could ALSO be produced in, never the one just delivered.
 *      MUTATION: drop the `format !== deliveredFormat` filter in `otherFormatsFor`.
 *   2. It cannot name a format that would fail at production: an image beat is never offered video,
 *      and a medium whose capability is shut is shown as unavailable with what would open it, not
 *      offered.
 *      MUTATION: make `capabilityGap` return `null` unconditionally.
 *   3. "This beat should not be a video" is an answer with a REASON or it is not an answer.
 *      MUTATION: accept a `notSuited` entry with no reason.
 *   4. What the journalist reads is about their work — no path of ours, no module of ours, no
 *      capability table. MUTATION: render a row's raw verdict object into the offer.
 *   5. THE FIXTURE THE RUN WOULD HAVE FAILED: a beat that has been DELIVERED is not closed until
 *      the offer has been answered. Declining closes it exactly as cleanly as taking.
 *      MUTATION: make `deliveryClosed` return `{closed: true}` whatever the receipt says.
 *   6. This skill's own medium × format table agrees with the storyboard's, which is the gate that
 *      decides reachability three phases earlier. A test may import out of its skill; runtime code
 *      may not.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  otherFormatsFor,
  formatAnotherFormatOffer,
  recordFormatAnswer,
  deliveryClosed,
  PRODUCIBLE_FORMATS,
  FORMAT_OFFER_RECEIPT,
  LEGACY_FORMAT_OFFER_RECEIPT,
} from "../scripts/another-format.mjs";
import { recordSubjectAnswer } from "../scripts/other-subjects.mjs";
import { exportDirFor as canonicalExportDirFor } from "../scripts/deliver.mjs";
import { materialiseLegacyV1 } from "../scripts/delivery-compat-v1.mjs";
import { FORMAT_CATALOG } from "../../storyboard/scripts/format-catalog.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

function exportDirFor(storyDir: string, outputId: string) {
  return canonicalExportDirFor({
    storiesRoot: dirname(storyDir),
    storyId: basename(storyDir),
    outputId,
  });
}

const materialise = (options: Record<string, any>) =>
  materialiseLegacyV1({
    ...options,
    storiesRoot: dirname(dirname(dirname(options.beatDir))),
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
  });

const OPEN = {
  map: {
    id: "map",
    opens: "map beats",
    available: true,
    reason: "MapTiler answered 200",
  },
};
const SHUT = {
  map: {
    id: "map",
    opens: "map beats",
    available: false,
    reason: "MapTiler answered 403",
    fill: "MAPTILER_KEY — a free key from maptiler.com/cloud (Account → Keys)",
  },
};

describe("otherFormatsFor — what else this beat could be", () => {
  it("should name the other formats, never the one just delivered", () => {
    const rows = otherFormatsFor({
      medium: "chart",
      deliveredFormat: "web",
      language: "en",
    });
    expect(rows.map((r) => r.format)).toEqual(["static", "video", "scrolly"]);
    expect(rows.every((r) => r.verdict === "offered")).toBe(true);
  });

  it("should give each offered format what it is for and what it costs", () => {
    for (const row of otherFormatsFor({
      medium: "chart",
      deliveredFormat: "static",
      language: "en",
    })) {
      expect(row.gives.split(/\s+/).length).toBeGreaterThan(6);
      expect(row.costs.split(/\s+/).length).toBeGreaterThan(4);
    }
  });

  it("should never offer a format this medium has no producer for", () => {
    // An image beat reaches static and scrolly. Video is ABSENT from the table, and an absent row
    // is the point — the offer cannot name a format that would fail at production.
    expect(
      otherFormatsFor({
        medium: "image",
        deliveredFormat: "scrolly",
        language: "en",
      }).map((r) => r.format),
    ).toEqual(["static"]);
  });

  it("should show a shut capability as unavailable, with what would open it", () => {
    const rows = otherFormatsFor({
      medium: "map",
      deliveredFormat: "static",
      language: "en",
      capabilities: SHUT,
    });
    expect(rows.every((r) => r.verdict === "closed")).toBe(true);
    expect(rows[0]!.because).toContain("map beats are unavailable");
    expect(rows[0]!.opens).toContain("MAPTILER_KEY");
    // and nothing offered: a closed capability is an honest answer, not a menu row
    expect(rows.filter((r) => r.verdict === "offered")).toEqual([]);
  });

  it("should offer the same map beat freely when the capability is open", () => {
    const rows = otherFormatsFor({
      medium: "map",
      deliveredFormat: "static",
      language: "en",
      capabilities: OPEN,
    });
    expect(rows.map((r) => r.verdict)).toEqual([
      "offered",
      "offered",
      "offered",
    ]);
  });

  it("should withhold a format this beat's own claim does not survive, with the reason", () => {
    const rows = otherFormatsFor({
      medium: "chart",
      deliveredFormat: "web",
      language: "en",
      notSuited: [
        {
          format: "video",
          reason: "four winters is too short to reveal over time",
        },
      ],
    });
    const video = rows.find((r) => r.format === "video")!;
    expect(video.verdict).toBe("unsuitable");
    expect(video.because).toContain("four winters");
  });

  it("should refuse a withholding that gives no reason", () => {
    expect(() =>
      otherFormatsFor({
        medium: "chart",
        deliveredFormat: "web",
        language: "en",
        notSuited: [{ format: "video" }],
      }),
    ).toThrow(/needs a format AND the reason/);
  });

  it("should refuse a reason written about our own code", () => {
    expect(() =>
      otherFormatsFor({
        medium: "chart",
        deliveredFormat: "web",
        language: "en",
        notSuited: [
          {
            format: "video",
            reason: "chart-video/scripts/render-video.mjs is flaky",
          },
        ],
      }),
    ).toThrow(/NOTES-FOR-MAINTAINER/);
  });

  it("should refuse a medium it does not produce at all", () => {
    expect(() =>
      otherFormatsFor({
        medium: "hologram",
        deliveredFormat: "web",
        language: "en",
      }),
    ).toThrow(/not a medium this toolchain produces/);
  });
});

describe("formatAnotherFormatOffer — what the journalist reads", () => {
  it("should be about their work and never about ours", () => {
    const text = formatAnotherFormatOffer(
      otherFormatsFor({
        medium: "map",
        deliveredFormat: "web",
        language: "en",
        capabilities: SHUT,
        notSuited: [
          { format: "scrolly", reason: "there is one reading here, not four" },
        ],
      }),
      { beatName: "1-rainfall", language: "en" },
    );
    expect(text).not.toMatch(/\bskills\//);
    expect(text).not.toMatch(/\.(mjs|mts|cjs|cts|tsx|jsx)\b/);
    expect(text).not.toMatch(/capabilit(y|ies)\b/i);
    expect(text).not.toMatch(/producer|verdict|catalog/i);
  });

  it("should say that taking one records a request without scheduling production", () => {
    const text = formatAnotherFormatOffer(
      otherFormatsFor({
        medium: "chart",
        deliveredFormat: "static",
        language: "en",
      }),
      { language: "en" },
    );
    expect(text).toContain("records the request only");
    expect(text).toContain("does not schedule production");
    expect(text).toContain("another format");
    expect(text).not.toMatch(/you pick its size|starts? production automatically/i);
  });

  it("should say plainly that declining is an answer", () => {
    const text = formatAnotherFormatOffer(
      otherFormatsFor({
        medium: "chart",
        deliveredFormat: "static",
        language: "en",
      }),
      { language: "en" },
    );
    expect(text).toMatch(/say you are done/i);
  });

  it("should still close cleanly when nothing can be offered", () => {
    const text = formatAnotherFormatOffer(
      otherFormatsFor({
        medium: "map",
        deliveredFormat: "static",
        language: "en",
        capabilities: SHUT,
      }),
      { language: "en" },
    );
    expect(text).toContain("Not available at the moment");
    expect(text).toMatch(/the story is closed/);
  });
});

/**
 * A25, ruling R4 — this offer is read at the same moment as `HANDOVER.md`, by the same person, in
 * the same language. The story's language is READ (`STORYBOARD.md`), never detected.
 *
 * MUTATIONS (in a copy under /tmp): make `otherFormatsFor` ignore `language` and always read the `en`
 * table → the "what it is for" case reddens; make `formatAnotherFormatOffer` ignore it → the headings case
 * reddens; drop the notice → the untranslated case reddens.
 */
describe("formatAnotherFormatOffer — in the story's own language", () => {
  const rowsIn = (language: string) =>
    otherFormatsFor({ medium: "chart", deliveredFormat: "static", language });

  it("should make the whole offer in French, the descriptions included", () => {
    const text = formatAnotherFormatOffer(rowsIn("fr"), { language: "fr" });
    expect(text).toContain("Autres formats de publication pour ce visuel");
    expect(text).toContain("une page dans laquelle le lecteur se déplace");
    expect(text).toMatch(/dites que vous avez terminé/i);
    expect(text).not.toContain("records the request only");
    expect(text).not.toContain("Other publication formats for this beat");
  });

  it("should refuse to make the offer at all when no language was recorded", () => {
    expect(() => rowsIn("")).toThrow(/own language/);
    expect(() => formatAnotherFormatOffer(rowsIn("en"))).toThrow(/STORYBOARD\.md/);
  });

  it("should say it is falling back to English when the recorded language has no scaffold", () => {
    const text = formatAnotherFormatOffer(rowsIn("de"), { language: "de" });
    expect(text).toContain("written in English, not in `de`");
    expect(text).toContain("Other publication formats for this beat");
  });
});

const handover = {
  language: "en",
  placement: "after the paragraph on winter rainfall",
  alt: "Rainfall fell in three of the last four winters",
  credit: "Source: MeteoSwiss, as of 2026-08-10",
};

let storyDir: string, beatDir: string;
beforeEach(async () => {
  const base = await mkdtemp(join(tmpdir(), "another-format-"));
  storyDir = join(base, "water-wars");
  beatDir = join(storyDir, "beats", "1-rainfall");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), "png-bytes");
  await writeFile(join(beatDir, "renders", "still.svg"), "<svg/>");
  await approveCurrentOutput(beatDir);
});
afterEach(async () => {
  await rm(join(storyDir, ".."), { recursive: true, force: true });
});

describe("a delivered beat is not a finished one until the offer is answered", () => {
  it("should report a delivered beat as not closed, naming what never happened", async () => {
    // THE FIXTURE. Nothing here asks a question — this is exactly the shape of the run: the beat is
    // delivered, the hand-over is written, and the journalist was never offered another format. The
    // article's other subjects are the other half of the same closing offer, and they were not
    // offered either (see other-subjects.test.ts) — `missing` names both.
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });

    const state = await deliveryClosed(exportDir);
    expect(state.closed).toBe(false);
    expect(state.missing).toEqual([
      "this beat was delivered and never offered in another format",
      "this beat was delivered and the article's other subjects were never offered",
    ]);
    expect(state.answer).toBeNull();
  });

  it("should close when the journalist declines", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordFormatAnswer({ exportDir, answer: "declined" });
    // Both halves close a delivery: this test is about the format one, so the other is answered too.
    await recordSubjectAnswer({ exportDir, answer: "none" });

    const state = await deliveryClosed(exportDir);
    expect(state.closed).toBe(true);
    expect(state.answer).toBe("declined");
  });

  it("should close when the journalist takes one, and record which", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordFormatAnswer({ exportDir, answer: "taken", format: "video" });
    await recordSubjectAnswer({ exportDir, answer: "none" });

    expect(await deliveryClosed(exportDir)).toMatchObject({
      closed: true,
      answer: "taken video",
    });
  });

  it("should refuse an answer that is neither, and a taken one that names no format", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(recordFormatAnswer({ exportDir, answer: "maybe" })).rejects.toThrow(
      /"declined" or "taken"/,
    );
    expect(recordFormatAnswer({ exportDir, answer: "taken" })).rejects.toThrow(
      /names the format/,
    );
  });

  it("should re-open the question when the beat is delivered again", async () => {
    // A second delivery is a new artifact in the journalist's hands, so the offer is asked again
    // rather than inheriting the last answer.
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordFormatAnswer({ exportDir, answer: "declined" });
    await materialise({
      form: "source-bundle",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });

    expect((await deliveryClosed(exportDir)).closed).toBe(false);
  });

  it("should keep the receipt out of the files the journalist is handed", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    const written = await materialise({
      form: "owned-file",
      format: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(written.some((p) => p.includes(".another-format"))).toBe(false);
  });
});

describe("another-format receipt compatibility", () => {
  async function receiptFixture() {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await mkdir(exportDir, { recursive: true });
    await recordSubjectAnswer({ exportDir, answer: "none" });
    return exportDir;
  }

  it("reads a legacy-only receipt without mutating the immutable export", async () => {
    const exportDir = await receiptFixture();
    await writeFile(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), "declined\n");

    expect(await deliveryClosed(exportDir)).toMatchObject({ closed: true, answer: "declined" });
    expect(await readFile(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), "utf8")).toBe("declined\n");
    expect(await readdir(exportDir)).not.toContain(FORMAT_OFFER_RECEIPT);
  });

  it("reads a canonical-only receipt", async () => {
    const exportDir = await receiptFixture();
    await writeFile(join(exportDir, FORMAT_OFFER_RECEIPT), "declined\n");
    expect(await deliveryClosed(exportDir)).toMatchObject({ closed: true, answer: "declined" });
  });

  it("accepts matching dual receipts and fails closed on conflicting ones", async () => {
    const exportDir = await receiptFixture();
    await writeFile(join(exportDir, FORMAT_OFFER_RECEIPT), "taken video\n");
    await writeFile(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), "taken video\n");
    expect(await deliveryClosed(exportDir)).toMatchObject({ closed: true, answer: "taken video" });

    await writeFile(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), "declined\n");
    await expect(deliveryClosed(exportDir)).rejects.toThrow(
      /conflicting another-format receipts.*\.another-format.*legacy \.another-genre/,
    );
  });

  it("migrates only on an explicit answer and records no scheduled output", async () => {
    const exportDir = await receiptFixture();
    await writeFile(join(exportDir, LEGACY_FORMAT_OFFER_RECEIPT), "declined\n");

    await recordFormatAnswer({ exportDir, answer: "taken", format: "video" });

    expect(await readFile(join(exportDir, FORMAT_OFFER_RECEIPT), "utf8")).toBe("taken video\n");
    expect(await readdir(exportDir)).not.toContain(LEGACY_FORMAT_OFFER_RECEIPT);
    expect((await readdir(exportDir)).filter((name) => name.includes("video"))).toEqual([]);
  });

  it("rejects genre on the canonical answer API", async () => {
    const exportDir = await receiptFixture();
    await expect(
      recordFormatAnswer({ exportDir, answer: "taken", genre: "video" } as any),
    ).rejects.toThrow(/accepted only when reading a legacy receipt/);
  });
});

describe("this skill's medium × format table agrees with the gate that decides reachability", () => {
  it("should carry exactly the pairs the storyboard's catalogue can deliver", () => {
    const fromCatalog: Record<string, string[]> = {};
    for (const [pair, row] of Object.entries(FORMAT_CATALOG)) {
      if (!row.delivered) continue;
      const [medium, format] = pair.split("/") as [string, string];
      (fromCatalog[medium] ??= []).push(format);
    }
    for (const key of Object.keys(fromCatalog)) fromCatalog[key]!.sort();

    const mine: Record<string, string[]> = {};
    for (const [medium, formats] of Object.entries(PRODUCIBLE_FORMATS)) {
      mine[medium] = [...formats].sort();
    }
    expect(mine).toEqual(fromCatalog);
  });
});
