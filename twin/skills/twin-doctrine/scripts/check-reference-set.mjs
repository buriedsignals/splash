// twin/skills/twin-doctrine/scripts/check-reference-set.mjs
// A reference without a link, a timecode and a lesson is decoration.

// Splits a markdown table row on unescaped pipes, so a cell that needs a
// literal "|" (written as the standard markdown escape "\|") is not itself
// mistaken for an extra column boundary — a naive `row.split("|")` shifts
// every following cell, and can turn a real, well-formed lesson into a
// false "too thin" rejection (or worse, a false accept on truncated text).
function splitRow(row) {
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

export function checkReferenceSet(markdown) {
  const errors = [];
  const rows = markdown.split("\n").filter((line) => line.startsWith("|") && !/^\|\s*:?-+/.test(line));
  rows.slice(1).forEach((row, index) => {
    const [, reference = "", moment = "", lesson = ""] = splitRow(row);
    const label = `reference ${index + 1}`;
    if (!/\]\(https?:\/\/\S+\)/.test(reference)) errors.push(`${label}: no link`);
    if (!/\d+:\d{2}/.test(moment)) errors.push(`${label}: no timecode`);
    if (lesson.split(/\s+/).filter(Boolean).length < 5) errors.push(`${label}: lesson is too thin`);
  });
  return errors;
}
