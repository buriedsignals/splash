// THE OTHER SUBJECTS IN THE SAME ARTICLE — the second half of the closing offer.
//
// The owner, having read the format offer: *"Ou même le relancer sur des sous-sujets de son article
// qui seraient intéressants à transformer en visuel."* One article carries several things worth
// drawing; the run draws one and ends.
//
// THE MATERIAL ALREADY EXISTS, AND IS THROWN AWAY. At the proposal the exchange surveys everything
// that could be made of this article and its data (movement ④), proposes materially different ways
// of seeing it, checks each is genuinely reachable, and the journalist "drops, reorders, adds,
// vetoes" (movement ⑩). What survives into `STORYBOARD.md` is the slots that were KEPT. The angles
// that were found, grounded, checked and then dropped — the sub-subjects — are held in a
// conversation and lost when it ends. So this file is two halves:
//
//   `recordSurveyedSubjects` — called at the END of the proposal, by the phase that still has the
//                              material, writing it into the story's own directory.
//   `otherSubjectsFor`       — called at the END of the run, reading it back and RE-CHECKING every
//                              one before it is offered.
//
// WHY THE STORY AND NOT THE BEAT (invariant 3: a beat's inputs and outputs live in its own folder).
// A sub-subject belongs to the ARTICLE. It has no beat yet — that is the whole point of offering it
// — so there is no folder of its own for it to live in, and filing it under the beat that happened
// to be delivered first would make one beat the owner of angles it has nothing to do with. It is
// story-level material, so it lives at the story level, beside `STORYBOARD.md`, which is the other
// story-level record of the same conversation.
//
// WHY IT IS RE-CHECKED RATHER THAN TRUSTED. A stored `reachable: yes` is a verdict about an hour
// ago. A capability can close between the proposal and the delivery (a key expires, a token is
// rotated), and the beat that WAS made may have consumed the angle. So the same verdicts that guard
// the format offer run again here, against the story as it stands now.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PRODUCIBLE_FORMATS, capabilityGap } from "./another-format.mjs";
import { resolveScaffoldLanguage, untranslatedNotice } from "./journalist-language.mjs";

export const SUBJECTS_FILE = "SUBJECTS.md";

// The receipt for THIS question, beside `.another-format`'s. Two questions close a delivery, and
// they are separate facts: a journalist can want the same beat as a video and want nothing else
// from the article, or the reverse.
export const SUBJECT_OFFER_RECEIPT = ".other-subjects";

// This offer's own sentences, in each language it is made in — the same discipline as
// `format-handover.mjs` and `another-format.mjs`: no journalist-facing literal in the body below.
const SUBJECT_COPY = {
  en: {
    nothingWaiting: [
      "Your article had other angles in it, and none of them is waiting: the one you have just",
      "delivered is what this piece supports right now.",
    ],
    closedHeading: "One thing that is only unavailable for the moment:",
    opensWith: (opens) => `. To open it: ${opens}`,
    closeNothing: "Say you are done, and the story is closed.",
    opening: [
      "There is more in this article than the visual you just delivered. These are the other things",
      "in it worth drawing — each would tell your reader something this beat does not show:",
    ],
    close: [
      "Taking one starts a new visual in this story, from the beginning — you frame it, you see it,",
      "you approve it, and it is delivered on its own, beside the one you already have. Name one, or",
      "say you are done: both are an answer, and either ends the story cleanly.",
    ],
  },
  fr: {
    nothingWaiting: [
      "Votre article contenait d'autres angles, et aucun n'est en attente : celui que vous venez de",
      "recevoir est ce que cet article permet de montrer aujourd'hui.",
    ],
    closedHeading: "Une seule chose est indisponible, et seulement pour le moment :",
    opensWith: (opens) => `. Pour l'ouvrir : ${opens}`,
    closeNothing: "Dites que vous avez terminé, et le sujet est clos.",
    opening: [
      "Il y a davantage dans cet article que le visuel que vous venez de recevoir. Voici ce qu'il",
      "contient d'autre qui mérite d'être dessiné — chacun dirait à votre lecteur quelque chose que ce",
      "visuel-ci ne montre pas :",
    ],
    close: [
      "En prendre un lance un nouveau visuel dans ce sujet, depuis le début — vous le cadrez, vous le",
      "voyez, vous le validez, et il est livré à part, à côté de celui que vous avez déjà. Nommez-en",
      "un, ou dites que vous avez terminé : les deux sont une réponse, et l'une comme l'autre clôt",
      "proprement le sujet.",
    ],
  },
};

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OUR_PATH = /\bskills\//;
const OUR_MODULE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)\b/;

/**
 * One surveyed angle, validated. `learns` is the sentence the journalist reads at the end of the
 * run, so it is held to the same standard as every other journalist-facing string in this skill:
 * it must exist, it must be a sentence rather than a type name, and it may not name our own code.
 *
 * `medium` and `format` are what the re-check needs. They are the angle's OWN best form, recorded
 * during the survey — not a promise: taking the subject starts a new beat, and that beat asks its
 * own medium/format/size questions like any other.
 */
function validateSubject(subject, index) {
  const where = subject?.id ? `subject ${subject.id}` : `subject ${index + 1}`;
  const id = String(subject?.id ?? "").trim();
  if (!ID_RE.test(id)) {
    throw new Error(
      `${where}: an id is lowercase words joined by hyphens, so it can name a beat directory — got ${JSON.stringify(subject?.id)}`,
    );
  }
  const learns = String(subject?.learns ?? "").trim();
  if (learns.split(/\s+/).filter(Boolean).length < 5) {
    throw new Error(
      `${where}: say what the READER would learn from this angle, in a sentence — a type name is not a reason to draw something`,
    );
  }
  if (OUR_PATH.test(learns) || OUR_MODULE.test(learns)) {
    throw new Error(
      `${where}: this sentence names this toolchain's own code, and it is read by the journalist at the end of their run. A defect in our code goes to stories/<slug>/NOTES-FOR-MAINTAINER.md`,
    );
  }
  const medium = String(subject?.medium ?? "").trim();
  const format = String(subject?.format ?? "").trim();
  if (!medium || !format) {
    throw new Error(`${where}: record the medium and format this angle would take, so it can be re-checked before it is offered`);
  }
  return { id, learns, medium, format };
}

/**
 * Write the survey's own output into the story's directory, at the end of the proposal.
 *
 * Every angle the survey found goes in — including the ones that BECAME a beat, marked with the
 * beat they became, because "this one is already drawn" is a fact the offer needs and an absence
 * cannot carry. Nothing is invented here: an article that yielded one angle records one.
 */
export async function recordSurveyedSubjects({ storyDir, subjects }) {
  if (!storyDir) throw new Error("recordSurveyedSubjects needs the story directory");
  if (!Array.isArray(subjects)) throw new Error("subjects is the list the survey produced, even when it holds one");

  const rows = subjects.map(validateSubject);
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`two subjects share the id ${JSON.stringify(row.id)} — an id names a beat directory, so it is unique`);
    ids.add(row.id);
  }

  const lines = [
    "---",
    "# Every angle the survey found in this article, written at the proposal and read back at the",
    "# end of the run. Story-level, because a sub-subject belongs to the article: it has no beat of",
    "# its own until the journalist asks for one.",
    "subjects:",
  ];
  for (const row of rows) {
    lines.push(
      `  - id: ${row.id}`,
      `    learns: ${JSON.stringify(row.learns)}`,
      `    medium: ${row.medium}`,
      `    format: ${row.format}`,
    );
  }
  lines.push("---", "");

  await mkdir(storyDir, { recursive: true });
  await writeFile(join(storyDir, SUBJECTS_FILE), lines.join("\n"));
  return rows;
}

/**
 * The recorded angles. A reader, not a parser library.
 *
 * A MISSING FILE IS NOT AN ANSWER. This used to return `[]` for it, which made "this article
 * yielded nothing else" and "nobody ever surveyed this article" the same value — and the closing
 * offer says a sentence over that value: *your article had other angles in it, and none of them is
 * waiting*. Measured 2026-08-21: twenty of this tree's twenty-one stories hold no `SUBJECTS.md` at
 * all, four of them delivered, and `stress-p` went through three renders, three approvals and three
 * deliveries before the file was written at the very end from memory of a survey that had already
 * happened (`stories/stress-p-transport-ridership/NOTES-FOR-MAINTAINER.md`) — the
 * lives-in-a-conversation-and-dies-with-it failure this file exists to prevent, happening around
 * the file itself.
 *
 * So the two cases are now different values, and the empty one is still first-class: an article
 * that yielded nothing else RECORDS the empty survey, which is one call, at the movement where the
 * material is still in front of everybody.
 */
export async function readSurveyedSubjects(storyDir) {
  const text = await readFile(join(storyDir, SUBJECTS_FILE), "utf8").catch(() => null);
  if (text === null) {
    throw new Error(
      `no ${SUBJECTS_FILE} in ${storyDir}: the survey this offer reads back was never written ` +
        `down. It belongs to movement 10 of the storyboard exchange, where the angles still exist ` +
        `— call recordSurveyedSubjects({ storyDir, subjects }) there with every angle the survey ` +
        `found, kept or dropped. An article that yielded nothing else records the empty survey ` +
        `(subjects: []); "there was nothing else" is an answer and is written down like any other. ` +
        `Reading a missing file as an empty survey is how a delivery closed telling a journalist ` +
        `their article's other angles had been checked when nothing had been.`,
    );
  }
  const subjects = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const first = /^\s+-\s+id:\s*(.+)$/.exec(line);
    if (first) {
      current = { id: first[1].trim() };
      subjects.push(current);
      continue;
    }
    const pair = /^\s{4,}([a-zA-Z]+):\s*(.+)$/.exec(line);
    if (current && pair) {
      const raw = pair[2].trim();
      current[pair[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw;
    }
  }
  return subjects;
}

/** Which beat directories this story already holds. A beat named `2-<id>` is the angle `<id>` drawn. */
async function beatDirectories(storyDir) {
  return (await readdir(join(storyDir, "beats"), { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function isDrawn(id, beats) {
  return beats.some((beat) => beat === id || beat.endsWith(`-${id}`));
}

/**
 * The angles from this article that are still worth offering, each with its verdict — RE-CHECKED,
 * never read off a stored `yes`:
 *
 *   - `drawn`    — a beat already exists for it. Not offered; the journalist has it.
 *   - `closed`   — the medium's capability is shut now. Not offered; `opens` says what would open it.
 *   - `unreachable` — this toolchain has no producer for that medium × format pair. Not offered.
 *   - `offered`  — still standing.
 */
export async function otherSubjectsFor({ storyDir, capabilities = {} }) {
  const subjects = await readSurveyedSubjects(storyDir);
  const beats = await beatDirectories(storyDir);

  return subjects.map((subject) => {
    const { id, learns, medium, format } = subject;
    if (isDrawn(id, beats)) return { id, learns, medium, format, verdict: "drawn" };

    const gap = capabilityGap(capabilities, medium);
    if (gap) {
      return {
        id,
        learns,
        medium,
        format,
        verdict: "closed",
        because: gap,
        opens: capabilities[medium]?.fill ?? "",
      };
    }
    if (!PRODUCIBLE_FORMATS[medium]?.includes(format)) {
      return { id, learns, medium, format, verdict: "unreachable" };
    }
    return { id, learns, medium, format, verdict: "offered" };
  });
}

/**
 * The offer as the journalist reads it — their article, their readers, and nothing about how any of
 * this was decided. Rendered from the rows and from nothing else, the same closed-input discipline
 * `format-handover.mjs` documents.
 *
 * The honest empty case is a first-class outcome: an article that yielded nothing else says so, and
 * the run closes. Inventing a second-rate angle to fill the offer is the failure this paragraph
 * exists to name.
 *
 * Written in the story's own language (A25, ruling R4), read from `STORYBOARD.md` and never guessed.
 * `learns` is the journalist's own recorded sentence and is already in their language; only the
 * scaffold around it is translated here. The one line that is not is a `closed` row's `because`,
 * which preflight measures in English — recorded in `another-format.mjs`'s `capabilityGap`.
 */
export function formatSubjectOffer(rows, { language } = {}) {
  const scaffold = resolveScaffoldLanguage(language);
  const copy = SUBJECT_COPY[scaffold.written];
  const offered = rows.filter((row) => row.verdict === "offered");
  const closed = rows.filter((row) => row.verdict === "closed");

  if (offered.length === 0) {
    const lines = [...untranslatedNotice(scaffold), ...copy.nothingWaiting, ""];
    if (closed.length > 0) {
      lines.push(copy.closedHeading, "");
      for (const row of closed) {
        lines.push(`- ${row.learns} — ${row.because}${row.opens ? copy.opensWith(row.opens) : ""}`);
      }
      lines.push("");
    }
    lines.push(copy.closeNothing, "");
    return lines.join("\n");
  }

  const lines = [...untranslatedNotice(scaffold), ...copy.opening, ""];
  for (const row of offered) {
    lines.push(`- ${row.learns}`);
  }
  lines.push("", ...copy.close, "");
  return lines.join("\n");
}

/**
 * The answer, on disk, in the delivered beat's own export directory — the same shape as the format
 * offer's receipt, and for the same reason: "the run never made the offer" has to be a state that
 * can be seen.
 *
 * `none` is a real answer, and it is the one the honest empty case records: the article carried
 * nothing else worth making, and that was SAID rather than skipped.
 */
export async function recordSubjectAnswer({ exportDir, answer, subject }) {
  if (answer !== "declined" && answer !== "taken" && answer !== "none") {
    throw new Error(`an answer is "declined", "taken" or "none" — got ${JSON.stringify(answer)}`);
  }
  if (answer === "taken" && !subject) {
    throw new Error('a "taken" answer names the subject the journalist asked for next');
  }
  await writeFile(
    join(exportDir, SUBJECT_OFFER_RECEIPT),
    answer === "taken" ? `taken ${subject}\n` : `${answer}\n`,
  );
}
