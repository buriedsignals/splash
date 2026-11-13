import { beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimBlock, contractText, craftKit, recordFallback, unwrittenBeat, craftBriefing, craftReads } from "../src/craft-kit.ts";

let craft: string;
let beatDir: string;

beforeEach(() => {
  craft = mkdtempSync(join(tmpdir(), "splash-craft-"));
  for (const k of ["bar-and-column", "bar-and-column.gestures"]) {
    mkdirSync(join(craft, "video", k), { recursive: true });
    writeFileSync(join(craft, "video", k, "render-beat.mjs"), "");
  }
  beatDir = mkdtempSync(join(tmpdir(), "splash-beat-"));
});

describe("craft kit choice", () => {
  it("should offer the gesture kit first", () => {
    expect(craftKit(beatDir, "Bar and column", "video", { craft }).kit).toBe(
      join(craft, "video", "bar-and-column.gestures"),
    );
  });

  it("should record a fallback, remove the gesture beat.mjs, and name both kits", () => {
    writeFileSync(
      join(beatDir, "beat.mjs"),
      "export default { gestures: [] };",
    );
    const gestureKit = join(craft, "video", "bar-and-column.gestures");
    const next = recordFallback(beatDir, "Bar and column", "video", {
      craft,
      from: gestureKit,
      refusal: "gestures: a video takes exactly three gestures",
    });
    expect(existsSync(join(beatDir, "beat.mjs"))).toBe(false);
    expect(next).toBe(join(craft, "video", "bar-and-column"));
    const marker = JSON.parse(
      readFileSync(join(beatDir, ".harness", "fallback.json"), "utf8"),
    );
    expect(marker.from).toBe(gestureKit);
    expect(marker.refusal).toMatch(/three gestures/);
  });

  it("should use the per-type kit on re-entry once the fallback marker is written", () => {
    recordFallback(beatDir, "Bar and column", "video", {
      craft,
      from: join(craft, "video", "bar-and-column.gestures"),
      refusal: "x",
    });
    expect(craftKit(beatDir, "Bar and column", "video", { craft }).kit).toBe(
      join(craft, "video", "bar-and-column"),
    );
  });

  it("should not fall back when fallback is disabled for a measurement run", () => {
    const choice = craftKit(beatDir, "Bar and column", "video", {
      craft,
      fallback: false,
    });
    expect(choice.fallbackAllowed).toBe(false);
  });
});

describe("claim block", () => {
  it("should carry China's subject and comparison when no claim fields are recorded", () => {
    const block = claimBlock({
      claimShape: "none",
      subject: "The subject is China, the country the article opens on.",
      comparison:
        "The next five emitters together: the United States, India, Russia, Japan and Indonesia.",
    });
    expect(block).toMatch(/China/);
    expect(block).toMatch(/United States, India, Russia, Japan and Indonesia/);
  });

  it("should carry the recorded claim entity and comparison first when they exist", () => {
    expect(
      claimBlock({
        claimEntity: "Sul",
        claimVersus: "Centro",
        subject: "the rate",
      }),
    ).toMatch(/Sul.*Centro/);
  });

  it("should name the recorded ratio as the measure to draw", () => {
    expect(claimBlock({ claimRatio: "beds / people" })).toMatch(/beds divided by people/);
  });
});

describe("gesture contract", () => {
  it("should fill the admissible gestures into a kit contract's placeholder", async () => {
    const kit = join(craft, "video", "bar-and-column.gestures");
    writeFileSync(join(kit, "CONTRACT.md"), "| do | meaning |\n|---|---|\n{{GESTURES}}\n");
    const text = await contractText(kit, "video");
    expect(text).not.toMatch(/\{\{GESTURES\}\}/);
    expect(text).toMatch(/\| `bracket` \|/);
  });
});

// gx-proportional-symbol static (Qwen3.5-9B, 2026-11-13): "`beat.example.mjs` (in the folder)" was read as the proof/
// folder; sixteen turns of reads there, and the beat was never written.
describe("contract text", () => {
  const real = join(import.meta.dirname, "..", "craft", "static", "proportional-symbol-symbol-bubble-map.gestures");
  it("should name the worked example by its path in the beat's folder", async () => {
    expect(await contractText(real, "static", { beat: "1" })).toContain("`beats/1/beat.example.mjs`");
  });

  // gx-proportional-symbol web (q4): the per-type kit's CONTRACT.md named proof/web-proportional-symbol-europe-capacity,
  // and thirteen of sixteen calls tried to read it before beat.mjs was written.
  it("should name no proof/ folder the story does not hold", async () => {
    const web = join(import.meta.dirname, "..", "craft", "web", "proportional-symbol-symbol-bubble-map");
    expect(await contractText(web, "web", { beat: "1" })).not.toMatch(/proof\//);
  });

  it("should leave no folder unnamed", async () => {
    expect(await contractText(real, "static", { beat: "1" })).not.toMatch(/in the folder/);
  });
});

describe("an unwritten beat", () => {
  it("should name the worked example in the beat's folder as the next read", () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    writeFileSync(join(dir, "beat.example.mjs"), "");
    writeFileSync(join(dir, "data.json"), "{}");
    expect(unwrittenBeat(dir, "1")).toMatch(/holds: beat\.example\.mjs, data\.json\. Next: read beats\/1\/beat\.example\.mjs .*write beats\/1\/beat\.mjs with write_file/);
  });
});

describe("the craft briefing", () => {
  it("should carry the worked example and ask for the write first", () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    writeFileSync(join(dir, "beat.example.mjs"), "export default { title: \"x\" };\n");
    expect(craftBriefing(dir, "1")).toMatch(/```js\nexport default \{ title: "x" \};\n```\nYour first call is write_file of beats\/1\/beat\.mjs/);
  });
});

// gx-proportional-symbol video (Qwen3.5-9B, 2026-11-13): the example was in the first message, yet it read it again and
// spent three attempts listing proof/ paths the example's header comment named; beat.mjs was never written.
describe("the craft reads", () => {
  it("should name no proof/ path in the briefing", () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    writeFileSync(join(dir, "beat.example.mjs"), "// beat.mjs for the worked example proof/static-x-y — z\nexport default {};\n");
    expect(craftBriefing(dir, "1")).not.toMatch(/proof\//);
  });

  it("should answer a read under proof/ with the write it is waiting for", () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    const reply = craftReads(dir, "1").answered.find((a) => a.match.test("stories/s/proof/static-x/beat.mjs"))?.reply;
    expect(reply).toMatch(/write_file of beats\/1\/beat\.mjs/);
  });

  it("should answer a read of the worked example it was already given", () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    expect(craftReads(dir, "1").answered.some((a) => a.match.test("beats/1/beat.example.mjs"))).toBe(true);
  });

  it("should send an unchanged reread to the edit and the render once beat.mjs exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {};");
    expect(await craftReads(dir, "1").noRereads()).toMatch(/render_beat/);
  });

  // gx-proportional-symbol static (Qwen3.5-9B, 2026-11-13): the beat rendered and was looked at, then twelve turns of
  // reads, each answered "edit where the last refusal points", until the craft stopped on no new record.
  it("should send a reread to DONE once the beat's render is newer than beat.mjs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "beat-"));
    writeFileSync(join(dir, "beat.mjs"), "export default {};");
    mkdirSync(join(dir, "renders"));
    writeFileSync(join(dir, "renders", "x.png"), "");
    utimesSync(join(dir, "beat.mjs"), new Date(Date.now() - 60_000), new Date(Date.now() - 60_000));
    expect(await craftReads(dir, "1").noRereads()).toMatch(/renders .*reply DONE/);
  });
});
