/**
 * THE COPY IS HELD IN STEP WITH WHAT IT WAS COPIED FROM.
 *
 * `chart-web/assets/entrance.ts` is a vendored copy of `chart-video/assets/timing.ts`: the web
 * entrance was asked to be *"dans le même style que la vidéo"*, so it replays the video's own
 * choreography rather than inventing a second grammar. It is a COPY and not an import because
 * nothing under a skill may import out of the skill (`no-cross-skill-imports.test.ts`) — a skill
 * directory has to build after being copied, alone, into a journalist's root, and no copy of
 * `chart-web` carries `chart-video` with it.
 *
 * That duplication is this project's method, and **every duplication in it is supposed to be walked
 * by a parity guard**. This one was not, for a day. `entrance.ts` says in its own header that this
 * file exists; it did not. So the two could have drifted apart with nothing red — which is the exact
 * failure `video-helper-parity.test.ts` was written after twenty-three unguarded copies of
 * `measureText` were found in one evening.
 *
 * ── THE TWO HALVES, AND WHY ONE IS NOT ENOUGH ─────────────────────────────────────────────────
 *
 * **Half one: the shared arithmetic, compared as TEXT.** `endOf` and `progressOf` were copied
 * character for character and are supposed to stay that way. They are compared by reading both
 * sources and normalising, the technique `video-helper-parity.test.ts` and
 * `render-still-parity.test.ts` both use and for the same reason it gives: whitespace is stripped
 * entirely, because the repository's formatter breaks method chains across lines and *a guard a
 * formatter can turn red is a guard someone disables*.
 *
 * ONE SUBSTITUTION IS ALLOWED AND IT IS NAMED: `EntranceEvent` for `TimingEvent`. The two type
 * names are the one declared difference in these signatures — the events are milliseconds here and
 * frames there, which is `entrance.ts`'s own change 2 — and a guard that reported it every run would
 * be reporting the design. The substitution is asserted to be REAL below (the entrance source must
 * actually contain the name it renames), so it can never become a rewrite that hides a difference
 * that is not the type.
 *
 * **Half two: the rules, compared by RUNNING THEM.** A text comparison cannot see a rule whose
 * MEANING drifted while its letters stayed — `<` becoming `<=` in the ordering block changes what is
 * legal without changing a function this file compares, because `checkTiming` and `checkEntrance` are
 * deliberately NOT textually identical (one knows about `hold` and a composition's last frame, the
 * other about a ceiling). So the same fixtures are run through BOTH and the two are made to agree
 * about legality.
 *
 * They cannot be compared verdict for verdict, because three of the rules are deliberately not
 * shared. So each error message is CLASSIFIED — into a shared token, or into a named divergence —
 * and an unclassified message fails loudly rather than being dropped. That last part is the whole
 * safety of this approach: a silent drop would let a new rule appear on one side and never be
 * compared, which is the same shape of hole this file was written to close.
 *
 *   - SHARED, and compared: the field validation (a start is a whole non-negative number, a duration
 *     is at least one unit) and THE ORDERING RULE (each event begins only once the one before it has
 *     finished). The ordering rule is the reason the vocabulary was borrowed at all — it is what
 *     makes an entrance carry the argument's order instead of being motion added for energy.
 *   - DIVERGENT, and allowed: everything about `hold` (the video's stillness; a web beat's hold is
 *     the rest of the page's life, so the event does not exist here) and the entrance's own
 *     `ENTRANCE_CEILING_MS`. Each is matched by an explicit pattern, not by a catch-all.
 *
 * ── WHAT THIS PROVABLY DOES NOT CATCH ────────────────────────────────────────────────────────
 *
 *   1. **A defect they share.** This compares the two against each other. If `progressOf` is wrong,
 *      it is wrong identically in both and this file is satisfied. `chart-video/test/timing.test.ts`
 *      is the half that executes the behaviour.
 *   2. **The pace.** `WEB_ENTRANCE` is deliberately not `CO2_TIMING` ÷3 in every cell — the two
 *      pauses are ÷5 — and nothing here re-derives those numbers. They are an edit, stated with its
 *      arithmetic in `entrance.ts`'s own table, not a formula to be checked.
 *   3. **A helper that exists on only one side.** `atProgress` (web) has no video ancestor to compare
 *      against; the video computes the same fractions inline. Its own claim —
 *      `progressOf(atProgress(e, f), e) === f` — is asserted below instead, because that is the
 *      claim its doc-comment makes and the label rule rests on it.
 *   4. **Whether the ORDER is the argument's order on any given page.** That is
 *      `web-entrance-is-an-addition.test.ts`, in a real browser, and ultimately a person watching it.
 *
 * MUTATIONS, each run in a COPY of the tree under `/tmp` and never here (several agents share this
 * working tree). Recorded with their output in `chart-web/references/web-discipline.md`, "The
 * entrance".
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CO2_TIMING,
  EVENT_ORDER,
  checkTiming,
  type BeatTiming,
  type TimingEvent,
} from "../../chart-video/assets/timing.ts";
import {
  ENTRANCE_CEILING_MS,
  ENTRANCE_ORDER,
  WEB_ENTRANCE,
  atProgress,
  checkEntrance,
  progressOf,
  type BeatEntrance,
} from "../../chart-web/assets/entrance.ts";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const VIDEO_SOURCE = join(TWIN, "skills/chart-video/assets/timing.ts");
const WEB_SOURCE = join(TWIN, "skills/chart-web/assets/entrance.ts");

/** The functions copied character for character, per `entrance.ts`'s "WHAT WAS COPIED, VERBATIM". */
const VERBATIM = ["endOf", "progressOf"];

/** The one declared rename. See the header: asserted to be real before it is applied. */
const RENAME: [RegExp, string] = [/\bEntranceEvent\b/g, "TimingEvent"];

function stripComments(source: string): string {
  // Whole-line `//` and `/* … */` only — the same rule and the same reason as
  // `video-helper-parity.test.ts`: a trailing `//` cannot be eaten without risking a regex literal,
  // and a comparison that eats code is vacuously equal, which is worse than one that cries wolf.
  return source
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalise(source: string): string {
  return source
    .replace(/^export\s+/, "")
    .replace(/,(\s*[)\]}])/g, "$1")
    .replace(/\s+/g, "");
}

/** Top-level `function NAME(…) {…}`, by balancing the argument parentheses BEFORE the body's brace.
 *  Copied from `video-helper-parity.test.ts` with its reason: taking the next `{` after the name
 *  lands inside an inline parameter type, and every comparison then runs on a signature. */
function topLevelFunctions(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let p = text.indexOf("(", m.index);
    if (p === -1) continue;
    let pd = 0;
    for (; p < text.length; p++) {
      if (text[p] === "(") pd++;
      else if (text[p] === ")") {
        pd--;
        if (pd === 0) break;
      }
    }
    const open = text.indexOf("{", p);
    if (open === -1) continue;
    let depth = 0;
    let end = open;
    for (; end < text.length; end++) {
      if (text[end] === "{") depth++;
      else if (text[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    found.set(m[1], text.slice(m.index, end + 1));
  }
  return found;
}

const videoSource = readFileSync(VIDEO_SOURCE, "utf8");
const webSource = readFileSync(WEB_SOURCE, "utf8");
const videoFns = topLevelFunctions(videoSource);
const webFns = topLevelFunctions(webSource);

describe("the shared arithmetic — copied character for character, and still is", () => {
  it("should find both sources carrying the family this guard compares", () => {
    // Without this, renaming either file or emptying a function would leave the comparisons below
    // vacuously green. The premise is pinned, not assumed.
    for (const name of VERBATIM) {
      expect([`timing.ts:${name}`, videoFns.has(name)]).toEqual([
        `timing.ts:${name}`,
        true,
      ]);
      expect([`entrance.ts:${name}`, webFns.has(name)]).toEqual([
        `entrance.ts:${name}`,
        true,
      ]);
    }
  });

  it("should find the one rename it is allowed to normalise away actually present", () => {
    // A substitution nobody can see applying is a substitution that could quietly be hiding a
    // difference that is not the type name. This asserts it is doing the job it was allowed for.
    expect(RENAME[0].test(webSource)).toBe(true);
    RENAME[0].lastIndex = 0;
  });

  for (const name of VERBATIM) {
    it(`${name} should be the same function in both files, modulo the declared rename`, () => {
      const theirs = normalise(stripComments(videoFns.get(name) ?? ""));
      const ours = normalise(stripComments(webFns.get(name) ?? "")).replace(
        RENAME[0],
        RENAME[1],
      );
      expect([name, ours]).toEqual([name, theirs]);
    });
  }

  it("should carry the video's own event order, the first five of it, in its own sequence", () => {
    // `hold` is dropped and nothing else is — `entrance.ts`'s change 1. A reordering here would be
    // a different argument told in a different sequence, with every other check still green.
    expect([...ENTRANCE_ORDER]).toEqual([...EVENT_ORDER].slice(0, 5));
  });
});

// ---------------------------------------------------------------------------------------------
// Half two: the rules, run rather than read.

type Five = Record<(typeof ENTRANCE_ORDER)[number], TimingEvent>;

/** The five shared events as an entrance, and as a timing with a legal `hold` bolted on.
 *
 *  The `hold` is constructed to be legal WHATEVER the five are, so that `checkTiming`'s two
 *  hold-only rules never fire and the only thing left to disagree about is a shared rule. When the
 *  five are so malformed that `endOf(conclusion)` is not a number, `checkTiming` has already
 *  returned from its field-validation block and the hold is never read. */
function asTiming(five: Five): BeatTiming {
  const after = five.conclusion.start + five.conclusion.duration;
  const start = Number.isFinite(after) ? Math.max(0, Math.round(after)) : 0;
  const duration = 15; // half a second at 30fps — exactly the motion grammar's floor.
  return {
    fps: 30,
    total: start + duration,
    ...five,
    hold: { start, duration },
  };
}

const asEntrance = (five: Five): BeatEntrance => ({ ...five });

/** An error message, reduced to what it ASSERTS rather than how it words it.
 *
 *  The two files word the same rule differently on purpose — "start must be a frame index" against
 *  "start must be a whole millisecond" — because a journalist reading one of them is not reading the
 *  other. What has to agree is the verdict, not the sentence. */
function classify(message: string): { shared?: string; divergence?: string } {
  let m: RegExpMatchArray | null;

  if ((m = message.match(/^([a-z]+): start must be .+, got (.+)$/)))
    return { shared: `start-invalid:${m[1]}:${m[2]}` };
  if ((m = message.match(/^([a-z]+): duration must be .+, got (.+)$/)))
    return { shared: `duration-invalid:${m[1]}:${m[2]}` };
  if (
    (m = message.match(
      /^([a-z]+) starts at (\S+), before ([a-z]+) finishes at (\S+)$/,
    ))
  ) {
    // An ordering complaint that mentions `hold` is about the event this genre does not have.
    if (m[1] === "hold" || m[3] === "hold")
      return { divergence: "hold-ordering" };
    return { shared: `out-of-order:${m[1]}@${m[2]}<${m[3]}@${m[4]}` };
  }

  // The named divergences, each matched explicitly. Anything else falls through to unclassified,
  // which fails — a new rule on either side has to be looked at, not absorbed.
  if (/^hold ends at /.test(message))
    return { divergence: "hold-ends-on-total" };
  if (/^hold is \d+ frames, under the half-second floor/.test(message))
    return { divergence: "hold-floor" };
  if (/^the entrance ends at /.test(message))
    return { divergence: "entrance-ceiling" };

  return {};
}

function verdict(errors: string[]): {
  shared: string[];
  divergences: string[];
  unclassified: string[];
} {
  const shared: string[] = [];
  const divergences: string[] = [];
  const unclassified: string[] = [];
  for (const e of errors) {
    const c = classify(e);
    if (c.shared) shared.push(c.shared);
    else if (c.divergence) divergences.push(c.divergence);
    else unclassified.push(e);
  }
  return { shared: shared.sort(), divergences, unclassified };
}

const ev = (start: number, duration: number): TimingEvent => ({
  start,
  duration,
});

/** The five events of a real, legal entrance — this genre's own edit. */
const LEGAL: Five = {
  establish: { ...WEB_ENTRANCE.establish },
  reference: { ...WEB_ENTRANCE.reference },
  reveal: { ...WEB_ENTRANCE.reveal },
  subject: { ...WEB_ENTRANCE.subject },
  conclusion: { ...WEB_ENTRANCE.conclusion },
};

const mutate = (base: Five, name: keyof Five, event: TimingEvent): Five => ({
  ...base,
  [name]: event,
});

/**
 * The fixtures. Deterministic and hand-chosen rather than random, because each one is here to reach
 * a specific branch and a random walk would mostly re-reach the first.
 */
const FIXTURES: { label: string; five: Five }[] = [
  { label: "this genre's own edit, unchanged", five: LEGAL },
  {
    label: "the video's own five, read as milliseconds",
    five: {
      establish: { ...CO2_TIMING.establish },
      reference: { ...CO2_TIMING.reference },
      reveal: { ...CO2_TIMING.reveal },
      subject: { ...CO2_TIMING.subject },
      conclusion: { ...CO2_TIMING.conclusion },
    },
  },
  {
    // Every event abutting its predecessor with no gap at all. THE FIXTURE THAT CATCHES `<` DRIFTING
    // TO `<=` — legal on both sides today, and the boundary the ordering rule is written on.
    label: "every event abutting, no gaps anywhere",
    five: {
      establish: ev(0, 100),
      reference: ev(100, 100),
      reveal: ev(200, 100),
      subject: ev(300, 100),
      conclusion: ev(400, 100),
    },
  },
  {
    label: "one long gap before the reveal — a pause is legal",
    five: {
      establish: ev(0, 100),
      reference: ev(150, 100),
      reveal: ev(900, 200),
      subject: ev(1200, 100),
      conclusion: ev(1400, 100),
    },
  },
  // One out-of-order fixture per adjacent pair, so the rule is exercised at every seam rather than
  // only at the first.
  {
    label: "reference begins before establish has finished",
    five: mutate(LEGAL, "reference", ev(200, 240)),
  },
  {
    label: "reveal begins before reference has finished",
    five: mutate(LEGAL, "reveal", ev(500, 870)),
  },
  {
    label: "subject begins one millisecond before the reveal ends",
    five: mutate(LEGAL, "subject", ev(1559, 200)),
  },
  {
    label: "conclusion begins before the subject has landed",
    five: mutate(LEGAL, "conclusion", ev(1600, 270)),
  },
  {
    label: "two seams broken at once",
    five: mutate(
      mutate(LEGAL, "reveal", ev(400, 870)),
      "conclusion",
      ev(1500, 270),
    ),
  },
  // Field validation, which short-circuits before the ordering block on both sides.
  {
    label: "a negative start",
    five: mutate(LEGAL, "establish", ev(-1, 290)),
  },
  {
    label: "a fractional start",
    five: mutate(LEGAL, "reference", ev(330.5, 240)),
  },
  {
    label: "a zero duration",
    five: mutate(LEGAL, "subject", ev(1560, 0)),
  },
  {
    label: "a negative duration",
    five: mutate(LEGAL, "reveal", ev(690, -870)),
  },
  {
    label: "a fractional duration",
    five: mutate(LEGAL, "conclusion", ev(1760, 270.25)),
  },
  {
    label: "several fields wrong at once, and an ordering error behind them",
    five: {
      establish: ev(0, 0),
      reference: ev(-5, 240),
      reveal: ev(10.5, 870),
      subject: ev(1560, 200),
      conclusion: ev(100, 270),
    },
  },
  {
    // Past the web ceiling and legal as a video. The fixture that proves the DIVERGENCE is
    // classified as one rather than reported as a disagreement.
    label: "well past the entrance ceiling, and otherwise perfectly ordered",
    five: {
      establish: ev(0, 900),
      reference: ev(1000, 700),
      reveal: ev(1800, 2600),
      subject: ev(4400, 600),
      conclusion: ev(5000, 800),
    },
  },
];

describe("the rules — the same fixtures through both checks, agreeing about what is legal", () => {
  it("should exercise every shared rule at least once, so no comparison is vacuous", () => {
    // A parity check whose fixtures are all legal compares `[] === []` sixteen times and would stay
    // green through any drift. This pins that the set actually reaches each branch.
    const kinds = new Set<string>();
    for (const { five } of FIXTURES)
      for (const token of verdict(checkEntrance(asEntrance(five))).shared)
        kinds.add(token.split(":")[0]);
    expect([...kinds].sort()).toEqual([
      "duration-invalid",
      "out-of-order",
      "start-invalid",
    ]);
  });

  it("should reach the ceiling and the hold rules too, as classified divergences", () => {
    const seen = new Set<string>();
    for (const { five } of FIXTURES) {
      for (const d of verdict(checkEntrance(asEntrance(five))).divergences)
        seen.add(`web:${d}`);
      for (const d of verdict(checkTiming(asTiming(five))).divergences)
        seen.add(`video:${d}`);
    }
    expect([...seen].sort()).toEqual(["web:entrance-ceiling"]);
  });

  for (const { label, five } of FIXTURES) {
    it(`${label} — both checks agree`, () => {
      const web = verdict(checkEntrance(asEntrance(five)));
      const video = verdict(checkTiming(asTiming(five)));

      // Unclassified first, and separately: a message neither pattern recognises means a rule
      // appeared on one side and this guard has no opinion about it, which is the hole this file
      // exists to close. It fails rather than being dropped.
      expect([
        "unclassified",
        [...web.unclassified, ...video.unclassified],
      ]).toEqual(["unclassified", []]);

      expect([label, web.shared]).toEqual([label, video.shared]);
    });
  }
});

describe("atProgress — the label rule's only tool, and its own claim", () => {
  it("should be the exact inverse of progressOf, which is what its doc-comment promises", () => {
    // `progressOf(atProgress(e, f), e) === f`. The label rule rests on this: a beat computes WHERE
    // the reveal's head is as a fraction, the way the video does, then turns it into one CSS delay.
    const events = [
      WEB_ENTRANCE.establish,
      WEB_ENTRANCE.reference,
      WEB_ENTRANCE.reveal,
      WEB_ENTRANCE.subject,
      WEB_ENTRANCE.conclusion,
    ];
    const mismatched: string[] = [];
    for (const event of events)
      for (const f of [0, 0.06, 0.25, 0.5, 0.55, 0.75, 1]) {
        const back = progressOf(atProgress(event, f), event);
        // `atProgress` rounds to a whole millisecond — CSS is handed a whole number of them — so the
        // fraction cannot come back exact, and the tolerance is stated in the unit the rounding
        // happens in rather than as a fraction. Half a millisecond is the most a round can move it.
        // `1e-9` is for the float representation of the divide-and-multiply that gets us back here,
        // and it is not slack in the claim: at 0.25 of a 290ms event the ideal is 72.5ms, the
        // rounding lands on 73, and the drift is 0.5 to the last bit the double can hold.
        const driftMs = Math.abs(back - f) * event.duration;
        if (driftMs > 0.5 + 1e-9)
          mismatched.push(
            `start ${event.start} duration ${event.duration} at ${f} came back ${back} ` +
              `(${driftMs.toFixed(3)}ms out)`,
          );
      }
    expect(mismatched).toEqual([]);
  });

  it("should clamp its fraction the way progressOf clamps its moment", () => {
    // The clamp is the reason `progressOf` was copied with its own comment: an unclamped window
    // keeps moving outside itself. The inverse has to hold the same line, or a derived delay lands
    // outside the event it was derived from and the ceiling check is measuring the wrong thing.
    expect(atProgress(WEB_ENTRANCE.reveal, -1)).toBe(WEB_ENTRANCE.reveal.start);
    expect(atProgress(WEB_ENTRANCE.reveal, 2)).toBe(
      WEB_ENTRANCE.reveal.start + WEB_ENTRANCE.reveal.duration,
    );
  });
});

describe("the edit itself is legal, on both sides of the copy", () => {
  it("should hold this genre's own entrance to its own rules", () => {
    expect(checkEntrance(WEB_ENTRANCE)).toEqual([]);
  });

  it("should hold the video's own timing to the video's rules", () => {
    expect(checkTiming(CO2_TIMING)).toEqual([]);
  });

  it("should keep the stated ceiling above what this genre's own edit needs", () => {
    // Not arithmetic on the pace — see "what this provably does not catch". Just the one relation
    // that would make the ceiling a lie if the edit grew past it and the number stayed.
    expect(
      WEB_ENTRANCE.conclusion.start + WEB_ENTRANCE.conclusion.duration,
    ).toBeLessThanOrEqual(ENTRANCE_CEILING_MS);
  });
});
