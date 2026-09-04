// twin/skills/storyboard/scripts/gate-contract.mjs
// THE GATE CONTRACT — what a STORYBOARD.md must carry before gate 2 is closed, and the words each
// gap is refused in. ONE definition, CARRIED VERBATIM into every skill that reads the storyboard
// (`splash/scripts/where.mjs`, `analyst/scripts/build-data.mjs`), never re-implemented there.
//
// WHY A CARRIED FILE AND NOT AN IMPORT. A skill directory installs on its own and imports nothing
// across a skill boundary at runtime (`splash/test/no-cross-skill-imports.test.ts`). The previous
// answer to that constraint was two hand-written readers held together by a test that compared
// their refusals string for string — and on 2026-09-04 that test was green while `whereIs` waved
// through a storyboard `checkStoryboard` refused four ways (a stray field on a web slot, an
// `assembles` list of one, a half-recorded `claimShape`): none of those rules had been written
// into the second reader. Agreement between two people writing the same thing twice is a hope.
// Agreement between two byte-identical files is a comparison, and `splash/test/carried-copies.test.ts`
// makes it.
//
// EDIT THIS FILE HERE, in `storyboard/scripts/`, then copy it over every carried copy. The copies
// open with a `// CARRIED VERBATIM from …` line and are otherwise identical; the walker reddens on
// any other difference. This file imports `./producer-gate.mjs` (and through it
// `../references/datawrapper-chart-types.json`), which are carried alongside it.
//
// EVERY rule here reads a RECORDED SCALAR. The expensive semantic checks (`groundTakeaway` at G1,
// `formatGap`/`capabilityGap` at G2b) run once, in the phase that owns them, and write their verdict
// into STORYBOARD.md; this contract reads the verdict. That is what lets a reader with no profile
// and no capability probe reach the same answer as the one that has both.

import { producerGap } from "./producer-gate.mjs";

/** The shapes G1 offers for the confirmed takeaway. Lives here (not in `ground-claim.mjs`) so that
 *  a carried reader never needs the 4,000-line grounder to validate a recorded answer. */
export const RECORDED_CLAIM_SHAPES = ["maximum", "minimum", "comparison", "total", "none"];

const HAND = [
  "subject",
  "comparison",
  "limits",
  "placement",
  "credit",
  "effectiveDate",
];



// Every story-level scalar Gate 2 requires. `where.mjs` exports the same list, spelled
// independently — the deliberate duplicate, cross-checked by `splash/test/where.test.ts`,
// which GENERATES its fixtures from the union of both copies so a field added to either side
// produces its own fixture the moment it lands.
//
// `language` joined the list at round-four finding 9, and it is the cheapest field on it: the
// journalist answers it in one word, at the moment their own article is in front of everybody.
// It used to be required by `deliver` alone and asked by nobody, so a story could pass every gate
// and meet the question at the delivery call — after the storyboard, the palette, the component,
// the render and the approval. `exchange.md`'s ruling R4 exists because a hand-over came out in
// English on a French story for want of it, and `stories/milan-cortina-la-glace-des-sponsors` sat
// in this tree as a French story whose gate-2 verdict was `[]` and whose hand-over threw.
// `reference` is NOT here — issue #40. The reference loop was a compulsory movement between the
// size gate and the palette, terminating in a required scalar Gate 2 could not close without. Its
// own intent is about INSPIRATION ("the model gains a concrete target, the journalist gains
// vocabulary"), and inspiration is something a journalist reaches for, not a toll gate between
// choosing a size and choosing a colour. The tell was its answer vocabulary: the documented
// recording for "neither appealed" was `none — both rejected`, and the doctrine had to argue that
// this is "a fact, not a loss". A movement that must defend its own null answer should not be
// mandatory. It is now offered at the treatment decision, and recorded when it is taken.
export const REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "language"];

// Every field a slot must carry before Gate 2 can close on it. `size` is conditional — see
// EXPORT_SIZES / SIZED_FORMATS below — but it stays in this list because the list is what the parity
// test generates its fixtures from, and a field removed from it is a field nobody tests.
//
// `assembles` is deliberately NOT here: it is the optional list a VEHICLE format records — which
// media, in which order, behind one narrative — not a field every slot owes, and `assemblyGap` owns
// it entirely. Its fixtures are written out in `splash/test/where.test.ts` and compared string for
// string against `where.mjs`'s copy, because a field no constant implies is a field no generator
// can reach.
// `intent` is the record that the chooser was consulted — issue #48. Treatment selection was the
// only major decision here with nothing written down, while the external reference lookup had its
// own gate and a required scalar; an agent optimises for what is checked, and one did, proposing a
// Scatter that `chart-choice.md`'s own move-down column removes. ONE field, because naming the
// narrow intent is step 1 of that guide and the step that would have caught it.
export const REQUIRED_SLOT_FIELDS = [
  "id",
  "proves",
  "medium",
  "format",
  "size",
  "reachable",
  "intent",
  "chosen",
];

// Ruling R2, read literally: landscape for YouTube and article web, portrait for stories, square
// for social posts. Charts and maps alike, one model. The pixel dimensions are NOT here — they are
// each craft skill's own `scripts/sizes.mjs`, and a gate has no business knowing them; what the
// gate owns is whether the journalist chose a name the toolchain exports.
export const EXPORT_SIZES = ["landscape", "square", "portrait"];

// The formats that HAVE an export size, and therefore the ones a size is required for. `web` is
// deliberately absent and that absence is R2's other half: web is not a fourth size, it fills
// whatever container the CMS gives it, like an embed component. `scrolly` is absent for a related
// but distinct reason — a scroll-driven piece has no single exported frame at all.
//
// This is why the requirement is conditional rather than flat. Before this, `size` was required of
// EVERY slot, so a correct `format: web` slot could not close gate 2 without naming a size that will
// never be used, and a wrong one closed it by naming one. Both are the same defect: the toolchain
// asking a question whose answer it will ignore.
export const SIZED_FORMATS = ["static", "video"];

/**
 * `null` when this FORMAT and this SIZE go together; otherwise the one line the gate refuses in.
 *
 * The message text below is duplicated VERBATIM in `splash/scripts/where.mjs`, which reads
 * gate 2 independently and must not be able to disagree with this file about what it read. That
 * duplication is deliberate and it is cross-checked by `splash/test/where.test.ts`, which
 * compares the two gates' size verdicts string for string — the two gates diverging once already
 * cost this project a gate reporting `production` on a storyboard the other gate was refusing
 * (FEEDBACK-2026-08-10.md, A7/A14).
 */
export function sizeGap(medium, format, size, id) {
  const sizes = recorded(size);
  // A PHOTO ESSAY HAS NO FIXED EXPORT SIZE. `image/static` is a "sized" format by the format table,
  // so gate 2c required one of landscape/square/portrait — and `image-beat` reads none of them,
  // because its frame HEIGHT is derived from its own content: how many photographs, how far each
  // caption wraps. `imageBeatLayout` says so in its own header. Asking for a size nothing can
  // honour is the #55 defect in a second place, so the honest fix is to stop asking rather than to
  // invent a fourth variable-height row nobody has decided on.
  if (medium === "image")
    return sizes.length > 0
      ? `slot ${id}: an image beat takes no size — a photo essay is exactly as tall as its own captions make it, so leave the field out`
      : null;
  const takesASize = SIZED_FORMATS.includes(format);
  if (!takesASize && sizes.length > 0)
    return `slot ${id}: a ${format} beat takes no size — it fills the container it is given, so leave the field out; there is no "fluid" size`;
  if (!takesASize) return null;
  if (sizes.length === 0) return `slot ${id}: size is missing — gate 2c never closed`;
  const unknown = sizes.find((one) => !EXPORT_SIZES.includes(one));
  if (unknown !== undefined)
    return `slot ${id}: size ${JSON.stringify(unknown)} is not one this toolchain exports — ${EXPORT_SIZES.join(", ")}`;
  if (new Set(sizes).size !== sizes.length)
    return `slot ${id}: the same size is recorded twice — a slot exports each frame once`;
  return null;
}

// THERE IS NO `destination` FIELD, AND NO PRINT SIZE — issue #59, decided 2026-09-04. Every export
// is a screen artefact at one of the three sizes above; a printed edition re-lays it out
// downstream. A `destination: screen | print` field used to be asked at G2c and validated here,
// and nothing downstream ever read it — a recorded answer nobody reads is the #55 defect with a
// different name, so the question was deleted rather than documented. A slot that still carries
// the line (one frozen story does) is ignored, not refused.

// The formats that carry SEVERAL MEDIA behind one narrative, and therefore the only ones a slot may
// record an `assembles` list on. `where.mjs` spells this out independently, exactly as it does
// `SIZED_FORMATS`, and the two readings are compared string for string.
//
// `scrolly` is the whole list, and that is the point: a scroll-driven piece is a VEHICLE, not a
// fourth chart format. Round six, beat AC — a chart, then two photographs, then a locator map, one
// beat — recorded `medium: chart` and wrote underneath that this "is a compromise, not a reading",
// because a slot carried exactly one medium and the record could not say what the beat IS.
export const ASSEMBLING_FORMATS = ["scrolly"];

/**
 * A recorded field as the LIST it stands for: one answer is a list of one, an absent field is
 * empty, and an inline `[]` is empty rather than truthy — which is what it used to be, so
 * `medium: []` satisfied a presence check written as `if (!value)`.
 */
export function recorded(value) {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined || value === "" ? [] : [value];
}

/**
 * ONE SLOT CARRYING SEVERAL MEDIA — `null` when this slot's `assembles` agrees with its `medium`
 * and its format, otherwise the one line the gate refuses in. The message text is duplicated
 * VERBATIM in `splash/scripts/where.mjs` and cross-checked by `splash/test/where.test.ts`, for the
 * same reason `sizeGap`'s is.
 *
 * The list is the ORDER THE READER MEETS THE MEDIA and it opens on the slot's own `medium`, so
 * `medium` stays the single key production dispatches on and stops being a compromise. A slot is
 * still ONE claim, ONE beat directory, ONE brief, ONE approval and ONE delivery: splitting beat AC
 * into three slots would have been three of each for one visual.
 */
export function assemblyGap(medium, format, assembles, id) {
  const media = recorded(assembles);
  if (media.length === 0) return null;
  if (!ASSEMBLING_FORMATS.includes(format))
    return `slot ${id}: a ${format} beat draws ONE medium — assembles belongs to a format that carries several behind one narrative (${ASSEMBLING_FORMATS.join(", ")}); anything else is one slot per medium`;
  if (media.length < 2)
    return `slot ${id}: assembles lists one medium, which says nothing the medium field does not — list every medium the reader meets, or leave the field out`;
  if (new Set(media).size !== media.length)
    return `slot ${id}: the same medium is recorded twice in assembles — the list is the order the reader meets them, not a tally`;
  if (media[0] !== medium)
    return `slot ${id}: assembles opens on ${JSON.stringify(media[0])} and this slot's medium is ${JSON.stringify(medium)} — the list is the order the reader meets them, so its first entry is the medium this beat is produced as`;
  return null;
}

// The closed vocabulary of `grounding:`. `contradicted` is deliberately NOT a closing value: a
// takeaway the data refutes is corrected, or the journalist records an override WITH A REASON.
// Silence and an override must not look alike, which is the same rule ground-claim.mjs holds.
const GROUNDING_VERDICTS = ["supported", "unverifiable"];
const OVERRIDE_RE = /^overridden\s*[—–-]\s*(.+)$/;

function isResolvedGrounding(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (GROUNDING_VERDICTS.includes(text)) return true;
  const override = OVERRIDE_RE.exec(text);
  return Boolean(override && override[1].replace(/^["']|["']$/g, "").trim());
}

// The wording each missing scalar and slot field is refused in. A field with no entry falls back to
// "<field> is missing" — which is what the six HAND fields have always read as.
const SCALAR_GAP = {
  grounding: "grounding is missing — the takeaway was never grounded at G1",
  reference:
    "reference is missing — the reference loop never closed into a field",
  language:
    "language is missing — nobody confirmed which language this story's own delivery is written in (a code, `fr` or `de-CH`, chosen among NEWSROOM.md's `languages` against the article itself)",
};

// The shape of a language tag — `fr`, `de-CH`, `en-GB`. Spelled here and again in `where.mjs`, for
// the same reason `isResolvedGrounding` is: two readings of one rule, cross-checked by a test that
// generates its fixtures from both lists, never unified by an import across a skill boundary.
// It checks the SHAPE only. What a tag MEANS — whether a delivery can be written in it, and what to
// say when it cannot — stays where it has always been, in `deliver`'s own `resolveScaffoldLanguage`.
// A gate that started deciding that would be a gate refusing a language the journalist correctly
// chose, over a translation gap that is ours.
const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

function isLanguageTag(value) {
  return typeof value === "string" && LANGUAGE_TAG.test(value.trim());
}

// The scalars whose VALUE is checked, not merely their presence.
const SCALAR_VOCABULARY = { grounding: isResolvedGrounding, language: isLanguageTag };
const SCALAR_VOCABULARY_GAP = {
  grounding: (value) =>
    `grounding ${JSON.stringify(value)} is not a resolved verdict — expected supported, unverifiable, or overridden — "<reason>"`,
  language: (value) =>
    `language ${JSON.stringify(value)} is not a language code (fr, de-CH, en) — STORYBOARD.md records the code, not the language's name`,
};

// Gate 2's three sub-gates, each recorded as it closes: the KIND (2a), then the format within that
// kind (2b), then the size within that format (2c). A slot naming none of them is a slot the
// journalist was never asked about — the run pinned "chart / static" in one undifferentiated move
// and then offered three variants of the same bar.
const SLOT_SUB_GATE = { medium: "2a", format: "2b", size: "2c" };

// `reachable` carries the recorded verdict of formatGap + capabilityGap, run once at G2b by the
// phase that owns them. The gate reads the record; it never re-runs the check, because the other
// gate structurally cannot.
// `unrecorded` is what a slot written before this field existed carries. Sixteen stories were
// already delivered and nobody can say now what intent was named for them; inventing one would be
// the dishonesty the field exists to prevent. Same idiom as `TYPEFACE.md`'s `origin: default`.
export const UNRECORDED = "unrecorded";

const SLOT_VOCABULARY = { reachable: (value) => value === "yes" };

function slotGap(field, id) {
  if (field === "id")
    return "a provisional slot has no id — gate 2a cannot start";
  if (field === "proves")
    return `slot ${id ?? "?"}: proves is missing — its confirmed claim was never persisted`;
  if (field === "chosen")
    return `slot ${id}: nothing chosen — gate 2 is not closed`;
  if (field === "reachable")
    return `slot ${id}: this medium and format were never confirmed reachable`;
  if (field === "intent")
    return (
      `slot ${id}: no narrow intent was named — step 1 of references/chart-choice.md. ` +
      `"Show association" and "show departure from an expected ordering" reach different rank-1 ` +
      `forms from the same two columns of data, and it is a question a journalist answers ` +
      `instantly and an agent gets wrong.`
    );
  const subGate = SLOT_SUB_GATE[field];
  return subGate
    ? `slot ${id}: ${field} is missing — gate ${subGate} never closed`
    : `slot ${id}: ${field} is missing`;
}

// Bare (unquoted) YAML null sentinels. `twin/skills/splash/scripts/where.mjs` refuses these
// same two raw tokens as a confirmed takeaway (isMissingScalar) — this parser has to resolve
// them to a real missing value too, or the two gates would disagree about whether G1 has closed.
// A *quoted* "null" or "~" is a literal string, not the sentinel, so this only fires on the bare form.
function isNullSentinel(value) {
  return value === "null" || value === "~";
}

// Splits an inline array's inner text on commas that are NOT inside a quoted element, so a
// treatment name that itself contains a comma (`"a, b"`) stays one element instead of being torn
// in two. A naive `.split(",")` would silently fragment `["a, b", "c"]` into three candidates
// (`"a"`, `"b"`, `"c"`), which then spuriously fails membership checks against a `chosen` value
// quoted verbatim from the source array.
function splitArrayItems(inner) {
  const items = [];
  let current = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items;
}

export function scalar(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return splitArrayItems(value.slice(1, -1))
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (isNullSentinel(value)) return null;
  return value.replace(/^["']|["']$/g, "");
}

export function parseStoryboard(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error("STORYBOARD.md has no front matter");
  const meta = {};
  let slots = null;
  let slot = null;

  function assignUnique(target, key, value, label) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`${label} has duplicate key ${JSON.stringify(key)}`);
    }
    target[key] = value;
  }

  for (const line of match[1].split(/\r?\n/)) {
    if (/^slots:\s*$/.test(line)) {
      if (Object.prototype.hasOwnProperty.call(meta, "slots")) {
        throw new Error('STORYBOARD.md has duplicate top-level key "slots"');
      }
      slots = [];
      meta.slots = slots;
      slot = null;
      continue;
    }
    if (slots && /^\s+-\s+/.test(line)) {
      slot = {};
      slots.push(slot);
      const first = /^\s+-\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (first)
        assignUnique(slot, first[1], scalar(first[2]), "STORYBOARD.md slot");
      continue;
    }
    if (slot && /^\s{4,}[A-Za-z]+:/.test(line)) {
      const pair = /^\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      assignUnique(slot, pair[1], scalar(pair[2]), "STORYBOARD.md slot");
      continue;
    }
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (pair) {
      assignUnique(meta, pair[1], scalar(pair[2]), "STORYBOARD.md");
      slot = null;
    }
  }
  let legacy = false;
  for (const [index, parsedSlot] of (meta.slots ?? []).entries()) {
    const hasFormat = Object.prototype.hasOwnProperty.call(
      parsedSlot,
      "format",
    );
    const hasLegacyFormat = Object.prototype.hasOwnProperty.call(
      parsedSlot,
      "genre",
    );
    if (!hasLegacyFormat) continue;
    legacy = true;
    const label = parsedSlot.id ?? String(index + 1);
    if (hasFormat && parsedSlot.format !== parsedSlot.genre) {
      throw new Error(
        `slot ${label}: conflicting publication format fields: format is ${JSON.stringify(parsedSlot.format)} but legacy genre is ${JSON.stringify(parsedSlot.genre)}`,
      );
    }
    if (!hasFormat) parsedSlot.format = parsedSlot.genre;
    delete parsedSlot.genre;
  }
  const slotIds = new Set();
  for (const parsedSlot of meta.slots ?? []) {
    if (!parsedSlot.id) continue;
    const id = String(parsedSlot.id);
    if (slotIds.has(id))
      throw new Error(
        `STORYBOARD.md has duplicate slot id ${JSON.stringify(id)}`,
      );
    slotIds.add(id);
  }
  return { meta, prose: match[2], legacy };
}


// GATE 2 CLOSES INTO TWO FILES. STORYBOARD.md records what will be DRAWN; SUBJECTS.md records what
// the survey found and did NOT draw, written at movement 10 while the angles still exist. Each
// reader checks the file itself; the refusal is this one sentence, so a reader that cannot find the
// file names the file, the movement and the call.
export const SURVEY_GAP =
  "the survey of the article's other angles: no SUBJECTS.md in this story's own directory. It " +
  "belongs to movement 10 of the storyboard exchange, where the angles still exist — call " +
  "recordSurveyedSubjects({ storyDir, subjects }) there with every angle the survey found, kept " +
  "or dropped. An article that yielded nothing else records the EMPTY survey (subjects: []): " +
  '"there was nothing else" is an answer, and an answer is written down like any other.';

/**
 * THE ONE QUESTION THAT MAKES A CLAIM'S SHAPE RECORDED RATHER THAN GUESSED — round six, task LANG.
 *
 * Every superlative pattern in `ground-claim.mjs` is a regex written by hand against one language
 * at a time, because a superlative is GRAMMAR — `أكثر من غيرها`, `the most`, `le plus`,
 * `najwięcej`, `το περισσότερο` — and no label table gives morphology and word order. So G1 asks
 * the journalist one more question about the takeaway they just confirmed: is this a maximum, a
 * minimum, a comparison between two named things, a total, or none of those — and about which
 * column. A human reading their own sentence is language-independent by construction.
 *
 * FIVE OPTIONAL SCALARS, flat, in the shape every other field in this front matter already takes:
 *
 *     claimShape: "maximum"                  one of RECORDED_CLAIM_SHAPES
 *     claimColumn: "łóżka_szpitalne"          required by every shape but "none"
 *     claimEntity: "Mazowieckie"              required by maximum, minimum and comparison
 *     claimVersus: "Śląskie"                  required by comparison only
 *     claimDirection: "greater"               required by comparison only — "greater" or "less"
 *
 * ABSENT IS A COMPLETE ANSWER, and it is the default: a storyboard that records none of these
 * closes gate 2 exactly as it did before, and `groundTakeaway` behaves exactly as it did before.
 * What is refused is a HALF-recorded answer — a shape with no column, a comparison with only one
 * side — because that is the one state in which a reader cannot tell whether the journalist was
 * asked and declined or was never asked at all, which is the silence this whole round is about.
 */
export function recordedClaimGaps(meta) {
  const fields = ["claimShape", "claimColumn", "claimEntity", "claimVersus", "claimDirection"];
  const given = fields.filter((f) => recorded(meta[f]).length > 0);
  if (given.length === 0) return [];

  const errors = [];
  const shape = String(meta.claimShape ?? "").trim().toLowerCase();
  if (!RECORDED_CLAIM_SHAPES.includes(shape)) {
    errors.push(
      `claimShape ${JSON.stringify(meta.claimShape ?? null)} is not one of the shapes G1 offers — expected ${RECORDED_CLAIM_SHAPES.join(", ")}`,
    );
    return errors;
  }
  if (shape === "none") {
    // "None of those" is an answer about the whole takeaway, so a column or an entity beside it is
    // a half-erased earlier answer, not a narrower one.
    const extra = given.filter((f) => f !== "claimShape");
    if (extra.length > 0)
      errors.push(`claimShape "none" records no claim, so ${extra.join(", ")} should be left out`);
    return errors;
  }
  if (recorded(meta.claimColumn).length === 0)
    errors.push(`claimShape "${shape}" was recorded without claimColumn — which column the claim is about is half the answer`);
  if (shape !== "total" && recorded(meta.claimEntity).length === 0)
    errors.push(`claimShape "${shape}" was recorded without claimEntity — which row the claim is about is half the answer`);
  if (shape === "comparison") {
    if (recorded(meta.claimVersus).length === 0)
      errors.push('claimShape "comparison" was recorded without claimVersus — a comparison between two named things needs the second one');
    const direction = String(meta.claimDirection ?? "").trim().toLowerCase();
    if (direction !== "greater" && direction !== "less")
      errors.push(`claimDirection ${JSON.stringify(meta.claimDirection ?? null)} is not "greater" or "less" — which of the two the takeaway puts ahead is the journalist's sentence, not a guess this toolchain makes`);
  } else {
    const stray = ["claimVersus", "claimDirection"].filter((f) => recorded(meta[f]).length > 0);
    if (stray.length > 0)
      errors.push(`claimShape "${shape}" is not a comparison, so ${stray.join(", ")} should be left out`);
  }
  return errors;
}

/** The recorded answer as `groundTakeaway` takes it — `null` when the journalist recorded nothing,
 *  which is what keeps the guess the default. */
export function recordedClaimOf(meta) {
  if (recorded(meta?.claimShape).length === 0) return null;
  return {
    shape: String(meta.claimShape).trim().toLowerCase(),
    column: meta.claimColumn ?? null,
    entity: meta.claimEntity ?? null,
    versus: meta.claimVersus ?? null,
    direction: meta.claimDirection ?? null,
  };
}

export function checkStoryboard(meta) {
  const errors = [];

  // Driven off REQUIRED_SCALARS rather than a hand-written sequence of `if`s, so the exported
  // constant IS the rule — remove a field from it and the gate stops requiring it, which is what
  // makes the parity test's generated fixtures a real guard rather than a decoration.
  for (const field of REQUIRED_SCALARS) {
    const value = meta[field];
    if (!value) {
      errors.push(SCALAR_GAP[field] ?? `${field} is missing`);
      continue;
    }
    const vocabulary = SCALAR_VOCABULARY[field];
    if (vocabulary && !vocabulary(value))
      errors.push(SCALAR_VOCABULARY_GAP[field](value));
  }

  errors.push(...recordedClaimGaps(meta));

  const slots = meta.slots ?? [];
  if (slots.length === 0) errors.push("no slot: nothing would be produced");

  for (const slot of slots) {
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];

    for (const field of REQUIRED_SLOT_FIELDS) {
      // `size` is not a flat requirement — `sizeGap` owns it entirely, below, because whether it is
      // required at all depends on the format.
      if (field === "size") continue;
      const value = slot[field];
      // An inline `[]` parses to an EMPTY ARRAY, and an empty array is truthy — so `medium: []`
      // walked through a bare `if (!value)` as an answered field. `recorded` is the one reading of
      // what a field actually recorded, shared with `sizeGap` and `assemblyGap`.
      if (recorded(value).length === 0) {
        errors.push(slotGap(field, slot.id));
        continue;
      }
      // Every required field but `size` takes ONE answer. `size` is the exception on purpose — one
      // argument can ship as several frames — and `assembles` is the other list this contract
      // knows; a list anywhere else is a slot trying to be two slots.
      if (Array.isArray(value)) {
        errors.push(`slot ${slot.id}: ${field} records a list where this contract takes one answer`);
        continue;
      }
      const vocabulary = SLOT_VOCABULARY[field];
      if (vocabulary && !vocabulary(value))
        errors.push(slotGap(field, slot.id));
    }

    const gap = sizeGap(slot.medium, slot.format, slot.size, slot.id);
    if (gap) errors.push(gap);

    const assembly = assemblyGap(slot.medium, slot.format, slot.assembles, slot.id);
    if (assembly) errors.push(assembly);

    // A chosen treatment is only a real choice if it was verifiably picked from a shown list —
    // that is what stops the exchange from being disguised parameter collection (references/
    // exchange.md, movement ⑩). A slot with `chosen` set but no `candidates` ever listed means the
    // proposal step was skipped, not that there was nothing to check membership against — so
    // this is malformed, not legitimate, and refuses on its own, distinct from a mismatch.
    if (!slot.chosen) continue;
    if (candidates.length === 0) {
      errors.push(
        `slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} but no candidates were listed`,
      );
    } else if (!candidates.includes(slot.chosen)) {
      errors.push(
        `slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} is not among its candidates`,
      );
    } else {
      const gap = producerGap(slot);
      if (gap) errors.push(gap);
    }
  }
  return errors;
}

/**
 * WHICH GATE IS OPEN NEXT — `null` when gate 2 is closed on every slot, otherwise the first gate
 * the journalist has to be asked at, in the order the exchange asks: G1 (the claim's shape), then
 * for every slot G2a (kind), G2b (format, reachability), G2c (size); then, only once every slot has
 * its triple, G2-intent, G2-treatment and G2-producer. Asking slot 1 for its intent inside the
 * per-slot loop would jump slot 2's medium, so the later gates are separate passes.
 *
 * `awaiting` is the word `whereIs` reads aloud ("the journalist must provide …"). It is a decision,
 * not a field name, wherever the two differ.
 */
export function openGate(meta) {
  if (REQUIRED_SCALARS.some((field) => recorded(meta[field]).length === 0)) return null;
  if (recordedClaimGaps(meta).length > 0) return { gate: "G1", awaiting: "claim shape" };
  const slots = meta.slots ?? [];
  if (slots.length === 0) return { gate: "G2a", awaiting: "slot" };

  for (const [index, slot] of slots.entries()) {
    const slotId = String(slot.id ?? index + 1);
    if (recorded(slot.id).length === 0) return { gate: "G2a", awaiting: "id", slotId };
    if (recorded(slot.proves).length === 0) return { gate: "G2a", awaiting: "proves", slotId };
    if (recorded(slot.medium).length === 0) return { gate: "G2a", awaiting: "medium", slotId };
    if (assemblyGap(slot.medium, slot.format, slot.assembles, slot.id))
      return { gate: "G2a", awaiting: "assembles", slotId };
    if (recorded(slot.format).length === 0) return { gate: "G2b", awaiting: "format", slotId };
    if (slot.reachable !== "yes") return { gate: "G2b", awaiting: "reachability", slotId };
    const size = sizeGap(slot.medium, slot.format, slot.size, slot.id);
    if (size) return { gate: "G2c", awaiting: /takes no size/.test(size) ? "size-removal" : "size", slotId };
  }
  for (const [index, slot] of slots.entries()) {
    if (recorded(slot.intent).length === 0)
      return { gate: "G2-intent", awaiting: "intent", slotId: String(slot.id ?? index + 1) };
  }
  for (const [index, slot] of slots.entries()) {
    const slotId = String(slot.id ?? index + 1);
    if (!slot.chosen || !Array.isArray(slot.candidates) || !slot.candidates.includes(slot.chosen))
      return { gate: "G2-treatment", awaiting: "treatment", slotId };
    if (producerGap(slot)) return { gate: "G2-producer", awaiting: "producer", slotId };
  }
  return null;
}
