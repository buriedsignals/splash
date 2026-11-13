import { afterAll, describe, expect, it } from "bun:test";
import { scriptedJournalist } from "../src/journalist.ts";

// A local classifier that answers the way the 12B did live (gx-connected-scatter, 2026-11-11): the candidate
// menu's last line read as the takeaway question, the survey's offer read as the subject question.
let reply = "takeaway";
const server = Bun.serve({
  port: 0,
  fetch: () => Response.json({ choices: [{ message: { content: reply } }] }),
});
afterAll(() => server.stop(true));

const sheet = {
  takeaway: "All 16 countries cleaned up their own electricity between 2000 and 2024",
  subject: "France.",
  treatment: "Connected scatter.",
  closing: "No, thank you.",
};
const menu =
  "Here are the candidate treatments for your chart:\n\n- **Connected scatter** (static) — the path two measures trace, which a reader should keep in mind.\n  *Why here: it shows the path.*\n\n- **Dumbbell (range plot)** (static) — the gap between two values.\n  *Why here: the gap.*\n\n**Which one do you keep?**";
const survey =
  "The survey found several other interesting angles in your data. Which of these would you like to include as additional subjects?\n\n- **low-carbon-transition-speed**: How fast countries move.\n- **renewable-vs-nuclear-mix**: The relative shares.";

describe("scripted journalist, a classifier that never answers", () => {
  it("should answer the sheet's fallback instead of waiting forever", async () => {
    const mute = Bun.serve({ port: 0, fetch: () => new Promise<Response>(() => {}) });
    try {
      const j = scriptedJournalist({ other: "I don't know." }, { server: mute.url.origin, timeoutMs: 200 });
      j.phase = "storyboard";
      expect(await j.answer("Which colours?")).toBe("I don't know.");
    } finally {
      mute.stop(true);
    }
  });
});

describe("scripted journalist, answers the classifier cannot override", () => {
  it("should name the sheet's treatment when the desk shows a candidate menu and asks which one", async () => {
    reply = "takeaway";
    const j = scriptedJournalist(sheet, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer(menu)).toBe(sheet.treatment);
  });

  it("should decline the survey's additional subjects instead of naming the story's subject", async () => {
    reply = "subject";
    const j = scriptedJournalist(sheet, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer(survey)).toBe(sheet.closing);
  });

  // stress-v (2026-11-12): the desk asked to confirm its survey subject and mentioned "your primary takeaway";
  // the journalist answered with the takeaway rebuttal, and the survey never closed.
  it("should confirm a survey subject instead of restating the takeaway", async () => {
    reply = "confirm";
    const j = scriptedJournalist({ ...sheet, confirm: "Yes." }, { server: server.url.origin });
    j.phase = "storyboard";
    const ask =
      "The survey requires a secondary angle. Since your primary takeaway is about China, I propose:\n\n**Subject:** High-income vs. low-income emissions\n\nDoes this work as the survey subject?";
    expect(await j.answer(ask)).toBe("Yes.");
  });
});
