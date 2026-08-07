// THE PROSE CHAIN'S OWN GEOGRAPHY MATCH — the bridge that was missing under an admin-1 map.
//
// Two chains drive these engines. The LOOP chain runs `orient` (lib/loop/orient.ts:43), which
// calls `matchGeography`, and its assembler (lib/loop/assemble/map-native.ts:297) threads the
// resulting `featureIdsByValue` onto the config. The PROSE chain — the one a journalist actually
// walks (skills/splash/SKILL.md → produce-all.mjs → lib/core/verbs/render.ts, which writes the
// spec VERBATIM as config.json) — has neither step, so that field could never be populated.
//
// The consequence was measured on a real run (docs/splash/…adm1-unreachable-from-prose-chain):
// every admin-1 choropleth was offerable and validatable and then threw at produce
// (lib/geo/resolve-for-produce.ts:351), telling the journalist to "re-run the geography match
// (orient)" — a step their chain does not have. Swiss cantons, French départements, US counties:
// all of natural-earth-admin-1 was dead on the chain that ships.
//
// So the match runs HERE, at the top of produce, from exactly the inputs the config already
// carries. Same index, same function, same result as orient's.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────────────────────────
// CHOROPLETH ONLY. `dot-density` and `cartogram` are also admin-1-joinable types, and both
// resolve their join key themselves with a hardcoded `iso_a3` default (DotDensityMap.tsx:41,
// cartogram-geo.ts:62) that an admin-1 subset — which keeps `name` only — can never satisfy.
// Filling their ids would turn the resolver's LOUD refusal into a map with boundaries and no
// data on it.
//
// That boundary is no longer defended by the resolver's throw alone. Both chains now refuse the
// pairing by name, in one wording, BEFORE any producer runs — the loop at
// assemble/map-native.ts's dot-density branch, the prose chain at skills/splash/src/
// validate-gate.ts's `regionJoinError` — and both take their sentence from
// region-join-support.ts, which also carries the measurements behind it. This module stays
// choropleth-only for exactly the reason stated there; widening it means lifting those two
// components onto `config.geography.joinKey` first, with a render proof.
import { matchAdm1Columns } from "./geo-match";
import {
  basemapKeyFor,
  resolveGeographyRef,
  type GeographyRef,
} from "./basemaps";

const ADM1 = "natural-earth-admin-1";

type LooseConfig = Record<string, unknown>;

function geographyOf(config: LooseConfig): GeographyRef | undefined {
  if (config.geography) return config.geography as GeographyRef;
  if (typeof config.basemap === "string" && config.basemap.trim())
    try {
      return resolveGeographyRef(config.basemap);
    } catch {
      // An unregistered basemap name is validate-config's refusal to make, with its own
      // sentence and the list of valid names — never this module's, and never a throw here.
      return undefined;
    }
  return undefined;
}

/** Every beat/anchor field that names a region by its raw cell value, so a re-pointed join can
 *  carry them across instead of stranding a storyboard the journalist already confirmed. */
function remapArcBeats(
  config: LooseConfig,
  rows: Record<string, unknown>[],
  from: string,
  to: string,
): void {
  const beats = config.arcBeats;
  if (!Array.isArray(beats)) return;
  const byOld = new Map<string, string>();
  for (const row of rows) {
    const oldValue = String(row[from] ?? "").trim();
    const newValue = String(row[to] ?? "").trim();
    if (oldValue && newValue) byOld.set(oldValue, newValue);
  }
  for (const beat of beats as { region?: unknown }[]) {
    if (typeof beat.region !== "string") continue;
    const mapped = byOld.get(beat.region.trim());
    // A beat naming something that is not a row of this table is the gate's refusal to make
    // (validate-config's `mapArcErrors`), not this module's — and it was already made, against
    // the OLD key. Re-pointing must not invent an anchor; leaving it is what makes the later
    // refusal say the true thing.
    if (mapped) beat.region = mapped;
  }
}

/**
 * Populate `config.featureIdsByValue` (and `config.geography`) for an admin-1 choropleth that
 * never went through the loop's orient step. Mutates `config` in place — the same contract
 * `resolveGeometryForProduce` already has, and it runs immediately before it.
 *
 * Throws a produce-time error naming what could not be resolved. Never throws for a config it
 * does not recognize as an un-matched admin-1 choropleth: it returns and leaves it untouched.
 */
export function backfillAdm1FeatureIds(
  config: LooseConfig,
  match: typeof matchAdm1Columns = matchAdm1Columns,
): void {
  if (config.featureIdsByValue) return; // the loop chain already did this
  // A config that has already been through the resolver carries real geometry and rows rewritten
  // to the geometry's own literals. Re-running the match over those would re-open the column
  // question against data that has already answered it — the shape a delivered `code-source`
  // bundle ships, and a second produce on it must be a no-op here.
  if (config.geometry) return;
  if ((config.type ?? "choropleth") !== "choropleth") return; // see the header
  const geography = geographyOf(config);
  if (!geography || basemapKeyFor(geography) !== ADM1) return;

  const rows = config.rows;
  const declared = config.regionKey;
  if (!Array.isArray(rows) || rows.length === 0) return;
  if (typeof declared !== "string" || !declared) return;
  const typedRows = rows as Record<string, string | number>[];

  // THE DECLARED KEY FIRST. The wide search returns the best column across the table and keeps
  // the FIRST on a tie (geo-match.ts's strict `>`), which is row-key insertion order — so a
  // table carrying two columns that both resolve (a canton of residence and a canton of birth)
  // would silently shade the wrong one, overriding a `regionKey` that was correct. The declared
  // key is the journalist's answer; the search is only a fallback for when it resolves nothing,
  // which is the real case this module was written for (`canton_code` = "CH-GE" resolves 0,
  // `canton` = "Genève" resolves 4/4).
  const onDeclared = match([declared], typedRows);
  const geo = onDeclared ?? match(Object.keys(typedRows[0]!), typedRows);

  if (!geo || !geo.featureIdsByValue) {
    const values = [
      ...new Set(typedRows.map((r) => String(r[declared] ?? "").trim())),
    ].filter(Boolean);
    throw new Error(
      `produce: this map joins on the admin-1 regions of "${ADM1}", and no column of this table ` +
        `names one — "${declared}" holds ${values.slice(0, 6).join(", ")}` +
        `${values.length > 6 ? `, … (${values.length} in all)` : ""}. Give the column the ` +
        `region's own name (e.g. "Genève", "Haute-Savoie"), or use a country-level map.`,
    );
  }

  // The one column the join may never be re-pointed at: the one carrying the values. Losing it
  // would leave a map that shades nothing, which is worse than the refusal it replaces. (Gate 2
  // already requires numeric values, so this is an assertion rather than a live path — kept
  // because the two rules live in different files and only one of them is enforced here.)
  if (geo.column === config.valueField)
    throw new Error(
      `produce: the only column whose values name admin-1 regions is "${geo.column}", which is ` +
        `also this map's value column — a map cannot shade a region by its own name. Add a ` +
        `column naming the regions, or use a country-level map.`,
    );

  config.featureIdsByValue = geo.featureIdsByValue;
  if (geo.column !== declared) {
    // Re-point the join at the column that actually resolved, as the loop's assembler does
    // (`regionKey: geo.column`). The storyboard travels with it: `arcBeats` were validated at
    // the gate against the OLD key's values (validate-config.ts:368-371), and
    // `resolveGeometryForProduce` is about to rewrite those cells to canonical literals — a beat
    // left anchored on "CH-GE" would then miss at render, after the journalist confirmed it.
    remapArcBeats(config, typedRows, declared, geo.column);
    config.regionKey = geo.column;
  }
  // The match's own GeographyRef carries the scope (a single country when the values agree on
  // one), which the basemap name alone cannot express. Only filled when absent: a config that
  // declared its geography keeps it.
  if (!config.geography) config.geography = geo.geography;
}
