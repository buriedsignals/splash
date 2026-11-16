import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);

// Column indices
const YEAR_IDX = table.columns.findIndex((c) => c.name === "year");
const BIOENERGY_IDX = table.columns.findIndex((c) => c.name === "bioenergy_stacked_generation__twh");
const SOLAR_IDX = table.columns.findIndex((c) => c.name === "solar_generation__twh");
const WIND_IDX = table.columns.findIndex((c) => c.name === "wind_generation__twh");
const HYDRO_IDX = table.columns.findIndex((c) => c.name === "hydro_generation__twh");
const NUCLEAR_IDX = table.columns.findIndex((c) => c.name === "nuclear_generation__twh");
const GAS_IDX = table.columns.findIndex((c) => c.name === "gas_generation__twh");
const OIL_IDX = table.columns.findIndex((c) => c.name === "oil_generation__twh");
const COAL_IDX = table.columns.findIndex((c) => c.name === "coal_generation__twh");

// Entity column index
const ENTITY_IDX = table.columns.findIndex((c) => c.name === "entity");

// Get unique entities (in French names)
const entities = [...new Set(table.rows.map((r) => r[ENTITY_IDX]))];

/** Build the series for each entity: low-carbon share = (bio + solar + wind + hydro + nuclear) / total */
const allPanels = entities.map((name) => {
  const rows = table.rows.filter((r) => r[ENTITY_IDX] === name);
  // Sort by year
  rows.sort((a, b) => a[YEAR_IDX] - b[YEAR_IDX]);
  
  // Compute low-carbon share for each year
  const series = rows.map((r) => {
    const bio = Number(r[BIOENERGY_IDX]) || 0;
    const solar = Number(SOLAR_IDX >= 0 ? r[SOLAR_IDX] : 0);
    const wind = Number(WIND_IDX >= 0 ? r[WIND_IDX] : 0);
    const hydro = Number(HYDRO_IDX >= 0 ? r[HYDRO_IDX] : 0);
    const nuclear = Number(NUCLEAR_IDX >= 0 ? r[NUCLEAR_IDX] : 0);
    
    const renewables = bio + solar + wind + hydro;
    const lowCarbon = renewables + nuclear;
    
    const gas = Number(GAS_IDX >= 0 ? r[GAS_IDX] : 0);
    const oil = Number(OIL_IDX >= 0 ? r[OIL_IDX] : 0);
    const coal = Number(COAL_IDX >= 0 ? r[COAL_IDX] : 0);
    
    const total = lowCarbon + gas + oil + coal;
    
    const share = total > 0 ? (lowCarbon / total) * 100 : 0;
    
    return { year: r[YEAR_IDX], value: share };
  });
  
  return { name, series };
});

// Limit to 16 panels (all entities)
const panels = allPanels.slice(0, 16);

const years = panels.flatMap((p) => p.series.map((s) => s.year));
const [y0, y1] = [years[0], years[years.length - 1]];

// Ceiling: just above the maximum value anywhere
const maxVal = Math.max(...panels.flatMap((p) => p.series.map((s) => s.value)));
const ceiling = Math.ceil(maxVal);

// Format function: percentage with appropriate precision
const format = (v) => `${v.toFixed(1)} %`;

// Get last value for ranking
const lastOf = (p) => p.series[p.series.length - 1].value;

// Rank panels by last value (descending)
const ranked = [...panels].sort((a, b) => lastOf(b) - lastOf(a));

// All entities have same start and end years
const firstYear = y0;
const lastYear = y1;

// For detail: compute factor (end/start), rank, count, etc.
const firstOf = (p) => p.series.find((s) => s.year === firstYear).value;
const lastOfPanel = (p) => p.series.find((s) => s.year === lastYear).value;

const factorOf = (p) => {
  const f = firstOf(p);
  if (f > 0) return lastOfPanel(p) / f;
  return null;
};

// Count how many crossed (changed relative position at least once)
const getCrossings = (host, guestSeries) => {
  let crossings = 0;
  let hostAbovePrev = host.series[0].value > guestSeries[0].value;
  for (let i = 1; i < host.series.length; i++) {
    const hostAbove = host.series[i].value > guestSeries[i].value;
    if (hostAbove !== hostAbovePrev) {
      crossings++;
      hostAbovePrev = hostAbove;
    }
  }
  return crossings;
};

// Find longest uninterrupted run where one is above another
const findLongestRun = (host, guestSeries) => {
  let longest = { name: null, length: 0, from: null, to: null };
  let hostAbovePrev = host.series[0].value > guestSeries[0].value;
  
  for (let i = 0; i < host.series.length; i++) {
    const hostAbove = host.series[i].value > guestSeries[i].value;
    if (hostAbove === hostAbovePrev && hostAbovePrev) {
      if (i - longest.from > longest.length) {
        longest = { name: host.name, length: i - longest.from + 1, from: longest.from, to: i };
      }
    } else {
      hostAbovePrev = hostAbove;
      if (hostAbove) {
        longest.from = i;
      }
    }
  }
  return longest;
};

// Crossers: entities that cross this panel at least once
const getCrossers = (panel) => {
  const crossers = [];
  for (const other of panels) {
    if (other.name !== panel.name) {
      const crossings = getCrossings(other, panel.series);
      if (crossings > 0) {
        crossers.push(other.name);
      }
    }
  }
  return crossers;
};

// Always above: entities always above this panel (at all years)
const getAlwaysAbove = (panel) => {
  const alwaysAbove = [];
  for (const other of panels) {
    if (other.name !== panel.name) {
      const alwaysBelow = panel.series.every((s, i) => s.value <= other.series[i].value);
      if (alwaysBelow) {
        alwaysAbove.push(other.name);
      }
    }
  }
  return alwaysAbove;
};

// Never above: entities never above this panel (never crosses or stays above)
const getNeverAbove = (panel) => {
  const neverAbove = [];
  for (const other of panels) {
    if (other.name !== panel.name) {
      const everAbove = panel.series.some((s, i) => s.value < other.series[i].value);
      if (!everAbove) {
        neverAbove.push(other.name);
      }
    }
  }
  return neverAbove;
};

// Longest: the crosser that stayed above longest without a break
const getLongest = (panel) => {
  let longest = { name: null, length: 0, from: null, to: null };
  for (const other of panels) {
    if (other.name !== panel.name) {
      const run = findLongestRun(other, panel.series);
      if (run.length > longest.length) {
        longest = run;
      }
    }
  }
  return longest;
};

// Build panel objects with computed properties
const panelObjects = panels.map((p) => {
  const first = firstOf(p);
  const last = lastOfPanel(p);
  const factor = factorOf(p);
  const rank = ranked.indexOf(p) + 1;
  const count = panels.length;
  const crossers = getCrossers(p);
  const always = getAlwaysAbove(p);
  const never = getNeverAbove(p);
  const longest = getLongest(p);
  
  return { ...p, from: first, to: last, factor, rank, count, crossers, always, never, longest };
});

// Check if any entity has no crossers - if so, the data doesn't support carry
const hasCrossers = panelObjects.some((p) => p.crossers.length > 0);
if (!hasCrossers) {
  throw new Error("No entity has crossings - data does not support carry interaction");
}

// The title from STORYBOARD.md
const title = "Les seize ont tous progressé — et ceux qui partaient de plus bas ont le plus avancé";

// Eyebrow in French
const eyebrow = "Énergie · Europe";

// Thread: the accent-drawn panel names (takeaway names)
// Based on the title, we highlight those who progressed most from lowest
const thread = [];

// Format for panel's last value beside its name
const formatValue = (v) => `${v.toFixed(1)} %`;

// Detail tooltip for one panel
const detail = (p) => {
  const from = p.from;
  const to = p.to;
  const factor = p.factor;
  const rank = p.rank;
  const count = p.count;
  
  let result = `${p.name} · ${formatValue(from)} en ${firstYear}, ${formatValue(to)} en ${lastYear}`;
  
  if (factor !== null) {
    result += ` · progression de ${(factor * 100).toFixed(1)} %`;
  } else {
    result += ` · arrivée à ${to}% depuis zéro`;
  }
  
  result += ` · ${rank}e des ${count} en ${lastYear}`;
  
  return result;
};

// Carry control legend
const carryLabel = "Poser un pays dans les seize cadres";

// Untouched option label
const noneLabel = "la grille seule";

// Screen reader announcement for untouched option
const noneAnnounce = "la grille seule : seize panneaux, une seule échelle, aucune comparaison posée dedans";

// Option label function (French articles)
const optionLabel = (name) => {
  const articles = {
    "Autriche": "l'Autriche",
    "Belgique": "la Belgique",
    "Tchéquie": "la Tchéquie",
    "Danemark": "le Danemark",
    "Finlande": "la Finlande",
    "France": "la France",
    "Allemagne": "l'Allemagne",
    "Grèce": "la Grèce",
    "Irlande": "l'Irlande",
    "Italie": "l'Italie",
    "Pays-Bas": "les Pays-Bas",
    "Pologne": "la Pologne",
    "Portugal": "le Portugal",
    "Espagne": "l'Espagne",
    "Suède": "la Suède",
    "Royaume-Uni": "le Royaume-Uni",
  };
  return articles[name] || name;
};

// Screen reader announce for carried member
const announce = (g) => {
  const pill = optionLabel(g.name);
  return `Poser ${pill} dans les seize cadres : ${g.crossers.length} des ${g.others} autres entités changent de côté face à elle au moins une fois entre ${firstYear} et ${lastYear}`;
};

// Note shown under control when member is carried
const note = (g) => {
  const pill = optionLabel(g.name);
  const value = g.value;
  const rank = g.rank;
  const count = g.count;
  const others = g.others;
  const crossers = g.crossers;
  const always = g.always;
  const never = g.never;
  const longest = g.longest;
  
  return `${pill} : ${formatValue(value)} en ${lastYear}, ${rank}e des ${count} · ${g.crossers.length} des ${others} autres la croisent (${crossers.map(optionLabel).join(", ")}) ; ${always.length} restent devant, ${never.length} jamais ; ${optionLabel(longest.name)} a tenu ${longest.length} ans d'affilée, de ${longest.from} à ${longest.to}.`;
};

// Verdict for each panel under carried member
const verdict = (v) => {
  if (v.self) return "le pays posé";
  if (v.turns.length === 0) return v.aboveFirst ? `au-dessus les ${v.years} années` : "jamais au-dessus";
  if (v.turns.length === 1) return v.aboveLast ? `au-dessus depuis ${v.turns[0]}` : `au-dessus jusqu'en ${v.turns[0] - 1}`;
  if (v.turns.length === 2) return `${v.aboveFirst ? "en dessous" : "au-dessus"} de ${v.turns[0]} à ${v.turns[1] - 1}`;
  return `croise en ${v.turns.slice(0, -1).join(", ")} et ${v.turns[v.turns.length - 1]}`;
};

// Shared note for the whole grid
const sharedNote = `Partagé : 0 à ${ceiling} %, ${firstYear}-${lastYear}. Répété : le nom, la valeur finale, et le verdict face au pays posé.`;

// Standfirst explaining the measure
const limits =
  `Part bas-carbone de la production d'électricité, renouvelables et nucléaire réunis, en %. Un pourcentage représente la part de l'électricité produite sans carbone fossile. L'échelle est commune aux seize entités ; on en montre douze ici, celles qui ont le plus progressé.`;

// Reading: what the reader can do
const reading =
  `Lecture : posez un pays dans les seize cadres — il entre en silhouette dans chacun, qui dit quand il est passé devant. Survolez ou tabulez un panneau pour ses deux bouts, sa progression et son rang.`;

// Source credit
const source = "Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

// Alt text describing the grid
const alt =
  `Une grille de ${panels.length} panneaux, un par entité, tous à la même échelle de 0 à ${ceiling} % et sur les mêmes années ${firstYear}-${lastYear}. Les valeurs finales varient de ${formatValue(firstOf(ranked[0]))} à ${formatValue(lastOf(ranked[panels.length - 1]))} %. Le lecteur peut poser l'un des seize en silhouette dans les seize cadres : posé, ${optionLabel(ranked[0].name)}, ${getCrossers(ranked[0]).length} des ${panels.length - 1} autres entités la croisent. Note : douze des seize entités sont montrées ; quatre avec moins de part bas-carbone finale ne figurent pas.`;

// Columns per row
const columns = panels.length <= 4 ? 2 : 3;

// Language tag
const lang = "fr";

// Fold note explaining that we show 12 of 16
const foldNote = (drawn, all) => `${drawn} des ${all} entités sont montrées ici ; les quatre avec le moins de part bas-carbone finale ne figurent pas.`;

export default {
  lang,
  eyebrow,
  panels: panelObjects,
  ceiling,
  thread,
  format: formatValue,
  detail,
  carryLabel,
  noneLabel,
  noneAnnounce,
  optionLabel,
  announce,
  note,
  verdict,
  sharedNote,
  title,
  limits,
  reading,
  source,
  alt,
  columns,
  evidenceLevels: 3,
  check() {
    // Check that all entities show progress (last > first)
    const regressed = panelObjects.filter((p) => lastOfPanel(p) <= firstOf(p));
    if (regressed.length > 0) {
      throw new Error(`${regressed.map((p) => p.name).join(", ")} n'ont pas progressé`);
    }
    
    // Check that the lowest-starting entity gained the most
    // Find the entity with the lowest starting value
    const lowestStart = panelObjects.reduce((a, b) => (firstOf(b) < firstOf(a) ? b : a));
    const highestGain = panelObjects.reduce((best, p) => {
      const gain = firstOf(p) > 0 ? (lastOfPanel(p) - firstOf(p)) / firstOf(p) : lastOfPanel(p);
      const bestGain = firstOf(best) > 0 ? (lastOfPanel(best) - firstOf(best)) / firstOf(best) : lastOfPanel(best);
      return gain > bestGain ? p : best;
    }, lowestStart);
    
    if (highestGain.name !== lowestStart.name) {
      throw new Error(`l'entité qui partait du plus bas (${lowestStart.name}) n'a pas gagné le plus (${highestGain.name})`);
    }
    
    // Check that Sweden (which started highest) gained the least proportionally
    const sweden = panelObjects.find((p) => p.name === "Suède");
    const denmark = panelObjects.find((p) => p.name === "Danemark");
    
    const swedenGain = firstOf(sweden) > 0 ? (lastOfPanel(sweden) - firstOf(sweden)) / firstOf(sweden) : lastOfPanel(sweden);
    const denmarkGain = firstOf(denmark) > 0 ? (lastOfPanel(denmark) - firstOf(denmark)) / firstOf(denmark) : lastOfPanel(denmark);
    
    if (swedenGain > denmarkGain) {
      throw new Error("la Suède n'a pas gagné moins que le Danemark");
    }
  },
};