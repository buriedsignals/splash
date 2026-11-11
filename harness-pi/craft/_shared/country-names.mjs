// Country names to ISO alpha-3, with no file access: the usual aliases, a name's normal form and an edit distance,
// shared by countries.mjs (Node, reads shapes.geojson) and the browser-safe shape layout.

export const ALIASES = {
  holland: "NLD", netherlands: "NLD", "the netherlands": "NLD", macedonia: "MKD", "north macedonia": "MKD",
  "czech republic": "CZE", czechia: "CZE", uk: "GBR", "united kingdom": "GBR", britain: "GBR", "great britain": "GBR",
  "bosnia and herzegovina": "BIH", bosnia: "BIH", moldova: "MDA", "republic of moldova": "MDA", russia: "RUS",
  "russian federation": "RUS", turkey: "TUR", turkiye: "TUR", "türkiye": "TUR", kosovo: "XKX", slovakia: "SVK",
  "slovak republic": "SVK", ireland: "IRL", "republic of ireland": "IRL", belarus: "BLR", ukraine: "UKR",
};

export const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/**
 * The code a name most likely stands for, among `features` (the map's own shapes) and the aliases: exact when a name or
 * alias matches, else the closest name, marked so the beat says it corrected a misspelling.
 */
export function codeFor(name, features) {
  const names = new Map(Object.entries(ALIASES));
  for (const f of features) if (f.properties?.iso && f.properties?.name) names.set(norm(f.properties.name), f.properties.iso);
  const n = norm(name);
  if (names.has(n)) return { code: names.get(n), exact: true };
  const closest = [...names.keys()].sort((a, b) => distance(n, a) - distance(n, b))[0];
  return closest === undefined ? undefined : { code: names.get(closest), exact: false, closest };
}
