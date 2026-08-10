#!/usr/bin/env bun
// CAN THE HOST SHOW YOU AN IMAGE? — the one question this toolchain's method depends on and never
// asked.
//
// Seven skills end their render ladder in "open the PNG and look at it" (`chart-beat`, `map-beat`,
// `image-beat`, `dw-beat`, `chart-web`, `map-web`, `scrolly`, and the doctrine that governs them).
// That rung has an instrument on some hosts and none on others. Measured 2026-08-10
// (`survey/codex-and-gemini-2026-08-10.md` §3.3): a headless `codex exec` prompt carries **no
// image-viewing tool at all** — zero occurrences — and the model, told to look, ran `inspectSvg`
// and `file` instead. `inspectSvg` models contrast and alt text; it models neither overlap nor
// clipping. Across three correction cycles the model fixed exactly what the journalist described in
// words and shipped a NEW unseen collision each time — clipped title, then crushed y ticks, then a
// clipped limits line — reporting success at each. A journalist who could not see the PNG either
// would have shipped the third.
//
// WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT.
//
// It is not a fallback for looking. There is no such thing, and the measurement above is the proof:
// inspecting the source gives false confidence, which is worse than an honest refusal. Nothing here
// tries to describe an image, score a layout, or stand in for a pair of eyes.
//
// It is a PROOF, run once per session, that the rung is executable at all — and it is a proof
// rather than a detection because detection is impossible from here: a script runs in the shell,
// and the tool set belongs to the model's prompt, which the shell cannot read. So the probe hands
// the model an image that carries a word nothing else can tell it, and asks for the word back.
//
//   - answer it correctly → the host can show you an image, and the ladder's last rung is real.
//   - answer `--cannot-see` → recorded, honestly, and the skills say what to do with that: tell
//     the journalist the render could not be looked at, leave it unapproved, and never report it as
//     checked.
//   - answer it wrongly → `blind`, the same as not being able to see. A guess is not a look.
//
// THE TOKEN IS NEVER WRITTEN DOWN. Only its SHA-256 goes to disk, and the PNG is the only artifact
// that carries the word — no SVG is kept, and the CLI never prints it. A probe whose answer sits in
// a readable file beside it would certify every host on earth.
//
// The verdict is deliberately scoped to the machine and moment that produced it: it lands in a temp
// directory, carries the time it was taken, and `--status` says out loud that it proves nothing
// about any other host or session. A "vision proven" flag that outlived the host it was measured on
// would be the same class of false green this project keeps finding.

import { createHash, randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

/** Where a verdict lives: outside any Splash root, because it describes the HOST, not the story. */
export const DEFAULT_DIR = join(tmpdir(), "splash-vision-probe");

// No `I`, `O`, `S`, `Z`, `0`, `1`, `5`, `8`: the pairs a reader confuses are exactly the pairs that
// would turn a host that CAN see into a `blind` verdict. Five characters from these 27 is one
// chance in 14 348 907 of being guessed, which is the other half of the same requirement.
const ALPHABET = "ABCDEFGHJKLMNPQRTUVWXY23467";
const TOKEN_LENGTH = 5;

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const statePath = (dir) => join(dir, "probe.json");
const pngPathFor = (dir) => join(dir, "probe.png");

function newToken() {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i += 1) token += ALPHABET[randomInt(ALPHABET.length)];
  return token;
}

/**
 * The image itself: one word, very large, black on white, nothing else in the frame. Deliberately
 * the easiest thing a working image tool could be asked to read — this probe is about whether the
 * instrument EXISTS, never about how good it is, so a hard image would only produce false blinds.
 */
function renderTokenPng(token) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">` +
    `<rect width="640" height="320" fill="#FFFFFF"/>` +
    `<text x="320" y="150" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
    `font-size="112" font-weight="700" fill="#000000" letter-spacing="8">${token}</text>` +
    `<text x="320" y="230" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
    `font-size="26" fill="#444444">read the word above, and answer with it</text>` +
    `</svg>`;
  return new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
}

/**
 * Issue a probe: write the PNG, record only the hash of its word, and return the path to open.
 * Any previous verdict in this directory is discarded — a verdict belongs to the probe that earned
 * it, and a stale one carried forward is the false green this whole file exists to refuse.
 */
export function issueProbe({ dir = DEFAULT_DIR } = {}) {
  mkdirSync(dir, { recursive: true });
  const token = newToken();
  writeFileSync(pngPathFor(dir), renderTokenPng(token));
  writeFileSync(
    statePath(dir),
    `${JSON.stringify({ tokenHash: sha256(token), issuedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  return { token, pngPath: pngPathFor(dir), statePath: statePath(dir) };
}

function readState(dir) {
  try {
    return JSON.parse(readFileSync(statePath(dir), "utf8"));
  } catch {
    return null;
  }
}

function writeVerdict(dir, state, verdict, detail) {
  const next = { ...state, verdict, detail, answeredAt: new Date().toISOString() };
  writeFileSync(statePath(dir), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

/**
 * Answer the outstanding probe. `seen` only when the word matches the issued one — case and
 * surrounding whitespace forgiven, nothing else. A wrong answer is `blind`, not an error: a model
 * that guesses has told us precisely what we asked, which is that it cannot look.
 */
export function answerProbe({ dir = DEFAULT_DIR, answer } = {}) {
  const state = readState(dir);
  if (!state?.tokenHash) {
    throw new Error(
      `no probe is outstanding in ${dir} — run this script with no arguments first, then answer the image it writes`,
    );
  }
  const given = String(answer ?? "").trim().toUpperCase();
  if (given === "") {
    throw new Error("--answer needs the word you read in the image, or use --cannot-see");
  }
  const correct = sha256(given) === state.tokenHash;
  return writeVerdict(
    dir,
    state,
    correct ? "seen" : "blind",
    correct
      ? "the word in the image came back correctly — this host can show you an image"
      : `the answer did not match the image. This host cannot show you the render: treat every "look at it" rung as unavailable`,
  );
}

/** The honest answer when the host has no image tool at all. It is a first-class outcome. */
export function recordCannotSee({ dir = DEFAULT_DIR, note = "" } = {}) {
  const state = readState(dir) ?? {};
  return writeVerdict(
    dir,
    state,
    "blind",
    `this host reported no way to display an image${note ? ` — ${note}` : ""}`,
  );
}

/** The verdict on file, or `null`. Never inferred, never defaulted to `seen`. */
export function readVerdict({ dir = DEFAULT_DIR } = {}) {
  const state = readState(dir);
  return state?.verdict ? state : null;
}

/** Throw away everything this probe wrote. Used by the suite; harmless anywhere. */
export function clearProbe({ dir = DEFAULT_DIR } = {}) {
  rmSync(dir, { recursive: true, force: true });
}

const ISSUE_INSTRUCTIONS = (pngPath) => `A probe image has been written:

  ${pngPath}

OPEN IT, with whatever tool your host gives you for displaying an image, and read the word in it.
Then answer:

  bun skills/splash/scripts/vision-probe.mjs --answer <the word you read>

If you have NO tool that can display an image to you — do not guess, and do not run \`file\`, or
\`strings\`, or an SVG inspector on it. Say so, here and to the journalist:

  bun skills/splash/scripts/vision-probe.mjs --cannot-see

That answer is not a failure of the install. It means the last rung of every render ladder in this
toolchain — "open it and look" — cannot be executed on this host, and that a render must therefore
never be reported as checked.`;

const VERDICT_LINE = (state) =>
  `${state.verdict.toUpperCase()} — ${state.detail}\n(answered ${state.answeredAt}; this says nothing about any other host, model or session)`;

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const at = (name) => argv.indexOf(name);
  const dirFlag = at("--dir");
  const dir = dirFlag >= 0 ? argv[dirFlag + 1] : DEFAULT_DIR;

  if (at("--status") >= 0) {
    const state = readVerdict({ dir });
    console.log(state ? VERDICT_LINE(state) : `no verdict on file in ${dir} — nobody has asked this host whether it can see`);
    process.exit(0);
  }

  if (at("--cannot-see") >= 0) {
    console.log(VERDICT_LINE(recordCannotSee({ dir })));
    process.exit(0);
  }

  const answerFlag = at("--answer");
  if (answerFlag >= 0) {
    console.log(VERDICT_LINE(answerProbe({ dir, answer: argv[answerFlag + 1] })));
    process.exit(0);
  }

  const { pngPath } = issueProbe({ dir });
  console.log(ISSUE_INSTRUCTIONS(pngPath));
}
