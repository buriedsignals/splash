// STORYBOARD.md is YAML front matter (a narrow, dependency-free subset) plus free prose. Only the
// front matter is machine-checked; the prose beneath it is what the journalist actually reads.

import { groundTakeaway } from "./ground-claim.mjs";
import { scalar, recorded, parseStoryboard, checkStoryboard, SURVEY_GAP } from "./gate-contract.mjs";
import { formatGap } from "./format-catalog.mjs";
import { capabilityGap } from "./capability-gap.mjs";
import { createHash, randomUUID } from "node:crypto";
import { lstat, open, readFile, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { acquireTargetLock } from "./target-lock.mjs";

// Still exported, and still this skill's own work — but no longer called by the GATE. Each is an
// expensive semantic check owned by exactly one phase: `groundTakeaway` runs at G1, the moment the
// takeaway is confirmed, and `formatGap`/`capabilityGap` run at the format sub-gate G2b. Each records
// its resolved verdict into `STORYBOARD.md` (`grounding:`, and the slot's `reachable:`), and BOTH
// gates then read the recorded scalar.
//
// That is what closes the divergence class by construction. `checkStoryboard` used to take a
// `profile` and a `capabilities` argument that `where.mjs`'s `missingForGate2` structurally could
// not have, so this gate could refuse for three reasons the other gate could not see — and did:
// `whereIs` reported `production` on a storyboard this function was refusing
// (twin/FEEDBACK-2026-08-10.md, A7/A14). Neither gate can now run a check the other cannot, because
// neither runs one at all: they read the same recorded fields.
export { groundTakeaway, formatGap, capabilityGap };

// THE HONEST EMPTY ANSWER FOR `credit` — ROUND-FOUR FINDING 11.
//
// `credit` is one of the six HAND fields above, required, presence-checked, and until now it had no
// value meaning "the journalist named no source". `stress-p-transport-ridership`'s three delivered
// beats all print "Source: city network figures for 2025, compiled by Buried Signals". Its frozen
// article names no source whatever —
//
//     grep -in "source\|according\|compiled\|buried" \
//       stories/stress-p-transport-ridership/source/article.md   ->  nothing
//
// — and `Buried Signals` is this tree's own `NEWSROOM.md` `name`. A required question with no honest
// empty answer, asked with nobody there to answer it, was filled with the most plausible string in
// reach, and the consequence is data attributed to a real named organisation that never touched it.
// Round two's finding 9 recurring, with a byline on it.
//
// THE SHAPE OF THE FIX is `palette/scripts/typeface.mjs`'s, landed this same round for the same
// class of defect — a required answer nobody was present to give. That file proposes, records
// `origin: default`, and says out loud that nobody chose, rather than silently substituting. The
// third origin here is `none`, its recorded value is `unattributed`, and what a reader sees is
// `Source: not stated`: visible, on the artefact, in the place a credit goes. A blank would not do
// the same work — a credit line that renders as nothing reads as a rendering fault, which is how an
// absent source stops being read as one.
//
// WHAT IS DELIBERATELY NOT COPIED FROM THAT FILE: it writes a file (`TYPEFACE.md`) because a
// typeface answer carries a measurement no person can make by eye. A credit is a sentence a person
// can read and type, and it already has a home — the `credit:` scalar in this story's own
// `STORYBOARD.md`. A second file for it would be a second place to disagree.
const UNATTRIBUTED_CREDIT = "unattributed";
const UNATTRIBUTED_CREDIT_LINE = "Source: not stated";
export { UNATTRIBUTED_CREDIT, UNATTRIBUTED_CREDIT_LINE };

/** Who chose the credit. `none` is the honest word for nobody, and it is an ANSWER, not a failure. */
export const CREDIT_ORIGINS = ["journalist", "newsroom", "none"];

/**
 * Whether a recorded `credit:` is the sentinel meaning the journalist named no source.
 *
 * Matched at the head of the value and on a word boundary, so a story that appends its effective
 * date to the recorded scalar (`unattributed · as of 21 August 2026`, which is what a beat's own
 * source line normally looks like) still reads as unattributed. A credit that merely CONTAINS the
 * word — "Source: unattributed figures released by the ministry" — is a real credit and is not
 * touched.
 *
 * DUPLICATED in `deliver/scripts/format-handover.mjs` (a function-level copy, not a carried file —
 * nothing walks it): the phase that RECORDS the answer and the phase that HANDS IT OVER must not
 * disagree about what the answer means. If a third copy is ever needed, carry this file instead.
 */
export function isUnattributedCredit(value) {
  if (typeof value !== "string") return false;
  return new RegExp(`^${UNATTRIBUTED_CREDIT}\\b`, "iu").test(value.trim());
}

/**
 * The credit line a delivered artefact actually PRINTS, given the recorded scalar.
 *
 * The sentinel becomes the sentence a reader sees; everything else is the journalist's own words,
 * returned untouched. Nothing is invented for an empty credit — an empty credit is a gate failure,
 * not a case to paper over, and `checkStoryboard` already refuses it.
 *
 * DUPLICATED in `deliver/scripts/format-handover.mjs`; see `isUnattributedCredit`.
 */
export function creditLine(credit) {
  const text = String(credit ?? "").trim();
  if (!isUnattributedCredit(text)) return text;
  return `${UNATTRIBUTED_CREDIT_LINE}${text.slice(UNATTRIBUTED_CREDIT.length)}`;
}

// The cues a sentence uses when it says where a figure came from. Deliberately a short, literal
// list: this is a PROPOSAL step, and a cue it misses costs the journalist one correction, while a
// cue it invents would be this defect again one level up.
//
// ROUND FIVE widened it twice, for two different reasons.
//
// FIRST, THE MEASURED GAP. Run over all 27 frozen stories, this list matched 2. Five sentences in
// five other stories attribute in a form it had never been taught, and all five are the same one:
//
//   stress-x-tunisian-water   "The figures come from the national water utility …"
//   stress-t-europe-recycling "The figures come from the national environment agencies …"
//   stress-b-piped-water      "The figures below come from a national-statistics compilation …"
//   stress-f-housing-pressure "Malta's figure comes from a different survey …"
//   stress-w-quay-photographs "The middle photograph came from the archive without a caption …"
//
// So `DATA_CAME_FROM` below, and it is BOUND to a data noun rather than matching "came from" bare,
// because of that last line. A photograph that came from an archive with no caption is the story's
// own statement that nobody can be credited; reading it as an attribution would recommend a
// rambling sentence over the honest `none`, on the one story in this tree that most needs `none`.
//
// SECOND, THE SCRIPT. This list was English and French because those were the two languages this
// tree's stories happened to be written in. It has since received a Greek story and an Arabic one,
// and a name-based lexicon written against the language of its first story is the shape round five
// found in four different skills. The Greek and Arabic cues here are NOT exercised by any frozen
// article — `stress-x-tunisian-water`'s own attributing sentence sits in the English paragraph
// beside the Arabic one — and `test/credit-vocabulary.test.ts` says so where it drives them. They
// are added ahead of the corpus on purpose: missing a cue is SILENT (the journalist is recommended
// `unattributed` over their own words), and widening the reader is not.
//
// ROUND SEVEN, D10. `source[s]?\s*:` SAT IN THIS LIST FOR SIX ROUNDS AND COULD NOT FIRE. The
// alternation is wrapped in `\b(…)\b`, and a word boundary after a COLON needs a word character
// next — so `Source:Eurostat` matched and `Source: Eurostat`, which is how anybody writes it, did
// not. Measured on `stories/real-gwis-wildfire-counts`, whose last paragraph is exactly
// `Source: Global Wildfire Information System (2026), with minor processing by Our World in Data.`:
// `attributionsIn` returned that sentence not at all. The one cue in the list that ends in
// punctuation is the one the wrapper silently disabled, which is why the colon-terminated markers
// now live OUTSIDE it — beside the Greek and Arabic ones, which were already outside and always
// worked.
const ATTRIBUTION_CUES =
  /\b(according to|as reported by|released by|released to|obtained from|provided by|published by|supplied by|figures from|data from|selon|d'après|publi[ée]s? par|fourni[es]? par|transmis(?:es)? par)\b|(?:source[s]?\s*:)|(?:σύμφωνα με|κατά το|πηγή\s*:|στοιχεία (?:του|της|από))|(?:وفقاً? ل|وفقا ل|بحسب|حسب|صادر(?:ة)? عن|بيانات من|المصدر\s*:)/iu;

/**
 * A SOURCE LINE THE ARTICLE MARKED AS ONE — the label, and what the label points at.
 *
 * `real-ember-renewables-share` writes it as
 * `Source line, verbatim from the file's metadata: *Ember (2026) and other sources – with major
 * processing by Our World in Data.*`, and `real-gwis-wildfire-counts` writes the bare form,
 * `Source: Global Wildfire Information System (2026), with minor processing by Our World in Data.`
 * Both are the journalist saying "this part is the credit", and the part they mean is what follows
 * the colon: keeping the label in the value prints `Source: Source: …` under the graphic, and
 * keeping the whole sentence prints the prose the line was wrapped in.
 *
 * THE LABEL HAS TO OPEN WITH THE SOURCE NOUN and stay short, deliberately. An article that writes
 * "The dataset's own description is plain about what the number is: a percentage" has a colon and
 * no credit behind it; a rule that read any colon-terminated clause as a marker would propose that
 * sentence as the credit, which is this file's own named failure — inventing a cue — one level up.
 * What the cap does not exclude is a heading like "Sources of error:", and that is the honest cost:
 * an over-match costs the journalist one correction at a proposal step they answer anyway, while a
 * miss is silent.
 */
const MARKED_SOURCE_LINE =
  /^\s*(?:[-*>]\s+)?\**\s*((?:sources?|credits?|attribution|crédits?|πηγή|المصدر)\b[^:\n]{0,60}?)\s*:\s*(\S[\s\S]*)$/iu;

/** One line, whatever shape the article wrapped it in: a credit prints on a single line under a
 *  graphic, and a sentence broken across two source lines carried its newline all the way into the
 *  recorded value. Words are untouched — only the whitespace between them is. */
function oneLine(text) {
  return String(text ?? "").replace(/\s+/gu, " ").trim();
}

/**
 * What a marked source line POINTS AT, verbatim and on one line, or `null` when this sentence
 * carries no marker. Markdown emphasis around the marked text is furniture, not credit, and the
 * sentence's own terminal punctuation is dropped the same way a cued sentence's is.
 */
export function markedSourceIn(sentence) {
  const marked = MARKED_SOURCE_LINE.exec(String(sentence ?? ""));
  if (!marked) return null;
  const value = oneLine(marked[2])
    .replace(/^[*_]+/u, "")
    .replace(/[*_]+$/u, "")
    .replace(/[.!?]+$/u, "")
    .trim();
  return value || null;
}

// A data noun, then a form of "come from" — the attributing shape the corpus above showed and the
// cue list did not hold. The gap between the two is capped so the pairing has to be one clause, not
// a noun in one sentence and a verb three lines later, and it never crosses a sentence end.
const DATA_CAME_FROM =
  /\b(figures?|data|numbers?|table|series|dataset|statistics|chiffres|données|tableau|statistiques)\b[^.!?]{0,40}?\b(?:comes? from|came from|proviennent de|provient de|issus? de|issues? de)\b/iu;

/**
 * The article's OWN attributing sentences, verbatim.
 *
 * Never a rewrite and never a summary: what comes back is what the journalist already wrote, so a
 * proposal built on it is their words handed back rather than a plausible sentence composed here.
 * An article that attributes nothing returns nothing, and that emptiness is the finding — it is what
 * `proposeCredit` turns into a recommendation of `none` instead of a guess.
 */
export function attributionsIn(article) {
  return String(article ?? "")
    .split(/(?<=[.!?])\s+(?=[^\s])|\n{2,}/u)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence &&
        !sentence.startsWith("#") &&
        (ATTRIBUTION_CUES.test(sentence) ||
          DATA_CAME_FROM.test(sentence) ||
          // A LABEL IS AN ATTRIBUTION IN ITS OWN RIGHT. "Source line, verbatim from the file's
          // metadata: …" carries no cue from either list above — the noun and the colon are three
          // words apart — and it is the most explicit attribution the ember article makes.
          MARKED_SOURCE_LINE.test(sentence)),
    );
}

/**
 * The credit options a journalist reads and answers — the same movement `typefaceDecision` runs for
 * the face, one field over: every option carries where it was read, why it is offered, and what a
 * delivered artefact would PRINT if it were chosen.
 *
 * THE RECOMMENDATION IS NEVER THE HOUSE CONVENTION ON ITS OWN. `NEWSROOM.md`'s `credit` is a
 * TEMPLATE with `{source}` where the story's own source goes; recommending it with that hole
 * unfilled is the exact move that produced "compiled by Buried Signals" — the newsroom's name is
 * the nearest string to hand, and a run with nobody watching reaches for it. So the convention is
 * OFFERED, and the recommendation is the article's own attribution where there is one and `none`
 * where there is not.
 */
export function proposeCredit({ newsroom, article } = {}) {
  const convention = String(newsroom?.credit ?? "").trim();
  const house = newsroom?.name || "the newsroom";
  const attributions = attributionsIn(article);
  const options = [];

  // A LINE THE ARTICLE MARKED BEATS A SENTENCE THAT MERELY CARRIES A CUE, and it is offered first
  // so `article-1` — the recommendation — is the marked one wherever there is one. The ember run
  // recommended "Source: We have Ember's renewables share of electricity generation, as published
  // by Our World in Data, covering 246 entities from 1900 to 2025" while the article's own marked
  // line sat two paragraphs below it and was not among the options at all.
  const readings = attributions
    .map((sentence) => ({ sentence, marked: markedSourceIn(sentence) }))
    .sort((a, b) => (a.marked ? 0 : 1) - (b.marked ? 0 : 1));

  for (const [index, reading] of readings.entries()) {
    const source = reading.marked ?? oneLine(reading.sentence).replace(/[.!?]+$/u, "");
    const value = convention ? convention.replace("{source}", source) : `Source: ${source}`;
    options.push({
      id: `article-${index + 1}`,
      origin: "journalist",
      value,
      provenance: reading.marked
        ? `the article's own marked source line, ${index + 1} of ${readings.length}`
        : `the article's own words, attributing sentence ${index + 1} of ${readings.length}`,
      reasoning: reading.marked
        ? "The journalist marked this line as the source themselves, and what is offered is what the marker points at — the label they wrote it under is not part of the credit, and neither is the prose around it."
        : "The journalist already said where this came from, in their own copy. Handing it back for confirmation is the only proposal here that cannot invent a source, because there is nothing in it that was not already written.",
    });
  }

  if (convention) {
    options.push({
      id: "newsroom",
      origin: "newsroom",
      value: convention,
      provenance: `NEWSROOM.md — credit: ${JSON.stringify(convention)}`,
      reasoning:
        `${house}'s standing convention, read back rather than re-invented per story. It is a template: whatever goes where \`{source}\` sits has to come from the journalist or from the article, never from this file.`,
    });
  }

  options.push({
    id: "none",
    origin: "none",
    value: UNATTRIBUTED_CREDIT,
    provenance: "no measurement — the article attributes nothing and nobody has said otherwise",
    reasoning:
      "Nobody named a source. Recording that as a value rather than leaving the question to be filled in is the whole point: the beat then says out loud that its data is unattributed, instead of looking as though it had been sourced.",
  });

  for (const option of options) option.prints = creditLine(option.value);

  const recommended = attributions.length > 0 ? "article-1" : "none";
  const recommendationReason =
    recommended === "none"
      ? `The article names no source — nothing in it attributes these figures to anyone, and ${house} publishing them is not the same as ${house} having compiled them. \`${UNATTRIBUTED_CREDIT}\` is the recorded answer for that, and the delivered artefact prints \`${UNATTRIBUTED_CREDIT_LINE}\` where a credit goes, so a desk reading a proof sees the gap instead of a plausible sentence nobody can check.`
      : `The article attributes these figures itself, in ${attributions.length === 1 ? "one sentence" : `${attributions.length} sentences`}. The first is offered back as written; correct it if the credit line should read differently from the copy.`;

  return {
    newsroom: newsroom?.name ?? null,
    attributions,
    options,
    recommended,
    recommendationReason,
    escape: "Something else — name the source and it is recorded exactly as you write it.",
  };
}
function documentParts(text) {
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/.exec(text);
  if (!match) throw new Error("STORYBOARD.md has no front matter");
  return {
    opening: match[1],
    frontmatter: match[2],
    closing: match[3],
    prose: match[4],
  };
}

function linesWithEndings(text) {
  const lines = text.match(/[^\r\n]*(?:\r\n|\n|$)/g) ?? [];
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function slotBlocks(lines) {
  const blocks = [];
  let inSlots = false;
  let start = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^slots:\s*(?:\r?\n)?$/.test(line)) {
      inSlots = true;
      continue;
    }
    if (inSlots && /^\s+-\s+/.test(line)) {
      if (start !== null) blocks.push({ start, end: index });
      start = index;
      continue;
    }
    if (inSlots && start !== null && /^\S/.test(line)) {
      blocks.push({ start, end: index });
      start = null;
      inSlots = false;
    }
  }
  if (start !== null) blocks.push({ start, end: lines.length });
  return blocks;
}

function fieldInBlock(lines, block, key) {
  for (let index = block.start; index < block.end; index += 1) {
    const pattern =
      index === block.start
        ? new RegExp(`^(\\s+-\\s+)${key}:(\\s*)(.*?)(\\r?\\n)?$`)
        : new RegExp(`^(\\s+)${key}:(\\s*)(.*?)(\\r?\\n)?$`);
    const match = pattern.exec(lines[index]);
    if (match) return { index, match };
  }
  return null;
}

function removeFrontmatterLine(lines, index) {
  const removedLastLine = index === lines.length - 1;
  lines.splice(index, 1);
  if (removedLastLine && lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\r?\n$/, "");
  }
}

function canonicalizeLegacyFormatKeys(text) {
  parseStoryboard(text); // fail closed before changing a conflicting dual-field document
  const parts = documentParts(text);
  const lines = linesWithEndings(parts.frontmatter);
  for (const block of slotBlocks(lines).reverse()) {
    const canonical = fieldInBlock(lines, block, "format");
    const legacy = fieldInBlock(lines, block, "genre");
    if (!legacy) continue;
    if (canonical) {
      // A slot may legally begin `- genre: web` and carry a matching `format: web` later. The
      // first line also owns the YAML list marker, so deleting it would turn the remaining fields
      // into loose indentation under `slots:` and silently erase the slot on the next parse.
      // Keep that list item in place as the canonical field and remove the later duplicate.
      if (legacy.index === block.start) {
        removeFrontmatterLine(lines, canonical.index);
        lines[legacy.index] = lines[legacy.index].replace(
          /^(\s+-\s+)genre:/,
          "$1format:",
        );
      } else {
        removeFrontmatterLine(lines, legacy.index);
      }
    } else {
      lines[legacy.index] = lines[legacy.index].replace(
        /^(\s+(?:-\s+)?)genre:/,
        "$1format:",
      );
    }
  }
  return `${parts.opening}${lines.join("")}${parts.closing}${parts.prose}`;
}

function encodedScalar(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  const text = String(value);
  return /^[A-Za-z0-9_.\/-]+$/.test(text) ? text : JSON.stringify(text);
}

function replaceTopLevel(lines, key, value) {
  const index = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  if (value === null) {
    if (index >= 0) lines.splice(index, 1);
    return;
  }
  const ending =
    index >= 0
      ? /\r\n$/.test(lines[index])
        ? "\r\n"
        : "\n"
      : lines.some((line) => /\r\n$/.test(line))
        ? "\r\n"
        : "\n";
  const next = `${key}: ${encodedScalar(value)}${ending}`;
  if (index >= 0) lines[index] = next;
  else {
    const slotsIndex = lines.findIndex((line) => /^slots:/.test(line));
    lines.splice(slotsIndex >= 0 ? slotsIndex : lines.length, 0, next);
  }
}

function replaceSlotField(lines, slotId, key, value) {
  const block = slotBlocks(lines).find((candidate) => {
    const id = fieldInBlock(lines, candidate, "id");
    return id && scalar(id.match[3]) === String(slotId);
  });
  if (!block)
    throw new Error(
      `STORYBOARD.md has no slot ${JSON.stringify(String(slotId))}`,
    );
  const existing = fieldInBlock(lines, block, key);
  if (value === null) {
    if (existing) removeFrontmatterLine(lines, existing.index);
    return;
  }
  const ending = existing
    ? (existing.match[4] ?? "")
    : lines.some((line) => /\r\n$/.test(line))
      ? "\r\n"
      : "\n";
  if (existing) {
    const prefix = existing.match[1];
    lines[existing.index] = `${prefix}${key}: ${encodedScalar(value)}${ending}`;
  } else {
    const insertedAtEnd = block.end === lines.length;
    if (
      insertedAtEnd &&
      block.end > 0 &&
      !/\r?\n$/.test(lines[block.end - 1])
    ) {
      lines[block.end - 1] += ending;
    }
    lines.splice(
      block.end,
      0,
      `    ${key}: ${encodedScalar(value)}${insertedAtEnd ? "" : ending}`,
    );
  }
}

async function replaceAtomically(path, text, { beforeRename } = {}) {
  const fileStat = await stat(path).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  const tempPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(tempPath, "wx", fileStat?.mode);
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await beforeRename?.(tempPath, path);
    await rename(tempPath, path);
  } finally {
    await handle?.close().catch(() => {});
    await rm(tempPath, { force: true });
  }
}

export function storyboardRevision(text) {
  return `sha256:${createHash("sha256")
    .update("splash-storyboard-revision-v1\0")
    .update(text)
    .digest("hex")}`;
}

async function readStableStoryboard(path) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > 2 << 20) {
    throw new Error("STORYBOARD.md must be a bounded real file, not a symlink");
  }
  const text = await readFile(path, "utf8");
  const after = await lstat(path);
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error("STORYBOARD.md changed while it was being read");
  }
  return text;
}

/** Write a complete storyboard through the same atomic, canonical boundary used by mutations. */
export async function writeStoryboardAtomic(path, text, hooks = {}) {
  const canonical = canonicalizeLegacyFormatKeys(text);
  const parsed = parseStoryboard(canonical);
  if (parsed.legacy)
    throw new Error(
      "the canonical storyboard writer produced a legacy format field",
    );
  await replaceAtomically(path, canonical, hooks);
  return parsed;
}

/**
 * Mutate recorded storyboard fields without reserializing the journalist's prose or unrelated
 * front matter. Any explicit mutation also upgrades every legacy slot key to `format`.
 */
function renderStoryboardMutation(original, { topLevel = {}, slot } = {}) {
  if (
    Object.prototype.hasOwnProperty.call(topLevel, "genre") ||
    Object.prototype.hasOwnProperty.call(slot?.fields ?? {}, "genre")
  ) {
    throw new Error(
      "genre is accepted only while reading a legacy STORYBOARD.md; write format instead",
    );
  }
  const slotFields = slot?.fields ?? {};
  const reopensProducerGate = ["medium", "format", "chosen"].some((field) =>
    Object.prototype.hasOwnProperty.call(slotFields, field),
  );
  if (
    reopensProducerGate &&
    (Object.prototype.hasOwnProperty.call(slotFields, "producer") ||
      Object.prototype.hasOwnProperty.call(slotFields, "datawrapperType"))
  ) {
    throw new Error(
      "medium, format, or treatment confirmation cannot also confirm a producer; close the post-treatment producer gate separately",
    );
  }
  const canonical = canonicalizeLegacyFormatKeys(original);
  const parts = documentParts(canonical);
  const lines = linesWithEndings(parts.frontmatter);
  for (const [key, value] of Object.entries(topLevel))
    replaceTopLevel(lines, key, value);
  if (slot) {
    if (slot.id === undefined || slot.id === null)
      throw new Error("a storyboard slot mutation needs slot.id");
    for (const [key, value] of Object.entries(slotFields))
      replaceSlotField(lines, slot.id, key, value);
    if (reopensProducerGate) {
      replaceSlotField(lines, slot.id, "producer", null);
      replaceSlotField(lines, slot.id, "datawrapperType", null);
    }
  }
  const next = `${parts.opening}${lines.join("")}${parts.closing}${parts.prose}`;
  const parsed = parseStoryboard(next);
  if (parsed.legacy)
    throw new Error(
      "the canonical storyboard mutation left a legacy format field",
    );
  return { next, parsed };
}

export async function mutateStoryboard(path, mutation = {}, hooks = {}) {
  const original = await readFile(path, "utf8");
  const { next, parsed } = renderStoryboardMutation(original, mutation);
  await replaceAtomically(path, next, hooks);
  return parsed;
}

/**
 * Graphical confirmation boundary. The adjacent cross-process lock stays held from the final stable
 * reread and revision comparison through the fsynced temporary write and atomic rename.
 */
export async function mutateStoryboardRevisioned(
  path,
  mutation = {},
  { expectedRevision, acquireLock = acquireTargetLock, beforeRename } = {},
) {
  if (!/^sha256:[0-9a-f]{64}$/.test(expectedRevision ?? "")) {
    throw new Error("expected storyboard revision is required");
  }
  if (basename(path) !== "STORYBOARD.md")
    throw new Error("the revisioned writer requires STORYBOARD.md");
  const lock = await acquireLock(path);
  try {
    const original = await readStableStoryboard(path);
    if (storyboardRevision(original) !== expectedRevision) {
      const conflict = new Error(
        "STORYBOARD.md changed since the selection view loaded",
      );
      conflict.code = "REVISION_CONFLICT";
      throw conflict;
    }
    const { next, parsed } = renderStoryboardMutation(original, mutation);
    await replaceAtomically(path, next, { beforeRename });
    return { ...parsed, revision: storyboardRevision(next) };
  } finally {
    await lock.release();
  }
}

// ONE argument, deliberately. Everything this gate reads is a resolved scalar already written into
// `STORYBOARD.md` by the phase that owns the check — nothing is re-derived here, so there is no
// argument a caller could omit to switch a rule off. The false green this closes was exactly that:
// `where.test.ts` called `checkStoryboard(meta)` with one argument inside the test that exists to
// prove the two gates agree, silencing the very checks it was meant to compare.
/**
 * GATE 2 CLOSES INTO TWO FILES, and this is the one nothing asked for until round six.
 *
 * `STORYBOARD.md` is the record of what will be DRAWN. `SUBJECTS.md` is the record of what was
 * found and NOT drawn — every angle the survey turned up, kept or dropped — written at movement 10
 * of the storyboard exchange by `recordSurveyedSubjects({ storyDir, subjects })`, while the angles
 * still exist. It is read back at the very end of the run and offered to the journalist.
 *
 * It was required at G4 and by no gate before it. `readSurveyedSubjects` threw for it at the
 * closing offer — after the storyboard, the palette, the component, the render, the approval and
 * the hand-over — and both gate-2 readers answered that the storyboard was closed. Six formats
 * reported that independently across two rounds (U, V, W, Y, AC and AD), each working around it by
 * writing the file at delivery from memory of a survey that had already happened, which is the
 * lives-in-a-conversation-and-dies-with-it failure the file exists to prevent, happening around the
 * file itself. It is the most-reported defect in this project's history.
 *
 * `null` when the survey has been recorded; otherwise the one line the gate refuses in, naming the
 * file, the movement and the call — a refusal that does not name what it wants is how six runs each
 * had to rediscover the same call.
 */
export async function surveyGap(storyDir) {
  const recorded = await readFile(join(storyDir, "SUBJECTS.md"), "utf8").catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (recorded !== null) return null;
  return SURVEY_GAP;
}

// The gate contract itself lives in `./gate-contract.mjs`, carried verbatim into every skill that
// reads a storyboard. Re-exported here so this module's callers keep one import.
export {
  RECORDED_CLAIM_SHAPES,
  REQUIRED_SCALARS,
  REQUIRED_SLOT_FIELDS,
  EXPORT_SIZES,
  SIZED_FORMATS,
  sizeGap,
  ASSEMBLING_FORMATS,
  assemblyGap,
  UNRECORDED,
  parseStoryboard,
  recordedClaimGaps,
  recordedClaimOf,
  checkStoryboard,
  openGate,
  SURVEY_GAP,
} from "./gate-contract.mjs";
