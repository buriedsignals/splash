// twin/skills/palette/scripts/format-proposal.mjs
//
// Turns a `proposePalette` result into the thing a journalist actually reads and answers: the
// options side by side, each with where its colours came from, why they were proposed, and what
// they measured — plus the escape hatch. It writes nothing, the same as `palette.mjs` itself.
//
// This mirrors `newsroom-charter/scripts/format-proposal.mjs` on purpose: a journalist meets
// both skills in the same session, and two different shapes for "here is what I found, here is
// where I read it, now you decide" would make the second one feel like a different tool.

const FAIL_NOTE =
  "Below the 3:1 floor for a graphical object (WCAG 2.2 SC 1.4.11). At this ratio the accent is " +
  "hard to separate from the ground, so the chart stops carrying its own meaning.";

function contrastLine(option) {
  const { ratio, min, passes } = option.contrast;
  const verdict = passes ? `clears the ${min}:1 floor` : `FAILS the ${min}:1 floor`;
  return `  - Measured: **${ratio}:1** accent against ground — ${verdict}.`;
}

function remedyLines(option) {
  if (option.contrast.passes) return [];
  if (!option.remedy) {
    return [
      `  - ${FAIL_NOTE}`,
      "  - No nearby variant of this accent clears the floor against this ground either. This is a " +
        "ground problem, not an accent problem — a mid-grey ground leaves no room on either side.",
    ];
  }
  return [
    `  - ${FAIL_NOTE}`,
    `  - Nearest variant that would clear it: \`${option.remedy.accent}\` at ${option.remedy.contrast}:1. ` +
      "Offered, not applied — it is no longer the colour you chose, so it is yours to accept or reject.",
  ];
}

function optionBlock(option, index, recommended) {
  const mark = option.id === recommended ? " — **recommended**" : "";
  return [
    `**${index}. ${option.label}**${mark}`,
    "",
    `  - Ground \`${option.ground}\`, accent \`${option.accent}\`.`,
    `  - Where from: ${option.provenance}`,
    `  - Why: ${option.reasoning}`,
    contrastLine(option),
    ...remedyLines(option),
  ].join("\n");
}

// A newsroom may record many accents so production has enough distinct series inks, but those
// colours are not each a separate editorial decision. Keep the progressive chat gate to two
// choices: the recommendation (when one exists) and the first genuine alternative. Preserve the
// proposal's stable order so subject convention still precedes house colour when both are shown.
function visibleChoices(options, recommended) {
  if (options.length <= 2) return options;
  const recommendedOption = options.find((option) => option.id === recommended);
  const alternative = options.find((option) => option.id !== recommended);
  const ids = new Set([recommendedOption?.id, alternative?.id].filter(Boolean));
  return options.filter((option) => ids.has(option.id)).slice(0, 2);
}

/**
 * The question. Rendered markdown, ending in a real ask — never a statement of what was decided.
 *
 * The escape branch is always last and always present, including when there is only one option
 * and including when every option fails its contrast floor. A proposal a journalist cannot refuse
 * is not a proposal, and the one case where refusing matters most is the case where the house
 * colours themselves do not measure up.
 */
export function formatProposal(proposal) {
  const { options, recommended, subject, escape, noConventionReason } = proposal;

  const choices = visibleChoices(options, recommended);

  const head = [
    "# Colours for this beat",
    "",
    "PROPOSED, not applied. Nothing is rendered in these colours until you answer.",
  ];

  if (subject) head.push("", `Subject read as: *${subject}*`);
  // Said out loud, because a one-option proposal with no explanation reads as a tool with nothing
  // to say rather than as a subject with no convention. The run produced exactly that.
  if (noConventionReason) head.push("", noConventionReason);

  if (options.length === 0) {
    return [
      ...head,
      "",
      "## Nothing to propose",
      "",
      "There is no `NEWSROOM.md` with a brand colour and a ground to offer, and the subject carries",
      "no convention a reader could be expected to already hold. That leaves nothing this skill can",
      "propose with a reason attached — and a colour proposed without a reason is a colour invented.",
      "",
      "Two ways forward:",
      "",
      "- Run `newsroom-charter` against the newsroom's own site to draft a `NEWSROOM.md`, then",
      "  come back here.",
      `- ${escape}`,
    ].join("\n");
  }

  const body = choices.map((option, i) => optionBlock(option, i + 1, recommended));

  const tail = ["## Your answer", "", ...choices.map((o, i) => `- **${i + 1}** — ${o.label}`)];
  if (choices.some((o) => !o.contrast.passes && o.remedy)) {
    tail.push("- **the adjusted variant** of a failing option, where one was offered above");
  }
  tail.push(
    `- **${escape}**`,
    "",
    "Whatever you answer gets recorded in `PALETTE.md` beside the story, with `origin:` naming who",
    "chose it — you, the newsroom, or the subject convention. Every render reads that file. Nothing",
    "reads a default, because there isn't one: a beat with no recorded answer refuses to render",
    "rather than pick a colour nobody chose.",
  );

  return [...head, "", "## The options", "", body.join("\n\n"), "", ...tail].join("\n");
}
