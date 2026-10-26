// The craft step's kit choice and its sticky fallback (plan KTD10). A beat starts on the gesture kit when one is
// offered; when its craft attempts fail, the fallback is recorded in the beat's .harness/fallback.json, the
// gesture-shaped beat.mjs is removed, and the beat continues on the per-type kit — on this pass and every later
// one. Measurement runs turn the fallback off (SPLASH_GESTURE_FALLBACK=0) so they judge the gesture kit alone.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  type AdapterOptions,
  adapterFor,
  gestureKit,
  perTypeKit,
} from "./adapters.ts";

export interface CraftKitOptions extends AdapterOptions {
  fallback?: boolean;
}

const marker = (beatDir: string) => join(beatDir, ".harness", "fallback.json");

/** The kit this beat crafts on now, and whether a failed gesture craft may fall back. */
export function craftKit(
  beatDir: string,
  chosen: string,
  format: string,
  {
    fallback = process.env.SPLASH_GESTURE_FALLBACK !== "0",
    ...options
  }: CraftKitOptions = {},
): { kit: string | null; gestures: boolean; fallbackAllowed: boolean } {
  if (existsSync(marker(beatDir)))
    return {
      kit: perTypeKit(chosen, format, options),
      gestures: false,
      fallbackAllowed: false,
    };
  const kit = adapterFor(chosen, format, options);
  const gestures = kit !== null && kit === gestureKit(chosen, format, options);
  return {
    kit,
    gestures,
    fallbackAllowed:
      gestures && fallback && perTypeKit(chosen, format, options) !== null,
  };
}

/** Records the fallback, removes the gesture-shaped beat.mjs, and returns the per-type kit to continue on. */
export function recordFallback(
  beatDir: string,
  chosen: string,
  format: string,
  {
    from,
    refusal,
    ...options
  }: AdapterOptions & { from: string; refusal: string },
): string | null {
  mkdirSync(join(beatDir, ".harness"), { recursive: true });
  const to = perTypeKit(chosen, format, options);
  writeFileSync(
    marker(beatDir),
    `${JSON.stringify({ from, to, refusal, at: new Date().toISOString() }, null, 2)}\n`,
  );
  rmSync(join(beatDir, "beat.mjs"), { force: true });
  return to;
}

/** The fallback recorded for this beat, if any. */
export function fallbackOf(
  beatDir: string,
): { from: string; to: string; refusal: string } | null {
  return existsSync(marker(beatDir))
    ? JSON.parse(readFileSync(marker(beatDir), "utf8"))
    : null;
}

/**
 * The claim's entities for a gesture kit's craft prompt (plan KTD8): the recorded claim entity and comparison when
 * the storyboard has them, else the journalist's subject and comparison answers — China and the Polish beds record
 * claimShape none, so the recorded fields alone would leave the gestures nothing to serve.
 */
export function claimBlock(meta: Record<string, unknown>): string {
  const lines: string[] = [];
  if (meta.claimEntity)
    lines.push(
      `the claim is about ${meta.claimEntity}${meta.claimVersus ? ` against ${meta.claimVersus}` : ""}`,
    );
  if (meta.subject)
    lines.push(`the subject, in the journalist's words: ${meta.subject}`);
  if (meta.comparison)
    lines.push(`the comparison, in the journalist's words: ${meta.comparison}`);
  return lines.length
    ? `Every gesture must serve the takeaway — ${lines.join("; ")}. `
    : "";
}

/** A kit's CONTRACT.md as the craft session reads it: a gesture kit's {{GESTURES}} filled from the registry. */
export async function contractText(kit: string, format: string): Promise<string> {
  const text = readFileSync(join(kit, "CONTRACT.md"), "utf8");
  if (!text.includes("{{GESTURES}}")) return text;
  const { admissible } = await import("../craft/_shared/gesture-registry.mjs");
  const rows = admissible("length", format).map((a: { do: string; meaning: string }) => `| \`${a.do}\` | ${a.meaning} |`);
  return text.replace("{{GESTURES}}", rows.join("\n"));
}
