import { describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { checkEditorProposals } from "../src/editor-check.ts";

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

  it("should carry Splash's grounding verdict for the takeaway", () => {
    const [p] = checkEditorProposals(reply("Lisboa carries 214 of the 394 million trips.", []), STORY)!;
    expect(p.grounding).toBe("supported");
  });

  it("should return null for a reply with no proposals", () => {
    expect(checkEditorProposals("I could not read the sources.", STORY)).toBeNull();
  });
});
