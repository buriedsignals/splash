// twin/skills/palette/scripts/typeface.mjs
//
// THE TYPEFACE IS PROPOSED WHERE THE PALETTE IS — issue #57.
//
// `newsroom-charter` measures a newsroom's faces off its own site and `NEWSROOM.md` records them.
// Until this file existed nothing carried that answer forward: every `TYPEFACE.md` in the tree was
// `origin: default`, and the first a journalist heard of the typeface was a render refusing it.
// The exchange (movement ⑨) named a `proposeTypeface` that did not exist.
//
// THE SHAPE IS `paletteDecision`'s. When the newsroom's first recorded face resolves there is
// nothing to decide, so the answer is derived and written with `origin: newsroom`. When none
// resolves the journalist is asked — shown which recorded faces are available and which are not,
// and offered the substrate's own stack as an explicit choice — because a face there is no file
// for is refused, never substituted (`useTypeface` in every `render-still.mjs`).
//
// WHAT "RESOLVES" MEANS CHANGED WITH THE RENDER, AND THE OLD ANSWER WAS WORSE THAN USELESS HERE.
// It used to mean "does this MACHINE have the face", measured obliquely: resvg never errors on a
// family it cannot find, so the probe laid a string out in the requested family and in a family
// that exists nowhere and compared the ink. That question is now the wrong one. Every render in
// this twin draws with `loadSystemFonts: false` from files `typefaces.mjs` fetches, so the font
// library on the machine that renders is not consulted at all — a face installed here resolves for
// nothing, and a proposal that recommended one would recommend a face the render then REFUSES.
//
// So the proposal asks the render's own question: IS THERE A FILE. `familyResolves` below is
// `render-still.mjs`'s, to the line — `fontFilesFor(family).length > 0` — and the catalogue it
// answers yes to is the families the ladder can fetch: Google Fonts, redistributable, installed by
// nobody. `typefaces.mjs` is CARRIED beside this file (a skill installs on its own and imports no
// other skill), so this asks it through the same entry point the rasteriser does, and the answer
// here and the answer at the render cannot drift apart.

import { fontFilesFor, SERVED_BY_MAPTILER } from "./typefaces.mjs";

export const TYPEFACE_ORIGINS = ["newsroom", "journalist", "default"];

/** THE SUBSTRATE'S OWN STACK, AND IT MUST BE THE TRUNK'S. `useTypeface` exempts `origin: default`
 *  from the file check, so whatever is recorded here is written into a `TYPEFACE.md` and never
 *  questioned again — and then `measureText` asks `fontFilesFor` for its FIRST family on the first
 *  gutter it measures. While this read `Helvetica, Arial, sans-serif` and `render-still.mjs`'s
 *  `DEFAULT_FONT_FAMILY` read `Open Sans, …`, a journalist who accepted the documented default got
 *  a throw out of every measurement. The two are one value in two files that cannot import each
 *  other; `typeface.test.ts` reads the trunk's and holds them equal. */
export const DEFAULT_STACK = "Open Sans, Helvetica, Arial, sans-serif";

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

/**
 * CAN A RENDER ACTUALLY SET THIS FACE? — the same question `render-still.mjs`'s own
 * `familyResolves` asks, answered by the same function, so the proposal cannot recommend a family
 * the render will refuse.
 *
 * It is "is there a file", not "is it installed": `fontFilesFor` hands back a cached path, or
 * fetches the face from Google Fonts on first use, or throws naming the family. A refusal is
 * `false` rather than an exception because this is a PROPOSAL — a name the catalogue does not carry
 * is an option the journalist is shown as unavailable, not a crash in the exchange.
 */
export function familyResolves(family) {
  try {
    return fontFilesFor(family).length > 0;
  } catch {
    return false;
  }
}

/**
 * Every face the newsroom recorded, each asked whether a render could set it, plus the substrate's
 * own stack. `resolves` is injectable so the proposal can be tested without reaching the catalogue.
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
 * newsroom's first recorded face, one a render can actually set. `ask: true` carries the proposal
 * and the reason, and the journalist chooses: another recorded face that is available, a Google
 * family that is, or the default stack (recorded as `origin: default`, a choice with the gap
 * named). Installing a face is not on the list, because it is no longer a route to anything.
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
      reason: "the newsroom's first recorded face is one this render can set",
      typeface: { family: first.family, origin: "newsroom" },
      proposal,
    };
  }
  const absent = proposal.options.filter((o) => o.origin === "newsroom" && !o.present).map((o) => o.family);
  const present = proposal.options.filter((o) => o.origin === "newsroom" && o.present).map((o) => o.family);
  return {
    ask: true,
    reason:
      `there is no font file for ${absent.map((f) => JSON.stringify(f)).join(", ")}` +
      (present.length
        ? `; there is one for ${present.map((f) => JSON.stringify(f)).join(", ")}`
        : `; none of the newsroom's recorded faces resolve here`) +
      " — a render would refuse a face it has no file for rather than substitute for it, and " +
      "installing that face on this machine would not change it: every render draws from the files " +
      "this skill fetches, with the machine's own font library switched off. The journalist " +
      "chooses: a recorded face that is available, another Google family, or the default stack as " +
      "a stated choice",
    proposal,
  };
}

/** The question a journalist reads when there is one. */
export function formatTypefaceProposal({ reason, proposal }) {
  const lines = ["Which typeface should this story's graphics be set in?", "", reason + ".", ""];
  for (const option of proposal.options) {
    const state =
      option.origin === "default"
        ? "the substrate's own stack, always available"
        : option.present
          ? "available — a font file can be fetched for it"
          : "UNAVAILABLE — there is no font file for it";
    lines.push(`- **${option.family}** — ${state}. Recorded as \`origin: ${option.origin}\`.`);
  }
  lines.push(
    "",
    "INSTALLING A FACE DOES NOT HELP. Every render here draws from font files this skill fetches, " +
      "with the machine's own font library switched off — so a face that is unavailable stays " +
      "unavailable however many laptops it is installed on, and a face that is available needs no " +
      "installing anywhere.",
    "",
    "The catalogue is Google Fonts, which the ladder fetches on first use and caches. " +
      `Seventeen of them are also served as map glyphs, so a map label and the panel beside it come ` +
      `from the same design: ${SERVED_BY_MAPTILER.join(" · ")}.`,
  );
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
        : "The substrate's own stack, chosen as a stated fallback because there is no font file for" +
          " any of the newsroom's recorded faces. `origin: default` is the honest word.",
    "",
    "A render draws from font files only, with the machine's own font library switched off, and",
    "refuses a face it has no file for rather than substituting for it; see `useTypeface` in the",
    "craft skill's `render-still.mjs`.",
    "",
  ].join("\n");
}
