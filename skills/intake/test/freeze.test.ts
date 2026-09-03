// twin/skills/intake/test/freeze.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeSource } from "../scripts/freeze.mjs";
import { driftedSources, sourceFor } from "../scripts/manifest.mjs";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  await mkdir(join(dir, "source"), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("freezeSource", () => {
  it("should copy the article and the data into source/ and write a profile", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    const articleText = "# Rainfall\n";
    const dataText = "year,rainfall\n2015,912\n2025,604\n";
    await writeFile(articlePath, articleText);
    await writeFile(dataPath, dataText);

    const result = await freezeSource({ storyDir: dir, articlePath, dataPath });

    // The frozen files on disk are the real, byte-for-byte source — not just
    // something that happens to exist at those paths.
    expect(await readFile(join(dir, "source", "article.md"), "utf8")).toBe(
      articleText,
    );
    expect(await readFile(join(dir, "source", "data.csv"), "utf8")).toBe(
      dataText,
    );

    // The returned {article, data, profile} is the same record that was frozen,
    // not a coincidentally-shaped stand-in.
    expect(result.article).toBe(articleText);
    expect(result.data).toBe(dataText);
    expect(result.profile.rowCount).toBe(2);

    // profile.json on disk is the genuine computed profile, not an empty
    // placeholder or a stale/partial write.
    const written = JSON.parse(
      await readFile(join(dir, "source", "profile.json"), "utf8"),
    );
    expect(written).toEqual(result.profile);
    expect(written.columns).toHaveLength(2);
  });

  it("should hand the article's own prose to the profiler, so a stated incompleteness survives the freeze", async () => {
    // The wildfire dataset states its own incompleteness in a description line the article quotes,
    // and intake freezes that line as PROSE. If the freeze does not hand it to the profiler, the
    // claim exists nowhere a later phase can read it — which is how eight months of 2026 read as a
    // full year beside fourteen complete ones.
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "fires.csv");
    await writeFile(articlePath, "# Fires\n\nThe 2026 data is incomplete.\n");
    await writeFile(dataPath, "year,fires\n2024,912\n2025,604\n2026,300\n");

    const { profile } = await freezeSource({
      storyDir: dir,
      articlePath,
      dataPath,
    });

    expect(profile.statedIncompleteness.readProse).toBe(true);
    expect(profile.statedIncompleteness.claims).toEqual([
      {
        period: 2026,
        column: "year",
        word: "incomplete",
        sentence: "The 2026 data is incomplete.",
      },
    ]);
  });

  // ISSUE #37 INVERTED THIS. Refusing a second freeze never prevented a journalist editing their
  // data — it meant the story was abandoned and recreated, and the record of what changed was lost
  // rather than preserved. What is refused now is SILENT change: `driftedSources` names the source
  // that moved, so the beats that read it reopen and the rest of the story does not.
  it("should let a corrected source be re-frozen, and name what moved", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    await writeFile(articlePath, "# Rainfall\n");
    await writeFile(dataPath, "year,rainfall\n2015,912\n");
    const first = await freezeSource({ storyDir: dir, articlePath, dataPath });
    expect(await driftedSources(dir, first.manifest)).toEqual([]);

    // The typo in row 40, corrected.
    await writeFile(dataPath, "year,rainfall\n2015,913\n");
    const second = await freezeSource({ storyDir: dir, articlePath, dataPath });
    expect(await driftedSources(dir, second.manifest)).toEqual([]);
    // A different digest, so anything citing the old one reopens rather than silently disagreeing.
    const before = first.manifest.sources.find((s: any) => s.kind === "table").digest;
    const after = second.manifest.sources.find((s: any) => s.kind === "table").digest;
    expect(after).not.toBe(before);
  });

  it("should notice a source edited underneath the manifest", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    await writeFile(articlePath, "# Rainfall\n");
    await writeFile(dataPath, "year,rainfall\n2015,912\n");
    const { manifest } = await freezeSource({ storyDir: dir, articlePath, dataPath });
    await writeFile(join(dir, "source", "data.csv"), "year,rainfall\n2015,999\n");
    const drifted = await driftedSources(dir, manifest);
    expect(drifted.map((s: any) => [s.id, s.reason])).toEqual([["rainfall", "changed"]]);
  });

  // The shape the one-file freeze could not hold: one story, several datasets, photographs and a
  // geolocated places file. It forced a real investigation to concatenate 20 sections into one
  // file, discard eight of nine datasets, and create a SECOND STORY to reach its photographs.
  it("should hold n sources, each by digest, and let a slot name the one it draws on", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "inequality.csv");
    const rents = join(dir, "rents.csv");
    const places = join(dir, "places.csv");
    await writeFile(articlePath, "# Annemasse\n");
    await writeFile(dataPath, "commune,ratio\nAnnemasse,5.6\n");
    await writeFile(rents, "commune,eur\nAnnemasse,890\n");
    await writeFile(places, "name,lat,lon\nquay,46.1,6.2\n");

    const { manifest } = await freezeSource({
      storyDir: dir,
      articlePath,
      dataPath,
      extraSources: [{ path: rents, kind: "table" }, { path: places, kind: "geo" }],
    });
    expect(manifest.sources.map((s: any) => `${s.id}:${s.kind}`)).toEqual([
      "article:prose",
      "inequality:table",
      "places:geo",
      "rents:table",
    ]);
    // Two tables, so a slot must say which — picking one for it is how a beat comes to cite a
    // table it was not built from.
    expect(() => sourceFor(manifest, { id: 1 })).toThrow(/has to name which one/);
    expect(sourceFor(manifest, { id: 1, source: "rents" }).path).toBe("source/rents.csv");
    expect(() => sourceFor(manifest, { id: 1, source: "missing" })).toThrow(/does not hold/);
    // Every extra table is profiled too, not only the primary one.
    expect(manifest.sources.find((s: any) => s.id === "rents").profile).toBe("source/rents.profile.json");
  });
});
