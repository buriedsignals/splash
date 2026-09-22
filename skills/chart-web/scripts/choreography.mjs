// twin/skills/chart-web/scripts/choreography.mjs
//
// WHAT A WEB BEAT DECLARES ITS READER CAN DO, READ — AND NOTHING GENERATED.
//
// Ruling R-D (`docs/splash/2026-09-17-editorial-chain-spec.md`): the choreography is AUTHORED, per
// subject. This module reads the `const interaction = { earns, controls: [{ question, gesture,
// changes }] }` the beat's own `render-directions-web.mjs` already declares (spec §1.3: 27 of the
// 40 web beats write it) and checks it against the export's shape and the type's frame. It writes
// no control, defaults none, and `checkChoreography` NEVER COMPARES `declared` TO ANOTHER
// DECLARATION.
//
// THE SHAPE (spec §2.5):
//   { kind: "pointer", promiseSource: "slot",
//     controls: [{ order, gesture, input: "hover"|"tap" }], keyboard, degradesTo: "static-frame" }
//
// WHAT IS NOT IN IT. `earns`, `question` and `changes` are SENTENCES and stay where they are — in
// the module and in the BRIEF. `promiseSource: "slot"` is how the block says "the promise is pinned
// elsewhere": `skills/splash/test/interaction-promises-are-kept.test.ts` pins the slot's own
// `interaction.promise` to the delivered artifact, and that pin is not duplicated here.
//
// WHY THE SOURCE IS READ AND NOT IMPORTED. The plan said "the parser imports the module and reads
// the export". It cannot: `interaction` is a module-local const, and importing
// `render-directions-web.mjs` RENDERS THE BEAT — it reads the filed directions and drives a browser
// at module scope. So the declaration is cut out of the source by its own boundaries (`const
// interaction = {` to the file-level `};`) and only the atom literals are read out of it. The
// sentences are never parsed, which is also why the interpolations inside them cannot break this.

import { GESTURES } from "../assets/interaction-plan.ts";

/** Which input a gesture is asked with — from the gesture's KIND, the way `shippedControls` groups them. */
const INPUT_OF_GESTURE = Object.freeze({
  "ask-a-mark": "hover",
  "ask-a-line": "hover",
  "find-your-own-case": "hover",
  "open-the-full-table": "tap",
  "sort-or-reorder": "tap",
  "filter-to-a-subset": "tap",
  "toggle-a-comparison": "tap",
  "brush-a-range": "tap",
  "zoom-and-pan": "tap",
});

/** The declaration's own boundaries in the beat's render module. */
const DECLARATION = /\nconst interaction = \{[\s\S]*?\n\};\n/;

/**
 * The beat's declared reader interaction.
 *
 * @param {string} briefText the beat's own `BRIEF.md`. First argument for uniformity with the other
 *   three exports; web's declaration lives in the render module, because that is where the corpus
 *   wrote it (§1.3), and the BRIEF's own `## Interaction` prose is the journalist's.
 * @param {{ source: string, html: string }} ctx the beat's `render-directions-web.mjs`, and one
 *   delivered page — `keyboard` and `degradesTo` are properties of what was SHIPPED, not claims.
 */
export function parseChoreography(briefText, ctx = {}) {
  const source = String(ctx.source ?? "");
  const found = DECLARATION.exec(source);
  if (!found)
    throw new Error(
      "this beat declares no interaction: its render module carries no `const interaction = { … }`. " +
        "Nothing here writes one — what a reader may ask of a picture is authored, per subject.",
    );
  const block = found[0];

  const controls = [...block.matchAll(/\bgesture:\s*"([^"]+)"/g)].map((m, i) => {
    const gesture = m[1];
    if (gesture === "reveal-on-scroll")
      throw new Error(
        "`reveal-on-scroll` is the one gesture the reader does not ask for; it belongs to the " +
          "entrance (`chart-web/assets/entrance.ts`), not to the interaction's control list.",
      );
    return { order: i + 1, gesture, input: INPUT_OF_GESTURE[gesture] ?? "tap" };
  });

  const html = String(ctx.html ?? "");
  if (html === "")
    throw new Error(
      "parseChoreography needs one delivered page: `keyboard` and `degradesTo` are read off what " +
        "the beat SHIPPED, never taken from the declaration's own word for it.",
    );

  return {
    kind: "pointer",
    promiseSource: "slot",
    controls,
    // Every reading reachable without a pointer: the marks carry `tabindex`, or the controls are
    // native form elements, which are focusable by construction.
    keyboard: /tabindex=/i.test(html) || /<(input|button|summary)\b/i.test(html),
    // The page a reader with no script never leaves. It is the static frame when the plate is in
    // the SERVED markup rather than built by a script that may not run.
    degradesTo: /<svg\b/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ""))
      ? "static-frame"
      : null,
  };
}

/** A sheet's `## Reader gestures` bullet leads with its atom in a code span: `` `ask-a-mark` — … ``. */
function sheetAtoms(vocabulary) {
  const out = new Set();
  for (const entry of vocabulary ?? [])
    for (const atom of String(entry).matchAll(/`([a-z][a-z0-9-]*)`/g))
      out.add(atom[1]);
  return out;
}

/**
 * Does this declaration honour the export's shape and the type's frame?
 *
 * TWO CLOSED THINGS AND ONE OPEN ONE, and the asymmetry is deliberate (spec §2.2 against §1.3):
 *   the REPERTOIRE is closed — `GESTURES` in `assets/interaction-plan.ts` is the code that builds
 *     the controls, so an atom outside it is a control nothing can ship: a VIOLATION, unlike
 *     scrolly and video, where an unlisted atom is a note;
 *   the SHAPE is closed — ordered `1..n`, a keyboard route, and a static frame to degrade to;
 *   the TYPE SHEET'S list is open — an atom in the repertoire that this type's `## Reader gestures`
 *     has not recorded yet is a note, and the sheet owes the entry.
 *
 * Ids beginning `no-` are prohibitions a type sheet states; ids that do not are rules of the
 * export's own shape, which no sheet states because every type of this export owes them. The web
 * sheets' own prohibitions are about what the PAGE draws — an argument behind a control, a control
 * whose applied state equals the default — and `assertInteractionPlan` /
 * `assertControlsChangeSomething` already refuse those against the real HTML at render time. They
 * are not re-checked here against a declaration, which would be a second and weaker reader.
 */
export function checkChoreography(declared, frame = {}) {
  const out = [];
  const controls = declared.controls ?? [];

  if (controls.length === 0)
    out.push({
      id: "controls-declared",
      severity: "violation",
      says: "a web beat declares at least one control: a page with none is the static frame",
    });

  const order = controls.map((c) => c.order);
  if (order.join(",") !== controls.map((_, i) => i + 1).join(","))
    out.push({
      id: "control-order",
      severity: "violation",
      says: `the controls are ordered ${order.join(", ") || "(none)"}; a declaration orders them 1..n`,
    });

  for (const control of controls)
    if (!(control.gesture in GESTURES))
      out.push({
        id: "control-vocabulary",
        severity: "violation",
        says:
          `\`${control.gesture}\` is not in the repertoire — the web vocabulary is CLOSED because ` +
          `the runner builds each control: ${Object.keys(GESTURES).join(", ")}`,
      });

  if (declared.degradesTo !== "static-frame")
    out.push({
      id: "degrades-to-static",
      severity: "violation",
      says:
        "this page does not degrade to its static frame: with the script off a reader is left " +
        "with no picture at all",
    });

  if (declared.keyboard !== true)
    out.push({
      id: "keyboard-reachable",
      severity: "violation",
      says: "no control is reachable without a pointer",
    });

  const atoms = sheetAtoms(frame.vocabulary);
  for (const control of controls)
    if (control.gesture in GESTURES && atoms.size && !atoms.has(control.gesture))
      out.push({
        id: "vocabulary-addition",
        severity: "note",
        says: `\`${control.gesture}\` is not in this type's \`## Reader gestures\` yet — the sheet owes the entry`,
      });

  return out;
}

// ── THE EMPTY SECTION A SCAFFOLD WRITES ────────────────────────────────────────────────────────
//
// Spec §2.5: at scaffold time a beat gets the export's table headers, the type sheet's vocabulary
// and prohibitions quoted as a comment for the author, and NO ROWS AND NO BLOCK. A scaffold that
// pre-filled a row would be the clone factory R-D forbids — it is the one place where "helpfully"
// seeding a table turns 40 pieces into one piece rendered 40 times.
//
// The beat gains `derived: v1` and its blocks only when its author fills the table and runs
// `bun scripts/migrate-briefs.mjs --harvest --beat <dir>`.

/** The frame, quoted for the author — never a suggestion of what to write, only of what is owed. */
function frameComment(frame, lines) {
  const vocabulary = (frame?.vocabulary ?? []).map((atom) => `  ${atom}`);
  const prohibitions = (frame?.prohibitions ?? []).map((p) => `  ${p.id ?? "(no id)"} — ${p.says}`);
  return [
    "<!-- THE FRAME THIS TYPE SUPPLIES. The choreography itself is yours, written from the subject.",
    ...lines,
    "",
    vocabulary.length ? "  gestures this type records (the list is OPEN — add to the sheet):" : "",
    ...vocabulary,
    prohibitions.length ? "" : "",
    prohibitions.length ? "  a choreography of this type must NOT:" : "",
    ...prohibitions,
    "",
    `  worked example: ${frame?.workedExample ?? "(none filed)"}`,
    "-->",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** `## Interaction`, empty: what the reader may ask, the frame quoted, and no controls. */
export function renderChoreographySection(frame) {
  return [
    "## Interaction",
    "",
    frameComment(frame, [
      "     A web beat is WHAT THE READER'S POINTER AND KEYBOARD CAN CHANGE, in what order the",
      "     picture responds, and the static frame it degrades to with the script off. The",
      "     repertoire is CLOSED — the runner builds each control — and the declaration itself",
      "     lives in this beat's own `const interaction = { … }`, which the table below narrates.",
      "",
      "     THE FREE PARAMETER. A fixed frame is forced to settle one decision on the reader's",
      "     behalf — a threshold, a bin width, a scale exponent, a unit, a reference year, a pivot,",
      "     a class rule, a denominator, a camera remove, a dot value — to print it, and to ask to",
      "     be trusted. A video and a scrolly settle the same one AND fix the order the alternatives",
      "     are seen in, which is already somebody's argument. This page is the export that hands it",
      "     back, over a plate that does not otherwise move. Name it; name what the fixed frame had",
      "     to pick (and the reader must be able to put it back there, or the page stops carrying",
      "     the claim at rest); name what the reader can put it at; and name what does NOT move",
      "     while it does — that last column as CSS selectors and not a sentence, because it is",
      "     measured in a real browser at every value and prose cannot be.",
      "",
      `     the repertoire: ${Object.keys(GESTURES).join(", ")}`,
    ]),
    "",
    "| # | le paramètre libre | ce que le fixe a dû trancher | ce que le lecteur peut poser | ce qui ne bouge pas | la lecture qui revient |",
    "| --- | --- | --- | --- | --- | --- |",
    "",
  ].join("\n");
}
