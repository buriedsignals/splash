// The FIRST emitter of the `colour-semantics` criterion (declared lib/verify/types.ts,
// priced lib/verify/severity.ts) — an id nothing ever filed against until this, a dead enum
// member.
//
// Two shapes, both WARNINGS, never blockers — D25/D26's decisions, verbatim: a house colour
// is SHIPPED, never rewritten, but ANNOUNCED, with the closest accessible hue offered when one
// exists. Severity comes from severity.ts's central table (keyed off the criterion): this
// module never assigns its own, the same discipline every other finding in this codebase
// follows (lib/verify/review.ts's header comment, "nobody grades their own work").
//   - a brand concern minted at produce-time (CVD or contrast, skills/chart-native's
//     BrandConcern) — shipped, said, and (for CVD) the nearest accessible hue offered;
//   - a colour was ANNOUNCED to the journalist that the chosen type does not paint its marks
//     with (D26). `honoured` is threaded by task 13 — absent/true here is a silent no-op.
import { makeFinding } from "./severity";
import type { Finding } from "./types";
import type { BrandConcern } from "../core/brand-concern";

export function announcedColourFindings(input: {
  concerns: BrandConcern[];
  announced?: string;
  honoured?: boolean;
}): Finding[] {
  const out: Finding[] = [];
  for (const c of input.concerns)
    out.push(
      makeFinding({
        id: `colour-${c.kind}-${c.colour.replace("#", "").toLowerCase()}`,
        criterion: "colour-semantics",
        summary: c.reason,
        evidence: c.nearestAccessible
          ? [c.colour, `closest accessible hue: ${c.nearestAccessible}`]
          : [c.colour],
        provenance: "mechanical",
      }),
    );
  if (input.announced && input.honoured === false)
    out.push(
      makeFinding({
        id: `colour-announced-unpainted-${input.announced.replace("#", "").toLowerCase()}`,
        criterion: "colour-semantics",
        summary:
          `${input.announced} was announced as this element's colour, and this type encodes ` +
          `with a fixed role/categorical palette — the hue tints the frame, never the marks`,
        evidence: [input.announced],
        provenance: "mechanical",
      }),
    );
  return out;
}
