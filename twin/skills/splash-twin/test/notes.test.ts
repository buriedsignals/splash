import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordMaintainerNote } from "../scripts/notes.mjs";

let storyDir: string;
beforeEach(async () => {
  storyDir = await mkdtemp(join(tmpdir(), "story-"));
});
afterEach(async () => {
  await rm(storyDir, { recursive: true, force: true });
});

// This skill's never-list carries the rule as an absolute, and `twin-deliver`'s `formatHandover`
// THROWS at any maintainer-facing sentence and names this file as where it belongs instead --
// while nothing in the tree wrote it. A refusal that cannot say where to put what it refused, and a
// prose rule in a project whose own account is that a prose rule is its softest surface.
describe("recordMaintainerNote", () => {
  it("should write the file the never-list names, in the story root", async () => {
    const path = await recordMaintainerNote({
      storyDir,
      phase: "storyboard",
      note: "the size gate refused a value the exchange told me to write",
    });
    expect(path).toBe(join(storyDir, "NOTES-FOR-MAINTAINER.md"));
    const text = await readFile(path, "utf8");
    expect(text).toContain("Notes for the maintainer");
    expect(text).toContain("## Found at storyboard");
    expect(text).toContain("the size gate refused a value");
  });

  // A run finds more than one defect -- the run this file exists because of found three. A second
  // note overwriting the first is a note lost.
  it("should append a second note rather than replace the first", async () => {
    await recordMaintainerNote({ storyDir, phase: "production", note: "first defect" });
    await recordMaintainerNote({ storyDir, phase: "delivery", note: "second defect" });
    const text = await readFile(join(storyDir, "NOTES-FOR-MAINTAINER.md"), "utf8");
    expect(text).toContain("first defect");
    expect(text).toContain("second defect");
    expect(text.match(/# Notes for the maintainer/g)?.length).toBe(1);
  });

  // export/ is what the newsroom RECEIVES. A note about our own code travelling inside a delivery
  // is the same failure as speaking it to the journalist, one directory further along.
  it("should refuse to write inside export/, whatever the caller passed", async () => {
    const exportDir = join(storyDir, "export", "1-rainfall");
    await mkdir(exportDir, { recursive: true });
    await expect(
      recordMaintainerNote({ storyDir: exportDir, phase: "delivery", note: "a defect" }),
    ).rejects.toThrow(/never inside export\//);
  });

  it("should refuse a note with nothing in it", async () => {
    await expect(
      recordMaintainerNote({ storyDir, phase: "delivery", note: "   " }),
    ).rejects.toThrow(/not a record/);
  });

  it("should refuse a note that does not say where it was found", async () => {
    await expect(
      recordMaintainerNote({ storyDir, note: "a defect" }),
    ).rejects.toThrow(/needs the phase/);
  });
});

// The half that would have caught the original state: the rule was written in prose, pointed at by
// a throw, and implemented by nothing.
//
// RED, in a copy of the tree under /tmp, with the writer drifted off the name the never-list and
// `formatHandover`'s throw both point at (`FILE = "notes.md"`):
//
//   75 |   it("should be written by something in this skill, not only asked for", () => {
//   error: expect(received).toBeGreaterThan(expected)
//   Expected: > 0   Received: 0
//
//   (fail) the file the never-list names > should be written by something in this skill, not only asked for
//   (fail) recordMaintainerNote > should write the file the never-list names, in the story root
//   (fail) recordMaintainerNote > should append a second note rather than replace the first
//    4 pass, 3 fail
describe("the file the never-list names", () => {
  it("should be written by something in this skill, not only asked for", () => {
    const scripts = new URL("../scripts/", import.meta.url).pathname;
    const writers = readdirSync(scripts)
      .filter((f) => f.endsWith(".mjs"))
      .filter((f) => readFileSync(join(scripts, f), "utf8").includes('"NOTES-FOR-MAINTAINER.md"'));
    expect(writers.length).toBeGreaterThan(0);
  });

  it("should be named in the never-list it comes from", () => {
    const skill = readFileSync(join(import.meta.dirname, "..", "SKILL.md"), "utf8");
    expect(skill).toContain("NOTES-FOR-MAINTAINER.md");
    expect(skill).toContain("recordMaintainerNote");
  });
});
