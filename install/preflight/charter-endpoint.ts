// charter-endpoint.ts — the thin layer between the charter extractor and the setup page.
//
// `proposeCharter` (lib/newsroom/charter.ts) returns a `CharterProposal`: raw measurements,
// signal weights, an extraction-wide confidence. A page cannot show that directly — it needs a
// VALUE and the SENTENCE saying where it was read, because (skills/newsroom-charter/SKILL.md)
// "a journalist can only disagree with a value whose origin they can see". `readoutFrom` is that
// translation, pure and total: it never raises the confidence the extractor states, and it never
// invents a signal beyond the ones charter.ts actually emits (`ColourSignal`, `SIGNAL_LABEL`).
//
// M1 (final review, 2026-08-06): the receipt SENTENCES used to be English literals, relayed
// verbatim to a page that may be reading in French — the one flagship feature of this branch,
// unreadable to the newsroom it was built for. They now route through `PageCopy`
// (`signalLabel`/`typeRoleLabel`/`receiptReadFrom`/`receiptReadFont`), so `readoutFrom` takes a
// language and builds the sentence in it. `SIGNAL_LABEL` (English, charter.ts's own diagnostic
// vocabulary) stays that module's source of truth — `copy.ts`'s EN table re-exports it by
// reference rather than re-typing it, so the two cannot drift apart the way a hand-copied second
// table would. The extractor's own free-text `notes` (caveats it writes itself) are a separate,
// larger job and are NOT translated here — see docs/installer/setup-page-proof.md.
import type {
  CharterConfidence,
  CharterProposal,
  ColourCandidate,
  Measurement,
  TypeMeasurement,
} from "../../lib/newsroom/charter.ts";
import { WEIGHT } from "../../lib/newsroom/charter.ts";
import { pageCopy, type PageCopy } from "./copy.ts";

/**
 * Which read produced a measurement: the fast static fetch (charter-fetch.ts), or the slower
 * browser render (charter-render.ts). Declared HERE, once, and imported by both ends — server.ts
 * parses it off the wire and client.ts sends it. It used to be spelt out as a bare union in
 * three places, which is exactly how a client typo (`"render"`) degrades into a static read with
 * nothing anywhere saying so: three literals cannot disagree with each other, only with the
 * truth (final review, F7).
 */
export type CharterMode = "static" | "rendered";

export type CharterReadout = {
  /**
   * Ranked, best first. Empty means the site declared nothing — a legitimate answer.
   *
   * `confidence` is the MACHINE-READABLE half of `receipt`, not a leftover: the page renders the
   * "this is a guess" mention out of the sentence (`paletteReceiptFor` below), so nothing on
   * screen reads this field, and its only readers are this module's tests. Keep it — it is what
   * lets a caller that is not a DOM (a test, a future writer of NEWSROOM-PROFILE.md, anything
   * that has to sort or filter by how well-founded a reading is) ask the question without
   * parsing a translated sentence back apart (final review, F10).
   */
  palette: { hex: string; receipt: string; confidence: CharterConfidence }[];
  ground?: { value: string; receipt: string };
  /** Measured, never written to frontmatter — see Task 2. */
  typefaces: { family: string; role: string; receipt: string }[];
  /** Verbatim caveats from the extractor, for the page to relay unchanged. English only — see
   *  the module comment above. */
  notes: string[];
};

/**
 * The receipt sentence for one colour reading: what kind of declaration it is (`copy.signalLabel`,
 * translated the same way the page around it is), the literal token it was read from, and WHERE
 * that token was read from (`m.source` — the newsroom's own page, or the exact stylesheet href,
 * same host or not). The source is what actually lets the journalist tell their own CDN apart
 * from a third-party widget's sheet — see `copy.receiptSource`'s own doc comment.
 */
function receiptFor(m: Measurement, copy: PageCopy): string {
  return `${copy.receiptReadFrom} ${copy.signalLabel[m.signal]}: \`${m.token}\`. ${copy.receiptSource} ${m.source}`;
}

function typeReceiptFor(t: TypeMeasurement, copy: PageCopy): string {
  return `${copy.receiptReadFont} ${copy.typeRoleLabel[t.role]}: \`${t.token}\`. ${copy.receiptSource} ${t.source}`;
}

/**
 * The same three signals `proposeCharter` treats as an actual DECLARATION (theme-color,
 * brand-property, masthead) rather than an inference from links/controls/frequency — see
 * `DECLARED_SIGNALS` in lib/newsroom/charter.ts, duplicated here because it is not exported.
 */
const DECLARED_SIGNALS = new Set(["theme-color", "brand-property", "masthead"]);

/**
 * A candidate's own confidence, read straight off ITS evidence — never off the extraction-wide
 * `proposal.confidence`, which only describes the top candidate. This cannot overstate: the
 * ranking sorts by best signal weight first, and every declared signal outweighs every
 * non-declared one (charter.ts's `WEIGHT` table), so a candidate ranked below one with no
 * declared evidence can never itself carry declared evidence either. `proposeCharter` never
 * proposes a candidate with only neutral/absent evidence, so this is always `declared` or
 * `inferred` in practice — never `none`.
 */
function candidateConfidence(candidate: ColourCandidate): CharterConfidence {
  return candidate.evidence.some((e) => DECLARED_SIGNALS.has(e.signal))
    ? "declared"
    : "inferred";
}

/**
 * The reading that most earns a candidate's receipt: the HIGHEST-weighted entry in its evidence,
 * by the exact same rule `rank()` in charter.ts uses to pick a merged candidate's representative
 * value (`WEIGHT[c.signal] > WEIGHT[a.signal]`, first element as the seed so ties keep the
 * earliest-scanned reading).
 *
 * Deliberately NOT `evidence.find(e => e.value === candidate.value)`: `rank()` buckets by EXACT
 * hex first (a `Map` keyed on the literal `#rrggbb`), and that bucket's `value` field is simply
 * whichever measurement was pushed into it first — the weight-based reassignment only runs on
 * the MERGE path, across buckets whose hexes are merely close. Two different signals that declare
 * the identical hex (`--accent:#0a5c36` then `--brand:#0a5c36`) land in the SAME bucket and never
 * hit that reassignment, so value-equality returns whichever was scanned first — the accent, even
 * though the brand property is the higher-weighted, more deliberate declaration. Selecting by
 * weight directly is correct in both cases (same-bucket and merged-bucket) and needs no bucketing
 * knowledge here at all.
 */
function bestEvidence(candidate: ColourCandidate): Measurement {
  return candidate.evidence.reduce((a, c) =>
    WEIGHT[c.signal] > WEIGHT[a.signal] ? c : a,
  );
}

/**
 * A palette candidate's receipt: the best evidence's own sentence, with the "this is a guess"
 * mention appended when the candidate's confidence is `inferred` — never merely a `confidence`
 * field a page has to remember to check. Built here, once, in the module that already carries
 * `charter-endpoint.test.ts`, rather than as a ternary in `client.ts`: that file's own header
 * comment is explicit that it decides nothing a test cannot see, and a mention that only a DOM
 * ternary produced was exactly the kind of thing that file exists to not be responsible for.
 */
function paletteReceiptFor(candidate: ColourCandidate, copy: PageCopy): string {
  const receipt = receiptFor(bestEvidence(candidate), copy);
  return candidateConfidence(candidate) === "inferred"
    ? `${receipt} ${copy.charterInferred}`
    : receipt;
}

/**
 * `lang` picks the receipt vocabulary (`pageCopy`, the same fallback-to-English table the rest
 * of the page uses) — it does not touch `proposal` itself, which is language-neutral (hex
 * values, literal CSS tokens). Defaults to English so every existing caller (this module's own
 * tests included) is byte-identical without passing one.
 */
export function readoutFrom(
  proposal: CharterProposal,
  lang = "en",
): CharterReadout {
  const copy = pageCopy(lang);
  const palette = proposal.candidates.map((candidate) => ({
    hex: candidate.value,
    receipt: paletteReceiptFor(candidate, copy),
    confidence: candidateConfidence(candidate),
  }));

  const typefaces = proposal.typography.map((t) => ({
    family: t.family,
    role: t.role,
    receipt: typeReceiptFor(t, copy),
  }));

  return {
    palette,
    ...(proposal.ground
      ? {
          ground: {
            value: proposal.ground.value,
            receipt: receiptFor(proposal.ground, copy),
          },
        }
      : {}),
    typefaces,
    notes: proposal.notes,
  };
}

/**
 * The mode a `/charter` request body asks for. Anything that is not the literal string
 * `"rendered"` — absent, misspelt, a number, a whole other type — reads as `"static"`: opening a
 * real browser is opt-in, and a body that fails to say so must never buy one.
 *
 * A function rather than a ternary inside the route, because the route lives in a module that
 * starts a server at import and so cannot be unit-tested: with the decision here, replacing
 * `=== "rendered"` with `!== "static"` reddens a test instead of nothing at all (final review,
 * F8). `server.test.ts` pins the same rule again at the HTTP boundary.
 */
export function charterModeFrom(body: unknown): CharterMode {
  return body !== null &&
    typeof body === "object" &&
    (body as { mode?: unknown }).mode === "rendered"
    ? "rendered"
    : "static";
}

/**
 * The FOUR message shapes charter-render.ts reports when THIS MACHINE's browser, not the
 * newsroom's site, is what failed. A Chromium that never started (`could not open a browser to
 * render …` — a missing install, a version drift) was the only one covered here at first, which
 * left the same wrong-cause sentence standing on three narrower paths: a browser that starts and
 * hands back no page, one whose execution context dies before the CSS can be read, and one whose
 * target crashes before the markup can be. In all three the journalist was told to check their
 * address — their site is fine, their browser died. All four failures happen on THIS side of the
 * network and none of them is the newsroom's site answering badly (`… answered 503`,
 * `… could not be rendered`), which stay on the site sentence.
 *
 * Matched on the message because charter-render.ts reports a plain string, not a tagged error,
 * and this module does not own that module. `charter-endpoint.test.ts` runs the REAL
 * `renderSiteSources` against each of the four failure points — a launch that throws, and a page
 * that throws in `newPage`, in `evaluate`, in `content` — and asserts this pattern still matches
 * what it says, so the coupling reddens here if any of that wording moves, instead of silently
 * telling a journalist their site is down when their browser is. A hand-written copy of the
 * message in a test would pin nothing: it agrees with itself whatever charter-render.ts says.
 */
const BROWSER_UNAVAILABLE =
  /^could not (?:open (?:a browser|a page) to render|read the (?:CSS applied to|rendered markup of)) /;

/**
 * A collector failure, said to the journalist in the language the page is being read in.
 *
 * Before this, `server.ts` prefixed EVERY failure with the English literal `the site did not
 * answer:` and the client printed it verbatim — so a French newsroom whose shared Chromium is
 * missing read `the site did not answer: could not open a browser to render https://… Executable
 * doesn't exist`: the wrong cause, in the wrong language, with the machine detail as the
 * headline (final review, F1). Two things are fixed here at once — WHICH sentence (the browser
 * could not run, or the site could not be read) and WHOSE language it is in — because they are
 * the same sentence.
 *
 * The technical tail is kept, never dropped: a journalist has to be able to paste it to whoever
 * maintains their install. It is subordinate — after the sentence that says what happened, in
 * parentheses — rather than the first thing they read.
 */
export function failureReadout(error: string, lang = "en"): { error: string } {
  const copy = pageCopy(lang);
  const headline = BROWSER_UNAVAILABLE.test(error)
    ? copy.measureRenderFailed
    : copy.measureFailed;
  return { error: `${headline} (${copy.technicalDetail} — ${error})` };
}

/**
 * What the page knows about the current measurement. Lives beside the wire contract rather than
 * inside client.ts because the one decision it drives — whether to OFFER the browser retry —
 * has to be testable: client.ts reads `document` at module load and no suite in this repo can
 * import it, so a rule written as a boolean expression in its render function is a rule nothing
 * can contradict.
 */
export type CharterState =
  | { status: "idle" }
  | { status: "loading"; mode: CharterMode }
  | { status: "done"; readout: CharterReadout; mode: CharterMode }
  | {
      status: "error";
      message: string;
      mode: CharterMode;
      /**
       * Did a request actually leave the page? `false` for the refusals the client makes on its
       * own — an empty address field, above all — which are the journalist being asked for
       * something, not the site failing to give it.
       */
      attempted: boolean;
    };

/**
 * Whether the page offers the SECOND, browser-rendering attempt.
 *
 * Offered only once a static read has actually been made and come back with nothing to propose;
 * it stays up while the render runs and if the render itself fails (so it can be retried), and
 * it disappears the moment a render has completed — there is no third mechanism behind it.
 *
 * `attempted` is what the final review added (F4): "found nothing" used to include the client's
 * own "enter your website address first", so an empty field answered with that sentence AND an
 * offer to open the empty address in a real browser, which fails in exactly the same way. An
 * error from a read that never happened is not a read that found nothing.
 */
export function offersRenderRetry(state: CharterState): boolean {
  if (state.status === "idle") return false;
  if (state.mode === "rendered")
    return state.status === "loading" || state.status === "error";
  return (
    (state.status === "done" && state.readout.palette.length === 0) ||
    (state.status === "error" && state.attempted)
  );
}

/** How a measured typeface is identified across a re-render — role AND family, because a site
 *  can name the same family for its body and its headings and dropping one must not drop both. */
export function typefaceKey(t: { family: string; role: string }): string {
  return `${t.role}:${t.family}`;
}

/**
 * What a measurement writes into the profile body: the extractor's own caveats, then one line
 * per measured typeface the journalist did NOT strike.
 *
 * The `dropped` argument is the whole point. Typefaces have no frontmatter field of their own
 * yet (no engine applies them), so they land in the profile's prose — and until the final review
 * they landed there UNSEEN: written into a fresh NEWSROOM-PROFILE.md with no on-screen presence
 * and no way to disagree, the one measured thing a journalist could not correct (F3). Only what
 * survives the readout goes in.
 */
export function notesFrom(
  readout: CharterReadout,
  dropped: ReadonlySet<string>,
): string[] {
  return [
    ...readout.notes,
    ...readout.typefaces
      .filter((t) => !dropped.has(typefaceKey(t)))
      .map((t) => `${t.role}: ${t.family} — ${t.receipt}`),
  ];
}
