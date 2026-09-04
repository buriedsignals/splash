// twin/skills/chart-beat/scripts/colour.mjs
//
// ONE COLOUR ARITHMETIC FOR THE WHOLE TOOLCHAIN. `palette` proposes an accent against a floor,
// `newsroom-charter` measures a newsroom's own pair, and every `render-still.mjs` measures again on
// read — and until 2026-09-04 each carried its own copy of this maths, held together by a
// hand-written parity test. Now it is one file, carried verbatim beside every copy of
// `render-still.mjs` and into `palette` and `newsroom-charter` (line 1 names this canonical;
// `splash/test/carried-copies.test.ts` holds every copy byte for byte).
//
// The floor is 3:1 for a MARK (WCAG 2.2 SC 1.4.11) and 4.5:1 for TEXT (SC 1.4.3); the caller names
// the role, never the number. `readPalette` walks up from a beat's own directory and finds the
// nearest `PALETTE.md`; `parsePalette` measures every accent on read, so a recorded colour that
// cannot be seen is refused where it would have been drawn.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

export const HEX = /^#[0-9a-fA-F]{6}$/;

export function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/**

 */
function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**

 */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function mix(ground, toward, ratio) {
  const target = channels(toward);
  return (
    "#" +
    channels(ground)
      .map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * The two colours a beat is drawn in — the ground and the one accent that carries the argument —
 * read back from the decision the journalist actually made.
 * This lives HERE, beside `deriveFurniture`, rather than in `palette` where it is proposed: a
 */
export function readPalette(dir, { stopAt } = {}) {
  const start = resolve(dir);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    searched.push(candidate);
    if (existsSync(candidate)) return parsePalette(readFileSync(candidate, "utf8"), candidate);
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `No PALETTE.md found for ${start}. Run palette's proposal, let the journalist choose, ` +
      `and record the answer. Looked in:\n  ${searched.join("\n  ")}`,
  );
}

export function parsePalette(text, source = "PALETTE.md") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${source} has no front matter`);
  const record = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  for (const field of ["ground", "accent"]) {
    if (!record[field]) throw new Error(`${source} is missing ${field}`);
    if (!HEX.test(record[field])) {
      throw new Error(`${source}: ${field} must be #rrggbb, got ${JSON.stringify(record[field])}`);
    }
  }
  if (!["newsroom", "subject", "journalist"].includes(record.origin)) {
    throw new Error(
      `${source}: origin must be newsroom, subject or journalist — got ${JSON.stringify(record.origin)}. ` +
        `It records WHO chose these colours, and a render is allowed to say so.`,
    );
  }
  const further = String(record.accents ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  for (const hex of further) {
    if (!HEX.test(hex)) {
      throw new Error(
        `${source}: every entry in accents must be #rrggbb, got ${JSON.stringify(hex)}. ` +
          `accents lists the FURTHER house colours beside the primary one, comma-separated.`,
      );
    }
  }
  const all = [record.accent, ...further];
  const accents = all.filter((hex, index) => all.indexOf(hex) === index);
  for (const hex of accents) {
    assertLegible(hex, record.ground, {
      role: "mark",
      where: `${source}: the accent ${hex}`,
    });
  }
  return {
    ground: record.ground,
    accent: record.accent,
    accents,
    origin: record.origin,
    source,
  };
}

/**
 * THE TWO FLOORS, AND WHY THEY ARE NOT ONE NUMBER.
 * WCAG sets two different minimums for two different things, and collapsing them is the mistake
 * that looks like rigour (`palette/references/contrast-floors.md` argues it at length):
 */
export const NON_TEXT_CONTRAST_MIN = 3;

export const TEXT_CONTRAST_MIN = 4.5;

export const LARGE_TEXT_CONTRAST_MIN = 3;

/**
 * The nearest variant of `colour` that clears `min` against `ground`, found by walking it toward
 * whichever pole the ground is NOT — darkening on a light ground, lightening on a dark one — in 2%
 * steps and stopping at the first step that passes.
 */
export function adjustToContrast(colour, ground, min = NON_TEXT_CONTRAST_MIN) {
  if (!HEX.test(colour)) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const towards = luminance(ground) > 0.18 ? "#000000" : "#FFFFFF";
  for (let step = 1; step <= 50; step++) {
    const candidate = mix(colour, towards, step / 50);
    if (contrast(candidate, ground) >= min) return candidate;
  }
  return null;
}

/**
 * REFUSE A COLOUR A READER CANNOT SEE, AND SAY WHAT WAS MEASURED.
 * `palette`'s proposal measures every option it offers and never recommends one that fails.
 * That is the first line, and it is the only one that existed until now — measured on 2026-08-10,
 */
export function assertLegible(colour, against, { role = "mark", where = "this colour" } = {}) {
  const floors = {
    mark: {
      min: NON_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.11 Non-text Contrast",
      governs: "a graphical object a reader identifies the data by",
    },
    text: {
      min: TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum)",
      governs: "text",
    },
    largeText: {
      min: LARGE_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum), large-text relaxation",
      governs: "text at 24px, or 18.66px bold, or larger",
    },
  };
  const floor = floors[role];
  if (!floor) {
    throw new Error(
      `assertLegible: role must be mark, text or largeText — got ${JSON.stringify(role)}. ` +
        `The floors differ by criterion, so the caller has to say which one it is asking about.`,
    );
  }
  if (!HEX.test(colour)) throw new Error(`${where} must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(against)) {
    throw new Error(
      `${where} is read against ${JSON.stringify(against)}, which is not #rrggbb`,
    );
  }
  const ratio = contrast(colour, against);
  if (ratio >= floor.min) return ratio;
  const remedy = adjustToContrast(colour, against, floor.min);
  throw new Error(
    `${where}: ${colour} on ${against} measures ${ratio.toFixed(2)}:1 — under the ${floor.min}:1 ` +
      `floor ${floor.criterion} sets for ${floor.governs}. A reader cannot see it. ` +
      (remedy
        ? `The nearest variant that clears the floor is ${remedy}, at ${contrast(remedy, against).toFixed(2)}:1 — ` +
          `record that, or another colour, or a ground it can be read on.`
        : `No variant of it clears that floor on this ground: choose another colour, or another ground.`),
  );
}
