// Whether a baked plate can be reused, decided by comparing every input the bake takes against what
// its own `geometry.json` recorded — not by whether the files merely exist.
//
// THE PLAN IS A FILE, and it is the whole of what the bake now draws: the study shapes, every class
// fill, every border ink, every placed word and the ring. Comparing a digest of that file's own
// bytes — taken at bake time and carried in `geometry.json` for exactly this comparison — is what
// notices a plate whose marks have moved. It replaces the shapes digest this used to compare, and
// subsumes it: the shapes travel inside the plan.
//
// BOUNDS AND STYLE ARE BAKE-SIDE DEFAULTS in this beat — this caller never passes `--bounds` or
// `--style` — so the honest comparison is not against a second copy of them kept here, but against
// `bake.mjs`'s own `BEAT` constant: what the bake would use if asked again today. A change to that
// constant is a change to what every existing plate recorded, and this is what notices.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BEAT, digestOf } from "./bake.mjs";

/** `dir` holds a baked plate (`geometry.json` + `plate.png`). `inputs` is what a render is about to
 *  ask the bake for: the drawn `width`/`height`, the direction's `water`/`land` tints, and the
 *  `planPath` this bake will mount. `bounds` and `style` are not asked for here — they are read off
 *  `BEAT`, the bake's own current defaults.
 *
 *  NOT COMPARED, and why: nothing. Every flag `bake.mjs` accepts is either compared here or read
 *  off `BEAT` above, which is what makes this a cache that cannot go stale. If the bake grows an
 *  input, recording it in `geometry.json` is that change's job and comparing it is this one's. */
export async function plateIsCurrent(dir, { width, height, water, land, planPath }) {
  if (!existsSync(join(dir, "geometry.json")) || !existsSync(join(dir, "plate.png"))) return false;
  const was = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
  const planDigest = await digestOf(planPath);
  return (
    was.frame?.width === width &&
    was.frame?.height === height &&
    was.water === water &&
    was.land === land &&
    JSON.stringify(was.bounds) === JSON.stringify(BEAT.bounds) &&
    was.style === BEAT.style &&
    was.planDigest === planDigest
  );
}
