// twin/shared/design-base/run-direction.mjs
//
// ONE ART DIRECTION PER PRODUCTION RUN — `DIRECTION.md`, THE SIBLING OF `PALETTE.md`.
//
// Ruling R-A of `docs/splash/2026-09-17-editorial-chain-spec.md`: the art direction is a parameter
// of the RUN, composed once from `NEWSROOM.md` plus the subject and inherited by all four exports.
// No export redefines it and no beat carries one of its own. `proof/` is the named exception and
// keeps rendering the three filed directions, which is exactly what PROVES the direction is a
// parameter: a rule that holds on one palette may only be lucky.
//
// This file is thin over `compose.mjs`. `composeDirections` has composed candidates, guarded them
// and printed a report since it was written, and the result was thrown away every time — the
// report went to a journalist and nothing on disk remembered the answer. `composeRunDirection`
// picks the one the newsroom's own record points at, `writeRunDirection` records it, and
// `readRunDirection` reads it back the way `readPalette` (`shared/chart-beat/colour.mjs:58`) reads
// a palette: walk up from the beat's own directory, stop where told, and REFUSE — naming every
// path it looked at — rather than default. A direction nobody chose is not a safe default; it is
// the run's identity decided by whichever record happened to be first in a directory listing.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { composeDirections } from "./compose.mjs";
import { readDirectionFromMarkdown } from "./read-direction.mjs";

/**
 * @typedef {{ id: string, origin: string, ground: string, accent: string,
 *             registers: object, typefaces: object }} RunDirection
 */

/** The palette a composed candidate took whole from the newsroom's own record. */
const FROM_THE_NEWSROOM = "the newsroom";

/**
 * The one direction this run is produced in, beside everything that was offered and refused.
 *
 * The choice is not taste: where the newsroom recorded a house palette, `composeDirections`
 * collapses the colour axis onto it and the candidate carrying it is the house's own direction —
 * that is the one taken. Where no house palette exists, the best-first order `composeDirections`
 * already computes (a published pair outranks one we assembled; among equals, how far apart the
 * registers read) decides, and `offered` and `refused` travel back so the choice is inspectable
 * rather than announced.
 *
 * @param {{ newsroom?: object, filed: Array<object>, subject?: string|null,
 *           textPerRegister?: Record<string,string>, grounds?: Array<object>, beat?: object }} args
 * @returns {{ chosen: RunDirection, offered: Array<object>, refused: Array<object> }}
 */
export function composeRunDirection({
  newsroom = {},
  filed,
  subject = null,
  textPerRegister = {},
  grounds = [],
  beat = {},
}) {
  if (!Array.isArray(filed) || filed.length === 0)
    throw new Error("composeRunDirection needs the filed directions to compose from.");
  const { offered, refused } = composeDirections({ newsroom, filed, beat, textPerRegister, grounds });
  if (offered.length === 0)
    throw new Error(
      "no art direction holds up for this run: " +
        refused.map((entry) => `${entry.id} — ${(entry.problems ?? []).join("; ")}`).join(" / ") +
        ". A run is produced in one direction, and this composes none rather than drawing in one " +
        "its own guards refused.",
    );
  const house = offered.find((candidate) => candidate.palette?.from === FROM_THE_NEWSROOM);
  const candidate = house ?? offered[0];
  return { chosen: runDirectionOf(candidate, { newsroom, subject }), offered, refused };
}

/** A composed candidate, as the run's direction: the same record plus where it came from. */
function runDirectionOf(candidate, { newsroom, subject }) {
  const house = candidate.palette?.from === FROM_THE_NEWSROOM;
  return {
    ...candidate,
    id: candidate.id,
    name: candidate.id,
    origin:
      `${house ? "NEWSROOM.md" : `the ${candidate.palette?.from ?? "filed"} palette`}` +
      (subject ? ` + ${subject}` : "") +
      (newsroom?.origin ? ` (palette origin: ${newsroom.origin})` : ""),
  };
}

const CELL = (value) => (value === null || value === undefined ? "" : String(value));

/**
 * The record a person can read — the same Markdown shape as a filed direction, so
 * `readDirectionFromMarkdown` reads it and nothing needs a second parser.
 */
export function renderRunDirection(chosen) {
  const lines = [
    `# ${chosen.id}`,
    "",
    `- name: ${chosen.name ?? chosen.id}`,
    `- origin: ${chosen.origin}`,
    `- measuredFrom: ${chosen.provenance?.registers ?? chosen.measuredFrom ?? chosen.id}`,
    `- ground: ${chosen.ground}`,
    `- accent: ${chosen.accent}`,
    // A composed accent is DECIDED, not read off a reference, and `read-direction.mjs` holds those
    // two apart on purpose: absent, a colour is claimed as measured and checked against the record.
    `- groundSource: ${chosen.palette?.from === FROM_THE_NEWSROOM ? "chosen" : "measured"}`,
    `- accentSource: ${chosen.colour?.composed || chosen.palette?.from === FROM_THE_NEWSROOM ? "chosen" : "measured"}`,
    `- pad: ${chosen.pad}`,
    `- header: ${chosen.header}`,
    `- headRule: ${chosen.headRule ? "true" : "false"}`,
    `- leadingSource: chosen`,
  ];
  if (chosen.stroke)
    lines.push(
      `- stroke: ${Object.entries(chosen.stroke)
        .map(([key, value]) => `${key} ${value}`)
        .join(", ")}`,
    );
  lines.push(
    "",
    "This run's one art direction, composed from the newsroom's own record and this story's",
    "subject. Every export of this run reads it; none redefines it.",
    "",
    "## Registers",
    "",
    "| register | family | size | weight | italic | tracking | case | ink | leading |",
    "| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |",
  );
  for (const [name, spec] of Object.entries(chosen.registers ?? {}))
    lines.push(
      `| ${name} | ${CELL(spec.family)} | ${CELL(spec.size)} | ${CELL(spec.weight)} | ` +
        `${spec.italic ? "yes" : "no"} | ${CELL(spec.tracking)} | ${CELL(spec.transform)} | ` +
        `${CELL(spec.ink)} | ${CELL(spec.leading)} |`,
    );
  return lines.join("\n") + "\n";
}

/** Write this run's `DIRECTION.md` at the story root, beside `PALETTE.md`. */
export function writeRunDirection(storyDir, chosen) {
  const path = join(resolve(storyDir), "DIRECTION.md");
  writeFileSync(path, renderRunDirection(chosen));
  return path;
}

/**
 * The run's direction, read back from `DIRECTION.md`.
 *
 * Signature and behaviour mirror `readPalette`: walk up from `dir`, stop at `stopAt`, and throw
 * naming every path searched. It never falls back to a filed direction — see the header.
 */
export function readRunDirection(dir, { stopAt } = {}) {
  const start = resolve(dir);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "DIRECTION.md");
    searched.push(candidate);
    if (existsSync(candidate)) {
      const text = readFileSync(candidate, "utf8");
      const id = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? "(unnamed)";
      const record = readDirectionFromMarkdown(text, id);
      const origin = /^- origin:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? null;
      if (!origin)
        throw new Error(
          `${candidate} records no origin — a run's direction says where it was composed from ` +
            "(`NEWSROOM.md + <subject>`), because a direction nobody can trace is a direction " +
            "nobody agreed to.",
        );
      return { ...record, id, origin, source: candidate };
    }
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `No DIRECTION.md found for . A production run is produced in ONE art direction, ` +
      "composed from NEWSROOM.md and this story's subject and written at the story root beside " +
      "PALETTE.md. Compose it with `composeRunDirection` and record it with `writeRunDirection`. " +
      `Looked in:\n  ${searched.join("\n  ")}`,
  );
}
