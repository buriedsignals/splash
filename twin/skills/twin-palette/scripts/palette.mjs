// twin/skills/twin-palette/scripts/palette.mjs
//
// Dependency-free. Proposes a palette; never renders one, never writes one.
//
// The colour maths below (`channels`, `luminance`, `contrast`) is a VERBATIM copy of the block in
// `twin-chart-beat/scripts/render-still.mjs`. That is the canon here: a skill stays
// copy-pasteable on its own, so helpers are duplicated rather than imported. The risk that buys —
// silent divergence — is guarded by `splash-twin/test/helper-parity.test.ts`, which compares this
// copy against every other one in the tree.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const HEX = /^#[0-9a-fA-F]{6}$/;

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** WCAG 2.x relative luminance. */
function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, 1..21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG 2.2 SC 1.4.11 Non-text Contrast, Level AA: the visual information required to identify a
 * graphical object must clear 3:1 against its adjacent colour. A chart's accent IS that object —
 * the line, the bar, the highlighted circle — so 3:1 against the ground is the floor a proposal
 * has to clear before a journalist is asked to approve it.
 *
 * This is deliberately NOT 4.5:1. That threshold (SC 1.4.3) governs TEXT, and the beats already
 * meet it a different way: every word in a beat is drawn in `ink` or `muted`, both derived from
 * the ground by `deriveFurniture`, which escalates until it clears 4.5:1. Holding the accent to a
 * text threshold it never carries text at would reject perfectly legible house colours.
 */
export const NON_TEXT_CONTRAST_MIN = 3;

function toHex(values) {
  return "#" + values.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/**
 * The nearest variant of `colour` that clears `min` against `ground`, found by walking it toward
 * whichever pole the ground is NOT — darkening an accent on a light ground, lightening it on a
 * dark one — in 2% steps and stopping at the first step that passes.
 *
 * It returns a REMEDY, never a replacement. The caller shows the failing colour, says it fails,
 * and offers this beside it. A palette that silently swapped in the nearest passing colour would
 * put a hex nobody chose into a published chart, which is the one thing this skill exists to
 * prevent — and the journalist, seeing a colour that is not their brand, would have no way to
 * learn why.
 *
 * Returns `null` when no step passes. That is possible and must stay possible: on a mid-grey
 * ground (L around 0.18-0.22) nothing on either side of it clears 3:1 by a wide margin, and
 * saying so is more useful than shipping a near-miss.
 */
export function adjustToContrast(colour, ground, min = NON_TEXT_CONTRAST_MIN) {
  if (!HEX.test(colour)) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const towards = luminance(ground) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  const from = channels(colour);
  for (let step = 1; step <= 50; step++) {
    const candidate = toHex(from.map((v, i) => v + (towards[i] - v) * (step / 50)));
    if (contrast(candidate, ground) >= min) return candidate;
  }
  return null;
}

/**
 * Grounded subject conventions. Each entry is a convention a reader can be expected to already
 * hold, not a colour that felt right — see `references/subject-conventions.md` for the evidence
 * behind each one and for why the list is short.
 *
 * `match` is tested against the subject line the journalist wrote, lowercased. A subject that
 * matches nothing gets no subject option at all, and the house theme wins by default. Growing
 * this table with a convention nobody can point to a source for is the failure mode; a missing
 * entry costs a journalist one extra sentence, an invented one teaches a reader something false.
 */
export const SUBJECT_CONVENTIONS = [
  {
    id: "renewables",
    match: /\b(renewable|renewables?|solar|wind|photovoltaic|clean energy|énergies? renouvelables?|solaire|éolien)\b/,
    accent: "#1B7F4B",
    label: "renewable generation",
    reasoning:
      "Green reads as renewable generation before the legend is read. Energy trackers and climate desks use it consistently enough that a reader arrives already holding it.",
  },
  {
    id: "fossil",
    match: /\b(coal|lignite|fossil|oil|petroleum|charbon|fossile|pétrole)\b/,
    accent: "#3A3A3A",
    label: "coal and fossil fuel",
    reasoning:
      "Near-black grey reads as coal — the material's own colour. It also stays legible where a saturated hue would compete with the renewable green it is usually plotted against.",
  },
  {
    id: "water",
    match: /\b(water|river|rivers|rainfall|flood|precipitation|drought|eau|rivières?|pluie|inondation|sécheresse)\b/,
    accent: "#1F6FB2",
    label: "water",
    reasoning:
      "Blue for water is the single most reliably held colour association in the semantic-resonance study — the paper's own opening example.",
  },
  {
    id: "heat",
    match: /\b(heat|heatwave|temperature|warming|canicule|chaleur|température|réchauffement)\b/,
    accent: "#C1440E",
    label: "heat and warming",
    reasoning:
      "Warm red for rising temperature is the convention climate charts have taught readers for decades. On a series that runs both ways, this is the warm end only — a diverging scale is a different decision and this skill does not make it.",
  },
];

/**
 * Does the story's subject carry a convention a reader already holds?
 *
 * Returns the FIRST matching convention, and nothing when several match: a story about coal-fired
 * power replacing hydro is not two accents, it is a choice the journalist makes. Silently picking
 * the earlier entry in the table would be that choice made by table order.
 */
export function matchConvention(subject, conventions = SUBJECT_CONVENTIONS) {
  if (typeof subject !== "string" || !subject.trim()) return null;
  const text = subject.toLowerCase();
  const hits = conventions.filter((c) => c.match.test(text));
  return hits.length === 1 ? hits[0] : null;
}

function scoreOption(option) {
  const ratio = contrast(option.accent, option.ground);
  const passes = ratio >= NON_TEXT_CONTRAST_MIN;
  const remedy = passes ? null : adjustToContrast(option.accent, option.ground);
  return {
    ...option,
    contrast: { ratio: Math.round(ratio * 100) / 100, min: NON_TEXT_CONTRAST_MIN, passes },
    remedy: remedy && { accent: remedy, contrast: Math.round(contrast(remedy, option.ground) * 100) / 100 },
  };
}

/**
 * The proposal. Two possible options, each carrying WHERE its values came from and WHY, plus the
 * measured contrast of each — and always the third branch, "something else".
 *
 * It proposes; it never writes and never renders. `formatProposal` turns this into the question
 * the journalist actually answers, and `readPalette` reads back the answer they recorded. Nothing
 * here has a write path, not a commented-out one, not a flag that turns it on — the same rule
 * `twin-newsroom-charter` holds.
 */
export function proposePalette({ newsroom, subject } = {}) {
  const options = [];

  if (newsroom && newsroom.brandColor && newsroom.ground) {
    for (const field of ["brandColor", "ground"]) {
      if (!HEX.test(newsroom[field])) {
        throw new Error(`newsroom.${field} must be #rrggbb, got ${JSON.stringify(newsroom[field])}`);
      }
    }
    options.push(
      scoreOption({
        id: "house",
        origin: "newsroom",
        ground: newsroom.ground,
        accent: newsroom.brandColor,
        label: `${newsroom.name || "the newsroom"}'s house colours`,
        reasoning:
          "The chart reads as this newsroom's, beside everything else it publishes. This is the default whenever the subject carries no convention of its own.",
        provenance: `NEWSROOM.md — brandColor: ${newsroom.brandColor}, ground: ${newsroom.ground}`,
      }),
    );
  }

  const convention = matchConvention(subject);
  if (convention) {
    const ground = (newsroom && newsroom.ground) || "#FFFFFF";
    options.push(
      scoreOption({
        id: "subject",
        origin: "subject",
        ground,
        accent: convention.accent,
        label: `the ${convention.label} convention`,
        reasoning: convention.reasoning,
        provenance: `references/subject-conventions.md — ${convention.id}; ground kept from ${
          newsroom && newsroom.ground ? "NEWSROOM.md" : "the default white, because no NEWSROOM.md ground was given"
        }`,
      }),
    );
  }

  return {
    subject: subject || null,
    options,
    // The house option is recommended when it exists and passes. A subject convention is a reason
    // to DEPART from the house theme, offered as such — never applied over the journalist's head.
    recommended: options.find((o) => o.id === "house" && o.contrast.passes)?.id || options[0]?.id || null,
    escape: "Something else — give me the two hex codes and I will use those.",
  };
}

/**
 * Read the decision back.
 *
 * Looks for `PALETTE.md` in `dir`, then in each ancestor up to `stopAt` — so one decision recorded
 * at the story root serves every beat under it, and a beat that genuinely needs its own can hold
 * one beside its data. This is a LOOKUP path, not a colour fallback: nothing here invents a
 * colour, and a search that finds nothing throws naming every directory it looked in.
 *
 * The throw is the point. A render that silently defaulted to black-on-white when the decision was
 * missing would publish a chart in a colour no one chose, and it would look deliberate.
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
    `No PALETTE.md found for ${start}. Run twin-palette's proposal, let the journalist choose, ` +
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
  return { ground: record.ground, accent: record.accent, origin: record.origin, source };
}
