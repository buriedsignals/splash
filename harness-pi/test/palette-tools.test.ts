import { beforeEach, describe, expect, it } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Bases } from "../src/tools/fs.ts";
import {
  closeDerivedPalette,
  type GateState,
  paletteTools,
} from "../src/tools/palette.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const NEWSROOM = join(
  CHECKOUT,
  "skills/splash/assets/root-template/NEWSROOM.example.md",
);
const call = (tool: { execute: Function }, params: object) =>
  tool.execute("t1", params, undefined, undefined, undefined);

let bases: Bases;
let gate: GateState;

async function story(subject: string, withNewsroom = true) {
  const root = await mkdtemp(join(tmpdir(), "splash-palette-"));
  if (withNewsroom) copyFileSync(NEWSROOM, join(root, "NEWSROOM.md"));
  const storyDir = join(root, "stories", "demo");
  mkdirSync(storyDir, { recursive: true });
  writeFileSync(
    join(storyDir, "STORYBOARD.md"),
    `---\nsubject: "${subject}"\nslots: []\n---\n`,
  );
  return { root, storyDir };
}

beforeEach(() => {
  gate = { asked: false, answered: false };
});

describe("palette as Splash decides it", () => {
  it("should write PALETTE.md from the house colours when no convention competes", async () => {
    bases = await story("Lisboa, the network the article opens on");
    const r = closeDerivedPalette(bases);
    expect(r.written).toBe(true);
    expect(readFileSync(join(bases.storyDir, "PALETTE.md"), "utf8")).toContain(
      'accent: "#0B7A75"',
    );
  });

  it("should leave the question to the journalist when a subject convention competes", async () => {
    bases = await story("rainfall over Lake Geneva");
    const r = closeDerivedPalette(bases);
    expect(r.written).toBe(false);
    expect(existsSync(join(bases.storyDir, "PALETTE.md"))).toBe(false);
  });

  it("should refuse to record before a proposal was shown", async () => {
    bases = await story("rainfall over Lake Geneva");
    await expect(
      call(paletteTools(bases, gate).record, { option: 1 }),
    ).rejects.toThrow(/call propose_palette/);
  });

  it("should refuse to record while the journalist has not answered", async () => {
    bases = await story("rainfall over Lake Geneva");
    const tools = paletteTools(bases, gate);
    await call(tools.propose, {});
    await expect(call(tools.record, { option: 1 })).rejects.toThrow(
      /has not answered yet/,
    );
  });

  it("should record the option the journalist chose once they answered", async () => {
    bases = await story("rainfall over Lake Geneva");
    const tools = paletteTools(bases, gate);
    await call(tools.propose, {});
    gate.answered = true;
    await call(tools.record, { option: 1 });
    expect(readFileSync(join(bases.storyDir, "PALETTE.md"), "utf8")).toMatch(
      /^---\nground: "#[0-9A-Fa-f]{6}"/,
    );
  });

  it("should refuse an option the proposal does not have", async () => {
    bases = await story("rainfall over Lake Geneva");
    const tools = paletteTools(bases, gate);
    await call(tools.propose, {});
    gate.answered = true;
    await expect(call(tools.record, { option: 9 })).rejects.toThrow(
      /there is no option 9/,
    );
  });
});

describe("propose_palette when no question is due", () => {
  it("should record the house colours and say nobody is asked", async () => {
    bases = await story("Lisboa, the network the article opens on");
    const r = await call(paletteTools(bases, gate).propose, {});
    expect(r.content[0].text).toMatch(/^No question is due/);
    expect(readFileSync(join(bases.storyDir, "PALETTE.md"), "utf8")).toContain("origin: newsroom");
  });
});
