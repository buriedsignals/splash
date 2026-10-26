// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-slope-europe-lowcarbon/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every line's two ends and its change, the line to pass (`held`),
// the line that passes it (`subject`), and where the two cross. The proof asserted its own answers (all sixteen rose,
// Finland the only one past France); a story's answers are whatever its data gives, so each assertion becomes a refusal
// that names what to change in beat.mjs.
//
// Runs in Bun only.

const n = (v) => String(+Number(v).toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `lines` [{ key, label, from, to }], `held`, `subject`
 * @returns     `{ lines, climber, held, crossAt, crossValue }` — the names build.mjs reads
 */
export function subjectOf(beat) {
  if (!Array.isArray(beat.lines)) throw new Error("beat.mjs: lines must be an array of { key, label, from, to }");
  if (beat.lines.length < 3) throw new Error(`beat.mjs gives ${beat.lines.length} lines: the video tests every line that started under the held one, so give at least 3`);
  const lines = beat.lines.map((d) => ({ key: String(d.key), label: String(d.label), from: d.from, to: d.to, delta: d.to - d.from }));
  const keys = lines.map((d) => d.key);
  if (new Set(keys).size !== keys.length) throw new Error("lines holds the same key twice: give each line ONE pair of values (filter data.json to the two years)");
  // The count climbs on every line that lands, worded as a rise: a line that fell would be counted as one.
  const fell = lines.filter((d) => !(d.delta > 0));
  if (fell.length)
    throw new Error(
      `${fell.map((d) => `${d.label} (${n(d.from)} → ${n(d.to)})`).join(", ")} did not rise: this video counts every line it draws as a rise while they travel, so it tells only stories where every line rose — leave those lines out (and say so in the title only if the journalist did), or choose another type`,
    );
  const held = lines.find((d) => d.key === String(beat.held));
  if (!held) throw new Error(`held is ${JSON.stringify(beat.held)}, which is no line's key: set held to the key of the line the others are tested against`);
  const climber = lines.find((d) => d.key === String(beat.subject));
  if (!climber) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is no line's key: set subject to the key of the line that passes ${held.label}`);
  if (climber === held) throw new Error("subject and held are the same line: subject is the line that passes, held the line it passes");
  if (!(climber.from < held.from && climber.to > held.to))
    throw new Error(`${climber.label} goes from ${n(climber.from)} to ${n(climber.to)} and ${held.label} from ${n(held.from)} to ${n(held.to)}: ${climber.label} did not pass ${held.label} (under it at the left rail, above it at the right)`);
  const passers = lines.filter((d) => d !== held && d.from < held.from && d.to > held.to);
  if (passers.length !== 1)
    throw new Error(
      `${passers.length} lines pass ${held.label} (${passers.map((d) => d.label).join(", ")}): this video tests each line that started under it and rings ONE crossing, so it tells only "exactly one passed" — that argument does not hold for this data; choose another type or the static format`,
    );
  // Where the two lines cross, as a share of the way from one rail to the other.
  const crossAt = (held.from - climber.from) / (climber.to - climber.from - (held.to - held.from));
  return { lines, climber, held, crossAt, crossValue: climber.from + (climber.to - climber.from) * crossAt };
}
