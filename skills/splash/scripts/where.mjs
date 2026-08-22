// The state of a story is its directory. Nothing is remembered between sessions.

import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function list(path) {
  try { return await readdir(path); } catch { return []; }
}

async function read(path) {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

async function regularFileStat(path) {
  try {
    const found = await lstat(path);
    if (found.isSymbolicLink() || !found.isFile()) {
      throw new Error(`story state must be a regular file: ${path}`);
    }
    return found;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function json(path) {
  const text = await read(path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`story state is not valid JSON: ${path}`, { cause: error });
  }
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

// Reads one top-level scalar out of the front matter and resolves it the way storyboard's own
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
// membership rule below, mirror storyboard/scripts/storyboard.mjs's own `HAND` constant and
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
// in the phase that owns them (grounding at G1, format and capability at G2b), and write their
// resolved verdict into `STORYBOARD.md`. Neither gate can run a check the other cannot, because
// neither runs one at all.
//
// The four scalars added by that change: `grounding` (the G1 verdict), `reference` (the reference
// loop's answer, including "the journalist rejected both"), and per slot `size` and `reachable`.
export const REQUIRED_SCALARS = ["takeaway", ...HAND, "grounding", "reference"];
export const REQUIRED_SLOT_FIELDS = ["id", "proves", "medium", "format", "size", "reachable", "chosen"];

// Ruling R2, spelled out here INDEPENDENTLY of storyboard's own copy, for the same reason
// `HAND` is spelled out independently: two readings of one rule, cross-checked by a test, never
// unified by an import that would make this file un-copy-pasteable.
//
// `web` is deliberately absent from the sized formats, and that absence IS R2's other half: web is
// not a fourth export size, it fills whatever container the CMS gives it, like an embed component.
// `scrolly` is absent because a scroll-driven piece has no single exported frame at all. The pixel
// dimensions live in each craft skill's `scripts/sizes.mjs`; a gate has no business knowing them.
//
// Note the ORDERING difference from the original Splash, kept on purpose: it picks a CHANNEL and
// DERIVES the allowed formats from it. A5 asks for medium, then format, then size, so the twin
// CHECKS the triple after the journalist has chosen each part. `formatGap` already has that shape.
const EXPORT_SIZES = ["landscape", "square", "portrait"];
const SIZED_FORMATS = ["static", "video"];
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const OUTPUT_REVIEW_SCHEMA_VERSION = 1;
const QA_RUN_SCHEMA_VERSION = 1;
const DELIVERY_MANIFEST_SCHEMA_VERSION = 1;

// The three refusals, worded VERBATIM as storyboard/scripts/storyboard.mjs's `sizeGap` words
// them. `splash/test/where.test.ts` compares the two gates' size verdicts string for string,
// so a reworded message on either side reddens rather than quietly becoming two gates that refuse
// the same storyboard for two different-sounding reasons.
function sizeGapFor(format, size, label) {
  const takesASize = SIZED_FORMATS.includes(format);
  if (!takesASize && size)
    return `slot ${label}: a ${format} beat takes no size — it fills the container it is given, so leave the field out; there is no "fluid" size`;
  if (!takesASize) return null;
  if (!size) return `slot ${label}: size is missing — gate 2c never closed`;
  if (!EXPORT_SIZES.includes(size))
    return `slot ${label}: size ${JSON.stringify(size)} is not one this toolchain exports — ${EXPORT_SIZES.join(", ")}`;
  return null;
}

// The closed vocabulary of `grounding:`. Mirrors storyboard's own `isResolvedGrounding` for
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

// Carried copy of storyboard/scripts/producer-gate.mjs's treatment eligibility. Splash skills are
// installed independently, so the state reader cannot import another skill at runtime. The parity
// test imports both copies and compares every catalogue alias, including the negative cases.
export const DATAWRAPPER_TREATMENTS = new Map([
  ["area", ["d3-area"]],
  ["area and stacked area", ["d3-area"]],
  ["bar", ["d3-bars", "column-chart"]],
  ["column", ["d3-bars", "column-chart"]],
  ["bar and column", ["d3-bars", "column-chart"]],
  ["bullet", ["d3-bars-bullet"]],
  ["dumbbell", ["d3-range-plot"]],
  ["range plot", ["d3-range-plot"]],
  ["grouped bar", ["d3-bars-grouped", "grouped-column-chart"]],
  ["grouped column", ["d3-bars-grouped", "grouped-column-chart"]],
  ["line", ["d3-lines"]],
  ["pie", ["d3-pies", "d3-donuts"]],
  ["donut", ["d3-pies", "d3-donuts"]],
  ["pie and donut", ["d3-pies", "d3-donuts"]],
  ["population pyramid", ["d3-bars-split"]],
  ["scatter", ["d3-scatter-plot"]],
  ["scatter and bubble", ["d3-scatter-plot"]],
  ["slope", ["d3-lines"]],
  ["slopegraph", ["d3-lines"]],
  ["slope chart", ["d3-lines"]],
  ["stacked bar", ["d3-bars-stacked", "stacked-column-chart"]],
  ["stacked column", ["d3-bars-stacked", "stacked-column-chart"]],
  ["waterfall", ["waterfall"]],
  ["waterfall bridge", ["waterfall"]],
]);

function normalizeTreatment(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function datawrapperTypesForTreatment({ medium, format, treatment }) {
  if (medium !== "chart" || (format !== "static" && format !== "web")) return null;
  return DATAWRAPPER_TREATMENTS.get(normalizeTreatment(treatment)) ?? null;
}

function producerGapFor(slot) {
  const types = datawrapperTypesForTreatment({
    medium: slot?.medium,
    format: slot?.format,
    treatment: slot?.chosen,
  });
  const producer = slot?.producer;
  const type = slot?.datawrapperType;
  const id = slot?.id ?? "?";

  if (!types) {
    if (producer === "datawrapper") {
      return `slot ${id}: ${JSON.stringify(slot?.chosen)} is not mapped to a Datawrapper chart for ${slot?.format ?? "this format"}`;
    }
    if (type) return `slot ${id}: datawrapperType is set but the selected treatment is not delegated to Datawrapper`;
    if (producer && producer !== "custom") return `slot ${id}: producer must be custom or datawrapper`;
    return null;
  }
  if (!producer) return `slot ${id}: custom or Datawrapper was never chosen after the treatment selection`;
  if (producer !== "custom" && producer !== "datawrapper") return `slot ${id}: producer must be custom or datawrapper`;
  if (producer === "custom") {
    return type ? `slot ${id}: a custom chart must not carry a datawrapperType` : null;
  }
  if (!type) return `slot ${id}: the Datawrapper choice has no recorded Datawrapper chart type`;
  if (!types.includes(type)) {
    return `slot ${id}: Datawrapper type ${JSON.stringify(type)} does not implement the selected treatment`;
  }
  return null;
}

function slotGap(field, label) {
  if (field === "id") return "a provisional slot has no id";
  if (field === "proves") return `slot ${label}: no confirmed claim was recorded in proves`;
  if (field === "chosen") return `slot ${label}: nothing chosen`;
  if (field === "reachable") return `slot ${label}: this medium and format were never confirmed reachable`;
  return `slot ${label}: no ${field} was ever chosen`;
}

// Quote-aware comma split, so a candidate name that itself contains a comma inside quotes
// (`["a, b", "c"]`) is not fragmented by a naive `.split(",")`. Mirrors
// storyboard/scripts/storyboard.mjs's `splitArrayItems` for the same reason as `HAND` above.
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
// block. Not a general STORYBOARD.md reader (that is `parseStoryboard`'s job, in storyboard);
// this walks the same line shapes for the same reason `HAND` mirrors that file's field list.
function parseSlotsForGate(frontmatter) {
  const slots = [];
  const topLevelKeys = new Set();
  let legacy = false;
  let sawSlots = false;
  let slot = null;
  for (const line of (frontmatter ?? "").split(/\r?\n/)) {
    const topLevel = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (topLevel) {
      const key = topLevel[1];
      if (topLevelKeys.has(key)) throw new Error(`STORYBOARD.md has duplicate top-level key ${JSON.stringify(key)}`);
      topLevelKeys.add(key);
      if (key === "slots") sawSlots = true;
      slot = null;
      continue;
    }
    if (sawSlots && /^\s+-\s+/.test(line)) {
      slot = {};
      slots.push(slot);
      const first = /^\s+-\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (first) slot[first[1]] = scalarValue(first[2]);
      continue;
    }
    if (slot && /^\s{4,}[A-Za-z]+:/.test(line)) {
      const pair = /^\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (pair) {
        if (Object.prototype.hasOwnProperty.call(slot, pair[1])) {
          throw new Error(`STORYBOARD.md slot has duplicate key ${JSON.stringify(pair[1])}`);
        }
        slot[pair[1]] = scalarValue(pair[2]);
      }
    }
  }
  for (const [index, parsedSlot] of slots.entries()) {
    const hasFormat = Object.prototype.hasOwnProperty.call(parsedSlot, "format");
    const hasLegacyFormat = Object.prototype.hasOwnProperty.call(parsedSlot, "genre");
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
  for (const parsedSlot of slots) {
    const id = parsedSlot.id;
    if (!id) continue;
    if (slotIds.has(String(id))) throw new Error(`STORYBOARD.md has duplicate slot id ${JSON.stringify(String(id))}`);
    slotIds.add(String(id));
  }
  return { slots, legacy };
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
  // from the UNION of this list and storyboard's own.
  for (const field of REQUIRED_SCALARS) {
    const value = scalarFieldValue(frontmatter, field);
    if (!value) {
      gaps.push(SCALAR_GAP[field] ?? `the hand-of-the-journalist field "${field}"`);
      continue;
    }
    const vocabulary = SCALAR_VOCABULARY[field];
    if (vocabulary && !vocabulary(value)) gaps.push(SCALAR_VOCABULARY_GAP[field](value));
  }

  const parsed = parseSlotsForGate(frontmatter);
  const { slots } = parsed;
  if (slots.length === 0) {
    gaps.push("no slot: nothing would be produced");
    return { gaps, slots, legacy: parsed.legacy };
  }

  slots.forEach((slot, index) => {
    const label = slot.id ?? String(index + 1);
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];

    for (const field of REQUIRED_SLOT_FIELDS) {
      // `size` is not a flat requirement — `sizeGapFor` owns it entirely, below, because whether
      // it is required at all depends on the format.
      if (field === "size") continue;
      const value = slot[field];
      if (!value) {
        gaps.push(slotGap(field, label));
        continue;
      }
      const vocabulary = SLOT_VOCABULARY[field];
      if (vocabulary && !vocabulary(value)) gaps.push(slotGap(field, label));
    }

    const sizeGap = sizeGapFor(slot.format, slot.size, label);
    if (sizeGap) gaps.push(sizeGap);

    if (!slot.chosen) return;
    if (candidates.length === 0) {
      gaps.push(`slot ${label}: chosen but no candidates were ever listed`);
    } else if (!candidates.includes(slot.chosen)) {
      gaps.push(`slot ${label}: chosen is not among its candidates`);
    } else {
      const producerGap = producerGapFor(slot);
      if (producerGap) gaps.push(producerGap);
    }
  });

  return { gaps, slots, legacy: parsed.legacy };
}

function orderedStoryboardGate(frontmatter, slots) {
  const prerequisites = REQUIRED_SCALARS.filter((field) => field !== "reference");
  if (prerequisites.some((field) => !scalarFieldValue(frontmatter, field))) return null;
  if (slots.length === 0) return { gate: "G2a", awaiting: "slot" };

  for (const [index, slot] of slots.entries()) {
    const slotId = String(slot.id ?? index + 1);
    if (!slot.id) return { gate: "G2a", awaiting: "id", slotId };
    if (!slot.proves) return { gate: "G2a", awaiting: "proves", slotId };
    if (!slot.medium) return { gate: "G2a", awaiting: "medium", slotId };
    if (!slot.format) return { gate: "G2b", awaiting: "format", slotId };
    if (slot.reachable !== "yes") return { gate: "G2b", awaiting: "reachability", slotId };
    if (SIZED_FORMATS.includes(slot.format) && !slot.size) {
      return { gate: "G2c", awaiting: "size", slotId };
    }
    if (!SIZED_FORMATS.includes(slot.format) && slot.size) {
      return { gate: "G2c", awaiting: "size-removal", slotId };
    }
    if (slot.size && !EXPORT_SIZES.includes(slot.size)) {
      return { gate: "G2c", awaiting: "size", slotId };
    }
  }

  if (!scalarFieldValue(frontmatter, "reference")) {
    return { gate: "G2-reference", awaiting: "reference" };
  }
  for (const [index, slot] of slots.entries()) {
    if (!slot.chosen || !Array.isArray(slot.candidates) || !slot.candidates.includes(slot.chosen)) {
      return { gate: "G2-treatment", awaiting: "treatment", slotId: String(slot.id ?? index + 1) };
    }
    if (producerGapFor(slot)) {
      return { gate: "G2-producer", awaiting: "producer", slotId: String(slot.id ?? index + 1) };
    }
  }
  return null;
}

// A render makes the beat eligible for Gate 3. Completion is established below by the bound
// OutputReview and delivery manifest, never by the presence of their human-readable companion files.
async function renderedBeats(storyDir) {
  const rendered = [];
  for (const beat of await list(join(storyDir, "beats"))) {
    if ((await list(join(storyDir, "beats", beat, "renders"))).length > 0) rendered.push(beat);
  }
  return rendered;
}

// The analyst pre-step of production. A chosen chart or map slot has no chart-ready data until
// `analyst` has written `beats/<id>/data.json` beside the beat — the file artifact every craft
// skill reads instead of the frozen CSV. Image slots carry no data contract, so they never
// appear here. Beat directories are `<id>-<slug>` (`new-story`/craft convention), so the lookup
// accepts the bare id or the prefixed form, exactly the way a human scans `beats/`.
//
// This sits ABOVE `beatsAwaitingApproval` in `whereIs`, which changes nothing about that gate's
// primacy: the approval rule stays the first thing consulted once anything has rendered, and
// nothing about `export/` may shorten the walk past it (see that comment). The analyst check can
// only fire while a beat has nothing produced yet — the moment `data.json` exists the question
// closes and the walk proceeds exactly as before.
const ANALYST_MEDIUMS = new Set(["chart", "map"]);

async function beatsAwaitingData(storyDir, slots) {
  const waiting = [];
  const dirs = await list(join(storyDir, "beats"));
  for (const [index, slot] of slots.entries()) {
    if (!slot.chosen || !ANALYST_MEDIUMS.has(slot.medium)) continue;
    const id = String(slot.id ?? index + 1);
    const dir = dirs.find((name) => name === id || name.startsWith(`${id}-`));
    const files = dir ? await list(join(storyDir, "beats", dir)) : [];
    if (!files.includes("data.json")) waiting.push(id);
  }
  return waiting;
}

// S1: the analyst's artifact records the sha256 of its three inputs (`meta.hashes` — see
// build-data.mjs). Until now nothing downstream re-validated them, so a source edited after the
// build left `whereIs` reporting a clean production phase while craft skills rendered data that
// no longer matched its own source line. Each recorded hash is checked against the CURRENT
// frozen bytes; drift names the beat for a rebuild rather than silently passing.
//
// A data.json with no parseable `meta.hashes` has nothing recorded to re-validate and is not
// called stale here — the same presence rule `beatsAwaitingData` applies in reverse.
const ANALYST_HASH_INPUTS = [
  ["storyboard", "STORYBOARD.md"],
  ["profile", "source/profile.json"],
  ["sourceData", "source/data.csv"],
];

async function fileDigest(path) {
  try {
    return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
  } catch {
    return null;
  }
}

async function staleDataBeats(storyDir) {
  const stale = [];
  for (const beat of await list(join(storyDir, "beats"))) {
    let recorded = null;
    try {
      recorded = JSON.parse(await readFile(join(storyDir, "beats", beat, "data.json"), "utf8"))
        ?.meta?.hashes ?? null;
    } catch {
      recorded = null;
    }
    if (!recorded || typeof recorded !== "object") continue;
    for (const [key, relative] of ANALYST_HASH_INPUTS) {
      if (typeof recorded[key] !== "string") continue;
      const current = await fileDigest(join(storyDir, relative));
      if (current !== null && current !== recorded[key]) {
        stale.push(beat);
        break;
      }
    }
  }
  return stale;
}

// S6: the inverse walk of `beatsAwaitingData`, which goes slots→dirs. A directory under
// `beats/` that no longer matches any slot id in STORYBOARD.md is an orphan — its slot was
// removed from the storyboard while the beat directory stayed behind. It is reported, not
// silently walked past, because a producer dispatched by directory listing would otherwise
// render work the storyboard no longer asks for.
async function orphanedBeats(storyDir, slots) {
  const ids = slots.map((slot, index) => String(slot.id ?? index + 1));
  const orphans = [];
  for (const beat of await list(join(storyDir, "beats"))) {
    const matched = ids.some((id) => beat === id || beat.startsWith(`${id}-`));
    if (!matched) orphans.push(beat);
  }
  return orphans;
}

function nonEmptyText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function stringSet(value) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !nonEmptyText(item))) return null;
  const sorted = [...value].sort();
  return new Set(sorted).size === sorted.length ? sorted : null;
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function addDigestFrame(hash, kind, relativePath, bytes = null) {
  const pathBytes = Buffer.from(relativePath, "utf8");
  hash.update(`${kind}:${pathBytes.length}:`);
  hash.update(pathBytes);
  if (bytes !== null) {
    hash.update(`:${bytes.length}:`);
    hash.update(bytes);
  }
  hash.update("\0");
}

// Independent reader for deliver's OutputReview render binding. Skills remain installable alone,
// so this mirrors the persisted contract instead of importing a sibling skill at runtime.
async function currentRenderDigest(beatDir) {
  const rendersDir = join(beatDir, "renders");
  const root = await lstat(rendersDir);
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`the rendered draft must be a real directory: ${rendersDir}`);
  }
  const hash = createHash("sha256");
  hash.update("splash-render-tree-v1\0");
  let files = 0;

  async function walk(directory, prefix) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error(`rendered material must not contain a symbolic link: ${path}`);
      if (stat.isDirectory()) {
        addDigestFrame(hash, "directory", relativePath);
        await walk(path, relativePath);
      } else if (stat.isFile()) {
        addDigestFrame(hash, "file", relativePath, await readFile(path));
        files++;
      } else {
        throw new Error(`rendered material must not contain a special file: ${path}`);
      }
    }
  }

  await walk(rendersDir, "");
  if (files === 0) throw new Error(`the rendered draft contains no files: ${rendersDir}`);
  return `sha256:${hash.digest("hex")}`;
}

async function currentFeedbackDigest(beatDir) {
  const path = join(beatDir, "FEEDBACK.md");
  const stat = await regularFileStat(path);
  if (!stat) return null;
  return `sha256:${createHash("sha256")
    .update("splash-editor-feedback-v1\0")
    .update(await readFile(path))
    .digest("hex")}`;
}

function validateRevisionReview(review, beat, path) {
  if (!review || typeof review !== "object" || Array.isArray(review)) throw new Error(`OutputReview must be an object: ${path}`);
  if (review.schemaVersion !== OUTPUT_REVIEW_SCHEMA_VERSION) throw new Error(`OutputReview has unsupported schemaVersion at ${path}`);
  if (!nonEmptyText(review.id)) throw new Error(`OutputReview.id is invalid at ${path}`);
  if (review.outputId !== beat) throw new Error(`OutputReview belongs to a different output at ${path}`);
  if (!positiveInteger(review.planVersion)) throw new Error(`OutputReview.planVersion is invalid at ${path}`);
  if (review.draftRef !== "renders/" || !SHA256.test(review.draftDigest ?? "")) throw new Error(`OutputReview draft binding is invalid at ${path}`);
  const findingIds = stringSet(review.findingIds);
  if (!findingIds) throw new Error(`OutputReview.findingIds are invalid at ${path}`);
  if (!Array.isArray(review.qaRuns) || review.qaRuns.length === 0) throw new Error(`OutputReview.qaRuns are invalid at ${path}`);
  if (!nonEmptyText(review.angleEvidenceBrief)) throw new Error(`OutputReview.angleEvidenceBrief is invalid at ${path}`);
  if (!["approve", "changes-requested", "reject"].includes(review.decision)) throw new Error(`OutputReview.decision is invalid at ${path}`);
  if (review.feedbackDigest !== undefined && !SHA256.test(review.feedbackDigest)) throw new Error(`OutputReview.feedbackDigest is invalid at ${path}`);

  let passingBoundQa = false;
  for (const run of review.qaRuns) {
    if (!run || typeof run !== "object" || Array.isArray(run) || run.schemaVersion !== QA_RUN_SCHEMA_VERSION) {
      throw new Error(`OutputReview has an invalid QA run at ${path}`);
    }
    const runIds = stringSet(run.findingIds);
    if (
      !nonEmptyText(run.id) || run.outputId !== beat || !positiveInteger(run.planVersion) ||
      !SHA256.test(run.draftDigest ?? "") || !runIds || !["passed", "failed"].includes(run.status) ||
      !nonEmptyText(run.completedAt) || Number.isNaN(Date.parse(run.completedAt))
    ) {
      throw new Error(`OutputReview has an invalid QA run at ${path}`);
    }
    if (
      run.status === "passed" && run.planVersion === review.planVersion &&
      run.draftDigest === review.draftDigest && sameStrings(runIds, findingIds)
    ) passingBoundQa = true;
  }
  return { findingIds, passingBoundQa };
}

function manifestArtifacts(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`delivery manifest artifacts are invalid at ${path}`);
  }
  const artifacts = [];
  const paths = new Set();
  for (const artifact of value) {
    const relativePath = artifact?.path;
    if (
      !nonEmptyText(relativePath) ||
      relativePath.includes("\\") ||
      relativePath.startsWith("/") ||
      relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
      !SHA256.test(artifact?.digest ?? "") ||
      paths.has(relativePath)
    ) {
      throw new Error(`delivery manifest artifact binding is invalid at ${path}`);
    }
    paths.add(relativePath);
    artifacts.push({ path: relativePath, digest: artifact.digest });
  }
  return artifacts;
}

function validateRevisionManifest(manifest, beat, path) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error(`delivery manifest must be an object: ${path}`);
  if (manifest.schemaVersion !== DELIVERY_MANIFEST_SCHEMA_VERSION || manifest.state !== "complete") {
    throw new Error(`delivery manifest has an unsupported contract at ${path}`);
  }
  if (manifest.outputId !== beat) throw new Error(`delivery manifest belongs to a different output at ${path}`);
  if (!nonEmptyText(manifest.operationId) || /[\\/\0]/.test(manifest.operationId) || manifest.operationId === "." || manifest.operationId === "..") {
    throw new Error(`delivery manifest operationId is invalid at ${path}`);
  }
  if (!nonEmptyText(manifest.reviewId) || !positiveInteger(manifest.planVersion) || !SHA256.test(manifest.draftDigest ?? "")) {
    throw new Error(`delivery manifest review binding is invalid at ${path}`);
  }
  const findingIds = stringSet(manifest.findingIds);
  if (!findingIds) throw new Error(`delivery manifest findingIds are invalid at ${path}`);
  if (manifest.feedbackDigest !== undefined && !SHA256.test(manifest.feedbackDigest)) {
    throw new Error(`delivery manifest feedbackDigest is invalid at ${path}`);
  }
  return { artifacts: manifestArtifacts(manifest.artifacts, path), findingIds };
}

async function artifactsAreCurrent(exportDir, artifacts) {
  for (const artifact of artifacts) {
    const path = join(exportDir, artifact.path);
    if (!(await regularFileStat(path)) || (await fileDigest(path)) !== artifact.digest) {
      return false;
    }
  }
  return true;
}

// Every rendered beat follows the same review and delivery walk. FEEDBACK.md only adds the
// revision label and digest; it never selects a stronger validation path.
async function completionState(storyDir, beats) {
  const production = [];
  const delivery = [];
  const feedbackProduction = [];
  const feedbackDelivery = [];
  for (const beat of beats) {
    const beatDir = join(storyDir, "beats", beat);
    const feedbackDigest = await currentFeedbackDigest(beatDir);
    const reviewPath = join(beatDir, "OUTPUT-REVIEW.json");
    const reviewStat = await regularFileStat(reviewPath);
    if (!reviewStat) {
      production.push(beat);
      if (feedbackDigest) feedbackProduction.push(beat);
      continue;
    }
    const review = await json(reviewPath);
    const reviewBinding = validateRevisionReview(review, beat, reviewPath);
    const renderDigest = await currentRenderDigest(beatDir);
    if (
      review.decision !== "approve" ||
      review.draftDigest !== renderDigest ||
      (review.feedbackDigest ?? null) !== feedbackDigest ||
      !reviewBinding.passingBoundQa
    ) {
      production.push(beat);
      if (feedbackDigest) feedbackProduction.push(beat);
      continue;
    }

    const exportDir = join(storyDir, "export", beat);
    const manifestPath = join(exportDir, ".delivery-manifest.json");
    const manifestStat = await regularFileStat(manifestPath);
    const handoverStat = await regularFileStat(join(exportDir, "HANDOVER.md"));
    if (!manifestStat || !handoverStat) {
      delivery.push(beat);
      if (feedbackDigest) feedbackDelivery.push(beat);
      continue;
    }
    const manifest = await json(manifestPath);
    const manifestBinding = validateRevisionManifest(manifest, beat, manifestPath);
    if (
      manifest.reviewId !== review.id ||
      manifest.planVersion !== review.planVersion ||
      manifest.draftDigest !== review.draftDigest ||
      (manifest.feedbackDigest ?? null) !== feedbackDigest ||
      !sameStrings(manifestBinding.findingIds, reviewBinding.findingIds) ||
      !(await artifactsAreCurrent(exportDir, manifestBinding.artifacts))
    ) {
      delivery.push(beat);
      if (feedbackDigest) feedbackDelivery.push(beat);
    }
  }
  return { production, delivery, feedbackProduction, feedbackDelivery };
}

const PRODUCTION_ATTEMPTS_FILE = "PRODUCTION-ATTEMPTS.json";
const PRODUCTION_ATTEMPTS_SCHEMA_VERSION = 1;
const MAX_PRODUCTION_ATTEMPTS = 3;

async function blockedProductionState(storyDir) {
  for (const beat of (await list(join(storyDir, "beats"))).sort()) {
    const beatDir = join(storyDir, "beats", beat);
    const path = join(beatDir, PRODUCTION_ATTEMPTS_FILE);
    if (!(await regularFileStat(path))) continue;
    const receipt = await json(path);
    const expectedInputPath = receipt?.operation === "map-bake"
      ? "MAP-BAKE.json"
      : receipt?.operation === "datawrapper-produce"
      ? "spec.json"
      : null;
    if (
      receipt?.schemaVersion !== PRODUCTION_ATTEMPTS_SCHEMA_VERSION ||
      receipt.outputId !== beat ||
      receipt.inputPath !== expectedInputPath ||
      !SHA256.test(receipt.inputDigest ?? "") ||
      !Number.isSafeInteger(receipt.attempts) ||
      receipt.attempts < 1 ||
      receipt.attempts > MAX_PRODUCTION_ATTEMPTS ||
      !["failed", "blocked"].includes(receipt.status) ||
      !nonEmptyText(receipt.reason) ||
      (receipt.status === "blocked") !== (receipt.attempts === MAX_PRODUCTION_ATTEMPTS)
    ) {
      throw new Error(`production attempt receipt is invalid at ${path}`);
    }
    if (receipt.status !== "blocked") continue;
    if ((await fileDigest(join(beatDir, receipt.inputPath))) !== receipt.inputDigest) continue;
    return {
      phase: "production",
      status: "blocked",
      reason: receipt.reason,
      attempts: receipt.attempts,
      beat,
      missing: [],
    };
  }
  return null;
}

export async function whereIs(storyDir) {
  const source = await list(join(storyDir, "source"));
  // S5 parity: `intake` freezes THREE artifacts (article.md, data.csv, profile.json — see that
  // skill's own SKILL.md), so the gate refuses to leave `intake` until all three exist. Two of
  // three used to pass, which let a story reach production whose craft work would read a CSV
  // that was never frozen.
  const FROZEN = ["article.md", "data.csv", "profile.json"];
  const unfrozen = FROZEN.filter((f) => !source.includes(f));
  if (unfrozen.length > 0)
    return { phase: "intake", missing: unfrozen.map((f) => `source/${f}`) };

  const storyboard = await read(join(storyDir, "STORYBOARD.md"));
  if (storyboard === null) return { phase: "framing", missing: ["STORYBOARD.md"] };

  const frontmatter = extractFrontmatter(storyboard);
  // S4: a file that opens a `---` block and never closes it is ONE diagnosable fact. Reporting
  // every scalar as missing instead would send a resumed session back through nine gates to fix
  // one truncated write.
  if (frontmatter === null && storyboard.startsWith("---")) {
    return { phase: "storyboard", missing: ["STORYBOARD.md frontmatter unterminated"] };
  }
  const gateState = missingForGate2(frontmatter);
  const legacyState = gateState.legacy ? { legacy: true } : {};
  if (gateState.gaps.length > 0) {
    return {
      phase: "storyboard",
      ...orderedStoryboardGate(frontmatter, gateState.slots),
      ...legacyState,
      missing: gateState.gaps,
    };
  }

  // Analyst/source drift is earlier than review or delivery, so it always reopens production even
  // when the story once reached done.
  const unanalysed = await beatsAwaitingData(storyDir, gateState.slots);
  const dataMissing = unanalysed.map((id) => `beat ${id}: run analyst (data.json)`);
  const staleMissing = (await staleDataBeats(storyDir)).map(
    (beat) => `beat ${beat}: analyst data stale — rebuild`,
  );
  const orphanMissing = (await orphanedBeats(storyDir, gateState.slots)).map(
    (beat) => `beat ${beat}: orphaned — slot removed from storyboard`,
  );
  const analystMissing = [...dataMissing, ...staleMissing, ...orphanMissing];
  if (analystMissing.length > 0) {
    return { phase: "production", ...legacyState, missing: analystMissing };
  }

  const blocked = await blockedProductionState(storyDir);
  if (blocked) return { ...blocked, ...legacyState };

  const rendered = await renderedBeats(storyDir);
  const exported = await list(join(storyDir, "export"));
  if (rendered.length === 0) {
    // A file in `export/` with nothing rendered anywhere is not a finished story, it is an
    // inconsistent one — something was delivered that no producer in this directory made.
    return {
      phase: "production",
      ...legacyState,
      missing: exported.length > 0 ? ["no renders exist in any beat"] : [],
    };
  }

  const completion = await completionState(storyDir, rendered);
  if (completion.production.length > 0) {
    const feedback = new Set(completion.feedbackProduction);
    const missing = completion.production
      .filter((beat) => !feedback.has(beat))
      .map((beat) => `beat ${beat}: rendered but not currently approved`);
    return {
      phase: "production",
      ...legacyState,
      ...(completion.feedbackProduction.length > 0
        ? {
            revision: {
              reason: "editor-feedback",
              beats: completion.feedbackProduction,
            },
          }
        : {}),
      missing,
    };
  }
  if (completion.delivery.length > 0) {
    return {
      phase: "delivery",
      ...legacyState,
      ...(completion.feedbackDelivery.length > 0
        ? {
            revision: {
              reason: "editor-feedback",
              beats: completion.feedbackDelivery,
            },
          }
        : {}),
      missing: [],
    };
  }

  return { phase: "done", ...legacyState, missing: [] };
}
