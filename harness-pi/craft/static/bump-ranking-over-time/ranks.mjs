// Ranks per year, computed once for the render and for beat.mjs's sentences, taken from
// proof/static-bump-emitter-rank/render-directions.mjs. The model never ranks by hand: it passes the
// values, and both the drawn lines and the numbers in its sentences come from here.

/**
 * @param values  [{ entity, year, value }] — one value per entity per year (higher value = rank 1)
 * @param slots   how many ranks are drawn (the top N of each year)
 * @returns       { years, membership, tracks, everIn, rankOf(entity, year) }
 *                tracks: [{ entity, points: [{ year, rank }], throughout }], longest tenure first;
 *                rankOf returns undefined for a year the entity was outside the top `slots`.
 */
export function rankTracks(values, slots) {
  const seen = new Set();
  for (const v of values) {
    const key = `${v.entity}\u0000${v.year}`;
    if (seen.has(key))
      throw new Error(`two values for ${v.entity} in ${v.year}: filter data.json to one row per entity and year (aggregates such as regions or "World" are often the cause)`);
    seen.add(key);
  }
  const years = [...new Set(values.map((v) => v.year))].sort((a, b) => a - b);
  const membership = years.map((year) => ({
    key: String(year),
    members: values
      .filter((v) => v.year === year)
      .sort((a, b) => b.value - a.value)
      .slice(0, slots)
      .map((v) => v.entity),
  }));
  const rankIn = new Map(membership.map((m) => [m.key, new Map(m.members.map((e, i) => [e, i + 1]))]));
  const everIn = [...new Set(membership.flatMap((m) => m.members))];
  const tracks = everIn
    .map((entity) => ({
      entity,
      points: years
        .filter((y) => rankIn.get(String(y)).has(entity))
        .map((y) => ({ year: y, rank: rankIn.get(String(y)).get(entity) })),
      throughout: years.every((y) => rankIn.get(String(y)).has(entity)),
    }))
    .sort((a, b) => b.points.length - a.points.length);
  const rankOf = (entity, year) => rankIn.get(String(year))?.get(entity);
  return { years, membership, tracks, everIn, rankOf };
}
