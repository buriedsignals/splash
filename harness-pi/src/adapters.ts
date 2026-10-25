// Which chart types this local harness can draw: one zone adapter per type-survey type, in
// harness-pi/craft/<slug of the type name>/ (see craft/*/CONTRACT.md).
import { existsSync } from "node:fs";
import { join } from "node:path";

const ADAPTERS = join(import.meta.dirname, "..", "craft");

/** "Bar and column" → the zone adapter directory for that chart type, if one exists. */
export function adapterFor(chosen: string): string | null {
  const dir = join(
    ADAPTERS,
    chosen
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  );
  return existsSync(join(dir, "render-beat.mjs")) ? dir : null;
}
