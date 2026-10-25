import { beforeEach, describe, expect, it } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Bases } from "../src/tools/fs.ts";
import { deliverTools } from "../src/tools/deliver.ts";
import type { Dialogue } from "../src/tools/storyboard.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const BEAT = "1-lisboa-share";
// Imported by path so this workspace's strict typecheck is not imposed on Splash's own fixture.
const FIXTURE: string = join(CHECKOUT, "skills/deliver/test/output-review-fixture.ts");
const { approveCurrentOutput } = await import(FIXTURE);
const call = (tool: { execute: Function }, params: object) =>
  tool.execute("t1", params, undefined, undefined, undefined);

let bases: Bases;
let dialogue: Dialogue;

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "splash-deliver-"));
  const storyDir = join(root, "stories", "demo");
  const beatDir = join(storyDir, "beats", BEAT);
  mkdirSync(join(beatDir, "renders"), { recursive: true });
  for (const f of ["creme.png", "creme.svg"]) {
    cpSync(
      join(CHECKOUT, "proof/static-bar-top-emitters-2024/renders", f),
      join(beatDir, "renders", f),
    );
  }
  writeFileSync(
    join(storyDir, "STORYBOARD.md"),
    `---\ncredit: "unattributed"\neffectiveDate: "2026-08-21"\nplacement: "After the opening paragraph."\nlimits: "One year only."\nlanguage: "en"\nslots:\n  - id: 1\n    medium: "chart"\n    format: "static"\n---\n`,
  );
  await approveCurrentOutput(beatDir);
  bases = { root, storyDir };
  dialogue = { lastJournalist: "", lastProposal: "" };
});

describe("delivery tools", () => {
  it("should list the forms of the beat's own format", async () => {
    const r = await call(deliverTools(bases, dialogue).offer, { beat: BEAT });
    expect(r.content[0].text).toMatch(/^- owned-file — /m);
  });

  it("should refuse to materialise a form the journalist did not name", async () => {
    dialogue.lastJournalist = "Let me think about it.";
    await expect(
      call(deliverTools(bases, dialogue).make, {
        beat: BEAT,
        form: "owned-file",
        alt: "Bars ranking ten countries.",
      }),
    ).rejects.toThrow(/journalist's own answer/);
    expect(existsSync(join(bases.storyDir, "export", BEAT))).toBe(false);
  });

  it("should materialise the form the journalist named, with a hand-over from the storyboard", async () => {
    dialogue.lastJournalist = "owned-file";
    await call(deliverTools(bases, dialogue).make, {
      beat: BEAT,
      form: "owned-file",
      alt: "Bars ranking ten countries.",
    });
    const handover = readFileSync(
      join(bases.storyDir, "export", BEAT, "HANDOVER.md"),
      "utf8",
    );
    expect(handover).toContain("After the opening paragraph.");
  });

  it("should refuse to record a decline the journalist never gave", async () => {
    dialogue.lastJournalist = "owned-file";
    await call(deliverTools(bases, dialogue).make, {
      beat: BEAT,
      form: "owned-file",
      alt: "Bars ranking ten countries.",
    });
    await expect(
      call(deliverTools(bases, dialogue).recordClosing, {
        beat: BEAT,
        offer: "format",
        answer: "declined",
      }),
    ).rejects.toThrow(/has not declined/);
  });

  it("should record a decline the journalist gave", async () => {
    dialogue.lastJournalist = "owned-file";
    await call(deliverTools(bases, dialogue).make, {
      beat: BEAT,
      form: "owned-file",
      alt: "Bars ranking ten countries.",
    });
    dialogue.lastJournalist = "No, thank you.";
    await call(deliverTools(bases, dialogue).recordClosing, {
      beat: BEAT,
      offer: "format",
      answer: "declined",
    });
    expect(
      readFileSync(
        join(bases.storyDir, "export", BEAT, ".another-format"),
        "utf8",
      ),
    ).toBe("declined\n");
  });
});
