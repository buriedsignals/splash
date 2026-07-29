// CLI: the newsroom charter, in two subcommands that CANNOT reach each other.
//
//   bun skills/splash/scripts/propose-charter.mjs read <site-url>
//   bun skills/splash/scripts/propose-charter.mjs read --html-file <path> [--url <url>]
//   bun skills/splash/scripts/propose-charter.mjs write <projectDir> --confirmed \
//       --palette "#c8102e,#0a5c36" [--accent "#…"] [--theme "#…"|dark] \
//       [--name "Heidi.news"] [--site-url https://…] [--lang fr] [--typeface "Publico Text"]
//
// The split exists so the two cannot couple by ACCIDENT. `read` measures a site and prints what
// it found with receipts; it writes nothing, anywhere. `write` takes VALUES on the command line
// and never sees the site, the proposal, or any file `read` produced, so no code path carries a
// measurement into the profile on its own.
//
// What it does NOT do — stated plainly, because the first draft of this comment overstated it:
// it cannot prove a human was involved. An agent that just ran `read` can read the hex off the
// screen and type it into `write --confirmed` on its next tool call. `--confirmed` is
// self-attested. That is why `read` prints no machine-parseable blob shaped for these flags —
// removing it raises the cost of silent auto-piping instead of lowering it — and why the real
// answer, if this ever needs to be evidence rather than a guard, is the existing sign-off
// primitive (`apply-signoff.mjs` / `requiredSigners`), not a boolean.
//
// `write` additionally refuses without `--confirmed`, and refuses to overwrite an existing
// NEWSROOM-PROFILE.md without `--replace`: after creation that file belongs to the newsroom.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  proposeCharter,
  accentCandidate,
  groundTheme,
  SIGNAL_LABEL,
} from "../../../lib/newsroom/charter.ts";
import { collectSiteSources } from "../../../lib/newsroom/charter-fetch.ts";
import { profileMarkdown } from "../../../lib/newsroom/profile-write.ts";

const PROFILE_FILE = "NEWSROOM-PROFILE.md";

function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      rest.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    if (eq > 0) {
      flags[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const name = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) flags[name] = true;
    else {
      flags[name] = next;
      i++;
    }
  }
  return { flags, rest };
}

function die(message) {
  console.error(message);
  process.exit(1);
}

// ── read ──


function renderProposal(proposal, fetchNotes) {
  const out = [];
  out.push(`# Measured from ${proposal.url ?? "the supplied page"}`);
  out.push("");
  out.push("These are MEASUREMENTS, not decisions. Nothing has been written.");
  out.push("");
  if (proposal.candidates.length === 0) {
    out.push("## Colour — nothing found");
    out.push("");
    out.push("The site names no brand colour this reading can see.");
  } else {
    out.push(
      `## Colour candidates (confidence: ${proposal.confidence})`,
    );
    out.push("");
    proposal.candidates.forEach((c, i) => {
      out.push(`${i + 1}. ${c.value}  (score ${c.score}, read ${c.count}×)`);
      const seen = new Set();
      for (const e of c.evidence) {
        if (seen.has(e.signal)) continue;
        seen.add(e.signal);
        out.push(`     from ${SIGNAL_LABEL[e.signal]}`);
        out.push(`       ${e.token}`);
      }
    });
    // A near-tie is not a ranking. Say so rather than let the order imply a winner.
    const [first, second] = proposal.candidates;
    if (second && first.score - second.score <= 1)
      out.push(
        `\n   ⚠ ${first.value} and ${second.value} are within a point of each other — this ranking does not choose between them. Ask which one is theirs.`,
      );
    const accent = accentCandidate(proposal);
    if (accent) {
      out.push("");
      out.push(`Second, distinct hue (a possible accent): ${accent.value}`);
    }
  }
  const theme = groundTheme(proposal);
  out.push("");
  out.push("## Ground");
  out.push("");
  if (theme)
    out.push(
      `The site's pages sit on ${theme}${proposal.ground?.dark ? " (a dark ground)" : ""} — read from: ${proposal.ground?.token}`,
    );
  else out.push("Ordinary light ground — Splash's default already matches it.");
  out.push("");
  out.push("## Typefaces");
  out.push("");
  if (proposal.typography.length === 0) out.push("None readable.");
  else
    for (const t of proposal.typography)
      out.push(`- ${t.role}: ${t.family}   (${t.token})`);
  out.push("");
  out.push(
    "  Splash has NO typeface field yet — a typeface confirmed here is recorded in the",
  );
  out.push(
    "  profile's prose as a noted fact, and does not change what a chart renders.",
  );
  const notes = [...(fetchNotes ?? []), ...proposal.notes];
  if (notes.length) {
    out.push("");
    out.push("## What this reading cannot promise");
    out.push("");
    for (const n of notes) out.push(`- ${n}`);
  }
  return out.join("\n");
}

async function cmdRead(flags, rest) {
  let sources;
  let fetchNotes = [];
  if (typeof flags["html-file"] === "string") {
    if (!existsSync(flags["html-file"]))
      die(`no such file: ${flags["html-file"]}`);
    sources = {
      html: readFileSync(flags["html-file"], "utf8"),
      sheets: [],
      ...(typeof flags.url === "string" ? { url: flags.url } : {}),
    };
    fetchNotes = [
      "read from a saved page: only the styles INSIDE that file were seen, never its linked stylesheets",
    ];
  } else {
    const url = rest[0] ?? (typeof flags.url === "string" ? flags.url : "");
    if (!url) die("usage: propose-charter.mjs read <site-url>");
    const got = await collectSiteSources(url);
    if ("error" in got) die(`could not read the site: ${got.error}`);
    sources = { url: got.url, html: got.html, sheets: got.sheets };
    fetchNotes = got.notes;
  }
  console.log(renderProposal(proposeCharter(sources), fetchNotes));
}

// ── write ──

const HEX = /^#[0-9a-fA-F]{6}$/;

function cmdWrite(flags, rest) {
  const dir = rest[0];
  if (!dir) die("usage: propose-charter.mjs write <projectDir> --confirmed …");
  if (!existsSync(dir)) die(`no such directory: ${dir}`);
  if (flags.confirmed !== true)
    die(
      "refused: --confirmed is required. This command writes the newsroom's house style, and it may only run AFTER the journalist has validated the values on the gate.",
    );
  const path = join(dir, PROFILE_FILE);
  if (existsSync(path) && flags.replace !== true)
    die(
      `refused: ${path} already exists and belongs to the newsroom. Pass --replace only if the journalist asked for it to be rewritten.`,
    );

  const palette = String(flags.palette ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const c of palette)
    if (!HEX.test(c)) die(`not a #rrggbb colour: ${c}`);
  const accent = typeof flags.accent === "string" ? flags.accent.trim() : "";
  if (accent && !HEX.test(accent)) die(`not a #rrggbb colour: ${accent}`);
  const theme = typeof flags.theme === "string" ? flags.theme.trim() : "";
  if (theme && theme !== "dark" && theme !== "light" && !HEX.test(theme))
    die(`theme must be "dark", "light" or a #rrggbb colour: ${theme}`);

  const typefaces = []
    .concat(flags.typeface ?? [])
    .filter((t) => typeof t === "string" && t.trim());
  const notes = typefaces.length
    ? [
        `_Typefaces you confirmed: ${typefaces.join(", ")}. Splash records them here but does not yet apply them — visuals use the built-in typeface until a font field exists._`,
      ]
    : [];

  const md = profileMarkdown({
    ...(palette.length ? { palette } : {}),
    ...(accent ? { accent } : {}),
    ...(typeof flags.name === "string" && flags.name.trim()
      ? { name: flags.name.trim() }
      : {}),
    ...(typeof flags["site-url"] === "string" && flags["site-url"].trim()
      ? { url: flags["site-url"].trim() }
      : {}),
    ...(typeof flags.lang === "string" && flags.lang.trim()
      ? { lang: flags.lang.trim() }
      : {}),
    ...(theme ? { theme } : {}),
    ...(notes.length ? { notes } : {}),
  });
  writeFileSync(path, md);
  console.log(`WROTE ${path}`);
  console.log(md);
}

const { flags, rest } = parseFlags(process.argv.slice(2));
const cmd = rest.shift();
if (cmd === "read") await cmdRead(flags, rest);
else if (cmd === "write") cmdWrite(flags, rest);
else
  die(
    "usage:\n  propose-charter.mjs read <site-url>\n  propose-charter.mjs read --html-file <path> [--url <url>]\n  propose-charter.mjs write <projectDir> --confirmed --palette '#rrggbb[,#rrggbb]' [--accent …] [--theme …] [--name …] [--site-url …] [--lang …] [--typeface …]",
  );
