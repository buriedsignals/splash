/**
 * ROUND-FIVE T10 / V7 / W9, ROUND-SIX TIER 1 — the newsroom received the beat's working files.
 *
 * `owned-file` copied the WHOLE of a beat's `renders/` directory into `export/<output>/`, so
 * anything a producer happened to leave there reached the newsroom. Live in this tree when this
 * was written:
 *
 *     stories/stress-t-europe-recycling/export/europe-recycling-map/
 *       europe-recycling.mp4              <- what the journalist asked for
 *       europe-recycling-final-frame.png  <- the poster
 *       frame-70/160/250/329.png          <- intermediate frames of the render ladder
 *       video-props.json                  <- a working file
 *
 * and the hand-over described each of the four intermediate frames as "a raster copy, for a system
 * that cannot take the vector" — a sentence about a vector that beat never rendered, which is
 * round-five finding Y13 arriving a second time through this door.
 *
 * WHAT `owned-file` MEANS, decided here: the files this beat DELIVERS, which is what the format's
 * own `gives` sentence already promised and the delivery never honoured. Every format row in
 * `FORMS_BY_FORMAT` said it out loud — "one self-contained HTML file", "an mp4 the newsroom owns
 * outright, nothing else to run" — so this is not a new rule, it is the existing promise made
 * mechanical.
 *
 * THE POPULATION IS READ OFF THE TREE, NOT INVENTED. Every case below names a real beat's real
 * `renders/` listing. That matters twice: a fixture built to fail proves the decision runs, and
 * these prove it reaches — and the four-way split between an mp4, a poster frame, a QA frame and a
 * working file is only visible in beats somebody actually rendered.
 *
 * THE MUTATIONS THAT REDDEN IT are in the commit body.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readdir, readFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { materialise, ownedFileDelivery } from "../scripts/deliver.mjs";
import { approveCurrentOutput, TEST_FINDING_IDS, TEST_PLAN_VERSION } from "./output-review-fixture";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/** A real beat's real `renders/` listing, read off disk so a case cannot describe a beat that is
 *  not there any more. */
function rendersOf(story: string, beat: string): string[] {
  const dir = join(TWIN, "stories", story, "beats", beat, "renders");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort();
}

const handover = {
  language: "en",
  placement: "social video, published alongside the article",
  alt: "A map of Europe shaded by recycling rate.",
  credit: "Source: national environment agencies",
  caveat: "thirty-one of the forty-two countries drawn did not report",
};

describe("ownedFileDelivery — what a format's owned file actually is", () => {
  it("should find the real beats this was measured on, so nothing below is vacuous", () => {
    expect(rendersOf("stress-t-europe-recycling", "europe-recycling-map").length).toBeGreaterThan(5);
    expect(rendersOf("stress-m-forest-loss", "forest-loss").length).toBeGreaterThan(5);
    expect(rendersOf("stress-w-quay-photographs", "1-quay-sequence").length).toBe(2);
  });

  it("should deliver a video beat's mp4 and its poster frame, and nothing else", () => {
    const names = rendersOf("stress-t-europe-recycling", "europe-recycling-map");
    const { delivered, withheld } = ownedFileDelivery(names, "video");
    expect(delivered.sort()).toEqual([
      "europe-recycling-final-frame.png",
      "europe-recycling.mp4",
    ]);
    expect(withheld).toContain("video-props.json");
    expect(withheld.filter((n) => /^frame-\d+\.png$/.test(n)).length).toBe(6);
  });

  it("should withhold a video beat's rung-one still, which is the ladder and not the delivery", () => {
    // `stress-m-forest-loss` renders a still, a final frame, four QA frames, a props file and the
    // mp4. Only the last two of those seven are the video this beat delivers.
    const names = rendersOf("stress-m-forest-loss", "forest-loss");
    const { delivered, withheld } = ownedFileDelivery(names, "video");
    expect(delivered.sort()).toEqual(["forest-loss-final-frame.png", "forest-loss.mp4"]);
    expect(withheld.sort()).toEqual([
      "forest-loss-still.png",
      "forest-loss-still.svg",
      "frame-10.png",
      "frame-145.png",
      "frame-209.png",
      "frame-70.png",
      "video-props.json",
    ]);
  });

  it("should deliver BOTH frames when a beat rendered its argument at two sizes", () => {
    // Round-five V12: the journalist asked for portrait for stories and square for the feed, and
    // this beat rendered both. A rule that delivered "the mp4" would have dropped one of them.
    const names = rendersOf("stress-v-regional-migration", "1-centre-empties-fastest");
    const { delivered, withheld } = ownedFileDelivery(names, "video");
    expect(delivered.length).toBe(4);
    expect(withheld).toEqual([]);
  });

  it("should deliver a static beat's raster and its vector, which is what its own row promises", () => {
    const names = rendersOf("stress-w-quay-photographs", "1-quay-sequence");
    expect(ownedFileDelivery(names, "static")).toEqual({
      delivered: ["still.png", "still.svg"],
      withheld: [],
    });
  });

  it("should deliver one self-contained page for web and for scrolly", () => {
    for (const format of ["web", "scrolly"]) {
      expect(ownedFileDelivery(["chart.html", "notes.md", "probe.png"], format)).toEqual({
        delivered: ["chart.html"],
        withheld: ["notes.md", "probe.png"],
      });
    }
  });

  it("should refuse a format it has no delivered set for, rather than falling back to everything", () => {
    expect(() => ownedFileDelivery(["a.png"], "carrier-pigeon")).toThrow(
      /carrier-pigeon/,
    );
  });
});

describe("materialise owned-file — the export and the hand-over agree", () => {
  let tempRoot: string, storyDir: string, beatDir: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "owned-file-"));
    storyDir = join(tempRoot, "story");
    beatDir = join(storyDir, "beats", "recycling-map");
    await mkdir(join(beatDir, "renders"), { recursive: true });
    // stress-t's own listing, reproduced name for name.
    for (const name of [
      "europe-recycling.mp4",
      "europe-recycling-final-frame.png",
      "frame-60.png",
      "frame-100.png",
      "frame-125.png",
      "video-props.json",
    ]) {
      await writeFile(join(beatDir, "renders", name), `bytes-of-${name}`);
    }
    await approveCurrentOutput(beatDir);
  });
  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const identity = () => ({
    storiesRoot: dirname(storyDir),
    storyId: basename(storyDir),
    outputId: basename(beatDir),
  });

  it("should put the mp4 and the poster in the export, and leave the working files behind", async () => {
    await materialise({
      ...identity(),
      form: "owned-file",
      format: "video",
      handover,
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
    });
    const exportDir = join(storyDir, "export", "recycling-map");
    const delivered = (await readdir(exportDir)).filter((n) => !n.startsWith(".")).sort();
    expect(delivered).toEqual([
      "HANDOVER.md",
      "europe-recycling-final-frame.png",
      "europe-recycling.mp4",
    ]);
    // And the beat keeps everything, because withholding is not deleting.
    expect((await readdir(join(beatDir, "renders"))).length).toBe(6);
  });

  it("should name the poster frame for what it is, not as a fallback for a vector nobody rendered", async () => {
    // Round-five Y13, arriving through this door: every delivered PNG of a video beat was described
    // as "a raster copy, for a system that cannot take the vector".
    await materialise({
      ...identity(),
      form: "owned-file",
      format: "video",
      handover,
      planVersion: TEST_PLAN_VERSION,
      findingIds: TEST_FINDING_IDS,
    });
    const doc = await readFile(
      join(storyDir, "export", "recycling-map", "HANDOVER.md"),
      "utf8",
    );
    expect(doc).toContain("**`europe-recycling.mp4`**");
    expect(doc).toContain("**`europe-recycling-final-frame.png`**");
    // Named for what it IS. Both halves matter: the vector sentence is Y13's own defect, and
    // "this is the one to give the CMS" — the role a lone raster gets — would send an editor to
    // publish the still instead of the video.
    expect(doc).toContain("the poster image");
    expect(doc).not.toContain("cannot take the vector");
    expect(doc).not.toContain("this beat rendered no vector");
    expect(doc).not.toContain("frame-60.png");
    expect(doc).not.toContain("video-props.json");
  });

  it("should refuse a delivery whose renders hold nothing this format delivers", async () => {
    await rm(join(beatDir, "renders", "europe-recycling.mp4"));
    await rm(join(beatDir, "renders", "europe-recycling-final-frame.png"));
    await approveCurrentOutput(beatDir);
    expect(
      materialise({
        ...identity(),
        form: "owned-file",
        format: "video",
        handover,
        planVersion: TEST_PLAN_VERSION,
        findingIds: TEST_FINDING_IDS,
      }),
    ).rejects.toThrow(/nothing a video beat delivers/);
  });
});
