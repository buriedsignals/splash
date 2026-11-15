import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gestureTools } from "../src/tools/gestures.ts";

// T1 (2026-11-15): the residual repeat is an identical record_gestures right after a render, which re-rendered a
// still that nothing had changed. The harness answers it from the last render instead, and says so.
function setup() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-repeat-")));
  const storyDir = join(root, "stories", "s");
  const beatDir = join(storyDir, "beats", "1");
  mkdirSync(beatDir, { recursive: true });
  writeFileSync(join(storyDir, "STORYBOARD.md"), "---\nclaimShape: none\n---\n");
  writeFileSync(join(beatDir, "data.json"), JSON.stringify({ columns: [{ name: "Entity", type: "text" }, { name: "Share", type: "number" }], rows: [["France", 60], ["Spain", 50]] }));
  let renders = 0;
  const tools = gestureTools({ root, storyDir }, { beat: "1", gestures: ["highlight"], render: async () => `RENDER ${++renders}` });
  return { ...tools, beatDir, renders: () => renders };
}
const list = [{ do: "highlight", mark: "France" }];

describe("an identical record_gestures", () => {
  it("should not render again when nothing changed since the last call", async () => {
    const t = setup();
    await (t.recordGestures as any).execute("1", { gestures: list });
    await (t.recordGestures as any).execute("1", { gestures: list });
    expect(t.renders()).toBe(1);
  });
  it("should hand back the last render and say nothing changed", async () => {
    const t = setup();
    await (t.recordGestures as any).execute("1", { gestures: list });
    const out = await (t.recordGestures as any).execute("1", { gestures: list });
    expect(out.content[0].text).toMatch(/identical to your previous call[\s\S]*RENDER 1/);
  });
  it("should render again once beat.mjs was written since", async () => {
    const t = setup();
    await (t.recordGestures as any).execute("1", { gestures: list });
    writeFileSync(join(t.beatDir, "beat.mjs"), `export default { rows: [{ name: "France", value: 60 }] };`);
    t.refresh();
    await (t.recordGestures as any).execute("1", { gestures: list });
    expect(t.renders()).toBe(2);
  });
});
