/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The failure this defends against: a handover between two drawings of the SAME screen object —
 * a short label and the sentence it becomes, a plain mark and its accented form, a placeholder
 * texture and the true fill that replaces it — written as a CROSSFADE instead of a cut. The shape
 * in the source is always two sibling nodes at one anchor with `A * (1 - c)` on one and `A * c` on
 * the other, so for the whole width of the transition BOTH are painted, superimposed, at partial
 * opacity. What a reader sees is a duplicate ("65 countries, 75–80 yea65 — the most of any span",
 * measured at frame 158 of `vidy-histogram-life-expectancy`), a double exposure (a grey `4.67M`
 * ghost sitting over `65+` at frame 268 of the pyramid), or two opaque fills compositing to a
 * third colour nobody chose — the twin's first invariant broken in the most literal way available.
 *
 * The owner reported two of these. The spec that ordered the work counted thirteen in eight files.
 * This guard, written before any fix, printed THIRTY-SEVEN distinct sites across TWELVE beats
 * against the tree as it stood — the spec had listed the ten label pairs and three of the shape
 * pairs, and had not looked for the same idiom on the MARKS: a neutral bar with an accent bar
 * dissolving over it (histogram, waterfall, column ranking, lollipop stem and dot), a grid of
 * empty cells with a grid of filled cells fading in over it (heatmap), a country's dot texture
 * with its true fill fading in over it (choropleth, on every one of its 41 shapes). Two rules in
 * the doctrine already forbade the class
 * (`twin-doctrine/references/motion-grammar.md:108`, "a label's reveal gates on its own mark,
 * never on a master clock", and the anti-pattern at `:159`, "the accent before the thing it
 * accents") and one correct implementation already existed
 * (`vidy-heatmap-renewables-europe/HeatmapVideo.tsx`'s outline grid inside a single
 * `<g opacity={axisOpacity}>`). Nothing walked, so nothing travelled.
 *
 * WHY IT READS A RENDERED DOCUMENT AND NOT SOURCE TEXT. The sites are correctly
 * different from one another — different components, different props, different arithmetic — and
 * each is wrong on its own terms. A source-text parity guard over them either passes everything
 * or turns red for a correct change, which is `helper-parity.test.ts`'s failure exactly. So this
 * one evaluates the beat's ACTUAL arithmetic: `mock.module` replaces `useCurrentFrame` and
 * `useVideoConfig` with stubs and leaves `interpolate`, `spring` and `Easing` real, the component
 * is server-rendered at a chosen frame with the beat's own committed props, and the assertions
 * read opacities off the resulting document. It walks every `proof/<beat>` folder holding a
 * capitalised `…Video.tsx`, and takes no list:
 * a thirty-eighth crossfade in a beat written next month is the failure it exists to prevent.
 *
 * WHAT IT CHECKS, exactly. Per beat: the frames of `reveal`, `subject` and `conclusion` (each
 * padded by one frame either side) plus frame 0, sampled at STEP. Every node's EFFECTIVE opacity
 * is its own `opacity` attribute times every ancestor `<g opacity>` — these components nest, and
 * reading the leaf alone would miss half the corpus.
 *
 *   1. NO TWO PAINTED TEXTS SUPERIMPOSED. Texts are grouped by baseline, banded at one
 *      line-height, paired only where their INK ACTUALLY OVERLAPS, and each one's slope is taken
 *      across consecutive sampled frames. It fails when one band, at one frame, holds a text whose
 *      opacity is RISING beside another painted text that is NOT rising with it — held or falling,
 *      both at >= PAINTED.
 *
 *      The slope is what makes this precise and it was not obvious. A rule of "two painted texts
 *      in one band" fails a legitimate row of tick labels fading in together —
 *      `HeatmapVideo.tsx:463-476` fades fifteen column headers on one `axisOpacity`, all rising,
 *      all correct. So what is let through is a band whose texts MOVE TOGETHER. A cut puts one
 *      text in the band; opacities that sum to one with a hard boundary put one text in the band
 *      at every frame including the boundary.
 *
 *      It used to require one of the two to be FALLING, and that was a hole: mount both and HOLD
 *      the outgoing one at 1.0 and nothing fired, while the reader sees a worse double exposure
 *      than a fading one. See the mutation ledger at the foot of this header.
 *
 *   2. NO CROSSFADING SHAPE. Every `<path>`, `<circle>`, `<rect>`, `<line>` and `<ellipse>` is
 *      keyed by its geometry AND its place — `d`, or `cx|cy|r`, or `x|y|width|height`, plus the
 *      accumulated ancestor translate, because `mapgen-choropleth-video` draws one identical
 *      arrowhead per legend marker under two different translates and they are two objects, not
 *      one. A group of two or more nodes on one key fails when BOTH of the following hold:
 *
 *        - the group is mid-transition — no group at the next frame holds the same styles at the
 *          same opacities, and none holds the same styles in the same RATIOS. The ratio test is
 *          what lets a settled pair through: `mapgen-flowmap-video:381-394` draws its route twice,
 *          a ground-coloured 6px casing at 0.85 under a 3px accent stroke, permanently — and
 *          `HeatmapVideo`'s subject wash at 0.08 rides under its own 4px outline at 1.0 on ONE
 *          spring. Neither is a handover, and both keep their ratios;
 *        - and `handoverReason` names the channel it is happening on (see that function).
 *
 *      This states, and enforces, the rule that an outline and its fill are one node — SVG gives a
 *      single node both `stroke` and `fill`, and drawing them as two is what created
 *      `map-quake-symbol`'s seventeen empty rings at frame 40.
 *
 *   3. FRAME 0 IS FURNITURE ONLY. At frame 0 every non-`<text>` node — including a plate `<img>`'s
 *      inline `style` opacity — is at effective opacity < PAINTED, at least two `<text>` nodes are
 *      at >= 0.98, AND the largest type in the frame-0 document is one of them. The last of the
 *      three is what makes the check about the TITLE rather than about a count: a source credit
 *      that wraps onto two lines satisfies "at least two" on its own, so a poster frame with no
 *      title passed. This closes blind spot 1 of `video-first-frame-not-empty.test.ts`, which
 *      its own header names: "WHAT is on frame 0 — only that something is." It does not replace
 *      that guard, which decodes the delivered mp4; it makes it specific, on the component.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. FRAMES BETWEEN THE SAMPLED WINDOWS. `establish`, `reference` and `hold` are not walked. A
 *    crossfade written into a hold would pass. The three windows walked are the three in which a
 *    handover can occur by the timing grammar's own ordering rule.
 * 2. A SINGLE NODE WHOSE OPACITY IS WRONG. Both text and shape assertions compare PAIRS. One
 *    badly-timed label, alone at its anchor, is invisible here.
 * 3. WHETHER THE CUT LANDS AT THE RIGHT FRAME. It proves the handover is a cut; it never proves
 *    the beat chose a good moment for it. That stays a person opening the mp4.
 * 4. THE STATIC AND WEB SIBLINGS. Only compositions with a frame are walked. The same defect in a
 *    static beat's SVG is not reachable from here.
 * 5. TWO TEXTS ON ONE BASELINE WHOSE INK DOES NOT OVERLAP. Banding is by baseline and by measured
 *    ink interval (see `sameBand`), so a label on the far left and one on the far right of the
 *    same row do not pair. That is deliberate — they are not superimposed and a reader does not
 *    see a duplicate — but it means a crossfade between two forms that do not share their anchor
 *    is not found. It is also load-bearing in the other direction: a y-axis tick label and a long
 *    conclusion sentence on the same baseline are not a defect, and the earlier "reach" heuristic,
 *    derived from the LONGER of the two strings, reported them as one.
 * 6. GEOMETRY THAT MOVES. Assertion 2 keys on exact geometry. A crossfade between a shape and a
 *    slightly-offset copy of itself is a different key and is not paired.
 * 7. A LAYOUT MEASURED SOMEWHERE ELSE. Every beat's own `measureText` asks a browser canvas and
 *    falls back to `length * fontSize * 0.5` when there is none. Under this guard there is none,
 *    so the metric below is supplied instead — Helvetica's own AFM advances, regular and bold.
 *    It is close to Chrome's, not identical to it: a beat whose layout assertion has less than a
 *    percent of clearance could throw here while rendering correctly in Remotion. Two did, at
 *    different fallbacks, which is how the table came to be written. Such a throw fails this
 *    guard loudly with the beat's own message; it is not silently swallowed.
 *
 * MUTATION-PROVED. The strongest available proof was used first: the guard was written BEFORE any
 * fix and printed its sites red across the corpus, each by name and frame, against the tree as it
 * stood — a mutation proof run on real defects rather than synthetic ones. They were then fixed one
 * beat at a time and the list shrank to zero. (The number recorded here was "thirty-seven across
 * twelve beats"; re-running the shipped guard against `git archive 5873c5e0^` reproduces
 * **36 sites across 9 beats**, which is what a reader should hold.)
 *
 * On top of that, the injected mutations below, each run in a copy of the tree under `/tmp` and
 * never here (several agents share this working tree). The first three were recorded with the
 * original guard; **two of those three did not reproduce**, and the two holes they exposed are
 * closed above — the fourth, fifth and sixth rows are their replacements, re-run 2026-08-11 and
 * pasted verbatim.
 *
 *   - `HistogramVideo.tsx`'s two `opacity={valueOpacity}` / `opacity={conclusionOpacity}` nodes
 *     restored -> RED, naming `vidy-histogram-life-expectancy`, frame 155, and both strings.
 *   - `QuakeSymbolVideo.tsx`'s merged mark split back into an outline node and a fill node -> RED,
 *     naming the geometry key and the frame.
 *   - `ChoroplethVideo.tsx`'s title re-gated on `furniture` -> WAS GREEN. It is the reason the
 *     largest-type check exists; see assertion 3. Now:
 *
 *       frame 0 draws its largest type (38px, "Poland's per-capita CO₂ emissions are more than"
 *       at 0.000; "double Sweden's, despite both being EU member" at 0.000; "states." at 0.000)
 *       below full opacity — the title is the poster frame's whole job and it must not be gated
 *       on `establish`, whose progress at frame 0 is exactly 0
 *
 *   - pre-fix `LollipopVideo.tsx` with the accent stem's `strokeWidth` changed from 4 to 5 -> WAS
 *     GREEN FOR THAT SITE (4 sites became 3, crossfade untouched). It is the reason the stroke rule
 *     no longer compares widths. Now:
 *
 *       frame 185: 2 nodes share the geometry line:255.884|619.14|528.77|619.14@+0.00 at moving
 *       opacities (1.000, 0.111) — 2 of them stroke it in an ink of their own (#616161 at 4 under
 *       #0B7A75 at 5) and dissolve into each other.
 *
 *   - both of `HistogramVideo.tsx`'s labels mounted, with the OUTGOING one HELD at 1.0 instead of
 *     faded -> WAS GREEN, 26 pass / 0 fail, while an SSR probe printed `1.000 "65"` over
 *     `0.943 "65 countries, …"` — the owner's B6.4 exactly. It is the reason assertion 1 no longer
 *     requires a fall. Now:
 *
 *       frame 155: two texts are painted over each other on baseline y≈372 — "65" is HELD at 1.000
 *       while "65 countries, 75–80 years — the most of any span" is rising (0.111 → 0.213).
 *
 *   - the widened stroke rule, run against the corpus, found ONE real site nothing had seen:
 *     `vidz-bump-emitter-rank` drew the subject's track twice — `#616161` at 3 held at 1.000 with
 *     `#0B7A75` at 5 dissolving over it on `emphasis`, under a comment calling it "redrawn on top
 *     in accent and heavier". It is now a cut (the neutral copy is unmounted at the same boundary
 *     the accent copy is mounted), which keeps the z-order the type sheet asks for.
 */
import { describe, it, expect, mock } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TWIN_ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF_ROOT = join(TWIN_ROOT, "proof");

/** Below this an element contributes nothing a reader can see. */
const PAINTED = 0.02;

/**
 * A slope smaller than this is arithmetic noise, not a fade. `interpolate` over a 22-frame window
 * moves ~0.045 per frame at its slowest, so this is two orders of magnitude below a real fade.
 */
const SLOPE_EPSILON = 1e-4;

/**
 * Frames are sampled every STEP. The shortest handover window in the corpus is 18 frames
 * (`subject` in `life-expectancy`), so a step of 2 cannot straddle one. Never raise this without
 * re-measuring the shortest window.
 */
const STEP = 2;

// ---------------------------------------------------------------------------------------------
// The Remotion stub. `interpolate`, `spring` and `Easing` stay real, so every assertion below is
// evaluated against the beat's own arithmetic rather than a paraphrase of it. `AbsoluteFill` and
// `Img` become a `div` and an `img`, which is what makes a plate's inline `style.opacity` visible.
// ---------------------------------------------------------------------------------------------

let FRAME = 0;
let CONFIG = { fps: 30, width: 1080, height: 1080, durationInFrames: 240 };

const realRemotion = await import("remotion");
const React = await import("react");

mock.module("remotion", () => ({
  ...realRemotion,
  useCurrentFrame: () => FRAME,
  useVideoConfig: () => ({
    ...CONFIG,
    id: "beat",
    defaultProps: {},
    props: {},
  }),
  AbsoluteFill: (props: any) =>
    React.createElement(
      "div",
      { ...props, style: { position: "absolute", ...(props.style ?? {}) } },
      props.children,
    ),
  Img: (props: any) => React.createElement("img", props),
  Sequence: (props: any) => React.createElement("div", {}, props.children),
}));

const { renderToStaticMarkup } = await import("react-dom/server");

// ---------------------------------------------------------------------------------------------
// A text metric, because half the corpus WRAPS its own title and asserts that the result fits.
//
// Every beat carries its own `measureText`, which asks a browser canvas for the width and falls
// back to `text.length * fontSize * 0.5` when there is no `document`. Under this guard there is
// none, and that fallback is far enough from Helvetica's real advances that
// `mapvid-hexgrid-quakes` wrapped its conclusion onto an extra line and threw its own layout
// assertion — a beat that renders correctly in Remotion's Chrome, reported as broken by the
// instrument rather than by the tree. So the guard supplies the measurement instead of leaving it
// to a guess: the table below is Helvetica's own AFM advance widths in units of 1/1000 em, and a
// bold face has its own table rather than a multiplier — a blanket +6% overstated a numeric label
// by 5% (Helvetica-Bold's digits, space and period are the SAME width as the regular face's, only
// its letters are wider) and threw `vidy-waterfall-germany-electricity-mix`'s own clearance
// assertion. With both tables every beat in the corpus renders.
// ---------------------------------------------------------------------------------------------

const HELVETICA_ADVANCE: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  _: 556,
  "`": 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
};

const HELVETICA_BOLD_ADVANCE: Record<string, number> = {
  " ": 278,
  "!": 333,
  '"': 474,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 722,
  "'": 238,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 333,
  ";": 333,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 611,
  "@": 975,
  A: 722,
  B: 722,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 556,
  K: 722,
  L: 611,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 333,
  "\\": 278,
  "]": 333,
  "^": 584,
  _: 556,
  "`": 333,
  a: 556,
  b: 611,
  c: 556,
  d: 611,
  e: 556,
  f: 333,
  g: 611,
  h: 611,
  i: 278,
  j: 278,
  k: 556,
  l: 278,
  m: 889,
  n: 611,
  o: 611,
  p: 611,
  q: 611,
  r: 389,
  s: 556,
  t: 333,
  u: 611,
  v: 556,
  w: 778,
  x: 556,
  y: 556,
  z: 500,
  "{": 389,
  "|": 280,
  "}": 389,
  "~": 584,
};

function helveticaWidth(text: string, fontPx: number, bold: boolean): number {
  const table = bold ? HELVETICA_BOLD_ADVANCE : HELVETICA_ADVANCE;
  let units = 0;
  for (const ch of text) units += table[ch] ?? (bold ? 611 : 556);
  return (units / 1000) * fontPx;
}

const textMetricStub = {
  createElement: () => ({
    getContext: () => ({
      font: "",
      measureText(text: string) {
        const m = /(\d+(?:\.\d+)?)px/.exec(String(this.font));
        const size = m ? Number.parseFloat(m[1]) : 16;
        return {
          width: helveticaWidth(
            text,
            size,
            /^\s*[6-9]00\b/.test(String(this.font)),
          ),
        };
      },
    }),
  }),
};

// ---------------------------------------------------------------------------------------------
// A minimal SVG/HTML walker. No DOM library is a dependency of this repository, and the markup
// react-dom/server emits is well-formed, so a tokenizer with an ancestor stack is enough — and it
// is what lets the guard compute EFFECTIVE opacity, which is the whole point.
// ---------------------------------------------------------------------------------------------

type Drawn = {
  tag: string;
  attrs: Record<string, string>;
  opacity: number;
  /** Baseline in the composition's own coordinates, after ancestor translates. */
  y: number;
  x: number;
  /** Non-translate transforms in the ancestor chain; two nodes only pair inside the same one. */
  frameCtx: string;
  /** Accumulated ancestor translate. Two identical `d` strings under different translates are two
   *  different objects — `mapgen-choropleth-video` draws one arrowhead per legend marker that way. */
  tx: number;
  ty: number;
  text: string;
  fontSize: number;
};

const VOID_TAGS = new Set([
  "img",
  "br",
  "hr",
  "input",
  "meta",
  "link",
  "use",
  "stop",
  "source",
]);

const SHAPE_TAGS = new Set([
  "path",
  "circle",
  "rect",
  "line",
  "ellipse",
  "polygon",
  "polyline",
]);

/**
 * Nothing inside one of these is drawn — it is a definition another node references. Missing this
 * cost the first draft of this guard 46 phantom "painted" nodes on `mapgen-choropleth-video`
 * alone: the 9 x 9 tiles of its own `pending` hatch pattern, sitting inside `<defs>`.
 */
const NOT_DRAWN_INSIDE = new Set([
  "defs",
  "clippath",
  "pattern",
  "mask",
  "symbol",
  "marker",
  "lineargradient",
  "radialgradient",
  "filter",
]);

function attrsOf(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out[m[1]] = m[2];
  return out;
}

/** Own opacity: the `opacity` attribute, times an inline `style` opacity if there is one. */
function ownOpacity(attrs: Record<string, string>): number {
  let o = 1;
  if (attrs.opacity !== undefined) {
    const v = Number.parseFloat(attrs.opacity);
    if (Number.isFinite(v)) o *= v;
  }
  const style = attrs.style;
  if (style) {
    const m = /(?:^|;)\s*opacity\s*:\s*([0-9.]+)/.exec(style);
    if (m) o *= Number.parseFloat(m[1]);
    if (/(?:^|;)\s*display\s*:\s*none/.test(style)) o = 0;
  }
  return o;
}

function translateOf(transform: string | undefined): {
  tx: number;
  ty: number;
  other: string;
} {
  if (!transform) return { tx: 0, ty: 0, other: "" };
  let tx = 0;
  let ty = 0;
  let other = "";
  const re = /([a-zA-Z]+)\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(transform))) {
    const fn = m[1];
    const args = m[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (fn === "translate") {
      tx += args[0] ?? 0;
      ty += args[1] ?? 0;
    } else other += `${fn}(${m[2]})`;
  }
  return { tx, ty, other };
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  "#x27": "'",
  nbsp: " ",
};

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (whole, name) => {
    if (ENTITIES[name]) return ENTITIES[name];
    if (name.startsWith("#x"))
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#"))
      return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return whole;
  });
}

/**
 * Walks the markup and returns every drawn node with its effective opacity, its baseline in
 * composition coordinates, and — for a `<text>` — the string it prints, `<tspan>`s flattened.
 */
function drawnNodes(markup: string): {
  nodes: Drawn[];
  width: number;
  height: number;
} {
  const out: Drawn[] = [];
  let rootWidth = 0;
  let rootHeight = 0;
  type StackEntry = {
    tag: string;
    opacity: number;
    tx: number;
    ty: number;
    ctx: string;
    fontSize: number;
    inDefinition: boolean;
  };
  const stack: StackEntry[] = [
    {
      tag: "#root",
      opacity: 1,
      tx: 0,
      ty: 0,
      ctx: "",
      fontSize: 16,
      inDefinition: false,
    },
  ];

  const tagRe = /<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  let pendingText: { node: Drawn; from: number } | null = null;

  while ((m = tagRe.exec(markup))) {
    const whole = m[0];
    const tag = m[1].toLowerCase();
    const rawAttrs = m[2];
    const selfClosing = m[3] === "/" || VOID_TAGS.has(tag);
    const closing = whole.startsWith("</");

    if (closing) {
      if (pendingText && tag === "text") {
        pendingText.node.text = decode(
          markup.slice(pendingText.from, m.index).replace(/<[^>]*>/g, ""),
        ).trim();
        pendingText = null;
      }
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const attrs = attrsOf(rawAttrs);
    const top = stack[stack.length - 1];
    const { tx, ty, other } = translateOf(attrs.transform);
    const effOpacity = top.opacity * ownOpacity(attrs);
    if (rootWidth === 0 && (tag === "svg" || tag === "div")) {
      rootWidth = Number.parseFloat(attrs.width ?? "0") || 0;
      rootHeight = Number.parseFloat(attrs.height ?? "0") || 0;
    }
    const fontSize = attrs["font-size"]
      ? Number.parseFloat(attrs["font-size"])
      : top.fontSize;
    const ctx = top.ctx + other;
    const inDefinition = top.inDefinition || NOT_DRAWN_INSIDE.has(tag);

    if (
      !inDefinition &&
      (tag === "text" || SHAPE_TAGS.has(tag) || tag === "img")
    ) {
      const node: Drawn = {
        tag,
        attrs,
        opacity: effOpacity,
        x: (Number.parseFloat(attrs.x ?? attrs.cx ?? "0") || 0) + top.tx + tx,
        y: (Number.parseFloat(attrs.y ?? attrs.cy ?? "0") || 0) + top.ty + ty,
        frameCtx: ctx,
        tx: top.tx + tx,
        ty: top.ty + ty,
        text: "",
        fontSize,
      };
      out.push(node);
      if (tag === "text" && !selfClosing)
        pendingText = { node, from: tagRe.lastIndex };
    }

    if (!selfClosing)
      stack.push({
        tag,
        opacity: effOpacity,
        tx: top.tx + tx,
        ty: top.ty + ty,
        ctx,
        fontSize,
        inDefinition,
      });
  }
  return { nodes: out, width: rootWidth, height: rootHeight };
}

/**
 * The ground plane — a rect the size of the whole composition, painted in the house ground before
 * anything else. It is not the field: `video-first-frame-not-empty.test.ts` takes exactly this
 * colour as the frame's ground when it measures what is drawn on top of it.
 */
function isGroundPlane(n: Drawn, width: number, height: number): boolean {
  if (n.tag !== "rect" || width === 0) return false;
  const x = Number.parseFloat(n.attrs.x ?? "0");
  const y = Number.parseFloat(n.attrs.y ?? "0");
  const w = Number.parseFloat(n.attrs.width ?? "0");
  const h = Number.parseFloat(n.attrs.height ?? "0");
  return x === 0 && y === 0 && w >= width && h >= height;
}

/**
 * A shape with no area paints nothing whatever its opacity says. A bar chart at frame 0 is a row
 * of zero-height rects; counting them as drawn would report every column beat as painting its
 * field on the poster frame, which is the opposite of the truth.
 */
function hasNoArea(n: Drawn): boolean {
  const num = (v: string | undefined) => Number.parseFloat(v ?? "0") || 0;
  if (n.tag === "rect")
    return num(n.attrs.width) <= 0 || num(n.attrs.height) <= 0;
  if (n.tag === "circle") return num(n.attrs.r) <= 0;
  if (n.tag === "ellipse") return num(n.attrs.rx) <= 0 || num(n.attrs.ry) <= 0;
  if (n.tag === "line")
    return (
      num(n.attrs.x1) === num(n.attrs.x2) && num(n.attrs.y1) === num(n.attrs.y2)
    );
  if (n.tag === "path") return !n.attrs.d || n.attrs.d.trim().length === 0;
  return false;
}

/**
 * How a node is drawn, ignoring where. Two nodes of one geometry group are matched across a frame
 * pair by the SET of these, because a growing bar's geometry changes every frame while the pair of
 * roles drawing it does not.
 */
function styleKey(n: Drawn): string {
  const a = n.attrs;
  return [
    n.tag,
    a.fill ?? "",
    a["fill-opacity"] ?? "",
    a.stroke ?? "",
    a["stroke-width"] ?? "",
    a["stroke-dasharray"] ?? "",
  ].join("|");
}

/** A shape's identity: two nodes carrying this same key are two drawings of one object. */
function geometryKey(n: Drawn): string | null {
  const a = n.attrs;
  const at = `@${n.frameCtx}+${n.tx.toFixed(2)},${n.ty.toFixed(2)}`;
  if (n.tag === "path") return a.d ? `path:${a.d}${at}` : null;
  if (n.tag === "circle" || n.tag === "ellipse")
    return `${n.tag}:${a.cx ?? ""}|${a.cy ?? ""}|${a.r ?? ""}|${a.rx ?? ""}|${a.ry ?? ""}${at}`;
  if (n.tag === "rect")
    return `rect:${a.x ?? ""}|${a.y ?? ""}|${a.width ?? ""}|${a.height ?? ""}${at}`;
  if (n.tag === "line")
    return `line:${a.x1 ?? ""}|${a.y1 ?? ""}|${a.x2 ?? ""}|${a.y2 ?? ""}${at}`;
  if (n.tag === "polygon" || n.tag === "polyline")
    return a.points ? `${n.tag}:${a.points}${at}` : null;
  return null;
}

/** A text's horizontal ink interval, from its own anchor and its own measured advance. */
function inkSpan(n: Drawn): [number, number] {
  const w = helveticaWidth(
    n.text,
    n.fontSize,
    Number.parseFloat(n.attrs["font-weight"] ?? "400") >= 600,
  );
  const anchor = n.attrs["text-anchor"] ?? "start";
  const left =
    anchor === "middle" ? n.x - w / 2 : anchor === "end" ? n.x - w : n.x;
  return [left, left + w];
}

/**
 * Two texts are in one band when they share a baseline within one line-height AND THEIR INK
 * ACTUALLY OVERLAPS. The horizontal test is what keeps a legitimate row of labels — an axis, a
 * legend — from pairing across the width of the frame.
 *
 * It used to compare the two anchors against a `reach` derived from the LONGER of the two strings,
 * which is not the same thing at all: a rising 38-character sentence "reached" far enough to band
 * with a two-character y-axis tick label at the other end of the plot, on the opposite anchor.
 * That cost nothing while assertion 1 also demanded one text be FALLING — no tick label falls —
 * and it produced an immediate false report the moment a HELD text could pair. Overlapping
 * intervals is what "superimposed" means, and both terms are already measurable here.
 */
function sameBand(a: Drawn, b: Drawn): boolean {
  const lead = Math.max(a.fontSize, b.fontSize) * 0.7;
  if (Math.abs(a.y - b.y) > lead) return false;
  if (a.frameCtx !== b.frameCtx) return false;
  const [al, ar] = inkSpan(a);
  const [bl, br] = inkSpan(b);
  return Math.min(ar, br) - Math.max(al, bl) > 0;
}

/** Every set of two or more painted nodes drawing the same geometry, in document order. */
function geometryGroups(
  nodes: Drawn[],
  width: number,
  height: number,
): Drawn[][] {
  const byGeometry = new Map<string, Drawn[]>();
  for (const n of nodes) {
    if (n.tag === "text" || n.opacity < PAINTED) continue;
    if (hasNoArea(n) || isGroundPlane(n, width, height)) continue;
    const key = geometryKey(n);
    if (!key) continue;
    const list = byGeometry.get(key) ?? [];
    list.push(n);
    byGeometry.set(key, list);
  }
  return [...byGeometry.values()].filter((list) => list.length >= 2);
}

/**
 * A geometry group's fingerprint: how its members are drawn, and at what opacities. Two frames'
 * groups are the same drawing when the fingerprints match — which is what lets a growing bar, whose
 * geometry key changes every frame, still be followed.
 */
function signatureOf(group: Drawn[]): {
  entries: string[];
  styles: string;
  vector: number[];
  shape: string;
  spread: number;
} {
  const vector = group.map((n) => n.opacity).sort((a, b) => b - a);
  const top = vector[0] || 1;
  return {
    entries: group.map((n) => `${styleKey(n)}@${n.opacity.toFixed(3)}`).sort(),
    styles: group.map(styleKey).sort().join(" ~ "),
    vector,
    // The group's opacity RATIOS, not its opacities. Two marks driven by one spring at different
    // depths — `HeatmapVideo.tsx`'s subject wash at 0.08 under its 4px outline at 1.0 — move
    // together and keep this constant; a handover does not.
    shape: vector.map((v) => (v / top).toFixed(3)).join(","),
    spread: vector[0] - vector[vector.length - 1],
  };
}

const paintsInterior = (n: Drawn) =>
  n.attrs.fill !== undefined &&
  n.attrs.fill !== "none" &&
  n.attrs["fill-opacity"] !== "0";
const paintsStroke = (n: Drawn) =>
  n.attrs.stroke !== undefined && n.attrs.stroke !== "none";

/**
 * Not every pair of nodes on one geometry is a handover, and the difference is what took the
 * longest to get right here. Three shapes are LEGITIMATE and all three are in this corpus:
 *
 *   - a casing under a line — `mapgen-flowmap-video:381-394` draws the travelled route twice, a
 *     ground-coloured 6px halo under a 3px accent stroke, so the route reads over any basemap;
 *   - a fill and a stroke of one shape written as two nodes — `mapvid-locator-geneva:381-386`;
 *   - an EMPHASIS landing on a mark that is already drawn — `mapgen-choropleth-video:363-380`
 *     strokes the subject country over its own finished fill. That is the doctrine's correct
 *     order ("the accent AFTER the thing it accents"), and a guard that reddened it would be
 *     punishing the pattern it exists to require.
 *
 * So the defect is named by CHANNEL and by ORDER, not by "two nodes exist":
 *
 *   (a) two nodes paint the same INTERIOR — one fill dissolving into another composites to a
 *       third colour nobody chose, which is invariant 1;
 *   (b) two nodes paint the same STROKE — the same dissolve on the stroke channel.
 *       `LollipopVideo.tsx:505-524`'s own comment calls it "cross-dissolved";
 *   (c) a stroke-only node painted AHEAD of the interior it surrounds — the container before its
 *       contents. `QuakeSymbolVideo.tsx:212-235` is this, and it is what a reader saw as
 *       seventeen empty rings.
 *
 * (b) USED TO REQUIRE THE TWO WIDTHS TO BE EQUAL, and that was a hole with a demonstration.
 * Restoring the pre-fix `LollipopVideo.tsx` and changing only the accent stem's `strokeWidth` from
 * 4 to 5 dropped that site out of the report — 4 sites became 3 — with the crossfade untouched. A
 * plain thin stem handing over to a thicker accent stem is the same double exposure to a reader,
 * and the spec this guard implements is absolute about it: "two nodes with an identical geometry
 * key may never both be painted at effective opacity >= 0.02". The width equality was never an
 * argument, only an artefact of the one corpus case it was read off.
 *
 * The legitimate stroke pairs are still let through, and NOT by this function: a settled casing
 * under a line keeps a fixed opacity ratio every frame, and the caller's own ratio test skips it
 * before it ever gets here (`mapgen-flowmap-video`'s 6px halo under its 3px accent is exactly
 * that pair, at two DIFFERENT widths — so the old rule was not what was protecting it either).
 */
function handoverReason(group: Drawn[], ground: string | null): string | null {
  const interiors = group.filter(paintsInterior);
  if (interiors.length >= 2)
    return `${interiors.length} of them paint the interior (fill ${interiors
      .map((n) => n.attrs.fill)
      .join(" over ")})`;
  // Two INKS on one geometry. A stroke painted in the ground colour is a casing, not an ink: its
  // job is to hold the mark off what is beneath it, and a casing under (or over) its own line is
  // the corpus's own named legitimate pair. Everything else that carries a stroke is an ink, at
  // any width.
  const inkStrokes = group.filter(
    (n) => paintsStroke(n) && (n.attrs.stroke ?? "").toLowerCase() !== ground,
  );
  if (inkStrokes.length >= 2) {
    const drawn = inkStrokes.map(
      (n) => `${n.attrs.stroke} at ${n.attrs["stroke-width"] ?? "(no width)"}`,
    );
    return `${inkStrokes.length} of them stroke it in an ink of their own (${drawn.join(" under ")}) and dissolve into each other`;
  }
  if (interiors.length === 1) {
    const inside = interiors[0];
    const ahead = group.find(
      (n) => !paintsInterior(n) && n.opacity > inside.opacity + SLOPE_EPSILON,
    );
    if (ahead)
      return (
        `an outline is painted at ${ahead.opacity.toFixed(3)} while the fill it surrounds is only ` +
        `at ${inside.opacity.toFixed(3)} — the container arrives before its contents`
      );
  }
  return null;
}

/** The key under which a text is followed from one frame to the next. */
function textKey(n: Drawn): string {
  return `${n.text} ${n.attrs.fill ?? ""} ${n.attrs["text-anchor"] ?? ""} ${Math.round(n.y)}`;
}

// ---------------------------------------------------------------------------------------------
// Discovery. Every proof beat holding a capitalised `…Video.tsx`, its committed props, and its
// timing contract.
// ---------------------------------------------------------------------------------------------

type Beat = {
  name: string;
  componentFile: string;
  propsFile: string;
  timingFiles: string[];
};

function findProps(dir: string): string | null {
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && /props\.json$/.test(e.name)) hits.push(full);
    }
  };
  walk(dir);
  hits.sort();
  return hits[0] ?? null;
}

const beats: Beat[] = readdirSync(PROOF_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((e) => {
    const dir = join(PROOF_ROOT, e.name);
    const component = readdirSync(dir).find((f) =>
      /^[A-Z].*Video\.tsx$/.test(f),
    );
    if (!component) return [];
    const props = findProps(dir);
    // A chart beat declares its `BeatTiming` in `timing-contract.ts`; a map beat copies the
    // vocabulary into `timing-contract.ts` and puts its own edit in `timing.ts`. Both shapes are
    // read rather than one being assumed, so neither genre drops out of the walk silently.
    const timing = [
      join(dir, "timing.ts"),
      join(dir, "timing-contract.ts"),
    ].filter((f) => existsSync(f));
    if (!props || timing.length === 0) return [];
    return [
      {
        name: e.name,
        componentFile: join(dir, component),
        propsFile: props,
        timingFiles: timing,
      },
    ];
  })
  .sort((a, b) => a.name.localeCompare(b.name));

type Window = { start: number; duration: number };
type Timing = {
  fps: number;
  total: number;
  reveal: Window;
  subject: Window;
  conclusion: Window;
};

async function loadTiming(files: string[]): Promise<Timing> {
  for (const file of files) {
    const mod: any = await import(file);
    for (const value of Object.values(mod))
      if (
        value &&
        typeof value === "object" &&
        typeof (value as any).fps === "number" &&
        typeof (value as any).total === "number"
      )
        return value as Timing;
  }
  throw new Error(
    `${files.join(" / ")} export no BeatTiming (an object with fps and total)`,
  );
}

async function loadComponent(file: string): Promise<any> {
  const mod: any = await import(file);
  for (const [name, value] of Object.entries(mod))
    if (/Video$/.test(name) && typeof value === "function") return value;
  throw new Error(`${file} exports no *Video component`);
}

function framesToSample(t: Timing): number[] {
  const set = new Set<number>([0, 1]);
  for (const w of [t.reveal, t.subject, t.conclusion]) {
    const from = Math.max(0, w.start - 1);
    const to = Math.min(t.total - 1, w.start + w.duration + 1);
    for (let f = from; f <= to; f += STEP) {
      set.add(f);
      set.add(Math.min(t.total - 1, f + 1));
    }
  }
  return [...set].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------

describe("a handover between two drawings of one object is a cut, never a crossfade", () => {
  it("should find the video beats under proof/ — a rename must not empty this guard", () => {
    expect(beats.length).toBeGreaterThanOrEqual(20);
  });

  for (const beat of beats) {
    it(`should hand over with a cut in proof/${beat.name}`, async () => {
      const timing = await loadTiming(beat.timingFiles);
      const Component = await loadComponent(beat.componentFile);
      const props = JSON.parse(readFileSync(beat.propsFile, "utf8"));
      // The beat's OWN recorded ground, from its own committed props — the colour a casing is
      // painted in. Read here rather than guessed off a background rect, because not every
      // composition draws one.
      const ground: string | null =
        typeof props.ground === "string" ? props.ground.toLowerCase() : null;
      CONFIG = {
        fps: timing.fps,
        width: props.width ?? 1080,
        height: props.height ?? 1080,
        durationInFrames: timing.total,
      };

      type Painted = { nodes: Drawn[]; width: number; height: number };
      const rendered = new Map<number, Painted>();
      const render = (frame: number): Painted => {
        const cached = rendered.get(frame);
        if (cached) return cached;
        FRAME = frame;
        // The metric is installed only around the render, and restored after, so no other file in
        // this suite inherits a `document` it never asked for.
        const hadDocument = "document" in globalThis;
        const previous = (globalThis as any).document;
        (globalThis as any).document = textMetricStub;
        try {
          const painted = drawnNodes(
            renderToStaticMarkup(React.createElement(Component, props)),
          );
          rendered.set(frame, painted);
          return painted;
        } finally {
          if (hadDocument) (globalThis as any).document = previous;
          else delete (globalThis as any).document;
        }
      };

      const failures: string[] = [];
      const frames = framesToSample(timing);

      // --- assertion 3: frame 0 is furniture only -------------------------------------------
      const zero = render(0);
      const atZero = zero.nodes;
      const paintedField = atZero.filter(
        (n) =>
          n.tag !== "text" &&
          n.opacity >= PAINTED &&
          !hasNoArea(n) &&
          !isGroundPlane(n, zero.width, zero.height),
      );
      if (paintedField.length > 0) {
        const sample = paintedField
          .slice(0, 3)
          .map(
            (n) =>
              `<${n.tag} ${geometryKey(n) ?? n.attrs.src ?? ""}> at ${n.opacity.toFixed(3)}`,
          );
        failures.push(
          `frame 0 paints ${paintedField.length} non-text node(s) — the field must be empty at 0:00 ` +
            `and only the title and source drawn. e.g. ${sample.join("; ")}`,
        );
      }
      const allText = atZero.filter((n) => n.tag === "text" && n.text);
      const fullText = allText.filter((n) => n.opacity >= 0.98);
      if (fullText.length < 2)
        failures.push(
          `frame 0 paints ${fullText.length} text node(s) at full opacity — the title and the ` +
            `source must be legible on the poster frame, not gated on \`establish\``,
        );
      // "At least two texts" is met by a source credit that wraps onto two lines, so a poster
      // frame carrying NO TITLE passed the count above. It was demonstrated: re-gating
      // `ChoroplethVideo.tsx`'s `titleLines` on `furniture` — this guard's own third recorded
      // proof — left it green, because the source line and its `OpenStreetMap` continuation are
      // two texts. So the title is identified rather than counted, by the one property it has in
      // every beat of this corpus: it is set in the LARGEST TYPE the frame-0 document carries.
      // The gated node is still IN that document, at opacity 0 and at its own font size, so
      // gating it is exactly what this sees.
      const biggest = Math.max(0, ...allText.map((n) => n.fontSize));
      const headline = allText.filter((n) => n.fontSize === biggest);
      if (biggest > 0 && !headline.some((n) => n.opacity >= 0.98))
        failures.push(
          `frame 0 draws its largest type (${biggest}px, ${headline
            .map((n) => `"${n.text}" at ${n.opacity.toFixed(3)}`)
            .join(
              "; ",
            )}) below full opacity — the title is the poster frame's whole job and it ` +
            `must not be gated on \`establish\`, whose progress at frame 0 is exactly 0`,
        );

      // --- assertions 1 and 2 ----------------------------------------------------------------
      for (let i = 0; i < frames.length - 1; i++) {
        const f = frames[i];
        const g = frames[i + 1];
        if (g !== f + 1) continue;
        const frame = render(f);
        const now = frame.nodes;
        const next = render(g).nodes;

        const nextByKey = new Map<string, number>();
        for (const n of next)
          if (n.tag === "text")
            nextByKey.set(
              textKey(n),
              Math.max(nextByKey.get(textKey(n)) ?? 0, n.opacity),
            );

        const texts = now.filter(
          (n) => n.tag === "text" && n.text && n.opacity >= PAINTED,
        );
        const sloped = texts.map((n) => ({
          node: n,
          slope: (nextByKey.get(textKey(n)) ?? 0) - n.opacity,
        }));
        for (let a = 0; a < sloped.length; a++)
          for (let b = a + 1; b < sloped.length; b++) {
            const A = sloped[a];
            const B = sloped[b];
            if (!sameBand(A.node, B.node)) continue;
            // The rule is the SPEC's rule — two drawings of one screen object may not both be
            // painted — not "one is falling while the other rises". Requiring a fall was a hole
            // with a demonstration: mount both of the histogram's labels and HOLD the outgoing
            // one at 1.0 instead of fading it, and an SSR probe at frame 170 prints
            //     1.000  "65"
            //     0.943  "65 countries, 75-80 years — the most of any span"
            // — the owner's B6.4 at its own anchor, and the guard reported 26 pass / 0 fail.
            // A held duplicate is a WORSE double exposure than a fading one, and it was the one
            // shape the pair test could not see.
            //
            // What still has to be let through is a band whose texts move TOGETHER: a legend row
            // fading up on one clock is not a handover. So the report is "one is rising while
            // another painted text in its band is not rising with it".
            const rising =
              A.slope > SLOPE_EPSILON ? A : B.slope > SLOPE_EPSILON ? B : null;
            if (!rising) continue;
            const other = rising === A ? B : A;
            if (other.slope > SLOPE_EPSILON) continue;
            const verb =
              other.slope < -SLOPE_EPSILON
                ? `is falling (${other.node.opacity.toFixed(3)} → ${(other.node.opacity + other.slope).toFixed(3)})`
                : `is HELD at ${other.node.opacity.toFixed(3)}`;
            failures.push(
              `frame ${f}: two texts are painted over each other on baseline y≈${Math.round(A.node.y)} — ` +
                `"${other.node.text}" ${verb} while "${rising.node.text}" ` +
                `is rising (${rising.node.opacity.toFixed(3)} → ` +
                `${(rising.node.opacity + rising.slope).toFixed(3)}). Mount one or the other, ` +
                `never both — \`{c > 0 ? <sentence/> : <short/>}\`.`,
            );
          }

        const groupsNow = geometryGroups(now, frame.width, frame.height);
        const groupsNext = geometryGroups(next, frame.width, frame.height).map(
          signatureOf,
        );
        for (const group of groupsNow) {
          const sig = signatureOf(group);
          // Arriving as ONE — a stroke and its fill drawn as two nodes at the same opacity, or a
          // pair fading up together. Not a handover; nothing composites to a colour nobody chose.
          if (sig.spread <= PAINTED) continue;
          // A settled pair — a casing under a line, drawn at a FIXED opacity ratio every frame —
          // still reads as one object arriving once. `mapgen-flowmap-video:381-394` is the corpus's
          // own example: a ground-coloured halo at 0.85 under an accent stroke, both permanent.
          // What separates it from a handover is that its ratio does not move.
          if (
            groupsNext.some((other) => {
              const held = new Set(other.entries);
              return sig.entries.every((entry) => held.has(entry));
            }) ||
            groupsNext.some(
              (other) =>
                other.styles === sig.styles && other.shape === sig.shape,
            )
          )
            continue;
          const reason = handoverReason(group, ground);
          if (!reason) continue;
          failures.push(
            `frame ${f}: ${group.length} nodes share the geometry ${(geometryKey(group[0]) ?? "").slice(0, 80)} ` +
              `at moving opacities (${sig.vector.map((v) => v.toFixed(3)).join(", ")}) — ${reason}. ` +
              `One object is drawn once: an outline and its fill are ONE node carrying both ` +
              `\`stroke\` and \`fill\`, and a plain form handing over to an accented one is ONE ` +
              `node whose \`fill\` switches.`,
          );
        }
      }

      // One defect spans every frame of its handover window, so the raw list is dozens of lines
      // saying the same thing. Collapse to DISTINCT sites — the message a person acts on names
      // each site once, with the first frame it appears on and how many frames it lasts.
      const sites = new Map<string, { first: string; frames: number }>();
      for (const line of failures) {
        const shape = line
          .replace(/frame \d+/g, "frame N")
          .replace(/[\d.]+/g, "#");
        const seen = sites.get(shape);
        if (seen) seen.frames += 1;
        else sites.set(shape, { first: line, frames: 1 });
      }
      const distinct = [...sites.values()];
      expect(
        distinct.length,
        `proof/${beat.name} hands over by crossfade — ${distinct.length} site(s):\n  ` +
          distinct
            .map((s) => `${s.first} [over ${s.frames} sampled frame(s)]`)
            .join("\n  "),
      ).toBe(0);
    }, 120_000);
  }
});
