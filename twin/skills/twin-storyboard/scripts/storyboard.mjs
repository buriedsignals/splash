// STORYBOARD.md is YAML front matter (a narrow, dependency-free subset) plus free prose. Only the
// front matter is machine-checked; the prose beneath it is what the journalist actually reads.

const HAND = ["subject", "comparison", "limits", "placement", "credit", "effectiveDate"];

// Bare (unquoted) YAML null sentinels. `twin/skills/splash-twin/scripts/where.mjs` refuses these
// same two raw tokens as a confirmed takeaway (hasConfirmedTakeaway) — this parser has to resolve
// them to a real missing value too, or the two gates would disagree about whether G1 has closed.
// A *quoted* "null" or "~" is a literal string, not the sentinel, so this only fires on the bare form.
function isNullSentinel(value) {
  return value === "null" || value === "~";
}

function scalar(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
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

export function checkStoryboard(meta) {
  const errors = [];
  if (!meta.takeaway) errors.push("takeaway is missing");
  for (const field of HAND) if (!meta[field]) errors.push(`${field} is missing`);

  const slots = meta.slots ?? [];
  if (slots.length === 0) errors.push("no slot: nothing would be produced");

  for (const slot of slots) {
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];
    if (!slot.chosen) {
      errors.push(`slot ${slot.id}: nothing chosen — gate 2 is not closed`);
      continue;
    }
    if (candidates.length > 0 && !candidates.includes(slot.chosen)) {
      errors.push(`slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} is not among its candidates`);
    }
  }
  return errors;
}
