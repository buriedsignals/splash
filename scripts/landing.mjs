// Checks that `landing/index.html` still describes the toolchain it advertises.
//
//   bun scripts/landing.mjs --check   fails if the public page has drifted from the catalogue
//
// THERE IS DELIBERATELY NO WRITER, and that makes this the odd one out among the check scripts.
// `matrix.mjs`, `type-survey.mjs`, `visual-catalog.mjs` and `guards.mjs` all GENERATE their target
// and check the copy. The landing page is not generated: it is a designed document with its own
// voice, its own argument and its own sources, and the catalogue is the authority for WHAT EXISTS,
// never for how the page reads. Regenerating it would replace an editorial artefact with a table.
// So this reports drift and stops there — a human decides what the page should say about it.
//
// WHY IT EXISTS. `landing/index.html` arrived on `main` on 2026-08-21 carrying the toolchain's own
// inventory in hand-typed form: "Charts 32 forms", "Maps 8 forms", and all forty names listed one
// by one. Every other generated claim in this tree is drift-checked against its source; measured
// when this file was written, NOTHING read the landing page at all. It is also the one artefact in
// the repository that strangers read, and `.github/workflows/pages.yml` now publishes it on every
// push to main — so it is simultaneously the most public claim here and the least guarded one.
//
// WHAT IT READS. The page marks each form up machine-readably —
// `<button data-form="Beeswarm" data-skill="chart-beat">` — which is what makes this checkable at
// all without parsing prose. `data-skill` groups them: `chart-beat` against the catalogue's `chart`
// treatments, `map-beat` against its `map` treatments.
//
// HOW A NAME IS MATCHED. The page shortens some catalogue labels and expands others: the catalogue
// says "Area (and stacked area)" where the page says "Area", and "Scatter (and bubble)" where the
// page says "Scatter and bubble". Neither stripping parentheses nor keeping them works for both.
// So a page name matches a catalogue label when, with parentheses flattened to spaces and case and
// spacing normalised, the label EQUALS the page name or BEGINS with it followed by a space. Checked
// when this was written: that rule maps all 32 chart names one-to-one, with no name matching two
// labels and no label left over. A rule that produced an ambiguous match would be reported as
// drift rather than resolved by picking one, because picking one is how a check starts lying.
//
// WHAT IT PROVABLY DOES NOT CHECK. The prose. The statistics. The source links. And the four
// scrolly forms the page lists (Chart, Map, Image sequence, Mixed media): the catalogue has no
// `scrolly` medium — 32 chart, 8 map, 1 image — so there is no authority in this tree to check
// those names against. Their COUNT is checked against the page's own list and the names are not,
// which is a gap named rather than an authority invented.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "landing", "index.html");
const CATALOGUE = join(ROOT, "skills", "storyboard", "references", "visual-catalog.json");

/** The medium each `data-skill` group on the page speaks for. `scrolly` is absent on purpose. */
const GROUP_MEDIUM = { "chart-beat": "chart", "map-beat": "map" };

function normalise(name) {
  return name.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

/** Every `data-form` on the page, grouped by its `data-skill`, in document order. */
export function formsOnPage(html) {
  const groups = {};
  const re = /data-form="([^"]*)"\s+data-skill="([^"]*)"/g;
  for (const [, form, skill] of html.matchAll(re)) {
    (groups[skill] ??= []).push(form);
  }
  return groups;
}

/**
 * Buttons whose visible label is not their own `data-form`. Everything else here compares the
 * ATTRIBUTE to the catalogue, so without this the attribute could be quietly corrected to satisfy
 * the check while the reader went on seeing a name for something that does not exist. The
 * attribute is a hook, not a second opinion.
 */
export function labelsThatDisagreeWithTheirAttribute(html) {
  const re = /data-form="([^"]*)"\s+data-skill="[^"]*"[^>]*>([^<]*)</g;
  return [...html.matchAll(re)]
    .filter(([, form, text]) => form.trim() !== text.trim())
    .map(([, form, text]) => ({ form, text: text.trim() }));
}

/** Every "N forms" the page prints, in document order — its own claim about its own lists. */
export function countsOnPage(html) {
  return [...html.matchAll(/(\d+)\s+forms\b/g)].map(([, n]) => Number(n));
}

/**
 * Drift between the page's inventory and the catalogue's, as a list of sentences. Empty means the
 * page still describes the toolchain. Never throws on a mismatch: a checker that dies on the first
 * problem reports one line of a page that may have several.
 */
export function landingDrift({ html, catalogue }) {
  const drift = [];
  const groups = formsOnPage(html);

  for (const { form, text } of labelsThatDisagreeWithTheirAttribute(html)) {
    drift.push(
      `a card reads "${text}" and carries data-form="${form}" — the reader and the checker are being told two different names`,
    );
  }

  for (const [group, medium] of Object.entries(GROUP_MEDIUM)) {
    const listed = groups[group] ?? [];
    const labels = catalogue.treatments
      .filter((t) => t.medium === medium)
      .map((t) => ({ label: t.label, n: normalise(t.label) }));

    if (listed.length === 0) {
      drift.push(
        `the page lists no data-skill="${group}" forms at all, but the catalogue holds ${labels.length} ${medium} treatment(s) — either the markup changed shape or the section was removed`,
      );
      continue;
    }

    const claimed = new Set();
    for (const name of listed) {
      const n = normalise(name);
      const hit = labels.filter((l) => l.n === n || l.n.startsWith(`${n} `));
      if (hit.length === 0) {
        drift.push(`the page lists "${name}" as a ${medium} form and the catalogue has no such treatment`);
      } else if (hit.length > 1) {
        drift.push(
          `the page's "${name}" matches ${hit.length} catalogue treatments (${hit.map((h) => `"${h.label}"`).join(", ")}) — one of them has to be named more precisely on the page`,
        );
      } else {
        if (claimed.has(hit[0].label)) {
          drift.push(`the page names "${hit[0].label}" twice (second time as "${name}")`);
        }
        claimed.add(hit[0].label);
      }
    }

    for (const l of labels) {
      if (!claimed.has(l.label)) {
        drift.push(`the catalogue holds the ${medium} treatment "${l.label}" and the page never lists it`);
      }
    }

    if (listed.length !== labels.length) {
      drift.push(
        `the page lists ${listed.length} ${medium} form(s) and the catalogue holds ${labels.length}`,
      );
    }
  }

  // The page's own printed counts against its own lists — internal consistency, which is the only
  // thing checkable for the scrolly group and worth checking for the other two anyway: a list can
  // be right while the number beside it is stale.
  const printed = countsOnPage(html);
  const listedSizes = Object.values(formsOnPage(html)).map((g) => g.length);
  const missing = listedSizes.filter((size) => !printed.includes(size));
  for (const size of missing) {
    drift.push(
      `the page lists a group of ${size} forms and prints no matching "${size} forms" count beside it (it prints ${printed.join(", ") || "none"})`,
    );
  }

  return drift;
}

if (import.meta.main) {
  const unknown = process.argv.slice(2).filter((a) => a !== "--check");
  if (unknown.length > 0) {
    console.error(`unknown argument(s): ${unknown.join(" ")} — this script only takes --check`);
    process.exit(2);
  }
  if (!process.argv.includes("--check")) {
    console.error(
      "landing/index.html is a designed page, not a generated one, so this script only checks it. Run: bun scripts/landing.mjs --check",
    );
    process.exit(2);
  }
  const drift = landingDrift({
    html: readFileSync(PAGE, "utf8"),
    catalogue: JSON.parse(readFileSync(CATALOGUE, "utf8")),
  });
  if (drift.length > 0) {
    console.error("landing/index.html has drifted from the visual catalogue:");
    for (const line of drift) console.error(`  - ${line}`);
    console.error("The page is written by hand. Decide what it should say, then edit it.");
    process.exit(1);
  }
  console.log("landing/index.html matches the visual catalogue.");
}
