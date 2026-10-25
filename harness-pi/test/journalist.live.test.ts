import { describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { scriptedJournalist } from "../src/journalist.ts";

const SHEET = join(resolve(import.meta.dirname, ".."), "eval/sheets/stress-p-transport-ridership.json");
const up = await fetch("http://127.0.0.1:8090/health").then((r) => r.ok).catch(() => false);

describe.skipIf(!up)("scripted journalist on the local server", () => {
  it("should answer a request to confirm someone else's takeaway with its own sentence", async () => {
    const sheet = await Bun.file(SHEET).json();
    const j = scriptedJournalist(sheet);
    const answer = await j.answer(
      "The primary takeaway for the visual will be:\n\n**Lisbon carries over five times the trips of Porto.**\n\nIs this the verbatim sentence you want to anchor the visual?",
    );
    expect(answer).toContain(sheet.takeaway);
  }, 60_000);

  it("should answer the closing offer of another format with the sheet's closing answer", async () => {
    const sheet = await Bun.file(SHEET).json();
    const answer = await scriptedJournalist(sheet).answer(
      "You have this beat (1) in the publication format you chose. You can record a request for the same finding in another format. **Other publication formats:** web, video. Would you like one?",
    );
    expect(answer).toBe(sheet.closing);
  }, 60_000);
});
