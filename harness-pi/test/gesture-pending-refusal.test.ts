import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { craftReads } from "../src/craft-kit.ts";
import { gestureTools } from "../src/tools/gestures.ts";

// gx-beeswarm static, 12B, 2026-11-16: record_gestures refused "Kuwait" (the beat draws "Koweït"); the 12B then
// re-read data.json three times, each answered "edit beat.mjs", and the craft stopped on the same failure. The
// pending refusal is a record_gestures one: a reread is sent back to it.
function setup() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-pending-")));
  const storyDir = join(root, "stories", "s");
  const beatDir = join(storyDir, "beats", "1");
  mkdirSync(beatDir, { recursive: true });
  writeFileSync(join(storyDir, "STORYBOARD.md"), "---\nclaimShape: none\n---\n");
  writeFileSync(join(beatDir, "data.json"), JSON.stringify({ columns: [{ name: "Entity", type: "text" }, { name: "Share", type: "number" }], rows: [["Koweït", 60], ["Espagne", 50]] }));
  writeFileSync(join(beatDir, "beat.mjs"), "export default {};");
  const tools = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"], render: async () => "RENDER" });
  return { ...tools, reads: craftReads(beatDir, "1", tools.pending) };
}

describe("a reread after a record_gestures refusal", () => {
  it("should send the model back to record_gestures with that refusal", async () => {
    const t = setup();
    await expect((t.recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "Kuwait" }] })).rejects.toThrow();
    expect(await t.reads.noRereads()).toMatch(/record_gestures[\s\S]*"Kuwait" is not a name the beat draws[\s\S]*"Koweït"/);
  });
  it("should not point at beat.mjs while that refusal is pending", async () => {
    const t = setup();
    await expect((t.recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "Kuwait" }] })).rejects.toThrow();
    expect(await t.reads.noRereads()).not.toMatch(/edit beats\/1\/beat\.mjs/);
  });
  it("should forget the refusal once a list is recorded", async () => {
    const t = setup();
    await expect((t.recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "Kuwait" }] })).rejects.toThrow();
    await (t.recordGestures as any).execute("1", { gestures: [{ do: "highlight", mark: "Koweït" }] });
    expect(await t.reads.noRereads()).not.toMatch(/Kuwait/);
  });
});
