import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimCheck } from "../craft/_shared/guards.mjs";

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

describe("claimCheck", () => {
  it("should pass a recorded maximum the data holds at the latest year", () => {
    const { beatDir } = story("claimShape: maximum\nclaimColumn: Share\nclaimEntity: France");
    expect(() => claimCheck(beatDir)()).not.toThrow();
  });

  it("should refuse a recorded maximum the data no longer holds", () => {
    const { beatDir } = story("claimShape: maximum\nclaimColumn: Share\nclaimEntity: Spain");
    expect(() => claimCheck(beatDir)()).toThrow(/no longer makes Spain the highest Share in 2024 \(50 against 65\)/);
  });

  it("should refuse a comparison whose direction the data reverses", () => {
    const { beatDir } = story("claimShape: comparison\nclaimColumn: Share\nclaimEntity: Poland\nclaimVersus: France\nclaimDirection: greater");
    expect(() => claimCheck(beatDir)()).toThrow(/no longer puts Poland above France/);
  });

  it("should decide nothing for a claim recorded as none", () => {
    const { beatDir } = story("claimShape: none");
    expect(() => claimCheck(beatDir)()).not.toThrow();
  });
});

