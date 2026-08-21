// STORYBOARD.md is YAML front matter (a narrow, dependency-free subset) plus free prose. Only the
// front matter is machine-checked; the prose beneath it is what the journalist actually reads.

import { groundTakeaway } from "./ground-claim.mjs";
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
export const REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "reference", "language"];

// Every field a slot must carry before Gate 2 can close on it. `size` is conditional — see
// EXPORT_SIZES / SIZED_FORMATS below — but it stays in this list because the list is what the parity
// test generates its fixtures from, and a field removed from it is a field nobody tests.
export const REQUIRED_SLOT_FIELDS = [
  "id",
  "proves",
  "medium",
  "format",
  "size",
  "reachable",
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
export function sizeGap(format, size, id) {
  const takesASize = SIZED_FORMATS.includes(format);
  if (!takesASize && size)
    return `slot ${id}: a ${format} beat takes no size — it fills the container it is given, so leave the field out; there is no "fluid" size`;
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

  const slots = meta.slots ?? [];
  if (slots.length === 0) errors.push("no slot: nothing would be produced");

  for (const slot of slots) {
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];

    for (const field of REQUIRED_SLOT_FIELDS) {
      // `size` is not a flat requirement — `sizeGap` owns it entirely, below, because whether it is
      // required at all depends on the format.
      if (field === "size") continue;
      const value = slot[field];
      if (!value) {
        errors.push(slotGap(field, slot.id));
        continue;
      }
      const vocabulary = SLOT_VOCABULARY[field];
      if (vocabulary && !vocabulary(value))
        errors.push(slotGap(field, slot.id));
    }

    const gap = sizeGap(slot.format, slot.size, slot.id);
    if (gap) errors.push(gap);

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
