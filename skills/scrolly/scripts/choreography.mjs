// twin/skills/scrolly/scripts/choreography.mjs
//
// WHAT A SCROLLY BEAT DECLARES, READ — AND NOTHING GENERATED.
//
// Ruling R-D (`docs/splash/2026-09-17-editorial-chain-spec.md`): the choreography is AUTHORED, per
// subject. This module has no expected choreography, no seed, no default and no `derive*`. It reads
// the card table the beat's own `## The choreography` already carries, joins it to the per-card
// states the beat's own drive module already declares, and hands the result to a checker that asks
// three questions and no fourth — is one declared, is it this beat's own, does it break one of the
// type's stated prohibitions.
//
// `checkChoreography` NEVER COMPARES `declared` TO ANOTHER CHOREOGRAPHY. Not to the worked example's,
// not to a generated one. The moment it does, every beat of a type is pushed towards one piece, which
// is the clone factory this whole chain exists to prevent. The frame it is given carries a
// `workedExample` NAME precisely so the caller can assert difference, never equality.
//
// THE SHAPE, transcribed from what the 40 scrolly beats already write (spec §2.5):
//   { kind: "scroll", cards: [{ card: number, gesture: string[], changes: string[] }] }
// The table's prose columns — "what the card says", "what the reader sees move" — are dropped on the
// floor here. They are the journalist's sentences; a value block holds no sentences (R-C).

import { parseGesture } from "#shared/editorial/frame.mjs";

/** The heading a scrolly beat writes its card table under, in either of the corpus's two casings. */
const CHOREOGRAPHY_HEADING = /^##\s+The choreography\b/i;

/** The prohibition a card that changes nothing breaks, in every one of the 40 scrolly sheets. */
export const SLIDESHOW_PROHIBITION = "no-replay-static-plate";

/**
 * The rows of the first markdown table under `## The choreography` whose first column is `card`.
 *
 * Found by its header rather than by position: a beat is free to put a paragraph, a list or a second
 * table in that section, and several do.
 */
function cardTableRows(briefText) {
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
      if (/^card$/i.test(cells[0])) header = cells;
      continue;
    }
    rows.push(cells);
  }
  return { header: header ?? [], rows };
}

/**
 * THE BEAT'S OWN PER-CARD STATES, when it writes them as literals.
 *
 * `assertStates` (`skills/scrolly/assets/reveal.mjs`) already compares card n to card n−1 at render
 * time — this reads the same array so `changes` is READ, not re-derived. 26 of the 40 beats write
 * `const STATES = [ … ]` as numeric literals; the other 14 compute theirs, and for those the caller
 * passes the states it imported. Returns `null` rather than guessing, so a computed states array is
 * a missing input the caller must supply and never a silently empty one.
 */
export function declaredStatesFrom(source) {
  const text = String(source ?? "");
  const at = text.search(/\bconst STATES\s*=\s*\[/);
  if (at < 0) return null;
  const open = text.indexOf("[", at);
  let depth = 0;
  let close = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "[") depth += 1;
    else if (text[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) return null;
  const body = text
    .slice(open, close + 1)
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    const states = JSON.parse(body);
    if (!Array.isArray(states)) return null;
    for (const state of states)
      for (const value of Object.values(state ?? {}))
        if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return states;
  } catch {
    return null;
  }
}

/**
 * WHICH STATE KEY IS THE CARD-NOTE INDEX, and why it is excluded from `changes`.
 *
 * Every scrolly drive module carries one field that simply counts the cards — it cross-fades the
 * note, so it advances by one on every card by construction. Left in, EVERY card would report a
 * change and `no-replay-static-plate` could never fire on anything; the prohibition would be
 * unenforceable. It is detected STRUCTURALLY — a key whose value is the card's own index on every
 * card — rather than by the name `note`, so a beat that calls it something else is read the same.
 */
function cardIndexKeys(states) {
  const keys = new Set();
  for (const key of Object.keys(states[0] ?? {}))
    if (states.every((state, i) => state[key] === i)) keys.add(key);
  return keys;
}

/** The state keys card n differs from card n−1 in; the first card changes nothing before it. */
function changesPerCard(states) {
  const skip = cardIndexKeys(states);
  return states.map((state, i) => {
    if (i === 0) return [];
    const before = states[i - 1];
    return [...new Set([...Object.keys(before), ...Object.keys(state)])]
      .filter((key) => !skip.has(key) && before[key] !== state[key])
      .sort();
  });
}

/**
 * The beat's declared card-to-card travel.
 *
 * @param {string} briefText the beat's own `BRIEF.md`, unmodified
 * @param {{ states: Array<Record<string, number>> }} ctx the beat's own per-card states
 * @returns {{ kind: "scroll", cards: Array<{ card: number, gesture: string[], changes: string[] }> }}
 */
export function parseChoreography(briefText, ctx = {}) {
  const { header, rows } = cardTableRows(briefText);
  if (rows.length === 0)
    throw new Error(
      "this beat declares no choreography: `## The choreography` carries no `| card |` table. " +
        "Nothing here writes one — a scrolly's card-to-card travel is authored, per subject.",
    );

  const states = ctx.states;
  if (!Array.isArray(states))
    throw new Error(
      "parseChoreography needs the beat's own per-card states — `changes` is READ from them, the " +
        "same comparison `assertStates` performs, never re-derived from the table's prose.",
    );
  if (states.length !== rows.length)
    throw new Error(
      `${rows.length} cards declared and ${states.length} states: one state closes each card`,
    );

  const changes = changesPerCard(states);
  // The gesture column is found by its own HEADER, not by position: a map scrolly's table carries
  // an extra column and every column after the first is then one to the right — the defect
  // `proof/video-choropleth-europe-lowcarbon` exposed in the video half of this same reader.
  const gestureAt = (() => {
    const at = header.findIndex((cell) => /^gesture$/i.test(String(cell).replace(/[`*]/g, "").trim()));
    return at < 0 ? 2 : at;
  })();
  const cards = rows.map((cells, i) => {
    const card = Number(String(cells[0]).replace(/[^0-9]/g, ""));
    if (card !== i + 1)
      throw new Error(
        `card ${JSON.stringify(cells[0])} is row ${i + 1}: a scrolly's cards are 1..n, in order`,
      );
    return { card, gesture: parseGesture(cells[gestureAt] ?? ""), changes: changes[i] };
  });
  return { kind: "scroll", cards };
}

/**
 * Does this declaration honour its type's frame?
 *
 * Returns `[{ id, severity, says }]`, empty when it does. Two severities and no third:
 *   `violation` — a prohibition the type sheet states, cited by its own id;
 *   `note`      — a gesture atom the sheet does not list yet. The vocabulary is OPEN (spec §2.2):
 *                 the 240 real cells extended it subject by subject, so an unlisted atom is an
 *                 addition the SHEET owes, never a failure of the beat.
 *
 * IT NEVER COMPARES AGAINST AN EXPECTED CHOREOGRAPHY. See the header.
 */
export function checkChoreography(declared, frame = {}) {
  const out = [];
  const stated = new Map(
    (frame.prohibitions ?? []).map((p) => [p.id, p.says ?? ""]),
  );

  // Every card changes the picture. A card whose state equals the one before it is a card the
  // reader scrolls through while nothing moves — the static plate replayed as a slideshow.
  const frozen = (declared.cards ?? []).filter(
    (c) => c.card > 1 && (c.changes ?? []).length === 0,
  );
  if (frozen.length && stated.has(SLIDESHOW_PROHIBITION))
    out.push({
      id: SLIDESHOW_PROHIBITION,
      severity: "violation",
      says:
        `card${frozen.length > 1 ? "s" : ""} ${frozen.map((c) => c.card).join(", ")} ` +
        `change nothing — ${stated.get(SLIDESHOW_PROHIBITION)}`,
    });

  const vocabulary = new Set(
    (frame.vocabulary ?? []).flatMap((entry) =>
      String(entry)
        .toLowerCase()
        .split("/")
        .map((atom) => atom.trim())
        .filter(Boolean),
    ),
  );
  const known = (atom) =>
    [...vocabulary].some(
      (entry) => entry === atom || entry.startsWith(`${atom} `) || atom.startsWith(`${entry} `),
    );
  for (const atom of new Set(
    (declared.cards ?? []).flatMap((c) => (c.gesture ?? []).map((g) => g.toLowerCase())),
  ))
    if (!known(atom))
      out.push({
        id: "vocabulary-addition",
        severity: "note",
        says: `\`${atom}\` is not in this type's \`## Scroll gestures\` yet — the sheet owes the entry`,
      });

  return out;
}

// ── THE EMPTY SECTION A SCAFFOLD WRITES ────────────────────────────────────────────────────────
//
// Spec §2.5: at scaffold time a beat gets the export's table headers, the type sheet's vocabulary
// and prohibitions quoted as a comment for the author, and NO ROWS AND NO BLOCK. A scaffold that
// pre-filled a row would be the clone factory R-D forbids — it is the one place where "helpfully"
// seeding a table turns 40 pieces into one piece rendered 40 times.
//
// The beat gains `derived: v1` and its blocks only when its author fills the table and runs
// `bun scripts/migrate-briefs.mjs --harvest --beat <dir>`.

/** The frame, quoted for the author — never a suggestion of what to write, only of what is owed. */
function frameComment(frame, lines) {
  const vocabulary = (frame?.vocabulary ?? []).map((atom) => `  ${atom}`);
  const prohibitions = (frame?.prohibitions ?? []).map((p) => `  ${p.id ?? "(no id)"} — ${p.says}`);
  return [
    "<!-- THE FRAME THIS TYPE SUPPLIES. The choreography itself is yours, written from the subject.",
    ...lines,
    "",
    vocabulary.length ? "  gestures this type records (the list is OPEN — add to the sheet):" : "",
    ...vocabulary,
    prohibitions.length ? "" : "",
    prohibitions.length ? "  a choreography of this type must NOT:" : "",
    ...prohibitions,
    "",
    `  worked example: ${frame?.workedExample ?? "(none filed)"}`,
    "-->",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** `## The choreography`, empty: the card table's headers, the frame quoted, and no rows. */
export function renderChoreographySection(frame) {
  return [
    "## The choreography",
    "",
    frameComment(frame, [
      "     A scrolly is the CARD-TO-CARD TRAVEL: what changes between card n and card n+1, and by",
      "     which gesture. Every card changes the picture, interpolated from the scroll's own",
      "     progress — never the static plate replayed as a slideshow.",
    ]),
    "",
    "| card | what the card says | gesture | what the reader sees move |",
    "| --- | --- | --- | --- |",
    "",
  ].join("\n");
}
