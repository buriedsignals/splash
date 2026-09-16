// twin/skills/chart-video/scripts/precision.mjs
//
// WHAT A VIDEO BEAT DECLARES IT ASSERTS, PER SHOT — AND NOTHING DERIVED.
//
// Spec §1.4, the two halves: what MUST be asserted is the chain's (`requiredAssertions`); which
// numbers assert it, at what rounding, in what unit, ON WHICH SHOT, is the journalist's. This module
// reads the second half out of the beat's own event table and never writes it.
//
// VIDEO'S PLACEMENT IS PER SHOT (§1.1): "which numbers are asserted per shot, and which may only be
// asserted on the hold". So the declared shape carries `perShot` and `onlyOnHold`, which scrolly's
// `perCard`, web's `staticFloor`/`onDemand` and static's `labels` do not — the four shapes are
// pairwise distinct on purpose.
//
// WHY `values` IS NOT READ FROM THE FROZEN DATA HERE. A parser that took the values from `data.csv`
// and a checker that compared them to `data.csv` would compare the data to itself and pass on a
// beat whose BRIEF states a number that drifted years ago. The parser reads what the BRIEF DECLARES;
// `checkPrecision` is the one that opens the frozen data.

import { assertionId } from "#shared/editorial/frame.mjs";

/**
 * What this beat declares it asserts, shot by shot.
 *
 * @param {string} briefText the beat's own `BRIEF.md`, unmodified
 * @param {{ declared?: { kind: "time", shots: Array<{ shot: string, asserts: string[] }> },
 *           rounding?: { unit: string, digits: number },
 *           values?: Record<string, { value: number|string, unit: string|null, digits: number|null }> }} ctx
 *   `declared` is `parseChoreography`'s output — column five of the beat's own table IS its
 *   precision, per shot, already written, so it is read from there rather than parsed twice.
 */
export function parsePrecision(briefText, ctx = {}) {
  const shots = ctx.declared?.shots;
  if (!Array.isArray(shots))
    throw new Error(
      "parsePrecision needs this beat's parsed choreography: a video's precision IS column five " +
        "of its event table, per shot, and is read from there rather than parsed a second time.",
    );
  const perShot = {};
  for (const shot of shots) perShot[shot.shot] = [...(shot.asserts ?? [])];
  const everywhereElse = new Set(
    shots.filter((s) => s.shot !== "hold").flatMap((s) => s.asserts ?? []),
  );
  return {
    kind: "time",
    rounding: ctx.rounding ?? null,
    asserts: [...new Set(shots.flatMap((s) => s.asserts ?? []))],
    values: { ...(ctx.values ?? {}) },
    perShot,
    // The readings a viewer only ever gets on the held frame — the ones the moving picture never
    // stops long enough to be read off. Named so `checkPrecision` can be asked about them.
    onlyOnHold: (perShot.hold ?? []).filter((id) => !everywhereElse.has(id)),
  };
}

/** A declared value, rounded the way the beat says it rounds, as a string so 0.57 and "0,57" meet. */
function atRounding(value, digits) {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value).trim();
  return digits === null || digits === undefined ? String(n) : n.toFixed(digits);
}

/**
 * TWO MECHANICAL CHECKS AND NO THIRD (spec §2.5).
 *
 *   1. every id `requiredAssertions` returned is covered by the beat's own `asserts`;
 *   2. every value the beat declares still equals the frozen data at the declared rounding.
 *
 * @param {object} declared `parsePrecision`'s output
 * @param {{ required: Array<{id: string, because: string}>, data: Record<string, number|string> }} against
 */
export function checkPrecision(declared, { required = [], data = {} } = {}) {
  const out = [];
  const covered = new Set((declared.asserts ?? []).map((id) => assertionId(id)));
  for (const requirement of required) {
    const id = assertionId(requirement.id);
    if (!covered.has(id))
      out.push({
        id,
        severity: "violation",
        says: `the chain requires \`${id}\` (${requirement.because}); no shot asserts it`,
      });
  }

  const digits = declared.rounding?.digits ?? null;
  for (const [id, declaredValue] of Object.entries(declared.values ?? {})) {
    if (!(id in data)) {
      out.push({
        id,
        severity: "violation",
        says: `\`${id}\` is declared but the frozen data holds no such datum`,
      });
      continue;
    }
    const want = atRounding(data[id], declaredValue.digits ?? digits);
    const got = atRounding(declaredValue.value, declaredValue.digits ?? digits);
    if (want !== got)
      out.push({
        id,
        severity: "violation",
        says: `\`${id}\` is declared ${got} and the frozen data says ${want} at the declared rounding`,
      });
  }
  return out;
}
