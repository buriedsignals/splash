// skills/analyst/scripts/build-data.mjs
//
// The analyst's one mechanical step: turn the frozen source of a closed beat into the
// chart-ready file artifact every craft skill reads. It validates first and writes last — a
// refusal leaves the story directory exactly as it found it.
//
// What it reads (all frozen state, never re-derived from a conversation):
//   <storyDir>/STORYBOARD.md      — the slot must have left Gate 2 (chosen, reachable, medium)
//   <storyDir>/source/data.csv    — the frozen data
//   <storyDir>/source/profile.json— the frozen column profile
//
// What it writes, only after every check passes:
//   <storyDir>/beats/<slotId>/data.json     — compact {schemaVersion, slot, columns, rows, meta}
//   <storyDir>/beats/<slotId>/DATA-NOTES.md — derivations, exclusions, profile-column citations
//
// `data.json`'s `meta` records the sha256 of the three inputs it was built from. On a later run
// against an existing artifact, any hash mismatch refuses: the source moved under a file someone
// may already be rendering from, and silently rebuilding it is how a rendered chart stops
// matching its own source line.
//
// House style: the fs seam is injectable (`fs` defaults to node:fs/promises), so tests run
// against temp directories without touching real stories. This script performs no network I/O,
// so there is no fetch seam to fake.
//
// The CSV reader and the profiler are carried copies of `intake`'s own (`csv.mjs`, `profile.mjs`),
// byte-identical on purpose: Splash skills install independently and never import across a skill
// boundary at runtime. `test/parity.test.ts` guards the two copies from drifting apart — the same
// convention `splash/test/root-template-shared.test.ts` established.

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { parseCsv } from "./csv.mjs";
import { profileTable } from "./profile.mjs";

const SCHEMA_VERSION = 1;

// Only these mediums carry a data contract. An image beat has nothing for the analyst to shape.
const ANALYST_MEDIUMS = new Set(["chart", "map"]);

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

// A minimal front-matter reader in the shape where.mjs and storyboard already read: top-level
// scalars plus the `slots:` list, quotes stripped, null sentinels resolved. Carried, not imported
// — this file is what makes the analyst installable alone.
function extractFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("---", 3);
  if (end === -1) return null;
  return content.substring(3, end);
}

function scalarValue(raw) {
  const value = raw.trim();
  if (!value || value === '""' || value === "''" || value === "null" || value === "~") return null;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, "");
}

export function parseStoryboardForAnalyst(content) {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter === null) return { scalars: {}, slots: [] };
  const scalars = {};
  const slots = [];
  let sawSlots = false;
  let slot = null;
  for (const line of frontmatter.split(/\r?\n/)) {
    const topLevel = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (topLevel) {
      scalars[topLevel[1]] = scalarValue(topLevel[2]);
      if (topLevel[1] === "slots") sawSlots = true;
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
      if (pair) slot[pair[1]] = scalarValue(pair[2]);
    }
  }
  // Legacy `genre:` slots normalize exactly as storyboard.mjs's own parseStoryboard does
  // (genre-only copies into format; both present and conflicting refuses). Carried, not imported
  // — same reason as the parser above — and held to storyboard's copy by test/parity.test.ts.
  // Without this, a storyboard that closed both gates on a legacy field still yields
  // `slot.format: null` here, which medium×format dispatch can never match.
  for (const [index, parsedSlot] of slots.entries()) {
    const hasFormat = Object.prototype.hasOwnProperty.call(parsedSlot, "format");
    const hasLegacyFormat = Object.prototype.hasOwnProperty.call(parsedSlot, "genre");
    if (!hasLegacyFormat) continue;
    const label = parsedSlot.id ?? String(index + 1);
    if (hasFormat && parsedSlot.format !== parsedSlot.genre) {
      throw new Error(
        `slot ${label}: conflicting publication format fields: format is ${JSON.stringify(parsedSlot.format)} but legacy genre is ${JSON.stringify(parsedSlot.genre)}`,
      );
    }
    if (!hasFormat) parsedSlot.format = parsedSlot.genre;
    delete parsedSlot.genre;
  }
   return { scalars, slots };
}

// Every reason the named slot cannot leave the analyst gate yet. Empty means it can. Mirrors the
// Gate-2 condition whereIs enforces (chosen among candidates, reachable yes, grounding resolved)
// so a refusal here names the same decision a dispatcher would have reported.
export function slotRefusal({ scalars, slots }, slotId) {
  if (!scalars.grounding) return "the takeaway was never grounded (G1 never closed)";
  if (scalars.grounding === "contradicted") return "the takeaway's grounding verdict is contradicted";
  // `reference` is NOT required — issue #40 made the inspiration loop opt-in and removed its gate.
  // This refusal outlived it, so a story that never reached for a reference could close gate 2 in
  // both readers and then be refused here, several movements later.
  const index = slots.findIndex((slot) => String(slot.id) === String(slotId));
  if (index === -1) return `no slot ${slotId} in STORYBOARD.md`;
  const slot = slots[index];
  if (!slot.chosen) return `slot ${slotId}: nothing chosen`;
  if (!Array.isArray(slot.candidates) || !slot.candidates.includes(slot.chosen)) {
    return `slot ${slotId}: chosen is not among its candidates`;
  }
  if (!ANALYST_MEDIUMS.has(slot.medium)) {
    return `slot ${slotId}: medium ${JSON.stringify(slot.medium)} carries no data contract`;
  }
  if (slot.reachable !== "yes") return `slot ${slotId}: medium and format were never confirmed reachable`;
  return null;
}

// The whole transform, guarded by every refusal above. Returns `{wrote: [paths]}` or throws an
// Error naming the refusal — validation completes before the first write, so a refusal cannot
// leave a half-built artifact behind.
//
// `rebuild` is the S3 recovery path. The hash-drift refusal below is the DEFAULT: a source that
// moved under an existing artifact refuses, because silently rebuilding is how a rendered chart
// stops matching its own source line. Passing `rebuild: true` (CLI: `--rebuild`) ACKNOWLEDGES the
// drift in the operator's name and rewrites from current inputs, refreshing meta.hashes. It is
// not a bypass: every other refusal (Gate 2 state, frozen-pair agreement) still applies first.
export async function buildData({
  storyDir,
  slotId,
  rebuild = false,
  fs = { readFile, writeFile, mkdir },
}) {

  let storyboardBytes;
  try {
    storyboardBytes = await fs.readFile(join(storyDir, "STORYBOARD.md"));
  } catch {
    throw new Error(`refused: STORYBOARD.md is missing — there is no slot contract to read`);
  }
  const parsed = parseStoryboardForAnalyst(storyboardBytes.toString("utf8"));

  const refusal = slotRefusal(parsed, slotId);
  if (refusal) throw new Error(`refused: ${refusal}`);
  const slot = parsed.slots.find((slot) => String(slot.id) === String(slotId));

  let dataBytes;
  let profileBytes;
  try {
    dataBytes = await fs.readFile(join(storyDir, "source", "data.csv"));
  } catch {
    throw new Error("refused: source/data.csv is missing — intake never froze the data");
  }
  try {
    profileBytes = await fs.readFile(join(storyDir, "source", "profile.json"));
  } catch {
    throw new Error("refused: source/profile.json is missing — intake never froze the profile");
  }
  // The ARTICLE is part of the frozen pair, not a companion to it. `intake` profiles the table
  // WITH the prose in hand (freeze.mjs: `profileTable(parseCsv(data), { prose: article })`),
  // because a dataset that states its own incompleteness states it in a sentence and never in a
  // column. A recompute without it is a recompute with different arguments, and the profiler
  // records which it had — `statedIncompleteness.readProse` — so the two can never agree.
  let articleBytes;
  try {
    articleBytes = await fs.readFile(join(storyDir, "source", "article.md"));
  } catch {
    throw new Error("refused: source/article.md is missing — intake never froze the article");
  }

  // The profile must still describe the data. Recomputing it from the frozen CSV with the same
  // profiler AND THE SAME INTAKE catches a swapped or hand-edited file either way.
  //
  // Issue #37 kept this refusal and changed what it MEANS. It is no longer "frozen means frozen,
  // start a new story" — `source/MANIFEST.json` binds each source by digest, so a journalist who
  // corrects row 40 gets the beats that read that source reopened, and the rest of the story left
  // alone. What is still refused is a source moving SILENTLY under an artifact that cites it.
  const recorded = JSON.parse(profileBytes.toString("utf8"));
  const recomputed = profileTable(parseCsv(dataBytes.toString("utf8")), {
    prose: articleBytes.toString("utf8"),
  });
  if (JSON.stringify(recorded) !== JSON.stringify(recomputed)) {
    throw new Error(
      "refused: source/profile.json disagrees with source/data.csv — the frozen pair no longer matches",
    );
  }

  const hashes = {
    storyboard: sha256(storyboardBytes),
    profile: sha256(profileBytes),
    sourceData: sha256(dataBytes),
  };

  const beatDir = join(storyDir, "beats", String(slotId));
  const existing = await fs.readFile(join(beatDir, "data.json")).catch(() => null);
  if (existing !== null) {
    let previous = null;
    try {
      previous = JSON.parse(existing.toString("utf8")).meta?.hashes ?? null;
    } catch {
      previous = null;
    }
    const sameInputs =
      previous !== null &&
      previous.storyboard === hashes.storyboard &&
      previous.profile === hashes.profile &&
      previous.sourceData === hashes.sourceData;
    if (!sameInputs && !rebuild) {
      // A rebuild over a different source would silently move the ground under a chart someone
      // may already be rendering. Refuse; the journalist re-freezes or re-approves instead.
      // An explicit `rebuild` acknowledges the drift and falls through to rewrite.
      throw new Error(
        `refused: beats/${String(slotId)}/data.json exists but was built from different inputs — a source changed since freeze`,
      );
    }
  }


  // ---- validated this far; everything below only shapes and writes ----

  const [, ...body] = parseCsv(dataBytes.toString("utf8"));
  const columns = recorded.columns.map(({ name, type }) => ({ name, type }));
  // Blank cells stay null. A missing reading is a fact about the world; turning it into 0, into
  // the column mean, or into the previous value invents data (references/data-rules.md).
  const rows = body.map((row) =>
    columns.map((column, i) => {
      const cell = (row[i] ?? "").trim();
      return cell === "" ? null : recordTyped(cell, column.type);
    }),
  );

  const artifact = {
    schemaVersion: SCHEMA_VERSION,
    slot: { id: String(slot.id), medium: slot.medium, format: slot.format ?? null, chosen: slot.chosen },
    columns,
    rows,
    meta: {
      hashes,
      sources: ["STORYBOARD.md", "source/profile.json", "source/data.csv"],
      rowCount: rows.length,
      generatedBy: "analyst/scripts/build-data.mjs",
    },
  };

  const notes = renderNotes({ slotId: String(slotId), columns, rows, hashes });

  await fs.mkdir(beatDir, { recursive: true });
  const dataPath = join(beatDir, "data.json");
  const notesPath = join(beatDir, "DATA-NOTES.md");
  await fs.writeFile(dataPath, JSON.stringify(artifact));
  await fs.writeFile(notesPath, notes);
  return { wrote: [dataPath, notesPath], artifact };
}

// Numbers arrive as numbers; dates and text stay strings. Typing comes from the FROZEN PROFILE —
// the analyst never re-types a column, because two readers disagreeing about a column's type is
// how a chart ends up plotting a year as a category.
function recordTyped(cell, type) {
  return type === "number" ? Number(cell) : cell;
}

function renderNotes({ slotId, columns, rows, hashes }) {
  const lines = [];
  lines.push(`# Data notes — beat ${slotId}`);
  lines.push("");
  lines.push("Produced mechanically by `skills/analyst/scripts/build-data.mjs`. No human edits;");
  lines.push("rebuild rather than touch.");
  lines.push("");
  lines.push("## Inputs");
  lines.push("");
  for (const source of ["storyboard", "profile", "sourceData"]) {
    lines.push(`- \`${source}\`: ${hashes[source]}`);
  }
  lines.push("");
  lines.push("## Derivations");
  lines.push("");
  lines.push("- None. Every value passes through as frozen — no imputation, no aggregation,");
  lines.push("  no unit conversion, no rounding. Display rounding is the craft skill's decision,");
  lines.push("  taken per `references/data-rules.md`.");
  const nulled = columns.map((c, i) => ({ c, n: rows.filter((r) => r[i] === null).length }));
  const withNulls = nulled.filter(({ n }) => n > 0);
  if (withNulls.length > 0) {
    lines.push("- Nulls preserved as `null`:");
    for (const { c, n } of withNulls) lines.push(`  - \`${c.name}\`: ${n} of ${rows.length} rows`);
  } else {
    lines.push("- Nulls: none in this table.");
  }
  lines.push("");
  lines.push("## Exclusions");
  lines.push("");
  lines.push(`- None. All ${rows.length} frozen rows are carried.`);
  lines.push("");
  lines.push("## Profile citations");
  lines.push("");
  for (const { name, type } of columns) {
    lines.push(`- \`${name}\` typed \`${type}\` from \`source/profile.json\`.`);
  }
  lines.push("");
  return lines.join("\n");
}

// CLI: `bun skills/analyst/scripts/build-data.mjs <storyDir> <slotId> [--rebuild]`
// Exit 0 writes the artifact; exit 1 refuses having written nothing. `--rebuild` is the S3
// recovery path: it acknowledges that a frozen input moved under the existing artifact and
// rewrites from current inputs, refreshing meta.hashes (see buildData's `rebuild` option).
if (import.meta.main) {
  const argv = process.argv.slice(2);
  const rebuild = argv.includes("--rebuild");
  const [storyDir, slotId] = argv.filter((arg) => !arg.startsWith("--"));
  if (!storyDir || !slotId) {
    console.error(
      "usage: bun skills/analyst/scripts/build-data.mjs <storyDir> <slotId> [--rebuild]",
    );
    process.exit(1);
  }
  try {
    const { wrote } = await buildData({ storyDir, slotId, rebuild });
    for (const path of wrote) console.log(`wrote ${path}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
