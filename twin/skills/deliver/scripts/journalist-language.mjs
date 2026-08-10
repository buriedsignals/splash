// THE LANGUAGE THE DELIVERY IS WRITTEN IN — one reading of it, for every journalist-facing document
// this skill produces.
//
// From the owner's own end-to-end run, 2026-08-10 (A25): the whole story was French — article,
// takeaway, hand fields, title, alt text, credit line — and `HANDOVER.md` came out as an English
// scaffold with the journalist's French sentences dropped into it: *"## Where it goes in the
// article"* above a French line. It is the one artifact the newsroom keeps.
//
// Ruling R4 settled the principle a session earlier and nothing had applied it here: **the
// journalist's language follows the ARTICLE, not the newsroom config, and is confirmed with them.**
// So it is READ, never detected. `NEWSROOM.md`'s `languages` is the list that confirmation chooses
// among — a francophone paper can publish in English — and the answer lands in `STORYBOARD.md`'s
// `language:` field, beside the takeaway it belongs to. This module is handed that recorded tag; it
// does not sniff the prose, and it has no default.
//
// WHAT HAPPENS TO A LANGUAGE WE CANNOT WRITE IN, decided here rather than discovered later.
// Two candidate behaviours were on the table:
//
//   REFUSE — throw, so nothing ships in the wrong language. Rejected: the language IS chosen and
//            correct; what is missing is our translation. Refusing would block a journalist from
//            receiving their own delivered work over a gap that is ours, and this project already
//            reversed one refusal of exactly that shape (R10.2, the MapTiler key wall).
//   FALL BACK, AND SAY SO — write the scaffold in English and open the document by stating, in
//            plain terms, that it is in English and which language was recorded. Chosen.
//
// The failure is the SILENT fallback, not the fallback. `untranslatedNotice` is what makes it not
// silent, and every formatter in this skill puts it first, before anything else it renders.
//
// Two languages are written today: `en` and `fr`. `fr` because the pilot newsroom is francophone and
// the run that produced A25 was French throughout — a translation nobody can check is worth less
// than an honest notice, so a language is added here when someone who reads it writes it, not
// speculatively.

// The scaffold languages, by base tag. Anything else is served in English WITH the notice.
export const SCAFFOLD_LANGUAGES = ["en", "fr"];

// `fr`, `de-CH`, `en-GB` — the same shape `splash/scripts/newsroom.mjs` accepts, spelled again
// rather than imported, because a skill directory stays copy-pasteable on its own.
const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/**
 * Which language this document is WRITTEN in, given the one recorded for the story.
 *
 * Returns `{recorded, written, translated}`:
 *   - `recorded`   — the tag as the storyboard holds it (`fr`, `de-CH`).
 *   - `written`    — the base tag the copy tables are keyed by (`fr`, or `en` when we have no copy).
 *   - `translated` — false when we fell back, which is what obliges the caller to print the notice.
 *
 * Throws when nothing was recorded, rather than assuming English: a hand-over silently in the wrong
 * language is the defect this exists to close, and a default is how it would come back.
 */
export function resolveScaffoldLanguage(language) {
  const recorded = String(language ?? "").trim();
  if (recorded === "") {
    throw new Error(
      "a hand-over is written in the story's own language, and none was given — it is recorded in STORYBOARD.md's `language:` field, confirmed with the journalist against the article (ruling R4). It is never detected from the text and never defaulted to English",
    );
  }
  if (!LANGUAGE_TAG.test(recorded)) {
    throw new Error(
      `language ${JSON.stringify(recorded)} is not a language code (fr, de-CH, en) — STORYBOARD.md records the code, not the language's name`,
    );
  }
  const base = recorded.split("-")[0].toLowerCase();
  const translated = SCAFFOLD_LANGUAGES.includes(base);
  return { recorded, written: translated ? base : "en", translated };
}

/**
 * The lines that open a document we could not write in the recorded language. English, necessarily —
 * it is the language the reader is about to be given — and about THEIR delivery, not about us: it
 * says which language the document is in, that their own words are untouched, and what is available.
 *
 * `[]` when the document is in the right language, so a caller can spread it unconditionally.
 */
export function untranslatedNotice({ recorded, translated }) {
  if (translated) return [];
  return [
    `> **This document is written in English, not in \`${recorded}\`.** Your own words in it — the`,
    "> placement, the alt text, the credit line, the caveat — are unchanged, in the language you",
    `> recorded. English and French are the two languages it can be written in for now, and \`${recorded}\``,
    "> is not one of them yet.",
    "",
  ];
}
