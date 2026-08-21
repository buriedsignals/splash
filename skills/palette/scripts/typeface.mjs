// twin/skills/palette/scripts/typeface.mjs
//
// THE RECORDED ANSWER FOR THE TYPEFACE — proposed, measured, and WRITTEN.
//
// `PALETTE.md` closed "a beat is drawn in a colour nobody chose". `TYPEFACE.md` was built to close
// the same thing for type — `readTypeface`, `parseTypeface`, `useTypeface` and
// `assertDrawnInActiveTypeface` all shipped, and five render paths refuse without the file — and
// then nothing was ever given the job of writing one. Round four measured it:
//
//     grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write   -> nothing
//
// Every skill ships its own `TYPEFACE.md` in its own directory, so a seed resolves by walking up
// and nobody noticed that a STORY has none: twenty of this tree's twenty-one stories hold none
// (measured 2026-08-21). The one that does had it written by hand at the end of a run, because the
// refusal at the render names three ways out and no way to take any of them.
//
// WHY THIS SKILL OWNS IT. It is the same mechanism, one property over: a recorded answer, walked up
// from the beat's own directory, refused rather than defaulted, with `origin` naming who chose.
// `readTypeface` is vendored beside `readPalette` in the same `render-still.mjs`; `newsroom-charter`
// measures a newsroom's `typefaces` off its own site into `NEWSROOM.md` exactly as it measures
// `brandColor` and `ground`; and this skill is the one that turns collected charter values into a
// per-story answer a render can read. A second skill for two fields would have duplicated the
// proposal, the unattended rule and the refusal wholesale.
//
// WHAT IT DOES NOT DO: rasterise. Whether a family RESOLVES on this machine is a measurement only
// the renderer can make (resvg never errors on a family it cannot find — it draws the fallback and
// reports nothing), and its one implementation is `familyResolves` in `render-still.mjs`. It is
// INJECTED here rather than copied: a second body of the same decision, in a skill with no
// rasteriser, would be a copy nothing guards.

import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/** The substrate's own stack — what resvg, Chrome and Canvas fall back to when nobody chose. */
export const DEFAULT_STACK = "Helvetica, Arial, sans-serif";

/** Who chose. `parseTypeface` refuses anything else, and "default" is the honest word for nobody. */
export const ORIGINS = ["newsroom", "journalist", "default"];

// A face that RESOLVES is not the same as a face that belongs in a chart, and the difference has
// already been decided by hand once: `stress-p`'s run found `Courier New` on the machine, recorded
// `origin: default` anyway, and wrote down why — "a monospaced typewriter face is not a chart face
// and choosing it only because it resolves would be a worse answer than a stated fallback". That
// judgement is here so an unattended run makes it the same way, with the reason attached, and so a
// journalist who wants the face can still have it: a caution never removes an option.
const CAUTIONS = [
  {
    match: /(^|\s|-)(mono|monospace|monospaced|courier|consolas|menlo|typewriter)/i,
    say: "a monospaced typewriter face — it sets every digit on the same grid, which is a virtue in code and a distraction in a chart's own numbers. Offered, not recommended.",
  },
  {
    match: /(script|handwriting|comic|display|decorative|blackletter)/i,
    say: "a display or script face — legible at a headline's size, not at an axis label's. Offered, not recommended.",
  },
];

function cautionFor(family) {
  return CAUTIONS.find((rule) => rule.match.test(family))?.say ?? null;
}

/** The faces a `NEWSROOM.md` records, most prominent first, as its own field spells them. */
export function newsroomFaces(newsroom) {
  return String(newsroom?.typefaces ?? "")
    .split(",")
    .map((face) => face.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

/**
 * The options, each carrying where it was read, why it is offered, and — the field that makes this
 * a proposal rather than a guess — whether this machine ACTUALLY HAS THE FACE.
 *
 * `resolves` is required and is `familyResolves` (exported by every `render-still.mjs`; e.g.
 * `skills/map-beat/scripts/render-still.mjs`). Defaulting it to `() => true` would reproduce
 * precisely the failure the probe exists for: resvg renders the fallback and says nothing, so an
 * unmeasured proposal recommends a face the render will refuse — or, worse, one it will silently
 * substitute in a path that never calls `useTypeface`.
 */
export function proposeTypeface({ newsroom, resolves } = {}) {
  if (typeof resolves !== "function") {
    throw new Error(
      "proposeTypeface has to measure whether a family resolves on THIS machine and cannot do it " +
        "itself: pass resolves — familyResolves, exported by every render-still.mjs (e.g. " +
        "skills/map-beat/scripts/render-still.mjs). resvg never errors on a family it cannot " +
        "find; it draws the fallback and reports nothing, so an unmeasured proposal is a guess " +
        "about the one fact this question turns on.",
    );
  }

  const faces = newsroomFaces(newsroom);
  const house = newsroom?.name || "the newsroom";
  const options = faces.map((family, index) => ({
    id: `newsroom-${index + 1}`,
    origin: "newsroom",
    family,
    label: index === 0 ? `${house}'s own face` : `${house}'s face ${index + 1}`,
    provenance: `NEWSROOM.md — typefaces: "${faces.join(", ")}" (${index + 1} of ${faces.length}, most prominent first)`,
    reasoning:
      index === 0
        ? "The graphic reads as this newsroom's, set in the face its own pages are set in. It is what the charter measured off their site; using it is what collecting it was for."
        : "Also this newsroom's own, recorded after the primary. A house rarely has one face, and the second is usually the one its charts already use.",
    resolves: Boolean(resolves(family)),
    caution: cautionFor(family),
  }));

  options.push({
    id: "default",
    origin: "default",
    family: DEFAULT_STACK,
    label: "the substrate's own stack, recorded as a choice",
    provenance: "no measurement — this is what resvg, Chrome and Canvas fall back to on their own",
    reasoning:
      "Nobody chose this face. Recording that as a value rather than leaving it as a literal in the renderer is the whole point: the beat then says out loud that its type was not decided, instead of looking as though it had been.",
    resolves: true,
    caution: null,
  });

  const usable = options.filter(
    (option) => option.origin === "newsroom" && option.resolves && !option.caution,
  );
  const recommended = usable[0]?.id ?? "default";

  const missing = options.filter((o) => o.origin === "newsroom" && !o.resolves);
  const cautioned = options.filter((o) => o.origin === "newsroom" && o.resolves && o.caution);
  let recommendationReason;
  if (recommended !== "default") {
    recommendationReason = `${usable[0].family} is recorded in NEWSROOM.md and this machine has it, so the beat can actually be set in it.`;
  } else if (faces.length === 0) {
    recommendationReason =
      "NEWSROOM.md records no typefaces, so there is no house face to propose. The fallback is offered as a choice, which is the only honest way to have it: recorded, with origin: default, rather than silently rasterised.";
  } else {
    const clauses = [];
    for (const option of missing) {
      clauses.push(
        `${option.family} is recorded in NEWSROOM.md and this machine does not have it — resvg would have drawn the fallback and said nothing, so useTypeface refuses it`,
      );
    }
    for (const option of cautioned) {
      clauses.push(`${option.family} does resolve here, but it is ${option.caution.replace(/\.$/, "")}`);
    }
    recommendationReason = `${clauses.join("; ")}. That leaves the stated fallback, recorded as a choice with the gap named, rather than a face nobody can render or a face nobody should.`;
  }

  return {
    newsroom: newsroom?.name ?? null,
    faces,
    options,
    recommended,
    recommendationReason,
    escape:
      "Something else — name the face and I will measure it here before anything is recorded.",
    install:
      "Or install the recorded face on this machine and ask again; nothing here is a permanent verdict about the newsroom's own type.",
  };
}

function measuredLine(option) {
  if (option.origin === "default") return "  - Measured: nothing to measure — this is the fallback itself.";
  return option.resolves
    ? "  - Measured: **this machine has it**. A probe string laid out in this family and in a family that exists nowhere produced different ink."
    : "  - Measured: **this machine does not have it**. The same probe produced identical ink in this family and in a nonsense one, which is what a silent fallback looks like from the outside.";
}

function optionBlock(option, index, recommended) {
  const mark = option.id === recommended ? " — **recommended**" : "";
  const lines = [
    `**${index}. ${option.label}**${mark}`,
    "",
    `  - Face \`${option.family}\`, recorded as \`origin: ${option.origin}\`.`,
    `  - Where from: ${option.provenance}`,
    `  - Why: ${option.reasoning}`,
    measuredLine(option),
  ];
  if (option.caution) lines.push(`  - Note: ${option.caution}`);
  return lines.join("\n");
}

/**
 * The question the journalist reads and answers. Rendered markdown, ending in a real ask, always
 * carrying the escape — the same shape `formatProposal` has for colour, because a journalist meets
 * both in the same session.
 */
export function formatTypefaceProposal(proposal) {
  const { options, recommended, recommendationReason, escape, install } = proposal;
  const head = [
    "# The typeface this story is set in",
    "",
    "PROPOSED, not applied. Nothing is rendered in this face until you answer.",
    "",
    recommendationReason,
  ];
  const body = options.map((option, index) => optionBlock(option, index + 1, recommended));
  const tail = [
    "## Your answer",
    "",
    ...options.map((option, index) => `- **${index + 1}** — ${option.label} (\`${option.family}\`)`),
    `- **${escape}**`,
    `- **${install}**`,
    "",
    "Whatever you answer is recorded in `TYPEFACE.md` beside the story, with `origin:` naming who",
    "chose — you, the newsroom, or nobody. Every render reads that file and refuses without it, and",
    "a face this machine does not have is refused rather than quietly swapped for one it does.",
  ];
  return [...head, "", "## The options", "", body.join("\n\n"), "", ...tail].join("\n");
}

function assertRecordable(option) {
  if (!option || typeof option !== "object" || !option.family) {
    throw new Error(`writeTypeface needs one option from proposeTypeface, got ${JSON.stringify(option)}`);
  }
  if (!ORIGINS.includes(option.origin)) {
    throw new Error(
      `origin must be one of ${ORIGINS.join(", ")} — got ${JSON.stringify(option.origin)}. It records WHO chose this face.`,
    );
  }
  if (typeof option.resolves !== "boolean") {
    throw new Error(
      `${JSON.stringify(option.family)} was never measured on this machine: option.resolves must be a boolean, ` +
        "from familyResolves. Nothing is recorded on an assumption here — that is the whole reason the field exists.",
    );
  }
  if (option.origin !== "default" && !option.resolves) {
    throw new Error(
      `${JSON.stringify(option.family)} does not resolve on this machine, so recording it would record a face ` +
        "nothing here can draw: useTypeface refuses it at the render, and resvg would otherwise have drawn the " +
        "fallback and said nothing. Install the face, or record one this machine has, or record the fallback with " +
        "origin: default and say so — that third one is an answer, not a failure.",
    );
  }
}

/**
 * The recorded answer, as text. Front matter `parseTypeface` accepts, then the prose a reader of the
 * story needs: which face, who chose it, what was measured, and — when the answer is the fallback
 * while the newsroom records faces of its own — the gap, named. A `TYPEFACE.md` that said only
 * `origin: default` would look like a decision nobody had to explain, which is the shape of the
 * defect this file closes.
 */
export function renderTypefaceRecord(option, { newsroom, answeredBy = "journalist", because } = {}) {
  assertRecordable(option);
  const faces = newsroomFaces(newsroom);
  const lines = [
    "---",
    `family: "${option.family}"`,
    `origin: ${option.origin}`,
    "---",
    "",
    "# The typeface this story draws in",
    "",
    `Recorded ${answeredBy === "journalist" ? "from the journalist's own answer" : "with no journalist present"}` +
      `, from ${option.provenance || "the proposal"}.`,
    "",
  ];
  if (because) lines.push(because, "");
  if (faces.length > 0) {
    lines.push(
      `\`NEWSROOM.md\` records \`typefaces: "${faces.join(", ")}"\`. Every one of them was measured here before` +
        " anything was written: a family that does not resolve is refused rather than swapped, because resvg" +
        " renders the fallback and reports nothing, as do Chrome and Canvas.",
      "",
    );
  }
  if (option.origin === "default") {
    lines.push(
      "`origin: default` is the honest word. Nobody chose this stack — it is the substrate's own, and recording" +
        " it as a value rather than leaving it as a literal in the renderer is what makes the gap visible: until" +
        " the recorded face is on the machine that renders, these beats are not set in it.",
      "",
    );
  } else {
    lines.push(
      "A newsroom's face is PROPOSED, never imposed, and `origin` is what records that somebody chose. The" +
        " render reads this file, puts the face in force, and refuses any element drawn in another one — every" +
        " gutter in the frame was measured in this face.",
      "",
    );
  }
  if (answeredBy !== "journalist") {
    lines.push(
      "No journalist was present for this run. The option recorded is the proposal's own measured recommendation," +
        " never a face invented for the occasion and never one the measurement refused; a later run can revise this" +
        " file, which is the reason writing it beats ending the turn with nobody there to resume it.",
      "",
    );
  }
  return lines.join("\n");
}

/**
 * THE WRITER. The one thing this skill's colour half deliberately does not do, and the one thing
 * `TYPEFACE.md` was missing entirely.
 *
 * `PALETTE.md` is authored by hand from the journalist's answer, and that works because a colour is
 * two hex codes a person can type. A typeface answer carries a measurement no person can make by
 * eye — whether this machine HAS the face — so the answer and the measurement are written together
 * or the file is worth nothing. Hence a function, and hence its refusals.
 *
 * It refuses to overwrite: a recorded answer is a decision, and replacing one silently is how a
 * story ends up set in a face its own `TYPEFACE.md` does not name.
 */
export async function writeTypeface({ dir, option, newsroom, answeredBy = "journalist", because, replace = false } = {}) {
  if (!dir) throw new Error("writeTypeface needs the directory to record the answer in — normally the story root");
  assertRecordable(option);
  const path = join(resolve(dir), "TYPEFACE.md");
  const existed = existsSync(path);
  if (existed && !replace) {
    throw new Error(
      `${path} already records an answer. A recorded typeface is a decision, not a cache: read it, and pass ` +
        "replace: true only when the journalist has actually changed their mind or the face has been installed since.",
    );
  }
  const text = renderTypefaceRecord(option, { newsroom, answeredBy, because });
  await writeFile(path, text);
  return { path, replaced: existed, family: option.family, origin: option.origin };
}
