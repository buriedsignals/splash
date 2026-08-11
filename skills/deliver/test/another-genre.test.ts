/**
 * THE OFFER NOBODY WAS MAKING — the owner's run, 2026-08-10.
 *
 * *"À la toute fin il ne me propose pas d'exporter sous un autre genre si jamais."* He chose an
 * interactive web chart, received it, and the run ended. Nothing asked whether he also wanted the
 * same beat as a still for print or as a video for a feed — which is the whole point of a toolchain
 * that produces four genres from one beat, and the moment a newsroom actually wants it.
 *
 * WHAT THIS FILE ASSERTS, and the mutation that reddens each (all run in a copy outside the tree):
 *
 *   1. The offer names the genres this beat could ALSO be produced in, never the one just delivered.
 *      MUTATION: drop the `genre !== deliveredGenre` filter in `otherGenresFor`.
 *   2. It cannot name a genre that would fail at production: an image beat is never offered video,
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
 *   6. This skill's own medium × genre table agrees with the storyboard's, which is the gate that
 *      decides reachability three phases earlier. A test may import out of its skill; runtime code
 *      may not.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  otherGenresFor,
  formatGenreOffer,
  recordGenreAnswer,
  deliveryClosed,
  PRODUCIBLE_GENRES,
} from "../scripts/another-genre.mjs";
import { recordSubjectAnswer } from "../scripts/other-subjects.mjs";
import {
  materialise as materialiseWithReview,
  exportDirFor,
} from "../scripts/deliver.mjs";
import { GENRE_CATALOG } from "../../storyboard/scripts/genre-catalog.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

const materialise = (options: Record<string, unknown>) =>
  materialiseWithReview({
    ...options,
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

describe("otherGenresFor — what else this beat could be", () => {
  it("should name the other genres, never the one just delivered", () => {
    const rows = otherGenresFor({
      medium: "chart",
      deliveredGenre: "web",
      language: "en",
    });
    expect(rows.map((r) => r.genre)).toEqual(["static", "video", "scrolly"]);
    expect(rows.every((r) => r.verdict === "offered")).toBe(true);
  });

  it("should give each offered genre what it is for and what it costs", () => {
    for (const row of otherGenresFor({
      medium: "chart",
      deliveredGenre: "static",
      language: "en",
    })) {
      expect(row.gives.split(/\s+/).length).toBeGreaterThan(6);
      expect(row.costs.split(/\s+/).length).toBeGreaterThan(4);
    }
  });

  it("should never offer a genre this medium has no producer for", () => {
    // An image beat reaches static and scrolly. Video is ABSENT from the table, and an absent row
    // is the point — the offer cannot name a genre that would fail at production.
    expect(
      otherGenresFor({
        medium: "image",
        deliveredGenre: "scrolly",
        language: "en",
      }).map((r) => r.genre),
    ).toEqual(["static"]);
  });

  it("should show a shut capability as unavailable, with what would open it", () => {
    const rows = otherGenresFor({
      medium: "map",
      deliveredGenre: "static",
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
    const rows = otherGenresFor({
      medium: "map",
      deliveredGenre: "static",
      language: "en",
      capabilities: OPEN,
    });
    expect(rows.map((r) => r.verdict)).toEqual([
      "offered",
      "offered",
      "offered",
    ]);
  });

  it("should withhold a genre this beat's own claim does not survive, with the reason", () => {
    const rows = otherGenresFor({
      medium: "chart",
      deliveredGenre: "web",
      language: "en",
      notSuited: [
        {
          genre: "video",
          reason: "four winters is too short to reveal over time",
        },
      ],
    });
    const video = rows.find((r) => r.genre === "video")!;
    expect(video.verdict).toBe("unsuitable");
    expect(video.because).toContain("four winters");
  });

  it("should refuse a withholding that gives no reason", () => {
    expect(() =>
      otherGenresFor({
        medium: "chart",
        deliveredGenre: "web",
        language: "en",
        notSuited: [{ genre: "video" }],
      }),
    ).toThrow(/needs a genre AND the reason/);
  });

  it("should refuse a reason written about our own code", () => {
    expect(() =>
      otherGenresFor({
        medium: "chart",
        deliveredGenre: "web",
        language: "en",
        notSuited: [
          {
            genre: "video",
            reason: "chart-video/scripts/render-video.mjs is flaky",
          },
        ],
      }),
    ).toThrow(/NOTES-FOR-MAINTAINER/);
  });

  it("should refuse a medium it does not produce at all", () => {
    expect(() =>
      otherGenresFor({
        medium: "hologram",
        deliveredGenre: "web",
        language: "en",
      }),
    ).toThrow(/not a medium this toolchain produces/);
  });
});

describe("formatGenreOffer — what the journalist reads", () => {
  it("should be about their work and never about ours", () => {
    const text = formatGenreOffer(
      otherGenresFor({
        medium: "map",
        deliveredGenre: "web",
        language: "en",
        capabilities: SHUT,
        notSuited: [
          { genre: "scrolly", reason: "there is one reading here, not four" },
        ],
      }),
      { beatName: "1-rainfall", language: "en" },
    );
    expect(text).not.toMatch(/\bskills\//);
    expect(text).not.toMatch(/\.(mjs|mts|cjs|cts|tsx|jsx)\b/);
    expect(text).not.toMatch(/capabilit(y|ies)\b/i);
    expect(text).not.toMatch(/producer|verdict|catalog/i);
  });

  it("should say that taking one is a separate piece of work, not a second file appearing", () => {
    // The single-format model, in the journalist's own terms: producing another genre means
    // producing the beat again — its own size, its own review, its own delivery.
    const text = formatGenreOffer(
      otherGenresFor({
        medium: "chart",
        deliveredGenre: "static",
        language: "en",
      }),
      { language: "en" },
    );
    expect(text).toContain("separate piece of work");
    expect(text).toMatch(/approve/);
  });

  it("should say plainly that declining is an answer", () => {
    const text = formatGenreOffer(
      otherGenresFor({
        medium: "chart",
        deliveredGenre: "static",
        language: "en",
      }),
      { language: "en" },
    );
    expect(text).toMatch(/say you are done/i);
  });

  it("should still close cleanly when nothing can be offered", () => {
    const text = formatGenreOffer(
      otherGenresFor({
        medium: "map",
        deliveredGenre: "static",
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
 * MUTATIONS (in a copy under /tmp): make `otherGenresFor` ignore `language` and always read the `en`
 * table → the "what it is for" case reddens; make `formatGenreOffer` ignore it → the headings case
 * reddens; drop the notice → the untranslated case reddens.
 */
describe("formatGenreOffer — in the story's own language", () => {
  const rowsIn = (language: string) =>
    otherGenresFor({ medium: "chart", deliveredGenre: "static", language });

  it("should make the whole offer in French, the descriptions included", () => {
    const text = formatGenreOffer(rowsIn("fr"), { language: "fr" });
    expect(text).toContain("Ce que ce visuel pourrait être aussi");
    expect(text).toContain("une page dans laquelle le lecteur se déplace");
    expect(text).toMatch(/dites que vous avez terminé/i);
    expect(text).not.toContain("separate piece of work");
    expect(text).not.toContain("What else this beat could be");
  });

  it("should refuse to make the offer at all when no language was recorded", () => {
    expect(() => rowsIn("")).toThrow(/own language/);
    expect(() => formatGenreOffer(rowsIn("en"))).toThrow(/STORYBOARD\.md/);
  });

  it("should say it is falling back to English when the recorded language has no scaffold", () => {
    const text = formatGenreOffer(rowsIn("de"), { language: "de" });
    expect(text).toContain("written in English, not in `de`");
    expect(text).toContain("What else this beat could be");
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
  const base = await mkdtemp(join(tmpdir(), "another-genre-"));
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
    // delivered, the hand-over is written, and the journalist was never offered another genre. The
    // article's other subjects are the other half of the same closing offer, and they were not
    // offered either (see other-subjects.test.ts) — `missing` names both.
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });

    const state = await deliveryClosed(exportDir);
    expect(state.closed).toBe(false);
    expect(state.missing).toEqual([
      "this beat was delivered and never offered in another genre",
      "this beat was delivered and the article's other subjects were never offered",
    ]);
    expect(state.answer).toBeNull();
  });

  it("should close when the journalist declines", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordGenreAnswer({ exportDir, answer: "declined" });
    // Both halves close a delivery: this test is about the genre one, so the other is answered too.
    await recordSubjectAnswer({ exportDir, answer: "none" });

    const state = await deliveryClosed(exportDir);
    expect(state.closed).toBe(true);
    expect(state.answer).toBe("declined");
  });

  it("should close when the journalist takes one, and record which", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordGenreAnswer({ exportDir, answer: "taken", genre: "video" });
    await recordSubjectAnswer({ exportDir, answer: "none" });

    expect(await deliveryClosed(exportDir)).toMatchObject({
      closed: true,
      answer: "taken video",
    });
  });

  it("should refuse an answer that is neither, and a taken one that names no genre", async () => {
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(recordGenreAnswer({ exportDir, answer: "maybe" })).rejects.toThrow(
      /"declined" or "taken"/,
    );
    expect(recordGenreAnswer({ exportDir, answer: "taken" })).rejects.toThrow(
      /names the genre/,
    );
  });

  it("should re-open the question when the beat is delivered again", async () => {
    // A second delivery is a new artifact in the journalist's hands, so the offer is asked again
    // rather than inheriting the last answer.
    const exportDir = exportDirFor(storyDir, "1-rainfall");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordGenreAnswer({ exportDir, answer: "declined" });
    await materialise({
      form: "source-bundle",
      genre: "static",
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
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(written.some((p) => p.includes(".another-genre"))).toBe(false);
  });
});

describe("this skill's medium × genre table agrees with the gate that decides reachability", () => {
  it("should carry exactly the pairs the storyboard's catalogue can deliver", () => {
    const fromCatalog: Record<string, string[]> = {};
    for (const [pair, row] of Object.entries(GENRE_CATALOG)) {
      if (!row.delivered) continue;
      const [medium, genre] = pair.split("/") as [string, string];
      (fromCatalog[medium] ??= []).push(genre);
    }
    for (const key of Object.keys(fromCatalog)) fromCatalog[key]!.sort();

    const mine: Record<string, string[]> = {};
    for (const [medium, genres] of Object.entries(PRODUCIBLE_GENRES)) {
      mine[medium] = [...genres].sort();
    }
    expect(mine).toEqual(fromCatalog);
  });
});
