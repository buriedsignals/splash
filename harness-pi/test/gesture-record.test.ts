import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importBeat } from "../craft/_shared/guards.mjs";
import { dataNames, gestureTools, listNames } from "../src/tools/gestures.ts";

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

  it("should drop a gesture refused twice for a name the beat does not draw, recording the rest", async () => {
    const { root, storyDir, beatDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight", "compare"] });
    const list = [{ do: "highlight", mark: "France" }, { do: "compare", marks: ["Polska", "France"] }];
    await expect((recordGestures as any).execute("1", { gestures: list })).rejects.toThrow(/A second unknown name drops this gesture/);
    await (recordGestures as any).execute("1", { gestures: list });
    expect(JSON.parse(readFileSync(join(beatDir, "gestures.json"), "utf8")).gestures).toEqual([{ do: "highlight", mark: "France" }]);
  });

  it("should list the names a write's result offers, counting the rest", () => {
    expect(listNames(Array.from({ length: 82 }, (_, i) => `n${i}`))).toEndWith("… and 2 more");
  });

  it("should take one gesture on a set of rows given as a mark list", async () => {
    const { root, storyDir, beatDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"] });
    await (recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: ["France", "Spain"], note: "2 pays" }] });
    expect(JSON.parse(readFileSync(join(beatDir, "gestures.json"), "utf8")).gestures[0].mark).toEqual(["France", "Spain"]);
  });

  it("should refuse the same list twice in a row when it does not render itself", async () => {
    const { root, storyDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"] });
    const list = [{ do: "highlight", mark: "France" }];
    await (recordGestures as any).execute("1", { gestures: list });
    await expect((recordGestures as any).execute("1", { gestures: list })).rejects.toThrow(/already recorded: render it/);
  });

  it("should render on record and return the render's words", async () => {
    const { root, storyDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"], render: async () => "REFUSED — gestures[0].note: …" });
    const out = await (recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "France" }] });
    expect(out.content[0].text).toContain("rendered:\nREFUSED — gestures[0].note");
  });

  it("should know a composed name when each of its parts is drawn (a row at one of its series)", async () => {
    const { root, storyDir, beatDir } = story("claimShape: none");
    const { recordGestures, refresh } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["compare"] });
    writeFileSync(join(beatDir, "beat.mjs"), `export default { series: ["2015", "2024"], rows: [{ name: "Pologne", values: [20, 37] }, { name: "France", values: [90, 95] }] };`);
    refresh();
    await expect((recordGestures as any).execute("1", { gestures: [{ do: "compare", marks: ["Pologne · 2024", "France · 2024"] }] })).resolves.toBeDefined();
  });

  it("should refuse a video list that is not three gestures, before any render", async () => {
    const { root, storyDir } = story("claimShape: none");
    const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight", "reveal"], format: "video" });
    await expect((recordGestures as any).execute("1", { gestures: [{ do: "reveal" }, { do: "highlight", mark: "France" }] })).rejects.toThrow(/exactly three gestures/);
  });
});

describe("importBeat on a beat.mjs that exports nothing", () => {
  it("should say to end it with export default, not crash", async () => {
    const { beatDir } = story("claimShape: none");
    writeFileSync(join(beatDir, "beat.mjs"), `import { readFileSync } from "node:fs"; JSON.parse(readFileSync(new URL("./data.json", import.meta.url)));`);
    writeFileSync(join(beatDir, "gestures.json"), JSON.stringify({ gestures: [] }));
    await expect(importBeat(beatDir)).rejects.toThrow(/exports no object/);
  });
});


describe("the contract a craft session reads", () => {
  it("should ask a still to record its gestures through record_gestures", async () => {
    const { contractText } = await import("../src/craft-kit.ts");
    expect(await contractText(join(import.meta.dirname, "..", "craft", "static", "sankey.gestures"), "static")).toContain("record_gestures");
  });

  it("should keep a page's gestures in beat.mjs, the check still code's", async () => {
    const { contractText } = await import("../src/craft-kit.ts");
    const text = await contractText(join(import.meta.dirname, "..", "craft", "web", "sankey.gestures"), "web");
    expect([text.includes("record_gestures"), text.includes("Do not write `check()`")]).toEqual([false, true]);
  });
});

// Replay scan 2026-11-07: 17 record_gestures calls refused by the schema since 2026-10-28, each naming a
// mark as the row it meant ({ name: "Brunei" }, { key: "RUS" }, { series, t, value }). Pi prepares the
// arguments before it validates them, so the row is read back to its name there.
describe("record_gestures arguments", () => {
  const { root, storyDir } = story("claimShape: none");
  const { recordGestures } = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight", "reveal", "bracket"] });

  it("should name a mark given as a row object by its name", () => {
    const args = recordGestures.prepareArguments!({ gestures: [{ do: "reveal", mark: [{ name: "Brunei" }, { key: "RUS" }] }] });
    expect(args.gestures[0].mark).toEqual(["Brunei", "RUS"]);
  });

  it("should name a series point by its time and series", () => {
    const args = recordGestures.prepareArguments!({ gestures: [{ do: "bracket", mark: { series: "Switzerland", t: 1858, value: 146560 } }] });
    expect(args.gestures[0].mark).toBe("1858 · Switzerland");
  });

  it("should leave string marks as they are", () => {
    const given = { gestures: [{ do: "highlight", mark: "France", marks: ["France", "Poland"] }] };
    expect(recordGestures.prepareArguments!(given)).toEqual(given);
  });
});

// Replay scan 2026-11-07: "Export named 'data' not found" (2 of 11 recovered) and "readFileSync is not defined"
// (2 of 5): the hint showed readFileSync(...) without its import lines, and never said data.json has no named export.
describe("a beat that throws while loading", () => {
  it("should be told the import lines its reading code needs", async () => {
    const { beatDir } = story("claimShape: none");
    writeFileSync(join(beatDir, "beat.mjs"), `import { data } from "./data.json";\nexport default { title: "t", rows: data };`);
    await expect(importBeat(beatDir)).rejects.toThrow(/import \{ readFileSync \} from "node:fs"; import \{ join \} from "node:path";/);
  });

  it("should be told data.json has no named export when it imports one", async () => {
    const { beatDir } = story("claimShape: none");
    writeFileSync(join(beatDir, "beat.mjs"), `import { data } from "./data.json";\nexport default { title: "t", rows: data };`);
    await expect(importBeat(beatDir)).rejects.toThrow(/data\.json is not a module to import from/);
  });
});
