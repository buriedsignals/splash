// Durable record of the fresh Codex-host acceptance run on 2026-08-14. The conformance test drives
// both filesystem states from this record and pins the complete assistant turn, not only the prompt
// helper's fragments.
export const HOST_ACCEPTANCE = Object.freeze({
  host: "Codex",
  recordedAt: "2026-08-14",
  sourceFiles: {
    "source/article.md": "Heat-pump article",
    "source/data.csv":
      "country,adoption_2021,adoption_2025\nFrance,38.2,71.4\nGermany,41.0,74.9\n",
    "source/profile.json": "{}",
    "source/context.md": "Prefer a full-width web treatment with a static fallback.",
  },
  storyboardBefore: `---
takeaway: "Every sampled country increased adoption while the 2025 gap remained wide."
subject: "Ten European countries"
comparison: "2021 against 2025"
limits: "A fictional ten-country sample, not a European census."
placement: "after the third paragraph"
credit: "Source: Splash Test Desk synthetic dataset"
effectiveDate: "2026-07-15"
grounding: supported
language: en
slots:
  - id: 1
    proves: "Every sampled country increased adoption while the 2025 gap remained wide."
    medium: chart
---

The confirmed framing, before the publication-format decision.
`,
  assistantTurn: `Which publication format should Splash make first?

Recommended: **Interactive web**, because the article calls for a full-width web treatment and exact country values can remain available on interaction.

- **Static / print:** one fixed graphic, suitable for print and non-interactive placement.
- **Interactive web:** a responsive page with exact values available on hover, tap, and keyboard focus.
- **Video:** a timed build for broadcast or social video.
- **Scrollytelling:** a fixed visual whose state changes with the article's scroll sequence.

Which should I produce first?`,
  journalistReply: "Interactive web.",
  storyboardAfter: `---
takeaway: "Every sampled country increased adoption while the 2025 gap remained wide."
subject: "Ten European countries"
comparison: "2021 against 2025"
limits: "A fictional ten-country sample, not a European census."
placement: "after the third paragraph"
credit: "Source: Splash Test Desk synthetic dataset"
effectiveDate: "2026-07-15"
grounding: supported
language: en
slots:
  - id: 1
    proves: "Every sampled country increased adoption while the 2025 gap remained wide."
    medium: chart
    format: web
    reachable: yes
---

The confirmed framing, before the publication-format decision.
`,
  storyboardDiff: `     proves: "Every sampled country increased adoption while the 2025 gap remained wide."
     medium: chart
+    format: web
+    reachable: yes
 ---`,
  // THE TWO `where` STATES ARE RECOMPUTED, NOT TRANSCRIBED. Everything else in this fixture is a
  // record of one real host turn on 2026-08-14 — the assistant's words, the storyboard bytes before
  // and after, the insertion diff — and none of it may be edited. These two are what `whereIs`
  // ANSWERS about that storyboard, so they move when the gate sequence legitimately moves, and
  // pretending otherwise would pin a stale contract under the authority of a transcript.
  //
  // They last moved for issue #48, which added `intent` and `rankingWalk` to the slot contract and
  // put the house's own ranking AHEAD of the inspiration loop. The recorded run saw
  // "Stop at G2-reference"; a run of the same storyboard today stops at G2-intent first, because
  // this fixture's slot — like every slot written before #48 — records no walk.
  whereBefore: {
    phase: "storyboard",
    status: "ready",
    owner: { kind: "skill", id: "storyboard" },
    missing: [
      "the reference loop's answer",
      "slot 1: no format was ever chosen",
      "slot 1: this medium and format were never confirmed reachable",
      "slot 1: no narrow intent was named — step 1 of chart-choice.md",
      "slot 1: the internal ranking was never walked, or the walk was not written down",
      "slot 1: nothing chosen",
    ],
    attempts: 0,
    resume: "Stop at G2b for slot 1; the journalist must provide format.",
  },
  whereAfter: {
    phase: "storyboard",
    status: "ready",
    owner: { kind: "skill", id: "storyboard" },
    missing: [
      "the reference loop's answer",
      "slot 1: no narrow intent was named — step 1 of chart-choice.md",
      "slot 1: the internal ranking was never walked, or the walk was not written down",
      "slot 1: nothing chosen",
    ],
    attempts: 0,
    resume: "Stop at G2-intent for slot 1; the journalist must provide intent.",
  },
  emptyDirectories: ["beats", "export"],
  manifestBefore: {
    "STORYBOARD.md": "df8f381171c9f43ceeb16ab8059ca66230d5a590b802bc9f779a66a195329d48",
    "source/article.md": "35448dd3ba8764c8a52e9e36682b1b848ebe4680be1330608349abb28cb41414",
    "source/data.csv": "a75b898f8f7794b99078f92a61335f93cee8f95d3a9e2f9b9b549ba8e0d5f750",
    "source/context.md": "59bd53e92bf2af9c418a59c0f989840ff626372a6511629badddf8caf5916f9d",
    "source/profile.json": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  },
  manifestAfter: {
    "STORYBOARD.md": "8df95015c8fbc198d8ac15c5a0795aa0c75bb987a746c927753c7a98924fdfe6",
    "source/article.md": "35448dd3ba8764c8a52e9e36682b1b848ebe4680be1330608349abb28cb41414",
    "source/data.csv": "a75b898f8f7794b99078f92a61335f93cee8f95d3a9e2f9b9b549ba8e0d5f750",
    "source/context.md": "59bd53e92bf2af9c418a59c0f989840ff626372a6511629badddf8caf5916f9d",
    "source/profile.json": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  },
});
