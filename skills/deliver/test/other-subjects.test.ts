/**
 * THE OTHER SUBJECTS IN THE SAME ARTICLE — the owner, 2026-08-10, having read the genre offer:
 * *"Ou même le relancer sur des sous-sujets de son article qui seraient intéressants à transformer
 * en visuel."*
 *
 * One article carries several things worth drawing. The exchange FINDS them at the proposal —
 * surveys what could be made of this data, proposes materially different ways of seeing it, checks
 * each is reachable, and the journalist drops all but one. The dropped ones are exactly the
 * sub-subjects, already found and already grounded, and they were held in a conversation and lost
 * when it ended.
 *
 * WHAT THIS FILE ASSERTS, and the mutation that reddens each (all run in a copy outside the tree):
 *
 *   1. The survey's own output is persisted in the STORY's directory and read back whole.
 *      MUTATION: make `readSurveyedSubjects` return `[]`.
 *   2. Every angle is RE-CHECKED before it is offered, never trusted from the record: an angle whose
 *      beat now exists is `drawn`, a medium whose capability has since closed is `closed` with what
 *      would open it, a pair with no producer is `unreachable`. None of the three is offered.
 *      MUTATION: return `{verdict: "offered"}` for every row.
 *   3. What the journalist reads is their article and their readers — never our machinery, and never
 *      why something was filtered out. MUTATION: render a row's verdict into the offer.
 *   4. An article that yielded nothing else SAYS so and the run closes. Inventing a second-rate
 *      angle to fill the offer is the failure the empty case exists to prevent.
 *   5. A sentence that is a type name rather than a reason is refused at the moment it is recorded,
 *      where the material still is. MUTATION: drop the five-word floor.
 *   6. THE FIXTURE THE RUN WOULD HAVE FAILED: a story whose article carried several angles, one
 *      delivered, and nothing offered at the end — `deliveryClosed` names it.
 *   7. Taking one starts a NEW BEAT IN THE SAME STORY, and the two-beats path is exercised for
 *      real: the second beat gets its own `export/<beat>/` and the first one's delivery survives.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  recordSurveyedSubjects,
  readSurveyedSubjects,
  otherSubjectsFor,
  formatSubjectOffer,
  recordSubjectAnswer,
} from "../scripts/other-subjects.mjs";
import {
  deliveryClosed,
  recordGenreAnswer,
} from "../scripts/another-genre.mjs";
import { exportDirFor as canonicalExportDirFor } from "../scripts/deliver.mjs";
import { materialiseLegacyV1 } from "../scripts/delivery-compat-v1.mjs";
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

const SURVEYED = [
  {
    id: "glace-des-sponsors",
    learns:
      "combien de la fonte totale revient aux Jeux eux-mêmes plutôt qu'à leurs sponsors",
    medium: "chart",
    genre: "static",
  },
  {
    id: "ou-fond-la-glace",
    learns:
      "où se trouvent les glaciers que cette fonte concerne, et à quelle distance des sites",
    medium: "map",
    genre: "static",
  },
  {
    id: "trente-ans-de-fonte",
    learns: "comment cette seule année se compare aux trente qui la précèdent",
    medium: "chart",
    genre: "video",
  },
];

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

const handover = {
  // This story IS French — it is the owner's own run, the one A25 came out of.
  language: "fr",
  placement: "après le paragraphe qui donne les 34 Mt, pleine largeur",
  alt: "Les Jeux eux-mêmes pèsent 14 des 34 millions de tonnes",
  credit: "Source : bilans carbone publiés par les organisateurs",
};

let storyDir: string;
async function makeBeat(name: string) {
  const beatDir = join(storyDir, "beats", name);
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), `png-${name}`);
  await writeFile(join(beatDir, "renders", "still.svg"), `<svg id='${name}'/>`);
  await approveCurrentOutput(beatDir);
  return beatDir;
}

beforeEach(async () => {
  const base = await mkdtemp(join(tmpdir(), "subjects-"));
  storyDir = join(base, "milan-cortina");
  await mkdir(storyDir, { recursive: true });
});
afterEach(async () => {
  await rm(join(storyDir, ".."), { recursive: true, force: true });
});

describe("the survey's output is kept, in the story's own directory", () => {
  it("should write it beside STORYBOARD.md and read it back whole", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    // Story-level, deliberately: a sub-subject belongs to the article and has no beat of its own
    // until somebody asks for one.
    expect(await readdir(storyDir)).toContain("SUBJECTS.md");
    const read = await readSurveyedSubjects(storyDir);
    expect(read.map((s) => s.id)).toEqual([
      "glace-des-sponsors",
      "ou-fond-la-glace",
      "trente-ans-de-fonte",
    ]);
    expect(read[1]!.learns).toBe(SURVEYED[1]!.learns);
    expect(read[2]!.genre).toBe("video");
  });

  it("should refuse a name where a reason belongs", async () => {
    await expect(
      recordSurveyedSubjects({
        storyDir,
        subjects: [
          {
            id: "a-bar-chart",
            learns: "Stacked bar",
            medium: "chart",
            genre: "static",
          },
        ],
      }),
    ).rejects.toThrow(/what the READER would learn/);
  });

  it("should refuse a reason written about our own code", async () => {
    await expect(
      recordSurveyedSubjects({
        storyDir,
        subjects: [
          {
            id: "a",
            learns:
              "this one needs skills/map-beat and a bigger camera than we have",
            medium: "map",
            genre: "static",
          },
        ],
      }),
    ).rejects.toThrow(/NOTES-FOR-MAINTAINER/);
  });

  it("should refuse an id that cannot name a beat directory, and a duplicate one", async () => {
    await expect(
      recordSurveyedSubjects({
        storyDir,
        subjects: [
          {
            id: "Où fond la glace",
            learns: "where the ice that melts actually is",
            medium: "map",
            genre: "static",
          },
        ],
      }),
    ).rejects.toThrow(/lowercase words joined by hyphens/);
    await expect(
      recordSurveyedSubjects({
        storyDir,
        subjects: [SURVEYED[0]!, SURVEYED[0]!],
      }),
    ).rejects.toThrow(/share the id/);
  });

  it("should report no angles at all when the proposal recorded none", async () => {
    expect(await readSurveyedSubjects(storyDir)).toEqual([]);
    expect(await otherSubjectsFor({ storyDir })).toEqual([]);
  });
});

describe("every angle is re-checked before it is offered", () => {
  it("should not offer an angle the delivered beat already drew", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    await makeBeat("1-glace-des-sponsors");

    const rows = await otherSubjectsFor({ storyDir, capabilities: OPEN });
    expect(rows.find((r) => r.id === "glace-des-sponsors")!.verdict).toBe(
      "drawn",
    );
    expect(
      rows.filter((r) => r.verdict === "offered").map((r) => r.id),
    ).toEqual(["ou-fond-la-glace", "trente-ans-de-fonte"]);
  });

  it("should not trust a capability that was open an hour ago", async () => {
    // The stored record says this angle is a map. Between the proposal and the delivery the key
    // stopped working — so the angle is named as unavailable WITH what would open it, and it is not
    // offered.
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    await makeBeat("1-glace-des-sponsors");

    const rows = await otherSubjectsFor({ storyDir, capabilities: SHUT });
    const map = rows.find((r) => r.id === "ou-fond-la-glace")!;
    expect(map.verdict).toBe("closed");
    expect(map.because).toContain("map beats are unavailable");
    expect(map.opens).toContain("MAPTILER_KEY");
    expect(
      rows.filter((r) => r.verdict === "offered").map((r) => r.id),
    ).toEqual(["trente-ans-de-fonte"]);
  });

  it("should not offer a pair this toolchain has no producer for", async () => {
    await recordSurveyedSubjects({
      storyDir,
      subjects: [
        {
          id: "les-photos",
          learns:
            "ce que le glacier montrait il y a trente ans, image après image",
          medium: "image",
          genre: "video",
        },
      ],
    });
    expect((await otherSubjectsFor({ storyDir }))[0]!.verdict).toBe(
      "unreachable",
    );
  });
});

describe("what the journalist reads at the end of their run", () => {
  it("should be about their article and their readers, never about us", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    await makeBeat("1-glace-des-sponsors");
    const text = formatSubjectOffer(
      await otherSubjectsFor({ storyDir, capabilities: SHUT }),
      { language: "en" },
    );

    expect(text).not.toMatch(/\bskills\//);
    expect(text).not.toMatch(/\.(mjs|mts|cjs|cts|tsx|jsx)\b/);
    expect(text).not.toMatch(/verdict|candidate|reachable|producer|survey/i);
    // and never why something was filtered out
    expect(text).not.toMatch(/drawn|unreachable/i);
  });

  it("should say what the reader would learn, not what type it would be", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    await makeBeat("1-glace-des-sponsors");
    const text = formatSubjectOffer(
      await otherSubjectsFor({ storyDir, capabilities: OPEN }),
      { language: "en" },
    );

    expect(text).toContain("où se trouvent les glaciers");
    expect(text).toContain("this beat does not show");
    expect(text).toMatch(/starts a new visual in this story/);
  });

  it("should say plainly when the article yielded nothing else, rather than invent an angle", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: [SURVEYED[0]!] });
    await makeBeat("1-glace-des-sponsors");
    const rows = await otherSubjectsFor({ storyDir, capabilities: OPEN });
    expect(rows.every((r) => r.verdict === "drawn")).toBe(true);

    const text = formatSubjectOffer(rows, { language: "en" });
    expect(text).toMatch(/none of them is waiting/);
    expect(text).toMatch(/the story is closed/);
  });

  // A25, ruling R4. This story is French — the owner's own — and this offer is the last thing they
  // read. MUTATION (in a copy under /tmp): make `formatSubjectOffer` ignore `language` → the French
  // case reddens on the heading it finds; drop the notice → the untranslated case reddens.
  it("should make the offer in French for a French story", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    await makeBeat("1-glace-des-sponsors");
    const rows = await otherSubjectsFor({ storyDir, capabilities: OPEN });

    const text = formatSubjectOffer(rows, { language: "fr" });
    expect(text).toContain("Il y a davantage dans cet article");
    expect(text).toContain("où se trouvent les glaciers");
    expect(text).toMatch(/dites que vous avez terminé/i);
    expect(text).not.toContain("There is more in this article");
  });

  it("should refuse to make the offer when no language was recorded, and say so plainly in English when it has no scaffold", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    await makeBeat("1-glace-des-sponsors");
    const rows = await otherSubjectsFor({ storyDir, capabilities: OPEN });

    expect(() => formatSubjectOffer(rows)).toThrow(/own language/);
    expect(formatSubjectOffer(rows, { language: "it" })).toContain(
      "written in English, not in `it`",
    );
  });
});

describe("a delivered beat is not finished until BOTH halves of the offer are answered", () => {
  it("should name the offer that never happened", async () => {
    // THE FIXTURE. The article carried three angles, one was delivered, and the run ended: no genre
    // offer, no subject offer. This is the run, exactly.
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    const beatDir = await makeBeat("1-glace-des-sponsors");
    const exportDir = exportDirFor(storyDir, "1-glace-des-sponsors");
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
  });

  it("should still be open when only the genre half was answered", async () => {
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    const beatDir = await makeBeat("1-glace-des-sponsors");
    const exportDir = exportDirFor(storyDir, "1-glace-des-sponsors");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordGenreAnswer({ exportDir, answer: "declined" });

    const state = await deliveryClosed(exportDir);
    expect(state.closed).toBe(false);
    expect(state.missing).toEqual([
      "this beat was delivered and the article's other subjects were never offered",
    ]);
  });

  it("should close on a decline, and on an article that had nothing else", async () => {
    const beatDir = await makeBeat("1-glace-des-sponsors");
    const exportDir = exportDirFor(storyDir, "1-glace-des-sponsors");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    await recordGenreAnswer({ exportDir, answer: "declined" });
    await recordSubjectAnswer({ exportDir, answer: "none" });

    expect(await deliveryClosed(exportDir)).toMatchObject({
      closed: true,
      subjects: "none",
    });
  });

  it("should refuse an answer that is neither, and a taken one that names no subject", async () => {
    const beatDir = await makeBeat("1-glace-des-sponsors");
    const exportDir = exportDirFor(storyDir, "1-glace-des-sponsors");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(
      recordSubjectAnswer({ exportDir, answer: "peut-être" }),
    ).rejects.toThrow(/"declined", "taken" or "none"/);
    expect(recordSubjectAnswer({ exportDir, answer: "taken" })).rejects.toThrow(
      /names the subject/,
    );
  });
});

describe("taking a subject starts a new beat in the same story", () => {
  it("should give the new beat its own export and leave the delivered one untouched", async () => {
    // The two-beats-in-one-story path, exercised for real — it was broken until tonight, and this
    // offer is what will put a second beat in a story more often than anything else has.
    await recordSurveyedSubjects({ storyDir, subjects: SURVEYED });
    const first = await makeBeat("1-glace-des-sponsors");
    const firstExport = exportDirFor(storyDir, "1-glace-des-sponsors");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir: first,
      exportDir: firstExport,
      handover,
    });
    await recordGenreAnswer({ exportDir: firstExport, answer: "declined" });
    await recordSubjectAnswer({
      exportDir: firstExport,
      answer: "taken",
      subject: "trente-ans-de-fonte",
    });

    expect(await deliveryClosed(firstExport)).toMatchObject({
      closed: true,
      subjects: "taken trente-ans-de-fonte",
    });

    // The new beat is a beat like any other: it goes through its own phases and delivers on its own.
    const second = await makeBeat("2-trente-ans-de-fonte");
    const secondExport = exportDirFor(storyDir, "2-trente-ans-de-fonte");
    await materialise({
      form: "owned-file",
      genre: "static",
      beatDir: second,
      exportDir: secondExport,
      handover,
    });

    expect(await readFile(join(firstExport, "still.png"), "utf8")).toBe(
      "png-1-glace-des-sponsors",
    );
    // The first beat's hand-over survives untouched — and, this being a French story, it is written
    // in French down to the heading (A25): the whole document, not the journalist's words alone.
    expect(await readFile(join(firstExport, "HANDOVER.md"), "utf8")).toContain(
      "## La ligne de crédit",
    );
    expect((await readdir(join(storyDir, "export"))).sort()).toEqual([
      "1-glace-des-sponsors",
      "2-trente-ans-de-fonte",
    ]);
    // and the angle it drew is no longer offered anywhere
    const rows = await otherSubjectsFor({ storyDir, capabilities: OPEN });
    expect(rows.find((r) => r.id === "trente-ans-de-fonte")!.verdict).toBe(
      "drawn",
    );
  });

  it("should keep both receipts out of the files the journalist is handed", async () => {
    const beatDir = await makeBeat("1-glace-des-sponsors");
    const exportDir = exportDirFor(storyDir, "1-glace-des-sponsors");
    const written = await materialise({
      form: "owned-file",
      genre: "static",
      beatDir,
      exportDir,
      handover,
    });
    expect(written.some((p) => p.includes(".other-subjects"))).toBe(false);
    expect(written.some((p) => p.includes(".another-genre"))).toBe(false);
  });
});
