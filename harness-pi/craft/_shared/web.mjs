// The half every WEB zone kit shares: where the chart-web skill is, the story's language and the
// run's direction, plain spaces for every word, and the render → verify → look sequence. A kit's
// render-beat.mjs builds its props and hands one `render(direction)` to `renderBeatWeb`; this file
// renders the page into renders/, drives the skill's own verify-web.mjs over it, keeps a desktop
// screenshot beside it and prints `look at:`. A refusal — the kit's, the renderer's or the
// verification's — leaves renders/ empty and exits 1, with the reason as the last lines printed.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";

/** The viewport whose verify-web screenshot is the one to look at (`fit-<w>x<h>.png`). */
export const DESKTOP_SHOT = "fit-1920x950.png";

/** The chart-web skill's own scripts and assets, wherever the root put the skill. */
export const chartWeb = (here, ...parts) => skillScriptFrom(here, "chart-web", ...parts);

/** U+202F / U+00A0 (what toLocaleString("fr-FR") emits) refuse every face; every word goes through this. */
export const plain = (text) => plainSpaces(String(text));

/** STORYBOARD.md's `language:` (the page's <html lang>), or null when the storyboard is absent. */
export function storyLanguage(here) {
  const storyboard = join(here, "..", "..", "STORYBOARD.md");
  if (!existsSync(storyboard)) return null;
  const front = readFileSync(storyboard, "utf8").split("---")[1] ?? "";
  return front.match(/^language:\s*"?([A-Za-z-]+)"?\s*$/m)?.[1] ?? null;
}

const labelOf = (id) => String(id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The ONE direction this beat renders in, exactly as the static kits choose it: the run's
 * DIRECTION.md when it is reachable, else the first direction composed from the story's PALETTE.md
 * and the filed directions. Families are fitted to the beat's own words.
 */
export function pickDirection(here, textPerRegister, evidenceLevels = 2) {
  let chosen;
  if (directionReachable(here)) chosen = readRunDirection(here);
  else {
    const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels }, textPerRegister });
    if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
    chosen = composition.offered[0];
  }
  return { label: labelOf(chosen.id), direction: resolveDirectionFamilies(chosen, textPerRegister) };
}

/** Every register's text with plain spaces — the face ladder refuses a page whose words it cannot set. */
export function plainRegisters(textPerRegister) {
  return Object.fromEntries(Object.entries(textPerRegister).map(([k, v]) => [k, plain(v)]));
}

function refuse(here, message) {
  rmSync(join(here, "renders"), { recursive: true, force: true });
  console.log(`REFUSED — ${message}`);
  process.exit(1);
}

/**
 * Runs a kit's whole body — importing beat.mjs, the guards, the render — with renders/ emptied
 * first, so a refusal anywhere (beat.mjs throwing on import included) never leaves a previous
 * page behind. Import beat.mjs INSIDE `body` (`await import("./beat.mjs")`): a static import
 * would run before renders/ is cleared and outside the refusal.
 */
export async function refusing(here, body) {
  rmSync(join(here, "renders"), { recursive: true, force: true });
  rmSync(join(here, "shots"), { recursive: true, force: true });
  try {
    await body();
  } catch (error) {
    refuse(here, error.message);
  }
}

/**
 * Renders the page, verifies it in Chrome, and leaves something to LOOK at.
 *
 * @param here     the beat folder
 * @param render   async ({ label, direction, outDir }) => { outPath } — the kit's renderWeb call
 * @param textPerRegister / evidenceLevels  what pickDirection needs
 */
export async function renderBeatWeb({ here, render, textPerRegister, evidenceLevels = 2 }) {
  const out = join(here, "renders");
  const shots = join(here, "shots");
  rmSync(out, { recursive: true, force: true });
  rmSync(shots, { recursive: true, force: true });

  let outPath;
  let label;
  try {
    const picked = pickDirection(here, plainRegisters(textPerRegister), evidenceLevels);
    label = picked.label;
    ({ outPath } = await render({ label, direction: picked.direction, outDir: out }));
  } catch (error) {
    refuse(here, error.message);
  }
  console.log(`rendered renders/${label}.html`);

  // The skill's own evidence: fit at seven viewports, real pointer hover over every mark, every
  // control clicked with scripting on and off, keyboard reach, annotation clearance.
  mkdirSync(shots, { recursive: true });
  const verify = Bun.spawnSync(["bun", chartWeb(here, "scripts", "verify-web.mjs"), "--file", outPath, "--shots", "--out", shots], { stdout: "pipe", stderr: "pipe" });
  const log = `${verify.stdout.toString()}${verify.stderr.toString()}`;
  const lines = log.split("\n");
  const fails = lines.filter((l) => l.startsWith("  FAIL"));
  const at = lines.findIndex((l) => /^\d+ checks passed/.test(l));
  const summary = at >= 0 ? lines.slice(at).join("\n").trim() : lines.slice(-15).join("\n").trim();
  console.log(`\nverify-web (chart-web): ${summary}`);
  const desktop = join(shots, DESKTOP_SHOT);

  if (verify.exitCode !== 0) {
    // The summary above lists every failure. Keep the shots so the failure can be looked at;
    // renders/ is emptied — the page is not done.
    if (existsSync(desktop)) console.log(`the refused page, for diagnosis —\nlook at: ${desktop}`);
    refuse(here, `the page rendered but the chart-web verification failed (${fails.length || "see above"}): fix the words in beat.mjs that the failures name (a label too long, two marks answering the same), then render again`);
  }
  if (!existsSync(desktop)) refuse(here, `verify-web passed but wrote no ${DESKTOP_SHOT} into ${shots}`);
  const png = join(out, `${label}.png`);
  cpSync(desktop, png);
  console.log(`screenshots (hover, phone, no-JS): ${shots}`);
  console.log(`look at: ${png}`);
}
