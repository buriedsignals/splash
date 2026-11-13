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

describe("scripted journalist, questions that name their options", () => {
  it("should answer the publication format when asked to pick among static, web, video and scrollytelling", async () => {
    reply = "medium";
    const j = scriptedJournalist({ medium: "A chart.", publication: "Static." }, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer("What formats would be reachable for a chart?\n\n**Static, interactive web, video or scrollytelling?**")).toBe("Static.");
  });

  it("should answer the size when asked to pick among landscape, square and portrait", async () => {
    reply = "other";
    const j = scriptedJournalist({ size: "Landscape." }, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer("Landscape, square or portrait?")).toBe("Landscape.");
  });
});

describe("scripted journalist, hand questions that name themselves", () => {
  // stress-ad (Qwen3.5-9B, 2026-11-13): the subject question, followed by a note naming the voivodeships compared,
  // was read as the comparison question, and the comparison answer was recorded as the subject.
  it("should answer the subject when the desk asks who the subject is, whatever follows", async () => {
    reply = "comparison";
    const j = scriptedJournalist({ subject: "Mazowieckie", comparison: "the other seven" }, { server: server.url.origin });
    j.phase = "storyboard";
    expect(
      await j.answer("**First question: In this data, who is the subject of your piece?**\n\nThe takeaway names Mazowieckie as having the most beds but third per resident, compared with Śląskie and Łódzkie."),
    ).toBe("Mazowieckie");
  });

  it("should answer the comparison when the desk asks what the reader compares it to", async () => {
    reply = "subject";
    const j = scriptedJournalist({ subject: "Mazowieckie", comparison: "the other seven" }, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer("**What does the reader compare it to — last year, the average, or these voivodeships?** The subject is Mazowieckie.")).toBe(
      "the other seven",
    );
  });
});

describe("scripted journalist, a credit the desk proposes", () => {
  // stress-v (Qwen3.5-9B, 2026-11-13): the desk proposed "unattributed", the classifier read a confirmation, and the
  // sheet's journalist said "Yes." to a credit that was not theirs.
  const said =
    "Looking at the article, there's no explicit source attribution line.\n\nI propose: **`unattributed`** — Source: not stated. Do you confirm?";

  it("should answer with the sheet's own credit when the desk proposes another one", async () => {
    reply = "confirm";
    const j = scriptedJournalist({ credit: "Global Carbon Budget 2025, as of 2025-11-13.", confirm: "Yes." }, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer(said)).toBe("No. Global Carbon Budget 2025, as of 2025-11-13.");
  });

  it("should confirm a credit proposal that is the sheet's own", async () => {
    reply = "confirm";
    const j = scriptedJournalist({ credit: "Unattributed, as of 2026-08-21.", confirm: "Yes." }, { server: server.url.origin });
    j.phase = "storyboard";
    expect(await j.answer(said)).toBe("Yes.");
  });
});

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
