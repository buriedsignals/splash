// Regenerates `twin/MATRIX.md` — which visual type is proven in which genre, and by which beat.
//
//   bun scripts/matrix.mjs           writes MATRIX.md
//   bun scripts/matrix.mjs --check   fails if MATRIX.md has drifted from the tree
//
// WHY THIS IS A SCRIPT AND NOT A HAND-WRITTEN TABLE. A matrix typed by hand is a claim about 65
// directories that nobody re-checks, and this project has measured what that costs: a count of
// "11 orphan stills" was reported, repeated four times across one night, written into HANDOVER.md,
// and turned out to be **one** the first time anybody ran the check. The same night, a "video genre
// covers 12 types" line in the same file was stale by two. A table that cannot be regenerated is a
// table that is wrong and does not know it.
//
// WHAT IT COUNTS, and the one judgement it makes. A beat proves a type in a genre when the
// ARTIFACT EXISTS ON DISK — a PNG, a self-contained HTML, an mp4. A `BRIEF.md` that declares a
// genre proves nothing: an audit found five beats declaring a genre with no artifact rendered, and
// from the outside nothing distinguished them.
//
// The judgement: a video beat's final frame is NOT counted as static proof. It is a by-product of
// that beat's own reveal, not a chart framed to be read at rest, and counting it inflates the
// static column with images nobody designed for stillness. A beat earns the static column when its
// own `Medium/genre:` line says so.
//
// A scrolly is detected by reading the page, not by its folder name — the scroll scaffold leaves
// `data-step`/`step-panel` in the delivered HTML.
//
// WHAT IT PROVABLY DOES NOT TELL YOU. That the artifact is CORRECT. A beat appears here because a
// file exists and its brief names a type; whether the chart is right, its claims true, or its
// labels legible is what the audits are for. Read this as a coverage map, never as a quality one.

import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TWIN = join(HERE, "..");
const PROOF = join(TWIN, "proof");

// Directories under `proof/` that are not beats: comparison dossiers, trial captures, a storyboard
// stub, and this session's palette demonstration.
const NOT_A_BEAT = new Set(["comparison", "trial", "seance", "palette-proof"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** The type NAME only: everything before the first comma, dash or parenthesis of the brief's line. */
const typeName = (s) =>
  s.split(/[,(—–]/)[0].trim().toLowerCase().replace(/[- ]+/g, " ").replace(/\s+/g, " ");

function readBeats() {
  const beats = [];
  for (const name of readdirSync(PROOF)) {
    const dir = join(PROOF, name);
    if (!statSync(dir).isDirectory() || NOT_A_BEAT.has(name)) continue;

    let type = null;
    let medium = "";
    const brief = join(dir, "BRIEF.md");
    if (existsSync(brief)) {
      const text = readFileSync(brief, "utf8");
      type = typeName(/\*\*Type:\*\*\s*([^.]+)/.exec(text)?.[1] || "");
      // Tolerant on spacing and emphasis, strict on meaning. The corpus writes this label three
      // ways — `**Medium/genre:**`, `**Medium / genre:**`, and with the value itself bolded
      // (`chart / **static**`). The first draft of this reader matched only the first spelling and
      // silently reported two real static beats as missing, which is how a generated table lies
      // more convincingly than a hand-written one: it looks measured. Spacing is not semantics.
      medium = (/\*\*Medium\s*\/\s*genre:\*\*\s*([^.]+)/.exec(text)?.[1] || "")
        .toLowerCase()
        .replace(/\*/g, "");
    }

    // Baked basemap plates are inputs, not artifacts.
    const files = walk(dir).filter((f) => !f.includes("/plate"));
    const html = files.filter((f) => f.endsWith(".html"));
    const scrolly = html.some((f) => /data-step|step-panel/.test(readFileSync(f, "utf8")));

    const genres = new Set();
    const declaresStatic = /static/.test(medium);
    // `frame-*.png` are extracted verification frames; `preview.png` belongs to a skill's seed.
    if (declaresStatic && files.some((f) => f.endsWith(".png") && !/preview|frame-/.test(f)))
      genres.add("static");
    if (html.length && !scrolly) genres.add("web");
    if (scrolly) genres.add("scrolly");
    if (files.some((f) => f.endsWith(".mp4"))) genres.add("video");

    beats.push({ name, type, medium, genres });
  }
  return beats;
}

const GENRES = ["static", "web", "video", "scrolly"];
const isMap = (b) => b.medium.startsWith("map") || b.name.startsWith("map");

function render(beats) {
  const lines = [
    "# The type × genre matrix",
    "",
    "**Generated — do not edit by hand.** `bun scripts/matrix.mjs` rewrites this file;",
    "`bun scripts/matrix.mjs --check` fails if it has drifted from the tree.",
    "",
    "A cell names the beat whose ARTIFACT EXISTS ON DISK. A brief that declares a genre without a",
    "rendered artifact counts for nothing here — five beats once did exactly that, and from the",
    "outside nothing distinguished them. A video beat's final frame is not counted as static proof:",
    "it is a by-product of that beat's reveal, not a chart framed to be read at rest.",
    "",
    "This is a coverage map, never a quality one. Whether these artifacts are CORRECT is what the",
    "`AUDIT-*.md` files are for.",
    "",
  ];

  for (const [label, pick] of [["Charts", (b) => !isMap(b)], ["Maps", isMap]]) {
    const set = beats.filter(pick).filter((b) => b.type);
    const types = [...new Set(set.map((b) => b.type))].sort();
    const covered = types.filter((t) =>
      GENRES.slice(0, 3).every((g) => set.some((b) => b.type === t && b.genres.has(g))),
    );
    lines.push(
      `## ${label} — ${types.length} types, ${set.length} beats`,
      "",
      `${covered.length} of ${types.length} are proven in all three of static, web and video.`,
      "",
      "| type | static | web | video | scrolly |",
      "|---|---|---|---|---|",
    );
    for (const t of types) {
      const cell = (g) =>
        set.filter((b) => b.type === t && b.genres.has(g)).map((b) => b.name).join("<br>") || "—";
      lines.push(`| **${t}** | ${cell("static")} | ${cell("web")} | ${cell("video")} | ${cell("scrolly")} |`);
    }
    lines.push("");
  }

  const untyped = beats.filter((b) => !b.type);
  lines.push(
    "## Beats with no `BRIEF.md`",
    "",
    untyped.length
      ? `${untyped.map((b) => `\`${b.name}\``).join(", ")} — no declared type, so absent from the tables above. ` +
        "A beat without its editorial contract cannot be placed in a coverage map."
      : "None.",
    "",
  );
  return lines.join("\n") + "\n";
}

const target = join(TWIN, "MATRIX.md");
const built = render(readBeats());

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== built) {
    console.error("MATRIX.md has drifted from the tree. Run: bun scripts/matrix.mjs");
    process.exit(1);
  }
  console.log("MATRIX.md matches the tree.");
} else {
  writeFileSync(target, built);
  console.log(`wrote ${target}`);
}
