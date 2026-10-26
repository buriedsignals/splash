// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-marimekko-electricity-mix/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: the bands stacked in the beat's order with the tracked band at
// the foot, each column's bands summing to its own total, the columns ordered by total, the tracked band's total and
// share of the whole, and the columns that hold most of it — the ones the strip names and the conclusion rings. The proof
// asserted its own answers (12 %, Germany and Poland hold 99,5 %); a story's answers are whatever its data gives, and
// the claim is beat.mjs's check().
//
// Runs in Bun only.

/**
 * @param beat  beat.mjs's default export: `columns` [{ key, label, values }], `bandOrder` [{ key, label }], `tracked`, `named`
 * @returns     `{ columns: [{ key, name, total, bands }], grand, sources: [{ column, label }], tracked, coal: { total, share, holders, topShare } }`
 *              — `coal` is the TRACKED band (coal in the worked example), the name the proof's build.mjs reads
 */
export function subjectOf(beat) {
  const order = beat.bandOrder;
  if (!Array.isArray(order) || order.length < 2 || order.length > 10)
    throw new Error(`bandOrder holds ${order?.length} bands; a marimekko stacks 2 to 10. Add the smallest bands of one family together (and name the merged band so)`);
  if (new Set(order.map((b) => b.key)).size !== order.length) throw new Error("two bands in bandOrder share a key");
  const tracked = String(beat.tracked);
  if (!order.some((b) => String(b.key) === tracked))
    throw new Error(`tracked ${JSON.stringify(beat.tracked)} is not the key of a band in bandOrder (${order.map((b) => b.key).join(", ")})`);
  // THE RAMP RUNS FROM THE FOOT: the tracked band takes its darkest step, the only one sure to read against the ground,
  // and it is the band that pours out from the foot of every column.
  if (String(order[0].key) !== tracked) throw new Error(`tracked is ${tracked}, but the first band of bandOrder is ${order[0].key}: put the tracked band FIRST in bandOrder (it is drawn at the foot of every column)`);
  if (!Array.isArray(beat.columns) || beat.columns.length < 2 || beat.columns.length > 8)
    throw new Error(`columns holds ${beat.columns?.length} entities; a marimekko draws 2 to 8 columns. Group the smallest into one named column, or choose a stacked bar`);
  if (new Set(beat.columns.map((c) => c.key)).size !== beat.columns.length) throw new Error("two columns share a key: one column per entity — filter data.json to one year");
  for (const c of beat.columns) {
    const absent = order.filter((b) => !(b.key in (c.values ?? {})));
    if (absent.length) throw new Error(`column ${c.key} has no value for ${absent.map((b) => b.key).join(", ")}: every column carries every band (0 where there is none)`);
  }
  const negative = beat.columns.flatMap((c) => order.filter((b) => c.values[b.key] < 0).map((b) => `${c.key}.${b.key}`));
  if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} are negative: a band's area is a quantity and cannot be below zero`);

  const columns = beat.columns
    .map((c) => {
      const values = order.map((b) => c.values[b.key]);
      const total = values.reduce((a, b) => a + b, 0);
      return { key: String(c.key), name: String(c.label), total, bands: order.map((b, i) => ({ key: String(b.key), label: String(b.label), value: values[i], share: total > 0 ? values[i] / total : 0 })) };
    })
    .sort((a, b) => b.total - a.total);
  const empty = columns.filter((c) => !(c.total > 0));
  if (empty.length) throw new Error(`${empty.map((c) => c.key).join(", ")} total 0: a column with no width cannot be drawn — leave it out`);

  const grand = columns.reduce((s, c) => s + c.total, 0);
  const tracking = (c) => c.bands.find((b) => b.key === tracked).value;
  const total = columns.reduce((s, c) => s + tracking(c), 0);
  if (!(total > 0)) throw new Error(`no column holds any ${tracked}: the video pours the tracked band out of the columns, and there is nothing to pour`);
  const named = beat.named ?? 2;
  if (!(Number.isInteger(named) && named >= 1 && named <= 3)) throw new Error(`named is ${JSON.stringify(beat.named)}: the strip names and the conclusion rings 1 to 3 columns`);
  const holders = [...columns].sort((a, b) => tracking(b) - tracking(a)).slice(0, named);
  const empties = holders.filter((h) => !(tracking(h) > 0));
  if (empties.length) throw new Error(`only ${named - empties.length} column(s) hold any ${tracked}, but named is ${named}: lower named`);
  const topShare = holders.reduce((s, h) => s + tracking(h), 0) / total;
  return {
    columns,
    grand,
    sources: order.map((b) => ({ column: String(b.key), label: String(b.label) })),
    tracked,
    coal: { total, share: total / grand, holders: holders.map((h) => h.key), topShare },
    holdersOut: [...columns].map((c) => ({ key: c.key, label: c.name, value: tracking(c) })).sort((a, b) => b.value - a.value),
  };
}
