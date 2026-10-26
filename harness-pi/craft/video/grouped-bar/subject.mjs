// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-grouped-bar-wind-vs-solar/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: each group's two series as shares of its own whole, the whole mix
// stacked with the two series on top, the groups ordered by the gap between the two (the first series' lead first), and
// the one exception where the second leads. The proof asserted its own answers (six countries, Suisse the one exception);
// a story's answers are whatever its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));
export const MIN_GROUPS = 3;
export const MAX_GROUPS = 8;

/**
 * @param beat  beat.mjs's default export: `groups` [{ name, first, second, others? }], `subject` (the exception's name)
 * @returns     `{ groups: [{ name, wind, solar, mix }], lead, subject }` — the names `build.mjs` reads ("wind" is the FIRST
 *              series and "solar" the SECOND, as the proof named them)
 */
export function subjectOf(beat) {
  if (!(beat.groups.length >= MIN_GROUPS && beat.groups.length <= MAX_GROUPS)) throw new Error(`groups has ${beat.groups.length} groups: the video draws ${MIN_GROUPS} to ${MAX_GROUPS}`);
  const groups = beat.groups
    .map((g) => {
      const name = String(g.name);
      const others = g.others === undefined ? [100 - g.first - g.second] : [g.others].flat().map((o) => (typeof o === "number" ? o : o?.share));
      if (others.some((v) => typeof v !== "number" || !Number.isFinite(v))) throw new Error(`${name}: others must be numbers (or { share }), each a share of the group's whole in percent`);
      for (const [what, v] of [["first", g.first], ["second", g.second], ...others.map((v, i) => [`others[${i}]`, v])])
        if (!(v >= -1e-9)) throw new Error(`${name}: ${what} is ${n(v)}; every part of the group's whole is a share from 0 up — first and second must be shares of the group's whole, in percent`);
      const total = g.first + g.second + others.reduce((s, v) => s + v, 0);
      if (Math.abs(total - 100) > 0.5) throw new Error(`${name}: first + second + others add up to ${n(total)}, not 100 — the video opens on each group's WHOLE rising to 100 %, so first and second are shares of it in percent`);
      // The whole mix stacked from the bottom: every other part first, then the two series on top, so they can be seen leaving it.
      const mix = [...others.map((share, i) => ({ source: `other-${i}`, share: Math.max(0, share) })), { source: "Wind", share: g.first }, { source: "Solar", share: g.second }];
      return { name, wind: g.first, solar: g.second, mix };
    })
    // The static plate's own order: the gap between the two, the first series' lead first.
    .sort((a, b) => b.wind - b.solar - (a.wind - a.solar));
  const tied = groups.filter((g) => g.wind === g.solar);
  if (tied.length) throw new Error(`${tied.map((g) => g.name).join(", ")}: the two series are equal, so neither leads and the count cannot place it`);
  const reversals = groups.filter((g) => g.solar > g.wind);
  // The compare counts every group where the second ends under the first's level, then steps back all but ONE exception.
  if (reversals.length !== 1)
    throw new Error(`the second series leads in ${reversals.length} groups (${reversals.map((g) => g.name).join(", ") || "none"}): this video counts the first series' lead group by group and then picks out the ONE exception — this argument does not hold for this data`);
  if (reversals[0].name !== String(beat.subject))
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, but the one group where the second series leads is ${JSON.stringify(reversals[0].name)}: set subject to it`);
  return { groups, lead: groups.length - 1, subject: reversals[0].name };
}
