// Claim-arc validator (pure). The single source of ARC_ROLES/arcErrors across all
// engines — previously duplicated in chart-native/src/chart-story.ts; map-native
// shares this via lib/core rather than re-deriving the same narrative-structure rules.
export const ARC_ROLES = ["establish", "build", "turn", "payoff"] as const;
export type ArcRole = (typeof ARC_ROLES)[number];

// Validate the CLAIM-ARC structure of a beat plan (S2). Roles are OPTIONAL for
// backward compat; but the moment any beat claims a role, the whole plan must form a
// well-formed arc — establish opens, payoff closes, ≥1 build (rising action), ≤1 turn
// (a single Peak — Cohn's E/I/P/R, Amini CHI '15's dominant E+I+PR+), and every role
// beat asserts a non-empty claim (`text`). Pure, throw-free (mirrors narrativeBeatErrors).
export function arcErrors(
  beats: { role?: ArcRole; text?: string }[],
): string[] {
  const roled = beats.filter((b) => b.role !== undefined);
  if (roled.length === 0) return []; // legacy anchor-only beats — no arc claimed
  const errs: string[] = [];
  if (roled.length !== beats.length)
    errs.push(
      "claim-arc: every beat must carry a `role` (establish/build/turn/payoff) or NONE — no half-arc",
    );
  beats.forEach((b, i) => {
    if (b.role !== undefined && !ARC_ROLES.includes(b.role))
      errs.push(
        `beat ${i + 1}: role "${b.role}" is not one of ${ARC_ROLES.join("/")}`,
      );
    if (b.role !== undefined && (b.text === undefined || b.text.trim() === ""))
      errs.push(
        `beat ${i + 1} (${b.role}): a claim-arc beat must assert a claim (non-empty \`text\`)`,
      );
  });
  const roles = beats.map((b) => b.role);
  const count = (r: ArcRole) => roles.filter((x) => x === r).length;
  if (roles[0] !== "establish")
    errs.push("claim-arc must OPEN on an `establish` beat (set the scene)");
  if (roles[roles.length - 1] !== "payoff")
    errs.push("claim-arc must CLOSE on a `payoff` beat (land the argument)");
  if (count("build") < 1)
    errs.push(
      "claim-arc needs at least one `build` beat between establish and payoff (the rising action)",
    );
  if (count("establish") > 1)
    errs.push(
      "claim-arc: the scene is set once — more than one `establish` beat",
    );
  if (count("payoff") > 1)
    errs.push(
      "claim-arc: the argument lands once — more than one `payoff` beat",
    );
  if (count("turn") > 1)
    errs.push(
      "claim-arc: a single Peak carries the story — more than one `turn` beat (Cohn E/I/P/R)",
    );
  return errs;
}
