// THE ALIAS TABLE AND THE ONE READ THAT CONSULTS IT — a DUPLICATE of `splash/scripts/keys.mjs`,
// not an import. A skill directory has to stay copy-pasteable on its own (the same rule
// `map-beat/scripts/bake-plate.mjs`, `storyboard/scripts/capability-gap.mjs` and
// `../assets/geo-choropleth.ts`'s own header state for their own copies), and
// `splash/test/guard-copies-parity.test.ts` is what holds this copy and splash's to one decision —
// the function, the table, and both alias lists, byte for byte.
//
// WHY THIS SKILL NEEDED ONE AT ALL, measured on this machine on 2026-08-23 rather than argued: the
// root `.env` holds `REMOTION_MAPTILER_KEY` and `VITE_MAPTILER_KEY` and neither `MAPTILER_KEY` nor
// `MAPTILER_DELIVERY_KEY`. `substituteKeys` read those two canonical names off the environment —
// a two-name fallback written by hand, not a declared alias list — so against a real, working,
// present key it substituted nothing, `mapKeyState` answered "unkeyed", and every map delivered
// from this checkout shipped the placeholder and a dead tile layer. That is the defect
// `credential-alias-reconciled` was earned by, in the phase that hands work to a newsroom.
//
// `deploy-embed.mjs` and `sealed-operation.mjs` read Cloudflare's token the same bare way. Those
// two names have no alias today; routing them through here is what makes the day one is added a
// one-line change in one file rather than a hunt.

// THE TWO LISTS THAT ARE NOT EMPTY ARE DECLARED UNDER THE NAME THE REST OF THE TREE ALREADY USES
// FOR THEM — `<CANONICAL>_ALIASES`, the exact shape `map-beat/scripts/bake-plate.mjs`,
// `dw-beat/scripts/produce.mjs` and some twenty `bake.mjs` files under `proof/` already spell. That
// is not tidying: `credentialReadsWithoutAlias` (the catalogue's `credential-alias-reconciled`)
// reads that string to decide whether a canonical read has a declared fallback, and the trait
// `reads-a-provider-credential` reads it to decide whether this skill reads a credential at all.
// Written only as a key of the table below, the alias mechanism would be invisible to both — so
// routing the last hand-written read through the resolver would have DELETED this skill's own trait
// and made the rule stop reaching it, which is a cell disappearing rather than a cell being carried.
//
// AND ONLY THE TWO THAT ARE NOT EMPTY. Declaring `CLOUDFLARE_API_TOKEN_ALIASES = []` beside them
// would read as the same thing and be the opposite of it: `credentialReadsWithoutAlias` excuses any
// canonical read whose `<NAME>_ALIASES` string appears ANYWHERE in the skill, so an empty list under
// that name buys a bare read three files away a pass it has not earned. Measured 2026-08-23 in
// `splash`, where all eight were briefly declared that way and the guard went green while the
// defect stood.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const DATAWRAPPER_TOKEN_ALIASES = ["DATAWRAPPER_API_TOKEN"];
const KEY_ALIASES = { MAPTILER_KEY: MAPTILER_KEY_ALIASES, DATAWRAPPER_TOKEN: DATAWRAPPER_TOKEN_ALIASES };

/** Reads `canonical` from `env`, falling back to each of its aliases above in order. Never the
 *  reverse — an alias is read only when the canonical name is entirely absent, so a root that sets
 *  both never has the alias silently win.
 *
 *  EVERY PROVIDER CREDENTIAL READ IN A SKILL THAT CARRIES THIS GOES THROUGH HERE, and that is the
 *  whole mechanism: a read written by hand against one literal name honours that name and silently
 *  ignores the table, which is precisely the defect `credential-alias-reconciled` was earned by and
 *  the shape found three times in one week — `verify-live-map.mjs`, then the gate that decided
 *  whether that probe ran at all, then a provider case sitting between two that already resolved
 *  through it. Measured on this machine on
 *  2026-08-23: the root `.env` holds `REMOTION_MAPTILER_KEY` and `VITE_MAPTILER_KEY` and neither
 *  `MAPTILER_KEY` nor `MAPTILER_DELIVERY_KEY`, so a hand-written two-name fallback over those two
 *  canonical names read back as "no key at all" against a working, present key.
 *
 *  It returns `""` and never `undefined`, so a caller can test it as a string without deciding
 *  again what an absent credential looks like.
 *
 *  `KEY_ALIASES`, `MAPTILER_KEY_ALIASES` and `DATAWRAPPER_TOKEN_ALIASES` are named here and not
 *  only above on purpose: `guard-copies-parity.test.ts`'s `constantsBehind` follows every
 *  SHOUTING_CASE name inside this span to its own one-line declaration and compares that too, so a
 *  copy of this function whose alias table lost `REMOTION_MAPTILER_KEY` reads as the drift it is
 *  rather than as the same decision. A threshold is part of a decision; so is a lexicon. */
export function resolveEnvKey(env, canonical) {
  if (env[canonical]) return env[canonical];
  for (const alias of KEY_ALIASES[canonical] ?? []) {
    if (env[alias]) return env[alias];
  }
  return "";
}
