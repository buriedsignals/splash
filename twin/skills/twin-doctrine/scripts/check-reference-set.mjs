// twin/skills/twin-doctrine/scripts/check-reference-set.mjs
// A reference without a link, a locator and a lesson is decoration.

// Splits a markdown table row on unescaped pipes, so a cell that needs a
// literal "|" (written as the standard markdown escape "\|") is not itself
// mistaken for an extra column boundary — a naive `row.split("|")` shifts
// every following cell, and can turn a real, well-formed lesson into a
// false "too thin" rejection (or worse, a false accept on truncated text).
function splitRow(row) {
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

// A separator row (`| --- | ---: | --- |`) is made of nothing but pipes,
// colons, dashes and whitespace, and carries at least one dash. Detecting it
// this way — rather than requiring a leading "|" — is what lets a real data
// row be recognised even without one.
function isSeparatorRow(trimmed) {
  return trimmed.includes("-") && /^[\s|:-]+$/.test(trimmed);
}

// A candidate table row: after trimming, it carries at least the two
// unescaped pipes needed to delimit three columns, and is not the separator
// row. Trimming first, and counting pipes instead of requiring the line to
// *start* with one, is what stops an indented row — or a row missing its
// own leading pipe, which GFM tables do not require — from being silently
// skipped, invisible to both this check and any row count built on it.
function isTableRow(line) {
  const trimmed = line.trim();
  if (isSeparatorRow(trimmed)) return false;
  const pipes = trimmed.split(/(?<!\\)\|/).length - 1;
  return pipes >= 2;
}

function tableRows(markdown) {
  return markdown.split("\n").filter(isTableRow);
}

// A real timecode: minutes:seconds, or hours:minutes:seconds, anchored end
// to end. Anchoring — rather than testing whether the pattern occurs
// *anywhere* in the cell — is what stops a moment cell like "around 0:48 or
// so" (prose that merely contains a timecode-shaped fragment) from being
// accepted as though it cleanly were one.
const TIMECODE_RE = /^\d{1,3}:\d{2}(?::\d{2})?$/;

// A minimum length for a non-timecode locator, so a blank cell or a single
// stray character does not pass as though it named something.
const MIN_LOCATOR_CHARS = 2;

// A published, non-video graphic has no timecode: its locator is a figure
// number, a panel, a section, a chart title instead — "Fig. 3", the
// element a chart's own aria-label or on-page caption names, a paragraph
// heading. A moment cell is valid when it is a clean timecode, OR when it
// names something real without pretending, half-formed, to be a timecode
// (a colon present but the shape not anchored-valid — "1:2:33:44", "abc
// 1:02:33" — is rejected outright rather than falling back to "well, it's
// non-blank text").
function isLocator(moment) {
  if (TIMECODE_RE.test(moment)) return true;
  if (moment.includes(":")) return false;
  return moment.length >= MIN_LOCATOR_CHARS;
}

// The reference loop looks a row up BY ITS ARGUMENT STRUCTURE — that is what the file's own opening
// sentence promises, and for three rounds the table had no such column, so the loop could only read
// seven long prose cells and judge. A key too short to be a key ("ranking", "maps") is the failure
// this floor catches: it has to name a SHAPE OF ARGUMENT, not a chart family.
const MIN_STRUCTURE_CHARS = 12;

export function checkReferenceSet(markdown) {
  const errors = [];
  const rows = tableRows(markdown);
  rows.slice(1).forEach((row, index) => {
    const [, structure = "", reference = "", moment = "", lesson = ""] = splitRow(row);
    const label = `reference ${index + 1}`;
    if (structure.length < MIN_STRUCTURE_CHARS) errors.push(`${label}: no argument structure`);
    if (!/\]\(https?:\/\/\S+\)/.test(reference)) errors.push(`${label}: no link`);
    if (!isLocator(moment)) errors.push(`${label}: no locator`);
    if (lesson.split(/\s+/).filter(Boolean).length < 5) errors.push(`${label}: lesson is too thin`);
  });
  return errors;
}

// The number of data rows (header and separator excluded) a reference table
// carries. Shares `tableRows`' row detection with `checkReferenceSet` itself
// — a fix to one can no longer silently leave the other counting a
// different, stricter (or looser) set of rows than the one actually being
// validated.
export function countReferenceRows(markdown) {
  return tableRows(markdown).length - 1;
}
