// Which chart types this local harness can draw, and with which kit. A type has a per-type zone kit in
// harness-pi/craft/<format>/<slug>/ (the worked example's staging) and, when its family has a gesture
// grammar, a gesture kit in harness-pi/craft/<format>/<slug>.gestures/ (staging composed from the story;
// craft/gestures/GRAMMAR.md). The gesture kit is offered first; the per-type kit is the fallback.
import { existsSync } from "node:fs";
import { join } from "node:path";

const CRAFT = join(import.meta.dirname, "..", "craft");

/** The types whose family has gesture kits (phase 1: Length, bar-and-column only). */
const GESTURE_FAMILY: Record<string, string> = { "bar-and-column": "length" };

export interface AdapterOptions {
  /** The craft folder (tests use a temporary one). */
  craft?: string;
  /**
   * Whether the static gesture kit is the static default. Off until the seven static bar runs re-pass through it
   * (plan KTD11); a run turns it on with SPLASH_GESTURES_STATIC=1.
   */
  staticGestures?: boolean;
}

export const slugOf = (chosen: string) =>
  chosen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const kitAt = (dir: string) =>
  existsSync(join(dir, "render-beat.mjs")) ? dir : null;

/** The per-type zone kit for that type in that format, if one exists. */
export function perTypeKit(
  chosen: string,
  format = "static",
  { craft = CRAFT }: AdapterOptions = {},
): string | null {
  return kitAt(join(craft, format, slugOf(chosen)));
}

/** The gesture kit for that type in that format, if its family is implemented and the kit exists. */
export function gestureKit(
  chosen: string,
  format = "static",
  { craft = CRAFT }: AdapterOptions = {},
): string | null {
  const slug = slugOf(chosen);
  return GESTURE_FAMILY[slug]
    ? kitAt(join(craft, format, `${slug}.gestures`))
    : null;
}

/** "Bar and column", "video" → the kit the craft step starts on: the gesture kit if offered, else the per-type kit. */
export function adapterFor(
  chosen: string,
  format = "static",
  {
    craft = CRAFT,
    staticGestures = process.env.SPLASH_GESTURES_STATIC === "1",
  }: AdapterOptions = {},
): string | null {
  const gestures = gestureKit(chosen, format, { craft });
  if (gestures && (format !== "static" || staticGestures)) return gestures;
  return perTypeKit(chosen, format, { craft });
}
