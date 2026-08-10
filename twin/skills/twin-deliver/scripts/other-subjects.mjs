// THE OTHER SUBJECTS IN THE SAME ARTICLE — the second half of the closing offer.
//
// The owner, having read the genre offer: *"Ou même le relancer sur des sous-sujets de son article
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
// the genre offer run again here, against the story as it stands now.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PRODUCIBLE_GENRES, capabilityGap } from "./another-genre.mjs";

export const SUBJECTS_FILE = "SUBJECTS.md";

// The receipt for THIS question, beside `.another-genre`'s. Two questions close a delivery, and
// they are separate facts: a journalist can want the same beat as a video and want nothing else
// from the article, or the reverse.
export const SUBJECT_OFFER_RECEIPT = ".other-subjects";

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OUR_PATH = /\bskills\//;
const OUR_MODULE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)\b/;

/**
 * One surveyed angle, validated. `learns` is the sentence the journalist reads at the end of the
 * run, so it is held to the same standard as every other journalist-facing string in this skill:
 * it must exist, it must be a sentence rather than a type name, and it may not name our own code.
 *
 * `medium` and `genre` are what the re-check needs. They are the angle's OWN best form, recorded
 * during the survey — not a promise: taking the subject starts a new beat, and that beat asks its
 * own medium/genre/size questions like any other.
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
  const genre = String(subject?.genre ?? "").trim();
  if (!medium || !genre) {
    throw new Error(`${where}: record the medium and genre this angle would take, so it can be re-checked before it is offered`);
  }
  return { id, learns, medium, genre };
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
      `    genre: ${row.genre}`,
    );
  }
  lines.push("---", "");

  await mkdir(storyDir, { recursive: true });
  await writeFile(join(storyDir, SUBJECTS_FILE), lines.join("\n"));
  return rows;
}

/** The recorded angles, or `[]` when the proposal recorded none. A reader, not a parser library. */
export async function readSurveyedSubjects(storyDir) {
  const text = await readFile(join(storyDir, SUBJECTS_FILE), "utf8").catch(() => null);
  if (text === null) return [];
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
 *   - `unreachable` — this toolchain has no producer for that medium × genre pair. Not offered.
 *   - `offered`  — still standing.
 */
export async function otherSubjectsFor({ storyDir, capabilities = {} }) {
  const subjects = await readSurveyedSubjects(storyDir);
  const beats = await beatDirectories(storyDir);

  return subjects.map((subject) => {
    const { id, learns, medium, genre } = subject;
    if (isDrawn(id, beats)) return { id, learns, medium, genre, verdict: "drawn" };

    const gap = capabilityGap(capabilities, medium);
    if (gap) {
      return {
        id,
        learns,
        medium,
        genre,
        verdict: "closed",
        because: gap,
        opens: capabilities[medium]?.fill ?? "",
      };
    }
    if (!PRODUCIBLE_GENRES[medium]?.includes(genre)) {
      return { id, learns, medium, genre, verdict: "unreachable" };
    }
    return { id, learns, medium, genre, verdict: "offered" };
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
 */
export function formatSubjectOffer(rows) {
  const offered = rows.filter((row) => row.verdict === "offered");
  const closed = rows.filter((row) => row.verdict === "closed");

  if (offered.length === 0) {
    const lines = [
      "Your article had other angles in it, and none of them is waiting: the one you have just",
      "delivered is what this piece supports right now.",
      "",
    ];
    if (closed.length > 0) {
      lines.push("One thing that is only unavailable for the moment:", "");
      for (const row of closed) {
        lines.push(`- ${row.learns} — ${row.because}${row.opens ? `. To open it: ${row.opens}` : ""}`);
      }
      lines.push("");
    }
    lines.push("Say you are done, and the story is closed.", "");
    return lines.join("\n");
  }

  const lines = [
    "There is more in this article than the visual you just delivered. These are the other things",
    "in it worth drawing — each would tell your reader something this beat does not show:",
    "",
  ];
  for (const row of offered) {
    lines.push(`- ${row.learns}`);
  }
  lines.push(
    "",
    "Taking one starts a new visual in this story, from the beginning — you frame it, you see it,",
    "you approve it, and it is delivered on its own, beside the one you already have. Name one, or",
    "say you are done: both are an answer, and either ends the story cleanly.",
    "",
  );
  return lines.join("\n");
}

/**
 * The answer, on disk, in the delivered beat's own export directory — the same shape as the genre
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
