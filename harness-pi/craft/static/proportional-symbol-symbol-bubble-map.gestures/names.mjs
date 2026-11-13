// The names this kit draws that beat.mjs never spells: the beat maps columns, and render-beat.mjs names each circle by
// its rank ("site 1", the largest), every circle of a group by the subject column's value ("Nuclear") and every circle
// of a place by the name column's value. record_gestures reads them here, before any render (12B, 2026-11-13).
export function drawnNames(beat, table) {
  const at = (name) => (table.columns ?? []).findIndex((c) => c.name === name);
  const where = Object.entries(beat.where ?? {}).map(([c, v]) => [at(c), String(v)]);
  const rows = (table.rows ?? []).filter((r) => where.every(([i, v]) => i >= 0 && String(r[i]) === v));
  const values = (column) => (column && at(column) >= 0 ? [...new Set(rows.map((r) => String(r[at(column)])))] : []);
  const sites = rows.map((_, i) => `site ${i + 1}`);
  return [...sites.slice(0, 3), ...values(beat.subject?.column), ...values(beat.name), ...sites.slice(3)];
}
