// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-sankey-electricity-sources/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: the left rail's sources and the right rail's targets in the
// beat's order, one flow per pair, every node's total the sum of its own flows (conservation on both rails), the
// TRACKED flow and its share of its source, and where the tracked flow lands inside its target's node — the band the
// copy of the source's bar is laid against. The proof asserted its own answers (nuclear the largest source, France
// 83,6 % of it); a story's answers are whatever its data gives — the claim is beat.mjs's check() — and what the gesture
// needs becomes a refusal.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));

/**
 * @param beat  beat.mjs's default export: `sources`, `targets` [{ key, label, total? }], `flows` [{ from, to, value }], `tracked`
 * @returns     `{ sources, countries, flows, grand, biggest, holder, holderFlow, share, bandStart, rest }` — the proof's names:
 *              `countries` is the right rail, `biggest` the tracked source, `holder` the tracked target
 */
export function subjectOf(beat) {
  const sourcesIn = beat.sources;
  const targetsIn = beat.targets;
  if (!Array.isArray(sourcesIn) || sourcesIn.length < 2 || sourcesIn.length > 12) throw new Error(`sources holds ${sourcesIn?.length} nodes; the left rail draws 2 to 12`);
  if (!Array.isArray(targetsIn) || targetsIn.length < 2 || targetsIn.length > 12) throw new Error(`targets holds ${targetsIn?.length} nodes; the right rail draws 2 to 12`);
  const sKeys = sourcesIn.map((s) => String(s.key));
  const tKeys = targetsIn.map((t) => String(t.key));
  if (new Set(sKeys).size !== sKeys.length || new Set(tKeys).size !== tKeys.length) throw new Error("two nodes on one rail share a key");
  const clash = sKeys.filter((k) => tKeys.includes(k));
  if (clash.length) throw new Error(`${clash.join(", ")} is the key of a source AND a target: a target's key must differ from every source's`);
  const seen = new Set();
  const flows = beat.flows.map((f) => {
    const from = String(f.from);
    const to = String(f.to);
    if (!sKeys.includes(from)) throw new Error(`a flow comes from ${from}, not the key of a source`);
    if (!tKeys.includes(to)) throw new Error(`a flow goes to ${to}, not the key of a target`);
    if (seen.has(`${from}|${to}`)) throw new Error(`two flows for ${from} → ${to}: data.json holds several years or series — filter its rows to one`);
    seen.add(`${from}|${to}`);
    if (!(f.value >= 0)) throw new Error(`the flow ${from} → ${to} is ${f.value}: a ribbon has a width, not a sign — a net change is a diverging bar`);
    return { from, to, value: f.value };
  });
  const sumOf = (list) => list.reduce((s, f) => s + f.value, 0);
  const node = (list, side) =>
    list.map((x) => {
      const key = String(x.key);
      const total = sumOf(flows.filter((f) => f[side] === key));
      if (x.total !== undefined && Math.abs(x.total - total) > Math.max(1e-6, Math.abs(total) * 1e-9))
        throw new Error(`${key}'s total is ${n(x.total)}, but its own flows add up to ${n(total)}: compute each total from flows (or leave total out)`);
      if (!(total > 0)) throw new Error(`${key} has no flow: leave it out`);
      return { key, label: String(x.label), total };
    });
  const sources = node(sourcesIn, "from");
  const countries = node(targetsIn, "to");
  const grand = sumOf(flows);

  const trackedFrom = String(beat.tracked?.from);
  const trackedTo = String(beat.tracked?.to);
  const holderFlow = flows.find((f) => f.from === trackedFrom && f.to === trackedTo);
  if (!holderFlow) throw new Error(`tracked is ${JSON.stringify(beat.tracked)}, a pair with no flow: give { from, to } of ONE flow`);
  const biggest = sources.find((s) => s.key === trackedFrom);
  const holder = countries.find((c) => c.key === trackedTo);
  const share = holderFlow.value / biggest.total;
  // On the target's rail its ribbons stack in the sources' order, so the tracked band starts after the sources above.
  const before = sKeys.slice(0, sKeys.indexOf(trackedFrom));
  const bandStart = sumOf(flows.filter((f) => f.to === holder.key && before.includes(f.from)));
  return { sources, countries, flows, grand, biggest, holder, holderFlow, share, bandStart, rest: biggest.total - holderFlow.value };
}

/**
 * What the gesture needs, checked AFTER beat.check(): the copy of the tracked source's bar is laid with its top level
 * with the tracked band, which is the TOP of the source's bar only when the tracked target is the first on the right
 * rail; and the share drawn on the ribbon is a whole percent above 0.
 */
export function assertGesture(subject) {
  if (subject.countries[0].key !== subject.holder.key)
    throw new Error(`the tracked target ${subject.holder.key} is not the first of targets (${subject.countries[0].key} is): its ribbon must be the top of ${subject.biggest.key}'s bar for the copy to line up with it — put ${subject.holder.key} first in targets`);
  if (!(Math.round(subject.share * 100) >= 1)) throw new Error(`the tracked flow is ${n(subject.share * 100)} % of ${subject.biggest.key}: under 1 %, the copy's matching part is a sliver and its share prints 0 %`);
}
