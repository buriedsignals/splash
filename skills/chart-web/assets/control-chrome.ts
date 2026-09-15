// twin/skills/chart-web/assets/control-chrome.ts
//
// THE ONE PLACE A DIRECTED CONTROL IS DRAWN.
//
// Every vocabulary in this directory says something different about the picture — `filter.ts` what
// may LEAVE it, `stack.ts` what may MOVE in it, `level.ts` what it may be MEASURED AGAINST,
// `qualify.ts` what the axis even COUNTS — and every one of them shipped the same forty lines of
// fieldset, legend, pill rail and reserved note row, copied byte for byte from the sibling written
// before it. Twenty copies were measured the day this file was written, each carrying a header
// paragraph explaining that the copy was deliberate and that "the blocks are held together by the
// eye". The eye held them for a while and then stopped: two of the twenty had drifted to a flex
// value the owner had already arbitrated against, nine drew a 10px pill and eight a 12px one, and
// three carried a pill treatment from an earlier wave entirely. A defect in the shared drawing had
// to be fixed twenty times or not at all, and it was not at all — which is why the owner refused it
// three times in three different words.
//
// The repository has paid this exact bill before: 39 identical `PALETTE.md` files, every one of
// them reasoning about a beat none of them was written for.
//
// So the drawing lives here once, and a vocabulary calls it with its own class stem. What stays a
// per-vocabulary decision is only what is genuinely per-vocabulary: how many lines of sentence the
// control has to reserve under it, whether its rail wraps or scrolls, and whatever extra layer the
// beat's own geometry needs. Everything else — the pill, its states, the note row's shape — is one
// decision with one place to change it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE CHOSEN OPTION IS NOT A SLAB OF INK, AND THAT IS THE REVERSAL THIS FILE CARRIES.
//
// What every copy drew was `background: var(--ink); color: var(--ground)`. On `rapport`, where
// `--ink` is `#000000`, that is a solid black capsule sitting above a chart drawn in hairlines. Its
// contrast was never the problem — white on black measures 21,0:1 — its WEIGHT was: the heaviest
// object on the page was the furniture, not the data. The owner refused it on three different beats
// in three different words: « le fait d'utiliser du noir au filtre et vu qu'il y a plein de traits
// c'est peu lisible », « l'encadré gris au filtre c'est moche », « la colorisation des filtres n'est
// pas lisible avec le texte ».
//
// The chosen option now reads by three cues at once, and only one of them is hue:
//
//   1. a WASH — the direction's own accent at 22 % into its own ground, an opaque `color-mix`, so
//      what the page paints behind the words IS the measured colour and not a translucency composed
//      over something unknown. (Measured: the wash is 1,41:1 against the cream ground, 1,62:1
//      against the nocturne ground, 1,41:1 against the rapport ground — a tint a reader sees as a
//      filled capsule, at a twelfth of the ink slab's weight.)
//   2. a RING — the accent at full strength, 1,5px, already above the non-text floor in all three
//      directions by construction (6,6:1 / 10,8:1 / 7,1:1 against their grounds: an accent that
//      failed this would have been refused by `palette` long before it reached a control).
//   3. the WORDS — `--muted` at rest, `--ink` when chosen. On the wash that measures 14,5:1 in
//      creme, 11,0:1 in nocturne and 14,9:1 in rapport, so the 4,5:1 floor is cleared with room in
//      every direction and for any accent a beat might file, because the wash stays near its own
//      ground by construction.
//
// Cue 1 and cue 3 are luminance, not hue: a reader who sees no colour at all still sees a capsule
// that filled in and words that darkened. That is the "not by colour alone" requirement, held by
// the drawing rather than by a promise.
//
// AND THE ACCENT ON CHROME, WHICH SIX OF THE TWENTY COPIES ARGUED AGAINST. Their comment read:
// "ink-on-ground, never the accent: the accent is what the argument is drawn in on this page, and a
// control that borrowed it would make the one colour that means something also mean 'you clicked
// here'." That argument is sound about a MARK and it is overruled here about FURNITURE, by the
// owner's own arbitration on this defect — the accent is the obvious material for a selection, as a
// wash, a ring, an underline, or all three. The collision it feared is kept small on purpose: no
// mark in the plot is ever drawn at 22 % of the accent, and no mark is ever a 1,5px ring around a
// capsule outside the plot. Full accent as a FILL still means, and only means, the argument.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE ROW HUGS ITS OPTIONS, AND IT CANNOT PUSH THE DOCUMENT WIDE.
//
// Two measurements, both the owner's, both closed here once instead of twenty times:
//
//   - `flex: 0 1 auto` and never `1 1 auto` — a row let to grow measured 1240px of frame around
//     490px of content. Two of the twenty copies had drifted further, to `flex: 0 0 auto`, which
//     forbids the row to SHRINK: four pills whose natural line is 610px then overflow a 375px
//     window instead of wrapping inside it.
//   - `min-inline-size: 0` on the fieldset and `min-width: 0` on both — a `<fieldset>` defaults to
//     `min-inline-size: min-content` and a flex item to `min-width: auto`, so a rail that cannot
//     wrap takes the whole DOCUMENT with it: 1351px wide in a 375px window, measured on
//     `proof/web-slope-europe-lowcarbon`. One copy of twenty carried the fix.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IS LAYERED, AND WHY NOTHING HERE DESTROYS A CONTROL.
//
// The native radios are what the reader actually operates: they keep their size, their position and
// their keyboard, and they are made invisible (`opacity: 0`) rather than removed (`display: none`),
// which is the line between styling a control and destroying one. The whole segmented treatment
// sits behind `@supports selector(:has(*))`, so an engine that cannot draw a chosen pill gets plain
// radios with visible dots rather than a row of identical capsules. Every pill clears the 24x24 CSS
// px minimum target (WCAG 2.2 SC 2.5.8) by its own `min-height` rather than by arithmetic on a font
// size the direction chooses.

/** How the rail behaves when its options are wider than the row it has.
 *
 *  `wrap` is the default and is right for two to six short options. `scroll` is for a rail of names
 *  — a wrapped row of competitor names is tall, and under this format's window-fit rule that height
 *  comes straight off the plot. Nothing is removed and no option leaves the keyboard's reach. */
export type ControlRail = "wrap" | "scroll";

export type ControlChromeNotes = {
  /** Margin above the note row. Defaults to `4px 0 0`. */
  margin?: string;
  /** `min-height` for the reserved row, or `null` for a row that costs nothing until a sentence
   *  appears. Defaults to `1.5em` — one line, which is what a one-line sentence needs so that
   *  choosing an option never pushes the plot down. */
  reserve?: string | null;
  /** Why THIS control reserves what it reserves — emitted as a CSS comment beside the value, because
   *  a reserved height is measured on a real sentence at a real width and the measurement is the
   *  only thing that makes the number defensible. */
  why?: string;
  /** Stack every sentence in one grid cell instead of letting the shown one size the row. For a
   *  control whose sentences wrap to different heights: revealing one then grows the row and pushes
   *  the drawing down — measured at 15px of radar movement on one beat. Stacked, the container is
   *  always as tall as the LONGEST sentence and the plot never moves. */
  stacked?: boolean;
};

export type ControlChrome = {
  /** The page-level scope every rule is prefixed with, e.g. `.chart-figure`. */
  scope: string;
  /** The vocabulary's own stem: `aim` gives `.chart-aim` and `.aim-notes`. */
  name: string;
  /** Margin above the fieldset. Defaults to `10px 0 0`. */
  margin?: string;
  rail?: ControlRail;
  notes?: ControlChromeNotes;
  /** Rules this beat's own geometry needs beside the control — a value layer over the plot, say.
   *  Emitted verbatim between the note row and the segmented treatment. */
  extra?: string;
};

const comment = (text: string, indent: string): string => {
  if (text.includes("*/"))
    throw new Error("a chrome comment may not close itself");
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + 1 + word.length > 96) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines
    .map(
      (l, i) =>
        `${indent}${i === 0 ? "/* " : "   "}${l}${i === lines.length - 1 ? " */" : ""}`,
    )
    .join("\n");
};

/**
 * The control's own chrome — the fieldset, its legend, the pill rail, the pills and their states,
 * and the row reserved for the sentence the control owes the reader.
 *
 * Emitted ONLY for a beat that declared this control: a page that declares none ships not one byte
 * of it, which is what makes the cost removable rather than ambient.
 */
export function controlChromeCss({
  scope,
  name,
  margin = "10px 0 0",
  rail = "wrap",
  notes = {},
  extra = "",
}: ControlChrome): string {
  if (!/^[a-z][a-z0-9-]*$/.test(name))
    throw new Error(
      `control chrome: ${JSON.stringify(name)} is not a class stem. It becomes .chart-<name> and ` +
        `.<name>-notes, so it must be lowercase letters, digits and hyphens.`,
    );
  const {
    margin: notesMargin = "4px 0 0",
    reserve = "1.5em",
    why,
    stacked = false,
  } = notes;

  const block = `.chart-${name}`;
  const note = `.${name}-notes`;

  const railRest =
    rail === "scroll"
      ? `${scope} ${block} .options {
  display: inline-flex;
  align-items: center;
  gap: 4px 12px;
${comment(
  "One scrollable line rather than a wrapped block: a wrapped row of names is tall, and the height " +
    "it takes comes straight off the plot under this format's window-fit rule. Nothing is removed " +
    "and no option leaves the keyboard's reach.",
  "  ",
)}
  flex-wrap: nowrap;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  /* SHRINK, NEVER GROW — see this file's header for both measurements. */
  flex: 0 1 auto;
  min-width: 0;
}`
      : `${scope} ${block} .options { display: inline-flex; flex: 0 1 auto; flex-wrap: wrap; gap: 4px 12px; align-items: center; min-width: 0; }`;

  // THE GROUP'S FRAME, AND THE ONE THING THE OWNER DID NOT REFUSE. A grey edge around EVERY option
  // was refused (« l'encadré gris au filtre c'est moche » — a row of outlined boxes over a plot that
  // is already a thicket of lines reads as a second grid); one edge around the GROUP is what says a
  // row of words is a control at all, and its arbitration was that it must HUG its options rather
  // than that it must go. 3px of padding and not 2, so the chosen pill's own ring never sits on it.
  const railSegmented = `  ${scope} ${block} .options {
    gap: 0;
    padding: 3px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }`;

  return `
${scope} ${block} {
  flex: 0 0 auto;
  margin: ${margin};
  padding: 0;
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  font-size: var(--filter-size);
${comment(
  "A fieldset's default min-inline-size is min-content and a flex item's default min-width is auto, " +
    "so a row of pills simply grows to its content and takes the DOCUMENT with it — measured at " +
    "1351px wide in a 375px window on proof/web-slope-europe-lowcarbon. Both are load-bearing.",
  "  ",
)}
  min-inline-size: 0;
  min-width: 0;
}
${comment(
  'float:left is the HTML spec\'s own opt-out from becoming the "rendered legend" the browser lifts ' +
    "into the fieldset's border — inside a flex container the float itself does nothing. Without it " +
    "the legend takes a row of its own, which this format's window-fit rule pays for in plot height.",
  "",
)}
${scope} ${block} legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${railRest}
${scope} ${block} label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} ${block} input { cursor: pointer; margin: 0; }

${comment(
  "THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not an option is chosen, " +
    'so choosing one never moves the plot underneath it. role="status" belongs on the container ' +
    "rather than on each note: the notes come and go by display, and a live region that itself comes " +
    "and goes announces nothing.",
  "",
)}
${scope} ${note} {
  flex: 0 0 auto;
  margin: ${notesMargin};
${reserve === null ? "" : `${why ? `${comment(why, "  ")}\n` : ""}  min-height: ${reserve};\n`}  font-size: var(--source-size);
  color: var(--muted);${
    stacked
      ? `\n${comment(
          "EVERY SENTENCE IN ONE GRID CELL. These sentences wrap to different heights, so revealing " +
            "one with display grew the row and pushed the drawing down. Stacked in one cell the " +
            "container is always as tall as the LONGEST sentence, whichever is showing, and the " +
            "plot never moves.",
          "  ",
        )}\n  display: grid;`
      : ""
  }
}
${scope} ${note} p { ${stacked ? "grid-area: 1 / 1; " : ""}margin: 0; }
${extra ? `\n${extra.trim()}\n` : ""}
@supports selector(:has(*)) {
${railSegmented}
${comment(
  "THE RING IS PAID FOR OUT OF THE PADDING. A transparent 1,5px edge at rest and an accent one when " +
    "chosen means the pill's outer box is the same either way, so the row cannot shift sideways when " +
    "a reader changes their mind. min-height rather than arithmetic on the direction's own font size " +
    "is what keeps the 24x24 target real in every direction (WCAG 2.2 SC 2.5.8).",
  "  ",
)}
  ${scope} ${block} label {
    gap: 0;
    min-height: 24px;
    padding: 4px 10px;
    border: 1.5px solid transparent;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
  }
  ${scope} ${block} label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 999px;
  }
${comment(
  "THREE DISTINCT STATES, AND NO TWO OF THEM ARE THE SAME CUE. Hover darkens the words and nothing " +
    "else. Chosen fills the capsule, rings it and darkens the words. Focus draws an outline OUTSIDE " +
    "the box, in ink, so a chosen pill that is also focused shows both and neither is mistaken for " +
    "the other. Order matters and is the whole mechanism: hover and chosen weigh the same, so the " +
    "later rule is what a hovered chosen pill takes.",
  "  ",
)}
  ${scope} ${block} label:hover { color: var(--ink); }
${comment(
  "NOT A SLAB OF INK — see this file's header for the three refusals and the three measured cues. " +
    "An opaque color-mix and not a translucency: what the page paints behind the words is exactly " +
    "the colour measured against them. Where color-mix is not understood the declaration drops and " +
    "the ring and the darkened words still separate the chosen option, which is the same posture " +
    "the @supports wrapper already takes.",
  "  ",
)}
  ${scope} ${block} label:has(input:checked) {
    background: color-mix(in srgb, var(--accent) 22%, var(--ground));
    border-color: var(--accent);
    color: var(--ink);
  }
  ${scope} ${block} label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
