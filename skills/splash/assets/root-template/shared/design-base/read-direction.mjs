// twin/shared/design-base/read-direction.mjs
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
import { CORE_REGISTERS, FAMILY_REGISTERS } from "#shared/chart-beat/registers.mjs";

/** Every register name a direction may file, core and apparatus. A table row naming one of these
 *  is a register row, and is held to the full shape; any other table in the record is prose. */
const REGISTER_NAMES = new Set([
  ...CORE_REGISTERS,
  ...Object.values(FAMILY_REGISTERS).flatMap((f) => Object.keys(f)),
]);

/** The line a register sets on, as a multiple of its face's own declared line. Outside this range
 *  the cell is a typo — `145` for `1.45` — and not a design. */
const LEADING_RANGE = Object.freeze([0.7, 2.0]);
const LEADING_SOURCES = Object.freeze(["measured", "chosen"]);

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
  const value = Number(plain(cell).replace(/−/g, "-"));
  if (!Number.isFinite(value)) throw new Error(`not a number in a direction record: ${cell}`);
  return value;
}

/**
 * A record is prose as much as data, and a person emphasising a cell must not change its meaning.
 *
 * MEASURED: `creme` and `rapport` both write `**yes**` for their italic body and annotation
 * registers, and a strict `/^(yes|true)$/` read both as NO. Every render made under those two
 * directions came out upright where the record said italic, and nothing anywhere went red — the
 * axis simply vanished between the record and the picture. Markdown emphasis is stripped before the
 * value is read.
 */
const plain = (cell) => String(cell).replace(/[*_`]/g, "").trim();
const yes = (cell) => /^(yes|true)$/i.test(plain(cell));

/**
 * THE WEIGHTS A DIRECTION FILES, AND THE ONE IT DOESN'T.
 *
 * A direction records the stroke widths its reference actually shows: `series`, the weight a data
 * mark is drawn at, and `rule`, the weight of the head rule and the axis. Both were measured on a
 * published piece. `hairline` — a gridline, a cell edge, a ring inside a ring — was measured on
 * none of them, and eight directed components asked for it anyway.
 *
 * THE DEFECT THIS EXISTS FOR. `direction.stroke.hairline` was `undefined` in every filed direction,
 * so `strokeWidth={undefined}` dropped the attribute and the browser's own 1px default drew the
 * line — the same weight on `nocturne`, whose rule is 0.8, as on `creme`, whose rule is 1. Worse,
 * `undefined * 2` is `NaN`, and two beats shipped `stroke-width="NaN"` into their delivered plates.
 * Nothing went red: an invalid stroke width falls back to 1, which is roughly what was wanted, so
 * the plates looked almost right and the direction had stopped being the thing that set them.
 *
 * A hairline is DERIVED, not filed, for the same reason `muted` and `grid` are derived from the
 * ground rather than named: it has no independent existence. It is the rule, drawn thinner — the
 * lightest line a direction can carry while still being that direction's line. A direction that
 * files its own `hairline` keeps it; nothing here overrides a measurement.
 */
export function deriveStrokes(filed) {
  if (filed.hairline !== undefined) return filed;
  if (filed.rule === undefined) return filed;
  return { ...filed, hairline: Number((filed.rule * 0.6).toFixed(3)) };
}

/**
 * @param {string} text  a direction record's Markdown
 * @param {string} [id]  the record's own id, for messages
 */
export function readDirectionFromMarkdown(text, id = "(unnamed)") {
  const registers = {};
  for (const cells of tableRows(text, "register")) {
    const [name, family, size, weight, italic, tracking, transform, ink, leading] = cells;
    if (!REGISTER_NAMES.has(plain(name ?? ""))) continue;
    if (cells.length < 9 || plain(leading ?? "") === "")
      throw new Error(
        `direction ${id} files no leading for its ${name} register — the register table carries a ` +
          `ninth column, the line as a multiple of the face's own declared line height, and a row ` +
          `without it is refused rather than given a typed default`,
      );
    const line = number(leading);
    if (line < LEADING_RANGE[0] || line > LEADING_RANGE[1])
      throw new Error(
        `direction ${id} files a leading of ${leading} for its ${name} register, outside ` +
          `${LEADING_RANGE.join("..")} — a multiple of the face's own line, so 1.45 rather than 145`,
      );
    registers[name] = {
      family: plain(family),
      size: number(size),
      weight: number(weight),
      italic: yes(italic),
      tracking: number(tracking),
      transform: plain(transform),
      ink: plain(ink),
      leading: line,
    };
  }

  const leadingSource = field(text, "leadingSource");
  if (!LEADING_SOURCES.includes(leadingSource))
    throw new Error(
      `direction ${id} does not say where its leading came from — file \`- leadingSource: measured\` ` +
        `or \`- leadingSource: chosen\`. Nothing harvests a reference's line height yet, so a value ` +
        `that is not claimed is not assumed to be measured`,
    );

  const stroke = field(text, "stroke");
  return {
    id: field(text, "name") ? id : id,
    name: field(text, "name"),
    measuredFrom: field(text, "measuredFrom"),
    ground: field(text, "ground"),
    accent: field(text, "accent"),
    // WHERE THE COLOUR CAME FROM, AS DATA RATHER THAN AS PROSE.
    //
    // Two of the three first directions take an accent their reference does not contain, and both
    // say so in a paragraph — `rapport` deepens the reference's own pale unit blue because a field
    // colour is chosen precisely not to carry emphasis, `nocturne` picks a luminous tone because
    // the piece has four identity hues and a direction takes one. Both are legitimate design acts.
    // But a claim that lives only in prose cannot be counted, and the difference between "this is
    // what the published piece does" and "this is what we decided" is the whole difference this
    // base exists to hold. Absent, a colour is claimed as MEASURED and is checked against the
    // record; `chosen` says a person decided it, and then the record is not asked to contain it.
    groundSource: field(text, "groundSource") ?? "measured",
    accentSource: field(text, "accentSource") ?? "measured",
    leadingSource,
    pad: field(text, "pad") ? number(field(text, "pad")) : null,
    header: field(text, "header"),
    headRule: /^true$/i.test(field(text, "headRule") ?? ""),
    stroke: stroke ? deriveStrokes(Object.fromEntries(
      stroke.split(",").map((part) => {
        const [key, value] = part.split(/\s+/).filter(Boolean);
        return [key.replace(/[^a-z]/gi, ""), number(value)];
      }),
    )) : null,
    registers,
  };
}

/** Read one direction record off disk. */
export function readDirection(path) {
  const id = path.split("/").pop().replace(/\.md$/, "");
  return readDirectionFromMarkdown(readFileSync(path, "utf8"), id);
}
