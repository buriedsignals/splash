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

/**
 * The other floor, and the relaxation that belongs to it rather than to the one above. 4.5:1 is
 * SC 1.4.3 and it governs WORDS; its own large-text relaxation drops to 3:1 at 24px, or 18.66px
 * bold, or larger. The number coincides with the non-text floor and the criterion does not, which
 * is exactly why `assertLegible` below makes a caller name the role instead of the number.
 */
export const TEXT_CONTRAST_MIN = 4.5;
export const LARGE_TEXT_CONTRAST_MIN = 3;

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
 * Returns `null` when no step passes — and MEASURED, not assumed, that never happens at the
 * default 3:1 floor. Swept over 4352 grounds (every one of the 256 greys plus a 16-step RGB
 * grid): zero nulls at `min` 3, zero at 4.5, the first at 5. The hardest ground found is `#747474`,
 * where the far pole lands at 3.0000809:1 — the mid-grey band is genuinely the tight spot, and it
 * still clears. That is not luck: `towards` switches poles at L = 0.18 precisely because both
 * poles clear 3:1 on either side of it, so the walk always terminates in a pass.
 *
 * The branch stays because `min` is a PARAMETER. A caller raising the floor can and does exhaust
 * the walk (340 of those same grounds at 5:1), and returning `null` says "this ground leaves no
 * room" rather than shipping a near-miss dressed as a pass. An earlier draft of this comment
 * claimed the mid-grey band produced nulls at 3:1; it does not, and the sweep above is why this
 * one states a number instead.
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

/**
 * Every house accent a `NEWSROOM.md` records, primary first: `brandColor`, then whatever `accents`
 * adds, de-duped, malformed entries refused by name.
 *
 * This is a DUPLICATE of `splash-twin/scripts/newsroom.mjs`'s `newsroomAccents`, deliberately: a
 * skill stays copy-pasteable on its own, so helpers are duplicated rather than imported (the same
 * rule the colour maths above follows). The two are held in step behaviourally, over a table of
 * profiles, by `test/palette.test.ts` — the divergence that buys is the whole reason that test
 * exists.
 *
 * It THROWS on a malformed accent rather than dropping it. `proposePalette` already throws on a
 * malformed `brandColor` for the stated reason — a newsroom charter is validated input, and quietly
 * ignoring a broken value there hides a typo in the one file the whole house style hangs off.
 */
function houseAccents(newsroom) {
  const rest = String(newsroom.accents ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  for (const accent of rest) {
    if (!HEX.test(accent)) throw new Error(`newsroom.accents must each be #rrggbb, got ${JSON.stringify(accent)}`);
  }
  const all = [newsroom.brandColor, ...rest];
  return all.filter((hex, index) => all.indexOf(hex) === index);
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

  // SUBJECT FIRST. A convention the reader already holds — blue for water, green for renewables —
  // is doing work the legend would otherwise have to do, for THIS chart, and that beats looking
  // like the rest of the masthead. An earlier draft pushed house first and recommended house
  // explicitly, on the reasoning that a subject convention is "a reason to DEPART from the house
  // theme"; the owner's ruling inverts it (twin/FEEDBACK-2026-08-10.md, A8). House is what leads
  // when the subject carries no convention, which is most of the time.
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

  if (newsroom && newsroom.brandColor && newsroom.ground) {
    for (const field of ["brandColor", "ground"]) {
      if (!HEX.test(newsroom[field])) {
        throw new Error(`newsroom.${field} must be #rrggbb, got ${JSON.stringify(newsroom[field])}`);
      }
    }
    // A newsroom's identity is rarely ONE accent on one ground, so `NEWSROOM.md` may record
    // further ones in `accents`. Each becomes its OWN option and is scored exactly like the
    // primary — which is the whole safeguard: a longer palette is not a way to get a colour past
    // the 3:1 floor, because `recommended` below only ever names an option that passed, and a
    // failing accent is shown failing, with its remedy beside it. Reported, never silently
    // accepted, and never silently swapped either.
    const accents = houseAccents(newsroom);
    accents.forEach((accent, index) => {
      const primary = index === 0;
      options.push(
        scoreOption({
          id: primary ? "house" : `house-${index + 1}`,
          origin: "newsroom",
          ground: newsroom.ground,
          accent,
          label: primary
            ? `${newsroom.name || "the newsroom"}'s house colours`
            : `${newsroom.name || "the newsroom"}'s house accent ${index + 1}`,
          reasoning: primary
            ? "The chart reads as this newsroom's, beside everything else it publishes. This is what leads whenever the subject carries no convention of its own."
            : "Also this newsroom's own, recorded beside the primary accent. It reads as the house without repeating the colour every other beat already uses.",
          provenance: primary
            ? `NEWSROOM.md — brandColor: ${accent}, ground: ${newsroom.ground}`
            : `NEWSROOM.md — accents: ${accent}, ground: ${newsroom.ground}`,
        }),
      );
    });
  }

  return {
    subject: subject || null,
    options,
    // SAID, not silently absent. `SUBJECT_CONVENTIONS` holds four entries, so "no convention
    // applies" is the common case, not the exception — and in the run that meant exactly one
    // option appeared with no explanation of why there was only one. A journalist reading a
    // one-option proposal should know whether the subject was looked at and found nothing, or
    // never looked at. Null when a convention DID match: there is nothing to explain.
    noConventionReason: convention
      ? null
      : subject
        ? "No convention applies to this subject, so the newsroom's colours lead. The conventions this skill will propose are the few a reader can be expected to already hold — see references/subject-conventions.md for why the list is short and what it would take to add one."
        : "No subject was given to look a convention up by, so the newsroom's colours lead.",
    // The SUBJECT option is recommended when it exists and passes; the PRIMARY house accent second;
    // any passing option third — which, since a newsroom may record several accents, is how a
    // further house accent gets recommended when the primary one misses the floor. That ordering is
    // the guarantee a richer palette does not become a way past the floor: every accent is measured,
    // and only a measured PASS is ever named here.
    // It must never fall back to `options[0]` regardless of contrast — an earlier draft did,
    // which meant a brand colour measured at 1.61:1 was handed back marked "recommended" three
    // lines under the words "FAILS the 3:1 floor". Recommending a colour this skill has just
    // measured as unreadable is the one outcome worse than proposing nothing.
    recommended:
      options.find((o) => o.id === "subject" && o.contrast.passes)?.id ||
      options.find((o) => o.id === "house" && o.contrast.passes)?.id ||
      options.find((o) => o.contrast.passes)?.id ||
      null,
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
 * REFUSE A COLOUR A READER CANNOT SEE, AND SAY WHAT WAS MEASURED.
 *
 * `twin-palette`'s proposal measures every option it offers and never recommends one that fails.
 * That is the first line, and it is the only one that existed until now — measured on 2026-08-10,
 * a `PALETTE.md` recording `accent: "#FFFF00"` on `ground: "#FFFFFF"` (1.07:1) rendered a clean
 * PNG with no warning at all, the beat's whole number set in yellow on white.
 *
 * A `PALETTE.md` can be written by hand, copied from another story, or produced by a path that
 * never asked — `twin-newsroom-charter` proposes a `brandColor` and a `ground` off a newsroom's
 * own site. So the floor is measured HERE too, where the colour meets the render, and the refusal
 * names the ratio, the floor, the criterion it comes from and the nearest colour that clears it.
 *
 * It refuses rather than adjusts, for the reason `adjustToContrast` states above.
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
