// skills/chart-web/scripts/scaffold-web-beat.mjs
//
// THE PLUMBING OF A DIRECTED CHART WEB BEAT, WRITTEN ONCE — AND NOTHING ELSE.
//
// Usage:  bun skills/chart-web/scripts/scaffold-web-beat.mjs --type <type> --beat proof/web-<type>-<subject>
//           --static proof/static-<type>-<subject> [--component <PascalName>]
//
// ITS JOB IS TO REMOVE TYPING, NOT TO REMOVE THINKING. The owner's rule on this script, in his own
// words: « si générateur alors il faut pas que ça contraigne la création et que ça reste originale ».
// The risk is concrete and has already been paid once — a set of beats was rejected with « tu
// reproduis toujours le même schéma ». A scaffold that generated the beat would produce thirty-two
// identical pages, which is exactly the defect the catalogue was built to avoid, re-introduced by the
// tool meant to help. **A BEAT THAT LOOKS LIKE ITS NEIGHBOUR HAS FAILED EVEN IF EVERY TEST IS GREEN.**
//
// So the line is drawn hard, and it is drawn at "would anyone ever write this differently on purpose?":
//
// WHAT IT GENERATES — the mechanical and verbatim-identical, measured by diffing three finished beats
// (`proof/web-gantt-top-ten-tenure`, `proof/web-diverging-stacked-electricity`,
// `proof/web-beeswarm-co2-per-person`):
//   render-directions-web.mjs   the eight trunk imports, `HERE`/`DIRECTIONS`/`OUT`, `plain`, the frozen
//                               CSV read, the `textPerRegister` plain-pass (one U+202F takes all three
//                               renders down), `readPalette` + `composeDirections` + `report`, the
//                               per-direction loop with `resolveDirectionFamilies`, the try/catch that
//                               removes a refused direction's stale render and exits non-zero
//   Directed<Name>Web.tsx       the colour and register imports, `SCOPE`, `pct`, the props every beat
//                               carries, `webRegisters`, and the figure skeleton every page shares:
//                               the CSS-var style object with `figureVars`, the carried `<style>`, the
//                               eyebrow/title/caveat header, the `.chart-plot` cell with its
//                               `aspect-ratio`, the `<svg class="chart">` shell with its `<desc>`, the
//                               `.overlay` and `.x-axis` layers, the reading and source lines
//   BRIEF.md                    the headings the brief owes, in the order the work is done
//   PALETTE.md, data.csv        copied from the static sibling, never invented
//
// WHAT IT DELIBERATELY DOES NOT GENERATE — this is the beat, and every one of them is a marked
// `SCAFFOLD` hole with a comment saying what belongs there rather than a plausible default, because a
// default gets kept:
//   the gesture and the vocabulary it spends · the drawing · the stylesheet · every word (title,
//   caveat, reading, source, alt, the control's own sentences) · the claims computed from the file ·
//   the colour floors this beat had to search for · the refusals the beat asserts · the frame's numbers.
//
// AND IT NEVER GENERATES A DEFAULT INTERACTION. The vocabulary a type spends is the design decision of
// the page; a scaffold that picked one would have already decided it. The generated component lists the
// twenty-five chart vocabularies as a MENU, commented out, next to the line that matters: a type that
// deserves NONE of them, or deserves a new one written for it, is a legitimate and common outcome —
// nineteen of the twenty-five were written for exactly one beat because that beat needed something no
// other file said.
//
// Refuses: an unknown type (one with no `references/types/<type>.md`), a beat folder that already
// exists, a `--static` with no `PALETTE.md` or no frozen data. It never merges into a directory.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

// ── THE EDITORIAL CHAIN, WIRED (spec `docs/splash/2026-09-17-editorial-chain-spec.md` §4) ──────
//
// A scaffold is the ONLY place a beat's files are written, so it is where the chain has to be read
// or the chain reaches nothing. Three reads, and one refusal:
//
//   the type SHEET  → `choreographyFrame` → the vocabulary and the prohibitions quoted for the
//                     author, in a section that carries NO ROWS AND NO BLOCK (R-D: a scaffold that
//                     pre-filled a row would be the clone factory this whole chain exists to stop);
//   `scaffoldRequirements` → the precision requirements a type and a format already fix, with the
//                     two the journalist answers at G1 named as owed rather than guessed;
//   `DIRECTION.md`  → refused when unreachable, in the same shape as the PALETTE.md refusal and
//                     naming the command that produces it. `--filed` is the catalogue-only escape.
//
// `checkChoreography` and `checkPrecision` are re-exported below, so a beat's own verifier reaches
// the chain through the scaffold that wrote the beat rather than finding its own copy, and so
// `skills/splash/test/the-chain-is-read-end-to-end.test.ts` can see this scaffold joined to them.
//
// The node builtins are imported under their own names here because these eight files each import
// a different subset of them already; aliasing keeps this block identical in all eight.

import { existsSync as chainExists, readFileSync as chainRead } from "node:fs";
import { join as chainJoin, relative as chainRelative } from "node:path";
import { choreographyFrame, parseTypeSheet } from "#shared/editorial/frame.mjs";
import { replaceSection } from "#shared/editorial/derived.mjs";
import { directionReachable, directionRefusalMessage } from "#shared/design-base/run-direction.mjs";
import { checkChoreography, renderChoreographySection } from "./choreography.mjs";
import { readPalette } from "./colour.mjs";
import { checkPrecision, renderPrecisionSection, scaffoldRequirements } from "./precision.mjs";

// THE PALETTE IS REACHED, NOT NECESSARILY CARRIED. `readPalette` walks up from a beat to the
// filesystem root, so a story records one answer at its own root and every beat under it reads the
// same colours. The catalogue's flow puts one in each beat directory, and copying the static
// sibling's was the same thing there — but it refused every story beat, whose palette is one level
// up and perfectly reachable. So: reach first, copy only when the new beat cannot reach one.
const PALETTE_NOT_FOUND = "No PALETTE.md found for ";
function paletteReachableFrom(dir) {
  try {
    readPalette(dir);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(PALETTE_NOT_FOUND)) return false;
    throw error;
  }
}

export { checkChoreography, checkPrecision };

/** This scaffold's own export. */
export const CHAIN_FORMAT = "web";

/** Where this export's type sheets live — a function, so it does not race this file's own consts. */
const chainSheets = () => chainJoin(import.meta.dirname, "..", "references", "types");

/** The parsed sheet and the frame it supplies for one type. It returns no choreography. */
export function chainFrameFor(type) {
  const path = chainJoin(chainSheets(), `${type}.md`);
  const sheet = chainExists(path) ? parseTypeSheet(chainRead(path, "utf8")) : {};
  return { sheet, frame: choreographyFrame({ format: CHAIN_FORMAT }, sheet) };
}

/**
 * The BRIEF with its two chain sections rewritten EMPTY — headers, the frame quoted, no rows.
 *
 * `note` is the provenance line a `--from` scaffold owes its author ("this beat's code was
 * scaffolded from X; read that beat before writing this table"). It is kept because it is about
 * where the CODE came from, not about what the choreography should be — and rewriting the section
 * would otherwise drop it on the floor.
 */
export function withChainSections(brief, type, note = "") {
  const { sheet, frame } = chainFrameFor(type);
  const choreography = renderChoreographySection(frame) + (note ? `\n${note}\n` : "");
  const precision = renderPrecisionSection(scaffoldRequirements(sheet, CHAIN_FORMAT));
  const out = replaceSection(brief, choreography.split("\n")[0], choreography);
  return replaceSection(out, precision.split("\n")[0], precision);
}

/**
 * Refuses before anything is written when the run's one art direction is not reachable.
 *
 * TWO EXEMPTIONS, AND NEITHER IS A HEURISTIC. `--filed` is the author saying out loud that this
 * beat renders the three filed demo directions. And a beat under `proof/` is the catalogue, which
 * R-A names as THE exception — the proofs render the three filed directions precisely to show the
 * art direction is a parameter of the run. The exemption is by explicit path prefix, exactly as
 * `skills/splash/test/a-production-run-has-one-direction.test.ts` writes its own, and never by a
 * guess at what a directory name means.
 */
export function assertRunDirection(root, beatDir, filed) {
  const relative = chainRelative(root, beatDir).split("\\").join("/");
  if (filed || relative.startsWith("proof/") || directionReachable(beatDir)) return;
  throw new Error(directionRefusalMessage({ relBeatDir: relative }));
}


const HERE = import.meta.dirname;
const SHEETS = join(HERE, "..", "references", "types");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const BEAT_NAME = /^\.?[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/** `web-gantt-top-ten-tenure` of type `gantt` → `TopTenTenure`. */
export function componentNameOf(beatName, type) {
  const subject = beatName.replace(/^\./, "").replace(/^web-/, "").replace(new RegExp(`^${type}-`), "");
  return subject
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/** The frozen data the static sibling carries at its top level: `data.csv` first, else its first CSV. */
export function dataFileOf(staticDir) {
  const files = readdirSync(staticDir).filter((f) => statSync(join(staticDir, f)).isFile()).sort();
  if (files.includes("data.csv")) return "data.csv";
  return files.find((f) => /\.csv$/i.test(f)) ?? files.find((f) => /\.(geo)?json$/i.test(f)) ?? null;
}

/** A path given on the command line, resolved and held to one folder directly under `<root>/proof/` —
 *  the catalogue's own place for a beat — or under a story's own `beats/`. A producer that only
 *  reaches the catalogue is not a producer a journalist has: without a scaffold there is no
 *  `BRIEF.md`, and without a brief gate G3 can never close on the beat. */
function proofDirOf(root, given, flag) {
  if (typeof given !== "string" || given === "") throw new Error(`${flag} takes a path under proof/, or a story's beats/`);
  const dir = resolve(root, given);
  const parent = basename(dirname(dir));
  if (parent !== "proof" && parent !== "beats") throw new Error(`${flag} must name a folder directly under proof/ or a story's beats/, got ${JSON.stringify(given)}`);
  if (!BEAT_NAME.test(basename(dir))) throw new Error(`${flag} must be a kebab-case folder name, got ${JSON.stringify(basename(dir))}`);
  return dir;
}

/** Every value the templates carry, derived and validated. */
export function tokensFor({ root, type, beat, staticBeat, component, sheets = SHEETS }) {
  if (!KEBAB.test(type ?? "")) throw new Error(`--type must be a kebab-case chart type, got ${JSON.stringify(type)}`);
  // A TYPE WITH NO SHEET IS A TYPE WITH NO WORKED EXAMPLE TO READ, and reading it is step 2 of the
  // path. The scaffold refuses rather than letting an author start from a blank page it just wrote.
  if (!existsSync(join(sheets, `${type}.md`)))
    throw new Error(`no type sheet for ${JSON.stringify(type)} — skills/chart-web/references/types/${type}.md does not exist`);
  const beatDir = proofDirOf(root, beat, "--beat");
  const staticDir = proofDirOf(root, staticBeat, "--static");
  if (!existsSync(staticDir) || !statSync(staticDir).isDirectory()) throw new Error(`--static names no beat: ${relative(root, staticDir)} does not exist`);
  const paletteCarried = existsSync(join(staticDir, "PALETTE.md"));
  const paletteReached = paletteReachableFrom(beatDir);
  if (!paletteCarried && !paletteReached) {
    throw new Error(
      `${relative(root, beatDir)} has no PALETTE.md reachable (readPalette walks up from the beat and found none), and ${relative(root, staticDir)} carries none to copy. A beat's colours are a journalist's decision, never scaffolded silently — record one at the beat, or at the story root where every beat under it reads the same answer.`,
    );
  }
  const dataFile = dataFileOf(staticDir);
  if (!dataFile) throw new Error(`${relative(root, staticDir)} carries no frozen data (.csv or .json) at its top level`);
  const name = component ?? componentNameOf(basename(beatDir), type);
  if (!PASCAL.test(name)) throw new Error(`--component must be a PascalCase name, got ${JSON.stringify(name)}`);
  return {
    beatDir,
    staticDir,
    dataFile,
    values: {
      Name: name,
      BEAT: basename(beatDir),
      BEAT_PATH: relative(root, beatDir).split(sep).join("/"),
      TYPE: type,
      STATIC: basename(staticDir),
      // WHERE THE SIBLING ACTUALLY IS. The brief used to write `proof/<name>` whatever the
      // sibling's real home; on a story beat that is a false statement in a file the journalist
      // reads. `beats/<name>` when it is one, the catalogue's own path otherwise.
      STATIC_PATH: `${basename(dirname(staticDir))}/${basename(staticDir)}`,
      UP: relative(beatDir, root).split(sep).join("/"),
    },
  };
}

export function fill(template, values) {
  return template.replace(/%%([A-Za-z_]+)%%/g, (token, key) => {
    if (!(key in values)) throw new Error(`the scaffold template carries an unknown token ${token}`);
    return values[key];
  });
}

// ---------------------------------------------------------------------------------------------
// THE TEMPLATES. Everything below is either verbatim in all three probed beats, or a marked hole.
// ---------------------------------------------------------------------------------------------

const RUNNER = `// %%BEAT_PATH%%/render-directions-web.mjs
//
// SCAFFOLD — ONE PARAGRAPH: what this page proves, and what the reader operates to see it. The
// runner owns everything a browser must never compute: the shaping, the claims, and every formatted
// number. Delete this line once it is written.
//
// Usage:  bun %%BEAT_PATH%%/render-directions-web.mjs

import { readdirSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "%%UP%%/skills/chart-web/scripts/render-web.mjs";
import { Directed%%Name%%Web, FRAME } from "./Directed%%Name%%Web.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

// SCAFFOLD — THE EYEBROW is this beat's own: the desk and the geography, in the newsroom's words.
const EYEBROW = "SCAFFOLD";

const plain = (s) => plainSpaces(s);

// SCAFFOLD — THE FROZEN FILE, READ FOR ITS OWN EXACT HEADER. Nothing here is generic: a reader
// written for one file is the point, and a reader written for "a CSV" is how a column silently
// becomes the wrong column. Assert the shape you are relying on (consecutive years, a closed set of
// codes, a total that sums to 100) and throw here rather than in a browser.
const csv = (await readFile(join(HERE, "%%DATA_FILE%%"), "utf8")).trim().split(/\\r?\\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
void at;
const rows = csv.slice(1).map((line) => line.split(","));
void rows;

// SCAFFOLD — THE SHAPING AND THE CLAIMS. Every figure \`BRIEF.md\` states is computed here and
// asserted here, so a claim that stopped being true stops the render instead of shipping.

// SCAFFOLD — THE GESTURE'S OWN DECLARATION, if this beat spends a vocabulary. One object, handed to
// the component and refused by the vocabulary's own assert before a browser ever sees it.

const facts = beatFacts(
  // SCAFFOLD — { key, label, value } per mark, plus { subject, declaredSequence }.
  [],
  {},
);
const offered = applicableTreatments(facts);
console.log(\`treatments applicable: \${offered.map((t) => t.id).join(", ") || "(none)"}\\n\`);

// SCAFFOLD — THE WORDS. Each one is the beat's, and the title's LENGTH is height taken out of the
// plot at the narrowest frame — the one place the plot cannot give any back.
const title = "SCAFFOLD";
const caveat = "SCAFFOLD";
const readingLine = "SCAFFOLD — what the reader should do, and what it will change.";
const source = "Source : SCAFFOLD";
const alt = "SCAFFOLD — the picture in words, in every state the control can put it in.";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: \`\${caveat} \${readingLine} \${source}\`,
  axis: "",
  annot: "",
  value: "",
};

// EVERY REGISTER'S TEXT PASSES THROUGH \`plain\` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces \`toLocaleString("fr-FR")\` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
// SCAFFOLD — how many levels of evidence this beat's ink has to separate.
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const name = \`\${id}.html\`;
  try {
    await renderWeb({
      component: Directed%%Name%%Web,
      props: {
        // SCAFFOLD — the beat's own shaped data and its gesture declaration go here.
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        reading: readingLine,
        alt: plain(alt),
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name,
    });
    console.log(\`\${id} -> renders/\${name}\`);
  } catch (error) {
    refused.push({ id, why: error.message });
    // AND THE REFUSED DIRECTION'S PREVIOUS RENDER COMES OFF THE DISK. A page that was refused and
    // whose last good render is still sitting there is a page that looks produced to everything
    // downstream — the verifier, a capture, a reader.
    rmSync(join(OUT, name), { force: true });
    console.log(\`\${id} REFUSED — \${error.message}\`);
  }
}
if (refused.length) {
  console.log(\`\\nrefused by \${refused.length}: \${refused.map((x) => x.id).join(", ")}\`);
  // A RUNNER THAT SWALLOWS A REFUSAL MAKES A REFUSED PAGE LOOK LIKE A PRODUCED ONE.
  process.exitCode = 1;
}
console.log(\`\\nframe \${FRAME.width} x \${FRAME.height}\`);
`;

const COMPONENT = `/**
 * SCAFFOLD — WHAT THIS PAGE PROVES, AND THE GESTURE THAT PROVES IT.
 *
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NO OTHER'S. Argue it here the way
 * \`skills/chart-web/references/types/%%TYPE%%.md\` argues its worked example's: start from what the
 * type has to SPEND to draw at all, name the question that spend makes unreachable on one plate, and
 * make the reader's control the thing that buys it back. A gesture chosen because the mechanism
 * exists is the defect; a gesture reused from a neighbouring beat is the same defect with a green
 * test suite. WHAT DOES NOT MOVE is as much of the design as what does — say which, and why each one
 * is a decision rather than a default.
 *
 * SCAFFOLD — TREATMENTS: which of the type's filed treatments this page spends, which it refuses,
 * and what it does instead.
 */

import {
  adjustToContrast,
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";

// SCAFFOLD — THE VOCABULARY THIS BEAT SPENDS, IF IT SPENDS ONE. The scaffold does not choose: the
// vocabulary IS the design of the page. The twenty-five that exist, each a declaration the beat
// writes and CSS generated at build time — no listener, no state, no JavaScript:
//
//   aim · align · benchmark · brush · carry · count · cutoff · datum · descend · filter · floor ·
//   fold · follow · hold · level · qualify · rebase · reorder · side · stack · trace · unit ·
//   weigh · withdraw          (plus entrance, which is the arrival, not a control)
//
// SKILL.md's "The vocabularies" table says what each one lets the reader do and which type spends
// it. A TYPE THAT DESERVES NONE OF THEM IS A LEGITIMATE OUTCOME, and so is a type that deserves a
// new file: nineteen of the twenty-five were written for exactly one beat, because that beat needed
// something no existing file said. Reuse the MECHANISM, never the gesture.
//
// import { ... } from "%%UP%%/skills/chart-web/assets/<vocabulary>.ts";

/** The scope every generated rule is written inside, and the prefix every control id carries. */
const SCOPE = ".chart-figure";

// SCAFFOLD — THE FRAME. Its numbers are this drawing's own proportions, not a rendered pixel cap:
// the delivered \`<svg>\` has no width or height. \`xAxisRowPx\` is the fixed CSS row reserved below
// the plot for the axis's words.
export const FRAME = { width: 0, height: 0, xAxisRowPx: 0 };

const pct = (v: number, of: number) => (v / of) * 100;
void pct;

export function Directed%%Name%%Web({
  title,
  eyebrow,
  caveat,
  source,
  reading,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  reading: string;
  alt: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // SCAFFOLD — THE COLOUR FLOORS, SEARCHED AGAINST THIS BEAT'S OWN GROUNDS AND WRITTEN DOWN IN
  // \`PALETTE.md\`. They are not transferable: a step found for another dataset carries here silently
  // and nothing goes red. \`mix\`, \`contrast\`, \`adjustToContrast\`, \`NON_TEXT_CONTRAST_MIN\` are
  // imported for that search; \`assertLegible\` THROWS, so an unreadable pair refuses the render.
  void mix;
  void contrast;
  void NON_TEXT_CONTRAST_MIN;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  void labelInk;
  assertLegible(accent, ground, {
    role: "mark",
    where: \`\${direction.id ?? "this direction"}'s SCAFFOLD\`,
  });

  // SCAFFOLD — THIS BEAT'S OWN STYLESHEET, carried inside the figure it styles. The format's shared
  // \`buildCss\` emits the chrome for a filter and nothing else; every rule this page's gesture needs
  // is written here, scoped to \`SCOPE\`.
  const css = [\`\${SCOPE} .chart-plot { --y-gutter: 0px; }\`].join("\\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* SCAFFOLD — THE CONTROL, if this beat has one. Native \`<input type="radio">\` inside a real
          \`<fieldset>\`/\`<legend>\`: a radio group to the keyboard and to a screen reader before this
          page's stylesheet does anything to it. Each accessible name must CONTAIN its visible one.
          And the sentence the control owes a reader who is not looking at the plot goes in a
          \`role="status"\` row whose height is reserved in every state. */}

      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: \`\${FRAME.xAxisRowPx}px\`,
          aspectRatio: \`\${FRAME.width} / \${FRAME.height + FRAME.xAxisRowPx}\`,
        }}
      >
        <svg
          className="chart"
          viewBox={\`0 0 \${FRAME.width} \${FRAME.height}\`}
          preserveAspectRatio="none"
          role="img"
          aria-label={alt}
        >
          <desc>{alt}</desc>
          {/* SCAFFOLD — THE DRAWING. Geometry only: no \`<text>\` anywhere in here. The box stretches
              with the container and the words never do, which is the whole of the fluid frame. */}
        </svg>

        {/* SCAFFOLD — THE WORDS OVER THE DRAWING: every label positioned by % over this same cell,
            at a FIXED CSS size that never tracks the viewBox. */}
        <div className="overlay" aria-hidden="true" />

        {/* SCAFFOLD — THE AXIS'S WORDS, positioned by % on the same box. */}
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
`;

const BRIEF = `# %%BEAT%% — brief

Type: \`%%TYPE%%\` · format: web · static sibling: \`%%STATIC_PATH%%\`
Type sheet: \`skills/chart-web/references/types/%%TYPE%%.md\`

## The takeaway

SCAFFOLD — one sentence a reader could repeat. The page exists to make it inspectable, not to
decorate it.

## What the static frame had to omit

SCAFFOLD — the readings the still could not label, and why. Interaction is honest when it adds
those; it is dishonest when it re-states what the title already says.

## The gesture, argued — BEFORE ANY CODE

SCAFFOLD — what the reader does, and the question it answers that the default plate cannot.

- **What the type has to spend to draw at all**, and what that spend makes unreachable.
- **Why this gesture and not a neighbour's.** Reusing the mechanism is the point; reusing the gesture
  is the failure. A beat that looks like its neighbour has failed even if every test is green.
- **The vocabulary**: which file, or none, or a new one written for this type — and why.
- **What does NOT move**, and why each of those is a decision rather than a default.
- **The default state**, which must already show everything the title claims.
- **The sentence each option owes** a reader who is not looking at the plot.

## The readings

SCAFFOLD — what a pointer, a Tab and a tap each answer with, and where each is baked server-side.

## The refusals

SCAFFOLD — what this beat asserts before a browser sees it, and which mutation each refusal was
found by.

## Verification

- \`bun %%BEAT_PATH%%/render-directions-web.mjs\` — three directions, none refused.
- \`bun skills/chart-web/scripts/verify-web.mjs --file %%BEAT_PATH%%/renders/creme.html --shots --out <dir>\`
- Then OPEN the shots and look. A script cannot see a collision, a clipped mark, or a squat plot.
`;

export const TEMPLATES = Object.freeze({
  "render-directions-web.mjs": RUNNER,
  "Directed%%Name%%Web.tsx": COMPONENT,
  "BRIEF.md": BRIEF,
});

/**
 * Writes the scaffold. Every file is filled in memory first; the beat folder is then created (failing
 * if it exists, even when it appeared since the check) and each file written with an exclusive flag.
 * @returns {string[]} the files written, relative to the beat
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates = TEMPLATES, sheets = SHEETS, type, beat, staticBeat, component, filed = false }) {
  // No `--from` provenance here: this scaffold fills its own templates rather than adapting
  // another beat's code, so the empty choreography section carries the frame and nothing else.
  const scaffoldedFrom = "";
  const { beatDir, staticDir, dataFile, values } = tokensFor({ root, type, beat, staticBeat, component, sheets });
  const all = { ...values, DATA_FILE: "data.csv" };
  const planned = Object.entries(templates).map(([target, body]) => [fill(target, all), fill(body, all)]);
  // The chain, read before a single file exists on disk (see "THE EDITORIAL CHAIN, WIRED" above).
  const briefAt = planned.findIndex(([target]) => target === "BRIEF.md");
  if (briefAt >= 0)
    planned[briefAt] = ["BRIEF.md", withChainSections(planned[briefAt][1], type, scaffoldedFrom)];
  assertRunDirection(root, beatDir, filed);
  // PER FILE, NOT PER DIRECTORY. The catalogue's own flow creates the beat here, so refusing an
  // existing directory was the same thing; a story's does not — the analyst writes the data
  // contract into `beats/<id>/` before any producer is dispatched, so a directory check refused
  // every story beat outright. What must not be overwritten is a file somebody wrote.
  const collisions = planned
    .map(([target]) => target)
    .filter((target) => existsSync(join(beatDir, target)))
    .sort();
  if (collisions.length) {
    throw new Error(
      `${relative(root, beatDir)} already has ${collisions.join(", ")} — the scaffold never overwrites a file`,
    );
  }
  mkdirSync(beatDir, { recursive: true });
  for (const [target, content] of planned) writeFileSync(join(beatDir, target), content, { flag: "wx" });
  // Re-read at the write site rather than carrying a flag across two functions: the answer is a
  // filesystem fact, and asking it twice is cheaper than a variable that can go stale.
  const paletteAlreadyReachable = paletteReachableFrom(beatDir);
  if (!paletteAlreadyReachable) copyFileSync(join(staticDir, "PALETTE.md"), join(beatDir, "PALETTE.md"), 1 /* COPYFILE_EXCL */);
  // THE ANALYST'S CONTRACT FOR THIS SLOT WINS. In the catalogue a web beat borrows its sibling's
  // frozen data, because there is nothing else; in a story the analyst has already written this
  // slot's own `data.csv` — filtered to the population THIS slot records, which may not be the
  // sibling's. Copying over it would replace the right rows with someone else's.
  const carriesItsOwnData = existsSync(join(beatDir, "data.csv"));
  if (!carriesItsOwnData) copyFileSync(join(staticDir, dataFile), join(beatDir, "data.csv"), 1);
  return [...planned.map(([target]) => target), ...(paletteAlreadyReachable ? [] : ["PALETTE.md"]), "data.csv"].sort();
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--static", "--component", "--filed"]);
  const out = {};
  for (let i = 0; i < argv.length; ) {
    // `--filed` is the catalogue-only escape from the DIRECTION.md refusal, and it is the
    // one flag here that takes no value.
    if (argv[i] === "--filed") {
      out.filed = true;
      i += 1;
      continue;
    }
    if (!known.has(argv[i])) throw new Error(`unknown argument ${JSON.stringify(argv[i])} — takes --type, --beat, --static, --component, --filed`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} takes a value`);
    out[argv[i].slice(2)] = argv[i + 1];
    i += 2;
  }
  for (const required of ["type", "beat", "static"]) if (!out[required]) throw new Error(`--${required} is required`);
  return out;
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const written = scaffoldBeat({ type: args.type, beat: args.beat, staticBeat: args.static, component: args.component, filed: Boolean(args.filed) });
    console.log(
      `scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\n` +
        `Next, IN THIS ORDER — the scaffold removed the typing, not the thinking:\n` +
        `  1. read skills/chart-web/references/types/${args.type}.md and the web beat it names\n` +
        `  2. argue the gesture in BRIEF.md — no code before it, and not a neighbour's gesture\n` +
        `  3. then the SCAFFOLD holes (grep -n SCAFFOLD ${args.beat})\n`,
    );
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
