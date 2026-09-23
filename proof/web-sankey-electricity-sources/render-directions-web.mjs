// twin/proof/web-sankey-electricity-sources/render-directions-web.mjs
//
// Nine sources flowing into six countries' 2024 electricity, rendered once per FILED DIRECTION.
//
// CONSERVATION IS THE FORM'S OWN PROMISE, so it is the thing the runner checks — TWICE, and the
// second check is the one that was missing. The first is against the DATA: every node's total equals
// the sum of its own ribbons, on both sides. The second is against WHAT THE PLATE DRAWS: fifteen
// links fall under half a pixel and are not drawn, so seven of the nine source nodes emit less than
// the total they print. Aggregated into one remainder line that is invisible; and the trace control
// puts the reader in front of exactly one source at a time. So `trace.ts` re-checks the promise in
// every state the control can produce, and REFUSES a source of which the plate draws nothing.
//
// Usage:  bun proof/web-sankey-electricity-sources/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertTraceChangesThePicture,
  assertTraceDeclaration,
} from "../../skills/chart-web/assets/trace.ts";
import { DirectedSankeyWeb, FRAME } from "./DirectedSankeyWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SOURCES = [
  ["Nuclear", "nucléaire"], ["Hydropower", "hydraulique"], ["Wind", "éolien"], ["Gas", "gaz"],
  ["Coal", "charbon"], ["Solar", "solaire"], ["Bioenergy", "biomasse"],
  ["Other renewables", "autres renouv."], ["Oil", "pétrole"],
];
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };
const GAP = 8;
const MIN_RIBBON = 0.6;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
  for (const [k] of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});

const countries = Object.keys(NAMES).map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  return { code, name: NAMES[code], by: Object.fromEntries(SOURCES.map(([k]) => [k, r[k]])) };
});
const grand = countries.reduce((s, c) => s + SOURCES.reduce((t, [k]) => t + c.by[k], 0), 0);
const bySource = SOURCES.map(([key, name]) => ({
  key,
  name,
  total: countries.reduce((s, c) => s + c.by[key], 0),
})).sort((a, b) => b.total - a.total);
const byCountry = countries
  .map((c) => ({ ...c, total: SOURCES.reduce((s, [k]) => s + c.by[k], 0) }))
  .sort((a, b) => b.total - a.total);

// ── CONSERVATION, CHECKED ─────────────────────────────────────────────────────────────────────
for (const s of bySource) {
  const sum = countries.reduce((t, c) => t + c.by[s.key], 0);
  if (Math.abs(sum - s.total) > 1e-9) throw new Error(`${s.name}'s ribbons sum to ${sum}, its node says ${s.total}`);
}
for (const c of byCountry) {
  const sum = SOURCES.reduce((t, [k]) => t + c.by[k], 0);
  if (Math.abs(sum - c.total) > 1e-9) throw new Error(`${c.name}'s ribbons sum to ${sum}, its node says ${c.total}`);
}

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const biggest = bySource[0];
const holder = [...countries].sort((a, b) => b.by[biggest.key] - a.by[biggest.key])[0];
const holderShare = (holder.by[biggest.key] / biggest.total) * 100;
if (!(holderShare > 80))
  throw new Error(`the headline says one country holds four fifths of the largest source; it holds ${fr(holderShare)} %`);
console.log(
  `${countries.length} pays · ${fr(grand)} TWh · source la plus grosse : ${biggest.name} ` +
    `${fr(biggest.total)} TWh, dont ${fr(holderShare)} % en ${holder.name}\n`,
);
console.table(bySource.map((s) => ({ source: s.name, TWh: fr(s.total), "% du total": fr((s.total / grand) * 100) })));

// ── geometry ──────────────────────────────────────────────────────────────────────────────────
const scale = (FRAME.height - GAP * Math.max(bySource.length, byCountry.length - 1)) / grand;
const nodes = [];
const cursors = { 0: 0, 1: 0 };
const nodeTop = {};
bySource.forEach((s) => {
  const h = s.total * scale;
  nodeTop[`s:${s.key}`] = cursors[0];
  nodes.push({ key: `s:${s.key}`, ref: s.key, name: s.name, side: 0, y: cursors[0], h, label: `${s.name} · ${fr(s.total, 0)} TWh` });
  cursors[0] += h + GAP;
});
byCountry.forEach((c) => {
  const h = c.total * scale;
  nodeTop[`c:${c.code}`] = cursors[1];
  nodes.push({ key: `c:${c.code}`, ref: c.code, name: c.name, side: 1, y: cursors[1], h, label: `${c.name} · ${fr(c.total, 0)} TWh` });
  cursors[1] += h + GAP;
});

const ribbons = [];
const drawn = new Map(bySource.map((s) => [s.key, []]));
const undrawn = new Map(bySource.map((s) => [s.key, []]));
const offsetLeft = Object.fromEntries(bySource.map((s) => [s.key, nodeTop[`s:${s.key}`]]));
const offsetRight = Object.fromEntries(byCountry.map((c) => [c.code, nodeTop[`c:${c.code}`]]));
let hidden = 0;
let hiddenTwh = 0;
bySource.forEach((s) => {
  for (const c of byCountry) {
    const v = c.by[s.key];
    const w = v * scale;
    if (w < MIN_RIBBON) {
      if (v > 0) {
        hidden += 1;
        hiddenTwh += v;
        undrawn.get(s.key).push({ country: c, v });
      }
      continue;
    }
    drawn.get(s.key).push({ country: c, v });
    ribbons.push({
      key: `${s.key}-${c.code}`,
      flow: s.key,
      from: s.name,
      to: c.name,
      y0: offsetLeft[s.key],
      y1: offsetRight[c.code],
      w,
      detail:
        // "vers" AND NOT AN ARROW. U+2192 is inside the `latin` range Google DECLARES for Open
        // Sans and is not in the file, so it reaches the by-name branch alone, where Google answers
        // with an empty subset and a kit URL that 400s — the build refuses rather than letting the
        // glyph fall through to whatever the reader's machine has.
        `${s.name} vers ${c.name} · ${fr(v)} TWh · ${fr((v / s.total) * 100)} % de tout le ${s.name} ` +
        `des six · ${fr((v / c.total) * 100)} % de l'électricité ${c.name === "France" ? "française" : `de ${c.name}`}`,
    });
    offsetLeft[s.key] += w;
    offsetRight[c.code] += w;
  }
});

// ── THE TRACE — one path per source, its arithmetic written, and one source REFUSED ───────────
//
// The picture the reader gets when they pick a source: that source's whole downstream lit, the rest
// of the network receded, the countries it never reaches hollowed, and the path's own arithmetic at
// both ends. The FIRST option is the state the page ships in and it is the claim (`trace.ts` says
// why this vocabulary has no untouched state).
//
// A source of which the plate draws NO ribbon is not offered. On this beat that is not hypothetical:
// all three of "other renewables"' links fall under half a pixel, so its node prints 1,8 TWh with
// nothing leaving it. Offering it would recede the whole network and light nothing.
const traceable = bySource.filter((s) => drawn.get(s.key).length > 0);
const refusedSources = bySource.filter((s) => drawn.get(s.key).length === 0);
const ordered = [biggest, ...traceable.filter((s) => s.key !== biggest.key)];

// The beat's own words for each source, including the elision. A `le ${name}` built by hand reads
// "le éolien" and "le biomasse", which is not French and is not something a formatter can guess.
const ARTICLE = {
  Nuclear: "le nucléaire", Hydropower: "l'hydraulique", Wind: "l'éolien", Gas: "le gaz",
  Coal: "le charbon", Solar: "le solaire", Bioenergy: "la biomasse", Oil: "le pétrole",
  "Other renewables": "les autres renouvelables",
};

const traceOption = (s) => {
  const segs = drawn.get(s.key);
  const missed = undrawn.get(s.key);
  const absent = byCountry.filter((c) => !segs.some((x) => x.country.code === c.code));
  const missedTwh = missed.reduce((t, x) => t + x.v, 0);
  const drawnTwh = segs.reduce((t, x) => t + x.v, 0);
  const list = (names) =>
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
  return {
    key: s.key,
    label: ARTICLE[s.key] ?? (() => { throw new Error(`no article is written for ${s.key}`); })(),
    announce: `Suivre ${ARTICLE[s.key]} de bout en bout`,
    total: s.total,
    undrawn: missedTwh,
    undrawnLabel:
      missedTwh > 0
        ? `${fr(missedTwh)} TWh vers ${list(missed.map((x) => x.country.name))} sous le demi-pixel, non dessinés`
        : null,
    stated:
      missedTwh > 0
        ? `${fr(drawnTwh)} TWh dessinés sur ${fr(s.total)} · ${segs.length} pays · ${fr(missedTwh)} TWh sous le demi-pixel`
        : `${fr(s.total)} TWh · ${segs.length} pays · tout est dessiné`,
    segments: segs.map((x) => ({
      to: x.country.code,
      label: x.country.name,
      value: x.v,
      atDestination: `${fr((x.v / x.country.total) * 100)} % de son électricité`,
    })),
    note:
      `${ARTICLE[s.key][0].toUpperCase()}${ARTICLE[s.key].slice(1)} : ${fr(s.total)} TWh quittent la gauche. ` +
      segs
        .map(
          (x) =>
            `${x.country.name} ${fr(x.v)} TWh (${fr((x.v / s.total) * 100)} % de la source, ` +
            `${fr((x.v / x.country.total) * 100)} % du pays)`,
        )
        .join(" · ") +
      (absent.length ? ` · rien vers ${list(absent.map((c) => c.name))}` : "") +
      (missedTwh > 0
        ? ` · ${fr(missedTwh)} TWh non dessinés (${list(missed.map((x) => x.country.name))})`
        : " · rien de non dessiné") +
      ` · somme : ${fr(drawnTwh)} + ${fr(missedTwh)} = ${fr(s.total)} TWh, le total du nœud.`,
  };
};

const trace = {
  label: "Suivre une source",
  destinations: byCountry.map((c) => c.code),
  options: ordered.map(traceOption),
};
// A tenth of a TWh is the frozen file's own precision; anything closer than that is float noise.
assertTraceDeclaration(trace, { drawnOrigins: bySource.map((s) => s.key), tolerance: 1e-6 });
console.log(
  `tracé : ${trace.options.length} sources offertes` +
    (refusedSources.length ? `, ${refusedSources.length} refusée(s) — ${refusedSources.map((s) => s.name).join(", ")} (aucun ruban dessiné)` : ""),
);
console.table(
  trace.options.map((o) => ({
    source: o.label,
    "TWh du nœud": fr(o.total),
    dessiné: fr(o.segments.reduce((t, x) => t + x.value, 0)),
    "non dessiné": fr(o.undrawn),
    pays: o.segments.length,
  })),
);

const facts = beatFacts(
  bySource.map((s) => ({ key: s.key, label: s.name, value: s.total })),
  { subject: biggest.name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Le ${biggest.name} est la première source d'électricité de ces six pays — et ${fr(holderShare, 0)} % de ce ${biggest.name} sort de ${holder.name === "France" ? "la France" : holder.name}`;
const caveat =
  `${fr(grand, 0)} TWh produits en ${YEAR} par six pays européens à partir de neuf sources. Chaque ` +
  `nœud porte SON PROPRE total : la promesse d'un sankey est la conservation, et un nœud qui ` +
  `n'écrit pas son total demande à être cru plutôt qu'à être vérifié. Le réseau non suivi est ` +
  `translucide, donc un croisement s'y lit comme un croisement et non comme un ordre d'empilement ; ` +
  `le trajet suivi, lui, est posé devant et occulte — un trajet qu'on a demandé à suivre et qui ` +
  `devient transparent à chaque croisement est un trajet qu'on ne suit pas.`;
const remainder =
  hidden > 0
    ? `${hidden} liaisons trop fines pour être dessinées à cette échelle ne le sont pas : elles ` +
      `pèsent ${fr(hiddenTwh)} TWh au total, soit ${fr((hiddenTwh / grand) * 100, 2)} % de l'ensemble. ` +
      (refusedSources.length
        ? `${refusedSources.map((s) => `« ${s.name} »`).join(", ")} n'en a aucune d'assez épaisse : ` +
          `son nœud affiche ${fr(refusedSources[0].total)} TWh et la plaque n'en dessine aucun ruban, ` +
          `donc cette source n'est pas offerte au tracé.`
        : "")
    : null;
const readingLine =
  `Lecture : choisissez une source pour la suivre d'un bout à l'autre — tout son aval s'allume, le ` +
  `reste du réseau recule, les pays qu'elle n'atteint pas deviennent creux, et chaque pays atteint ` +
  `porte la part de SON électricité qu'elle fournit. Survolez, touchez ou tabulez ensuite un ruban ` +
  `pour ses deux extrémités et ses deux parts. Suivre un trajet parmi cinquante qui se croisent est ` +
  `la seule chose qu'une plaque fixe ne peut pas faire : elle choisit le trajet à votre place.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${nodes.map((n) => n.label).join(" ")} ${trace.options.map((o) => `${o.stated} ${o.segments.map((x) => x.atDestination).join(" ")}`).join(" ")}`,
  annot: `${remainder ?? `${fr(grand, 0)} TWh`} ${trace.label} ${trace.options.map((o) => `${o.label} ${o.note}`).join(" ")}`,
  value: bySource.map((s) => fr(s.total, 0)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    const { outPath } = await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedSankeyWeb,
      props: {
        nodes, ribbons, trace,
        remainder,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Neuf blocs de sources à gauche, six blocs de pays à droite, reliés par des rubans dont la ` +
          `largeur est une quantité d'électricité. Le bloc du ${biggest.name} est le plus haut à ` +
          `gauche (${fr(biggest.total, 0)} TWh) et presque tout son ruban part vers ` +
          `${holder.name} : ${fr(holderShare, 0)} %. ${byCountry[1].name}, deuxième producteur, ne ` +
          `reçoit aucun ruban de ce bloc et son nœud est dessiné creux. Un groupe de ` +
          `${trace.options.length} boutons radio choisit la source suivie : celle qui est choisie ` +
          `s'allume de bout en bout, les autres reculent.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    // EVERY PATH SAYS SOMETHING THE PAGE DOES NOT ALREADY PRINT, measured on the page that was just
    // written. `assertControlsChangeSomething` cannot see this vocabulary's radios, so the refusal is
    // this file's to make — see `trace.ts`. The default is exempt: it is not a counterfactual, it is
    // the claim.
    assertTraceChangesThePicture(await readFile(outPath, "utf8"), trace, `${id}.html`);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
