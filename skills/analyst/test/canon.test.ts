import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { buildData } from "../scripts/build-data.mjs";
import { parseCsv } from "../scripts/csv.mjs";
import { profileTable } from "../scripts/profile.mjs";

const SKILL = join(import.meta.dirname, "..");

// The canon's SHAPE — front matter, body order, sample data with a genuine hole — and the
// BEHAVIOR the skill promises: refusals that write nothing, hash-mismatch refusal, nulls that
// survive into the artifact. The proof half regenerates output-proof/ from the fixture story and
// requires byte equality, so a stale proof redden here instead of lying in the tree.

describe("analyst canon", () => {
  it("should carry front matter of exactly name and description", async () => {
    const text = await readFile(join(SKILL, "SKILL.md"), "utf8");
    const match = /^---\n([\s\S]*?)\n---/.exec(text);
    expect(match).not.toBeNull();
    const keys = [...match[1].matchAll(/^([a-z]+):/gm)].map((m) => m[1]);
    expect(keys).toEqual(["name", "description"]);
  });

  it("should carry the body sections in the house order", async () => {
    const text = await readFile(join(SKILL, "SKILL.md"), "utf8");
    const sections = [
      "## Overview",
      "## When to use",
      "## The one gotcha that will waste your day (read first)",
      "## Architecture",
      "## How it works (the shape)",
      "## Quick start",
      "## Tuning knobs",
      "## Files",
    ];
    let last = -1;
    for (const section of sections) {
      const at = text.indexOf(section);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
  });

  it("should carry sample data of at least eight rows with a genuine null", async () => {
    const csv = await readFile(
      join(SKILL, "assets", "sample-data", "rainfall.csv"),
      "utf8",
    );
    const lines = csv.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(9); // header + 8
    const rows = lines.slice(1).map((line) => line.split(","));
    const holes = rows.filter((row) => row.some((cell) => cell.trim() === ""));
    expect(holes.length).toBeGreaterThanOrEqual(1);
  });

  it("should ship an output proof and a rules reference", async () => {
    for (const path of [
      join(SKILL, "output-proof", "data.json"),
      join(SKILL, "output-proof", "DATA-NOTES.md"),
      join(SKILL, "references", "data-rules.md"),
    ]) {
      await expect(readFile(path, "utf8")).resolves.toBeTruthy();
    }
  });
});

describe("buildData behavior", () => {
  const csv = [
    "year,rainfall_mm,days_of_rain",
    "2015,912,148",
    "2016,877,",
    "2017,845,139",
    "2018,866,150",
    "2019,801,144",
    "2020,768,131",
    "2021,742,118",
    "2022,690,124",
  ].join("\n");
  // What intake would have frozen for this table — computed with the SAME carried profiler
  // build-data.mjs verifies against, so the fixture can never drift from the real shape.
  const profile = JSON.stringify(profileTable(parseCsv(csv)));

  let dir;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "analyst-"));
    await mkdir(join(dir, "source"), { recursive: true });
    await writeFile(join(dir, "source", "data.csv"), csv);
    await writeFile(join(dir, "source", "profile.json"), profile);
  });
  afterEach(async () => rm(dir, { recursive: true, force: true }));

  function storyboard(slot = defaultSlot()) {
    return `---
takeaway: "Rainfall fell by a third."
subject: "Rainfall trends"
comparison: "the last decade against the one before it"
limits: "single station"
placement: "above the fold"
credit: "Data: MeteoSwiss"
effectiveDate: "2026-08-01"
grounding: supported
reference: "The Pudding, redraft — mid-table deviation"
slots:
${slot}
---
`;
  }

  function defaultSlot() {
    return `  - id: 1
    proves: "Rainfall fell by a third."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]`;
  }

  async function seed(text = storyboard()) {
    await writeFile(join(dir, "STORYBOARD.md"), text);
  }

  it("should write the artifact and notes on a closed slot", async () => {
    await seed();
    const { wrote } = await buildData({ storyDir: dir, slotId: "1" });
    expect(wrote.length).toBe(2);
    const artifact = JSON.parse(await readFile(wrote[0], "utf8"));
    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.columns).toEqual([
      { name: "year", type: "number" },
      { name: "rainfall_mm", type: "number" },
      { name: "days_of_rain", type: "number" },
    ]);
    expect(artifact.rows.length).toBe(8);
    expect(artifact.meta.hashes.storyboard).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(artifact.meta.hashes.profile).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(artifact.meta.hashes.sourceData).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("should preserve nulls instead of imputing them", async () => {
    await seed();
    const { artifact } = await buildData({ storyDir: dir, slotId: "1" });
    const daysColumn = artifact.columns.findIndex((c) => c.name === "days_of_rain");
    const hole = artifact.rows.find((row) => row[daysColumn] === null);
    expect(hole).toBeDefined();
    expect(hole[daysColumn]).toBeNull(); // not 0, not the mean, not carried forward
  });

  it("should refuse an unclosed Gate 2 and write nothing", async () => {
    await seed(
      storyboard().replace("chosen: trajectory\n", "").replace(
        "    candidates: [trajectory, comparison]",
        "",
      ),
    );
    let threw = false;
    try {
      await buildData({ storyDir: dir, slotId: "1" });
    } catch (error) {
      threw = true;
      expect(error.message).toContain("refused");
      expect(error.message).toContain("nothing chosen");
    }
    expect(threw).toBe(true);
    expect(await readdir(dir)).not.toContain("beats"); // nothing written anywhere
  });

  it("should refuse when the profile disagrees with the frozen data", async () => {
    await seed();
    await writeFile(
      join(dir, "source", "profile.json"),
      profile.replace('"rowCount":8', '"rowCount":7'),
    );
    expect(buildData({ storyDir: dir, slotId: "1" })).rejects.toThrow(/disagrees/);
    expect(await readdir(dir)).not.toContain("beats");
  });

  it("should refuse a rebuild over changed inputs, and allow an identical one", async () => {
    await seed();
    await buildData({ storyDir: dir, slotId: "1" });

    await buildData({ storyDir: dir, slotId: "1" }); // identical inputs: idempotent rebuild

    await writeFile(join(dir, "STORYBOARD.md"), storyboard().replace("static", "web").replace("size: landscape\n", ""));
    let message = "";
    try {
      await buildData({ storyDir: dir, slotId: "1" });
    } catch (error) {
      message = error.message;
    }
    expect(message).toContain("changed since freeze");
  });

  // S2: a legacy `genre:` storyboard closes both gates (whereIs and storyboard's own carry the
  // genre→format normalization), so the analyst's carried parser must resolve it too — otherwise
  // data.json records `slot.format: null` and medium×format dispatch can never match.
  it("should resolve a legacy genre slot to its dispatchable format", async () => {
    await seed(storyboard().replace("    format: static", "    genre: static"));
    const { artifact } = await buildData({ storyDir: dir, slotId: "1" });
    expect(artifact.slot.format).toBe("static");
  });

  // S3: the drift refusal is the no-rebuild-requested case. An explicit rebuild acknowledges
  // the drift and rewrites from current inputs, refreshing the recorded hashes.
  it("should rebuild over drifted inputs when the rebuild is explicitly requested", async () => {
    await seed();
    await buildData({ storyDir: dir, slotId: "1" });
    const drifted = storyboard().replace(
      'proves: "Rainfall fell by a third."',
      'proves: "Rainfall fell by a third in ten years."',
    );
    await writeFile(join(dir, "STORYBOARD.md"), drifted);

    // without the acknowledgment the refusal stands
    await expect(buildData({ storyDir: dir, slotId: "1" })).rejects.toThrow(
      /changed since freeze/,
    );

    const { wrote } = await buildData({ storyDir: dir, slotId: "1", rebuild: true });
    const artifact = JSON.parse(await readFile(wrote[0], "utf8"));
    expect(artifact.meta.hashes.storyboard).toBe(
      `sha256:${createHash("sha256").update(drifted).digest("hex")}`,
    );
  });

  it("should refuse an image slot as carrying no data contract", async () => {
    await seed(storyboard().replace("medium: chart", "medium: image"));
    expect(buildData({ storyDir: dir, slotId: "1" })).rejects.toThrow(/no data contract/);
    expect(await readdir(dir)).not.toContain("beats");
  });

  it("should refuse a source file gone missing since freeze", async () => {
    await seed();
    await rm(join(dir, "source", "data.csv"));
    expect(buildData({ storyDir: dir, slotId: "1" })).rejects.toThrow(/data\.csv is missing/);
    expect(await readdir(dir)).not.toContain("beats");
  });
});

describe("output proof is current", () => {
  it("should regenerate byte-identically from the shipped fixture story", async () => {
    const story = await mkdtemp(join(tmpdir(), "analyst-proof-"));
    try {
      const fixture = join(SKILL, "assets", "sample-data", "story");
      await mkdir(join(story, "source"), { recursive: true });
      for (const name of ["article.md", "STORYBOARD.md"]) {
        await writeFile(join(story, name), await readFile(join(fixture, name)));
      }
      await writeFile(
        join(story, "source", "data.csv"),
        await readFile(join(SKILL, "assets", "sample-data", "rainfall.csv")),
      );
      await writeFile(
        join(story, "source", "profile.json"),
        await readFile(join(fixture, "profile.json")),
      );
      await buildData({ storyDir: story, slotId: "1" });
      for (const name of ["data.json", "DATA-NOTES.md"]) {
        const fresh = await readFile(join(story, "beats", "1", name), "utf8");
        const proof = await readFile(join(SKILL, "output-proof", name), "utf8");
        expect(fresh).toBe(proof);
      }
    } finally {
      await rm(story, { recursive: true, force: true });
    }
  });
});
