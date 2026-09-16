// twin/skills/chart-beat/scripts/choreography.mjs
//
// THE READING ORDER OF ONE COMPOSED FRAME — THE SHAPE AND THE CHECKER, WITH NO CORPUS BEHIND THEM.
//
// Spec §1.3: 0 of the 40 static beats declares a reading order today. Under R-D nothing here may
// invent one, so this module builds the shape a declaration is WRITTEN IN and the checker that
// reads it back, and writes none. The 40 are a worklist for a person, not an input to a generator.
//
// STATIC IS CHOREOGRAPHED IN SPACE, NOT IN TIME (§1.2). Where the eye enters, the sequence the
// marks and annotations lead it through, what is subordinate to what, and at which station the
// claim lands. There is no clock: a declaration carrying a `start`, a `duration`, an `fps` or a
// frame index has been written against the video's shape by mistake, and is refused by name rather
// than quietly accepted with a field nothing reads.
//
// THE SHAPE (spec §2.5):
//   { kind: "frame", entry, stations: [{ station, carries, subordinateTo }], claimLands }
//
// AND THE FOURTH REFUSAL, which is the one that needs the composition: `entry`, every `carries` and
// every `subordinateTo` names a ROLE the composition actually contains — a mark set or an
// annotation the beat draws. A reading order through marks nobody drew is the failure this catches,
// and it is why `ctx` carries the composition's own roles rather than a list written here.

/**
 * The five stations of one frame, in the order an argument is read.
 *
 * The house vocabulary already exists, twice: the video's `EVENT_ORDER` minus its `hold`, and the
 * same five copied into `chart-web/assets/entrance.ts` as `ENTRANCE_ORDER` so a web entrance
 * "carries the ARGUMENT's order". A static's stations are that same argument, standing still.
 * Declared here rather than imported because this module is carried into three other skills, where
 * that file is not.
 */
export const STATION_ORDER = Object.freeze([
  "establish",
  "reference",
  "reveal",
  "subject",
  "conclusion",
]);

/** The refusal `kind: "none"` gets, by name. */
export const NOT_IN_TIME =
  'a static frame is choreographed in space, not in time — it is never "none"';

const CHOREOGRAPHY_HEADING = /^##\s+The choreography\b/i;
/** A column or a field that only a clock could fill. */
const TIME_FIELD = /\b(start|duration|fps)\b|\bframe\s*\d/i;

/** The lines of the `## The choreography` section, heading excluded. */
function sectionLines(briefText) {
  const lines = String(briefText).split(/\r?\n/);
  const out = [];
  let inside = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (inside) break;
      inside = CHOREOGRAPHY_HEADING.test(line);
      continue;
    }
    if (inside) out.push(line);
  }
  return out;
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** `` **The eye enters at** `columns`. `` → `columns`. */
function boldLead(lines, label) {
  for (const line of lines) {
    const at = line.indexOf(label);
    if (at < 0) continue;
    const rest = line.slice(at + label.length);
    const role = /`([^`]+)`/.exec(rest);
    if (role) return role[1].trim();
  }
  return null;
}

const bare = (cell) => String(cell).replace(/[`*]/g, "").trim();
const isDash = (cell) => /^[—–-]*$/.test(bare(cell));

/**
 * The beat's declared reading order through one frame.
 *
 * @param {string} briefText the beat's own `BRIEF.md`
 * @param {{ marks?: string[], annotations?: string[] }} ctx the roles the composition contains —
 *   a reading order may only name marks and annotations the beat actually draws
 */
export function parseChoreography(briefText, ctx = {}) {
  const lines = sectionLines(briefText);
  if (lines.length === 0)
    throw new Error(
      "this beat declares no choreography: it carries no `## The choreography`. Nothing here " +
        "writes one — a frame's reading order is authored, per subject.",
    );
  if (lines.some((line) => /^\s*(\*\*)?\s*none\b/i.test(line)))
    throw new Error(NOT_IN_TIME);

  const rows = [];
  let header = null;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      if (header) break;
      continue;
    }
    const cells = tableCells(line);
    if (/^-+$/.test(cells[0].replace(/[:\s]/g, ""))) continue;
    if (!header) {
      if (/^station$/i.test(bare(cells[0]))) header = cells;
      continue;
    }
    rows.push(cells);
  }
  if (!header)
    throw new Error(
      "this beat declares no choreography: `## The choreography` carries no `| station |` table.",
    );
  const clock = header.find((cell) => TIME_FIELD.test(bare(cell)));
  if (clock) throw new Error(`${NOT_IN_TIME} (the table carries a \`${bare(clock)}\` column)`);

  const carriesAt = header.findIndex((cell) => /^carries$/i.test(bare(cell)));
  const underAt = header.findIndex((cell) => /^subordinate to$/i.test(bare(cell)));
  if (carriesAt < 0 || underAt < 0)
    throw new Error(
      "a station table declares `station`, `carries` and `subordinate to`: what each station puts " +
        "in front of the eye, and what it is read beneath.",
    );

  if (rows.length < 2)
    throw new Error(
      `${rows.length} station declared: a reading order is an ORDER, so it needs at least two. ` +
        "A frame with one station is a frame nobody has decided how to read.",
    );

  const seen = new Set();
  let highest = -1;
  const stations = rows.map((cells) => {
    const station = bare(cells[0]);
    const rank = STATION_ORDER.indexOf(station);
    if (rank < 0)
      throw new Error(
        `\`${station}\` is not a station: the five are ${STATION_ORDER.join(", ")}.`,
      );
    if (seen.has(station))
      throw new Error(`\`${station}\` is declared twice: a frame is read through each station once.`);
    if (rank < highest)
      throw new Error(
        `\`${station}\` follows a later station: the order is ${STATION_ORDER.join(" → ")}, and a ` +
          "declaration may skip a station but never reverse two.",
      );
    seen.add(station);
    highest = rank;
    return {
      station,
      carries: bare(cells[carriesAt]),
      subordinateTo: isDash(cells[underAt]) ? null : bare(cells[underAt]),
    };
  });

  const roles = new Set([...(ctx.marks ?? []), ...(ctx.annotations ?? [])]);
  const entry = boldLead(lines, "eye enters at");
  const claimLands = boldLead(lines, "claim lands at");
  if (!entry || !claimLands)
    throw new Error(
      "a reading order states where the eye ENTERS and where the claim LANDS: " +
        "`**The eye enters at** `<role>`. **The claim lands at** `<station>`.`",
    );
  if (!STATION_ORDER.includes(claimLands))
    throw new Error(
      `the claim lands at \`${claimLands}\`, which is not a station: the five are ${STATION_ORDER.join(", ")}.`,
    );
  if (!seen.has(claimLands))
    throw new Error(`the claim lands at \`${claimLands}\`, a station this frame does not declare.`);

  if (roles.size) {
    for (const role of [entry, ...stations.map((s) => s.carries)])
      if (!roles.has(role))
        throw new Error(
          `\`${role}\` is not in this composition: a reading order may only lead the eye through ` +
            `marks and annotations the beat draws (${[...roles].join(", ")}).`,
        );
    for (const station of stations)
      if (station.subordinateTo !== null && !roles.has(station.subordinateTo))
        throw new Error(
          `\`${station.station}\` is subordinate to \`${station.subordinateTo}\`, which this ` +
            "composition does not contain.",
        );
  }

  return { kind: "frame", entry, stations, claimLands };
}

/**
 * Does this declaration honour the export's shape and the type's frame?
 *
 * Ids beginning `no-` are prohibitions a type sheet states; ids that do not are rules of the
 * export's own shape. It NEVER COMPARES `declared` TO ANOTHER READING ORDER — the frame carries the
 * worked example's NAME so a caller can assert difference, never equality.
 *
 * The static sheets' own prohibitions are about what the PLATE draws — more than one accent, a
 * legend where a direct label would do, furniture with a colour of its own, a value axis off zero —
 * and the render-time guards already refuse those against the real composition. Two of them are
 * decidable from the reading order itself, and those two are checked here.
 */
export function checkChoreography(declared, frame = {}) {
  const out = [];
  const stated = new Map((frame.prohibitions ?? []).map((p) => [p.id, p.says ?? ""]));

  if (declared?.kind !== "frame") {
    out.push({ id: "not-in-time", severity: "violation", says: NOT_IN_TIME });
    return out;
  }
  // `kind: "frame"` is the shape's own name, not a frame index — the clock is looked for in what
  // the declaration says about its stations.
  const { kind, ...withoutTheShapeName } = declared;
  if (TIME_FIELD.test(JSON.stringify(withoutTheShapeName)))
    out.push({ id: "not-in-time", severity: "violation", says: NOT_IN_TIME });

  const stations = declared.stations ?? [];

  // One accent: the claim is about ONE thing, so exactly one station is subordinate to nothing —
  // the frame's own top of the reading order. Two unsubordinated stations are two accents.
  const top = stations.filter((s) => s.subordinateTo === null);
  if (top.length > 1 && stated.has("no-accent-thing-claim"))
    out.push({
      id: "no-accent-thing-claim",
      severity: "violation",
      says:
        `${top.map((s) => s.station).join(", ")} are each subordinate to nothing — ` +
        stated.get("no-accent-thing-claim"),
    });

  // A station cannot be read beneath what it carries: that is a loop, not an order.
  for (const station of stations)
    if (station.subordinateTo !== null && station.subordinateTo === station.carries)
      out.push({
        id: "station-order",
        severity: "violation",
        says: `\`${station.station}\` is subordinate to the very thing it carries`,
      });

  const vocabulary = new Set(
    (frame.vocabulary ?? []).flatMap((entry) =>
      String(entry).toLowerCase().split("/").map((atom) => atom.trim()).filter(Boolean),
    ),
  );
  if (vocabulary.size)
    for (const station of stations)
      if (
        ![...vocabulary].some((entry) =>
          entry.includes(station.station.toLowerCase()),
        )
      )
        out.push({
          id: "vocabulary-addition",
          severity: "note",
          says: `\`${station.station}\` is not in this type's \`## Reading stations\` yet — the sheet owes the entry`,
        });

  return out;
}
