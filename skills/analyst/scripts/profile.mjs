// twin/skills/intake/scripts/profile.mjs

// A plain decimal literal: optional sign, digits, optional exponent.
// Deliberately narrower than Number() — Number("0x10") is 16 and Number("Infinity")
// is a finite check away from slipping through; a blank/whitespace value never matches.
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

function isNumeric(v) {
  return NUMERIC_RE.test(v) && Number.isFinite(Number(v));
}

function typeOf(values) {
  const present = values.filter((v) => v !== "");
  if (present.length === 0) return "text";
  if (present.every(isNumeric)) return "number";
  if (present.every((v) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v))) return "date";
  return "text";
}

export function profileTable(rows) {
  const [header = [], ...body] = rows;
  const columns = header.map((name, index) => {
    const values = body.map((row) => (row[index] ?? "").trim());
    const type = typeOf(values);
    const numbers = type === "number" ? values.filter((v) => v !== "").map(Number) : [];
    return {
      name,
      type,
      missing: values.filter((v) => v === "").length,
      distinct: new Set(values.filter((v) => v !== "")).size,
      min: numbers.length ? Math.min(...numbers) : null,
      max: numbers.length ? Math.max(...numbers) : null,
      // The column total, beside its range. A takeaway citing a part-to-whole total ("34 million
      // tonnes" against rows of 14, 11 and 9) cites a number that is by construction OUTSIDE the
      // range of the column it sums, so without this the only check that can see it reads it as a
      // number the data refutes — which is exactly what it did (storyboard's ground-claim.mjs).
      sum: numbers.length ? numbers.reduce((a, b) => a + b, 0) : null,
    };
  });
  return { rowCount: body.length, columns };
}
