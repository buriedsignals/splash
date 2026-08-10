// A minimal, dependency-free RFC4180-ish serialiser — the only shape Datawrapper's
// `PUT /v3/charts/{id}/data` accepts as `text/csv`. No library: this is one function, not a reason
// to add a dependency to a skill whose whole point is thinness.

function needsQuoting(value) {
  return /[",\n]/.test(value);
}

function escapeCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (!needsQuoting(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

export function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("toCsv: rows must be a non-empty array");
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  }
  return lines.join("\n");
}
