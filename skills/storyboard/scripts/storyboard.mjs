// STORYBOARD.md is YAML front matter (a narrow, dependency-free subset) plus free prose. Only the
// front matter is machine-checked; the prose beneath it is what the journalist actually reads.

import { groundTakeaway, RECORDED_CLAIM_SHAPES } from "./ground-claim.mjs";
import { formatGap } from "./format-catalog.mjs";
import { capabilityGap } from "./capability-gap.mjs";
import { producerGap } from "./producer-gate.mjs";
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

const HAND = [
  "subject",
  "comparison",
  "limits",
  "placement",
  "credit",
  "effectiveDate",
];

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
 * COPIED, byte for byte, into `deliver/scripts/format-handover.mjs` and into
 * `dw-beat/scripts/metadata-spec.mjs`, and walked by `splash/test/guard-copies-parity.test.ts`:
 * the phase that RECORDS the answer, the phase that HANDS IT OVER and the producer that composes
 * a delegated chart's own source line must not be able to disagree about what the answer means.
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
 * COPIED, byte for byte, into `deliver/scripts/format-handover.mjs` and into
 * `dw-beat/scripts/metadata-spec.mjs`; see `isUnattributedCredit`.
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
 * The credit options a journalist reads and answers — the same movement `proposeTypeface` runs for
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

// WHERE A PUBLISHED GRAPHIC LANDS — the two answers gate 2c takes for a static beat, and the one
// format that has to be asked. `where.mjs` spells both out independently, exactly as it does
// `SIZED_FORMATS`, and `destinationGap` below is walked byte for byte across the two files.
//
// `static` is the whole of `DESTINED_FORMATS`, and that is a measurement rather than a shortlist: a
// web page, a video and a scrollytelling page are read on a display and cannot be run off on a
// sheet, so their destination follows from the format alone. Only "Static / print" — half gate 2b's
// own label — is two places.
const PUBLICATION_DESTINATIONS = ["screen", "print"];
const DESTINED_FORMATS = ["static"];
export { PUBLICATION_DESTINATIONS, DESTINED_FORMATS };

/**
 * WHERE THIS STATIC BEAT IS PUBLISHED — `null` when the slot's `destination` agrees with its
 * format, otherwise the one line the gate refuses in.
 *
 * ROUND SEVEN, defect D11. Gate 2b's own label is "Static / print", and that slash is a QUESTION
 * nothing in this toolchain ever asked: a static graphic lands on a screen (an embedded image in
 * the article) or on paper (the printed edition), and the two are not the same delivery.
 * `stories/stress-ad-polish-hospital-beds` is the beat that paid for the guess — its own gate turn
 * says "because the destination is a printed page", in prose nothing reads, and what it shipped
 * was measured for a screen.
 *
 * ABSENCE IS AN ANSWER, NOT A GAP, and this is the half that makes the field usable at all. Six
 * `format: static` slots across five frozen stories were recorded before this field existed;
 * requiring it would redden all six and teach nothing. A slot that never recorded the fact stays
 * valid here and says it does not know it downstream, where the fact is actually needed — a
 * default in this file would be a guess written into the record, which is the defect itself.
 *
 * A `web`, `video` or `scrolly` beat has no second destination, so the field is refused there
 * rather than tolerated as decoration — the same shape `sizeGap` holds for a format with no
 * exported frame.
 */
export function destinationGap(format, destination, id) {
  const takesADestination = DESTINED_FORMATS.includes(format);
  const destinations = recorded(destination);
  if (destinations.length === 0) return null;
  if (!takesADestination)
    return `slot ${id}: a ${format} beat is read on a display, so it records no destination — leave the field out`;
  if (destinations.length > 1)
    return `slot ${id}: destination records a list where this contract takes one answer — a beat published in two places is measured twice, which is two records and not one field holding both`;
  const [only] = destinations;
  if (!PUBLICATION_DESTINATIONS.includes(only))
    return `slot ${id}: destination ${JSON.stringify(only)} is not one this toolchain publishes to — ${PUBLICATION_DESTINATIONS.join(", ")}`;
  return null;
}

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
function recorded(value) {
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

function scalar(raw) {
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
  // A NEW FORMAT UNSAYS WHERE THE OLD ONE WAS PUBLISHED. `destination` — `screen` or `print` — is a
  // fact about a `static` beat and about nothing else: a `web`, `video` or `scrolly` beat has no
  // second destination, and a beat that was static and is now web carries an answer to a question
  // its format no longer asks. Left standing it is refused loudly by both gates, which is better
  // than being believed, but a stale answer nobody wrote is still a stale answer. So a format change
  // clears it, exactly as it clears the producer — and, exactly as with the producer, a mutation
  // that sets the format AND the destination in one call is refused: they are two gate turns
  // (2b and 2c), and the destination is only knowable once the format is recorded.
  const reopensDestination = Object.prototype.hasOwnProperty.call(slotFields, "format");
  if (reopensDestination && Object.prototype.hasOwnProperty.call(slotFields, "destination")) {
    throw new Error(
      "a format confirmation cannot also record where the beat is published; close gate 2c separately",
    );
  }
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
    if (reopensDestination) replaceSlotField(lines, slot.id, "destination", null);
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
  return (
    "the survey of the article's other angles: no SUBJECTS.md in this story's own directory. It " +
    "belongs to movement 10 of the storyboard exchange, where the angles still exist — call " +
    "recordSurveyedSubjects({ storyDir, subjects }) there with every angle the survey found, kept " +
    "or dropped. An article that yielded nothing else records the EMPTY survey (subjects: []): " +
    '"there was nothing else" is an answer, and an answer is written down like any other.'
  );
}

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

    const destination = destinationGap(slot.format, slot.destination, slot.id);
    if (destination) errors.push(destination);

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
