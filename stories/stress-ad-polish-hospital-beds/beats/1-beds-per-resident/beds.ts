/**
 * The frozen table, read as numbers. Nothing here estimates, fills or reorders — it reads
 * `source/data.csv` exactly as `intake` froze it and derives the one measure the table does not
 * carry: beds per 10 000 inhabitants.
 */

export type Voivodeship = {
  name: string;
  beds: number;
  population: number;
  doctorsPerTenThousand: number;
};

const PER = 10000;

/** One CSV line, split on commas outside double quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

export function readVoivodeships(csv: string): Voivodeship[] {
  const lines = csv.replace(/^﻿/, "").split(/\r\n|\r|\n/).filter((l) => l !== "");
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const at = (name: string) => {
    const index = header.indexOf(name);
    if (index === -1)
      throw new Error(`the frozen table has no column ${JSON.stringify(name)} — it has ${header.join(", ")}`);
    return index;
  };
  const columns = {
    name: at("województwo"),
    beds: at("łóżka_szpitalne"),
    population: at("ludność"),
    doctors: at("lekarze_na_10tys"),
  };
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const number = (index: number) => {
      const value = Number(cells[index].trim());
      if (!Number.isFinite(value))
        throw new Error(`row ${JSON.stringify(cells[columns.name])} has no number in column ${header[index]}: ${JSON.stringify(cells[index])}`);
      return value;
    };
    return {
      name: cells[columns.name].trim(),
      beds: number(columns.beds),
      population: number(columns.population),
      doctorsPerTenThousand: number(columns.doctors),
    };
  });
}

/** The derived measure. Beds per 10 000 inhabitants — the reading the article's second paragraph
 *  asks for, and the one no column of the frozen table carries. */
export function perTenThousand(row: Voivodeship): number {
  return (row.beds / row.population) * PER;
}

/** Polish decimal comma, one place. The delivered text is in Polish and so is its punctuation. */
export function pl(value: number, places = 1): string {
  return value.toFixed(places).replace(".", ",");
}

/** Polish thousands separator — a non-breaking space, as Polish typography writes it. */
export function plInt(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
