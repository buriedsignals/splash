// twin/skills/chart-beat/scripts/precision.mjs
//
// WHAT ONE COMPOSED FRAME DECLARES IT ASSERTS — AND NOTHING DERIVED.
//
// Spec §1.1: a static's precision is "one frame's rounding, and which numbers that frame puts in
// front of the reader". There is no shot and no card to place an assertion on: everything the beat
// asserts is on screen at once, which is why the declared shape carries `labels` — the readings
// the frame prints — where scrolly carries `perCard`, video `perShot` and web
// `staticFloor`/`onDemand`. The four shapes are pairwise distinct on purpose.
//
// §1.3: static BRIEFs carry `## Claim` / `## The claim` (32 of 40) and no `## Precision` at all,
// so static owes the section as much as it owes a choreography. This module reads the section a
// beat writes; it writes none, and it defaults no rounding — a rounding nobody chose is a rounding
// nobody can be held to.
//
// `dw-beat` carries this pair and NO choreography: rendering is delegated to Datawrapper, so there
// is no composed frame of ours whose reading order we could claim to have set.

import { assertionId } from "#shared/editorial/frame.mjs";

const PRECISION_HEADING = /^##\s+Precision\b/i;

/** `**Every value is printed**: …` → its bold lead; a bullet with no bold lead → its first clause. */
function ruleLead(bullet) {
  const bold = /^\*\*(.+?)\*\*/.exec(bullet);
  return bold ? bold[1] : bullet;
}

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
 * What this frame declares it asserts.
 *
 * @param {string} briefText the beat's own `BRIEF.md`
 * @param {{ rounding?: { unit: string, digits: number },
 *           labels?: string[],
 *           values?: Record<string, { value: number|string, unit: string|null, digits: number|null }> }} ctx
 */
export function parsePrecision(briefText, ctx = {}) {
  const bullets = precisionBullets(briefText);
  if (bullets.length === 0)
    throw new Error(
      "this beat declares no precision: it carries no `## Precision` bullets. Nothing here writes " +
        "them — which numbers a frame puts in front of the reader is the journalist's half.",
    );
  return {
    kind: "frame",
    rounding: ctx.rounding ?? null,
    asserts: bullets.map((bullet) => assertionId(ruleLead(bullet))),
    values: { ...(ctx.values ?? {}) },
    // The readings this one frame prints. Everything a static asserts is asserted here, at once.
    labels: [...(ctx.labels ?? [])],
  };
}

/** A declared value, rounded the way the beat says it rounds, as a string so 0.57 and "0,57" meet. */
function atRounding(value, digits) {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return String(value).trim();
  return digits === null || digits === undefined ? String(n) : n.toFixed(digits);
}

/**
 * TWO MECHANICAL CHECKS AND NO THIRD (spec §2.5): every required id is covered by `asserts` or by
 * a printed label, and every declared value still equals the frozen data at the declared rounding.
 */
export function checkPrecision(declared, { required = [], data = {} } = {}) {
  const out = [];
  const covered = new Set(
    [...(declared.asserts ?? []), ...(declared.labels ?? [])].map((id) => assertionId(id)),
  );
  for (const requirement of required) {
    const id = assertionId(requirement.id);
    if (!covered.has(id))
      out.push({
        id,
        severity: "violation",
        says: `the chain requires \`${id}\` (${requirement.because}); this frame states it nowhere`,
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
