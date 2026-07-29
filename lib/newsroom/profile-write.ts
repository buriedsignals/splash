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

/**
 * NEWSROOM-PROFILE.md from facts the journalist has CONFIRMED.
 *
 * It takes values, never a measurement: there is no path from a site scan into this function
 * that does not pass through a human saying yes. That separation is the point — see
 * skills/newsroom-charter/SKILL.md.
 */
export function profileMarkdown(facts: NewsroomFacts): string {
  const palette = (
    facts.palette?.length ? facts.palette : facts.color ? [facts.color] : []
  ).filter((c) => isSet(c));
  const lines = ["---"];
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
  lines.push("---");
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
