/**
 * The beat's own reading layer for `source/data.csv` (`step,label,value`) — nothing here draws;
 * nothing that draws computes a fact, the same rule `assets/gauge-data.ts` states for the seed.
 *
 * The trap this file exists to carry, unmodified, is that steps 2/3/4 and 6/7 genuinely repeat:
 * the article states the scanner reports once per shift, not once per container, so three readings
 * in a row can be the SAME reading rather than three different ones. This file does not smooth,
 * dedupe or interpolate that away — `readings` is the eight rows, unchanged, and `repeatedRuns`
 * names the runs explicitly so the beat's own prose can say so honestly instead of pretending
 * eight checkpoints means eight distinct positions.
 */

export type Reading = { step: number; label: string; value: number };

/** RFC 4180 row tokeniser — the same one every reader in this tree carries its own copy of, never
 *  imported across a beat or out of a skill. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseReadings(csv: string): Reading[] {
  const [header, ...lines] = parseCsvRows(csv.trim());
  const columns = header ?? [];
  const stepAt = columns.indexOf("step");
  const labelAt = columns.indexOf("label");
  const valueAt = columns.indexOf("value");
  if (stepAt < 0 || labelAt < 0 || valueAt < 0)
    throw new Error(`csv has no step / label / value column, got: ${header}`);

  const readings: Reading[] = [];
  for (const line of lines) {
    if (!line || line.every((cell) => cell === "")) continue;
    const step = Number(line[stepAt]);
    const value = Number(line[valueAt]);
    if (!Number.isFinite(step) || !Number.isFinite(value))
      throw new Error(`row ${JSON.stringify(line)} carries a non-numeric step or value`);
    readings.push({ step, label: line[labelAt] ?? "", value });
  }
  readings.sort((a, b) => a.step - b.step);
  return readings;
}

/** Consecutive readings whose LABEL AND VALUE are both identical — a genuine repeat, not merely a
 *  coincidence of the value alone. Returns each run as the list of step numbers it spans, longest
 *  runs found honestly rather than assumed to be exactly three. */
export function repeatedRuns(readings: readonly Reading[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < readings.length; i++) {
    const prev = readings[i - 1];
    const here = readings[i];
    if (prev && prev.label === here.label && prev.value === here.value) {
      if (current.length === 0) current.push(prev.step);
      current.push(here.step);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

export type Facts = {
  readings: Reading[];
  count: number;
  start: Reading;
  end: Reading;
  maxValue: number;
  repeats: number[][];
};

export function deriveFacts(readings: readonly Reading[]): Facts {
  if (readings.length === 0) throw new Error("no readings to derive facts from");
  const start = readings[0]!;
  const end = readings[readings.length - 1]!;
  const maxValue = readings.reduce((m, r) => Math.max(m, r.value), -Infinity);
  return {
    readings: [...readings],
    count: readings.length,
    start,
    end,
    maxValue,
    repeats: repeatedRuns(readings),
  };
}
