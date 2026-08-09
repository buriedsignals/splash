// The state of a story is its directory. Nothing is remembered between sessions.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function list(path) {
  try { return await readdir(path); } catch { return []; }
}

async function read(path) {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

function extractFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("---", 3);
  if (end === -1) return null;
  return content.substring(3, end);
}

// Whether a raw scalar's text is "missing" in the sense the whole gate cares about: absent,
// blank, or one of the bare/quoted-empty YAML sentinels for null. Shared by every scalar field
// this gate checks (the takeaway and each hand-of-the-journalist field), so "confirmed" always
// means the same thing regardless of which field is being read.
function isMissingScalar(value) {
  if (!value) return true;
  return value === '""' || value === "''" || value === "null" || value === "~";
}

// Reads one top-level scalar out of the front matter and resolves it the way twin-storyboard's own
// `scalar()` does — quotes stripped, the bare `null`/`~` sentinels resolved to a real missing
// value — so the two gates read the same string out of the same line. Returns the VALUE rather
// than a boolean because some scalars (`grounding`) are checked for their vocabulary, not merely
// their presence; a falsy return means "missing" for the ones that are not.
function scalarFieldValue(frontmatter, field) {
  if (!frontmatter) return null;
  const match = frontmatter.match(new RegExp(`^${field}:[ \\t]*([^\\n]+)$`, "m"));
  if (!match) return null;
  return scalarValue(match[1]);
}

// The six hand-of-the-journalist fields Gate 2 requires (spec §7 ③). This list, and the slot
// membership rule below, mirror twin-storyboard/scripts/storyboard.mjs's own `HAND` constant and
// `checkStoryboard` — reimplemented here, not imported, because skills in this branch do not
// import across skill boundaries (each treats the STORYBOARD.md file, not another skill's code,
// as the shared contract — see that same file's `isNullSentinel` comment for the established
// precedent: it already mirrors *this* file's takeaway-sentinel rule the same way). If you touch
// either list, mirror the change in the other — a test in `test/where.test.ts` pins every branch
// below so a real divergence fails loud rather than silently reporting `production` too early.
const HAND = ["subject", "comparison", "limits", "placement", "credit", "effectiveDate"];

// EVERY rule below reads a RECORDED SCALAR. That is the whole design, and it is what makes the
// mirroring above safe rather than merely careful. `checkStoryboard` used to accept a `profile` and
// a `capabilities` argument this gate structurally could not have, so it could refuse for three
// reasons this file could not see — and it did: `whereIs` reported `production` on a storyboard the
// other gate was refusing (twin/FEEDBACK-2026-08-10.md, A7/A14). The expensive checks now run ONCE,
// in the phase that owns them (grounding at G1, genre and capability at G2b), and write their
// resolved verdict into `STORYBOARD.md`. Neither gate can run a check the other cannot, because
// neither runs one at all.
//
// The four scalars added by that change: `grounding` (the G1 verdict), `reference` (the reference
// loop's answer, including "the journalist rejected both"), and per slot `size` and `reachable`.
export const REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "reference"];
export const REQUIRED_SLOT_FIELDS = ["medium", "genre", "size", "reachable", "chosen"];

// Ruling R2, spelled out here INDEPENDENTLY of twin-storyboard's own copy, for the same reason
// `HAND` is spelled out independently: two readings of one rule, cross-checked by a test, never
// unified by an import that would make this file un-copy-pasteable.
//
// `web` is deliberately absent from the sized genres, and that absence IS R2's other half: web is
// not a fourth export size, it fills whatever container the CMS gives it, like an embed component.
// `scrolly` is absent because a scroll-driven piece has no single exported frame at all. The pixel
// dimensions live in each craft skill's `scripts/sizes.mjs`; a gate has no business knowing them.
//
// Note the ORDERING difference from the original Splash, kept on purpose: it picks a CHANNEL and
// DERIVES the allowed formats from it. A5 asks for medium, then genre, then size, so the twin
// CHECKS the triple after the journalist has chosen each part. `genreGap` already has that shape.
const EXPORT_SIZES = ["landscape", "square", "portrait"];
const SIZED_GENRES = ["static", "video"];

// The three refusals, worded VERBATIM as twin-storyboard/scripts/storyboard.mjs's `sizeGap` words
// them. `splash-twin/test/where.test.ts` compares the two gates' size verdicts string for string,
// so a reworded message on either side reddens rather than quietly becoming two gates that refuse
// the same storyboard for two different-sounding reasons.
function sizeGapFor(genre, size, label) {
  const takesASize = SIZED_GENRES.includes(genre);
  if (!takesASize && size)
    return `slot ${label}: a ${genre} beat takes no size — it fills the container it is given`;
  if (!takesASize) return null;
  if (!size) return `slot ${label}: size is missing — gate 2c never closed`;
  if (!EXPORT_SIZES.includes(size))
    return `slot ${label}: size ${JSON.stringify(size)} is not one this toolchain exports — ${EXPORT_SIZES.join(", ")}`;
  return null;
}

// The closed vocabulary of `grounding:`. Mirrors twin-storyboard's own `isResolvedGrounding` for
// the same reason `HAND` mirrors its `HAND`. `contradicted` is deliberately not a closing value: a
// refuted takeaway is corrected, or overridden WITH A REASON.
const GROUNDING_VERDICTS = ["supported", "unverifiable"];
const OVERRIDE_RE = /^overridden\s*[—–-]\s*(.+)$/;

function isResolvedGrounding(value) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (GROUNDING_VERDICTS.includes(text)) return true;
  const override = OVERRIDE_RE.exec(text);
  return Boolean(override && override[1].replace(/^["']|["']$/g, "").trim());
}

// `missing` is read aloud to somebody resuming a story three days later, so every entry names the
// DECISION that has not been taken, not the field that is empty. A scalar with no entry here falls
// back to the hand-of-the-journalist wording, which is what the six of them have always read as.
const SCALAR_GAP = {
  takeaway: "a confirmed takeaway",
  grounding: "the G1 grounding verdict",
  reference: "the reference loop's answer",
};

const SCALAR_VOCABULARY = { grounding: isResolvedGrounding };
const SCALAR_VOCABULARY_GAP = {
  grounding: (value) => `a resolved grounding verdict (found ${JSON.stringify(value)})`,
};

const SLOT_VOCABULARY = { reachable: (value) => value === "yes" };

function slotGap(field, label) {
  if (field === "chosen") return `slot ${label}: nothing chosen`;
  if (field === "reachable") return `slot ${label}: this medium and genre were never confirmed reachable`;
  return `slot ${label}: no ${field} was ever chosen`;
}

// Quote-aware comma split, so a candidate name that itself contains a comma inside quotes
// (`["a, b", "c"]`) is not fragmented by a naive `.split(",")`. Mirrors
// twin-storyboard/scripts/storyboard.mjs's `splitArrayItems` for the same reason as `HAND` above.
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

function scalarValue(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return splitArrayItems(value.slice(1, -1))
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (isMissingScalar(value)) return null;
  return value.replace(/^["']|["']$/g, "");
}

// Reads only what this gate needs — each slot's `chosen` and `candidates` — from the `slots:`
// block. Not a general STORYBOARD.md reader (that is `parseStoryboard`'s job, in twin-storyboard);
// this walks the same line shapes for the same reason `HAND` mirrors that file's field list.
function parseSlotsForGate(frontmatter) {
  const slots = [];
  let sawSlots = false;
  let slot = null;
  for (const line of (frontmatter ?? "").split(/\r?\n/)) {
    if (/^slots:\s*$/.test(line)) { sawSlots = true; continue; }
    if (sawSlots && /^\s+-\s+/.test(line)) {
      slot = {};
      slots.push(slot);
      const first = /^\s+-\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (first) slot[first[1]] = scalarValue(first[2]);
      continue;
    }
    if (slot && /^\s{4,}[A-Za-z]+:/.test(line)) {
      const pair = /^\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (pair) slot[pair[1]] = scalarValue(pair[2]);
    }
  }
  return slots;
}

// The real Gate 2 condition (spec §4/§7): a confirmed takeaway alone is not enough to leave the
// `storyboard` phase — every hand-of-the-journalist field must be present, at least one slot must
// exist, and every slot's `chosen` must be a real choice drawn from its own listed `candidates`.
// Returns every reason the gate has not closed; an empty array means it has. Accumulates rather
// than stopping at the first gap, so a resumed session sees everything still missing at once.
function missingForGate2(frontmatter) {
  const gaps = [];

  // Driven off REQUIRED_SCALARS rather than a hand-written sequence of checks, so the exported
  // constant IS the rule. Remove a field from it and this gate stops requiring it — which is
  // exactly the mutation the parity test has to catch, and can, because its fixtures are generated
  // from the UNION of this list and twin-storyboard's own.
  for (const field of REQUIRED_SCALARS) {
    const value = scalarFieldValue(frontmatter, field);
    if (!value) {
      gaps.push(SCALAR_GAP[field] ?? `the hand-of-the-journalist field "${field}"`);
      continue;
    }
    const vocabulary = SCALAR_VOCABULARY[field];
    if (vocabulary && !vocabulary(value)) gaps.push(SCALAR_VOCABULARY_GAP[field](value));
  }

  const slots = parseSlotsForGate(frontmatter);
  if (slots.length === 0) {
    gaps.push("no slot: nothing would be produced");
    return gaps;
  }

  slots.forEach((slot, index) => {
    const label = slot.id ?? String(index + 1);
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];

    for (const field of REQUIRED_SLOT_FIELDS) {
      // `size` is not a flat requirement — `sizeGapFor` owns it entirely, below, because whether
      // it is required at all depends on the genre.
      if (field === "size") continue;
      const value = slot[field];
      if (!value) {
        gaps.push(slotGap(field, label));
        continue;
      }
      const vocabulary = SLOT_VOCABULARY[field];
      if (vocabulary && !vocabulary(value)) gaps.push(slotGap(field, label));
    }

    const sizeGap = sizeGapFor(slot.genre, slot.size, label);
    if (sizeGap) gaps.push(sizeGap);

    if (!slot.chosen) return;
    if (candidates.length === 0) {
      gaps.push(`slot ${label}: chosen but no candidates were ever listed`);
    } else if (!candidates.includes(slot.chosen)) {
      gaps.push(`slot ${label}: chosen is not among its candidates`);
    }
  });

  return gaps;
}

// G3 CLOSES INTO A FILE, like every other gate. A beat leaves `production` only when the beat
// directory that holds renders also holds `APPROVED.md` — the journalist having been shown the
// artifact and having said yes.
//
// It used to leave on the mere EXISTENCE of a render, so nobody was ever asked. In the run the
// renders were read into the model's context and the journalist received prose; the Gate-3
// question — "the beat, as you see it. Do you validate?" — presupposed sight in a turn where
// nothing had been put in front of anyone to open.
//
// Returns the beats that have rendered and not been approved, so `missing` names them. A directory
// read, which is all this file has ever done, and it needs no slot-to-beat mapping.
async function renderedBeats(storyDir) {
  const rendered = [];
  for (const beat of await list(join(storyDir, "beats"))) {
    if ((await list(join(storyDir, "beats", beat, "renders"))).length > 0) rendered.push(beat);
  }
  return rendered;
}

async function beatsAwaitingApproval(storyDir) {
  const waiting = [];
  for (const beat of await renderedBeats(storyDir)) {
    if ((await read(join(storyDir, "beats", beat, "APPROVED.md"))) === null) waiting.push(beat);
  }
  return waiting;
}

export async function whereIs(storyDir) {
  const source = await list(join(storyDir, "source"));
  if (!source.includes("article.md") || !source.includes("profile.json")) {
    return { phase: "intake", missing: ["source/article.md", "source/profile.json"].filter((f) => !source.includes(f.split("/")[1])) };
  }

  const storyboard = await read(join(storyDir, "STORYBOARD.md"));
  if (storyboard === null) return { phase: "framing", missing: ["STORYBOARD.md"] };

  const frontmatter = extractFrontmatter(storyboard);
  const gateGaps = missingForGate2(frontmatter);
  if (gateGaps.length > 0) return { phase: "storyboard", missing: gateGaps };

  const rendered = await renderedBeats(storyDir);
  const hasRender = rendered.length > 0;
  const exported = await list(join(storyDir, "export"));

  if (!hasRender && exported.length > 0) {
    return { phase: "production", missing: ["no renders exist in any beat"] };
  }

  if (exported.length > 0) return { phase: "done", missing: [] };

  if (hasRender) {
    const waiting = await beatsAwaitingApproval(storyDir);
    if (waiting.length > 0) {
      return {
        phase: "production",
        missing: waiting.map((beat) => `beat ${beat}: rendered but not approved`),
      };
    }
    return { phase: "delivery", missing: [] };
  }

  return { phase: "production", missing: [] };
}
