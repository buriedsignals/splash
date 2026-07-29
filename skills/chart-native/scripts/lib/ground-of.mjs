// The REAL ground a rendered page sits on, derived from the produced config the way the
// components derive it (deriveFurniture). Shared by BOTH contrast snaps so the answer cannot
// diverge between the static and the interactive entry point — a second copy is how the two
// layers of guards came to disagree in the first place.
import { readFileSync } from "node:fs";
import { deriveFurniture } from "../../src/core/tokens.ts";

export function groundOf(configPath) {
  if (!configPath) return "#ffffff"; // manual run with no CONFIG: the light default IS white
  try {
    const cfg = JSON.parse(readFileSync(configPath, "utf8"));
    return deriveFurniture(
      typeof cfg.themeBg === "string" ? cfg.themeBg : undefined,
    ).bg;
  } catch {
    return "#ffffff";
  }
}
