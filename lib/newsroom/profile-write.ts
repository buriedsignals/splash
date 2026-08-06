// profile-write.ts — the ONE place that turns confirmed newsroom facts into the text of
// NEWSROOM-PROFILE.md.
//
// Moved here from install/preflight/serialize.ts (which re-exports it, unchanged) because a
// second caller now needs it and lives on the other side of that boundary: the charter path in
// skills/splash/scripts/propose-charter.mjs, driven by lib/newsroom/charter.ts. install/ may
// import lib/, never the reverse — so the writer belongs here, and there is still exactly one
// of it.
//
// The file is created ONCE and never round-tripped: afterwards it belongs to the newsroom,
// comments and all (spec 2026-07-24 decision 6). So this only has to produce something the
// parser reads and a human can keep editing.
//
// Every field it emits is a field `parseNewsroomMarkdown` already reads. Nothing here invents a
// frontmatter key: a key the reader ignores would be a promise the pipeline does not keep. What
// Splash has measured but cannot yet apply — the newsroom's typefaces — goes in the BODY, as
// prose, labelled as not yet applied.
import { isSet } from "./probe";
import { NEWSROOM_FRONTMATTER_RE } from "../../skills/splash/src/brand-profile";

export type NewsroomFacts = {
  name?: string;
  url?: string;
  /** The single house colour of the setup page's one-colour form. */
  color?: string;
  lang?: string;
  /** An ordered house palette; when present it supersedes `color`. */
  palette?: string[];
  /** "light" | "dark" | "#rrggbb" — the house ground. */
  theme?: string;
  /** Prose lines appended to the body: what was measured but is not yet a frontmatter field. */
  notes?: string[];
};

// A value that carries a quote or a newline would not corrupt a shell here, it would forge EXTRA
// FRONTMATTER FIELDS in a file that governs what gets published (requiredSigners lives in it).
// Both characters go.
function scalar(raw: string): string {
  return raw.trim().replace(/[\r\n"]/g, "");
}

// The frontmatter keys `NewsroomFacts` CAN cover — the ones `profileMarkdown`/`updateProfileMarkdown`
// are allowed to author. Every other frontmatter key (`credit`, `signers`, `requiredSigners`, or
// one this version has never heard of) is the newsroom's, not this function's, to write. Whether
// one of THESE keys is actually replaced on a given call is a separate question — see
// `suppliedFieldLines`: a key in this set that `facts` leaves unset is preserved exactly like an
// unknown key, not dropped.
const KNOWN_KEYS = new Set(["palette", "source", "lang", "theme"]);

/** The effective palette: `facts.palette` when given, else `facts.color` wrapped in a list, else
 * empty. Shared so "does `facts` supply a palette" (empty vs not) and "what to write" agree. */
function effectivePalette(facts: NewsroomFacts): string[] {
  return (
    facts.palette?.length ? facts.palette : facts.color ? [facts.color] : []
  ).filter((c) => isSet(c));
}

function paletteLines(palette: string[]): string[] {
  if (!palette.length) return [];
  const lines = ["palette:"];
  palette.forEach((c, i) => {
    lines.push(
      i === 0
        ? `  - "${scalar(c)}"   # your house colour`
        : `  - "${scalar(c)}"`,
    );
  });
  return lines;
}

function sourceLines(facts: NewsroomFacts): string[] {
  if (!isSet(facts.name)) return [];
  const lines = ["source:", `  name: "${scalar(facts.name!)}"`];
  if (isSet(facts.url)) lines.push(`  url: "${scalar(facts.url!)}"`);
  return lines;
}

/**
 * NEWSROOM-PROFILE.md from facts the journalist has CONFIRMED.
 *
 * It takes values, never a measurement: there is no path from a site scan into this function
 * that does not pass through a human saying yes. That separation is the point — see
 * skills/newsroom-charter/SKILL.md.
 */
export function profileMarkdown(facts: NewsroomFacts): string {
  const lines = [
    "---",
    ...paletteLines(effectivePalette(facts)),
    ...sourceLines(facts),
    `lang: "${scalar(facts.lang || "en")}"`, // a fresh file always gets a lang, defaulting to "en"
    ...(isSet(facts.theme) ? [`theme: "${scalar(facts.theme!)}"`] : []),
    "---",
  ];
  lines.push("");
  lines.push("# Newsroom profile");
  lines.push("");
  lines.push(
    "Splash reuses this house style on every visual. Edit it whenever you like — this file is",
  );
  lines.push(
    "yours; Splash only created it. See NEWSROOM-PROFILE.example.md for every supported field.",
  );
  lines.push("");
  for (const note of facts.notes ?? []) {
    if (!isSet(note)) continue;
    lines.push(note.replace(/[\r\n]+/g, " ").trim());
    lines.push("");
  }
  return lines.join("\n");
}

// The lines to WRITE for each known key `facts` actually supplies a value for, keyed by the
// frontmatter key they replace — never all four unconditionally. A key `facts` leaves unset is
// simply absent here, which is what tells `preserveLines` below to leave the newsroom's existing
// line(s) for that key alone instead of dropping them (an edit that only changes a colour must
// not also erase a `theme` no caller of `updateProfileMarkdown` even asked about).
function suppliedFieldLines(facts: NewsroomFacts): Map<string, string[]> {
  const supplied = new Map<string, string[]>();
  const palette = effectivePalette(facts);
  if (palette.length) supplied.set("palette", paletteLines(palette));
  const source = sourceLines(facts);
  if (source.length) supplied.set("source", source);
  if (isSet(facts.lang))
    supplied.set("lang", [`lang: "${scalar(facts.lang!)}"`]);
  if (isSet(facts.theme))
    supplied.set("theme", [`theme: "${scalar(facts.theme!)}"`]);
  return supplied;
}

// Where the block a KNOWN key opened (an empty-value line, e.g. `source:`) ends, using the SAME
// rule `parseNewsroomMarkdown`'s `source` reader uses: skip blank lines, stop at the first
// non-indented line, consume everything indented in between regardless of its own shape.
function indentedBlockEnd(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }
    if (!/^[ \t]/.test(lines[i])) break;
    i++;
  }
  return i;
}

// `palette:`'s block ends differently: `parseNewsroomMarkdown`'s palette reader (and its
// signers/requiredSigners readers) stop at the first line that is not a `  - item`, even while
// still indented — a stray indented non-dash line is not consumed as part of the block, so this
// writer must not delete it either when it drops and regenerates the palette above it.
function paletteBlockEnd(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }
    if (!/^[ \t]+-/.test(lines[i])) break;
    i++;
  }
  return i;
}

// Every frontmatter line the update should NOT touch, in its original order: comments, blank
// lines, a key `facts` does not supply a replacement for (known or not), and every line of ITS
// block — kept because a continuation line never matches the key:value pattern below and falls
// through untouched, UNLESS it belongs to a block this call is about to drop and regenerate, in
// which case it is skipped using that key's own boundary rule (`paletteBlockEnd` for `palette`,
// `indentedBlockEnd` for `source`).
function preserveLines(
  lines: string[],
  supplied: Map<string, string[]>,
): string[] {
  const kept: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const kv = lines[i].match(/^([A-Za-z_]+):[ \t]*(.*)$/);
    if (kv && KNOWN_KEYS.has(kv[1]) && supplied.has(kv[1])) {
      i++;
      if (kv[2].trim() === "")
        i =
          kv[1] === "palette"
            ? paletteBlockEnd(lines, i)
            : indentedBlockEnd(lines, i);
      continue;
    }
    kept.push(lines[i]);
    i++;
  }
  return kept;
}

/**
 * Rewrite the fields of an EXISTING NEWSROOM-PROFILE.md that `facts` ACTUALLY SUPPLIES a value
 * for, and leave everything else exactly as it was: the newsroom's prose in the body, its
 * comments, any frontmatter key this function does not author, and — just as important — a KNOWN
 * key (`palette`/`source`/`lang`/`theme`) that this particular call simply did not mention. An
 * edit that only changes a colour must not delete an existing `theme` no one asked to touch.
 *
 * Splits frontmatter from body the same way `parseNewsroomMarkdown` does (`NEWSROOM_FRONTMATTER_RE`),
 * so a file that parser reads is a file this rewrites the same way. A file with no frontmatter at
 * all — someone deleted it, or it never had one — gets a fresh one and keeps its whole body.
 *
 * The body is never touched, not even to append a note: on an edit the newsroom's own prose is
 * the one thing that must survive byte-for-byte, so `facts.notes` (which `profileMarkdown` folds
 * into the body of a FRESH file) is ignored here.
 */
export function updateProfileMarkdown(
  existing: string,
  facts: NewsroomFacts,
): string {
  const fm = existing.match(NEWSROOM_FRONTMATTER_RE);
  const body = fm ? existing.slice(fm[0].length) : existing;
  const supplied = suppliedFieldLines(facts);
  const preserved = fm ? preserveLines(fm[1].split(/\r?\n/), supplied) : [];
  const inner = [...supplied.values()].flat().concat(preserved);
  return ["---", ...inner, "---", ""].join("\n") + body;
}
