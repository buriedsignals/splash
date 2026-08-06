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

function hasScalarField(frontmatter, field) {
  if (!frontmatter) return false;
  const match = frontmatter.match(new RegExp(`^${field}:[ \\t]*([^\\n]+)$`, "m"));
  if (!match) return false;
  return !isMissingScalar(match[1].trim());
}

function hasConfirmedTakeaway(frontmatter) {
  return hasScalarField(frontmatter, "takeaway");
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
  if (!hasConfirmedTakeaway(frontmatter)) gaps.push("a confirmed takeaway");

  for (const field of HAND) {
    if (!hasScalarField(frontmatter, field)) gaps.push(`the hand-of-the-journalist field "${field}"`);
  }

  const slots = parseSlotsForGate(frontmatter);
  if (slots.length === 0) {
    gaps.push("no slot: nothing would be produced");
    return gaps;
  }

  slots.forEach((slot, index) => {
    const label = slot.id ?? String(index + 1);
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];
    if (!slot.chosen) {
      gaps.push(`slot ${label}: nothing chosen`);
    } else if (candidates.length === 0) {
      gaps.push(`slot ${label}: chosen but no candidates were ever listed`);
    } else if (!candidates.includes(slot.chosen)) {
      gaps.push(`slot ${label}: chosen is not among its candidates`);
    }
  });

  return gaps;
}

async function hasAnyRender(storyDir) {
  for (const beat of await list(join(storyDir, "beats"))) {
    if ((await list(join(storyDir, "beats", beat, "renders"))).length > 0) {
      return true;
    }
  }
  return false;
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

  const hasRender = await hasAnyRender(storyDir);
  const exported = await list(join(storyDir, "export"));

  if (!hasRender && exported.length > 0) {
    return { phase: "production", missing: ["no renders exist in any beat"] };
  }

  if (exported.length > 0) return { phase: "done", missing: [] };
  if (hasRender) return { phase: "delivery", missing: [] };

  return { phase: "production", missing: [] };
}
