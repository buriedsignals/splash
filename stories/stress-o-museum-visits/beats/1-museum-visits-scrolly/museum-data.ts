// The beat's own reading layer. Nothing that draws computes a fact; every figure a step's prose
// says out loud is derived here from the frozen `data.csv`.

export type Reading = {
  step: number;
  period: string;
  visits: number;
  complete: boolean;
};

/** Minimal CSV parse: no quoted fields in this frozen file (asserted by the row-width check). */
export function parseReadings(text: string): Reading[] {
  const [header, ...rows] = text.trim().split(/\r?\n/).map((r) => r.split(","));
  const cols = header;
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      if (r.length !== cols.length)
        throw new Error(`row has ${r.length} cells, header has ${cols.length}: ${r.join(",")}`);
      const rec = Object.fromEntries(cols.map((c, i) => [c, r[i]]));
      return {
        step: Number(rec.step),
        period: rec.period,
        visits: Number(rec.visits),
        complete: rec.complete.trim().toLowerCase() === "yes",
      };
    });
}

export type MuseumFacts = {
  complete: Reading[];
  partial: Reading;
  first: Reading;
  last: Reading;
  growthPct: number;
  yMax: number;
};

/**
 * Refuses a file with anything other than exactly one partial reading and requires it to be the
 * LAST row — this beat's own claim ("the last panel is a partial period") depends on that, and a
 * re-export that moved the partial reading earlier or added a second one would quietly make the
 * beat's own narrative false.
 */
export function deriveFacts(readings: Reading[]): MuseumFacts {
  const complete = readings.filter((r) => r.complete);
  const partials = readings.filter((r) => !r.complete);
  if (partials.length !== 1)
    throw new Error(`this beat is written for exactly one partial reading, found ${partials.length}`);
  const partial = partials[0];
  if (readings[readings.length - 1].step !== partial.step)
    throw new Error(
      `this beat's claim depends on the partial reading being the LAST step; it is step ${partial.step} of ${readings.length}`,
    );
  if (complete.length < 2)
    throw new Error(`need at least two complete readings to show a trend, got ${complete.length}`);

  const first = complete[0];
  const last = complete[complete.length - 1];
  const growthPct = ((last.visits - first.visits) / first.visits) * 100;
  const step = 50000;
  const yMax = Math.ceil(Math.max(...complete.map((r) => r.visits)) / step) * step;

  return { complete, partial, first, last, growthPct, yMax };
}
