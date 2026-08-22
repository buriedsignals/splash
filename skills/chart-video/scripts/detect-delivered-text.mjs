// WHAT A DELIVERED ARTEFACT IS ALLOWED TO SAY — ROUND-FOUR FINDINGS 11 AND 15.
//
// Two readings of one thing: the text a delivery actually puts in front of a reader. Both are
// measured on the files under `stories/<story>/export/<outputId>/` — the hand-over a newsroom keeps
// and pastes from, and the vector or page it ships — never on the component that wrote them, because
// what a render MEANT to emit and what a reader receives have already diverged in this tree twice.
//
// FINDING 11 — AN INVENTED SOURCE, PRINTED ON THREE DELIVERED ARTEFACTS. All three of
// `stress-p-transport-ridership`'s delivered beats carry "Source: city network figures for 2025,
// compiled by Buried Signals". The frozen article names no source at all:
//
//     grep -in "source\|according\|compiled\|buried" \
//       stories/stress-p-transport-ridership/source/article.md   ->  nothing
//
// and `Buried Signals` is this tree's own `NEWSROOM.md` `name` — the newsroom that would PUBLISH
// the graphic, promoted to the organisation that COMPILED the data. `credit` was a required scalar
// with no honest empty value, so an unattended run filled it with the nearest plausible string.
//
// TRACING TO `STORYBOARD.md` WOULD HAVE GONE GREEN ON THIS EXACT DEFECT, which is why it does not.
// The invention was IN the storyboard: `credit:` held it, the render read it, the hand-over printed
// it, and every hop was faithful. The only record a credit can honestly trace to is the material the
// journalist actually froze — `source/` — because that is the one part of a story nothing in this
// toolchain may write.
//
// FINDING 15 — A DOUBLE HYPHEN REACHES THE PIXELS, THE `<desc>` AND THE HAND-OVER'S ALT TEXT.
// `stress-q-safety-incidents`'s render wrote `--` where an em dash belongs, and it arrived on three
// surfaces at once: the visible footnote a reader sees, the `<desc>` a screen reader speaks, and the
// alt text in `HANDOVER.md` that a newsroom pastes into its CMS by hand. Measured across the tree on
// the day this landed: 22 files contain " -- ", 21 of them only inside code comments. This is the
// first one to reach a reader, and the code comments are why the decision reads reader-visible text
// rather than files.
//
// DELIBERATELY NOT A PROSE STYLE CHECKER. It knows one thing: a dash typed as two hyphen-minus
// characters is a dash that did not survive being typed. It has no opinion about sentence length,
// quotation marks, spacing, or which dash a clause wanted. A rule that started having opinions about
// prose would be a rule a journalist has to argue with, and it would stop being read.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";

/** The capabilities this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["creditTracesToRecord", "doubleHyphenInDeliveredText"];

/** The headings `deliver/scripts/format-handover.mjs` writes above the credit blockquote, one per
 *  language that file can be written in. Spelled out again here rather than imported — no skill in
 *  this branch reaches into another's runtime — and a hand-over that carries NONE of them is a RED
 *  rather than a pass: a decision taught two languages, meeting a third, would otherwise read a real
 *  delivery as one with no credit at all, and report the silence as cleanliness. */
const CREDIT_HEADINGS = ["## The credit line", "## La ligne de crédit"];

/** A run of two or more consecutive capitalised words — the shape of a named organisation, and the
 *  only attribution shape this decision claims to recognise.
 *
 *  NARROW ON PURPOSE. A single capitalised word after a colon is ambiguous (`Source: Figures
 *  released...` is sentence case, not a name), and a lone capitalised word inside a date — the
 *  `August` in `· as of 21 August 2026`, which every credit line in this tree appends — would be a
 *  false positive on every delivery in the tree. Requiring two adjacent capitals costs the rule a
 *  single-word organisation (`Eurostat`) and buys it a decision with no judgement call in it. The
 *  defect that earned the rule is a two-word one, and so is almost every newsroom, ministry and
 *  agency a credit names. */
const NAME_RUN_RE = /[A-ZÀ-ÖØ-Þ][\w'’&.-]*(?:\s+[A-ZÀ-ÖØ-Þ][\w'’&.-]*)+/gu;

/** A LETTER FROM A SCRIPT THAT HAS NO CASE — round five, finding X4.
 *
 *  `NAME_RUN_RE` above is a run of two or more CAPITALISED words, and capitalisation is the whole of
 *  how this decision has ever found an organisation. Arabic, Hebrew, Chinese, Japanese, Korean, Thai
 *  and Devanagari have no case at all, so no name in any of them is ever extracted and this rule
 *  passed VACUOUSLY on every story not written in a cased script. Measured as a controlled pair on a
 *  copy of `stress-x-tunisian-water`'s own delivery: the credit replaced with
 *  `المعهد الوطني للإحصاء وشركة كهرباء قرطاج` — not one of those words anywhere in the frozen
 *  `source/` — returned `{traces: true, unattested: []}`, while the SAME fabrication written in Latin
 *  (`Zarzis Hydrological Bureau`) returned `{traces: false}` with the full refusal.
 *
 *  WHAT IS DECIDED INSTEAD, and why it is weaker rather than the same. There is no capitalisation to
 *  delimit a name by and this rule will not invent one: taking every multi-word phrase as a name
 *  would accuse the real, recorded credit of `stress-x` itself, whose Arabic words are a TRANSLATION
 *  of an attribution the frozen article makes in English ("the figures come from the national water
 *  utility"). So the question narrows to the one the same evidence still settles — is the credit
 *  FOREIGN TO THE RECORD WHOLESALE, not one word of it anywhere in the frozen `source/`? — and the
 *  narrowing is REPORTED in `limits` rather than left for a reader to discover. A fabrication
 *  smuggled into an otherwise-attested line passes here and would not pass in a cased script; that
 *  is a stated miss, and a stated miss is not the defect. A silent one is. */
const CASELESS_LETTER_RE =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Devanagari}]/u;

/** A dash typed as two hyphen-minus characters: spaced (` -- `) or set tight between words
 *  (`word--word`). Never a leading `--flag`, which is a real thing a page may legitimately show. */
const DOUBLE_HYPHEN_RE = /(?<=\s)--(?=\s)|(?<=\w)--(?=\w)/u;

/** The delivered files whose text a reader actually reads. A `.png`, an `.mp4` and a
 *  `.delivery-manifest.json` carry no reader-visible prose; a `.txt` holding a URL carries no
 *  sentence. What is left is the hand-over and the artefact itself. */
const READABLE_RE = /\.(md|svg|html?)$/i;

/** The story directory above a beat — the nearest ancestor holding both a frozen `source/` and a
 *  `STORYBOARD.md`. `null` for a beat that has neither, which is every worked example under
 *  `proof/`: those were never frozen by `intake` and were never delivered to anybody. */
function storyAbove(beatDir) {
  let dir = beatDir;
  for (let depth = 0; depth < 8; depth++) {
    if (existsSync(join(dir, "source")) && existsSync(join(dir, "STORYBOARD.md"))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

/** Every delivery MADE FROM this beat: an `export/<outputId>/` directory beside the story whose own
 *  `.delivered-from` names this beat's directory. That receipt is what `deliver` writes when it
 *  materialises a form, and it is the only link between a beat and the files a newsroom received. */
function deliveriesOf(story, beatDir) {
  const root = join(story, "export");
  if (!existsSync(root)) return [];
  const wanted = basename(beatDir);
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((dir) => statSync(dir).isDirectory())
    .filter((dir) => {
      const receipt = join(dir, ".delivered-from");
      return existsSync(receipt) && readFileSync(receipt, "utf8").trim() === wanted;
    })
    .sort();
}

/**
 * THE BEAT'S OWN RENDERED DRAFT — the surface these two decisions could not reach, and the one where
 * what they find can still be CORRECTED.
 *
 * THE DEFECT, measured on a real story: `creditTracesToRecord(beatDir)` and
 * `doubleHyphenInDeliveredText(beatDir)` both answered
 * `{"applies": false, "reason": "nothing has been delivered from this beat"}` — because they read
 * `export/` only, and `export/` exists after G4. A wrong credit line and a `--` where an em dash
 * belongs are both PRODUCTION defects: the phase where they are cheap to fix is the one where the
 * page has been rendered and the journalist is looking at it, not the one where a newsroom has
 * already pasted it into a CMS. A rule that can only fire after the last gate is a rule that fires
 * too late to be worth anything, which is worse than one that does not fire at all — it looks like
 * coverage.
 *
 * So the draft is a SURFACE alongside the deliveries. The `renders/` spelling is the one `whereIs`
 * and `writeOutputReview` both use; `render/` is read too, because that is what the producer wrote
 * before the same real story found it.
 */
function draftsOf(beatDir) {
  const found = [];
  for (const name of ["renders", "render"]) {
    const dir = join(beatDir, name);
    if (existsSync(dir) && statSync(dir).isDirectory()) found.push(dir);
  }
  return found;
}

/** Every text a READER of one delivered file receives, as separate runs.
 *
 *  Markup (`.svg`, `.html`) is stripped of comments, `<script>` and `<style>` FIRST — an HTML
 *  comment literally contains two hyphens, and 21 of the 22 files carrying " -- " on the day this
 *  landed carried it in a CSS or JS comment nobody reads. What is left is the text between tags,
 *  plus the `alt`, `aria-label` and `title` attributes a screen reader speaks aloud. Markdown keeps
 *  everything except fenced blocks and inline code spans, which are the parts of a hand-over nobody
 *  reads as a sentence. */
export function readerVisibleText(path) {
  const text = readFileSync(path, "utf8");
  if (/\.md$/i.test(path))
    return [text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "")];
  const stripped = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  return [
    ...[...stripped.matchAll(/>([^<]+)</g)].map((match) => match[1]),
    ...[...stripped.matchAll(/\b(?:alt|aria-label|title)\s*=\s*"([^"]*)"/g)].map((match) => match[1]),
  ]
    .map((run) => run.replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))))
    .filter((run) => run.trim() !== "");
}

/** Every readable file in a delivery, oldest convention first: the hand-over, then the artefacts. */
function readableFiles(delivery) {
  return readdirSync(delivery)
    .filter((name) => !name.startsWith(".") && READABLE_RE.test(name))
    .sort()
    .map((name) => join(delivery, name));
}

/** Everything the journalist FROZE, as one lower-cased haystack: the whole of `source/`, article,
 *  data and notes alike. Nothing in this toolchain may write into that directory, which is the
 *  entire reason it is the record a credit has to trace to. */
function frozenRecord(story) {
  const root = join(story, "source");
  const parts = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else parts.push(readFileSync(path, "utf8"));
    }
  };
  if (existsSync(root)) walk(root);
  return parts.join("\n").toLowerCase();
}

/** The credit line a delivered hand-over PRINTS: the blockquote under its credit heading, joined
 *  back into one line. `null` when the hand-over carries no heading this decision knows — reported
 *  as a refusal by the caller, never as a pass. */
function printedCredit(handover) {
  const text = readFileSync(handover, "utf8");
  for (const heading of CREDIT_HEADINGS) {
    const at = text.indexOf(`\n${heading}\n`);
    if (at < 0) continue;
    const after = text.slice(at + heading.length + 2);
    const quoted = /^\s*((?:>.*(?:\n|$))+)/.exec(after);
    if (!quoted) continue;
    return quoted[1]
      .split(/\n/)
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
  }
  return null;
}

/**
 * WHETHER THE CREDIT A DELIVERED ARTEFACT PRINTS TRACES TO THE STORY'S OWN RECORD.
 *
 * Returns `{ applies: false }` when the question does not arise — no story above the beat, or
 * nothing delivered from it. When it does, every organisation the printed credit NAMES is looked for
 * in the frozen `source/`, word by word and case-blind, and a name no frozen file ever mentions is
 * an attribution this toolchain wrote on somebody else's behalf.
 *
 * REPORTING, NEVER REPAIR. It does not propose a credit, does not rewrite one, and has no opinion
 * about a credit that names nobody: "municipal safety incident report and district population
 * estimates" describes a table and attributes nothing to anyone, and passes, correctly. The harm
 * this rule exists for is the other kind — a real, named third party recorded as having compiled
 * data it never touched.
 *
 * `limits` NAMES WHAT THIS ANSWER IS WORTH LESS THAN. Empty in the ordinary case; non-empty where the
 * credit is written in a script with no case, because there the question decided is weaker than the
 * question decided elsewhere — see `CASELESS_LETTER_RE`. An empty `limits` is itself information: the
 * verdict above it was reached the full-strength way.
 */
export function creditTracesToRecord(beatDir) {
  const story = storyAbove(beatDir);
  if (!story) return { applies: false, reason: "no frozen story above this beat" };
  const deliveries = deliveriesOf(story, beatDir);
  if (deliveries.length === 0) return { applies: false, reason: "nothing has been delivered from this beat" };

  const record = frozenRecord(story);
  const unattested = [];
  const limits = [];
  for (const delivery of deliveries) {
    const handover = join(delivery, "HANDOVER.md");
    if (!existsSync(handover)) {
      unattested.push(`${basename(delivery)}: delivered with no HANDOVER.md, so nothing states the credit`);
      continue;
    }
    const credit = printedCredit(handover);
    if (credit === null) {
      unattested.push(
        `${basename(delivery)}/HANDOVER.md names no credit heading this decision knows (${CREDIT_HEADINGS.join(", ")}) — a hand-over written in a language it has not been taught reads as a delivery with no credit at all`,
      );
      continue;
    }

    // THE SAME QUESTION, NARROWED, FOR A CREDIT WITH NO CASE TO READ (finding X4). Runs only when the
    // credit actually carries a caseless letter, so nothing about a Latin or Greek credit changes.
    if (CASELESS_LETTER_RE.test(credit)) {
      limits.push(
        `${basename(delivery)}: the credit prints "${credit}", written in a script with no case — no organisation name can be delimited in it, so what was decided here is only whether the credit is foreign to the frozen record WHOLESALE. A fabricated name inside an otherwise-attested line would pass, and would not pass in a cased script`,
      );
      const words = (credit.match(/[\p{L}\p{N}'’]+/gu) ?? []).filter((word) => word.length > 1);
      const attested = words.filter((word) => record.includes(word.toLowerCase()));
      if (words.length > 0 && attested.length === 0) {
        unattested.push(
          `${basename(delivery)}: the credit prints "${credit}" — not one word of it appears anywhere in the story's frozen source/, and the script it is written in has no case, so no name inside it could be read on its own. If the journalist named no source, record credit: unattributed and the artefact prints "Source: not stated"`,
        );
      }
    }
    for (const run of credit.match(NAME_RUN_RE) ?? []) {
      // ATTESTED IF ANY WORD OF THE NAME IS IN THE RECORD, not if every word is. The strict form
      // was written first and measured against this tree: on all eight committed deliveries the two
      // agree exactly, and they part company only on inflection — an article that says "in Greece"
      // and a credit that says "Greek Ministry of Education" would be REFUSED by the strict form,
      // over a wording a desk is entitled to. This rule is not a copy-editor. A name whose every
      // word is foreign to the frozen record is an organisation the record has never heard of, and
      // that is the harm it exists for: a real third party recorded as having compiled data it
      // never touched. A name that shares a word with the record is at worst a wording, and a rule
      // an author can argue with is a rule an author deletes.
      const words = (run.match(/[\w'’]+/gu) ?? []).filter((word) => word.length > 1);
      if (words.length === 0 || words.some((word) => record.includes(word.toLowerCase()))) continue;
      const surfaces = readableFiles(delivery)
        .filter((file) => readerVisibleText(file).some((chunk) => chunk.includes(run)))
        .map((file) => basename(file));
      unattested.push(
        `${basename(delivery)}: the credit prints "${credit}", naming ${JSON.stringify(run)} — not one word of it appears anywhere in the story's frozen source/. Printed on ${surfaces.join(", ") || "the hand-over"}. If the journalist named no source, record credit: unattributed and the artefact prints "Source: not stated"`,
      );
    }
  }
  return { applies: true, deliveries: deliveries.map((dir) => basename(dir)), traces: unattested.length === 0, unattested, limits };
}

/**
 * WHETHER A DOUBLE HYPHEN REACHES A READER through anything this beat delivered.
 *
 * Every reader-visible run on every delivered `.md`, `.svg` and `.html` — the hand-over's alt text
 * and credit line, the `<desc>` a screen reader speaks, the words drawn in the picture — is read for
 * a dash typed as two hyphen-minus characters. Code comments are removed before the reading, which
 * is the whole difference between this and a grep: 21 of the 22 files in the tree carrying " -- " on
 * the day this landed carried it in a comment, and not one of those is a defect.
 */
export function doubleHyphenInDeliveredText(beatDir) {
  const story = storyAbove(beatDir);
  if (!story) return { applies: false, reason: "no frozen story above this beat" };
  const deliveries = deliveriesOf(story, beatDir);
  // THE DRAFT COUNTS. See `draftsOf` — a `--` drawn into the page is a production defect, and
  // reading `export/` alone made this decision unable to fire until the phase after the one where
  // it is fixed.
  const drafts = draftsOf(beatDir);
  const surfaces = [...deliveries, ...drafts];
  if (surfaces.length === 0)
    return { applies: false, reason: "this beat has neither a rendered draft nor a delivery to read" };

  const hits = [];
  for (const delivery of surfaces) {
    for (const file of readableFiles(delivery)) {
      for (const chunk of readerVisibleText(file)) {
        const at = chunk.search(DOUBLE_HYPHEN_RE);
        if (at < 0) continue;
        hits.push(
          `${basename(delivery)}/${basename(file)}: "${chunk.slice(Math.max(0, at - 45), at + 45).replace(/\s+/g, " ").trim()}" — two hyphens where a dash belongs`,
        );
      }
    }
  }
  return {
    applies: true,
    deliveries: deliveries.map((dir) => basename(dir)),
    drafts: drafts.map((dir) => basename(dir)),
    clean: hits.length === 0,
    hits,
  };
}

/** Every beat directory whose own committed runner calls the named skill. A runner CALLS a skill
 *  when its source names that skill's `scripts/` directory or its vendored `#shared/` copy — the
 *  same pair `example-runners.mjs` reads, and the pair a rename of either would break together. */
export function beatsCalling(root, skill) {
  const found = new Set();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.mjs$/.test(name)) {
        const source = readFileSync(path, "utf8");
        if (source.includes(`shared/${skill}/`) || source.includes(`skills/${skill}/scripts`)) found.add(dir);
      }
    }
  };
  for (const top of ["stories", "proof"]) walk(join(root, top));
  return [...found].map((dir) => relative(root, dir).split(sep).join("/")).sort();
}
