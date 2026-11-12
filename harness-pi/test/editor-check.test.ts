import { describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { checkEditorProposals, editorBrief } from "../src/editor-check.ts";

const STORY = join(resolve(import.meta.dirname, "../.."), "stories/stress-p-transport-ridership");
const reply = (takeaway: string, evidence: string[]) =>
  "```json\n" + JSON.stringify({ status: "ready", proposals: [{ takeaway, evidence, limits: [] }] }) + "\n```";

describe("editor proposals checked by code", () => {
  it("should flag a number the sources do not hold", () => {
    const [p] = checkEditorProposals(reply("Aveiro is the smallest network.", ["data.csv: Aveiro 14.7 million trips"]), STORY)!;
    expect(p.unsourcedNumbers).toEqual(["14.7"]);
  });

  it("should flag nothing when every number is in the sources", () => {
    const [p] = checkEditorProposals(reply("Lisboa carries 214 of the 394 million trips.", ["data.csv: Lisboa 214"]), STORY)!;
    expect(p.unsourcedNumbers).toEqual([]);
  });

  it("should read each CSV cell as its own number", () => {
    const [p] = checkEditorProposals(reply("Faro has a 9 km network.", ["data.csv: Faro 11 million trips, 9 km, 2025"]), STORY)!;
    expect(p.unsourcedNumbers).toEqual([]);
  });

  it("should read a number written with thousands separators", () => {
    const [p] = checkEditorProposals(reply("Lisboa has 545,000 residents.", []), STORY)!;
    expect(p.unsourcedNumbers).toEqual([]);
  });

  it("should carry Splash's grounding verdict for the takeaway", () => {
    const [p] = checkEditorProposals(reply("Lisboa carries 214 of the 394 million trips.", []), STORY)!;
    expect(p.grounding).toBe("supported");
  });

  it("should return null for a reply with no proposals", () => {
    expect(checkEditorProposals("I could not read the sources.", STORY)).toBeNull();
  });
});

// stress-v (Qwen3.5-9B, 2026-11-12): given read_file, the editor read a finished proof of the same story under proof/ and
// returned an empty reply. Code hands it the frozen sources; it has nothing else to read.
describe("the editor's brief", () => {
  it("should carry the frozen article and data in the message itself", () => {
    const brief = editorBrief(STORY);
    expect(brief).toContain("Lisboa");
    expect(brief).toMatch(/source\/article\.md[\s\S]*source\/data\.csv[\s\S]*source\/profile\.json/);
  });
});
