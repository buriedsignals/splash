import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importBeat } from "../craft/_shared/guards.mjs";
import { dataNames, gestureTools } from "../src/tools/gestures.ts";

const table = {
  columns: [{ name: "Entity", type: "text" }, { name: "Year", type: "number" }, { name: "Share", type: "number" }],
  rows: [["France", 2023, 60], ["France", 2024, 65], ["Poland", 2023, 20], ["Poland", 2024, 25], ["Spain", 2024, 50]],
};

function story(front: string) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-record-")));
  const storyDir = join(root, "stories", "s");
  const beatDir = join(storyDir, "beats", "1");
  mkdirSync(beatDir, { recursive: true });
  writeFileSync(join(storyDir, "STORYBOARD.md"), `---\n${front}\n---\n`);
  writeFileSync(join(beatDir, "data.json"), JSON.stringify(table));
  return { root, storyDir, beatDir };
}

describe("importBeat", () => {
  it("should replace the model's check() with code's and take the recorded gestures", async () => {
    const { beatDir } = story("claimShape: none");
    writeFileSync(join(beatDir, "beat.mjs"), `import { readFileSync } from "node:fs"; JSON.parse(readFileSync(new URL("./data.json", import.meta.url)));\nexport default { title: "t", check: () => { throw new Error("inverted"); }, gestures: [{ do: "name", mark: "x" }] };`);
    writeFileSync(join(beatDir, "gestures.json"), JSON.stringify({ gestures: [{ do: "highlight", mark: "France" }] }));
    const beat = await importBeat(beatDir);
    expect(() => beat.check()).not.toThrow();
    expect(beat.gestures).toEqual([{ do: "highlight", mark: "France" }]);
  });
});

describe("record_gestures", () => {
  it("should offer data.json's names, its times and time · entity pairs", () => {
    expect(dataNames(table)).toEqual(expect.arrayContaining(["France", "2024", "2024 · Poland"]));
  });

  it("should refuse an invented name with the closest drawn ones, writing nothing", async () => {
    const { root, storyDir, beatDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight", "compare"] });
    await expect((recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "Polska" }] })).rejects.toThrow(/"Polska" is not a name the beat draws — the closest are "Poland"/);
    expect(() => readFileSync(join(beatDir, "gestures.json"))).toThrow();
  });

  it("should write the gestures a valid list declares", async () => {
    const { root, storyDir, beatDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight", "compare"] });
    await (recordGestures as any).execute("1", { gestures: [{ do: "compare", marks: ["France", "Poland"], note: "65 vs 25" }] });
    expect(JSON.parse(readFileSync(join(beatDir, "gestures.json"), "utf8")).gestures[0].marks).toEqual(["France", "Poland"]);
  });

  it("should refuse a gesture the kit does not draw", async () => {
    const { root, storyDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"] });
    await expect((recordGestures as any).execute("1", { gestures: [{ do: "zoom", mark: "France" }] })).rejects.toThrow(/not a gesture this kit draws — one of highlight/);
  });

  it("should follow the names beat.mjs draws once it is written", async () => {
    const { root, storyDir, beatDir } = story("claimShape: none");
    const { recordGestures, refresh } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"] });
    writeFileSync(join(beatDir, "beat.mjs"), `export default { rows: [{ name: "Pologne", value: 25 }, { name: "France", value: 65 }] };`);
    refresh();
    await expect((recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "Pologne" }] })).resolves.toBeDefined();
  });
});
