// WHERE THIS FORMAT'S BEATS ACTUALLY LIVE — derived, never typed as `proof/`.
//
// THE DEFECT THAT EARNED THIS. Four of this format's capability walks (`test/accessible-table`,
// `test/keyboard-reach`, `test/reduced-motion`, `test/degrades-without-javascript`) each discovered
// their population by walking one directory: `proof/`, the skill's own committed beats. A
// journalist's beat lives in `stories/<story>/beats/<beat>/`, which is outside that walk — so on
// every beat a journalist has ever made, or will ever make, those four capabilities went unmeasured.
// The population a format checks is not "the beats the skill wrote for itself"; it is every beat
// that was produced with it.
//
// A BEAT IS DISCOVERED BY WHAT ITS RUNNER CALLS, which is the one fact that cannot drift silently:
// `beatsCalling` (`detect-rtl-isolation.mjs`) already walks BOTH roots and finds every directory
// whose own committed `.mjs` names this skill's `scripts/`. Reusing it means a fifth walk cannot
// disagree with the four about what a chart-web beat is, and a sixth root — the day one exists —
// reaches every one of them at once.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beatsCalling } from "./detect-rtl-isolation.mjs";

/** Every delivered `chart-web` page on disk, sorted, from every root a beat can live in.
 *
 *  A scrolly page is excluded by the same fingerprint the four walks already used
 *  (`data-step`/`step-panel`): a scrolly ASSEMBLES media behind one narrative and is its own
 *  format's artefact, produced by a runner that may sit in a directory calling this skill for one
 *  of its tracks. And a page carrying MapLibre's own bundle is `map-web`'s: both formats ship
 *  self-contained HTML with `data-detail` marks, and a directory can hold both. */
export function deliveredPages(root) {
  const found = [];
  const walk = (dir) => {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) {
        const source = readFileSync(path, "utf8");
        if (/data-step|step-panel/.test(source)) continue;
        if (/maplibregl|maplibre-gl/.test(source)) continue;
        found.push(path);
      }
    }
  };
  for (const beat of beatsCalling(root, "chart-web")) walk(join(root, beat));
  return [...new Set(found)].sort();
}
