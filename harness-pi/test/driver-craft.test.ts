import { beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimBlock, contractText, craftKit, recordFallback } from "../src/craft-kit.ts";

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
