// twin/skills/palette/scripts/palette.mjs
//
// Dependency-free. Proposes a palette; never renders one, never writes one.
//
// The colour maths below (`channels`, `luminance`, `contrast`) is a VERBATIM copy of the block in
// `chart-beat/scripts/render-still.mjs`. That is the canon here: a skill stays
// copy-pasteable on its own, so helpers are duplicated rather than imported. The risk that buys —
// silent divergence — is guarded by `splash/test/helper-parity.test.ts`, which compares this
// copy against every other one in the tree.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
// The colour maths and the palette reader are `./colour.mjs`, carried verbatim from
// `chart-beat/scripts/colour.mjs` (line 1 names the canonical; `splash/test/carried-copies.test.ts`
// holds it), so this proposal and every render measure with the same function. Re-exported here.
import {
  HEX,
  contrast,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
  LARGE_TEXT_CONTRAST_MIN,
  adjustToContrast,
  readPalette,
  parsePalette,
  assertLegible,
} from "./colour.mjs";
export {
  contrast,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
  LARGE_TEXT_CONTRAST_MIN,
  adjustToContrast,
  readPalette,
  parsePalette,
  assertLegible,
};


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
 * This is a DUPLICATE of `splash/scripts/newsroom.mjs`'s `newsroomAccents`, deliberately: a
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
 * `newsroom-charter` holds.
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
 * IS THERE ANYTHING HERE FOR THE JOURNALIST TO DECIDE? — issue #41.
 *
 * The palette question was asked at every story, and on most of them it had one possible answer.
 * A journalist met it and said: *"I dont know what this is about. we have the newsroom.md no? […]
 * I would remove it from the system and bake a preference by default based on the newsroom.md
 * preflight answers"*. They are right, and nothing this skill exists for is lost by agreeing.
 *
 * What this skill exists for is the FLOOR and the PROVENANCE, not the prompt. Its origin defect was
 * real — `brandColor` and `ground` were collected at preflight and then never threaded into a
 * render, so eleven of twelve seed runners named hex literals with `// from NEWSROOM.md` beside
 * them — and so is the contrast floor, since a `PALETTE.md` recording `#FFFF00` on white rendered a
 * clean PNG. Neither of those requires a question. Both require a recorded, MEASURED default.
 *
 * There are exactly two situations where the journalist genuinely has something to decide:
 *
 *   1. **A subject convention applies.** Blue for water, green for renewables — it competes with
 *      the house colour and it is doing work the legend would otherwise have to do. Four
 *      conventions ship, so this is the rare case.
 *   2. **The house pair fails the floor.** The newsroom's own recorded colours cannot be used as
 *      they are, and someone has to choose the remedy.
 *
 * Everything else is fully determined: `brandColor` on `ground`, measured, with `accents` behind it
 * in recorded order. `ask: false` means "write it and move on".
 *
 * The escape hatch is untouched: a journalist who wants a different colour for one beat drops a
 * `PALETTE.md` beside it, and `readPalette` walks up from the beat's own directory and finds the
 * nearest one first.
 */
export function paletteDecision({ newsroom, subject } = {}) {
  const proposal = proposePalette({ newsroom, subject });

  if (matchConvention(subject)) {
    return {
      ask: true,
      reason:
        "a convention the reader already holds applies to this subject, and it competes with the " +
        "newsroom's own colours — that is a judgement, not a default",
      proposal,
    };
  }

  const house = proposal.options.find((option) => option.id === "house");
  if (!house) {
    return {
      ask: true,
      reason:
        "NEWSROOM.md records no brandColor/ground pair to derive a default from — preflight is " +
        "where that is set, and nothing here may invent one",
      proposal,
    };
  }
  if (!house.contrast.passes) {
    return {
      ask: true,
      reason:
        `the newsroom's own accent ${house.accent} measures ${house.contrast.ratio}:1 against its ` +
        `ground ${house.ground}, under the ${NON_TEXT_CONTRAST_MIN}:1 floor — the recorded pair ` +
        `cannot be used as it stands, and choosing the remedy is the journalist's` +
        (house.remedy ? `. The nearest colour that clears it is ${house.remedy.accent}` : ""),
      proposal,
    };
  }

  return {
    ask: false,
    reason: "the newsroom recorded these colours at preflight and they clear the floor",
    palette: {
      ground: house.ground,
      accent: house.accent,
      accents: houseAccents(newsroom),
      origin: "newsroom",
    },
    proposal,
  };
}

/** The `PALETTE.md` a derived default writes. Measured on write, exactly as `parsePalette`
 *  measures on read — a default that failed would surface as case 2 above rather than be
 *  written silently. */
export function formatPalette({ ground, accent, accents = [], origin }) {
  for (const hex of [ground, accent, ...accents]) {
    if (!HEX.test(hex)) throw new Error(`every colour must be #rrggbb, got ${JSON.stringify(hex)}`);
  }
  assertLegible(accent, ground, { role: "mark", where: `the accent ${accent}` });
  const further = accents.filter((hex) => hex !== accent);
  for (const hex of further) {
    assertLegible(hex, ground, { role: "mark", where: `the further accent ${hex}` });
  }
  return [
    "---",
    `ground: "${ground}"`,
    `accent: "${accent}"`,
    ...(further.length ? [`accents: ${further.join(", ")}`] : []),
    `origin: ${origin}`,
    "---",
    "",
    "# The colours this story is drawn in",
    "",
    origin === "newsroom"
      ? "Derived from `NEWSROOM.md`, which preflight validated, and measured on write against the" +
        " same non-text contrast floor `parsePalette` measures on read. Nobody was asked, because" +
        " there was nothing here to decide: no subject convention applies and the newsroom's own" +
        " pair clears the floor."
      : "Recorded from the palette proposal.",
    "",
    "A journalist who wants a different colour for one beat drops a `PALETTE.md` beside that beat —",
    "`readPalette` walks up from the beat's own directory and finds the nearest one first.",
    "",
  ].join("\n");
}
