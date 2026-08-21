// FINDING 9 (stress round three): the orchestrator (skills/splash) refuses a phase jump and says
// so in its own SKILL.md; a craft skill's own render/produce entrypoint does not, so a beat can be
// rendered directly with no STORYBOARD.md above it at all — and, across three stress rounds, this
// is exactly the workflow every stress story already depends on: fifteen beats rendered this way
// on purpose, to test a render mechanism in isolation before an editorial gate exists to close.
//
// DECIDED: NOT a refusal. A craft skill that hard-refused an absent or open STORYBOARD.md would
// make the stress-testing methodology that FOUND this finding impossible to run unattended — the
// same shape `readPalette`'s own history already warns against (this project's own PALETTE.md
// mistake): a refusal is only sound when it carries a path an unattended run can actually take,
// and closing a real STORYBOARD.md (nine editorial fields, a journalist's own confirmed takeaway
// among them) has no deterministic default the way a palette's own measured proposal does. This is
// a REPORT instead — a capability, never a guard: `storyboardGateStatus` never throws, and a beat
// that renders past it renders exactly as it did before this existed.
//
// "Closed" here is a deliberately NARROW proxy, not Gate 2's own full definition (that stays
// `skills/splash/scripts/where.mjs`'s job, the one place that owns the phase machine and its nine
// required scalars): a STORYBOARD.md is found above the given directory, and its own front matter
// carries a non-blank `takeaway:` — the one field every other Gate 2 field exists to support, and
// the cheapest signal that a real editorial pass happened here at all.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

// The same missing-scalar sentinel `skills/splash/scripts/where.mjs` and
// `skills/storyboard/scripts/storyboard.mjs` already read `takeaway` against — mirrored, not
// imported (a skill never reaches across another skill's boundary at runtime), so a bare, quoted-
// empty or bare-null `takeaway:` all still count as "nothing confirmed here yet".
function isMissingScalar(value) {
  if (!value) return true;
  return value === '""' || value === "''" || value === "null" || value === "~";
}

/**
 * Walks upward from `startDir` looking for `STORYBOARD.md`, the same six-level climb
 * `readPinnedSize` already makes for `BRIEF.md`. Returns `{ found, closed, path, reason }` —
 * `found` is whether a STORYBOARD.md exists anywhere above this beat at all, `closed` is whether
 * its own front matter carries a non-blank `takeaway:`, and `reason` names, in one sentence,
 * whichever of the two is false (`null` when `closed` is true). Pure reporting: never throws, and
 * calling it changes nothing about what the beat goes on to render.
 *
 * @parity */
export function storyboardGateStatus(startDir) {
  const searched = [];
  let dir = resolve(startDir);
  for (let up = 0; up < 6; up++) {
    const path = join(dir, "STORYBOARD.md");
    searched.push(path);
    if (existsSync(path)) {
      const text = readFileSync(path, "utf8");
      const match = FRONT_MATTER.exec(text);
      const takeaway = match ? /^takeaway:[ \t]*([^\n]+)$/m.exec(match[1])?.[1] : null;
      const closed = !isMissingScalar(takeaway);
      return {
        found: true,
        closed,
        path,
        reason: closed
          ? null
          : `${path} exists but its own front matter carries no takeaway — gate 2 has not closed`,
      };
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {
    found: false,
    closed: false,
    path: null,
    reason: `no STORYBOARD.md found above ${resolve(startDir)}. Looked in:\n  ${searched.join("\n  ")}`,
  };
}
