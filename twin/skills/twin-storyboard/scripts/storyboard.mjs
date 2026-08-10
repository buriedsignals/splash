// STORYBOARD.md is YAML front matter (a narrow, dependency-free subset) plus free prose. Only the
// front matter is machine-checked; the prose beneath it is what the journalist actually reads.

import { groundTakeaway } from "./ground-claim.mjs";
import { genreGap } from "./genre-catalog.mjs";
import { capabilityGap } from "./capability-gap.mjs";

// Still exported, and still this skill's own work — but no longer called by the GATE. Each is an
// expensive semantic check owned by exactly one phase: `groundTakeaway` runs at G1, the moment the
// takeaway is confirmed, and `genreGap`/`capabilityGap` run at the genre sub-gate G2b. Each records
// its resolved verdict into `STORYBOARD.md` (`grounding:`, and the slot's `reachable:`), and BOTH
// gates then read the recorded scalar.
//
// That is what closes the divergence class by construction. `checkStoryboard` used to take a
// `profile` and a `capabilities` argument that `where.mjs`'s `missingForGate2` structurally could
// not have, so this gate could refuse for three reasons the other gate could not see — and did:
// `whereIs` reported `production` on a storyboard this function was refusing
// (twin/FEEDBACK-2026-08-10.md, A7/A14). Neither gate can now run a check the other cannot, because
// neither runs one at all: they read the same recorded fields.
export { groundTakeaway, genreGap, capabilityGap };

const HAND = ["subject", "comparison", "limits", "placement", "credit", "effectiveDate"];

// Every story-level scalar Gate 2 requires. `where.mjs` exports the same list, spelled
// independently — the deliberate duplicate, cross-checked by `splash-twin/test/where.test.ts`,
// which GENERATES its fixtures from the union of both copies so a field added to either side
// produces its own fixture the moment it lands.
export const REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "reference"];

// Every field a slot must carry before Gate 2 can close on it. `size` is conditional — see
// EXPORT_SIZES / SIZED_GENRES below — but it stays in this list because the list is what the parity
// test generates its fixtures from, and a field removed from it is a field nobody tests.
export const REQUIRED_SLOT_FIELDS = ["medium", "genre", "size", "reachable", "chosen"];

// Ruling R2, read literally: landscape for YouTube and article web, portrait for stories, square
// for social posts. Charts and maps alike, one model. The pixel dimensions are NOT here — they are
// each craft skill's own `scripts/sizes.mjs`, and a gate has no business knowing them; what the
// gate owns is whether the journalist chose a name the toolchain exports.
export const EXPORT_SIZES = ["landscape", "square", "portrait"];

// The genres that HAVE an export size, and therefore the ones a size is required for. `web` is
// deliberately absent and that absence is R2's other half: web is not a fourth size, it fills
// whatever container the CMS gives it, like an embed component. `scrolly` is absent for a related
// but distinct reason — a scroll-driven piece has no single exported frame at all.
//
// This is why the requirement is conditional rather than flat. Before this, `size` was required of
// EVERY slot, so a correct `genre: web` slot could not close gate 2 without naming a size that will
// never be used, and a wrong one closed it by naming one. Both are the same defect: the toolchain
// asking a question whose answer it will ignore.
export const SIZED_GENRES = ["static", "video"];

/**
 * `null` when this GENRE and this SIZE go together; otherwise the one line the gate refuses in.
 *
 * The message text below is duplicated VERBATIM in `splash-twin/scripts/where.mjs`, which reads
 * gate 2 independently and must not be able to disagree with this file about what it read. That
 * duplication is deliberate and it is cross-checked by `splash-twin/test/where.test.ts`, which
 * compares the two gates' size verdicts string for string — the two gates diverging once already
 * cost this project a gate reporting `production` on a storyboard the other gate was refusing
 * (FEEDBACK-2026-08-10.md, A7/A14).
 */
export function sizeGap(genre, size, id) {
  const takesASize = SIZED_GENRES.includes(genre);
  if (!takesASize && size)
    return `slot ${id}: a ${genre} beat takes no size — it fills the container it is given`;
  if (!takesASize) return null;
  if (!size) return `slot ${id}: size is missing — gate 2c never closed`;
  if (!EXPORT_SIZES.includes(size))
    return `slot ${id}: size ${JSON.stringify(size)} is not one this toolchain exports — ${EXPORT_SIZES.join(", ")}`;
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
  reference: "reference is missing — the reference loop never closed into a field",
};

// The scalars whose VALUE is checked, not merely their presence.
const SCALAR_VOCABULARY = { grounding: isResolvedGrounding };
const SCALAR_VOCABULARY_GAP = {
  grounding: (value) =>
    `grounding ${JSON.stringify(value)} is not a resolved verdict — expected supported, unverifiable, or overridden — "<reason>"`,
};

// Gate 2's three sub-gates, each recorded as it closes: the KIND (2a), then the genre within that
// kind (2b), then the size within that genre (2c). A slot naming none of them is a slot the
// journalist was never asked about — the run pinned "chart / static" in one undifferentiated move
// and then offered three variants of the same bar.
const SLOT_SUB_GATE = { medium: "2a", genre: "2b", size: "2c" };

// `reachable` carries the recorded verdict of genreGap + capabilityGap, run once at G2b by the
// phase that owns them. The gate reads the record; it never re-runs the check, because the other
// gate structurally cannot.
const SLOT_VOCABULARY = { reachable: (value) => value === "yes" };

function slotGap(field, id) {
  if (field === "chosen") return `slot ${id}: nothing chosen — gate 2 is not closed`;
  if (field === "reachable") return `slot ${id}: this medium and genre were never confirmed reachable`;
  const subGate = SLOT_SUB_GATE[field];
  return subGate
    ? `slot ${id}: ${field} is missing — gate ${subGate} never closed`
    : `slot ${id}: ${field} is missing`;
}

// Bare (unquoted) YAML null sentinels. `twin/skills/splash-twin/scripts/where.mjs` refuses these
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

  for (const line of match[1].split(/\r?\n/)) {
    if (/^slots:\s*$/.test(line)) {
      slots = [];
      meta.slots = slots;
      continue;
    }
    if (slots && /^\s+-\s+/.test(line)) {
      slot = {};
      slots.push(slot);
      const first = /^\s+-\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (first) slot[first[1]] = scalar(first[2]);
      continue;
    }
    if (slot && /^\s{4,}[A-Za-z]+:/.test(line)) {
      const pair = /^\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      slot[pair[1]] = scalar(pair[2]);
      continue;
    }
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (pair) meta[pair[1]] = scalar(pair[2]);
  }
  return { meta, prose: match[2] };
}

// ONE argument, deliberately. Everything this gate reads is a resolved scalar already written into
// `STORYBOARD.md` by the phase that owns the check — nothing is re-derived here, so there is no
// argument a caller could omit to switch a rule off. The false green this closes was exactly that:
// `where.test.ts` called `checkStoryboard(meta)` with one argument inside the test that exists to
// prove the two gates agree, silencing the very checks it was meant to compare.
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
    if (vocabulary && !vocabulary(value)) errors.push(SCALAR_VOCABULARY_GAP[field](value));
  }

  const slots = meta.slots ?? [];
  if (slots.length === 0) errors.push("no slot: nothing would be produced");

  for (const slot of slots) {
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];

    for (const field of REQUIRED_SLOT_FIELDS) {
      // `size` is not a flat requirement — `sizeGap` owns it entirely, below, because whether it is
      // required at all depends on the genre.
      if (field === "size") continue;
      const value = slot[field];
      if (!value) {
        errors.push(slotGap(field, slot.id));
        continue;
      }
      const vocabulary = SLOT_VOCABULARY[field];
      if (vocabulary && !vocabulary(value)) errors.push(slotGap(field, slot.id));
    }

    const gap = sizeGap(slot.genre, slot.size, slot.id);
    if (gap) errors.push(gap);

    // A chosen treatment is only a real choice if it was verifiably picked from a shown list —
    // that is what stops the exchange from being disguised parameter collection (references/
    // exchange.md, movement ⑩). A slot with `chosen` set but no `candidates` ever listed means the
    // proposal step was skipped, not that there was nothing to check membership against — so
    // this is malformed, not legitimate, and refuses on its own, distinct from a mismatch.
    if (!slot.chosen) continue;
    if (candidates.length === 0) {
      errors.push(`slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} but no candidates were listed`);
    } else if (!candidates.includes(slot.chosen)) {
      errors.push(`slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} is not among its candidates`);
    }
  }
  return errors;
}
