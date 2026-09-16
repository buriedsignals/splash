// twin/skills/chart-video/scripts/choreography.mjs
//
// EVERY EVENT CHANGES THE PICTURE — EXCEPT A FINAL HOLD, WHICH BY DEFINITION CHANGES NOTHING. A
// directed video is the static beat's subject choreographed, not its plate replayed
// (`references/directed-type-choreography.md`). The runner computes the picture's state at the end
// of each event of the timing contract — a fill, a window, a count, a filter — and this refuses the
// event a viewer would sit through while nothing moves, with one named exception: a `hold` in the
// LAST position plays no gesture of its own (the motion grammar's own rule), so its
// state must EQUAL the one before it, and a hold whose state differs is refused just as loudly — it
// would mean the hold is smuggling in a gesture the timing contract never named. A `hold` anywhere
// but last carries no such exemption. The scrolly's `assertStates` is the same rule for a card.

import { assertionId, parseGesture } from "#shared/editorial/frame.mjs";

export function assertEventStates(states, events) {
  if (states.length !== events.length)
    throw new Error(`${states.length} states for ${events.length} events: one state closes each event`);
  states.forEach((state, i) => {
    for (const [key, value] of Object.entries(state))
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${events[i]}.${key} is ${JSON.stringify(value)}; every field of a state must be a finite number`);
    if (i > 0) {
      const before = states[i - 1];
      const keys = new Set([...Object.keys(before), ...Object.keys(state)]);
      const unchanged = [...keys].every((k) => before[k] === state[k]);
      const isFinalHold = i === states.length - 1 && events[i] === "hold";
      if (isFinalHold && !unchanged)
        throw new Error(
          `hold changes the picture: its state differs from ${events[i - 1]}'s, but the last event of ` +
            `a beat plays no gesture of its own — it is the frame a viewer actually reads, held still ` +
            `(references/directed-type-choreography.md)`,
        );
      if (!isFinalHold && unchanged)
        throw new Error(
          `${events[i]} changes nothing: its state is ${events[i - 1]}'s. Give it a gesture of its own — ` +
            `reveal, filter, zoom, reorder, rescale, count, compare, trace, name — or fold it into ` +
            `${events[i - 1]} (references/directed-type-choreography.md)`,
        );
    }
  });
  return states;
}

// ── WHAT A VIDEO BEAT DECLARES, READ — AND NOTHING GENERATED ──────────────────────────────────
//
// Ruling R-D (`docs/splash/2026-09-17-editorial-chain-spec.md`): the choreography is AUTHORED, per
// subject. Everything below reads the six-row event table the beat's own `## The choreography`
// already carries and joins it to the beat's own timing contract. There is no seed ladder, no
// default gesture and no `derive*`; `checkChoreography` NEVER COMPARES `declared` TO ANOTHER
// CHOREOGRAPHY, the worked example's included. The frame carries the worked example's NAME so a
// caller can assert difference — never equality.
//
// THE SHAPE, transcribed from what 39 of the 40 video beats already write (spec §2.5):
//   { kind: "time", fps, shots: [{ shot, gesture: string[], start, duration, asserts: string[] }] }
// Columns two and four — "what the shot says", "what the viewer sees move" — are the journalist's
// sentences and are dropped on the floor: a value block holds no prose (R-C).
//
// `start` AND `duration` ARE NOT IN THE TABLE. They are in the beat's own `timing-contract.ts`,
// which all 40 beats carry, and they are joined in from the `BeatTiming` object the caller passes —
// the same object `checkTiming` validates. Re-parsing the contract here would have given the chain
// a second, weaker reader of a file that already has an exact one.


/**
 * The six events, in the one order a directed beat plays them.
 *
 * A DELIBERATE DUPLICATE of the timing contract's own `EVENT_ORDER`, because this module is carried
 * verbatim into `map-beat`, where that contract lives under a different filename
 * (`assets/timing-contract.ts`, not `assets/timing.ts`) — an import here could only be right in one
 * of the two skills. `parse-the-declared-choreography.test.ts` asserts the two lists agree, so the
 * duplicate cannot drift silently.
 */
export const EVENT_ORDER = Object.freeze([
  "establish",
  "reference",
  "reveal",
  "subject",
  "conclusion",
  "hold",
]);

/**
 * WHICH SHOTS OWE A NAMED GESTURE, AND WHY IT IS TWO AND NOT SIX.
 *
 * The plan, and the first cut of this checker, read an empty gesture cell on any middle event as
 * `no-replay-static-plate` — "the static plate switched on on a timer". Measured against the 40
 * committed video beats, that read is wrong twice over:
 *
 *   17 of 40 write `reference` as `— (furniture)` — the shot that puts up the axes, the key and
 *   the ground before any value is drawn;
 *    7 of 40 write `conclusion` as `—` with "the credit" in the column that says what moves.
 *
 * Neither is a frozen picture, and the proof is not in the table: `assertEventStates`, at the top
 * of this same file, refuses at RENDER TIME any event whose state equals the one before it. That
 * is the guard on "every event transforms the picture", it runs on the beat's real states, and it
 * passes on all 40. An empty gesture cell means "nothing from this type's vocabulary happens
 * here", which is a different statement and a legitimate one.
 *
 * So the violation is scoped to the two shots that carry the argument — `reveal` and `subject`.
 * A beat that names no gesture THERE has declared a slideshow whatever its states do. Every other
 * gestureless middle shot is reported as a `note`, so nothing is hidden by the narrowing.
 */
const ARGUMENT_SHOTS = Object.freeze(["reveal", "subject"]);
/** Where an empty gesture cell is the corpus's own convention rather than a finding. */
const CONVENTIONALLY_SILENT = Object.freeze(["establish", "hold"]);

/** The prohibition a middle event with no gesture breaks, in every one of the 40 video sheets. */
export const TIMER_PROHIBITION = "no-replay-static-plate";
/** The prohibition a final hold that smuggles in a gesture breaks. */
export const HOLD_PROHIBITION = "no-hold-event-computed";

const CHOREOGRAPHY_HEADING = /^##\s+The choreography\b/i;

/**
 * WHICH COLUMN IS WHICH, BY ITS OWN HEADER — never by position.
 *
 * The plan read the gesture from column three and the asserted values from column five. Measured:
 * `proof/video-choropleth-europe-lowcarbon` writes a SIX-column table — it carries a `card` column
 * beside the event, because a map video's shots and its scrolly sibling's cards are the same
 * ladder — and every column after the first is therefore one to the right. Reading by position
 * gave that beat a sentence where its gesture should have been. The header is what the beat
 * itself wrote down; it is what is read.
 */
function columnOf(header, test, fallback) {
  const at = header.findIndex((cell) => test(String(cell).replace(/[`*]/g, "").trim().toLowerCase()));
  return at < 0 ? fallback : at;
}

/** The rows of the first table under `## The choreography` whose first column is `event`. */
function eventTableRows(briefText) {
  const lines = String(briefText).split(/\r?\n/);
  let inside = false;
  let header = null;
  const rows = [];
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (header) break;
      inside = CHOREOGRAPHY_HEADING.test(line);
      continue;
    }
    if (!inside) continue;
    if (!line.trim().startsWith("|")) {
      if (header) break;
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (/^-+$/.test(cells[0].replace(/[:\s]/g, ""))) continue;
    if (!header) {
      if (/^event$/i.test(cells[0].replace(/[`*]/g, ""))) header = cells;
      continue;
    }
    rows.push(cells);
  }
  return { header: header ?? [], rows };
}

/**
 * THE DERIVED VALUES A SHOT ASSERTS, as ids — the beat's own column five, slugged.
 *
 * Column five is written in the beat's own words and its own language ("the five, 11,7 < 12,3"),
 * which is a sentence and may not enter a value block (R-C). Splitting on the cell's own clause
 * separators and slugging each clause gives a STABLE HANDLE for the same assertion without either
 * inventing an id the beat never wrote or smuggling the sentence through. The em dash the corpus
 * writes for "nothing asserted here" gives `[]`.
 */
export function parseAsserts(cell) {
  const plain = String(cell ?? "").replace(/[*`]/g, "").trim();
  if (plain === "" || /^[—–-]+$/.test(plain)) return [];
  return plain
    .split(/[;,]\s+/)
    .map((clause) => assertionId(clause))
    .filter(Boolean);
}

/**
 * The beat's declared unfolding in time.
 *
 * @param {string} briefText the beat's own `BRIEF.md`, unmodified
 * @param {{ timing: { fps: number, [event: string]: { start: number, duration: number } } }} ctx
 *   the beat's own timing contract — the object `checkTiming` validates, not a re-parse of the file
 */
export function parseChoreography(briefText, ctx = {}) {
  const { header, rows } = eventTableRows(briefText);
  if (rows.length === 0)
    throw new Error(
      "this beat declares no choreography: `## The choreography` carries no `| event |` table. " +
        "Nothing here writes one — a video's shot ladder is authored, per subject.",
    );
  const timing = ctx.timing;
  if (!timing || typeof timing.fps !== "number")
    throw new Error(
      "parseChoreography needs the beat's own timing contract: `start` and `duration` are not in " +
        "the table, they are in `timing-contract.ts`, and they are joined in rather than re-parsed.",
    );

  const gestureAt = columnOf(header, (h) => h === "gesture", 2);
  const assertsAt = columnOf(header, (h) => /derived value|asserted/.test(h), 4);
  const shots = rows.map((cells) => {
    const shot = String(cells[0]).replace(/[`*]/g, "").trim();
    const event = timing[shot];
    if (!event)
      throw new Error(
        `the table declares the shot ${JSON.stringify(shot)}, which the beat's timing contract ` +
          `does not time. The contract's events are ${EVENT_ORDER.join(", ")}.`,
      );
    return {
      shot,
      gesture: parseGesture(cells[gestureAt] ?? ""),
      start: event.start,
      duration: event.duration,
      asserts: parseAsserts(cells[assertsAt] ?? ""),
    };
  });
  return { kind: "time", fps: timing.fps, shots };
}

/**
 * Does this declaration honour its type's frame, and the export's own shape?
 *
 * Returns `[{ id, severity, says }]`, empty when it does. Two severities, and two kinds of id:
 *   ids beginning `no-`  — a prohibition the TYPE SHEET states, cited by the sheet's own id;
 *   ids not beginning `no-` — a rule of the EXPORT'S SHAPE, which no sheet states because every
 *                             type of this export owes it (here: the shot ladder).
 * `severity: "note"` is a gesture atom the sheet has not recorded yet; the vocabulary is OPEN
 * (spec §2.2) and the corpus extended it subject by subject.
 *
 * IT NEVER COMPARES AGAINST AN EXPECTED CHOREOGRAPHY. See the header.
 */
export function checkChoreography(declared, frame = {}) {
  const out = [];
  const stated = new Map((frame.prohibitions ?? []).map((p) => [p.id, p.says ?? ""]));
  const shots = declared.shots ?? [];

  // The shape: the six events of `EVENT_ORDER`, in that order, and no shot beginning before the
  // one before it has finished — `checkTiming`'s own rule, asked of the DECLARATION this time.
  const played = shots.map((s) => s.shot);
  if (played.join(">") !== EVENT_ORDER.join(">"))
    out.push({
      id: "shot-ladder",
      severity: "violation",
      says:
        `the ladder is ${played.join(" → ") || "empty"}; a directed beat plays ` +
        `${EVENT_ORDER.join(" → ")}, all six, in that order`,
    });
  for (let i = 1; i < shots.length; i++) {
    const previous = shots[i - 1];
    if (shots[i].start < previous.start + previous.duration)
      out.push({
        id: "shot-ladder",
        severity: "violation",
        says:
          `${shots[i].shot} starts at ${shots[i].start}, before ${previous.shot} finishes at ` +
          `${previous.start + previous.duration}`,
      });
  }

  // The two shots that carry the argument owe a named gesture; see `ARGUMENT_SHOTS` above for why
  // the other four do not, and for what actually guards "every event transforms the picture".
  const silent = shots.filter((s) => (s.gesture ?? []).length === 0);
  const idle = silent.filter((s) => ARGUMENT_SHOTS.includes(s.shot));
  if (idle.length && stated.has(TIMER_PROHIBITION))
    out.push({
      id: TIMER_PROHIBITION,
      severity: "violation",
      says: `${idle.map((s) => s.shot).join(", ")} declare no gesture — ${stated.get(TIMER_PROHIBITION)}`,
    });
  for (const shot of silent)
    if (!ARGUMENT_SHOTS.includes(shot.shot) && !CONVENTIONALLY_SILENT.includes(shot.shot))
      out.push({
        id: "gesture-unnamed",
        severity: "note",
        says: `\`${shot.shot}\` names no gesture of this type's vocabulary — what moves there is furniture, a credit, or a change the table does not name`,
      });

  // The last event of a beat plays no gesture of its own: it is the frame a viewer reads, held.
  const last = shots[shots.length - 1];
  if (last && last.shot === "hold" && (last.gesture ?? []).length && stated.has(HOLD_PROHIBITION))
    out.push({
      id: HOLD_PROHIBITION,
      severity: "violation",
      says: `the hold declares \`${last.gesture.join(" + ")}\` — ${stated.get(HOLD_PROHIBITION)}`,
    });

  const vocabulary = new Set(
    (frame.vocabulary ?? []).flatMap((entry) =>
      String(entry).toLowerCase().split("/").map((atom) => atom.trim()).filter(Boolean),
    ),
  );
  const known = (atom) =>
    [...vocabulary].some(
      (entry) => entry === atom || entry.startsWith(`${atom} `) || atom.startsWith(`${entry} `),
    );
  for (const atom of new Set(shots.flatMap((s) => (s.gesture ?? []).map((g) => g.toLowerCase()))))
    if (!known(atom))
      out.push({
        id: "vocabulary-addition",
        severity: "note",
        says: `\`${atom}\` is not in this type's \`## Shot gestures\` yet — the sheet owes the entry`,
      });

  return out;
}
