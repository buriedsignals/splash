// THE SUBJECT OF `static-proportional-symbol-europe-capacity`, LOADED AND ASSERTED — the static beat's claim on the
// hundred largest stations. The register is the dot density video's (the same frozen file, byte for byte).
//
// Runs in Bun only.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSubject as loadRegister } from "../video-dot-density-europe-stations/subject.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-proportional-symbol-europe-capacity");
export const TOP = 100;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const register = loadRegister({ dir });
  const { stations, total } = register;
  const mwAll = stations.reduce((a, s) => a + s.mw, 0);
  const ranked = [...stations].map((s, i) => ({ ...s, index: i })).sort((a, b) => b.mw - a.mw);
  const mwTop = ranked.slice(0, TOP).reduce((a, s) => a + s.mw, 0);
  const shareTop = (mwTop / mwAll) * 100;
  if (!(TOP / total < 0.02)) throw new Error(`the title calls ${TOP} of ${total} a hundredth of the sites; it is ${((TOP / total) * 100).toFixed(1)} %`);
  if (!(shareTop > 33)) throw new Error(`the title says the ${TOP} largest carry over a third; they carry ${shareTop.toFixed(1)} %`);
  /** The cumulative share after each of the hundred, in percent — what the count climbs through. */
  let running = 0;
  const cumulative = ranked.slice(0, TOP).map((s) => (running += s.mw) / mwAll * 100);
  return { ...register, mwAll, ranked, shareTop, cumulative, maxMw: ranked[0].mw };
}
