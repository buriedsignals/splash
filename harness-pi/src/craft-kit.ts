// The craft step's kit choice and its sticky fallback (plan KTD10). A beat starts on the gesture kit when one is
// offered; when its craft attempts fail, the fallback is recorded in the beat's .harness/fallback.json, the
// gesture-shaped beat.mjs is removed, and the beat continues on the per-type kit — on this pass and every later
// one. Measurement runs turn the fallback off (SPLASH_GESTURE_FALLBACK=0) so they judge the gesture kit alone.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  type AdapterOptions,
  adapterFor,
  familyOf,
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
  rmSync(join(beatDir, "gestures.json"), { force: true });
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
  if (meta.claimRatio)
    lines.push(`the measure is ${String(meta.claimRatio).replace(" / ", " divided by ")} for every row, not either column alone`);
  if (meta.subject)
    lines.push(`the subject, in the journalist's words: ${meta.subject}`);
  if (meta.comparison)
    lines.push(`the comparison, in the journalist's words: ${meta.comparison}`);
  return lines.length
    ? `Every gesture must serve the takeaway — ${lines.join("; ")}. `
    : "";
}

/** The gestures a gesture kit offers in a format: the family's admissible ones, narrowed to the type's own. */
export async function kitGestures(kit: string, format: string): Promise<{ do: string; meaning: string }[]> {
  const { admissible } = await import("../craft/_shared/gesture-registry.mjs");
  // The kit folder is <format>/<slug>.gestures: its slug names the family whose gestures the contract lists.
  const family = familyOf(basename(kit).replace(/\.gestures$/, "")) ?? "length";
  // A family registers itself (and may narrow the list per type) in its own module: load it when it exists.
  const module = join(import.meta.dirname, "..", "craft", "_shared", `gesture-family-${family}.mjs`);
  const own = existsSync(module) ? await import(module) : {};
  // A family may register some of its types from a sibling module (gesture-<family>-<part>-family.mjs): load them too.
  const shared = join(import.meta.dirname, "..", "craft", "_shared");
  for (const f of readdirSync(shared).filter((f) => f.startsWith(`gesture-${family}-`) && f.endsWith("-family.mjs")))
    await import(join(shared, f));
  const slug = basename(kit).replace(/\.gestures$/, "");
  const subset: string[] | undefined = own.gesturesOf?.(slug);
  return admissible(family, format).filter((a: { do: string }) => !subset || subset.includes(a.do));
}

/** A kit's CONTRACT.md as the craft session reads it: a gesture kit's {{GESTURES}} filled from the registry. */
export async function contractText(kit: string, format: string, { typedStaging = format === "static", beat }: { typedStaging?: boolean; beat?: string } = {}): Promise<string> {
  let text = readFileSync(join(kit, "CONTRACT.md"), "utf8");
  // "`beat.example.mjs` (in the folder)" was read as the proof/ folder: sixteen turns of reads there and no beat.mjs
  // (Qwen3.5-9B, gx-proportional-symbol static, 2026-11-13). The folder is the beat's, and it is named.
  if (beat !== undefined)
    text = text
      .replace(/`beat\.example\.mjs`( \(in the folder\))?/g, `\`beats/${beat}/beat.example.mjs\``)
      .replace(/\((already )?in the folder\)/g, `($1in beats/${beat}/)`);
  // Without the typed tool the gestures stay in beat.mjs; only the check stays code's.
  if (!typedStaging)
    text = text.replace(/^> \*\*Staging and check\.\*\*.*$/m, "> **Check.** Do not write `check()`: the kit computes it from the recorded claim and data.json. Write `gestures` in beat.mjs as below.");
  if (!text.includes("{{GESTURES}}")) return text;
  const rows = (await kitGestures(kit, format)).map((a) => `| \`${a.do}\` | ${a.meaning} |`);
  return text.replace("{{GESTURES}}", rows.join("\n"));
}

/** The refusal for a beat whose beat.mjs was never written names the folder and the next step: Qwen3.5-9B looked for
 *  the worked example under proof/ and skills/ through two attempts (gx-proportional-symbol static, 2026-11-13). */
export function unwrittenBeat(beatDir: string, beat: string): string {
  const held = existsSync(beatDir) ? readdirSync(beatDir).sort() : [];
  const example = held.includes("beat.example.mjs") ? `read beats/${beat}/beat.example.mjs (the worked example), then ` : "";
  return `beat.mjs was never written. beats/${beat}/ holds: ${held.join(", ")}. Next: ${example}write beats/${beat}/beat.mjs with write_file.`;
}
