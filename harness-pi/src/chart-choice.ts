// The chart-type choice split the way the 2026-11-16 probes measured it (eval/RESULTS.md, "Chart-type choice:
// code or a narrow model?"): the journalist names a coarse family, the student makes ONE narrow decision — what
// the reader must see, among the family's 2–5 needs — and code ranks that need's table rows. A free pick among 20
// intents scored 13–39 %; the need inside a family 70–77 %; the type step model ≈ code, so code keeps it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface TableRow {
  name: string;
  use: string;
  not: string;
}
export interface Need {
  title: string;
  rows: TableRow[];
}

const CHOICE = join(
  import.meta.dir,
  "../../skills/storyboard/references/chart-choice.md",
);

/** The 20 needs of chart-choice.md, in file order, each with its ranked table. */
export function readNeeds(md = readFileSync(CHOICE, "utf8")): Need[] {
  return md
    .split(/^## Intent: /m)
    .slice(1)
    .map((block) => ({
      title: block.split("\n")[0].trim(),
      rows: [
        ...block.matchAll(
          /^\| \d+ \| \[([^\]]+)\]\([^)]*\) \| (.*?) \| (.*?) \|\s*$/gm,
        ),
      ].map((m) => ({ name: m[1], use: m[2], not: m[3] })),
    }));
}

/** The seven families the journalist answers, each the 1-based needs it holds (the hier-probe's grouping). */
export const FAMILIES: Record<string, number[]> = {
  "comparison between categories": [1, 2, 3, 12, 13],
  "change over time": [4, 5, 6, 7, 8],
  distribution: [9, 10],
  "relationship between measures": [7, 11],
  "part-to-whole": [14, 15],
  "sequence or flow": [16, 20],
  location: [17, 18, 19, 20],
};

export const FAMILY_QUESTION =
  "Comparison between categories, change over time, distribution, relationship between measures, part-to-whole, sequence or flow, or location?";

// Checked in this order: "comparison between places" is location, "change in two measures" a relationship.
const FAMILY_WORDS: [string, RegExp][] = [
  ["location", /\b(location|locate|places?|maps?|where|geograph\w*|regions?|lieux?|carte|karte)\b/],
  ["relationship between measures", /\b(relationship|relation|correlat\w*|two measures|deux mesures|together|association)\b/],
  ["part-to-whole", /\b(part[- ]to[- ]whole|share|composition|proportion|whole|part du tout|anteil)\b/],
  ["sequence or flow", /\b(sequence|flows?|duration|journey|flux|duree|parcours|ablauf)\b/],
  ["distribution", /\b(distribution|spread|dispersion|verteilung)\b/],
  ["change over time", /\b(time|trends?|over the years|evolution|temps|zeit|tendance)\b/],
  ["comparison between categories", /\b(compar\w*|categor\w*|rank\w*|classement|vergleich|between|entre)\b/],
];

/** Lowercase, accents stripped: "Évolution dans le temps" → "evolution dans le temps". */
const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** The family the journalist's words name, or undefined when they name none. A map slot is always location. */
export function familyFor(words: string, medium = "chart"): string | undefined {
  if (medium === "map") return "location";
  return FAMILY_WORDS.find(([, re]) => re.test(plain(words)))?.[0];
}

/** The family's needs, numbered from 1 as the student sees them. */
export function needsFor(
  family: string,
  needs = readNeeds(),
): { n: number; need: Need }[] {
  return (FAMILIES[family] ?? []).map((i, k) => ({
    n: k + 1,
    need: needs[i - 1],
  }));
}

export function needMenu(family: string, needs = readNeeds()): string {
  return needsFor(family, needs)
    .map(({ n, need }) => `${n}. ${need.title}`)
    .join("; ");
}

/** The student's pick — a number, or the need's own words — resolved to one need of the family. */
export function resolveNeed(
  family: string,
  pick: string | number,
  needs = readNeeds(),
): Need | undefined {
  const list = needsFor(family, needs);
  const n = Number(String(pick).trim().replace(/^#/, "").replace(/[.)]$/, ""));
  if (Number.isInteger(n)) return list.find((x) => x.n === n)?.need;
  const p = String(pick)
    .toLowerCase()
    .replace(/^\d+[.)]\s*/, "")
    .trim();
  return list.find(
    ({ need }) =>
      need.title.toLowerCase() === p ||
      need.title.toLowerCase().includes(p) ||
      p.includes(need.title.toLowerCase()),
  )?.need;
}
