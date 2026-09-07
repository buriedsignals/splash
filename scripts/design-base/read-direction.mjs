// twin/scripts/design-base/read-direction.mjs
//
// A FILED DIRECTION, PARSED INTO THE OBJECT `registers.mjs` TAKES.
//
// Direction records are Markdown so that a person can read one without a tool — the measurement
// that produced each value is written beside it, in prose, and that is the point of the format.
// This is the smallest parse that respects it: the `- key: value` lines for the direction's own
// facts, and the register table for the six registers.
//
// It lives in `scripts/` rather than `shared/` because it reads the CORPUS, which exists only in
// this repository. A delivered root carries the resolved direction, never the record it came from.

import { readFileSync } from "node:fs";

/** `- ground: #FFFCEE` → `#FFFCEE`. */
function field(text, key) {
  return text.match(new RegExp(`^- ${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? null;
}

/** A Markdown table's data rows, each already split on its pipes. */
function tableRows(text, firstColumn) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells[0] === firstColumn) continue; // the header
    if (/^-+:?$/.test(cells[1]) || /^:?-+:?$/.test(cells[0])) continue; // the rule
    rows.push(cells);
  }
  return rows;
}

/**
 * A number written for a person to read: a record may carry a typographic minus (U+2212) rather
 * than a hyphen, because it is prose as much as data.
 */
function number(cell) {
  const value = Number(String(cell).replace(/−/g, "-"));
  if (!Number.isFinite(value)) throw new Error(`not a number in a direction record: ${cell}`);
  return value;
}

const yes = (cell) => /^(yes|true)$/i.test(String(cell).trim());

/**
 * @param {string} text  a direction record's Markdown
 * @param {string} [id]  the record's own id, for messages
 */
export function readDirectionFromMarkdown(text, id = "(unnamed)") {
  const registers = {};
  for (const cells of tableRows(text, "register")) {
    const [name, family, size, weight, italic, tracking, transform, ink] = cells;
    if (!name || cells.length < 8) continue;
    registers[name] = {
      family,
      size: number(size),
      weight: number(weight),
      italic: yes(italic),
      tracking: number(tracking),
      transform,
      ink,
    };
  }

  const stroke = field(text, "stroke");
  return {
    id: field(text, "name") ? id : id,
    name: field(text, "name"),
    measuredFrom: field(text, "measuredFrom"),
    ground: field(text, "ground"),
    accent: field(text, "accent"),
    pad: field(text, "pad") ? number(field(text, "pad")) : null,
    header: field(text, "header"),
    headRule: /^true$/i.test(field(text, "headRule") ?? ""),
    stroke: stroke ? Object.fromEntries(
      stroke.split(",").map((part) => {
        const [key, value] = part.split(/\s+/).filter(Boolean);
        return [key.replace(/[^a-z]/gi, ""), number(value)];
      }),
    ) : null,
    registers,
  };
}

/** Read one direction record off disk. */
export function readDirection(path) {
  const id = path.split("/").pop().replace(/\.md$/, "");
  return readDirectionFromMarkdown(readFileSync(path, "utf8"), id);
}
