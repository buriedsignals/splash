// twin/skills/palette/scripts/typeface.mjs
//
// THE TYPEFACE IS PROPOSED WHERE THE PALETTE IS — issue #57.
//
// `newsroom-charter` measures a newsroom's faces off its own site and `NEWSROOM.md` records them.
// Until this file existed nothing carried that answer forward: every `TYPEFACE.md` in the tree was
// `origin: default`, and the first a journalist heard of the typeface was a render refusing it.
// The exchange (movement ⑨) named a `proposeTypeface` that did not exist.
//
// THE SHAPE IS `paletteDecision`'s. When the newsroom's first recorded face resolves on this
// machine there is nothing to decide, so the answer is derived and written with `origin: newsroom`.
// When none resolves the journalist is asked — shown which recorded faces are present and which
// are absent, and offered the substrate's own stack as an explicit choice — because a face this
// machine does not have is refused, never substituted (`useTypeface` in every `render-still.mjs`).
//
// WHAT "RESOLVES" MEANS is measured, never assumed: resvg draws the fallback for a family it does
// not have and reports nothing. `familyResolves` below lays a probe string out in the requested
// family and in a family that exists nowhere and compares the ink. It is the same probe every
// `render-still.mjs` carries; it is written again here (ten lines) because this skill installs on
// its own and imports no other skill. The probe is Latin, so a story set in another script gets an
// answer about Latin glyphs — stated here rather than papered over with a sampling machinery.

import { Resvg } from "@resvg/resvg-js";

export const TYPEFACE_ORIGINS = ["newsroom", "journalist", "default"];
export const DEFAULT_STACK = "Helvetica, Arial, sans-serif";

/** The faces `NEWSROOM.md` records, most prominent first. */
export function newsroomTypefaces(newsroom) {
  return String(newsroom?.typefaces ?? "")
    .split(",")
    .map((face) => face.trim())
    .filter((face) => face !== "");
}

/** The first family in a stack — the one a render actually asks for. */
export function requestedFamily(stack) {
  return String(stack).split(",")[0].replace(/^["']|["']$/g, "").trim();
}

const RESOLUTION_PROBE = "Handgloves 0123456789 — MWmw il1 %";

/** Does this machine actually have the face? Identical ink to a nonsense family means no. */
export function familyResolves(family) {
  const ink = (name) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400">` +
      `<text x="0" y="300" font-family="${name}" font-size="120">${RESOLUTION_PROBE}</text></svg>`;
    const box = new Resvg(svg, { font: { loadSystemFonts: true } }).getBBox();
    return box ? `${box.x}|${box.y}|${box.width}|${box.height}` : "none";
  };
  return ink(requestedFamily(family)) !== ink("NoSuchFaceExistsAnywhere-ZZQX");
}

/**
 * Every face the newsroom recorded, each measured on this machine, plus the substrate's own stack.
 * `resolves` is injectable so the proposal can be tested without a font library.
 */
export function proposeTypeface({ newsroom, resolves = familyResolves } = {}) {
  const faces = newsroomTypefaces(newsroom);
  const options = faces.map((family, index) => ({
    id: `newsroom-${index + 1}`,
    family,
    origin: "newsroom",
    present: Boolean(resolves(family)),
  }));
  options.push({ id: "default", family: DEFAULT_STACK, origin: "default", present: true });
  const recommended = options.find((option) => option.present)?.id ?? "default";
  return { faces, options, recommended };
}

/**
 * Whether there is a typeface decision at all. `ask: false` carries the derived answer — the
 * newsroom's first recorded face, present on this machine. `ask: true` carries the proposal and
 * the reason, and the journalist chooses: another recorded face that is present, the default
 * stack (recorded as `origin: default`, a choice with the gap named), or installing the face.
 */
export function typefaceDecision({ newsroom, resolves = familyResolves } = {}) {
  const proposal = proposeTypeface({ newsroom, resolves });
  if (proposal.faces.length === 0) {
    return {
      ask: true,
      reason:
        "NEWSROOM.md records no typefaces to derive a default from — preflight is where that is " +
        "set, and nothing here may invent one",
      proposal,
    };
  }
  const [first] = proposal.options;
  if (first.present) {
    return {
      ask: false,
      reason: "the newsroom's first recorded face resolves on this machine",
      typeface: { family: first.family, origin: "newsroom" },
      proposal,
    };
  }
  const absent = proposal.options.filter((o) => o.origin === "newsroom" && !o.present).map((o) => o.family);
  const present = proposal.options.filter((o) => o.origin === "newsroom" && o.present).map((o) => o.family);
  return {
    ask: true,
    reason:
      `this machine does not have ${absent.map((f) => JSON.stringify(f)).join(", ")}` +
      (present.length
        ? `; it does have ${present.map((f) => JSON.stringify(f)).join(", ")}`
        : `; none of the newsroom's recorded faces resolve here`) +
      " — a render would refuse the face rather than substitute for it, so the journalist chooses: " +
      "a recorded face that is present, the default stack as a stated choice, or installing the face",
    proposal,
  };
}

/** The question a journalist reads when there is one. */
export function formatTypefaceProposal({ reason, proposal }) {
  const lines = ["Which typeface should this story's graphics be set in?", "", reason + ".", ""];
  for (const option of proposal.options) {
    const state = option.origin === "default" ? "the substrate's own stack, always present" : option.present ? "present on this machine" : "ABSENT on this machine";
    lines.push(`- **${option.family}** — ${state}. Recorded as \`origin: ${option.origin}\`.`);
  }
  lines.push("", "A face that is absent can be installed; the render will refuse it until it is.");
  return lines.join("\n");
}

/** The `TYPEFACE.md` a decision writes, in the shape every `readTypeface` reads. */
export function formatTypeface({ family, origin }) {
  if (!family || typeof family !== "string") throw new Error(`family must be a font stack, got ${JSON.stringify(family)}`);
  if (!TYPEFACE_ORIGINS.includes(origin)) {
    throw new Error(`origin must be ${TYPEFACE_ORIGINS.join(", ")} — got ${JSON.stringify(origin)}`);
  }
  return [
    "---",
    `family: "${family}"`,
    `origin: ${origin}`,
    "---",
    "",
    "# The typeface this story is drawn in",
    "",
    origin === "newsroom"
      ? "Derived from `NEWSROOM.md`'s recorded typefaces: the newsroom's first face resolves on the" +
        " machine that renders, so nobody was asked — there was nothing here to decide."
      : origin === "journalist"
        ? "Recorded from the typeface proposal, chosen by the journalist."
        : "The substrate's own stack, chosen as a stated fallback because the newsroom's recorded" +
          " faces do not resolve on the machine that renders. `origin: default` is the honest word.",
    "",
    "A render refuses a face this machine cannot resolve rather than substituting for it; see",
    "`useTypeface` in the craft skill's `render-still.mjs`.",
    "",
  ].join("\n");
}
