import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GROUP_MEDIUM = { "chart-beat": "chart", "map-beat": "map" };

function normalise(name, medium) {
  return name
    .toLowerCase()
    .replace(/[()/]/g, " ")
    .split(/\s+/)
    .filter((word) => word && word !== medium)
    .join(" ");
}

export function formsOnPage(html) {
  const groups = {};
  for (const [, form, skill] of html.matchAll(
    /data-form="([^"]*)"\s+data-skill="([^"]*)"/g,
  )) {
    groups[skill] = [...(groups[skill] ?? []), form];
  }
  if (Object.keys(groups).length > 0) return groups;

  const familySkills = { Charts: "chart-beat", Maps: "map-beat" };
  for (const [, family, forms] of html.matchAll(
    /{\s*nom:\s*'(Charts|Maps)',\s*formes:\s*\[([\s\S]*?)\]\s*}/g,
  )) {
    groups[familySkills[family]] = [
      ...forms.matchAll(/\[\s*'([^']+)'\s*,/g),
    ].map(([, form]) => form);
  }
  return groups;
}

export function labelsThatDisagree(html) {
  return [...html.matchAll(/data-form="([^"]*)"\s+data-skill="[^"]*"[^>]*>([^<]*)</g)]
    .filter(([, form, text]) => form.trim() !== text.trim())
    .map(([, form, text]) => ({ form, text: text.trim() }));
}

export function countsOnPage(html) {
  const counts = [...html.matchAll(/(\d+)\s+forms\b/g)].map(([, count]) =>
    Number(count),
  );
  for (const [, count] of html.matchAll(
    /<li class="lb(?:slot|tab)"[^>]*>[\s\S]*?<em>(\d+)<\/em><\/li>/g,
  )) {
    counts.push(Number(count));
  }
  return counts;
}

export function landingDrift({ html, catalogue }) {
  const drift = labelsThatDisagree(html).map(
    ({ form, text }) => `card reads "${text}" but declares "${form}"`,
  );
  const groups = formsOnPage(html);

  for (const [group, medium] of Object.entries(GROUP_MEDIUM)) {
    const listed = groups[group] ?? [];
    const treatments = catalogue.treatments
      .filter((treatment) => treatment.medium === medium)
      .map((treatment) => ({
        label: treatment.label,
        normalised: normalise(treatment.label, medium),
      }));
    const claimed = new Set();
    for (const name of listed) {
      const wanted = normalise(name, medium);
      const matches = treatments.filter(
        (treatment) =>
          treatment.normalised === wanted ||
          treatment.normalised.startsWith(`${wanted} `),
      );
      if (matches.length !== 1) {
        drift.push(
          `${group} form "${name}" matches ${matches.length} catalogue treatments`,
        );
      } else if (claimed.has(matches[0].label)) {
        drift.push(`${group} names "${matches[0].label}" more than once`);
      } else {
        claimed.add(matches[0].label);
      }
    }
    for (const treatment of treatments) {
      if (!claimed.has(treatment.label))
        drift.push(`${group} omits "${treatment.label}"`);
    }
    if (listed.length !== treatments.length)
      drift.push(
        `${group} lists ${listed.length} forms; catalogue has ${treatments.length}`,
      );
  }

  const counts = countsOnPage(html);
  for (const size of Object.values(groups).map((forms) => forms.length)) {
    if (!counts.includes(size)) drift.push(`page omits its ${size} forms count`);
  }
  return drift;
}

if (import.meta.main) {
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--check");
  if (unknown.length > 0 || !process.argv.includes("--check")) {
    console.error("landing/index.html is hand-authored; use --check");
    process.exit(2);
  }
  const drift = landingDrift({
    html: readFileSync(join(ROOT, "landing/index.html"), "utf8"),
    catalogue: JSON.parse(
      readFileSync(join(ROOT, "catalog/visual-catalog.json"), "utf8"),
    ),
  });
  if (drift.length > 0) {
    console.error(`landing/index.html has drifted: ${drift.join("; ")}`);
    process.exit(1);
  }
  console.log("landing/index.html matches the catalogues");
}
