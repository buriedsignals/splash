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

// The frontmatter keys `NewsroomFacts` covers — the ones `profileMarkdown`/`updateProfileMarkdown`
// author. Every other frontmatter key (`credit`, `signers`, `requiredSigners`, or one this
// version has never heard of) is the newsroom's, not this function's, to write.
const KNOWN_KEYS = new Set(["palette", "source", "lang", "theme"]);

/**
 * The frontmatter lines `facts` produce — palette, source, lang, theme, in that order, each
 * omitted when unset (lang alone always renders, defaulting to "en"). No delimiters: shared by
 * `profileMarkdown` (a fresh file) and `updateProfileMarkdown` (an existing one's known fields).
 */
function knownFieldLines(facts: NewsroomFacts): string[] {
  const palette = (
    facts.palette?.length ? facts.palette : facts.color ? [facts.color] : []
  ).filter((c) => isSet(c));
  const lines: string[] = [];
  if (palette.length) {
    lines.push("palette:");
    palette.forEach((c, i) => {
      lines.push(
        i === 0
          ? `  - "${scalar(c)}"   # your house colour`
          : `  - "${scalar(c)}"`,
      );
    });
  }
  if (isSet(facts.name)) {
    lines.push("source:");
    lines.push(`  name: "${scalar(facts.name!)}"`);
    if (isSet(facts.url)) lines.push(`  url: "${scalar(facts.url!)}"`);
  }
  lines.push(`lang: "${scalar(facts.lang || "en")}"`);
  if (isSet(facts.theme)) lines.push(`theme: "${scalar(facts.theme!)}"`);
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
  const lines = ["---", ...knownFieldLines(facts), "---"];
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

// Where a block a KNOWN key opened (an empty-value line, e.g. `palette:`) ends: the same
// blank-line-skip / dedent-stops rule `parseNewsroomMarkdown` uses to find the end of `palette`,
// `source`, `signers` and `requiredSigners`. Reused here so a dropped known block does not leave
// its old indented lines behind as orphans.
function blockEnd(lines: string[], start: number): number {
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

// Every frontmatter line NOT belonging to a KNOWN key, in its original order: comments, blank
// lines, a key this version has never heard of, and every line of ITS block (kept because those
// continuation lines never match the key:value pattern below, so they fall through untouched).
function preserveUnknownLines(lines: string[]): string[] {
  const kept: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const kv = lines[i].match(/^([A-Za-z_]+):[ \t]*(.*)$/);
    if (kv && KNOWN_KEYS.has(kv[1])) {
      i++;
      if (kv[2].trim() === "") i = blockEnd(lines, i);
      continue;
    }
    kept.push(lines[i]);
    i++;
  }
  return kept;
}

/**
 * Rewrite the fields of an EXISTING NEWSROOM-PROFILE.md that `facts` covers, and leave everything
 * else exactly as it was: the newsroom's prose in the body, its comments, and any frontmatter key
 * this function does not author (a key a later version added, or one a human typed by hand).
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
  const preserved = fm ? preserveUnknownLines(fm[1].split(/\r?\n/)) : [];
  const inner = [...knownFieldLines(facts), ...preserved];
  return ["---", ...inner, "---", ""].join("\n") + body;
}
