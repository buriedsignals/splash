// twin/skills/scrolly/scripts/precision.mjs
//
// WHAT A SCROLLY BEAT DECLARES IT ASSERTS, READ — AND NOTHING DERIVED.
//
// Spec §1.4, the two halves: what MUST be asserted is the chain's (`requiredAssertions`); which
// numbers assert it, at what rounding, in what unit, on which card, is the JOURNALIST'S, read off
// the subject's own data. This module reads the second half out of the beat's own `## Precision`
// and never writes it.
//
// SCROLLY'S PLACEMENT IS PER CARD: "what each card may assert given what is on screen at that card"
// (§1.1). So the declared shape carries `perCard`, which video's `perShot`, web's
// `staticFloor`/`onDemand` and static's `labels` do not — the four shapes are pairwise distinct on
// purpose, because a card, a shot, a JS-off floor and one composed frame do not assert alike.
//
// WHY `values` IS NOT READ FROM `data.csv` HERE. The plan's sketch had the parser take the values
// from the frozen data and the checker compare them to the frozen data — which compares the data to
// itself and passes on a beat whose BRIEF states a number that drifted years ago. So: the parser
// reads what the BRIEF DECLARES, and `checkPrecision` is the one that opens the frozen data. A beat
// that declares no value gets no value check, and that absence is visible as an empty `values`.

import { assertionId } from "#shared/editorial/frame.mjs";

const PRECISION_HEADING = /^##\s+Precision\b/i;

/** `**Every sentence is asserted**: …` → its bold lead; a bullet with no bold lead → its first clause. */
function ruleLead(bullet) {
  const bold = /^\*\*(.+?)\*\*/.exec(bullet);
  return bold ? bold[1] : bullet;
}

/** The bullets under `## Precision`, markers stripped, in the order the beat writes them. */
function precisionBullets(briefText) {
  const lines = String(briefText).split(/\r?\n/);
  let inside = false;
  const out = [];
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (inside) break;
      inside = PRECISION_HEADING.test(line);
      continue;
    }
    if (!inside) continue;
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) out.push(bullet[1].trim());
    else if (out.length && line.trim() !== "" && /^\s{2,}/.test(line))
      out[out.length - 1] += ` ${line.trim()}`;
  }
  return out;
}

/**
 * What this beat declares it asserts.
 *
 * @param {string} briefText the beat's own `BRIEF.md`, unmodified
 * @param {{ rounding?: { unit: string, digits: number },
 *           values?: Record<string, { value: number|string, unit: string|null, digits: number|null }>,
 *           perCard?: Record<string, string[]> }} ctx what the beat declares outside its prose
 */
export function parsePrecision(briefText, ctx = {}) {
  const bullets = precisionBullets(briefText);
  if (bullets.length === 0)
    throw new Error(
      "this beat declares no precision: `## Precision` carries no bullets. Nothing here writes " +
        "them — which numbers a card may put in front of the reader is the journalist's half.",
    );
  return {
    kind: "scroll",
    rounding: ctx.rounding ?? null,
    asserts: bullets.map((bullet) => assertionId(ruleLead(bullet))),
    values: { ...(ctx.values ?? {}) },
    perCard: { ...(ctx.perCard ?? {}) },
  };
}

/** A declared value, rounded the way the beat says it rounds, as a string so 0.57 and "0,57" meet. */
function atRounding(value, digits) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value).trim();
  return digits === null || digits === undefined ? String(n) : n.toFixed(digits);
}

/**
 * TWO MECHANICAL CHECKS AND NO THIRD (spec §2.5).
 *
 *   1. every id `requiredAssertions` returned is covered by the beat's own `asserts`;
 *   2. every value the beat declares still equals the frozen data at the declared rounding.
 *
 * It does not judge whether the beat asserts ENOUGH, or well: that is an editorial reading, and a
 * test that attempted it would be asserting a house style nobody wrote down.
 *
 * @param {object} declared   `parsePrecision`'s output
 * @param {{ required: Array<{id: string}>, data: Record<string, number|string> }} against
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
        says: `the chain requires \`${id}\` (${requirement.because}); \`## Precision\` covers it nowhere`,
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
