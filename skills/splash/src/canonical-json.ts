// Deterministic stringify for provenance hashing: JSON.stringify's own key order is
// insertion order, so two specs that carry the same content built via a different code
// path (e.g. object literal vs spread-merge) can stringify differently and hash
// differently even though they mean the same spec. Recursively sorting object keys
// (arrays keep their order — position is meaningful there) before stringifying makes the
// hash a function of CONTENT, not of how the spec object happened to be assembled.
//
// The single source of truth for the sha256(canonicalJson(spec)) provenance hash: produce-all.ts
// stamps ProposalResult.acceptedConfigHash with it, and the export-stage chain-verification
// (render-provenance.ts assertChainProvenance) re-hashes accepted.json on disk with the SAME
// function to compare — both MUST resolve here, or a legitimate run would mismatch.
export function canonicalJson(x: unknown): string {
  return JSON.stringify(sortKeysDeep(x));
}

function sortKeysDeep(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(sortKeysDeep);
  if (x !== null && typeof x === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(x as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((x as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return x;
}
