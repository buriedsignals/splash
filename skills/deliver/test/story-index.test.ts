/**
 * "WHAT HAVE WE MADE AND WHERE IS IT?" — issue #56.
 *
 * Every fact was already on disk and recorded well; none of it was in one place and none of it was
 * at the story level. Answering that question meant opening n directories, reading a JSON and two
 * dotfiles per output, and knowing that anything unhosted lives in `beats/` rather than `export/`.
 * The journalist asked for the file directly: *"otherwise people are not going to remember where
 * things are."*
 *
 * These pin the four rules the file holds itself to, because each one is a way it could go wrong:
 * it is not a state file, it covers the unhosted formats, it says where to CORRECT a visual, and it
 * carries the warnings that belong to each one.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STORY_INDEX_FILE,
  describeVisual,
  formatStoryIndex,
  writeStoryIndex,
} from "../scripts/story-index.mjs";

let story: string;
beforeEach(async () => {
  story = await mkdtemp(join(tmpdir(), "story-index-"));
});
afterEach(async () => rm(story, { recursive: true, force: true }));

const HOSTED = { id: "1", proves: "Annemasse is poorest but not most unequal.", medium: "map", format: "web" };
const VIDEO = { id: "2", proves: "Cross-border flows doubled.", medium: "map", format: "video" };
const OPEN = { id: "3", proves: "Rents rose fastest where incomes rose slowest.", medium: "chart", format: "static" };

async function hosted() {
  await mkdir(join(story, "beats", "1-inequality"), { recursive: true });
  await mkdir(join(story, "export", "1-inequality"), { recursive: true });
  await writeFile(join(story, "export", "1-inequality", "EMBED_URL.txt"), "https://splash.example/abc\n");
}

describe("the index answers the six questions a journalist asks", () => {
  it("should carry the URL of a hosted visual", async () => {
    await hosted();
    const visual = await describeVisual(story, HOSTED);
    expect(visual.url).toBe("https://splash.example/abc");
    expect(visual.hosted).toBe(true);
  });

  it("should say plainly that a video is a file, not a page", async () => {
    // Rule 2. Omitting the unhosted formats is worse than listing them: a journalist who cannot
    // find their video in the index concludes it was never made.
    await mkdir(join(story, "beats", "2-mobility", "renders"), { recursive: true });
    await writeFile(join(story, "beats", "2-mobility", "renders", "map.mp4"), "x");
    const visual = await describeVisual(story, VIDEO);
    expect(visual.url).toBeNull();
    expect(visual.video).toBe("beats/2-mobility/renders/map.mp4");
    const index = formatStoryIndex({ slug: "annemasse", visuals: [visual] });
    expect(index).toContain("a file, not a page");
    expect(index).toContain("map.mp4");
  });

  it("should distinguish where to correct a visual from what was sent", async () => {
    // Rule 3, and the single thing a returning journalist most needs. `AGENTS.md` states it in
    // prose for an agent; nothing stated it for a human.
    await hosted();
    const index = formatStoryIndex({ slug: "annemasse", visuals: [await describeVisual(story, HOSTED)] });
    expect(index).toContain("**Correct it in:** `beats/1-inequality/`");
    expect(index).toContain("**Sent from:** `export/1-inequality/`");
  });

  it("should list a visual that is not delivered yet, rather than omitting it", async () => {
    await mkdir(join(story, "beats", "3-housing"), { recursive: true });
    const index = formatStoryIndex({ slug: "annemasse", visuals: [await describeVisual(story, OPEN)] });
    expect(index).toContain("Not delivered yet");
    // Still says where the work is, because that is where they would go to finish it.
    expect(index).toContain("beats/3-housing/");
  });

  it("should summarise a development-key warning per visual", async () => {
    // It lived inside one output's HANDOVER.md, so a journalist with four visuals had no summary of
    // which of them carried it — and a development key is readable by every reader of the page.
    await hosted();
    await writeFile(
      join(story, "export", "1-inequality", "HANDOVER.md"),
      "This page uses a development key for MapTiler.",
    );
    const visual = await describeVisual(story, HOSTED);
    expect(visual.warnings.join(" ")).toContain("DEVELOPMENT MapTiler key");
    expect(visual.warnings.join(" ")).toContain("billed to the newsroom");
  });

  it("should mention the stable-URL guarantee only when something is hosted", async () => {
    await hosted();
    const withHosted = formatStoryIndex({ slug: "a", visuals: [await describeVisual(story, HOSTED)] });
    expect(withHosted).toContain("SAME address");
    await mkdir(join(story, "beats", "3-housing"), { recursive: true });
    const noneHosted = formatStoryIndex({ slug: "a", visuals: [await describeVisual(story, OPEN)] });
    expect(noneHosted).not.toContain("SAME address");
  });

  it("should carry what is still awaiting a decision", async () => {
    await hosted();
    const index = formatStoryIndex({
      slug: "annemasse",
      visuals: [await describeVisual(story, HOSTED)],
      openSubjects: ["the rents table is still offered as a further angle"],
    });
    expect(index).toContain("Still awaiting a decision");
    expect(index).toContain("rents table");
  });
});

describe("the rules it holds itself to", () => {
  it("should be regenerated whole, never appended to", async () => {
    // Rule 1. A redeploy keeps the project URL but makes a new immutable deployment; the index
    // describes the CURRENT state. An index that accumulated history would start disagreeing with
    // the directory, and a drifting index is worse than none.
    await hosted();
    const path = await writeStoryIndex(story, formatStoryIndex({ slug: "a", visuals: [] }));
    expect(path.endsWith(STORY_INDEX_FILE)).toBe(true);
    const first = await readFile(path, "utf8");
    await writeStoryIndex(story, formatStoryIndex({ slug: "a", visuals: [] }));
    expect(await readFile(path, "utf8")).toBe(first);
  });

  it("should sit beside STORYBOARD.md, not inside one export", async () => {
    // It describes several exports; putting it in one of them repeats the mistake it exists to fix.
    const path = await writeStoryIndex(story, formatStoryIndex({ slug: "a", visuals: [] }));
    expect(path).toBe(join(story, STORY_INDEX_FILE));
  });

  it("should take its wording from the caller, so it can be written in the story's language", async () => {
    // Ruling R4. `deliver` already resolves this for the hand-over and both halves of the closing
    // offer; an index in English inside a French story is the half-translated document A25 was
    // about.
    await hosted();
    const index = formatStoryIndex({
      slug: "annemasse",
      visuals: [await describeVisual(story, HOSTED)],
      strings: { title: "Visuels de ce sujet", correct: "À corriger dans", sent: "Envoyé depuis" },
    });
    expect(index).toContain("# Visuels de ce sujet");
    expect(index).toContain("**À corriger dans:**");
    expect(index).not.toContain("Correct it in");
  });

  it("should say so plainly when a story has produced nothing yet", async () => {
    expect(formatStoryIndex({ slug: "a", visuals: [] })).toContain("no visuals yet");
  });
});
